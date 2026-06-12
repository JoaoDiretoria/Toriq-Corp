"""Subsistema de STORAGE (RustFS S3-compatível) — substitui o supabase.storage.

O cliente boto3 é instanciado de forma lazy a partir de ``settings``. Sem
credenciais configuradas (``s3_endpoint_url``/``s3_access_key``/``s3_secret_key``),
qualquer operação levanta ``HTTPException 503``. Os testes mockam os métodos
públicos para não tocar a rede.
"""
from __future__ import annotations

import boto3
from fastapi import HTTPException, status

from app.core.config import settings


class StorageService:
    """Wrapper fino sobre o cliente S3 do boto3 com lazy init."""

    def __init__(self) -> None:
        self._client = None

    def _configured(self) -> bool:
        return bool(
            settings.s3_endpoint_url
            and settings.s3_access_key
            and settings.s3_secret_key
        )

    @property
    def client(self):
        if not self._configured():
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, "storage não configurado"
            )
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
            )
        return self._client

    def _public_url(self, bucket: str, key: str) -> str:
        base = settings.s3_public_base_url or settings.s3_endpoint_url
        base = (base or "").rstrip("/")
        return f"{base}/{bucket}/{key}"

    def upload(self, bucket: str, key: str, data: bytes, content_type: str) -> str:
        """Sobe ``data`` em ``bucket/key`` e retorna a URL pública."""
        self.client.put_object(
            Bucket=bucket, Key=key, Body=data, ContentType=content_type
        )
        return self._public_url(bucket, key)

    def delete(self, bucket: str, key: str) -> None:
        self.client.delete_object(Bucket=bucket, Key=key)

    def presigned_get(self, bucket: str, key: str, expires: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires,
        )


storage_service = StorageService()
