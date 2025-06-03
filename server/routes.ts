import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startAutoSync, stopAutoSync, restartAutoSync, getSyncStatus } from "./syncManager";
import session from "express-session";
import { z } from "zod";
import axios from "axios";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Simple authentication middleware for this demo
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/logos';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded logos
  app.use('/uploads', express.static('uploads'));

  // Serve favicon at root level
  app.get('/favicon.ico', async (req, res) => {
    try {
      const logoSettings = await storage.getLogoSettings();
      if (logoSettings?.faviconPath) {
        res.sendFile(path.resolve(logoSettings.faviconPath));
      } else {
        res.status(404).send('Favicon not found');
      }
    } catch (error) {
      res.status(404).send('Favicon not found');
    }
  });

  // Serve Open Graph image for social media previews
  app.get('/og-image', async (req, res) => {
    try {
      const logoSettings = await storage.getLogoSettings();
      
      if (logoSettings?.logoPath) {
        const logoPath = path.resolve(logoSettings.logoPath);
        
        // Get file extension to determine MIME type
        const ext = path.extname(logoPath).toLowerCase();
        let mimeType = 'image/png'; // Default
        
        switch (ext) {
          case '.jpg':
          case '.jpeg':
            mimeType = 'image/jpeg';
            break;
          case '.png':
            mimeType = 'image/png';
            break;
          case '.gif':
            mimeType = 'image/gif';
            break;
          case '.webp':
            mimeType = 'image/webp';
            break;
        }
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        return res.sendFile(logoPath);
      }
      
      // Return 404 if no logo is set
      res.status(404).send('Open Graph image not found');
    } catch (error) {
      console.error('Error serving Open Graph image:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Session middleware
  app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password, recaptchaToken } = req.body;
      
      // Check reCAPTCHA if enabled
      const recaptchaSettings = await storage.getRecaptchaSettings();
      if (recaptchaSettings && recaptchaSettings.isActive) {
        if (!recaptchaToken) {
          return res.status(400).json({ message: "reCAPTCHA verification required" });
        }
        
        // Verify reCAPTCHA token
        try {
          const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
          const verifyResponse = await axios.post(verifyUrl, null, {
            params: {
              secret: recaptchaSettings.secretKey,
              response: recaptchaToken
            }
          });
          
          if (!verifyResponse.data.success) {
            return res.status(400).json({ message: "reCAPTCHA verification failed" });
          }
        } catch (recaptchaError) {
          console.error("reCAPTCHA verification error:", recaptchaError);
          return res.status(500).json({ message: "reCAPTCHA verification error" });
        }
      }
      
      const user = await storage.validateUser(username, password);
      
      if (user) {
        req.session.user = user;
        res.json(user);
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/auth/user', (req, res) => {
    if (req.session?.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // Profile routes
  app.put('/api/auth/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { username, firstName, lastName, email, phoneNumber } = req.body;

      // Basic validation
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check if username is already taken by another user
      const existingUser = await storage.getUserByUsername(username.trim());
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const profileData = {
        username: username.trim(),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        email: email?.trim() || null,
        phoneNumber: phoneNumber?.trim() || null,
      };

      const updatedUser = await storage.updateUserProfile(userId, profileData);
      
      // Update session with new user data
      req.session.user = updatedUser;
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.put('/api/auth/password', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      const success = await storage.changeUserPassword(userId, currentPassword, newPassword);
      
      if (success) {
        res.json({ message: "Password changed successfully" });
      } else {
        res.status(500).json({ message: "Failed to change password" });
      }
    } catch (error: any) {
      console.error("Change password error:", error);
      if (error.message === "Current password is incorrect") {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message || "Failed to change password" });
      }
    }
  });

  // User routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.updateUser(userId, req.body);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User location access routes
  app.get('/api/users/:id/locations', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const locationIds = await storage.getUserLocationAccess(userId);
      res.json(locationIds);
    } catch (error) {
      console.error("Get user locations error:", error);
      res.status(500).json({ message: "Failed to get user locations" });
    }
  });

  app.post('/api/users/:id/locations', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { locationIds } = req.body;
      console.log("Location update request - userId:", userId, "body:", req.body, "locationIds:", locationIds);
      
      // Ensure locationIds is an array of numbers
      const validLocationIds = Array.isArray(locationIds) 
        ? locationIds.filter(id => typeof id === 'number' || (typeof id === 'string' && !isNaN(Number(id)))).map(id => Number(id))
        : [];
        
      await storage.setUserLocationAccess(userId, validLocationIds);
      res.json({ message: "User location access updated successfully" });
    } catch (error) {
      console.error("Update user locations error:", error);
      res.status(500).json({ message: "Failed to update user locations" });
    }
  });

  // Update user route
  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user route
  app.delete('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User page permissions routes
  app.get('/api/auth/permissions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const permissions = await storage.getUserPagePermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Get user permissions error:", error);
      res.status(500).json({ message: "Failed to get user permissions" });
    }
  });

  // User status access routes
  app.get('/api/users/:id/statuses', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const statuses = await storage.getUserStatusAccess(userId);
      res.json(statuses);
    } catch (error) {
      console.error("Get user statuses error:", error);
      res.status(500).json({ message: "Failed to get user statuses" });
    }
  });

  app.post('/api/users/:id/statuses', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { statuses } = req.body;
      await storage.setUserStatusAccess(userId, statuses || []);
      res.json({ message: "User status access updated successfully" });
    } catch (error) {
      console.error("Update user statuses error:", error);
      res.status(500).json({ message: "Failed to update user statuses" });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error("Get locations error:", error);
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const location = await storage.createLocation(req.body);
      res.json(location);
    } catch (error) {
      console.error("Create location error:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.delete('/api/locations', isAuthenticated, async (req, res) => {
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

  // Order management endpoints
  // Bulk delete orders (admin only)
  app.delete('/api/orders/bulk-delete', isAuthenticated, async (req, res) => {
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
      console.log("Delete operation completed");
      res.json({ message: "Orders deleted successfully" });
    } catch (error: any) {
      console.error("Delete orders error:", error);
      res.status(500).json({ message: "Failed to delete orders" });
    }
  });

  // Auto sync settings endpoints
  app.get('/api/sync-settings/:platform', isAuthenticated, async (req, res) => {
    try {
      const { platform } = req.params;
      const settings = await storage.getSyncSettings(platform);
      res.json(settings || { platform, isActive: false, intervalMinutes: 5 });
    } catch (error) {
      console.error("Get sync settings error:", error);
      res.status(500).json({ message: "Failed to get sync settings" });
    }
  });

  // Get detailed sync status
  app.get('/api/sync-status/:platform', isAuthenticated, async (req, res) => {
    try {
      const { platform } = req.params;
      const settings = await storage.getSyncSettings(platform);
      
      if (!settings) {
        return res.json({
          isActive: false,
          intervalMinutes: 5,
          lastSyncAt: null,
          lastOrderCount: 0,
          isRunning: false,
        });
      }

      res.json({
        isActive: settings.isActive || false,
        intervalMinutes: settings.intervalMinutes || 5,
        lastSyncAt: settings.lastSyncAt,
        lastOrderCount: settings.lastOrderCount || 0,
        isRunning: settings.isRunning || false,
      });
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  app.post('/api/sync-settings', isAuthenticated, async (req, res) => {
    try {
      const { platform, isActive, intervalMinutes } = req.body;
      
      // Calculate next sync time
      const now = new Date();
      const nextSync = new Date(now.getTime() + (intervalMinutes || 5) * 60 * 1000);
      
      const settings = await storage.upsertSyncSettings({
        platform,
        isActive,
        intervalMinutes: intervalMinutes || 5,
        nextSyncAt: nextSync
      });
      
      // Restart auto sync with new settings
      if (isActive) {
        await restartAutoSync();
      } else {
        await stopAutoSync();
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update sync settings error:", error);
      res.status(500).json({ message: "Failed to update sync settings" });
    }
  });

  app.get('/api/sync-status', isAuthenticated, async (req, res) => {
    try {
      const { platform = 'woocommerce' } = req.query;
      const systemStatus = getSyncStatus();
      const settings = await storage.getSyncSettings(platform as string);
      
      res.json({
        ...systemStatus,
        settings: settings || { platform: platform as string, isActive: false, intervalMinutes: 5 },
        nextSyncIn: settings?.nextSyncAt ? Math.max(0, Math.floor((new Date(settings.nextSyncAt).getTime() - Date.now()) / 1000)) : 0
      });
    } catch (error) {
      console.error("Get sync status error:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  app.post('/api/start-sync', isAuthenticated, async (req, res) => {
    try {
      const { platform = 'woocommerce' } = req.body;
      await restartAutoSync(platform);
      res.json({ success: true, message: "Auto sync started successfully" });
    } catch (error) {
      console.error("Start sync error:", error);
      res.status(500).json({ message: "Failed to start auto sync" });
    }
  });

  app.post('/api/stop-sync', isAuthenticated, async (req, res) => {
    try {
      const { platform = 'woocommerce' } = req.body;
      await stopAutoSync(platform);
      res.json({ success: true, message: "Auto sync stopped successfully" });
    } catch (error) {
      console.error("Stop sync error:", error);
      res.status(500).json({ message: "Failed to stop auto sync" });
    }
  });



  // REST API settings endpoints
  app.get('/api/rest-api-settings/:platform', isAuthenticated, async (req, res) => {
    try {
      const { platform } = req.params;
      const settings = await storage.getRestApiSettings(platform);
      res.json(settings || { platform, consumerKey: '', consumerSecret: '', storeUrl: '', isActive: true });
    } catch (error) {
      console.error("Get REST API settings error:", error);
      res.status(500).json({ message: "Failed to get REST API settings" });
    }
  });

  app.post('/api/rest-api-settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.upsertRestApiSettings(req.body);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update REST API settings error:", error);
      res.status(500).json({ message: "Failed to update REST API settings" });
    }
  });

  // reCAPTCHA settings endpoints
  app.get('/api/recaptcha-settings', async (req, res) => {
    try {
      const settings = await storage.getRecaptchaSettings();
      // Only return public settings (not the secret key)
      if (settings) {
        res.json({ 
          siteKey: settings.siteKey, 
          isEnabled: settings.isActive || false
        });
      } else {
        res.json({ siteKey: '', isEnabled: false });
      }
    } catch (error) {
      console.error("Get reCAPTCHA settings error:", error);
      res.status(500).json({ message: "Failed to get reCAPTCHA settings" });
    }
  });

  // Full reCAPTCHA settings endpoint (authenticated, returns secret key for settings page)
  app.get('/api/recaptcha-settings/admin', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getRecaptchaSettings();
      res.json(settings || { siteKey: '', secretKey: '', isActive: false });
    } catch (error) {
      console.error("Get reCAPTCHA admin settings error:", error);
      res.status(500).json({ message: "Failed to get reCAPTCHA settings" });
    }
  });

  app.post('/api/recaptcha-settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.upsertRecaptchaSettings(req.body);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update reCAPTCHA settings error:", error);
      res.status(500).json({ message: "Failed to update reCAPTCHA settings" });
    }
  });

  // Verify reCAPTCHA token
  app.post('/api/verify-recaptcha', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "reCAPTCHA token is required" });
      }

      const settings = await storage.getRecaptchaSettings();
      if (!settings || !settings.isActive) {
        return res.json({ success: true, message: "reCAPTCHA is disabled" });
      }

      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
      const response = await axios.post(verifyUrl, null, {
        params: {
          secret: settings.secretKey,
          response: token
        }
      });

      if (response.data.success) {
        res.json({ success: true, message: "reCAPTCHA verification successful" });
      } else {
        res.status(400).json({ success: false, message: "reCAPTCHA verification failed" });
      }
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      res.status(500).json({ success: false, message: "reCAPTCHA verification error" });
    }
  });

  // Test WooCommerce connection endpoint
  app.post('/api/test-woo-connection', isAuthenticated, async (req, res) => {
    try {
      const { storeUrl, consumerKey, consumerSecret } = req.body;
      
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ message: "Missing required API credentials" });
      }

      // Test connection by fetching a single order
      const testUrl = `${storeUrl}/wp-json/wc/v3/orders?per_page=1&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
      
      const response = await axios.get(testUrl);
      
      if (response.status === 200) {
        res.json({ 
          success: true, 
          message: "Connection successful! Your WooCommerce store is accessible.",
          ordersCount: Array.isArray(response.data) ? response.data.length : 0
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: "Connection failed. Please check your credentials." 
        });
      }

    } catch (error) {
      console.error("Test connection error:", error);
      res.status(500).json({ 
        success: false, 
        message: `Connection failed: ${error.response?.data?.message || error.message}` 
      });
    }
  });

  // Manual import endpoint
  app.post('/api/import-woo-orders', isAuthenticated, async (req, res) => {
    try {
      const { storeUrl, consumerKey, consumerSecret, startDate, endDate } = req.body;
      
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ message: "Missing required API credentials" });
      }

      let imported = 0;
      let skipped = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        let url = `${storeUrl}/wp-json/wc/v3/orders?per_page=100&page=${page}&orderby=date&order=desc&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        
        // Add date range filtering if provided
        if (startDate) {
          url += `&after=${startDate}T00:00:00`;
        }
        if (endDate) {
          url += `&before=${endDate}T23:59:59`;
        }
        
        const response = await axios.get(url);
        const orders = response.data;
        
        if (!Array.isArray(orders) || orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            // Check if order already exists
            const existingOrder = await storage.getWooOrderByWooOrderId(order.id.toString());
            if (existingOrder) {
              skipped++;
              continue;
            }

            // Location assignment logic with domain-based defaults
            let location = null;
            const orderableLocationMeta = order.meta_data?.find((meta: any) => meta.key === '_orderable_location_name')?.value;
            
            console.log(`Processing order ${order.id}, Store URL: ${storeUrl}`);
            console.log(`Orderable metadata found: ${orderableLocationMeta || 'None'}`);
            
            if (orderableLocationMeta) {
              // Use orderable metadata if available
              location = await storage.getLocationByName(orderableLocationMeta);
              if (!location) {
                location = await storage.createLocation({ name: orderableLocationMeta });
              }
              console.log(`Using orderable location: ${location.name}`);
            } else {
              // No orderable metadata - assign default location based on store domain
              let defaultLocationName = '';
              
              if (storeUrl.includes('delaware.nanushotchicken.co')) {
                defaultLocationName = '414 North Union St, Wilmington DE';
              } else if (storeUrl.includes('drexel.nanushotchicken.co')) {
                defaultLocationName = '3301 Market St, Philadelphia';
              } else {
                // Main store or any other domain
                defaultLocationName = '4407 Chestnut St, Philadelphia';
              }
              
              console.log(`No orderable metadata, using default location: ${defaultLocationName} for domain: ${storeUrl}`);
              
              location = await storage.getLocationByName(defaultLocationName);
              if (!location) {
                location = await storage.createLocation({ 
                  name: defaultLocationName,
                  code: defaultLocationName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                  isActive: true
                });
                console.log(`Created new location: ${location.name}`);
              } else {
                console.log(`Using existing location: ${location.name}`);
              }
            }

            // Create order data
            const orderData = {
              wooOrderId: order.id.toString(),
              orderId: order.number.toString(),
              locationId: location.id,
              customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || null,
              firstName: order.billing?.first_name || null,
              lastName: order.billing?.last_name || null,
              customerEmail: order.billing?.email || null,
              customerPhone: order.billing?.phone || null,
              customerId: order.customer_id?.toString() || null,
              amount: order.total,
              subtotal: order.subtotal || '0',
              shippingTotal: order.shipping_total || '0',
              taxTotal: order.tax_total || '0',
              discountTotal: order.discount_total || '0',
              refundAmount: '0',
              status: order.status,
              orderDate: new Date(order.date_created),
              wooOrderNumber: order.number.toString(),
              paymentMethod: order.payment_method || null,
              paymentMethodTitle: order.payment_method_title || null,
              currency: order.currency || 'USD',
              shippingFirstName: order.shipping?.first_name || null,
              shippingLastName: order.shipping?.last_name || null,
              shippingAddress1: order.shipping?.address_1 || null,
              shippingAddress2: order.shipping?.address_2 || null,
              shippingCity: order.shipping?.city || null,
              shippingState: order.shipping?.state || null,
              shippingPostcode: order.shipping?.postcode || null,
              shippingCountry: order.shipping?.country || null,
              billingFirstName: order.billing?.first_name || null,
              billingLastName: order.billing?.last_name || null,
              billingAddress1: order.billing?.address_1 || null,
              billingAddress2: order.billing?.address_2 || null,
              billingCity: order.billing?.city || null,
              billingState: order.billing?.state || null,
              billingPostcode: order.billing?.postcode || null,
              billingCountry: order.billing?.country || null,
              locationMeta: orderableLocationMeta || 'Unknown Location',
              orderNotes: order.customer_note || null,
              customerNote: order.customer_note || null,
              lineItems: JSON.stringify(order.line_items || []),
              metaData: JSON.stringify(order.meta_data || []),
              rawData: JSON.stringify(order)
            };

            await storage.createWooOrder(orderData);
            imported++;
          } catch (orderError) {
            console.error(`Failed to import order ${order.id}:`, orderError);
            skipped++;
          }
        }

        page++;
        if (orders.length < 100) {
          hasMore = false;
        }
      }

      res.json({ 
        success: true, 
        message: `Import completed: ${imported} orders imported, ${skipped} skipped`,
        imported,
        skipped
      });

    } catch (error) {
      console.error("Import orders error:", error);
      res.status(500).json({ 
        success: false, 
        message: `Import failed: ${error.message}` 
      });
    }
  });



  // Dashboard routes
  app.get('/api/dashboard/summary', isAuthenticated, async (req, res) => {
    try {
      const { location, locationId, month, startMonth, endMonth, statuses } = req.query;
      
      // Use raw SQL query to bypass ORM date issues
      const { pool } = await import('./db');
      
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      
      // Handle location parameter (can be 'location' or 'locationId')
      const targetLocationId = location || locationId;
      if (targetLocationId && targetLocationId !== 'all') {
        whereClause += ` AND location_id = $${params.length + 1}`;
        params.push(parseInt(targetLocationId as string));
      }
      
      // Handle date filtering - prioritize startMonth/endMonth over month
      if (startMonth && endMonth) {
        // Date range filtering
        const startDate = `${startMonth}-01`;
        const [endYear, endMonthNum] = (endMonth as string).split('-');
        const lastDay = new Date(parseInt(endYear), parseInt(endMonthNum), 0).getDate();
        const endDate = `${endMonth}-${lastDay.toString().padStart(2, '0')}`;
        
        whereClause += ` AND order_date >= $${params.length + 1} AND order_date <= $${params.length + 2}`;
        params.push(startDate);
        params.push(endDate);
      } else if (month) {
        // Single month filtering (for backward compatibility)
        whereClause += ` AND TO_CHAR(order_date, 'YYYY-MM') = $${params.length + 1}`;
        params.push(month);
      }
      
      // Handle status filtering - properly parse multiple status parameters
      if (statuses) {
        let statusFilter: string[] = [];
        if (Array.isArray(statuses)) {
          statusFilter = statuses.filter(s => typeof s === 'string') as string[];
        } else {
          // Single status or comma-separated statuses
          statusFilter = [statuses as string];
        }
        
        if (statusFilter.length > 0) {
          const statusPlaceholders = statusFilter.map((_, index) => `$${params.length + index + 1}`).join(', ');
          whereClause += ` AND status IN (${statusPlaceholders})`;
          params.push(...statusFilter);
        }
      }
      
      const query = `
        SELECT 
          COALESCE(SUM(amount::decimal), 0) as total_sales,
          COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount::decimal ELSE 0 END), 0) as total_refunds,
          COUNT(*) as total_orders,
          COALESCE(SUM(amount::decimal * 0.07), 0) as platform_fees,
          COALESCE(SUM(amount::decimal * 0.029 + 0.30), 0) as stripe_fees,
          COALESCE(SUM(amount::decimal - (amount::decimal * 0.07) - (amount::decimal * 0.029 + 0.30)), 0) as net_deposit
        FROM woo_orders 
        ${whereClause}
      `;

      const result = await pool.query(query, params);
      const row = result.rows[0] as any;

      const summary = {
        totalSales: parseFloat(row.total_sales || '0'),
        totalOrders: parseInt(row.total_orders || '0'),
        totalRefunds: parseFloat(row.total_refunds || '0'),
        platformFees: parseFloat(row.platform_fees || '0'),
        stripeFees: parseFloat(row.stripe_fees || '0'),
        netDeposit: parseFloat(row.net_deposit || '0'),
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Failed to get dashboard summary" });
    }
  });

  app.get('/api/dashboard/monthly-breakdown', isAuthenticated, async (req, res) => {
    try {
      const { year, locationId, location, startMonth, endMonth, statuses } = req.query;
      const { pool } = await import('./db');
      
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      
      // Initialize status filter at the top level scope
      let statusFilter: string[] = [];
      
      // Handle location parameter (can be 'location' or 'locationId')
      const targetLocationId = location || locationId;
      if (targetLocationId && targetLocationId !== 'all') {
        whereClause += ` AND location_id = $${params.length + 1}`;
        params.push(parseInt(targetLocationId as string));
      }
      
      // Handle date filtering - prioritize startMonth/endMonth over year
      if (startMonth && endMonth) {
        // Date range filtering
        const startDate = `${startMonth}-01`;
        const [endYear, endMonthNum] = (endMonth as string).split('-');
        const lastDay = new Date(parseInt(endYear), parseInt(endMonthNum), 0).getDate();
        const endDate = `${endMonth}-${lastDay.toString().padStart(2, '0')}`;
        
        whereClause += ` AND order_date >= $${params.length + 1} AND order_date <= $${params.length + 2}`;
        params.push(startDate);
        params.push(endDate);
      } else if (year) {
        // Year filtering (for backward compatibility)
        const currentYear = parseInt(year as string);
        whereClause += ` AND EXTRACT(YEAR FROM order_date) = $${params.length + 1}`;
        params.push(currentYear);
      }
      
      // Handle status filtering - properly parse multiple status parameters
      if (statuses) {
        if (Array.isArray(statuses)) {
          statusFilter = statuses.filter(s => typeof s === 'string') as string[];
        } else {
          // Single status or comma-separated statuses
          statusFilter = [statuses as string];
        }
        
        if (statusFilter.length > 0) {
          const statusPlaceholders = statusFilter.map((_, index) => `$${params.length + index + 1}`).join(', ');
          whereClause += ` AND status IN (${statusPlaceholders})`;
          params.push(...statusFilter);
        }
      }
      
      const query = `
        SELECT 
          TO_CHAR(order_date, 'YYYY-MM') as month,
          COALESCE(SUM(amount::decimal), 0) as total_sales,
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount::decimal ELSE 0 END), 0) as total_refunds,
          COALESCE(SUM(amount::decimal - (amount::decimal * 0.07) - (amount::decimal * 0.029 + 0.30)), 0) as net_amount
        FROM woo_orders 
        ${whereClause}
        GROUP BY TO_CHAR(order_date, 'YYYY-MM')
        ORDER BY month DESC
      `;

      const result = await pool.query(query, params);
      
      // Capture statusFilter for use in nested function
      const capturedStatusFilter = statusFilter;
      
      // Fetch individual orders for each month
      const breakdown = await Promise.all(
        result.rows.map(async (row: any) => {
          const month = row.month;
          
          // Get orders for this specific month
          let orderWhereClause = `WHERE TO_CHAR(w.order_date, 'YYYY-MM') = $1`;
          const orderParams: any[] = [month];
          
          if (targetLocationId && targetLocationId !== 'all') {
            orderWhereClause += ` AND w.location_id = $${orderParams.length + 1}`;
            orderParams.push(parseInt(targetLocationId as string));
          }
          
          // Add status filtering to individual orders as well
          if (capturedStatusFilter.length > 0) {
            const statusPlaceholders = capturedStatusFilter.map((_, index) => `$${orderParams.length + index + 1}`).join(', ');
            orderWhereClause += ` AND w.status IN (${statusPlaceholders})`;
            orderParams.push(...capturedStatusFilter);
          }
          
          const orderQuery = `
            SELECT w.id, w.woo_order_id as "orderId", w.order_date as "orderDate", 
                   COALESCE(
                     NULLIF(w.customer_name, ''),
                     TRIM(CONCAT(COALESCE(w.billing_first_name, ''), ' ', COALESCE(w.billing_last_name, ''))),
                     TRIM(CONCAT(COALESCE(w.shipping_first_name, ''), ' ', COALESCE(w.shipping_last_name, ''))),
                     COALESCE(w.customer_email, '')
                   ) as "customerName", 
                   w.customer_email as "customerEmail",
                   w.amount, w.status, w.billing_address_1 as "cardLast4", 
                   CASE WHEN w.status = 'refunded' THEN w.amount ELSE 0 END as "refundAmount",
                   l.name as "locationName"
            FROM woo_orders w
            LEFT JOIN locations l ON w.location_id = l.id
            ${orderWhereClause}
            ORDER BY w.order_date DESC
          `;
          
          const orderResult = await pool.query(orderQuery, orderParams);
          
          return {
            month: row.month,
            totalSales: parseFloat(row.total_sales || '0'),
            totalOrders: parseInt(row.total_orders || '0'),
            totalRefunds: parseFloat(row.total_refunds || '0'),
            netAmount: parseFloat(row.net_amount || '0'),
            orders: orderResult.rows
          };
        })
      );
      
      res.json(breakdown);
    } catch (error) {
      console.error("Monthly breakdown error:", error);
      res.status(500).json({ message: "Failed to get monthly breakdown" });
    }
  });

  // Store connections endpoints
  app.get('/api/store-connections', isAuthenticated, async (req, res) => {
    try {
      const connections = await storage.getAllStoreConnections();
      res.json(connections);
    } catch (error) {
      console.error("Get store connections error:", error);
      res.status(500).json({ message: "Failed to get store connections" });
    }
  });

  // SEPARATE REPORTS ENDPOINTS - completely independent from dashboard
  app.get('/api/reports/summary', isAuthenticated, async (req, res) => {
    try {
      const { locationId, location, statuses } = req.query;
      const { pool } = await import('./db');
      
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      
      // Handle location filtering for reports
      const targetLocationId = location || locationId;
      if (targetLocationId && targetLocationId !== 'all') {
        whereClause += ` AND location_id = $${params.length + 1}`;
        params.push(parseInt(targetLocationId as string));
      }
      
      // Handle date filtering for reports summary
      const { startMonth, endMonth } = req.query;
      if (startMonth && endMonth) {
        const startDate = `${startMonth}-01`;
        const [endYear, endMonthNum] = (endMonth as string).split('-');
        const lastDay = new Date(parseInt(endYear), parseInt(endMonthNum), 0).getDate();
        const endDate = `${endMonth}-${lastDay.toString().padStart(2, '0')}`;
        
        whereClause += ` AND order_date >= $${params.length + 1} AND order_date <= $${params.length + 2}`;
        params.push(startDate);
        params.push(endDate);
      }
      
      // Handle status filtering for reports
      if (statuses && Array.isArray(statuses) && statuses.length > 0) {
        const statusFilter = statuses as string[];
        const statusPlaceholders = statusFilter.map((_, index) => `$${params.length + index + 1}`).join(', ');
        whereClause += ` AND status IN (${statusPlaceholders})`;
        params.push(...statusFilter);
      } else if (statuses && !Array.isArray(statuses)) {
        whereClause += ` AND status = $${params.length + 1}`;
        params.push(statuses);
      }
      
      const query = `
        SELECT 
          COALESCE(SUM(amount::decimal), 0) as total_sales,
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount::decimal ELSE 0 END), 0) as total_refunds,
          COALESCE(SUM(amount::decimal * 0.07), 0) as platform_fees,
          COALESCE(SUM(amount::decimal * 0.029 + 0.30), 0) as stripe_fees,
          COALESCE(SUM(amount::decimal - (amount::decimal * 0.07) - (amount::decimal * 0.029 + 0.30)), 0) as net_deposit
        FROM woo_orders 
        ${whereClause}
      `;
      
      const result = await pool.query(query, params);
      const row = result.rows[0];
      
      // Convert string values to numbers and fix field names to match frontend expectations
      const summary = {
        totalSales: parseFloat(row.total_sales) || 0,
        totalOrders: parseInt(row.total_orders) || 0,
        totalRefunds: parseFloat(row.total_refunds) || 0,
        platformFees: parseFloat(row.platform_fees) || 0,
        stripeFees: parseFloat(row.stripe_fees) || 0,
        netDeposit: parseFloat(row.net_deposit) || 0
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Reports summary error:", error);
      res.status(500).json({ message: "Failed to get reports summary" });
    }
  });

  app.get('/api/reports/monthly-breakdown', isAuthenticated, async (req, res) => {
    try {
      const { year, locationId, location, startMonth, endMonth, statuses } = req.query;
      const { pool } = await import('./db');
      
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      
      // Initialize status filter at the top level scope
      let statusFilter: string[] = [];
      
      // Handle location parameter for reports
      const targetLocationId = location || locationId;
      if (targetLocationId && targetLocationId !== 'all') {
        whereClause += ` AND location_id = $${params.length + 1}`;
        params.push(parseInt(targetLocationId as string));
      }
      
      // Handle date filtering
      if (startMonth && endMonth) {
        const startDate = `${startMonth}-01`;
        const [endYear, endMonthNum] = (endMonth as string).split('-');
        const lastDay = new Date(parseInt(endYear), parseInt(endMonthNum), 0).getDate();
        const endDate = `${endMonth}-${lastDay.toString().padStart(2, '0')}`;
        
        whereClause += ` AND order_date >= $${params.length + 1} AND order_date <= $${params.length + 2}`;
        params.push(startDate);
        params.push(endDate);
      } else if (year) {
        const currentYear = parseInt(year as string);
        whereClause += ` AND EXTRACT(YEAR FROM order_date) = $${params.length + 1}`;
        params.push(currentYear);
      }
      
      // Handle status filtering for reports - NO default filtering
      if (statuses && Array.isArray(statuses) && statuses.length > 0) {
        statusFilter = statuses as string[];
        const statusPlaceholders = statusFilter.map((_, index) => `$${params.length + index + 1}`).join(', ');
        whereClause += ` AND status IN (${statusPlaceholders})`;
        params.push(...statusFilter);
      } else if (statuses && !Array.isArray(statuses)) {
        statusFilter = [statuses as string];
        whereClause += ` AND status = $${params.length + 1}`;
        params.push(statuses);
      }
      
      const query = `
        SELECT 
          TO_CHAR(order_date, 'YYYY-MM') as month,
          COALESCE(SUM(amount::decimal), 0) as total_sales,
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount::decimal ELSE 0 END), 0) as total_refunds,
          COALESCE(SUM(amount::decimal - (amount::decimal * 0.07) - (amount::decimal * 0.029 + 0.30)), 0) as net_amount
        FROM woo_orders 
        ${whereClause}
        GROUP BY TO_CHAR(order_date, 'YYYY-MM')
        ORDER BY month DESC
      `;

      const result = await pool.query(query, params);
      
      // Capture statusFilter for use in nested function
      const capturedStatusFilter = statusFilter;
      
      // Fetch individual orders for each month
      const breakdown = await Promise.all(
        result.rows.map(async (row: any) => {
          const month = row.month;
          
          // Get orders for this specific month
          let orderWhereClause = `WHERE TO_CHAR(w.order_date, 'YYYY-MM') = $1`;
          const orderParams: any[] = [month];
          
          if (targetLocationId && targetLocationId !== 'all') {
            orderWhereClause += ` AND w.location_id = $${orderParams.length + 1}`;
            orderParams.push(parseInt(targetLocationId as string));
          }
          
          // Add status filtering to individual orders as well
          if (capturedStatusFilter.length > 0) {
            const statusPlaceholders = capturedStatusFilter.map((_, index) => `$${orderParams.length + index + 1}`).join(', ');
            orderWhereClause += ` AND w.status IN (${statusPlaceholders})`;
            orderParams.push(...capturedStatusFilter);
          }
          
          const orderQuery = `
            SELECT w.id, w.woo_order_id as "orderId", w.order_date as "orderDate", 
                   COALESCE(
                     NULLIF(w.customer_name, ''),
                     TRIM(CONCAT(COALESCE(w.billing_first_name, ''), ' ', COALESCE(w.billing_last_name, ''))),
                     TRIM(CONCAT(COALESCE(w.shipping_first_name, ''), ' ', COALESCE(w.shipping_last_name, ''))),
                     COALESCE(w.customer_email, '')
                   ) as "customerName",
                   w.billing_first_name as "billingFirstName",
                   w.billing_last_name as "billingLastName", 
                   w.billing_address_1 as "billingAddress1",
                   w.shipping_first_name as "shippingFirstName",
                   w.shipping_last_name as "shippingLastName",
                   w.shipping_address_1 as "shippingAddress1",
                   w.customer_email as "customerEmail",
                   w.amount, w.status, w.location_id as "locationId",
                   CASE WHEN w.status = 'refunded' THEN w.amount ELSE 0 END as "refundAmount",
                   COALESCE(l.name, 'Unknown Location') as "locationName"
            FROM woo_orders w
            LEFT JOIN locations l ON w.location_id = l.id
            ${orderWhereClause}
            ORDER BY w.order_date DESC
          `;
          
          const orderResult = await pool.query(orderQuery, orderParams);
          
          return {
            month: row.month,
            totalSales: parseFloat(row.total_sales),
            totalOrders: parseInt(row.total_orders),
            totalRefunds: parseFloat(row.total_refunds),
            netAmount: parseFloat(row.net_amount),
            orders: orderResult.rows
          };
        })
      );
      
      res.json(breakdown);
    } catch (error) {
      console.error("Reports monthly breakdown error:", error);
      res.status(500).json({ message: "Failed to get reports monthly breakdown" });
    }
  });

  app.post('/api/store-connections', isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.createStoreConnection(req.body);
      
      // Automatically enable auto-sync for new store connections
      const platform = connection.platform;
      await storage.upsertSyncSettings({
        platform: platform,
        isActive: true,
        intervalMinutes: 5,
        isRunning: false,
        lastSyncAt: null,
        nextSyncAt: null
      });
      
      // Start auto-sync for this new connection
      const { startAutoSync } = await import('./syncManager');
      await startAutoSync(platform);
      
      res.json({ success: true, connection });
    } catch (error) {
      console.error("Create store connection error:", error);
      res.status(500).json({ message: "Failed to create store connection" });
    }
  });

  app.delete('/api/store-connections/:connectionId', isAuthenticated, async (req, res) => {
    try {
      const { connectionId } = req.params;
      await storage.deleteStoreConnection(connectionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete store connection error:", error);
      res.status(500).json({ message: "Failed to delete store connection" });
    }
  });

  // Footer settings routes
  app.get('/api/footer-settings', async (req, res) => {
    try {
      const settings = await storage.getFooterSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching footer settings:", error);
      res.status(500).json({ message: "Failed to fetch footer settings" });
    }
  });

  app.post('/api/footer-settings', isAuthenticated, async (req, res) => {
    try {
      const { customCode, isEnabled } = req.body;
      
      const settings = await storage.upsertFooterSettings({
        customCode: customCode || '',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      });
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating footer settings:", error);
      res.status(500).json({ message: "Failed to update footer settings" });
    }
  });

  // Logo settings routes
  app.get('/api/logo-settings', async (req, res) => {
    try {
      const settings = await storage.getLogoSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching logo settings:", error);
      res.status(500).json({ message: "Failed to fetch logo settings" });
    }
  });

  app.post('/api/logo-upload', isAuthenticated, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const existingSettings = await storage.getLogoSettings();
      
      // Delete old logo if exists
      if (existingSettings?.logoPath) {
        try {
          await fs.unlink(existingSettings.logoPath);
        } catch (deleteError) {
          console.warn("Could not delete old logo file:", deleteError);
        }
      }

      const updateData = {
        logoPath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      };

      // Preserve existing favicon data if it exists
      if (existingSettings) {
        Object.assign(updateData, {
          faviconPath: existingSettings.faviconPath,
          faviconOriginalName: existingSettings.faviconOriginalName,
          faviconMimeType: existingSettings.faviconMimeType,
          faviconFileSize: existingSettings.faviconFileSize,
        });
      }

      const settings = await storage.upsertLogoSettings(updateData);

      res.json({ success: true, logoPath: `/uploads/logos/${req.file.filename}`, settings });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.post('/api/favicon-upload', isAuthenticated, logoUpload.single('favicon'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const existingSettings = await storage.getLogoSettings();
      
      // Delete old favicon if exists
      if (existingSettings?.faviconPath) {
        try {
          await fs.unlink(existingSettings.faviconPath);
        } catch (deleteError) {
          console.warn("Could not delete old favicon file:", deleteError);
        }
      }

      const updateData = {
        faviconPath: req.file.path,
        faviconOriginalName: req.file.originalname,
        faviconMimeType: req.file.mimetype,
        faviconFileSize: req.file.size,
      };

      // Preserve existing logo data if it exists
      if (existingSettings) {
        Object.assign(updateData, {
          logoPath: existingSettings.logoPath,
          originalName: existingSettings.originalName,
          mimeType: existingSettings.mimeType,
          fileSize: existingSettings.fileSize,
        });
      }

      const settings = await storage.upsertLogoSettings(updateData);

      res.json({ success: true, faviconPath: `/uploads/logos/${req.file.filename}`, settings });
    } catch (error) {
      console.error("Error uploading favicon:", error);
      res.status(500).json({ message: "Failed to upload favicon" });
    }
  });

  app.delete('/api/logo-settings', isAuthenticated, async (req, res) => {
    try {
      const existingSettings = await storage.getLogoSettings();
      
      // Delete logo file if exists
      if (existingSettings?.logoPath) {
        try {
          await fs.unlink(existingSettings.logoPath);
        } catch (deleteError) {
          console.warn("Could not delete logo file:", deleteError);
        }
      }

      // Delete favicon file if exists
      if (existingSettings?.faviconPath) {
        try {
          await fs.unlink(existingSettings.faviconPath);
        } catch (deleteError) {
          console.warn("Could not delete favicon file:", deleteError);
        }
      }

      await storage.deleteLogoSettings();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logo settings:", error);
      res.status(500).json({ message: "Failed to delete logo settings" });
    }
  });

  app.delete('/api/logo-only', isAuthenticated, async (req, res) => {
    try {
      const existingSettings = await storage.getLogoSettings();
      
      if (existingSettings?.logoPath) {
        try {
          await fs.unlink(existingSettings.logoPath);
        } catch (deleteError) {
          console.warn("Could not delete logo file:", deleteError);
        }
      }

      if (existingSettings) {
        const updateData = {
          logoPath: null,
          originalName: null,
          mimeType: null,
          fileSize: null,
          faviconPath: existingSettings.faviconPath,
          faviconOriginalName: existingSettings.faviconOriginalName,
          faviconMimeType: existingSettings.faviconMimeType,
          faviconFileSize: existingSettings.faviconFileSize,
        };

        await storage.upsertLogoSettings(updateData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting logo:", error);
      res.status(500).json({ message: "Failed to delete logo" });
    }
  });

  app.delete('/api/favicon-only', isAuthenticated, async (req, res) => {
    try {
      const existingSettings = await storage.getLogoSettings();
      
      if (existingSettings?.faviconPath) {
        try {
          await fs.unlink(existingSettings.faviconPath);
        } catch (deleteError) {
          console.warn("Could not delete favicon file:", deleteError);
        }
      }

      if (existingSettings) {
        const updateData = {
          logoPath: existingSettings.logoPath,
          originalName: existingSettings.originalName,
          mimeType: existingSettings.mimeType,
          fileSize: existingSettings.fileSize,
          faviconPath: null,
          faviconOriginalName: null,
          faviconMimeType: null,
          faviconFileSize: null,
        };

        await storage.upsertLogoSettings(updateData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting favicon:", error);
      res.status(500).json({ message: "Failed to delete favicon" });
    }
  });

  const httpServer = createServer(app);
  
  // Start auto sync on server startup
  setTimeout(async () => {
    try {
      await startAutoSync();
    } catch (error) {
      console.log("Auto sync not started:", error.message);
    }
  }, 5000);
  
  return httpServer;
}