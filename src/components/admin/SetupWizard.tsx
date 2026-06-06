"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2, Upload, X, ImageIcon, Check, ArrowLeft, ArrowRight,
  MapPin, Clock, Palette, ClipboardCheck,
} from "lucide-react";
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Post-approval Setup Wizard. Reuses /api/restaurant/profile (PUT) for saves
// and /api/restaurant/logo for the logo. "Skip for now" sets a cookie so the
// dashboard stops redirecting here; "Finish" sets setupCompletedAt.
// ---------------------------------------------------------------------------

type Branding = Record<string, unknown> & { socials?: { instagram?: string; facebook?: string } };

const STEPS = [
  { key: "location", label: "Location & contact", icon: MapPin },
  { key: "hours",    label: "Hours & money",       icon: Clock },
  { key: "brand",    label: "Brand & profile",     icon: Palette },
  { key: "review",   label: "Review & finish",     icon: ClipboardCheck },
] as const;

const inputCls =
  "w-full rounded-xl border border-ra-border bg-ra-bg px-3 py-2.5 text-sm text-ra-text placeholder:text-ra-muted focus:border-ra-accent/50 focus:outline-none";
const labelCls = "block text-xs font-medium text-ra-muted mb-1.5";

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // form state
  const [address, setAddress]       = useState("");
  const [city, setCity]             = useState("");
  const [province, setProvince]     = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [timezone, setTimezone]     = useState("");
  const [hoursOpen, setHoursOpen]   = useState("11:00");
  const [hoursClose, setHoursClose] = useState("23:00");
  const [currency, setCurrency]     = useState("CAD");
  const [taxRate, setTaxRate]       = useState("8");
  const [tagline, setTagline]       = useState("");
  const [website, setWebsite]       = useState("");
  const [instagram, setInstagram]   = useState("");
  const [facebook, setFacebook]     = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");

  const [branding, setBranding] = useState<Branding>({});
  const [logoUrl, setLogoUrl]   = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/restaurant/profile");
      const data = await res.json();
      if (res.ok && data.restaurant) {
        const r = data.restaurant;
        setAddress(r.address ?? "");
        setCity(r.city ?? "");
        setProvince(r.province ?? "");
        setPostalCode(r.postalCode ?? "");
        setEmail(r.email ?? "");
        setPhone(r.phone ?? "");
        setTimezone(r.timezone ?? "");
        setCurrency(r.currency ?? "CAD");
        setTaxRate(String(Math.round((r.taxRate ?? 0.08) * 100)));
        setTagline(r.tagline ?? "");
        setWebsite(r.website ?? "");
        setDefaultLanguage(r.defaultLanguage ?? "en");
        setLogoUrl(r.logoUrl ?? null);
        const h = r.hours as { open?: string; close?: string } | null;
        if (h?.open) setHoursOpen(h.open);
        if (h?.close) setHoursClose(h.close);
        const b = (r.branding ?? {}) as Branding;
        setBranding(b);
        setInstagram(b.socials?.instagram ?? "");
        setFacebook(b.socials?.facebook ?? "");
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function persist(partial: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res  = await fetch("/api/restaurant/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(partial),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function stepPayload(index: number): Record<string, unknown> {
    switch (index) {
      case 0:
        return {
          address:    address.trim()    || undefined,
          city:       city.trim()       || undefined,
          province:   province.trim()   || undefined,
          postalCode: postalCode.trim() || undefined,
          email:      email.trim()      || undefined,
          phone:      phone.trim()      || undefined,
          timezone:   timezone          || undefined,
        };
      case 1:
        return {
          hours:    { open: hoursOpen, close: hoursClose },
          currency,
          taxRate:  parseFloat(taxRate) / 100 || 0.08,
        };
      case 2: {
        const mergedBranding: Branding = {
          ...branding,
          socials: { instagram: instagram.trim(), facebook: facebook.trim() },
        };
        return {
          tagline:  tagline.trim() || undefined,
          website:  website.trim() || undefined,
          defaultLanguage,
          branding: mergedBranding,
        };
      }
      default:
        return {};
    }
  }

  async function handleNext() {
    const ok = await persist(stepPayload(step));
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleFinish() {
    const ok = await persist({ setupCompletedAt: new Date().toISOString() });
    if (ok) {
      router.push("/admin");
      router.refresh();
    }
  }

  function handleSkip() {
    // session cookie so the dashboard stops redirecting back here
    document.cookie = "smt_setup_skipped=1; path=/; max-age=2592000; samesite=lax";
    router.push("/admin");
    router.refresh();
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res  = await fetch("/api/restaurant/logo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLogoUrl(data.logoUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ra-accent" />
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ra-text">Finish setting up your restaurant</h1>
        <p className="mt-1 text-sm text-ra-muted">
          A few details so your AI waiter, menu, and customer pages look complete. You can skip and do this later.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    active ? "border-ra-accent bg-ra-accent text-ra-bg"
                    : done  ? "border-ra-accent/60 bg-ra-accent/15 text-ra-accent"
                    :         "border-ra-border bg-ra-bg text-ra-muted"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </div>
                <span className={`hidden text-[11px] sm:block ${active ? "text-ra-text" : "text-ra-muted"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${i < step ? "bg-ra-accent/50" : "bg-ra-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step body */}
      <div className="rounded-2xl border border-ra-border bg-ra-surface p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-ra-text">Where are you located?</h2>
            <div>
              <label className={labelCls}>Street address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className={inputCls} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Calgary" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Province / State</label>
                <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="AB" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Postal code</label>
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="T2P 1J9" className={inputCls} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Contact email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@restaurant.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (403) 555-0100" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls}>
                <option value="">Select a timezone…</option>
                {TIMEZONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-ra-text">Hours, currency & tax</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Opening time</label>
                <input type="time" value={hoursOpen} onChange={(e) => setHoursOpen(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Closing time</label>
                <input type="time" value={hoursClose} onChange={(e) => setHoursClose(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                  {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tax rate (%)</label>
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="30" step="0.1" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-ra-text">Brand & profile</h2>
            {/* Logo */}
            <div>
              <label className={labelCls}>Restaurant logo</label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-ra-border bg-ra-bg flex items-center justify-center">
                  {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" /> : <ImageIcon className="h-8 w-8 text-ra-muted/40" />}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                    className="flex items-center gap-1.5 rounded-lg border border-ra-border bg-ra-bg px-3 py-1.5 text-xs font-medium text-ra-text hover:bg-ra-border/30 disabled:opacity-40 transition-colors">
                    {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {logoUploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                  </button>
                  <p className="text-[11px] text-ra-muted">JPG, PNG, WebP or SVG · max 2 MB</p>
                </div>
              </div>
              {logoError && <p className="mt-2 text-xs text-red-400">{logoError}</p>}
            </div>
            <div>
              <label className={labelCls}>Tagline</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short line shown to customers" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourrestaurant.com" className={inputCls} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Instagram</label>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourrestaurant" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Facebook</label>
                <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/yourrestaurant" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Default language (AI waiter)</label>
              <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className={inputCls}>
                {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-ra-text">Review</h2>
            <dl className="grid gap-2 text-sm">
              <Row label="Address" value={[address, city, province, postalCode].filter(Boolean).join(", ")} />
              <Row label="Contact" value={[email, phone].filter(Boolean).join(" · ")} />
              <Row label="Timezone" value={timezone} />
              <Row label="Hours" value={`${hoursOpen} – ${hoursClose}`} />
              <Row label="Currency / Tax" value={`${currency} · ${taxRate}%`} />
              <Row label="Tagline" value={tagline} />
              <Row label="Website" value={website} />
              <Row label="Language" value={defaultLanguage} />
            </dl>
            <p className="text-xs text-ra-muted">You can change any of this later in Settings.</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={handleSkip} className="text-sm font-medium text-ra-muted hover:text-ra-text transition-colors">
          Skip for now
        </button>
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-ra-border px-4 py-2.5 text-sm font-medium text-ra-text hover:bg-ra-border/30 disabled:opacity-40 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? handleFinish : handleNext}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-ra-accent px-5 py-2.5 text-sm font-semibold text-ra-bg hover:bg-ra-accent/90 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isLast ? <Check className="h-4 w-4" /> : null}
            {isLast ? "Finish setup" : "Save & continue"}
            {!isLast && !saving && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ra-border/50 pb-1.5">
      <dt className="text-ra-muted">{label}</dt>
      <dd className="text-right text-ra-text">{value || <span className="text-ra-muted/60">—</span>}</dd>
    </div>
  );
}
