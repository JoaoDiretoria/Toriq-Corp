import { useState } from 'react';
import { prospeccaoApi } from '@/integrations/api/vendasProspeccao';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Users,
  Building2,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrapingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobStarted: () => void;
}

const ESTADOS_BR = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

type Plataforma = 'google' | 'facebook' | 'instagram' | 'linkedin';

const PLATAFORMAS: {
  id: Plataforma;
  label: string;
  icon: typeof Globe;
  color: string;
  bgColor: string;
  borderColor: string;
  yield: string;
  desc: string;
}[] = [
  {
    id: 'google',
    label: 'Google Maps',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    yield: '40-70% com telefone',
    desc: 'Melhor fonte para negócios locais com contato direto',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    yield: '25-40% com telefone',
    desc: 'Páginas de empresas com telefone, email e endereço',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    yield: '15-25% com telefone',
    desc: 'Perfis de negócio e seguidores de concorrentes',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-200 dark:border-sky-800',
    yield: '5-15% com telefone',
    desc: 'Empresas com dados corporativos e website',
  },
];

type InstagramModo = 'busca' | 'seguidores';

export function ScrapingForm({ open, onOpenChange, onJobStarted }: ScrapingFormProps) {
  const [loading, setLoading] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>('google');
  const [tagNome, setTagNome] = useState('');

  // Google Maps
  const [googleTermo, setGoogleTermo] = useState('');
  const [googleCidade, setGoogleCidade] = useState('');
  const [googleEstado, setGoogleEstado] = useState('todos');
  const [googleMax, setGoogleMax] = useState(50);

  // Facebook
  const [facebookTermo, setFacebookTermo] = useState('');
  const [facebookLocalizacao, setFacebookLocalizacao] = useState('');
  const [facebookMax, setFacebookMax] = useState(50);

  // Instagram
  const [instagramTermos, setInstagramTermos] = useState('');
  const [instagramMax, setInstagramMax] = useState(50);
  const [instagramModo, setInstagramModo] = useState<InstagramModo>('busca');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramFollowersMax, setInstagramFollowersMax] = useState(200);

  // LinkedIn
  const [linkedinQuery, setLinkedinQuery] = useState('');
  const [linkedinLocalizacao, setLinkedinLocalizacao] = useState('');
  const [linkedinIndustria, setLinkedinIndustria] = useState('');
  const [linkedinMax, setLinkedinMax] = useState(50);

  const currentPlatform = PLATAFORMAS.find((p) => p.id === plataforma)!;

  const buildParametros = (): Record<string, unknown> => {
    switch (plataforma) {
      case 'google':
        return {
          termo: googleTermo,
          cidade: googleCidade || undefined,
          estado: googleEstado && googleEstado !== 'todos' ? googleEstado : undefined,
          max: googleMax,
        };
      case 'facebook':
        return {
          termo: facebookTermo,
          localizacao: facebookLocalizacao || undefined,
          max: facebookMax,
        };
      case 'instagram':
        if (instagramModo === 'seguidores') {
          return {
            termo: `@${instagramUsername.replace(/^@/, '')}`,
            username: instagramUsername.replace(/^@/, ''),
            max: instagramFollowersMax,
          };
        }
        return {
          termo: instagramTermos,
          tipo: 'user',
          max: instagramMax,
        };
      case 'linkedin':
        return {
          termo: linkedinQuery,
          localizacao: linkedinLocalizacao || undefined,
          industria: linkedinIndustria || undefined,
          max: linkedinMax,
        };
      default:
        return {};
    }
  };

  const getTermoPrincipal = () => {
    switch (plataforma) {
      case 'google':
        return googleTermo;
      case 'facebook':
        return facebookTermo;
      case 'instagram':
        return instagramModo === 'seguidores' ? instagramUsername : instagramTermos;
      case 'linkedin':
        return linkedinQuery;
      default:
        return '';
    }
  };

  const resetForm = () => {
    setGoogleTermo(''); setGoogleCidade(''); setGoogleEstado('todos'); setGoogleMax(50);
    setFacebookTermo(''); setFacebookLocalizacao(''); setFacebookMax(50);
    setInstagramTermos(''); setInstagramMax(50); setInstagramModo('busca');
    setInstagramUsername(''); setInstagramFollowersMax(200);
    setLinkedinQuery(''); setLinkedinLocalizacao(''); setLinkedinIndustria(''); setLinkedinMax(50);
    setTagNome('');
  };

  const handleSubmit = async () => {
    const termo = getTermoPrincipal();
    if (!termo.trim()) {
      toast.error(
        plataforma === 'instagram' && instagramModo === 'seguidores'
          ? 'Informe o username do perfil'
          : 'Informe o termo de busca',
      );
      return;
    }

    // 'instagram_followers' é a plataforma real quando extraímos seguidores
    const plataformaFinal =
      plataforma === 'instagram' && instagramModo === 'seguidores'
        ? 'instagram_followers'
        : plataforma;

    setLoading(true);
    try {
      await prospeccaoApi.startScraping(
        plataformaFinal,
        buildParametros(),
        tagNome.trim() || undefined,
      );
      toast.success(`Captação iniciada no ${currentPlatform.label}! Acompanhe o progresso abaixo.`);
      onJobStarted();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('[ScrapingForm] erro ao iniciar:', error);
      toast.error(error?.detail || error?.message || 'Erro ao iniciar captação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">Nova Captação de Leads</DialogTitle>
          <DialogDescription className="text-sm">
            Escolha a plataforma e configure a busca
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Seletor de plataforma - cards */}
          <div className="px-6 grid grid-cols-4 gap-2">
            {PLATAFORMAS.map((p) => {
              const Icon = p.icon;
              const isActive = plataforma === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlataforma(p.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all text-center',
                    isActive
                      ? `${p.borderColor} ${p.bgColor} shadow-sm`
                      : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50',
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? p.color : 'text-muted-foreground')} />
                  <span className={cn('text-xs font-medium', isActive ? '' : 'text-muted-foreground')}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Indicador de rendimento */}
          <div
            className={cn(
              'mx-6 mt-3 rounded-lg px-3 py-2.5 flex items-center gap-2.5',
              currentPlatform.bgColor,
            )}
          >
            <TrendingUp className={cn('h-4 w-4 shrink-0', currentPlatform.color)} />
            <div className="min-w-0">
              <p className="text-xs font-semibold">{currentPlatform.yield}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{currentPlatform.desc}</p>
            </div>
          </div>

          {/* Campos do formulário */}
          <div className="px-6 pt-4 pb-2 space-y-4">
            {/* Google Maps */}
            {plataforma === 'google' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">O que buscar *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={googleTermo}
                      onChange={(e) => setGoogleTermo(e.target.value)}
                      placeholder="Ex: dentistas, restaurantes, advogados..."
                      className="pl-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> Cidade
                    </Label>
                    <Input
                      value={googleCidade}
                      onChange={(e) => setGoogleCidade(e.target.value)}
                      placeholder="Ex: Joinville"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Estado</Label>
                    <Select value={googleEstado} onValueChange={setGoogleEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {ESTADOS_BR.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <MaxSlider value={googleMax} onChange={setGoogleMax} label="Quantidade de resultados" min={10} max={500} step={10} />
              </>
            )}

            {/* Facebook */}
            {plataforma === 'facebook' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Categoria ou termo *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={facebookTermo}
                      onChange={(e) => setFacebookTermo(e.target.value)}
                      placeholder="Ex: clínica odontológica, pet shop..."
                      className="pl-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Localização
                  </Label>
                  <Input
                    value={facebookLocalizacao}
                    onChange={(e) => setFacebookLocalizacao(e.target.value)}
                    placeholder="Ex: São Paulo, SP (padrão: Brasil)"
                  />
                </div>
                <MaxSlider value={facebookMax} onChange={setFacebookMax} label="Quantidade de resultados" min={10} max={500} step={10} />
              </>
            )}

            {/* Instagram */}
            {plataforma === 'instagram' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInstagramModo('busca')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 transition-all text-sm font-medium',
                      instagramModo === 'busca'
                        ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-950/30 dark:text-pink-400'
                        : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    Buscar Perfis
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstagramModo('seguidores')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 transition-all text-sm font-medium',
                      instagramModo === 'seguidores'
                        ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-950/30 dark:text-pink-400'
                        : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Users className="h-4 w-4" />
                    Extrair Seguidores
                  </button>
                </div>

                {instagramModo === 'busca' ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Hashtag, username ou local *</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={instagramTermos}
                          onChange={(e) => setInstagramTermos(e.target.value)}
                          placeholder="Ex: segurancadotrabalho, @empresa"
                          className="pl-9"
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Busca perfis de negócio — melhor taxa de telefone/email
                      </p>
                    </div>
                    <MaxSlider value={instagramMax} onChange={setInstagramMax} label="Quantidade de perfis" min={10} max={500} step={10} />
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Username do perfil-alvo *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          @
                        </span>
                        <Input
                          value={instagramUsername}
                          onChange={(e) => setInstagramUsername(e.target.value.replace(/^@/, ''))}
                          placeholder="concorrente ou empresa"
                          className="pl-8"
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Extrai seguidores deste perfil. A maioria será conta privada/pessoal — espere ~2-5% com telefone.
                      </p>
                    </div>
                    <MaxSlider value={instagramFollowersMax} onChange={setInstagramFollowersMax} label="Quantidade de seguidores" min={50} max={1500} step={50} maxLabel="1500 (turbo)" />
                  </>
                )}
              </>
            )}

            {/* LinkedIn */}
            {plataforma === 'linkedin' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Busca de empresas *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={linkedinQuery}
                      onChange={(e) => setLinkedinQuery(e.target.value)}
                      placeholder="Ex: segurança do trabalho, consultoria..."
                      className="pl-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> Localização
                    </Label>
                    <Input
                      value={linkedinLocalizacao}
                      onChange={(e) => setLinkedinLocalizacao(e.target.value)}
                      placeholder="Brasil (padrão)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> Indústria
                    </Label>
                    <Input
                      value={linkedinIndustria}
                      onChange={(e) => setLinkedinIndustria(e.target.value)}
                      placeholder="Saúde e Segurança"
                    />
                  </div>
                </div>
                <MaxSlider value={linkedinMax} onChange={setLinkedinMax} label="Quantidade de empresas" min={10} max={500} step={10} />
              </>
            )}

            {/* Tag opcional — comum a todas as plataformas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tag (opcional)</Label>
              <Input
                value={tagNome}
                onChange={(e) => setTagNome(e.target.value)}
                placeholder="Ex: Construção — aplicada aos leads captados"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3" />
              <Mail className="h-3 w-3" />
              Extrai telefone, email e website automaticamente
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Iniciar Captação
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Slider de quantidade (reutilizado por todas as plataformas)
// ---------------------------------------------------------------------------

function MaxSlider({
  value,
  onChange,
  label,
  min,
  max,
  step,
  maxLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min: number;
  max: number;
  step: number;
  maxLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span>{maxLabel ?? max}</span>
      </div>
    </div>
  );
}
