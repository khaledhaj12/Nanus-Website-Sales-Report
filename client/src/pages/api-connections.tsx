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
import { Clock, RefreshCw, AlertCircle, CheckCircle, Settings2, Zap, Globe, Shield, Info, Download, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SyncSettings {
  platform: string;
  isActive: boolean;
  intervalMinutes: number;
  isRunning?: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

interface SyncStatus {
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
  id: string;
  name: string;
  domain: string;
  platform: string;
}

interface ConnectionSettingsProps {
  connectionId: string;
  platform: string;
}

function ConnectionSettings({ connectionId, platform }: ConnectionSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Sync settings state
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    platform: `${platform}-${connectionId}`,
    isActive: false,
    intervalMinutes: 5
  });
  
  // API settings state
  const [apiSettings, setApiSettings] = useState<RestApiSettings>({
    platform: `${platform}-${connectionId}`,
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
  const { data: syncData = {} } = useQuery({
    queryKey: [`/api/sync-settings/${platform}-${connectionId}`],
    refetchInterval: connectionId === 'default' ? 2000 : 0, // Only auto-refresh for main store
  });

  const { data: apiData = {} } = useQuery({
    queryKey: [`/api/rest-api-settings/${platform}-${connectionId}`],
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["/api/sync-status"],
    refetchInterval: connectionId === 'default' ? 1000 : 0, // Only auto-refresh for main store
    enabled: connectionId === 'default', // Only check sync status for main store
  });

  // Initialize settings from API data - only populate if data exists, otherwise keep defaults
  useEffect(() => {
    if (syncData && Object.keys(syncData).length > 0 && syncData.platform) {
      setSyncSettings(prev => ({
        ...prev,
        platform: syncData.platform,
        isActive: syncData.isActive || false,
        intervalMinutes: syncData.intervalMinutes || 5
      }));
    } else {
      // Reset to defaults for new connections
      setSyncSettings({
        platform: `${platform}-${connectionId}`,
        isActive: false,
        intervalMinutes: 5
      });
    }
  }, [syncData, platform, connectionId]);

  useEffect(() => {
    if (apiData && Object.keys(apiData).length > 0 && apiData.platform) {
      setApiSettings(prev => ({
        ...prev,
        platform: apiData.platform,
        consumerKey: apiData.consumerKey || '',
        consumerSecret: apiData.consumerSecret || '',
        storeUrl: apiData.storeUrl || '',
        isActive: apiData.isActive !== undefined ? apiData.isActive : true
      }));
    } else {
      // Reset to defaults for new connections
      setApiSettings({
        platform: `${platform}-${connectionId}`,
        consumerKey: '',
        consumerSecret: '',
        storeUrl: '',
        isActive: true
      });
    }
  }, [apiData, platform, connectionId]);

  // Mutations
  const updateSyncSettingsMutation = useMutation({
    mutationFn: async (settings: SyncSettings) => {
      const response = await apiRequest("POST", `/api/sync-settings`, settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sync settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/sync-settings/${platform}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sync settings",
        variant: "destructive",
      });
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
      queryClient.invalidateQueries({ queryKey: [`/api/rest-api-settings/${platform}`] });
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
      const response = await apiRequest("POST", "/api/test-connection", apiSettings);
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
      const response = await apiRequest("POST", "/api/start-sync");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Auto sync started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-status"] });
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
      const response = await apiRequest("POST", "/api/stop-sync");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Auto sync stopped successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-status"] });
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
      const response = await apiRequest("POST", "/api/import-historical", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Import started. ${data.imported || 0} orders imported.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/woo-orders"] });
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

  const handleToggleSync = () => {
    if (syncStatus?.isRunning) {
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
      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle>Auto Sync Status</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {syncStatus?.isRunning ? (
                <Badge variant="default" className="bg-green-500">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Stopped
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Automatically sync new orders from WooCommerce every {syncSettings.intervalMinutes} minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncStatus?.isRunning && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Next sync in: <strong>{formatNextSyncTime(syncStatus.nextSyncIn)}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleToggleSync}
              disabled={startSyncMutation.isPending || stopSyncMutation.isPending}
              className="flex-1"
            >
              {startSyncMutation.isPending || stopSyncMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : syncStatus?.isRunning ? (
                <AlertCircle className="mr-2 h-4 w-4" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {syncStatus?.isRunning ? "Stop Auto Sync" : "Start Auto Sync"}
            </Button>
          </div>
        </CardContent>
      </Card>

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

export default function ApiConnections() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'default',
      name: 'Main Store',
      domain: '',
      platform: 'woocommerce'
    }
  ]);
  
  const [activeConnectionId, setActiveConnectionId] = useState('default');
  const [newConnectionName, setNewConnectionName] = useState('');
  const [showAddConnection, setShowAddConnection] = useState(false);

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

    const newConnection: Connection = {
      id: `connection-${Date.now()}`,
      name: newConnectionName.trim(),
      domain: extractDomainFromUrl(newConnectionName.trim()),
      platform: 'woocommerce'
    };

    setConnections(prev => [...prev, newConnection]);
    setActiveConnectionId(newConnection.id);
    setNewConnectionName('');
    setShowAddConnection(false);
    
    toast({
      title: "Success",
      description: `Added new connection: ${newConnection.name}`,
    });
  };

  const removeConnection = (connectionId: string) => {
    if (connectionId === 'default') {
      toast({
        title: "Error",
        description: "Cannot remove the main store connection",
        variant: "destructive",
      });
      return;
    }

    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    
    if (activeConnectionId === connectionId) {
      setActiveConnectionId('default');
    }
    
    toast({
      title: "Success",
      description: "Connection removed successfully",
    });
  };

  const activeConnection = connections.find(conn => conn.id === activeConnectionId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Connections</h1>
          <p className="text-muted-foreground">
            Manage your store connections and sync settings
          </p>
        </div>
      </div>

      <Tabs value={activeConnectionId} onValueChange={setActiveConnectionId}>
        <TabsList className="w-full flex-wrap h-auto p-1">
          {connections.map((connection) => (
            <div key={connection.id} className="relative">
              <TabsTrigger 
                value={connection.id}
                className="flex items-center gap-2 px-3 py-2"
              >
                <Globe className="h-4 w-4" />
                {connection.domain || connection.name}
              </TabsTrigger>
              {connection.id !== 'default' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeConnection(connection.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
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
          <TabsContent key={connection.id} value={connection.id} className="mt-6">
            <ConnectionSettings 
              connectionId={connection.id}
              platform={connection.platform}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}