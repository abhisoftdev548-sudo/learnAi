import { api, query } from "./api";
export const leaderboardService = {
  list: (params, signal) => api(`/leaderboard${query(params)}`, { signal }),
};
