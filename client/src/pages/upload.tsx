import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, getFileIcon, validateFileType, validateFileSize } from "@/lib/fileUtils";
import { CloudUpload, FileText } from "lucide-react";

interface UploadProps {
  onMenuClick: () => void;
}

export default function Upload({ onMenuClick }: UploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recentUploads = [], isLoading } = useQuery({
    queryKey: ["/api/uploads/recent"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File uploaded and processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!validateFileType(file)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or XLSX file",
        variant: "destructive",
      });
      return;
    }

    if (!validateFileSize(file)) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800";
      case 'processing':
        return "bg-yellow-100 text-yellow-800";
      case 'failed':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Upload Data" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        <Card>
          <CardHeader>
            <CardTitle>Upload Sales Data</CardTitle>
            <p className="text-sm text-gray-600">
              Upload CSV or XLSX files containing sales data
            </p>
          </CardHeader>
          <CardContent>
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? "border-blue-400 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <CloudUpload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to browse
              </h4>
              <p className="text-gray-600 mb-4">
                Supports CSV and XLSX files up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Select Files"}
              </Button>
            </div>

            {/* Recent Uploads */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Recent Uploads</h4>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : recentUploads.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentUploads.map((upload: any) => (
                    <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <i className={`${getFileIcon(upload.fileName)} text-green-600 mr-3 text-xl`} />
                        <div>
                          <p className="font-medium text-gray-900">{upload.fileName}</p>
                          <p className="text-sm text-gray-600">
                            Uploaded {new Date(upload.createdAt).toLocaleDateString()} • 
                            {formatFileSize(upload.fileSize)} • 
                            {upload.recordsProcessed} records processed
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusBadgeStyle(upload.status)}>
                        {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
