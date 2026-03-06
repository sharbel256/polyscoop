"""Fernet encryption for storing secrets at rest."""

from cryptography.fernet import Fernet

from app.core.config import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        if not settings.FERNET_KEY:
            raise RuntimeError("FERNET_KEY env var is not set")
        _fernet = Fernet(settings.FERNET_KEY.encode())
    return _fernet


def encrypt(plaintext: str) -> str:
    """Encrypt a string and return the Fernet token as a string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a Fernet token string back to plaintext."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
