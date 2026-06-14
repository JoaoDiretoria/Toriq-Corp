from app.core.db import Base
from app.models import generated  # noqa: F401  (registra as 172 tabelas no metadata)
from app.models import treinamentos  # noqa: F401
from app.models import vendas  # noqa: F401  (Toriq Vendas — Fase 0)
from app.models import vendas_prospeccao  # noqa: F401  (Toriq Vendas — Fase 1)
from app.models import vendas_disparo  # noqa: F401  (Toriq Vendas — Fase 2)
from app.models import vendas_sdr  # noqa: F401  (Toriq Vendas — Fase 4)
from app.models import vendas_uso  # noqa: F401  (Toriq Vendas — Fase 5)
from app.models import vendas_pipeline  # noqa: F401  (Toriq Vendas — Pipeline & Conversas)
from app.models import email_envios  # noqa: F401  (log de emails transacionais — Resend)
from app.models import ops_audit  # noqa: F401  (log de auditoria do dashboard Ops/Suporte)
from app.models.user import User, UserRole

__all__ = ["Base", "User", "UserRole", "generated"]
