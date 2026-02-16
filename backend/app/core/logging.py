"""Logging configuration with correlation ID tracking, file + console handlers."""

import logging
import logging.handlers
import os
import sys
from contextvars import ContextVar
from pathlib import Path

# Context variable holding the current request's correlation ID.
correlation_id_ctx: ContextVar[str] = ContextVar("agi_correlation_id", default="-")

LOG_DIR = Path(os.getenv("LOG_DIR", "logs"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


class CorrelationIdFilter(logging.Filter):
    """Inject ``agi_correlation_id`` into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.agi_correlation_id = correlation_id_ctx.get("-")  # type: ignore[attr-defined]
        return True


# ── Formatters ────────────────────────────────────────────────

FILE_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(agi_correlation_id)s "
    "| %(name)s:%(funcName)s:%(lineno)d | %(message)s"
)

CONSOLE_FORMAT = (
    "\033[2m%(asctime)s\033[0m "           # dim timestamp
    "%(levelcolor)s%(levelname)-8s\033[0m " # colored level
    "\033[36m%(agi_correlation_id)s\033[0m " # cyan correlation id
    "\033[2m%(name)s:%(funcName)s:%(lineno)d\033[0m " # dim location
    "%(message)s"
)

LEVEL_COLORS = {
    "DEBUG": "\033[34m",     # blue
    "INFO": "\033[32m",      # green
    "WARNING": "\033[33m",   # yellow
    "ERROR": "\033[31m",     # red
    "CRITICAL": "\033[1;31m",  # bold red
}


class ColorConsoleFormatter(logging.Formatter):
    """Formatter that injects ANSI color codes per log level."""

    def format(self, record: logging.LogRecord) -> str:
        record.levelcolor = LEVEL_COLORS.get(record.levelname, "")  # type: ignore[attr-defined]
        return super().format(record)


def setup_logging() -> None:
    """Configure root logger with file + console handlers."""
    root = logging.getLogger()
    root.setLevel(LOG_LEVEL)

    # Avoid duplicate handlers on reload
    if root.handlers:
        return

    correlation_filter = CorrelationIdFilter()

    # ── Console handler ───────────────────────────────────
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(LOG_LEVEL)
    console.setFormatter(ColorConsoleFormatter(CONSOLE_FORMAT, datefmt="%H:%M:%S"))
    console.addFilter(correlation_filter)
    root.addHandler(console)

    # ── File handler ──────────────────────────────────────
    LOG_DIR.mkdir(exist_ok=True)
    file_handler = logging.handlers.TimedRotatingFileHandler(
        LOG_DIR / "polyscoop.log",
        when="midnight",
        backupCount=14,
        encoding="utf-8",
    )
    file_handler.setLevel(LOG_LEVEL)
    file_handler.setFormatter(logging.Formatter(FILE_FORMAT, datefmt="%Y-%m-%d %H:%M:%S"))
    file_handler.addFilter(correlation_filter)
    root.addHandler(file_handler)

    # Quiet noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
