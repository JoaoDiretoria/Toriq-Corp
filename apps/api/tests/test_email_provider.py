"""Testes unitários da integração de email (sem rede, sem SMTP real).

Cobrem apenas as funções puras ``render_template`` e ``normalizar_supressao``.
O envio real (``enviar_email``) NÃO é exercido aqui — depende de SMTP e é
mockado nos testes de integração do router/serviço.
"""
from __future__ import annotations

from app.integrations.email_provider import normalizar_supressao, render_template


# ═══════════════════════════════════════════════════════════════════════════════
# render_template
# ═══════════════════════════════════════════════════════════════════════════════

def test_render_template_substitui_placeholder_simples():
    out = render_template("Olá {{nome}}!", {"nome": "Maria"})
    assert out == "Olá Maria!"


def test_render_template_tolera_espacos_internos():
    out = render_template("Olá {{ nome }}!", {"nome": "João"})
    assert out == "Olá João!"


def test_render_template_chave_ausente_vira_vazio():
    out = render_template("Olá {{nome}}, da {{empresa}}", {"nome": "Ana"})
    assert out == "Olá Ana, da "


def test_render_template_valor_none_vira_vazio():
    out = render_template("Telefone: {{telefone}}", {"telefone": None})
    assert out == "Telefone: "


def test_render_template_texto_none_retorna_vazio():
    assert render_template(None, {"nome": "Maria"}) == ""


def test_render_template_variaveis_vazias():
    assert render_template("Oi {{nome}}", {}) == "Oi "


def test_render_template_multiplos_placeholders():
    out = render_template(
        "{{ nome }} <{{email}}> — {{cidade}}/{{estado}}",
        {"nome": "Carlos", "email": "c@x.com", "cidade": "SP", "estado": "SP"},
    )
    assert out == "Carlos <c@x.com> — SP/SP"


def test_render_template_converte_valor_nao_string():
    out = render_template("Total: {{qtd}}", {"qtd": 42})
    assert out == "Total: 42"


def test_render_template_sem_placeholders():
    assert render_template("Texto sem variaveis", {"nome": "x"}) == "Texto sem variaveis"


# ═══════════════════════════════════════════════════════════════════════════════
# normalizar_supressao
# ═══════════════════════════════════════════════════════════════════════════════

def test_normalizar_supressao_email_minuscula_e_trim():
    assert normalizar_supressao("email", "  Foo@Bar.COM  ") == "foo@bar.com"


def test_normalizar_supressao_email_ja_normalizado():
    assert normalizar_supressao("email", "user@dominio.com") == "user@dominio.com"


def test_normalizar_supressao_telefone_so_digitos():
    assert normalizar_supressao("telefone", "+55 (11) 98765-4321") == "5511987654321"


def test_normalizar_supressao_telefone_vazio_sem_digitos():
    assert normalizar_supressao("telefone", "sem numero") == ""


def test_normalizar_supressao_outro_tipo_apenas_trim():
    assert normalizar_supressao("documento", "  ABC123  ") == "ABC123"
