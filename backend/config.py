"""
config.py — Centralised settings for the RAG backend.

All configuration is loaded from environment variables (via .env in
development, real env vars in production on Render).  Using
pydantic-settings gives us automatic type coercion, validation, and a
single source of truth across every module.
"""

from __future__ import annotations

from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ #
    #  LLM                                                                 #
    # ------------------------------------------------------------------ #
    gemini_api_key: str = Field(..., description="Google Gemini API key")
    gemini_model: str = Field(
        default="gemini-2.0-flash", description="Gemini model name"
    )

    # ------------------------------------------------------------------ #
    #  Groq (free fallback LLM)                                           #
    # ------------------------------------------------------------------ #
    groq_api_key: str = Field(default="", description="Groq API key (optional fallback)")
    groq_model: str = Field(default="llama-3.3-70b-versatile", description="Groq model")

    # ------------------------------------------------------------------ #
    #  ChromaDB                                                            #
    # ------------------------------------------------------------------ #
    chroma_mode: str = Field(default="local", description="'local' or 'remote'")
    chroma_persist_dir: str = Field(
        default="./data/chroma_db", description="On-disk ChromaDB path"
    )
    chroma_collection_name: str = Field(
        default="banking_docs", description="Default collection"
    )

    # ------------------------------------------------------------------ #
    #  Embeddings                                                          #
    # ------------------------------------------------------------------ #
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="HuggingFace embedding model",
    )

    # ------------------------------------------------------------------ #
    #  Chunking                                                            #
    # ------------------------------------------------------------------ #
    chunk_size: int = Field(default=500, ge=100, le=2000)
    chunk_overlap: int = Field(default=100, ge=0, le=500)

    # ------------------------------------------------------------------ #
    #  Retrieval                                                           #
    # ------------------------------------------------------------------ #
    top_k_results: int = Field(default=5, ge=1, le=20)

    # ------------------------------------------------------------------ #
    #  Upload                                                              #
    # ------------------------------------------------------------------ #
    max_upload_size_mb: int = Field(default=20)
    upload_dir: str = Field(default="./data/uploads")

    # ------------------------------------------------------------------ #
    #  CORS                                                                #
    # ------------------------------------------------------------------ #
    allowed_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins",
    )

    # ------------------------------------------------------------------ #
    #  Server                                                              #
    # ------------------------------------------------------------------ #
    port: int = Field(default=8000)
    log_level: str = Field(default="INFO")

    # ------------------------------------------------------------------ #
    #  Computed helpers                                                    #
    # ------------------------------------------------------------------ #
    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
