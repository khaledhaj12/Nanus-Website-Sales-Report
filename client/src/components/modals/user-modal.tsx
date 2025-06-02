import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: any;
}

export default function UserModal({ isOpen, onClose, editingUser }: UserModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
    role: "user",
    locationIds: [] as number[],
    statusIds: [] as string[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    enabled: isOpen,
  });

  const { data: userLocations = [] } = useQuery({
    queryKey: ["/api/users", editingUser?.id, "locations"],
    enabled: !!editingUser?.id && isOpen,
  });

  const { data: userStatuses = [] } = useQuery({
    queryKey: ["/api/users", editingUser?.id, "statuses"],
    enabled: !!editingUser?.id && isOpen,
  });

  // Initialize form when modal opens or editing user changes
  useEffect(() => {
    if (isOpen && editingUser) {
      setFormData({
        firstName: editingUser.firstName || "",
        lastName: editingUser.lastName || "",
        username: editingUser.username || "",
        password: "",
        email: editingUser.email || "",
        phoneNumber: editingUser.phoneNumber || "",
        role: editingUser.role || "user",
        locationIds: Array.isArray(userLocations) ? userLocations : [],
        statusIds: Array.isArray(userStatuses) ? userStatuses : [],
      });
    } else if (isOpen && !editingUser) {
      setFormData({
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        email: "",
        phoneNumber: "",
        role: "user",
        locationIds: [],
        statusIds: ["processing", "complete", "refunded"], // Default enabled statuses
      });
    }
  }, [isOpen, editingUser?.id]);

  // Update location IDs when they're loaded
  useEffect(() => {
    if (editingUser && Array.isArray(userLocations)) {
      setFormData(prev => ({
        ...prev,
        locationIds: userLocations
      }));
    }
  }, [userLocations, editingUser?.id]);

  // Update status IDs when they're loaded
  useEffect(() => {
    if (editingUser && Array.isArray(userStatuses)) {
      setFormData(prev => ({
        ...prev,
        statusIds: userStatuses
      }));
    }
  }, [userStatuses, editingUser?.id]);

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const { locationIds, statusIds, ...userDetails } = userData;
      const response = await apiRequest("POST", "/api/users", userDetails);
      const user = await response.json();
      
      // Set location access if not admin
      if (userData.role !== 'admin' && locationIds.length > 0) {
        await apiRequest("POST", `/api/users/${user.id}/locations`, { locationIds });
      }
      
      // Set status access if not admin
      if (userData.role !== 'admin' && statusIds.length > 0) {
        await apiRequest("POST", `/api/users/${user.id}/statuses`, { statuses: statusIds });
      }
      
      return user;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const { locationIds, statusIds, ...userDetails } = userData;
      const response = await apiRequest("PUT", `/api/users/${editingUser.id}`, userDetails);
      const user = await response.json();
      
      // Update location access if not admin
      if (userData.role !== 'admin') {
        await apiRequest("POST", `/api/users/${editingUser.id}/locations`, { locationIds: locationIds || [] });
      }
      
      // Update status access if not admin
      if (userData.role !== 'admin') {
        await apiRequest("POST", `/api/users/${editingUser.id}/statuses`, { statuses: statusIds || [] });
      }
      
      return user;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleLocationChange = (locationId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      locationIds: checked
        ? [...prev.locationIds, locationId]
        : prev.locationIds.filter(id => id !== locationId)
    }));
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      statusIds: checked
        ? [...prev.statusIds, status]
        : prev.statusIds.filter(s => s !== status)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || (!editingUser && !formData.password)) {
      toast({
        title: "Error",
        description: editingUser 
          ? "Username is required" 
          : "Username and password are required",
        variant: "destructive",
      });
      return;
    }

    if (editingUser) {
      const updateData = { ...formData };
      if (!updateData.password) {
        const { password, ...dataWithoutPassword } = updateData;
        updateUserMutation.mutate(dataWithoutPassword);
      } else {
        updateUserMutation.mutate(updateData);
      }
    } else {
      createUserMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg mx-4">
        <DialogHeader>
          <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Username"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
            />
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Phone number"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password {editingUser ? "(leave blank to keep current)" : "*"}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Password"
              required={!editingUser}
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Location Access</Label>
            <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
              {Array.isArray(locations) && locations.map((location: any) => (
                <div key={location.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location.id}`}
                    checked={formData.locationIds.includes(location.id)}
                    onCheckedChange={(checked) => 
                      handleLocationChange(location.id, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`location-${location.id}`}
                    className="text-sm font-normal"
                  >
                    {location.name}
                  </Label>
                </div>
              ))}
              {(!Array.isArray(locations) || locations.length === 0) && (
                <p className="text-sm text-gray-500">No locations available</p>
              )}
            </div>
          </div>

          <div>
            <Label>Order Status Access</Label>
            <p className="text-sm text-gray-500 mb-2">Select which order statuses this user can view. Leave empty for all statuses.</p>
            <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
              {[
                { id: 'processing', label: 'Processing' },
                { id: 'complete', label: 'Complete' },
                { id: 'completed', label: 'Completed' },
                { id: 'refunded', label: 'Refunded' },
                { id: 'pending', label: 'Pending' },
                { id: 'cancelled', label: 'Cancelled' },
                { id: 'failed', label: 'Failed' },
                { id: 'on-hold', label: 'On Hold' }
              ].map((status) => (
                <div key={status.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.id}`}
                    checked={formData.statusIds.includes(status.id)}
                    onCheckedChange={(checked) => 
                      handleStatusChange(status.id, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`status-${status.id}`}
                    className="text-sm font-normal"
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
              className="flex-1"
            >
              {createUserMutation.isPending || updateUserMutation.isPending 
                ? (editingUser ? "Updating..." : "Creating...") 
                : (editingUser ? "Update User" : "Add User")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}