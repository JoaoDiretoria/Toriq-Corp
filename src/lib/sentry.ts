/**
 * Inicialização do Sentry (monitoramento de erros) — Vite + React.
 *
 * NOTA: este projeto é Vite/React, NÃO Next.js — por isso usamos @sentry/react
 * diretamente (o wizard `-i nextjs` não se aplica aqui).
 *
 * O DSN vem de `VITE_SENTRY_DSN` (lido no build). DSN é público por design
 * (embarcado no bundle do cliente), mas mantê-lo em env permite configurar por
 * ambiente. Sem DSN, ou fora de produção, o init é no-op — não envia nada.
 */
import * as Sentry from "@sentry/react";

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  // Só ativa em produção e quando o DSN estiver configurado.
  if (!dsn || !import.meta.env.PROD) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Amostragem de performance (10%) — ajuste conforme volume/custo.
    tracesSampleRate: 0.1,
    // Session Replay: nada em sessões normais, 100% quando há erro.
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
