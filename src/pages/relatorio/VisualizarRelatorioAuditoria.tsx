/**
 * Página de Visualização do Relatório de Auditoria
 * 
 * Documento técnico para fins de:
 * - Auditoria interna e externa
 * - Perícia de órgãos públicos e privados
 * - Resguardo legal e jurídico
 * - Compliance e conformidade
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft, Printer, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const db = supabase as any;

interface AuditoriaLog {
  id: string;
  turma_id: string;
  turma_codigo: string | null;
  empresa_id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string | null;
  usuario_role: string | null;
  acao: string;
  entidade: string;
  descricao: string;
  metodo_origem: string | null;
  colaborador_nome: string | null;
  colaborador_cpf: string | null;
  ip_address: string | null;
  dispositivo: string | null;
  created_at: string;
}

interface TurmaInfo {
  id: string;
  codigo_turma: string;
  cliente_nome: string;
  treinamento_nome: string;
  treinamento_norma: string;
  empresa_nome: string;
  empresa_cnpj: string | null;
  empresa_logo: string | null;
}

// Agrupar logs por data
function groupLogsByDate(logs: AuditoriaLog[]): Record<string, AuditoriaLog[]> {
  const grouped: Record<string, AuditoriaLog[]> = {};
  
  logs.forEach(log => {
    const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(log);
  });
  
  const sortedKeys = Object.keys(grouped).sort();
  const sortedGrouped: Record<string, AuditoriaLog[]> = {};
  sortedKeys.forEach(key => {
    sortedGrouped[key] = grouped[key].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
  
  return sortedGrouped;
}

// Calcular estatísticas por hora
function getHourlyStats(logs: AuditoriaLog[]): { hour: number; count: number }[] {
  const hourCounts: Record<number, number> = {};
  
  for (let i = 0; i < 24; i++) {
    hourCounts[i] = 0;
  }
  
  logs.forEach(log => {
    const hour = parseISO(log.created_at).getHours();
    hourCounts[hour]++;
  });
  
  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: parseInt(hour),
    count
  }));
}

// Calcular estatísticas por ação
function getActionStats(logs: AuditoriaLog[]): { action: string; count: number; percentage: number }[] {
  const actionCounts: Record<string, number> = {};
  
  logs.forEach(log => {
    const action = log.acao;
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });
  
  const total = logs.length;
  return Object.entries(actionCounts)
    .map(([action, count]) => ({
      action,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);
}

// Formatar CPF
function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Obter label da ação
function getAcaoLabel(acao: string): string {
  const labels: Record<string, string> = {
    'criar': 'Criação',
    'atualizar': 'Atualização',
    'excluir': 'Exclusão',
    'presenca': 'Presença',
    'prova': 'Prova',
    'certificado': 'Certificado',
    'avaliacao': 'Avaliação'
  };
  return labels[acao] || acao;
}

// Obter cor da ação
function getAcaoColor(acao: string): string {
  const colors: Record<string, string> = {
    'criar': '#16a34a',
    'atualizar': '#2563eb',
    'excluir': '#dc2626',
    'presenca': '#7c3aed',
    'prova': '#ca8a04',
    'certificado': '#0891b2',
    'avaliacao': '#db2777'
  };
  return colors[acao] || '#6b7280';
}

export default function VisualizarRelatorioAuditoria() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const turmaId = searchParams.get('turmaId');

  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [turmaInfo, setTurmaInfo] = useState<TurmaInfo | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Buscar dados
  useEffect(() => {
    if (!turmaId || !profile?.empresa_id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar turma
        const { data: turmaData, error: turmaError } = await db
          .from('turmas_treinamento')
          .select(`
            id,
            codigo_turma,
            empresa_id,
            cliente_id,
            treinamento_id
          `)
          .eq('id', turmaId)
          .single();

        if (turmaError) throw turmaError;

        // Buscar cliente
        const { data: clienteData } = await db
          .from('clientes_sst')
          .select('nome')
          .eq('id', turmaData.cliente_id)
          .single();

        // Buscar treinamento
        const { data: treinamentoData } = await db
          .from('catalogo_treinamentos')
          .select('nome, norma')
          .eq('id', turmaData.treinamento_id)
          .single();

        // Buscar empresa
        const { data: empresaData } = await db
          .from('empresas')
          .select('nome, cnpj, logo_url')
          .eq('id', turmaData.empresa_id)
          .single();

        // Buscar logo do WhiteLabel (prioridade sobre logo da empresa)
        const { data: whiteLabelData } = await db
          .from('white_label_config')
          .select('logo_url')
          .eq('empresa_id', turmaData.empresa_id)
          .single();

        // Usar logo do WhiteLabel se disponível, senão usar logo da empresa
        const logoUrl = whiteLabelData?.logo_url || empresaData?.logo_url || null;

        setTurmaInfo({
          id: turmaData.id,
          codigo_turma: turmaData.codigo_turma || `Turma ${turmaData.id.slice(0, 8)}`,
          cliente_nome: clienteData?.nome || 'N/A',
          treinamento_nome: treinamentoData?.nome || 'N/A',
          treinamento_norma: treinamentoData?.norma || 'N/A',
          empresa_nome: empresaData?.nome || 'N/A',
          empresa_cnpj: empresaData?.cnpj || null,
          empresa_logo: logoUrl
        });

        // Buscar logs de auditoria
        const { data: logsData, error: logsError } = await db
          .from('turmas_auditoria')
          .select('*')
          .eq('turma_id', turmaId)
          .eq('empresa_id', profile.empresa_id)
          .order('created_at', { ascending: true });

        if (logsError) throw logsError;

        setLogs(logsData || []);
      } catch (error: any) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do relatório');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [turmaId, profile?.empresa_id]);

  const groupedLogs = groupLogsByDate(logs);
  const hourlyStats = getHourlyStats(logs);
  const actionStats = getActionStats(logs);
  const maxHourlyCount = Math.max(...hourlyStats.map(s => s.count), 1);

  // Calcular período
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const firstLog = sortedLogs[0];
  const lastLog = sortedLogs[sortedLogs.length - 1];
  const periodo = firstLog && lastLog 
    ? `${format(parseISO(firstLog.created_at), 'dd/MM/yyyy')} a ${format(parseISO(lastLog.created_at), 'dd/MM/yyyy')}`
    : 'N/A';

  // Constante de eventos por página
  const EVENTOS_POR_PAGINA = 7;

  // Páginas do relatório
  const getPaginas = () => {
    const paginas: Array<{ id: string; nome: string; date?: string; pageIndex?: number }> = [];
    
    paginas.push({ id: 'capa', nome: 'Capa' });
    paginas.push({ id: 'resumo', nome: 'Resumo Estatístico' });
    
    // Múltiplas páginas para cada dia de eventos (6 eventos por página)
    Object.keys(groupedLogs).forEach((date) => {
      const dateLogs = groupedLogs[date];
      const totalPagesForDate = Math.ceil(dateLogs.length / EVENTOS_POR_PAGINA);
      
      for (let pageIndex = 0; pageIndex < totalPagesForDate; pageIndex++) {
        const suffix = totalPagesForDate > 1 ? ` (${pageIndex + 1}/${totalPagesForDate})` : '';
        paginas.push({ 
          id: `timeline-${date}-${pageIndex}`, 
          nome: `Eventos - ${format(parseISO(date), 'dd/MM/yyyy')}${suffix}`,
          date,
          pageIndex
        });
      }
    });
    
    return paginas;
  };

  const paginas = getPaginas();
  const totalPaginas = paginas.length;

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !turmaInfo) return;

    try {
      setGerando(true);
      toast.info('Gerando PDF... Aguarde.');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123],
        compress: true
      });

      for (let i = 0; i < paginas.length; i++) {
        setPaginaAtual(i);
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(reportRef.current, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          removeContainer: true,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Garantir que imagens tenham crossOrigin
            const images = clonedDoc.querySelectorAll('img');
            images.forEach((img: HTMLImageElement) => {
              img.crossOrigin = 'anonymous';
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        
        if (i > 0) {
          pdf.addPage([794, 1123], 'portrait');
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
      }

      const fileName = `auditoria-${turmaInfo.codigo_turma}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      pdf.save(fileName);
      
      setPaginaAtual(0);
      toast.success('Relatório de auditoria baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGerando(false);
      setPaginaAtual(0);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Renderizar página atual
  const renderPagina = () => {
    const pagina = paginas[paginaAtual];
    if (!pagina || !turmaInfo) return null;

    if (pagina.id === 'capa') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-16">
          {/* Logo */}
          <div className="w-24 h-24 bg-slate-800 rounded-xl flex items-center justify-center mb-8">
            {turmaInfo.empresa_logo ? (
              <img src={turmaInfo.empresa_logo} alt="Logo" className="w-16 h-16 object-contain" crossOrigin="anonymous" />
            ) : (
              <Shield className="w-12 h-12 text-white" />
            )}
          </div>

          {/* Título */}
          <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">
            RELATÓRIO DE AUDITORIA
          </h1>
          <p className="text-lg text-slate-500 mb-12 uppercase tracking-widest">
            Registro de Atividades do Sistema
          </p>

          {/* Informações */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 max-w-md w-full text-left">
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-semibold text-slate-500 uppercase">Turma</span>
                <span className="text-sm font-medium text-slate-800">{turmaInfo.codigo_turma}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-semibold text-slate-500 uppercase">Treinamento</span>
                <span className="text-sm font-medium text-slate-800 text-right max-w-[200px]">{turmaInfo.treinamento_nome}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-semibold text-slate-500 uppercase">Norma</span>
                <span className="text-sm font-medium text-slate-800">{turmaInfo.treinamento_norma}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-semibold text-slate-500 uppercase">Cliente</span>
                <span className="text-sm font-medium text-slate-800 text-right max-w-[200px]">{turmaInfo.cliente_nome}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-semibold text-slate-500 uppercase">Período</span>
                <span className="text-sm font-medium text-slate-800">{periodo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-500 uppercase">Total de Eventos</span>
                <span className="text-sm font-bold text-slate-800">{logs.length}</span>
              </div>
            </div>
          </div>

          {/* Aviso confidencial */}
          <div className="mt-8 px-6 py-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-semibold uppercase tracking-wide">
            Documento Confidencial - Uso Interno
          </div>

          {/* Rodapé */}
          <div className="mt-12 text-sm text-slate-400">
            <p>Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p className="mt-1">{turmaInfo.empresa_nome}</p>
          </div>
        </div>
      );
    }

    if (pagina.id === 'resumo') {
      return (
        <div className="w-full h-full p-12">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Resumo Estatístico</h2>
            <span className="text-sm text-slate-500">Turma: {turmaInfo.codigo_turma}</span>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-700">{logs.length}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">Total de Eventos</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-700">{Object.keys(groupedLogs).length}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">Dias com Atividade</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-700">{actionStats.length}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">Tipos de Ações</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-700">
                {new Set(logs.map(l => l.usuario_nome)).size}
              </div>
              <div className="text-xs text-slate-500 mt-1 uppercase">Usuários Ativos</div>
            </div>
          </div>

          {/* Histograma */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-semibold text-slate-600 uppercase mb-4">Distribuição por Hora do Dia</h3>
            <div className="flex items-end gap-1 h-24">
              {hourlyStats.map(stat => (
                <div key={stat.hour} className="flex-1 flex flex-col items-center">
                  {stat.count > 0 && (
                    <span className="text-[8px] text-slate-500 mb-1">{stat.count}</span>
                  )}
                  <div 
                    className="w-full bg-slate-600 rounded-t"
                    style={{ height: `${(stat.count / maxHourlyCount) * 60}px`, minHeight: stat.count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-[8px] text-slate-400 mt-1">
                    {stat.hour.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de ações */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase mb-4">Distribuição por Tipo de Ação</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-semibold uppercase text-xs">Ação</th>
                  <th className="text-left py-2 text-slate-500 font-semibold uppercase text-xs">Quantidade</th>
                  <th className="text-left py-2 text-slate-500 font-semibold uppercase text-xs">Proporção</th>
                  <th className="text-right py-2 text-slate-500 font-semibold uppercase text-xs">%</th>
                </tr>
              </thead>
              <tbody>
                {actionStats.map(stat => (
                  <tr key={stat.action} className="border-b border-slate-100">
                    <td className="py-2">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: getAcaoColor(stat.action) }}
                      >
                        {getAcaoLabel(stat.action)}
                      </span>
                    </td>
                    <td className="py-2 text-slate-700">{stat.count}</td>
                    <td className="py-2">
                      <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
                        <div 
                          className="h-full bg-slate-600 rounded"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 text-right text-slate-700">{stat.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé da página */}
          <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-2 bg-white">
            <span>Relatório de Auditoria - {turmaInfo.codigo_turma}</span>
            <span>Página {paginaAtual + 1} de {totalPaginas}</span>
          </div>
        </div>
      );
    }

    // Páginas de timeline
    if (pagina.id.startsWith('timeline-') && pagina.date) {
      const date = pagina.date;
      const pageIndex = pagina.pageIndex || 0;
      const allDateLogs = groupedLogs[date] || [];
      const startIndex = pageIndex * EVENTOS_POR_PAGINA;
      const dateLogs = allDateLogs.slice(startIndex, startIndex + EVENTOS_POR_PAGINA);
      const totalPagesForDate = Math.ceil(allDateLogs.length / EVENTOS_POR_PAGINA);

      return (
        <div className="w-full h-full p-10 pb-16 flex flex-col">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Cronologia de Eventos</h2>
            <span className="text-xs text-slate-500">Turma: {turmaInfo.codigo_turma}</span>
          </div>

          {/* Data */}
          <div className="bg-slate-700 text-white px-3 py-1.5 rounded mb-3 flex justify-between items-center flex-shrink-0">
            <span className="font-semibold uppercase tracking-wide text-sm">
              {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {totalPagesForDate > 1 && <span className="ml-2 opacity-70 text-xs">({pageIndex + 1}/{totalPagesForDate})</span>}
            </span>
            <span className="text-xs opacity-80">{allDateLogs.length} evento(s) total</span>
          </div>

          {/* Eventos detalhados */}
          <div className="space-y-1.5 flex-1 overflow-hidden">
            {dateLogs.map(log => (
              <div key={log.id} className="border border-slate-200 rounded p-2 bg-slate-50/50">
                {/* Cabeçalho do evento */}
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-slate-500 font-mono text-[10px] min-w-[50px] pt-0.5">
                    {format(parseISO(log.created_at), 'HH:mm:ss')}
                  </span>
                  <span 
                    className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-white uppercase tracking-wide"
                    style={{ backgroundColor: getAcaoColor(log.acao) }}
                  >
                    {getAcaoLabel(log.acao)}
                  </span>
                  <span className="text-slate-700 font-semibold text-[11px]">{log.usuario_nome || 'Sistema'}</span>
                </div>
                
                {/* Descrição */}
                <div className="ml-[55px] mb-1">
                  <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">{log.descricao}</p>
                </div>
                
                {/* Metadados detalhados */}
                <div className="ml-[55px] grid grid-cols-3 gap-x-2 gap-y-0.5 text-[8px]">
                  {log.colaborador_nome && (
                    <div className="flex gap-1">
                      <span className="text-slate-400 font-semibold uppercase">Colaborador:</span>
                      <span className="text-slate-600">{log.colaborador_nome}</span>
                    </div>
                  )}
                  {log.colaborador_cpf && (
                    <div className="flex gap-1">
                      <span className="text-slate-400 font-semibold uppercase">CPF:</span>
                      <span className="text-slate-600 font-mono">{formatCPF(log.colaborador_cpf)}</span>
                    </div>
                  )}
                  {log.metodo_origem && (
                    <div className="flex gap-1">
                      <span className="text-slate-400 font-semibold uppercase">Método:</span>
                      <span className="text-slate-600">{log.metodo_origem}</span>
                    </div>
                  )}
                  {log.dispositivo && (
                    <div className="flex gap-1">
                      <span className="text-slate-400 font-semibold uppercase">Dispositivo:</span>
                      <span className="text-slate-600">{log.dispositivo}</span>
                    </div>
                  )}
                  {log.ip_address && (
                    <div className="flex gap-1">
                      <span className="text-slate-400 font-semibold uppercase">IP:</span>
                      <span className="text-slate-600 font-mono">{log.ip_address}</span>
                    </div>
                  )}
                  {log.entidade && (
                    <div className="flex gap-1">
                      <span className="text-slate-400 font-semibold uppercase">Entidade:</span>
                      <span className="text-slate-600">{log.entidade}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé da página - fixo na parte inferior */}
          <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-2 bg-white">
            <span>Relatório de Auditoria - {turmaInfo.codigo_turma}</span>
            <span>Página {paginaAtual + 1} de {totalPaginas}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (!turmaInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Turma não encontrada ou sem permissão de acesso.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      {/* Barra de ferramentas */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Relatório de Auditoria</h1>
              <p className="text-xs text-slate-500">{turmaInfo.codigo_turma} • {logs.length} eventos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navegação de páginas */}
            <div className="flex items-center gap-1 mr-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPaginaAtual(Math.max(0, paginaAtual - 1))}
                disabled={paginaAtual === 0 || gerando}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 min-w-[80px] text-center">
                {paginaAtual + 1} / {totalPaginas}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPaginaAtual(Math.min(totalPaginas - 1, paginaAtual + 1))}
                disabled={paginaAtual === totalPaginas - 1 || gerando}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handlePrint} disabled={gerando}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={gerando || logs.length === 0}>
              {gerando ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {gerando ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Área do relatório */}
      <div className="pt-20 pb-8 px-4 print:pt-0 print:px-0">
        <div className="max-w-4xl mx-auto">
          {/* Página A4 */}
          <div 
            ref={reportRef}
            className="bg-white shadow-lg print:shadow-none relative"
            style={{ 
              width: '794px', 
              height: '1123px',
              margin: '0 auto'
            }}
          >
            {renderPagina()}
          </div>
        </div>
      </div>
    </div>
  );
}
