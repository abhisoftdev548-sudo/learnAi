import { api, buildQuery } from '../lib/api.js';

export const leaderboardService = {
  get: (period = 'weekly', limit = 25) => api.get(`/leaderboard${buildQuery({ period, limit })}`),
  preview: () => api.get('/leaderboard/preview'),
  config: () => api.get('/leaderboard/config'),
};

export default leaderboardService;
