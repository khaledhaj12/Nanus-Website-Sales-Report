import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatFileSize, getFileIcon, validateFileType, validateFileSize } from "@/lib/fileUtils";
import { apiRequest } from "@/lib/queryClient";
import { CloudUpload, FileText, Trash2, Download, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface UploadProps {
  onMenuClick: () => void;
}

export default function Upload({ onMenuClick }: UploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [uploadFileName, setUploadFileName] = useState('');
  const [processedRecords, setProcessedRecords] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentUploadId, setCurrentUploadId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: allUploads = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/uploads/all"],
  });

  // Real-time progress polling for processing
  useEffect(() => {
    if (uploadStatus === 'processing' && currentUploadId) {
      console.log('Starting progress polling for upload ID:', currentUploadId);
      
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/progress/${currentUploadId}`);
          const progressData = await response.json();
          
          console.log('Progress data:', progressData);
          
          if (progressData.status === 'processing') {
            setProcessingProgress(progressData.progress);
            setProcessedRecords(progressData.processedRecords);
            setTotalRecords(progressData.totalRecords);
          } else if (progressData.status === 'completed') {
            setProcessingProgress(100);
            setUploadStatus('completed');
            clearInterval(interval);
            // Refresh upload history to show completed status
            queryClient.invalidateQueries({ queryKey: ["/api/uploads/all"] });
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      }, 200); // Poll every 200ms for smooth updates

      return () => clearInterval(interval);
    }
  }, [uploadStatus, currentUploadId]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadFileName(file.name);
      setUploadStatus('uploading');
      setUploadProgress(0);
      setProcessingProgress(0);
      setProcessedRecords(0);
      setTotalRecords(0);

      const formData = new FormData();
      formData.append('file', file);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadStatus('processing');
            setUploadProgress(100);
            setProcessingProgress(0);
            
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Upload response:', response);
              setCurrentUploadId(response.fileId);
              console.log('Set currentUploadId to:', response.fileId);
              resolve(response);
            } catch (e) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || 'Upload failed'));
            } catch (e) {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.withCredentials = true;
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    },
    onSuccess: (data, file) => {
      setUploadStatus('completed');
      toast({
        title: "Upload Completed",
        description: `${file.name} has been processed successfully`,
      });
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reset progress after 2 seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
        setProcessingProgress(0);
        setUploadFileName('');
      }, 2000);
    },
    onError: (error, file) => {
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}: ${error.message}`,
        variant: "destructive",
      });
      
      // Reset progress after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
        setProcessingProgress(0);
        setUploadFileName('');
      }, 3000);
    },
  });

  const deleteFilesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("DELETE", "/api/uploads", { ids });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Files deleted successfully",
      });
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/all"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
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
                uploadMutation.isPending
                  ? "border-blue-400 bg-blue-50 opacity-75"
                  : dragActive 
                    ? "border-blue-400 bg-blue-50" 
                    : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadStatus !== 'idle' ? (
                <div className="max-w-md mx-auto">
                  {/* Status Icon */}
                  <div className="flex justify-center mb-4">
                    {uploadStatus === 'uploading' && (
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                    )}
                    {uploadStatus === 'processing' && (
                      <div className="animate-pulse">
                        <div className="bg-blue-600 rounded-full h-16 w-16 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    {uploadStatus === 'completed' && (
                      <CheckCircle className="h-16 w-16 text-green-600" />
                    )}
                    {uploadStatus === 'error' && (
                      <AlertCircle className="h-16 w-16 text-red-600" />
                    )}
                  </div>

                  {/* Status Text */}
                  <h4 className="text-lg font-medium text-gray-900 mb-2 text-center">
                    {uploadStatus === 'uploading' && `Uploading ${uploadFileName}...`}
                    {uploadStatus === 'processing' && `Processing ${uploadFileName}...`}
                    {uploadStatus === 'completed' && `Upload Completed!`}
                    {uploadStatus === 'error' && `Upload Failed`}
                  </h4>

                  {/* Upload Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Upload Progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadStatus === 'error' ? 'bg-red-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Processing Progress Bar */}
                  {(uploadStatus === 'processing' || uploadStatus === 'completed') && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Processing Records</span>
                        <span>{processingProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            uploadStatus === 'completed' ? 'bg-green-600' : 
                            uploadStatus === 'error' ? 'bg-red-600' : 'bg-orange-600'
                          }`}
                          style={{ width: `${processingProgress}%` }}
                        ></div>
                      </div>
                      {totalRecords > 0 && (
                        <div className="text-xs text-gray-500 text-center mt-1">
                          {processedRecords} of {totalRecords} records processed
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Description */}
                  <p className="text-gray-600 text-center text-sm">
                    {uploadStatus === 'uploading' && 'Uploading file to server...'}
                    {uploadStatus === 'processing' && 'Importing data and calculating fees...'}
                    {uploadStatus === 'completed' && 'File has been successfully processed'}
                    {uploadStatus === 'error' && 'Please try again or check your file format'}
                  </p>
                </div>
              ) : (
                <>
                  <CloudUpload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Drop files here or click to browse
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Supports CSV and XLSX files up to 10MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                disabled={uploadMutation.isPending}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Processing..." : "Select Files"}
              </Button>
            </div>


          </CardContent>
        </Card>

        {/* Upload History Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Upload History
                </CardTitle>
                <p className="text-sm text-gray-600">Complete history of all uploaded files</p>
              </div>
              {selectedFiles.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedFiles.length} file(s)? This action cannot be undone.`)) {
                      deleteFilesMutation.mutate(selectedFiles);
                    }
                  }}
                  disabled={deleteFilesMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedFiles.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (allUploads as any[]).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500">No upload history found</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={(allUploads as any[]).length > 0 && selectedFiles.length === (allUploads as any[]).length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFiles((allUploads as any[]).map((upload: any) => upload.id));
                                } else {
                                  setSelectedFiles([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(allUploads as any[]).map((upload: any) => (
                          <TableRow key={upload.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedFiles.includes(upload.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFiles([...selectedFiles, upload.id]);
                                  } else {
                                    setSelectedFiles(selectedFiles.filter(id => id !== upload.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <i className={`${getFileIcon(upload.fileName)} text-green-600 mr-3 text-xl`} />
                                <span className="font-medium">{upload.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(upload.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {formatFileSize(upload.fileSize)}
                            </TableCell>
                            <TableCell>
                              {upload.recordsProcessed}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeStyle(upload.status)}>
                                {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Create download link for the file
                                  const link = document.createElement('a');
                                  link.href = `/api/uploads/${upload.id}/download`;
                                  link.download = upload.fileName;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                      <Checkbox
                        checked={(allUploads as any[]).length > 0 && selectedFiles.length === (allUploads as any[]).length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFiles((allUploads as any[]).map((upload: any) => upload.id));
                          } else {
                            setSelectedFiles([]);
                          }
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        Select All ({selectedFiles.length} of {(allUploads as any[]).length} selected)
                      </span>
                    </div>
                    
                    {(allUploads as any[]).map((upload: any) => (
                      <div key={upload.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedFiles.includes(upload.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFiles([...selectedFiles, upload.id]);
                                } else {
                                  setSelectedFiles(selectedFiles.filter(id => id !== upload.id));
                                }
                              }}
                            />
                            <div>
                              <div className="flex items-center">
                                <i className={`${getFileIcon(upload.fileName)} text-green-600 mr-2 text-lg`} />
                                <span className="font-medium text-sm">{upload.fileName}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(upload.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusBadgeStyle(upload.status)}>
                              {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/uploads/${upload.id}/download`;
                                link.download = upload.fileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Size:</span>
                            <div>{formatFileSize(upload.fileSize)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Records:</span>
                            <div>{upload.recordsProcessed}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
