/**
 * Endpoints de autenticação do backend Python (cookie httpOnly + JWT próprio).
 * Tipos derivados do OpenAPI (`schema.d.ts`).
 */
import { api } from "./client";
import type { components } from "./schema";

export type UserOut = components["schemas"]["UserOut"];
export type ProfileOut = components["schemas"]["ProfileOut"];
export type EmpresaOut = components["schemas"]["EmpresaOut"];
export type MeOut = components["schemas"]["MeOut"];

export const authApi = {
  /** Faz login; o backend grava os cookies httpOnly (access + refresh).
   * captchaToken: token do Turnstile (validado no backend quando configurado). */
  login: (email: string, password: string, captchaToken?: string | null) =>
    api.post<UserOut>("/auth/login", { email, password, captcha_token: captchaToken ?? null }),

  /** Encerra a sessão (limpa os cookies no backend). */
  logout: () => api.post<void>("/auth/logout"),

  /** Sessão atual: usuário + perfil + empresa. Usado para restaurar a sessão. */
  me: () => api.get<MeOut>("/auth/me"),

  /** Renova o access token a partir do refresh cookie. */
  refresh: () => api.post<UserOut>("/auth/refresh"),
};
