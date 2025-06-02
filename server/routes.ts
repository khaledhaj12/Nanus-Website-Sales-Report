import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import multer from "multer";
import * as XLSX from "xlsx";
import csv from "csv-parser";
import { Readable } from "stream";
import { z } from "zod";
import { insertUserSchema, insertOrderSchema } from "@shared/schema";
// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and XLSX files are allowed.'));
    }
  },
});

// Configure session
const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'development-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Fee calculation functions
function calculatePlatformFee(amount: number): number {
  return amount * 0.07; // 7%
}

function calculateStripeFee(amount: number): number {
  return (amount * 0.029) + 0.30; // 2.9% + $0.30
}

function calculateNetAmount(amount: number): number {
  const platformFee = calculatePlatformFee(amount);
  const stripeFee = calculateStripeFee(amount);
  return amount - platformFee - stripeFee;
}

// Progress tracking for uploads
const uploadProgress = new Map<number, any>();

// File processing functions
async function processCSVFile(buffer: Buffer, uploadId: number, userId: number): Promise<void> {
  const csvData: any[] = [];
  const stream = Readable.from(buffer.toString());
  
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on('data', (data) => csvData.push(data))
      .on('end', async () => {
        try {
          await processOrderData(csvData, uploadId, userId);
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function processXLSXFile(buffer: Buffer, uploadId: number, userId: number): Promise<void> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  await processOrderData(jsonData, uploadId, userId);
}

async function processOrderData(data: any[], uploadId: number, userId: number): Promise<void> {
  let processedCount = 0;
  const totalRecords = data.length;
  
  // Store progress data for potential API queries
  uploadProgress.set(uploadId, {
    progress: 0,
    totalRecords,
    processedRecords: 0,
    status: 'processing'
  });
  
  // Group orders by Order ID to handle duplicates (refunds)
  const orderGroups = new Map<string, any[]>();
  
  for (const row of data) {
    const orderId = row['Order ID'] || row.order_id || row.OrderId || `ORD-${Date.now()}-${processedCount}`;
    if (!orderGroups.has(orderId)) {
      orderGroups.set(orderId, []);
    }
    orderGroups.get(orderId)!.push(row);
  }
  
  for (const [orderId, rows] of orderGroups.entries()) {
    try {
      // For duplicate Order IDs, use the record with amount = 0 (refund record)
      let orderRow = rows[0];
      let refundAmount = 0;
      
      if (rows.length > 1) {
        // Find the refund record (amount = 0) and the original order
        const refundRecord = rows.find(r => parseFloat(r['Total (- Refund)'] || r.amount || '0') === 0);
        const originalRecord = rows.find(r => parseFloat(r['Total (- Refund)'] || r.amount || '0') > 0);
        
        if (refundRecord && originalRecord) {
          orderRow = refundRecord; // Use refund record as main record
          refundAmount = parseFloat(originalRecord['Refund Amount'] || originalRecord.refund_amount || '0');
        }
      }

      // Extract location name and ensure location exists
      const locationName = orderRow.location || orderRow.Location || 'Unknown Location';
      let location = await storage.getLocationByName(locationName);
      
      if (!location) {
        location = await storage.createLocation({
          name: locationName,
          code: locationName.toLowerCase().replace(/\s+/g, '_'),
          isActive: true,
        });
      }

      // Map fields according to specification:
      // Amount = Total (- Refund)
      // Order ID = Order ID  
      // Date = Paid Date
      // Customer = First Name
      // Status = Status
      // Refund = Refund Amount
      
      const amount = parseFloat(orderRow['Total (- Refund)'] || orderRow.total || orderRow.amount || '0');
      const platformFee = calculatePlatformFee(amount);
      const stripeFee = calculateStripeFee(amount);
      const netAmount = calculateNetAmount(amount);

      const orderData = {
        orderId: orderId,
        locationId: location.id,
        customerName: orderRow['First Name'] || orderRow.firstName || orderRow.customer_name || '',
        firstName: orderRow['First Name'] || orderRow.firstName || '',
        customerEmail: orderRow.customer_email || orderRow.CustomerEmail || orderRow['Customer Email'] || '',
        cardLast4: orderRow.card_last4 || orderRow.CardLast4 || orderRow['Card Last 4'] || '',
        paymentMethod: orderRow.payment || orderRow.Payment || orderRow['Payment Method'] || '',
        refundAmount: refundAmount.toString(),
        amount: amount.toString(),
        tax: parseFloat(orderRow.tax || orderRow.Tax || '0').toString(),
        total: amount.toString(), // Use amount as total since amount = Total (- Refund)
        status: (orderRow.Status || orderRow.status || 'completed').toLowerCase(),
        platformFee: platformFee.toString(),
        stripeFee: stripeFee.toString(),
        netAmount: netAmount.toString(),
        orderNotes: orderRow.notes || orderRow.Notes || orderRow['Order Notes'] || '',
        orderDate: (() => {
          const dateString = orderRow['Paid Date'] || orderRow.paid_date || orderRow.order_date || orderRow['Order Date'];
          if (!dateString) {
            console.warn('No date found for order:', orderId);
            return new Date().toISOString().split('T')[0];
          }
          
          // Try parsing the date string
          const parsedDate = new Date(dateString);
          if (isNaN(parsedDate.getTime())) {
            console.warn('Invalid date format for order:', orderId, 'Date value:', dateString);
            return new Date().toISOString().split('T')[0];
          }
          
          return parsedDate.toISOString().split('T')[0];
        })(),
      };

      // Check if order already exists
      const existingOrder = await storage.getOrderByOrderId(orderData.orderId);
      if (!existingOrder) {
        await storage.createOrder(orderData);
      }
      
      // Always increment processed count for progress tracking
      processedCount++;
      
      // Update progress tracking
      uploadProgress.set(uploadId, {
        progress: Math.round((processedCount / totalRecords) * 100),
        totalRecords,
        processedRecords: processedCount,
        status: 'processing'
      });
      
      console.log(`Processed ${processedCount}/${totalRecords} records (${Math.round((processedCount / totalRecords) * 100)}%)`);
      
      // Add delay to make progress visible (100ms per record)
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error processing row:', error);
    }
  }

  // Update file upload record
  await storage.updateFileUpload(uploadId, {
    recordsProcessed: processedCount,
    status: 'completed',
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(sessionConfig);

  // Initialize admin user if not exists
  const initializeAdmin = async () => {
    try {
      const adminUser = await storage.getUserByUsername('admin');
      if (!adminUser) {
        await storage.createUser({
          username: 'admin',
          password: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@company.com',
          role: 'admin',
        });
        console.log('Admin user created with username: admin, password: admin');
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
    }
  };

  await initializeAdmin();

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.validateUser(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/summary', requireAuth, async (req: any, res) => {
    try {
      const { location, month } = req.query;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      let locationId: number | undefined;
      
      // For non-admin users, restrict to their assigned locations
      if (userRole !== 'admin') {
        const userLocations = await storage.getUserLocationAccess(userId);
        if (location && userLocations.includes(parseInt(location as string))) {
          locationId = parseInt(location as string);
        } else if (userLocations.length > 0) {
          locationId = userLocations[0]; // Default to first accessible location
        }
      } else if (location && location !== 'all') {
        locationId = parseInt(location as string);
      }

      const summary = await storage.getDashboardSummary(locationId, month as string);
      res.json(summary);
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  app.get('/api/dashboard/monthly-breakdown', requireAuth, async (req: any, res) => {
    try {
      const { year, location } = req.query;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      let locationId: number | undefined;
      
      // For non-admin users, restrict to their assigned locations
      if (userRole !== 'admin') {
        const userLocations = await storage.getUserLocationAccess(userId);
        if (location && userLocations.includes(parseInt(location as string))) {
          locationId = parseInt(location as string);
        }
      } else if (location && location !== 'all') {
        locationId = parseInt(location as string);
      }

      const breakdown = await storage.getMonthlyBreakdown(
        undefined,
        locationId
      );
      res.json(breakdown);
    } catch (error) {
      console.error("Monthly breakdown error:", error);
      res.status(500).json({ message: "Failed to fetch monthly breakdown" });
    }
  });

  // Orders routes
  app.get('/api/orders', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { location, search, month } = req.query;
      
      let locationId: number | undefined;
      
      // For non-admin users, restrict to their assigned locations
      if (userRole !== 'admin') {
        const userLocations = await storage.getUserLocationAccess(userId);
        if (location && userLocations.includes(parseInt(location as string))) {
          locationId = parseInt(location as string);
        } else if (!location && userLocations.length > 0) {
          // If no location specified, get orders from all user's locations
          const allOrders = await Promise.all(
            userLocations.map(locId => storage.getOrdersByLocation(locId))
          );
          let orders = allOrders.flat();
          
          // Apply search filter
          if (search) {
            orders = orders.filter(order => 
              order.orderId.toLowerCase().includes(search.toLowerCase()) ||
              order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
              order.customerEmail?.toLowerCase().includes(search.toLowerCase())
            );
          }
          
          // Apply month filter
          if (month && month !== 'all') {
            orders = orders.filter(order => order.orderDate.startsWith(month));
          }
          
          return res.json(orders);
        }
      } else if (location && location !== 'all') {
        locationId = parseInt(location as string);
      }

      let orders = locationId 
        ? await storage.getOrdersByLocation(locationId)
        : await storage.getAllOrders();
      
      // Apply search filter
      if (search) {
        orders = orders.filter(order => 
          order.orderId.toLowerCase().includes(search.toLowerCase()) ||
          order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          order.customerEmail?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Apply month filter
      if (month && month !== 'all') {
        orders = orders.filter(order => order.orderDate.startsWith(month));
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/search', requireAuth, async (req: any, res) => {
    try {
      const { q, location } = req.query;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      let locationId: number | undefined;
      
      // For non-admin users, restrict to their assigned locations
      if (userRole !== 'admin') {
        const userLocations = await storage.getUserLocationAccess(userId);
        if (location && userLocations.includes(parseInt(location as string))) {
          locationId = parseInt(location as string);
        }
      } else if (location && location !== 'all') {
        locationId = parseInt(location as string);
      }

      const orders = await storage.searchOrders(q as string, locationId);
      res.json(orders);
    } catch (error) {
      console.error("Order search error:", error);
      res.status(500).json({ message: "Failed to search orders" });
    }
  });

  app.put('/api/orders/:id', requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const orderData = req.body;
      
      // Recalculate fees if amount changed
      if (orderData.amount) {
        const amount = parseFloat(orderData.amount);
        orderData.platformFee = calculatePlatformFee(amount).toString();
        orderData.stripeFee = calculateStripeFee(amount).toString();
        orderData.netAmount = calculateNetAmount(amount).toString();
      }

      const updatedOrder = await storage.updateOrder(orderId, orderData);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Bulk delete orders (admin only) - MUST come before single delete route
  app.delete('/api/orders/bulk-delete', requireAdmin, async (req, res) => {
    try {
      const { orderIds } = req.body;
      console.log("Received orderIds:", orderIds);
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Invalid order IDs" });
      }
      
      // Ensure all IDs are valid integers
      const validIds = orderIds
        .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
        .map(id => Number(id));
      
      console.log("Valid IDs:", validIds);
      
      if (validIds.length === 0) {
        return res.status(400).json({ message: "No valid order IDs provided" });
      }
      
      await storage.deleteOrders(validIds);
      res.json({ message: "Orders deleted successfully" });
    } catch (error: any) {
      console.error("Delete orders error:", error);
      res.status(500).json({ message: "Failed to delete orders" });
    }
  });

  app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      await storage.deleteOrder(orderId);
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Locations routes
  app.get('/api/locations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      if (userRole === 'admin') {
        const locations = await storage.getAllLocations();
        res.json(locations);
      } else {
        const userLocationIds = await storage.getUserLocationAccess(userId);
        const allLocations = await storage.getAllLocations();
        const userLocations = allLocations.filter(loc => userLocationIds.includes(loc.id));
        res.json(userLocations);
      }
    } catch (error) {
      console.error("Locations error:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Users routes
  app.get('/api/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Set location access if provided
      if (req.body.locationIds && Array.isArray(req.body.locationIds)) {
        await storage.setUserLocationAccess(user.id, req.body.locationIds);
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const updateData = insertUserSchema.partial().parse(req.body);
      
      const user = await storage.updateUser(userId, updateData);
      
      // Set location access if provided
      if (req.body.locationIds && Array.isArray(req.body.locationIds)) {
        const locationIds = req.body.locationIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
        await storage.setUserLocationAccess(userId, locationIds);
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting the current admin user
      if (userId === req.session.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // First remove user location access
      await storage.setUserLocationAccess(userId, []);
      
      // Then delete the user
      await storage.deleteUser(userId);
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/users/:id/locations', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const locationIds = await storage.getUserLocationAccess(userId);
      res.json(locationIds);
    } catch (error) {
      console.error("User locations error:", error);
      res.status(500).json({ message: "Failed to fetch user locations" });
    }
  });

  // File upload routes
  app.post('/api/upload', requireAdmin, upload.single('file'), async (req: any, res) => {
    try {
      console.log("Upload started, file:", req.file?.originalname);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.session.user.id;
      console.log("Processing upload for user ID:", userId);
      
      // Create file upload record
      const fileUpload = await storage.createFileUpload({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileData: req.file.buffer.toString('base64'),
        uploadedBy: userId,
        status: 'processing',
        recordsProcessed: 0,
      });

      console.log("File upload record created:", fileUpload.id);

      // Send immediate response to frontend to start progress polling
      res.json({
        message: "File uploaded successfully, processing started",
        fileId: fileUpload.id,
      });

      // Process file asynchronously in background
      (async () => {
        try {
          if (req.file.mimetype === 'text/csv') {
            console.log("Processing CSV file");
            await processCSVFile(req.file.buffer, fileUpload.id, userId);
          } else {
            console.log("Processing XLSX file");
            await processXLSXFile(req.file.buffer, fileUpload.id, userId);
          }
          
          // Update file upload status to completed
          await storage.updateFileUpload(fileUpload.id, {
            status: 'completed'
          });
          
          // Mark as completed and clean up progress tracking
          const finalProgress = uploadProgress.get(fileUpload.id) || {};
          uploadProgress.set(fileUpload.id, {
            ...finalProgress,
            progress: 100,
            status: 'completed'
          });
          
          console.log("File processing completed successfully");
        } catch (processError) {
          console.error("File processing error:", processError);
          await storage.updateFileUpload(fileUpload.id, { status: 'failed' });
          
          // Update progress tracking to show error
          uploadProgress.set(fileUpload.id, {
            progress: 0,
            totalRecords: 0,
            processedRecords: 0,
            status: 'failed'
          });
        }
      })();
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get('/api/uploads/recent', requireAdmin, async (req, res) => {
    try {
      const uploads = await storage.getRecentFileUploads();
      res.json(uploads);
    } catch (error) {
      console.error("Recent uploads error:", error);
      res.status(500).json({ message: "Failed to fetch recent uploads" });
    }
  });

  app.get('/api/uploads/all', requireAdmin, async (req, res) => {
    try {
      const uploads = await storage.getAllFileUploads();
      res.json(uploads);
    } catch (error) {
      console.error("All uploads error:", error);
      res.status(500).json({ message: "Failed to fetch all uploads" });
    }
  });

  app.get('/api/uploads/:id/download', requireAdmin, async (req, res) => {
    try {
      const uploadId = parseInt(req.params.id);
      const upload = await storage.getFileUpload(uploadId);
      
      if (!upload) {
        return res.status(404).json({ message: "File not found" });
      }

      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${upload.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Decode base64 file data and send as buffer
      const fileBuffer = Buffer.from(upload.fileData, 'base64');
      res.send(fileBuffer);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete('/api/uploads', requireAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid file IDs" });
      }
      
      await storage.deleteFileUploads(ids);
      res.json({ message: "Files deleted successfully" });
    } catch (error) {
      console.error("Delete uploads error:", error);
      res.status(500).json({ message: "Failed to delete files" });
    }
  });

  app.delete('/api/locations', requireAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid location IDs" });
      }
      
      await storage.deleteLocations(ids);
      res.json({ message: "Locations deleted successfully" });
    } catch (error: any) {
      console.error("Delete locations error:", error);
      if (error.message && error.message.includes("Cannot delete locations with existing orders")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete locations" });
      }
    }
  });

  app.put('/api/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Update user
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Update location access if provided
      if (req.body.locationIds && Array.isArray(req.body.locationIds)) {
        await storage.setUserLocationAccess(userId, req.body.locationIds);
      }
      
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Notes routes (admin only)
  app.get('/api/notes', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const notes = await storage.getNotes(userId);
      res.json(notes);
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get('/api/notes/:id', requireAdmin, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const note = await storage.getNote(noteId, userId);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      console.error("Get note error:", error);
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.post('/api/notes', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const noteData = {
        title,
        content,
        createdBy: userId,
      };

      const note = await storage.createNote(noteData);
      res.json(note);
    } catch (error) {
      console.error("Create note error:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.put('/api/notes/:id', requireAdmin, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const noteData = { title, content };
      const note = await storage.updateNote(noteId, noteData, userId);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      console.error("Update note error:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete('/api/notes/:id', requireAdmin, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
      await storage.deleteNote(noteId, userId);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Progress endpoint for checking upload progress
  app.get('/api/progress/:uploadId', (req, res) => {
    const uploadId = parseInt(req.params.uploadId);
    const progress = uploadProgress.get(uploadId) || { progress: 0, status: 'not_found' };
    res.json(progress);
  });

  // WooCommerce orders API endpoints
  app.get('/api/woo-orders', requireAuth, async (req: any, res) => {
    try {
      const { location, search, startMonth, endMonth } = req.query;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      let wooOrders = [];
      
      if (search) {
        wooOrders = await storage.searchWooOrders(search, location && location !== "all" ? parseInt(location) : undefined);
      } else if (startMonth && endMonth) {
        const startDate = `${startMonth}-01`;
        const endDate = new Date(endMonth + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        
        wooOrders = await storage.getWooOrdersByDateRange(
          startDate, 
          endDate.toISOString().split('T')[0],
          location && location !== "all" ? parseInt(location) : undefined
        );
      } else {
        wooOrders = await storage.getAllWooOrders(location && location !== "all" ? parseInt(location) : undefined);
      }
      
      // Filter by user access if not admin
      if (userRole !== 'admin') {
        const userLocations = await storage.getUserLocationAccess(userId);
        wooOrders = wooOrders.filter(order => userLocations.includes(order.locationId));
      }
      
      res.json(wooOrders);
    } catch (error) {
      console.error("Get WooCommerce orders error:", error);
      res.status(500).json({ message: "Failed to get WooCommerce orders" });
    }
  });

  app.delete('/api/woo-orders/bulk-delete', requireAdmin, async (req, res) => {
    try {
      const { orderIds } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Invalid order IDs" });
      }
      
      const validIds = orderIds
        .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
        .map(id => Number(id));
      
      if (validIds.length === 0) {
        return res.status(400).json({ message: "No valid order IDs provided" });
      }
      
      await storage.deleteWooOrders(validIds);
      res.json({ message: "WooCommerce orders deleted successfully" });
    } catch (error: any) {
      console.error("Delete WooCommerce orders error:", error);
      res.status(500).json({ message: "Failed to delete WooCommerce orders" });
    }
  });

  // Webhook settings API endpoints
  app.get('/api/webhook-settings/:platform', requireAdmin, async (req, res) => {
    try {
      const { platform } = req.params;
      const settings = await storage.getWebhookSettings(platform);
      res.json(settings || { platform, secretKey: '', isActive: false });
    } catch (error) {
      console.error("Get webhook settings error:", error);
      res.status(500).json({ message: "Failed to get webhook settings" });
    }
  });

  app.post('/api/webhook-settings', requireAdmin, async (req, res) => {
    try {
      const { platform, secretKey, isActive } = req.body;
      
      if (!platform || !secretKey) {
        return res.status(400).json({ message: "Platform and secret key are required" });
      }
      
      const settings = await storage.upsertWebhookSettings({
        platform,
        secretKey,
        isActive: isActive !== undefined ? isActive : true
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Save webhook settings error:", error);
      res.status(500).json({ message: "Failed to save webhook settings" });
    }
  });

  // Get webhook logs endpoint
  app.get('/api/webhook-logs/:platform', requireAdmin, async (req, res) => {
    try {
      const { platform } = req.params;
      const { limit } = req.query;
      const logs = await storage.getRecentWebhookLogs(platform, parseInt(limit as string) || 20);
      res.json(logs);
    } catch (error) {
      console.error("Get webhook logs error:", error);
      res.status(500).json({ message: "Failed to get webhook logs" });
    }
  });

  // WooCommerce webhook endpoint
  app.post('/api/webhook/woocommerce', async (req, res) => {
    try {
      console.log('WooCommerce webhook received:', JSON.stringify(req.body, null, 2));
      
      // Get stored webhook settings
      const webhookSettings = await storage.getWebhookSettings('woocommerce');
      if (!webhookSettings || !webhookSettings.isActive) {
        console.log('WooCommerce webhook not configured or inactive');
        return res.status(401).json({ error: 'Webhook not configured' });
      }
      
      // Validate secret key from headers
      const providedSecret = req.headers['x-wc-webhook-signature'] || req.headers['x-webhook-secret'];
      
      if (!providedSecret || providedSecret !== webhookSettings.secretKey) {
        console.log('Invalid or missing webhook secret');
        return res.status(401).json({ error: 'Unauthorized: Invalid webhook secret' });
      }
      
      const orderData = req.body;
      
      // Extract order info for logging
      logData.orderId = orderData?.id?.toString() || orderData?.number?.toString() || null;
      logData.orderTotal = orderData?.total || null;
      logData.customerName = `${orderData?.billing?.first_name || ''} ${orderData?.billing?.last_name || ''}`.trim() || null;
      
      // Validate that this is a proper WooCommerce order webhook
      if (!orderData.id || !orderData.number) {
        logData.errorMessage = 'Invalid webhook data - missing required order fields';
        await storage.createWebhookLog(logData);
        console.log('Invalid webhook data - missing required order fields');
        return res.status(400).json({ error: 'Invalid webhook data' });
      }
      
      // Extract order information
      const wooOrderId = orderData.id?.toString();
      const orderId = orderData.number?.toString() || orderData.id?.toString();
      const status = orderData.status;
      const total = parseFloat(orderData.total || '0');
      const refundTotal = parseFloat(orderData.refund_total || '0');
      
      // Extract customer information
      const billing = orderData.billing || {};
      const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
      const firstName = billing.first_name || '';
      const lastName = billing.last_name || '';
      const customerEmail = billing.email || '';
      
      // Extract location from meta data
      const metaData = orderData.meta_data || [];
      let locationMeta = '';
      let locationName = '';
      
      // Look for location in meta data
      const locationMetaItem = metaData.find((meta: any) => 
        meta.key?.toLowerCase().includes('location') || 
        meta.key?.toLowerCase().includes('store') ||
        meta.key?.toLowerCase().includes('branch')
      );
      
      if (locationMetaItem) {
        locationMeta = locationMetaItem.value;
        locationName = locationMetaItem.value;
      }
      
      // If no location found in meta, use billing city or a default
      if (!locationName) {
        locationName = billing.city || billing.state || 'Default Location';
      }
      
      // Find or create location
      let location = await storage.getLocationByName(locationName);
      if (!location) {
        console.log(`Creating new location: ${locationName}`);
        location = await storage.createLocation({ name: locationName });
      }
      
      // Prepare order data
      const wooOrderData = {
        wooOrderId: wooOrderId || orderId, // Ensure we have a wooOrderId
        orderId,
        locationId: location.id,
        customerName: customerName || 'Unknown',
        firstName,
        lastName,
        customerEmail,
        amount: total.toString(),
        refundAmount: refundTotal > 0 ? refundTotal.toString() : null,
        status,
        orderDate: new Date(orderData.date_created || new Date()),
        wooOrderNumber: orderData.number?.toString() || orderId,
        paymentMethod: orderData.payment_method || null,
        shippingTotal: orderData.shipping_total || '0',
        taxTotal: orderData.tax_total || '0',
        locationMeta,
        orderNotes: orderData.customer_note || null,
        rawData: orderData,
      };
      
      // Check if order already exists
      const existingOrder = await storage.getWooOrderByWooOrderId(wooOrderId);
      
      if (existingOrder) {
        // Update existing order
        console.log(`Updating existing WooCommerce order: ${wooOrderId}`);
        await storage.updateWooOrder(existingOrder.id, wooOrderData);
      } else {
        // Create new order
        console.log(`Creating new WooCommerce order: ${wooOrderId}`);
        await storage.createWooOrder(wooOrderData);
      }
      
      // Log successful webhook processing
      logData.status = 'success';
      logData.location = locationName || 'Default Location';
      await storage.createWebhookLog(logData);
      
      res.status(200).json({ success: true, message: 'Order processed successfully' });
    } catch (error) {
      logData.status = 'error';
      logData.errorMessage = error.message;
      await storage.createWebhookLog(logData);
      console.error('WooCommerce webhook error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
