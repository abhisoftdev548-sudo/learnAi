import { api, buildQuery } from '../lib/api.js';

export const submissionService = {
  /**
   * Submit a solution. `observations` holds the raw values measured in the
   * sandboxed iframe (keyed by test id) and `sandboxTicket` authorises them.
   */
  create: (payload) => api.post('/submissions', payload),
  mine: (params = {}) => api.get(`/submissions/me${buildQuery(params)}`),
  get: (id) => api.get(`/submissions/${id}`),
};

export default submissionService;
