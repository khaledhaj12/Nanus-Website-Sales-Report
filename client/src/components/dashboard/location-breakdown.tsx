import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, DollarSign, ShoppingCart, Percent, CreditCard, RefreshCw, TrendingUp, Settings, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/feeCalculations";

// Format numbers with commas and dollar sign to match Monthly Breakdown
const formatNumber = (amount: number): string => {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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
  selectedLocation?: string;
  startDate?: string;
  endDate?: string;
  selectedStatuses: string[];
}

// Separate component for individual location rows with expand functionality
function LocationRow({ 
  location, 
  visibleColumns, 
  isExpanded, 
  onToggleExpanded,
  selectedLocation,
  startDate,
  endDate,
  selectedStatuses,
  searchTerm
}: {
  location: LocationData;
  visibleColumns: Record<string, boolean>;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  selectedLocation?: string;
  startDate?: string;
  endDate?: string;
  selectedStatuses: string[];
  searchTerm?: string;
}) {
  // Fetch orders for this location when expanded
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/dashboard/monthly-breakdown", { 
      locationName: location.location, 
      startDate, 
      endDate, 
      statuses: selectedStatuses,
      searchTerm: searchTerm 
    }],
    queryFn: async () => {
      if (!isExpanded) return [];
      
      const params = new URLSearchParams();
      params.append("locationName", location.location);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      selectedStatuses.forEach(status => params.append("statuses", status));
      
      const response = await fetch(`/api/dashboard/monthly-breakdown?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch location orders");
      }
      
      const data = await response.json();
      // Extract all orders from all months and filter by location
      const allOrders: any[] = [];
      data.forEach((month: any) => {
        if (month.orders) {
          // Filter orders to only include those from this specific location
          let locationOrders = month.orders.filter((order: any) => 
            order.locationName === location.location
          );
          
          // If there's a search term, filter further to show only matching orders
          if (searchTerm && searchTerm.trim()) {
            locationOrders = locationOrders.filter((order: any) => 
              order.orderId?.toString().includes(searchTerm.trim())
            );
          }
          
          allOrders.push(...locationOrders);
        }
      });
      return allOrders;
    },
    enabled: isExpanded,
  });

  const hasOrders = parseInt(location.orders.toString()) > 0;

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Main location row */}
      <div 
        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${
          isExpanded ? 'bg-gray-50' : ''
        }`}
        onClick={hasOrders ? onToggleExpanded : undefined}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasOrders && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
            )
          )}
          <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <h3 className="font-medium text-gray-900 truncate">{location.location}</h3>
        </div>
        <div className="flex items-center gap-8">
          {visibleColumns.sales && (
            <span className="w-16 text-center font-semibold text-green-600">
              {formatNumber(parseFloat(location.sales.toString()))}
            </span>
          )}
          {visibleColumns.orders && (
            <span className="w-16 text-center font-semibold text-blue-600">
              {parseInt(location.orders.toString())}
            </span>
          )}
          {visibleColumns.platform && (
            <span className="w-16 text-center font-semibold text-orange-600">
              {formatNumber(parseFloat(location.platform_fees.toString()))}
            </span>
          )}
          {visibleColumns.stripe && (
            <span className="w-16 text-center font-semibold text-purple-600">
              {formatNumber(parseFloat(location.stripe_fees.toString()))}
            </span>
          )}
          {visibleColumns.refunds && (
            <span className="w-16 text-center font-semibold text-red-600">
              {formatNumber(parseFloat(location.refunds.toString()))}
            </span>
          )}
          {visibleColumns.net && (
            <span className="w-16 text-center font-semibold text-emerald-600">
              {formatNumber(parseFloat(location.net_deposit.toString()))}
            </span>
          )}
        </div>
      </div>

      {/* Expanded orders section */}
      {isExpanded && (
        <div className="border-t bg-gray-50">
          <div className="p-6">
            {ordersLoading ? (
              <div className="text-center py-4 text-gray-500">Loading orders...</div>
            ) : orders.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Refund</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            {new Date(order.orderDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(order.orderDate).toLocaleTimeString('en-US', { 
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </TableCell>
                          <TableCell className="font-mono text-blue-600">
                            {order.orderId}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>
                                {order.customerName || 
                                 (order.billingFirstName && order.billingLastName 
                                   ? `${order.billingFirstName} ${order.billingLastName}`.trim()
                                   : (order.shippingFirstName && order.shippingLastName 
                                      ? `${order.shippingFirstName} ${order.shippingLastName}`.trim()
                                      : 'N/A'))}
                              </div>
                              {(order.billingAddress1 || order.shippingAddress1) && (
                                <div className="text-sm text-gray-500">
                                  {order.billingAddress1 || order.shippingAddress1}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatNumber(parseFloat(order.amount))}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {order.refundAmount ? formatNumber(parseFloat(order.refundAmount)) : '0.00'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {order.locationName || location.location}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {orders.map((order: any) => (
                    <div key={order.id} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-mono text-blue-600 font-medium">
                          {order.orderId}
                        </div>
                        <Badge className={`${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span>{new Date(order.orderDate).toLocaleTimeString('en-US', { 
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Customer:</span>
                          <span>{order.customerName || 
                                 (order.billingFirstName && order.billingLastName 
                                   ? `${order.billingFirstName} ${order.billingLastName}`.trim()
                                   : 'N/A')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span>{order.locationName || location.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-semibold">{formatNumber(parseFloat(order.amount))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Refund:</span>
                          <span className="text-red-600 font-medium">{order.refundAmount ? formatNumber(parseFloat(order.refundAmount)) : '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">No orders found for this location</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationBreakdown({ data, isLoading, selectedLocation, startDate, endDate, selectedStatuses }: LocationBreakdownProps) {
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
  
  // Track expanded locations
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{location: string, orderId: string}[]>([]);

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

  const toggleExpanded = (locationName: string) => {
    setExpandedLocations(prev => ({
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

  // Search for orders across all locations
  const searchForOrder = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append("searchQuery", query.trim());
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      selectedStatuses.forEach(status => params.append("statuses", status));

      const response = await fetch(`/api/dashboard/search-orders?${params}`, {
        credentials: "include",
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        
        // Auto-expand locations that contain the searched order
        if (results.length > 0) {
          const newExpandedLocations: Record<string, boolean> = {};
          results.forEach((result: any) => {
            newExpandedLocations[result.location] = true;
          });
          setExpandedLocations(newExpandedLocations);
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  // Filter data based on visible locations and search results
  let filteredData = data.filter(location => visibleLocations[location.location] !== false);
  
  // If there's a search query with results, filter to only show locations with matching orders
  if (searchQuery.trim() && searchResults.length > 0) {
    const searchLocationNames = searchResults.map(result => result.location);
    filteredData = filteredData.filter(location => 
      searchLocationNames.includes(location.location)
    );
  }

  // Function to get location ID from location name - we'll need this for the orders query
  const getLocationIdFromName = (locationName: string) => {
    // This is a simplified approach - you might need to adjust based on your data structure
    // For now, we'll pass the location name as a filter parameter
    return locationName;
  };
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
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search order number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchForOrder(e.target.value);
                }}
                className="pl-10 pr-10 w-64"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setExpandedLocations({});
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
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
            <LocationRow 
              key={location.location}
              location={location}
              visibleColumns={visibleColumns}
              isExpanded={expandedLocations[location.location] || false}
              onToggleExpanded={() => toggleExpanded(location.location)}
              selectedLocation={selectedLocation}
              startDate={startDate}
              endDate={endDate}
              selectedStatuses={selectedStatuses}
              searchTerm={searchQuery}
            />
          ))}

          {/* All Locations Summary Row */}
          {filteredData.length > 0 && (
            <div className="border border-gray-300 rounded-lg bg-blue-50 mt-2">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="h-4 w-4 text-blue-800 flex-shrink-0" />
                  <h3 className="font-bold text-blue-900">All Locations ({filteredData.length})</h3>
                </div>
                <div className="flex items-center gap-8">
                  {visibleColumns.sales && (
                    <span className="w-16 text-center font-bold text-blue-800">
                      {formatNumber(filteredData.reduce((sum, loc) => sum + parseFloat(loc.sales.toString()), 0))}
                    </span>
                  )}
                  {visibleColumns.orders && (
                    <span className="w-16 text-center font-bold text-blue-800">
                      {filteredData.reduce((sum, loc) => sum + parseInt(loc.orders.toString()), 0)}
                    </span>
                  )}
                  {visibleColumns.platform && (
                    <span className="w-16 text-center font-bold text-blue-800">
                      {formatNumber(filteredData.reduce((sum, loc) => sum + parseFloat(loc.platform_fees.toString()), 0))}
                    </span>
                  )}
                  {visibleColumns.stripe && (
                    <span className="w-16 text-center font-bold text-blue-800">
                      {formatNumber(filteredData.reduce((sum, loc) => sum + parseFloat(loc.stripe_fees.toString()), 0))}
                    </span>
                  )}
                  {visibleColumns.refunds && (
                    <span className="w-16 text-center font-bold text-blue-800">
                      {formatNumber(filteredData.reduce((sum, loc) => sum + parseFloat(loc.refunds.toString()), 0))}
                    </span>
                  )}
                  {visibleColumns.net && (
                    <span className="w-16 text-center font-bold text-blue-800">
                      {formatNumber(filteredData.reduce((sum, loc) => sum + parseFloat(loc.net_deposit.toString()), 0))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}