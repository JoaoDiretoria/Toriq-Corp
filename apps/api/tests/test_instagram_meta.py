import httpx
import pytest

from app.integrations import instagram_meta as ig


def test_parse_webhook_extrai_comentario():
    payload = {
        "entry": [
            {
                "id": "17841400000000000",
                "changes": [
                    {
                        "field": "comments",
                        "value": {
                            "id": "comment_1",
                            "parent_id": None,
                            "media": {"id": "media_9"},
                            "from": {"id": "user_5", "username": "fulano"},
                            "text": "qual o PRECO?",
                            "timestamp": "1700000000",
                        },
                    }
                ],
            }
        ]
    }
    out = ig.parse_webhook(payload)
    assert len(out) == 1
    c = out[0]
    assert c["comment_id"] == "comment_1"
    assert c["media_id"] == "media_9"
    assert c["from_id"] == "user_5"
    assert c["from_username"] == "fulano"
    assert c["texto"] == "qual o PRECO?"


def test_parse_webhook_tolerante_a_campos_faltando():
    assert ig.parse_webhook({}) == []
    assert ig.parse_webhook({"entry": [{"changes": [{"field": "comments", "value": {}}]}]})[0]["comment_id"] is None
    # Ignora changes que não são de comentário.
    assert ig.parse_webhook({"entry": [{"changes": [{"field": "mentions", "value": {"id": "x"}}]}]}) == []


@pytest.mark.asyncio
async def test_reply_public_monta_post(monkeypatch):
    capturado = {}

    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"id": "reply_99"}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json, headers):
            capturado["url"] = url
            capturado["json"] = json
            capturado["headers"] = headers
            return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    rid = await ig.reply_public(token="tok", comment_id="comment_1", message="oi!")
    assert rid == "reply_99"
    assert capturado["url"].endswith("/comment_1/replies")
    assert capturado["json"] == {"message": "oi!"}
    assert capturado["headers"]["Authorization"] == "Bearer tok"


@pytest.mark.asyncio
async def test_send_private_reply_monta_payload(monkeypatch):
    capturado = {}

    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"message_id": "mid_1"}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, json, headers):
            capturado["url"] = url
            capturado["json"] = json
            return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    mid = await ig.send_private_reply(token="tok", ig_user_id="ig_1", comment_id="comment_1", message="no direct!")
    assert mid == "mid_1"
    assert capturado["url"].endswith("/ig_1/messages")
    assert capturado["json"]["recipient"] == {"comment_id": "comment_1"}
    assert capturado["json"]["message"] == {"text": "no direct!"}


@pytest.mark.asyncio
async def test_reply_public_erro_http_vira_InstagramError(monkeypatch):
    class _Resp:
        status_code = 400
        text = "bad"
        def raise_for_status(self):
            raise httpx.HTTPStatusError("bad", request=None, response=self)
        def json(self): return {}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, *a, **k): return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    with pytest.raises(ig.InstagramError):
        await ig.reply_public(token="tok", comment_id="c", message="x")


@pytest.mark.asyncio
async def test_list_comentarios_parse(monkeypatch):
    capt = {}

    class _Resp:
        def raise_for_status(self): pass
        def json(self): return {"data": [
            {"id": "c1", "text": "oi", "username": "fulano", "timestamp": "2026-01-01"},
            {"id": "c2"},
        ]}

    class _Client:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def get(self, url, params):
            capt["url"] = url; capt["params"] = params
            return _Resp()

    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    out = await ig.list_comentarios(token="tok", media_id="m1")
    assert capt["url"].endswith("/m1/comments")
    assert capt["params"]["access_token"] == "tok"
    assert out[0] == {"id": "c1", "text": "oi", "username": "fulano", "timestamp": "2026-01-01"}
    assert out[1] == {"id": "c2", "text": None, "username": None, "timestamp": None}
