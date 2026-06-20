"""Testes das funções PURAS do cliente Evolution (sem rede)."""
from app.integrations.evolution_api import (
    map_status,
    normalizar_telefone,
    parse_webhook,
)


def test_normalizar_telefone_remove_sufixo_e_nao_digitos():
    assert normalizar_telefone("5511999990000@s.whatsapp.net") == "5511999990000"
    assert normalizar_telefone("+55 (11) 99999-0000") == "5511999990000"


def test_parse_webhook_inbound_texto():
    payload = {
        "event": "messages.upsert",
        "instance": "emp_abc123_vendas",
        "data": {
            "key": {
                "remoteJid": "5511999990000@s.whatsapp.net",
                "fromMe": False,
                "id": "MSGID1",
            },
            "pushName": "Fulano",
            "message": {"conversation": "olá, tenho interesse"},
            "messageTimestamp": 1700000000,
        },
    }
    out = parse_webhook(payload)
    assert out["instance"] == "emp_abc123_vendas"
    assert len(out["mensagens"]) == 1
    m = out["mensagens"][0]
    assert m["from"] == "5511999990000"
    assert m["texto"] == "olá, tenho interesse"
    assert m["pushName"] == "Fulano"
    assert out["conexao"] is None


def test_parse_webhook_ignora_from_me():
    payload = {
        "event": "messages.upsert",
        "instance": "i",
        "data": {
            "key": {"remoteJid": "551199@s.whatsapp.net", "fromMe": True, "id": "X"},
            "message": {"conversation": "resposta nossa"},
        },
    }
    assert parse_webhook(payload)["mensagens"] == []


def test_parse_webhook_extended_text():
    payload = {
        "event": "messages.upsert",
        "instance": "i",
        "data": {
            "key": {"remoteJid": "551199@s.whatsapp.net", "fromMe": False, "id": "Y"},
            "message": {"extendedTextMessage": {"text": "com link"}},
        },
    }
    assert parse_webhook(payload)["mensagens"][0]["texto"] == "com link"


def test_parse_webhook_connection_update():
    payload = {
        "event": "connection.update",
        "instance": "i",
        "data": {"state": "open"},
    }
    out = parse_webhook(payload)
    assert out["conexao"] == {"state": "open"}
    assert out["mensagens"] == []


def test_parse_webhook_tolerante_a_lixo():
    assert parse_webhook(None) == {
        "mensagens": [], "statuses": [], "conexao": None, "instance": None
    }


def test_map_status():
    assert map_status("DELIVERY_ACK") == "entregue"
    assert map_status("READ") == "lido"
    assert map_status("desconhecido") == "desconhecido"
