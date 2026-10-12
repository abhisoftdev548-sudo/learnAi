import { api, query } from "./api";
export const adminService = {
  overview: (signal) => api("/admin/dashboard", { signal }),
  users: (params, signal) => api(`/admin/users${query(params)}`, { signal }),
  submissions: (params, signal) =>
    api(`/admin/submissions${query(params)}`, { signal }),
  teams: (params, signal) => api(`/admin/teams${query(params)}`, { signal }),
  createTeam: (body) => api("/admin/teams", { method: "POST", body }),
  assignTeam: (id, teamId) =>
    api(`/admin/users/${id}/team`, { method: "PUT", body: { teamId } }),
  createChallenge: (body) => api("/admin/challenges", { method: "POST", body }),
  updateChallenge: (id, body) =>
    api(`/admin/challenges/${id}`, { method: "PUT", body }),
  deleteChallenge: (id) => api(`/admin/challenges/${id}`, { method: "DELETE" }),
};
