import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Header from "@/components/layout/header";
import { MonthRangePicker } from "@/components/ui/month-range-picker";
import ReportsMonthlyBreakdown from "@/components/reports/monthly-breakdown";
import SummaryCards from "@/components/dashboard/summary-cards";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, DollarSign, Calendar, MapPin, Hash } from "lucide-react";

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
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [showOrdersList, setShowOrdersList] = useState(false);
  
  // Fixed statuses for reports page - only show completed business transactions
  const selectedStatuses = ["processing", "completed", "refunded"];

  const { toast } = useToast();



  const { data: rawLocations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  // Ensure unique locations using useMemo
  const locations = useMemo(() => {
    if (!Array.isArray(rawLocations)) return [];
    const uniqueMap = new Map();
    rawLocations.forEach((location: any) => {
      if (location && location.id && !uniqueMap.has(location.id)) {
        uniqueMap.set(location.id, location);
      }
    });
    return Array.from(uniqueMap.values());
  }, [rawLocations]);

  // Memoize the SelectItems to prevent re-rendering
  const locationItems = useMemo(() => {
    return locations.map((location: any) => (
      <SelectItem key={`reports-location-${location.id}`} value={location.id.toString()}>
        {location.name}
      </SelectItem>
    ));
  }, [locations]);



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

  // Query for individual orders when viewing orders list
  const { data: ordersData = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["/api/orders", { location: selectedLocation, startMonth, endMonth, statuses: selectedStatuses }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("locationId", selectedLocation);
      }
      if (startMonth && endMonth) {
        const startDate = `${startMonth}-01`;
        const endDate = new Date(`${endMonth}-01`);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        params.append("startDate", startDate);
        params.append("endDate", endDate.toISOString().split('T')[0]);
      }
      selectedStatuses.forEach(status => {
        params.append("statuses", status);
      });
      
      const url = `/api/orders?${params.toString()}`;
      const response = await fetch(url);
      return response.json();
    },
    enabled: showOrdersList,
  });

  // Delete orders mutation
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      return apiRequest("DELETE", "/api/orders/bulk-delete", { orderIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedOrders.length} order(s)`,
      });
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/monthly-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-breakdown"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete orders",
        variant: "destructive",
      });
    },
  });

  // Handle order selection
  const handleOrderSelect = (orderId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  // Handle select all orders
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(ordersData.map((order: any) => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  // Handle delete selected orders
  const handleDeleteSelected = () => {
    if (selectedOrders.length > 0) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'refunded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };



  const isMultipleMonths = startMonth !== endMonth;

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
                <Select key="reports-location-select" value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
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

        {/* Order Management Toggle */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Order Management</CardTitle>
                  <CardDescription>
                    View and manage individual orders with multi-select deletion
                  </CardDescription>
                </div>
                <Button
                  variant={showOrdersList ? "default" : "outline"}
                  onClick={() => setShowOrdersList(!showOrdersList)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showOrdersList ? "Hide Orders" : "View Orders"}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Orders List */}
        {showOrdersList && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Orders List</CardTitle>
                    <CardDescription>
                      {ordersData.length} orders found for selected criteria
                    </CardDescription>
                  </div>
                  {selectedOrders.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteOrdersMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Selected ({selectedOrders.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Orders</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedOrders.length} selected order(s)? 
                            This action cannot be undone and will permanently remove the orders from your database.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSelected}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Orders
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                
                {/* Select All Checkbox */}
                {ordersData.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Checkbox
                      id="select-all"
                      checked={selectedOrders.length === ordersData.length && ordersData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select All Orders ({ordersData.length})
                    </label>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                {isOrdersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : ordersData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No orders found</p>
                    <p className="text-sm">Try adjusting your filters or date range</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ordersData.map((order: any) => {
                      const location = locations.find((loc: any) => loc.id === order.locationId);
                      return (
                        <div
                          key={order.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            selectedOrders.includes(order.id)
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`order-${order.id}`}
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                      Order #{order.orderId}
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className={getStatusBadgeColor(order.status)}
                                    >
                                      {order.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(order.dateCreated)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {location?.name || 'Unknown Location'}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
                                    <DollarSign className="h-4 w-4" />
                                    {formatCurrency(order.total)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {order.currency?.toUpperCase() || 'USD'}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Order Details */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 rounded p-3">
                                <div>
                                  <span className="text-gray-500">Customer:</span>
                                  <div className="font-medium">
                                    {order.billingFirstName} {order.billingLastName}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <div className="font-medium truncate">
                                    {order.billingEmail || 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Payment:</span>
                                  <div className="font-medium">
                                    {order.paymentMethodTitle || 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Items:</span>
                                  <div className="font-medium">
                                    {order.lineItems ? JSON.parse(order.lineItems).length : 0} items
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly Breakdown */}
        <ReportsMonthlyBreakdown 
          data={monthlyData} 
          isLoading={isMonthlyLoading}
          selectedLocation={selectedLocation}
          startMonth={startMonth}
          endMonth={endMonth}
          isMultipleMonths={isMultipleMonths}
        />
      </main>
    </div>
  );
}