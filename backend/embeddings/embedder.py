"""
embeddings/embedder.py — Sentence-transformer embedding wrapper.

Wraps HuggingFace sentence-transformers so the rest of the codebase
never directly imports the library.  This makes it trivial to swap the
model (e.g. to OpenAI embeddings) by changing only this file.

Model: sentence-transformers/all-MiniLM-L6-v2
  • 384-dimensional embeddings
  • ~22M parameters — fast on CPU
  • Excellent semantic similarity performance for English text
  • Apache 2.0 licence — free for commercial use
"""

from __future__ import annotations

import numpy as np
from loguru import logger
from sentence_transformers import SentenceTransformer


class Embedder:
    """Thin wrapper around SentenceTransformer for consistent embedding calls."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        logger.info(f"Loading SentenceTransformer: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        # get_embedding_dimension() is the new name; fall back for older versions
        self.dimension = (
            self.model.get_embedding_dimension()
            if hasattr(self.model, "get_embedding_dimension")
            else self.model.get_sentence_embedding_dimension()
        )
        logger.info(f"Embedder ready — dimension={self.dimension}")

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def embed_single(self, text: str) -> list[float]:
        """
        Embed a single string.

        Returns:
            A list of floats (length = self.dimension).
        """
        if not text.strip():
            raise ValueError("Cannot embed an empty string.")

        embedding: np.ndarray = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True,  # L2-normalise → cosine = dot product
        )
        return embedding.tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """
        Embed a list of strings efficiently in batches.

        Args:
            texts:      List of strings to embed.
            batch_size: How many strings to process per GPU/CPU batch.

        Returns:
            List of embedding vectors (each a list of floats).
        """
        if not texts:
            return []

        # Filter out empty strings (would cause errors downstream)
        cleaned = [t if t.strip() else " " for t in texts]

        embeddings: np.ndarray = self.model.encode(
            cleaned,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=len(cleaned) > 100,
        )
        return embeddings.tolist()
