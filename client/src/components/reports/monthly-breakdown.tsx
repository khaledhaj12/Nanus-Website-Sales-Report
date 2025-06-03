import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, ChevronUp, Search } from "lucide-react";
import { formatCurrency } from "@/lib/feeCalculations";

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

interface ReportsMonthlyBreakdownProps {
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

export default function ReportsMonthlyBreakdown({
  data = [],
  isLoading = false,
  selectedLocation,
  startMonth,
  endMonth,
  isMultipleMonths = false,
  startDate,
  endDate,
  isMultipleDays = false,
}: ReportsMonthlyBreakdownProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Order>("orderDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "refunded":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAndSortedOrders = (orders: Order[]) => {
    let filtered = orders;
    
    if (searchTerm) {
      filtered = orders.filter(order =>
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === "amount" || sortField === "refundAmount") {
        aValue = parseFloat(aValue as string);
        bValue = parseFloat(bValue as string);
      }
      
      if (aValue! < bValue!) return sortOrder === "asc" ? -1 : 1;
      if (aValue! > bValue!) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Monthly Breakdown
          {isMultipleMonths && startMonth && endMonth && (
            <span className="text-sm text-gray-500 ml-2">
              ({startMonth} to {endMonth})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No data available for the selected period
          </div>
        ) : (
          (Array.isArray(data) ? data : []).map((monthData) => {
            const isExpanded = expandedMonths.has(monthData.month);
            const filteredOrders = filteredAndSortedOrders(monthData.orders);
            
            return (
              <div key={monthData.month} className="border rounded-lg">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleMonth(monthData.month)}
                >
                  <div className="flex items-center">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate">
                          {new Date(monthData.month + '-01').toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </h3>
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
                  <div className="border-t bg-gray-50 p-4">
                    {/* Search */}
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search orders..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {filteredOrders.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {searchTerm ? "No orders match your search" : "No orders in this month"}
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
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
                              {filteredOrders.map((order) => (
                                <TableRow key={order.id}>
                                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    {new Date(order.orderDate).toLocaleTimeString('en-US', { 
                                      timeZone: 'UTC',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </TableCell>
                                  <TableCell className="font-mono text-blue-600">{order.orderId}</TableCell>
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
                                  <TableCell className="font-semibold">{formatCurrency(parseFloat(order.amount))}</TableCell>
                                  <TableCell className="text-red-600">
                                    {order.refundAmount && parseFloat(order.refundAmount) > 0 
                                      ? formatCurrency(parseFloat(order.refundAmount)) 
                                      : "$0.00"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(order.status)}>
                                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{order.locationName || "Unknown"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                          {filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-mono text-blue-600 font-medium">
                                  {order.orderId}
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
                                  <div className="text-right">
                                    <div>
                                      {order.customerName || 
                                       (order.billingFirstName && order.billingLastName 
                                         ? `${order.billingFirstName} ${order.billingLastName}`.trim()
                                         : (order.shippingFirstName && order.shippingLastName 
                                            ? `${order.shippingFirstName} ${order.shippingLastName}`.trim()
                                            : 'N/A'))}
                                    </div>
                                    {(order.billingAddress1 || order.shippingAddress1) && (
                                      <div className="text-xs text-gray-500">
                                        {order.billingAddress1 || order.shippingAddress1}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Amount:</span>
                                  <span className="font-semibold">{formatCurrency(parseFloat(order.amount))}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Refund:</span>
                                  <span className="text-red-600">
                                    {order.refundAmount && parseFloat(order.refundAmount) > 0 
                                      ? formatCurrency(parseFloat(order.refundAmount)) 
                                      : "$0.00"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Location:</span>
                                  <span>{order.locationName || "Unknown"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}