"""
routes/upload.py — POST /upload

Accepts PDF or TXT files, runs the full ingestion pipeline:
  1. Save file to disk
  2. Extract raw text (PDF parser or plain-text read)
  3. Chunk with overlap using LangChain's RecursiveCharacterTextSplitter
  4. Embed chunks with sentence-transformers
  5. Upsert chunk embeddings into ChromaDB

Returns document metadata and chunk statistics so the frontend can
give the user immediate feedback.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from loguru import logger

from config import get_settings
from rag.ingestion import DocumentIngestionPipeline

router = APIRouter()
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".txt"}


@router.post(
    "",
    summary="Upload a document",
    description=(
        "Upload a PDF or TXT file. The backend will parse, chunk, embed, "
        "and store the document in ChromaDB for retrieval."
    ),
)
async def upload_document(
    request: Request,
    file: UploadFile = File(..., description="PDF or TXT file to ingest"),
) -> JSONResponse:
    """
    Full document ingestion endpoint.

    Steps performed:
      • Validate file type and size
      • Save to disk under data/uploads/
      • Parse → chunk → embed → store in ChromaDB
      • Return chunk count and document_id for the frontend
    """
    # ---- Validation -------------------------------------------------- #
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{suffix}'. Only PDF and TXT are accepted.",
        )

    content = await file.read()

    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File too large ({len(content) / 1_048_576:.1f} MB). "
                f"Max allowed: {settings.max_upload_size_mb} MB."
            ),
        )

    if len(content) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    # ---- Persist file ------------------------------------------------- #
    document_id = str(uuid.uuid4())
    safe_name = f"{document_id}{suffix}"
    save_path = Path(settings.upload_dir) / safe_name

    save_path.write_bytes(content)
    logger.info(f"Saved upload: {save_path} ({len(content):,} bytes)")

    # ---- Ingestion pipeline ------------------------------------------ #
    try:
        pipeline = DocumentIngestionPipeline(
            vector_store=request.app.state.vector_store,
            embedder=request.app.state.embedder,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        result = pipeline.ingest(
            file_path=str(save_path),
            document_id=document_id,
            original_filename=file.filename or safe_name,
        )
    except Exception as exc:
        logger.exception(f"Ingestion failed for {file.filename}: {exc}")
        # Clean up the saved file on failure
        save_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=f"Document ingestion failed: {exc}",
        )

    logger.info(
        f"Ingested '{file.filename}' → {result['chunk_count']} chunks "
        f"(document_id={document_id})"
    )

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "document_id": document_id,
            "filename": file.filename,
            "file_size_bytes": len(content),
            "chunk_count": result["chunk_count"],
            "message": (
                f"'{file.filename}' successfully ingested into the knowledge base "
                f"({result['chunk_count']} chunks indexed)."
            ),
        },
    )
