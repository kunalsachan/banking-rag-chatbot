"use client";

// ============================================================
// app/page.tsx — Root page (the entire application)
//
// Layout:
//   ┌──────────────┬────────────────────────────┐
//   │   Sidebar    │        Chat Window         │
//   │  (fixed 288px)│      (flex-1)             │
//   └──────────────┴────────────────────────────┘
//
// State that spans both panels lives here and is passed down.
// ============================================================

import { useState, useCallback, useRef } from "react";
import { generateId } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import type { UploadedDocument } from "@/types";

export default function HomePage() {
  // Stable session ID for this browser tab
  const sessionId = useRef<string>(generateId()).current;

  // List of documents ingested this session
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  // A suggested question clicked in the sidebar gets injected into the chat
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleUploadSuccess = useCallback((doc: UploadedDocument) => {
    setDocuments((prev) => {
      // Avoid duplicates (e.g. same file re-uploaded)
      const exists = prev.some((d) => d.document_id === doc.document_id);
      return exists ? prev : [doc, ...prev];
    });
  }, []);

  const handleSuggestedQuestion = useCallback((question: string) => {
    setPendingMessage(question);
  }, []);

  const handlePendingConsumed = useCallback(() => {
    setPendingMessage(null);
  }, []);

  return (
    <main className="flex h-dvh w-full p-3 gap-3 bg-[#0a0f1e]">
      {/* Animated background gradient */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-700 rounded-full blur-[128px]" />
      </div>

      {/* Left panel */}
      <Sidebar
        documents={documents}
        onUploadSuccess={handleUploadSuccess}
        onSuggestedQuestion={handleSuggestedQuestion}
      />

      {/* Right panel */}
      <section className="flex flex-1 glass-card p-5 min-w-0">
        <ChatWindow
          documents={documents}
          pendingMessage={pendingMessage}
          onPendingMessageConsumed={handlePendingConsumed}
          sessionId={sessionId}
        />
      </section>
    </main>
  );
}
