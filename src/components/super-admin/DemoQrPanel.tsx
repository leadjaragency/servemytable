"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Copy, Check, ExternalLink, Monitor, Smartphone } from "lucide-react";

interface DemoQrPanelProps {
  restaurantName: string;
  adminUrl: string;
  customerUrl: string;
  adminQr: string;
  customerQr: string;
  tableNumber: number;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface QrCardProps {
  icon: React.ElementType;
  badge: string;
  title: string;
  description: string;
  url: string;
  qr: string;
  filename: string;
}

function QrCard({ icon: Icon, badge, title, description, url, qr, filename }: QrCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl p-6"
      style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(37,99,235,0.10)" }}
        >
          <Icon className="h-4 w-4" style={{ color: "#2563EB" }} />
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "#2563EB" }}
        >
          {badge}
        </span>
      </div>

      <h2 className="text-lg font-bold text-sa-text">{title}</h2>
      <p className="mt-1 text-sm text-sa-muted">{description}</p>

      <div className="mt-5 flex justify-center">
        <div className="rounded-2xl p-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <Image
            src={qr}
            alt={`${title} QR code`}
            width={200}
            height={200}
            className="h-[200px] w-[200px]"
            unoptimized
          />
        </div>
      </div>

      <div
        className="mt-5 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
        style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B" }}
      >
        <span className="truncate flex-1">{url}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 transition-colors hover:text-sa-accent"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => downloadDataUrl(qr, filename)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#2563EB" }}
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{ background: "#F1F5F9", color: "#0F172A", border: "1px solid #E2E8F0" }}
        >
          {copied ? <Check className="h-4 w-4" style={{ color: "#10B981" }} /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

export function DemoQrPanel({
  restaurantName,
  adminUrl,
  customerUrl,
  adminQr,
  customerQr,
  tableNumber,
}: DemoQrPanelProps) {
  return (
    <div>
      <div
        className="mb-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
        style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)", color: "#1E3A5F" }}
      >
        <span>
          Live demo restaurant: <strong>{restaurantName}</strong> — scanning either code opens it instantly with no
          sign-in.
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <QrCard
          icon={Monitor}
          badge="Restaurant Owner View"
          title="Admin Dashboard Demo"
          description="Signs in automatically as the demo owner and opens the full restaurant admin dashboard."
          url={adminUrl}
          qr={adminQr}
          filename="demo-admin-dashboard-qr.png"
        />
        <QrCard
          icon={Smartphone}
          badge={`Diner View · Table ${tableNumber}`}
          title="Customer Experience Demo"
          description="Opens the customer web app exactly as a diner would after scanning a table QR code."
          url={customerUrl}
          qr={customerQr}
          filename="demo-customer-experience-qr.png"
        />
      </div>
    </div>
  );
}
