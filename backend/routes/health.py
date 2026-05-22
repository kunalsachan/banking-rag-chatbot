"""
routes/health.py — GET /health

A lightweight liveness + readiness probe.
Render, load balancers, and uptime monitors all hit this endpoint.
Returns 200 when the API is operational, 503 when a dependency is down.
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get(
    "",
    summary="Health check",
    description="Returns API status and dependency health.",
)
async def health_check(request: Request) -> JSONResponse:
    """
    Liveness + readiness probe.

    Checks:
      • API is responding
      • ChromaDB vector store is accessible
      • Embedding model is loaded
    """
    checks: dict[str, str] = {}

    # Check ChromaDB
    try:
        vector_store = request.app.state.vector_store
        count = vector_store.count()
        checks["chromadb"] = f"ok ({count} chunks indexed)"
    except Exception as exc:
        checks["chromadb"] = f"error: {exc}"

    # Check embedder
    try:
        _ = request.app.state.embedder
        checks["embedder"] = "ok"
    except Exception as exc:
        checks["embedder"] = f"error: {exc}"

    all_ok = all("error" not in v for v in checks.values())

    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "status": "healthy" if all_ok else "degraded",
            "service": "GenAI Banking Support Chatbot API",
            "version": "1.0.0",
            "checks": checks,
        },
    )
