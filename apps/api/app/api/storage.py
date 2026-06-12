"""Router de STORAGE — upload/delete/presigned para RustFS (S3-compatível).

Todas as rotas exigem autenticação (``get_current_user``). O ``bucket`` é
validado contra uma allowlist dos buckets reais do produto. A ``key`` é sempre
prefixada pela empresa do usuário, garantindo isolamento por tenant.
"""
from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.core.storage import storage_service
from app.models.user import User

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
}

router = APIRouter(prefix="/storage", tags=["storage"])


def _validate_bucket(bucket: str) -> None:
    if bucket not in ALLOWED_BUCKETS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "bucket inválido")


@router.post("/{bucket}/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    bucket: str,
    file: UploadFile,
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    _validate_bucket(bucket)
    prefix = str(user.empresa_id) if user.empresa_id else "global"
    filename = file.filename or "arquivo"
    key = f"{prefix}/{uuid4()}/{filename}"
    data = await file.read()
    url = storage_service.upload(
        bucket=bucket,
        key=key,
        data=data,
        content_type=file.content_type or "application/octet-stream",
    )
    return {"bucket": bucket, "key": key, "url": url}


@router.delete("/{bucket}/{key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    bucket: str,
    key: str,
    user: User = Depends(get_current_user),
) -> None:
    _validate_bucket(bucket)
    storage_service.delete(bucket=bucket, key=key)


@router.get("/{bucket}/{key:path}/url")
async def presigned_url(
    bucket: str,
    key: str,
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    _validate_bucket(bucket)
    return {"url": storage_service.presigned_get(bucket=bucket, key=key)}
