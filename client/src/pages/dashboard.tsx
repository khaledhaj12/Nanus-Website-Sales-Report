import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import SummaryCards from "@/components/dashboard/summary-cards";
import MonthlyBreakdown from "@/components/dashboard/monthly-breakdown";
import { MonthRangePicker } from "@/components/ui/month-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardProps {
  onMenuClick: () => void;
}

export default function Dashboard({ onMenuClick }: DashboardProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [selectedLocation, setSelectedLocation] = useState(isAdmin ? "all" : "");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["processing", "completed"]);

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  // Check if date range spans multiple months
  const isMultipleMonths = startMonth !== endMonth;



  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/dashboard/summary", { location: selectedLocation, startMonth, endMonth, statuses: selectedStatuses }],
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
    queryKey: ["/api/dashboard/monthly-breakdown", { startMonth, endMonth, location: selectedLocation, statuses: selectedStatuses }],
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
      />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        {/* Date Range, Location, and Status Filters */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <MonthRangePicker
                startValue={startMonth}
                endValue={endMonth}
                onStartChange={setStartMonth}
                onEndChange={setEndMonth}
                placeholder="Select date range"
                className="w-full"
              />
            </div>
            
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
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
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedStatuses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedStatuses.slice(0, 2).map((status) => (
                          <Badge key={status} variant="secondary" className="text-xs">
                            {status}
                          </Badge>
                        ))}
                        {selectedStatuses.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{selectedStatuses.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      "Select statuses"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search status..." />
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup>
                      {["processing", "completed", "pending", "on-hold", "cancelled", "refunded", "failed"].map((status) => (
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
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStatuses.includes(status) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {status}
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
        
        <MonthlyBreakdown
          data={monthlyData}
          isLoading={monthlyLoading}
          selectedLocation={selectedLocation}
          startMonth={startMonth}
          endMonth={endMonth}
          isMultipleMonths={isMultipleMonths}
        />
      </main>
    </div>
  );
}
