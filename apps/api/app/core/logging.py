"""Logging do backend TORIQ via loguru — uma saída única, legível e colorida.

Por que loguru:
- Um único ponto de configuração (sem ``dictConfig`` verboso espalhado).
- Saída colorida, alinhada e com tracebacks limpos por padrão.

Estratégia (sem reescrever módulo por módulo):
- TODO log da stdlib (uvicorn, sqlalchemy, apscheduler, redis e os nossos
  ``logging.getLogger("toriq.*")``) é interceptado e re-emitido pelo loguru via
  :class:`InterceptHandler`. O código existente que usa ``logging`` continua
  funcionando igual — só a renderização passa a ser a do loguru.
- :func:`setup_logging` é idempotente e deve ser chamado UMA vez, o mais cedo
  possível (topo de ``app.main``). Como o uvicorn configura o logging no
  ``Config.__init__`` ANTES de importar ``app.main``, a nossa configuração roda
  depois e tem a palavra final (não precisa de ``--log-config``).

Tudo é controlado por env (ver ``app.core.config.Settings``):
- ``LOG_LEVEL``     nível mínimo (default INFO).
- ``LOG_JSON``      True → linhas JSON (para agregadores em prod). False → bonito.
- ``LOG_COLORIZE``  força cor mesmo sem TTY (EasyPanel/Railway renderizam ANSI).
- ``LOG_BACKTRACE`` stack completa em exceções (default True).
- ``LOG_DIAGNOSE``  valores das variáveis no traceback (default False — LGPD).
"""
from __future__ import annotations

import inspect
import logging
import sys

from loguru import logger

from app.core.config import settings

# ── Política de ruído ────────────────────────────────────────────────────────
# Loggers de terceiros barulhentos, capados num nível mínimo para não poluir o
# console. É o ponto que você ajusta ao gosto: suba para WARNING o que não quiser
# ver no dia a dia, ou comente uma linha para voltar a ver tudo daquele módulo.
_MUTED_LOGGERS: dict[str, int] = {
    "uvicorn.access": logging.INFO,        # 1 linha por request; → WARNING p/ silenciar
    "sqlalchemy.engine": logging.WARNING,  # WARNING esconde o echo de SQL
    "httpx": logging.WARNING,
    "httpcore": logging.WARNING,
    "apscheduler": logging.WARNING,
    "botocore": logging.WARNING,
    "boto3": logging.WARNING,
    "asyncio": logging.WARNING,
}

# ── Formato bonito do console ────────────────────────────────────────────────
# Tokens entre <...> são as cores do loguru. <level>...</level> pinta conforme o
# nível (INFO ciano, WARNING amarelo, ERROR vermelho...). {name}:{line} dá o
# "arquivo:linha" clicável de onde o log saiu.
_CONSOLE_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> "
    "<level>{level: <8}</level> "
    "<cyan>{name}</cyan>:<cyan>{line}</cyan> "
    "<level>{message}</level>"
)


class InterceptHandler(logging.Handler):
    """Redireciona registros da stdlib ``logging`` para o loguru.

    Recupera o nível pelo nome (caindo no número se o loguru não conhecer o
    nome) e calcula a profundidade do frame para que o loguru reporte o
    módulo/linha de QUEM chamou o log — e não este handler.
    """

    def emit(self, record: logging.LogRecord) -> None:
        # Traduz o nível da stdlib para o nome do loguru, quando existir.
        try:
            level: str | int = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Sobe a pilha a partir DESTE frame (o emit) até sair dos frames internos
        # do módulo `logging`, para o loguru atribuir o log ao chamador real —
        # senão o "arquivo:linha" apontaria para dentro da própria stdlib.
        frame, depth = inspect.currentframe(), 0
        while frame is not None and (
            depth == 0 or frame.f_code.co_filename == logging.__file__
        ):
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


_configured = False


def setup_logging() -> None:
    """Configura o loguru como saída única e faz a stdlib fluir para ele.

    Idempotente: chamar de novo (ex.: em testes que reimportam o app) é no-op,
    para não empilhar sinks nem apagar os sinks que o Sentry adiciona depois.
    """
    global _configured
    if _configured:
        return
    _configured = True

    level = settings.log_level.upper()

    # Windows: o stdout padrão usa cp1252 e quebra (UnicodeEncodeError) com acentos
    # ou JSON unicode — e as nossas mensagens são em português. Forçar UTF-8 é
    # no-op no Linux/Docker (já UTF-8); backslashreplace garante que nunca derruba.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):  # stdout substituído (ex.: captura de teste)
        pass

    # Sink único no stdout. Em JSON (serialize) a cor não faz sentido.
    logger.remove()
    logger.add(
        sys.stdout,
        level=level,
        format=_CONSOLE_FORMAT,
        colorize=settings.log_colorize and not settings.log_json,
        serialize=settings.log_json,
        backtrace=settings.log_backtrace,
        diagnose=settings.log_diagnose,
        enqueue=False,
    )

    # Raiz: qualquer log da stdlib cai no InterceptHandler → loguru.
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(level)

    # Limpa os handlers próprios dos loggers JÁ existentes (uvicorn.*, etc.) e os
    # faz propagar até a raiz, onde o InterceptHandler assume sozinho. Sem isso, o
    # uvicorn manteria a sua própria saída em paralelo (log duplicado e feio).
    for name in list(logging.root.manager.loggerDict):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True

    # Aplica a política de ruído.
    for name, lvl in _MUTED_LOGGERS.items():
        logging.getLogger(name).setLevel(lvl)
