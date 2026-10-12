import { api } from "./api";
export const authService = {
  me: (signal) => api("/auth/me", { signal, quiet401: true }),
  login: (body) => api("/auth/login", { method: "POST", body, quiet401: true }),
  register: (body) =>
    api("/auth/register", { method: "POST", body, quiet401: true }),
  logout: () => api("/auth/logout", { method: "POST" }),
};
