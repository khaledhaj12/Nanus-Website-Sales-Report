import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, ShoppingCart, Percent, CreditCard, RefreshCw, TrendingUp } from "lucide-react";

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
}

export default function LocationBreakdown({ data, isLoading }: LocationBreakdownProps) {
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
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Breakdown
        </CardTitle>
        <CardDescription>Sales performance by location</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((location) => (
            <div key={location.location} className="border-b pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-lg text-gray-900">{location.location}</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Sales */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Sales</span>
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    ${parseFloat(location.sales.toString()).toFixed(2)}
                  </div>
                </div>

                {/* Orders */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Orders</span>
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {parseInt(location.orders.toString())}
                  </div>
                </div>

                {/* Platform Fees */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Platform</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900">
                    ${parseFloat(location.platform_fees.toString()).toFixed(2)}
                  </div>
                </div>

                {/* Stripe Fees */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">Stripe</span>
                  </div>
                  <div className="text-lg font-bold text-orange-900">
                    ${parseFloat(location.stripe_fees.toString()).toFixed(2)}
                  </div>
                </div>

                {/* Refunds */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Refunds</span>
                  </div>
                  <div className="text-lg font-bold text-red-900">
                    ${parseFloat(location.refunds.toString()).toFixed(2)}
                  </div>
                </div>

                {/* Net Deposit */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Net Deposit</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-900">
                    ${parseFloat(location.net_deposit.toString()).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}