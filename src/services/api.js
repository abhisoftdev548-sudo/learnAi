const BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}
export function query(params = {}) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== "" && value !== undefined && value !== null,
  );
  const result = new URLSearchParams(entries).toString();
  return result ? `?${result}` : "";
}
export async function api(
  path,
  { body, method = "GET", signal, quiet401 = false } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const combined = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: combined,
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 && !quiet401)
      window.dispatchEvent(new Event("auth:expired"));
    if (!response.ok || !payload?.success)
      throw new ApiError(
        payload?.message ||
          (response.status >= 500
            ? "The API is unavailable. Check that the backend and MongoDB are running."
            : "The server returned an unexpected response."),
        response.status,
      );
    return payload.data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "The request timed out. Please try again."
        : "Cannot connect to the API. Check your connection and backend configuration.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
