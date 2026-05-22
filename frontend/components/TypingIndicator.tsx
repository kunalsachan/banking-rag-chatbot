"use client";

// ============================================================
// components/TypingIndicator.tsx
// Animated three-dot typing bubble shown while the assistant
// is generating a response.
// ============================================================

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      {/* Bot avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-glow">
        <span className="text-white text-xs font-bold">AI</span>
      </div>

      {/* Bubble */}
      <div className="message-bubble-assistant flex items-center gap-1.5 py-4 px-5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
