"""Testes unitários puros da integração WhatsApp Meta (Cloud API).

Cobre:
- verify_webhook: match (token certo -> challenge) e no-match (vários casos).
- check_signature: HMAC válido vs inválido com secret conhecido; sem header/secret.
- parse_webhook: payload de exemplo com messages e statuses; tolerância a lixo.
- map_status_whatsapp: mapeamento de todos os estados conhecidos + fallback.
- send_template / send_text: extração do wamid e erro HTTP, com httpx MOCKADO
  via MockTransport (NÃO chama a Graph API real).
"""
import hashlib
import hmac

import httpx
import pytest

from app.integrations.whatsapp_meta import (
    BASE,
    GRAPH_VERSION,
    WhatsAppError,
    check_signature,
    map_status_whatsapp,
    parse_webhook,
    send_template,
    send_text,
    verify_webhook,
)


# ═══════════════════════════════════════════════════════════════════════════════
# verify_webhook
# ═══════════════════════════════════════════════════════════════════════════════

def test_verify_webhook_match():
    assert (
        verify_webhook("subscribe", "segredo123", "DESAFIO", "segredo123")
        == "DESAFIO"
    )


@pytest.mark.parametrize(
    "mode, token, expected",
    [
        ("subscribe", "errado", "certo"),       # token não confere
        ("nope", "certo", "certo"),             # mode diferente de subscribe
        ("subscribe", None, "certo"),           # sem token recebido
        ("subscribe", "certo", None),           # sem expected_token configurado
        (None, "certo", "certo"),               # sem mode
    ],
)
def test_verify_webhook_no_match(mode, token, expected):
    assert verify_webhook(mode, token, "DESAFIO", expected) is None


# ═══════════════════════════════════════════════════════════════════════════════
# check_signature
# ═══════════════════════════════════════════════════════════════════════════════

def _assinar(secret: str, raw: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def test_check_signature_valida():
    secret = "app_secret_conhecido"
    raw = b'{"object":"whatsapp_business_account"}'
    header = _assinar(secret, raw)
    assert check_signature(secret, raw, header) is True


def test_check_signature_invalida():
    secret = "app_secret_conhecido"
    raw = b'{"object":"whatsapp_business_account"}'
    # Assinatura calculada com outro secret -> deve falhar.
    header = _assinar("outro_secret", raw)
    assert check_signature(secret, raw, header) is False


def test_check_signature_corpo_adulterado():
    secret = "s"
    header = _assinar(secret, b"original")
    assert check_signature(secret, b"adulterado", header) is False


def test_check_signature_sem_header():
    assert check_signature("s", b"x", None) is False
    assert check_signature("s", b"x", "") is False


def test_check_signature_sem_secret():
    raw = b"x"
    assert check_signature("", raw, _assinar("s", raw)) is False


# ═══════════════════════════════════════════════════════════════════════════════
# parse_webhook
# ═══════════════════════════════════════════════════════════════════════════════

def test_parse_webhook_mensagens_e_statuses():
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WABA_ID_123",
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": "PHONE_123"},
                            "messages": [
                                {
                                    "id": "wamid.IN1",
                                    "from": "5511999999999",
                                    "type": "text",
                                    "text": {"body": "Olá, tenho interesse"},
                                    "timestamp": "1700000000",
                                }
                            ],
                            "statuses": [
                                {
                                    "id": "wamid.OUT1",
                                    "status": "delivered",
                                    "timestamp": "1700000001",
                                    "recipient_id": "5511999999999",
                                }
                            ],
                        }
                    }
                ],
            }
        ],
    }
    out = parse_webhook(payload)

    assert out["mensagens"] == [
        {
            "wamid": "wamid.IN1",
            "from": "5511999999999",
            "tipo": "text",
            "texto": "Olá, tenho interesse",
            "timestamp": "1700000000",
        }
    ]
    assert out["statuses"] == [
        {
            "wamid": "wamid.OUT1",
            "status": "delivered",
            "timestamp": "1700000001",
            "recipient": "5511999999999",
        }
    ]


def test_parse_webhook_mensagem_sem_texto():
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "id": "wamid.IMG",
                                    "from": "5511",
                                    "type": "image",
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    out = parse_webhook(payload)
    assert out["mensagens"][0]["texto"] is None
    assert out["mensagens"][0]["tipo"] == "image"
    assert out["statuses"] == []


def test_parse_webhook_tolerante_a_payload_vazio_ou_lixo():
    assert parse_webhook({}) == {"mensagens": [], "statuses": []}
    assert parse_webhook({"entry": None}) == {"mensagens": [], "statuses": []}
    assert parse_webhook(None) == {"mensagens": [], "statuses": []}  # type: ignore[arg-type]
    lixo = {"entry": ["x", {"changes": ["y", {"value": "z"}]}]}
    assert parse_webhook(lixo) == {"mensagens": [], "statuses": []}


# ═══════════════════════════════════════════════════════════════════════════════
# map_status_whatsapp
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("sent", "enviado"),
        ("delivered", "entregue"),
        ("read", "lido"),
        ("failed", "erro"),
        ("desconhecido", "desconhecido"),
        ("", ""),
    ],
)
def test_map_status_whatsapp(entrada, esperado):
    assert map_status_whatsapp(entrada) == esperado


# ═══════════════════════════════════════════════════════════════════════════════
# send_template / send_text — httpx MOCKADO (sem rede real)
# ═══════════════════════════════════════════════════════════════════════════════

def _mock_client(monkeypatch, handler):
    """Substitui httpx.AsyncClient por um cliente com MockTransport."""
    transport = httpx.MockTransport(handler)
    original_init = httpx.AsyncClient.__init__

    def patched_init(self, *args, **kwargs):
        kwargs["transport"] = transport
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched_init)


async def test_send_template_retorna_wamid(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado["url"] = str(request.url)
        capturado["auth"] = request.headers.get("Authorization")
        import json

        capturado["body"] = json.loads(request.content)
        return httpx.Response(200, json={"messages": [{"id": "wamid.TEMPLATE"}]})

    _mock_client(monkeypatch, handler)

    wamid = await send_template(
        phone_id="PHONE_123",
        token="TOKEN_ABC",
        to="5511999999999",
        template_name="boas_vindas",
        lang_code="pt_BR",
    )
    assert wamid == "wamid.TEMPLATE"
    assert capturado["url"] == f"{BASE}/{GRAPH_VERSION}/PHONE_123/messages"
    assert capturado["auth"] == "Bearer TOKEN_ABC"
    body = capturado["body"]
    assert body["messaging_product"] == "whatsapp"
    assert body["type"] == "template"
    assert body["template"]["name"] == "boas_vindas"
    assert body["template"]["language"] == {"code": "pt_BR"}
    assert "components" not in body["template"]


async def test_send_template_com_components(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        import json

        capturado["body"] = json.loads(request.content)
        return httpx.Response(200, json={"messages": [{"id": "wamid.X"}]})

    _mock_client(monkeypatch, handler)

    comps = [{"type": "body", "parameters": [{"type": "text", "text": "João"}]}]
    await send_template(
        phone_id="P",
        token="T",
        to="5511",
        template_name="t",
        components=comps,
    )
    assert capturado["body"]["template"]["components"] == comps


async def test_send_text_retorna_wamid(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        import json

        capturado["body"] = json.loads(request.content)
        return httpx.Response(200, json={"messages": [{"id": "wamid.TEXTO"}]})

    _mock_client(monkeypatch, handler)

    wamid = await send_text(
        phone_id="PHONE_123",
        token="TOKEN_ABC",
        to="5511999999999",
        body="Mensagem livre na janela de 24h",
    )
    assert wamid == "wamid.TEXTO"
    body = capturado["body"]
    assert body["type"] == "text"
    assert body["text"] == {"body": "Mensagem livre na janela de 24h"}


async def test_send_template_erro_http_vira_whatsapperror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": {"message": "Invalid template"}})

    _mock_client(monkeypatch, handler)

    with pytest.raises(WhatsAppError) as exc:
        await send_template(
            phone_id="P", token="T", to="5511", template_name="ruim"
        )
    assert "400" in str(exc.value)


async def test_send_text_resposta_inesperada_vira_whatsapperror(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        # 200 mas sem o campo messages -> resposta inesperada.
        return httpx.Response(200, json={"foo": "bar"})

    _mock_client(monkeypatch, handler)

    with pytest.raises(WhatsAppError):
        await send_text(phone_id="P", token="T", to="5511", body="x")
