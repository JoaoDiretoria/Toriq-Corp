/**
 * AdminSentryPanel — painel de erros do Sentry para admin_vertical.
 *
 * Chama GET /ops/sentry/issues (backend, cache Redis 60s) e exibe:
 *  - Contadores por projeto (Frontend / Backend)
 *  - Top issues com badge de nível + contador de ocorrências + deep-link
 */
import { useEffect, useState } from 'react';
import { ExternalLink, AlertTriangle, Bug, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/integrations/api/client';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface SentryIssue {
    id: string;
    title: string;
    culprit?: string;
    level: string;
    count: number;
    user_count: number;
    project: string;
    permalink: string;
    first_seen: string;
    last_seen: string;
}

interface SentryProjectSummary {
    project: string;
    slug: string;
    unresolved: number;
}

interface SentryIssuesResponse {
    projects: SentryProjectSummary[];
    issues: SentryIssue[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary'; icon: React.ReactNode }> = {
    fatal:   { label: 'Fatal',   variant: 'destructive', icon: <Zap className="h-3 w-3" /> },
    error:   { label: 'Erro',    variant: 'destructive', icon: <Bug className="h-3 w-3" /> },
    warning: { label: 'Aviso',   variant: 'default',     icon: <AlertTriangle className="h-3 w-3" /> },
    info:    { label: 'Info',    variant: 'secondary',   icon: <Info className="h-3 w-3" /> },
};

function levelConfig(level: string) {
    return LEVEL_CONFIG[level] ?? LEVEL_CONFIG['error'];
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

// ── Componente ─────────────────────────────────────────────────────────────

export function AdminSentryPanel() {
    const [data, setData] = useState<SentryIssuesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api
            .get<SentryIssuesResponse>('/ops/sentry/issues?limit=10')
            .then(setData)
            .catch((err) => setError(err?.message ?? 'Erro ao carregar issues do Sentry'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Bug className="h-4 w-4 text-destructive" />
                        Erros (Sentry)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse text-muted-foreground text-sm">Carregando issues...</div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Bug className="h-4 w-4 text-destructive" />
                        Erros (Sentry)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive text-sm">{error}</p>
                </CardContent>
            </Card>
        );
    }

    const projects = data?.projects ?? [];
    const issues   = data?.issues   ?? [];

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Bug className="h-4 w-4 text-destructive" />
                    Erros (Sentry)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Contadores por projeto */}
                <div className="grid grid-cols-2 gap-3">
                    {projects.map((p) => (
                        <a
                            key={p.slug}
                            href={`https://toriq-corp.sentry.io/issues/?project=${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/30 p-3 hover:bg-muted/60 transition-colors"
                        >
                            <span className="text-xs text-muted-foreground">{p.project}</span>
                            <span className="text-2xl font-bold text-foreground">{p.unresolved}</span>
                            <span className="text-xs text-muted-foreground">não resolvidos</span>
                        </a>
                    ))}
                </div>

                {/* Lista de top issues */}
                {issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma issue aberta 🎉
                    </p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Top Issues</p>
                        {issues.map((issue) => {
                            const cfg = levelConfig(issue.level);
                            return (
                                <a
                                    key={issue.id}
                                    href={issue.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 rounded-lg border border-border/40 bg-background p-3 hover:bg-muted/40 transition-colors group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={cfg.variant} className="flex items-center gap-1 text-xs px-1.5 py-0">
                                                {cfg.icon}
                                                {cfg.label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{issue.project}</span>
                                        </div>
                                        <p className="text-sm font-medium text-foreground truncate">{issue.title}</p>
                                        {issue.culprit && (
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{issue.culprit}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="text-sm font-bold text-foreground">{formatCount(issue.count)}</span>
                                        <span className="text-xs text-muted-foreground">ocorr.</span>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
