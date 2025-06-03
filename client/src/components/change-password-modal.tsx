import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ isOpen, onSuccess }: ChangePasswordModalProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasAlpha = /[a-zA-Z]/.test(password);
    const hasNumeric = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!minLength || !hasAlpha || !hasNumeric || !hasSymbol) {
      return 'Password must be at least 8 characters with letters, numbers and at least 1 symbol';
    }
    return '';
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPasswordError = validatePassword(formData.newPassword);
    let confirmPasswordError = '';
    
    if (formData.newPassword !== formData.confirmPassword) {
      confirmPasswordError = 'Passwords do not match';
    }

    setErrors({
      newPassword: newPasswordError,
      confirmPassword: confirmPasswordError,
    });

    if (newPasswordError || confirmPasswordError) {
      return;
    }

    if (!formData.currentPassword.trim()) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" hideClose>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Password Change Required</DialogTitle>
          </div>
          <DialogDescription>
            You must change your password before continuing. Please create a secure password that meets the requirements below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, newPassword: e.target.value }));
                if (e.target.value) {
                  setErrors(prev => ({ ...prev, newPassword: validatePassword(e.target.value) }));
                }
              }}
              placeholder="Enter your new password"
              required
            />
            {errors.newPassword && (
              <p className="text-xs text-red-500">{errors.newPassword}</p>
            )}
            <p className="text-xs text-gray-500">
              Password must be at least 8 characters with letters, numbers and at least 1 symbol
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                if (e.target.value && formData.newPassword) {
                  setErrors(prev => ({ 
                    ...prev, 
                    confirmPassword: e.target.value !== formData.newPassword ? 'Passwords do not match' : ''
                  }));
                }
              }}
              placeholder="Confirm your new password"
              required
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}