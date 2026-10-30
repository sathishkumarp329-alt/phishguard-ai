import axios, { AxiosError } from 'axios';
import {
  User,
  Scan,
  DashboardStats,
  LoginCredentials,
  SignupData,
  BatchScanResult,
  FileScanResult,
  FeedbackRequest,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

export const apiClient = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const TOKEN_KEY = 'phishguard_token';

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token: string | null): void => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable; cookie auth may still work
  }
};

// Send the token as a Bearer header (works even when the browser blocks cross-site cookies)
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setStoredToken(null);
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/signup', '/forgot-password', '/'];
      if (!publicPaths.includes(currentPath)) {
        // Redirect to login with return path
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; message?: string }> => {
    const res = await apiClient.post('/auth/login', credentials);
    setStoredToken(res.data?.access_token ?? null);
    return res.data;
  },

  signup: async (data: SignupData): Promise<{ user: User; message?: string }> => {
    const res = await apiClient.post('/auth/signup', data);
    setStoredToken(res.data?.access_token ?? null);
    return res.data;
  },

  logout: async (): Promise<{ message: string }> => {
    setStoredToken(null);
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/auth/reset-password', { token, password });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/users/me');
    return res.data;
  },

  updateProfile: async (data: { full_name?: string }): Promise<User> => {
    const res = await apiClient.put('/users/me', data);
    return res.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<{ message: string }> => {
    const res = await apiClient.put('/users/me/password', data);
    return res.data;
  },

  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const res = await apiClient.delete('/users/me', { data: { password } });
    return res.data;
  },
};

// Scan endpoints
export const scanApi = {
  scanUrl: async (url: string): Promise<Scan> => {
    const res = await apiClient.post('/scans', { url });
    return res.data;
  },

  realtimeCheck: async (url: string): Promise<any> => {
    const res = await apiClient.post('/scans/realtime-check', { url });
    return res.data;
  },

  getScan: async (id: string): Promise<Scan> => {
    const res = await apiClient.get(`/scans/${id}`);
    return res.data;
  },

  batchScan: async (urls: string[]): Promise<BatchScanResult> => {
    const res = await apiClient.post('/scans/batch', { urls });
    return res.data;
  },

  uploadFile: async (file: File): Promise<FileScanResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/scans/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    return res.data;
  },

  getHistory: async (params?: PaginationParams): Promise<PaginatedResponse<Scan>> => {
    const res = await apiClient.get('/scans/history', { params });
    return res.data;
  },

  deleteScan: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/scans/${id}`);
    return res.data;
  },

  clearHistory: async (): Promise<{ message: string }> => {
    const res = await apiClient.delete('/scans/history/clear');
    return res.data;
  },
};

// Dashboard endpoints
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get('/dashboard/stats');
    return res.data;
  },
};

// Feedback endpoints
export const feedbackApi = {
  submitFeedback: async (feedback: FeedbackRequest): Promise<{ message: string }> => {
    const res = await apiClient.post('/feedback', feedback);
    return res.data;
  },
};

export default apiClient;
