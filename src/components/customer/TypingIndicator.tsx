"use client";

interface TypingIndicatorProps {
  avatar: string;
}

/**
 * Three bouncing dots in an AI-styled bubble — shown while Claude is thinking.
 */
export function TypingIndicator({ avatar }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2.5 px-4 py-1">
      {/* Waiter avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cu-text/8 text-base leading-none select-none">
        {avatar}
      </div>

      {/* Dots bubble */}
      <div className="flex h-9 items-center gap-1.5 rounded-2xl rounded-bl-sm bg-cu-surface px-4 shadow-sm ring-1 ring-white/8">
        <span
          className="h-2 w-2 rounded-full bg-cu-text/35 animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "900ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-cu-text/35 animate-bounce"
          style={{ animationDelay: "180ms", animationDuration: "900ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-cu-text/35 animate-bounce"
          style={{ animationDelay: "360ms", animationDuration: "900ms" }}
        />
      </div>
    </div>
  );
}
