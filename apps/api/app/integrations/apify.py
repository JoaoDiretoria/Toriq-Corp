"""Integração com a plataforma Apify (prospecção do módulo Toriq Vendas).

Apify é uma plataforma terceira gerenciada de scraping. Aqui só falamos com a
API REST dela (https://api.apify.com): disparamos "actors" (jobs de scraping),
consultamos o status do run e buscamos os itens do dataset gerado. Não há
qualquer técnica de evasão de detecção construída por nós — isso é
responsabilidade da própria Apify.

Componentes:
- ``DEFAULT_ACTORS``: mapeamento plataforma -> actor id default. São apenas
  defaults plausíveis e PODEM ser sobrescritos pela coluna ``actors`` da
  ``VendasConfig`` da empresa (config.actors). O path de um actor na Apify usa
  ``~`` para separar org e actor (ex.: ``apify~instagram-scraper``).
- ``ApifyError``: erro de domínio levantado em falhas de chamada à API.
- ``ApifyClient``: cliente HTTP async (httpx), stateless — abre/fecha um client
  por chamada.
- ``build_actor_input``: traduz nossos parâmetros (vindos do front) para o input
  esperado por cada actor.
- ``normalize_items``: mapeia itens brutos do dataset para o formato de lead.
- ``map_apify_status``: normaliza o status da Apify para nosso vocabulário.
"""
from __future__ import annotations

import re

import httpx

# ═══════════════════════════════════════════════════════════════════════════════
# Actors default (overridáveis via VendasConfig.actors)
# ═══════════════════════════════════════════════════════════════════════════════
# Slugs públicos plausíveis da Apify. A empresa pode sobrescrever qualquer um
# deles guardando um dict {plataforma: actor_id} em config.actors.
DEFAULT_ACTORS: dict[str, str] = {
    "google": "compass~crawler-google-places",
    "facebook": "apify~facebook-pages-scraper",
    "instagram": "apify~instagram-scraper",
    "instagram_followers": "apify~instagram-follower-scraper",
    "linkedin": "bebity~linkedin-premium-actor",
}

# Base da API REST da Apify.
_API_BASE = "https://api.apify.com"
_TIMEOUT = 60.0

# Regex tolerante para extrair um e-mail de textos livres (ex.: bio do Instagram).
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")


class ApifyError(Exception):
    """Erro ao falar com a API da Apify (HTTP ou resposta inesperada)."""


class ApifyClient:
    """Cliente HTTP async para a API da Apify.

    Stateless: cada método abre seu próprio ``httpx.AsyncClient`` num
    ``async with`` e o fecha ao final. A autenticação vai sempre no header
    ``Authorization: Bearer <token>``.
    """

    def __init__(self, token: str) -> None:
        self.token = token
        self._headers = {"Authorization": f"Bearer {token}"}

    async def run_actor(self, actor_id: str, run_input: dict) -> dict:
        """Dispara um actor. Retorna o objeto ``run`` (id, status, defaultDatasetId)."""
        url = f"{_API_BASE}/v2/acts/{actor_id}/runs"
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            try:
                resp = await c.post(url, json=run_input, headers=self._headers)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise ApifyError(
                    f"Falha ao iniciar actor {actor_id}: "
                    f"HTTP {e.response.status_code} — {e.response.text}"
                ) from e
            except httpx.HTTPError as e:
                raise ApifyError(f"Erro de rede ao iniciar actor {actor_id}: {e}") from e
            data = resp.json()
        return data["data"]

    async def get_run(self, run_id: str) -> dict:
        """Consulta um run pelo id. Retorna o objeto ``run``."""
        url = f"{_API_BASE}/v2/actor-runs/{run_id}"
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            try:
                resp = await c.get(url, headers=self._headers)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise ApifyError(
                    f"Falha ao consultar run {run_id}: "
                    f"HTTP {e.response.status_code} — {e.response.text}"
                ) from e
            except httpx.HTTPError as e:
                raise ApifyError(f"Erro de rede ao consultar run {run_id}: {e}") from e
            data = resp.json()
        return data["data"]

    async def get_dataset_items(self, dataset_id: str, limit: int = 1000) -> list[dict]:
        """Busca os itens de um dataset (limpos). Retorna a lista de itens."""
        url = f"{_API_BASE}/v2/datasets/{dataset_id}/items"
        params = {"clean": "true", "limit": limit}
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            try:
                resp = await c.get(url, params=params, headers=self._headers)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise ApifyError(
                    f"Falha ao buscar itens do dataset {dataset_id}: "
                    f"HTTP {e.response.status_code} — {e.response.text}"
                ) from e
            except httpx.HTTPError as e:
                raise ApifyError(
                    f"Erro de rede ao buscar itens do dataset {dataset_id}: {e}"
                ) from e
            data = resp.json()
        return data if isinstance(data, list) else []

    async def abort_run(self, run_id: str) -> dict:
        """Aborta um run em execução. Retorna o objeto ``run`` atualizado."""
        url = f"{_API_BASE}/v2/actor-runs/{run_id}/abort"
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            try:
                resp = await c.post(url, headers=self._headers)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise ApifyError(
                    f"Falha ao abortar run {run_id}: "
                    f"HTTP {e.response.status_code} — {e.response.text}"
                ) from e
            except httpx.HTTPError as e:
                raise ApifyError(f"Erro de rede ao abortar run {run_id}: {e}") from e
            data = resp.json()
        return data["data"]


# ═══════════════════════════════════════════════════════════════════════════════
# Tradução de parâmetros (front) -> input do actor
# ═══════════════════════════════════════════════════════════════════════════════

def build_actor_input(plataforma: str, parametros: dict) -> dict:
    """Traduz nossos parâmetros para o input esperado pelo actor da plataforma.

    Plataforma desconhecida levanta ``ValueError``.
    """
    p = parametros or {}

    if plataforma == "google":
        termo = p.get("termo", "")
        partes = [termo]
        if p.get("cidade"):
            partes.append(p["cidade"])
        if p.get("estado"):
            partes.append(p["estado"])
        search_string = " ".join(str(x) for x in partes if x)
        return {
            "searchStringsArray": [search_string],
            "maxCrawledPlacesPerSearch": p.get("max"),
            "language": "pt-BR",
            "countryCode": "br",
        }

    if plataforma == "facebook":
        run_input: dict = {
            "searchQuery": p.get("termo"),
            "maxItems": p.get("max"),
        }
        if p.get("localizacao"):
            run_input["location"] = p["localizacao"]
        return run_input

    if plataforma == "instagram":
        return {
            "search": p.get("termo"),
            "searchType": p.get("tipo") or "user",
            "resultsLimit": p.get("max"),
        }

    if plataforma == "instagram_followers":
        return {
            "username": [p.get("username")],
            "resultsLimit": p.get("max"),
        }

    if plataforma == "linkedin":
        run_input = {
            "searchQuery": p.get("termo"),
            "maxItems": p.get("max"),
        }
        if p.get("localizacao"):
            run_input["location"] = p["localizacao"]
        if p.get("industria"):
            run_input["industry"] = p["industria"]
        return run_input

    raise ValueError(f"Plataforma desconhecida: {plataforma!r}")


# ═══════════════════════════════════════════════════════════════════════════════
# Normalização: item bruto do dataset -> dict de lead
# ═══════════════════════════════════════════════════════════════════════════════

def _first(item: dict, *keys: str) -> str | None:
    """Devolve o primeiro valor não-vazio entre as chaves dadas (como str)."""
    for k in keys:
        v = item.get(k)
        if v:
            return str(v)
    return None


def _extract_email(item: dict) -> str | None:
    """Extrai e-mail de campos diretos ou, em último caso, da bio/descrição."""
    direto = _first(item, "email", "emailAddress", "publicEmail")
    if direto:
        return direto
    for campo in ("biography", "bio", "description", "about"):
        texto = item.get(campo)
        if isinstance(texto, str):
            m = _EMAIL_RE.search(texto)
            if m:
                return m.group(0)
    return None


def _to_float(v: object) -> float | None:
    """Converte para float de forma tolerante; None se não der."""
    if v is None:
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def normalize_items(plataforma: str, items: list[dict]) -> list[dict]:
    """Mapeia cada item bruto do dataset para um dict de lead.

    Chaves do lead: nome, empresa_nome, telefone, email, cidade, estado,
    plataforma, avaliacao (float|None), dados_brutos (item inteiro).

    Extração tolerante: campos podem faltar e nunca devem explodir.
    """
    leads: list[dict] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue

        if plataforma == "google":
            lead = {
                "nome": _first(item, "title"),
                "empresa_nome": _first(item, "title"),
                "telefone": _first(item, "phone", "phoneUnformatted"),
                "email": _extract_email(item),
                "cidade": _first(item, "city"),
                "estado": _first(item, "state"),
                "avaliacao": _to_float(item.get("totalScore")),
            }
        else:
            # Demais plataformas: extração genérica e tolerante.
            lead = {
                "nome": _first(item, "fullName", "name", "username", "ownerFullName"),
                "empresa_nome": _first(item, "companyName", "businessName", "name"),
                "telefone": _first(item, "phone", "phoneNumber", "phoneUnformatted"),
                "email": _extract_email(item),
                "cidade": _first(item, "city", "addressLocality"),
                "estado": _first(item, "state", "region", "addressRegion"),
                "avaliacao": _to_float(item.get("totalScore") or item.get("rating")),
            }

        lead["plataforma"] = plataforma
        lead["dados_brutos"] = item
        leads.append(lead)

    return leads


# ═══════════════════════════════════════════════════════════════════════════════
# Status: Apify -> nosso vocabulário
# ═══════════════════════════════════════════════════════════════════════════════

def map_apify_status(apify_status: str) -> str:
    """Normaliza o status de um run da Apify para nosso vocabulário interno."""
    status = (apify_status or "").upper()
    if status in ("RUNNING", "READY"):
        return "running"
    if status == "SUCCEEDED":
        return "succeeded"
    if status in ("ABORTED", "ABORTING"):
        return "aborted"
    if status in ("FAILED", "TIMED-OUT", "TIMING-OUT"):
        return "failed"
    return "running"
