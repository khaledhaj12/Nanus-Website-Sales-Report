import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { SortableHeader } from "@/components/ui/sortable-header";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
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
  
  const [selectedHistoricalMonth, setSelectedHistoricalMonth] = useState(currentMonth);
  const [selectedLocation, setSelectedLocation] = useState(isAdmin ? "all" : "");
  const [reportType, setReportType] = useState("summary");
  const [historicalSearchQuery, setHistoricalSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderLocationFilter, setOrderLocationFilter] = useState("all");
  const [orderMonthFilter, setOrderMonthFilter] = useState(currentMonth);
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  // Query for orders with filters
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders", orderLocationFilter, orderMonthFilter, searchQuery],
    enabled: reportType === "orders",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orderLocationFilter && orderLocationFilter !== "all") {
        params.append("location", orderLocationFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (orderMonthFilter && orderMonthFilter !== "all") {
        params.append("month", orderMonthFilter);
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

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const sortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    return [...orders].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'orderId':
          aValue = a.orderId || '';
          bValue = b.orderId || '';
          break;
        case 'orderDate':
          aValue = new Date(a.orderDate).getTime();
          bValue = new Date(b.orderDate).getTime();
          break;
        case 'customerName':
          aValue = a.customerName || '';
          bValue = b.customerName || '';
          break;
        case 'amount':
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case 'refundAmount':
          aValue = parseFloat(a.refundAmount) || 0;
          bValue = parseFloat(b.refundAmount) || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortOrder === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
    });
  }, [orders, sortBy, sortOrder]);

  // Delete orders mutation
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      const response = await fetch(`/api/orders/bulk-delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ orderIds }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete orders");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Orders deleted successfully",
      });
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate date range for API call
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case "last30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "last3months":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "last6months":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "lastyear":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  };

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/summary", { location: selectedLocation, month: selectedHistoricalMonth }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (selectedHistoricalMonth) {
        params.append("month", selectedHistoricalMonth);
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

  // Query for historical orders with filters
  const { data: rawHistoricalOrders = [] } = useQuery({
    queryKey: ["/api/orders", selectedLocation, selectedHistoricalMonth, historicalSearchQuery],
    enabled: reportType === "summary",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
      }
      if (historicalSearchQuery) {
        params.append("search", historicalSearchQuery);
      }
      if (selectedHistoricalMonth) {
        params.append("month", selectedHistoricalMonth);
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

  // Apply sorting to historical orders
  const historicalOrders = useMemo(() => {
    const sorted = [...rawHistoricalOrders].sort((a: any, b: any) => {
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
  }, [rawHistoricalOrders, sortBy, sortOrder]);

  const reportCards = [
    {
      title: "Total Platform Fees",
      value: formatCurrency(reportData?.platformFees || 0),
      subtitle: "7% of total sales",
      color: "text-yellow-600",
    },
    {
      title: "Total Stripe Fees",
      value: formatCurrency(reportData?.stripeFees || 0),
      subtitle: "2.9% + $0.30 per order",
      color: "text-blue-600",
    },
    {
      title: "Net Deposit Amount",
      value: formatCurrency(reportData?.netDeposit || 0),
      subtitle: "After all deductions",
      color: "text-green-600",
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Reports"
        onMenuClick={onMenuClick}
      />
      
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
        <Tabs value={reportType} onValueChange={setReportType} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="summary">Summary Report</TabsTrigger>
            {isAdmin && <TabsTrigger value="orders">Order Management</TabsTrigger>}
          </TabsList>

          <TabsContent value="summary">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Historical Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month & Year
                    </label>
                    <MonthYearPicker
                      value={selectedHistoricalMonth}
                      onChange={setSelectedHistoricalMonth}
                      placeholder="Select month"
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

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Orders
                    </label>
                    <Search className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by order ID, customer..."
                      value={historicalSearchQuery}
                      onChange={(e) => setHistoricalSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setHistoricalSearchQuery("");
                        setSelectedLocation(isAdmin ? "all" : "");
                        setSelectedHistoricalMonth(currentMonth);
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

                {/* Historical Orders Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historicalOrders.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No orders found for the selected filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableHeader 
                                field="orderDate" 
                                currentSort={sortBy} 
                                currentOrder={sortOrder} 
                                onSort={(key: string) => {
                                  if (sortBy === key) {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                Date
                              </SortableHeader>
                              <SortableHeader 
                                field="orderId" 
                                currentSort={sortBy} 
                                currentOrder={sortOrder} 
                                onSort={(key: string) => {
                                  if (sortBy === key) {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                Order ID
                              </SortableHeader>
                              <SortableHeader 
                                field="customerName" 
                                currentSort={sortBy} 
                                currentOrder={sortOrder} 
                                onSort={(key: string) => {
                                  if (sortBy === key) {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                Customer
                              </SortableHeader>
                              <SortableHeader 
                                field="amount" 
                                currentSort={sortBy} 
                                currentOrder={sortOrder} 
                                onSort={(key: string) => {
                                  if (sortBy === key) {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                Amount
                              </SortableHeader>
                              <SortableHeader 
                                field="refundAmount" 
                                currentSort={sortBy} 
                                currentOrder={sortOrder} 
                                onSort={(key: string) => {
                                  if (sortBy === key) {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                Refund
                              </SortableHeader>
                              <SortableHeader 
                                field="status" 
                                currentSort={sortBy} 
                                currentOrder={sortOrder} 
                                onSort={(key: string) => {
                                  if (sortBy === key) {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                  }
                                }}
                              >
                                Status
                              </SortableHeader>
                              {isAdmin && (
                                <TableHead>Location</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historicalOrders.map((order: any) => (
                              <TableRow key={order.id}>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Order Management</CardTitle>
                  {selectedOrders.length > 0 && (
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
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={orderLocationFilter} onValueChange={setOrderLocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by location" />
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
                  
                  <MonthYearPicker
                    value={orderMonthFilter}
                    onChange={setOrderMonthFilter}
                    placeholder="Filter by month"
                  />
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery("");
                      setOrderLocationFilter("all");
                      setOrderMonthFilter("all");
                      setSelectedOrders([]);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardHeader>
              <CardContent>

                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={orders.length > 0 && selectedOrders.length === orders.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrders(orders.map((order: any) => order.id));
                              } else {
                                setSelectedOrders([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Refund</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders && orders.length > 0 ? (
                        orders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedOrders.includes(order.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOrders([...selectedOrders, order.id]);
                                  } else {
                                    setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-blue-600">
                              {order.orderId}
                            </TableCell>
                            <TableCell>
                              {new Date(order.orderDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{order.customerName || 'N/A'}</div>
                                {order.cardLast4 && (
                                  <div className="text-sm text-gray-500">
                                    **{order.cardLast4}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-red-600 font-medium">
                              {order.refundAmount ? formatCurrency(parseFloat(order.refundAmount)) : '-'}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(parseFloat(order.amount))}
                            </TableCell>
                            <TableCell className="text-sm">
                              {Array.isArray(locations) ? locations.find((loc: any) => loc.id === order.locationId)?.name || 'Unknown' : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge className={order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}