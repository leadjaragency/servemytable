"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Star, Send, Loader2 } from "lucide-react";
import { useCustomer } from "@/lib/CustomerContext";
import { cn } from "@/lib/utils";

const EMOTIONS = [
  { emoji: "😍", label: "Loved it" },
  { emoji: "😊", label: "Great"    },
  { emoji: "😐", label: "Okay"     },
  { emoji: "😕", label: "Could improve" },
];

export default function ReviewPage() {
  const searchParams   = useSearchParams();
  const restaurantSlug = searchParams.get("restaurant") ?? "";
  const { sessionId, restaurant, waiter } = useCustomer();

  const [rating,    setRating]    = useState(0);
  const [hover,     setHover]     = useState(0);
  const [emotion,   setEmotion]   = useState<string | null>(null);
  const [comment,   setComment]   = useState("");
  const [submitting,setSubmitting]= useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!sessionId || rating === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const fullComment = [emotion ? `${emotion}` : null, comment.trim()]
        .filter(Boolean).join(" — ");

      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, restaurantSlug, rating, comment: fullComment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, rating, emotion, comment, restaurantSlug, submitting]);

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cu-bg px-6 text-center">
        <div className="text-6xl">🙏</div>
        <div>
          <p className="font-display text-2xl font-bold text-cu-text">
            Thank you for dining at {restaurant?.name ?? "our restaurant"}!
          </p>
          <p className="mt-3 text-cu-text/60 leading-relaxed">
            We hope to see you again soon.
          </p>
          {waiter && (
            <p className="mt-2 text-sm text-cu-text/50 italic">
              — {waiter.avatar} {waiter.name}
            </p>
          )}
        </div>

        {/* ServeMyTable branding */}
        <div className="mt-6 pt-6 border-t border-cu-border w-full max-w-xs">
          <p className="text-xs text-cu-text/30 text-center">
            Powered by <span className="font-semibold text-cu-accent/80">ServeMyTable</span> · AI Virtual Waiter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cu-bg pb-32">
      {/* Header */}
      <header className="border-b border-cu-border bg-[#131313]/95 px-4 py-3">
        <h1 className="font-display text-lg font-bold text-cu-text text-center">Leave a Review</h1>
        <p className="text-center text-xs text-cu-text/40 mt-0.5">How was your experience?</p>
      </header>

      <div className="mx-auto max-w-md px-5 pt-8 space-y-7">
        {/* Star rating */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-cu-text">Rate your visit</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className="h-10 w-10 transition-colors"
                  fill={(hover || rating) >= n ? "#D4740E" : "none"}
                  stroke={(hover || rating) >= n ? "#D4740E" : "#D1C7BA"}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-cu-accent">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Great"}
              {rating === 5 && "Excellent!"}
            </p>
          )}
        </div>

        {/* Emotion buttons */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-cu-text">Quick feedback</p>
          <div className="grid grid-cols-2 gap-2.5">
            {EMOTIONS.map((e) => (
              <button
                key={e.label}
                onClick={() => setEmotion(emotion === e.label ? null : e.label)}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-sm transition-all",
                  emotion === e.label
                    ? "border-cu-accent bg-cu-accent/10 text-cu-accent font-semibold"
                    : "border-cu-border text-cu-text"
                )}
              >
                <span className="text-xl">{e.emoji}</span>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cu-text">Any other comments? <span className="text-cu-text/40 font-normal">(optional)</span></p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell us what you loved or what we can improve…"
            className="w-full resize-none rounded-2xl border border-cu-border bg-cu-surface px-4 py-3 text-sm text-cu-text placeholder:text-cu-text/40 focus:border-cu-accent/50 focus:outline-none"
          />
          <p className="text-right text-xs text-cu-text/30">{comment.length}/500</p>
        </div>

        {error && <p className="text-sm text-cu-red text-center">{error}</p>}
      </div>

      {/* Submit button */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-t from-cu-bg via-cu-bg/90 to-transparent px-4 pb-2 pt-4">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cu-accent py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting…</>
              : <><Send className="h-5 w-5" />Submit Review</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
