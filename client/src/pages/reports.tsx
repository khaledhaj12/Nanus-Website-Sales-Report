import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import ReportsMonthlyBreakdown from "@/components/reports/monthly-breakdown";
import SummaryCards from "@/components/dashboard/summary-cards";
import { useAuth } from "@/hooks/useAuth";

interface ReportsProps {
  onMenuClick: () => void;
}

export default function Reports({ onMenuClick }: ReportsProps) {
  const { isAdmin, user } = useAuth();
  const currentDate = new Date();
  const todayStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
  
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Fetch user's allowed statuses from database (ONLY for non-admin users)
  const { data: userStatuses = [] } = useQuery({
    queryKey: [`/api/users/${user?.id}/statuses`],
    enabled: !isAdmin && !!user?.id,
  });

  // Define allowed statuses based on user role and database permissions
  const selectedStatuses = useMemo(() => {
    if (isAdmin) {
      // Admin users: full access to all statuses, NO restrictions
      return ["processing", "completed", "refunded", "pending", "failed", "cancelled", "on-hold", "checkout-draft"];
    } else {
      // Non-admin users: use statuses from database, fallback to safe defaults
      const allowedStatuses = Array.isArray(userStatuses) ? userStatuses : [];
      return allowedStatuses.length > 0 ? allowedStatuses : ["completed", "processing", "refunded"];
    }
  }, [isAdmin, userStatuses]);

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
    if (shouldShowAllLocations) {
      setSelectedLocation("all");
    } else if (locations.length > 0 && !selectedLocation) {
      // For users without "All Locations" access, select their first assigned location
      setSelectedLocation(locations[0].id.toString());
    }
  }, [shouldShowAllLocations, locations, selectedLocation]);

  // Memoize the SelectItems to prevent re-rendering
  const locationItems = useMemo(() => {
    return locations.map((location: any) => (
      <SelectItem key={`reports-location-${location.id}`} value={location.id.toString()}>
        {location.name}
      </SelectItem>
    ));
  }, [locations]);



  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/reports/summary", { location: selectedLocation, startDate, endDate, statuses: selectedStatuses }],
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
      
      const url = `/api/reports/summary?${params.toString()}`;
      const response = await fetch(url);
      return response.json();
    },
  });

  const { data: monthlyData = [], isLoading: isMonthlyLoading } = useQuery({
    queryKey: ["/api/reports/monthly-breakdown", { location: selectedLocation, startDate, endDate, statuses: selectedStatuses }],
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
      
      const url = `/api/reports/monthly-breakdown?${params.toString()}`;
      const response = await fetch(url);
      return response.json();
    },
  });





  const isMultipleDays = startDate !== endDate;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Reports & Order Management" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        {/* Filters */}
        <div className="mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                <DateRangePicker
                  startValue={startDate}
                  endValue={endDate}
                  onStartChange={setStartDate}
                  onEndChange={setEndDate}
                />
              </div>

              {/* Location Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
                <Select key="reports-location-select" value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {shouldShowAllLocations && <SelectItem value="all">All Locations</SelectItem>}
                    {locationItems}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards 
          totalSales={summaryData?.totalSales || 0}
          totalOrders={summaryData?.totalOrders || 0}
          platformFees={summaryData?.platformFees || 0}
          stripeFees={summaryData?.stripeFees || 0}
          netDeposit={summaryData?.netDeposit || 0}
          totalRefunds={summaryData?.totalRefunds || 0}
          isLoading={isSummaryLoading}
        />





        {/* Monthly Breakdown */}
        <ReportsMonthlyBreakdown 
          data={monthlyData} 
          isLoading={isMonthlyLoading}
          selectedLocation={selectedLocation}
          startDate={startDate}
          endDate={endDate}
          isMultipleDays={isMultipleDays}
        />
      </main>
    </div>
  );
}