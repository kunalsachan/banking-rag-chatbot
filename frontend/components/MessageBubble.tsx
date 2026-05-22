"use client";

// ============================================================
// components/MessageBubble.tsx
// Renders a single chat message — either user or assistant.
// Assistant messages support Markdown and show source citations.
// ============================================================

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, FileText, Clock, AlertTriangle } from "lucide-react";
import { cn, formatTime, truncate } from "@/lib/utils";
import type { Message, SourceChunk } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-slide-up",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar role={message.role} />

      {/* Bubble + sources */}
      <div
        className={cn(
          "flex flex-col gap-2",
          isUser ? "items-end" : "items-start",
          "max-w-[80%]"
        )}
      >
        {isUser ? (
          <UserBubble content={message.content} timestamp={message.timestamp} />
        ) : message.isError ? (
          <ErrorBubble content={message.content} timestamp={message.timestamp} />
        ) : (
          <AssistantBubble
            content={message.content}
            timestamp={message.timestamp}
            sources={message.sources}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Sub-components                                                      //
// ------------------------------------------------------------------ //

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
        <span className="text-slate-300 text-xs font-semibold">You</span>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-glow">
      <span className="text-white text-xs font-bold">AI</span>
    </div>
  );
}

function UserBubble({
  content,
  timestamp,
}: {
  content: string;
  timestamp: Date;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="message-bubble-user">{content}</div>
      <Timestamp date={timestamp} align="right" />
    </div>
  );
}

function AssistantBubble({
  content,
  timestamp,
  sources,
}: {
  content: string;
  timestamp: Date;
  sources?: SourceChunk[];
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="message-bubble-assistant">
        <div className="chat-prose">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>

      {sources && sources.length > 0 && (
        <SourcesAccordion sources={sources} />
      )}

      <Timestamp date={timestamp} align="left" />
    </div>
  );
}

function ErrorBubble({
  content,
  timestamp,
}: {
  content: string;
  timestamp: Date;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-start gap-2.5 rounded-2xl rounded-bl-sm border border-red-700/50 bg-red-900/25 px-4 py-3 max-w-full">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-300 leading-relaxed">{content}</p>
      </div>
      <Timestamp date={timestamp} align="left" />
    </div>
  );
}

function SourcesAccordion({ sources }: { sources: SourceChunk[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        {sources.length} source{sources.length !== 1 ? "s" : ""} retrieved
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2 animate-fade-in">
          {sources.map((src, i) => (
            <SourceCard key={i} source={src} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceCard({
  source,
  index,
}: {
  source: SourceChunk;
  index: number;
}) {
  return (
    <div className="glass-card p-3 max-w-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-xs font-medium text-blue-300">
          [{index}] {source.filename}
        </span>
        <span className="text-xs text-slate-500 ml-auto">
          chunk {source.chunk_index}
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        {truncate(source.content_preview, 180)}
      </p>
    </div>
  );
}

function Timestamp({
  date,
  align,
}: {
  date: Date;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[10px] text-slate-600",
        align === "right" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Clock className="w-2.5 h-2.5" />
      <span>{formatTime(date)}</span>
    </div>
  );
}
