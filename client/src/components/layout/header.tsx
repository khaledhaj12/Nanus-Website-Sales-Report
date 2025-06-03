import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
  showFilters?: boolean;
}

export default function Header({
  title,
  onMenuClick,
  selectedMonth,
  onMonthChange,
  selectedLocation,
  onLocationChange,
  showFilters = false,
}: HeaderProps) {
  const { isAdmin, user } = useAuth();
  
  // Fetch all locations for admin users
  const { data: allLocations = [] } = useQuery({
    queryKey: ["/api/locations"],
    enabled: showFilters && isAdmin,
  });

  // Fetch user's assigned locations for non-admin users
  const { data: userLocationIds = [] } = useQuery({
    queryKey: [`/api/users/${user?.id}/locations`],
    enabled: showFilters && !isAdmin && !!user?.id,
  });

  const { data: userLocations = [] } = useQuery({
    queryKey: ["/api/locations"],
    enabled: showFilters && !isAdmin,
    select: (data: any[]) => {
      if (!Array.isArray(userLocationIds) || userLocationIds.length === 0) return [];
      return data.filter((location: any) => userLocationIds.includes(location.id));
    },
  });

  // Use appropriate locations based on user role
  const locations = isAdmin ? allLocations : userLocations;





  return (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="md:hidden mr-4"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        
        {showFilters && (
          <div className="hidden md:flex items-center space-x-4">
            {onMonthChange && (
              <div>
                <MonthYearPicker
                  value={selectedMonth}
                  onChange={onMonthChange}
                  placeholder="Select month"
                  className="w-48"
                />
              </div>
            )}
            
            {onLocationChange && (
              <div>
                <Select value={selectedLocation} onValueChange={onLocationChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin && (
                      <SelectItem value="all">All Locations</SelectItem>
                    )}
                    {locations.map((location: any) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
