export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessageForStatus(status: number): string {
  if (status >= 500) return "The service is temporarily unavailable. Please try again.";
  if (status === 400 || status === 422) return "Please review the submitted information and try again.";
  if (status === 401) return "Authentication required. Please sign in and try again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource is no longer available.";
  if (status === 409) return "The request conflicts with the current state. Refresh and try again.";
  if (status === 429) return "Too many requests. Please try again shortly.";
  return "Request failed. Please try again.";
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { credentials: "include", signal, headers: { Accept: "application/json", ...init.headers }, ...init });
  } catch (reason) {
    if (signal?.aborted || (reason instanceof DOMException && reason.name === "AbortError")) throw reason;
    throw new ApiError("Unable to reach the service. Please check your connection and try again.", 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorMessageForStatus(response.status), response.status);
  return data as T;
}

export function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {}, signal);
}

export function postJSON<T>(path: string, body: unknown, headers?: HeadersInit): Promise<T> {
  return request<T>(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}

export function patchJSON<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", headers: body === undefined ? {} : { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

export function deleteJSON<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
