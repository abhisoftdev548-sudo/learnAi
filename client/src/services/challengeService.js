import { api, buildQuery } from '../lib/api.js';

export const challengeService = {
  /** Catalogue with optional filters (search, category, difficulty, sort, page). */
  list: (params = {}) => api.get(`/challenges${buildQuery(params)}`),
  /** Workspace payload: starter code, instructions, hints, attempts, sandbox ticket. */
  get: (idOrSlug) => api.get(`/challenges/${encodeURIComponent(idOrSlug)}`),
  create: (payload) => api.post('/challenges', payload),
  update: (id, payload) => api.put(`/challenges/${id}`, payload),
  remove: (id, { force = false } = {}) => api.delete(`/challenges/${id}${force ? '?force=true' : ''}`),
};

export default challengeService;
