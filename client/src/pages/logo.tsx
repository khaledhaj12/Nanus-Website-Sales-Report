import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Logo() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logoSettings, isLoading } = useQuery({
    queryKey: ["/api/logo-settings"],
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      
      const response = await fetch("/api/logo-upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
      setLogoFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFaviconMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("favicon", file);
      
      const response = await fetch("/api/favicon-upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload favicon");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Favicon uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
      setFaviconFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/logo-only"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logo deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFaviconMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/favicon-only"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Favicon deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/logo-settings"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All logo settings deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PNG, JPG, JPEG, or SVG file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
    }
  };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/x-icon"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PNG, JPG, JPEG, SVG, or ICO file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setFaviconFile(file);
    }
  };

  const handleUploadLogo = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleUploadFavicon = () => {
    if (faviconFile) {
      uploadFaviconMutation.mutate(faviconFile);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-4" />
        <Card>
          <CardContent className="p-6">
            <div className="h-4 w-64 bg-muted animate-pulse rounded mb-4" />
            <div className="h-32 w-full bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logo Management</h1>
        <p className="text-muted-foreground">Upload and manage your application logo and favicon</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Management */}
        <Card>
          <CardHeader>
            <CardTitle>Application Logo</CardTitle>
            <CardDescription>
              Upload a logo to customize your application branding (appears in sidebar and login)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoSettings?.logoPath ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <img
                    src={logoSettings.logoPath}
                    alt="Current logo"
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteLogoMutation.mutate()}
                    disabled={deleteLogoMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Logo
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {logoSettings.originalName} ({Math.round(logoSettings.fileSize / 1024)} KB)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No logo uploaded</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="logo-upload">Upload New Logo</Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleLogoFileChange}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted formats: PNG, JPG, JPEG, SVG (max 5MB)
                </p>
              </div>

              {logoFile && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected file:</p>
                  <p className="text-sm text-muted-foreground">
                    {logoFile.name} ({Math.round(logoFile.size / 1024)} KB)
                  </p>
                  <Button
                    onClick={handleUploadLogo}
                    disabled={uploadLogoMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadLogoMutation.isPending ? "Uploading..." : "Upload Logo"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Favicon Management */}
        <Card>
          <CardHeader>
            <CardTitle>Favicon</CardTitle>
            <CardDescription>
              Upload a favicon to customize your browser tab icon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoSettings?.faviconPath ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <img
                    src={logoSettings.faviconPath}
                    alt="Current favicon"
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteFaviconMutation.mutate()}
                    disabled={deleteFaviconMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Favicon
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {logoSettings.faviconOriginalName} ({Math.round(logoSettings.faviconFileSize / 1024)} KB)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No favicon uploaded</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="favicon-upload">Upload New Favicon</Label>
                <Input
                  id="favicon-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.ico"
                  onChange={handleFaviconFileChange}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted formats: PNG, JPG, JPEG, SVG, ICO (max 5MB)
                </p>
              </div>

              {faviconFile && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected file:</p>
                  <p className="text-sm text-muted-foreground">
                    {faviconFile.name} ({Math.round(faviconFile.size / 1024)} KB)
                  </p>
                  <Button
                    onClick={handleUploadFavicon}
                    disabled={uploadFaviconMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadFaviconMutation.isPending ? "Uploading..." : "Upload Favicon"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove All Settings */}
      {(logoSettings?.logoPath || logoSettings?.faviconPath) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete all logo and favicon settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove All Logo Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}