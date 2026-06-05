import Link from "next/link";
import Image from "next/image";
import { Clock, Mail } from "lucide-react";

// ---------------------------------------------------------------------------
// Static page — no auth, no interactivity needed
// ---------------------------------------------------------------------------

const steps = [
  "Our team reviews your restaurant details",
  "We activate your account and assign a subscription tier",
  "You receive a confirmation email",
  "Log in and start setting up your AI waiter",
];

export default function PendingPage() {
  return (
    <div className="zone-customer min-h-screen flex items-center justify-center bg-cu-bg px-4 py-16">
      <div className="w-full max-w-sm animate-fade-in">

        {/* ── Status icon ──────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-5">
            <Image
              src="/photos/logo-trimmed.png"
              alt="ServeMyTable — TAP . ORDER . ENJOY"
              width={240}
              height={62}
              className="h-14 w-auto object-contain"
              priority
              sizes="240px"
            />
          </div>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cu-accent/10 ring-2 ring-cu-accent/20">
            <Clock className="h-7 w-7 text-cu-accent" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-cu-text tracking-tight">
            Application received!
          </h1>
          <p className="mt-3 text-sm text-cu-muted leading-relaxed max-w-xs mx-auto">
            Your restaurant is under review. We&apos;ll notify you once it&apos;s
            approved — usually within 24 hours.
          </p>
        </div>

        {/* ── Steps card ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-cu-border bg-[#131313] shadow-sm shadow-cu-text/5 px-6 py-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-cu-muted mb-5">
            What happens next
          </p>

          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cu-accent/10 text-xs font-bold text-cu-accent">
                  {i + 1}
                </span>
                <p className="text-sm text-cu-text/80 leading-snug">{step}</p>
              </li>
            ))}
          </ol>

          {/* Email callout */}
          <div className="mt-7 flex items-start gap-3 rounded-xl bg-cu-bg border border-cu-border px-4 py-3.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cu-accent" />
            <p className="text-sm text-cu-muted leading-snug">
              Keep an eye on your inbox. You&apos;ll get an email from{" "}
              <span className="text-cu-text font-medium">hello@servemytable.ca</span>{" "}
              with your activation link.
            </p>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/auth/login"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-cu-border bg-[#131313] text-sm font-medium text-cu-text shadow-sm hover:bg-cu-bg transition-colors"
          >
            Back to sign in
          </Link>
          <a
            href="mailto:hello@servemytable.ca"
            className="text-sm text-cu-muted hover:text-cu-accent transition-colors"
          >
            Questions? Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
