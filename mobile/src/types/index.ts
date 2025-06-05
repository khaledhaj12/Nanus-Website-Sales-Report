export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'manager' | 'employee';
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalSales: number;
  totalOrders: number;
  totalRefunds: number;
  platformFees: number;
  stripeFees: number;
  netDeposit: number;
}

export interface MonthlyBreakdown {
  month: string;
  totalSales: number;
  totalOrders: number;
  totalRefunds: number;
  netAmount: number;
  orders: WooOrder[];
}

export interface WooOrder {
  id: number;
  wooOrderId: string;
  orderId: string;
  locationId: number;
  customerName?: string;
  customerEmail?: string;
  amount: string;
  status: string;
  orderDate: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}