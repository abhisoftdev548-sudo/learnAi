import axios from 'axios';

/**
 * Single axios instance for the whole app.
 * - relative base URL: works with the Vite dev proxy AND with the
 *   single-server production build (same origin) without any CORS setup
 * - cookies are HttpOnly; `withCredentials` keeps them attached
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
});

/** Extract the API error message (or a fallback) from an axios error. */
export function apiError(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (err?.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (!err?.response) return 'Cannot reach the server. Check your connection.';
  return fallback;
}

/** Machine-readable error code, e.g. PENDING_APPROVAL. */
export function apiCode(err) {
  return err?.response?.data?.code || null;
}

/** Field-level validation errors from the API, keyed by field name. */
export function apiFieldErrors(err) {
  const errors = err?.response?.data?.errors;
  if (!Array.isArray(errors)) return {};
  return errors.reduce((acc, e) => {
    if (e.field) acc[e.field] = e.message;
    return acc;
  }, {});
}

export default api;
