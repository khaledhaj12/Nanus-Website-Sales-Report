import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Database, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncStatusProps {
  isAdmin: boolean;
}

export default function SyncStatus({ isAdmin }: SyncStatusProps) {
  // Only show for admin users
  if (!isAdmin) return null;

  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ["/api/sync-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: woocommerceStatus } = useQuery({
    queryKey: ["/api/sync-status/woocommerce"],
    refetchInterval: 30000,
  });

  const { data: woocommerce1Status } = useQuery({
    queryKey: ["/api/sync-status/woocommerce-1"],
    refetchInterval: 30000,
  });

  const { data: woocommerce2Status } = useQuery({
    queryKey: ["/api/sync-status/woocommerce-2"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Invalid date";
    }
  };

  const formatNextSync = (timestamp: string | null) => {
    if (!timestamp) return "Not scheduled";
    try {
      const nextTime = new Date(timestamp);
      const now = new Date();
      if (nextTime <= now) return "Due now";
      return `in ${formatDistanceToNow(nextTime)}`;
    } catch {
      return "Invalid date";
    }
  };

  const getStatusBadge = (isRunning: boolean, isActive: boolean) => {
    if (isRunning && isActive) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Running</Badge>;
    }
    if (!isActive) {
      return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Disabled</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Stopped</Badge>;
  };

  const stores = [
    { name: "Main Store", platform: "woocommerce", data: woocommerceStatus },
    { name: "Delaware Store", platform: "woocommerce-1", data: woocommerce1Status },
    { name: "Drexel Store", platform: "woocommerce-2", data: woocommerce2Status },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Auto-Sync Status
        </CardTitle>
        <CardDescription>
          Monitor automatic order synchronization across all stores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stores.map((store) => {
          const data = store.data;
          if (!data) return null;

          return (
            <div key={store.platform} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{store.name}</h4>
                {getStatusBadge(data.isRunning, data.isActive)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Sync</p>
                    <p className="text-muted-foreground">{formatLastSync(data.lastSyncAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Next Sync</p>
                    <p className="text-muted-foreground">{formatNextSync(data.nextSyncAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Interval</p>
                    <p className="text-muted-foreground">{data.intervalMinutes || 5} minutes</p>
                  </div>
                </div>
              </div>

              {data.lastOrderCount !== undefined && (
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Last sync: {data.lastOrderCount} orders processed
                  </p>
                </div>
              )}
            </div>
          );
        })}
        
        {syncStatus && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Overall status: {syncStatus.activeConnections || 0} of {stores.length} stores syncing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}