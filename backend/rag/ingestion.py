"""
rag/ingestion.py — Document ingestion pipeline.

Responsibilities:
  1. Parse raw file bytes into plain text (PDF via pypdf, TXT direct read)
  2. Split text into overlapping chunks using LangChain's
     RecursiveCharacterTextSplitter (chunk_size=500, chunk_overlap=100)
  3. Embed each chunk via the Embedder
  4. Upsert chunk vectors + metadata into ChromaDB

Design decisions:
  • Chunks store (document_id, filename, chunk_index) metadata so every
    retrieved chunk can be traced back to its source document.
  • We use RecursiveCharacterTextSplitter because it respects paragraph /
    sentence / word boundaries before falling back to character splits —
    this keeps semantic coherence inside each chunk.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING

from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger

if TYPE_CHECKING:
    from embeddings.embedder import Embedder
    from vectorstore.chroma_store import ChromaVectorStore


class DocumentIngestionPipeline:
    """Orchestrates parse → chunk → embed → store for a single document."""

    def __init__(
        self,
        vector_store: "ChromaVectorStore",
        embedder: "Embedder",
        chunk_size: int = 500,
        chunk_overlap: int = 100,
    ) -> None:
        self.vector_store = vector_store
        self.embedder = embedder
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def ingest(
        self,
        file_path: str,
        document_id: str,
        original_filename: str,
    ) -> dict:
        """
        Full ingestion pipeline.

        Returns:
            dict with keys: document_id, chunk_count
        """
        path = Path(file_path)
        suffix = path.suffix.lower()

        logger.info(f"Parsing '{original_filename}' (type={suffix}) …")

        if suffix == ".pdf":
            raw_text = self._parse_pdf(path)
        elif suffix == ".txt":
            raw_text = self._parse_txt(path)
        else:
            raise ValueError(f"Unsupported file type: {suffix}")

        if not raw_text.strip():
            raise ValueError("Document produced no extractable text.")

        # Normalise whitespace
        raw_text = self._clean_text(raw_text)

        logger.info(f"Extracted {len(raw_text):,} characters from '{original_filename}'")

        # Chunk
        chunks = self.splitter.split_text(raw_text)
        logger.info(f"Split into {len(chunks)} chunks")

        # Embed + store
        self._embed_and_store(chunks, document_id, original_filename)

        return {"document_id": document_id, "chunk_count": len(chunks)}

    # ------------------------------------------------------------------ #
    #  Parsing helpers                                                     #
    # ------------------------------------------------------------------ #

    def _parse_pdf(self, path: Path) -> str:
        """Extract text from every page of a PDF using pypdf."""
        try:
            from pypdf import PdfReader  # local import — pypdf is optional dep
        except ImportError as e:
            raise RuntimeError("pypdf is required for PDF parsing.") from e

        reader = PdfReader(str(path))
        pages: list[str] = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"[Page {page_num}]\n{text}")
        return "\n\n".join(pages)

    def _parse_txt(self, path: Path) -> str:
        """Read plain-text file with UTF-8 (fallback latin-1)."""
        try:
            return path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return path.read_text(encoding="latin-1")

    def _clean_text(self, text: str) -> str:
        """Normalise whitespace and remove junk characters."""
        # Collapse multiple blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Collapse multiple spaces
        text = re.sub(r" {2,}", " ", text)
        return text.strip()

    # ------------------------------------------------------------------ #
    #  Embed + upsert                                                      #
    # ------------------------------------------------------------------ #

    def _embed_and_store(
        self,
        chunks: list[str],
        document_id: str,
        filename: str,
    ) -> None:
        """Embed all chunks and upsert into the vector store."""
        if not chunks:
            return

        embeddings = self.embedder.embed_batch(chunks)

        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "filename": filename,
                "chunk_index": i,
                "chunk_total": len(chunks),
            }
            for i in range(len(chunks))
        ]

        self.vector_store.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )
        logger.info(f"Upserted {len(chunks)} chunks into ChromaDB")
