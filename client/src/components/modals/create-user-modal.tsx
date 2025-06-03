import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Shield, Eye, Edit } from "lucide-react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: any;
}

const MENU_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: Shield },
  { id: 'reports', name: 'Reports', icon: Eye },
  { id: 'locations', name: 'Locations', icon: MapPin },
  { id: 'users', name: 'User Management', icon: Shield },
  { id: 'settings', name: 'Settings', icon: Edit },
  { id: 'logo', name: 'Logo Settings', icon: Edit },
  { id: 'footer', name: 'Footer Settings', icon: Edit },
  { id: 'recaptcha', name: 'reCAPTCHA Settings', icon: Edit },
  { id: 'api-connections', name: 'API Connections', icon: Edit },
];

const ORDER_STATUSES = [
  'completed', 'processing', 'refunded', 'cancelled', 'on-hold', 'pending', 'failed'
];

export default function CreateUserModal({ isOpen, onClose, editingUser }: CreateUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(editingUser);
  
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    mustChangePassword: true,
    isActive: true,
    selectedLocations: [] as number[],
    pagePermissions: {} as Record<string, { canView: boolean; canEdit: boolean }>,
    orderStatuses: [] as string[],
  });

  const [passwordError, setPasswordError] = useState('');

  // Fetch locations for assignment
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ['/api/locations'],
  });

  // Fetch user locations if editing
  const { data: userLocations = [] } = useQuery({
    queryKey: [`/api/users/${editingUser?.id}/locations`],
    enabled: Boolean(editingUser?.id),
  });

  // Fetch user statuses if editing
  const { data: userStatuses = [] } = useQuery({
    queryKey: [`/api/users/${editingUser?.id}/statuses`],
    enabled: Boolean(editingUser?.id),
  });

  // Populate form data when editing user
  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username || '',
        firstName: editingUser.firstName || '',
        lastName: editingUser.lastName || '',
        email: editingUser.email || '',
        phoneNumber: editingUser.phoneNumber || '',
        password: '', // Don't populate password when editing
        mustChangePassword: editingUser.mustChangePassword || false,
        isActive: editingUser.isActive !== undefined ? editingUser.isActive : true,
        selectedLocations: userLocations || [],
        pagePermissions: {},
        orderStatuses: userStatuses || [],
      });
    } else {
      // Reset form for new user
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        mustChangePassword: true,
        isActive: true,
        selectedLocations: [],
        pagePermissions: {},
        orderStatuses: [],
      });
    }
  }, [editingUser, userLocations, userStatuses]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasAlpha = /[a-zA-Z]/.test(password);
    const hasNumeric = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!minLength || !hasAlpha || !hasNumeric || !hasSymbol) {
      setPasswordError('Password must be at least 8 characters with letters, numbers and at least 1 symbol');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const userMutation = useMutation({
    mutationFn: async (userData: any) => {
      // Validate password for new users or when password is provided for existing users
      if (!isEditMode || userData.password) {
        if (!validatePassword(userData.password)) {
          throw new Error('Password does not meet complexity requirements');
        }
      }

      let user;
      if (isEditMode) {
        // Update existing user
        const userPayload: any = {
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          mustChangePassword: userData.mustChangePassword,
          isActive: userData.isActive,
        };

        // Only include password if it's provided
        if (userData.password) {
          userPayload.password = userData.password;
        }

        const userResponse = await apiRequest('PUT', `/api/users/${editingUser.id}`, userPayload);
        user = await userResponse.json();
      } else {
        // Create new user
        const userResponse = await apiRequest('POST', '/api/users', {
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          password: userData.password,
          mustChangePassword: userData.mustChangePassword,
          isActive: userData.isActive,
          role: 'user'
        });
        user = await userResponse.json();
      }

      const userId = user.id;

      // Set location access
      await apiRequest('POST', `/api/users/${userId}/locations`, {
        locationIds: userData.selectedLocations
      });

      // Set page permissions
      const permissions = Object.entries(userData.pagePermissions)
        .filter(([_, perms]: [string, any]) => perms.canView || perms.canEdit)
        .map(([pageName, perms]: [string, any]) => ({
          pageName,
          canView: perms.canView,
          canEdit: perms.canEdit
        }));

      await apiRequest('POST', `/api/users/${userId}/permissions`, {
        permissions
      });

      // Set order status access
      await apiRequest('POST', `/api/users/${userId}/statuses`, {
        statuses: userData.orderStatuses
      });

      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      mustChangePassword: true,
      isActive: true,
      selectedLocations: [],
      pagePermissions: {},
      orderStatuses: [],
    });
    setPasswordError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(formData.password)) {
      return;
    }

    if (!formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }

    userMutation.mutate(formData);
  };

  const handleLocationToggle = (locationId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedLocations: prev.selectedLocations.includes(locationId)
        ? prev.selectedLocations.filter(id => id !== locationId)
        : [...prev.selectedLocations, locationId]
    }));
  };

  const handlePagePermissionChange = (pageName: string, permission: 'canView' | 'canEdit', value: boolean) => {
    setFormData(prev => ({
      ...prev,
      pagePermissions: {
        ...prev.pagePermissions,
        [pageName]: {
          ...prev.pagePermissions[pageName],
          [permission]: value
        }
      }
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFormData(prev => ({
      ...prev,
      orderStatuses: prev.orderStatuses.includes(status)
        ? prev.orderStatuses.filter(s => s !== status)
        : [...prev.orderStatuses, status]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with specific permissions and location access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }));
                      if (e.target.value) validatePassword(e.target.value);
                    }}
                    placeholder="Set initial password"
                    required
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500">{passwordError}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with letters, numbers and at least 1 symbol
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mustChangePassword"
                  checked={formData.mustChangePassword}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, mustChangePassword: !!checked }))
                  }
                />
                <Label htmlFor="mustChangePassword">User must change password on next login</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isActive: !!checked }))
                  }
                />
                <Label htmlFor="isActive">Account is active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Location Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {locations.map((location: any) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={formData.selectedLocations.includes(location.id)}
                      onCheckedChange={() => handleLocationToggle(location.id)}
                    />
                    <Label htmlFor={`location-${location.id}`} className="text-sm">
                      {location.name}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Page Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Page Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MENU_PAGES.map((page) => (
                  <div key={page.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <page.icon className="h-4 w-4" />
                      <span className="font-medium">{page.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${page.id}-view`}
                          checked={formData.pagePermissions[page.id]?.canView || false}
                          onCheckedChange={(checked) => 
                            handlePagePermissionChange(page.id, 'canView', !!checked)
                          }
                        />
                        <Label htmlFor={`${page.id}-view`} className="text-sm">View</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${page.id}-edit`}
                          checked={formData.pagePermissions[page.id]?.canEdit || false}
                          onCheckedChange={(checked) => 
                            handlePagePermissionChange(page.id, 'canEdit', !!checked)
                          }
                        />
                        <Label htmlFor={`${page.id}-edit`} className="text-sm">Edit</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Status Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Status Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_STATUSES.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={formData.orderStatuses.includes(status)}
                      onCheckedChange={() => handleStatusToggle(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm capitalize">
                      {status.replace('-', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={userMutation.isPending}>
              {userMutation.isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update User" : "Create User")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}