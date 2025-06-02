import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Key, Globe } from "lucide-react";

export default function Recaptcha() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    siteKey: '',
    secretKey: '',
    isActive: false
  });

  // Fetch current reCAPTCHA settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/recaptcha-settings'],
  });

  // Update form data when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormData({
        siteKey: (settings as any).siteKey || '',
        secretKey: (settings as any).secretKey || '',
        isActive: (settings as any).isActive || false
      });
    }
  }, [settings]);

  // Update reCAPTCHA settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/recaptcha-settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "reCAPTCHA settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recaptcha-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reCAPTCHA settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.isActive && (!formData.siteKey.trim() || !formData.secretKey.trim())) {
      toast({
        title: "Error",
        description: "Site Key and Secret Key are required when reCAPTCHA is enabled",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Google reCAPTCHA Configuration</h1>
          <p className="text-muted-foreground">Configure Google reCAPTCHA for enhanced login security</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            reCAPTCHA Settings
          </CardTitle>
          <CardDescription>
            Configure your Google reCAPTCHA v2 credentials to add an extra layer of security to your login page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="recaptcha-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="recaptcha-active" className="text-sm font-medium">
                Enable reCAPTCHA
              </Label>
            </div>

            {formData.isActive && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="site-key" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Site Key (Public Key)
                  </Label>
                  <Input
                    id="site-key"
                    type="text"
                    placeholder="6Lc6BAAAAAAAAChqRbQZcn_yyyyyyyyyyyyyyyyy"
                    value={formData.siteKey}
                    onChange={(e) => handleInputChange('siteKey', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This key is safe to be public and will be used on your login page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret-key" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Secret Key (Private Key)
                  </Label>
                  <Input
                    id="secret-key"
                    type="password"
                    placeholder="6Lc6BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
                    value={formData.secretKey}
                    onChange={(e) => handleInputChange('secretKey', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This key must be kept secret and is used for server-side verification
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Get Google reCAPTCHA Keys</CardTitle>
          <CardDescription>
            Follow these steps to obtain your reCAPTCHA credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Visit Google reCAPTCHA Console</p>
                <p className="text-muted-foreground">Go to https://www.google.com/recaptcha/admin</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Create a New Site</p>
                <p className="text-muted-foreground">Click the "+" button to register a new site</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Configure Your Site</p>
                <p className="text-muted-foreground">Choose "reCAPTCHA v2" → "I'm not a robot" Checkbox</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <p className="font-medium">Add Your Domain</p>
                <p className="text-muted-foreground">Enter your website domain in the "Domains" section</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                5
              </div>
              <div>
                <p className="font-medium">Copy Your Keys</p>
                <p className="text-muted-foreground">Copy the Site Key and Secret Key from the settings page</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}