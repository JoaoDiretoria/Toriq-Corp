"""Testes das funções PURAS do cliente Evolution Go (sem rede).

Payloads no formato do Evolution Go (whatsmeow): evento PascalCase em ``event``
e ``data`` = events.Message marshalado (``Info`` + ``Message``).
"""
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
        "event": "Message",
        "data": {
            "Info": {
                "ID": "MSGID1",
                "Sender": "5511999990000@s.whatsapp.net",
                "Chat": "5511999990000@s.whatsapp.net",
                "IsFromMe": False,
                "PushName": "Fulano",
            },
            "Message": {"conversation": "olá, tenho interesse"},
        },
    }
    out = parse_webhook(payload)
    assert len(out["mensagens"]) == 1
    m = out["mensagens"][0]
    assert m["from"] == "5511999990000"
    assert m["texto"] == "olá, tenho interesse"
    assert m["pushName"] == "Fulano"
    assert m["wamid"] == "MSGID1"
    assert out["conexao"] is None


def test_parse_webhook_jid_como_objeto_defensivo():
    # whatsmeow pode serializar o JID como objeto {User, Server, ...} em vez de string.
    payload = {
        "event": "Message",
        "data": {
            "Info": {
                "ID": "Z",
                "Sender": {"User": "5511988887777", "Server": "s.whatsapp.net"},
                "IsFromMe": False,
            },
            "Message": {"conversation": "oi"},
        },
    }
    out = parse_webhook(payload)
    assert out["mensagens"][0]["from"] == "5511988887777"


def test_parse_webhook_ignora_from_me():
    payload = {
        "event": "Message",
        "data": {
            "Info": {"ID": "X", "Sender": "551199@s.whatsapp.net", "IsFromMe": True},
            "Message": {"conversation": "resposta nossa"},
        },
    }
    assert parse_webhook(payload)["mensagens"] == []


def test_parse_webhook_extended_text():
    payload = {
        "event": "Message",
        "data": {
            "Info": {"ID": "Y", "Sender": "551199@s.whatsapp.net", "IsFromMe": False},
            "Message": {"extendedTextMessage": {"text": "com link"}},
        },
    }
    assert parse_webhook(payload)["mensagens"][0]["texto"] == "com link"


def test_parse_webhook_imagem_com_base64_inline():
    payload = {
        "event": "Message",
        "data": {
            "Info": {"ID": "IMG", "Sender": "551199@s.whatsapp.net", "IsFromMe": False},
            "Message": {
                "imageMessage": {"mimetype": "image/jpeg", "caption": "olha"},
                "base64": "QUJD",
            },
        },
    }
    m = parse_webhook(payload)["mensagens"][0]
    assert m["media"]["tipo"] == "image"
    assert m["media"]["mime_type"] == "image/jpeg"
    assert m["media"]["base64"] == "QUJD"
    assert m["media"]["media_id"] == "IMG"
    assert m["texto"] == "olha"  # cai no caption quando não há texto


def test_parse_webhook_midia_com_mediaurl():
    # Servidor com MinIO: vem URL em vez de base64.
    payload = {
        "event": "Message",
        "data": {
            "Info": {"ID": "DOC", "Sender": "551199@s.whatsapp.net", "IsFromMe": False},
            "Message": {
                "documentMessage": {"mimetype": "application/pdf", "fileName": "x.pdf"},
                "mediaUrl": "https://cdn/x.pdf",
            },
        },
    }
    m = parse_webhook(payload)["mensagens"][0]
    assert m["media"]["tipo"] == "document"
    assert m["media"]["url"] == "https://cdn/x.pdf"
    assert m["media"]["filename"] == "x.pdf"


def test_parse_webhook_connected():
    out = parse_webhook({"event": "Connected", "data": {}})
    assert out["conexao"] == {"state": "open"}
    assert out["mensagens"] == []


def test_parse_webhook_loggedout_e_disconnected_fecham():
    assert parse_webhook({"event": "LoggedOut", "data": {}})["conexao"] == {"state": "close"}
    assert parse_webhook({"event": "Disconnected", "data": {}})["conexao"] == {"state": "close"}


def test_parse_webhook_tolerante_a_lixo():
    assert parse_webhook(None) == {
        "mensagens": [], "statuses": [], "conexao": None, "instance": None
    }


def test_map_status():
    assert map_status("delivery") == "entregue"
    assert map_status("read") == "lido"
    assert map_status("played") == "lido"
    assert map_status("desconhecido") == "desconhecido"
