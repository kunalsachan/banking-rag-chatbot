"use client";

// ============================================================
// components/ChatWindow.tsx
// The main chat panel. Manages:
//   • Full message history (local state)
//   • Sending messages to POST /chat
//   • Simulated streaming-like reveal of the response
//   • Auto-scroll to latest message
//   • Welcome empty state
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Sparkles } from "lucide-react";
import { generateId } from "@/lib/utils";
import { sendChatMessage } from "@/services/api";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import type { Message, UploadedDocument } from "@/types";

interface ChatWindowProps {
  documents: UploadedDocument[];
  pendingMessage: string | null;
  onPendingMessageConsumed: () => void;
  sessionId: string;
}

export default function ChatWindow({
  documents,
  pendingMessage,
  onPendingMessageConsumed,
  sessionId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasDocuments = documents.length > 0;

  // ── Auto-scroll to bottom on new messages ── //
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // ── Consume suggested question from sidebar ── //
  useEffect(() => {
    if (pendingMessage) {
      setInputValue(pendingMessage);
      onPendingMessageConsumed();
    }
  }, [pendingMessage, onPendingMessageConsumed]);

  // ── Core: send message → RAG → display ── //
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    setError(null);

    // Append user message immediately
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build history for the API (last 6 turns to stay within token limits)
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendChatMessage({
        message: text,
        session_id: sessionId,
        history,
      });

      // Simulate a streaming-like word-by-word reveal
      const words = response.answer.split(" ");
      const assistantMsgId = generateId();

      // Insert a blank assistant message placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          sources: response.sources,
        },
      ]);

      // Reveal words progressively
      for (let i = 0; i < words.length; i++) {
        await sleep(18); // ~18ms per word ≈ fast, natural feel
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: words.slice(0, i + 1).join(" ") }
              : m
          )
        );
      }
    } catch (err) {
      // Extract a clean, short error message — never dump raw JSON into the chat
      let msg = "Something went wrong. Please try again.";
      if (err instanceof Error) {
        // Take only the first sentence so massive quota error blobs don't show
        msg = err.message.split(".")[0].trim() + ".";
        if (msg.length > 200) msg = msg.slice(0, 197) + "…";
      }
      setError(msg);

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: msg,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, sessionId]);

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 gap-4">
      {/* ── Chat header ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Banking Support Chat
          </h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* ── Message list ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 min-h-0"
      >
        {messages.length === 0 ? (
          <EmptyState hasDocuments={hasDocuments} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
      </div>

      {/* ── Input bar ── */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        isLoading={isLoading}
        disabled={!hasDocuments}
      />
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Empty state shown before any messages are sent                     //
// ------------------------------------------------------------------ //

function EmptyState({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
        <Bot className="w-8 h-8 text-blue-400" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold text-slate-200">
          {hasDocuments
            ? "Ready to answer your questions"
            : "Upload a document to get started"}
        </h3>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          {hasDocuments
            ? "Ask me anything about the uploaded banking documents. I'll find the most relevant information for you."
            : "Upload a PDF or TXT file from the left panel. The AI will read, understand, and answer questions about it."}
        </p>
      </div>

      {hasDocuments && (
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {[
            "What are the loan requirements?",
            "Explain the fee structure",
            "How do I close my account?",
          ].map((hint) => (
            <span
              key={hint}
              className="text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-slate-400"
            >
              {hint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Helpers                                                             //
// ------------------------------------------------------------------ //

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
