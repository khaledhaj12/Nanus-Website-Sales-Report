import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReCAPTCHA from "react-google-recaptcha";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Fetch reCAPTCHA settings
  const { data: recaptchaSettings } = useQuery({
    queryKey: ["/api/recaptcha-settings"],
    retry: false,
  });

  // Fetch logo settings
  const { data: logoSettings } = useQuery({
    queryKey: ["/api/logo-settings"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string; recaptchaToken?: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    // Check if reCAPTCHA is enabled and required
    if (recaptchaSettings?.isEnabled && !recaptchaToken) {
      toast({
        title: "Error",
        description: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ 
      username, 
      password, 
      recaptchaToken: recaptchaToken || undefined 
    });
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {logoSettings?.logoPath && (
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16">
                <img 
                  src={logoSettings.logoPath} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-gray-900">
            Import Website Sales
          </CardTitle>
          <p className="text-gray-600">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full"
                required
              />
            </div>
            
            {/* reCAPTCHA component - only show if enabled */}
            {recaptchaSettings?.isEnabled && recaptchaSettings?.siteKey && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={recaptchaSettings.siteKey}
                  onChange={handleRecaptchaChange}
                />
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
