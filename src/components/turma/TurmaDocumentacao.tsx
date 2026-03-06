import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  BookOpen,
  Info,
  Users,
  Paperclip,
  ClipboardList,
  Star,
  Award,
  FileText,
  Settings2,
  ShieldCheck,
  ChevronRight,
  CheckCircle,
  XCircle,
  ListOrdered,
  AlertTriangle,
  Camera,
  MessageSquare,
  ScrollText,
  Headphones,
} from 'lucide-react';

interface DocItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  category: 'guia' | 'aba' | 'boas-praticas' | 'suporte';
  content: React.ReactNode;
}

interface TurmaDocumentacaoProps {
  onDocChange?: (docTitle: string | null) => void;
}

export function TurmaDocumentacao({ onDocChange }: TurmaDocumentacaoProps = {}) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const handleSelectDoc = useCallback((docId: string | null, docTitle?: string) => {
    setSelectedDoc(docId);
    onDocChange?.(docTitle || null);
  }, [onDocChange]);

  const docs: DocItem[] = [
    // Boas Práticas (destaque)
    {
      id: 'boas-praticas',
      title: 'Boas Práticas do Treinamento',
      subtitle: 'O que fazer e o que NÃO fazer — Manual de conduta obrigatório',
      icon: <ShieldCheck className="h-6 w-6" />,
      color: 'text-warning',
      borderColor: 'border-warning/30',
      bgColor: 'bg-warning/10',
      category: 'boas-praticas',
      content: <DocBoasPraticas />,
    },
    // Fluxo Geral
    {
      id: 'fluxo',
      title: 'Fluxo Completo da Turma',
      subtitle: 'Passo a passo recomendado do início ao fim do treinamento',
      icon: <ListOrdered className="h-6 w-6" />,
      color: 'text-primary',
      borderColor: 'border-primary/30',
      bgColor: 'bg-primary/5',
      category: 'guia',
      content: <DocFluxo />,
    },
    // Abas
    {
      id: 'aba-geral',
      title: 'Aba Geral',
      subtitle: 'Informações da turma e finalização',
      icon: <Info className="h-6 w-6" />,
      color: 'text-primary',
      borderColor: 'border-primary/20',
      bgColor: 'bg-primary/10',
      category: 'aba',
      content: <DocAbaGeral />,
    },
    {
      id: 'aba-presenca',
      title: 'Aba Lista de Presença',
      subtitle: '3 métodos de cadastro (empresa, QR Code, manual), presença diária e reorientação',
      icon: <Users className="h-6 w-6" />,
      color: 'text-success',
      borderColor: 'border-success/20',
      bgColor: 'bg-success/10',
      category: 'aba',
      content: <DocAbaPresenca />,
    },
    {
      id: 'aba-anexos',
      title: 'Aba Anexos',
      subtitle: 'Galeria de fotos, lista de presença e cases de sucesso',
      icon: <Paperclip className="h-6 w-6" />,
      color: 'text-violet-600',
      borderColor: 'border-violet-200',
      bgColor: 'bg-violet-50',
      category: 'aba',
      content: <DocAbaAnexos />,
    },
    {
      id: 'aba-provas',
      title: 'Aba Provas e Sinistros',
      subtitle: 'Pré-teste, pós-teste, QR Code e registro de sinistros',
      icon: <ClipboardList className="h-6 w-6" />,
      color: 'text-warning',
      borderColor: 'border-warning/20',
      bgColor: 'bg-warning/10',
      category: 'aba',
      content: <DocAbaProvas />,
    },
    {
      id: 'aba-avaliacao',
      title: 'Aba Avaliação de Reação',
      subtitle: 'Pesquisa de satisfação respondida por todos os colaboradores',
      icon: <Star className="h-6 w-6" />,
      color: 'text-warning',
      borderColor: 'border-warning/20',
      bgColor: 'bg-warning/10',
      category: 'aba',
      content: <DocAbaAvaliacao />,
    },
    {
      id: 'aba-certificados',
      title: 'Aba Certificados',
      subtitle: 'Assinatura, validação e download de certificados',
      icon: <Award className="h-6 w-6" />,
      color: 'text-warning',
      borderColor: 'border-warning/20',
      bgColor: 'bg-warning/10',
      category: 'aba',
      content: <DocAbaCertificados />,
    },
    {
      id: 'aba-relatorio',
      title: 'Aba Relatório',
      subtitle: 'Relatórios completos, de presenças e de sinistros',
      icon: <FileText className="h-6 w-6" />,
      color: 'text-info',
      borderColor: 'border-info/20',
      bgColor: 'bg-info/10',
      category: 'aba',
      content: <DocAbaRelatorio />,
    },
    {
      id: 'aba-categorizacao',
      title: 'Aba Categorização Técnica',
      subtitle: 'Espaços confinados, atividades e responsáveis (NR 33)',
      icon: <Settings2 className="h-6 w-6" />,
      color: 'text-slate-600',
      borderColor: 'border-slate-200',
      bgColor: 'bg-slate-50',
      category: 'aba',
      content: <DocAbaCategorizacao />,
    },
    // Suporte
    {
      id: 'widget-suporte',
      title: 'Widget de Suporte',
      subtitle: 'Como usar o botão flutuante de suporte, mover, resetar e abrir tickets',
      icon: <Headphones className="h-6 w-6" />,
      color: 'text-rose-600',
      borderColor: 'border-rose-200',
      bgColor: 'bg-rose-50',
      category: 'suporte',
      content: <DocWidgetSuporte />,
    },
  ];

  const selectedDocData = docs.find(d => d.id === selectedDoc);

  // Full-screen doc viewer
  if (selectedDocData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectDoc(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${selectedDocData.bgColor}`}>
              <span className={selectedDocData.color}>{selectedDocData.icon}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{selectedDocData.title}</h2>
              <p className="text-xs text-muted-foreground">{selectedDocData.subtitle}</p>
            </div>
          </div>
        </div>

        <Card className="border">
          <CardContent className="p-6 md:p-8 prose prose-slate max-w-none
            prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground
            prose-strong:text-foreground prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            {selectedDocData.content}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Doc list view
  const boasPraticas = docs.filter(d => d.category === 'boas-praticas');
  const guias = docs.filter(d => d.category === 'guia');
  const abas = docs.filter(d => d.category === 'aba');
  const suporte = docs.filter(d => d.category === 'suporte');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-2.5 rounded-xl">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          Documentação e Ajuda
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Consulte os guias de uso, tutoriais de cada aba e as boas práticas do treinamento.
        </p>
      </div>

      {/* Boas Práticas - Destaque */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leitura Obrigatória</h3>
        {boasPraticas.map(doc => (
          <button
            key={doc.id}
            onClick={() => handleSelectDoc(doc.id, doc.title)}
            className={`w-full text-left p-5 rounded-xl border-2 ${doc.borderColor} ${doc.bgColor} hover:shadow-md transition-all group`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-warning/20 ${doc.color} flex-shrink-0`}>
                {doc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${doc.color}`}>{doc.title}</h3>
                  <Badge className="bg-warning text-white text-[10px] px-1.5 py-0">Importante</Badge>
                </div>
                <p className="text-sm text-warning/70 mt-0.5">{doc.subtitle}</p>
              </div>
              <ChevronRight className={`h-5 w-5 ${doc.color} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0`} />
            </div>
          </button>
        ))}
      </div>

      {/* Guias */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Guias</h3>
        <div className="space-y-2">
          {guias.map(doc => (
            <DocListItem key={doc.id} doc={doc} onClick={() => handleSelectDoc(doc.id, doc.title)} />
          ))}
        </div>
      </div>

      {/* Abas */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tutorial por Aba</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {abas.map(doc => (
            <DocListItem key={doc.id} doc={doc} onClick={() => handleSelectDoc(doc.id, doc.title)} />
          ))}
        </div>
      </div>

      {/* Suporte */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suporte</h3>
        <div className="space-y-2">
          {suporte.map(doc => (
            <DocListItem key={doc.id} doc={doc} onClick={() => handleSelectDoc(doc.id, doc.title)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DocListItem({ doc, onClick }: { doc: DocItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border ${doc.borderColor} hover:${doc.bgColor} hover:shadow-sm transition-all group flex items-center gap-3`}
    >
      <div className={`p-2 rounded-lg ${doc.bgColor} ${doc.color} flex-shrink-0`}>
        {doc.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground text-sm">{doc.title}</h4>
        <p className="text-xs text-muted-foreground truncate">{doc.subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}

// ==================== DOC CONTENT COMPONENTS ====================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-foreground border-b pb-2 mb-4">{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>;
}

function DoList({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5 my-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{item}</span>
        </div>
      ))}
    </div>
  );
}

function DontList({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5 my-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{item}</span>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 my-4 text-sm text-primary/80">
      {children}
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 my-4 text-sm text-warning flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 my-3 ml-1">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-muted-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// ==================== BOAS PRÁTICAS ====================

function DocBoasPraticas() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Manual rápido de conduta e procedimentos para instrutores e empresas de SST durante a gestão de turmas.
      </p>

      <div className="bg-slate-900 text-white rounded-xl p-5">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Postura Profissional
        </h3>
        <DoList items={[
          'Manter postura profissional durante todo o treinamento',
          'Demonstrar domínio do conteúdo e das normas regulamentadoras',
          'Tratar todos os colaboradores com respeito e seriedade',
          'Cumprir os horários programados das aulas',
          'Zelar pela imagem e reputação da empresa de SST',
        ]} />
        <div className="mt-4 pt-3 border-t border-white/20">
          <DontList items={[
            'Assumir postura informal ou descomprometida que coloque em dúvida o profissionalismo da empresa',
            'Prejudicar a formação dos colaboradores por falta de preparo ou dedicação',
            'Desrespeitar horários, comprometendo a carga horária obrigatória do treinamento',
            'Ignorar dúvidas dos colaboradores sobre segurança',
            'Permitir que o treinamento seja conduzido de forma superficial ou incompleta',
          ]} />
        </div>
      </div>

      <SectionTitle>Lista de Presença</SectionTitle>
      <DoList items={[
        'Cadastrar todos os colaboradores que participarão do treinamento antes de iniciar',
        'Marcar presença todos os dias — cada dia de aula exige marcação separada',
        'Coletar assinatura digital de cada colaborador presente',
        'Realizar validação facial quando o recurso estiver ativado',
        'Conferir se todos os colaboradores presentes tiveram a presença registrada ao final de cada dia',
        'Gerar o documento da lista de presença após concluir todas as marcações',
      ]} />
      <DontList items={[
        'Deixar de cadastrar algum colaborador que participou do treinamento',
        'Esquecer de marcar presença em algum dia de aula — o colaborador ficará com falta',
        'Marcar presença de colaborador que não estava presente (fraude documental)',
        'Deixar de coletar a assinatura digital do colaborador',
        'Ignorar a validação facial quando disponível',
      ]} />

      <SectionTitle>Provas (Pré-Teste e Pós-Teste)</SectionTitle>
      <InfoBox>
        <strong>Pré-Teste:</strong> Serve apenas como comparativo de evolução — não reprova ninguém.<br />
        <strong>Pós-Teste:</strong> Define aprovação ou reprovação. Nota ≥ 7 = Aprovado. Nota {'<'} 7 = Reprovado (pode refazer).
      </InfoBox>
      <DoList items={[
        'Aplicar o Pré-Teste antes de iniciar o conteúdo',
        'Aplicar o Pós-Teste após concluir todo o conteúdo',
        'Garantir que todos os colaboradores realizem ambas as provas',
        'Permitir que colaboradores reprovados refaçam o pós-teste',
        'Aplicar reorientação nos colaboradores aprovados com nota entre 7 e 9',
      ]} />
      <DontList items={[
        'Deixar de aplicar o Pré-Teste ou o Pós-Teste',
        'Confundir pré-teste com pós-teste — apenas o pós-teste define aprovação',
        'Ignorar colaboradores aprovados (nota 7-9) sem aplicar reorientação',
        'Permitir que colaboradores já aprovados refaçam o pós-teste',
        'Fornecer respostas ou facilitar a prova para os colaboradores',
      ]} />

      <SectionTitle>Sinistros</SectionTitle>
      <DoList items={[
        'Registrar sinistro imediatamente quando houver ocorrência grave',
        'Documentar com descrição detalhada do que aconteceu',
        'Anexar fotos de evidência sempre que possível',
      ]} />
      <DontList items={[
        'Deixar de registrar sinistro quando o colaborador tomou atitudes que devem resultar em reprovação',
        'Ignorar comportamentos graves por conveniência ou pressão',
        'Aprovar colaboradores que deveriam ter sido reprovados por sinistro',
      ]} />

      <SectionTitle>Fotos do Treinamento</SectionTitle>
      <DoList items={[
        'Anexar fotos que demonstrem o treinamento sendo realizado de forma profissional',
        'Garantir que todos os colaboradores nas fotos estejam usando EPIs adequados',
        'Fotos com boa qualidade, iluminação e enquadramento',
        'Descrever cada foto com legenda clara',
      ]} />
      <DontList items={[
        'Anexar fotos de colaboradores sem EPI ou com EPIs inadequados',
        'Anexar fotos de colaboradores usando adornos (anéis, pulseiras, correntes, relógios, brincos)',
        'Anexar fotos com emojis, filtros, marca d\'água ou edições',
        'Anexar fotos de baixa qualidade, desfocadas ou mal enquadradas',
        'Deixar a galeria vazia — fotos são parte do relatório oficial',
      ]} />

      <SectionTitle>Avaliação, Certificados e Relatório</SectionTitle>
      <DoList items={[
        'Coletar a avaliação de reação de todos os colaboradores',
        'Coletar a assinatura de cada colaborador aprovado no certificado',
        'Validar todos os certificados antes de finalizar a turma',
        'Conferir o relatório completo antes de enviar à empresa cliente',
      ]} />
      <DontList items={[
        'Deixar de coletar a avaliação de algum colaborador',
        'Induzir respostas positivas ou preencher a avaliação pelo colaborador',
        'Emitir certificado para colaborador reprovado ou com sinistro',
        'Enviar o relatório sem revisão',
        'Finalizar a turma sem gerar o relatório',
      ]} />

      {/* Resumo Rápido */}
      <SectionTitle>Resumo Rápido</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2.5 font-semibold border-b">Etapa</th>
              <th className="text-left p-2.5 font-semibold border-b text-success">Fazer</th>
              <th className="text-left p-2.5 font-semibold border-b text-destructive">Não fazer</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {[
              ['Colaboradores', 'Cadastrar todos antes de iniciar', 'Esquecer de cadastrar participantes'],
              ['Presença', 'Marcar todo dia, com assinatura', 'Esquecer dias, não coletar assinatura'],
              ['Pré-Teste', 'Aplicar antes do conteúdo', 'Pular ou facilitar'],
              ['Pós-Teste', 'Aplicar após o conteúdo', 'Pular ou facilitar'],
              ['Sinistros', 'Registrar ocorrências graves', 'Ignorar comportamentos inadequados'],
              ['Reorientação', 'Aplicar nos aprovados (nota 7-9)', 'Ignorar aprovados sem reorientar'],
              ['Avaliação', 'Coletar de todos os colaboradores', 'Deixar pendente ou induzir respostas'],
              ['Fotos', 'Profissionais, com EPI, sem edição', 'Sem EPI, com adornos, emojis, filtros'],
              ['Certificados', 'Assinar e validar todos', 'Emitir sem conferir'],
              ['Relatório', 'Conferir e baixar', 'Enviar sem revisar'],
              ['Postura', 'Profissional e comprometida', 'Informal ou descomprometida'],
            ].map(([etapa, fazer, naoFazer], i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-2.5 font-medium text-foreground">{etapa}</td>
                <td className="p-2.5">{fazer}</td>
                <td className="p-2.5">{naoFazer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== FLUXO ====================

function DocFluxo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O fluxo recomendado para gerenciar uma turma do início ao fim:
      </p>
      <StepList steps={[
        'Aba Geral → Conferir todas as informações da turma (datas, instrutor, empresa cliente, treinamento)',
        'Lista de Presença → Adicionar os colaboradores à turma',
        'Lista de Presença → Marcar presença dos colaboradores (assinatura digital + validação facial). Este passo é diário: cada dia de aula exige uma marcação separada.',
        'Provas e Sinistros → Aplicar o Pré-Teste (comparativo de evolução)',
        'Fora do sistema → Ministrar o treinamento — toda a parte teórica e prática',
        'Provas e Sinistros → Aplicar o Pós-Teste (define aprovação/reprovação)',
        'Provas e Sinistros → Registrar sinistros, se houver ocorrências graves',
        'Lista de Presença → Registrar reorientação dos colaboradores aprovados com nota entre 7 e 9 no pós-teste',
        'Avaliação de Reação → Coletar a avaliação de satisfação de todos os colaboradores',
        'Anexos → Adicionar fotos do treinamento à galeria e selecionar cases de sucesso',
        'Lista de Presença → Gerar o documento da lista de presença',
        'Certificados → Coletar assinaturas e validar os certificados dos aprovados',
        'Relatório → Visualizar e baixar o relatório completo do treinamento',
        'Aba Geral → Finalizar a turma',
      ]} />
      <WarningBox>
        A ordem acima é a recomendada, mas o sistema permite navegar livremente entre as abas a qualquer momento.
      </WarningBox>

      <SectionTitle>Glossário</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2.5 font-semibold border-b w-1/4">Termo</th>
              <th className="text-left p-2.5 font-semibold border-b">Significado</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {[
              ['Turma', 'Sessão de treinamento com data, instrutor e colaboradores'],
              ['Colaborador', 'Funcionário da empresa cliente que participa do treinamento'],
              ['Pré-Teste', 'Avaliação antes do treinamento para medir conhecimento prévio (comparativo, não reprova)'],
              ['Pós-Teste', 'Avaliação após o treinamento que define aprovação (≥ 7) ou reprovação (< 7). Reprovados podem refazer'],
              ['Reorientação', 'Revisão das questões erradas no pós-teste para aprovados com nota entre 7 e 9'],
              ['Sinistro', 'Ocorrência grave que resulta em reprovação automática do colaborador'],
              ['Validação Facial', 'Verificação de identidade por reconhecimento facial (quando ativado)'],
              ['Case de Sucesso', 'Depoimento positivo de um colaborador selecionado para destaque'],
              ['Avaliação de Reação', 'Pesquisa de satisfação respondida por todos os colaboradores'],
              ['Categorização Técnica', 'Classificação dos espaços confinados, atividades e responsáveis (NR 33)'],
            ].map(([termo, significado], i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-2.5 font-medium text-foreground">{termo}</td>
                <td className="p-2.5">{significado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== ABA GERAL ====================

function DocAbaGeral() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Geral</strong> exibe todas as informações cadastrais da turma e permite a finalização do treinamento.
      </p>

      <SubTitle>Informações Exibidas</SubTitle>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li>Código da turma e treinamento (NR)</li>
        <li>Tipo de treinamento (Formação, Reciclagem, etc.)</li>
        <li>Empresa/Cliente</li>
        <li>Instrutor e formação</li>
        <li>Quantidade de participantes</li>
        <li>Status da turma</li>
        <li>Aulas programadas (datas e horários)</li>
      </ul>

      <SubTitle>Finalizar Turma</SubTitle>
      <p className="text-sm text-muted-foreground">
        Na parte inferior da aba, existe a seção <strong>Finalizar Turma</strong> (apenas Empresa SST e Admin).
      </p>
      <InfoBox>
        <strong>Pré-requisitos para finalização:</strong>
        <ol className="list-decimal ml-4 mt-2 space-y-1">
          <li>Presença registrada em todas as datas de aula (com assinatura digital)</li>
          <li>Pré-teste aplicado para todos os colaboradores</li>
          <li>Pós-teste aplicado para todos os colaboradores</li>
          <li>Reorientação concluída para aprovados com nota entre 7 e 9</li>
          <li>Avaliação de reação coletada de todos os colaboradores</li>
          <li>Fotos do treinamento anexadas na galeria (aba Anexos)</li>
          <li>Lista de presença gerada (aba Lista de Presença)</li>
          <li>Assinaturas dos colaboradores aprovados coletadas nos certificados</li>
          <li>Certificados validados (aba Certificados)</li>
          <li>Relatório gerado e conferido (aba Relatório)</li>
        </ol>
      </InfoBox>
      <WarningBox>
        Todas as etapas acima devem estar concluídas antes de finalizar a turma. O sistema listará as pendências restantes em um painel amarelo.
      </WarningBox>
      <StepList steps={[
        'Acesse a aba Geral',
        'Role até a seção Finalizar Turma na parte inferior',
        'Se houver pendências, elas serão listadas em um painel amarelo',
        'Resolva todas as pendências nas respectivas abas',
        'Quando todas forem resolvidas, o botão ficará verde e habilitado',
        'Clique em Finalizar Turma e confirme',
      ]} />
    </div>
  );
}

// ==================== ABA PRESENÇA ====================

function DocAbaPresenca() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Lista de Presença</strong> é onde você adiciona colaboradores, registra presença diária, coleta assinaturas e gerencia reorientações.
      </p>

      <SectionTitle>Adicionar Colaboradores</SectionTitle>
      <p className="text-sm text-muted-foreground">
        Ao clicar no botão <strong>"Adicionar"</strong>, um diálogo é aberto com 3 métodos de cadastro:
      </p>

      {/* Método 1: Da Empresa */}
      <SubTitle>Método 1 — Da Empresa (lista existente)</SubTitle>
      <p className="text-sm text-muted-foreground">
        Seleciona colaboradores que já estão cadastrados na empresa cliente. É o método mais rápido quando os colaboradores já existem no sistema.
      </p>
      <StepList steps={[
        'Clique em "Adicionar" e selecione a aba "Da Empresa"',
        'A lista mostra todos os colaboradores ativos da empresa cliente',
        'Colaboradores que precisam do treinamento aparecem destacados em verde no topo',
        'Colaboradores já na turma aparecem desabilitados',
        'Use a barra de busca para filtrar por nome',
        'Selecione os colaboradores desejados (checkbox)',
        'Clique em "Adicionar Selecionados"',
      ]} />
      <InfoBox>
        O sistema verifica automaticamente conflitos de agenda — se o colaborador já está em outra turma com datas sobrepostas, a adição será bloqueada.
      </InfoBox>

      {/* Método 2: QR Code */}
      <SubTitle>Método 2 — QR Code (auto-cadastro pelo colaborador)</SubTitle>
      <p className="text-sm text-muted-foreground">
        O colaborador escaneia um QR Code com o celular e preenche seus próprios dados. O instrutor revisa e aprova ou recusa a solicitação.
      </p>

      <p className="text-sm font-medium text-foreground mt-4 mb-2">Passo a passo do instrutor:</p>
      <StepList steps={[
        'Clique em "Adicionar" e selecione a aba "QR Code"',
        'O sistema exibe um QR Code e um link copiável',
        'Projete o QR Code na tela ou compartilhe o link com os colaboradores',
        'Os colaboradores escaneiam o QR Code com o celular',
        'No celular, o colaborador preenche: Nome e CPF',
        'Após enviar, o colaborador aparece na seção "Pendentes de Aprovação" (painel amarelo)',
      ]} />

      <p className="text-sm font-medium text-foreground mt-4 mb-2">Aprovar ou recusar uma solicitação:</p>
      <StepList steps={[
        'Na seção "Pendentes de Aprovação", clique no card do colaborador',
        'Um diálogo abre mostrando os dados preenchidos (nome, CPF, data do cadastro)',
        'Se o reconhecimento facial estiver ativo, adicione a foto do colaborador (selfie, câmera ou galeria) — obrigatório neste caso',
        'Revise os dados com atenção',
        'Clique em "Aprovar" (verde) para adicionar à turma, ou "Recusar" (vermelho) para rejeitar',
      ]} />
      <WarningBox>
        Ao aprovar, o sistema verifica se já existe um colaborador com o mesmo CPF na empresa. Se existir, vincula ao existente. Se não, cria um novo cadastro automaticamente. Também verifica conflitos de agenda com outras turmas.
      </WarningBox>

      <p className="text-sm font-medium text-foreground mt-4 mb-2">Solicitação recusada:</p>
      <p className="text-sm text-muted-foreground">
        Ao recusar, o registro temporário é removido. O colaborador pode escanear o QR Code novamente e reenviar a solicitação com os dados corretos. Não há limite de tentativas.
      </p>

      {/* Método 3: Novo */}
      <SubTitle>Método 3 — Novo (cadastro manual pelo instrutor)</SubTitle>
      <p className="text-sm text-muted-foreground">
        O instrutor preenche manualmente os dados do colaborador e o adiciona diretamente à turma. Útil quando o colaborador não está cadastrado na empresa e não tem acesso ao QR Code.
      </p>
      <StepList steps={[
        'Clique em "Adicionar" e selecione a aba "Novo"',
        'Preencha os campos obrigatórios: Nome Completo e CPF',
        'Se o reconhecimento facial estiver ativo, adicione a foto do colaborador (clique no círculo da foto)',
        'Clique em "Cadastrar e Adicionar"',
        'O colaborador é criado na empresa cliente e adicionado à turma automaticamente',
      ]} />
      <InfoBox>
        Se já existir um colaborador com o mesmo CPF na empresa, o sistema vincula o existente à turma em vez de criar duplicata.
      </InfoBox>

      <SectionTitle>Marcar Presença (Diário)</SectionTitle>
      <WarningBox>
        A presença deve ser marcada <strong>a cada dia de aula</strong>. Se o treinamento tem 2 dias, marca-se presença no dia 1 e novamente no dia 2. Colaboradores sem presença registrada terão falta.
      </WarningBox>
      <StepList steps={[
        'Clique em "Marcar Presença" para abrir o QR Code de presença',
        'O colaborador escaneia o QR Code com o celular',
        'Realiza validação facial (se ativado) e assina digitalmente na tela',
        'A presença aparece na tabela com foto de validação + assinatura',
        'Repita para cada colaborador presente no dia',
      ]} />

      <SectionTitle>Resultados das Provas</SectionTitle>
      <InfoBox>
        O <strong>pré-teste</strong> serve apenas como comparativo de evolução — não reprova ninguém.
        Apenas o <strong>pós-teste</strong> define aprovação ou reprovação.
      </InfoBox>

      <SectionTitle>Reorientação</SectionTitle>
      <p className="text-sm text-muted-foreground">
        Aplica-se apenas ao <strong>pós-teste</strong> e somente para colaboradores <strong>aprovados com nota entre 7 e 9</strong>.
      </p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li><strong>"Sim" (verde)</strong> — Reorientação concluída</li>
        <li><strong>"Pendente" (amarelo)</strong> — Aprovado (nota 7-9) que precisa de reorientação</li>
        <li><strong>"N/A"</strong> — Nota = 10, aprovado sem erros</li>
        <li><strong>"Refazer" (vermelho)</strong> — Reprovado (nota {'<'} 7), pode refazer o pós-teste</li>
      </ul>

      <SectionTitle>Gerar Lista de Presença</SectionTitle>
      <p className="text-sm text-muted-foreground">
        Após todos os colaboradores terem presença registrada em todas as datas, o botão "Gerar lista de presença" fica habilitado. O documento é salvo na aba Anexos.
      </p>
    </div>
  );
}

// ==================== ABA ANEXOS ====================

function DocAbaAnexos() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Anexos</strong> centraliza documentos e imagens da turma em 3 seções: Lista de Presença, Galeria de Fotos e Cases de Sucesso.
      </p>

      <SubTitle>1. Lista de Presença</SubTitle>
      <p className="text-sm text-muted-foreground">
        Documento gerado automaticamente a partir dos dados da aba Lista de Presença. Clique na imagem para visualizar em tamanho expandido.
      </p>

      <SubTitle>2. Galeria de Fotos (até 10)</SubTitle>
      <WarningBox>
        Antes de adicionar fotos, você deve aceitar o Termo de Compromisso Profissional com as diretrizes de qualidade.
      </WarningBox>
      <StepList steps={[
        'Clique em "Adicionar Foto"',
        'Leia e aceite o Termo de Compromisso Profissional',
        'Selecione a foto, preencha a descrição e a data',
        'Clique em "Adicionar"',
      ]} />
      <p className="text-sm text-muted-foreground">
        As fotos aparecem no relatório final. Capriche na qualidade e na descrição (legenda).
      </p>

      <SubTitle>3. Cases de Sucesso</SubTitle>
      <p className="text-sm text-muted-foreground">
        Depoimentos positivos de colaboradores que responderam a avaliação de reação. Selecione até 5 avaliações para destacar como cases de sucesso.
      </p>
    </div>
  );
}

// ==================== ABA PROVAS ====================

function DocAbaProvas() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Provas e Sinistros</strong> é dividida em duas sub-abas: Provas e Sinistros.
      </p>

      <SectionTitle>Provas</SectionTitle>
      <InfoBox>
        <strong>Pré-Teste:</strong> Comparativo de evolução — mede o conhecimento prévio. Não reprova.<br />
        <strong>Pós-Teste:</strong> Define aprovação ou reprovação:<br />
        • Nota ≥ 7: Aprovado<br />
        • Nota entre 7 e 9: Aprovado, mas precisa de reorientação<br />
        • Nota = 10: Aprovado sem reorientação<br />
        • Nota {'<'} 7: Reprovado — pode refazer o pós-teste<br />
        <br />
        Colaboradores já aprovados não podem refazer o pós-teste.
      </InfoBox>

      <SubTitle>Aplicar via QR Code</SubTitle>
      <p className="text-sm text-muted-foreground">
        O QR Code abre uma página pública no celular do colaborador. O fluxo é diferente dependendo do tipo de prova e da nota obtida.
      </p>

      <StepList steps={[
        'Acesse a sub-aba Provas e exiba o QR Code (projetor, impressão, etc.)',
        'O colaborador escaneia com o celular e acessa a página da prova',
        'Seleciona o tipo: Pré-Teste ou Pós-Teste',
        'Informa o CPF para se identificar na turma',
        'Responde todas as questões e envia a prova',
      ]} />

      <InfoBox>
        <strong>Fluxo do Pré-Teste (via QR Code):</strong><br />
        Responde a prova → Vê o resultado (nota). Fim. O pré-teste é apenas comparativo e não reprova.<br /><br />

        <strong>Fluxo do Pós-Teste (via QR Code) — varia conforme a nota:</strong><br /><br />

        <strong>• Nota 10 (aprovado direto):</strong><br />
        Responde a prova → Aprovado → Coleta assinatura digital (para o certificado) → Responde a Avaliação de Reação → Resultado final<br /><br />

        <strong>• Nota 7 a 9 (aprovado com reorientação):</strong><br />
        Responde a prova → Aprovado, mas precisa de reorientação → Exibe as questões que errou (resposta errada em vermelho, correta em verde) → Exibe o Termo de Reorientação da empresa → Colaborador assina digitalmente a reorientação → Coleta assinatura digital (para o certificado) → Responde a Avaliação de Reação → Resultado final<br /><br />

        <strong>• Nota {'<'} 7 (reprovado):</strong><br />
        Responde a prova → Reprovado → Vê o resultado. Pode refazer o pós-teste escaneando o QR Code novamente.
      </InfoBox>

      <WarningBox>
        Tudo isso acontece em sequência no celular do colaborador, sem intervenção do instrutor. Ao final do fluxo completo (nota ≥ 7), o sistema já terá coletado: resultado da prova, reorientação assinada (se necessário), assinatura do certificado e avaliação de reação.
      </WarningBox>

      <SubTitle>Registrar Manualmente (pelo Instrutor)</SubTitle>
      <p className="text-sm text-muted-foreground">
        O instrutor pode registrar a prova diretamente na página, sem necessidade de QR Code. Ideal para quando o colaborador não tem celular, está sem internet ou quando a prova é aplicada em papel.
      </p>

      <StepList steps={[
        'Na sub-aba Provas, localize o colaborador na tabela',
        'Clique no botão "Registrar Prova" ao lado do nome do colaborador',
        'Selecione o tipo: Pré-Teste ou Pós-Teste',
        'Para cada questão, marque a resposta do colaborador',
        'Questões incorretas ficam destacadas em vermelho automaticamente',
        'Ao finalizar, clique em "Salvar" — a nota é calculada automaticamente',
      ]} />

      <InfoBox>
        <strong>Registro Individual:</strong> Cada colaborador é registrado separadamente. Você pode registrar a prova de um colaborador por vez, no ritmo que preferir.<br /><br />
        <strong>Marcar Incorretas:</strong> Ao registrar, basta selecionar as alternativas que o colaborador marcou. O sistema compara automaticamente com o gabarito e calcula a nota.<br /><br />
        <strong>Correção:</strong> Se o colaborador errou uma questão, a alternativa correta aparece destacada em verde e a marcada aparece em vermelho, facilitando a conferência.<br /><br />
        <strong>Refazer Pós-Teste:</strong> Se o colaborador foi reprovado (nota {'<'} 7), o botão "Registrar Prova" fica disponível novamente para o Pós-Teste. Colaboradores já aprovados não podem refazer.
      </InfoBox>

      <SectionTitle>Sinistros</SectionTitle>
      <WarningBox>
        Sinistros são irreversíveis — o colaborador é reprovado automaticamente e não pode ter certificado emitido.
      </WarningBox>
      <StepList steps={[
        'Acesse a sub-aba Sinistros',
        'Clique em "Registrar Sinistro"',
        'Selecione o colaborador e o tipo de sinistro',
        'Preencha a descrição detalhada',
        'Anexe fotos de evidência (se disponível)',
        'Confirme o registro',
      ]} />
    </div>
  );
}

// ==================== ABA AVALIAÇÃO ====================

function DocAbaAvaliacao() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Avaliação de Reação</strong> coleta a pesquisa de satisfação de todos os colaboradores.
      </p>

      <SubTitle>Quem aparece na tabela?</SubTitle>
      <p className="text-sm text-muted-foreground">
        Todos os colaboradores da turma participam da avaliação de reação.
      </p>

      <SubTitle>Quando o botão "Avaliar" fica habilitado?</SubTitle>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li>Colaborador com nota 10 → Habilitado diretamente</li>
        <li>Colaborador com nota 7-9 → Só após reorientação concluída</li>
      </ul>

      <SubTitle>Passo a Passo</SubTitle>
      <StepList steps={[
        'Acesse a aba Avaliação de Reação',
        'Localize o colaborador com status "Pendente"',
        'Clique em "Avaliar"',
        'Preencha o formulário com as notas e comentários',
        'Clique em "Salvar Avaliação"',
      ]} />

      <SubTitle>Resultados Consolidados</SubTitle>
      <p className="text-sm text-muted-foreground">
        Os gráficos e cards de resultados são atualizados automaticamente conforme novas avaliações são registradas. Os resultados são incluídos no relatório final.
      </p>
    </div>
  );
}

// ==================== ABA CERTIFICADOS ====================

function DocAbaCertificados() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Certificados</strong> permite coletar assinaturas, validar e baixar os certificados dos colaboradores aprovados.
      </p>

      <SubTitle>Regras de Negócio</SubTitle>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li>Apenas colaboradores aprovados (nota pós-teste ≥ 7 e sem sinistro) podem ter certificado</li>
        <li>Colaboradores com sinistro são automaticamente reprovados</li>
        <li>O modelo de certificado é definido no cadastro do treinamento</li>
      </ul>

      <SubTitle>Coletar Assinatura</SubTitle>
      <StepList steps={[
        'Localize o colaborador aprovado na tabela',
        'Clique em "Assinar" na coluna Assinatura',
        'O colaborador assina digitalmente no pad',
        'Confirme a assinatura',
      ]} />

      <SubTitle>Validar Certificados</SubTitle>
      <StepList steps={[
        'Clique em "Validar os Certificados" (botão no topo)',
        'O sistema gera os PDFs de todos os certificados pendentes',
        'Após validação, os certificados ficam disponíveis para visualização e download',
      ]} />

      <InfoBox>
        Valide os certificados somente após todas as assinaturas serem coletadas. Use a validação em lote para processar todos de uma vez.
      </InfoBox>
    </div>
  );
}

// ==================== ABA RELATÓRIO ====================

function DocAbaRelatorio() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Relatório</strong> permite visualizar e exportar os relatórios completos do treinamento.
      </p>

      <SubTitle>Relatório Completo de Treinamento</SubTitle>
      <p className="text-sm text-muted-foreground">
        Documento principal com todas as informações: dados da turma, lista de presença, resultados das avaliações, certificados, fotos e documentos do instrutor.
      </p>

      <SubTitle>Relatório de Presenças</SubTitle>
      <p className="text-sm text-muted-foreground">
        Documentos comprobatórios com foto cadastrada, validação facial e assinatura digital por dia de cada colaborador.
      </p>

      <SubTitle>Relatório de Sinistros</SubTitle>
      <p className="text-sm text-muted-foreground">
        Detalhamento de todas as ocorrências registradas, com fotos de evidência e dados do instrutor responsável.
      </p>

      <SubTitle>Relatório Validado</SubTitle>
      <p className="text-sm text-muted-foreground">
        Quando disponível, é o documento oficial aprovado para envio à empresa cliente. Pode ser visualizado e baixado em PDF.
      </p>

      <InfoBox>
        Confira o relatório completo antes de enviar à empresa cliente. Verifique se todas as seções estão preenchidas.
      </InfoBox>
    </div>
  );
}

// ==================== ABA CATEGORIZAÇÃO ====================

function DocAbaCategorizacao() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A aba <strong>Categorização Técnica</strong> é específica para treinamentos de NR 33 (Espaços Confinados). Disponível apenas para Empresa SST e Admin.
      </p>

      <SubTitle>Tipos de Espaço Confinado</SubTitle>
      <p className="text-sm text-muted-foreground">
        Cadastre os tipos de espaços confinados abordados no treinamento (ex: tanques, silos, galerias, vasos de pressão).
      </p>

      <SubTitle>Atividades</SubTitle>
      <p className="text-sm text-muted-foreground">
        Registre as atividades realizadas nos espaços confinados (ex: manutenção, limpeza, inspeção, resgate).
      </p>

      <SubTitle>Responsáveis Técnicos</SubTitle>
      <p className="text-sm text-muted-foreground">
        Informe os responsáveis técnicos envolvidos no treinamento (engenheiros, técnicos de segurança).
      </p>

      <InfoBox>
        A categorização técnica é importante para auditorias e conformidade legal. Preencha com cuidado e precisão.
      </InfoBox>
    </div>
  );
}

// ==================== WIDGET DE SUPORTE ====================

function DocWidgetSuporte() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O <strong>Widget de Suporte</strong> é um botão flutuante presente em todas as telas do sistema. Ele permite abrir um <strong>ticket de suporte</strong> diretamente de onde você estiver, sem sair da tela atual.
      </p>

      <SectionTitle>O Botão Flutuante</SectionTitle>
      <p className="text-sm text-muted-foreground">
        O botão aparece como um ícone arredondado com o texto <strong>"Suporte"</strong>, posicionado no canto inferior direito da tela. Ele possui 3 interações:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-semibold text-foreground">Ação</th>
              <th className="text-left py-2 font-semibold text-foreground">O que acontece</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Clique simples</td>
              <td className="py-2">Abre o formulário de suporte</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Arrastar (clique e segure)</td>
              <td className="py-2">Move o botão para qualquer posição na tela</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Duplo clique</td>
              <td className="py-2">Reseta o botão para a posição original (canto inferior direito)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SubTitle>Mover o botão</SubTitle>
      <StepList steps={[
        'Clique e segure o botão "Suporte"',
        'Arraste para qualquer posição na tela',
        'Solte o botão na posição desejada',
        'O botão permanecerá na nova posição',
      ]} />
      <InfoBox>
        Útil quando o botão está sobrepondo algum elemento importante da tela. Mova-o para onde não atrapalhe.
      </InfoBox>

      <SubTitle>Resetar posição</SubTitle>
      <StepList steps={[
        'Dê um duplo clique rápido no botão',
        'O botão voltará automaticamente para o canto inferior direito',
      ]} />

      <SectionTitle>Abrir um Ticket de Suporte</SectionTitle>

      <SubTitle>1. Abrir o Widget</SubTitle>
      <StepList steps={[
        'Clique no botão flutuante "Suporte" (ícone de fone de ouvido)',
        'O formulário de suporte será aberto como uma janela flutuante',
      ]} />

      <SubTitle>2. Informações Automáticas</SubTitle>
      <p className="text-sm text-muted-foreground">
        O widget preenche automaticamente:
      </p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li><strong>Solicitante</strong> — Seu nome e e-mail</li>
        <li><strong>Localização</strong> — Módulo e tela onde você está no momento</li>
        <li><strong>Perfil</strong> — Seu tipo de acesso (badge colorido)</li>
      </ul>

      <SubTitle>3. Classificar o Problema</SubTitle>
      <p className="text-sm text-muted-foreground">
        Selecione o <strong>tipo do problema</strong> (obrigatório):
      </p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li><strong>Bug / Erro</strong> — Algo não funciona como deveria</li>
        <li><strong>Dúvida</strong> — Precisa de ajuda para usar uma funcionalidade</li>
        <li><strong>Sugestão</strong> — Tem uma ideia de melhoria</li>
        <li><strong>Problema Técnico</strong> — Sistema lento, tela travada, erro de carregamento</li>
        <li><strong>Financeiro</strong> — Questões sobre cobrança, plano, pagamento</li>
        <li><strong>Outro</strong> — Qualquer outro assunto</li>
      </ul>

      <p className="text-sm text-muted-foreground mt-3">
        Defina a <strong>prioridade</strong> e o <strong>impacto operacional</strong> para ajudar a equipe a priorizar corretamente.
      </p>

      <SubTitle>4. Descrever o Problema</SubTitle>
      <p className="text-sm text-muted-foreground">
        Preencha o <strong>título</strong> (resumo curto e claro) e a <strong>descrição</strong> (o que você estava fazendo, o que aconteceu, o que deveria ter acontecido).
      </p>

      <SubTitle>5. Adicionar Evidências (opcional)</SubTitle>
      <p className="text-sm text-muted-foreground">
        O widget oferece 4 formas de adicionar imagens como evidência:
      </p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li><strong>Selecionar Elemento</strong> — Clique no ícone de mira, passe o mouse sobre o elemento com problema e clique para capturar automaticamente</li>
        <li><strong>Anexar Imagem</strong> — Selecione uma imagem do computador</li>
        <li><strong>Screenshot</strong> — Capture a tela inteira ou uma janela</li>
        <li><strong>Colar (Ctrl+V)</strong> — Cole uma imagem da área de transferência</li>
      </ul>
      <WarningBox>
        Máximo de <strong>3 imagens</strong> por ticket. O contador mostra quantas já foram adicionadas.
      </WarningBox>

      <SubTitle>6. Enviar o Ticket</SubTitle>
      <StepList steps={[
        'Confira todas as informações preenchidas',
        'Clique no botão "Enviar Ticket"',
        'Aguarde o envio (o botão mostrará "Enviando...")',
        'Uma tela de confirmação aparecerá: "Ticket Enviado!"',
        'O widget será minimizado automaticamente após 2 segundos',
      ]} />
      <InfoBox>
        O botão "Enviar Ticket" só fica habilitado quando os 3 campos obrigatórios estão preenchidos: <strong>Tipo</strong>, <strong>Título</strong> e <strong>Descrição</strong>.
      </InfoBox>

      <SectionTitle>Controles da Janela</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-semibold text-foreground">Controle</th>
              <th className="text-left py-2 font-semibold text-foreground">Ação</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Arrastar pelo cabeçalho</td>
              <td className="py-2">Move a janela para outra posição</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Botão minimizar (—)</td>
              <td className="py-2">Minimiza/expande a janela</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Botão fechar (X)</td>
              <td className="py-2">Fecha o widget e limpa o formulário</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Cantos inferiores</td>
              <td className="py-2">Arraste para redimensionar (min: 320x400, max: 600x800)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>Dicas</SectionTitle>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
        <li><strong>Seja específico no título</strong> — Ajuda a equipe a priorizar e resolver mais rápido</li>
        <li><strong>Sempre adicione evidências</strong> — Uma imagem vale mais que mil palavras</li>
        <li><strong>Use o Seletor de Elemento</strong> — É a forma mais precisa de mostrar onde está o problema</li>
        <li><strong>Use Ctrl+V</strong> — Se já tirou um print screen, basta colar direto no widget</li>
        <li><strong>Descreva os passos para reproduzir</strong> — "Cliquei em X, depois em Y, e apareceu o erro Z"</li>
        <li>O widget detecta automaticamente em qual tela e módulo você está</li>
        <li>Mova o botão se ele estiver atrapalhando sua visualização</li>
      </ul>
    </div>
  );
}
