import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Trash2, Image as ImageIcon, Menu } from "lucide-react";
import Header from "@/components/layout/header";

interface LogoPageProps {
  onMenuClick: () => void;
}

export default function LogoPage({ onMenuClick }: LogoPageProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current logo
  const { data: logoSettings, isLoading } = useQuery({
    queryKey: ["/api/logo-settings"],
  });

  // Upload logo mutation
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
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      setUploadingLogo(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
      setUploadingLogo(false);
    },
  });

  // Delete logo mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/logo-settings");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logo-settings"] });
      toast({
        title: "Success",
        description: "Logo removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    uploadLogoMutation.mutate(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteLogo = () => {
    if (confirm("Are you sure you want to remove the logo?")) {
      deleteLogoMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header title="Logo Management" onMenuClick={onMenuClick} />
        <div className="p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header onMenuClick={onMenuClick} />
      
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo Management
              </CardTitle>
              <CardDescription>
                Upload and manage your application logo. The logo will appear in the sidebar next to "Import Sales" and above the login screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Logo Display */}
              {logoSettings?.logoPath ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Current Logo</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-4">
                      <img
                        src={logoSettings.logoPath}
                        alt="Current logo"
                        className="w-12 h-12 object-contain bg-white rounded border"
                      />
                      <div>
                        <p className="text-sm font-medium">Logo active</p>
                        <p className="text-xs text-muted-foreground">
                          Displayed in sidebar and login screen
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteLogo}
                      disabled={deleteLogoMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No logo uploaded</p>
                </div>
              )}

              {/* Upload Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">
                  {logoSettings?.logoPath ? "Replace Logo" : "Upload Logo"}
                </h3>
                
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Click to upload or drag and drop your logo
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supported formats: PNG, JPG, JPEG, SVG (max 5MB)
                  </p>
                  <Button
                    onClick={handleUploadClick}
                    disabled={uploadingLogo || uploadLogoMutation.isPending}
                  >
                    {uploadingLogo || uploadLogoMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Select Logo
                      </>
                    )}
                  </Button>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Guidelines */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Logo Guidelines</h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Recommended size: 40x40 pixels or larger (square format works best)</li>
                  <li>Use transparent background (PNG) for best results</li>
                  <li>Logo will be automatically resized to fit the interface</li>
                  <li>High contrast designs work better in both light and dark themes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}