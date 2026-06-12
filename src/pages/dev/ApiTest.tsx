/**
 * Página-piloto da Fatia 5 (DEV) — prova a stack do backend novo de ponta a ponta:
 * registrar → login (cookie httpOnly) → GET /auth/me → listar um recurso protegido.
 *
 * NÃO usa o `AuthProvider` (Supabase) — fala direto com o client novo (`@/integrations/api`).
 * É uma rota descartável (`/_api-test`); a infra (`client.ts`/`auth.ts`) é permanente.
 */
import { useState } from "react";
import { api, ApiError } from "@/integrations/api/client";
import { authApi, type MeOut } from "@/integrations/api/auth";

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    return `HTTP ${err.status} — ${JSON.stringify(err.detail ?? err.message)}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function ApiTest() {
  const [email, setEmail] = useState("piloto@toriq.dev");
  const [password, setPassword] = useState("segredo123");
  const [nome, setNome] = useState("Piloto");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [me, setMe] = useState<MeOut | null>(null);
  const [listResult, setListResult] = useState<string>("");

  const push = (msg: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev].slice(0, 30));

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      push(`❌ ${label}: ${describeError(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = () =>
    run("registrar", async () => {
      // empresa_id omitido (null) — usuário sem tenant, suficiente para provar a stack.
      await api.post("/auth/register", { email, password, nome, role: "admin_vertical" });
      push(`✅ registrado: ${email}`);
    });

  const handleLogin = () =>
    run("login", async () => {
      const user = await authApi.login(email, password);
      push(`✅ login OK — cookie gravado. user.id=${user.id}`);
    });

  const handleMe = () =>
    run("me", async () => {
      const result = await authApi.me();
      setMe(result);
      push(`✅ /auth/me OK — role=${result.profile?.role ?? "?"}`);
    });

  const handleCreate = () =>
    run("criar fornecedor", async () => {
      const created = await api.post<{ id: string; razao_social: string }>(
        "/financeiro/cadastros/fornecedores",
        { razao_social: `Fornecedor Demo ${new Date().toLocaleTimeString()}` },
      );
      push(`✅ POST fornecedor criado — id=${created.id}`);
    });

  const handleList = () =>
    run("listar fornecedores", async () => {
      const data = await api.get<unknown[]>("/financeiro/cadastros/fornecedores");
      setListResult(JSON.stringify(data, null, 2));
      push(`✅ GET /financeiro/cadastros/fornecedores — ${data.length} item(s)`);
    });

  const handleLogout = () =>
    run("logout", async () => {
      await authApi.logout();
      setMe(null);
      setListResult("");
      push("✅ logout — cookies limpos");
    });

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>🔌 Piloto Fatia 5 — Front ↔ Backend Python</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        API: <code>{API_URL}</code> · prova: registrar → login (cookie httpOnly) → /auth/me → listar recurso protegido
      </p>

      <fieldset disabled={busy} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <label>email<input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></label>
          <label>senha<input value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /></label>
          <label>nome<input value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} /></label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleRegister} style={btn}>1· Registrar</button>
          <button onClick={handleLogin} style={btn}>2· Login</button>
          <button onClick={handleMe} style={btn}>3· /auth/me</button>
          <button onClick={handleCreate} style={btn}>4· Criar fornecedor</button>
          <button onClick={handleList} style={btn}>5· Listar fornecedores</button>
          <button onClick={handleLogout} style={{ ...btn, background: "#fee", borderColor: "#f99" }}>Logout</button>
        </div>
      </fieldset>

      {me && (
        <section style={card}>
          <strong>Sessão (/auth/me)</strong>
          <pre style={pre}>{JSON.stringify(me, null, 2)}</pre>
        </section>
      )}
      {listResult && (
        <section style={card}>
          <strong>Resposta do recurso protegido</strong>
          <pre style={pre}>{listResult}</pre>
        </section>
      )}

      <section style={{ ...card, background: "#0b1021", color: "#cde" }}>
        <strong>Log</strong>
        <pre style={{ ...pre, color: "#cde", background: "transparent" }}>{log.join("\n") || "— sem eventos ainda —"}</pre>
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: 6, marginTop: 4, border: "1px solid #ccc", borderRadius: 6, boxSizing: "border-box" };
const btn: React.CSSProperties = { padding: "8px 12px", border: "1px solid #88f", borderRadius: 6, background: "#eef", cursor: "pointer", fontSize: 14 };
const card: React.CSSProperties = { marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 12 };
const pre: React.CSSProperties = { whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#f7f7f9", padding: 10, borderRadius: 6, fontSize: 12, marginTop: 8, maxHeight: 320, overflow: "auto" };
