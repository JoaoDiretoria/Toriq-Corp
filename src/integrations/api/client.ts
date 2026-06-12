/**
 * Client HTTP do backend Python (apps/api) — Fatia 5 da migração.
 *
 * - Envia o cookie httpOnly de auth automaticamente (`credentials: 'include'`).
 * - Faz refresh transparente do access token em respostas 401 (uma vez),
 *   deduplicando refreshes concorrentes.
 * - Lança `ApiError` com status + detail em respostas de erro.
 *
 * Substitui o `supabase.from()` conforme os módulos vão sendo migrados.
 * Tipos vêm de `schema.d.ts` (gerado do OpenAPI — `npm run gen:api`).
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? `Erro da API (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// Dedup de refresh: vários 401 simultâneos disparam um único /auth/refresh.
let refreshing: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Tenta refresh automático em 401 (default: true). */
  retryOn401?: boolean;
  signal?: AbortSignal;
}

const NO_REFRESH_PATHS = new Set(["/auth/refresh", "/auth/login"]);

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, retryOn401 = true, signal } = opts;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

  let res = await doFetch();

  if (res.status === 401 && retryOn401 && !NO_REFRESH_PATHS.has(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* corpo vazio ou não-JSON */
    }
    const message =
      detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : undefined;
    throw new ApiError(res.status, detail, message);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
