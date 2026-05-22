"""
utils/logger.py — Loguru configuration.

Loguru is a drop-in replacement for Python's logging module with:
  • Structured log output
  • Automatic exception traceback formatting
  • Simple log-level configuration

Call configure_logging() once from main.py (or import this module).
"""

from __future__ import annotations

import sys
from loguru import logger


def configure_logging(level: str = "INFO") -> None:
    """
    Set up Loguru with a clean console format.

    Args:
        level: Log level string — DEBUG, INFO, WARNING, ERROR, CRITICAL.
    """
    logger.remove()  # Remove default handler

    logger.add(
        sys.stdout,
        level=level.upper(),
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> — "
            "<level>{message}</level>"
        ),
        colorize=True,
        backtrace=True,
        diagnose=True,
    )

    logger.info(f"Logging configured at level={level.upper()}")
