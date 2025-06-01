import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { formatCurrency } from "@/lib/feeCalculations";

interface Order {
  id: number;
  orderId: string;
  customerName: string;
  customerEmail: string;
  cardLast4: string;
  amount: string;
  status: string;
  orderDate: string;
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
}

export default function MonthlyBreakdown({ data, isLoading }: MonthlyBreakdownProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

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
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <CardTitle>Monthly Breakdown</CardTitle>
          <div className="mt-4 md:mt-0 flex space-x-3">
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
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMonth(monthData.month)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Icon className="text-gray-400 h-5 w-5 transition-transform" />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {formatMonthLabel(monthData.month)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {completedOrders.length} orders • {refundedOrders.length} refunds
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(monthData.totalSales)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Net: {formatCurrency(monthData.netAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50">
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Refund</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthData.orders.map((order) => (
                              <TableRow key={order.id}>
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
                                <TableCell className="font-semibold">
                                  {formatCurrency(parseFloat(order.amount))}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(order.status)}>
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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
  );
}
