// ============================================================
// types/index.ts — Shared TypeScript interfaces for the entire app
// ============================================================

/** A single chat message in the conversation */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceChunk[];
  isLoading?: boolean; // true while the assistant is "typing"
  isError?: boolean;   // true when this message represents an error
}

/** A retrieved source chunk returned by the RAG backend */
export interface SourceChunk {
  document_id: string;
  filename: string;
  chunk_index: number;
  content_preview: string;
}

/** POST /chat — request body */
export interface ChatRequest {
  message: string;
  session_id: string;
  history: { role: string; content: string }[];
}

/** POST /chat — response body */
export interface ChatResponse {
  answer: string;
  session_id: string;
  sources: SourceChunk[];
  retrieval_count: number;
}

/** POST /upload — response body */
export interface UploadResponse {
  success: boolean;
  document_id: string;
  filename: string;
  file_size_bytes: number;
  chunk_count: number;
  message: string;
}

/** GET /health — response body */
export interface HealthResponse {
  status: "healthy" | "degraded";
  service: string;
  version: string;
  checks: Record<string, string>;
}

/** An uploaded document shown in the sidebar */
export interface UploadedDocument {
  document_id: string;
  filename: string;
  chunk_count: number;
  uploaded_at: Date;
  file_size_bytes: number;
}
