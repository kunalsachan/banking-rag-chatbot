// ============================================================
// services/api.ts — Typed API client for the FastAPI backend
//
// All backend communication is centralised here.
// Routes never call fetch() directly — they use this service.
// This makes it trivial to swap the base URL or add auth headers.
// ============================================================

import type {
  ChatRequest,
  ChatResponse,
  HealthResponse,
  UploadResponse,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ------------------------------------------------------------------ //
//  Internal helpers                                                    //
// ------------------------------------------------------------------ //

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      errorMessage = body.detail ?? body.message ?? errorMessage;
    } catch {
      // Body wasn't JSON — use the default message
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

// ------------------------------------------------------------------ //
//  Public API                                                          //
// ------------------------------------------------------------------ //

/**
 * POST /chat
 * Send a user message and receive a RAG-grounded answer.
 */
export async function sendChatMessage(
  payload: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<ChatResponse>(res);
}

/**
 * POST /upload
 * Upload a PDF or TXT file for ingestion into the knowledge base.
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
    // NOTE: do NOT set Content-Type here — the browser sets the correct
    // multipart/form-data boundary automatically.
  });
  return handleResponse<UploadResponse>(res);
}

/**
 * GET /health
 * Check whether the backend API and its dependencies are healthy.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`, {
    method: "GET",
    cache: "no-store",
  });
  return handleResponse<HealthResponse>(res);
}
