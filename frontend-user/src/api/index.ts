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
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
};

export const concertApi = {
  getConcerts: (params?: { artist?: string; city?: string; date?: string; page?: number; limit?: number }) =>
    api.get('/concerts', { params }),
  getArtists: () => api.get('/concerts/artists'),
  getCities: () => api.get('/concerts/cities'),
  getConcert: (id: number) => api.get(`/concerts/${id}`),
  getSeats: (id: number) => api.get(`/concerts/${id}/seats`),
};

export const orderApi = {
  lockSeats: (data: { concertId: number; seatIds: number[] }) =>
    api.post('/orders/lock-seats', data),
  createOrder: (data: {
    concertId: number;
    seatIds: number[];
    buyerName: string;
    buyerIdCard: string;
    ticketHolders: { name: string; idCard: string }[];
  }) => api.post('/orders', data),
  payOrder: (id: number) => api.post(`/orders/${id}/pay`),
  getOrders: (params?: { page?: number; limit?: number }) =>
    api.get('/orders', { params }),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  refundOrder: (id: number) => api.post(`/orders/${id}/refund`),
};

export default api;
