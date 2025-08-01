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
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </div>
            <div className="flex items-center gap-8">
              <span className="w-16 text-center">Sales</span>
              <span className="w-16 text-center">Orders</span>
              <span className="w-16 text-center">Platform</span>
              <span className="w-16 text-center">Stripe</span>
              <span className="w-16 text-center">Refunds</span>
              <span className="w-16 text-center">Net</span>
            </div>
          </div>

          {/* Data rows */}
          {data.map((location) => (
            <div key={location.location} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <h3 className="font-medium text-gray-900 truncate">{location.location}</h3>
              </div>
              <div className="flex items-center gap-8">
                <span className="w-16 text-center font-semibold text-green-600">
                  ${parseFloat(location.sales.toString()).toFixed(2)}
                </span>
                <span className="w-16 text-center font-semibold text-blue-600">
                  {parseInt(location.orders.toString())}
                </span>
                <span className="w-16 text-center font-semibold text-orange-600">
                  ${parseFloat(location.platform_fees.toString()).toFixed(2)}
                </span>
                <span className="w-16 text-center font-semibold text-purple-600">
                  ${parseFloat(location.stripe_fees.toString()).toFixed(2)}
                </span>
                <span className="w-16 text-center font-semibold text-red-600">
                  ${parseFloat(location.refunds.toString()).toFixed(2)}
                </span>
                <span className="w-16 text-center font-semibold text-emerald-600">
                  ${parseFloat(location.net_deposit.toString()).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}