import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Download, 
  Filter, 
  Settings, 
  Calendar,
  ChevronUp,
  ChevronDown,
  Upload,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  Package,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";

interface WooOrder {
  id: number;
  wooOrderId: string;
  orderId: string;
  locationId: number;
  customerName: string;
  firstName: string;
  lastName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: string;
  amount: string;
  subtotal: string;
  shippingTotal: string;
  taxTotal: string;
  discountTotal: string;
  refundAmount: string;
  status: string;
  orderDate: string;
  wooOrderNumber: string;
  paymentMethod: string;
  paymentMethodTitle: string;
  currency: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostcode: string;
  shippingCountry: string;
  billingFirstName: string;
  billingLastName: string;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingPostcode: string;
  billingCountry: string;
  locationMeta: string;
  orderNotes: string;
  customerNote: string;
}

interface Location {
  id: number;
  name: string;
}

interface ImportFormData {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  startDate: string;
  endDate: string;
}

const COLUMN_DEFINITIONS = [
  { key: 'wooOrderNumber', label: 'Order #', width: 'w-24' },
  { key: 'orderDate', label: 'Date', width: 'w-32' },
  { key: 'customerName', label: 'Customer', width: 'w-48' },
  { key: 'customerEmail', label: 'Email', width: 'w-48' },
  { key: 'customerPhone', label: 'Phone', width: 'w-32' },
  { key: 'amount', label: 'Total', width: 'w-24' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'paymentMethodTitle', label: 'Payment', width: 'w-32' },
  { key: 'locationMeta', label: 'Location', width: 'w-32' },
  { key: 'shippingCity', label: 'Shipping City', width: 'w-32' },
  { key: 'shippingState', label: 'Shipping State', width: 'w-28' },
  { key: 'billingCity', label: 'Billing City', width: 'w-32' },
  { key: 'billingState', label: 'Billing State', width: 'w-28' },
  { key: 'currency', label: 'Currency', width: 'w-20' },
  { key: 'subtotal', label: 'Subtotal', width: 'w-24' },
  { key: 'shippingTotal', label: 'Shipping', width: 'w-24' },
  { key: 'taxTotal', label: 'Tax', width: 'w-20' },
  { key: 'discountTotal', label: 'Discount', width: 'w-24' },
  { key: 'orderNotes', label: 'Notes', width: 'w-48' }
];

const DEFAULT_VISIBLE_COLUMNS = [
  'wooOrderNumber', 'orderDate', 'customerName', 'customerEmail', 
  'amount', 'status', 'paymentMethodTitle', 'locationMeta'
];

export default function WooOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  // Multi-select handlers
  const handleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(prev => 
      prev.length === orders.length ? [] : orders.map(order => order.id)
    );
  };

  // Delete mutation
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      const response = await fetch('/api/woo-orders/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      });
      if (!response.ok) throw new Error('Failed to delete orders');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedOrders.length} orders deleted successfully`,
      });
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ["/api/woo-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete orders",
        variant: "destructive",
      });
    }
  });

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedOrders.length} selected orders? This action cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  // Fetch data
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/woo-orders", selectedLocation, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocation !== "all") params.append("locationId", selectedLocation);
      if (searchTerm) params.append("search", searchTerm);
      
      const url = params.toString() ? `/api/woo-orders?${params.toString()}` : "/api/woo-orders";
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    }
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });





  // Sorting and filtering
  const filteredAndSortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.customerName?.toLowerCase().includes(term) ||
        order.customerEmail?.toLowerCase().includes(term) ||
        order.wooOrderNumber?.toLowerCase().includes(term) ||
        order.orderId?.toLowerCase().includes(term) ||
        order.locationMeta?.toLowerCase().includes(term)
      );
    }

    // Apply location filter
    if (selectedLocation !== "all") {
      filtered = filtered.filter(order => order.locationId === parseInt(selectedLocation));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof WooOrder];
      let bValue: any = b[sortBy as keyof WooOrder];

      // Handle different data types
      if (sortBy === 'orderDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'amount' || sortBy === 'subtotal' || sortBy === 'taxTotal') {
        aValue = parseFloat(aValue || '0');
        bValue = parseFloat(bValue || '0');
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [orders, searchTerm, selectedLocation, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleColumnToggle = (column: string) => {
    setVisibleColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };



  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'completed': 'bg-green-100 text-green-800',
      'processing': 'bg-blue-100 text-blue-800', 
      'on-hold': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800',
      'failed': 'bg-red-100 text-red-800',
      'pending': 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount || '0'));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const renderCellContent = (order: WooOrder, column: string) => {
    switch (column) {
      case 'orderDate':
        return formatDate(order.orderDate);
      case 'amount':
      case 'subtotal':
      case 'shippingTotal':
      case 'taxTotal':
      case 'discountTotal':
        return formatCurrency(order[column as keyof WooOrder] as string, order.currency);
      case 'status':
        return getStatusBadge(order.status);
      case 'customerName':
        return (
          <div className="flex items-center gap-2">
            <div>
              <div className="font-medium">{order.customerName || 'N/A'}</div>
              {order.customerId && (
                <div className="text-xs text-gray-500">ID: {order.customerId}</div>
              )}
            </div>
          </div>
        );
      case 'customerEmail':
        return order.customerEmail ? (
          <div className="flex items-center gap-1 text-sm">
            <Mail className="h-3 w-3 text-gray-400" />
            {order.customerEmail}
          </div>
        ) : 'N/A';
      case 'customerPhone':
        return order.customerPhone ? (
          <div className="flex items-center gap-1 text-sm">
            <Phone className="h-3 w-3 text-gray-400" />
            {order.customerPhone}
          </div>
        ) : 'N/A';
      case 'locationMeta':
        return (
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3 text-gray-400" />
            {order.locationMeta}
          </div>
        );
      case 'paymentMethodTitle':
        return order.paymentMethodTitle ? (
          <div className="flex items-center gap-1 text-sm">
            <CreditCard className="h-3 w-3 text-gray-400" />
            {order.paymentMethodTitle}
          </div>
        ) : 'N/A';
      default:
        return order[column as keyof WooOrder] || 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full px-4 py-6 sm:py-8 max-w-none mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                WooCommerce Orders
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Manage and view your imported WooCommerce orders
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Left side controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-64 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Location Filter */}
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Right side controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Column Visibility */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Show/Hide Columns</h4>
                      <div className="grid gap-2 max-h-64 overflow-auto">
                        {COLUMN_DEFINITIONS.map((col) => (
                          <div key={col.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={col.key}
                              checked={visibleColumns.includes(col.key)}
                              onCheckedChange={() => handleColumnToggle(col.key)}
                            />
                            <Label htmlFor={col.key} className="text-sm">
                              {col.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>


              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Orders ({filteredAndSortedOrders.length})</span>
              <div className="flex items-center gap-2">
                {selectedOrders.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={deleteOrdersMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedOrders.length})
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="w-12 p-3">
                      <Checkbox
                        checked={selectedOrders.length === filteredAndSortedOrders.length && filteredAndSortedOrders.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    {COLUMN_DEFINITIONS
                      .filter(col => visibleColumns.includes(col.key))
                      .map((col) => (
                        <th 
                          key={col.key}
                          className={`text-left p-3 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${col.width}`}
                          onClick={() => handleSort(col.key)}
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {sortBy === col.key && (
                              sortOrder === 'asc' 
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="w-12 p-3">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => handleSelectOrder(order.id)}
                        />
                      </td>
                      {COLUMN_DEFINITIONS
                        .filter(col => visibleColumns.includes(col.key))
                        .map((col) => (
                          <td key={col.key} className={`p-3 ${col.width}`}>
                            {renderCellContent(order, col.key)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredAndSortedOrders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No orders found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchTerm || selectedLocation !== "all" 
                      ? "Try adjusting your search or filters"
                      : "Import your first WooCommerce orders to get started"
                    }
                  </p>
                  {!searchTerm && selectedLocation === "all" && (
                    <Button onClick={() => setShowImportForm(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Orders
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}