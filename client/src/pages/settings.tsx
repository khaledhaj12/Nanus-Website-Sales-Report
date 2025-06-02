import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, RefreshCw, AlertCircle, CheckCircle, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Sync settings state
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    platform: 'woocommerce',
    isActive: false,
    intervalMinutes: 5
  });
  
  // API settings state
  const [apiSettings, setApiSettings] = useState<RestApiSettings>({
    platform: 'woocommerce',
    consumerKey: '',
    consumerSecret: '',
    storeUrl: '',
    isActive: true
  });

  // Fetch sync settings
  const { data: syncData } = useQuery({
    queryKey: ['/api/sync-settings/woocommerce'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/sync-status'],
    refetchInterval: 1000, // Refresh every second for real-time updates
  });

  // Fetch API settings
  const { data: apiData } = useQuery({
    queryKey: ['/api/rest-api-settings/woocommerce'],
  });

  // Update state when data changes
  useEffect(() => {
    if (syncData) {
      setSyncSettings(syncData);
    }
  }, [syncData]);

  useEffect(() => {
    if (apiData) {
      setApiSettings(apiData);
    }
  }, [apiData]);

  // Update sync settings mutation
  const updateSyncMutation = useMutation({
    mutationFn: async (settings: Partial<SyncSettings>) => {
      return await apiRequest('/api/sync-settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sync settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync-settings/woocommerce'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync-status'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update sync settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update API settings mutation
  const updateApiMutation = useMutation({
    mutationFn: async (settings: RestApiSettings) => {
      return await apiRequest('/api/rest-api-settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "API settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rest-api-settings/woocommerce'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update API settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSyncToggle = (isActive: boolean) => {
    const newSettings = { ...syncSettings, isActive };
    setSyncSettings(newSettings);
    updateSyncMutation.mutate(newSettings);
  };

  const handleIntervalChange = (intervalMinutes: string) => {
    const newSettings = { ...syncSettings, intervalMinutes: parseInt(intervalMinutes) };
    setSyncSettings(newSettings);
    updateSyncMutation.mutate(newSettings);
  };

  const handleApiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateApiMutation.mutate(apiSettings);
  };

  const formatTimeUntilNext = (seconds: number) => {
    if (seconds <= 0) return 'Now';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your WooCommerce integration and sync settings</p>
      </div>

      <div className="space-y-6">
        {/* Sync Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription>
              Real-time status of your automated order synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {syncStatus?.isRunning ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  ) : syncSettings.isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="font-medium">Status:</span>
                </div>
                <Badge variant={syncStatus?.isRunning ? "default" : syncSettings.isActive ? "secondary" : "outline"}>
                  {syncStatus?.isRunning ? "Syncing" : syncSettings.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Last sync:</span>
                <span className="text-sm text-muted-foreground">
                  {formatLastSync(syncStatus?.settings?.lastSyncAt)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Next sync:</span>
                <span className="text-sm text-muted-foreground">
                  {syncSettings.isActive ? formatTimeUntilNext(syncStatus?.nextSyncIn || 0) : 'Disabled'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automated Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Automated Sync Settings
            </CardTitle>
            <CardDescription>
              Configure automatic order synchronization from WooCommerce
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-sync">Enable Automated Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically import new orders from WooCommerce at regular intervals
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={syncSettings.isActive}
                onCheckedChange={handleSyncToggle}
                disabled={updateSyncMutation.isPending}
              />
            </div>

            {syncSettings.isActive && (
              <div className="space-y-2">
                <Label htmlFor="sync-interval">Sync Interval</Label>
                <Select
                  value={syncSettings.intervalMinutes.toString()}
                  onValueChange={handleIntervalChange}
                  disabled={updateSyncMutation.isPending}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every 1 minute</SelectItem>
                    <SelectItem value="2">Every 2 minutes</SelectItem>
                    <SelectItem value="3">Every 3 minutes</SelectItem>
                    <SelectItem value="5">Every 5 minutes</SelectItem>
                    <SelectItem value="10">Every 10 minutes</SelectItem>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How often to check for new orders. More frequent checks may impact performance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WooCommerce API Settings */}
        <Card>
          <CardHeader>
            <CardTitle>WooCommerce API Settings</CardTitle>
            <CardDescription>
              Configure your WooCommerce store connection for automated order import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApiSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-url">Store URL</Label>
                <Input
                  id="store-url"
                  type="url"
                  placeholder="https://yourstore.com"
                  value={apiSettings.storeUrl}
                  onChange={(e) => setApiSettings({ ...apiSettings, storeUrl: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Your WooCommerce store URL (without trailing slash)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumer-key">Consumer Key</Label>
                <Input
                  id="consumer-key"
                  type="password"
                  placeholder="ck_..."
                  value={apiSettings.consumerKey}
                  onChange={(e) => setApiSettings({ ...apiSettings, consumerKey: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumer-secret">Consumer Secret</Label>
                <Input
                  id="consumer-secret"
                  type="password"
                  placeholder="cs_..."
                  value={apiSettings.consumerSecret}
                  onChange={(e) => setApiSettings({ ...apiSettings, consumerSecret: e.target.value })}
                  required
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={updateApiMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateApiMutation.isPending ? "Saving..." : "Save API Settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Automated sync runs in the background and checks for new orders at your configured interval</p>
            <p>• Only new orders (created after the last sync) will be imported to avoid duplicates</p>
            <p>• Locations are automatically created from the '_orderable_location_name' metadata field</p>
            <p>• You can still use manual import from the WooCommerce Orders page for immediate synchronization</p>
            <p>• API credentials are stored securely and used only for order synchronization</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}