"""Tests for sanitized error handling in getit routes."""

import httpx

from app.api.routes.getit import _safe_resy_error


def _make_http_status_error(status_code: int, reason_phrase: str) -> httpx.HTTPStatusError:
    """Build a minimal HTTPStatusError for testing."""
    request = httpx.Request("GET", "https://api.resy.com/test")
    response = httpx.Response(status_code=status_code, request=request)
    # httpx sets reason_phrase from status_code; override via __dict__ for custom phrases
    response.__dict__["_reason_phrase"] = reason_phrase  # type: ignore[assignment]
    return httpx.HTTPStatusError(
        message=f"{status_code} {reason_phrase}",
        request=request,
        response=response,
    )


class TestSafeResyError:
    def test_http_status_error_exposes_code_and_phrase(self):
        exc = _make_http_status_error(401, "Unauthorized")
        result = _safe_resy_error(exc)
        assert "401" in result
        assert "Unauthorized" in result

    def test_http_status_error_502(self):
        exc = _make_http_status_error(502, "Bad Gateway")
        result = _safe_resy_error(exc)
        assert "502" in result
        assert "Bad Gateway" in result

    def test_http_status_error_does_not_include_response_body(self):
        """Sensitive Resy response body must not leak into the user-facing message."""
        request = httpx.Request("POST", "https://api.resy.com/4/auth/password")
        response = httpx.Response(
            status_code=401,
            content=b'{"message":"invalid_credentials","user_id":99,"internal_token":"secret"}',
            request=request,
        )
        exc = httpx.HTTPStatusError(
            message="401 Unauthorized",
            request=request,
            response=response,
        )
        result = _safe_resy_error(exc)
        # Response body details must not appear in the user-facing string
        assert "invalid_credentials" not in result
        assert "internal_token" not in result
        assert "secret" not in result
        assert "user_id" not in result

    def test_generic_exception_returns_safe_fallback(self):
        exc = ValueError("internal connection pool state leaked")
        result = _safe_resy_error(exc)
        assert "internal connection pool state leaked" not in result
        assert "Resy API request failed" == result

    def test_timeout_exception_returns_safe_fallback(self):
        exc = httpx.TimeoutException("read timed out after 15 seconds")
        result = _safe_resy_error(exc)
        assert "read timed out" not in result
        assert result == "Resy API request failed"

    def test_result_is_string(self):
        exc = _make_http_status_error(404, "Not Found")
        assert isinstance(_safe_resy_error(exc), str)

    def test_empty_reason_phrase_does_not_crash(self):
        """Handle edge case where reason_phrase might be empty."""
        exc = _make_http_status_error(599, "")
        result = _safe_resy_error(exc)
        assert "599" in result
        assert isinstance(result, str)
