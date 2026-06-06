"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ArrowRight, X } from "lucide-react";

// Persistent reminder shown across admin pages until the setup wizard is done.
// Rendered by the admin layout only when setupCompletedAt is null. Dismissable
// for the current tab/session; hidden on the wizard page itself.
export default function SetupBanner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash

  useEffect(() => {
    setDismissed(sessionStorage.getItem("smt_setup_banner_dismissed") === "1");
  }, []);

  if (dismissed || pathname?.startsWith("/admin/setup")) return null;

  return (
    <div className="flex items-center gap-3 border-b border-ra-accent/30 bg-ra-accent/10 px-4 py-2.5 text-sm sm:px-6">
      <Sparkles className="h-4 w-4 shrink-0 text-ra-accent" />
      <span className="text-ra-text">
        Finish setting up your restaurant to complete your profile.
      </span>
      <Link
        href="/admin/setup"
        className="ml-auto flex items-center gap-1 rounded-lg bg-ra-accent px-3 py-1.5 text-xs font-semibold text-ra-bg hover:bg-ra-accent/90 transition-colors"
      >
        Continue setup <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem("smt_setup_banner_dismissed", "1");
          setDismissed(true);
        }}
        className="rounded-md p-1 text-ra-muted hover:text-ra-text transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
