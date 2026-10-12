import { api } from "./api";
export const userService = {
  me: (signal) => api("/users/me", { signal }),
  profile: (username, signal) =>
    api(`/users/${encodeURIComponent(username)}`, { signal }),
  update: (body) => api("/users/me", { method: "PUT", body }),
  achievements: (signal) => api("/achievements", { signal }),
  team: (signal) => api("/teams/me", { signal }),
};
