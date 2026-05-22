"use client";

// ============================================================
// components/ChatInput.tsx
// The message input bar at the bottom of the chat window.
// Supports:
//   • Multi-line textarea (grows as user types)
//   • Send on Enter (Shift+Enter for newline)
//   • Disabled state while the assistant is responding
//   • Character counter
// ============================================================

import { useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX_CHARS) {
      onChange(e.target.value);
    }
  }

  function handleSend() {
    if (!value.trim() || isLoading || disabled) return;
    onSend();
  }

  const canSend = value.trim().length > 0 && !isLoading && !disabled;
  const charsLeft = MAX_CHARS - value.length;
  const isNearLimit = charsLeft < 200;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3 glass-card p-3">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Upload a document first to start chatting…"
              : "Ask me about your account, loans, credit cards…"
          }
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            "chat-input flex-1",
            "min-h-[44px] max-h-[160px]",
            (isLoading || disabled) && "opacity-60 cursor-not-allowed"
          )}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="btn-primary flex-shrink-0 h-[44px] w-[44px] p-0 justify-center"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Hints row */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-slate-600">
          Press <kbd className="text-slate-500 font-mono bg-slate-800 px-1 rounded">Enter</kbd> to send,{" "}
          <kbd className="text-slate-500 font-mono bg-slate-800 px-1 rounded">Shift+Enter</kbd> for a new line
        </p>
        {isNearLimit && (
          <p
            className={cn(
              "text-[11px]",
              charsLeft < 50 ? "text-red-400" : "text-yellow-500"
            )}
          >
            {charsLeft} chars left
          </p>
        )}
      </div>
    </div>
  );
}
