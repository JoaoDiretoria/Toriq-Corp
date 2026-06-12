import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base, get_db
from app.main import app

# Tables used by the unit test suite (public schema mapped to None for SQLite).
_SIMPLE_TABLES = ["users", "public.empresas"]

# Raw SQLite DDL for generated tables that have PostgreSQL-specific syntax
# (server_default with ::cast, CHECK constraints with ARRAY/::cast) which
# SQLAlchemy cannot emit in SQLite-compatible form automatically.
_CADASTRO_DDL = [
    """
    CREATE TABLE IF NOT EXISTS fornecedores (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        razao_social TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        nome_fantasia TEXT,
        cnpj_cpf TEXT,
        email TEXT,
        telefone TEXT,
        endereco TEXT,
        observacoes TEXT,
        classificacao_despesa_padrao VARCHAR(100),
        descricao_despesa_padrao TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS formas_pagamento (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        descricao TEXT,
        taxa_percentual NUMERIC(5,2) DEFAULT 0,
        dias_recebimento INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS formas_cobranca (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        periodicidade INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS condicoes_pagamento (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        parcelas INTEGER NOT NULL DEFAULT 1,
        intervalo_dias INTEGER NOT NULL DEFAULT 30,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT,
        entrada_percentual NUMERIC(5,2) DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS centros_custo (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'ambos',
        ativo BOOLEAN NOT NULL DEFAULT 1,
        descricao TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_bancarias (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        banco TEXT NOT NULL,
        agencia TEXT NOT NULL,
        conta TEXT NOT NULL,
        tipo TEXT NOT NULL,
        saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS plano_receitas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS plano_despesas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT
    )
    """,
    # ── Contas a Receber ──────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS contas_receber_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#6366f1',
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_receber (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES contas_receber_colunas(id) ON DELETE CASCADE,
        numero TEXT NOT NULL DEFAULT '',
        cliente_nome TEXT NOT NULL DEFAULT '—',
        valor NUMERIC(15,2) NOT NULL DEFAULT 0,
        valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
        data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
        ordem INTEGER NOT NULL DEFAULT 0,
        arquivado BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        cliente_id CHAR(32),
        cliente_cnpj TEXT,
        servico_produto TEXT,
        descricao TEXT,
        data_competencia DATE,
        data_recebimento DATE,
        data_pagamento DATE,
        data_vencimento DATE,
        forma_pagamento TEXT,
        forma_pagamento_id CHAR(32),
        categoria TEXT,
        conta_financeira TEXT,
        conta_financeira_id CHAR(32),
        observacoes TEXT,
        origem TEXT,
        closer_card_id CHAR(32),
        created_by CHAR(32),
        condicao_pagamento TEXT,
        condicao_pagamento_id CHAR(32),
        recorrente BOOLEAN DEFAULT 0,
        nfe_data_programada DATE,
        nfe_hora_programada TEXT,
        origem_card_id CHAR(32),
        origem_kanban VARCHAR(50),
        contato_nome TEXT,
        contato_email TEXT,
        contato_telefone TEXT,
        empresa_nome TEXT,
        empresa_email TEXT,
        empresa_telefone TEXT,
        empresa_endereco TEXT,
        empresa_numero TEXT,
        empresa_complemento TEXT,
        empresa_bairro TEXT,
        empresa_cidade TEXT,
        empresa_estado TEXT,
        empresa_cep TEXT,
        status_recebimento VARCHAR(50) DEFAULT 'previsto'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_receber_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        conta_id CHAR(32) NOT NULL REFERENCES contas_receber(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'mudanca_coluna',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32)
    )
    """,
    # ── Funil / CRM ───────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS setores (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funis (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        setor_id CHAR(32) NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'negocio',
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        ordem INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funis_configuracoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        funil_id CHAR(32) NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
        empresa_id CHAR(32) REFERENCES empresas(id) ON DELETE CASCADE,
        titulo_pagina VARCHAR(255),
        descricao_pagina TEXT,
        modo_visualizacao VARCHAR(20) DEFAULT 'kanban',
        dashboard_visivel BOOLEAN DEFAULT 1,
        dashboard_tipo VARCHAR(50) DEFAULT 'simples',
        dashboard_metricas TEXT DEFAULT '["total_cards","valor_total","cards_por_etapa"]',
        botao_adicionar_visivel BOOLEAN DEFAULT 1,
        botao_adicionar_texto VARCHAR(100) DEFAULT 'Novo Card',
        card_campos_visiveis TEXT DEFAULT '["titulo","cliente","valor","data","responsavel"]',
        card_mostrar_valor BOOLEAN DEFAULT 1,
        card_mostrar_cliente BOOLEAN DEFAULT 1,
        card_mostrar_data BOOLEAN DEFAULT 1,
        card_mostrar_responsavel BOOLEAN DEFAULT 1,
        card_mostrar_etiquetas BOOLEAN DEFAULT 1,
        card_mostrar_categoria BOOLEAN DEFAULT 1,
        card_mostrar_status BOOLEAN DEFAULT 1,
        card_mostrar_status_atividade BOOLEAN DEFAULT 1,
        card_interno_atividades_tipos TEXT DEFAULT '["tarefa","email","ligacao","whatsapp","reuniao","visita","nota"]',
        card_interno_acoes_rapidas TEXT DEFAULT '["editar","mover","excluir"]',
        card_interno_mostrar_historico BOOLEAN DEFAULT 1,
        card_interno_mostrar_movimentacoes BOOLEAN DEFAULT 1,
        card_interno_campos_personalizados TEXT DEFAULT '[]',
        card_interno_mostrar_prioridade BOOLEAN DEFAULT 1,
        acoes_especiais TEXT DEFAULT '[]',
        formulario_campos TEXT DEFAULT '[]',
        cards_ordenacao TEXT DEFAULT 'ordem_chegada',
        botao_novo_card_texto TEXT DEFAULT 'Novo Card',
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        UNIQUE(funil_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funil_etapas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        funil_id CHAR(32) NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        trancada BOOLEAN NOT NULL DEFAULT 0,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6366f1',
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funil_cards (
        id CHAR(32) NOT NULL PRIMARY KEY,
        funil_id CHAR(32) NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
        etapa_id CHAR(32) NOT NULL REFERENCES funil_etapas(id) ON DELETE SET NULL,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        valor NUMERIC(15,2) DEFAULT 0,
        cliente_id CHAR(32),
        responsavel_id CHAR(32),
        data_criacao DATETIME DEFAULT (now()),
        data_previsao DATE,
        data_conclusao DATE,
        prioridade VARCHAR(20) DEFAULT 'media',
        ordem INTEGER DEFAULT 0,
        ativo BOOLEAN DEFAULT 1,
        metadata TEXT DEFAULT '{}',
        status_negocio VARCHAR(20),
        acoes_rapidas_config TEXT,
        orcamento_treinamento TEXT,
        orcamento_vertical365 TEXT,
        orcamento_servicos_sst TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funil_card_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES funil_cards(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_etapa',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        etapa_origem_id CHAR(32),
        etapa_destino_id CHAR(32),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32),
        kanban_origem VARCHAR(100),
        kanban_destino VARCHAR(100)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funil_etiquetas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        cor VARCHAR(20) NOT NULL DEFAULT '#F59E0B',
        created_at DATETIME NOT NULL DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funil_card_etiquetas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES funil_cards(id) ON DELETE CASCADE,
        etiqueta_id CHAR(32) NOT NULL REFERENCES funil_etiquetas(id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL DEFAULT (now()),
        UNIQUE(card_id, etiqueta_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS funil_card_atividades (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES funil_cards(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'tarefa',
        descricao TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'a_realizar',
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        prazo DATE,
        horario VARCHAR(10),
        usuario_id CHAR(32),
        responsavel_id CHAR(32),
        proposta_aprovada BOOLEAN DEFAULT 0,
        anexo_url TEXT,
        anexo_nome TEXT
    )
    """,
    # ── SST — Cadastros Base ──────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS cargos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        cbo VARCHAR(10)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS riscos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT,
        tipo TEXT,
        severidade TEXT,
        probabilidade TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS perigos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS grupos_clientes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS colaboradores (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL,
        nome TEXT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        cpf TEXT,
        cargo TEXT,
        setor TEXT,
        data_admissao DATE,
        email TEXT,
        telefone TEXT,
        grupo_homogeneo_id CHAR(32),
        matricula VARCHAR(50),
        rg TEXT,
        data_nascimento DATE,
        sexo TEXT,
        estado_civil TEXT,
        nacionalidade TEXT DEFAULT 'Brasileira',
        naturalidade TEXT,
        nome_mae TEXT,
        nome_pai TEXT,
        endereco TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT,
        cep TEXT,
        telefone_emergencia TEXT,
        contato_emergencia TEXT,
        pis TEXT,
        ctps TEXT,
        ctps_serie TEXT,
        titulo_eleitor TEXT,
        zona_eleitoral TEXT,
        secao_eleitoral TEXT,
        certificado_reservista TEXT,
        cnh TEXT,
        cnh_categoria TEXT,
        cnh_validade DATE,
        banco TEXT,
        agencia TEXT,
        conta TEXT,
        tipo_conta TEXT,
        pix TEXT,
        tipo_contrato TEXT,
        carga_horaria TEXT,
        salario NUMERIC(10,2),
        data_demissao DATE,
        motivo_demissao TEXT,
        observacoes TEXT,
        foto_url TEXT,
        formacao TEXT,
        nivel_escolaridade TEXT,
        tem_acesso_sistema BOOLEAN DEFAULT 0,
        perfil_acesso TEXT,
        modulos_acesso TEXT,
        comissao NUMERIC(5,2),
        codigo_facial TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS categorias_clientes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS clientes_sst (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_sst_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        cnpj TEXT,
        responsavel TEXT,
        email TEXT,
        telefone TEXT,
        responsavel_id CHAR(32),
        cliente_empresa_id CHAR(32),
        sigla VARCHAR(3),
        categoria_id CHAR(32),
        tipo_inscricao VARCHAR(1) DEFAULT '1',
        numero_inscricao_esocial VARCHAR(50),
        cnae VARCHAR(20),
        cnae_atividade TEXT,
        grau_risco VARCHAR(1),
        porte_empresa VARCHAR(20),
        servicos_contratados TEXT,
        medico_responsavel_id CHAR(32),
        possui_gestao_treinamentos BOOLEAN DEFAULT 0,
        possui_pcmso BOOLEAN DEFAULT 0,
        origem_contato_id CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cliente_contatos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        cliente_id CHAR(32) NOT NULL REFERENCES clientes_sst(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        cargo VARCHAR(255),
        email VARCHAR(255),
        telefone VARCHAR(50),
        linkedin VARCHAR(500),
        principal BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS unidades_clientes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        cliente_id CHAR(32) NOT NULL REFERENCES clientes_sst(id) ON DELETE CASCADE,
        razao_social VARCHAR(255) NOT NULL,
        grupo_id CHAR(32),
        tipo_inscricao VARCHAR(1) DEFAULT '1',
        numero_inscricao VARCHAR(20),
        nome_referencia VARCHAR(255),
        cnae VARCHAR(10),
        cnae_atividade TEXT,
        grau_risco VARCHAR(1),
        cep VARCHAR(10),
        logradouro VARCHAR(255),
        numero VARCHAR(20),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        uf VARCHAR(2),
        codigo_interno VARCHAR(50),
        tipo_local VARCHAR(1),
        email VARCHAR(255),
        medico_pcmso_id CHAR(32),
        tecnico_responsavel_id CHAR(32),
        faturamento VARCHAR(20) DEFAULT 'faturar',
        status VARCHAR(20) DEFAULT 'ativo',
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    # ── Contratos ─────────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS modelos_contrato (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL DEFAULT 'cliente',
        descricao TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contratos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        numero VARCHAR(50) NOT NULL,
        tipo VARCHAR(50) NOT NULL DEFAULT 'cliente',
        modelo_id CHAR(32) REFERENCES modelos_contrato(id) ON DELETE SET NULL,
        cliente_id CHAR(32),
        parceiro_id CHAR(32),
        instrutor_id CHAR(32),
        razao_social VARCHAR(255),
        cnpj VARCHAR(20),
        telefone VARCHAR(20),
        endereco TEXT,
        cidade VARCHAR(100),
        estado VARCHAR(2),
        cep VARCHAR(10),
        email VARCHAR(255),
        representante_legal VARCHAR(255),
        valor_implantacao NUMERIC(10,2) DEFAULT 0,
        valor_mensal NUMERIC(10,2) DEFAULT 0,
        valor_avista NUMERIC(10,2) DEFAULT 0,
        texto_avista VARCHAR(255),
        valor_3x NUMERIC(10,2) DEFAULT 0,
        texto_3x VARCHAR(255),
        valor_leasing NUMERIC(10,2) DEFAULT 0,
        texto_leasing VARCHAR(255),
        forma_pagamento VARCHAR(50) DEFAULT 'avista',
        meio_pagamento VARCHAR(50) DEFAULT 'pix',
        observacao_comercial TEXT,
        validade_dias INTEGER DEFAULT 10,
        foro VARCHAR(255),
        observacoes_adicionais TEXT,
        criado_por VARCHAR(255),
        assinante_nome VARCHAR(255),
        assinante_cpf VARCHAR(14),
        assinado BOOLEAN DEFAULT 0,
        data_assinatura DATETIME,
        status VARCHAR(50) DEFAULT 'rascunho',
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contrato_clausulas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        contrato_id CHAR(32) NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        conteudo TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contrato_modulos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        contrato_id CHAR(32) NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        versao VARCHAR(50),
        tipo_cliente VARCHAR(50) DEFAULT 'Cliente direto',
        descricao TEXT,
        itens TEXT,
        created_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS modelo_clausulas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        modelo_id CHAR(32) NOT NULL REFERENCES modelos_contrato(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        conteudo TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS modelo_modulos (
        id CHAR(32) NOT NULL PRIMARY KEY,
        modelo_id CHAR(32) NOT NULL REFERENCES modelos_contrato(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        versao VARCHAR(50),
        tipo_cliente VARCHAR(50) DEFAULT 'Cliente direto',
        descricao TEXT,
        itens TEXT,
        created_at DATETIME DEFAULT (now())
    )
    """,
    # ── Contas a Pagar ────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS contas_pagar_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#6366f1',
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_pagar (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES contas_pagar_colunas(id) ON DELETE CASCADE,
        numero TEXT NOT NULL DEFAULT '',
        fornecedor_nome TEXT NOT NULL DEFAULT '—',
        valor NUMERIC(15,2) NOT NULL DEFAULT 0,
        valor_pago NUMERIC(15,2) NOT NULL DEFAULT 0,
        data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
        ordem INTEGER NOT NULL DEFAULT 0,
        arquivado BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        fornecedor_id CHAR(32),
        fornecedor_cnpj TEXT,
        descricao TEXT,
        data_competencia DATE,
        data_vencimento DATE,
        data_pagamento DATE,
        forma_pagamento TEXT,
        forma_pagamento_id CHAR(32),
        categoria TEXT,
        conta_financeira TEXT,
        conta_financeira_id CHAR(32),
        centro_custo TEXT,
        centro_custo_id CHAR(32),
        observacoes TEXT,
        origem TEXT,
        condicao_pagamento TEXT,
        condicao_pagamento_id CHAR(32),
        recorrente BOOLEAN DEFAULT 0,
        created_by CHAR(32),
        status_pagamento VARCHAR(20) DEFAULT 'previsto',
        frequencia_cobranca VARCHAR(20) DEFAULT 'unico',
        tipo_valor_recorrente VARCHAR(20),
        data_pagamento_programado DATE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS contas_pagar_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        conta_id CHAR(32) NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'movimentacao',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32)
    )
    """,
    # ── Kanbans Legados ───────────────────────────────────────────────────────
    # Closer
    """
    CREATE TABLE IF NOT EXISTS closer_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        cor VARCHAR(7) DEFAULT '#6366f1',
        ordem INTEGER DEFAULT 0,
        meta_valor NUMERIC(15,2) DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS closer_cards (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES closer_colunas(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        valor NUMERIC(15,2) DEFAULT 0,
        responsavel_id CHAR(32),
        contato_nome VARCHAR(255),
        contato_email VARCHAR(255),
        contato_telefone VARCHAR(50),
        contato_empresa VARCHAR(255),
        origem VARCHAR(100),
        temperatura VARCHAR(20) DEFAULT 'morno',
        data_contato DATE,
        data_followup DATE,
        ordem INTEGER DEFAULT 0,
        arquivado BOOLEAN DEFAULT 0,
        empresa_lead_id CHAR(32),
        contatos TEXT,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        dados_orcamento TEXT,
        dados_orcamento_mensal TEXT,
        dados_custo_mensal TEXT,
        dados_comparacao TEXT,
        valor_a_vista NUMERIC(15,2) DEFAULT 0,
        valor_3x NUMERIC(15,2) DEFAULT 0,
        valor_leasing NUMERIC(15,2) DEFAULT 0,
        forma_pagamento VARCHAR(20) DEFAULT 'a_vista',
        dados_proposta TEXT,
        origem_card_id CHAR(32),
        origem_kanban VARCHAR(50)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS closer_card_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES closer_cards(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'mudanca_coluna',
        descricao TEXT NOT NULL,
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32),
        pagina_origem TEXT,
        pagina_destino TEXT,
        dados_anteriores TEXT,
        dados_novos TEXT,
        created_at DATETIME DEFAULT (now()),
        kanban_origem VARCHAR(100) DEFAULT 'Closer',
        kanban_destino VARCHAR(100) DEFAULT 'Closer'
    )
    """,
    # Prospecção
    """
    CREATE TABLE IF NOT EXISTS prospeccao_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        cor VARCHAR(20) DEFAULT '#6366f1',
        meta_valor NUMERIC(15,2) DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS prospeccao_cards (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES prospeccao_colunas(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        lead_numero INTEGER NOT NULL,
        descricao TEXT,
        valor NUMERIC(15,2) DEFAULT 0,
        responsavel_id CHAR(32),
        contato_nome VARCHAR(255),
        contato_email VARCHAR(255),
        contato_telefone VARCHAR(50),
        contato_empresa VARCHAR(255),
        origem VARCHAR(100),
        temperatura VARCHAR(20) DEFAULT 'morno',
        data_contato DATE,
        data_followup DATE,
        arquivado BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        updated_at DATETIME DEFAULT (now()),
        empresa_lead_id CHAR(32),
        contatos TEXT,
        forma_pagamento VARCHAR(20) DEFAULT 'a_vista'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS prospeccao_card_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES prospeccao_cards(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'mudanca_coluna',
        descricao TEXT NOT NULL,
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32),
        pagina_origem TEXT,
        pagina_destino TEXT,
        dados_anteriores TEXT,
        dados_novos TEXT,
        created_at DATETIME DEFAULT (now()),
        kanban_origem VARCHAR(100),
        kanban_destino VARCHAR(100)
    )
    """,
    # Pós-Venda
    """
    CREATE TABLE IF NOT EXISTS pos_venda_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        cor VARCHAR(20) DEFAULT '#6366f1',
        ordem INTEGER DEFAULT 0,
        meta_valor NUMERIC(15,2) DEFAULT 0,
        created_at DATETIME DEFAULT (now())
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pos_venda_cards (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES pos_venda_colunas(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        valor NUMERIC(15,2) DEFAULT 0,
        responsavel_id CHAR(32),
        cliente_nome VARCHAR(255),
        cliente_email VARCHAR(255),
        cliente_telefone VARCHAR(50),
        cliente_empresa VARCHAR(255),
        cliente_id CHAR(32),
        tipo_servico VARCHAR(100),
        data_venda DATE,
        data_implementacao DATE,
        data_followup DATE,
        status_satisfacao VARCHAR(20) DEFAULT 'pendente',
        nota_nps INTEGER,
        ordem INTEGER DEFAULT 0,
        arquivado BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT (now()),
        created_by CHAR(32),
        forma_pagamento VARCHAR(20),
        valor_a_vista NUMERIC(15,2),
        valor_3x NUMERIC(15,2),
        valor_leasing NUMERIC(15,2),
        temperatura VARCHAR(20) DEFAULT 'morno',
        origem VARCHAR(100),
        dados_orcamento TEXT,
        dados_custo_mensal TEXT,
        dados_comparacao TEXT,
        dados_proposta TEXT,
        contatos TEXT,
        closer_card_id CHAR(32),
        origem_card_id CHAR(32),
        origem_kanban VARCHAR(50)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pos_venda_card_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES pos_venda_cards(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32),
        kanban_origem VARCHAR(100),
        kanban_destino VARCHAR(100),
        dados_anteriores TEXT,
        dados_novos TEXT
    )
    """,
    # Cross-Selling
    """
    CREATE TABLE IF NOT EXISTS cross_selling_colunas (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#6366f1',
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        meta_valor NUMERIC(15,2) DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cross_selling_cards (
        id CHAR(32) NOT NULL PRIMARY KEY,
        empresa_id CHAR(32) NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        coluna_id CHAR(32) NOT NULL REFERENCES cross_selling_colunas(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0,
        arquivado BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (now()),
        updated_at DATETIME NOT NULL DEFAULT (now()),
        descricao TEXT,
        valor NUMERIC(15,2) DEFAULT 0,
        responsavel_id CHAR(32),
        cliente_nome TEXT,
        cliente_email TEXT,
        cliente_telefone TEXT,
        cliente_empresa TEXT,
        cliente_id CHAR(32),
        tipo_servico TEXT,
        data_venda TEXT,
        data_implementacao TEXT,
        data_followup TEXT,
        status_satisfacao TEXT DEFAULT 'pendente',
        nota_nps INTEGER,
        created_by CHAR(32)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS cross_selling_card_movimentacoes (
        id CHAR(32) NOT NULL PRIMARY KEY,
        card_id CHAR(32) NOT NULL REFERENCES cross_selling_cards(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'mudanca_coluna',
        descricao TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT (now()),
        usuario_id CHAR(32),
        coluna_origem_id CHAR(32),
        coluna_destino_id CHAR(32),
        kanban_origem VARCHAR(100),
        kanban_destino VARCHAR(100),
        dados_anteriores TEXT,
        dados_novos TEXT
    )
    """,
]


def _register_sqlite_functions(dbapi_conn, _connection_record):
    """Register PostgreSQL functions that SQLite lacks, for the test suite."""
    import uuid as _uuid

    dbapi_conn.create_function(
        "now", 0, lambda: datetime.datetime.now(datetime.UTC).isoformat(" ")
    )
    dbapi_conn.create_function(
        "gen_random_uuid", 0, lambda: str(_uuid.uuid4()).replace("-", "")
    )


@pytest.fixture
async def db_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        execution_options={"schema_translate_map": {"public": None}},
    )
    event.listen(engine.sync_engine, "connect", _register_sqlite_functions)

    def _create(conn):
        tables = [Base.metadata.tables[name] for name in _SIMPLE_TABLES]
        Base.metadata.create_all(conn, tables=tables)

    async with engine.begin() as conn:
        await conn.run_sync(_create)
        # Create cadastro tables with SQLite-compatible DDL (PostgreSQL-generated
        # models have ::cast server_defaults and ARRAY CHECK constraints that
        # SQLite cannot parse).
        for ddl in _CADASTRO_DDL:
            await conn.execute(text(ddl))

    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    maker = async_sessionmaker(db_engine, expire_on_commit=False)
    async with maker() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
