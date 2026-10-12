import { api, query } from "./api";
export const submissionService = {
  list: (params, signal) => api(`/submissions/me${query(params)}`, { signal }),
  get: (id, signal) =>
    api(`/submissions/${encodeURIComponent(id)}`, { signal }),
  submit: (body) => api("/submissions", { method: "POST", body }),
};
