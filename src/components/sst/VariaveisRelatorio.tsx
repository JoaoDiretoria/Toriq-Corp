// Variáveis disponíveis para uso em relatórios de treinamento
export const VARIAVEIS_RELATORIO = [
  // Informações da Empresa
  { codigo: '{{EMPRESA_NOME}}', descricao: 'Nome da empresa prestadora', exemplo: 'Vertical On SST' },
  { codigo: '{{EMPRESA_CNPJ}}', descricao: 'CNPJ da empresa', exemplo: '12.345.678/0001-90' },
  { codigo: '{{EMPRESA_ENDERECO}}', descricao: 'Endereço completo da empresa', exemplo: 'Rua das Flores, 123 - São Paulo/SP' },
  { codigo: '{{EMPRESA_TELEFONE}}', descricao: 'Telefone da empresa', exemplo: '(11) 1234-5678' },
  { codigo: '{{EMPRESA_EMAIL}}', descricao: 'E-mail da empresa', exemplo: 'contato@empresa.com' },
  { codigo: '{{EMPRESA_WEBSITE}}', descricao: 'Website da empresa', exemplo: 'www.empresa.com.br' },
  { codigo: '{{LOGO_EMPRESA}}', descricao: 'Logo da empresa (URL)', exemplo: 'https://...' },
  { codigo: '{{EMPRESA_APRESENTACAO}}', descricao: 'Texto de apresentação da empresa', exemplo: 'Somos uma empresa...' },
  { codigo: '{{EMPRESA_MISSAO}}', descricao: 'Missão da empresa', exemplo: 'Nossa missão é...' },
  { codigo: '{{EMPRESA_VISAO}}', descricao: 'Visão da empresa', exemplo: 'Nossa visão é...' },
  { codigo: '{{EMPRESA_VALORES}}', descricao: 'Valores da empresa', exemplo: 'Nossos valores são...' },
  
  // Informações do Cliente
  { codigo: '{{CLIENTE_NOME}}', descricao: 'Nome do cliente', exemplo: 'Empresa ABC Ltda' },
  { codigo: '{{CLIENTE_CNPJ}}', descricao: 'CNPJ do cliente', exemplo: '98.765.432/0001-10' },
  { codigo: '{{CLIENTE_ENDERECO}}', descricao: 'Endereço do cliente', exemplo: 'Av. Principal, 456' },
  
  // Informações do Treinamento
  { codigo: '{{TREINAMENTO_NOME}}', descricao: 'Nome do treinamento', exemplo: 'Trabalho em Altura' },
  { codigo: '{{TREINAMENTO_NR}}', descricao: 'Norma regulamentadora', exemplo: 'NR-35' },
  { codigo: '{{TREINAMENTO_CH}}', descricao: 'Carga horária', exemplo: '8' },
  { codigo: '{{CARGA_HORARIA}}', descricao: 'Carga horária (igual ao anterior)', exemplo: '8' },
  { codigo: '{{TREINAMENTO_OBJETIVO}}', descricao: 'Objetivo do treinamento', exemplo: 'Capacitar os colaboradores...' },
  { codigo: '{{TREINAMENTO_METODOLOGIA}}', descricao: 'Metodologia aplicada', exemplo: 'Aulas teóricas e práticas...' },
  { codigo: '{{TREINAMENTO_CONTEUDO_PROGRAMATICO}}', descricao: 'Conteúdo programático completo', exemplo: '1. Introdução\n2. Normas...' },
  { codigo: '{{BASE_LEGAL}}', descricao: 'Base legal do treinamento', exemplo: 'NR-35, Portaria 3.214/78...' },
  
  // Informações da Turma
  { codigo: '{{CODIGO_TURMA}}', descricao: 'Código da turma', exemplo: 'TRM-2025-001' },
  { codigo: '{{DATA_INICIO}}', descricao: 'Data de início', exemplo: '15/01/2025' },
  { codigo: '{{DATA_FIM}}', descricao: 'Data de término', exemplo: '17/01/2025' },
  { codigo: '{{LOCAL_TREINAMENTO}}', descricao: 'Local de realização', exemplo: 'Sala de Treinamento - Unidade Centro' },
  { codigo: '{{HORARIO_TREINAMENTO}}', descricao: 'Horário das aulas', exemplo: '08:00 às 17:00' },
  { codigo: '{{TOTAL_PARTICIPANTES}}', descricao: 'Total de participantes', exemplo: '25' },
  { codigo: '{{TOTAL_PRESENTES}}', descricao: 'Total de presentes', exemplo: '24' },
  { codigo: '{{PERCENTUAL_PRESENCA}}', descricao: 'Percentual de presença', exemplo: '96' },
  
  // Informações do Instrutor
  { codigo: '{{INSTRUTOR_NOME}}', descricao: 'Nome do instrutor', exemplo: 'João Silva' },
  { codigo: '{{INSTRUTOR_FORMACAO}}', descricao: 'Formação do instrutor', exemplo: 'Engenheiro de Segurança do Trabalho' },
  { codigo: '{{INSTRUTOR_REGISTRO}}', descricao: 'Registro profissional', exemplo: 'CREA 123456' },
  
  // Avaliações
  { codigo: '{{MEDIA_PRE_TESTE}}', descricao: 'Média do pré-teste', exemplo: '6.5' },
  { codigo: '{{MEDIA_POS_TESTE}}', descricao: 'Média do pós-teste', exemplo: '8.7' },
  { codigo: '{{EVOLUCAO_PERCENTUAL}}', descricao: 'Evolução percentual', exemplo: '33.8' },
  { codigo: '{{TAXA_APROVACAO}}', descricao: 'Taxa de aprovação', exemplo: '92' },
  { codigo: '{{TOTAL_APROVADOS}}', descricao: 'Total de aprovados', exemplo: '23' },
  { codigo: '{{TOTAL_REORIENTADOS}}', descricao: 'Total de reorientados', exemplo: '2' },
  
  // Avaliação de Reação
  { codigo: '{{NPS_SCORE}}', descricao: 'NPS Score', exemplo: '85' },
  { codigo: '{{SATISFACAO_GERAL}}', descricao: 'Satisfação geral (%)', exemplo: '95' },
  { codigo: '{{AVALIACAO_INSTRUTOR}}', descricao: 'Avaliação do instrutor', exemplo: '9.5' },
  { codigo: '{{AVALIACAO_CONTEUDO}}', descricao: 'Avaliação do conteúdo', exemplo: '9.2' },
  
  // Certificados
  { codigo: '{{TOTAL_CERTIFICADOS}}', descricao: 'Total de certificados emitidos', exemplo: '23' },
  { codigo: '{{VALIDADE_CERTIFICADO}}', descricao: 'Validade dos certificados', exemplo: '2 anos' },
  
  // Diretor Técnico
  { codigo: '{{DIRETOR_TECNICO_NOME}}', descricao: 'Nome do diretor técnico', exemplo: 'Maria Santos' },
  { codigo: '{{DIRETOR_TECNICO_REGISTRO}}', descricao: 'Registro do diretor técnico', exemplo: 'CREA 654321' },
  { codigo: '{{ASSINATURA_DIRETOR_TECNICO}}', descricao: 'Assinatura do diretor técnico (imagem)', exemplo: '[Imagem]' },
  { codigo: '{{ASSINATURA_INSTRUTOR}}', descricao: 'Assinatura do instrutor (imagem)', exemplo: '[Imagem]' },
  
  // Data Atual
  { codigo: '{{DATA_ATUAL}}', descricao: 'Data atual', exemplo: '19/12/2025' },
  
  // Tabelas e Listas Dinâmicas
  { codigo: '{{LISTA_PRESENCA}}', descricao: 'Tabela de lista de presença', exemplo: '[Tabela HTML]' },
  { codigo: '{{RESULTADOS_AVALIACOES}}', descricao: 'Tabela de resultados das avaliações', exemplo: '[Tabela HTML]' },
  { codigo: '{{RESULTADOS_AVALIACAO_REACAO}}', descricao: 'Tabela de avaliação de reação', exemplo: '[Tabela HTML]' },
  { codigo: '{{COMENTARIOS_AVALIACAO}}', descricao: 'Comentários da avaliação', exemplo: '[Lista de comentários]' },
  { codigo: '{{DEPOIMENTOS}}', descricao: 'Depoimentos dos participantes', exemplo: '[Blocos de depoimentos]' },
  { codigo: '{{LISTA_CERTIFICADOS}}', descricao: 'Lista de certificados emitidos', exemplo: '[Tabela HTML]' },
  { codigo: '{{FOTOS_TREINAMENTO}}', descricao: 'Grid de fotos do treinamento', exemplo: '[Grid de imagens]' },
  { codigo: '{{DOCUMENTOS_INSTRUTOR}}', descricao: 'Lista de documentos do instrutor', exemplo: '[Tabela HTML]' },
  
  // Anexos da Turma
  { codigo: '{{ANEXO_TURMA_CASE}}', descricao: 'Anexo: Case da turma', exemplo: '[Documento]' },
  { codigo: '{{ANEXO_TURMA_LISTA_PRESENCA}}', descricao: 'Anexo: Lista de presença digitalizada', exemplo: '[Documento]' },
  { codigo: '{{ANEXOS_TURMA_TODOS}}', descricao: 'Todos os anexos da turma', exemplo: '[Lista de anexos]' },
  { codigo: '{{IMAGENS_RELATORIO}}', descricao: 'Todas as imagens do relatório', exemplo: '[Galeria]' },
];

// Variáveis específicas para certificados (mantidas para compatibilidade)
export const VARIAVEIS_CERTIFICADO = [
  { codigo: '{COLABORADOR_NOME}', descricao: 'Nome do colaborador', exemplo: 'João da Silva' },
  { codigo: '{COLABORADOR_CPF}', descricao: 'CPF do colaborador', exemplo: '123.456.789-00' },
  { codigo: '{COLABORADOR_EMPRESA}', descricao: 'Nome da empresa do colaborador', exemplo: 'Empresa ABC Ltda' },
  { codigo: '{COLABORADOR_LOCAL}', descricao: 'Endereço da empresa do colaborador', exemplo: 'Rua das Flores, 123 - São Paulo/SP' },
  { codigo: '{TREINAMENTO_NOME}', descricao: 'Nome do treinamento', exemplo: 'Trabalho em Altura' },
  { codigo: '{TREINAMENTO_NR}', descricao: 'Norma regulamentadora', exemplo: 'NR-35' },
  { codigo: '{TREINAMENTO_CH}', descricao: 'Carga horária do treinamento', exemplo: '8' },
  { codigo: '{TREINAMENTO_DATA}', descricao: 'Data de realização do treinamento', exemplo: '18/12/2025' },
  { codigo: '{TREINAMENTO_CP}', descricao: 'Conteúdo programático do treinamento', exemplo: '1. Introdução\n2. Normas...' },
  { codigo: '{TREINAMENTO_VALIDADE}', descricao: 'Data de validade do certificado', exemplo: '18/12/2027' },
  { codigo: '{INSTRUTOR_NOME}', descricao: 'Nome do instrutor', exemplo: 'Maria Santos' },
  { codigo: '{DATA_ATUAL}', descricao: 'Data atual', exemplo: '18/12/2025' },
  { codigo: '{QRCODE_VALIDACAO}', descricao: 'QR Code para validação do certificado', exemplo: '[QR Code]' },
  { codigo: '{ASSINATURAS}', descricao: 'Bloco de assinaturas (Responsável Técnico + Instrutor)', exemplo: '[Assinaturas lado a lado]' },
  { codigo: '{ASSINATURA_RESPONSAVEL_TECNICO}', descricao: 'Assinatura do Responsável Técnico da empresa SST', exemplo: '[Assinatura individual]' },
  { codigo: '{ASSINATURA_INSTRUTOR}', descricao: 'Assinatura do Instrutor', exemplo: '[Assinatura individual]' },
];
