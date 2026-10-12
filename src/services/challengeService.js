import { api, query } from "./api";
export const challengeService = {
  list: (params, signal) => api(`/challenges${query(params)}`, { signal }),
  get: (id, signal) => api(`/challenges/${encodeURIComponent(id)}`, { signal }),
  progress: (id, signal) =>
    api(`/challenges/${encodeURIComponent(id)}/progress`, { signal }),
};
