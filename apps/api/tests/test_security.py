from app.core.security import hash_password, verify_password


def test_hash_is_not_plaintext_and_verifies():
    h = hash_password("segredo123")
    assert h != "segredo123"
    assert verify_password("segredo123", h) is True
    assert verify_password("errada", h) is False
