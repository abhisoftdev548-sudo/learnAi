import { api, buildQuery } from '../lib/api.js';

/** Admin dashboards — every call requires an admin session. */
export const adminService = {
  stats: () => api.get('/admin/stats'),
  statistics: (days = 30) => api.get(`/admin/statistics${buildQuery({ days })}`),
  users: (params = {}) => api.get(`/admin/users${buildQuery(params)}`),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload),
  submissions: (params = {}) => api.get(`/admin/submissions${buildQuery(params)}`),
  system: () => api.get('/admin/system'),
};

export default adminService;
