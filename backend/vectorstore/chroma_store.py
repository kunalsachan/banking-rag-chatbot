"""
vectorstore/chroma_store.py — ChromaDB vector store wrapper.

ChromaDB is an open-source, embedded vector database.  In "local" mode
it persists data to disk (no external service needed — perfect for Render
free tier).  The wrapper exposes a clean interface so swapping to Pinecone
or Weaviate later only requires replacing this file.

Key ChromaDB concepts used here:
  • Collection   — analogous to a table; holds vectors + metadata + documents
  • Upsert       — insert or update by ID (idempotent re-ingestion)
  • Query        — cosine similarity search returning top-N results
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import chromadb
from chromadb.config import Settings as ChromaSettings
from loguru import logger

if TYPE_CHECKING:
    from embeddings.embedder import Embedder


class ChromaVectorStore:
    """
    Wrapper around ChromaDB providing upsert and query operations.

    We use chromadb in *persistent client* mode so data survives restarts.
    The embedding function is handled externally (by our Embedder) rather
    than delegated to ChromaDB, giving us full control over batching.
    """

    def __init__(
        self,
        persist_dir: str,
        collection_name: str,
        embedder: "Embedder",
    ) -> None:
        self.embedder = embedder
        self.collection_name = collection_name

        os.makedirs(persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        # Get or create the collection.
        # We store embeddings ourselves (embedding_function=None) because
        # ChromaDB's built-in functions add unnecessary complexity.
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # cosine distance metric
        )

        logger.info(
            f"ChromaDB collection '{collection_name}' ready "
            f"({self.collection.count()} existing chunks)"
        )

    # ------------------------------------------------------------------ #
    #  Write operations                                                    #
    # ------------------------------------------------------------------ #

    def upsert(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict],
    ) -> None:
        """
        Insert or update chunks by ID.

        Idempotent — re-uploading the same document replaces existing chunks
        rather than creating duplicates.
        """
        if not ids:
            return

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.debug(f"Upserted {len(ids)} vectors into '{self.collection_name}'")

    # ------------------------------------------------------------------ #
    #  Read operations                                                     #
    # ------------------------------------------------------------------ #

    def query(
        self,
        query_embedding: list[float],
        n_results: int = 5,
    ) -> dict:
        """
        Run a cosine-similarity search and return top-N results.

        Returns the raw ChromaDB result dict:
          {
            'ids':        [[ id, ... ]],
            'documents':  [[ text, ... ]],
            'metadatas':  [[ {}, ... ]],
            'distances':  [[ float, ... ]],
          }
        """
        actual_count = self.collection.count()
        if actual_count == 0:
            # Return empty structure matching ChromaDB's shape
            return {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]],
            }

        # Cap n_results to collection size to avoid ChromaDB errors
        n_results = min(n_results, actual_count)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
        return results

    def count(self) -> int:
        """Return total number of chunks stored in the collection."""
        return self.collection.count()

    def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks belonging to a document.

        Returns the number of chunks deleted.
        """
        results = self.collection.get(
            where={"document_id": {"$eq": document_id}},
            include=[],
        )
        ids_to_delete = results["ids"]

        if ids_to_delete:
            self.collection.delete(ids=ids_to_delete)
            logger.info(
                f"Deleted {len(ids_to_delete)} chunks for document_id={document_id}"
            )

        return len(ids_to_delete)
