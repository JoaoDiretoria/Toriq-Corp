import app.models  # noqa: F401  (registers all models in Base.metadata)
from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.financeiro_cadastros import router as fin_cadastros_router
from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="TORIQ API", version="0.1.0")
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(fin_cadastros_router)
    return app


app = create_app()
