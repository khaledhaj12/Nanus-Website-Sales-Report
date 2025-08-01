import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/feeCalculations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

interface Order {
  id: number;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  cardLast4?: string;
  refundAmount: string;
  amount: string;
  status: string;
  orderDate: string;
  locationName?: string;
  billingFirstName?: string;
  billingLastName?: string;
  billingAddress1?: string;
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingAddress1?: string;
}

interface MonthData {
  month: string;
  totalSales: number;
  totalOrders: number;
  totalRefunds: number;
  netAmount: number;
  orders: Order[];
}

interface MonthlyBreakdownProps {
  data: MonthData[];
  isLoading?: boolean;
  selectedLocation?: string;
  startMonth?: string;
  endMonth?: string;
  isMultipleMonths?: boolean;
  startDate?: string;
  endDate?: string;
  isMultipleDays?: boolean;
}

export default function MonthlyBreakdown({ 
  data, 
  isLoading, 
  selectedLocation, 
  startMonth, 
  endMonth, 
  isMultipleMonths 
}: MonthlyBreakdownProps) {
  // For single month (current month), expand by default
  // For multiple months, keep compact view (collapsed)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const defaultExpanded = !isMultipleMonths && startMonth === currentMonth ? new Set([currentMonth]) : new Set();
  
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = useAuth();
  const isAdmin = permissions?.isAdmin;

  // Delete orders mutation
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      return await apiRequest("DELETE", "/api/orders/bulk-delete", { orderIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Orders deleted successfully",
      });
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete orders",
        variant: "destructive",
      });
    },
  });

  // Optimized selection handlers with useCallback
  const handleSelectOrder = useCallback((orderId: number, checked: boolean) => {
    setSelectedOrders(prev => {
      if (checked) {
        return prev.includes(orderId) ? prev : [...prev, orderId];
      } else {
        return prev.filter(id => id !== orderId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((monthOrders: Order[], checked: boolean) => {
    const orderIds = monthOrders.map(order => order.id);
    setSelectedOrders(prev => {
      if (checked) {
        const newIds = orderIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      } else {
        return prev.filter(id => !orderIds.includes(id));
      }
    });
  }, []);

  // Handle delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    deleteOrdersMutation.mutate(selectedOrders);
    setShowDeleteDialog(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortedOrders = (orders: Order[]) => {
    if (!sortField) return orders;

    return [...orders].sort((a, b) => {
      let aValue: any = a[sortField as keyof Order];
      let bValue: any = b[sortField as keyof Order];

      // Handle different data types
      if (sortField === 'orderDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortField === 'amount' || sortField === 'refundAmount') {
        aValue = parseFloat(aValue || '0');
        bValue = parseFloat(bValue || '0');
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = data.map(monthData => ({
    ...monthData,
    orders: monthData.orders.filter(order => 
      searchTerm === "" || 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cardLast4?.includes(searchTerm)
    )
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <CardTitle>Monthly Breakdown</CardTitle>
          <div className="mt-4 md:mt-0 flex space-x-3">
            {isAdmin && selectedOrders.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={deleteOrdersMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedOrders.length})
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {filteredData.map((monthData) => {
            const isExpanded = expandedMonths.has(monthData.month);
            const Icon = isExpanded ? ChevronDown : ChevronRight;
            const completedOrders = monthData.orders.filter(order => order.status !== 'refunded');
            const refundedOrders = monthData.orders.filter(order => order.status === 'refunded');

            return (
              <div key={monthData.month} className="border-b border-gray-200 last:border-b-0">
                <div
                  className="p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => toggleMonth(monthData.month)}
                >
                  <div className="flex items-center">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <Icon className="text-gray-400 h-5 w-5 transition-transform flex-shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {formatMonthLabel(monthData.month)}
                        </h4>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6 text-center text-sm flex-shrink-0 ml-0 md:ml-6 mt-3 md:mt-0">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sales</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(monthData.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Orders</p>
                        <p className="font-medium text-gray-700">{monthData.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Platform</p>
                        <p className="font-medium text-yellow-600">{formatCurrency((monthData.totalSales * 0.07) - (monthData.totalRefunds * 0.07))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Stripe</p>
                        <p className="font-medium text-blue-600">{formatCurrency((monthData.totalSales * 0.029) + (monthData.totalOrders * 0.30))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Refunds</p>
                        <p className="font-medium text-red-600">{formatCurrency(monthData.totalRefunds)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Net</p>
                        <p className="font-semibold text-green-600">{formatCurrency(monthData.netAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50">
                    <div className="p-6">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {isAdmin && (
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={monthData.orders.length > 0 && monthData.orders.every(order => selectedOrders.includes(order.id))}
                                    onCheckedChange={(checked) => handleSelectAll(monthData.orders, checked === true)}
                                  />
                                </TableHead>
                              )}
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('orderDate')}>
                                <div className="flex items-center space-x-1">
                                  <span>Date</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('orderDate')}>
                                <div className="flex items-center space-x-1">
                                  <span>Time</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('orderId')}>
                                <div className="flex items-center space-x-1">
                                  <span>Order ID</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('customerName')}>
                                <div className="flex items-center space-x-1">
                                  <span>Customer</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('amount')}>
                                <div className="flex items-center space-x-1">
                                  <span>Amount</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('refundAmount')}>
                                <div className="flex items-center space-x-1">
                                  <span>Refund</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                                <div className="flex items-center space-x-1">
                                  <span>Status</span>
                                  <div className="flex flex-col">
                                    <ChevronUp className="h-3 w-3 text-gray-400" />
                                    <ChevronDown className="h-3 w-3 text-gray-400 -mt-1" />
                                  </div>
                                </div>
                              </TableHead>
                              <TableHead>Location</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getSortedOrders(monthData.orders).map((order) => (
                              <TableRow key={order.id}>
                                {isAdmin && (
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedOrders.includes(order.id)}
                                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked === true)}
                                    />
                                  </TableCell>
                                )}
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
                                  {formatCurrency(parseFloat(order.amount))}
                                </TableCell>
                                <TableCell className="text-red-600 font-medium">
                                  {order.refundAmount ? formatCurrency(parseFloat(order.refundAmount)) : '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(order.status)}>
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {order.locationName || 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3">
                        {/* Mobile Select All Button */}
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={monthData.orders.length > 0 && monthData.orders.every(order => selectedOrders.includes(order.id))}
                              onCheckedChange={(checked) => handleSelectAll(monthData.orders, checked === true)}
                            />
                            <span className="font-medium text-sm">Select All ({monthData.orders.length} orders)</span>
                          </div>
                        </div>
                        {monthData.orders.map((order) => (
                          <div key={order.id} className="bg-white border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={selectedOrders.includes(order.id)}
                                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked === true)}
                                />
                                <div className="font-mono text-blue-600 font-medium">
                                  {order.orderId}
                                </div>
                              </div>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Date:</span>
                                <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Customer:</span>
                                <span>{order.customerName || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Location:</span>
                                <span>{order.locationName || 'N/A'}</span>
                              </div>
                              {order.cardLast4 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Card:</span>
                                  <span>**{order.cardLast4}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="font-semibold">{formatCurrency(parseFloat(order.amount))}</span>
                              </div>
                              {order.refundAmount && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Refund:</span>
                                  <span className="text-red-600 font-medium">{formatCurrency(parseFloat(order.refundAmount))}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        orderCount={selectedOrders.length}
        isDeleting={deleteOrdersMutation.isPending}
      />
    </>
  );
}
