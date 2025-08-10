// Wrapper de fetch que injeta o accessToken do localStorage ("keeply_token")
export class HttpError extends Error {
  status: number;
  bodyText?: string;
  constructor(status: number, message: string, bodyText?: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

type KeeplyTokens = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  [k: string]: any;
};

export function getTokens(): KeeplyTokens | null {
  try {
    const raw = localStorage.getItem("keeply_token");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://kupja6ps8e.execute-api.eu-north-1.amazonaws.com";

export async function apiFetch<T = any>(path: string, init: RequestInit = {}) {
  const tokens = getTokens();
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  if (tokens?.accessToken) headers.set("Authorization", `Bearer ${tokens.accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HttpError(res.status, res.statusText || "Request failed", text || undefined);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
