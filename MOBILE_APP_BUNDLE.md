# Complete Mobile App Code Bundle

Copy each section below to create your Expo React Native mobile app.

## Project Setup Commands
```bash
npx create-expo-app@latest NanusHotChickenMobile --template blank-typescript
cd NanusHotChickenMobile
npm install @react-navigation/native @react-navigation/stack react-native-safe-area-context react-native-screens @tanstack/react-query axios expo-secure-store expo-router @react-native-picker/picker @expo/vector-icons
```

---

## File: package.json
```json
{
  "name": "nanus-hot-chicken-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "@react-native-picker/picker": "^2.6.0",
    "@expo/vector-icons": "^14.0.0",
    "expo-status-bar": "~1.12.0",
    "expo-secure-store": "~13.0.0",
    "expo-constants": "~16.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.0",
    "@types/react-native": "~0.73.0",
    "typescript": "~5.3.0"
  },
  "private": true
}
```

---

## File: app.json
```json
{
  "expo": {
    "name": "Nanu's Hot Chicken",
    "slug": "nanus-hot-chicken",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.nanushotchicken.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.nanushotchicken.app"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": ["expo-router"],
    "scheme": "nanus-hot-chicken"
  }
}
```

---

## File: tsconfig.json
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/screens/*": ["./src/screens/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  }
}
```

---

## File: babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/services': './src/services',
            '@/types': './src/types',
            '@/utils': './src/utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
```

---

## File: metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

---

## File: src/types/index.ts
```typescript
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
```

---

## File: src/services/api.ts
```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your actual server URL
const API_BASE_URL = 'YOUR_REPLIT_SERVER_URL_HERE';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('authToken');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/api/auth/login', { username, password });
    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
    }
    return response.data;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await api.post('/api/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/user');
    return response.data;
  },
};

export const dashboardService = {
  getSummary: async (locationId?: number, month?: string) => {
    const params = new URLSearchParams();
    if (locationId) params.append('locationId', locationId.toString());
    if (month) params.append('month', month);
    
    const response = await api.get(`/api/dashboard/summary?${params}`);
    return response.data;
  },

  getMonthlyBreakdown: async (year?: number, locationId?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (locationId) params.append('locationId', locationId.toString());
    
    const response = await api.get(`/api/dashboard/monthly-breakdown?${params}`);
    return response.data;
  },
};

export const locationService = {
  getAll: async () => {
    const response = await api.get('/api/locations');
    return response.data;
  },
};

export default api;
```

**IMPORTANT:** Replace `YOUR_REPLIT_SERVER_URL_HERE` with your actual Replit server URL.

Copy all these code sections into their respective files in your new Expo project, then run `npx expo start` to launch the mobile app.