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
import { Clock, RefreshCw, AlertCircle, CheckCircle, Settings2, Zap, Globe, Shield, Info } from "lucide-react";
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
    refetchInterval: 5000,
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/sync-status'],
    refetchInterval: 1000,
  });

  // Fetch API settings
  const { data: apiData } = useQuery({
    queryKey: ['/api/rest-api-settings/woocommerce'],
  });

  // Update state when data changes
  useEffect(() => {
    if (syncData) {
      setSyncSettings({
        platform: syncData.platform || 'woocommerce',
        isActive: syncData.isActive || false,
        intervalMinutes: syncData.intervalMinutes || 5
      });
    }
  }, [syncData]);

  useEffect(() => {
    if (apiData) {
      setApiSettings({
        platform: apiData.platform || 'woocommerce',
        consumerKey: apiData.consumerKey || '',
        consumerSecret: apiData.consumerSecret || '',
        storeUrl: apiData.storeUrl || '',
        isActive: apiData.isActive !== false
      });
    }
  }, [apiData]);

  // Update sync settings mutation
  const updateSyncMutation = useMutation({
    mutationFn: async (settings: Partial<SyncSettings>) => {
      return await apiRequest('POST', '/api/sync-settings', settings);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sync settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync-settings/woocommerce'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sync-status'] });
    },
    onError: (error: any) => {
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
      return await apiRequest('POST', '/api/rest-api-settings', settings);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "API settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rest-api-settings/woocommerce'] });
    },
    onError: (error: any) => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full px-4 py-6 sm:py-8 max-w-none mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Settings2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Configure your WooCommerce integration and automated sync
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Sync Status Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm xl:col-span-3">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span>Sync Status</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Real-time monitoring of your automated order synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    {syncStatus?.isRunning ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    ) : syncSettings.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium text-sm">Status:</span>
                  </div>
                  <Badge variant={syncStatus?.isRunning ? "default" : syncSettings.isActive ? "secondary" : "outline"} className="w-fit">
                    {syncStatus?.isRunning ? "Syncing" : syncSettings.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                  <span className="font-medium text-sm">Last sync:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatLastSync(syncStatus?.settings?.lastSyncAt)}
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                  <span className="font-medium text-sm">Next sync:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {syncSettings.isActive ? formatTimeUntilNext(syncStatus?.nextSyncIn || 0) : 'Disabled'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Cards - Full Width Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 xl:col-span-3">
            {/* Automated Sync Settings */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span>Automated Sync</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Configure automatic order synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="auto-sync" className="font-medium">Enable Automated Sync</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically import new orders at regular intervals
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={syncSettings.isActive}
                    onCheckedChange={handleSyncToggle}
                    disabled={updateSyncMutation.isPending}
                    className="ml-4"
                  />
                </div>

                {syncSettings.isActive && (
                  <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Label htmlFor="sync-interval" className="font-medium">Sync Interval</Label>
                    <Select
                      value={syncSettings.intervalMinutes.toString()}
                      onValueChange={handleIntervalChange}
                      disabled={updateSyncMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
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
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      More frequent checks may impact performance
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WooCommerce API Settings */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <span>WooCommerce API</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Configure your store connection credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleApiSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-url" className="font-medium">Store URL</Label>
                    <Input
                      id="store-url"
                      type="url"
                      placeholder="https://yourstore.com"
                      value={apiSettings.storeUrl}
                      onChange={(e) => setApiSettings({ ...apiSettings, storeUrl: e.target.value })}
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Your WooCommerce store URL (without trailing slash)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumer-key" className="font-medium">Consumer Key</Label>
                    <Input
                      id="consumer-key"
                      type="password"
                      placeholder="ck_..."
                      value={apiSettings.consumerKey}
                      onChange={(e) => setApiSettings({ ...apiSettings, consumerKey: e.target.value })}
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumer-secret" className="font-medium">Consumer Secret</Label>
                    <Input
                      id="consumer-secret"
                      type="password"
                      placeholder="cs_..."
                      value={apiSettings.consumerSecret}
                      onChange={(e) => setApiSettings({ ...apiSettings, consumerSecret: e.target.value })}
                      required
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateApiMutation.isPending}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {updateApiMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Save API Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Information Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Info className="h-5 w-5 text-blue-600" />
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Automated sync runs in the background and checks for new orders at your configured interval
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Only new orders (created after the last sync) will be imported to avoid duplicates
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Locations are automatically created from the '_orderable_location_name' metadata field
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">
                    You can still use manual import from the WooCommerce Orders page for immediate synchronization
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">
                    API credentials are stored securely and used only for order synchronization
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}