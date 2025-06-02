import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Percent, Banknote, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/feeCalculations";

interface SummaryCardsProps {
  totalSales: number;
  totalOrders: number;
  platformFees: number;
  stripeFees: number;
  netDeposit: number;
  totalRefunds?: number;
  isLoading?: boolean;
}

export default function SummaryCards({
  totalSales,
  totalOrders,
  platformFees,
  stripeFees,
  netDeposit,
  totalRefunds = 0,
  isLoading = false,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Sales",
      value: formatCurrency(totalSales),
      icon: DollarSign,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      growth: "+12.5%",
      growthText: "vs last month",
    },
    {
      title: "Total Orders",
      value: (totalOrders || 0).toLocaleString(),
      icon: ShoppingCart,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      growth: "+8.2%",
      growthText: "vs last month",
    },
    {
      title: "Platform Fees",
      value: formatCurrency(platformFees),
      icon: Percent,
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
      subText: "7% of total sales",
    },
    {
      title: "Stripe Fees",
      value: formatCurrency(stripeFees),
      icon: CreditCard,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      subText: "2.9% + $0.30 per transaction",
    },
    {
      title: "Net Deposit",
      value: formatCurrency(netDeposit),
      icon: Banknote,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      subText: "After all fees",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {cards.map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 ${card.bgColor} rounded-full`}>
                  <Icon className={`${card.iconColor} h-6 w-6`} />
                </div>
              </div>
              <div className="mt-4">
                {card.growth ? (
                  <div className="flex items-center">
                    <span className="text-green-500 text-sm font-medium">{card.growth}</span>
                    <span className="text-gray-500 text-sm ml-2">{card.growthText}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">{card.subText}</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
