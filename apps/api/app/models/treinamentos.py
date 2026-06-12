from typing import Optional
import datetime
import decimal
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    PrimaryKeyConstraint,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.generated import Base


class EmpresasParceiras(Base):
    __tablename__ = 'empresas_parceiras'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_sst_id'], ['public.empresas.id'], name='empresas_parceiras_empresa_sst_id_fkey'),
        ForeignKeyConstraint(['parceira_empresa_id'], ['public.empresas.id'], name='empresas_parceiras_parceira_empresa_id_fkey'),
        ForeignKeyConstraint(['responsavel_id'], ['public.profiles.id'], name='empresas_parceiras_responsavel_id_fkey'),
        PrimaryKeyConstraint('id', name='empresas_parceiras_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    empresa_sst_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    responsavel: Mapped[Optional[str]] = mapped_column(Text)
    responsavel_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    tipo_fornecedor: Mapped[Optional[str]] = mapped_column(Text)
    parceira_empresa_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class Instrutores(Base):
    __tablename__ = 'instrutores'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='instrutores_empresa_id_fkey'),
        ForeignKeyConstraint(['empresa_parceira_id'], ['public.empresas_parceiras.id'], name='instrutores_empresa_parceira_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['public.profiles.id'], name='fk_instrutores_user_id_profiles', ondelete='SET NULL'),
        PrimaryKeyConstraint('id', name='instrutores_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    cpf_cnpj: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    telefone: Mapped[Optional[str]] = mapped_column(Text)
    data_nascimento: Mapped[Optional[datetime.date]] = mapped_column(Date)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('true'))
    empresa_parceira_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    formacao_academica: Mapped[Optional[str]] = mapped_column(Text)
    formacoes_count: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    treinamentos_count: Mapped[Optional[int]] = mapped_column(Integer, server_default=text('0'))
    cep: Mapped[Optional[str]] = mapped_column(Text)
    logradouro: Mapped[Optional[str]] = mapped_column(Text)
    numero: Mapped[Optional[str]] = mapped_column(Text)
    complemento: Mapped[Optional[str]] = mapped_column(Text)
    bairro: Mapped[Optional[str]] = mapped_column(Text)
    cidade: Mapped[Optional[str]] = mapped_column(Text)
    uf: Mapped[Optional[str]] = mapped_column(Text)
    veiculo: Mapped[Optional[str]] = mapped_column(Text)
    placa: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class CatalogoTreinamentos(Base):
    __tablename__ = 'catalogo_treinamentos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='catalogo_treinamentos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='catalogo_treinamentos_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    norma: Mapped[str] = mapped_column(Text, nullable=False)
    validade: Mapped[Optional[str]] = mapped_column(Text)
    ch_formacao: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    ch_formacao_obrigatoria: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    ch_reciclagem: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    ch_reciclagem_obrigatoria: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class Treinamentos(Base):
    __tablename__ = 'treinamentos'
    __table_args__ = (
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='treinamentos_empresa_id_fkey'),
        PrimaryKeyConstraint('id', name='treinamentos_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome_treinamento: Mapped[str] = mapped_column(Text, nullable=False)
    instrutor: Mapped[str] = mapped_column(Text, nullable=False)
    participantes: Mapped[str] = mapped_column(Text, nullable=False)
    data_realizacao: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    validade_meses: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class InstrutorDatasIndisponiveis(Base):
    __tablename__ = 'instrutor_datas_indisponiveis'
    __table_args__ = (
        ForeignKeyConstraint(['aprovado_por'], ['public.profiles.id'], name='instrutor_datas_indisponiveis_aprovado_por_fkey'),
        ForeignKeyConstraint(['instrutor_id'], ['public.instrutores.id'], ondelete='CASCADE', name='instrutor_datas_indisponiveis_instrutor_id_fkey'),
        ForeignKeyConstraint(['solicitado_por'], ['public.profiles.id'], name='instrutor_datas_indisponiveis_solicitado_por_fkey'),
        PrimaryKeyConstraint('id', name='instrutor_datas_indisponiveis_pkey'),
        UniqueConstraint('instrutor_id', 'data', name='instrutor_datas_indisponiveis_instrutor_id_data_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    instrutor_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'pendente'::text"))
    origem: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'admin'::text"))
    solicitado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    aprovado_por: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    aprovado_em: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    motivo_rejeicao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class ReconhecimentoFacialConfig(Base):
    __tablename__ = 'reconhecimento_facial_config'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_empresa_id'], ['public.empresas.id'], name='reconhecimento_facial_config_cliente_empresa_id_fkey'),
        ForeignKeyConstraint(['empresa_sst_id'], ['public.empresas.id'], name='reconhecimento_facial_config_empresa_sst_id_fkey'),
        PrimaryKeyConstraint('id', name='reconhecimento_facial_config_pkey'),
        UniqueConstraint('empresa_sst_id', 'cliente_empresa_id', name='uq_recon_facial_empresa_sst_cliente'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_sst_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    cliente_empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    ativo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class FunilCardAnexos(Base):
    __tablename__ = 'funil_card_anexos'
    __table_args__ = (
        ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], ondelete='CASCADE', name='funil_card_anexos_card_id_fkey'),
        PrimaryKeyConstraint('id', name='funil_card_anexos_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    card_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[Optional[str]] = mapped_column(Text)
    arquivo_url: Mapped[Optional[str]] = mapped_column(Text)
    arquivo_path: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class TurmasTreinamento(Base):
    __tablename__ = 'turmas_treinamento'
    __table_args__ = (
        ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], name='turmas_treinamento_cliente_id_fkey'),
        ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='turmas_treinamento_empresa_id_fkey'),
        ForeignKeyConstraint(['instrutor_id'], ['public.instrutores.id'], name='turmas_treinamento_instrutor_id_fkey'),
        ForeignKeyConstraint(['treinamento_id'], ['public.catalogo_treinamentos.id'], name='turmas_treinamento_treinamento_id_fkey'),
        PrimaryKeyConstraint('id', name='turmas_treinamento_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    numero_turma: Mapped[int] = mapped_column(Integer, nullable=False)
    cliente_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    treinamento_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_treinamento: Mapped[str] = mapped_column(Text, nullable=False)
    codigo_turma: Mapped[Optional[str]] = mapped_column(Text)
    carga_horaria_total: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    instrutor_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    quantidade_participantes: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'planejada'::text"))
    validado: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
    updated_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class TurmasTreinamentoAulas(Base):
    __tablename__ = 'turmas_treinamento_aulas'
    __table_args__ = (
        ForeignKeyConstraint(['turma_id'], ['public.turmas_treinamento.id'], ondelete='CASCADE', name='turmas_treinamento_aulas_turma_id_fkey'),
        PrimaryKeyConstraint('id', name='turmas_treinamento_aulas_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    turma_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    hora_inicio: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    hora_fim: Mapped[datetime.time] = mapped_column(Time, nullable=False)
    horas: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class TurmaColaboradores(Base):
    __tablename__ = 'turma_colaboradores'
    __table_args__ = (
        ForeignKeyConstraint(['colaborador_id'], ['public.colaboradores.id'], name='turma_colaboradores_colaborador_id_fkey'),
        ForeignKeyConstraint(['turma_id'], ['public.turmas_treinamento.id'], ondelete='CASCADE', name='turma_colaboradores_turma_id_fkey'),
        PrimaryKeyConstraint('id', name='turma_colaboradores_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    turma_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    colaborador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    resultado: Mapped[Optional[str]] = mapped_column(Text)
    nota_pos_teste: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class ColaboradoresCertificados(Base):
    __tablename__ = 'colaboradores_certificados'
    __table_args__ = (
        ForeignKeyConstraint(['colaborador_id'], ['public.colaboradores.id'], ondelete='CASCADE', name='colaboradores_certificados_colaborador_id_fkey'),
        ForeignKeyConstraint(['turma_id'], ['public.turmas_treinamento.id'], name='colaboradores_certificados_turma_id_fkey'),
        PrimaryKeyConstraint('id', name='colaboradores_certificados_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    colaborador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    nome: Mapped[Optional[str]] = mapped_column(Text)
    arquivo_url: Mapped[Optional[str]] = mapped_column(Text)
    arquivo_path: Mapped[Optional[str]] = mapped_column(Text)
    data_emissao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    data_validade: Mapped[Optional[datetime.date]] = mapped_column(Date)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    turma_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class ColaboradoresTreinamentos(Base):
    __tablename__ = 'colaboradores_treinamentos'
    __table_args__ = (
        ForeignKeyConstraint(['colaborador_id'], ['public.colaboradores.id'], ondelete='CASCADE', name='colaboradores_treinamentos_colaborador_id_fkey'),
        ForeignKeyConstraint(['treinamento_id'], ['public.catalogo_treinamentos.id'], name='colaboradores_treinamentos_treinamento_id_fkey'),
        PrimaryKeyConstraint('id', name='colaboradores_treinamentos_pkey'),
        UniqueConstraint('colaborador_id', 'treinamento_id', name='colaboradores_treinamentos_colaborador_id_treinamento_id_key'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    colaborador_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    treinamento_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    status: Mapped[Optional[str]] = mapped_column(Text, server_default=text("'necessario'::text"))
    data_realizacao: Mapped[Optional[datetime.date]] = mapped_column(Date)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))


class ColaboradoresTreinamentosDatas(Base):
    __tablename__ = 'colaboradores_treinamentos_datas'
    __table_args__ = (
        ForeignKeyConstraint(['colaborador_treinamento_id'], ['public.colaboradores_treinamentos.id'], ondelete='CASCADE', name='fk_colab_treino_datas_colab_treino_id'),
        PrimaryKeyConstraint('id', name='colaboradores_treinamentos_datas_pkey'),
        {'schema': 'public'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    colaborador_treinamento_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    data: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    inicio: Mapped[Optional[datetime.time]] = mapped_column(Time)
    fim: Mapped[Optional[datetime.time]] = mapped_column(Time)
    horas: Mapped[Optional[decimal.Decimal]] = mapped_column(Numeric)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), server_default=text('now()'))
