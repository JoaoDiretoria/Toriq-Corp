/**
 * Componente de Relatório de Auditoria em formato A4
 * 
 * Documento técnico para fins de:
 * - Auditoria interna e externa
 * - Perícia de órgãos públicos e privados
 * - Resguardo legal e jurídico
 * - Compliance e conformidade
 * 
 * Características:
 * - Formato A4 profissional
 * - Cores institucionais
 * - Quebras de página controladas
 * - Download PDF compactado
 */

import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, FileText, Printer, Shield } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  usuario_setor: string | null;
  acao: string;
  entidade: string;
  descricao: string;
  metodo_origem: string | null;
  fonte: string | null;
  colaborador_id: string | null;
  colaborador_nome: string | null;
  colaborador_cpf: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_cnpj: string | null;
  cliente_razao_social: string | null;
  treinamento_id: string | null;
  treinamento_nome: string | null;
  treinamento_norma: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  dados_anteriores: any;
  dados_novos: any;
  ip_address: string | null;
  user_agent: string | null;
  dispositivo: string | null;
  navegador: string | null;
  sistema_operacional: string | null;
  created_at: string;
  empresa_sst_cnpj: string | null;
  empresa_sst_razao_social: string | null;
  instrutor_id: string | null;
  instrutor_nome: string | null;
  instrutor_email: string | null;
  instrutor_cpf: string | null;
  instrutor_telefone: string | null;
  instrutor_formacao: string | null;
  executado_por: string | null;
  executado_por_nome: string | null;
  executado_por_id: string | null;
}

interface EmpresaInfo {
  nome: string;
  cnpj: string | null;
  logo_url: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
}

interface AuditoriaRelatorioProps {
  logs: AuditoriaLog[];
  turmaId: string;
  turmaCodigo: string | null;
  clienteNome: string;
  treinamentoNome: string;
  treinamentoNorma: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  
  // Ordenar por data
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
    'criar': '#22c55e',
    'atualizar': '#3b82f6',
    'excluir': '#ef4444',
    'presenca': '#8b5cf6',
    'prova': '#f59e0b',
    'certificado': '#06b6d4',
    'avaliacao': '#ec4899'
  };
  return colors[acao] || '#6b7280';
}

export function AuditoriaRelatorio({
  logs,
  turmaId,
  turmaCodigo,
  clienteNome,
  treinamentoNome,
  treinamentoNorma,
  open,
  onOpenChange
}: AuditoriaRelatorioProps) {
  const { profile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [empresaInfo, setEmpresaInfo] = useState<EmpresaInfo | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  // Buscar informações da empresa SST
  useEffect(() => {
    const fetchEmpresaInfo = async () => {
      if (!profile?.empresa_id) return;
      
      try {
        const { data } = await db
          .from('empresas')
          .select('nome, cnpj, logo_url, endereco, cidade, estado, telefone, email')
          .eq('id', profile.empresa_id)
          .single();
        
        if (data) {
          setEmpresaInfo(data);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      }
    };

    if (open) {
      fetchEmpresaInfo();
    }
  }, [open, profile?.empresa_id]);

  const groupedLogs = groupLogsByDate(logs);
  const hourlyStats = getHourlyStats(logs);
  const actionStats = getActionStats(logs);
  const maxHourlyCount = Math.max(...hourlyStats.map(s => s.count), 1);

  const generateReportHTML = (): string => {
    const now = new Date();
    const reportDate = format(now, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    
    // Calcular período dos logs
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];
    const periodo = firstLog && lastLog 
      ? `${format(parseISO(firstLog.created_at), 'dd/MM/yyyy')} a ${format(parseISO(lastLog.created_at), 'dd/MM/yyyy')}`
      : 'N/A';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Auditoria - ${turmaCodigo || turmaId}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1f2937;
      background: white;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      background: white;
      page-break-after: always;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Capa */
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 267mm;
      text-align: center;
    }
    
    .cover-logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #1e3a5f, #0f172a);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 30px;
    }
    
    .cover-logo svg {
      width: 48px;
      height: 48px;
      color: white;
    }
    
    .cover-title {
      font-size: 28pt;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 10px;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      color: #6b7280;
      margin-bottom: 40px;
    }
    
    .cover-info {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 30px 50px;
      text-align: left;
      max-width: 400px;
    }
    
    .cover-info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .cover-info-row:last-child {
      border-bottom: none;
    }
    
    .cover-info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 9pt;
    }
    
    .cover-info-value {
      font-weight: 500;
      color: #1f2937;
      font-size: 10pt;
      text-align: right;
      max-width: 200px;
    }
    
    .cover-footer {
      margin-top: 60px;
      font-size: 9pt;
      color: #9ca3af;
    }
    
    .cover-confidential {
      margin-top: 20px;
      padding: 10px 20px;
      background: #fef2f2;
      border: 1px solid #dc2626;
      border-radius: 4px;
      color: #991b1b;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Seções */
    .section {
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: #0f172a;
      padding-bottom: 8px;
      border-bottom: 2px solid #1e3a5f;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-subtitle {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }
    
    /* Estatísticas */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    
    .stat-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24pt;
      font-weight: 700;
      color: #1e3a5f;
    }
    
    .stat-label {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 5px;
    }
    
    /* Histograma */
    .histogram {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .histogram-title {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 15px;
    }
    
    .histogram-bars {
      display: flex;
      align-items: flex-end;
      height: 100px;
      gap: 3px;
    }
    
    .histogram-bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .histogram-bar {
      width: 100%;
      background: linear-gradient(180deg, #3b82f6, #1e3a5f);
      border-radius: 2px 2px 0 0;
      min-height: 2px;
    }
    
    .histogram-label {
      font-size: 7pt;
      color: #9ca3af;
      margin-top: 4px;
    }
    
    .histogram-count {
      font-size: 7pt;
      color: #6b7280;
      margin-bottom: 2px;
    }
    
    /* Tabela de ações */
    .action-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .action-table th,
    .action-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .action-table th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 9pt;
      color: #6b7280;
    }
    
    .action-table td {
      font-size: 9pt;
    }
    
    .action-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      color: white;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #1e3a5f);
      border-radius: 4px;
    }
    
    /* Timeline */
    .timeline-date {
      background: #1e3a5f;
      color: white;
      padding: 8px 15px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10pt;
      margin-bottom: 10px;
      margin-top: 20px;
      page-break-after: avoid;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .timeline-date:first-child {
      margin-top: 0;
    }
    
    .timeline-event {
      display: flex;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      page-break-inside: avoid;
    }
    
    .timeline-time {
      font-size: 9pt;
      font-weight: 600;
      color: #6b7280;
      min-width: 50px;
    }
    
    .timeline-content {
      flex: 1;
    }
    
    .timeline-action {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      color: white;
      margin-right: 8px;
    }
    
    .timeline-description {
      font-size: 9pt;
      color: #374151;
      margin-top: 4px;
    }
    
    .timeline-meta {
      font-size: 8pt;
      color: #9ca3af;
      margin-top: 4px;
    }
    
    .timeline-user {
      font-weight: 500;
      color: #6b7280;
    }
    
    /* Rodapé */
    .page-footer {
      position: fixed;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      font-size: 8pt;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
    }
    
    /* Utilitários */
    .no-break {
      page-break-inside: avoid;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <!-- CAPA -->
  <div class="page">
    <div class="cover">
      <div class="cover-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
        </svg>
      </div>
      
      <h1 class="cover-title">Relatório de Auditoria</h1>
      <p class="cover-subtitle">Registro de Atividades do Sistema</p>
      
      <div class="cover-info">
        <div class="cover-info-row">
          <span class="cover-info-label">Turma</span>
          <span class="cover-info-value">${turmaCodigo || turmaId}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">Treinamento</span>
          <span class="cover-info-value">${treinamentoNome}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">Norma</span>
          <span class="cover-info-value">${treinamentoNorma || 'N/A'}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">Cliente</span>
          <span class="cover-info-value">${clienteNome}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">Período</span>
          <span class="cover-info-value">${periodo}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">Total de Eventos</span>
          <span class="cover-info-value">${logs.length}</span>
        </div>
      </div>
      
      <div class="cover-confidential">
        DOCUMENTO CONFIDENCIAL - USO INTERNO
      </div>
      
      <p class="cover-footer">
        Gerado em ${reportDate}<br>
        ${empresaInfo?.nome || 'Sistema de Gestão SST'}
      </p>
    </div>
  </div>
  
  <!-- RESUMO ESTATÍSTICO -->
  <div class="page">
    <div class="section">
      <h2 class="section-title">Resumo Estatístico</h2>
      
      <div class="stats-grid">
        <div class="stat-card no-break">
          <div class="stat-value">${logs.length}</div>
          <div class="stat-label">Total de Eventos</div>
        </div>
        <div class="stat-card no-break">
          <div class="stat-value">${Object.keys(groupedLogs).length}</div>
          <div class="stat-label">Dias com Atividade</div>
        </div>
        <div class="stat-card no-break">
          <div class="stat-value">${actionStats.length}</div>
          <div class="stat-label">Tipos de Ações</div>
        </div>
        <div class="stat-card no-break">
          <div class="stat-value">${new Set(logs.map(l => l.usuario_nome)).size}</div>
          <div class="stat-label">Usuários Ativos</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="histogram no-break">
        <div class="histogram-title">Distribuição de Eventos por Hora do Dia</div>
        <div class="histogram-bars">
          ${hourlyStats.map(stat => `
            <div class="histogram-bar-container">
              ${stat.count > 0 ? `<span class="histogram-count">${stat.count}</span>` : ''}
              <div class="histogram-bar" style="height: ${(stat.count / maxHourlyCount) * 80}px;"></div>
              <span class="histogram-label">${stat.hour.toString().padStart(2, '0')}h</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="section">
      <h3 class="section-subtitle">Distribuição por Tipo de Ação</h3>
      <table class="action-table">
        <thead>
          <tr>
            <th style="width: 120px;">Ação</th>
            <th style="width: 80px;">Quantidade</th>
            <th>Proporção</th>
            <th style="width: 60px;">%</th>
          </tr>
        </thead>
        <tbody>
          ${actionStats.map(stat => `
            <tr class="no-break">
              <td>
                <span class="action-badge" style="background-color: ${getAcaoColor(stat.action)};">
                  ${getAcaoLabel(stat.action)}
                </span>
              </td>
              <td>${stat.count}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${stat.percentage}%;"></div>
                </div>
              </td>
              <td>${stat.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- TIMELINE DE EVENTOS -->
  <div class="page">
    <div class="section">
      <h2 class="section-title">Cronologia de Eventos</h2>
      
      ${Object.entries(groupedLogs).map(([date, dateLogs]) => `
        <div class="timeline-date no-break">
          ${format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          <span style="float: right; font-weight: normal; font-size: 9pt;">${dateLogs.length} evento(s)</span>
        </div>
        
        ${dateLogs.map(log => `
          <div class="timeline-event no-break">
            <div class="timeline-time">
              ${format(parseISO(log.created_at), 'HH:mm:ss')}
            </div>
            <div class="timeline-content">
              <span class="timeline-action" style="background-color: ${getAcaoColor(log.acao)};">
                ${getAcaoLabel(log.acao)}
              </span>
              <span class="timeline-user">${log.usuario_nome || 'Sistema'}</span>
              <div class="timeline-description">${log.descricao}</div>
              <div class="timeline-meta">
                ${log.colaborador_nome ? `Colaborador: ${log.colaborador_nome}${log.colaborador_cpf ? ` (${formatCPF(log.colaborador_cpf)})` : ''}` : ''}
                ${log.metodo_origem ? ` | Método: ${log.metodo_origem}` : ''}
                ${log.dispositivo ? ` | Dispositivo: ${log.dispositivo}` : ''}
                ${log.ip_address ? ` | IP: ${log.ip_address}` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      `).join('')}
    </div>
  </div>
  
  <!-- RODAPÉ DE TODAS AS PÁGINAS -->
  <div class="page-footer">
    <span>Relatório de Auditoria - ${turmaCodigo || turmaId}</span>
    <span>Documento gerado automaticamente pelo Sistema de Gestão SST</span>
  </div>
</body>
</html>
    `;
  };

  const handleDownload = async () => {
    if (logs.length === 0) {
      toast.error('Não há eventos para gerar o relatório');
      return;
    }

    setDownloading(true);

    try {
      const htmlContent = generateReportHTML();
      const fileName = `auditoria-${turmaCodigo || turmaId}-${format(new Date(), 'yyyy-MM-dd-HHmm')}`;
      
      // Criar iframe oculto para renderizar o HTML
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        toast.error('Erro ao criar documento');
        document.body.removeChild(iframe);
        setDownloading(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar como canvas
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794
      });

      document.body.removeChild(iframe);

      // Criar PDF A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/jpeg', 0.75);

      // Múltiplas páginas se necessário
      if (imgHeight <= pdfHeight - (margin * 2)) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        const pageContentHeight = pdfHeight - (margin * 2);
        const totalPages = Math.ceil(imgHeight / pageContentHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          const yOffset = -(page * pageContentHeight);
          pdf.addImage(imgData, 'JPEG', margin, margin + yOffset, imgWidth, imgHeight, undefined, 'FAST');
        }
      }

      // Download
      pdf.save(`${fileName}.pdf`);
      toast.success('Relatório de auditoria baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar o relatório de auditoria');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const htmlContent = generateReportHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Visualizar Relatório de Auditoria
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{logs.length}</span> eventos registrados
            {Object.keys(groupedLogs).length > 0 && (
              <span> em <span className="font-medium">{Object.keys(groupedLogs).length}</span> dias</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={downloading || logs.length === 0}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {downloading ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div 
            ref={reportRef}
            className="bg-white p-6 rounded-lg border"
            style={{ minHeight: '500px' }}
          >
            {/* Preview do relatório */}
            <div className="space-y-6">
              {/* Cabeçalho */}
              <div className="text-center border-b pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Relatório de Auditoria</h1>
                <p className="text-muted-foreground">Turma: {turmaCodigo || turmaId}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {treinamentoNome} • {clienteNome}
                </p>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-700">{logs.length}</div>
                  <div className="text-xs text-muted-foreground">Total de Eventos</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-700">{Object.keys(groupedLogs).length}</div>
                  <div className="text-xs text-muted-foreground">Dias com Atividade</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-700">{actionStats.length}</div>
                  <div className="text-xs text-muted-foreground">Tipos de Ações</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-700">
                    {new Set(logs.map(l => l.usuario_nome)).size}
                  </div>
                  <div className="text-xs text-muted-foreground">Usuários Ativos</div>
                </div>
              </div>

              {/* Histograma por hora */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-4">Distribuição por Hora do Dia</h3>
                <div className="flex items-end gap-1 h-24">
                  {hourlyStats.map(stat => (
                    <div key={stat.hour} className="flex-1 flex flex-col items-center">
                      {stat.count > 0 && (
                        <span className="text-[8px] text-muted-foreground mb-1">{stat.count}</span>
                      )}
                      <div 
                        className="w-full bg-gradient-to-t from-slate-700 to-blue-500 rounded-t"
                        style={{ height: `${(stat.count / maxHourlyCount) * 60}px`, minHeight: stat.count > 0 ? '4px' : '0' }}
                      />
                      <span className="text-[8px] text-muted-foreground mt-1">
                        {stat.hour.toString().padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribuição por ação */}
              <div>
                <h3 className="font-semibold mb-3">Distribuição por Tipo de Ação</h3>
                <div className="space-y-2">
                  {actionStats.slice(0, 5).map(stat => (
                    <div key={stat.action} className="flex items-center gap-3">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium text-white min-w-[80px] text-center"
                        style={{ backgroundColor: getAcaoColor(stat.action) }}
                      >
                        {getAcaoLabel(stat.action)}
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-slate-600 rounded"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                        {stat.count} ({stat.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview da timeline (primeiros 5 eventos) */}
              <div>
                <h3 className="font-semibold mb-3">Últimos Eventos (Preview)</h3>
                <div className="space-y-2">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex gap-3 p-2 bg-gray-50 rounded text-sm">
                      <span className="text-muted-foreground font-mono text-xs">
                        {format(parseISO(log.created_at), 'dd/MM HH:mm')}
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: getAcaoColor(log.acao) }}
                      >
                        {getAcaoLabel(log.acao)}
                      </span>
                      <span className="flex-1 truncate">{log.descricao}</span>
                    </div>
                  ))}
                  {logs.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... e mais {logs.length - 5} eventos no relatório completo
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
