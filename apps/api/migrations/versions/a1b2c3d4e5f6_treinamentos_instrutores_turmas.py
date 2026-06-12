"""treinamentos instrutores turmas e tabelas relacionadas

Revision ID: a1b2c3d4e5f6
Revises: c15b41e35310
Create Date: 2026-06-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c15b41e35310'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### 1. empresas_parceiras ###
    op.create_table('empresas_parceiras',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('nome', sa.Text(), nullable=False),
    sa.Column('cnpj', sa.Text(), nullable=True),
    sa.Column('email', sa.Text(), nullable=True),
    sa.Column('telefone', sa.Text(), nullable=True),
    sa.Column('responsavel', sa.Text(), nullable=True),
    sa.Column('responsavel_id', sa.Uuid(), nullable=True),
    sa.Column('tipo_fornecedor', sa.Text(), nullable=True),
    sa.Column('empresa_sst_id', sa.Uuid(), nullable=False),
    sa.Column('parceira_empresa_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['responsavel_id'], ['public.profiles.id'], name='empresas_parceiras_responsavel_id_fkey'),
    sa.ForeignKeyConstraint(['empresa_sst_id'], ['public.empresas.id'], name='empresas_parceiras_empresa_sst_id_fkey'),
    sa.ForeignKeyConstraint(['parceira_empresa_id'], ['public.empresas.id'], name='empresas_parceiras_parceira_empresa_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='empresas_parceiras_pkey'),
    schema='public'
    )
    # ### 2. instrutores ###
    op.create_table('instrutores',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('nome', sa.Text(), nullable=False),
    sa.Column('cpf_cnpj', sa.Text(), nullable=False),
    sa.Column('email', sa.Text(), nullable=False),
    sa.Column('telefone', sa.Text(), nullable=True),
    sa.Column('data_nascimento', sa.Date(), nullable=True),
    sa.Column('ativo', sa.Boolean(), server_default=sa.text('true'), nullable=True),
    sa.Column('empresa_id', sa.Uuid(), nullable=False),
    sa.Column('empresa_parceira_id', sa.Uuid(), nullable=True),
    sa.Column('formacao_academica', sa.Text(), nullable=True),
    sa.Column('formacoes_count', sa.Integer(), server_default=sa.text('0'), nullable=True),
    sa.Column('treinamentos_count', sa.Integer(), server_default=sa.text('0'), nullable=True),
    sa.Column('cep', sa.Text(), nullable=True),
    sa.Column('logradouro', sa.Text(), nullable=True),
    sa.Column('numero', sa.Text(), nullable=True),
    sa.Column('complemento', sa.Text(), nullable=True),
    sa.Column('bairro', sa.Text(), nullable=True),
    sa.Column('cidade', sa.Text(), nullable=True),
    sa.Column('uf', sa.Text(), nullable=True),
    sa.Column('veiculo', sa.Text(), nullable=True),
    sa.Column('placa', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='instrutores_empresa_id_fkey'),
    sa.ForeignKeyConstraint(['empresa_parceira_id'], ['public.empresas_parceiras.id'], name='instrutores_empresa_parceira_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='instrutores_pkey'),
    schema='public'
    )
    # ### 3. catalogo_treinamentos ###
    op.create_table('catalogo_treinamentos',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('empresa_id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.Text(), nullable=False),
    sa.Column('norma', sa.Text(), nullable=False),
    sa.Column('validade', sa.Text(), nullable=True),
    sa.Column('ch_formacao', sa.Numeric(), nullable=True),
    sa.Column('ch_formacao_obrigatoria', sa.Boolean(), server_default=sa.text('false'), nullable=True),
    sa.Column('ch_reciclagem', sa.Numeric(), nullable=True),
    sa.Column('ch_reciclagem_obrigatoria', sa.Boolean(), server_default=sa.text('false'), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='catalogo_treinamentos_empresa_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='catalogo_treinamentos_pkey'),
    schema='public'
    )
    # ### 4. treinamentos ###
    op.create_table('treinamentos',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('empresa_id', sa.Uuid(), nullable=False),
    sa.Column('nome_treinamento', sa.Text(), nullable=False),
    sa.Column('instrutor', sa.Text(), nullable=False),
    sa.Column('participantes', sa.Text(), nullable=False),
    sa.Column('data_realizacao', sa.Date(), nullable=False),
    sa.Column('validade_meses', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='treinamentos_empresa_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='treinamentos_pkey'),
    schema='public'
    )
    # ### 5. instrutor_datas_indisponiveis ###
    op.create_table('instrutor_datas_indisponiveis',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('instrutor_id', sa.Uuid(), nullable=False),
    sa.Column('data', sa.Date(), nullable=False),
    sa.Column('motivo', sa.Text(), nullable=True),
    sa.Column('status', sa.Text(), server_default=sa.text("'pendente'::text"), nullable=True),
    sa.Column('origem', sa.Text(), server_default=sa.text("'admin'::text"), nullable=True),
    sa.Column('solicitado_por', sa.Uuid(), nullable=True),
    sa.Column('aprovado_por', sa.Uuid(), nullable=True),
    sa.Column('aprovado_em', sa.DateTime(timezone=True), nullable=True),
    sa.Column('motivo_rejeicao', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['instrutor_id'], ['public.instrutores.id'], name='instrutor_datas_indisponiveis_instrutor_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['solicitado_por'], ['public.profiles.id'], name='instrutor_datas_indisponiveis_solicitado_por_fkey'),
    sa.ForeignKeyConstraint(['aprovado_por'], ['public.profiles.id'], name='instrutor_datas_indisponiveis_aprovado_por_fkey'),
    sa.PrimaryKeyConstraint('id', name='instrutor_datas_indisponiveis_pkey'),
    sa.UniqueConstraint('instrutor_id', 'data', name='instrutor_datas_indisponiveis_instrutor_id_data_key'),
    schema='public'
    )
    # ### 6. reconhecimento_facial_config ###
    op.create_table('reconhecimento_facial_config',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('empresa_sst_id', sa.Uuid(), nullable=False),
    sa.Column('cliente_empresa_id', sa.Uuid(), nullable=False),
    sa.Column('ativo', sa.Boolean(), server_default=sa.text('false'), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['empresa_sst_id'], ['public.empresas.id'], name='reconhecimento_facial_config_empresa_sst_id_fkey'),
    sa.ForeignKeyConstraint(['cliente_empresa_id'], ['public.empresas.id'], name='reconhecimento_facial_config_cliente_empresa_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='reconhecimento_facial_config_pkey'),
    sa.UniqueConstraint('empresa_sst_id', 'cliente_empresa_id', name='uq_recon_facial_empresa_sst_cliente'),
    schema='public'
    )
    # ### 7. funil_card_anexos ###
    op.create_table('funil_card_anexos',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('card_id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.Text(), nullable=True),
    sa.Column('arquivo_url', sa.Text(), nullable=True),
    sa.Column('arquivo_path', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['card_id'], ['public.funil_cards.id'], name='funil_card_anexos_card_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='funil_card_anexos_pkey'),
    schema='public'
    )
    # ### 8. turmas_treinamento ###
    op.create_table('turmas_treinamento',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('empresa_id', sa.Uuid(), nullable=False),
    sa.Column('numero_turma', sa.Integer(), nullable=False),
    sa.Column('codigo_turma', sa.Text(), nullable=True),
    sa.Column('cliente_id', sa.Uuid(), nullable=False),
    sa.Column('treinamento_id', sa.Uuid(), nullable=False),
    sa.Column('tipo_treinamento', sa.Text(), nullable=False),
    sa.Column('carga_horaria_total', sa.Numeric(), nullable=True),
    sa.Column('instrutor_id', sa.Uuid(), nullable=True),
    sa.Column('quantidade_participantes', sa.Integer(), nullable=True),
    sa.Column('status', sa.Text(), server_default=sa.text("'planejada'::text"), nullable=True),
    sa.Column('validado', sa.Boolean(), server_default=sa.text('false'), nullable=True),
    sa.Column('observacoes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['empresa_id'], ['public.empresas.id'], name='turmas_treinamento_empresa_id_fkey'),
    sa.ForeignKeyConstraint(['cliente_id'], ['public.clientes_sst.id'], name='turmas_treinamento_cliente_id_fkey'),
    sa.ForeignKeyConstraint(['treinamento_id'], ['public.catalogo_treinamentos.id'], name='turmas_treinamento_treinamento_id_fkey'),
    sa.ForeignKeyConstraint(['instrutor_id'], ['public.instrutores.id'], name='turmas_treinamento_instrutor_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='turmas_treinamento_pkey'),
    schema='public'
    )
    # ### 9. turmas_treinamento_aulas ###
    op.create_table('turmas_treinamento_aulas',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('turma_id', sa.Uuid(), nullable=False),
    sa.Column('data', sa.Date(), nullable=False),
    sa.Column('hora_inicio', sa.Time(), nullable=False),
    sa.Column('hora_fim', sa.Time(), nullable=False),
    sa.Column('horas', sa.Numeric(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['turma_id'], ['public.turmas_treinamento.id'], name='turmas_treinamento_aulas_turma_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='turmas_treinamento_aulas_pkey'),
    schema='public'
    )
    # ### 10. turma_colaboradores ###
    op.create_table('turma_colaboradores',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('turma_id', sa.Uuid(), nullable=False),
    sa.Column('colaborador_id', sa.Uuid(), nullable=False),
    sa.Column('resultado', sa.Text(), nullable=True),
    sa.Column('nota_pos_teste', sa.Numeric(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['turma_id'], ['public.turmas_treinamento.id'], name='turma_colaboradores_turma_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['colaborador_id'], ['public.colaboradores.id'], name='turma_colaboradores_colaborador_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='turma_colaboradores_pkey'),
    schema='public'
    )
    # ### 11. colaboradores_certificados ###
    op.create_table('colaboradores_certificados',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('colaborador_id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.Text(), nullable=True),
    sa.Column('arquivo_url', sa.Text(), nullable=True),
    sa.Column('arquivo_path', sa.Text(), nullable=True),
    sa.Column('data_emissao', sa.Date(), nullable=True),
    sa.Column('data_validade', sa.Date(), nullable=True),
    sa.Column('observacoes', sa.Text(), nullable=True),
    sa.Column('turma_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['colaborador_id'], ['public.colaboradores.id'], name='colaboradores_certificados_colaborador_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['turma_id'], ['public.turmas_treinamento.id'], name='colaboradores_certificados_turma_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='colaboradores_certificados_pkey'),
    schema='public'
    )
    # ### 12. colaboradores_treinamentos ###
    op.create_table('colaboradores_treinamentos',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('colaborador_id', sa.Uuid(), nullable=False),
    sa.Column('treinamento_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.Text(), server_default=sa.text("'necessario'::text"), nullable=True),
    sa.Column('data_realizacao', sa.Date(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['colaborador_id'], ['public.colaboradores.id'], name='colaboradores_treinamentos_colaborador_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['treinamento_id'], ['public.catalogo_treinamentos.id'], name='colaboradores_treinamentos_treinamento_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='colaboradores_treinamentos_pkey'),
    sa.UniqueConstraint('colaborador_id', 'treinamento_id', name='colaboradores_treinamentos_colaborador_id_treinamento_id_key'),
    schema='public'
    )
    # ### 13. colaboradores_treinamentos_datas ###
    op.create_table('colaboradores_treinamentos_datas',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('colaborador_treinamento_id', sa.Uuid(), nullable=False),
    sa.Column('data', sa.Date(), nullable=False),
    sa.Column('inicio', sa.Time(), nullable=True),
    sa.Column('fim', sa.Time(), nullable=True),
    sa.Column('horas', sa.Numeric(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['colaborador_treinamento_id'], ['public.colaboradores_treinamentos.id'], name='fk_colab_treino_datas_colab_treino_id', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='colaboradores_treinamentos_datas_pkey'),
    schema='public'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('colaboradores_treinamentos_datas', schema='public')
    op.drop_table('colaboradores_treinamentos', schema='public')
    op.drop_table('colaboradores_certificados', schema='public')
    op.drop_table('turma_colaboradores', schema='public')
    op.drop_table('turmas_treinamento_aulas', schema='public')
    op.drop_table('turmas_treinamento', schema='public')
    op.drop_table('funil_card_anexos', schema='public')
    op.drop_table('reconhecimento_facial_config', schema='public')
    op.drop_table('instrutor_datas_indisponiveis', schema='public')
    op.drop_table('treinamentos', schema='public')
    op.drop_table('catalogo_treinamentos', schema='public')
    op.drop_table('instrutores', schema='public')
    op.drop_table('empresas_parceiras', schema='public')
