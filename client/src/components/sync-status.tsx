import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncStatusProps {
  platform: string;
}

interface SyncInfo {
  isActive: boolean;
  intervalMinutes: number;
  lastSyncAt: string | null;
  lastOrderCount: number;
  isRunning: boolean;
}

export default function SyncStatus({ platform }: SyncStatusProps) {
  const { data: syncInfo, isLoading } = useQuery<SyncInfo>({
    queryKey: [`/api/sync-status/${platform}`],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Checking sync status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!syncInfo) {
    return (
      <Card className="border-l-4 border-l-gray-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            Sync status unavailable
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const getNextSyncTime = () => {
    if (!syncInfo.lastSyncAt || !syncInfo.isActive) return null;
    
    const lastSync = new Date(syncInfo.lastSyncAt);
    const nextSync = new Date(lastSync.getTime() + (syncInfo.intervalMinutes * 60 * 1000));
    return nextSync;
  };

  const getTimeUntilNextSync = () => {
    const nextSync = getNextSyncTime();
    if (!nextSync) return null;
    
    const now = new Date();
    const diff = nextSync.getTime() - now.getTime();
    
    if (diff <= 0) return "Due now";
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = () => {
    if (!syncInfo.isActive) return "border-l-gray-400";
    if (syncInfo.isRunning) return "border-l-blue-500";
    return "border-l-green-500";
  };

  const getStatusIcon = () => {
    if (!syncInfo.isActive) return <AlertCircle className="h-4 w-4 text-gray-500" />;
    if (syncInfo.isRunning) return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusText = () => {
    if (!syncInfo.isActive) return "Disabled";
    if (syncInfo.isRunning) return "Running";
    return "Active";
  };

  const timeUntilNext = getTimeUntilNextSync();

  return (
    <Card className={`border-l-4 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            Auto Sync Status
          </div>
          <Badge variant={syncInfo.isActive ? "default" : "secondary"}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-medium mb-1">Last Fetch</p>
            {syncInfo.lastSyncAt ? (
              <div>
                <p className="font-semibold">
                  {formatDistanceToNow(new Date(syncInfo.lastSyncAt), { addSuffix: true })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(syncInfo.lastSyncAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Never</p>
            )}
          </div>
          
          <div>
            <p className="text-gray-600 font-medium mb-1">Orders Fetched</p>
            <p className="font-semibold text-blue-600">
              {syncInfo.lastOrderCount || 0} orders
            </p>
            <p className="text-xs text-gray-500">Last sync run</p>
          </div>
          
          <div>
            <p className="text-gray-600 font-medium mb-1">Next Scheduled</p>
            {syncInfo.isActive && timeUntilNext ? (
              <div>
                <p className="font-semibold text-orange-600">
                  In {timeUntilNext}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Every {syncInfo.intervalMinutes} minutes
                </p>
              </div>
            ) : (
              <p className="text-gray-500">
                {syncInfo.isActive ? "Calculating..." : "Disabled"}
              </p>
            )}
          </div>
        </div>
        
        {syncInfo.isRunning && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Sync in progress - checking for new orders...
          </div>
        )}
      </CardContent>
    </Card>
  );
}