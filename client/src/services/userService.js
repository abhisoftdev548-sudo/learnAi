import { api, buildQuery } from '../lib/api.js';

export const userService = {
  me: () => api.get('/users/me'),
  update: (payload) => api.put('/users/me', payload),
  stats: () => api.get('/users/me/stats'),
  progress: () => api.get('/users/me/progress'),
  activity: (days = 183) => api.get(`/users/me/activity${buildQuery({ days })}`),
  achievements: () => api.get('/users/me/achievements'),
  submissions: (params = {}) => api.get(`/users/me/submissions${buildQuery(params)}`),
  history: (params = {}) => api.get(`/users/me/history${buildQuery(params)}`),
  publicProfile: (username) => api.get(`/users/${encodeURIComponent(username)}`),
};

export default userService;
