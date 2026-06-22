"""Testes do casamento de telefone BR no inbound do Evolution (telefone_chave).

O webhook entrega o número do remetente COM código de país (55) e, dependendo do
aparelho/registro, COM ou SEM o 9º dígito de celular. Os leads no banco são
salvos em formatos variados (com/sem 55, com/sem o 9). `telefone_chave` produz
uma chave canônica para que esses formatos casem entre si.
"""
import pytest

from app.integrations.evolution_api import telefone_chave


@pytest.mark.parametrize(
    "entrada",
    [
        "+55 (11) 99045-0386",   # formato humano com 55 e 9
        "5511990450386",          # dígitos com 55 e 9
        "11990450386",            # sem 55, com 9
        "1190450386",             # sem 55, sem 9 (formato antigo)
        "5511990450386@s.whatsapp.net",  # JID cru
    ],
)
def test_telefone_chave_canoniza_variacoes_celular_br(entrada):
    assert telefone_chave(entrada) == "1190450386"


def test_telefone_chave_fixo_sem_nono_digito():
    # Fixo (8 dígitos) não tem 9º dígito — só remove o 55.
    assert telefone_chave("+55 (11) 4374-7459") == "1143747459"
    assert telefone_chave("551143747459") == "1143747459"
    assert telefone_chave("1143747459") == "1143747459"


def test_telefone_chave_vazio_ou_none():
    assert telefone_chave("") == ""
    assert telefone_chave(None) == ""


def test_telefone_chave_celulares_diferentes_nao_colidem():
    assert telefone_chave("11990450386") != telefone_chave("11990450387")
