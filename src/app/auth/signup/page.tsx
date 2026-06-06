"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, CreditCard, Zap, CheckCircle2 } from "lucide-react";
import { REFERRAL_SOURCES, TABLE_SIZE_BUCKETS, PLAN_INTEREST_OPTIONS } from "@/lib/constants";

const schema = z.object({
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters").max(100),
  cuisine: z.string().min(2, "Describe your cuisine (e.g. Indian, Italian)").max(100),
  ownerName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  phone: z.string().optional(),
  city: z.string().optional(),
  approxTables: z.number().int().positive().optional(),
  planInterest: z.enum(["basic", "standard", "premium"]).optional(),
  referralSource: z.string().optional(),
  marketingOptIn: z.boolean().optional(),
  acceptTerms: z.literal(true, { message: "Please accept the Terms to continue" }),
});
type FormData = z.infer<typeof schema>;

const TRIAL_PERKS = [
  { icon: Clock,        text: "14-day free trial" },
  { icon: CreditCard,   text: "No credit card required" },
  { icon: Zap,          text: "Live in under 30 minutes" },
  { icon: CheckCircle2, text: "Cancel anytime" },
];

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError((body as { error?: string }).error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/auth/pending");
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-inter, sans-serif)" }}>
      <style>{`
        .smt-input:focus { border-color: #C6A34E !important; box-shadow: 0 0 0 3px rgba(198,163,78,0.15); }
      `}</style>

      {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative flex-col overflow-hidden"
        style={{ background: "#1B2A4A" }}
      >
        {/* Background photo */}
        <div className="absolute inset-0">
          <Image
            src="/photos/qr-scan-2.png"
            alt="Customer scanning QR code at restaurant table"
            fill
            className="object-cover object-center"
            sizes="48vw"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(27,42,74,0.93) 0%, rgba(27,42,74,0.78) 50%, rgba(27,42,74,0.90) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <div>
            <Image
              src="/photos/logo-trimmed.png"
              alt="ServeMyTable"
              width={190}
              height={50}
              className="h-10 w-auto object-contain object-left"
              sizes="190px"
            />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: "#C6A34E" }}>
              Start Your Free Trial
            </p>
            <h1
              className="text-5xl xl:text-6xl font-black uppercase leading-none tracking-wide text-white mb-5"
              style={{ fontFamily: "var(--font-bebas-neue, sans-serif)" }}
            >
              14 Days Free.<br />
              <span style={{ color: "#C6A34E" }}>No Card.</span><br />
              No Risk.
            </h1>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
              Get full access to every feature — AI waiter, live orders, QR codes, analytics, and more. Set up in under 30 minutes.
            </p>

            {/* Perks */}
            <div className="mt-8 space-y-3">
              {TRIAL_PERKS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "rgba(198,163,78,0.2)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: "#C6A34E" }} />
                  </div>
                  <span className="text-sm text-white/80">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tagline */}
          <p className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: "rgba(198,163,78,0.55)" }}>
            TAP . ORDER . ENJOY
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: "#FAF6ED" }}>

        {/* Back link */}
        <div className="px-8 pt-8 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "#8B7355" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#1B2A4A")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#8B7355")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-start justify-center px-8 py-8">
          <div className="w-full max-w-[420px]">

            {/* Mobile logo */}
            <div className="lg:hidden mb-8 flex justify-center">
              <Image
                src="/photos/logo-trimmed.png"
                alt="ServeMyTable"
                width={200}
                height={52}
                className="h-12 w-auto object-contain"
                sizes="200px"
                priority
              />
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2
                className="text-3xl font-black uppercase tracking-wide leading-none mb-2"
                style={{ fontFamily: "var(--font-bebas-neue, sans-serif)", color: "#1B2A4A" }}
              >
                Create Your Account
              </h2>
              <p className="text-sm" style={{ color: "#8B7355" }}>
                Fill in your details and we&apos;ll review your application within 24 hours.
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl px-7 py-7 shadow-sm" style={{ background: "#FFFFFF", border: "1px solid #F0E8D6" }}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                {/* Restaurant details */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#8B7355" }}>
                    Restaurant details
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Restaurant name</label>
                      <input
                        placeholder="Saffron Palace"
                        className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                        {...register("restaurantName")}
                      />
                      {errors.restaurantName && <p className="mt-1 text-xs" style={{ color: "#C04525" }}>{errors.restaurantName.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Cuisine type</label>
                      <input
                        placeholder="Indian, Italian, Japanese…"
                        className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                        {...register("cuisine")}
                      />
                      {errors.cuisine && <p className="mt-1 text-xs" style={{ color: "#C04525" }}>{errors.cuisine.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Phone <span style={{ color: "#8B7355" }}>(opt.)</span></label>
                        <input
                          type="tel"
                          placeholder="+1 555 000 0000"
                          className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                          {...register("phone")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>City <span style={{ color: "#8B7355" }}>(opt.)</span></label>
                        <input
                          placeholder="Calgary, AB"
                          className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                          {...register("city")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Tables <span style={{ color: "#8B7355" }}>(opt.)</span></label>
                        <select
                          defaultValue=""
                          className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                          {...register("approxTables", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                        >
                          <option value="">How many tables?</option>
                          {TABLE_SIZE_BUCKETS.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Plan interest <span style={{ color: "#8B7355" }}>(opt.)</span></label>
                        <select
                          defaultValue=""
                          className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                          {...register("planInterest", { setValueAs: (v) => (v === "" ? undefined : v) })}
                        >
                          <option value="">Not sure yet</option>
                          {PLAN_INTEREST_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: "#F0E8D6" }} />

                {/* Account details */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#8B7355" }}>
                    Your account
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Full name</label>
                      <input
                        placeholder="Jane Smith"
                        className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                        {...register("ownerName")}
                      />
                      {errors.ownerName && <p className="mt-1 text-xs" style={{ color: "#C04525" }}>{errors.ownerName.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Email address</label>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="jane@yourrestaurant.com"
                        className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                        {...register("email")}
                      />
                      {errors.email && <p className="mt-1 text-xs" style={{ color: "#C04525" }}>{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>Password</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Minimum 8 characters"
                        className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                        {...register("password")}
                      />
                      {errors.password && <p className="mt-1 text-xs" style={{ color: "#C04525" }}>{errors.password.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#1B2A4A" }}>How did you hear about us? <span style={{ color: "#8B7355" }}>(opt.)</span></label>
                      <select
                        defaultValue=""
                        className="smt-input w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: "#FAF6ED", border: "1.5px solid #F0E8D6", color: "#1B2A4A" }}
                        {...register("referralSource", { setValueAs: (v) => (v === "" ? undefined : v) })}
                      >
                        <option value="">Choose one…</option>
                        {REFERRAL_SOURCES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <div className="space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded"
                      style={{ accentColor: "#C6A34E" }}
                      {...register("acceptTerms")}
                    />
                    <span className="text-xs leading-snug" style={{ color: "#8B7355" }}>
                      I agree to the{" "}
                      <span className="font-semibold" style={{ color: "#1B2A4A" }}>Terms of Service</span>
                      {" "}and{" "}
                      <span className="font-semibold" style={{ color: "#1B2A4A" }}>Privacy Policy</span>.
                    </span>
                  </label>
                  {errors.acceptTerms && <p className="text-xs" style={{ color: "#C04525" }}>{errors.acceptTerms.message}</p>}

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded"
                      style={{ accentColor: "#C6A34E" }}
                      {...register("marketingOptIn")}
                    />
                    <span className="text-xs leading-snug" style={{ color: "#8B7355" }}>
                      Send me product updates, tips, and occasional offers.
                    </span>
                  </label>
                </div>

                {/* Server error */}
                {serverError && (
                  <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <svg className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#C04525" }} viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                    <p className="text-sm leading-snug" style={{ color: "#C04525" }}>{serverError}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-all disabled:opacity-60"
                  style={{ background: isSubmitting ? "#A8873A" : "#C6A34E" }}
                  onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = "#A8873A"; }}
                  onMouseLeave={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = "#C6A34E"; }}
                >
                  {isSubmitting ? "Submitting…" : "Start Free Trial"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "#F0E8D6" }} />
                <span className="text-xs" style={{ color: "#8B7355" }}>or</span>
                <div className="h-px flex-1" style={{ background: "#F0E8D6" }} />
              </div>

              <p className="text-center text-sm" style={{ color: "#8B7355" }}>
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold transition-colors"
                  style={{ color: "#C6A34E" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#A8873A")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#C6A34E")}
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Footer note */}
            <p className="mt-5 text-center text-xs leading-relaxed" style={{ color: "#8B7355" }}>
              We&apos;ll review your application and get back to you within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
