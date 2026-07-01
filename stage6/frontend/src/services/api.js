import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 8000
});

export const getNotifications = async (limit = 10, type = '') => {
  const params = { limit };
  if (type) params.type = type;
  const response = await api.get('/notifications', { params });
  return response.data.data;
};

export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data.data;
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead
};
