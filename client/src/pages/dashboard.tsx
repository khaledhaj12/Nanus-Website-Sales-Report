import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import SummaryCards from "@/components/dashboard/summary-cards";
import MonthlyBreakdown from "@/components/dashboard/monthly-breakdown";
import LocationBreakdown from "@/components/dashboard/location-breakdown";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  onMenuClick: () => void;
}

export default function Dashboard({ onMenuClick }: DashboardProps) {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentDate = new Date();
  const todayStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["completed", "processing", "refunded"]);
  
  // All available statuses for admin users
  const allStatuses = ["completed", "processing", "refunded", "on-hold", "checkout-draft", "failed", "pending", "cancelled"];

  // Fetch all locations for admin users
  const { data: allLocations = [] } = useQuery({
    queryKey: ["/api/locations"],
    enabled: isAdmin,
  });

  // Fetch user's assigned location IDs for non-admin users
  const { data: userLocationIds = [] } = useQuery({
    queryKey: [`/api/users/${user?.id}/locations`],
    enabled: !isAdmin && !!user?.id,
  });

  // Fetch all locations for filtering by user's assigned locations
  const { data: rawLocations = [] } = useQuery({
    queryKey: ["/api/locations"],
    enabled: !isAdmin,
  });

  // Filter locations based on user role and permissions
  const locations = useMemo(() => {
    if (isAdmin) {
      // Admin sees all locations
      if (!Array.isArray(allLocations)) return [];
      
      const uniqueMap = new Map();
      allLocations.forEach((location: any) => {
        if (location && location.id && !uniqueMap.has(location.id)) {
          uniqueMap.set(location.id, location);
        }
      });
      
      return Array.from(uniqueMap.values());
    } else {
      // Non-admin users see only their assigned locations
      if (!Array.isArray(rawLocations) || !Array.isArray(userLocationIds)) return [];
      
      const filteredLocations = rawLocations.filter((location: any) => 
        location && location.id && userLocationIds.includes(location.id)
      );
      
      const uniqueMap = new Map();
      filteredLocations.forEach((location: any) => {
        if (location && location.id && !uniqueMap.has(location.id)) {
          uniqueMap.set(location.id, location);
        }
      });
      
      return Array.from(uniqueMap.values());
    }
  }, [isAdmin, allLocations, rawLocations, userLocationIds]);

  // Check if user should see "All Locations" option
  const shouldShowAllLocations = useMemo(() => {
    if (isAdmin) return true;
    
    // For non-admin users, only show "All Locations" if they have access to ALL available locations
    if (!Array.isArray(rawLocations) || !Array.isArray(userLocationIds)) return false;
    
    return rawLocations.length > 0 && userLocationIds.length === rawLocations.length;
  }, [isAdmin, rawLocations, userLocationIds]);

  // Set default selected location based on user role
  useEffect(() => {
    if (shouldShowAllLocations && selectedLocation === "") {
      setSelectedLocation("all");
    } else if (locations.length > 0 && selectedLocation === "") {
      // For users without "All Locations" access, select their first assigned location
      setSelectedLocation(locations[0].id.toString());
    }
  }, [shouldShowAllLocations, locations]);

  // Initialize status selection with default statuses
  useEffect(() => {
    if (allStatuses.length > 0 && selectedStatuses.length === 0) {
      setSelectedStatuses(['completed', 'processing', 'refunded']);
    }
  }, [allStatuses]);

  // Memoize the SelectItems to prevent re-rendering
  const locationItems = useMemo(() => {
    return locations.map((location: any) => (
      <SelectItem key={`dashboard-location-${location.id}`} value={location.id.toString()}>
        {location.name}
      </SelectItem>
    ));
  }, [locations]);

  // Check if date range spans multiple days
  const isMultipleDays = startDate !== endDate;

  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/dashboard/summary", { location: selectedLocation, startDate, endDate, statuses: selectedStatuses }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }
      selectedStatuses.forEach(status => {
        params.append("statuses", status);
      });
      
      const response = await fetch(`/api/dashboard/summary?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard summary");
      }
      
      return response.json();
    },
  });

  // Fetch monthly breakdown
  const { data: monthlyData = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ["/api/dashboard/monthly-breakdown", { startDate, endDate, location: selectedLocation, statuses: selectedStatuses }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }
      selectedStatuses.forEach(status => {
        params.append("statuses", status);
      });
      
      const response = await fetch(`/api/dashboard/monthly-breakdown?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch monthly breakdown");
      }
      
      return response.json();
    },
  });

  // Fetch location breakdown data - reuse the export endpoint
  const { data: locationData = [], isLoading: locationLoading } = useQuery({
    queryKey: ["/api/dashboard/export", { startDate, endDate, location: selectedLocation, statuses: selectedStatuses }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }
      selectedStatuses.forEach(status => {
        params.append("statuses", status);
      });
      
      const response = await fetch(`/api/dashboard/export?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch location breakdown");
      }
      
      return response.json();
    },
  });

  // Export functionality
  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }
      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }
      selectedStatuses.forEach(status => {
        params.append("statuses", status);
      });
      
      const response = await apiRequest("GET", `/api/dashboard/export?${params}`);
      return response.json();
    },
    onSuccess: (data) => {
      // Convert data to CSV format
      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No data available for the selected filters.",
          variant: "destructive",
        });
        return;
      }

      const csvHeaders = ['Location', 'Sales', 'Orders', 'Platform Fees', 'Stripe Fees', 'Refunds', 'Net Deposit'];
      const csvRows = data.map((row: any) => [
        row.location,
        parseFloat(row.sales || 0).toFixed(2),
        parseInt(row.orders || 0),
        parseFloat(row.platform_fees || 0).toFixed(2),
        parseFloat(row.stripe_fees || 0).toFixed(2),
        parseFloat(row.refunds || 0).toFixed(2),
        parseFloat(row.net_deposit || 0).toFixed(2)
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with date range
      const filename = `dashboard-export-${startDate}-to-${endDate}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        onMenuClick={onMenuClick}
        rightContent={
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Export"}
          </Button>
        }
      />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        {/* Date Range, Location and Status Filters */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <DateRangePicker
                startValue={startDate}
                endValue={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                placeholder="Select date range"
                className="w-full"
              />
            </div>

            {/* Location Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <Select key="dashboard-location-select" value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {shouldShowAllLocations && <SelectItem value="all">All Locations</SelectItem>}
                  {locationItems}
                </SelectContent>
              </Select>
            </div>

            {/* Order Status Filter - Always show for admin users */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Status
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between min-h-[40px] px-3 py-2"
                    >
                      {selectedStatuses.length > 0 ? (
                        <div className="flex flex-wrap gap-1 items-center max-w-[200px]">
                          {selectedStatuses.slice(0, 2).map((status) => (
                            <Badge 
                              key={status} 
                              variant="secondary" 
                              className={cn(
                                "text-xs capitalize font-medium px-2 py-1",
                                status === "processing" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                                status === "completed" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                                status === "refunded" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                                status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                                status === "cancelled" && "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
                                status === "checkout-draft" && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                                status === "on-hold" && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              )}
                            >
                              {status}
                            </Badge>
                          ))}
                          {selectedStatuses.length > 2 && (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              +{selectedStatuses.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select order statuses</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandGroup className="p-2">
                        {allStatuses.map((status: string) => (
                          <CommandItem
                            key={status}
                            value={status}
                            onSelect={() => {
                              setSelectedStatuses(prev => 
                                prev.includes(status)
                                  ? prev.filter(s => s !== status)
                                  : [...prev, status]
                              );
                            }}
                            className="flex items-center space-x-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4 text-primary",
                                selectedStatuses.includes(status) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="capitalize font-medium flex-1">{status}</span>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              status === "processing" && "bg-blue-500",
                              status === "completed" && "bg-green-500",
                              status === "refunded" && "bg-red-500",
                              status === "pending" && "bg-yellow-500",
                              status === "cancelled" && "bg-gray-500",
                              status === "on-hold" && "bg-orange-500",
                              status === "failed" && "bg-red-600"
                            )} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
          </div>
        </div>
        <SummaryCards
          totalSales={summary?.totalSales || 0}
          totalOrders={summary?.totalOrders || 0}
          platformFees={summary?.platformFees || 0}
          stripeFees={summary?.stripeFees || 0}
          netDeposit={summary?.netDeposit || 0}
          totalRefunds={summary?.totalRefunds || 0}
          isLoading={summaryLoading}
        />
        
        <LocationBreakdown
          data={locationData}
          isLoading={locationLoading}
          selectedLocation={selectedLocation}
          startDate={startDate}
          endDate={endDate}
          selectedStatuses={selectedStatuses}
        />
        
        <MonthlyBreakdown
          data={monthlyData}
          isLoading={monthlyLoading}
          selectedLocation={selectedLocation}
          startDate={startDate}
          endDate={endDate}
          isMultipleDays={isMultipleDays}
        />
      </main>
    </div>
  );
}
