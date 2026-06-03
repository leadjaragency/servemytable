"use client";

import { useState, useCallback } from "react";
import { Printer, Download, RefreshCw, QrCode, Copy, Check, ChefHat, ExternalLink } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QrTable {
  id:     string;
  number: number;
  seats:  number;
  status: string;
  qrCode: string | null;       // pre-generated data URL from server
  waiter: { name: string; avatar: string } | null;
}

export interface QrCodesPageClientProps {
  tables:         QrTable[];
  restaurantName: string;
  restaurantSlug: string;
  baseUrl:        string;
  kitchenUrl:     string;
  kitchenQr:      string;
}

// ---------------------------------------------------------------------------
// PDF generation (client-side, 3×4 A4 grid)
// ---------------------------------------------------------------------------

const PDF_COLS    = 3;
const PDF_ROWS    = 4;
const PDF_MARGIN  = 8;
const PDF_PAGE_W  = 210;
const PDF_PAGE_H  = 297;
const PDF_CELL_W  = (PDF_PAGE_W - PDF_MARGIN * 2) / PDF_COLS;
const PDF_CELL_H  = (PDF_PAGE_H - PDF_MARGIN * 2) / PDF_ROWS;
const PDF_QR_SIZE = 44;
const PDF_PAD     = 4;

function buildPDF(
  restaurantName: string,
  tables:         QrTable[],
  qrMap:          Record<string, string>,
): jsPDF {
  const doc     = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const perPage = PDF_COLS * PDF_ROWS;

  tables.forEach((table, idx) => {
    const cellIdx = idx % perPage;
    const col     = cellIdx % PDF_COLS;
    const row     = Math.floor(cellIdx / PDF_COLS);

    if (idx > 0 && cellIdx === 0) doc.addPage();

    const x = PDF_MARGIN + col * PDF_CELL_W;
    const y = PDF_MARGIN + row * PDF_CELL_H;

    // Cell border
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(x, y, PDF_CELL_W, PDF_CELL_H);

    // Restaurant name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(restaurantName, x + PDF_CELL_W / 2, y + PDF_PAD + 3, { align: "center" });

    // QR image
    const qrDataUrl = qrMap[table.id];
    if (qrDataUrl) {
      const qrX = x + (PDF_CELL_W - PDF_QR_SIZE) / 2;
      const qrY = y + PDF_PAD + 7;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, PDF_QR_SIZE, PDF_QR_SIZE);

      // Table number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`Table ${table.number}`, x + PDF_CELL_W / 2, qrY + PDF_QR_SIZE + 5.5, { align: "center" });

      // Instruction
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5);
      doc.setTextColor(120, 120, 120);
      doc.text("Scan to meet your AI waiter!", x + PDF_CELL_W / 2, qrY + PDF_QR_SIZE + 10, { align: "center" });
    }
  });

  return doc;
}

// ---------------------------------------------------------------------------
// Single QR Card
// ---------------------------------------------------------------------------

interface QrCardProps {
  table:          QrTable;
  qrDataUrl:      string | null;
  restaurantSlug: string;
  baseUrl:        string;
  onRegenerate:   (tableId: string) => void;
  isRegenerating: boolean;
}

function QrCard({ table, qrDataUrl, restaurantSlug, baseUrl, onRegenerate, isRegenerating }: QrCardProps) {
  const [copied, setCopied] = useState(false);

  const tableUrl = `${baseUrl}/table/${table.number}?restaurant=${restaurantSlug}`;

  const handleDownloadPng = useCallback(() => {
    if (!qrDataUrl) return;
    const a   = document.createElement("a");
    a.href     = qrDataUrl;
    a.download = `table-${table.number}-qr.png`;
    a.click();
    toast.success(`Table ${table.number} QR downloaded`);
  }, [qrDataUrl, table.number]);

  const handlePrintSingle = useCallback(() => {
    if (!qrDataUrl) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Table ${table.number} QR Code</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
            .card { text-align: center; border: 1px solid #ddd; padding: 24px; border-radius: 8px; }
            img  { width: 200px; height: 200px; display: block; margin: 8px auto; }
            h2   { margin: 0 0 8px; font-size: 16px; color: #555; }
            h1   { margin: 8px 0 4px; font-size: 22px; }
            p    { margin: 0; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${restaurantSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h2>
            <img src="${qrDataUrl}" alt="QR Code" />
            <h1>Table ${table.number}</h1>
            <p>Scan to meet your AI waiter!</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  }, [qrDataUrl, table.number, restaurantSlug]);

  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copied");
  }, [tableUrl]);

  return (
    <div className="flex flex-col rounded-xl border border-ra-border bg-ra-surface overflow-hidden">
      {/* QR Image area */}
      <div className="relative flex items-center justify-center bg-white p-4 aspect-square">
        {qrDataUrl ? (
          <>
            <img
              src={qrDataUrl}
              alt={`QR Code for Table ${table.number}`}
              className="w-full h-full object-contain"
            />
            {/* Table number badge overlay */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-ra-accent text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
              Table {table.number}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-ra-muted">
            <QrCode className="h-12 w-12 opacity-30" />
            <p className="text-xs">No QR generated</p>
          </div>
        )}
      </div>

      {/* Table info */}
      <div className="px-3 pt-3 pb-1 border-t border-ra-border">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-ra-text">Table {table.number}</p>
          <span className="text-xs text-ra-muted">{table.seats} seats</span>
        </div>

        {table.waiter ? (
          <p className="text-xs text-ra-muted mb-1.5">
            {table.waiter.avatar} {table.waiter.name}
          </p>
        ) : (
          <p className="text-xs text-ra-muted/50 mb-1.5 italic">No waiter assigned</p>
        )}

        {/* URL display */}
        <button
          onClick={handleCopyUrl}
          title="Copy URL"
          className="group flex w-full items-center gap-1.5 rounded bg-ra-bg px-2 py-1 mb-2"
        >
          <code className="flex-1 truncate text-[10px] text-ra-muted text-left">
            /table/{table.number}?restaurant={restaurantSlug}
          </code>
          {copied
            ? <Check className="h-3 w-3 shrink-0 text-green-400" />
            : <Copy className="h-3 w-3 shrink-0 text-ra-muted/50 group-hover:text-ra-muted" />
          }
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
        <button
          onClick={handleDownloadPng}
          disabled={!qrDataUrl}
          title="Download PNG"
          className="flex flex-col items-center gap-0.5 rounded-lg border border-ra-border bg-ra-bg px-2 py-1.5 text-ra-muted hover:text-ra-text hover:border-ra-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-[10px]">PNG</span>
        </button>

        <button
          onClick={handlePrintSingle}
          disabled={!qrDataUrl}
          title="Print this QR"
          className="flex flex-col items-center gap-0.5 rounded-lg border border-ra-border bg-ra-bg px-2 py-1.5 text-ra-muted hover:text-ra-text hover:border-ra-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="text-[10px]">Print</span>
        </button>

        <button
          onClick={() => onRegenerate(table.id)}
          disabled={isRegenerating}
          title="Regenerate QR"
          className="flex flex-col items-center gap-0.5 rounded-lg border border-ra-border bg-ra-bg px-2 py-1.5 text-ra-muted hover:text-ra-text hover:border-ra-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
          <span className="text-[10px]">Regen</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page client
// ---------------------------------------------------------------------------

export function QrCodesPageClient({
  tables,
  restaurantName,
  restaurantSlug,
  baseUrl,
  kitchenUrl,
  kitchenQr,
}: QrCodesPageClientProps) {
  // qrMap: tableId → current data URL (starts from server-generated values)
  const [qrMap, setQrMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    tables.forEach((t) => { if (t.qrCode) initial[t.id] = t.qrCode; });
    return initial;
  });

  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
  const [pdfLoading,   setPdfLoading]   = useState(false);

  // ── Kitchen display QR ────────────────────────────────────────────────────
  const [kitchen, setKitchen]               = useState({ url: kitchenUrl, qr: kitchenQr });
  const [kitchenRotating, setKitchenRotating] = useState(false);
  const [kitchenCopied, setKitchenCopied]     = useState(false);

  const handleCopyKitchen = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(kitchen.url);
      setKitchenCopied(true);
      setTimeout(() => setKitchenCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }, [kitchen.url]);

  const handleRotateKitchen = useCallback(async () => {
    if (!confirm("Regenerate the kitchen link? The current QR code will stop working.")) return;
    setKitchenRotating(true);
    try {
      const res  = await fetch("/api/restaurant/kitchen-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.qr) throw new Error(data.error ?? "Failed");
      setKitchen({ url: data.url, qr: data.qr });
      toast.success("Kitchen link regenerated — re-share the new QR");
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate kitchen link");
    } finally {
      setKitchenRotating(false);
    }
  }, []);

  const handleDownloadKitchenQr = useCallback(() => {
    const a = document.createElement("a");
    a.href = kitchen.qr;
    a.download = `kitchen-display-${restaurantSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [kitchen.qr, restaurantSlug]);

  // ── Regenerate single QR ──────────────────────────────────────────────────
  const handleRegenerate = useCallback(async (tableId: string) => {
    setRegenerating((prev) => ({ ...prev, [tableId]: true }));
    try {
      const res  = await fetch("/api/qr/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tableId }),
      });
      const data = await res.json();
      if (!res.ok || !data.qrCode) throw new Error(data.error ?? "Failed");

      setQrMap((prev) => ({ ...prev, [tableId]: data.qrCode }));
      toast.success(`Table ${data.tableNumber} QR regenerated`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate QR code");
    } finally {
      setRegenerating((prev) => ({ ...prev, [tableId]: false }));
    }
  }, []);

  // ── Generate all missing QRs ──────────────────────────────────────────────
  const handleGenerateAll = useCallback(async () => {
    const missing = tables.filter((t) => !qrMap[t.id]);
    if (missing.length === 0) {
      toast.info("All QR codes are already generated");
      return;
    }

    toast.info(`Generating ${missing.length} QR codes…`);
    await Promise.all(missing.map((t) => handleRegenerate(t.id)));
    toast.success("All QR codes generated");
  }, [tables, qrMap, handleRegenerate]);

  // ── Download PDF (client-side jspdf) ─────────────────────────────────────
  const handleDownloadPdf = useCallback(() => {
    setPdfLoading(true);
    try {
      const tablesWithQr = tables.filter((t) => qrMap[t.id]);
      if (tablesWithQr.length === 0) {
        toast.error("Generate QR codes first");
        return;
      }

      const doc = buildPDF(restaurantName, tables, qrMap);
      doc.save(`qr-codes-${restaurantSlug}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [tables, qrMap, restaurantName, restaurantSlug]);

  // ── Print all (open PDF in new tab) ──────────────────────────────────────
  const handlePrintAll = useCallback(() => {
    setPdfLoading(true);
    try {
      const doc = buildPDF(restaurantName, tables, qrMap);
      const blob = new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, "_blank");
      if (win) win.onload = () => win.print();
      toast.success("Print dialog opened");
    } catch (err) {
      console.error(err);
      toast.error("Failed to open print dialog");
    } finally {
      setPdfLoading(false);
    }
  }, [tables, qrMap, restaurantName]);

  const qrCount      = tables.filter((t) => qrMap[t.id]).length;
  const missingCount = tables.length - qrCount;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ra-text">QR Codes</h1>
          <p className="mt-0.5 text-sm text-ra-muted">
            {qrCount} of {tables.length} tables have QR codes generated
            {missingCount > 0 && ` · ${missingCount} missing`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {missingCount > 0 && (
            <button
              onClick={handleGenerateAll}
              className="flex items-center gap-2 rounded-lg border border-ra-border bg-ra-surface px-3 py-2 text-sm text-ra-muted hover:text-ra-text hover:border-ra-accent/40 transition-colors"
            >
              <QrCode className="h-4 w-4" />
              Generate All
            </button>
          )}
          <button
            onClick={handlePrintAll}
            disabled={pdfLoading || qrCount === 0}
            className="flex items-center gap-2 rounded-lg border border-ra-border bg-ra-surface px-3 py-2 text-sm text-ra-muted hover:text-ra-text hover:border-ra-accent/40 disabled:opacity-40 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print All QR Codes
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading || qrCount === 0}
            className="flex items-center gap-2 rounded-lg bg-ra-accent px-3 py-2 text-sm font-medium text-white hover:bg-ra-accent/90 disabled:opacity-40 transition-colors"
          >
            <Download className="h-4 w-4" />
            {pdfLoading ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {/* ── Info banner ────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-ra-border bg-ra-surface px-4 py-3 text-sm text-ra-muted">
        <span className="font-medium text-ra-text">QR URL format: </span>
        <code className="text-ra-accent">
          {baseUrl}/table/<span className="text-ra-text">5</span>?restaurant=<span className="text-ra-text">{restaurantSlug}</span>
        </code>
      </div>

      {/* ── Kitchen Display ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-ra-border bg-ra-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 justify-center">
            <div className="rounded-xl bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kitchen.qr} alt="Kitchen display QR code" className="h-28 w-28" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-ra-accent" />
              <h2 className="text-base font-bold text-ra-text">Kitchen Display</h2>
            </div>
            <p className="mt-1 text-sm text-ra-muted">
              Open this on a kitchen tablet — your chef sees live orders and advances them, no login needed.
              Keep this link private; anyone with it can view and update orders.
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-xs text-ra-muted">
              <span className="truncate flex-1">{kitchen.url}</span>
              <a
                href={kitchen.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 hover:text-ra-accent transition-colors"
                title="Open kitchen display"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleCopyKitchen}
                className="flex items-center gap-2 rounded-lg border border-ra-border bg-ra-surface px-3 py-2 text-sm text-ra-muted hover:text-ra-text hover:border-ra-accent/40 transition-colors"
              >
                {kitchenCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {kitchenCopied ? "Copied" : "Copy link"}
              </button>
              <button
                onClick={handleDownloadKitchenQr}
                className="flex items-center gap-2 rounded-lg border border-ra-border bg-ra-surface px-3 py-2 text-sm text-ra-muted hover:text-ra-text hover:border-ra-accent/40 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download QR
              </button>
              <button
                onClick={handleRotateKitchen}
                disabled={kitchenRotating}
                className="flex items-center gap-2 rounded-lg border border-ra-border bg-ra-surface px-3 py-2 text-sm text-ra-muted hover:text-ra-text hover:border-ra-accent/40 disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={cn("h-4 w-4", kitchenRotating && "animate-spin")} />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR grid ────────────────────────────────────────────────────────── */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ra-border py-16 text-ra-muted">
          <QrCode className="h-10 w-10 opacity-30" />
          <p className="text-sm">No tables found. Create tables first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <QrCard
              key={table.id}
              table={table}
              qrDataUrl={qrMap[table.id] ?? null}
              restaurantSlug={restaurantSlug}
              baseUrl={baseUrl}
              onRegenerate={handleRegenerate}
              isRegenerating={regenerating[table.id] ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
