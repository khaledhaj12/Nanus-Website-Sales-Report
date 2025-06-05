import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your actual server URL
const API_BASE_URL = 'https://your-server-domain.com';

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