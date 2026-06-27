"""Router de STORAGE — upload/delete/presigned para RustFS (S3-compatível).

Todas as rotas exigem autenticação (``get_current_user``). O ``bucket`` é
validado contra uma allowlist dos buckets reais do produto. A ``key`` é sempre
prefixada pela empresa do usuário, garantindo isolamento por tenant.
"""
from __future__ import annotations

import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.core.storage import storage_service
from app.models.user import User, UserRole

# Buckets reais do produto (espelham os do supabase.storage).
ALLOWED_BUCKETS: set[str] = {
    "blog-images",
    "logos-empresas",
    "certificados",
    "certificados-colaboradores",
    "atividades-anexos",
    "frota-documentos",
    "documentos",
    "colaborador-fotos",
    "tickets-anexos",
    "aso-files",
    "sinistro_fotos",
    "turmas",
    "white-label",
    "instagram-media",
}

# Tipos servidos inline (imagens seguras). SVG fica DE FORA de propósito
# (pode carregar script). Os demais permitidos são baixados como anexo.
IMAGE_MIME: set[str] = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_MIME: set[str] = IMAGE_MIME | {
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
}
_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB

router = APIRouter(prefix="/storage", tags=["storage"])


def _validate_bucket(bucket: str) -> None:
    if bucket not in ALLOWED_BUCKETS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "bucket inválido")


def _tenant_prefix(user: User) -> str:
    return f"{user.empresa_id}/" if user.empresa_id else "global/"


def _scope_key(user: User, key: str) -> None:
    """Garante que a ``key`` pertence ao tenant do usuário (anti-IDOR).

    admin_vertical acessa qualquer objeto; os demais só objetos cujo caminho
    começa com o prefixo da própria empresa. Rejeita path traversal.
    """
    if ".." in key.split("/"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "objeto não encontrado")
    if user.role == UserRole.admin_vertical:
        return
    if not key.startswith(_tenant_prefix(user)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "objeto não encontrado")


def _safe_filename(name: str | None) -> str:
    """Basename sem separadores/control chars, limitado em tamanho."""
    base = (name or "arquivo").replace("\\", "/").split("/")[-1]
    base = re.sub(r"[\x00-\x1f]", "", base).strip()
    return (base or "arquivo")[:120]


@router.post("/{bucket}/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    bucket: str,
    file: UploadFile,
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    _validate_bucket(bucket)
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"tipo de arquivo não permitido: {content_type}"
        )
    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "arquivo muito grande")

    filename = _safe_filename(file.filename)
    key = f"{_tenant_prefix(user)}{uuid4()}/{filename}"
    # Não-imagens são forçadas a download (neutraliza stored-XSS em buckets públicos).
    disposition = None if content_type in IMAGE_MIME else f'attachment; filename="{filename}"'
    url = storage_service.upload(
        bucket=bucket,
        key=key,
        data=data,
        content_type=content_type,
        content_disposition=disposition,
    )
    return {"bucket": bucket, "key": key, "url": url}


@router.delete("/{bucket}/{key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    bucket: str,
    key: str,
    user: User = Depends(get_current_user),
) -> None:
    _validate_bucket(bucket)
    _scope_key(user, key)
    storage_service.delete(bucket=bucket, key=key)


@router.get("/{bucket}/{key:path}/url")
async def presigned_url(
    bucket: str,
    key: str,
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    _validate_bucket(bucket)
    _scope_key(user, key)
    return {"url": storage_service.presigned_get(bucket=bucket, key=key)}
