import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { SortableHeader } from "@/components/ui/sortable-header";
import { MonthRangePicker } from "@/components/ui/month-range-picker";
import { formatCurrency } from "@/lib/feeCalculations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Search } from "lucide-react";

interface ReportsProps {
  onMenuClick: () => void;
}

export default function Reports({ onMenuClick }: ReportsProps) {
  const { isAdmin } = useAuth();
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [selectedLocation, setSelectedLocation] = useState(isAdmin ? "all" : "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  // Determine if we're showing a single month or range
  const isSingleMonth = startMonth === endMonth;
  
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/summary", { location: selectedLocation, startMonth, endMonth }],
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
      
      const response = await fetch(`/api/dashboard/summary?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }
      
      return response.json();
    },
  });

  // Query for monthly breakdown (compact view for multi-month)
  const { data: monthlyBreakdown = [] } = useQuery({
    queryKey: ["/api/dashboard/monthly-breakdown", selectedLocation, startMonth, endMonth],
    enabled: !isSingleMonth,
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
      
      const response = await fetch(`/api/dashboard/monthly-breakdown?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch monthly breakdown");
      }
      
      return response.json();
    },
  });

  // Query for detailed orders (table view for single month)
  const { data: rawOrders = [] } = useQuery({
    queryKey: ["/api/orders", selectedLocation, startMonth, endMonth, searchQuery],
    enabled: isSingleMonth,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (startMonth) {
        params.append("startMonth", startMonth);
      }
      if (endMonth) {
        params.append("endMonth", endMonth);
      }
      
      const response = await fetch(`/api/orders?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      
      return response.json();
    },
  });

  // Apply sorting to orders
  const sortedOrders = useMemo(() => {
    const sorted = [...rawOrders].sort((a: any, b: any) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle specific field types
      if (sortBy === 'amount' || sortBy === 'refundAmount') {
        aValue = parseFloat(aValue || '0');
        bValue = parseFloat(bValue || '0');
      } else if (sortBy === 'orderDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rawOrders, sortBy, sortOrder]);

  const reportCards = [
    {
      title: "Total Platform Fees",
      value: reportData ? formatCurrency(parseFloat(reportData.platformFees || "0")) : formatCurrency(0),
      subtitle: "7% of total sales",
      color: "text-purple-600"
    },
    {
      title: "Total Stripe Fees",
      value: reportData ? formatCurrency(parseFloat(reportData.stripeFees || "0")) : formatCurrency(0),
      subtitle: "2.9% + $0.30 per transaction",
      color: "text-blue-600"
    },
    {
      title: "Net Deposit",
      value: reportData ? formatCurrency(parseFloat(reportData.netDeposit || "0")) : formatCurrency(0),
      subtitle: "Amount after all fees",
      color: "text-green-600"
    },
  ];

  // Delete orders mutation (admin only)
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      await apiRequest("DELETE", "/api/orders", { ids: orderIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-breakdown"] });
      setSelectedOrders([]);
      toast({
        title: "Success",
        description: `Deleted ${selectedOrders.length} order(s)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete orders",
        variant: "destructive",
      });
    },
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const handleSelectOrder = (orderId: number) => {
    if (!isAdmin) return; // Users can't select orders
    
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (!isAdmin) return; // Users can't select orders
    
    if (selectedOrders.length === sortedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(sortedOrders.map((order: any) => order.id));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header 
        title="Reports & Order Management" 
        onMenuClick={onMenuClick}
      />
      
      <div className="flex-1 overflow-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                      {Array.isArray(locations) && locations.map((location: any) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isSingleMonth && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Orders
                  </label>
                  <Search className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by order ID, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedLocation(isAdmin ? "all" : "");
                    setStartMonth(currentMonth);
                    setEndMonth(currentMonth);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {reportCards.map((card, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <p className={`text-2xl font-bold ${card.color}`}>
                        {isLoading ? "Loading..." : card.value}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
                      <p className="text-sm text-gray-600">{card.title}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Multi-month compact view */}
            {!isSingleMonth && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Sales</TableHead>
                          <TableHead>Refunds</TableHead>
                          <TableHead>Net Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyBreakdown.map((month: any) => (
                          <TableRow key={month.month}>
                            <TableCell className="font-medium">{month.month}</TableCell>
                            <TableCell>{month.totalOrders}</TableCell>
                            <TableCell>{formatCurrency(month.totalSales)}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(month.totalRefunds)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(month.netAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Single month detailed view */}
            {isSingleMonth && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Order Details</CardTitle>
                    {isAdmin && selectedOrders.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={() => deleteOrdersMutation.mutate(selectedOrders)}
                        disabled={deleteOrdersMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedOrders.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {sortedOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No orders found for the selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {isAdmin && (
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedOrders.length === sortedOrders.length}
                                  onCheckedChange={handleSelectAll}
                                />
                              </TableHead>
                            )}
                            <SortableHeader 
                              sortKey="orderDate" 
                              currentSort={sortBy} 
                              currentOrder={sortOrder} 
                              onSort={handleSort}
                            >
                              Date
                            </SortableHeader>
                            <SortableHeader 
                              sortKey="orderId" 
                              currentSort={sortBy} 
                              currentOrder={sortOrder} 
                              onSort={handleSort}
                            >
                              Order ID
                            </SortableHeader>
                            <SortableHeader 
                              sortKey="customerName" 
                              currentSort={sortBy} 
                              currentOrder={sortOrder} 
                              onSort={handleSort}
                            >
                              Customer
                            </SortableHeader>
                            <SortableHeader 
                              sortKey="amount" 
                              currentSort={sortBy} 
                              currentOrder={sortOrder} 
                              onSort={handleSort}
                            >
                              Amount
                            </SortableHeader>
                            <SortableHeader 
                              sortKey="refundAmount" 
                              currentSort={sortBy} 
                              currentOrder={sortOrder} 
                              onSort={handleSort}
                            >
                              Refund
                            </SortableHeader>
                            <SortableHeader 
                              sortKey="status" 
                              currentSort={sortBy} 
                              currentOrder={sortOrder} 
                              onSort={handleSort}
                            >
                              Status
                            </SortableHeader>
                            {isAdmin && (
                              <TableHead>Location</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedOrders.map((order: any) => (
                            <TableRow key={order.id}>
                              {isAdmin && (
                                <TableCell>
                                  <Checkbox
                                    checked={selectedOrders.includes(order.id)}
                                    onCheckedChange={() => handleSelectOrder(order.id)}
                                  />
                                </TableCell>
                              )}
                              <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                              <TableCell>{order.customerName || order.firstName || "N/A"}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(parseFloat(order.amount))}</TableCell>
                              <TableCell className="text-red-600">
                                {order.refundAmount ? formatCurrency(parseFloat(order.refundAmount)) : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  order.status === "completed" ? "default" :
                                  order.status === "refunded" ? "destructive" :
                                  order.status === "pending" ? "secondary" : "outline"
                                }>
                                  {order.status}
                                </Badge>
                              </TableCell>
                              {isAdmin && (
                                <TableCell>
                                  {Array.isArray(locations) && locations.find((loc: any) => loc.id === order.locationId)?.name || "Unknown"}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}