"""Testes unitários puros da integração Apify (SEM rede).

Cobre:
- DEFAULT_ACTORS: chaves esperadas e formato de path (org~actor).
- build_actor_input por plataforma (+ ValueError para desconhecida).
- normalize_items com exemplos do Google Maps e extração tolerante.
- map_apify_status para todos os estados.

Nenhum teste aqui chama a API real da Apify.
"""
import pytest

from app.integrations.apify import (
    DEFAULT_ACTORS,
    build_actor_input,
    map_apify_status,
    normalize_items,
)


# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT_ACTORS
# ═══════════════════════════════════════════════════════════════════════════════

def test_default_actors_chaves_e_formato():
    esperadas = {
        "google",
        "facebook",
        "instagram",
        "instagram_followers",
        "linkedin",
    }
    assert set(DEFAULT_ACTORS) == esperadas
    # Path de actor da Apify usa "~" para separar org e actor.
    for plataforma, actor_id in DEFAULT_ACTORS.items():
        assert "~" in actor_id, f"{plataforma} -> {actor_id} deveria ter '~'"


# ═══════════════════════════════════════════════════════════════════════════════
# build_actor_input
# ═══════════════════════════════════════════════════════════════════════════════

def test_build_input_google_completo():
    inp = build_actor_input(
        "google",
        {"termo": "restaurante", "cidade": "São Paulo", "estado": "SP", "max": 25},
    )
    assert inp["searchStringsArray"] == ["restaurante São Paulo SP"]
    assert inp["maxCrawledPlacesPerSearch"] == 25
    assert inp["language"] == "pt-BR"
    assert inp["countryCode"] == "br"


def test_build_input_google_sem_localizacao():
    inp = build_actor_input("google", {"termo": "padaria", "max": 10})
    assert inp["searchStringsArray"] == ["padaria"]


def test_build_input_facebook():
    inp = build_actor_input(
        "facebook", {"termo": "academia", "localizacao": "Rio", "max": 5}
    )
    assert inp == {"searchQuery": "academia", "maxItems": 5, "location": "Rio"}


def test_build_input_facebook_sem_localizacao():
    inp = build_actor_input("facebook", {"termo": "academia", "max": 5})
    assert "location" not in inp
    assert inp["searchQuery"] == "academia"


def test_build_input_instagram_default_tipo():
    inp = build_actor_input("instagram", {"termo": "fitness", "max": 50})
    assert inp == {"search": "fitness", "searchType": "user", "resultsLimit": 50}


def test_build_input_instagram_tipo_explicito():
    inp = build_actor_input(
        "instagram", {"termo": "fitness", "tipo": "hashtag", "max": 50}
    )
    assert inp["searchType"] == "hashtag"


def test_build_input_instagram_followers():
    inp = build_actor_input(
        "instagram_followers", {"termo": "x", "username": "fulano", "max": 100}
    )
    assert inp == {"username": ["fulano"], "resultsLimit": 100}


def test_build_input_linkedin():
    inp = build_actor_input(
        "linkedin",
        {"termo": "CEO", "localizacao": "Brasil", "industria": "Tech", "max": 30},
    )
    assert inp["searchQuery"] == "CEO"
    assert inp["maxItems"] == 30
    assert inp["location"] == "Brasil"
    assert inp["industry"] == "Tech"


def test_build_input_plataforma_desconhecida():
    with pytest.raises(ValueError):
        build_actor_input("tiktok", {"termo": "x"})


# ═══════════════════════════════════════════════════════════════════════════════
# normalize_items
# ═══════════════════════════════════════════════════════════════════════════════

def test_normalize_google_maps():
    items = [
        {
            "title": "Padaria Central",
            "phone": "(11) 1234-5678",
            "phoneUnformatted": "+551112345678",
            "email": "contato@padaria.com",
            "city": "São Paulo",
            "state": "SP",
            "totalScore": 4.5,
        }
    ]
    leads = normalize_items("google", items)
    assert len(leads) == 1
    lead = leads[0]
    assert lead["empresa_nome"] == "Padaria Central"
    assert lead["nome"] == "Padaria Central"
    assert lead["telefone"] == "(11) 1234-5678"
    assert lead["email"] == "contato@padaria.com"
    assert lead["cidade"] == "São Paulo"
    assert lead["estado"] == "SP"
    assert lead["avaliacao"] == 4.5
    assert lead["plataforma"] == "google"
    assert lead["dados_brutos"] == items[0]


def test_normalize_google_campos_faltando():
    # Não pode explodir com item quase vazio.
    leads = normalize_items("google", [{"title": "Só Nome"}])
    lead = leads[0]
    assert lead["empresa_nome"] == "Só Nome"
    assert lead["telefone"] is None
    assert lead["email"] is None
    assert lead["avaliacao"] is None


def test_normalize_instagram_email_da_bio():
    items = [
        {
            "username": "loja_x",
            "fullName": "Loja X",
            "biography": "A melhor loja! Contato: vendas@lojax.com.br",
        }
    ]
    leads = normalize_items("instagram", items)
    lead = leads[0]
    assert lead["nome"] == "Loja X"
    assert lead["email"] == "vendas@lojax.com.br"
    assert lead["plataforma"] == "instagram"
    assert lead["dados_brutos"] == items[0]


def test_normalize_ignora_nao_dicts_e_lista_vazia():
    assert normalize_items("google", []) == []
    assert normalize_items("google", None) == []
    leads = normalize_items("google", ["lixo", 42, {"title": "Ok"}])
    assert len(leads) == 1
    assert leads[0]["empresa_nome"] == "Ok"


def test_normalize_totalscore_invalido_vira_none():
    leads = normalize_items("google", [{"title": "X", "totalScore": "n/a"}])
    assert leads[0]["avaliacao"] is None


# ═══════════════════════════════════════════════════════════════════════════════
# map_apify_status
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize(
    "apify_status, esperado",
    [
        ("RUNNING", "running"),
        ("READY", "running"),
        ("SUCCEEDED", "succeeded"),
        ("ABORTED", "aborted"),
        ("ABORTING", "aborted"),
        ("FAILED", "failed"),
        ("TIMED-OUT", "failed"),
        ("TIMING-OUT", "failed"),
        ("ALGO-ESTRANHO", "running"),
        ("", "running"),
    ],
)
def test_map_apify_status(apify_status, esperado):
    assert map_apify_status(apify_status) == esperado
