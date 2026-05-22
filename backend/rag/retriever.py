"""
rag/retriever.py — Semantic retrieval from ChromaDB.

Given a user query string:
  1. Embed the query with the same model used at ingestion time
  2. Run a cosine-similarity search in ChromaDB
  3. Return the top-K chunks with their metadata

Keeping the Retriever as a thin class (not a giant function) makes it
easy to swap ChromaDB for another vector DB later without touching any
route code.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from embeddings.embedder import Embedder
    from vectorstore.chroma_store import ChromaVectorStore


class RAGRetriever:
    """Retrieve the top-K most relevant chunks for a query."""

    def __init__(
        self,
        vector_store: "ChromaVectorStore",
        embedder: "Embedder",
        top_k: int = 5,
    ) -> None:
        self.vector_store = vector_store
        self.embedder = embedder
        self.top_k = top_k

    def retrieve(self, query: str) -> list[dict]:
        """
        Embed the query and return top-K matching chunks.

        Returns:
            List of dicts, each containing:
              - content      (str)   : chunk text
              - document_id  (str)   : source document UUID
              - filename     (str)   : original uploaded filename
              - chunk_index  (int)   : position in original document
              - score        (float) : cosine distance (lower = more similar)
        """
        if not query.strip():
            logger.warning("Empty query received — returning empty results")
            return []

        logger.debug(f"Embedding query: {query[:80]!r}")
        query_embedding = self.embedder.embed_single(query)

        results = self.vector_store.query(
            query_embedding=query_embedding,
            n_results=self.top_k,
        )

        chunks = []
        for i, (doc, metadata, distance) in enumerate(
            zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ):
            chunks.append(
                {
                    "content": doc,
                    "document_id": metadata.get("document_id", "unknown"),
                    "filename": metadata.get("filename", "unknown"),
                    "chunk_index": metadata.get("chunk_index", i),
                    "score": round(distance, 4),
                }
            )

        logger.debug(f"Retrieved {len(chunks)} chunks for query")
        return chunks
