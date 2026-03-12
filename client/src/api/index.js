import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  getUsers: (search = '', sort = 'desc') => api.get(`/auth/users?search=${search}&sort=${sort}`),
  resetPassword: (userId, newPassword = 'welcome@2026') => 
    api.post('/auth/admin-reset-password', { userId, newPassword })
};

export const locationsAPI = {
  getAll: () => api.get('/locations'),
  scan: (token) => api.post('/locations/scan', { token }),
  getAllLocations: () => api.get('/locations/all'),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/locations/${id}`),
  getQR: (id) => api.get(`/locations/${id}/qr`),
  getAllQR: () => api.get('/locations/qr/all'),
  resetIds: () => api.post('/locations/reset-ids')
};

export const statsAPI = {
  getTop: (limit = 50) => api.get(`/stats/top?limit=${limit}`),
  getLocationStats: () => api.get('/stats/location-stats'),
  exportCSV: () => api.get('/stats/export/csv', { responseType: 'blob' }),
  getOverview: () => api.get('/stats/overview')
};

export default api;
