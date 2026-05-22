"use client";

// ============================================================
// components/Sidebar.tsx
// Left panel of the chat UI. Contains:
//   • Brand logo + tagline
//   • File upload zone
//   • Uploaded documents list
//   • API health indicator
//   • Suggested questions
// ============================================================

import { useState, useEffect } from "react";
import {
  Landmark,
  Wifi,
  WifiOff,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { checkHealth } from "@/services/api";
import FileUpload from "./FileUpload";
import DocumentList from "./DocumentList";
import type { UploadedDocument } from "@/types";

const SUGGESTED_QUESTIONS = [
  "What are the eligibility criteria for a home loan?",
  "How do I dispute a transaction on my account?",
  "What is the interest rate on a savings account?",
  "How can I increase my credit card limit?",
  "What documents are needed to open a new account?",
];

interface SidebarProps {
  documents: UploadedDocument[];
  onUploadSuccess: (doc: UploadedDocument) => void;
  onSuggestedQuestion: (q: string) => void;
}

export default function Sidebar({
  documents,
  onUploadSuccess,
  onSuggestedQuestion,
}: SidebarProps) {
  const [apiStatus, setApiStatus] = useState<"checking" | "healthy" | "error">(
    "checking"
  );

  // Poll health endpoint every 30 seconds
  useEffect(() => {
    async function poll() {
      try {
        const h = await checkHealth();
        setApiStatus(h.status === "healthy" ? "healthy" : "error");
      } catch {
        setApiStatus("error");
      }
    }
    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex flex-col h-full w-72 flex-shrink-0 glass-card p-5 gap-6 overflow-y-auto">
      {/* ── Brand ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-glow">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold gradient-text leading-tight">
              BankBot AI
            </h1>
            <p className="text-[10px] text-slate-500">Banking Support Assistant</p>
          </div>
        </div>

        {/* API status pill */}
        <div className="flex items-center gap-1.5 mt-2">
          {apiStatus === "healthy" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400">API connected</span>
            </>
          ) : apiStatus === "error" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <WifiOff className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400">API unreachable</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
              <span className="text-[10px] text-slate-500">Checking API…</span>
            </>
          )}
        </div>
      </div>

      <Divider />

      {/* ── Upload ── */}
      <FileUpload onUploadSuccess={onUploadSuccess} />

      <Divider />

      {/* ── Indexed documents ── */}
      <DocumentList documents={documents} />

      <Divider />

      {/* ── Suggested questions ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Try asking
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onSuggestedQuestion(q)}
              className="group flex items-start gap-2 text-left text-[11px] text-slate-500
                         hover:text-slate-200 transition-colors py-1.5 rounded-lg
                         hover:bg-slate-700/40 px-2 -mx-2"
            >
              <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Push footer to bottom */}
      <div className="mt-auto pt-4 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-700 text-center leading-relaxed">
          Powered by Gemini 1.5 Flash · ChromaDB · sentence-transformers
        </p>
      </div>
    </aside>
  );
}

function Divider() {
  return <hr className="border-slate-700/50" />;
}
