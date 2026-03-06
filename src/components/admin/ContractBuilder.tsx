import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Printer,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Send,
  PenTool,
  ArrowLeft,
  Package,
  Settings,
  FileCheck,
  Zap,
  CreditCard,
  QrCode,
  Receipt,
  Landmark,
  Info,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Scale,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Tipos
interface Module {
  id: string;
  name: string;
  version: string;
  purpose: string;
  mode: string;
  features: string;
}

interface Clausula {
  id: string;
  numero: string;
  titulo: string;
  conteudo: string;
  ordem: number;
}

interface ContractData {
  // Cliente
  clientName: string;
  clientCnpj: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientCep: string;
  clientRepresentative: string;
  clientEmail: string;
  clientPhone: string;
  
  // Descrição/Observação (após partes contratantes)
  introDescription: string;
  
  // Sistema
  systemName: string;
  systemModel: string;
  
  // Módulos
  modules: Module[];
  
  // Valores
  implantationValue: number;
  cashValue: number;
  cashText: string;
  threeXValue: number;
  threeXText: string;
  leaseValue: number;
  leaseText: string;
  postLicenseValue: number;
  postLicenseIncludes: string;
  postRuleCash: string;
  postRuleLease: string;
  
  // Pagamento selecionado
  paymentSelected: 'cash' | '3x' | 'lease';
  paymentMethod: 'pix' | 'boleto' | 'cartao' | 'gateway';
  paymentNote: string;
  
  // Metadados
  contractId: string;
  contractStatus: 'Rascunho' | 'Enviado' | 'Assinado' | 'Cancelado';
  validDays: number;
  foro: string;
  extraNotes: string;
  
  // Auditoria
  createdBy: string;
  createdAt: string;
  sentAt: string;
  signedAt: string;
  
  // Assinatura
  signatureName: string;
  signatureCpf: string;
  signatureAccepted: boolean;
}

interface EmpresaLead {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface ContractBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId?: string;
  cardData?: {
    id: string;
    titulo: string;
    cliente_nome?: string;
    cliente_email?: string;
    cliente_telefone?: string;
    cliente_empresa?: string;
    valor?: number;
    valor_a_vista?: number;
    valor_3x?: number;
    valor_leasing?: number;
    forma_pagamento?: string;
    responsavel_nome?: string;
    empresa_lead_id?: string;
    dados_orcamento?: any;
    dados_proposta?: any;
    dados_custo_mensal?: any;
  };
}

const LICENCIANTE = {
  name: 'TORIQ TECNOLOGIA EM SISTEMAS LTDA',
  cnpj: '52.254.196/0001-44',
  address: 'Rua Prudente de Moraes, 235, Centro, São João da Boa Vista/SP - CEP 13870-050',
};

const DEFAULT_MODULES: Module[] = [
  {
    id: '1',
    name: 'TORIQ TRAIN',
    version: 'v1.0',
    purpose: 'Gestão de treinamentos normativos, controle de validade e evidências.',
    mode: 'Cliente direto',
    features: '- Planejamento de treinamentos\n- Controle de vencimentos/reciclagens\n- Evidências para auditoria\n- Relatórios e indicadores\n- Certificados e turmas',
  },
  {
    id: '2',
    name: 'TORIQ CORP',
    version: 'v1.0',
    purpose: 'Gestão interna da empresa de SST (comercial, admin, financeiro e operação).',
    mode: 'Cliente direto',
    features: '- Funil e propostas\n- Agenda e entregas\n- Financeiro e cobrança\n- Gestão de clientes\n- Indicadores',
  },
];

const DEFAULT_CLAUSULAS: Clausula[] = [
  {
    id: 'c1',
    numero: '1',
    titulo: 'OBJETO DO CONTRATO',
    conteudo: `1.1. O presente contrato tem como objeto a concessão de LICENÇA VITALÍCIA DE USO, não exclusiva, intransferível e onerosa, do(s) sistema(s) modular(es) da TORIQ SST ou "Solução", incluindo seus respectivos módulos, funcionalidades e escopos adquiridos, conforme descrito na aba "Módulos" deste instrumento.

1.2. A licença concedida permite à LICENCIADA utilizar o sistema para fins internos e/ou comerciais, de acordo com as funcionalidades descritas neste instrumento, respeitadas as limitações deste contrato.

1.3. A vitaliciedade da Licença de Uso está vinculada ao fato do seu pagamento ser efetuado uma única vez pela Licenciada, pelo valor e forma de pagamento definidos neste termo, porém o espaço de armazenamento do banco de dados e hospedagem, deverão ser pagas mensalmente pela Licenciada, cujo adimplemento é condição essencial para a disponibilidade da licença de uso e a execução do contrato pela Licenciadora.`,
    ordem: 1,
  },
  {
    id: 'c2',
    numero: '2',
    titulo: 'NATUREZA E VEDAÇÕES DA LICENÇA',
    conteudo: `2.1. A licença de uso concedida é vitalícia, condicionada ao cumprimento integral das obrigações contratuais e ao pagamento das mensalidades definidas na cláusula 6.

2.2. A licença não implica:
• cessão de propriedade intelectual;
• acesso ao código-fonte;

2.3. O sistema permanece como ativo intelectual exclusivo da TORIQ, protegido pela legislação brasileira de direitos autorais e propriedade intelectual.

2.4. A Licenciada (a) não poderá reproduzir, traduzir, decompor, recompor, derivar, alterar ou utilizar técnicas de engenharia reversa nas funcionalidades, código e estrutura do Sistema, bem como (b) não poderá reproduzir, decompor, recompor ou derivar a aparência, padrões de usabilidade e de interação (trade dress) da Solução, ou ainda (c) não poderá praticar qualquer outra tentativa de violar esse Contrato, os direitos autorais do Sistema, dos programas e dos serviços ofertados pela Licenciadora ou por terceiros pela Solução. Qualquer tentativa de violar os direitos autorais, os programas e os serviços previstos nesse Termo implicará na imediata suspensão e cancelamento de quaisquer direitos que a Licenciada e seus Usuários tenham sobre a Licença, sem prejuízo das perdas e danos.

2.5. A Licenciada não poderá alugar, revender, sublocar, arrendar, emprestar, compartilhar, sublicenciar, ceder ou de qualquer outra forma transferir a Licença e quaisquer dos serviços associados para terceiros, incluindo logins simultâneos. A Licenciada deverá obedecer as condições deste contrato, bem como fazer com que os Usuários a ela vinculados o obedeçam.

2.6. A Licença de uma Licenciada que seja pessoa jurídica poderá ser transferida para uma outra pessoa jurídica apenas nos seguintes casos: (i) incorporação com extinção da personalidade jurídica da Licenciada original, fusão ou cisão da Licenciada. No caso de cisão, apenas uma das pessoas jurídicas envolvidas poderá permanecer com ou receber a Licença, conforme o caso; e (ii) transferência para terceiros mediante aprovação prévia por escrito da Licenciadora. Não são admitidas transferências parciais ou cisão de Licenças. Caso a Licença de uma Licenciada seja iniciada em nome de uma pessoa física por pendência na criação da pessoa jurídica, a Licenciada poderá transferir, em até 120 dias, a Licença, para a futura pessoa jurídica em formação. Em qualquer hipótese de transferência da Licença, devem ser transferidos também todos os direitos e obrigações referentes a este Contrato.

2.7. A licença de uso é um serviço de acesso e uso da Solução. A Licenciada não adquire titularidade ou qualquer outro direito sobre os programas sob os quais rodam os serviços da Solução além dos expressamente previstos neste Contrato. Este Contrato não outorga à Licenciada direitos de qualquer natureza sobre as patentes, propriedade intelectual, direitos autorais, know-how ou sobre as quaisquer marcas comerciais ou serviços da Licenciadora além das Licenças aqui estabelecidas.

2.8. A Licenciada deverá utilizar a Solução e qualquer serviço associado à Solução apenas para seus propósitos comerciais normais e não deverá: (a) enviar spam ou mensagens não solicitadas para outros clientes da Licenciadora no contexto de qualquer fórum de compartilhamento de informações, experiência ou conteúdo, sejam esses fóruns disponibilizados pela Licenciadora dentro ou fora da Solução; (b) enviar, arquivar ou utilizar conteúdo que contenha vírus de computador, worms, trojan horses ou qualquer outro tipo de arquivo, código ou script com finalidade maliciosa, mesmo que esse conteúdo não seja compartilhado com terceiros; e (c) de qualquer forma ganhar acesso não autorizado ao Sistema ou a seus serviços e rede. Além disso, a Licenciada não poderá usar qualquer serviço pela Internet associado ao Sistema que possa danificar, desativar, sobrecarregar, permitir acesso não autorizado ou prejudicar o acesso ao servidor da Licenciadora ou que possa interferir no seu uso ou aproveitamento por outros licenciados.

2.9. Essa é uma Licença para uso de sistemas web para uso comercial de empresas e outros profissionais, no contexto de uma atividade profissional. Ele não é destinado ao uso por consumidores em atividades não comerciais.

2.10. A Licenciada não permitirá que qualquer terceiro viole qualquer obrigação desse Contrato, direta ou indiretamente, nem se envolver com tal violação ou auxiliar qualquer terceiro nesse sentido.

2.11. A Solução precisa de acesso constante à internet para poder ser usada. A Licenciadora não se responsabiliza pelo serviço de acesso à Internet da Licenciada, bem como seu funcionamento e manutenção.`,
    ordem: 2,
  },
  {
    id: 'c3',
    numero: '3',
    titulo: 'MODELO WHITE LABEL',
    conteudo: `3.1. Modelo White Label, a LICENCIADA poderá:
• utilizar sua própria marca, logotipo e identidade visual;
• divulgar o sistema como solução própria, observada cláusula 2.

3.2. É expressamente vedado à LICENCIADA:
• reivindicar autoria ou propriedade do software;
• revender, sublicenciar ou transferir o sistema a terceiros sem autorização formal da TORIQ.`,
    ordem: 3,
  },
  {
    id: 'c4',
    numero: '4',
    titulo: 'IMPLEMENTAÇÃO E ENTREGA',
    conteudo: `4.1. A implementação seguirá o escopo descrito neste instrumento, podendo incluir:
• parametrização;
• configuração inicial;
• treinamento;
• entrega do ambiente produtivo.`,
    ordem: 4,
  },
  {
    id: 'c5',
    numero: '5',
    titulo: 'REMUNERAÇÃO E CONDIÇÕES COMERCIAIS',
    conteudo: `5.1. O licenciamento da TORIQ SST está vinculado ao pagamento do valor de aquisição da Licença (pago uma única vez pela Licenciada) e ao pagamento mensal de armazenamento do banco de dados e hospedagem do sistema.

5.2. Os valores referentes à licença vitalícia, bem como aos valores mensais de banco de dados, atualizações e hospedagem, forma de pagamento (à vista, parcelado ou leasing); implantação (se houver); estão descritos nas condições comerciais deste instrumento.

5.3. O inadimplemento pela Licenciada autoriza a TORIQ a suspender o acesso ao sistema até regularização.

5.4. O atraso no pagamento dos valores ajustados implicará no acréscimo de juros de mora de 1%, calculado pro rata die, além de correção monetária pelo IGP-M e multa contratual de 2% sobre o débito.

5.5. Rescindido o contrato por violação ou inadimplemento da Licenciada, os valores pagos até a data de rescisão serão considerados integralmente para fins de custear o licenciamento até a referida data, inexistindo por parte da Licenciadora o dever de restituir ou indenizar.`,
    ordem: 5,
  },
  {
    id: 'c6',
    numero: '6',
    titulo: 'MANUTENÇÃO, SUPORTE, INFRA E ATUALIZAÇÕES',
    conteudo: `6.1. Os valores mensais de manutenção devidos pela Licenciada estão vinculados à execução, pela Licenciadora, dos serviços de:
• hospedagem e infraestrutura;
• banco de dados (espaço de armazenamento conforme condições comerciais);
• suporte técnico;

6.2. As condições, valores e início da cobrança do Pós-Licença constam nas condições comerciais deste instrumento.

6.3. A Licenciada poderá abrir chamado de suporte através dos canais oficiais dentro da Solução, que vinculará a Licenciadora em seu atendimento.

6.4. O acesso à Solução será feito por meio da internet, garantindo a Licenciadora o funcionamento do sistema 24 horas por dia, sete dias por semana por pelo menos 99,5% (noventa e nove e meio por cento) do tempo. A Licenciadora não se responsabiliza pelo serviço de acesso à internet da Licenciada. Caso ocorram interrupções atribuíveis à Licenciadora que cortem a transmissão e impeçam o upload de informações dos Usuários para o servidor e o download do servidor para os Usuários, esta interrupção não poderá exceder 24 (vinte e quatro) horas, não cumulativas. Caso ocorram interrupções atribuíveis à Licenciadora que excedam 24 (vinte e quatro) horas, não cumulativas, serão concedidos descontos aplicados ao valor mensal pago pela Licenciada, mediante cômputo de um crédito que será calculado de acordo com a seguinte fórmula: Vd = VL x 5N/720. Onde Vd = Valor do desconto, VL = Valor da Assinatura do mês respectivo, N = Quantidade de unidades, em períodos de 24 horas, observada tabela de SLA de suporte da cláusula 6.3.

6.5. Não estão sujeitas ao cômputo das horas o período de disponibilidade vinculado à suspensão em caso de atualizações (update e upgrade).`,
    ordem: 6,
  },
  {
    id: 'c7',
    numero: '7',
    titulo: 'ATUALIZAÇÕES E EVOLUÇÕES',
    conteudo: `7.1. Atualizações corretivas para solucionar problemas do sistema estarão disponíveis enquanto vigente o Pós-Licença, nos termos das condições comerciais deste instrumento.

7.2. Atualizações evolutivas não entram no valor pago da licença e nem mesmo no valor pós licença, todas atualizações de novas funcionalidades serão informadas dentro do sistema, ficando a cargo do licenciado adquirir ou não essas atualizações.

7.3. Novos módulos ou funcionalidades não previstas neste instrumento deverão ser comercializados separadamente, em contratos próprios.

7.4. A solicitação de novas funcionalidades pela Licenciada dependerá de análise de viabilidade pela Licenciadora, cuja criação e implementação será feita de acordo com seu exclusivo entendimento sobre a viabilidade e conveniência, que deverá ser objeto de proposta comercial e contrato próprios, nos termos da cláusula 7.3.

7.5. O sistema tem API aberta para possíveis integrações, que deverão ser comercializados separadamente, em contratos próprios.`,
    ordem: 7,
  },
  {
    id: 'c8',
    numero: '8',
    titulo: 'LIMITAÇÕES DE RESPONSABILIDADE',
    conteudo: `8.1. A TORIQ não se responsabiliza por:
• mau uso do sistema;
• dados inseridos pela LICENCIADA;
• decisões operacionais ou jurídicas tomadas com base no sistema.

8.2. O Uso da TORIQ SST não afasta a obrigação da Licenciada em ter backup de controle externo de suas informações e compromissos vinculados à segurança ocupacional, não sendo a solução fonte exclusiva de agendamentos, controle e monitoramento, motivo pelo qual a TORIQ não se responsabiliza pelas informações, prazos, dados, agendamentos, cadastros, veracidade/validade de informações cadastradas pela Licenciada.

8.3. A Licenciada tem responsabilidade única e exclusiva pela qualidade, integridade, confiabilidade e propriedade intelectual dos dados e do conteúdo por ela criado ou manipulado durante o uso da Solução. A Licenciadora não monitora e não tem qualquer responsabilidade ou obrigação de supervisionar, deletar, corrigir ou suspender o acesso ao conteúdo gerado pela Licenciadora e seus Usuários.

8.4. A Licenciadora poderá coletar informações transmitidas pelos Usuários, por exemplo, quando um Usuário se cadastra em uma conta ou sessão. Dados Pessoais nunca serão compartilhados com terceiros.

8.5. A Licenciadora pode coletar dados em uma forma que não seja possível uma associação ou referência direta entre o dado e o Usuário ou entre o dado e o caso concreto gerido (dados anônimos). São informações sobre padrões gerais de uso, acompanhamento e decisão, que somente podem ser usados de maneira agregada para análise estatística. Os dados coletados serão sempre anônimos.

8.6. A Licenciada será responsável pelos encargos trabalhistas, previdenciários, fiscais e comerciais dos seus empregados. Para todos os efeitos legais e contratuais, não há qualquer vínculo empregatício entre os empregados de uma Parte em relação à outra.`,
    ordem: 8,
  },
  {
    id: 'c9',
    numero: '9',
    titulo: 'CONFIDENCIALIDADE E LGPD',
    conteudo: `9.1. As partes comprometem-se a manter sigilo sobre informações técnicas, comerciais e estratégicas trocadas em razão deste contrato.

9.2. As condições gerais de confidencialidade e tratamento de dados protegidos pela Lei Geral de Proteção de Dados (N.D.A.) poderão ser tratadas em documento autônomo, que prevalecerá sobre a cláusula 14 deste termo. Na ausência de N.D.A., ficam estabelecidas as condições mínimas através desta cláusula: A Licenciadora poderá receber Informações Confidenciais da Licenciada relacionada com informações, casos e/ou de negócios de clientes. A Licenciadora concorda que todas as Informações Confidenciais da Licenciada serão mantidas em estrito sigilo e não serão reveladas a terceiros sem o consentimento expresso da Licenciada. A manutenção deste sigilo deverá perdurar indefinidamente, mesmo após o término deste Contrato.

9.3. Por Informação Confidencial deve ser entendida toda e qualquer informação, escrita ou verbal, (i) protegida por lei; (ii) referente aos documentos, clientes, e pessoas envolvidas; e (iii) referente à situação financeira e rotinas da Licenciada/Licenciadora.

9.4. A obrigação aqui descrita não alcançará qualquer informação que: (i) esteja, ou venha estar acessível ao público em geral sem que haja violação das obrigações de confidencialidade estabelecidas neste Contrato; (ii) tenha sua divulgação autorizada pelo detentor original e legítimo da informação; (iii) tenha sido validamente obtida de terceiros; (iv) já seja do conhecimento da Licenciadora antes de sua revelação pela Licenciada; e/ou (v) a Licenciadora seja compelida a revelar por força de Lei. Neste último caso a Licenciadora deverá imediatamente avisar a Licenciada para que a esta seja dada a oportunidade de se opor à revelação. Caso a oposição da Licenciada não seja aceita, a Licenciadora somente poderá revelar as informações na exata medida exigida pela Lei.

9.5. Caso existam quaisquer atividades relacionadas ao tratamento de dados pessoais ("tratamento de dados"), a LICENCIANTE e LICENCIADA obrigam-se a cumprir todas as normas vigentes relativas à proteção de dados pessoais, especialmente, mas não se limitando, à Lei Federal nº 13.709/2018 - Lei Geral de Proteção de Dados, empenhando-se em proceder ao tratamento de dados pessoais no estrito e rigoroso cumprimento do ordenamento jurídico vigente.

9.6. A Licenciante possui atuação como mera operadora de dados, através dos quais, quando aplicável, disponíveis ou disponibilizados pela Licenciada, serão processados com o único fim de utilização da Solução pela Licenciada vinculados ao objeto do Contrato, ou seja, correspondente à execução da Solução em benefício da Licenciada. Não há armazenamento ou utilização de quaisquer dados pessoais ou sensíveis em prol da Licenciante.

9.7. Fica determinado que a Licenciante não coletará, armazenará ou realizará qualquer tipo de tratamento de dados posterior ao período acordado neste instrumento, salvo se firmado o contrato principal. Desse modo, fica vedado qualquer tipo de armazenamento, mesmo que de forma anonimizada.

9.8. A Licenciante compromete-se a atender aos padrões mínimos de segurança da informação, sobretudo, quanto às suas ferramentas tecnológicas, salvaguardando a confidencialidade, a integridade e a disponibilidade de eventuais dados pessoais tratados, especialmente os que puderem ser enquadrados como dados sensíveis, bem como deverá implementar medidas técnicas e organizativas necessárias para proteger os dados contra a destruição, acidental ou ilícita, a perda, a alteração, a difusão, o acesso não autorizado ou contra qualquer outra forma de tratamento ilícito dos mesmos.

9.9. As Partes deverão cooperar mutuamente, no limite de suas atividades e responsabilidades como agentes de tratamento, com o cumprimento das obrigações relacionadas ao exercício dos direitos dos titulares dos dados pessoais, bem como, em caso de solicitações impostas por qualquer autoridade fiscalizadora competente, de acordo com as leis e regulamentos aplicáveis.

9.10. Caso a Licenciante ou Licenciada identifiquem a ocorrência de um incidente de segurança que afete os dados transmitidos, deverão notificar-se por escrito, em até 48 (quarenta e oito) horas, pelos canais oficiais de comunicação estabelecidos.

9.11. A Parte que comprovadamente concorrer para o incidente de segurança deverá indenizar, defender e isentar a parte prejudicada contra toda e qualquer responsabilidade, perda, reivindicação, dano, multa, penalidade, despesa (incluindo, sem limitação, multas, indenização por danos, custos dos esforços de reparação e honorários advocatícios e custos decorrentes de ou relacionados a qualquer ação, reivindicação ou alegação de terceiros - incluindo, sem limitação, qualquer autoridade reguladora ou governamental) que decorrer do não cumprimento deste instrumento ou das leis e regulamentos aplicáveis.`,
    ordem: 9,
  },
  {
    id: 'c10',
    numero: '10',
    titulo: 'RESCISÃO',
    conteudo: `10.1. O contrato poderá ser rescindido por descumprimento contratual pela Licenciada, seja por violação das obrigações previstas neste instrumento quanto pela inadimplência das obrigações financeiras nele definidas.

10.2. A mora superior a 3 mensalidades de manutenção implicará em descumprimento contratual e suspensão motivada e imediata da licença de uso da Solução.`,
    ordem: 10,
  },
  {
    id: 'c11',
    numero: '11',
    titulo: 'GARANTIA',
    conteudo: `11.1. A licenciadora se compromete a manter o padrão de compra de licença vitalícia, e não se render ao padrão convencional de comercialização mensal do sistema. Como forma de garantia a licenciadora se compromete a pagar o valor comercializado e pago pela licenciada, caso isso venha a acontecer.

11.2. Caso a Licenciadora deixe de existir por encerramento voluntário ou involuntário de suas atividades econômicas, e não haja outra empresa por ela indicada que venha a lhe substituir na condição de Licenciadora, seja por meio de venda, fusão ou cisão empresarial ou outro meio legalmente autorizado, que viabilize a manutenção deste contrato e, estando a Licenciada em dia com suas obrigações financeiras vinculadas, obriga-se a Licenciadora a disponibilizar à Licenciada o código-fonte da Solução, que poderá utilizá-lo da forma que julgar conveniente.`,
    ordem: 11,
  },
  {
    id: 'c12',
    numero: '12',
    titulo: 'FORO',
    conteudo: `12.1. Fica eleito o foro da comarca de São João da Boa Vista/SP, com renúncia de qualquer outro, por mais privilegiado que seja.

Assinam as partes o presente instrumento em 2 (duas) vias de igual teor.`,
    ordem: 12,
  },
];

function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function generateContractId(): string {
  const year = new Date().getFullYear();
  const storageKey = `toriq_contract_counter_${year}`;
  
  // Buscar contador atual do ano
  let counter = parseInt(localStorage.getItem(storageKey) || '0', 10);
  counter += 1;
  
  // Salvar novo contador
  localStorage.setItem(storageKey, counter.toString());
  
  // Formatar número com zeros à esquerda (4 dígitos)
  const formattedNumber = counter.toString().padStart(4, '0');
  
  return `TQ-${year}-${formattedNumber}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return '—';
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '—';
  }
}

function nowISOLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function addDays(dateStr: string, days: number): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const PAGE_W = 595;
const PAGE_H = 842;
const PAGE_PAD = 40;
const FOOTER_H = 28;
const USABLE_H = PAGE_H - PAGE_PAD * 2 - FOOTER_H;
const BLOCK_GAP = 16;

function ContractPaginatedPreview({ contractId, children }: { contractId: string; children: React.ReactNode }) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const src = sourceRef.current;
    const dest = pagesRef.current;
    if (!src || !dest) return;

    // Wait for browser to layout the hidden source
    const raf = requestAnimationFrame(() => {
      const blocks = Array.from(src.children) as HTMLElement[];
      if (blocks.length === 0) return;

      // Measure each block height
      const heights = blocks.map(b => b.getBoundingClientRect().height);

      // Distribute blocks into pages (greedy: fill until doesn't fit)
      const pageGroups: number[][] = [];
      let currentPage: number[] = [];
      let usedHeight = 0;

      heights.forEach((h, i) => {
        const isPageBreak = blocks[i].hasAttribute('data-page-break');
        // Forçar nova página se marcado com data-page-break
        if (isPageBreak && currentPage.length > 0) {
          pageGroups.push(currentPage);
          currentPage = [];
          usedHeight = 0;
        }
        // Pular elementos de page-break (são invisíveis)
        if (isPageBreak) return;
        const needed = currentPage.length > 0 ? h + BLOCK_GAP : h;
        if (usedHeight + needed > USABLE_H && currentPage.length > 0) {
          pageGroups.push(currentPage);
          currentPage = [i];
          usedHeight = h;
        } else {
          currentPage.push(i);
          usedHeight += needed;
        }
      });
      if (currentPage.length > 0) pageGroups.push(currentPage);

      // Build page DOM
      dest.innerHTML = '';
      const totalPages = pageGroups.length;

      pageGroups.forEach((indices, pi) => {
        const page = document.createElement('div');
        page.style.cssText = `width:${PAGE_W}px;min-height:${PAGE_H}px;background:white;box-shadow:0 4px 20px rgba(0,0,0,0.15);border-radius:2px;padding:${PAGE_PAD}px;padding-bottom:${PAGE_PAD + FOOTER_H}px;position:relative;box-sizing:border-box;font-size:12px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;`;

        const content = document.createElement('div');
        content.style.cssText = `display:flex;flex-direction:column;gap:${BLOCK_GAP}px;`;

        indices.forEach(ci => {
          const clone = blocks[ci].cloneNode(true) as HTMLElement;
          content.appendChild(clone);
        });

        page.appendChild(content);

        // Footer
        const footer = document.createElement('div');
        footer.style.cssText = 'position:absolute;bottom:12px;left:40px;right:40px;border-top:1px solid #e5e5e5;padding-top:4px;display:flex;justify-content:space-between;font-size:9px;color:#999;';
        footer.innerHTML = `<span>Contrato ${contractId}</span><span>Página ${pi + 1} de ${totalPages}</span>`;
        page.appendChild(footer);

        dest.appendChild(page);
      });
    });

    return () => cancelAnimationFrame(raf);
  });

  return (
    <div className="flex-1 overflow-hidden relative">
      {/* Hidden source for measurement */}
      <div
        ref={sourceRef}
        id="contract-preview-content"
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          width: PAGE_W - PAGE_PAD * 2,
          fontSize: 12,
          lineHeight: '1.6',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          gap: BLOCK_GAP,
        }}
      >
        {children}
      </div>

      {/* Visible paginated pages */}
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{ background: '#e5e7eb', padding: 24 }}
      >
        <div
          ref={pagesRef}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
        />
      </div>
    </div>
  );
}

export function ContractBuilder({ isOpen, onClose, empresaId, cardData }: ContractBuilderProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  
  const [contract, setContract] = useState<ContractData>({
    clientName: '',
    clientCnpj: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    clientCep: '',
    clientRepresentative: '',
    clientEmail: '',
    clientPhone: '',
    introDescription: 'A solução TORIQ SST é uma plataforma SaaS modular para gestão de Segurança e Saúde do Trabalho (SST). Desenvolvida para empresas de consultoria, assessorias, clínicas ocupacionais, empresas de treinamentos e diversas outras empresas do segmento de Saúde e Segurança do Trabalho, oferece ferramentas (módulos) integradas para: gestão empresarial, treinamentos, EPIs, elaboração de documentações (PGR, PCMSO, LTCAT), AET e AEP, Avaliação dos Riscos Psicossociais, Gestão da Saúde Ocupacional, Gestão de Espaço Confinado e elaboração e gestão de diversos documentos como Check list, Permissão de Trabalho, APR e Relatório de Inspeções, tudo podendo ser interligado ou separado para atender melhor os clientes desses segmentos empresariais.',
    systemName: 'TORIQ',
    systemModel: 'Cliente direto (uso interno)',
    modules: [...DEFAULT_MODULES],
    implantationValue: 2000,
    cashValue: 0,
    cashText: 'Condição especial à vista',
    threeXValue: 0,
    threeXText: '',
    leaseValue: 0,
    leaseText: '',
    postLicenseValue: 450,
    postLicenseIncludes: 'Infra + DB + backups + suporte + pacote de atualizações',
    postRuleCash: 'Inicia no mês seguinte à contratação (à vista ou até 3x).',
    postRuleLease: 'Inicia após a quitação do leasing/consórcio.',
    paymentSelected: '3x',
    paymentMethod: 'pix',
    paymentNote: '',
    contractId: generateContractId(),
    contractStatus: 'Rascunho',
    validDays: 10,
    foro: 'Comarca de São João da Boa Vista/SP',
    extraNotes: '',
    createdBy: '',
    createdAt: nowISOLocal(),
    sentAt: '',
    signedAt: '',
    signatureName: '',
    signatureCpf: '',
    signatureAccepted: false,
  });
  
  const [empresaLead, setEmpresaLead] = useState<EmpresaLead | null>(null);
  const [savedModules, setSavedModules] = useState<Module[]>([]);
  const [clausulas, setClausulas] = useState<Clausula[]>([...DEFAULT_CLAUSULAS]);
  const [editingClausula, setEditingClausula] = useState<string | null>(null);
  const [servicos, setServicos] = useState<{ id: string; nome: string; descricao: string | null }[]>([]);

  // Carregar serviços do Supabase
  useEffect(() => {
    if (!isOpen) return;
    const fetchServicos = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('servicos')
          .select('id, nome, descricao')
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        if (error) throw error;
        setServicos(data || []);
      } catch (e) {
        console.error('Erro ao carregar serviços:', e);
      }
    };
    fetchServicos();
  }, [isOpen]);

  // Carregar módulos salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('toriq_contract_modules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedModules(parsed);
      } catch (e) {
        console.error('Erro ao carregar módulos salvos:', e);
      }
    }
  }, []);

  // Carregar dados do card e empresa lead quando abrir
  useEffect(() => {
    const loadData = async () => {
      if (!isOpen || !cardData) return;

      // Carregar dados básicos do card
      const contractUpdate: Partial<ContractData> = {
        clientName: cardData.cliente_empresa || cardData.cliente_nome || '',
        clientRepresentative: cardData.cliente_nome || '',
        clientEmail: cardData.cliente_email || '',
        clientPhone: cardData.cliente_telefone || '',
        cashValue: cardData.valor_a_vista || cardData.valor || 0,
        threeXValue: cardData.valor_3x || cardData.valor || 0,
        leaseValue: cardData.valor_leasing || cardData.valor || 0,
        threeXText: cardData.valor_3x ? `3x de ${formatCurrency((cardData.valor_3x || 0) / 3)}` : '',
        cashText: cardData.valor_a_vista ? 'Condição especial à vista' : '',
        leaseText: cardData.valor_leasing ? `Leasing em parcelas` : '',
        paymentSelected: (cardData.forma_pagamento === 'a_vista' ? 'cash' : 
                         cardData.forma_pagamento === 'leasing' ? 'lease' : '3x') as 'cash' | '3x' | 'lease',
        createdBy: cardData.responsavel_nome || '',
        contractId: generateContractId(),
        createdAt: nowISOLocal(),
      };

      // Carregar dados do orçamento se existir (estrutura do CalculadoraLicencaVitalicia)
      if (cardData.dados_orcamento) {
        const orcamento = cardData.dados_orcamento;
        
        // Calcular custo de implantação somando implCost de todos os módulos
        if (orcamento.modulos && Array.isArray(orcamento.modulos)) {
          const totalImplantacao = orcamento.modulos.reduce((sum: number, mod: any) => sum + (mod.implCost || 0), 0);
          contractUpdate.implantationValue = Math.round(totalImplantacao * 100) / 100;
        }
        
        // Resultados do cálculo
        if (orcamento.resultados) {
          // Valor Cheio (3x) - arredondado
          if (orcamento.resultados.precoCheio) {
            contractUpdate.threeXValue = Math.round(orcamento.resultados.precoCheio * 100) / 100;
            contractUpdate.threeXText = `3x de ${formatCurrency(Math.round((orcamento.resultados.precoCheio / 3) * 100) / 100)}`;
          }
          // À Vista - arredondado
          if (orcamento.resultados.precoAVista) {
            contractUpdate.cashValue = Math.round(orcamento.resultados.precoAVista * 100) / 100;
            contractUpdate.cashText = 'Condição especial à vista';
          }
          // Leasing - arredondado
          if (orcamento.resultados.precoLeasing) {
            contractUpdate.leaseValue = Math.round(orcamento.resultados.precoLeasing * 100) / 100;
            contractUpdate.leaseText = 'Leasing em parcelas';
          }
          // Mensalidade Leasing - arredondado
          if (orcamento.resultados.mensalidadeLeasing && orcamento.leasing?.leaseMonths) {
            const mensalidadeArredondada = Math.round(orcamento.resultados.mensalidadeLeasing * 100) / 100;
            contractUpdate.leaseText = `${orcamento.leasing.leaseMonths}x de ${formatCurrency(mensalidadeArredondada)}`;
          }
        }
        
        // Fallback para estrutura antiga
        if (!orcamento.resultados) {
          contractUpdate.implantationValue = orcamento.implantacao || 2000;
          contractUpdate.postLicenseValue = orcamento.posLicenca || 450;
          if (orcamento.valorTotal) {
            contractUpdate.threeXValue = Math.round(orcamento.valorTotal * 100) / 100;
            contractUpdate.threeXText = `3x de ${formatCurrency(Math.round((orcamento.valorTotal / 3) * 100) / 100)}`;
          }
          if (orcamento.valorAVista) {
            contractUpdate.cashValue = Math.round(orcamento.valorAVista * 100) / 100;
          }
        }
      }

      // Carregar dados do custo mensal se existir (estrutura do CalculadoraCustoMensal)
      if (cardData.dados_custo_mensal) {
        const custoMensal = cardData.dados_custo_mensal;
        if (custoMensal.resultados?.precoSugerido) {
          contractUpdate.postLicenseValue = Math.round(custoMensal.resultados.precoSugerido * 100) / 100;
        }
      }

      // Carregar dados da proposta se existir
      if (cardData.dados_proposta) {
        const proposta = cardData.dados_proposta;
        if (proposta.valorTotal) {
          contractUpdate.threeXValue = proposta.valorTotal;
        }
        if (proposta.valorAVista) {
          contractUpdate.cashValue = proposta.valorAVista;
        }
        if (proposta.valorLeasing) {
          contractUpdate.leaseValue = proposta.valorLeasing;
        }
      }

      // Buscar dados da empresa lead se existir
      if (cardData.empresa_lead_id) {
        try {
          const { data: empresaData } = await (supabase as any)
            .from('empresas')
            .select('*')
            .eq('id', cardData.empresa_lead_id)
            .single();

          if (empresaData) {
            setEmpresaLead(empresaData as EmpresaLead);
            
            // Atualizar dados do cliente com informações da empresa
            contractUpdate.clientName = empresaData.nome || contractUpdate.clientName;
            contractUpdate.clientCnpj = empresaData.cnpj || '';
            contractUpdate.clientEmail = empresaData.email || contractUpdate.clientEmail;
            contractUpdate.clientPhone = empresaData.telefone || contractUpdate.clientPhone;
            contractUpdate.clientCity = empresaData.cidade || '';
            contractUpdate.clientState = empresaData.estado || '';
            contractUpdate.clientCep = empresaData.cep || '';
            
            // Montar endereço completo
            const enderecoParts = [
              empresaData.endereco,
              empresaData.numero,
              empresaData.complemento,
              empresaData.bairro,
            ].filter(Boolean);
            contractUpdate.clientAddress = enderecoParts.join(', ');
          }
        } catch (error) {
          console.error('Erro ao buscar empresa lead:', error);
        }
      }

      setContract(prev => ({ ...prev, ...contractUpdate }));
    };

    loadData();
  }, [isOpen, cardData]);

  const updateField = useCallback(<K extends keyof ContractData>(field: K, value: ContractData[K]) => {
    setContract(prev => ({ ...prev, [field]: value }));
  }, []);

  const addModule = useCallback(() => {
    const newModule: Module = {
      id: Math.random().toString(36).slice(2, 9),
      name: 'Novo Módulo',
      version: 'v1.0',
      purpose: '',
      mode: 'Cliente direto',
      features: '',
    };
    setContract(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
  }, []);

  const updateModule = useCallback((id: string, field: keyof Module, value: string) => {
    setContract(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === id ? { ...m, [field]: value } : m),
    }));
  }, []);

  const removeModule = useCallback((id: string) => {
    setContract(prev => ({
      ...prev,
      modules: prev.modules.filter(m => m.id !== id),
    }));
  }, []);

  const loadPreset = useCallback(() => {
    setContract(prev => ({ ...prev, modules: [...DEFAULT_MODULES] }));
    toast({ title: 'Preset carregado', description: 'Módulos TRAIN + CORP adicionados' });
  }, [toast]);

  const saveModulesAsDefault = useCallback(() => {
    localStorage.setItem('toriq_contract_modules', JSON.stringify(contract.modules));
    setSavedModules([...contract.modules]);
    toast({ title: 'Módulos salvos!', description: 'Os módulos atuais serão usados como padrão em futuros contratos.' });
  }, [contract.modules, toast]);

  const loadSavedModules = useCallback(() => {
    if (savedModules.length > 0) {
      setContract(prev => ({ ...prev, modules: [...savedModules] }));
      toast({ title: 'Módulos carregados', description: 'Módulos salvos anteriormente foram carregados.' });
    } else {
      toast({ title: 'Nenhum módulo salvo', description: 'Salve os módulos primeiro para poder carregá-los.', variant: 'destructive' });
    }
  }, [savedModules, toast]);

  // Funções para manipular cláusulas
  const addClausula = useCallback(() => {
    const maxOrdem = Math.max(...clausulas.map(c => c.ordem), 0);
    const newClausula: Clausula = {
      id: Math.random().toString(36).slice(2, 9),
      numero: `${clausulas.length + 1}`,
      titulo: 'NOVA CLÁUSULA',
      conteudo: 'Conteúdo da cláusula...',
      ordem: maxOrdem + 1,
    };
    setClausulas(prev => [...prev, newClausula]);
    setEditingClausula(newClausula.id);
    toast({ title: 'Cláusula adicionada' });
  }, [clausulas, toast]);

  const updateClausula = useCallback((id: string, field: keyof Clausula, value: string | number) => {
    setClausulas(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const removeClausula = useCallback((id: string) => {
    setClausulas(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Cláusula removida' });
  }, [toast]);

  const moveClausula = useCallback((id: string, direction: 'up' | 'down') => {
    setClausulas(prev => {
      const sorted = [...prev].sort((a, b) => a.ordem - b.ordem);
      const index = sorted.findIndex(c => c.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sorted.length) return prev;
      
      // Trocar ordens
      const tempOrdem = sorted[index].ordem;
      sorted[index].ordem = sorted[newIndex].ordem;
      sorted[newIndex].ordem = tempOrdem;
      
      return sorted;
    });
  }, []);

  const resetClausulas = useCallback(() => {
    setClausulas([...DEFAULT_CLAUSULAS]);
    toast({ title: 'Cláusulas restauradas', description: 'Cláusulas padrão foram restauradas.' });
  }, [toast]);

  const saveClausulasAsDefault = useCallback(() => {
    localStorage.setItem('toriq_contract_clausulas', JSON.stringify(clausulas));
    toast({ title: 'Cláusulas salvas!', description: 'As cláusulas atuais serão usadas como padrão.' });
  }, [clausulas, toast]);

  const loadSavedClausulas = useCallback(() => {
    const saved = localStorage.getItem('toriq_contract_clausulas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClausulas(parsed);
        toast({ title: 'Cláusulas carregadas' });
      } catch (e) {
        toast({ title: 'Erro ao carregar cláusulas', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Nenhuma cláusula salva', variant: 'destructive' });
    }
  }, [toast]);

  const markAsSent = useCallback(() => {
    setContract(prev => ({
      ...prev,
      sentAt: nowISOLocal(),
      contractStatus: 'Enviado',
    }));
    toast({ title: 'Contrato marcado como Enviado' });
  }, [toast]);

  const signContract = useCallback(() => {
    if (!contract.signatureName || !contract.signatureCpf || !contract.signatureAccepted) {
      toast({ 
        title: 'Assinatura incompleta', 
        description: 'Preencha Nome, CPF e marque o aceite.',
        variant: 'destructive' 
      });
      return;
    }
    setContract(prev => ({
      ...prev,
      signedAt: nowISOLocal(),
      contractStatus: 'Assinado',
    }));
    toast({ title: 'Contrato assinado com sucesso!' });
  }, [contract.signatureName, contract.signatureCpf, contract.signatureAccepted, toast]);

  // Salvar contrato no Supabase
  const handleSave = useCallback(async () => {
    if (!empresaId) {
      toast({ title: 'Erro', description: 'Empresa não identificada. Não é possível salvar.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Mapear forma de pagamento para o formato do banco
      const formaPagamento = contract.paymentSelected === 'cash' ? 'avista' : 
                             contract.paymentSelected === '3x' ? '3x' : 'leasing';
      
      // Mapear status para o formato do banco
      const statusMap: Record<string, string> = {
        'Rascunho': 'rascunho',
        'Enviado': 'enviado', 
        'Assinado': 'assinado',
        'Cancelado': 'cancelado',
      };

      const payload = {
        empresa_id: empresaId,
        numero: contract.contractId,
        tipo: 'cliente',
        razao_social: contract.clientName || null,
        cnpj: contract.clientCnpj || null,
        telefone: contract.clientPhone || null,
        endereco: contract.clientAddress || null,
        cidade: contract.clientCity || null,
        estado: contract.clientState || null,
        cep: contract.clientCep || null,
        email: contract.clientEmail || null,
        representante_legal: contract.clientRepresentative || null,
        valor_implantacao: contract.implantationValue || 0,
        valor_mensal: contract.postLicenseValue || 0,
        valor_avista: contract.cashValue || 0,
        texto_avista: contract.cashText || null,
        valor_3x: contract.threeXValue || 0,
        texto_3x: contract.threeXText || null,
        valor_leasing: contract.leaseValue || 0,
        texto_leasing: contract.leaseText || null,
        forma_pagamento: formaPagamento,
        meio_pagamento: contract.paymentMethod || 'pix',
        observacao_comercial: contract.paymentNote || null,
        validade_dias: contract.validDays || 10,
        foro: contract.foro || null,
        observacoes_adicionais: contract.extraNotes || null,
        criado_por: contract.createdBy || null,
        assinante_nome: contract.signatureName || null,
        assinante_cpf: contract.signatureCpf || null,
        assinado: contract.signatureAccepted || false,
        data_assinatura: contract.signedAt ? new Date(contract.signedAt).toISOString() : null,
        status: statusMap[contract.contractStatus] || 'rascunho',
      };

      let contratoId = savedContractId;

      if (contratoId) {
        // Atualizar contrato existente
        const { error } = await (supabase as any).from('contratos').update(payload).eq('id', contratoId);
        if (error) throw error;

        // Limpar cláusulas e módulos antigos
        await (supabase as any).from('contrato_clausulas').delete().eq('contrato_id', contratoId);
        await (supabase as any).from('contrato_modulos').delete().eq('contrato_id', contratoId);
      } else {
        // Inserir novo contrato
        const { data, error } = await (supabase as any).from('contratos').insert(payload).select().single();
        if (error) throw error;
        contratoId = data.id;
        setSavedContractId(data.id);
      }

      // Salvar cláusulas
      if (clausulas.length > 0) {
        const sortedClausulas = [...clausulas].sort((a, b) => a.ordem - b.ordem);
        const clausulasPayload = sortedClausulas.map((c, i) => ({
          contrato_id: contratoId,
          numero: parseInt(c.numero) || (i + 1),
          titulo: c.titulo,
          conteudo: c.conteudo,
          ordem: i,
        }));
        const { error: clausulasError } = await (supabase as any).from('contrato_clausulas').insert(clausulasPayload);
        if (clausulasError) throw clausulasError;
      }

      // Salvar módulos
      if (contract.modules.length > 0) {
        const modulosPayload = contract.modules.map((m, i) => ({
          contrato_id: contratoId,
          nome: m.name,
          versao: m.version || null,
          tipo_cliente: m.mode || null,
          descricao: m.purpose || null,
          itens: m.features ? m.features.split('\n').filter(Boolean) : [],
          ordem: i,
        }));
        const { error: modulosError } = await (supabase as any).from('contrato_modulos').insert(modulosPayload);
        if (modulosError) throw modulosError;
      }

      toast({ title: 'Contrato salvo com sucesso!', description: `Nº ${contract.contractId}` });
    } catch (error: any) {
      console.error('Erro ao salvar contrato:', error);
      toast({ title: 'Erro ao salvar contrato', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [empresaId, contract, clausulas, savedContractId, toast]);

  const copyContractText = useCallback(() => {
    const contractEl = document.getElementById('contract-preview-content');
    if (contractEl) {
      navigator.clipboard.writeText(contractEl.innerText);
      toast({ title: 'Contrato copiado!' });
    }
  }, [toast]);

  const printContract = useCallback(async () => {
    const contractEl = document.getElementById('contract-preview-content');
    if (!contractEl) {
      toast({ title: 'Erro ao gerar PDF', description: 'Elemento do contrato não encontrado.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Gerando PDF...', description: 'Aguarde enquanto o documento é preparado.' });

    try {
      const ML = 15, MR = 15, MT = 15, MB = 20;
      const PW = 210, PH = 297;
      const CW = PW - ML - MR;
      const CH = PH - MT - MB;
      const FOOTER_Y = PH - 7;
      const RENDER_W = 760;
      const SCALE = 2;

      // 1. Clone into off-screen wrapper — render each child as a separate block
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:99998;';
      document.body.appendChild(overlay);

      // Collect blocks: each direct child becomes a separate canvas
      const sourceChildren = Array.from(contractEl.children) as HTMLElement[];
      const blocks: { canvas: HTMLCanvasElement; isPageBreak: boolean }[] = [];

      for (const child of sourceChildren) {
        const isPageBreak = child.getAttribute('data-page-break') === 'true';
        if (isPageBreak) {
          blocks.push({ canvas: document.createElement('canvas'), isPageBreak: true });
          continue;
        }

        // Render each block individually
        const blockWrapper = document.createElement('div');
        blockWrapper.style.cssText = `position:absolute;top:0;left:0;width:${RENDER_W}px;padding:16px 24px;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#1a1a1a;z-index:99999;`;
        blockWrapper.appendChild(child.cloneNode(true));
        document.body.appendChild(blockWrapper);
        await new Promise(r => setTimeout(r, 50));

        const canvas = await html2canvas(blockWrapper, {
          scale: SCALE,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: RENDER_W,
          windowWidth: RENDER_W,
        });

        document.body.removeChild(blockWrapper);
        blocks.push({ canvas, isPageBreak: false });
      }

      document.body.removeChild(overlay);

      // 2. Place blocks on PDF pages
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pxPerMm = (RENDER_W * SCALE) / CW;
      const maxContentPx = Math.floor(CH * pxPerMm);
      let cursorY = 0; // current Y position on page in canvas-px
      let pageNum = 0;
      const pageStarts: number[] = []; // track pages for footer

      const startNewPage = () => {
        if (pageNum > 0) pdf.addPage();
        pageNum++;
        pageStarts.push(pageNum);
        cursorY = 0;
      };

      startNewPage();

      for (const block of blocks) {
        if (block.isPageBreak) {
          startNewPage();
          continue;
        }

        const blockH = block.canvas.height;
        const blockHmm = blockH / pxPerMm;

        // If block fits on current page, place it
        if (cursorY + blockH <= maxContentPx) {
          const yMm = MT + (cursorY / pxPerMm);
          pdf.addImage(
            block.canvas.toDataURL('image/jpeg', 0.85),
            'JPEG', ML, yMm, CW, blockHmm
          );
          cursorY += blockH;
        }
        // If block doesn't fit but would fit on a fresh page, start new page
        else if (blockH <= maxContentPx) {
          startNewPage();
          pdf.addImage(
            block.canvas.toDataURL('image/jpeg', 0.85),
            'JPEG', ML, MT, CW, blockHmm
          );
          cursorY = blockH;
        }
        // Block is taller than one page — slice it across multiple pages
        else {
          // Start on a fresh page if we already have content
          if (cursorY > 0) startNewPage();

          let srcY = 0;
          while (srcY < blockH) {
            if (srcY > 0) startNewPage();
            const sliceH = Math.min(maxContentPx, blockH - srcY);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = block.canvas.width;
            pageCanvas.height = sliceH;
            const ctx = pageCanvas.getContext('2d')!;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(block.canvas, 0, srcY, block.canvas.width, sliceH, 0, 0, block.canvas.width, sliceH);

            const sliceHmm = sliceH / pxPerMm;
            pdf.addImage(
              pageCanvas.toDataURL('image/jpeg', 0.85),
              'JPEG', ML, MT, CW, sliceHmm
            );
            cursorY = sliceH;
            srcY += sliceH;
          }
        }
      }

      // 3. Add footers to all pages
      const totalPgs = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPgs; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Contrato ${contract.contractId}`, ML, FOOTER_Y);
        pdf.text(`Página ${p} de ${totalPgs}`, PW - MR, FOOTER_Y, { align: 'right' });
        pdf.setDrawColor(220, 220, 220);
        pdf.line(ML, FOOTER_Y - 3, PW - MR, FOOTER_Y - 3);
      }

      const fileName = `Contrato_${contract.contractId}_${contract.clientName?.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
      pdf.save(fileName);
      toast({ title: 'PDF gerado com sucesso!', description: `Arquivo: ${fileName}` });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro ao gerar PDF', description: 'Ocorreu um erro ao gerar o documento.', variant: 'destructive' });
    }
  }, [contract.contractId, contract.clientName, toast]);

  // Valores calculados
  const paymentLabel = useMemo(() => {
    switch (contract.paymentSelected) {
      case 'cash': return 'À vista';
      case '3x': return 'Até 3x';
      case 'lease': return 'Leasing/Consórcio';
      default: return '—';
    }
  }, [contract.paymentSelected]);

  const chosenValue = useMemo(() => {
    switch (contract.paymentSelected) {
      case 'cash': return contract.cashValue;
      case '3x': return contract.threeXValue;
      case 'lease': return contract.leaseValue;
      default: return 0;
    }
  }, [contract.paymentSelected, contract.cashValue, contract.threeXValue, contract.leaseValue]);

  const chosenText = useMemo(() => {
    switch (contract.paymentSelected) {
      case 'cash': return contract.cashText;
      case '3x': return contract.threeXText;
      case 'lease': return contract.leaseText;
      default: return '';
    }
  }, [contract.paymentSelected, contract.cashText, contract.threeXText, contract.leaseText]);

  const validUntil = useMemo(() => {
    return addDays(contract.createdAt, contract.validDays);
  }, [contract.createdAt, contract.validDays]);

  const statusColor = useMemo(() => {
    switch (contract.contractStatus) {
      case 'Rascunho': return 'bg-gray-100 text-gray-700';
      case 'Enviado': return 'bg-blue-100 text-blue-700';
      case 'Assinado': return 'bg-green-100 text-green-700';
      case 'Cancelado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }, [contract.contractStatus]);

  // Label do meio de pagamento
  const paymentMethodLabel = useMemo(() => {
    switch (contract.paymentMethod) {
      case 'pix': return 'PIX';
      case 'boleto': return 'Boleto Bancário';
      case 'cartao': return 'Cartão de Crédito';
      case 'gateway': return 'Gateway de Pagamento';
      default: return '—';
    }
  }, [contract.paymentMethod]);

  // Renderizar preview do contrato
  const renderContractPreview = () => {
    // Montar endereço completo
    const fullAddress = [
      contract.clientAddress,
      contract.clientCity && contract.clientState 
        ? `${contract.clientCity}/${contract.clientState}` 
        : contract.clientCity || contract.clientState,
      contract.clientCep
    ].filter(Boolean).join(' - ') || '___________________________';

    const client = {
      name: contract.clientName || '___________________________',
      cnpj: contract.clientCnpj || '___________________________',
      address: fullAddress,
      rep: contract.clientRepresentative || '___________________________',
      email: contract.clientEmail || '___________________________',
      phone: contract.clientPhone || '___________________________',
    };

    // Ordenar cláusulas
    const sortedClausulas = [...clausulas].sort((a, b) => a.ordem - b.ordem);

    return (
      <>
        {/* Cabeçalho */}
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-bold uppercase">CONTRATO DE LICENÇA VITALÍCIA DE USO DE SOFTWARE</h2>
          <p className="text-muted-foreground mt-2">
            <strong>CONTRATO Nº:</strong> <code className="bg-muted px-2 py-1 rounded">{contract.contractId}</code>
          </p>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <span><strong>Data de emissão:</strong> {formatDate(contract.createdAt)}</span>
            <span><strong>Validade:</strong> até {formatDate(validUntil)}</span>
            <Badge className={statusColor}>{contract.contractStatus}</Badge>
          </div>
        </div>

        {/* Partes */}
        <div className="bg-muted/30 p-4 rounded-lg pdf-no-break">
          <h4 className="font-bold text-sm uppercase tracking-wide text-primary mb-3">PARTES CONTRATANTES</h4>
          <p className="mb-2"><strong>LICENCIANTE:</strong> {LICENCIANTE.name}, CNPJ nº {LICENCIANTE.cnpj}, com sede em {LICENCIANTE.address}, doravante denominada <strong>LICENCIANTE</strong> ou <strong>TORIQ</strong>.</p>
          <p><strong>LICENCIADA:</strong> {client.name}, CNPJ nº {client.cnpj}, com sede em {client.address}, neste ato representada por {client.rep}. Contato: {client.email} • {client.phone}.</p>
        </div>

        {/* Descrição/Observação */}
        {contract.introDescription && (
          <div className="text-sm text-muted-foreground italic leading-relaxed">
            <p>{contract.introDescription}</p>
          </div>
        )}

        {/* Cláusulas Dinâmicas */}
        {sortedClausulas.map((clausula) => (
          <div key={clausula.id} className="border-l-2 border-primary/30 pl-4 pdf-no-break">
            <h4 className="font-bold text-sm uppercase tracking-wide text-primary mb-2">
              {`CLÁUSULA ${clausula.numero} — ${clausula.titulo}`}
            </h4>
            <div className="whitespace-pre-wrap text-sm">
              {clausula.conteudo}
            </div>
          </div>
        ))}

        {/* Page break antes dos módulos */}
        {contract.modules.length > 0 && <div data-page-break="true" style={{ height: 0 }} />}

        {/* Módulos Contratados */}
        {contract.modules.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 pdf-no-break">
            <h4 className="font-bold text-sm uppercase tracking-wide text-blue-700 mb-3">MÓDULOS CONTRATADOS</h4>
            <div className="space-y-3">
              {contract.modules.map((mod, i) => (
                <div key={mod.id} className="border-b border-blue-100 pb-2 last:border-0 last:pb-0">
                  <p className="font-bold text-sm">{i + 1}. {mod.name} <span className="font-normal text-xs text-muted-foreground">({mod.version})</span></p>
                  {mod.purpose && <p className="text-xs text-muted-foreground mt-0.5">{mod.purpose}</p>}
                  {mod.mode && <p className="text-xs"><strong>Modelo:</strong> {mod.mode}</p>}
                  {mod.features && (
                    <div className="text-xs mt-1 whitespace-pre-wrap text-muted-foreground">{mod.features}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações de Pagamento Destacadas */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 pdf-no-break">
          <h4 className="font-bold text-sm uppercase tracking-wide text-green-700 mb-3">INVESTIMENTO</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Forma de pagamento:</strong> <span className="text-green-600 font-bold">{paymentLabel}</span></p>
              <p><strong>Valor:</strong> <span className="font-bold">{formatCurrency(chosenValue)}</span></p>
              {chosenText && <p className="text-xs text-muted-foreground">Condição: {chosenText}</p>}
            </div>
            <div>
              <p><strong>Meio de pagamento:</strong> <span className="text-blue-600 font-medium">{paymentMethodLabel}</span></p>
              <p><strong>Pós-licença:</strong> {formatCurrency(contract.postLicenseValue)}/mês</p>
              {contract.paymentNote && <p className="text-xs text-muted-foreground">Obs.: {contract.paymentNote}</p>}
            </div>
          </div>
        </div>

        {contract.extraNotes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-sm uppercase tracking-wide text-yellow-700 mb-2">OBSERVAÇÕES ADICIONAIS</h4>
            <p>{contract.extraNotes}</p>
          </div>
        )}

        {/* Page break antes das assinaturas */}
        <div data-page-break="true" style={{ height: 0 }} />

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-6 text-center pdf-no-break">
          <div className="border rounded-lg p-6">
            <p className="font-bold text-xs mb-12">LICENCIANTE (TORIQ)</p>
            <div className="border-t border-dashed pt-3">
              <p className="text-sm font-medium">{LICENCIANTE.name}</p>
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <p className="font-bold text-xs mb-12">LICENCIADA (CLIENTE)</p>
            <div className="border-t border-dashed pt-3">
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">Rep.: {client.rep}</p>
            </div>
          </div>
        </div>


      </>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden">
        <VisuallyHidden><DialogTitle>Elaborar Contrato</DialogTitle></VisuallyHidden>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Elaborar Contrato</h1>
                <p className="text-xs text-muted-foreground">Licença Vitalícia Modular • TORIQ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColor}>{contract.contractStatus}</Badge>
              <code className="text-xs bg-muted px-2 py-1 rounded">{contract.contractId}</code>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Editor */}
            <div className="w-[500px] border-r flex flex-col print:hidden">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <Tabs defaultValue="cliente" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="cliente" className="text-xs">Cliente</TabsTrigger>
                      <TabsTrigger value="clausulas" className="text-xs">Cláusulas</TabsTrigger>
                      <TabsTrigger value="modulos" className="text-xs">Módulos</TabsTrigger>
                      <TabsTrigger value="valores" className="text-xs">Valores</TabsTrigger>
                      <TabsTrigger value="info" className="text-xs">Info. Gerais</TabsTrigger>
                    </TabsList>

                    {/* Tab Cliente */}
                    <TabsContent value="cliente" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Razão Social</Label>
                          <Input 
                            value={contract.clientName}
                            onChange={(e) => updateField('clientName', e.target.value)}
                            placeholder="Ex.: Metalúrgica Alfa Ltda"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CNPJ</Label>
                          <Input 
                            value={contract.clientCnpj}
                            onChange={(e) => updateField('clientCnpj', maskCNPJ(e.target.value))}
                            placeholder="00.000.000/0000-00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Telefone</Label>
                          <Input 
                            value={contract.clientPhone}
                            onChange={(e) => updateField('clientPhone', maskPhone(e.target.value))}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Endereço (Rua, nº, complemento, bairro)</Label>
                          <Input 
                            value={contract.clientAddress}
                            onChange={(e) => updateField('clientAddress', e.target.value)}
                            placeholder="Rua, nº, complemento, bairro"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cidade</Label>
                          <Input 
                            value={contract.clientCity}
                            onChange={(e) => updateField('clientCity', e.target.value)}
                            placeholder="Ex.: São Paulo"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Estado</Label>
                          <Input 
                            value={contract.clientState}
                            onChange={(e) => updateField('clientState', e.target.value)}
                            placeholder="Ex.: SP"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CEP</Label>
                          <Input 
                            value={contract.clientCep}
                            onChange={(e) => updateField('clientCep', maskCEP(e.target.value))}
                            placeholder="00000-000"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Email</Label>
                          <Input 
                            value={contract.clientEmail}
                            onChange={(e) => updateField('clientEmail', e.target.value)}
                            placeholder="email@empresa.com"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Representante Legal</Label>
                          <Input 
                            value={contract.clientRepresentative}
                            onChange={(e) => updateField('clientRepresentative', e.target.value)}
                            placeholder="Nome completo"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab Cláusulas */}
                    <TabsContent value="clausulas" className="space-y-4 mt-4">
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={addClausula}>
                          <Plus className="h-3 w-3 mr-1" /> Nova Cláusula
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetClausulas}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Restaurar Padrão
                        </Button>
                        <Button size="sm" variant="outline" onClick={saveClausulasAsDefault}>
                          <Save className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={loadSavedClausulas}>
                          <Package className="h-3 w-3 mr-1" /> Carregar Salvas
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edite as cláusulas do contrato. Use as setas para reordenar.
                      </p>

                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {[...clausulas].sort((a, b) => a.ordem - b.ordem).map((clausula, index) => (
                          <Card key={clausula.id} className={`p-3 ${editingClausula === clausula.id ? 'ring-2 ring-primary' : ''}`}>
                            <div className="flex items-start gap-2">
                              {/* Controles de ordem */}
                              <div className="flex flex-col gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6"
                                  onClick={() => moveClausula(clausula.id, 'up')}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6"
                                  onClick={() => moveClausula(clausula.id, 'down')}
                                  disabled={index === clausulas.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Conteúdo da cláusula */}
                              <div className="flex-1">
                                {editingClausula === clausula.id ? (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2">
                                      <Input 
                                        value={clausula.numero}
                                        onChange={(e) => updateClausula(clausula.id, 'numero', e.target.value)}
                                        placeholder="Nº"
                                        className="h-8 text-xs"
                                      />
                                      <Input 
                                        value={clausula.titulo}
                                        onChange={(e) => updateClausula(clausula.id, 'titulo', e.target.value)}
                                        placeholder="Título"
                                        className="h-8 text-xs col-span-3 font-bold"
                                      />
                                    </div>
                                    <Textarea 
                                      value={clausula.conteudo}
                                      onChange={(e) => updateClausula(clausula.id, 'conteudo', e.target.value)}
                                      placeholder="Conteúdo da cláusula..."
                                      className="text-xs min-h-[120px]"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => setEditingClausula(null)}>
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir Edição
                                    </Button>
                                  </div>
                                ) : (
                                  <div 
                                    className="cursor-pointer hover:bg-muted/50 rounded p-2 -m-2"
                                    onClick={() => setEditingClausula(clausula.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {`Cláusula ${clausula.numero}`}
                                      </Badge>
                                      <span className="font-bold text-xs">{clausula.titulo}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {clausula.conteudo.substring(0, 100)}...
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Botão remover */}
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeClausula(clausula.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tab Módulos */}
                    <TabsContent value="modulos" className="space-y-4 mt-4">
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={addModule}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar
                        </Button>
                        <Button size="sm" variant="outline" onClick={loadPreset}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Preset
                        </Button>
                        <Button size="sm" variant="outline" onClick={saveModulesAsDefault}>
                          <Save className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        {savedModules.length > 0 && (
                          <Button size="sm" variant="outline" onClick={loadSavedModules}>
                            <Package className="h-3 w-3 mr-1" /> Carregar Salvos
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edite os módulos e clique em "Salvar" para usar como padrão em futuros contratos.
                      </p>

                      <div className="space-y-3">
                        {contract.modules.map((mod) => (
                          <Card key={mod.id} className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {servicos.length > 0 ? (
                                  <Select
                                    value={servicos.some(s => s.nome === mod.name) ? mod.name : '__custom__'}
                                    onValueChange={(value) => {
                                      if (value === '__custom__') return;
                                      const servico = servicos.find(s => s.nome === value);
                                      updateModule(mod.id, 'name', value);
                                      if (servico?.descricao) {
                                        updateModule(mod.id, 'features', servico.descricao);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="font-bold h-8">
                                      <SelectValue placeholder="Selecione um serviço..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {servicos.map((s) => (
                                        <SelectItem key={s.id} value={s.nome}>
                                          {s.nome}
                                        </SelectItem>
                                      ))}
                                      {!servicos.some(s => s.nome === mod.name) && mod.name && (
                                        <SelectItem value="__custom__" disabled>
                                          <span className="text-muted-foreground">{mod.name} (personalizado)</span>
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input 
                                    value={mod.name}
                                    onChange={(e) => updateModule(mod.id, 'name', e.target.value)}
                                    placeholder="Nome do módulo"
                                    className="font-bold h-8"
                                  />
                                )}
                              </div>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeModule(mod.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input 
                                value={mod.version}
                                onChange={(e) => updateModule(mod.id, 'version', e.target.value)}
                                placeholder="Versão"
                                className="h-8 text-xs"
                              />
                              <Select value={mod.mode} onValueChange={(v) => updateModule(mod.id, 'mode', v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Cliente direto">Cliente direto</SelectItem>
                                  <SelectItem value="White Label">White Label</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input 
                              value={mod.purpose}
                              onChange={(e) => updateModule(mod.id, 'purpose', e.target.value)}
                              placeholder="Finalidade"
                              className="h-8 text-xs mt-2"
                            />
                            <Textarea 
                              value={mod.features}
                              onChange={(e) => updateModule(mod.id, 'features', e.target.value)}
                              placeholder="Funcionalidades (1 por linha)"
                              className="text-xs mt-2 min-h-[60px]"
                            />
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Tab Valores */}
                    <TabsContent value="valores" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Implantação (R$)</Label>
                          <Input 
                            type="number"
                            value={contract.implantationValue}
                            onChange={(e) => updateField('implantationValue', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Pós-licença mensal (R$)</Label>
                          <Input 
                            type="number"
                            value={contract.postLicenseValue}
                            onChange={(e) => updateField('postLicenseValue', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">À vista (R$)</Label>
                            <Input 
                              type="number"
                              value={contract.cashValue}
                              onChange={(e) => updateField('cashValue', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Texto (à vista)</Label>
                            <Input 
                              value={contract.cashText}
                              onChange={(e) => updateField('cashText', e.target.value)}
                              placeholder="Ex.: 10% desconto"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Até 3x (R$ total)</Label>
                            <Input 
                              type="number"
                              value={contract.threeXValue}
                              onChange={(e) => updateField('threeXValue', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Texto (3x)</Label>
                            <Input 
                              value={contract.threeXText}
                              onChange={(e) => updateField('threeXText', e.target.value)}
                              placeholder="Ex.: 3x de R$ 16.666,67"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Leasing (R$ total)</Label>
                            <Input 
                              type="number"
                              value={contract.leaseValue}
                              onChange={(e) => updateField('leaseValue', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Texto (leasing)</Label>
                            <Input 
                              value={contract.leaseText}
                              onChange={(e) => updateField('leaseText', e.target.value)}
                              placeholder="Ex.: 24x de R$ 2.250,00"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-xs font-bold">Forma de pagamento escolhida</Label>
                        <Select value={contract.paymentSelected} onValueChange={(v) => updateField('paymentSelected', v as 'cash' | '3x' | 'lease')}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">À vista</SelectItem>
                            <SelectItem value="3x">Até 3x</SelectItem>
                            <SelectItem value="lease">Leasing/Consórcio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold">Meio de Pagamento</Label>
                        <Select value={contract.paymentMethod} onValueChange={(v) => updateField('paymentMethod', v as 'pix' | 'boleto' | 'cartao' | 'gateway')}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">
                              <div className="flex items-center gap-2">
                                <QrCode className="h-3 w-3" />
                                PIX
                              </div>
                            </SelectItem>
                            <SelectItem value="boleto">
                              <div className="flex items-center gap-2">
                                <Receipt className="h-3 w-3" />
                                Boleto Bancário
                              </div>
                            </SelectItem>
                            <SelectItem value="cartao">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-3 w-3" />
                                Cartão de Crédito
                              </div>
                            </SelectItem>
                            <SelectItem value="gateway">
                              <div className="flex items-center gap-2">
                                <Landmark className="h-3 w-3" />
                                Gateway de Pagamento
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          value={contract.paymentNote}
                          onChange={(e) => updateField('paymentNote', e.target.value)}
                          placeholder="Observação comercial (opcional)"
                          className="mt-2"
                        />
                      </div>
                    </TabsContent>

                    {/* Tab Informações Gerais */}
                    <TabsContent value="info" className="space-y-4 mt-4">
                      <div>
                        <Label className="text-xs">Descrição / Observação (exibida após Partes Contratantes)</Label>
                        <Textarea 
                          value={contract.introDescription}
                          onChange={(e) => updateField('introDescription', e.target.value)}
                          placeholder="Texto descritivo sobre a solução..."
                          className="text-xs mt-1 min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nº do Contrato</Label>
                          <Input 
                            value={contract.contractId}
                            onChange={(e) => updateField('contractId', e.target.value)}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente (TQ-ANO-NÚMERO)</p>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select value={contract.contractStatus} onValueChange={(v) => updateField('contractStatus', v as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rascunho">Rascunho</SelectItem>
                              <SelectItem value="Enviado">Enviado</SelectItem>
                              <SelectItem value="Assinado">Assinado</SelectItem>
                              <SelectItem value="Cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Validade (dias)</Label>
                          <Input 
                            type="number"
                            value={contract.validDays}
                            onChange={(e) => updateField('validDays', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Criado por</Label>
                          <Input 
                            value={contract.createdBy}
                            onChange={(e) => updateField('createdBy', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Foro</Label>
                          <Input 
                            value={contract.foro}
                            onChange={(e) => updateField('foro', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Observações adicionais</Label>
                          <Textarea 
                            value={contract.extraNotes}
                            onChange={(e) => updateField('extraNotes', e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={markAsSent} className="flex-1">
                          <Send className="h-3 w-3 mr-1" /> Marcar Enviado
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="p-4 border-t bg-muted/30 space-y-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-3 w-3 mr-1" /> {saving ? 'Salvando...' : savedContractId ? 'Atualizar Contrato' : 'Salvar Contrato'}
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyContractText} className="flex-1">
                    <Copy className="h-3 w-3 mr-1" /> Copiar Texto
                  </Button>
                  <Button size="sm" variant="outline" onClick={printContract} className="flex-1">
                    <Printer className="h-3 w-3 mr-1" /> Gerar PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="flex-1 flex flex-col bg-muted/20 overflow-hidden">
              <div className="p-4 border-b bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">Pré-visualização do Contrato</h3>
                    <p className="text-xs text-muted-foreground">Ajuste à esquerda e visualize em tempo real</p>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-bold ml-1">{contract.clientName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Forma:</span>
                      <span className="font-bold text-green-600 ml-1">{paymentLabel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-bold ml-1">{formatCurrency(chosenValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <ContractPaginatedPreview contractId={contract.contractId}>
                {renderContractPreview()}
              </ContractPaginatedPreview>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
