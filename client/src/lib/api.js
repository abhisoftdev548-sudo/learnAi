/**
 * Central HTTP client.
 *
 * Every request goes to the same origin (`/api`), which keeps the auth cookie
 * first-party in development (Vite proxies it) and in production (the API serves
 * the built client). Errors are normalised into `ApiError` so the UI can always
 * show `error.message` and branch on `error.code`.
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', details = null, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }

  get isAuthError() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isValidationError() {
    return this.status === 422;
  }

  get isOffline() {
    return this.status === 0;
  }
}

const unauthorizedListeners = new Set();

/** The auth layer subscribes so a 401 can clear the session everywhere. */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized() {
  for (const listener of unauthorizedListeners) listener();
}

async function parseBody(response) {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text ? { message: text } : null;
  }
  return response.json().catch(() => null);
}

export async function request(path, { method = 'GET', body, signal, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
      cause: error,
    });
  }

  const payload = await parseBody(response);

  if (!response.ok || payload?.success === false) {
    const error = payload?.error ?? {};
    if (response.status === 401) notifyUnauthorized();
    throw new ApiError(error.message || `Request failed with status ${response.status}`, {
      status: response.status,
      code: error.code || 'REQUEST_FAILED',
      details: error.details ?? null,
    });
  }

  return { data: payload?.data ?? null, meta: payload?.meta ?? null, message: payload?.message ?? null };
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

/** Build a query string, skipping empty values. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
