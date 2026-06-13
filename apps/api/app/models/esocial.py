"""Model de empresa_integracoes_esocial (1 config por empresa).

A tabela JÁ EXISTE no banco (introspectada em app.models.generated) — não pode
ser redefinida numa segunda MetaData (SQLAlchemy levanta "Table already defined").
Por isso este módulo REUTILIZA o model gerado e apenas o re-exporta sob o nome
do contrato (`EmpresaIntegracoesEsocial`).

Estrutura real da tabela (ver generated.py): PK em `id` (UUID), unique em
`empresa_id` → 1 config por empresa. A migration d4e5f6a7b8c9 acrescenta as
colunas de metadados do certificado que faltavam: certificado_cn,
certificado_serial, certificado_emissor.

Segredos ficam nas colunas `*_enc` (criptografadas via app.core.esocial_crypto).
"""
from app.models.generated import EmpresaIntegracoesEsocial

__all__ = ["EmpresaIntegracoesEsocial"]
