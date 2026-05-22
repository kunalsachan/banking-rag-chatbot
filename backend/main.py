"""
main.py — FastAPI application entry point.

Responsibilities:
  • Bootstrap the FastAPI app with metadata, CORS, and global error handling.
  • Register all route modules (upload, chat, health).
  • Wire up lifespan events so ChromaDB + embedding model warm up ONCE
    at startup rather than on every request.
  • Expose the ASGI `app` object that uvicorn (and Render) consume.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from config import get_settings
from routes import chat, health, upload
from vectorstore.chroma_store import ChromaVectorStore
from embeddings.embedder import Embedder

# ------------------------------------------------------------------ #
#  Startup / shutdown lifespan                                         #
# ------------------------------------------------------------------ #

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager — runs once on startup and once on shutdown.
    We initialise the heavy objects here and attach them to app.state so
    every route handler can access them without re-creating them.
    """
    settings = get_settings()

    logger.info("🚀 Banking RAG Chatbot API starting …")

    # Create required directories
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.chroma_persist_dir, exist_ok=True)

    # Warm up embedding model (downloads weights on first run)
    logger.info(f"Loading embedding model: {settings.embedding_model}")
    embedder = Embedder(model_name=settings.embedding_model)
    app.state.embedder = embedder
    logger.info("✅ Embedding model ready")

    # Initialise ChromaDB vector store
    logger.info("Connecting to ChromaDB …")
    vector_store = ChromaVectorStore(
        persist_dir=settings.chroma_persist_dir,
        collection_name=settings.chroma_collection_name,
        embedder=embedder,
    )
    app.state.vector_store = vector_store
    logger.info("✅ ChromaDB ready")

    logger.info("✅ All systems go — API is ready to serve requests")

    yield  # ← application runs here

    # Shutdown
    logger.info("🛑 Shutting down Banking RAG Chatbot API …")


# ------------------------------------------------------------------ #
#  App instantiation                                                   #
# ------------------------------------------------------------------ #

settings = get_settings()

app = FastAPI(
    title="GenAI Banking Support Chatbot API",
    description=(
        "Production-grade RAG chatbot for banking support. "
        "Supports PDF/TXT document ingestion, semantic retrieval via ChromaDB, "
        "and grounded response generation via Gemini 1.5 Flash."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ------------------------------------------------------------------ #
#  CORS                                                                #
# ------------------------------------------------------------------ #

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  Global error handlers                                               #
# ------------------------------------------------------------------ #

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler so the API always returns structured JSON errors."""
    logger.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again.",
            "detail": str(exc),
        },
    )


# ------------------------------------------------------------------ #
#  Route registration                                                  #
# ------------------------------------------------------------------ #

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(upload.router, prefix="/upload", tags=["Documents"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])


# ------------------------------------------------------------------ #
#  Dev entrypoint                                                      #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
