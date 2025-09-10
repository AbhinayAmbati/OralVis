import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
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

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Submissions API calls
export const submissionsAPI = {
  upload: (formData) => api.post('/submissions/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMySubmissions: () => api.get('/submissions/my-submissions'),
  getSubmission: (id) => api.get(`/submissions/${id}`),
  downloadReport: (id) => api.get(`/submissions/${id}/download-report`, {
    responseType: 'blob'
  }),
};

// Admin API calls
export const adminAPI = {
  getSubmissions: (params) => api.get('/admin/submissions', { params }),
  getSubmission: (id) => api.get(`/admin/submissions/${id}`),
  saveAnnotation: (id, data) => api.post(`/admin/submissions/${id}/annotate`, data),
  generateReport: (id) => api.post(`/admin/submissions/${id}/generate-report`),
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
};

export default api;
