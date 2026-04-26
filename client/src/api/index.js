import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
console.log("API BASE URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (name, email, password, confirmPassword) =>
    api.post('/auth/register', { name, email, password, confirmPassword }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

export const documentsAPI = {
  getAll: () => api.get('/documents'),
  create: (title) => api.post('/documents', { title }),
  getById: (id) => api.get(`/documents/${id}`),
  update: (id, title) => api.patch(`/documents/${id}`, { title }),
  delete: (id) => api.delete(`/documents/${id}`),
  share: (id, email, role) =>
    api.post(`/documents/${id}/share`, { email, role }),
  generateLink: (id) => api.post(`/documents/${id}/link`),
  removeCollaborator: (id, userId) =>
    api.delete(`/documents/${id}/collaborators/${userId}`),
};

export const versionsAPI = {
  getAll: (id) => api.get(`/documents/${id}/versions`),
  save: (id, label) => api.post(`/documents/${id}/versions`, { label }),
  restore: (id, versionId) =>
    api.post(`/documents/${id}/versions/restore/${versionId}`),
};

export default api;
