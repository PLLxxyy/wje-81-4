import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
};

export const concertApi = {
  getConcerts: (params?: { page?: number; limit?: number }) =>
    api.get('/concerts', { params }),
  getConcert: (id: number) => api.get(`/concerts/${id}`),
  createConcert: (data: any) => api.post('/concerts', data),
  updateConcert: (id: number, data: any) => api.put(`/concerts/${id}`, data),
  deleteConcert: (id: number) => api.delete(`/concerts/${id}`),
  addTier: (id: number, data: any) => api.post(`/concerts/${id}/tiers`, data),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getConcertStats: (id: number) => api.get(`/admin/concerts/${id}/stats`),
  getOrders: (params?: { concertId?: number; status?: string; page?: number; limit?: number }) =>
    api.get('/admin/orders', { params }),
  getOrder: (id: number) => api.get(`/admin/orders/${id}`),
  refundOrder: (id: number) => api.post(`/admin/orders/${id}/refund`),
  batchRefund: (orderIds: number[]) =>
    api.post('/admin/orders/refund/batch', { orderIds }),
  getSalesTrend: (params?: { concertId?: number; days?: number }) =>
    api.get('/admin/sales/trend', { params }),
};

export default api;
