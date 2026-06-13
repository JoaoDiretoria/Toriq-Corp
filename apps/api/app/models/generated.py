from typing import Any, Optional
import datetime
import decimal
import enum
import uuid

from sqlalchemy import ARRAY, BigInteger, Boolean, CheckConstraint, Column, Computed, Date, DateTime, Enum, ForeignKeyConstraint, Index, Integer, Numeric, PrimaryKeyConstraint, SmallInteger, String, Table, Text, Time, UniqueConstraint, Uuid, text
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

class AppRole(str, enum.Enum):
    ADMIN_VERTICAL = 'admin_vertical'
    EMPRESA_SST = 'empresa_sst'
    CLIENTE_FINAL = 'cliente_final'
    EMPRESA_PARCEIRA = 'empresa_parceira'
    INSTRUTOR = 'instrutor'
    CLIENTE_TORQ = 'cliente_torq'


class TipoEmpresa(str, enum.Enum):
    VERTICAL_ON = 'vertical_on'
    SST = 'sst'
    CLIENTE_FINAL = 'cliente_final'
    EMPRESA_PARCEIRA = 'empresa_parceira'
    LEAD = 'lead'


t_atividades_unificadas = Table(
    'atividades_unificadas', Base.metadata,
    Column('id', Uuid),
    Column('card_id', Uuid),
    Column('tipo', String),
    Column('descricao', Text),
    Column('prazo', Text),
    Column('horario', Text),
    Column('status', String),
    Column('criador_id', Uuid),
    Column('responsavel_id', Uuid),
    Column('created_at', DateTime(True)),
    Column('updated_at', DateTime(True)),
    Column('funil_origem', Text),
    Column('funil_nome', String),
    Column('empresa_id', Uuid),
    Column('card_titulo', String),
    Column('funil_id', Uuid),
    schema='public'
)


class BlogAutores(Base):
    __tablename__ = 'blog_autores'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='blog_autores_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    sobrenome: Mapped[Optional[str]] = mapped_column(String(100))
    cargo: Mapped[Optional[str]] = mapped_column(String(100))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    linkedin_url: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    blogs: Mapped[list['Blogs']] = relationship('Blogs', back_populates='autor')
    pesquisas_opiniao: Mapped[list['PesquisasOpiniao']] = relationship('PesquisasOpiniao', back_populates='autor')


class BlogCategorias(Base):
    __tablename__ = 'blog_categorias'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='blog_categorias_pkey'),
        UniqueConstraint('slug', name='blog_categorias_slug_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(7), server_default=text("'#6366f1'::character varying"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    blogs: Mapped[list['Blogs']] = relationship('Blogs', back_populates='categoria')
    pesquisas_opiniao: Mapped[list['PesquisasOpiniao']] = relationship('PesquisasOpiniao', back_populates='categoria')


t_blog_trending = Table(
    'blog_trending', Base.metadata,
    Column('id', Uuid),
    Column('titulo', String(255)),
    Column('slug', String(255)),
    Column('descricao', Text),
    Column('imagem_capa_url', Text),
    Column('publicado_em', DateTime(True)),
    Column('tempo_leitura', Integer),
    Column('categoria_id', Uuid),
    Column('autor_id', Uuid),
    Column('clicks_30d', BigInteger),
    Column('clicks_7d', BigInteger),
    Column('clicks_24h', BigInteger),
    schema='public'
)


class BlogUserPreferences(Base):
    __tablename__ = 'blog_user_preferences'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='blog_user_preferences_pkey'),
        UniqueConstraint('session_id', name='blog_user_preferences_session_id_key'),
        Index('idx_blog_user_preferences_session', 'session_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    session_id: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[Optional[Any]] = mapped_column(INET)
    categoria_ids: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(Uuid()))
    tags_interesse: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    blogs_visualizados: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(Uuid()))
    ultimo_acesso: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class CategoriasClientes(Base):
    __tablename__ = 'categorias_clientes'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='categorias_clientes_pkey'),
        UniqueConstraint('nome', name='categorias_clientes_nome_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class CboOcupacoes(Base):
    __tablename__ = 'cbo_ocupacoes'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='cbo_ocupacoes_pkey'),
        UniqueConstraint('codigo', name='cbo_ocupacoes_codigo_key'),
        {'comment': 'Classificação Brasileira de Ocupações - CBO 2002',
     'schema': 'public'}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(10), nullable=False)
    codigo_formatado: Mapped[str] = mapped_column(String(10), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    grande_grupo: Mapped[Optional[int]] = mapped_column(Integer)
    desc_grande_grupo: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class Colaboradores(Base):
    __tablename__ = 'colaboradores'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='colaboradores_pkey'),
        Index('idx_colaboradores_empresa_ativo', 'empresa_id', 'ativo'),
        Index('idx_colaboradores_empresa_id', 'empresa_id'),
        Index('idx_colaboradores_grupo_homogeneo_id', 'grupo_homogeneo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    cpf: Mapped[Optional[str]] = mapped_column(Text)
    cargo: Mapped[Optional[str]] = mapped_column(Text)
    setor: Mapped[Optional[str]] = mapped_column(Text)
    data_admissao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    email: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    grupo_homogeneo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    matricula: Mapped[Optional[str]] = mapped_column(String(50))
    rg: Mapped[Optional[str]] = mapped_column(Text, comment='Registro Geral (RG)')
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date, comment='Data de nascimento')
    sexo: Mapped[Optional[str]] = mapped_column(Text, comment='Sexo: Masculino, Feminino, Outro')
    estado_civil: Mapped[Optional[str]] = mapped_column(Text, comment='Estado civil: Solteiro, Casado, Divorciado, Viúvo, União Estável')
    nacionalidade: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Brasileira'::text"))
    naturalidade: Mapped[Optional[str]] = mapped_column(Text)
    nome_mae: Mapped[Optional[str]] = mapped_column(Text)
    nome_pai: Mapped[Optional[str]] = mapped_column(Text)
    endereco: Mapped[Optional[str]] = mapped_column(Text)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    complemento: Mapped[Optional[str]] = mapped_column(Text)
    bairro: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[Optional[str]] = mapped_column(Text)
    cep: Mapped[Optional[str]] = mapped_column(Text)
    telefone_emergencia: Mapped[Optional[str]] = mapped_column(Text)
    contato_emergencia: Mapped[Optional[str]] = mapped_column(Text)
    pis: Mapped[Optional[str]] = mapped_column(Text, comment='Número do PIS/PASEP')
    ctps: Mapped[Optional[str]] = mapped_column(Text, comment='Número da CTPS')
    ctps_serie: Mapped[Optional[str]] = mapped_column(Text)
    titulo_eleitor: Mapped[Optional[str]] = mapped_column(Text)
    zona_eleitoral: Mapped[Optional[str]] = mapped_column(Text)
    secao_eleitoral: Mapped[Optional[str]] = mapped_column(Text)
    certificado_reservista: Mapped[Optional[str]] = mapped_column(Text)
    cnh: Mapped[Optional[str]] = mapped_column(Text)
    cnh_categoria: Mapped[Optional[str]] = mapped_column(Text)
    cnh_validade: Mapped[Optional[datetime.date]] = mapped_column(Date)
    banco: Mapped[Optional[str]] = mapped_column(Text)
    agencia: Mapped[Optional[str]] = mapped_column(Text)
    conta: Mapped[Optional[str]] = mapped_column(Text)
    tipo_conta: Mapped[Optional[str]] = mapped_column(Text)
    pix: Mapped[Optional[str]] = mapped_column(Text)
    tipo_contrato: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo de contrato: CLT, PJ, Estágio, Temporário')
    carga_horaria: Mapped[Optional[str]] = mapped_column(Text)
    salario: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    data_demissao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    motivo_demissao: Mapped[Optional[str]] = mapped_column(Text)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    foto_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL da foto do colaborador')
    formacao: Mapped[Optional[str]] = mapped_column(Text, comment='Formação acadêmica/profissional do colaborador')
    nivel_escolaridade: Mapped[Optional[str]] = mapped_column(Text, comment='Nível de escolaridade: Fundamental, Médio, Técnico, Superior, Pós-graduação, Mestrado, Doutorado')
    tem_acesso_sistema: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'), comment='Se o colaborador tem acesso ao sistema')
    perfil_acesso: Mapped[Optional[str]] = mapped_column(Text, comment='Perfil de acesso baseado no setor: Administrativo, Financeiro, Comercial, TI, Diretoria')
    modulos_acesso: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()), comment='Array de módulos que o colaborador tem acesso')
    comissao: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2))
    codigo_facial: Mapped[Optional[str]] = mapped_column(Text)

    closer_atividades: Mapped[list['CloserAtividades']] = relationship('CloserAtividades', back_populates='responsavel')
    prospeccao_atividades: Mapped[list['ProspeccaoAtividades']] = relationship('ProspeccaoAtividades', back_populates='responsavel')


class ColaboradoresTemporarios(Base):
    __tablename__ = 'colaboradores_temporarios'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text])", name='colaboradores_temporarios_status_check'),
        PrimaryKeyConstraint('id', name='colaboradores_temporarios_pkey'),
        Index('idx_colaboradores_temp_turma', 'turma_id'),
        Index('idx_colaboradores_temp_turma_cpf', 'turma_id', 'cpf', postgresql_where="(status = 'pendente'::text)", unique=True),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    turma_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cpf: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pendente'::text"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    foto_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL da foto do colaborador adicionada pelo instrutor antes de aprovar')
    matricula: Mapped[Optional[str]] = mapped_column(Text, comment='Matrícula do colaborador informada no cadastro')


class Empresas(Base):
    __tablename__ = 'empresas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='empresas_pkey'),
        Index('idx_empresas_certificado_validade', 'certificado_a1_validade', postgresql_where='(certificado_a1_base64 IS NOT NULL)'),
        Index('idx_empresas_cnpj', 'cnpj'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[TipoEmpresa] = mapped_column(Enum(TipoEmpresa, values_callable=lambda cls: [member.value for member in cls], name='tipo_empresa'), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    cnpj: Mapped[Optional[str]] = mapped_column(Text)
    endereco: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[Optional[str]] = mapped_column(Text)
    cep: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    complemento: Mapped[Optional[str]] = mapped_column(Text)
    bairro: Mapped[Optional[str]] = mapped_column(Text)
    possui_gestao_treinamentos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    porte: Mapped[Optional[str]] = mapped_column(Text, comment='Porte da empresa: MEI, ME, EPP, MEDIO, GRANDE')
    site: Mapped[Optional[str]] = mapped_column(Text, comment='Website da empresa (opcional)')
    linkedin: Mapped[Optional[str]] = mapped_column(Text, comment='URL do LinkedIn da empresa (opcional)')
    instagram: Mapped[Optional[str]] = mapped_column(Text, comment='URL do Instagram da empresa (opcional)')
    razao_social: Mapped[Optional[str]] = mapped_column(Text, comment='Razão social da empresa (nome jurídico oficial)')
    nome_fantasia: Mapped[Optional[str]] = mapped_column(Text, comment='Nome fantasia da empresa (nome comercial)')
    certificado_a1_base64: Mapped[Optional[str]] = mapped_column(Text, comment='Arquivo .pfx do certificado A1 em base64')
    certificado_a1_senha: Mapped[Optional[str]] = mapped_column(Text, comment='Senha do certificado A1')
    certificado_a1_cn: Mapped[Optional[str]] = mapped_column(Text, comment='Common Name (CN) extraido do certificado')
    certificado_a1_emissor: Mapped[Optional[str]] = mapped_column(Text, comment='Autoridade Certificadora que emitiu')
    certificado_a1_validade: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), comment='Data de expiracao do certificado')
    certificado_a1_serial: Mapped[Optional[str]] = mapped_column(Text, comment='Numero serial do certificado')
    certificado_a1_atualizado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), comment='Data da ultima atualizacao do certificado')

    auditoria_config: Mapped['AuditoriaConfig'] = relationship('AuditoriaConfig', uselist=False, back_populates='empresa')
    cargos: Mapped[list['Cargos']] = relationship('Cargos', back_populates='empresa')
    categorias_clientes_empresa: Mapped[list['CategoriasClientesEmpresa']] = relationship('CategoriasClientesEmpresa', back_populates='empresa')
    categorias_produtos: Mapped[list['CategoriasProdutos']] = relationship('CategoriasProdutos', back_populates='empresa')
    centros_custo: Mapped[list['CentrosCusto']] = relationship('CentrosCusto', back_populates='empresa')
    classificacoes_produtos: Mapped[list['ClassificacoesProdutos']] = relationship('ClassificacoesProdutos', back_populates='empresa')
    closer_colunas: Mapped[list['CloserColunas']] = relationship('CloserColunas', back_populates='empresa')
    closer_etiquetas: Mapped[list['CloserEtiquetas']] = relationship('CloserEtiquetas', back_populates='empresa')
    closer_modelos_atividade: Mapped[list['CloserModelosAtividade']] = relationship('CloserModelosAtividade', back_populates='empresa')
    comercial_funil: Mapped[list['ComercialFunil']] = relationship('ComercialFunil', back_populates='empresa')
    condicoes_pagamento: Mapped[list['CondicoesPagamento']] = relationship('CondicoesPagamento', back_populates='empresa')
    configuracoes_empresa: Mapped['ConfiguracoesEmpresa'] = relationship('ConfiguracoesEmpresa', uselist=False, back_populates='empresa')
    contas_bancarias: Mapped[list['ContasBancarias']] = relationship('ContasBancarias', back_populates='empresa')
    contas_pagar_colunas: Mapped[list['ContasPagarColunas']] = relationship('ContasPagarColunas', back_populates='empresa')
    contas_receber_colunas: Mapped[list['ContasReceberColunas']] = relationship('ContasReceberColunas', back_populates='empresa')
    cross_selling_colunas: Mapped[list['CrossSellingColunas']] = relationship('CrossSellingColunas', back_populates='empresa')
    cross_selling_etiquetas: Mapped[list['CrossSellingEtiquetas']] = relationship('CrossSellingEtiquetas', back_populates='empresa')
    empresa_configuracoes: Mapped['EmpresaConfiguracoes'] = relationship('EmpresaConfiguracoes', uselist=False, back_populates='empresa')
    empresa_contatos: Mapped[list['EmpresaContatos']] = relationship('EmpresaContatos', back_populates='empresa')
    empresa_integracoes_esocial: Mapped['EmpresaIntegracoesEsocial'] = relationship('EmpresaIntegracoesEsocial', uselist=False, back_populates='empresa')
    empresas_modulos: Mapped[list['EmpresasModulos']] = relationship('EmpresasModulos', back_populates='empresa')
    empresas_modulos_telas: Mapped[list['EmpresasModulosTelas']] = relationship('EmpresasModulosTelas', back_populates='empresa')
    equipamentos_categorias: Mapped[list['EquipamentosCategorias']] = relationship('EquipamentosCategorias', back_populates='empresa')
    equipamentos_finalidades: Mapped[list['EquipamentosFinalidades']] = relationship('EquipamentosFinalidades', back_populates='empresa')
    equipamentos_kits: Mapped[list['EquipamentosKits']] = relationship('EquipamentosKits', back_populates='empresa')
    equipamentos_modelos_atividade: Mapped[list['EquipamentosModelosAtividade']] = relationship('EquipamentosModelosAtividade', back_populates='empresa')
    equipamentos_sst: Mapped[list['EquipamentosSst']] = relationship('EquipamentosSst', back_populates='empresa')
    equipamentos_status: Mapped[list['EquipamentosStatus']] = relationship('EquipamentosStatus', back_populates='empresa')
    equipamentos_unidades: Mapped[list['EquipamentosUnidades']] = relationship('EquipamentosUnidades', back_populates='empresa')
    financeiro_contas: Mapped[list['FinanceiroContas']] = relationship('FinanceiroContas', back_populates='empresa')
    formas_cobranca: Mapped[list['FormasCobranca']] = relationship('FormasCobranca', back_populates='empresa')
    formas_pagamento: Mapped[list['FormasPagamento']] = relationship('FormasPagamento', back_populates='empresa')
    fornecedores: Mapped[list['Fornecedores']] = relationship('Fornecedores', back_populates='empresa')
    frota_motoristas: Mapped[list['FrotaMotoristas']] = relationship('FrotaMotoristas', back_populates='empresa')
    frota_veiculos: Mapped[list['FrotaVeiculos']] = relationship('FrotaVeiculos', back_populates='empresa')
    funil_etiquetas: Mapped[list['FunilEtiquetas']] = relationship('FunilEtiquetas', back_populates='empresa')
    funil_negocio_configuracoes: Mapped['FunilNegocioConfiguracoes'] = relationship('FunilNegocioConfiguracoes', uselist=False, back_populates='empresa')
    google_oauth_tokens: Mapped['GoogleOauthTokens'] = relationship('GoogleOauthTokens', uselist=False, back_populates='empresa')
    grupos_clientes: Mapped[list['GruposClientes']] = relationship('GruposClientes', back_populates='empresa')
    import_queue: Mapped[list['ImportQueue']] = relationship('ImportQueue', back_populates='empresa')
    informacoes_empresa: Mapped['InformacoesEmpresa'] = relationship('InformacoesEmpresa', uselist=False, back_populates='empresa')
    modelos_atividade: Mapped[list['ModelosAtividade']] = relationship('ModelosAtividade', back_populates='empresa')
    modelos_contrato: Mapped[list['ModelosContrato']] = relationship('ModelosContrato', back_populates='empresa')
    modelos_proposta_comercial: Mapped[list['ModelosPropostaComercial']] = relationship('ModelosPropostaComercial', back_populates='empresa')
    naturezas_produtos: Mapped[list['NaturezasProdutos']] = relationship('NaturezasProdutos', back_populates='empresa')
    notificacoes: Mapped[list['Notificacoes']] = relationship('Notificacoes', back_populates='empresa')
    origens_contato: Mapped[list['OrigensContato']] = relationship('OrigensContato', back_populates='empresa')
    pacotes_produtos: Mapped[list['PacotesProdutos']] = relationship('PacotesProdutos', back_populates='empresa')
    perigos: Mapped[list['Perigos']] = relationship('Perigos', back_populates='empresa')
    plano_despesas: Mapped[list['PlanoDespesas']] = relationship('PlanoDespesas', back_populates='empresa')
    plano_receitas: Mapped[list['PlanoReceitas']] = relationship('PlanoReceitas', back_populates='empresa')
    planos_produtos: Mapped[list['PlanosProdutos']] = relationship('PlanosProdutos', back_populates='empresa')
    pos_venda_colunas: Mapped[list['PosVendaColunas']] = relationship('PosVendaColunas', back_populates='empresa')
    pos_venda_etiquetas: Mapped[list['PosVendaEtiquetas']] = relationship('PosVendaEtiquetas', back_populates='empresa')
    propostas_modelos: Mapped[list['PropostasModelos']] = relationship('PropostasModelos', back_populates='empresa')
    prospeccao_colunas: Mapped[list['ProspeccaoColunas']] = relationship('ProspeccaoColunas', back_populates='empresa')
    prospeccao_etiquetas: Mapped[list['ProspeccaoEtiquetas']] = relationship('ProspeccaoEtiquetas', back_populates='empresa')
    prospeccao_modelos: Mapped[list['ProspeccaoModelos']] = relationship('ProspeccaoModelos', back_populates='empresa')
    riscos: Mapped[list['Riscos']] = relationship('Riscos', back_populates='empresa')
    saude_ocupacional: Mapped[list['SaudeOcupacional']] = relationship('SaudeOcupacional', back_populates='empresa')
    servicos: Mapped[list['Servicos']] = relationship('Servicos', back_populates='empresa')
    setores: Mapped[list['Setores']] = relationship('Setores', back_populates='empresa')
    tickets_sla_config: Mapped['TicketsSlaConfig'] = relationship('TicketsSlaConfig', uselist=False, back_populates='empresa')
    tickets_suporte_empresa_destino: Mapped[list['TicketsSuporte']] = relationship('TicketsSuporte', foreign_keys='[TicketsSuporte.empresa_destino_id]', back_populates='empresa_destino')
    tickets_suporte_empresa_solicitante: Mapped[list['TicketsSuporte']] = relationship('TicketsSuporte', foreign_keys='[TicketsSuporte.empresa_solicitante_id]', back_populates='empresa_solicitante')
    tipos_produtos: Mapped[list['TiposProdutos']] = relationship('TiposProdutos', back_populates='empresa')
    tipos_servico: Mapped[list['TiposServico']] = relationship('TiposServico', back_populates='empresa')
    whatsapp_configuracoes: Mapped['WhatsappConfiguracoes'] = relationship('WhatsappConfiguracoes', uselist=False, back_populates='empresa')
    whatsapp_templates: Mapped[list['WhatsappTemplates']] = relationship('WhatsappTemplates', back_populates='empresa')
    white_label_config: Mapped['WhiteLabelConfig'] = relationship('WhiteLabelConfig', uselist=False, back_populates='empresa')
    closer_cards_empresa: Mapped[list['CloserCards']] = relationship('CloserCards', foreign_keys='[CloserCards.empresa_id]', back_populates='empresa')
    closer_cards_empresa_lead: Mapped[list['CloserCards']] = relationship('CloserCards', foreign_keys='[CloserCards.empresa_lead_id]', back_populates='empresa_lead')
    cross_selling_cards: Mapped[list['CrossSellingCards']] = relationship('CrossSellingCards', back_populates='empresa')
    frota_checklists: Mapped[list['FrotaChecklists']] = relationship('FrotaChecklists', back_populates='empresa')
    frota_custos: Mapped[list['FrotaCustos']] = relationship('FrotaCustos', back_populates='empresa')
    frota_documentos: Mapped[list['FrotaDocumentos']] = relationship('FrotaDocumentos', back_populates='empresa')
    frota_manutencoes: Mapped[list['FrotaManutencoes']] = relationship('FrotaManutencoes', back_populates='empresa')
    frota_ocorrencias: Mapped[list['FrotaOcorrencias']] = relationship('FrotaOcorrencias', back_populates='empresa')
    funis: Mapped[list['Funis']] = relationship('Funis', back_populates='empresa')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='empresa')
    profiles: Mapped[list['Profiles']] = relationship('Profiles', back_populates='empresa')
    prospeccao_cards_empresa: Mapped[list['ProspeccaoCards']] = relationship('ProspeccaoCards', foreign_keys='[ProspeccaoCards.empresa_id]', back_populates='empresa')
    prospeccao_cards_empresa_lead: Mapped[list['ProspeccaoCards']] = relationship('ProspeccaoCards', foreign_keys='[ProspeccaoCards.empresa_lead_id]', back_populates='empresa_lead')
    whatsapp_campanhas: Mapped[list['WhatsappCampanhas']] = relationship('WhatsappCampanhas', back_populates='empresa')
    access_logs: Mapped[list['AccessLogs']] = relationship('AccessLogs', back_populates='empresa')
    agenda_permissoes: Mapped[list['AgendaPermissoes']] = relationship('AgendaPermissoes', back_populates='empresa')
    clientes_sst_cliente_empresa: Mapped[list['ClientesSst']] = relationship('ClientesSst', foreign_keys='[ClientesSst.cliente_empresa_id]', back_populates='cliente_empresa')
    clientes_sst_empresa_sst: Mapped[list['ClientesSst']] = relationship('ClientesSst', foreign_keys='[ClientesSst.empresa_sst_id]', back_populates='empresa_sst')
    contas_pagar: Mapped[list['ContasPagar']] = relationship('ContasPagar', back_populates='empresa')
    esocial_event_logs: Mapped[list['EsocialEventLogs']] = relationship('EsocialEventLogs', back_populates='empresa')
    funis_configuracoes: Mapped[list['FunisConfiguracoes']] = relationship('FunisConfiguracoes', back_populates='empresa')
    agenda_eventos: Mapped[list['AgendaEventos']] = relationship('AgendaEventos', back_populates='empresa')
    automacoes: Mapped[list['Automacoes']] = relationship('Automacoes', back_populates='empresa')
    contas_receber: Mapped[list['ContasReceber']] = relationship('ContasReceber', back_populates='empresa')
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='empresa')
    equipamentos_movimentacoes: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', back_populates='empresa')
    pos_venda_cards: Mapped[list['PosVendaCards']] = relationship('PosVendaCards', back_populates='empresa')
    profissionais_saude: Mapped[list['ProfissionaisSaude']] = relationship('ProfissionaisSaude', back_populates='empresa')
    profissionais_seguranca: Mapped[list['ProfissionaisSeguranca']] = relationship('ProfissionaisSeguranca', back_populates='empresa')
    automacoes_execucoes: Mapped[list['AutomacoesExecucoes']] = relationship('AutomacoesExecucoes', back_populates='empresa')
    frota_utilizacoes: Mapped[list['FrotaUtilizacoes']] = relationship('FrotaUtilizacoes', back_populates='empresa')
    funil_card_comparacoes: Mapped[list['FunilCardComparacoes']] = relationship('FunilCardComparacoes', back_populates='empresa')
    funil_card_orcamentos: Mapped[list['FunilCardOrcamentos']] = relationship('FunilCardOrcamentos', back_populates='empresa')
    funil_card_orcamentos_servicos_sst: Mapped[list['FunilCardOrcamentosServicosSst']] = relationship('FunilCardOrcamentosServicosSst', back_populates='empresa')
    funil_card_propostas: Mapped[list['FunilCardPropostas']] = relationship('FunilCardPropostas', back_populates='empresa')
    propostas_comerciais_servicos_sst: Mapped[list['PropostasComerciaisServicosSst']] = relationship('PropostasComerciaisServicosSst', back_populates='empresa')
    propostas_comerciais_treinamentos: Mapped[list['PropostasComerciaisTreinamentos']] = relationship('PropostasComerciaisTreinamentos', back_populates='empresa')
    propostas_comerciais_vertical365: Mapped[list['PropostasComerciaisVertical365']] = relationship('PropostasComerciaisVertical365', back_populates='empresa')
    unidades_clientes: Mapped[list['UnidadesClientes']] = relationship('UnidadesClientes', back_populates='empresa')


class LeadsLanding(Base):
    __tablename__ = 'leads_landing'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='leads_landing_pkey'),
        Index('idx_leads_landing_created_at', 'created_at'),
        Index('idx_leads_landing_email', 'email'),
        {'comment': 'Leads capturados via formulário da landing page',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    empresa: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    telefone: Mapped[str] = mapped_column(Text, nullable=False)
    segmento: Mapped[Optional[str]] = mapped_column(Text)
    mensagem: Mapped[Optional[str]] = mapped_column(Text)
    cnpj: Mapped[Optional[str]] = mapped_column(Text, comment='CNPJ opcional da empresa')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class Modulos(Base):
    __tablename__ = 'modulos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='modulos_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    rota: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    icone: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Package'::text"))

    empresas_modulos: Mapped[list['EmpresasModulos']] = relationship('EmpresasModulos', back_populates='modulo')
    empresas_modulos_telas: Mapped[list['EmpresasModulosTelas']] = relationship('EmpresasModulosTelas', back_populates='modulo')


class NewsletterConfig(Base):
    __tablename__ = 'newsletter_config'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='newsletter_config_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    frequencia_diaria: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('1'))
    horarios_disparo: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()), server_default=text("ARRAY['09:00'::text]"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    ultima_execucao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class NewsletterConteudos(Base):
    __tablename__ = 'newsletter_conteudos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='newsletter_conteudos_pkey'),
        UniqueConstraint('slug', name='newsletter_conteudos_slug_key'),
        Index('idx_newsletter_conteudos_agendado', 'agendado_para'),
        Index('idx_newsletter_conteudos_status', 'status'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(500), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    conteudo: Mapped[Optional[str]] = mapped_column(Text)
    imagem_capa_url: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'rascunho'::character varying"))
    agendado_para: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    enviado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    total_enviados: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class NewsletterDisparos(Base):
    __tablename__ = 'newsletter_disparos'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='newsletter_disparos_pkey'),
        Index('idx_newsletter_disparo_unico', 'tipo', 'referencia_id', unique=True),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    referencia_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    total_enviados: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class NewsletterInscricoes(Base):
    __tablename__ = 'newsletter_inscricoes'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='newsletter_inscricoes_pkey'),
        UniqueConstraint('email', name='newsletter_inscricoes_email_key'),
        Index('idx_newsletter_ativo', 'ativo'),
        Index('idx_newsletter_email', 'email'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    empresa: Mapped[Optional[str]] = mapped_column(String(255))
    cargo: Mapped[Optional[str]] = mapped_column(String(255))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    unsubscribed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))


class NotificacaoConfig(Base):
    __tablename__ = 'notificacao_config'
    __table_args__ = (
        PrimaryKeyConstraint('tabela', name='notificacao_config_pkey'),
        {'schema': 'public'}
    )

    tabela: Mapped[str] = mapped_column(Text, primary_key=True)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    tela: Mapped[Optional[str]] = mapped_column(Text)
    campo_nome: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'nome'::text"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))


class SystemUpdates(Base):
    __tablename__ = 'system_updates'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='system_updates_pkey'),
        UniqueConstraint('version', name='system_updates_version_key'),
        Index('idx_system_updates_is_active', 'is_active'),
        Index('idx_system_updates_release_date', 'release_date'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    changelog: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    release_date: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    user_update_views: Mapped[list['UserUpdateViews']] = relationship('UserUpdateViews', back_populates='update')


class Terceiros(Base):
    __tablename__ = 'terceiros'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='terceiros_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_empresa_terceira: Mapped[str] = mapped_column(Text, nullable=False)
    responsavel: Mapped[str] = mapped_column(Text, nullable=False)
    status_conformidade: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pendente'::text"))
    data_validade_documentos: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    documentos_entregues: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))


class TiposEmpresa(Base):
    __tablename__ = 'tipos_empresa'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tipos_empresa_pkey'),
        UniqueConstraint('nome', name='tipos_empresa_nome_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class TiposSinistro(Base):
    __tablename__ = 'tipos_sinistro'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='tipos_sinistro_pkey'),
        UniqueConstraint('codigo', name='tipos_sinistro_codigo_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    acao_padrao: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'reprovacao'::character varying"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    sinistros_colaborador: Mapped[list['SinistrosColaborador']] = relationship('SinistrosColaborador', back_populates='tipo_sinistro')


class Vagas(Base):
    __tablename__ = 'vagas'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='vagas_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    requisitos: Mapped[Optional[str]] = mapped_column(Text)
    beneficios: Mapped[Optional[str]] = mapped_column(Text)
    tipo_contrato: Mapped[Optional[str]] = mapped_column(Text)
    modalidade: Mapped[Optional[str]] = mapped_column(Text)
    local: Mapped[Optional[str]] = mapped_column(Text)
    salario_faixa: Mapped[Optional[str]] = mapped_column(Text)
    ativa: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    exibir_salario: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))

    candidaturas: Mapped[list['Candidaturas']] = relationship('Candidaturas', back_populates='vaga')


class AuditoriaConfig(Base):
    __tablename__ = 'auditoria_config'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='auditoria_config_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='auditoria_config_pkey'),
        UniqueConstraint('empresa_id', name='auditoria_config_empresa_id_key'),
        Index('idx_auditoria_config_empresa', 'empresa_id'),
        {'comment': 'Configurações de auditoria por empresa, incluindo tempo de '
                'expiração de logs',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    dias_expiracao: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('60'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='auditoria_config')


class Blogs(Base):
    __tablename__ = 'blogs'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['rascunho'::character varying, 'escrita'::character varying, 'revisao'::character varying, 'arquivado'::character varying, 'publicado'::character varying]::text[])", name='blogs_status_check'),
        ForeignKeyConstraint(['autor_id'], ['public.blog_autores.id'], ondelete='SET NULL', name='blogs_autor_id_fkey'),
        ForeignKeyConstraint(['categoria_id'], ['public.blog_categorias.id'], ondelete='SET NULL', name='blogs_categoria_id_fkey'),
        PrimaryKeyConstraint('id', name='blogs_pkey'),
        UniqueConstraint('slug', name='blogs_slug_key'),
        Index('idx_blogs_autor', 'autor_id'),
        Index('idx_blogs_categoria', 'categoria_id'),
        Index('idx_blogs_publicado_em', 'publicado_em'),
        Index('idx_blogs_slug', 'slug'),
        Index('idx_blogs_status', 'status'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    conteudo: Mapped[Optional[str]] = mapped_column(Text)
    imagem_capa_url: Mapped[Optional[str]] = mapped_column(Text)
    autor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    categoria_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'rascunho'::character varying"))
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    tempo_leitura: Mapped[Optional[int]] = mapped_column(Integer)
    visualizacoes: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    publicado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    autor: Mapped[Optional['BlogAutores']] = relationship('BlogAutores', back_populates='blogs')
    categoria: Mapped[Optional['BlogCategorias']] = relationship('BlogCategorias', back_populates='blogs')
    blog_visualizacoes: Mapped[list['BlogVisualizacoes']] = relationship('BlogVisualizacoes', back_populates='blog')


class Candidaturas(Base):
    __tablename__ = 'candidaturas'
    __table_args__ = (
        ForeignKeyConstraint(['vaga_id'], ['public.vagas.id'], ondelete='SET NULL', name='candidaturas_vaga_id_fkey'),
        PrimaryKeyConstraint('id', name='candidaturas_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome_completo: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    vaga_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    cep: Mapped[Optional[str]] = mapped_column(Text)
    logradouro: Mapped[Optional[str]] = mapped_column(Text)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    complemento: Mapped[Optional[str]] = mapped_column(Text)
    bairro: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[Optional[str]] = mapped_column(Text)
    grau_escolaridade: Mapped[Optional[str]] = mapped_column(Text)
    formacoes: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    cursos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    sobre_voce: Mapped[Optional[str]] = mapped_column(Text)
    experiencias: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    diferenciais: Mapped[Optional[str]] = mapped_column(Text)

    vaga: Mapped[Optional['Vagas']] = relationship('Vagas', back_populates='candidaturas')


class Cargos(Base):
    __tablename__ = 'cargos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='cargos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='cargos_pkey'),
        UniqueConstraint('empresa_id', 'nome', name='cargos_empresa_id_nome_key'),
        Index('idx_cargos_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    cbo: Mapped[Optional[str]] = mapped_column(String(10), comment='Código CBO da ocupação')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='cargos')


class CategoriasClientesEmpresa(Base):
    __tablename__ = 'categorias_clientes_empresa'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='categorias_clientes_empresa_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='categorias_clientes_empresa_pkey'),
        UniqueConstraint('empresa_id', 'nome', name='categorias_clientes_empresa_empresa_id_nome_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(7), server_default=text("'#6366f1'::character varying"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='categorias_clientes_empresa')
    clientes_sst: Mapped[list['ClientesSst']] = relationship('ClientesSst', back_populates='categoria')


class CategoriasProdutos(Base):
    __tablename__ = 'categorias_produtos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='categorias_produtos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='categorias_produtos_pkey'),
        Index('idx_categorias_produtos_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(7), server_default=text("'#6366f1'::character varying"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='categorias_produtos')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='categoria')


class CentrosCusto(Base):
    __tablename__ = 'centros_custo'
    __table_args__ = (
        CheckConstraint("tipo::text = ANY (ARRAY['receita'::character varying, 'despesa'::character varying, 'ambos'::character varying]::text[])", name='centros_custo_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='centros_custo_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='centros_custo_pkey'),
        Index('idx_centros_custo_empresa_id', 'empresa_id'),
        {'comment': 'Centros de custo para classificação de receitas e despesas',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'ambos'::character varying"))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='centros_custo')


class ClassificacoesProdutos(Base):
    __tablename__ = 'classificacoes_produtos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='classificacoes_produtos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='classificacoes_produtos_pkey'),
        Index('idx_classificacoes_produtos_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='classificacoes_produtos')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='classificacao_')


class CloserColunas(Base):
    __tablename__ = 'closer_colunas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='closer_colunas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_colunas_pkey'),
        Index('idx_closer_colunas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(String(7), server_default=text("'#6366f1'::character varying"))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    meta_valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='closer_colunas')
    closer_cards: Mapped[list['CloserCards']] = relationship('CloserCards', back_populates='coluna')
    closer_card_movimentacoes_coluna_destino: Mapped[list['CloserCardMovimentacoes']] = relationship('CloserCardMovimentacoes', foreign_keys='[CloserCardMovimentacoes.coluna_destino_id]', back_populates='coluna_destino')
    closer_card_movimentacoes_coluna_origem: Mapped[list['CloserCardMovimentacoes']] = relationship('CloserCardMovimentacoes', foreign_keys='[CloserCardMovimentacoes.coluna_origem_id]', back_populates='coluna_origem')


class CloserEtiquetas(Base):
    __tablename__ = 'closer_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='closer_etiquetas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_etiquetas_pkey'),
        Index('idx_closer_etiquetas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(String(7), server_default=text("'#6366f1'::character varying"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='closer_etiquetas')
    closer_card_etiquetas: Mapped[list['CloserCardEtiquetas']] = relationship('CloserCardEtiquetas', back_populates='etiqueta')


class CloserModelosAtividade(Base):
    __tablename__ = 'closer_modelos_atividade'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='closer_modelos_atividade_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_modelos_atividade_pkey'),
        Index('idx_closer_modelos_atividade_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    tipo: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='closer_modelos_atividade')


class ComercialFunil(Base):
    __tablename__ = 'comercial_funil'
    __table_args__ = (
        CheckConstraint("etapa = ANY (ARRAY['lead'::text, 'contato'::text, 'proposta'::text, 'fechamento'::text])", name='comercial_funil_etapa_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='comercial_funil_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='comercial_funil_pkey'),
        Index('idx_comercial_funil_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome_lead: Mapped[str] = mapped_column(Text, nullable=False)
    etapa: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'lead'::text"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    email: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    valor_estimado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 2))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='comercial_funil')


class CondicoesPagamento(Base):
    __tablename__ = 'condicoes_pagamento'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='condicoes_pagamento_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='condicoes_pagamento_pkey'),
        Index('idx_condicoes_pagamento_empresa', 'empresa_id'),
        {'comment': 'Condições de pagamento disponíveis para vendas',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    parcelas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'), comment='Número de parcelas')
    intervalo_dias: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('30'), comment='Intervalo em dias entre as parcelas')
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    entrada_percentual: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2), server_default=text('0'), comment='Percentual de entrada (0-100)')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='condicoes_pagamento')


class ConfiguracoesEmpresa(Base):
    __tablename__ = 'configuracoes_empresa'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='configuracoes_empresa_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='configuracoes_empresa_pkey'),
        UniqueConstraint('empresa_id', name='configuracoes_empresa_empresa_id_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    cor_primaria: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'#3b82f6'::text"))
    cor_secundaria: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'#1e40af'::text"))
    tema: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'light'::text"))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='configuracoes_empresa')


class ContasBancarias(Base):
    __tablename__ = 'contas_bancarias'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['corrente'::text, 'poupanca'::text, 'investimento'::text])", name='contas_bancarias_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='contas_bancarias_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_bancarias_pkey'),
        Index('idx_contas_bancarias_empresa', 'empresa_id'),
        {'comment': 'Contas bancárias da empresa para gestão financeira',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    banco: Mapped[str] = mapped_column(Text, nullable=False)
    agencia: Mapped[str] = mapped_column(Text, nullable=False)
    conta: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, comment='Tipo de conta: corrente, poupanca, investimento')
    saldo_inicial: Mapped[decimal.Decimal] = mapped_column(Numeric(15, 2), nullable=False, server_default=text('0'))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contas_bancarias')


class ContasPagarColunas(Base):
    __tablename__ = 'contas_pagar_colunas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='contas_pagar_colunas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_pagar_colunas_pkey'),
        Index('idx_contas_pagar_colunas_empresa_id', 'empresa_id'),
        {'comment': 'Colunas do Kanban de contas a pagar', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'#6366f1'::text"))
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contas_pagar_colunas')
    contas_pagar: Mapped[list['ContasPagar']] = relationship('ContasPagar', back_populates='coluna')
    contas_pagar_movimentacoes_coluna_destino: Mapped[list['ContasPagarMovimentacoes']] = relationship('ContasPagarMovimentacoes', foreign_keys='[ContasPagarMovimentacoes.coluna_destino_id]', back_populates='coluna_destino')
    contas_pagar_movimentacoes_coluna_origem: Mapped[list['ContasPagarMovimentacoes']] = relationship('ContasPagarMovimentacoes', foreign_keys='[ContasPagarMovimentacoes.coluna_origem_id]', back_populates='coluna_origem')


class ContasReceberColunas(Base):
    __tablename__ = 'contas_receber_colunas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='contas_receber_colunas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_receber_colunas_pkey'),
        Index('idx_contas_receber_colunas_empresa', 'empresa_id'),
        {'comment': 'Colunas do Kanban de contas a receber', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'#6366f1'::text"))
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contas_receber_colunas')
    contas_receber: Mapped[list['ContasReceber']] = relationship('ContasReceber', back_populates='coluna')
    contas_receber_movimentacoes_coluna_destino: Mapped[list['ContasReceberMovimentacoes']] = relationship('ContasReceberMovimentacoes', foreign_keys='[ContasReceberMovimentacoes.coluna_destino_id]', back_populates='coluna_destino')
    contas_receber_movimentacoes_coluna_origem: Mapped[list['ContasReceberMovimentacoes']] = relationship('ContasReceberMovimentacoes', foreign_keys='[ContasReceberMovimentacoes.coluna_origem_id]', back_populates='coluna_origem')


class CrossSellingColunas(Base):
    __tablename__ = 'cross_selling_colunas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='cross_selling_colunas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='cross_selling_colunas_pkey'),
        Index('idx_cross_selling_colunas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'#6366f1'::text"))
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    meta_valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='cross_selling_colunas')
    cross_selling_cards: Mapped[list['CrossSellingCards']] = relationship('CrossSellingCards', back_populates='coluna')


class CrossSellingEtiquetas(Base):
    __tablename__ = 'cross_selling_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='cross_selling_etiquetas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='cross_selling_etiquetas_pkey'),
        Index('idx_cross_selling_etiquetas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'#6366f1'::text"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='cross_selling_etiquetas')
    card: Mapped[list['CrossSellingCards']] = relationship('CrossSellingCards', secondary='public.cross_selling_card_etiquetas', back_populates='etiqueta')


class EmpresaConfiguracoes(Base):
    __tablename__ = 'empresa_configuracoes'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='empresa_configuracoes_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='empresa_configuracoes_pkey'),
        UniqueConstraint('empresa_id', name='empresa_configuracoes_empresa_id_key'),
        Index('idx_empresa_configuracoes_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_fantasia: Mapped[Optional[str]] = mapped_column(Text)
    idioma: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'pt-BR'::text"))
    fuso_horario: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'America/Sao_Paulo'::text"))
    formato_data: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'dd/MM/yyyy'::text"))
    formato_moeda: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'BRL'::text"))
    notif_email: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    notif_sistema: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    notif_treinamentos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    notif_vencimentos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    notif_documentos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    autenticacao_2fa: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    sessao_timeout: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('30'))
    log_acessos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    tema: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'system'::text"))
    cor_primaria: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'#8b5cf6'::text"))
    modelo_certificado: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'padrao'::text"))
    assinatura_digital: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    rodape_padrao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='empresa_configuracoes')


class EmpresaContatos(Base):
    __tablename__ = 'empresa_contatos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='empresa_contatos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='empresa_contatos_pkey'),
        Index('idx_empresa_contatos_empresa_id', 'empresa_id'),
        {'comment': 'Contatos das empresas', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cargo: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    linkedin: Mapped[Optional[str]] = mapped_column(Text)
    principal: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'), comment='Indica se é o contato principal da empresa')
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='empresa_contatos')


class EmpresaIntegracoesEsocial(Base):
    __tablename__ = 'empresa_integracoes_esocial'
    __table_args__ = (
        CheckConstraint("esocial_ambiente::text = ANY (ARRAY['1'::character varying, '2'::character varying]::text[])", name='empresa_integracoes_esocial_esocial_ambiente_check'),
        CheckConstraint("esocial_tipo_inscricao::text = ANY (ARRAY['1'::character varying, '2'::character varying, '3'::character varying, '4'::character varying, '5'::character varying, '6'::character varying]::text[])", name='empresa_integracoes_esocial_esocial_tipo_inscricao_check'),
        CheckConstraint("govbr_environment::text = ANY (ARRAY['staging'::character varying, 'production'::character varying]::text[])", name='empresa_integracoes_esocial_govbr_environment_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='empresa_integracoes_esocial_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='empresa_integracoes_esocial_pkey'),
        UniqueConstraint('empresa_id', name='empresa_integracoes_esocial_empresa_unique'),
        Index('idx_empresa_integracoes_esocial_empresa_id', 'empresa_id'),
        Index('idx_empresa_integracoes_esocial_updated_at', 'updated_at'),
        {'comment': 'Configurações de integração Gov.br e eSocial por empresa '
                '(multi-tenant por empresa_id).',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    govbr_environment: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'staging'::character varying"))
    esocial_tipo_inscricao: Mapped[str] = mapped_column(String(1), nullable=False, server_default=text("'1'::character varying"))
    esocial_ambiente: Mapped[str] = mapped_column(String(1), nullable=False, server_default=text("'2'::character varying"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    govbr_client_id: Mapped[Optional[str]] = mapped_column(Text)
    govbr_client_secret_enc: Mapped[Optional[str]] = mapped_column(Text, comment='Client secret do Gov.br criptografado pelo backend.')
    govbr_redirect_uri: Mapped[Optional[str]] = mapped_column(Text)
    esocial_cert_base64_enc: Mapped[Optional[str]] = mapped_column(Text, comment='Certificado A1 (.pfx/.p12 em base64) criptografado pelo backend.')
    esocial_cert_password_enc: Mapped[Optional[str]] = mapped_column(Text, comment='Senha do certificado eSocial criptografada pelo backend.')
    esocial_nr_inscricao: Mapped[Optional[str]] = mapped_column(String(50))
    certificado_alias: Mapped[Optional[str]] = mapped_column(String(255))
    certificado_valido_ate: Mapped[Optional[datetime.date]] = mapped_column(Date)
    # Metadados do certificado A1 para exibição (migration d4e5f6a7b8c9).
    certificado_cn: Mapped[Optional[str]] = mapped_column(Text)
    certificado_serial: Mapped[Optional[str]] = mapped_column(Text)
    certificado_emissor: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='empresa_integracoes_esocial')


class EmpresasModulos(Base):
    __tablename__ = 'empresas_modulos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='empresas_modulos_empresa_id_fkey'),
        ForeignKeyConstraint(['modulo_id'], ['public.modulos.id'], ondelete='CASCADE', name='empresas_modulos_modulo_id_fkey'),
        PrimaryKeyConstraint('id', name='empresas_modulos_pkey'),
        UniqueConstraint('empresa_id', 'modulo_id', name='empresas_modulos_empresa_id_modulo_id_key'),
        Index('idx_empresas_modulos_modulo_id', 'modulo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    modulo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='empresas_modulos')
    modulo: Mapped['Modulos'] = relationship('Modulos', back_populates='empresas_modulos')


class EmpresasModulosTelas(Base):
    __tablename__ = 'empresas_modulos_telas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='empresas_modulos_telas_empresa_id_fkey'),
        ForeignKeyConstraint(['modulo_id'], ['public.modulos.id'], ondelete='CASCADE', name='empresas_modulos_telas_modulo_id_fkey'),
        PrimaryKeyConstraint('id', name='empresas_modulos_telas_pkey'),
        UniqueConstraint('empresa_id', 'modulo_id', 'tela_id', name='empresas_modulos_telas_empresa_id_modulo_id_tela_id_key'),
        Index('idx_empresas_modulos_telas_empresa_id', 'empresa_id'),
        Index('idx_empresas_modulos_telas_empresa_modulo', 'empresa_id', 'modulo_id'),
        Index('idx_empresas_modulos_telas_modulo_id', 'modulo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    modulo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tela_id: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='empresas_modulos_telas')
    modulo: Mapped['Modulos'] = relationship('Modulos', back_populates='empresas_modulos_telas')


class EquipamentosCategorias(Base):
    __tablename__ = 'equipamentos_categorias'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_categorias_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_categorias_pkey'),
        UniqueConstraint('empresa_id', 'nome', name='equipamentos_categorias_empresa_id_nome_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_categorias')


class EquipamentosFinalidades(Base):
    __tablename__ = 'equipamentos_finalidades'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_finalidades_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_finalidades_pkey'),
        UniqueConstraint('empresa_id', 'nome', name='equipamentos_finalidades_empresa_id_nome_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_finalidades')


class EquipamentosKits(Base):
    __tablename__ = 'equipamentos_kits'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_kits_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_kits_pkey'),
        UniqueConstraint('empresa_id', 'codigo', name='equipamentos_kits_empresa_id_codigo_key'),
        Index('idx_equipamentos_kits_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    codigo: Mapped[str] = mapped_column(Text, nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'))
    tipo_servico: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_kits')
    equipamentos_kit_itens: Mapped[list['EquipamentosKitItens']] = relationship('EquipamentosKitItens', back_populates='kit')
    equipamentos_movimentacoes: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', back_populates='kit')


class EquipamentosModelosAtividade(Base):
    __tablename__ = 'equipamentos_modelos_atividade'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['tarefa'::text, 'checklist'::text])", name='equipamentos_modelos_atividade_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_modelos_atividade_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_modelos_atividade_pkey'),
        Index('idx_equipamentos_modelos_atividade_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    itens: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_modelos_atividade')


class EquipamentosSst(Base):
    __tablename__ = 'equipamentos_sst'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_sst_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_sst_pkey'),
        UniqueConstraint('empresa_id', 'codigo', name='equipamentos_sst_empresa_id_codigo_key'),
        Index('idx_equipamentos_sst_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    codigo: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    numero_serie: Mapped[Optional[str]] = mapped_column(Text)
    unidade_medida: Mapped[Optional[str]] = mapped_column(Text)
    quantidade: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('1'))
    usado_para: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'disponivel'::text"))
    local_base: Mapped[Optional[str]] = mapped_column(Text)
    validade_calibracao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_sst')
    equipamentos_kit_itens: Mapped[list['EquipamentosKitItens']] = relationship('EquipamentosKitItens', back_populates='equipamento')
    equipamentos_movimentacoes: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', back_populates='equipamento')


class EquipamentosStatus(Base):
    __tablename__ = 'equipamentos_status'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_status_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_status_pkey'),
        UniqueConstraint('empresa_id', 'codigo', name='equipamentos_status_empresa_id_codigo_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    codigo: Mapped[str] = mapped_column(Text, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'bg-gray-100 text-gray-700 border-gray-300'::text"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_status')


class EquipamentosUnidades(Base):
    __tablename__ = 'equipamentos_unidades'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_unidades_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_unidades_pkey'),
        UniqueConstraint('empresa_id', 'nome', name='equipamentos_unidades_empresa_id_nome_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_unidades')


class FinanceiroContas(Base):
    __tablename__ = 'financeiro_contas'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['pendente'::text, 'pago'::text, 'cancelado'::text])", name='financeiro_contas_status_check'),
        CheckConstraint("tipo = ANY (ARRAY['pagar'::text, 'receber'::text])", name='financeiro_contas_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='financeiro_contas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='financeiro_contas_pkey'),
        Index('idx_financeiro_contas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[decimal.Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    vencimento: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pendente'::text"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='financeiro_contas')


class FormasCobranca(Base):
    __tablename__ = 'formas_cobranca'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='formas_cobranca_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='formas_cobranca_pkey'),
        Index('idx_formas_cobranca_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    periodicidade: Mapped[int] = mapped_column(Integer, nullable=False)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='formas_cobranca')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='forma_cobranca_')


class FormasPagamento(Base):
    __tablename__ = 'formas_pagamento'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='formas_pagamento_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='formas_pagamento_pkey'),
        Index('idx_formas_pagamento_empresa_id', 'empresa_id'),
        {'comment': 'Formas de pagamento aceitas pela empresa', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    taxa_percentual: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2), server_default=text('0'))
    dias_recebimento: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='formas_pagamento')


class Fornecedores(Base):
    __tablename__ = 'fornecedores'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='fornecedores_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='fornecedores_pkey'),
        Index('idx_fornecedores_empresa', 'empresa_id'),
        {'comment': 'Cadastro de fornecedores para contas a pagar', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    razao_social: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    nome_fantasia: Mapped[Optional[str]] = mapped_column(Text)
    cnpj_cpf: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    endereco: Mapped[Optional[str]] = mapped_column(Text)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    classificacao_despesa_padrao: Mapped[Optional[str]] = mapped_column(String(100), comment='Classificação de despesa padrão para este fornecedor (tipo do plano_despesas)')
    descricao_despesa_padrao: Mapped[Optional[str]] = mapped_column(Text, comment='Descrição de despesa padrão para este fornecedor (nome do plano_despesas)')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='fornecedores')
    contas_pagar: Mapped[list['ContasPagar']] = relationship('ContasPagar', back_populates='fornecedor')


class FrotaMotoristas(Base):
    __tablename__ = 'frota_motoristas'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_motoristas_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_motoristas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_motoristas_pkey'),
        Index('idx_frota_motoristas_created_by', 'created_by'),
        Index('idx_frota_motoristas_empresa', 'empresa_id'),
        {'comment': 'Cadastro de motoristas da frota', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cpf: Mapped[Optional[str]] = mapped_column(Text)
    rg: Mapped[Optional[str]] = mapped_column(Text)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    cnh_numero: Mapped[Optional[str]] = mapped_column(Text)
    cnh_categoria: Mapped[Optional[str]] = mapped_column(Text)
    cnh_validade: Mapped[Optional[datetime.date]] = mapped_column(Date)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    endereco: Mapped[Optional[str]] = mapped_column(Text)
    foto_url: Mapped[Optional[str]] = mapped_column(Text)
    cpf_anexo_url: Mapped[Optional[str]] = mapped_column(Text)
    rg_anexo_url: Mapped[Optional[str]] = mapped_column(Text)
    cnh_anexo_url: Mapped[Optional[str]] = mapped_column(Text)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cep: Mapped[Optional[str]] = mapped_column(Text, comment='CEP do endereço do motorista')
    logradouro: Mapped[Optional[str]] = mapped_column(Text, comment='Rua/Avenida do endereço')
    numero: Mapped[Optional[str]] = mapped_column(Text, comment='Número do endereço')
    complemento: Mapped[Optional[str]] = mapped_column(Text, comment='Complemento do endereço')
    bairro: Mapped[Optional[str]] = mapped_column(Text, comment='Bairro do endereço')
    cidade: Mapped[Optional[str]] = mapped_column(Text, comment='Cidade do endereço')
    estado: Mapped[Optional[str]] = mapped_column(Text, comment='Estado (UF) do endereço')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_motoristas')


class FrotaVeiculos(Base):
    __tablename__ = 'frota_veiculos'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_veiculos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_veiculos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_veiculos_pkey'),
        UniqueConstraint('empresa_id', 'placa', name='frota_veiculos_empresa_id_placa_key'),
        Index('idx_frota_veiculos_created_by', 'created_by'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    placa: Mapped[str] = mapped_column(String(10), nullable=False)
    renavam: Mapped[Optional[str]] = mapped_column(String(20))
    chassi: Mapped[Optional[str]] = mapped_column(String(50))
    marca: Mapped[Optional[str]] = mapped_column(String(100))
    modelo: Mapped[Optional[str]] = mapped_column(String(100))
    ano: Mapped[Optional[str]] = mapped_column(String(20))
    tipo: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Passeio'::character varying"))
    combustivel: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Flex'::character varying"))
    km_atual: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    gestor_responsavel: Mapped[Optional[str]] = mapped_column(String(255))
    motorista_padrao: Mapped[Optional[str]] = mapped_column(String(255))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    checklist_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'), comment='Indica se o checklist é obrigatório antes de cada utilização do veículo')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_veiculos')
    frota_checklists: Mapped[list['FrotaChecklists']] = relationship('FrotaChecklists', back_populates='veiculo')
    frota_custos: Mapped[list['FrotaCustos']] = relationship('FrotaCustos', back_populates='veiculo')
    frota_documentos: Mapped[list['FrotaDocumentos']] = relationship('FrotaDocumentos', back_populates='veiculo')
    frota_manutencoes: Mapped[list['FrotaManutencoes']] = relationship('FrotaManutencoes', back_populates='veiculo')
    frota_ocorrencias: Mapped[list['FrotaOcorrencias']] = relationship('FrotaOcorrencias', back_populates='veiculo')
    frota_utilizacoes: Mapped[list['FrotaUtilizacoes']] = relationship('FrotaUtilizacoes', back_populates='veiculo')


class FunilEtiquetas(Base):
    __tablename__ = 'funil_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funil_etiquetas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_etiquetas_pkey'),
        Index('idx_funil_etiquetas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'#F59E0B'::character varying"))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funil_etiquetas')
    funil_card_etiquetas: Mapped[list['FunilCardEtiquetas']] = relationship('FunilCardEtiquetas', back_populates='etiqueta')


class FunilNegocioConfiguracoes(Base):
    __tablename__ = 'funil_negocio_configuracoes'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funil_negocio_configuracoes_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_negocio_configuracoes_pkey'),
        UniqueConstraint('empresa_id', name='funil_negocio_configuracoes_empresa_id_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    acao_etiquetas: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    acao_encaminhar_card: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    acao_elaborar_orcamento: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    acao_enviar_email: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    calc_treinamento_normativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    calc_servicos_sst: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    calc_vertical_365: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    calc_comparacao_vertical_treinamentos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_valor_ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_valor_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_status_negocio_ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_status_negocio_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_cliente_ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_cliente_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    campo_data_previsao_ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_data_previsao_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    campo_responsavel_ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_responsavel_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    campo_descricao_ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    campo_descricao_obrigatorio: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    status_config: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text('\'[{"id": "perdido", "cor": "bg-red-500", "ativo": true, "label": "Perdido"}, {"id": "em_andamento", "cor": "bg-orange-500", "ativo": true, "label": "Em andamento"}, {"id": "aceito", "cor": "bg-green-500", "ativo": true, "label": "Aceito"}, {"id": "ganho", "cor": "bg-amber-600", "ativo": true, "label": "Ganho"}]\'::jsonb'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funil_negocio_configuracoes')


class GoogleOauthTokens(Base):
    __tablename__ = 'google_oauth_tokens'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='google_oauth_tokens_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='google_oauth_tokens_pkey'),
        UniqueConstraint('empresa_id', name='google_oauth_tokens_empresa_id_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text)
    token_type: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Bearer'::text"))
    scope: Mapped[Optional[str]] = mapped_column(Text)
    expiry_date: Mapped[Optional[int]] = mapped_column(BigInteger)
    google_email: Mapped[Optional[str]] = mapped_column(Text)
    criado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    atualizado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='google_oauth_tokens')


class GruposClientes(Base):
    __tablename__ = 'grupos_clientes'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='grupos_clientes_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='grupos_clientes_pkey'),
        Index('idx_grupos_clientes_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='grupos_clientes')
    unidades_clientes: Mapped[list['UnidadesClientes']] = relationship('UnidadesClientes', back_populates='grupo')


class ImportQueue(Base):
    __tablename__ = 'import_queue'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='import_queue_empresa_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='import_queue_user_id_fkey'),
        PrimaryKeyConstraint('id', name='import_queue_pkey'),
        Index('idx_import_queue_empresa_id', 'empresa_id'),
        Index('idx_import_queue_status', 'status'),
        Index('idx_import_queue_user_id', 'user_id'),
        {'comment': 'Fila de importações em background com persistência',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'empresas'::character varying"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'pending'::character varying"))
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    processed_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    errors: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    started_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='import_queue')


class InformacoesEmpresa(Base):
    __tablename__ = 'informacoes_empresa'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='informacoes_empresa_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='informacoes_empresa_pkey'),
        UniqueConstraint('empresa_id', name='informacoes_empresa_empresa_id_key'),
        Index('idx_informacoes_empresa_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    missao: Mapped[Optional[str]] = mapped_column(Text)
    visao: Mapped[Optional[str]] = mapped_column(Text)
    valores: Mapped[Optional[str]] = mapped_column(Text)
    diretor_tecnico_nome: Mapped[Optional[str]] = mapped_column(String(255))
    diretor_tecnico_formacao: Mapped[Optional[str]] = mapped_column(String(255))
    diretor_tecnico_assinatura_url: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    diretor_tecnico_registro_tipo: Mapped[Optional[str]] = mapped_column(String(50))
    diretor_tecnico_registro_numero: Mapped[Optional[str]] = mapped_column(String(50))
    diretor_tecnico_registro_estado: Mapped[Optional[str]] = mapped_column(String(2))
    diretor_tecnico_assinatura_tipo: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'upload'::character varying"))
    logo_pequena_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL da logo pequena da empresa (para cabeçalhos, etc)')
    logo_grande_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL da logo grande da empresa (para documentos A4)')
    moldura_vertical_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL da moldura para documentos A4 vertical (retrato)')
    moldura_horizontal_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL da moldura para documentos A4 horizontal (paisagem)')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='informacoes_empresa')


class ModelosAtividade(Base):
    __tablename__ = 'modelos_atividade'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='modelos_atividade_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='modelos_atividade_pkey'),
        Index('idx_modelos_atividade_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='modelos_atividade')


class ModelosContrato(Base):
    __tablename__ = 'modelos_contrato'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='modelos_contrato_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='modelos_contrato_pkey'),
        Index('idx_modelos_contrato_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'cliente'::character varying"))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='modelos_contrato')
    modelo_clausulas: Mapped[list['ModeloClausulas']] = relationship('ModeloClausulas', back_populates='modelo')
    modelo_modulos: Mapped[list['ModeloModulos']] = relationship('ModeloModulos', back_populates='modelo')
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='modelo')


class ModelosPropostaComercial(Base):
    __tablename__ = 'modelos_proposta_comercial'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='modelos_proposta_comercial_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='modelos_proposta_comercial_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='modelos_proposta_comercial_pkey'),
        Index('idx_modelos_proposta_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_orcamento: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'treinamento_normativo'::text"))
    titulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_modulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_dores: Mapped[Optional[str]] = mapped_column(Text)
    titulo_solucoes: Mapped[Optional[str]] = mapped_column(Text)
    titulo_diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    titulo_investimento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_infos: Mapped[Optional[str]] = mapped_column(Text)
    titulo_passos: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    publico: Mapped[Optional[str]] = mapped_column(Text)
    dores: Mapped[Optional[str]] = mapped_column(Text)
    solucoes: Mapped[Optional[str]] = mapped_column(Text)
    diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    pagamento: Mapped[Optional[str]] = mapped_column(Text)
    infos: Mapped[Optional[str]] = mapped_column(Text)
    passos: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    planos_selecionados: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()), server_default=text("'{}'::text[]"))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='modelos_proposta_comercial')


class NaturezasProdutos(Base):
    __tablename__ = 'naturezas_produtos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='naturezas_produtos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='naturezas_produtos_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='naturezas_produtos')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='natureza')


class Notificacoes(Base):
    __tablename__ = 'notificacoes'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])", name='notificacoes_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='notificacoes_empresa_id_fkey'),
        ForeignKeyConstraint(['lida_por'], ['users.id'], ondelete='SET NULL', name='notificacoes_lida_por_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='SET NULL', name='notificacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='notificacoes_pkey'),
        Index('idx_notificacoes_created_at', 'created_at'),
        Index('idx_notificacoes_empresa_id', 'empresa_id'),
        Index('idx_notificacoes_empresa_lida', 'empresa_id', 'lida'),
        Index('idx_notificacoes_lida_por', 'lida_por'),
        Index('idx_notificacoes_usuario_id', 'usuario_id'),
        {'comment': 'Sistema de notificações do Vertical ON', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, comment='Tipo visual: info, success, warning, error')
    categoria: Mapped[str] = mapped_column(Text, nullable=False, comment='Categoria da ação: treinamento, epi, financeiro, comercial, etc.')
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    usuario_nome: Mapped[Optional[str]] = mapped_column(Text)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    tela: Mapped[Optional[str]] = mapped_column(Text)
    referencia_tipo: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo do registro relacionado para navegação')
    referencia_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='ID do registro para navegação ao clicar')
    referencia_dados: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), comment='Dados extras em JSON para navegação complexa')
    lida: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    lida_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    lida_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='notificacoes')


class OrigensContato(Base):
    __tablename__ = 'origens_contato'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='origens_contato_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='origens_contato_pkey'),
        Index('idx_origens_contato_empresa_id', 'empresa_id'),
        {'comment': 'Origens de contato para clientes (ex: Indicação, Google, Redes '
                'Sociais, etc.)',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#6366f1'::character varying"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='origens_contato')
    clientes_sst: Mapped[list['ClientesSst']] = relationship('ClientesSst', back_populates='origem_contato')


class PacotesProdutos(Base):
    __tablename__ = 'pacotes_produtos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='pacotes_produtos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='pacotes_produtos_pkey'),
        Index('idx_pacotes_produtos_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    preco_total: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    desconto_percentual: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(5, 2), server_default=text('0'))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    preco_fixo: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    forma_cobranca: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'por_produto'::character varying"))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='pacotes_produtos')
    pacotes_produtos_itens: Mapped[list['PacotesProdutosItens']] = relationship('PacotesProdutosItens', back_populates='pacote')


class Perigos(Base):
    __tablename__ = 'perigos'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='perigos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='perigos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='perigos_pkey'),
        Index('idx_perigos_created_by', 'created_by'),
        Index('idx_perigos_empresa_id', 'empresa_id'),
        {'comment': 'Cadastro de perigos identificados nas empresas',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    categoria: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='perigos')


class PesquisasOpiniao(Base):
    __tablename__ = 'pesquisas_opiniao'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['rascunho'::character varying, 'aberta'::character varying, 'fechada'::character varying, 'arquivada'::character varying]::text[])", name='pesquisas_opiniao_status_check'),
        CheckConstraint("tipo::text = ANY (ARRAY['multipla_escolha'::character varying, 'escala'::character varying, 'sim_nao'::character varying, 'texto_livre'::character varying]::text[])", name='pesquisas_opiniao_tipo_check'),
        ForeignKeyConstraint(['autor_id'], ['public.blog_autores.id'], ondelete='SET NULL', name='pesquisas_opiniao_autor_id_fkey'),
        ForeignKeyConstraint(['categoria_id'], ['public.blog_categorias.id'], ondelete='SET NULL', name='pesquisas_opiniao_categoria_id_fkey'),
        PrimaryKeyConstraint('id', name='pesquisas_opiniao_pkey'),
        UniqueConstraint('slug', name='pesquisas_opiniao_slug_key'),
        Index('idx_pesquisas_opiniao_slug', 'slug'),
        Index('idx_pesquisas_opiniao_status', 'status'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    imagem_capa_url: Mapped[Optional[str]] = mapped_column(Text)
    autor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    categoria_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    status: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'rascunho'::character varying"))
    tipo: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'multipla_escolha'::character varying"))
    permite_multiplas_respostas: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    anonima: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    data_inicio: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    data_fim: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    total_votos: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    autor: Mapped[Optional['BlogAutores']] = relationship('BlogAutores', back_populates='pesquisas_opiniao')
    categoria: Mapped[Optional['BlogCategorias']] = relationship('BlogCategorias', back_populates='pesquisas_opiniao')
    pesquisas_opcoes: Mapped[list['PesquisasOpcoes']] = relationship('PesquisasOpcoes', back_populates='pesquisa')
    pesquisas_votos: Mapped[list['PesquisasVotos']] = relationship('PesquisasVotos', back_populates='pesquisa')


class PlanoDespesas(Base):
    __tablename__ = 'plano_despesas'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['deducoes_sobre_vendas'::text, 'custo_servico_prestado'::text, 'despesas_administrativas'::text, 'despesas_estrutura'::text, 'despesas_pessoal'::text, 'despesas_comerciais'::text, 'despesas_financeiras'::text, 'despesas_nao_operacional'::text, 'impostos'::text, 'participacao_dividendos'::text])", name='plano_despesas_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='plano_despesas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='plano_despesas_pkey'),
        Index('idx_plano_despesas_empresa', 'empresa_id'),
        {'comment': 'Plano de classificação de despesas para DRE', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, comment='Tipo de despesa: deducoes_sobre_vendas, custo_servico_prestado, despesas_administrativas, despesas_estrutura, despesas_pessoal, despesas_comerciais, despesas_financeiras, despesas_nao_operacional, impostos, participacao_dividendos')
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='plano_despesas')


class PlanoReceitas(Base):
    __tablename__ = 'plano_receitas'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['receitas_operacionais'::text, 'outras_receitas_operacionais'::text, 'receitas_financeiras'::text, 'receitas_nao_operacionais'::text])", name='plano_receitas_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='plano_receitas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='plano_receitas_pkey'),
        Index('idx_plano_receitas_empresa', 'empresa_id'),
        Index('idx_plano_receitas_tipo', 'tipo'),
        {'comment': 'Plano de classificação de receitas para DRE', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, comment='Tipo de receita: receitas_operacionais, outras_receitas_operacionais, receitas_financeiras, receitas_nao_operacionais')
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='plano_receitas')


class PlanosProdutos(Base):
    __tablename__ = 'planos_produtos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='planos_produtos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='planos_produtos_pkey'),
        Index('idx_planos_produtos_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'#6366f1'::text"))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='planos_produtos')


class PosVendaColunas(Base):
    __tablename__ = 'pos_venda_colunas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='pos_venda_colunas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='pos_venda_colunas_pkey'),
        Index('idx_pos_venda_colunas_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#6366f1'::character varying"))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    meta_valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='pos_venda_colunas')
    pos_venda_cards: Mapped[list['PosVendaCards']] = relationship('PosVendaCards', back_populates='coluna')


class PosVendaEtiquetas(Base):
    __tablename__ = 'pos_venda_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='pos_venda_etiquetas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='pos_venda_etiquetas_pkey'),
        Index('idx_pos_venda_etiquetas_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#f59e0b'::character varying"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='pos_venda_etiquetas')
    pos_venda_card_etiquetas: Mapped[list['PosVendaCardEtiquetas']] = relationship('PosVendaCardEtiquetas', back_populates='etiqueta')


class PropostasModelos(Base):
    __tablename__ = 'propostas_modelos'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='propostas_modelos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='propostas_modelos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='propostas_modelos_pkey'),
        Index('idx_propostas_modelos_empresa_id', 'empresa_id'),
        {'comment': 'Modelos de proposta compartilhados entre todos os cards da '
                'empresa',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Empresa SST dona do modelo (compartilhamento)')
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    blocos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), comment='Array JSON com os blocos do modelo (hero, precos, texto, etc)')
    header: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    global_styles: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='propostas_modelos')


class ProspeccaoColunas(Base):
    __tablename__ = 'prospeccao_colunas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='prospeccao_colunas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_colunas_pkey'),
        Index('idx_prospeccao_colunas_empresa_id', 'empresa_id'),
        Index('idx_prospeccao_colunas_ordem', 'empresa_id', 'ordem'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    cor: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#6366f1'::character varying"))
    meta_valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='prospeccao_colunas')
    prospeccao_cards: Mapped[list['ProspeccaoCards']] = relationship('ProspeccaoCards', back_populates='coluna')
    prospeccao_card_movimentacoes_coluna_destino: Mapped[list['ProspeccaoCardMovimentacoes']] = relationship('ProspeccaoCardMovimentacoes', foreign_keys='[ProspeccaoCardMovimentacoes.coluna_destino_id]', back_populates='coluna_destino')
    prospeccao_card_movimentacoes_coluna_origem: Mapped[list['ProspeccaoCardMovimentacoes']] = relationship('ProspeccaoCardMovimentacoes', foreign_keys='[ProspeccaoCardMovimentacoes.coluna_origem_id]', back_populates='coluna_origem')


class ProspeccaoEtiquetas(Base):
    __tablename__ = 'prospeccao_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='prospeccao_etiquetas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_etiquetas_pkey'),
        Index('idx_prospeccao_etiquetas_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'#f59e0b'::character varying"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='prospeccao_etiquetas')
    prospeccao_card_etiquetas: Mapped[list['ProspeccaoCardEtiquetas']] = relationship('ProspeccaoCardEtiquetas', back_populates='etiqueta')


class ProspeccaoModelos(Base):
    __tablename__ = 'prospeccao_modelos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='prospeccao_modelos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_modelos_pkey'),
        Index('idx_prospeccao_modelos_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='prospeccao_modelos')


class Riscos(Base):
    __tablename__ = 'riscos'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='riscos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='riscos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='riscos_pkey'),
        Index('idx_riscos_created_by', 'created_by'),
        Index('idx_riscos_empresa_id', 'empresa_id'),
        {'comment': 'Cadastro de riscos ocupacionais das empresas', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    tipo: Mapped[Optional[str]] = mapped_column(Text)
    severidade: Mapped[Optional[str]] = mapped_column(Text)
    probabilidade: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='riscos')


class SaudeOcupacional(Base):
    __tablename__ = 'saude_ocupacional'
    __table_args__ = (
        CheckConstraint("tipo_exame = ANY (ARRAY['admissional'::text, 'periodico'::text, 'demissional'::text, 'retorno_trabalho'::text])", name='saude_ocupacional_tipo_exame_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='saude_ocupacional_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='saude_ocupacional_pkey'),
        Index('idx_saude_ocupacional_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    colaborador_nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_exame: Mapped[str] = mapped_column(Text, nullable=False)
    data_exame: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    validade_dias: Mapped[decimal.Decimal] = mapped_column(Numeric, nullable=False, server_default=text('365'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    aso_arquivo_url: Mapped[Optional[str]] = mapped_column(Text)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='saude_ocupacional')


class Servicos(Base):
    __tablename__ = 'servicos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='servicos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='servicos_pkey'),
        Index('idx_servicos_empresa_id', 'empresa_id'),
        {'comment': 'Tabela de serviços oferecidos pela empresa', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    categoria: Mapped[Optional[str]] = mapped_column(Text)
    tipo: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo do serviço: produto, servico, consultoria, treinamento')
    preco: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    unidade: Mapped[Optional[str]] = mapped_column(Text, comment='Unidade de cobrança: hora, dia, projeto, mensal, anual, unidade')
    duracao_estimada: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    destaque: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='servicos')


class SessoesAtivas(Base):
    __tablename__ = 'sessoes_ativas'
    __table_args__ = (
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='sessoes_ativas_user_id_fkey'),
        PrimaryKeyConstraint('id', name='sessoes_ativas_pkey'),
        UniqueConstraint('session_token', name='sessoes_ativas_session_token_key'),
        Index('idx_sessoes_ativas_ativo', 'ativo'),
        Index('idx_sessoes_ativas_session_token', 'session_token'),
        Index('idx_sessoes_ativas_user_id', 'user_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    session_token: Mapped[str] = mapped_column(Text, nullable=False)
    dispositivo: Mapped[Optional[str]] = mapped_column(Text)
    navegador: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    last_activity: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))



class Setores(Base):
    __tablename__ = 'setores'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='setores_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='setores_pkey'),
        UniqueConstraint('empresa_id', 'nome', name='setores_empresa_id_nome_key'),
        Index('idx_setores_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    ambiente: Mapped[Optional[str]] = mapped_column(Text)
    turnos_horarios: Mapped[Optional[str]] = mapped_column(Text)
    descricao_ambiente: Mapped[Optional[str]] = mapped_column(Text)
    epc_existentes: Mapped[Optional[str]] = mapped_column(Text)
    epi_obrigatorios: Mapped[Optional[str]] = mapped_column(Text)
    evidencias_visita: Mapped[Optional[str]] = mapped_column(Text)
    escala: Mapped[Optional[str]] = mapped_column(Text, comment='Escala de trabalho: Segunda a sexta-feira, 6x1, 5x1, 5x2, 12x36, Revezamento, ou personalizado')
    turno: Mapped[Optional[str]] = mapped_column(Text, comment='Turno de trabalho: Administrativo, Manhã, Tarde, Noturno, Alternado, ou personalizado')
    horarios: Mapped[Optional[str]] = mapped_column(Text, comment='Horário de trabalho: 08:00 às 17:00, etc, ou personalizado')
    construcao: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo de edificação/estrutura do setor (multi-seleção)')
    construcao_obs: Mapped[Optional[str]] = mapped_column(Text)
    piso: Mapped[Optional[str]] = mapped_column(Text, comment='Material e condição do piso (multi-seleção)')
    piso_obs: Mapped[Optional[str]] = mapped_column(Text)
    ventilacao: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo e eficiência da ventilação (multi-seleção)')
    ventilacao_obs: Mapped[Optional[str]] = mapped_column(Text)
    iluminacao: Mapped[Optional[str]] = mapped_column(Text, comment='Origem e adequação da iluminação (multi-seleção)')
    iluminacao_obs: Mapped[Optional[str]] = mapped_column(Text)
    layout_setor: Mapped[Optional[str]] = mapped_column(Text, comment='Organização física do ambiente (multi-seleção)')
    layout_setor_obs: Mapped[Optional[str]] = mapped_column(Text)
    condicoes_gerais: Mapped[Optional[str]] = mapped_column(Text, comment='Estado geral e conservação (multi-seleção)')
    condicoes_gerais_obs: Mapped[Optional[str]] = mapped_column(Text)
    processo_trabalho: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo de atividade executada (multi-seleção)')
    processo_trabalho_obs: Mapped[Optional[str]] = mapped_column(Text)
    maquinas_equipamentos: Mapped[Optional[str]] = mapped_column(Text, comment='Presença e tipo de máquinas/equipamentos (multi-seleção)')
    maquinas_equipamentos_obs: Mapped[Optional[str]] = mapped_column(Text)
    organizacao_trabalho: Mapped[Optional[str]] = mapped_column(Text, comment='Forma de execução do trabalho (multi-seleção)')
    organizacao_trabalho_obs: Mapped[Optional[str]] = mapped_column(Text)
    acesso_circulacao: Mapped[Optional[str]] = mapped_column(Text, comment='Entradas, saídas e deslocamento (multi-seleção)')
    acesso_circulacao_obs: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='setores')
    funis: Mapped[list['Funis']] = relationship('Funis', back_populates='setor')
    profiles: Mapped[list['Profiles']] = relationship('Profiles', back_populates='setor')
    setor_permissoes: Mapped[list['SetorPermissoes']] = relationship('SetorPermissoes', back_populates='setor')


class TicketsSlaConfig(Base):
    __tablename__ = 'tickets_sla_config'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='tickets_sla_config_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='tickets_sla_config_pkey'),
        UniqueConstraint('empresa_id', name='tickets_sla_config_empresa_id_key'),
        Index('idx_tickets_sla_config_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    prioridade_baixa_horas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('72'))
    prioridade_media_horas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('48'))
    prioridade_alta_horas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('24'))
    prioridade_critica_horas: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('4'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='tickets_sla_config')


class TicketsSuporte(Base):
    __tablename__ = 'tickets_suporte'
    __table_args__ = (
        CheckConstraint("categoria = ANY (ARRAY['sistema'::text, 'treinamento'::text, 'financeiro'::text, 'comercial'::text, 'epi'::text, 'frota'::text, 'cadastro'::text, 'integracao'::text, 'outro'::text])", name='tickets_suporte_categoria_check'),
        CheckConstraint("impacto_operacional = ANY (ARRAY['nenhum'::text, 'baixo'::text, 'medio'::text, 'alto'::text, 'critico'::text])", name='tickets_suporte_impacto_operacional_check'),
        CheckConstraint("prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text, 'critica'::text])", name='tickets_suporte_prioridade_check'),
        CheckConstraint("status = ANY (ARRAY['aberto'::text, 'em_andamento'::text, 'aguardando_resposta'::text, 'resolvido'::text, 'fechado'::text])", name='tickets_suporte_status_check'),
        CheckConstraint("tipo = ANY (ARRAY['bug'::text, 'duvida'::text, 'sugestao'::text, 'problema_tecnico'::text, 'financeiro'::text, 'outro'::text])", name='tickets_suporte_tipo_check'),
        ForeignKeyConstraint(['atendente_id'], ['users.id'], name='tickets_suporte_atendente_id_fkey'),
        ForeignKeyConstraint(['empresa_destino_id'], ['public.empresas.id'], name='tickets_suporte_empresa_destino_id_fkey'),
        ForeignKeyConstraint(['empresa_solicitante_id'], ['public.empresas.id'], name='tickets_suporte_empresa_solicitante_id_fkey'),
        ForeignKeyConstraint(['solicitante_id'], ['users.id'], name='tickets_suporte_solicitante_id_fkey'),
        PrimaryKeyConstraint('id', name='tickets_suporte_pkey'),
        Index('idx_tickets_created', 'created_at'),
        Index('idx_tickets_empresa_destino', 'empresa_destino_id'),
        Index('idx_tickets_empresa_solicitante', 'empresa_solicitante_id'),
        Index('idx_tickets_status', 'status'),
        Index('idx_tickets_suporte_atendente_id', 'atendente_id'),
        Index('idx_tickets_suporte_solicitante_id', 'solicitante_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    solicitante_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    solicitante_nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    prioridade: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'media'::text"))
    impacto_operacional: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'nenhum'::text"))
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'aberto'::text"))
    solicitante_email: Mapped[Optional[str]] = mapped_column(Text)
    empresa_solicitante_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    empresa_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    categoria: Mapped[Optional[str]] = mapped_column(Text)
    atendente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    atendente_nome: Mapped[Optional[str]] = mapped_column(Text)
    resolucao: Mapped[Optional[str]] = mapped_column(Text)
    resolvido_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    tela_origem: Mapped[Optional[str]] = mapped_column(Text)
    url_origem: Mapped[Optional[str]] = mapped_column(Text)
    navegador: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    role_solicitante: Mapped[Optional[str]] = mapped_column(Text)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    tela: Mapped[Optional[str]] = mapped_column(Text)

    empresa_destino: Mapped[Optional['Empresas']] = relationship('Empresas', foreign_keys=[empresa_destino_id], back_populates='tickets_suporte_empresa_destino')
    empresa_solicitante: Mapped[Optional['Empresas']] = relationship('Empresas', foreign_keys=[empresa_solicitante_id], back_populates='tickets_suporte_empresa_solicitante')
    tickets_suporte_anexos: Mapped[list['TicketsSuporteAnexos']] = relationship('TicketsSuporteAnexos', back_populates='ticket')
    tickets_suporte_comentarios: Mapped[list['TicketsSuporteComentarios']] = relationship('TicketsSuporteComentarios', back_populates='ticket')


class TiposProdutos(Base):
    __tablename__ = 'tipos_produtos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='tipos_produtos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='tipos_produtos_pkey'),
        Index('idx_tipos_produtos_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='tipos_produtos')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='tipo_')


class TiposServico(Base):
    __tablename__ = 'tipos_servico'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='tipos_servico_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='tipos_servico_pkey'),
        Index('idx_tipos_servico_empresa', 'empresa_id'),
        {'comment': 'Tipos de serviço: como o serviço é prestado ou cobrado '
                '(Presencial, Online, Recorrente, Avulso, etc)',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='tipos_servico')
    produtos_servicos: Mapped[list['ProdutosServicos']] = relationship('ProdutosServicos', back_populates='tipo_servico')


class UserUpdateViews(Base):
    __tablename__ = 'user_update_views'
    __table_args__ = (
        ForeignKeyConstraint(['update_id'], ['public.system_updates.id'], ondelete='CASCADE', name='user_update_views_update_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='user_update_views_user_id_fkey'),
        PrimaryKeyConstraint('id', name='user_update_views_pkey'),
        UniqueConstraint('user_id', 'update_id', name='user_update_views_user_id_update_id_key'),
        Index('idx_user_update_views_update_id', 'update_id'),
        Index('idx_user_update_views_user_id', 'user_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    update_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    viewed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    update: Mapped['SystemUpdates'] = relationship('SystemUpdates', back_populates='user_update_views')


class WhatsappConfiguracoes(Base):
    __tablename__ = 'whatsapp_configuracoes'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='whatsapp_configuracoes_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='whatsapp_configuracoes_pkey'),
        UniqueConstraint('empresa_id', name='whatsapp_configuracoes_empresa_id_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    twilio_account_sid_enc: Mapped[str] = mapped_column(Text, nullable=False)
    twilio_auth_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    twilio_whatsapp_number: Mapped[str] = mapped_column(String(30), nullable=False)
    webhook_secret: Mapped[Optional[str]] = mapped_column(String(100))
    rate_limit_per_second: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('50'))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='whatsapp_configuracoes')


class WhatsappTemplates(Base):
    __tablename__ = 'whatsapp_templates'
    __table_args__ = (
        ForeignKeyConstraint(['criado_por'], ['users.id'], ondelete='SET NULL', name='whatsapp_templates_criado_por_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='whatsapp_templates_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='whatsapp_templates_pkey'),
        Index('idx_whatsapp_templates_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    variaveis: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()), server_default=text("'{}'::text[]"))
    categoria: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'marketing'::character varying"))
    criado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='whatsapp_templates')
    whatsapp_campanhas: Mapped[list['WhatsappCampanhas']] = relationship('WhatsappCampanhas', back_populates='template')


class WhiteLabelConfig(Base):
    __tablename__ = 'white_label_config'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='white_label_config_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='white_label_config_pkey'),
        UniqueConstraint('empresa_id', name='white_label_config_empresa_unique'),
        Index('idx_white_label_config_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), server_default=text("'Título do Sistema'::character varying"))
    subtitle: Mapped[Optional[str]] = mapped_column(String(255), server_default=text("'Subtítulo / tagline do cliente'::character varying"))
    subject: Mapped[Optional[str]] = mapped_column(String(255), server_default=text("'Assunto padrão'::character varying"))
    domain: Mapped[Optional[str]] = mapped_column(String(255), server_default=text("'https://cliente.seudominio.com'::character varying"))
    font_body: Mapped[Optional[str]] = mapped_column(String(255), server_default=text("'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'::character varying"))
    font_heading: Mapped[Optional[str]] = mapped_column(String(255), server_default=text("'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'::character varying"))
    base_font_size: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('14'))
    font_weight: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('400'))
    line_height: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(3, 2), server_default=text('1.45'))
    density: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(3, 2), server_default=text('1'))
    radius: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('14'))
    card_shadow: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(3, 2), server_default=text('0.18'))
    bg_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#f6f7fb'::character varying"))
    surface_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#ffffff'::character varying"))
    border_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#d5d7dc'::character varying"))
    text_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#101828'::character varying"))
    muted_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#5c6779'::character varying"))
    primary_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#2563eb'::character varying"))
    secondary_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#7c3aed'::character varying"))
    link_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#2563eb'::character varying"))
    icon_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#101828'::character varying"))
    badge_bg: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#eef2ff'::character varying"))
    success_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#16a34a'::character varying"))
    warning_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#f59e0b'::character varying"))
    error_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#ef4444'::character varying"))
    info_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#0ea5e9'::character varying"))
    button_bg: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#2563eb'::character varying"))
    button_text: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#ffffff'::character varying"))
    button_hover: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#1d4ed8'::character varying"))
    button_disabled: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#aab4c4'::character varying"))
    empty_tone: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'neutro'::character varying"))
    login_bg: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#0b1220'::character varying"))
    about_text: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Este sistema é uma solução white label configurável para o cliente.'::text"))
    email_footer: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'© Cliente • Todos os direitos reservados'::text"))
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    favicon_url: Mapped[Optional[str]] = mapped_column(Text)
    login_image_url: Mapped[Optional[str]] = mapped_column(Text)
    col_header_bg: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#101828'::character varying"))
    col_header_text: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#ffffff'::character varying"))
    col_border: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#d5d7dc'::character varying"))
    col_shadow: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#000000'::character varying"))
    col_width: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('320'))
    col_auto_width: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    card_bg: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#ffffff'::character varying"))
    card_border: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#d5d7dc'::character varying"))
    card_stripe: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#2563eb'::character varying"))
    stripe_mode: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('1'))
    card_compact: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    blocked_color: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'#ef4444'::character varying"))
    f_title: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_subtitle: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_id: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_tags: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_assignee: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_date: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_sla: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_priority: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    f_points: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    f_labels: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    label_required: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    label_limit: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('3'))
    label_palette: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Bug, Urgente, Cliente'::text"))
    avatar_shape: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'999px'::character varying"))
    avatar_size: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('26'))
    avatar_photo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    a_move: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    a_done: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    a_comment: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    a_assign: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='white_label_config')


class BlogVisualizacoes(Base):
    __tablename__ = 'blog_visualizacoes'
    __table_args__ = (
        ForeignKeyConstraint(['blog_id'], ['public.blogs.id'], ondelete='CASCADE', name='blog_visualizacoes_blog_id_fkey'),
        PrimaryKeyConstraint('id', name='blog_visualizacoes_pkey'),
        Index('idx_blog_visualizacoes_blog_id', 'blog_id'),
        Index('idx_blog_visualizacoes_created_at', 'created_at'),
        Index('idx_blog_visualizacoes_ip', 'ip_address'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    blog_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    ip_address: Mapped[Optional[Any]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    referer: Mapped[Optional[str]] = mapped_column(Text)
    country: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    device_type: Mapped[Optional[str]] = mapped_column(String(50))
    browser: Mapped[Optional[str]] = mapped_column(String(100))
    os: Mapped[Optional[str]] = mapped_column(String(100))
    session_id: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    blog: Mapped['Blogs'] = relationship('Blogs', back_populates='blog_visualizacoes')


class CloserCards(Base):
    __tablename__ = 'closer_cards'
    __table_args__ = (
        ForeignKeyConstraint(['coluna_id'], ['public.closer_colunas.id'], ondelete='CASCADE', name='closer_cards_coluna_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='closer_cards_empresa_id_fkey'),
        ForeignKeyConstraint(['empresa_lead_id'], ['public.empresas.id'], ondelete='SET NULL', name='closer_cards_empresa_lead_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_cards_pkey'),
        Index('idx_closer_cards_arquivado', 'arquivado'),
        Index('idx_closer_cards_coluna', 'coluna_id'),
        Index('idx_closer_cards_empresa', 'empresa_id'),
        Index('idx_closer_cards_empresa_lead_id', 'empresa_lead_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    contato_nome: Mapped[Optional[str]] = mapped_column(String(255))
    contato_email: Mapped[Optional[str]] = mapped_column(String(255))
    contato_telefone: Mapped[Optional[str]] = mapped_column(String(50))
    contato_empresa: Mapped[Optional[str]] = mapped_column(String(255))
    origem: Mapped[Optional[str]] = mapped_column(String(100))
    temperatura: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'morno'::character varying"))
    data_contato: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_followup: Mapped[Optional[datetime.date]] = mapped_column(Date)
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    arquivado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    empresa_lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    contatos: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    dados_orcamento: Mapped[Optional[dict]] = mapped_column(JSONB, comment='Stores budget calculator data (modules, rates, leasing, results) for use in commercial proposals')
    dados_orcamento_mensal: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_custo_mensal: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_comparacao: Mapped[Optional[dict]] = mapped_column(JSONB)
    valor_a_vista: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    valor_3x: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    valor_leasing: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    forma_pagamento: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'a_vista'::character varying"))
    dados_proposta: Mapped[Optional[dict]] = mapped_column(JSONB)
    origem_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    origem_kanban: Mapped[Optional[str]] = mapped_column(String(50))

    coluna: Mapped['CloserColunas'] = relationship('CloserColunas', back_populates='closer_cards')
    empresa: Mapped['Empresas'] = relationship('Empresas', foreign_keys=[empresa_id], back_populates='closer_cards_empresa')
    empresa_lead: Mapped[Optional['Empresas']] = relationship('Empresas', foreign_keys=[empresa_lead_id], back_populates='closer_cards_empresa_lead')
    closer_atividades: Mapped[list['CloserAtividades']] = relationship('CloserAtividades', back_populates='card')
    closer_card_etiquetas: Mapped[list['CloserCardEtiquetas']] = relationship('CloserCardEtiquetas', back_populates='card')
    closer_card_movimentacoes: Mapped[list['CloserCardMovimentacoes']] = relationship('CloserCardMovimentacoes', back_populates='card')


class CrossSellingCards(Base):
    __tablename__ = 'cross_selling_cards'
    __table_args__ = (
        ForeignKeyConstraint(['coluna_id'], ['public.cross_selling_colunas.id'], ondelete='CASCADE', name='cross_selling_cards_coluna_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='cross_selling_cards_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='cross_selling_cards_empresa_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['users.id'], name='cross_selling_cards_responsavel_id_fkey'),
        PrimaryKeyConstraint('id', name='cross_selling_cards_pkey'),
        Index('idx_cross_selling_cards_coluna_id', 'coluna_id'),
        Index('idx_cross_selling_cards_created_by', 'created_by'),
        Index('idx_cross_selling_cards_empresa_id', 'empresa_id'),
        Index('idx_cross_selling_cards_responsavel_id', 'responsavel_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    arquivado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_nome: Mapped[Optional[str]] = mapped_column(Text)
    cliente_email: Mapped[Optional[str]] = mapped_column(Text)
    cliente_telefone: Mapped[Optional[str]] = mapped_column(Text)
    cliente_empresa: Mapped[Optional[str]] = mapped_column(Text)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_servico: Mapped[Optional[str]] = mapped_column(Text)
    data_venda: Mapped[Optional[str]] = mapped_column(Text)
    data_implementacao: Mapped[Optional[str]] = mapped_column(Text)
    data_followup: Mapped[Optional[str]] = mapped_column(Text)
    status_satisfacao: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'pendente'::text"))
    nota_nps: Mapped[Optional[int]] = mapped_column(Integer)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    coluna: Mapped['CrossSellingColunas'] = relationship('CrossSellingColunas', back_populates='cross_selling_cards')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='cross_selling_cards')
    etiqueta: Mapped[list['CrossSellingEtiquetas']] = relationship('CrossSellingEtiquetas', secondary='public.cross_selling_card_etiquetas', back_populates='card')
    cross_selling_atividades: Mapped[list['CrossSellingAtividades']] = relationship('CrossSellingAtividades', back_populates='card')
    cross_selling_card_movimentacoes: Mapped[list['CrossSellingCardMovimentacoes']] = relationship('CrossSellingCardMovimentacoes', back_populates='card')


class EquipamentosKitItens(Base):
    __tablename__ = 'equipamentos_kit_itens'
    __table_args__ = (
        ForeignKeyConstraint(['equipamento_id'], ['public.equipamentos_sst.id'], ondelete='CASCADE', name='equipamentos_kit_itens_equipamento_id_fkey'),
        ForeignKeyConstraint(['kit_id'], ['public.equipamentos_kits.id'], ondelete='CASCADE', name='equipamentos_kit_itens_kit_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_kit_itens_pkey'),
        UniqueConstraint('kit_id', 'equipamento_id', name='equipamentos_kit_itens_kit_id_equipamento_id_key'),
        Index('idx_equipamentos_kit_itens_equipamento_id', 'equipamento_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    kit_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    equipamento_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    quantidade: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('1'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    equipamento: Mapped['EquipamentosSst'] = relationship('EquipamentosSst', back_populates='equipamentos_kit_itens')
    kit: Mapped['EquipamentosKits'] = relationship('EquipamentosKits', back_populates='equipamentos_kit_itens')


class FrotaChecklists(Base):
    __tablename__ = 'frota_checklists'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_checklists_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_checklists_empresa_id_fkey'),
        ForeignKeyConstraint(['veiculo_id'], ['public.frota_veiculos.id'], ondelete='CASCADE', name='frota_checklists_veiculo_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_checklists_pkey'),
        Index('idx_frota_checklists_created_by', 'created_by'),
        Index('idx_frota_checklists_empresa_id', 'empresa_id'),
        Index('idx_frota_checklists_veiculo', 'veiculo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    veiculo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status_geral: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Aprovado'::character varying"))
    tipo: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Pré-uso'::character varying"))
    km: Mapped[Optional[int]] = mapped_column(Integer)
    responsavel: Mapped[Optional[str]] = mapped_column(String(255))
    local_inspecao: Mapped[Optional[str]] = mapped_column(String(255))
    itens_verificados: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_checklists')
    veiculo: Mapped['FrotaVeiculos'] = relationship('FrotaVeiculos', back_populates='frota_checklists')


class FrotaCustos(Base):
    __tablename__ = 'frota_custos'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_custos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_custos_empresa_id_fkey'),
        ForeignKeyConstraint(['veiculo_id'], ['public.frota_veiculos.id'], ondelete='CASCADE', name='frota_custos_veiculo_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_custos_pkey'),
        Index('idx_frota_custos_created_by', 'created_by'),
        Index('idx_frota_custos_empresa_id', 'empresa_id'),
        Index('idx_frota_custos_veiculo', 'veiculo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    veiculo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    valor: Mapped[decimal.Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fornecedor: Mapped[Optional[str]] = mapped_column(String(255))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_custos')
    veiculo: Mapped['FrotaVeiculos'] = relationship('FrotaVeiculos', back_populates='frota_custos')


class FrotaDocumentos(Base):
    __tablename__ = 'frota_documentos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_documentos_empresa_id_fkey'),
        ForeignKeyConstraint(['veiculo_id'], ['public.frota_veiculos.id'], ondelete='CASCADE', name='frota_documentos_veiculo_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_documentos_pkey'),
        Index('idx_frota_documentos_empresa_id', 'empresa_id'),
        Index('idx_frota_documentos_veiculo', 'veiculo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    veiculo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Licenciamento'::character varying"))
    vencimento: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    numero: Mapped[Optional[str]] = mapped_column(String(100))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    anexo_url: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    arquivo_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL do arquivo do documento armazenado no Storage')

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_documentos')
    veiculo: Mapped['FrotaVeiculos'] = relationship('FrotaVeiculos', back_populates='frota_documentos')


class FrotaManutencoes(Base):
    __tablename__ = 'frota_manutencoes'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_manutencoes_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_manutencoes_empresa_id_fkey'),
        ForeignKeyConstraint(['veiculo_id'], ['public.frota_veiculos.id'], ondelete='CASCADE', name='frota_manutencoes_veiculo_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_manutencoes_pkey'),
        Index('idx_frota_manutencoes_created_by', 'created_by'),
        Index('idx_frota_manutencoes_empresa_id', 'empresa_id'),
        Index('idx_frota_manutencoes_status', 'status'),
        Index('idx_frota_manutencoes_veiculo', 'veiculo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    veiculo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    servico: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Agendada'::character varying"))
    km: Mapped[Optional[int]] = mapped_column(Integer)
    custo: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 2), server_default=text('0'))
    proxima_km: Mapped[Optional[int]] = mapped_column(Integer)
    proxima_data: Mapped[Optional[datetime.date]] = mapped_column(Date)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_manutencoes')
    veiculo: Mapped['FrotaVeiculos'] = relationship('FrotaVeiculos', back_populates='frota_manutencoes')


class FrotaOcorrencias(Base):
    __tablename__ = 'frota_ocorrencias'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_ocorrencias_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_ocorrencias_empresa_id_fkey'),
        ForeignKeyConstraint(['veiculo_id'], ['public.frota_veiculos.id'], ondelete='CASCADE', name='frota_ocorrencias_veiculo_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_ocorrencias_pkey'),
        Index('idx_frota_ocorrencias_created_by', 'created_by'),
        Index('idx_frota_ocorrencias_empresa_id', 'empresa_id'),
        Index('idx_frota_ocorrencias_veiculo', 'veiculo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    veiculo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'Aberta'::character varying"))
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    local_ocorrencia: Mapped[Optional[str]] = mapped_column(String(255))
    custo_estimado: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 2))
    responsavel: Mapped[Optional[str]] = mapped_column(String(255))
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_ocorrencias')
    veiculo: Mapped['FrotaVeiculos'] = relationship('FrotaVeiculos', back_populates='frota_ocorrencias')


class Funis(Base):
    __tablename__ = 'funis'
    __table_args__ = (
        CheckConstraint("tipo::text = ANY (ARRAY['negocio'::character varying, 'fluxo_trabalho'::character varying]::text[])", name='funis_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funis_empresa_id_fkey'),
        ForeignKeyConstraint(['setor_id'], ['public.setores.id'], ondelete='CASCADE', name='funis_setor_id_fkey'),
        PrimaryKeyConstraint('id', name='funis_pkey'),
        Index('idx_funis_empresa_id', 'empresa_id'),
        Index('idx_funis_setor_id', 'setor_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    setor_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funis')
    setor: Mapped['Setores'] = relationship('Setores', back_populates='funis')
    funil_etapas: Mapped[list['FunilEtapas']] = relationship('FunilEtapas', back_populates='funil')
    funis_configuracoes: Mapped['FunisConfiguracoes'] = relationship('FunisConfiguracoes', uselist=False, back_populates='funil')
    automacoes: Mapped[list['Automacoes']] = relationship('Automacoes', back_populates='funil')
    funil_cards: Mapped[list['FunilCards']] = relationship('FunilCards', back_populates='funil')


class ModeloClausulas(Base):
    __tablename__ = 'modelo_clausulas'
    __table_args__ = (
        ForeignKeyConstraint(['modelo_id'], ['public.modelos_contrato.id'], ondelete='CASCADE', name='modelo_clausulas_modelo_id_fkey'),
        PrimaryKeyConstraint('id', name='modelo_clausulas_pkey'),
        Index('idx_modelo_clausulas_modelo_id', 'modelo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    modelo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    modelo: Mapped['ModelosContrato'] = relationship('ModelosContrato', back_populates='modelo_clausulas')


class ModeloModulos(Base):
    __tablename__ = 'modelo_modulos'
    __table_args__ = (
        ForeignKeyConstraint(['modelo_id'], ['public.modelos_contrato.id'], ondelete='CASCADE', name='modelo_modulos_modelo_id_fkey'),
        PrimaryKeyConstraint('id', name='modelo_modulos_pkey'),
        Index('idx_modelo_modulos_modelo_id', 'modelo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    modelo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    versao: Mapped[Optional[str]] = mapped_column(String(50))
    tipo_cliente: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Cliente direto'::character varying"))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    itens: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    modelo: Mapped['ModelosContrato'] = relationship('ModelosContrato', back_populates='modelo_modulos')


class PesquisasOpcoes(Base):
    __tablename__ = 'pesquisas_opcoes'
    __table_args__ = (
        ForeignKeyConstraint(['pesquisa_id'], ['public.pesquisas_opiniao.id'], ondelete='CASCADE', name='pesquisas_opcoes_pesquisa_id_fkey'),
        PrimaryKeyConstraint('id', name='pesquisas_opcoes_pkey'),
        Index('idx_pesquisas_opcoes_pesquisa', 'pesquisa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    pesquisa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    texto: Mapped[str] = mapped_column(String(500), nullable=False)
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    votos: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    cor: Mapped[Optional[str]] = mapped_column(String(7))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    pesquisa: Mapped['PesquisasOpiniao'] = relationship('PesquisasOpiniao', back_populates='pesquisas_opcoes')
    pesquisas_votos: Mapped[list['PesquisasVotos']] = relationship('PesquisasVotos', back_populates='opcao')


class ProdutosServicos(Base):
    __tablename__ = 'produtos_servicos'
    __table_args__ = (
        CheckConstraint("tipo::text = ANY (ARRAY['produto'::character varying, 'servico'::character varying]::text[])", name='produtos_servicos_tipo_check'),
        ForeignKeyConstraint(['categoria_id'], ['public.categorias_produtos.id'], ondelete='SET NULL', name='produtos_servicos_categoria_id_fkey'),
        ForeignKeyConstraint(['classificacao_id'], ['public.classificacoes_produtos.id'], name='produtos_servicos_classificacao_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='produtos_servicos_empresa_id_fkey'),
        ForeignKeyConstraint(['forma_cobranca_id'], ['public.formas_cobranca.id'], ondelete='SET NULL', name='produtos_servicos_forma_cobranca_id_fkey'),
        ForeignKeyConstraint(['natureza_id'], ['public.naturezas_produtos.id'], name='produtos_servicos_natureza_id_fkey'),
        ForeignKeyConstraint(['tipo_id'], ['public.tipos_produtos.id'], name='produtos_servicos_tipo_id_fkey'),
        ForeignKeyConstraint(['tipo_servico_id'], ['public.tipos_servico.id'], ondelete='SET NULL', name='produtos_servicos_tipo_servico_id_fkey'),
        PrimaryKeyConstraint('id', name='produtos_servicos_pkey'),
        Index('idx_produtos_servicos_categoria', 'categoria_id'),
        Index('idx_produtos_servicos_empresa', 'empresa_id'),
        Index('idx_produtos_servicos_forma_cobranca_id', 'forma_cobranca_id'),
        Index('idx_produtos_servicos_tipo_servico', 'tipo_servico_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    colaboradores_por_turma: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('30'))
    categoria_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    codigo: Mapped[Optional[str]] = mapped_column(String(50))
    preco: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    tipo: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'servico'::character varying"), comment='Natureza do item: produto ou servico')
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    forma_cobranca: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'por_produto'::character varying"))
    forma_cobranca_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    carga_horaria: Mapped[Optional[int]] = mapped_column(Integer, comment='Carga horária do serviço/treinamento em horas')
    ch_formacao: Mapped[Optional[int]] = mapped_column(Integer, comment='Carga horária para formação em horas')
    ch_reciclagem: Mapped[Optional[int]] = mapped_column(Integer, comment='Carga horária para reciclagem em horas')
    classificacao: Mapped[Optional[str]] = mapped_column(Text, comment='Classificação/finalidade: Consultoria, Treinamento, Documento, Assessoria, Suporte Técnico, etc')
    categoria_plano: Mapped[Optional[str]] = mapped_column(Text, comment='Categoria/Plano: Ouro, Prata, Bronze, etc')
    tipo_servico_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='Referência ao tipo de serviço: como é prestado/cobrado')
    natureza_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    classificacao_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    norma: Mapped[Optional[str]] = mapped_column(String(100))
    treinamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    categoria: Mapped[Optional['CategoriasProdutos']] = relationship('CategoriasProdutos', back_populates='produtos_servicos')
    classificacao_: Mapped[Optional['ClassificacoesProdutos']] = relationship('ClassificacoesProdutos', back_populates='produtos_servicos')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='produtos_servicos')
    forma_cobranca_: Mapped[Optional['FormasCobranca']] = relationship('FormasCobranca', back_populates='produtos_servicos')
    natureza: Mapped[Optional['NaturezasProdutos']] = relationship('NaturezasProdutos', back_populates='produtos_servicos')
    tipo_: Mapped[Optional['TiposProdutos']] = relationship('TiposProdutos', back_populates='produtos_servicos')
    tipo_servico: Mapped[Optional['TiposServico']] = relationship('TiposServico', back_populates='produtos_servicos')
    pacotes_produtos_itens: Mapped[list['PacotesProdutosItens']] = relationship('PacotesProdutosItens', back_populates='produto')


class Profiles(Base):
    __tablename__ = 'profiles'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='SET NULL', name='profiles_empresa_id_fkey'),
        ForeignKeyConstraint(['gestor_id'], ['public.profiles.id'], ondelete='SET NULL', name='profiles_gestor_id_fkey'),
        ForeignKeyConstraint(['id'], ['users.id'], ondelete='CASCADE', name='profiles_id_fkey'),
        ForeignKeyConstraint(['setor_id'], ['public.setores.id'], ondelete='SET NULL', name='profiles_setor_id_fkey'),
        PrimaryKeyConstraint('id', name='profiles_pkey'),
        Index('idx_profiles_empresa_id', 'empresa_id'),
        Index('idx_profiles_gestor_id', 'gestor_id'),
        Index('idx_profiles_senha_alterada', 'senha_alterada', postgresql_where='(senha_alterada = false)'),
        Index('idx_profiles_setor_id', 'setor_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[AppRole] = mapped_column(Enum(AppRole, values_callable=lambda cls: [member.value for member in cls], name='app_role'), nullable=False, server_default=text("'cliente_final'::app_role"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    agenda_bloqueada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    setor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    lider_setor: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    grupo_acesso: Mapped[Optional[str]] = mapped_column(Text, comment='Grupo de acesso do usuário: administrador, gestor ou colaborador')
    gestor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='ID do gestor direto do usuário para hierarquia de acesso')
    primeiro_acesso: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    motivo_desativacao: Mapped[Optional[str]] = mapped_column(Text)
    senha_alterada: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    cpf: Mapped[Optional[str]] = mapped_column(Text)
    cep: Mapped[Optional[str]] = mapped_column(Text)
    logradouro: Mapped[Optional[str]] = mapped_column(Text)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    complemento: Mapped[Optional[str]] = mapped_column(Text)
    bairro: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(Text)
    uf: Mapped[Optional[str]] = mapped_column(Text)

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='profiles')
    gestor: Mapped[Optional['Profiles']] = relationship('Profiles', remote_side=[id], back_populates='gestor_reverse')
    gestor_reverse: Mapped[list['Profiles']] = relationship('Profiles', remote_side=[gestor_id], back_populates='gestor')
    setor: Mapped[Optional['Setores']] = relationship('Setores', back_populates='profiles')
    access_logs: Mapped[list['AccessLogs']] = relationship('AccessLogs', back_populates='user')
    agenda_permissoes_dono: Mapped[list['AgendaPermissoes']] = relationship('AgendaPermissoes', foreign_keys='[AgendaPermissoes.dono_id]', back_populates='dono')
    agenda_permissoes_usuario: Mapped[list['AgendaPermissoes']] = relationship('AgendaPermissoes', foreign_keys='[AgendaPermissoes.usuario_id]', back_populates='usuario')
    clientes_sst_medico_responsavel: Mapped[list['ClientesSst']] = relationship('ClientesSst', foreign_keys='[ClientesSst.medico_responsavel_id]', back_populates='medico_responsavel')
    clientes_sst_responsavel: Mapped[list['ClientesSst']] = relationship('ClientesSst', foreign_keys='[ClientesSst.responsavel_id]', back_populates='responsavel_')
    closer_card_movimentacoes: Mapped[list['CloserCardMovimentacoes']] = relationship('CloserCardMovimentacoes', back_populates='usuario')
    contas_pagar: Mapped[list['ContasPagar']] = relationship('ContasPagar', back_populates='profiles')
    esocial_event_logs: Mapped[list['EsocialEventLogs']] = relationship('EsocialEventLogs', back_populates='user')
    prospeccao_atividades: Mapped[list['ProspeccaoAtividades']] = relationship('ProspeccaoAtividades', back_populates='usuario')
    prospeccao_card_movimentacoes: Mapped[list['ProspeccaoCardMovimentacoes']] = relationship('ProspeccaoCardMovimentacoes', back_populates='usuario')
    sinistros_colaborador: Mapped[list['SinistrosColaborador']] = relationship('SinistrosColaborador', back_populates='profiles')
    agenda_eventos: Mapped[list['AgendaEventos']] = relationship('AgendaEventos', back_populates='profiles')
    contas_pagar_atividades: Mapped[list['ContasPagarAtividades']] = relationship('ContasPagarAtividades', back_populates='usuario')
    contas_pagar_movimentacoes: Mapped[list['ContasPagarMovimentacoes']] = relationship('ContasPagarMovimentacoes', back_populates='usuario')
    contas_receber: Mapped[list['ContasReceber']] = relationship('ContasReceber', back_populates='profiles')
    equipamentos_movimentacoes_usuario_recebeu: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', foreign_keys='[EquipamentosMovimentacoes.usuario_recebeu_id]', back_populates='usuario_recebeu')
    equipamentos_movimentacoes_usuario_separou: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', foreign_keys='[EquipamentosMovimentacoes.usuario_separou_id]', back_populates='usuario_separou')
    equipamentos_movimentacoes_usuario_utilizou: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', foreign_keys='[EquipamentosMovimentacoes.usuario_utilizou_id]', back_populates='usuario_utilizou')
    funil_cards: Mapped[list['FunilCards']] = relationship('FunilCards', back_populates='responsavel')
    pos_venda_cards_created_by: Mapped[list['PosVendaCards']] = relationship('PosVendaCards', foreign_keys='[PosVendaCards.created_by]', back_populates='profiles')
    pos_venda_cards_responsavel: Mapped[list['PosVendaCards']] = relationship('PosVendaCards', foreign_keys='[PosVendaCards.responsavel_id]', back_populates='responsavel')
    agenda_compartilhamentos_compartilhado_com: Mapped[list['AgendaCompartilhamentos']] = relationship('AgendaCompartilhamentos', foreign_keys='[AgendaCompartilhamentos.compartilhado_com]', back_populates='profiles')
    agenda_compartilhamentos_compartilhado_por: Mapped[list['AgendaCompartilhamentos']] = relationship('AgendaCompartilhamentos', foreign_keys='[AgendaCompartilhamentos.compartilhado_por]', back_populates='profiles_')
    contas_receber_atividades: Mapped[list['ContasReceberAtividades']] = relationship('ContasReceberAtividades', back_populates='usuario')
    contas_receber_movimentacoes: Mapped[list['ContasReceberMovimentacoes']] = relationship('ContasReceberMovimentacoes', back_populates='usuario')
    equipamentos_movimentacao_atividades: Mapped[list['EquipamentosMovimentacaoAtividades']] = relationship('EquipamentosMovimentacaoAtividades', back_populates='membro')
    pos_venda_atividades_responsavel: Mapped[list['PosVendaAtividades']] = relationship('PosVendaAtividades', foreign_keys='[PosVendaAtividades.responsavel_id]', back_populates='responsavel')
    pos_venda_atividades_usuario: Mapped[list['PosVendaAtividades']] = relationship('PosVendaAtividades', foreign_keys='[PosVendaAtividades.usuario_id]', back_populates='usuario')


class ProspeccaoCards(Base):
    __tablename__ = 'prospeccao_cards'
    __table_args__ = (
        ForeignKeyConstraint(['coluna_id'], ['public.prospeccao_colunas.id'], ondelete='CASCADE', name='prospeccao_cards_coluna_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='prospeccao_cards_empresa_id_fkey'),
        ForeignKeyConstraint(['empresa_lead_id'], ['public.empresas.id'], ondelete='SET NULL', name='prospeccao_cards_empresa_lead_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_cards_pkey'),
        Index('idx_prospeccao_cards_coluna_id', 'coluna_id'),
        Index('idx_prospeccao_cards_empresa', 'empresa_id'),
        Index('idx_prospeccao_cards_empresa_lead_id', 'empresa_lead_id'),
        Index('idx_prospeccao_cards_ordem', 'coluna_id', 'ordem'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    lead_numero: Mapped[int] = mapped_column(Integer, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    contato_nome: Mapped[Optional[str]] = mapped_column(String(255))
    contato_email: Mapped[Optional[str]] = mapped_column(String(255))
    contato_telefone: Mapped[Optional[str]] = mapped_column(String(50))
    contato_empresa: Mapped[Optional[str]] = mapped_column(String(255))
    origem: Mapped[Optional[str]] = mapped_column(String(100))
    temperatura: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'morno'::character varying"))
    data_contato: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_followup: Mapped[Optional[datetime.date]] = mapped_column(Date)
    arquivado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    empresa_lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    contatos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    forma_pagamento: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'a_vista'::character varying"))

    coluna: Mapped['ProspeccaoColunas'] = relationship('ProspeccaoColunas', back_populates='prospeccao_cards')
    empresa: Mapped['Empresas'] = relationship('Empresas', foreign_keys=[empresa_id], back_populates='prospeccao_cards_empresa')
    empresa_lead: Mapped[Optional['Empresas']] = relationship('Empresas', foreign_keys=[empresa_lead_id], back_populates='prospeccao_cards_empresa_lead')
    prospeccao_atividades: Mapped[list['ProspeccaoAtividades']] = relationship('ProspeccaoAtividades', back_populates='card')
    prospeccao_card_etiquetas: Mapped[list['ProspeccaoCardEtiquetas']] = relationship('ProspeccaoCardEtiquetas', back_populates='card')
    prospeccao_card_movimentacoes: Mapped[list['ProspeccaoCardMovimentacoes']] = relationship('ProspeccaoCardMovimentacoes', back_populates='card')


class SetorPermissoes(Base):
    __tablename__ = 'setor_permissoes'
    __table_args__ = (
        ForeignKeyConstraint(['setor_id'], ['public.setores.id'], ondelete='CASCADE', name='setor_permissoes_setor_id_fkey'),
        PrimaryKeyConstraint('id', name='setor_permissoes_pkey'),
        UniqueConstraint('setor_id', 'grupo_acesso', 'modulo_id', 'pagina_id', name='setor_permissoes_setor_grupo_modulo_pagina_key'),
        Index('idx_setor_permissoes_grupo_acesso', 'setor_id', 'grupo_acesso'),
        Index('idx_setor_permissoes_setor_id', 'setor_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    setor_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    modulo_id: Mapped[str] = mapped_column(String(100), nullable=False)
    pagina_id: Mapped[str] = mapped_column(String(100), nullable=False)
    visualizar: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    editar: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    criar: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    grupo_acesso: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'colaborador'::character varying"))

    setor: Mapped['Setores'] = relationship('Setores', back_populates='setor_permissoes')


class TicketsSuporteAnexos(Base):
    __tablename__ = 'tickets_suporte_anexos'
    __table_args__ = (
        ForeignKeyConstraint(['ticket_id'], ['public.tickets_suporte.id'], ondelete='CASCADE', name='tickets_suporte_anexos_ticket_id_fkey'),
        PrimaryKeyConstraint('id', name='tickets_suporte_anexos_pkey'),
        Index('idx_tickets_anexos_ticket', 'ticket_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    ticket_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_arquivo: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    tamanho_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    tipo_mime: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    ticket: Mapped['TicketsSuporte'] = relationship('TicketsSuporte', back_populates='tickets_suporte_anexos')


class TicketsSuporteComentarios(Base):
    __tablename__ = 'tickets_suporte_comentarios'
    __table_args__ = (
        ForeignKeyConstraint(['autor_id'], ['users.id'], name='tickets_suporte_comentarios_autor_id_fkey'),
        ForeignKeyConstraint(['ticket_id'], ['public.tickets_suporte.id'], ondelete='CASCADE', name='tickets_suporte_comentarios_ticket_id_fkey'),
        PrimaryKeyConstraint('id', name='tickets_suporte_comentarios_pkey'),
        Index('idx_tickets_comentarios_ticket', 'ticket_id'),
        Index('idx_tickets_suporte_comentarios_autor_id', 'autor_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    ticket_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    autor_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    autor_nome: Mapped[str] = mapped_column(Text, nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    interno: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    ticket: Mapped['TicketsSuporte'] = relationship('TicketsSuporte', back_populates='tickets_suporte_comentarios')


class WhatsappCampanhas(Base):
    __tablename__ = 'whatsapp_campanhas'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['pendente'::character varying, 'processando'::character varying, 'concluida'::character varying, 'cancelada'::character varying, 'falha'::character varying]::text[])", name='whatsapp_campanhas_status_check'),
        ForeignKeyConstraint(['criado_por'], ['users.id'], ondelete='SET NULL', name='whatsapp_campanhas_criado_por_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='whatsapp_campanhas_empresa_id_fkey'),
        ForeignKeyConstraint(['template_id'], ['public.whatsapp_templates.id'], ondelete='RESTRICT', name='whatsapp_campanhas_template_id_fkey'),
        PrimaryKeyConstraint('id', name='whatsapp_campanhas_pkey'),
        Index('idx_whatsapp_campanhas_empresa', 'empresa_id'),
        Index('idx_whatsapp_campanhas_status', 'status'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    template_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'pendente'::character varying"))
    total_mensagens: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    enviadas: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    entregues: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    lidas: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    falhas: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    criado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    agendada_para: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    iniciada_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    concluida_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='whatsapp_campanhas')
    template: Mapped['WhatsappTemplates'] = relationship('WhatsappTemplates', back_populates='whatsapp_campanhas')
    whatsapp_mensagens: Mapped[list['WhatsappMensagens']] = relationship('WhatsappMensagens', back_populates='campanha')


class AccessLogs(Base):
    __tablename__ = 'access_logs'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='access_logs_empresa_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['public.profiles.id'], ondelete='SET NULL', name='access_logs_user_id_fkey'),
        PrimaryKeyConstraint('id', name='access_logs_pkey'),
        Index('idx_access_logs_acao', 'acao'),
        Index('idx_access_logs_created', 'created_at'),
        Index('idx_access_logs_empresa', 'empresa_id'),
        Index('idx_access_logs_user', 'user_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    acao: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    user_email: Mapped[Optional[str]] = mapped_column(Text)
    user_nome: Mapped[Optional[str]] = mapped_column(Text)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    pagina: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(Text)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    device_type: Mapped[Optional[str]] = mapped_column(Text)
    browser: Mapped[Optional[str]] = mapped_column(Text)
    os: Mapped[Optional[str]] = mapped_column(Text)
    metadata_: Mapped[Optional[dict]] = mapped_column('metadata', JSONB, server_default=text("'{}'::jsonb"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='access_logs')
    user: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='access_logs')


class AgendaPermissoes(Base):
    __tablename__ = 'agenda_permissoes'
    __table_args__ = (
        ForeignKeyConstraint(['dono_id'], ['public.profiles.id'], ondelete='CASCADE', name='agenda_permissoes_dono_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='agenda_permissoes_empresa_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], ondelete='CASCADE', name='agenda_permissoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='agenda_permissoes_pkey'),
        UniqueConstraint('dono_id', 'usuario_id', name='agenda_permissoes_dono_id_usuario_id_key'),
        Index('idx_agenda_permissoes_dono', 'dono_id'),
        Index('idx_agenda_permissoes_empresa', 'empresa_id'),
        Index('idx_agenda_permissoes_usuario', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    dono_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    pode_criar_eventos: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    dono: Mapped['Profiles'] = relationship('Profiles', foreign_keys=[dono_id], back_populates='agenda_permissoes_dono')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='agenda_permissoes')
    usuario: Mapped['Profiles'] = relationship('Profiles', foreign_keys=[usuario_id], back_populates='agenda_permissoes_usuario')


class ClientesSst(Base):
    __tablename__ = 'clientes_sst'
    __table_args__ = (
        ForeignKeyConstraint(['categoria_id'], ['public.categorias_clientes_empresa.id'], ondelete='SET NULL', name='clientes_sst_categoria_id_fkey'),
        ForeignKeyConstraint(['cliente_empresa_id'], ['public.empresas.id'], ondelete='SET NULL', name='clientes_sst_cliente_empresa_id_fkey'),
        ForeignKeyConstraint(['empresa_sst_id'], ['public.empresas.id'], ondelete='CASCADE', name='clientes_sst_empresa_sst_id_fkey'),
        ForeignKeyConstraint(['medico_responsavel_id'], ['public.profiles.id'], ondelete='SET NULL', name='clientes_sst_medico_responsavel_id_fkey'),
        ForeignKeyConstraint(['origem_contato_id'], ['public.origens_contato.id'], ondelete='SET NULL', name='clientes_sst_origem_contato_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.profiles.id'], ondelete='SET NULL', name='clientes_sst_responsavel_id_fkey'),
        PrimaryKeyConstraint('id', name='clientes_sst_pkey'),
        Index('idx_clientes_sst_categoria_id', 'categoria_id'),
        Index('idx_clientes_sst_cliente_empresa_id', 'cliente_empresa_id'),
        Index('idx_clientes_sst_empresa_sst_id', 'empresa_sst_id'),
        Index('idx_clientes_sst_responsavel_id', 'responsavel_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_sst_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    cnpj: Mapped[Optional[str]] = mapped_column(Text)
    responsavel: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    sigla: Mapped[Optional[str]] = mapped_column(String(3))
    categoria_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_inscricao: Mapped[Optional[str]] = mapped_column(String(1), server_default=text("'1'::character varying"), comment='Tipo de inscrição eSocial: 1-CNPJ, 2-CPF, 3-CAEPF, 4-CNO, 5-CGC, 6-CEI')
    numero_inscricao_esocial: Mapped[Optional[str]] = mapped_column(String(50), comment='Número da inscrição no eSocial (CNPJ, CPF, etc)')
    cnae: Mapped[Optional[str]] = mapped_column(String(20), comment='Código CNAE da empresa')
    cnae_atividade: Mapped[Optional[str]] = mapped_column(Text, comment='Descrição da atividade econômica (CNAE)')
    grau_risco: Mapped[Optional[str]] = mapped_column(String(1), comment='Grau de risco da atividade: 1-Leve, 2-Moderado, 3-Alto, 4-Muito Alto')
    porte_empresa: Mapped[Optional[str]] = mapped_column(String(20))
    servicos_contratados: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    medico_responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    possui_gestao_treinamentos: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    possui_pcmso: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    origem_contato_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    categoria: Mapped[Optional['CategoriasClientesEmpresa']] = relationship('CategoriasClientesEmpresa', back_populates='clientes_sst')
    cliente_empresa: Mapped[Optional['Empresas']] = relationship('Empresas', foreign_keys=[cliente_empresa_id], back_populates='clientes_sst_cliente_empresa')
    empresa_sst: Mapped['Empresas'] = relationship('Empresas', foreign_keys=[empresa_sst_id], back_populates='clientes_sst_empresa_sst')
    medico_responsavel: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[medico_responsavel_id], back_populates='clientes_sst_medico_responsavel')
    origem_contato: Mapped[Optional['OrigensContato']] = relationship('OrigensContato', back_populates='clientes_sst')
    responsavel_: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[responsavel_id], back_populates='clientes_sst_responsavel')
    agenda_eventos: Mapped[list['AgendaEventos']] = relationship('AgendaEventos', back_populates='cliente_sst')
    cliente_contatos: Mapped[list['ClienteContatos']] = relationship('ClienteContatos', back_populates='cliente')
    contas_receber: Mapped[list['ContasReceber']] = relationship('ContasReceber', back_populates='cliente')
    contratos: Mapped[list['Contratos']] = relationship('Contratos', back_populates='cliente')
    equipamentos_movimentacoes: Mapped[list['EquipamentosMovimentacoes']] = relationship('EquipamentosMovimentacoes', back_populates='cliente')
    funil_cards: Mapped[list['FunilCards']] = relationship('FunilCards', back_populates='cliente')
    pos_venda_cards: Mapped[list['PosVendaCards']] = relationship('PosVendaCards', back_populates='cliente')
    profissionais_saude: Mapped[list['ProfissionaisSaude']] = relationship('ProfissionaisSaude', back_populates='cliente')
    profissionais_seguranca: Mapped[list['ProfissionaisSeguranca']] = relationship('ProfissionaisSeguranca', back_populates='cliente')
    propostas_comerciais_servicos_sst: Mapped[list['PropostasComerciaisServicosSst']] = relationship('PropostasComerciaisServicosSst', back_populates='cliente')
    propostas_comerciais_treinamentos: Mapped[list['PropostasComerciaisTreinamentos']] = relationship('PropostasComerciaisTreinamentos', back_populates='cliente')
    unidades_clientes: Mapped[list['UnidadesClientes']] = relationship('UnidadesClientes', back_populates='cliente')


class CloserAtividades(Base):
    __tablename__ = 'closer_atividades'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.closer_cards.id'], ondelete='CASCADE', name='closer_atividades_card_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.colaboradores.id'], ondelete='SET NULL', name='closer_atividades_responsavel_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], name='closer_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_atividades_pkey'),
        Index('idx_closer_atividades_card', 'card_id'),
        Index('idx_closer_atividades_responsavel_id', 'responsavel_id'),
        Index('idx_closer_atividades_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[datetime.time]] = mapped_column(Time)
    concluida: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    data_conclusao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    checklist_items: Mapped[Optional[dict]] = mapped_column(JSONB)
    membros_ids: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(Uuid()))
    anexo_url: Mapped[Optional[str]] = mapped_column(Text)
    anexo_nome: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'a_realizar'::character varying"))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    anexos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)

    card: Mapped['CloserCards'] = relationship('CloserCards', back_populates='closer_atividades')
    responsavel: Mapped[Optional['Colaboradores']] = relationship('Colaboradores', back_populates='closer_atividades')


class CloserCardEtiquetas(Base):
    __tablename__ = 'closer_card_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.closer_cards.id'], ondelete='CASCADE', name='closer_card_etiquetas_card_id_fkey'),
        ForeignKeyConstraint(['etiqueta_id'], ['public.closer_etiquetas.id'], ondelete='CASCADE', name='closer_card_etiquetas_etiqueta_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_card_etiquetas_pkey'),
        UniqueConstraint('card_id', 'etiqueta_id', name='closer_card_etiquetas_card_id_etiqueta_id_key'),
        Index('idx_closer_card_etiquetas_etiqueta_id', 'etiqueta_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    etiqueta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    card: Mapped['CloserCards'] = relationship('CloserCards', back_populates='closer_card_etiquetas')
    etiqueta: Mapped['CloserEtiquetas'] = relationship('CloserEtiquetas', back_populates='closer_card_etiquetas')


class CloserCardMovimentacoes(Base):
    __tablename__ = 'closer_card_movimentacoes'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['criacao'::text, 'mudanca_coluna'::text, 'mudanca_etapa'::text, 'encaminhamento'::text, 'edicao'::text])", name='closer_card_movimentacoes_tipo_check'),
        ForeignKeyConstraint(['card_id'], ['public.closer_cards.id'], ondelete='CASCADE', name='closer_card_movimentacoes_card_id_fkey'),
        ForeignKeyConstraint(['coluna_destino_id'], ['public.closer_colunas.id'], ondelete='SET NULL', name='closer_card_movimentacoes_coluna_destino_id_fkey'),
        ForeignKeyConstraint(['coluna_origem_id'], ['public.closer_colunas.id'], ondelete='SET NULL', name='closer_card_movimentacoes_coluna_origem_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], ondelete='SET NULL', name='closer_card_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='closer_card_movimentacoes_pkey'),
        Index('idx_closer_card_movimentacoes_card_id', 'card_id'),
        Index('idx_closer_card_movimentacoes_coluna_destino_id', 'coluna_destino_id'),
        Index('idx_closer_card_movimentacoes_coluna_origem_id', 'coluna_origem_id'),
        Index('idx_closer_card_movimentacoes_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    pagina_origem: Mapped[Optional[str]] = mapped_column(Text)
    pagina_destino: Mapped[Optional[str]] = mapped_column(Text)
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    kanban_origem: Mapped[Optional[str]] = mapped_column(String(100), server_default=text("'Closer'::character varying"))
    kanban_destino: Mapped[Optional[str]] = mapped_column(String(100), server_default=text("'Closer'::character varying"))

    card: Mapped['CloserCards'] = relationship('CloserCards', back_populates='closer_card_movimentacoes')
    coluna_destino: Mapped[Optional['CloserColunas']] = relationship('CloserColunas', foreign_keys=[coluna_destino_id], back_populates='closer_card_movimentacoes_coluna_destino')
    coluna_origem: Mapped[Optional['CloserColunas']] = relationship('CloserColunas', foreign_keys=[coluna_origem_id], back_populates='closer_card_movimentacoes_coluna_origem')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='closer_card_movimentacoes')


class ContasPagar(Base):
    __tablename__ = 'contas_pagar'
    __table_args__ = (
        CheckConstraint("frequencia_cobranca::text = ANY (ARRAY['unico'::character varying, 'recorrente'::character varying]::text[])", name='contas_pagar_frequencia_check'),
        CheckConstraint("origem = ANY (ARRAY['manual'::text, 'compras'::text, 'rh'::text])", name='contas_pagar_origem_check'),
        CheckConstraint("status_pagamento::text = ANY (ARRAY['previsto'::character varying, 'realizado'::character varying, 'vencido'::character varying]::text[])", name='contas_pagar_status_check'),
        CheckConstraint("tipo_valor_recorrente IS NULL OR (tipo_valor_recorrente::text = ANY (ARRAY['fixo'::character varying, 'variavel'::character varying]::text[]))", name='contas_pagar_tipo_valor_check'),
        ForeignKeyConstraint(['coluna_id'], ['public.contas_pagar_colunas.id'], ondelete='CASCADE', name='contas_pagar_coluna_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['public.profiles.id'], name='contas_pagar_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='contas_pagar_empresa_id_fkey'),
        ForeignKeyConstraint(['fornecedor_id'], ['public.fornecedores.id'], ondelete='SET NULL', name='contas_pagar_fornecedor_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_pagar_pkey'),
        Index('idx_contas_pagar_coluna_id', 'coluna_id'),
        Index('idx_contas_pagar_created_by', 'created_by'),
        Index('idx_contas_pagar_empresa', 'empresa_id'),
        Index('idx_contas_pagar_fornecedor_id', 'fornecedor_id'),
        {'comment': 'Contas a pagar do módulo financeiro', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    numero: Mapped[str] = mapped_column(Text, nullable=False)
    fornecedor_nome: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[decimal.Decimal] = mapped_column(Numeric(15, 2), nullable=False, server_default=text('0'))
    valor_pago: Mapped[decimal.Decimal] = mapped_column(Numeric(15, 2), nullable=False, server_default=text('0'))
    data_emissao: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    arquivado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    fornecedor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    fornecedor_cnpj: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    data_competencia: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_vencimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_pagamento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    forma_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    forma_pagamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    categoria: Mapped[Optional[str]] = mapped_column(Text)
    conta_financeira: Mapped[Optional[str]] = mapped_column(Text)
    conta_financeira_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    centro_custo: Mapped[Optional[str]] = mapped_column(Text)
    centro_custo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    origem: Mapped[Optional[str]] = mapped_column(Text, comment='Origem da conta: manual, compras, rh')
    condicao_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    condicao_pagamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    recorrente: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    status_pagamento: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'previsto'::character varying"))
    frequencia_cobranca: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'unico'::character varying"), comment='Frequência de cobrança: unico (esporádico) ou recorrente (mensal)')
    tipo_valor_recorrente: Mapped[Optional[str]] = mapped_column(String(20), server_default=text('NULL::character varying'), comment='Tipo de valor para pagamento recorrente: fixo ou variavel (alterado a cada mês)')
    data_pagamento_programado: Mapped[Optional[datetime.date]] = mapped_column(Date, comment='Data programada para realizar o pagamento')

    coluna: Mapped['ContasPagarColunas'] = relationship('ContasPagarColunas', back_populates='contas_pagar')
    profiles: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='contas_pagar')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contas_pagar')
    fornecedor: Mapped[Optional['Fornecedores']] = relationship('Fornecedores', back_populates='contas_pagar')
    contas_pagar_atividades: Mapped[list['ContasPagarAtividades']] = relationship('ContasPagarAtividades', back_populates='conta')
    contas_pagar_movimentacoes: Mapped[list['ContasPagarMovimentacoes']] = relationship('ContasPagarMovimentacoes', back_populates='conta')


class CrossSellingAtividades(Base):
    __tablename__ = 'cross_selling_atividades'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.cross_selling_cards.id'], ondelete='CASCADE', name='cross_selling_atividades_card_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], name='cross_selling_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='cross_selling_atividades_pkey'),
        Index('idx_cross_selling_atividades_card_id', 'card_id'),
        Index('idx_cross_selling_atividades_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'a_realizar'::text"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    prazo: Mapped[Optional[str]] = mapped_column(Text)
    horario: Mapped[Optional[str]] = mapped_column(Text)

    card: Mapped['CrossSellingCards'] = relationship('CrossSellingCards', back_populates='cross_selling_atividades')


t_cross_selling_card_etiquetas = Table(
    'cross_selling_card_etiquetas', Base.metadata,
    Column('card_id', Uuid, primary_key=True),
    Column('etiqueta_id', Uuid, primary_key=True),
    ForeignKeyConstraint(['card_id'], ['public.cross_selling_cards.id'], ondelete='CASCADE', name='cross_selling_card_etiquetas_card_id_fkey'),
    ForeignKeyConstraint(['etiqueta_id'], ['public.cross_selling_etiquetas.id'], ondelete='CASCADE', name='cross_selling_card_etiquetas_etiqueta_id_fkey'),
    PrimaryKeyConstraint('card_id', 'etiqueta_id', name='cross_selling_card_etiquetas_pkey'),
    Index('idx_cross_selling_card_etiquetas_etiqueta_id', 'etiqueta_id'),
    schema='public'
)


class CrossSellingCardMovimentacoes(Base):
    __tablename__ = 'cross_selling_card_movimentacoes'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.cross_selling_cards.id'], ondelete='CASCADE', name='cross_selling_card_movimentacoes_card_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='SET NULL', name='cross_selling_card_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='cross_selling_card_movimentacoes_pkey'),
        Index('idx_cross_selling_card_movimentacoes_card_id', 'card_id'),
        Index('idx_cross_selling_card_movimentacoes_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'mudanca_coluna'::character varying"))
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    kanban_origem: Mapped[Optional[str]] = mapped_column(String(100))
    kanban_destino: Mapped[Optional[str]] = mapped_column(String(100))
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)

    card: Mapped['CrossSellingCards'] = relationship('CrossSellingCards', back_populates='cross_selling_card_movimentacoes')


class EsocialEventLogs(Base):
    __tablename__ = 'esocial_event_logs'
    __table_args__ = (
        CheckConstraint("ambiente::text = ANY (ARRAY['homologacao'::character varying, 'producao'::character varying]::text[])", name='valid_ambiente'),
        CheckConstraint("status::text = ANY (ARRAY['pending'::character varying, 'sent'::character varying, 'processing'::character varying, 'confirmed'::character varying, 'error'::character varying]::text[])", name='valid_status'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='esocial_event_logs_empresa_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['public.profiles.id'], ondelete='SET NULL', name='esocial_event_logs_user_id_fkey'),
        PrimaryKeyConstraint('id', name='esocial_event_logs_pkey'),
        Index('idx_esocial_event_logs_created_at', 'created_at'),
        Index('idx_esocial_event_logs_dashboard', 'empresa_id', 'event_type', 'status', 'created_at'),
        Index('idx_esocial_event_logs_empresa_id', 'empresa_id'),
        Index('idx_esocial_event_logs_event_type', 'event_type'),
        Index('idx_esocial_event_logs_protocol_number', 'protocol_number'),
        Index('idx_esocial_event_logs_status', 'status'),
        Index('idx_esocial_event_logs_transaction_id', 'transaction_id'),
        {'comment': 'Logs de todos os eventos eSocial enviados via VPS Backend V2.0',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    transaction_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='ID único da transação (agrupa múltiplos eventos)')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    event_type: Mapped[str] = mapped_column(String(10), nullable=False, comment='Tipo do evento eSocial (S-2200, S-1200, R-4010, etc)')
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'pending'::character varying"), comment='Status: pending, sent, processing, confirmed, error')
    ambiente: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'homologacao'::character varying"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    event_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    protocol_number: Mapped[Optional[str]] = mapped_column(String(100), comment='Protocolo retornado pelo governo')
    receipt_number: Mapped[Optional[str]] = mapped_column(String(100))
    response_code: Mapped[Optional[str]] = mapped_column(String(10))
    response_message: Mapped[Optional[str]] = mapped_column(Text)
    response_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    confirmed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='esocial_event_logs')
    user: Mapped['Profiles'] = relationship('Profiles', back_populates='esocial_event_logs')


class FunilEtapas(Base):
    __tablename__ = 'funil_etapas'
    __table_args__ = (
        ForeignKeyConstraint(['funil_id'], ['public.funis.id'], ondelete='CASCADE', name='funil_etapas_funil_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_etapas_pkey'),
        Index('idx_funil_etapas_funil_id', 'funil_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    funil_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    trancada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(7), server_default=text("'#6366f1'::character varying"))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    funil: Mapped['Funis'] = relationship('Funis', back_populates='funil_etapas')
    automacoes: Mapped[list['Automacoes']] = relationship('Automacoes', back_populates='etapa')
    funil_cards: Mapped[list['FunilCards']] = relationship('FunilCards', back_populates='etapa')
    funil_card_movimentacoes_etapa_destino: Mapped[list['FunilCardMovimentacoes']] = relationship('FunilCardMovimentacoes', foreign_keys='[FunilCardMovimentacoes.etapa_destino_id]', back_populates='etapa_destino')
    funil_card_movimentacoes_etapa_origem: Mapped[list['FunilCardMovimentacoes']] = relationship('FunilCardMovimentacoes', foreign_keys='[FunilCardMovimentacoes.etapa_origem_id]', back_populates='etapa_origem')


class FunisConfiguracoes(Base):
    __tablename__ = 'funis_configuracoes'
    __table_args__ = (
        CheckConstraint("modo_visualizacao::text = ANY (ARRAY['kanban'::character varying, 'lista'::character varying]::text[])", name='funis_configuracoes_modo_visualizacao_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funis_configuracoes_empresa_id_fkey'),
        ForeignKeyConstraint(['funil_id'], ['public.funis.id'], ondelete='CASCADE', name='funis_configuracoes_funil_id_fkey'),
        PrimaryKeyConstraint('id', name='funis_configuracoes_pkey'),
        UniqueConstraint('funil_id', name='funis_configuracoes_funil_id_key'),
        Index('idx_funis_configuracoes_funil_id', 'funil_id'),
        {'comment': 'Configurações personalizáveis para cada funil', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    funil_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo_pagina: Mapped[Optional[str]] = mapped_column(String(255))
    descricao_pagina: Mapped[Optional[str]] = mapped_column(Text)
    modo_visualizacao: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'kanban'::character varying"))
    dashboard_visivel: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    dashboard_tipo: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'simples'::character varying"))
    dashboard_metricas: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text('\'["total_cards", "valor_total", "cards_por_etapa"]\'::jsonb'))
    botao_adicionar_visivel: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    botao_adicionar_texto: Mapped[Optional[str]] = mapped_column(String(100), server_default=text("'Novo Card'::character varying"))
    card_campos_visiveis: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text('\'["titulo", "cliente", "valor", "data", "responsavel"]\'::jsonb'))
    card_mostrar_valor: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_mostrar_cliente: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_mostrar_data: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_mostrar_responsavel: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_mostrar_etiquetas: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_interno_atividades_tipos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text('\'["tarefa", "email", "ligacao", "whatsapp", "reuniao", "visita", "nota"]\'::jsonb'))
    card_interno_acoes_rapidas: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text('\'["editar", "mover", "excluir"]\'::jsonb'))
    card_interno_mostrar_historico: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_interno_mostrar_movimentacoes: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_interno_campos_personalizados: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    acoes_especiais: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    formulario_campos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text('\'[{"tipo": "text", "campo": "titulo", "label": "Título", "visivel": true, "obrigatorio": true}, {"tipo": "select", "campo": "cliente", "label": "Cliente", "visivel": true, "obrigatorio": false}, {"tipo": "currency", "campo": "valor", "label": "Valor", "visivel": true, "obrigatorio": false}, {"tipo": "date", "campo": "data_previsao", "label": "Data Previsão", "visivel": true, "obrigatorio": false}, {"tipo": "select", "campo": "responsavel", "label": "Responsável", "visivel": true, "obrigatorio": false}, {"tipo": "textarea", "campo": "descricao", "label": "Descrição", "visivel": true, "obrigatorio": false}]\'::jsonb'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    card_mostrar_categoria: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_interno_mostrar_prioridade: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    botao_novo_card_texto: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Novo Card'::text"))
    empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    card_mostrar_status: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    card_mostrar_status_atividade: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'), comment='Controla se o status de atividade (programada, pendente, atrasada) é exibido na frente do card')
    cards_ordenacao: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'ordem_chegada'::text"), comment='Define a ordenação dos cards nas colunas do Kanban: ordem_chegada, atividade_proxima, data_previsao, valor, prioridade')

    empresa: Mapped[Optional['Empresas']] = relationship('Empresas', back_populates='funis_configuracoes')
    funil: Mapped['Funis'] = relationship('Funis', back_populates='funis_configuracoes')


class PacotesProdutosItens(Base):
    __tablename__ = 'pacotes_produtos_itens'
    __table_args__ = (
        ForeignKeyConstraint(['pacote_id'], ['public.pacotes_produtos.id'], ondelete='CASCADE', name='pacotes_produtos_itens_pacote_id_fkey'),
        ForeignKeyConstraint(['produto_id'], ['public.produtos_servicos.id'], ondelete='CASCADE', name='pacotes_produtos_itens_produto_id_fkey'),
        PrimaryKeyConstraint('id', name='pacotes_produtos_itens_pkey'),
        Index('idx_pacotes_produtos_itens_pacote', 'pacote_id'),
        Index('idx_pacotes_produtos_itens_produto_id', 'produto_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    pacote_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    produto_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    quantidade: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('1'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    pacote: Mapped['PacotesProdutos'] = relationship('PacotesProdutos', back_populates='pacotes_produtos_itens')
    produto: Mapped['ProdutosServicos'] = relationship('ProdutosServicos', back_populates='pacotes_produtos_itens')


class PesquisasVotos(Base):
    __tablename__ = 'pesquisas_votos'
    __table_args__ = (
        ForeignKeyConstraint(['opcao_id'], ['public.pesquisas_opcoes.id'], ondelete='CASCADE', name='pesquisas_votos_opcao_id_fkey'),
        ForeignKeyConstraint(['pesquisa_id'], ['public.pesquisas_opiniao.id'], ondelete='CASCADE', name='pesquisas_votos_pesquisa_id_fkey'),
        PrimaryKeyConstraint('id', name='pesquisas_votos_pkey'),
        UniqueConstraint('pesquisa_id', 'session_id', name='unique_pesquisa_session'),
        Index('idx_pesquisas_votos_ip', 'pesquisa_id', 'ip_address'),
        Index('idx_pesquisas_votos_pesquisa', 'pesquisa_id'),
        Index('idx_pesquisas_votos_session', 'session_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    pesquisa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    session_id: Mapped[str] = mapped_column(String(255), nullable=False)
    opcao_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    resposta_texto: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[Any]] = mapped_column(INET)
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    nome: Mapped[Optional[str]] = mapped_column(String(255))
    empresa: Mapped[Optional[str]] = mapped_column(String(255))
    cnpj: Mapped[Optional[str]] = mapped_column(String(25))
    cargo: Mapped[Optional[str]] = mapped_column(String(100))
    sistema_atual: Mapped[Optional[str]] = mapped_column(String(255))
    mensagem: Mapped[Optional[str]] = mapped_column(Text)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telefone: Mapped[Optional[str]] = mapped_column(String(20))

    opcao: Mapped[Optional['PesquisasOpcoes']] = relationship('PesquisasOpcoes', back_populates='pesquisas_votos')
    pesquisa: Mapped['PesquisasOpiniao'] = relationship('PesquisasOpiniao', back_populates='pesquisas_votos')


class ProspeccaoAtividades(Base):
    __tablename__ = 'prospeccao_atividades'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['a_realizar'::character varying, 'programada'::character varying, 'pendente'::character varying, 'concluida'::character varying]::text[])", name='prospeccao_atividades_status_check'),
        ForeignKeyConstraint(['card_id'], ['public.prospeccao_cards.id'], ondelete='CASCADE', name='prospeccao_atividades_card_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.colaboradores.id'], ondelete='SET NULL', name='prospeccao_atividades_responsavel_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], ondelete='SET NULL', name='prospeccao_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_atividades_pkey'),
        Index('idx_prospeccao_atividades_card', 'card_id'),
        Index('idx_prospeccao_atividades_responsavel_id', 'responsavel_id'),
        Index('idx_prospeccao_atividades_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[datetime.time]] = mapped_column(Time)
    anexos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'criada'::character varying"))
    checklist_items: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), comment='Array de itens do checklist: [{id, texto, concluido}]')
    membros_ids: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(Uuid()), server_default=text("'{}'::uuid[]"), comment='Array de IDs dos colaboradores atribuídos à atividade')
    data_conclusao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    card: Mapped['ProspeccaoCards'] = relationship('ProspeccaoCards', back_populates='prospeccao_atividades')
    responsavel: Mapped[Optional['Colaboradores']] = relationship('Colaboradores', back_populates='prospeccao_atividades')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='prospeccao_atividades')


class ProspeccaoCardEtiquetas(Base):
    __tablename__ = 'prospeccao_card_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.prospeccao_cards.id'], ondelete='CASCADE', name='prospeccao_card_etiquetas_card_id_fkey'),
        ForeignKeyConstraint(['etiqueta_id'], ['public.prospeccao_etiquetas.id'], ondelete='CASCADE', name='prospeccao_card_etiquetas_etiqueta_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_card_etiquetas_pkey'),
        UniqueConstraint('card_id', 'etiqueta_id', name='prospeccao_card_etiquetas_card_id_etiqueta_id_key'),
        Index('idx_prospeccao_card_etiquetas_card', 'card_id'),
        Index('idx_prospeccao_card_etiquetas_etiqueta_id', 'etiqueta_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    etiqueta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    card: Mapped['ProspeccaoCards'] = relationship('ProspeccaoCards', back_populates='prospeccao_card_etiquetas')
    etiqueta: Mapped['ProspeccaoEtiquetas'] = relationship('ProspeccaoEtiquetas', back_populates='prospeccao_card_etiquetas')


class ProspeccaoCardMovimentacoes(Base):
    __tablename__ = 'prospeccao_card_movimentacoes'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.prospeccao_cards.id'], ondelete='CASCADE', name='prospeccao_card_movimentacoes_card_id_fkey'),
        ForeignKeyConstraint(['coluna_destino_id'], ['public.prospeccao_colunas.id'], name='prospeccao_card_movimentacoes_coluna_destino_id_fkey'),
        ForeignKeyConstraint(['coluna_origem_id'], ['public.prospeccao_colunas.id'], name='prospeccao_card_movimentacoes_coluna_origem_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], name='prospeccao_card_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='prospeccao_card_movimentacoes_pkey'),
        Index('idx_prospeccao_card_movimentacoes_card_id', 'card_id'),
        Index('idx_prospeccao_card_movimentacoes_coluna_destino_id', 'coluna_destino_id'),
        Index('idx_prospeccao_card_movimentacoes_coluna_origem_id', 'coluna_origem_id'),
        Index('idx_prospeccao_card_movimentacoes_usuario_id', 'usuario_id'),
        {'comment': 'Histórico de movimentações dos cards de prospecção',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, comment='Tipo da movimentação: criacao, mudanca_coluna, mudanca_etapa, encaminhamento, edicao')
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    pagina_origem: Mapped[Optional[str]] = mapped_column(Text, comment='Página de origem: prospeccao, closer, pos_vendas')
    pagina_destino: Mapped[Optional[str]] = mapped_column(Text, comment='Página de destino: prospeccao, closer, pos_vendas')
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    kanban_origem: Mapped[Optional[str]] = mapped_column(String(100))
    kanban_destino: Mapped[Optional[str]] = mapped_column(String(100))

    card: Mapped['ProspeccaoCards'] = relationship('ProspeccaoCards', back_populates='prospeccao_card_movimentacoes')
    coluna_destino: Mapped[Optional['ProspeccaoColunas']] = relationship('ProspeccaoColunas', foreign_keys=[coluna_destino_id], back_populates='prospeccao_card_movimentacoes_coluna_destino')
    coluna_origem: Mapped[Optional['ProspeccaoColunas']] = relationship('ProspeccaoColunas', foreign_keys=[coluna_origem_id], back_populates='prospeccao_card_movimentacoes_coluna_origem')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='prospeccao_card_movimentacoes')


class SinistrosColaborador(Base):
    __tablename__ = 'sinistros_colaborador'
    __table_args__ = (
        ForeignKeyConstraint(['registrado_por'], ['public.profiles.id'], name='sinistros_colaborador_registrado_por_fkey'),
        ForeignKeyConstraint(['tipo_sinistro_id'], ['public.tipos_sinistro.id'], name='sinistros_colaborador_tipo_sinistro_id_fkey'),
        PrimaryKeyConstraint('id', name='sinistros_colaborador_pkey'),
        Index('idx_sinistros_colaborador_registrado_por', 'registrado_por'),
        Index('idx_sinistros_colaborador_tipo_sinistro_id', 'tipo_sinistro_id'),
        Index('idx_sinistros_turma', 'turma_id'),
        Index('idx_sinistros_turma_colaborador', 'turma_colaborador_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    turma_colaborador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    turma_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_sinistro_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    acao: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'reprovacao'::character varying"))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    registrado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    profiles: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='sinistros_colaborador')
    tipo_sinistro: Mapped['TiposSinistro'] = relationship('TiposSinistro', back_populates='sinistros_colaborador')
    sinistro_fotos: Mapped[list['SinistroFotos']] = relationship('SinistroFotos', back_populates='sinistro')


class WhatsappMensagens(Base):
    __tablename__ = 'whatsapp_mensagens'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['na_fila'::character varying, 'enviando'::character varying, 'enviada'::character varying, 'entregue'::character varying, 'lida'::character varying, 'falha'::character varying]::text[])", name='whatsapp_mensagens_status_check'),
        ForeignKeyConstraint(['campanha_id'], ['public.whatsapp_campanhas.id'], ondelete='CASCADE', name='whatsapp_mensagens_campanha_id_fkey'),
        PrimaryKeyConstraint('id', name='whatsapp_mensagens_pkey'),
        Index('idx_whatsapp_mensagens_campanha', 'campanha_id'),
        Index('idx_whatsapp_mensagens_status', 'status'),
        Index('idx_whatsapp_mensagens_twilio_sid', 'twilio_message_sid', postgresql_where='(twilio_message_sid IS NOT NULL)'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    campanha_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    corpo_mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    nome_lead: Mapped[Optional[str]] = mapped_column(String(255))
    twilio_message_sid: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'na_fila'::character varying"))
    erro: Mapped[Optional[str]] = mapped_column(Text)
    enviada_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    entregue_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    lida_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    campanha: Mapped['WhatsappCampanhas'] = relationship('WhatsappCampanhas', back_populates='whatsapp_mensagens')


class AgendaEventos(Base):
    __tablename__ = 'agenda_eventos'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['ativo'::text, 'cancelado'::text, 'concluido'::text])", name='agenda_eventos_status_check'),
        CheckConstraint("tipo = ANY (ARRAY['evento'::text, 'reuniao'::text, 'tarefa'::text, 'lembrete'::text, 'visita'::text, 'outro'::text, 'bloqueio'::text])", name='agenda_eventos_tipo_check'),
        CheckConstraint("visibilidade = ANY (ARRAY['privado'::text, 'compartilhado'::text, 'empresa'::text])", name='agenda_eventos_visibilidade_check'),
        ForeignKeyConstraint(['cliente_sst_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='agenda_eventos_cliente_sst_id_fkey'),
        ForeignKeyConstraint(['criado_por'], ['public.profiles.id'], ondelete='CASCADE', name='agenda_eventos_criado_por_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='agenda_eventos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='agenda_eventos_pkey'),
        Index('idx_agenda_eventos_cliente_sst', 'cliente_sst_id'),
        Index('idx_agenda_eventos_criado_por', 'criado_por'),
        Index('idx_agenda_eventos_data_inicio', 'data_inicio'),
        Index('idx_agenda_eventos_empresa', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    criado_por: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    data_inicio: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    data_fim: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    dia_inteiro: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    local: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'#16E17A'::text"))
    tipo: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'evento'::text"))
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'ativo'::text"))
    visibilidade: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'privado'::text"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    bloqueado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    meet_link: Mapped[Optional[str]] = mapped_column(Text)
    cliente_sst_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_email: Mapped[Optional[str]] = mapped_column(Text)
    cliente_nome: Mapped[Optional[str]] = mapped_column(Text)
    convite_enviado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    convite_enviado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    cliente_sst: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='agenda_eventos')
    profiles: Mapped['Profiles'] = relationship('Profiles', back_populates='agenda_eventos')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='agenda_eventos')
    agenda_compartilhamentos: Mapped[list['AgendaCompartilhamentos']] = relationship('AgendaCompartilhamentos', back_populates='evento')


class Automacoes(Base):
    __tablename__ = 'automacoes'
    __table_args__ = (
        CheckConstraint("gatilho = ANY (ARRAY['negocio_chegar_etapa'::text, 'negocio_ganho'::text, 'negocio_perdido'::text, 'pessoa_adicionada'::text, 'empresa_adicionada'::text, 'negocio_parado_etapa'::text, 'atividade_finalizada'::text])", name='automacoes_gatilho_check'),
        CheckConstraint("tipo = ANY (ARRAY['enviar_mensagem_whatsapp'::text, 'agendar_atividade'::text, 'criar_negocio'::text, 'duplicar_card'::text, 'mover_card'::text, 'mover_etapa'::text, 'enviar_email'::text, 'criar_tarefa'::text, 'duplicar_card_agendado'::text, 'mover_card_agendado'::text])", name='automacoes_tipo_check'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='automacoes_empresa_id_fkey'),
        ForeignKeyConstraint(['etapa_id'], ['public.funil_etapas.id'], ondelete='SET NULL', name='automacoes_etapa_id_fkey'),
        ForeignKeyConstraint(['funil_id'], ['public.funis.id'], ondelete='CASCADE', name='automacoes_funil_id_fkey'),
        PrimaryKeyConstraint('id', name='automacoes_pkey'),
        Index('idx_automacoes_agendamento', 'agendamento_data_hora', postgresql_where='((agendamento_data_hora IS NOT NULL) AND (executado = false) AND (ativo = true))'),
        Index('idx_automacoes_empresa_id', 'empresa_id'),
        Index('idx_automacoes_etapa_id', 'etapa_id'),
        Index('idx_automacoes_funil_id', 'funil_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    gatilho: Mapped[str] = mapped_column(Text, nullable=False)
    acao_config: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    executado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    funil_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    etapa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    dias_parado: Mapped[Optional[int]] = mapped_column(Integer)
    agendamento_data_hora: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    ultima_execucao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='automacoes')
    etapa: Mapped[Optional['FunilEtapas']] = relationship('FunilEtapas', back_populates='automacoes')
    funil: Mapped[Optional['Funis']] = relationship('Funis', back_populates='automacoes')
    automacoes_execucoes: Mapped[list['AutomacoesExecucoes']] = relationship('AutomacoesExecucoes', back_populates='automacao')


class ClienteContatos(Base):
    __tablename__ = 'cliente_contatos'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='CASCADE', name='cliente_contatos_cliente_id_fkey'),
        PrimaryKeyConstraint('id', name='cliente_contatos_pkey'),
        Index('idx_cliente_contatos_cliente_id', 'cliente_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    cliente_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cargo: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telefone: Mapped[Optional[str]] = mapped_column(String(50))
    linkedin: Mapped[Optional[str]] = mapped_column(String(500))
    principal: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    cliente: Mapped['ClientesSst'] = relationship('ClientesSst', back_populates='cliente_contatos')


class ContasPagarAtividades(Base):
    __tablename__ = 'contas_pagar_atividades'
    __table_args__ = (
        ForeignKeyConstraint(['conta_id'], ['public.contas_pagar.id'], ondelete='CASCADE', name='contas_pagar_atividades_conta_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], name='contas_pagar_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_pagar_atividades_pkey'),
        Index('idx_contas_pagar_atividades_conta_id', 'conta_id'),
        Index('idx_contas_pagar_atividades_usuario_id', 'usuario_id'),
        {'comment': 'Atividades relacionadas às contas a pagar', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    conta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'programada'::text"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[str]] = mapped_column(Text)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    conta: Mapped['ContasPagar'] = relationship('ContasPagar', back_populates='contas_pagar_atividades')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='contas_pagar_atividades')
    contas_pagar_atividades_anexos: Mapped[list['ContasPagarAtividadesAnexos']] = relationship('ContasPagarAtividadesAnexos', back_populates='atividade')


class ContasPagarMovimentacoes(Base):
    __tablename__ = 'contas_pagar_movimentacoes'
    __table_args__ = (
        ForeignKeyConstraint(['coluna_destino_id'], ['public.contas_pagar_colunas.id'], name='contas_pagar_movimentacoes_coluna_destino_id_fkey'),
        ForeignKeyConstraint(['coluna_origem_id'], ['public.contas_pagar_colunas.id'], name='contas_pagar_movimentacoes_coluna_origem_id_fkey'),
        ForeignKeyConstraint(['conta_id'], ['public.contas_pagar.id'], ondelete='CASCADE', name='contas_pagar_movimentacoes_conta_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], name='contas_pagar_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_pagar_movimentacoes_pkey'),
        Index('idx_contas_pagar_movimentacoes_coluna_destino_id', 'coluna_destino_id'),
        Index('idx_contas_pagar_movimentacoes_coluna_origem_id', 'coluna_origem_id'),
        Index('idx_contas_pagar_movimentacoes_conta_id', 'conta_id'),
        Index('idx_contas_pagar_movimentacoes_usuario_id', 'usuario_id'),
        {'comment': 'Histórico de movimentações das contas a pagar', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    conta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    coluna_destino: Mapped[Optional['ContasPagarColunas']] = relationship('ContasPagarColunas', foreign_keys=[coluna_destino_id], back_populates='contas_pagar_movimentacoes_coluna_destino')
    coluna_origem: Mapped[Optional['ContasPagarColunas']] = relationship('ContasPagarColunas', foreign_keys=[coluna_origem_id], back_populates='contas_pagar_movimentacoes_coluna_origem')
    conta: Mapped['ContasPagar'] = relationship('ContasPagar', back_populates='contas_pagar_movimentacoes')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='contas_pagar_movimentacoes')


class ContasReceber(Base):
    __tablename__ = 'contas_receber'
    __table_args__ = (
        CheckConstraint("origem = ANY (ARRAY['manual'::text, 'closer'::text, 'pos-venda'::text])", name='contas_receber_origem_check'),
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='contas_receber_cliente_id_fkey'),
        ForeignKeyConstraint(['coluna_id'], ['public.contas_receber_colunas.id'], ondelete='CASCADE', name='contas_receber_coluna_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['public.profiles.id'], name='contas_receber_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='contas_receber_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_receber_pkey'),
        Index('idx_contas_receber_cliente_id', 'cliente_id'),
        Index('idx_contas_receber_coluna', 'coluna_id'),
        Index('idx_contas_receber_created_by', 'created_by'),
        Index('idx_contas_receber_empresa', 'empresa_id'),
        {'comment': 'Contas a receber do módulo financeiro', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    numero: Mapped[str] = mapped_column(Text, nullable=False)
    cliente_nome: Mapped[str] = mapped_column(Text, nullable=False)
    valor: Mapped[decimal.Decimal] = mapped_column(Numeric(15, 2), nullable=False, server_default=text('0'))
    valor_pago: Mapped[decimal.Decimal] = mapped_column(Numeric(15, 2), nullable=False, server_default=text('0'))
    data_emissao: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    arquivado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='Referência ao cliente da tabela clientes_sst')
    cliente_cnpj: Mapped[Optional[str]] = mapped_column(Text)
    servico_produto: Mapped[Optional[str]] = mapped_column(Text)
    data_competencia: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_recebimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_pagamento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    forma_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    forma_pagamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    categoria: Mapped[Optional[str]] = mapped_column(Text)
    conta_financeira: Mapped[Optional[str]] = mapped_column(Text)
    conta_financeira_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    origem: Mapped[Optional[str]] = mapped_column(Text, comment='Origem do recebível: manual, closer, pos-venda')
    closer_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='Referência ao card do Closer que originou este recebível')
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    condicao_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    condicao_pagamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    recorrente: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    nfe_data_programada: Mapped[Optional[datetime.date]] = mapped_column(Date, comment='Data programada para emissão automática da NFe')
    nfe_hora_programada: Mapped[Optional[datetime.time]] = mapped_column(Time, comment='Hora programada para emissão automática da NFe')
    origem_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    origem_kanban: Mapped[Optional[str]] = mapped_column(String(50))
    contato_nome: Mapped[Optional[str]] = mapped_column(Text)
    contato_email: Mapped[Optional[str]] = mapped_column(Text)
    contato_telefone: Mapped[Optional[str]] = mapped_column(Text)
    empresa_nome: Mapped[Optional[str]] = mapped_column(Text)
    empresa_email: Mapped[Optional[str]] = mapped_column(Text)
    empresa_telefone: Mapped[Optional[str]] = mapped_column(Text)
    empresa_endereco: Mapped[Optional[str]] = mapped_column(Text)
    empresa_numero: Mapped[Optional[str]] = mapped_column(Text)
    empresa_complemento: Mapped[Optional[str]] = mapped_column(Text)
    empresa_bairro: Mapped[Optional[str]] = mapped_column(Text)
    empresa_cidade: Mapped[Optional[str]] = mapped_column(Text)
    empresa_estado: Mapped[Optional[str]] = mapped_column(Text)
    empresa_cep: Mapped[Optional[str]] = mapped_column(Text)
    status_recebimento: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'previsto'::character varying"), comment='Status do recebimento: previsto, realizado, vencido')

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='contas_receber')
    coluna: Mapped['ContasReceberColunas'] = relationship('ContasReceberColunas', back_populates='contas_receber')
    profiles: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='contas_receber')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contas_receber')
    contas_receber_atividades: Mapped[list['ContasReceberAtividades']] = relationship('ContasReceberAtividades', back_populates='conta')
    contas_receber_movimentacoes: Mapped[list['ContasReceberMovimentacoes']] = relationship('ContasReceberMovimentacoes', back_populates='conta')


class Contratos(Base):
    __tablename__ = 'contratos'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='contratos_cliente_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='contratos_empresa_id_fkey'),
        ForeignKeyConstraint(['modelo_id'], ['public.modelos_contrato.id'], ondelete='SET NULL', name='contratos_modelo_id_fkey'),
        PrimaryKeyConstraint('id', name='contratos_pkey'),
        Index('idx_contratos_cliente_id', 'cliente_id'),
        Index('idx_contratos_empresa_id', 'empresa_id'),
        Index('idx_contratos_instrutor_id', 'instrutor_id'),
        Index('idx_contratos_modelo_id', 'modelo_id'),
        Index('idx_contratos_parceiro_id', 'parceiro_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    numero: Mapped[str] = mapped_column(String(50), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'cliente'::character varying"))
    modelo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    parceiro_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    instrutor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    razao_social: Mapped[Optional[str]] = mapped_column(String(255))
    cnpj: Mapped[Optional[str]] = mapped_column(String(20))
    telefone: Mapped[Optional[str]] = mapped_column(String(20))
    endereco: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(String(100))
    estado: Mapped[Optional[str]] = mapped_column(String(2))
    cep: Mapped[Optional[str]] = mapped_column(String(10))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    representante_legal: Mapped[Optional[str]] = mapped_column(String(255))
    valor_implantacao: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2), server_default=text('0'))
    valor_mensal: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2), server_default=text('0'))
    valor_avista: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2), server_default=text('0'))
    texto_avista: Mapped[Optional[str]] = mapped_column(String(255))
    valor_3x: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2), server_default=text('0'))
    texto_3x: Mapped[Optional[str]] = mapped_column(String(255))
    valor_leasing: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(10, 2), server_default=text('0'))
    texto_leasing: Mapped[Optional[str]] = mapped_column(String(255))
    forma_pagamento: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'avista'::character varying"))
    meio_pagamento: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'pix'::character varying"))
    observacao_comercial: Mapped[Optional[str]] = mapped_column(Text)
    validade_dias: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('10'))
    foro: Mapped[Optional[str]] = mapped_column(String(255))
    observacoes_adicionais: Mapped[Optional[str]] = mapped_column(Text)
    criado_por: Mapped[Optional[str]] = mapped_column(String(255))
    assinante_nome: Mapped[Optional[str]] = mapped_column(String(255))
    assinante_cpf: Mapped[Optional[str]] = mapped_column(String(14))
    assinado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    data_assinatura: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    status: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'rascunho'::character varying"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='contratos')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='contratos')
    modelo: Mapped[Optional['ModelosContrato']] = relationship('ModelosContrato', back_populates='contratos')
    contrato_clausulas: Mapped[list['ContratoClausulas']] = relationship('ContratoClausulas', back_populates='contrato')
    contrato_modulos: Mapped[list['ContratoModulos']] = relationship('ContratoModulos', back_populates='contrato')


class EquipamentosMovimentacoes(Base):
    __tablename__ = 'equipamentos_movimentacoes'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['demanda'::text, 'separado'::text, 'retirado'::text, 'em_uso'::text, 'devolvido'::text, 'pendente'::text])", name='equipamentos_movimentacoes_status_check'),
        CheckConstraint("tipo = ANY (ARRAY['saida'::text, 'entrada'::text])", name='equipamentos_movimentacoes_tipo_check'),
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='equipamentos_movimentacoes_cliente_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='equipamentos_movimentacoes_empresa_id_fkey'),
        ForeignKeyConstraint(['equipamento_id'], ['public.equipamentos_sst.id'], ondelete='SET NULL', name='equipamentos_movimentacoes_equipamento_id_fkey'),
        ForeignKeyConstraint(['kit_id'], ['public.equipamentos_kits.id'], ondelete='SET NULL', name='equipamentos_movimentacoes_kit_id_fkey'),
        ForeignKeyConstraint(['usuario_recebeu_id'], ['public.profiles.id'], ondelete='SET NULL', name='equipamentos_movimentacoes_usuario_recebeu_id_fkey'),
        ForeignKeyConstraint(['usuario_separou_id'], ['public.profiles.id'], ondelete='SET NULL', name='equipamentos_movimentacoes_usuario_separou_id_fkey'),
        ForeignKeyConstraint(['usuario_utilizou_id'], ['public.profiles.id'], ondelete='SET NULL', name='equipamentos_movimentacoes_usuario_utilizou_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_movimentacoes_pkey'),
        UniqueConstraint('numero_movimentacao', name='equipamentos_movimentacoes_numero_movimentacao_key'),
        Index('idx_equipamentos_movimentacoes_cliente_id', 'cliente_id'),
        Index('idx_equipamentos_movimentacoes_empresa', 'empresa_id'),
        Index('idx_equipamentos_movimentacoes_equipamento_id', 'equipamento_id'),
        Index('idx_equipamentos_movimentacoes_kit_id', 'kit_id'),
        Index('idx_equipamentos_movimentacoes_usuario_recebeu_id', 'usuario_recebeu_id'),
        Index('idx_equipamentos_movimentacoes_usuario_separou_id', 'usuario_separou_id'),
        Index('idx_equipamentos_movimentacoes_usuario_utilizou_id', 'usuario_utilizou_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    kit_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    equipamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    quantidade: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('1'))
    tipo_servico: Mapped[Optional[str]] = mapped_column(Text)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    responsavel_retirada: Mapped[Optional[str]] = mapped_column(Text)
    usuario_separou_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    usuario_utilizou_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    usuario_recebeu_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    data_saida: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    data_retorno: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'demanda'::text"))
    checklist_saida: Mapped[Optional[dict]] = mapped_column(JSONB)
    checklist_entrada: Mapped[Optional[dict]] = mapped_column(JSONB)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    numero_movimentacao: Mapped[Optional[str]] = mapped_column(Text)
    funil_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    equipamentos_lista: Mapped[Optional[dict]] = mapped_column(JSONB)

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='equipamentos_movimentacoes')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='equipamentos_movimentacoes')
    equipamento: Mapped[Optional['EquipamentosSst']] = relationship('EquipamentosSst', back_populates='equipamentos_movimentacoes')
    kit: Mapped[Optional['EquipamentosKits']] = relationship('EquipamentosKits', back_populates='equipamentos_movimentacoes')
    usuario_recebeu: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[usuario_recebeu_id], back_populates='equipamentos_movimentacoes_usuario_recebeu')
    usuario_separou: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[usuario_separou_id], back_populates='equipamentos_movimentacoes_usuario_separou')
    usuario_utilizou: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[usuario_utilizou_id], back_populates='equipamentos_movimentacoes_usuario_utilizou')
    equipamentos_movimentacao_atividades: Mapped[list['EquipamentosMovimentacaoAtividades']] = relationship('EquipamentosMovimentacaoAtividades', back_populates='movimentacao')
    equipamentos_movimentacoes_historico: Mapped[list['EquipamentosMovimentacoesHistorico']] = relationship('EquipamentosMovimentacoesHistorico', back_populates='movimentacao')


class FunilCards(Base):
    __tablename__ = 'funil_cards'
    __table_args__ = (
        CheckConstraint("prioridade::text = ANY (ARRAY['baixa'::character varying, 'media'::character varying, 'alta'::character varying, 'urgente'::character varying]::text[])", name='funil_cards_prioridade_check'),
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='funil_cards_cliente_id_fkey'),
        ForeignKeyConstraint(['etapa_id'], ['public.funil_etapas.id'], ondelete='SET NULL', name='funil_cards_etapa_id_fkey'),
        ForeignKeyConstraint(['funil_id'], ['public.funis.id'], ondelete='CASCADE', name='funil_cards_funil_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.profiles.id'], ondelete='SET NULL', name='funil_cards_responsavel_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_cards_pkey'),
        Index('idx_funil_cards_cliente_id', 'cliente_id'),
        Index('idx_funil_cards_etapa_id', 'etapa_id'),
        Index('idx_funil_cards_funil_id', 'funil_id'),
        Index('idx_funil_cards_responsavel_id', 'responsavel_id'),
        {'comment': 'Cards genéricos para qualquer funil do sistema',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    funil_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    etapa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    data_criacao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    data_previsao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_conclusao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    prioridade: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'media'::character varying"))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    metadata_: Mapped[Optional[dict]] = mapped_column('metadata', JSONB, server_default=text("'{}'::jsonb"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    status_negocio: Mapped[Optional[str]] = mapped_column(String(20), server_default=text('NULL::character varying'), comment='Status do negócio: perdido, em_andamento, aceito, ganho. Usado apenas para funis do tipo negócio.')
    acoes_rapidas_config: Mapped[Optional[dict]] = mapped_column(JSONB)
    orcamento_treinamento: Mapped[Optional[dict]] = mapped_column(JSONB, comment='Dados do orçamento de treinamento normativo. Formato JSON com: empresa, cidadeDestino, estadoOrigem, cidadeOrigem, km, tabelaPrecos, config.')
    orcamento_vertical365: Mapped[Optional[dict]] = mapped_column(JSONB)
    orcamento_servicos_sst: Mapped[Optional[dict]] = mapped_column(JSONB, comment='Dados do orçamento de serviços SST salvos da calculadora')

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='funil_cards')
    etapa: Mapped['FunilEtapas'] = relationship('FunilEtapas', back_populates='funil_cards')
    funil: Mapped['Funis'] = relationship('Funis', back_populates='funil_cards')
    responsavel: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='funil_cards')
    automacoes_execucoes: Mapped[list['AutomacoesExecucoes']] = relationship('AutomacoesExecucoes', back_populates='card')
    frota_utilizacoes: Mapped[list['FrotaUtilizacoes']] = relationship('FrotaUtilizacoes', back_populates='funil_card')
    funil_card_atividades: Mapped[list['FunilCardAtividades']] = relationship('FunilCardAtividades', back_populates='card')
    funil_card_comparacoes: Mapped[list['FunilCardComparacoes']] = relationship('FunilCardComparacoes', back_populates='card')
    funil_card_etiquetas: Mapped[list['FunilCardEtiquetas']] = relationship('FunilCardEtiquetas', back_populates='card')
    funil_card_movimentacoes: Mapped[list['FunilCardMovimentacoes']] = relationship('FunilCardMovimentacoes', back_populates='card')
    funil_card_orcamentos: Mapped[list['FunilCardOrcamentos']] = relationship('FunilCardOrcamentos', back_populates='card')
    funil_card_orcamentos_servicos_sst: Mapped[list['FunilCardOrcamentosServicosSst']] = relationship('FunilCardOrcamentosServicosSst', back_populates='card')
    funil_card_propostas: Mapped[list['FunilCardPropostas']] = relationship('FunilCardPropostas', back_populates='card')
    propostas_comerciais_servicos_sst: Mapped[list['PropostasComerciaisServicosSst']] = relationship('PropostasComerciaisServicosSst', back_populates='card')
    propostas_comerciais_treinamentos: Mapped[list['PropostasComerciaisTreinamentos']] = relationship('PropostasComerciaisTreinamentos', back_populates='card')
    propostas_comerciais_vertical365: Mapped[list['PropostasComerciaisVertical365']] = relationship('PropostasComerciaisVertical365', back_populates='card')


class PosVendaCards(Base):
    __tablename__ = 'pos_venda_cards'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='pos_venda_cards_cliente_id_fkey'),
        ForeignKeyConstraint(['coluna_id'], ['public.pos_venda_colunas.id'], ondelete='CASCADE', name='pos_venda_cards_coluna_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['public.profiles.id'], ondelete='SET NULL', name='pos_venda_cards_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='pos_venda_cards_empresa_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.profiles.id'], ondelete='SET NULL', name='pos_venda_cards_responsavel_id_fkey'),
        PrimaryKeyConstraint('id', name='pos_venda_cards_pkey'),
        Index('idx_pos_venda_cards_cliente_id', 'cliente_id'),
        Index('idx_pos_venda_cards_coluna', 'coluna_id'),
        Index('idx_pos_venda_cards_created_by', 'created_by'),
        Index('idx_pos_venda_cards_empresa', 'empresa_id'),
        Index('idx_pos_venda_cards_responsavel_id', 'responsavel_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    coluna_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    valor: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2), server_default=text('0'))
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_nome: Mapped[Optional[str]] = mapped_column(String(255))
    cliente_email: Mapped[Optional[str]] = mapped_column(String(255))
    cliente_telefone: Mapped[Optional[str]] = mapped_column(String(50))
    cliente_empresa: Mapped[Optional[str]] = mapped_column(String(255))
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_servico: Mapped[Optional[str]] = mapped_column(String(100))
    data_venda: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_implementacao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_followup: Mapped[Optional[datetime.date]] = mapped_column(Date)
    status_satisfacao: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'pendente'::character varying"))
    nota_nps: Mapped[Optional[int]] = mapped_column(Integer)
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    arquivado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    forma_pagamento: Mapped[Optional[str]] = mapped_column(String(20))
    valor_a_vista: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2))
    valor_3x: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2))
    valor_leasing: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(15, 2))
    temperatura: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'morno'::character varying"))
    origem: Mapped[Optional[str]] = mapped_column(String(100))
    dados_orcamento: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_custo_mensal: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_comparacao: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_proposta: Mapped[Optional[dict]] = mapped_column(JSONB)
    contatos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    closer_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    origem_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    origem_kanban: Mapped[Optional[str]] = mapped_column(String(50))

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='pos_venda_cards')
    coluna: Mapped['PosVendaColunas'] = relationship('PosVendaColunas', back_populates='pos_venda_cards')
    profiles: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[created_by], back_populates='pos_venda_cards_created_by')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='pos_venda_cards')
    responsavel: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[responsavel_id], back_populates='pos_venda_cards_responsavel')
    pos_venda_atividades: Mapped[list['PosVendaAtividades']] = relationship('PosVendaAtividades', back_populates='card')
    pos_venda_card_etiquetas: Mapped[list['PosVendaCardEtiquetas']] = relationship('PosVendaCardEtiquetas', back_populates='card')
    pos_venda_card_movimentacoes: Mapped[list['PosVendaCardMovimentacoes']] = relationship('PosVendaCardMovimentacoes', back_populates='card')


class ProfissionaisSaude(Base):
    __tablename__ = 'profissionais_saude'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='profissionais_saude_cliente_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='profissionais_saude_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='profissionais_saude_pkey'),
        Index('idx_profissionais_saude_cliente_id', 'cliente_id'),
        Index('idx_profissionais_saude_empresa_id', 'empresa_id'),
        {'comment': 'Cadastro de profissionais de saúde da empresa', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    especialidade: Mapped[str] = mapped_column(String(100), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[Optional[str]] = mapped_column(String(11))
    conselho: Mapped[Optional[str]] = mapped_column(String(50))
    nr_conselho: Mapped[Optional[str]] = mapped_column(String(50))
    uf_conselho: Mapped[Optional[str]] = mapped_column(String(2))
    certificado_digital_url: Mapped[Optional[str]] = mapped_column(Text)
    senha_certificado: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    rubrica_url: Mapped[Optional[str]] = mapped_column(Text)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='profissionais_saude')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='profissionais_saude')
    unidades_clientes: Mapped[list['UnidadesClientes']] = relationship('UnidadesClientes', back_populates='medico_pcmso')


class ProfissionaisSeguranca(Base):
    __tablename__ = 'profissionais_seguranca'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='profissionais_seguranca_cliente_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='profissionais_seguranca_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='profissionais_seguranca_pkey'),
        Index('idx_profissionais_seguranca_cliente_id', 'cliente_id'),
        Index('idx_profissionais_seguranca_empresa_id', 'empresa_id'),
        {'comment': 'Cadastro de profissionais de segurança da empresa',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    especialidade: Mapped[str] = mapped_column(String(100), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[Optional[str]] = mapped_column(String(11))
    conselho: Mapped[Optional[str]] = mapped_column(String(50))
    nr_conselho: Mapped[Optional[str]] = mapped_column(String(50))
    uf_conselho: Mapped[Optional[str]] = mapped_column(String(2))
    certificado_digital_url: Mapped[Optional[str]] = mapped_column(Text)
    senha_certificado: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='profissionais_seguranca')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='profissionais_seguranca')
    unidades_clientes: Mapped[list['UnidadesClientes']] = relationship('UnidadesClientes', back_populates='tecnico_responsavel')


class SinistroFotos(Base):
    __tablename__ = 'sinistro_fotos'
    __table_args__ = (
        ForeignKeyConstraint(['sinistro_id'], ['public.sinistros_colaborador.id'], ondelete='CASCADE', name='sinistro_fotos_sinistro_id_fkey'),
        PrimaryKeyConstraint('id', name='sinistro_fotos_pkey'),
        Index('idx_sinistro_fotos_sinistro', 'sinistro_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    sinistro_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    foto_url: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    data_captura: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    ordem: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    sinistro: Mapped['SinistrosColaborador'] = relationship('SinistrosColaborador', back_populates='sinistro_fotos')


class AgendaCompartilhamentos(Base):
    __tablename__ = 'agenda_compartilhamentos'
    __table_args__ = (
        ForeignKeyConstraint(['compartilhado_com'], ['public.profiles.id'], ondelete='CASCADE', name='agenda_compartilhamentos_compartilhado_com_fkey'),
        ForeignKeyConstraint(['compartilhado_por'], ['public.profiles.id'], ondelete='CASCADE', name='agenda_compartilhamentos_compartilhado_por_fkey'),
        ForeignKeyConstraint(['evento_id'], ['public.agenda_eventos.id'], ondelete='CASCADE', name='agenda_compartilhamentos_evento_id_fkey'),
        PrimaryKeyConstraint('id', name='agenda_compartilhamentos_pkey'),
        UniqueConstraint('evento_id', 'compartilhado_com', name='agenda_compartilhamentos_evento_id_compartilhado_com_key'),
        Index('idx_agenda_compartilhamentos_evento', 'evento_id'),
        Index('idx_agenda_compartilhamentos_usuario', 'compartilhado_com'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    evento_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    compartilhado_com: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    compartilhado_por: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    pode_editar: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    profiles: Mapped['Profiles'] = relationship('Profiles', foreign_keys=[compartilhado_com], back_populates='agenda_compartilhamentos_compartilhado_com')
    profiles_: Mapped['Profiles'] = relationship('Profiles', foreign_keys=[compartilhado_por], back_populates='agenda_compartilhamentos_compartilhado_por')
    evento: Mapped['AgendaEventos'] = relationship('AgendaEventos', back_populates='agenda_compartilhamentos')


class AutomacoesExecucoes(Base):
    __tablename__ = 'automacoes_execucoes'
    __table_args__ = (
        ForeignKeyConstraint(['automacao_id'], ['public.automacoes.id'], ondelete='CASCADE', name='automacoes_execucoes_automacao_id_fkey'),
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='automacoes_execucoes_card_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='automacoes_execucoes_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='automacoes_execucoes_pkey'),
        UniqueConstraint('automacao_id', 'card_id', name='automacoes_execucoes_automacao_card_unique'),
        Index('idx_automacoes_execucoes_pendentes', 'executar_em', postgresql_where='(executado = false)'),
        Index('idx_automacoes_execucoes_unique', 'automacao_id', 'card_id', postgresql_where='(executado = false)', unique=True),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    automacao_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    executar_em: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    executado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    executado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    erro: Mapped[Optional[str]] = mapped_column(Text)

    automacao: Mapped['Automacoes'] = relationship('Automacoes', back_populates='automacoes_execucoes')
    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='automacoes_execucoes')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='automacoes_execucoes')


class ContasPagarAtividadesAnexos(Base):
    __tablename__ = 'contas_pagar_atividades_anexos'
    __table_args__ = (
        ForeignKeyConstraint(['atividade_id'], ['public.contas_pagar_atividades.id'], ondelete='CASCADE', name='contas_pagar_atividades_anexos_atividade_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_pagar_atividades_anexos_pkey'),
        Index('idx_atividades_anexos_atividade', 'atividade_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    atividade_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_arquivo: Mapped[Optional[str]] = mapped_column(String(100))
    tamanho: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    atividade: Mapped['ContasPagarAtividades'] = relationship('ContasPagarAtividades', back_populates='contas_pagar_atividades_anexos')


class ContasReceberAtividades(Base):
    __tablename__ = 'contas_receber_atividades'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['programada'::text, 'pendente'::text, 'concluida'::text])", name='contas_receber_atividades_status_check'),
        ForeignKeyConstraint(['conta_id'], ['public.contas_receber.id'], ondelete='CASCADE', name='contas_receber_atividades_conta_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], name='contas_receber_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_receber_atividades_pkey'),
        Index('idx_contas_receber_atividades_conta', 'conta_id'),
        Index('idx_contas_receber_atividades_usuario', 'usuario_id'),
        {'comment': 'Atividades registradas nas contas a receber', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    conta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'nota'::text"), comment='Tipo da atividade: tarefa, email, ligacao, whatsapp, reuniao, visita, nota')
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'concluida'::text"), comment='Status da atividade: programada, pendente, concluida')
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[str]] = mapped_column(Text)

    conta: Mapped['ContasReceber'] = relationship('ContasReceber', back_populates='contas_receber_atividades')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='contas_receber_atividades')


class ContasReceberMovimentacoes(Base):
    __tablename__ = 'contas_receber_movimentacoes'
    __table_args__ = (
        CheckConstraint("tipo = ANY (ARRAY['criacao'::text, 'mudanca_coluna'::text, 'edicao'::text, 'pagamento'::text])", name='contas_receber_movimentacoes_tipo_check'),
        ForeignKeyConstraint(['coluna_destino_id'], ['public.contas_receber_colunas.id'], name='contas_receber_movimentacoes_coluna_destino_id_fkey'),
        ForeignKeyConstraint(['coluna_origem_id'], ['public.contas_receber_colunas.id'], name='contas_receber_movimentacoes_coluna_origem_id_fkey'),
        ForeignKeyConstraint(['conta_id'], ['public.contas_receber.id'], ondelete='CASCADE', name='contas_receber_movimentacoes_conta_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], name='contas_receber_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='contas_receber_movimentacoes_pkey'),
        Index('idx_contas_receber_movimentacoes_coluna_destino_id', 'coluna_destino_id'),
        Index('idx_contas_receber_movimentacoes_coluna_origem_id', 'coluna_origem_id'),
        Index('idx_contas_receber_movimentacoes_conta', 'conta_id'),
        Index('idx_contas_receber_movimentacoes_usuario', 'usuario_id'),
        {'comment': 'Histórico de movimentações das contas a receber',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    conta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'mudanca_coluna'::text"), comment='Tipo da movimentação: criacao, mudanca_coluna, edicao, pagamento')
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)

    coluna_destino: Mapped[Optional['ContasReceberColunas']] = relationship('ContasReceberColunas', foreign_keys=[coluna_destino_id], back_populates='contas_receber_movimentacoes_coluna_destino')
    coluna_origem: Mapped[Optional['ContasReceberColunas']] = relationship('ContasReceberColunas', foreign_keys=[coluna_origem_id], back_populates='contas_receber_movimentacoes_coluna_origem')
    conta: Mapped['ContasReceber'] = relationship('ContasReceber', back_populates='contas_receber_movimentacoes')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='contas_receber_movimentacoes')


class ContratoClausulas(Base):
    __tablename__ = 'contrato_clausulas'
    __table_args__ = (
        ForeignKeyConstraint(['contrato_id'], ['public.contratos.id'], ondelete='CASCADE', name='contrato_clausulas_contrato_id_fkey'),
        PrimaryKeyConstraint('id', name='contrato_clausulas_pkey'),
        Index('idx_contrato_clausulas_contrato_id', 'contrato_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    contrato_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    contrato: Mapped['Contratos'] = relationship('Contratos', back_populates='contrato_clausulas')


class ContratoModulos(Base):
    __tablename__ = 'contrato_modulos'
    __table_args__ = (
        ForeignKeyConstraint(['contrato_id'], ['public.contratos.id'], ondelete='CASCADE', name='contrato_modulos_contrato_id_fkey'),
        PrimaryKeyConstraint('id', name='contrato_modulos_pkey'),
        Index('idx_contrato_modulos_contrato_id', 'contrato_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    contrato_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    versao: Mapped[Optional[str]] = mapped_column(String(50))
    tipo_cliente: Mapped[Optional[str]] = mapped_column(String(50), server_default=text("'Cliente direto'::character varying"))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    itens: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    contrato: Mapped['Contratos'] = relationship('Contratos', back_populates='contrato_modulos')


class EquipamentosMovimentacaoAtividades(Base):
    __tablename__ = 'equipamentos_movimentacao_atividades'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['pendente'::text, 'concluida'::text])", name='equipamentos_movimentacao_atividades_status_check'),
        CheckConstraint("tipo = ANY (ARRAY['tarefa'::text, 'checklist'::text])", name='equipamentos_movimentacao_atividades_tipo_check'),
        ForeignKeyConstraint(['membro_id'], ['public.profiles.id'], ondelete='SET NULL', name='equipamentos_movimentacao_atividades_membro_id_fkey'),
        ForeignKeyConstraint(['movimentacao_id'], ['public.equipamentos_movimentacoes.id'], ondelete='CASCADE', name='equipamentos_movimentacao_atividades_movimentacao_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_movimentacao_atividades_pkey'),
        Index('idx_equipamentos_movimentacao_atividades_membro_id', 'membro_id'),
        Index('idx_equipamentos_movimentacao_atividades_movimentacao_id', 'movimentacao_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    movimentacao_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    itens_checklist: Mapped[Optional[dict]] = mapped_column(JSONB)
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[datetime.time]] = mapped_column(Time)
    membro_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    membro_nome: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'pendente'::text"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    membro: Mapped[Optional['Profiles']] = relationship('Profiles', back_populates='equipamentos_movimentacao_atividades')
    movimentacao: Mapped['EquipamentosMovimentacoes'] = relationship('EquipamentosMovimentacoes', back_populates='equipamentos_movimentacao_atividades')


class EquipamentosMovimentacoesHistorico(Base):
    __tablename__ = 'equipamentos_movimentacoes_historico'
    __table_args__ = (
        ForeignKeyConstraint(['movimentacao_id'], ['public.equipamentos_movimentacoes.id'], ondelete='CASCADE', name='equipamentos_movimentacoes_historico_movimentacao_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], name='equipamentos_movimentacoes_historico_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='equipamentos_movimentacoes_historico_pkey'),
        Index('idx_equipamentos_movimentacoes_historico_movimentacao_id', 'movimentacao_id'),
        Index('idx_equipamentos_movimentacoes_historico_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    movimentacao_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    funil_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    funil_nome: Mapped[Optional[str]] = mapped_column(Text)
    card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    card_titulo: Mapped[Optional[str]] = mapped_column(Text)
    status_anterior: Mapped[Optional[str]] = mapped_column(Text)
    status_novo: Mapped[Optional[str]] = mapped_column(Text)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    usuario_nome: Mapped[Optional[str]] = mapped_column(Text)
    dados_adicionais: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    movimentacao: Mapped['EquipamentosMovimentacoes'] = relationship('EquipamentosMovimentacoes', back_populates='equipamentos_movimentacoes_historico')


class FrotaUtilizacoes(Base):
    __tablename__ = 'frota_utilizacoes'
    __table_args__ = (
        ForeignKeyConstraint(['created_by'], ['users.id'], name='frota_utilizacoes_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='frota_utilizacoes_empresa_id_fkey'),
        ForeignKeyConstraint(['funil_card_id'], ['public.funil_cards.id'], ondelete='SET NULL', name='frota_utilizacoes_funil_card_id_fkey'),
        ForeignKeyConstraint(['veiculo_id'], ['public.frota_veiculos.id'], ondelete='CASCADE', name='frota_utilizacoes_veiculo_id_fkey'),
        PrimaryKeyConstraint('id', name='frota_utilizacoes_pkey'),
        Index('idx_frota_utilizacoes_created_by', 'created_by'),
        Index('idx_frota_utilizacoes_empresa_id', 'empresa_id'),
        Index('idx_frota_utilizacoes_funil_card_id', 'funil_card_id'),
        Index('idx_frota_utilizacoes_veiculo', 'veiculo_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    veiculo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    km_inicio: Mapped[int] = mapped_column(Integer, nullable=False)
    local_utilizacao: Mapped[Optional[str]] = mapped_column(String(255))
    motorista: Mapped[Optional[str]] = mapped_column(String(255))
    km_fim: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    km_rodado: Mapped[Optional[int]] = mapped_column(Integer, Computed('(km_fim - km_inicio)', persisted=True))
    finalidade: Mapped[Optional[str]] = mapped_column(String(255))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    codigo: Mapped[Optional[str]] = mapped_column(String(20))
    data_saida: Mapped[Optional[datetime.date]] = mapped_column(Date)
    hora_saida: Mapped[Optional[datetime.time]] = mapped_column(Time)
    previsao_retorno: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    data_retorno: Mapped[Optional[datetime.date]] = mapped_column(Date)
    hora_retorno: Mapped[Optional[datetime.time]] = mapped_column(Time)
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'Em uso'::character varying"))
    km_rodados: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'), comment='Quilômetros rodados durante a utilização')
    funil_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='ID do card de funil vinculado a esta utilização de veículo')
    numero_movimentacao: Mapped[Optional[str]] = mapped_column(String(20))

    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='frota_utilizacoes')
    funil_card: Mapped[Optional['FunilCards']] = relationship('FunilCards', back_populates='frota_utilizacoes')
    veiculo: Mapped['FrotaVeiculos'] = relationship('FrotaVeiculos', back_populates='frota_utilizacoes')


class FunilCardAtividades(Base):
    __tablename__ = 'funil_card_atividades'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_atividades_card_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['users.id'], name='funil_card_atividades_responsavel_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], name='funil_card_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_atividades_pkey'),
        Index('idx_funil_card_atividades_card_id', 'card_id'),
        Index('idx_funil_card_atividades_responsavel_id', 'responsavel_id'),
        Index('idx_funil_card_atividades_status', 'status'),
        Index('idx_funil_card_atividades_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'tarefa'::character varying"))
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'a_realizar'::character varying"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[str]] = mapped_column(String(10))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    proposta_aprovada: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    anexo_url: Mapped[Optional[str]] = mapped_column(Text, comment='URL do anexo armazenado no storage')
    anexo_nome: Mapped[Optional[str]] = mapped_column(Text, comment='Nome original do arquivo anexado')

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_atividades')


class FunilCardComparacoes(Base):
    __tablename__ = 'funil_card_comparacoes'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_comparacoes_card_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='funil_card_comparacoes_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funil_card_comparacoes_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_comparacoes_pkey'),
        Index('idx_funil_card_comparacoes_card_id', 'card_id'),
        Index('idx_funil_card_comparacoes_created_by', 'created_by'),
        Index('idx_funil_card_comparacoes_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    valor_campo_numerico: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    label_treinamentos_inclusos: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor do Treinamento por turma'::text"))
    label_sistema_gestao_anual: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Quantidade de turma'::text"))
    label_implantacao: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor total das turmas de treinamento'::text"))
    label_total_anual: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Sistema de Gestão de Treinamentos anual'::text"))
    label_valor_mensal: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Implantação do sistema'::text"))
    label_campo_numerico: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Total Anual'::text"))
    label_campo_valor: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor Mensal'::text"))
    campo1_treinamento: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    campo2_turmas: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    campo4_sistema_gestao: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    campo5_implantacao: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    label_valor_medio: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor médio de treinamento com C.H 8 horas por turma'::text"))
    label_quantidade_turmas: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Quantidade de turmas'::text"))
    label_valor_total_turmas: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor total das turmas de treinamento'::text"))
    label_sistema_gestao_mensal: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Sistema de Gestão de Treinamentos (Mensal)'::text"))
    label_sistema_gestao_anual_avulso: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor total do sistema de gestão em 1 ano'::text"))
    label_implantacao_avulso: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Impantação do Sistema (Valor único)'::text"))
    label_valor_total_investido: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Valor total investido durante o ano, de acordo com a necessidade do cliente'::text"))
    label_pontos_fortes: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Pontos fortes do Vertical 365'::text"))
    texto_pontos_fortes: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    label_pontos_desejar: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'Pontos a desejar do método convencional'::text"))
    texto_pontos_desejar: Mapped[Optional[str]] = mapped_column(Text, server_default=text("''::text"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_comparacoes')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funil_card_comparacoes')


class FunilCardEtiquetas(Base):
    __tablename__ = 'funil_card_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_etiquetas_card_id_fkey'),
        ForeignKeyConstraint(['etiqueta_id'], ['public.funil_etiquetas.id'], ondelete='CASCADE', name='funil_card_etiquetas_etiqueta_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_etiquetas_pkey'),
        UniqueConstraint('card_id', 'etiqueta_id', name='funil_card_etiquetas_card_id_etiqueta_id_key'),
        Index('idx_funil_card_etiquetas_card_id', 'card_id'),
        Index('idx_funil_card_etiquetas_etiqueta_id', 'etiqueta_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    etiqueta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_etiquetas')
    etiqueta: Mapped['FunilEtiquetas'] = relationship('FunilEtiquetas', back_populates='funil_card_etiquetas')


class FunilCardMovimentacoes(Base):
    __tablename__ = 'funil_card_movimentacoes'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_movimentacoes_card_id_fkey'),
        ForeignKeyConstraint(['etapa_destino_id'], ['public.funil_etapas.id'], ondelete='SET NULL', name='funil_card_movimentacoes_etapa_destino_id_fkey'),
        ForeignKeyConstraint(['etapa_origem_id'], ['public.funil_etapas.id'], ondelete='SET NULL', name='funil_card_movimentacoes_etapa_origem_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], name='funil_card_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_movimentacoes_pkey'),
        Index('idx_funil_card_movimentacoes_card_id', 'card_id'),
        Index('idx_funil_card_movimentacoes_etapa_destino_id', 'etapa_destino_id'),
        Index('idx_funil_card_movimentacoes_etapa_origem_id', 'etapa_origem_id'),
        Index('idx_funil_card_movimentacoes_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'mudanca_etapa'::character varying"))
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    etapa_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    etapa_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    kanban_origem: Mapped[Optional[str]] = mapped_column(String(100))
    kanban_destino: Mapped[Optional[str]] = mapped_column(String(100))
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_movimentacoes')
    etapa_destino: Mapped[Optional['FunilEtapas']] = relationship('FunilEtapas', foreign_keys=[etapa_destino_id], back_populates='funil_card_movimentacoes_etapa_destino')
    etapa_origem: Mapped[Optional['FunilEtapas']] = relationship('FunilEtapas', foreign_keys=[etapa_origem_id], back_populates='funil_card_movimentacoes_etapa_origem')


class FunilCardOrcamentos(Base):
    __tablename__ = 'funil_card_orcamentos'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_orcamentos_card_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='funil_card_orcamentos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funil_card_orcamentos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_orcamentos_pkey'),
        Index('idx_funil_card_orcamentos_card_id', 'card_id'),
        Index('idx_funil_card_orcamentos_created_by', 'created_by'),
        Index('idx_funil_card_orcamentos_empresa_id', 'empresa_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    cliente_nome: Mapped[Optional[str]] = mapped_column(Text)
    cidade_destino: Mapped[Optional[str]] = mapped_column(Text)
    estado_destino: Mapped[Optional[str]] = mapped_column(Text)
    km: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric, server_default=text('0'))
    itens_ouro: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    itens_prata: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    itens_bronze: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    total_ouro: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric, server_default=text('0'))
    total_prata: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric, server_default=text('0'))
    total_bronze: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric, server_default=text('0'))
    config: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_orcamentos')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funil_card_orcamentos')


class FunilCardOrcamentosServicosSst(Base):
    __tablename__ = 'funil_card_orcamentos_servicos_sst'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_orcamentos_servicos_sst_card_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='funil_card_orcamentos_servicos_sst_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funil_card_orcamentos_servicos_sst_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_orcamentos_servicos_sst_pkey'),
        Index('idx_funil_card_orcamentos_sst_card_id', 'card_id'),
        Index('idx_funil_card_orcamentos_sst_empresa_id', 'empresa_id'),
        {'comment': 'Orçamentos de Serviços SST por card do funil', 'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    itens: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    encargos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    precificacao: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    totais: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_orcamentos_servicos_sst')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funil_card_orcamentos_servicos_sst')


class FunilCardPropostas(Base):
    __tablename__ = 'funil_card_propostas'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_propostas_card_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='funil_card_propostas_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='funil_card_propostas_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_propostas_pkey'),
        Index('idx_funil_card_propostas_card_id', 'card_id'),
        Index('idx_funil_card_propostas_empresa_id', 'empresa_id'),
        {'comment': 'Propostas comerciais isoladas por card do funil',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, comment='Card do funil ao qual esta proposta pertence (isolamento)')
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    blocos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), comment='Array JSON com os blocos da proposta (hero, precos, texto, etc)')
    header: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    global_styles: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    orcamento_vinculado_tipo: Mapped[Optional[str]] = mapped_column(Text, comment='Tipo do orçamento vinculado: treinamento, servicos-sst, vertical365, comparacao')
    orcamento_vinculado_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)

    card: Mapped['FunilCards'] = relationship('FunilCards', back_populates='funil_card_propostas')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='funil_card_propostas')


class PosVendaAtividades(Base):
    __tablename__ = 'pos_venda_atividades'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.pos_venda_cards.id'], ondelete='CASCADE', name='pos_venda_atividades_card_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.profiles.id'], ondelete='SET NULL', name='pos_venda_atividades_responsavel_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['public.profiles.id'], ondelete='SET NULL', name='pos_venda_atividades_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='pos_venda_atividades_pkey'),
        Index('idx_pos_venda_atividades_card', 'card_id'),
        Index('idx_pos_venda_atividades_responsavel_id', 'responsavel_id'),
        Index('idx_pos_venda_atividades_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    prazo: Mapped[Optional[datetime.date]] = mapped_column(Date)
    horario: Mapped[Optional[str]] = mapped_column(String(10))
    anexos: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    checklist_items: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    membros_ids: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(Uuid()), server_default=text("'{}'::uuid[]"))
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'a_realizar'::character varying"))
    data_conclusao: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    card: Mapped['PosVendaCards'] = relationship('PosVendaCards', back_populates='pos_venda_atividades')
    responsavel: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[responsavel_id], back_populates='pos_venda_atividades_responsavel')
    usuario: Mapped[Optional['Profiles']] = relationship('Profiles', foreign_keys=[usuario_id], back_populates='pos_venda_atividades_usuario')


class PosVendaCardEtiquetas(Base):
    __tablename__ = 'pos_venda_card_etiquetas'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.pos_venda_cards.id'], ondelete='CASCADE', name='pos_venda_card_etiquetas_card_id_fkey'),
        ForeignKeyConstraint(['etiqueta_id'], ['public.pos_venda_etiquetas.id'], ondelete='CASCADE', name='pos_venda_card_etiquetas_etiqueta_id_fkey'),
        PrimaryKeyConstraint('id', name='pos_venda_card_etiquetas_pkey'),
        UniqueConstraint('card_id', 'etiqueta_id', name='pos_venda_card_etiquetas_card_id_etiqueta_id_key'),
        Index('idx_pos_venda_card_etiquetas_etiqueta_id', 'etiqueta_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    etiqueta_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    card: Mapped['PosVendaCards'] = relationship('PosVendaCards', back_populates='pos_venda_card_etiquetas')
    etiqueta: Mapped['PosVendaEtiquetas'] = relationship('PosVendaEtiquetas', back_populates='pos_venda_card_etiquetas')


class PosVendaCardMovimentacoes(Base):
    __tablename__ = 'pos_venda_card_movimentacoes'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.pos_venda_cards.id'], ondelete='CASCADE', name='pos_venda_card_movimentacoes_card_id_fkey'),
        ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='SET NULL', name='pos_venda_card_movimentacoes_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='pos_venda_card_movimentacoes_pkey'),
        Index('idx_pos_venda_card_movimentacoes_card_id', 'card_id'),
        Index('idx_pos_venda_card_movimentacoes_usuario_id', 'usuario_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'mudanca_coluna'::character varying"))
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_origem_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    coluna_destino_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    kanban_origem: Mapped[Optional[str]] = mapped_column(String(100))
    kanban_destino: Mapped[Optional[str]] = mapped_column(String(100))
    dados_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    dados_novos: Mapped[Optional[dict]] = mapped_column(JSONB)

    card: Mapped['PosVendaCards'] = relationship('PosVendaCards', back_populates='pos_venda_card_movimentacoes')


class PropostasComerciaisServicosSst(Base):
    __tablename__ = 'propostas_comerciais_servicos_sst'
    __table_args__ = (
        CheckConstraint("modo_exibicao_valores = ANY (ARRAY['custo_total'::text, 'hora_tecnica'::text, 'colaborador'::text, 'cargos_risco'::text, 'pacotes'::text])", name='propostas_comerciais_servicos_sst_modo_exibicao_valores_check'),
        CheckConstraint("status = ANY (ARRAY['aguardando'::text, 'aprovada'::text, 'rejeitada'::text])", name='propostas_comerciais_servicos_sst_status_check'),
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='SET NULL', name='propostas_comerciais_servicos_sst_card_id_fkey'),
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='propostas_comerciais_servicos_sst_cliente_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL', name='propostas_comerciais_servicos_sst_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='propostas_comerciais_servicos_sst_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='propostas_comerciais_servicos_sst_pkey'),
        Index('idx_propostas_servicos_sst_card_id', 'card_id'),
        Index('idx_propostas_servicos_sst_cliente_id', 'cliente_id'),
        Index('idx_propostas_servicos_sst_empresa_id', 'empresa_id'),
        Index('idx_propostas_servicos_sst_identificador', 'identificador'),
        Index('idx_propostas_servicos_sst_status', 'status'),
        {'comment': 'Propostas comerciais de serviços SST geradas pelo editor de '
                'propostas',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    identificador: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'aguardando'::text"))
    card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    cliente_empresa: Mapped[Optional[str]] = mapped_column(Text)
    cliente_razao_social: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cnpj: Mapped[Optional[str]] = mapped_column(Text)
    cliente_contato: Mapped[Optional[str]] = mapped_column(Text)
    cliente_email: Mapped[Optional[str]] = mapped_column(Text)
    cliente_telefone: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cidade: Mapped[Optional[str]] = mapped_column(Text)
    data_proposta: Mapped[Optional[datetime.date]] = mapped_column(Date)
    validade_dias: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('10'))
    modo_exibicao_valores: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'custo_total'::text"), comment='Modo de exibição dos valores: custo_total, hora_tecnica, colaborador, cargos_risco, pacotes')
    titulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_servicos: Mapped[Optional[str]] = mapped_column(Text)
    titulo_dores: Mapped[Optional[str]] = mapped_column(Text)
    titulo_solucoes: Mapped[Optional[str]] = mapped_column(Text)
    titulo_diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    titulo_investimento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_infos: Mapped[Optional[str]] = mapped_column(Text)
    titulo_passos: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    servicos: Mapped[Optional[str]] = mapped_column(Text)
    publico: Mapped[Optional[str]] = mapped_column(Text)
    dores: Mapped[Optional[str]] = mapped_column(Text)
    solucoes: Mapped[Optional[str]] = mapped_column(Text)
    diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    pagamento: Mapped[Optional[str]] = mapped_column(Text)
    infos: Mapped[Optional[str]] = mapped_column(Text)
    passos: Mapped[Optional[str]] = mapped_column(Text)
    dados_orcamento: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), comment='Dados completos do orçamento da calculadora de serviços SST')
    valor_total: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_orcamento: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'servicos_sst'::text"), comment='Tipo do orçamento: treinamento_normativo, servicos_sst, vertical365')
    cliente_endereco: Mapped[Optional[str]] = mapped_column(Text)
    cliente_bairro: Mapped[Optional[str]] = mapped_column(Text)
    cliente_uf: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cep: Mapped[Optional[str]] = mapped_column(Text)
    cliente_distancia: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)

    card: Mapped[Optional['FunilCards']] = relationship('FunilCards', back_populates='propostas_comerciais_servicos_sst')
    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='propostas_comerciais_servicos_sst')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='propostas_comerciais_servicos_sst')


class PropostasComerciaisTreinamentos(Base):
    __tablename__ = 'propostas_comerciais_treinamentos'
    __table_args__ = (
        CheckConstraint("status = ANY (ARRAY['aguardando'::text, 'aprovada'::text, 'rejeitada'::text])", name='propostas_comerciais_treinamentos_status_check'),
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='SET NULL', name='propostas_comerciais_treinamentos_card_id_fkey'),
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='SET NULL', name='propostas_comerciais_treinamentos_cliente_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='propostas_comerciais_treinamentos_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='propostas_comerciais_treinamentos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='propostas_comerciais_treinamentos_pkey'),
        Index('idx_propostas_comerciais_treinamentos_card', 'card_id'),
        Index('idx_propostas_comerciais_treinamentos_cliente', 'cliente_id'),
        Index('idx_propostas_comerciais_treinamentos_empresa', 'empresa_id'),
        Index('idx_propostas_comerciais_treinamentos_identificador', 'identificador'),
        Index('idx_propostas_comerciais_treinamentos_status', 'status'),
        {'comment': 'Propostas comerciais de treinamentos NR geradas pelo editor de '
                'propostas',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    identificador: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'aguardando'::text"))
    card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    cliente_empresa: Mapped[Optional[str]] = mapped_column(Text)
    cliente_razao_social: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cnpj: Mapped[Optional[str]] = mapped_column(Text)
    cliente_contato: Mapped[Optional[str]] = mapped_column(Text)
    cliente_email: Mapped[Optional[str]] = mapped_column(Text)
    cliente_telefone: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cidade: Mapped[Optional[str]] = mapped_column(Text)
    cliente_distancia: Mapped[Optional[int]] = mapped_column(Integer)
    data_proposta: Mapped[Optional[datetime.date]] = mapped_column(Date)
    validade_dias: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('10'))
    titulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_modulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_dores: Mapped[Optional[str]] = mapped_column(Text)
    titulo_solucoes: Mapped[Optional[str]] = mapped_column(Text)
    titulo_diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    titulo_investimento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_infos: Mapped[Optional[str]] = mapped_column(Text)
    titulo_passos: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    publico: Mapped[Optional[str]] = mapped_column(Text)
    dores: Mapped[Optional[str]] = mapped_column(Text)
    solucoes: Mapped[Optional[str]] = mapped_column(Text)
    diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    pagamento: Mapped[Optional[str]] = mapped_column(Text)
    infos: Mapped[Optional[str]] = mapped_column(Text)
    passos: Mapped[Optional[str]] = mapped_column(Text)
    planos_selecionados: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    dados_calculadora: Mapped[Optional[dict]] = mapped_column(JSONB)
    valor_total: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric(12, 2))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_orcamento: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'treinamento_normativo'::text"), comment='Tipo do orçamento: treinamento_normativo, servicos_sst, vertical365')
    modelo_nome: Mapped[Optional[str]] = mapped_column(Text)
    cliente_endereco: Mapped[Optional[str]] = mapped_column(Text)
    cliente_bairro: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cep: Mapped[Optional[str]] = mapped_column(Text)
    cliente_uf: Mapped[Optional[str]] = mapped_column(Text)
    empresa_endereco: Mapped[Optional[str]] = mapped_column(Text)
    empresa_bairro: Mapped[Optional[str]] = mapped_column(Text)
    empresa_cidade: Mapped[Optional[str]] = mapped_column(Text)
    empresa_cep: Mapped[Optional[str]] = mapped_column(Text)
    empresa_uf: Mapped[Optional[str]] = mapped_column(Text)

    card: Mapped[Optional['FunilCards']] = relationship('FunilCards', back_populates='propostas_comerciais_treinamentos')
    cliente: Mapped[Optional['ClientesSst']] = relationship('ClientesSst', back_populates='propostas_comerciais_treinamentos')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='propostas_comerciais_treinamentos')


class PropostasComerciaisVertical365(Base):
    __tablename__ = 'propostas_comerciais_vertical365'
    __table_args__ = (
        CheckConstraint("modo_exibicao_valores = ANY (ARRAY['anual'::text, 'mensal'::text, 'detalhado'::text])", name='propostas_comerciais_vertical365_modo_exibicao_valores_check'),
        CheckConstraint("status = ANY (ARRAY['aguardando'::text, 'aprovada'::text, 'rejeitada'::text])", name='propostas_comerciais_vertical365_status_check'),
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='SET NULL', name='propostas_comerciais_vertical365_card_id_fkey'),
        ForeignKeyConstraint(['created_by'], ['users.id'], name='propostas_comerciais_vertical365_created_by_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='propostas_comerciais_vertical365_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='propostas_comerciais_vertical365_pkey'),
        Index('idx_propostas_v365_card_id', 'card_id'),
        Index('idx_propostas_v365_empresa_id', 'empresa_id'),
        Index('idx_propostas_v365_identificador', 'identificador'),
        Index('idx_propostas_v365_status', 'status'),
        Index('idx_propostas_vertical365_card_id', 'card_id'),
        Index('idx_propostas_vertical365_created_at', 'created_at'),
        Index('idx_propostas_vertical365_empresa_id', 'empresa_id'),
        Index('idx_propostas_vertical365_status', 'status'),
        {'comment': 'Propostas comerciais geradas a partir da calculadora Vertical 365',
     'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    identificador: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'aguardando'::text"))
    card_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    cliente_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    cliente_empresa: Mapped[Optional[str]] = mapped_column(Text)
    cliente_razao_social: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cnpj: Mapped[Optional[str]] = mapped_column(Text)
    cliente_contato: Mapped[Optional[str]] = mapped_column(Text)
    cliente_email: Mapped[Optional[str]] = mapped_column(Text)
    cliente_telefone: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cidade: Mapped[Optional[str]] = mapped_column(Text)
    cliente_distancia: Mapped[Optional[int]] = mapped_column(Integer)
    data_proposta: Mapped[Optional[datetime.date]] = mapped_column(Date)
    validade_dias: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('10'))
    modo_exibicao_valores: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'mensal'::text"))
    titulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_modulo: Mapped[Optional[str]] = mapped_column(Text)
    titulo_dores: Mapped[Optional[str]] = mapped_column(Text)
    titulo_solucoes: Mapped[Optional[str]] = mapped_column(Text)
    titulo_diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    titulo_investimento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_pagamento: Mapped[Optional[str]] = mapped_column(Text)
    titulo_infos: Mapped[Optional[str]] = mapped_column(Text)
    titulo_passos: Mapped[Optional[str]] = mapped_column(Text)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    modulo: Mapped[Optional[str]] = mapped_column(Text)
    publico: Mapped[Optional[str]] = mapped_column(Text)
    dores: Mapped[Optional[str]] = mapped_column(Text)
    solucoes: Mapped[Optional[str]] = mapped_column(Text)
    diferenciais: Mapped[Optional[str]] = mapped_column(Text)
    pagamento: Mapped[Optional[str]] = mapped_column(Text)
    infos: Mapped[Optional[str]] = mapped_column(Text)
    passos: Mapped[Optional[str]] = mapped_column(Text)
    dados_orcamento: Mapped[Optional[dict]] = mapped_column(JSONB)
    valor_total: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_orcamento: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'vertical365'::text"), comment='Tipo do orçamento: treinamento_normativo, servicos_sst, vertical365')
    cliente_endereco: Mapped[Optional[str]] = mapped_column(Text)
    cliente_bairro: Mapped[Optional[str]] = mapped_column(Text)
    cliente_uf: Mapped[Optional[str]] = mapped_column(Text)
    cliente_cep: Mapped[Optional[str]] = mapped_column(Text)

    card: Mapped[Optional['FunilCards']] = relationship('FunilCards', back_populates='propostas_comerciais_vertical365')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='propostas_comerciais_vertical365')


class UnidadesClientes(Base):
    __tablename__ = 'unidades_clientes'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], ondelete='CASCADE', name='unidades_clientes_cliente_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], ondelete='CASCADE', name='unidades_clientes_empresa_id_fkey'),
        ForeignKeyConstraint(['grupo_id'], ['public.grupos_clientes.id'], ondelete='SET NULL', name='unidades_clientes_grupo_id_fkey'),
        ForeignKeyConstraint(['medico_pcmso_id'], ['public.profissionais_saude.id'], ondelete='SET NULL', name='unidades_clientes_medico_pcmso_id_fkey'),
        ForeignKeyConstraint(['tecnico_responsavel_id'], ['public.profissionais_seguranca.id'], ondelete='SET NULL', name='unidades_clientes_tecnico_responsavel_id_fkey'),
        PrimaryKeyConstraint('id', name='unidades_clientes_pkey'),
        Index('idx_unidades_clientes_cliente_id', 'cliente_id'),
        Index('idx_unidades_clientes_empresa_id', 'empresa_id'),
        Index('idx_unidades_clientes_grupo_id', 'grupo_id'),
        Index('idx_unidades_clientes_medico_pcmso_id', 'medico_pcmso_id'),
        Index('idx_unidades_clientes_status', 'status'),
        Index('idx_unidades_clientes_tecnico_responsavel_id', 'tecnico_responsavel_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    cliente_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    razao_social: Mapped[str] = mapped_column(String(255), nullable=False)
    grupo_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_inscricao: Mapped[Optional[str]] = mapped_column(String(1), server_default=text("'1'::character varying"))
    numero_inscricao: Mapped[Optional[str]] = mapped_column(String(20))
    nome_referencia: Mapped[Optional[str]] = mapped_column(String(255))
    cnae: Mapped[Optional[str]] = mapped_column(String(10))
    cnae_atividade: Mapped[Optional[str]] = mapped_column(Text)
    grau_risco: Mapped[Optional[str]] = mapped_column(String(1))
    cep: Mapped[Optional[str]] = mapped_column(String(10))
    logradouro: Mapped[Optional[str]] = mapped_column(String(255))
    numero: Mapped[Optional[str]] = mapped_column(String(20))
    complemento: Mapped[Optional[str]] = mapped_column(String(100))
    bairro: Mapped[Optional[str]] = mapped_column(String(100))
    cidade: Mapped[Optional[str]] = mapped_column(String(100))
    uf: Mapped[Optional[str]] = mapped_column(String(2))
    codigo_interno: Mapped[Optional[str]] = mapped_column(String(50))
    tipo_local: Mapped[Optional[str]] = mapped_column(String(1))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    medico_pcmso_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tecnico_responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    faturamento: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'faturar'::character varying"))
    status: Mapped[Optional[str]] = mapped_column(String(20), server_default=text("'ativo'::character varying"))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    cliente: Mapped['ClientesSst'] = relationship('ClientesSst', back_populates='unidades_clientes')
    empresa: Mapped['Empresas'] = relationship('Empresas', back_populates='unidades_clientes')
    grupo: Mapped[Optional['GruposClientes']] = relationship('GruposClientes', back_populates='unidades_clientes')
    medico_pcmso: Mapped[Optional['ProfissionaisSaude']] = relationship('ProfissionaisSaude', back_populates='unidades_clientes')
    tecnico_responsavel: Mapped[Optional['ProfissionaisSeguranca']] = relationship('ProfissionaisSeguranca', back_populates='unidades_clientes')
    contatos_unidades: Mapped[list['ContatosUnidades']] = relationship('ContatosUnidades', back_populates='unidade')


class ContatosUnidades(Base):
    __tablename__ = 'contatos_unidades'
    __table_args__ = (
        ForeignKeyConstraint(['unidade_id'], ['public.unidades_clientes.id'], ondelete='CASCADE', name='contatos_unidades_unidade_id_fkey'),
        PrimaryKeyConstraint('id', name='contatos_unidades_pkey'),
        Index('idx_contatos_unidades_unidade_id', 'unidade_id'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    unidade_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    cargo: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telefone: Mapped[Optional[str]] = mapped_column(String(20))
    linkedin: Mapped[Optional[str]] = mapped_column(String(255))
    principal: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))

    unidade: Mapped['UnidadesClientes'] = relationship('UnidadesClientes', back_populates='contatos_unidades')
