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
import PaginationControls from "@/components/ui/pagination-controls";
import { formatCurrency } from "@/lib/feeCalculations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Search, ShoppingBag } from "lucide-react";

interface WooOrdersProps {
  onMenuClick: () => void;
}

export default function WooOrders({ onMenuClick }: WooOrdersProps) {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { toast } = useToast();

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  const isSingleMonth = startMonth === endMonth;

  // Query for WooCommerce orders
  const { data: rawWooOrders = [] } = useQuery({
    queryKey: ["/api/woo-orders", selectedLocation, startMonth, endMonth, searchQuery],
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
      
      const response = await fetch(`/api/woo-orders?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch WooCommerce orders");
      }
      
      return response.json();
    },
  });

  // Apply sorting and pagination to orders
  const sortedOrders = useMemo(() => {
    const sorted = [...rawWooOrders].sort((a: any, b: any) => {
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
  }, [rawWooOrders, sortBy, sortOrder]);

  // Paginate the sorted orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedOrders, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Delete orders mutation (admin only)
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      await apiRequest("DELETE", "/api/woo-orders/bulk-delete", { orderIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/woo-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-breakdown"] });
      setSelectedOrders([]);
      toast({
        title: "Success",
        description: `Deleted ${selectedOrders.length} WooCommerce order(s)`,
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
    if (!isAdmin) return;
    
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (!isAdmin) return;
    
    if (selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map((order: any) => order.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    deleteOrdersMutation.mutate(selectedOrders);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="WooCommerce Orders" 
        onMenuClick={onMenuClick}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        showFilters={isAdmin}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <CardTitle>WooCommerce Orders</CardTitle>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <MonthRangePicker
                  startMonth={startMonth}
                  endMonth={endMonth}
                  onStartMonthChange={setStartMonth}
                  onEndMonthChange={setEndMonth}
                />
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No WooCommerce orders found for the selected filters.
              </div>
            ) : (
              <>
                {/* Admin Controls */}
                {isAdmin && selectedOrders.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedOrders.length} order(s) selected
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={deleteOrdersMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
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
                          sortKey="wooOrderNumber" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort}
                        >
                          WooCommerce #
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
                        <SortableHeader 
                          sortKey="paymentMethod" 
                          currentSort={sortBy} 
                          currentOrder={sortOrder} 
                          onSort={handleSort}
                        >
                          Payment
                        </SortableHeader>
                        {isAdmin && (
                          <TableHead>Location</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order: any) => (
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
                          <TableCell className="font-mono text-sm">{order.wooOrderNumber}</TableCell>
                          <TableCell>{order.customerName || order.firstName || "N/A"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(parseFloat(order.amount))}</TableCell>
                          <TableCell className="text-red-600">
                            {order.refundAmount && parseFloat(order.refundAmount) > 0 ? 
                              formatCurrency(parseFloat(order.refundAmount)) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === "completed" ? "default" :
                              order.status === "processing" ? "secondary" :
                              order.status === "refunded" ? "destructive" :
                              order.status === "cancelled" ? "outline" : "secondary"
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{order.paymentMethod || "N/A"}</TableCell>
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {isAdmin && paginatedOrders.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                      <Checkbox
                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-gray-600">
                        Select All ({selectedOrders.length} of {sortedOrders.length} selected)
                      </span>
                    </div>
                  )}
                  
                  {paginatedOrders.map((order: any) => (
                    <div key={order.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              onCheckedChange={() => handleSelectOrder(order.id)}
                            />
                          )}
                          <div>
                            <p className="font-medium">#{order.wooOrderNumber}</p>
                            <p className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant={
                          order.status === "completed" ? "default" :
                          order.status === "processing" ? "secondary" :
                          order.status === "refunded" ? "destructive" :
                          order.status === "cancelled" ? "outline" : "secondary"
                        }>
                          {order.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Customer:</span>
                          <span>{order.customerName || order.firstName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-medium">{formatCurrency(parseFloat(order.amount))}</span>
                        </div>
                        {order.refundAmount && parseFloat(order.refundAmount) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Refund:</span>
                            <span className="text-red-600">{formatCurrency(parseFloat(order.refundAmount))}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment:</span>
                          <span className="capitalize">{order.paymentMethod || "N/A"}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Location:</span>
                            <span>{Array.isArray(locations) && locations.find((loc: any) => loc.id === order.locationId)?.name || "Unknown"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                <PaginationControls
                  currentPage={currentPage}
                  totalItems={sortedOrders.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}