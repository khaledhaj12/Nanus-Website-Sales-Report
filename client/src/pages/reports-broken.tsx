import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import { formatCurrency } from "@/lib/feeCalculations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";

interface ReportsProps {
  onMenuClick: () => void;
}

export default function Reports({ onMenuClick }: ReportsProps) {
  const { isAdmin } = useAuth();
  const [dateRange, setDateRange] = useState("last30days");
  const [selectedLocation, setSelectedLocation] = useState(isAdmin ? "all" : "");
  const [reportType, setReportType] = useState("summary");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  // Query for orders
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders", selectedLocation, dateRange],
    enabled: reportType === "orders",
  });

  // Delete orders mutation
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      await apiRequest(`/api/orders/bulk-delete`, "DELETE", { ids: orderIds });
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
    queryKey: ["/api/dashboard/summary", { location: selectedLocation, dateRange }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation && selectedLocation !== "all") {
        params.append("location", selectedLocation);
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
            {/* Report Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Historical Reports</CardTitle>
              </CardHeader>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                    <SelectItem value="last3months">Last 3 months</SelectItem>
                    <SelectItem value="last6months">Last 6 months</SelectItem>
                    <SelectItem value="lastyear">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Transactions</SelectItem>
                    <SelectItem value="fees">Fee Breakdown</SelectItem>
                    <SelectItem value="refunds">Refund Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              Generate Report
            </Button>
          </CardContent>
        </Card>

        {/* Report Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {reportCards.map((card, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">{card.title}</h4>
                  <p className={`text-2xl font-bold ${card.color} mb-2`}>
                    {card.value}
                  </p>
                  <p className="text-sm text-gray-600">{card.subtitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Additional Statistics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData?.totalSales || 0)}
                </p>
                <p className="text-sm text-gray-600">Total Sales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {(reportData?.totalOrders || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(reportData?.totalRefunds || 0)}
                </p>
                <p className="text-sm text-gray-600">Total Refunds</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData?.netDeposit || 0)}
                </p>
                <p className="text-sm text-gray-600">Net Deposit</p>
              </div>
            </div>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders && orders.length > 0 ? (
                    orders.map((order: any) => (
                      <div key={order.id} className="flex items-center space-x-3 p-3 border rounded">
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
                        <div className="flex-1">
                          <div className="font-medium">{order.orderId}</div>
                          <div className="text-sm text-gray-600">
                            {order.customerName} • {formatCurrency(parseFloat(order.amount))} • {order.orderDate}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No orders found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
