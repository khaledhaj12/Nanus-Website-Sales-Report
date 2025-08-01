import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, DollarSign, ShoppingCart, Percent, CreditCard, RefreshCw, TrendingUp, Settings } from "lucide-react";
import { useState, useMemo } from "react";

interface LocationData {
  location: string;
  sales: number;
  orders: number;
  platform_fees: number;
  stripe_fees: number;
  refunds: number;
  net_deposit: number;
}

interface LocationBreakdownProps {
  data: LocationData[];
  isLoading: boolean;
}

export default function LocationBreakdown({ data, isLoading }: LocationBreakdownProps) {
  const [visibleColumns, setVisibleColumns] = useState({
    sales: true,
    orders: true,
    platform: true,
    stripe: true,
    refunds: true,
    net: true,
  });

  // Initialize visible locations state dynamically based on data
  const [visibleLocations, setVisibleLocations] = useState<Record<string, boolean>>({});

  // Initialize location visibility when data changes
  useMemo(() => {
    if (data && data.length > 0) {
      const newVisibleLocations: Record<string, boolean> = {};
      data.forEach((location) => {
        newVisibleLocations[location.location] = visibleLocations[location.location] ?? true;
      });
      setVisibleLocations(newVisibleLocations);
    }
  }, [data]);

  const toggleColumn = (columnKey: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleLocation = (locationName: string) => {
    setVisibleLocations(prev => ({
      ...prev,
      [locationName]: !prev[locationName]
    }));
  };

  const columnConfig = [
    { key: 'sales' as const, label: 'Sales', width: 'w-16' },
    { key: 'orders' as const, label: 'Orders', width: 'w-16' },
    { key: 'platform' as const, label: 'Platform', width: 'w-16' },
    { key: 'stripe' as const, label: 'Stripe', width: 'w-16' },
    { key: 'refunds' as const, label: 'Refunds', width: 'w-16' },
    { key: 'net' as const, label: 'Net', width: 'w-16' },
  ];

  // Filter data based on visible locations
  const filteredData = data.filter(location => visibleLocations[location.location] !== false);
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Breakdown
          </CardTitle>
          <CardDescription>Sales performance by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="h-16 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Breakdown
          </CardTitle>
          <CardDescription>Sales performance by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No location data available for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Breakdown
            </CardTitle>
            <CardDescription>Sales performance by location</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                {/* Columns Section */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Show/Hide Columns</h4>
                  <div className="space-y-2">
                    {columnConfig.map((column) => (
                      <div key={column.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.key}
                          checked={visibleColumns[column.key]}
                          onCheckedChange={() => toggleColumn(column.key)}
                        />
                        <label
                          htmlFor={column.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locations Section */}
                {data && data.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="font-medium text-sm mb-2">Show/Hide Locations</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {data.map((location) => (
                        <div key={location.location} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location.location}`}
                            checked={visibleLocations[location.location] !== false}
                            onCheckedChange={() => toggleLocation(location.location)}
                          />
                          <label
                            htmlFor={`location-${location.location}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                            title={location.location}
                          >
                            {location.location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </div>
            <div className="flex items-center gap-8">
              {columnConfig.map((column) => (
                visibleColumns[column.key] && (
                  <span key={column.key} className={`${column.width} text-center`}>
                    {column.label}
                  </span>
                )
              ))}
            </div>
          </div>

          {/* Data rows */}
          {filteredData.map((location) => (
            <div key={location.location} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <h3 className="font-medium text-gray-900 truncate">{location.location}</h3>
              </div>
              <div className="flex items-center gap-8">
                {visibleColumns.sales && (
                  <span className="w-16 text-center font-semibold text-green-600">
                    ${parseFloat(location.sales.toString()).toFixed(2)}
                  </span>
                )}
                {visibleColumns.orders && (
                  <span className="w-16 text-center font-semibold text-blue-600">
                    {parseInt(location.orders.toString())}
                  </span>
                )}
                {visibleColumns.platform && (
                  <span className="w-16 text-center font-semibold text-orange-600">
                    ${parseFloat(location.platform_fees.toString()).toFixed(2)}
                  </span>
                )}
                {visibleColumns.stripe && (
                  <span className="w-16 text-center font-semibold text-purple-600">
                    ${parseFloat(location.stripe_fees.toString()).toFixed(2)}
                  </span>
                )}
                {visibleColumns.refunds && (
                  <span className="w-16 text-center font-semibold text-red-600">
                    ${parseFloat(location.refunds.toString()).toFixed(2)}
                  </span>
                )}
                {visibleColumns.net && (
                  <span className="w-16 text-center font-semibold text-emerald-600">
                    ${parseFloat(location.net_deposit.toString()).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}