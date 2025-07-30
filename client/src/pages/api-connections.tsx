import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, RefreshCw, AlertCircle, CheckCircle, Settings2, Zap, Globe, Shield, Info, Download, Plus, X, Trash2, MapPin, Edit, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import SyncStatus from "@/components/sync-status";
import Header from "@/components/layout/header";

interface ApiConnectionsProps {
  onMenuClick?: () => void;
}

interface SyncSettings {
  platform: string;
  isActive: boolean;
  intervalMinutes: number;
  isRunning?: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

interface SyncStatusData {
  isRunning: boolean;
  hasInterval: boolean;
  settings: SyncSettings;
  nextSyncIn: number;
}

interface RestApiSettings {
  platform: string;
  consumerKey: string;
  consumerSecret: string;
  storeUrl: string;
  isActive: boolean;
}

interface ImportFormData {
  startDate: string;
  endDate: string;
}

interface Connection {
  id?: string;
  connectionId: string;
  name: string;
  domain: string;
  platform: string;
  isDefault?: boolean;
}

interface ConnectionSettingsProps {
  connectionId: string;
  platform: string;
}



function ConnectionSettings({ connectionId, platform }: ConnectionSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use connection ID as platform identifier
  const platformId = connectionId;
  
  // Sync settings state
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    platform: platformId,
    isActive: false,
    intervalMinutes: 5
  });
  
  // API settings state
  const [apiSettings, setApiSettings] = useState<RestApiSettings>({
    platform: platformId,
    consumerKey: '',
    consumerSecret: '',
    storeUrl: '',
    isActive: true
  });

  // Import form state
  const [importForm, setImportForm] = useState<ImportFormData>({
    startDate: '',
    endDate: ''
  });

  // Queries - Use connection-specific platform identifiers
  const { data: syncData, isLoading: syncDataLoading } = useQuery({
    queryKey: [`/api/sync-settings/${platformId}`],
    refetchInterval: connectionId === 'default' ? 2000 : 0, // Only auto-refresh for main store
  });

  const { data: apiData, isLoading: apiDataLoading } = useQuery({
    queryKey: [`/api/rest-api-settings/${platformId}`],
  });

  const { data: syncStatus, isLoading: syncStatusLoading } = useQuery({
    queryKey: [`/api/sync-status/${platformId}`],
    refetchInterval: 2000, // Auto-refresh every 2 seconds for all connections
  });

  // Initialize settings from API data - only populate if data exists, otherwise keep defaults
  useEffect(() => {
    if (syncDataLoading || !syncData) return; // Don't run while loading or if no data
    
    if (typeof syncData === 'object' && 'platform' in syncData && syncData.platform) {
      setSyncSettings(prev => ({
        ...prev,
        platform: syncData.platform as string,
        isActive: ('isActive' in syncData ? syncData.isActive : false) as boolean,
        intervalMinutes: ('intervalMinutes' in syncData ? syncData.intervalMinutes : 5) as number
      }));
    } else if (syncData && !syncDataLoading) {
      // Reset to defaults for new connections only after loading is complete
      setSyncSettings({
        platform: platformId,
        isActive: false,
        intervalMinutes: 5
      });
    }
  }, [syncData, platformId, syncDataLoading]);

  useEffect(() => {
    if (apiDataLoading || !apiData) return; // Don't run while loading or if no data
    
    if (typeof apiData === 'object' && 'platform' in apiData && apiData.platform) {
      setApiSettings(prev => ({
        ...prev,
        platform: apiData.platform as string,
        consumerKey: ('consumerKey' in apiData ? apiData.consumerKey : '') as string,
        consumerSecret: ('consumerSecret' in apiData ? apiData.consumerSecret : '') as string,
        storeUrl: ('storeUrl' in apiData ? apiData.storeUrl : '') as string,
        isActive: ('isActive' in apiData && apiData.isActive !== undefined ? apiData.isActive : true) as boolean
      }));
    } else if (apiData && !apiDataLoading) {
      // Reset to defaults for new connections only after loading is complete
      setApiSettings({
        platform: platformId,
        consumerKey: '',
        consumerSecret: '',
        storeUrl: '',
        isActive: true
      });
    }
  }, [apiData, platformId, apiDataLoading]);

  // Mutations
  const updateSyncSettingsMutation = useMutation({
    mutationFn: async (settings: SyncSettings) => {
      const response = await apiRequest("POST", `/api/sync-settings`, settings);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Sync settings updated successfully",
      });
      // Update local state to match server response
      if (data.settings) {
        setSyncSettings({
          platform: data.settings.platform,
          isActive: data.settings.isActive,
          intervalMinutes: data.settings.intervalMinutes
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/sync-settings/${platformId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sync settings",
        variant: "destructive",
      });
      // Revert local state on error
      queryClient.invalidateQueries({ queryKey: [`/api/sync-settings/${platformId}`] });
    },
  });

  const updateApiSettingsMutation = useMutation({
    mutationFn: async (settings: RestApiSettings) => {
      const response = await apiRequest("POST", `/api/rest-api-settings`, settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "API settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/rest-api-settings/${platformId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update API settings",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/test-woo-connection", {
        ...apiSettings,
        platform: platformId
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Connection test successful",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to WooCommerce API",
        variant: "destructive",
      });
    },
  });

  const startSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/start-sync", { platform: platformId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Auto sync started successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/sync-status/${platformId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start sync",
        variant: "destructive",
      });
    },
  });

  const stopSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stop-sync", { platform: platformId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Auto sync stopped successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/sync-status/${platformId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop sync",
        variant: "destructive",
      });
    },
  });

  const importHistoricalMutation = useMutation({
    mutationFn: async (data: ImportFormData) => {
      // Backend will get credentials directly from database
      const response = await apiRequest("POST", "/api/import-woo-orders", {
        ...data,
        platform: platformId
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Import completed. ${data.imported || 0} orders imported.`,
      });
      // Invalidate all related queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/woo-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import historical data",
        variant: "destructive",
      });
    },
  });

  const handleSyncSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSyncSettingsMutation.mutate(syncSettings);
  };

  const handleApiSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateApiSettingsMutation.mutate(apiSettings);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  // Safe computation of sync running state
  const isSyncRunning = Boolean(
    syncStatus && 
    typeof syncStatus === 'object' && 
    'isActive' in syncStatus && 
    syncStatus.isActive
  );

  const handleToggleSync = () => {
    // Only proceed if sync status data is loaded and valid
    if (!syncStatus || syncStatusLoading) return;
    
    if (isSyncRunning) {
      stopSyncMutation.mutate();
    } else {
      startSyncMutation.mutate();
    }
  };

  const handleImportHistorical = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.startDate || !importForm.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    importHistoricalMutation.mutate(importForm);
  };

  const formatNextSyncTime = (nextSyncIn: number) => {
    if (nextSyncIn <= 0) return "Now";
    
    const minutes = Math.floor(nextSyncIn / 60);
    const seconds = nextSyncIn % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Sync Status Display */}
      <SyncStatus platform={platformId} />

      {/* Sync Control Card */}
      {!syncStatusLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Sync Control
            </CardTitle>
            <CardDescription>
              Start or stop automatic sync and configure settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleToggleSync}
                disabled={startSyncMutation.isPending || stopSyncMutation.isPending}
                className="flex-1"
              >
                {startSyncMutation.isPending || stopSyncMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : isSyncRunning ? (
                  <AlertCircle className="mr-2 h-4 w-4" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                {isSyncRunning ? "Stop Auto Sync" : "Start Auto Sync"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REST API Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <CardTitle>WooCommerce REST API Settings</CardTitle>
          </div>
          <CardDescription>
            Configure your WooCommerce store connection settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApiSettingsSubmit} className="space-y-4">
            <div>
              <Label htmlFor="storeUrl">Store URL</Label>
              <Input
                id="storeUrl"
                type="url"
                placeholder="https://yourstore.com"
                value={apiSettings.storeUrl}
                onChange={(e) => setApiSettings(prev => ({ ...prev, storeUrl: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="consumerKey">Consumer Key</Label>
              <Input
                id="consumerKey"
                type="text"
                placeholder="ck_xxxxxxxxxxxxxxxxx"
                value={apiSettings.consumerKey}
                onChange={(e) => setApiSettings(prev => ({ ...prev, consumerKey: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="consumerSecret">Consumer Secret</Label>
              <Input
                id="consumerSecret"
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxx"
                value={apiSettings.consumerSecret}
                onChange={(e) => setApiSettings(prev => ({ ...prev, consumerSecret: e.target.value }))}
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={updateApiSettingsMutation.isPending}
                className="flex-1"
              >
                {updateApiSettingsMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Save API Settings
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending || !apiSettings.storeUrl || !apiSettings.consumerKey}
                className="flex-1"
              >
                {testConnectionMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5 text-purple-600" />
            <CardTitle>Sync Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure automatic synchronization settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSyncSettingsSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-active">Enable Auto Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync new orders at regular intervals
                </p>
              </div>
              <Switch
                id="sync-active"
                checked={syncSettings.isActive}
                onCheckedChange={(checked) => 
                  setSyncSettings(prev => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div>
              <Label htmlFor="interval">Sync Interval (minutes)</Label>
              <Select
                value={syncSettings.intervalMinutes.toString()}
                onValueChange={(value) => 
                  setSyncSettings(prev => ({ ...prev, intervalMinutes: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={updateSyncSettingsMutation.isPending}
              className="w-full"
            >
              {updateSyncSettingsMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Settings2 className="mr-2 h-4 w-4" />
              )}
              Save Sync Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historical Import */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-orange-600" />
            <CardTitle>Import Historical Orders</CardTitle>
          </div>
          <CardDescription>
            Import existing orders from your WooCommerce store for a specific date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will import all orders from the selected date range. Large date ranges may take some time to process.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleImportHistorical} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={importForm.startDate}
                  onChange={(e) => setImportForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={importForm.endDate}
                  onChange={(e) => setImportForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={importHistoricalMutation.isPending || !importForm.startDate || !importForm.endDate}
              className="w-full"
            >
              {importHistoricalMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Import Historical Orders
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiConnections({ onMenuClick }: ApiConnectionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use your original hardcoded connections with working API keys
  const connections = [
    {
      connectionId: 'woocommerce',
      name: 'Main', 
      domain: 'nanushotchicken.co',
      platform: 'woocommerce',
      isDefault: true
    },
    {
      connectionId: 'woocommerce-1',
      name: 'Delaware',
      domain: 'delaware.nanushotchicken.co', 
      platform: 'woocommerce',
      isDefault: false
    },
    {
      connectionId: 'woocommerce-2',
      name: 'Drexel',
      domain: 'drexel.nanushotchicken.co',
      platform: 'woocommerce', 
      isDefault: false
    }
  ];
  
  const [activeConnectionId, setActiveConnectionId] = useState('woocommerce');
  const [newConnectionName, setNewConnectionName] = useState('');
  const [showAddConnection, setShowAddConnection] = useState(false);

  // Mutation to create store connection
  const createConnectionMutation = useMutation({
    mutationFn: async (connection: any) => {
      return await apiRequest("POST", "/api/store-connections", connection);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-connections"] });
      toast({
        title: "Success",
        description: "Store connection saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save store connection",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete store connection
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return await apiRequest("DELETE", `/api/store-connections/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-connections"] });
      toast({
        title: "Success",
        description: "Store connection deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete store connection",
        variant: "destructive",
      });
    },
  });

  const extractDomainFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0];
    }
  };

  const addNewConnection = () => {
    if (!newConnectionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connection name",
        variant: "destructive",
      });
      return;
    }

    const connectionId = `woocommerce-connection-${Date.now()}`;
    const newConnection = {
      connectionId,
      name: newConnectionName.trim(),
      domain: extractDomainFromUrl(newConnectionName.trim()),
      platform: connectionId
    };

    createConnectionMutation.mutate(newConnection, {
      onSuccess: () => {
        setActiveConnectionId(connectionId);
        setNewConnectionName('');
        setShowAddConnection(false);
      }
    });
  };

  const removeConnection = (connectionId: string) => {
    if (connectionId === '1') {
      toast({
        title: "Error",
        description: "Cannot remove the main store connection",
        variant: "destructive",
      });
      return;
    }

    deleteConnectionMutation.mutate(connectionId, {
      onSuccess: () => {
        if (activeConnectionId === connectionId) {
          setActiveConnectionId('1');
        }
      }
    });
  };

  const activeConnection = connections.find(conn => conn.connectionId === activeConnectionId);

  return (
    <div className="flex flex-col h-screen">
      <Header 
        title="API Connections" 
        onMenuClick={onMenuClick || (() => {})} 
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Settings2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-muted-foreground">Manage your store connections and sync settings</p>
            </div>
          </div>

      <Tabs value={activeConnectionId} onValueChange={setActiveConnectionId}>
        <TabsList className="w-full flex-wrap h-auto p-1">
          {connections.map((connection) => (
            <div key={connection.connectionId} className="relative">
              <TabsTrigger 
                value={connection.connectionId}
                className="flex items-center gap-2 px-3 py-2"
              >
                <Globe className="h-4 w-4" />
                {connection.domain || connection.name}
              </TabsTrigger>
              {connection.connectionId !== '1' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Store Connection</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the connection for <strong>{connection.domain || connection.name}</strong>? 
                        This will remove all sync settings and API configurations for this store. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        onClick={() => removeConnection(connection.connectionId)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Connection
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
          
          <div className="relative">
            {showAddConnection ? (
              <div className="flex items-center gap-2 p-2 border rounded">
                <Input
                  placeholder="Store URL or name"
                  value={newConnectionName}
                  onChange={(e) => setNewConnectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addNewConnection();
                    } else if (e.key === 'Escape') {
                      setShowAddConnection(false);
                      setNewConnectionName('');
                    }
                  }}
                  className="w-40"
                  autoFocus
                />
                <Button size="sm" onClick={addNewConnection}>
                  <CheckCircle className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setShowAddConnection(false);
                    setNewConnectionName('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddConnection(true)}
                className="flex items-center gap-2 px-3 py-2 border-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                Add Store
              </Button>
            )}
          </div>
        </TabsList>

        {connections.map((connection) => (
          <TabsContent key={connection.connectionId} value={connection.connectionId} className="mt-6">
            <ConnectionSettings 
              connectionId={connection.connectionId}
              platform={connection.platform}
            />
          </TabsContent>
        ))}
      </Tabs>
        </div>
      </main>
    </div>
  );
}

export default ApiConnections;