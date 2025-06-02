import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import { MonthRangePicker } from "@/components/ui/month-range-picker";
import MonthlyBreakdown from "@/components/dashboard/monthly-breakdown";
import SummaryCards from "@/components/dashboard/summary-cards";
import { useAuth } from "@/hooks/useAuth";

interface ReportsProps {
  onMenuClick: () => void;
}

export default function Reports({ onMenuClick }: ReportsProps) {
  const { user, isAuthenticated } = useAuth();
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [selectedLocation, setSelectedLocation] = useState("all");
  
  // Fixed statuses for reports page - no user selection
  const selectedStatuses = ["processing", "completed", "refunded"];

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/reports/summary", { location: selectedLocation, startMonth, endMonth, statuses: selectedStatuses }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (startMonth) {
        params.append("startMonth", startMonth);
      }
      if (endMonth) {
        params.append("endMonth", endMonth);
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
    queryKey: ["/api/reports/monthly-breakdown", { location: selectedLocation, startMonth, endMonth, statuses: selectedStatuses }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (startMonth) {
        params.append("startMonth", startMonth);
      }
      if (endMonth) {
        params.append("endMonth", endMonth);
      }
      selectedStatuses.forEach(status => {
        params.append("statuses", status);
      });
      
      const url = `/api/reports/monthly-breakdown?${params.toString()}`;
      const response = await fetch(url);
      return response.json();
    },
  });



  const isMultipleMonths = startMonth !== endMonth;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports & Order Management" onMenuClick={onMenuClick} />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <MonthRangePicker
                startValue={startMonth}
                endValue={endMonth}
                onStartChange={setStartMonth}
                onEndChange={setEndMonth}
              />
            </div>

            {/* Location Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <MonthlyBreakdown 
          data={monthlyData} 
          isLoading={isMonthlyLoading}
          selectedLocation={selectedLocation}
          startMonth={startMonth}
          endMonth={endMonth}
          isMultipleMonths={isMultipleMonths}
        />
      </div>
    </div>
  );
}