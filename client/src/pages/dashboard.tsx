import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import SummaryCards from "@/components/dashboard/summary-cards";
import MonthlyBreakdown from "@/components/dashboard/monthly-breakdown";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useAuth } from "@/hooks/useAuth";

interface DashboardProps {
  onMenuClick: () => void;
}

export default function Dashboard({ onMenuClick }: DashboardProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Default to 1970-01 where the actual data is located
  const [selectedMonth, setSelectedMonth] = useState("1970-01");
  const [selectedLocation, setSelectedLocation] = useState(isAdmin ? "all" : "");



  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/dashboard/summary", { location: selectedLocation, month: selectedMonth }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (selectedMonth) {
        params.append("month", selectedMonth);
      }
      
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
    queryKey: ["/api/dashboard/monthly-breakdown", { year: currentDate.getFullYear(), location: selectedLocation }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("year", currentDate.getFullYear().toString());
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      
      const response = await fetch(`/api/dashboard/monthly-breakdown?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch monthly breakdown");
      }
      
      return response.json();
    },
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        onMenuClick={onMenuClick}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        showFilters={true}
      />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        <SummaryCards
          totalSales={summary?.totalSales || 0}
          totalOrders={summary?.totalOrders || 0}
          platformFees={summary?.platformFees || 0}
          netDeposit={summary?.netDeposit || 0}
          totalRefunds={summary?.totalRefunds || 0}
          isLoading={summaryLoading}
        />
        
        <MonthlyBreakdown
          data={monthlyData}
          isLoading={monthlyLoading}
        />
      </main>
    </div>
  );
}
