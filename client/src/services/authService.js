import { api } from '../lib/api.js';

/** Authentication endpoints — the session lives in an HTTP-only cookie. */
export const authService = {
  register: (payload) => api.post('/auth/register', payload),
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout', {}),
  session: () => api.get('/auth/session'),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.patch('/auth/password', payload),
};

export default authService;
