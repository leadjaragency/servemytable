"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, AlertCircle,
  ChefHat, Flame, CheckCircle2, XCircle,
  Upload, FileText, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  Modal, ModalHeader, ModalTitle, ModalDescription,
  ModalBody, ModalFooter,
} from "@/components/ui/Modal";
import { ALLERGENS, FOOD_EMOJIS, SPICE_LABELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id:        string;
  name:      string;
  sortOrder: number;
  _count:    { dishes: number };
}

interface Dish {
  id:          string;
  name:        string;
  description: string;
  price:       number;
  imageEmoji:  string | null;
  spiceLevel:  number;
  isVeg:       boolean;
  isVegan:     boolean;
  isGlutenFree:boolean;
  isJain:      boolean;
  allergens:   string[];
  prepTime:    number;
  isAvailable: boolean;
  isChefPick:  boolean;
  isPopular:   boolean;
  upsellIds:   string[];
  categoryId:  string;
  category:    { id: string; name: string; sortOrder: number };
}

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const DishFormSchema = z.object({
  name:         z.string().min(1, "Name is required").max(100),
  description:  z.string().min(1, "Description is required").max(500),
  categoryId:   z.string().min(1, "Category is required"),
  price:        z.number({ message: "Must be positive" }).positive("Must be positive"),
  imageEmoji:   z.string().max(8).nullable().optional(),
  spiceLevel:   z.number().int().min(0).max(5),
  isVeg:        z.boolean(),
  isVegan:      z.boolean(),
  isGlutenFree: z.boolean(),
  isJain:       z.boolean(),
  allergens:    z.array(z.string()),
  prepTime:     z.number().int().positive(),
  isChefPick:   z.boolean(),
  isPopular:    z.boolean(),
  isAvailable:  z.boolean(),
  upsellIds:    z.array(z.string()),
});

type DishFormValues = z.infer<typeof DishFormSchema>;

// ---------------------------------------------------------------------------
// Menu Upload — extracted dish type (mirrors /api/menu/parse response)
// ---------------------------------------------------------------------------

interface ExtractedDish {
  name: string;
  description: string;
  price: number;
  category: string;
  allergens: string[];
  spiceLevel: number;
  isVeg: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  prepTime: number;
}

// ---------------------------------------------------------------------------
// CSV helpers — client-side parser, no package needed
// ---------------------------------------------------------------------------

function splitCSVRow(row: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// Parse a price cell tolerant of currency symbols, words, and thousands/decimal
// separators ("$18.99", "18,99", "1,299.00", "Rs. 250"). Returns NaN when the
// cell has no usable number, so callers can flag the row instead of coercing to 0.
function parsePrice(raw: string): number {
  if (!raw) return NaN;
  // Keep only digits/separators, then drop stray separators that aren't part of
  // the number (e.g. the "." in "Rs. 250" or "No.5").
  let s = raw.replace(/[^0-9.,]/g, "").replace(/^[.,]+/, "").replace(/[.,]+$/, "");
  if (!s) return NaN;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // Whichever separator appears last is the decimal point.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");     // e.g. 1.299,00 → 1299.00
    } else {
      s = s.replace(/,/g, "");                         // e.g. 1,299.00 → 1299.00
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = parts[0] + "." + parts[1];                  // decimal comma, e.g. 18,99
    } else {
      s = s.replace(/,/g, "");                         // thousands, e.g. 1,299
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

// Accepts common truthy spellings, not just the exact lowercase "true".
function parseBool(raw: string): boolean {
  return /^(true|yes|y|1|x|✓)$/i.test(raw.trim());
}

// Map common header spellings to the canonical column names the parser expects.
const HEADER_ALIASES: Record<string, string> = {
  "item": "name", "item name": "name", "dish": "name", "dish name": "name", "title": "name", "product": "name",
  "desc": "description", "details": "description",
  "cost": "price", "amount": "price", "rate": "price", "price ($)": "price", "price (cad)": "price", "mrp": "price",
  "section": "category", "menu category": "category", "menu section": "category", "type": "category", "course": "category",
  "spice": "spice_level", "spice level": "spice_level", "heat": "spice_level",
  "vegetarian": "is_veg", "veg": "is_veg",
  "vegan": "is_vegan",
  "gluten free": "is_gluten_free", "gluten-free": "is_gluten_free", "gf": "is_gluten_free",
  "prep": "prep_time", "prep time": "prep_time", "time": "prep_time",
  "allergen": "allergens", "allergies": "allergens",
};

function normalizeHeader(h: string): string {
  const key = h.toLowerCase().trim().replace(/\s+/g, " ");
  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "_");
}

function parseMenuCSV(text: string): ExtractedDish[] {
  const lines = text.replace(/^﻿/, "").trim().split(/\r?\n/); // strip BOM
  if (lines.length < 2) return [];
  const headers = splitCSVRow(lines[0]).map(normalizeHeader);

  // Require the columns we cannot sensibly default. Throw a clear message the
  // upload UI surfaces, instead of silently returning an empty/invalid result.
  const missing = ["name", "price"].filter((c) => !headers.includes(c));
  if (missing.length) {
    throw new Error(
      `Your CSV is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
      `Download the template to see the expected headers.`
    );
  }

  const get = (vals: string[], col: string) => {
    const i = headers.indexOf(col);
    return i === -1 ? "" : (vals[i] ?? "");
  };

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const v = splitCSVRow(line);
      const allergenRaw = get(v, "allergens");
      return {
        name:        get(v, "name").slice(0, 100),
        description: get(v, "description").slice(0, 500),
        price:       parsePrice(get(v, "price")),
        category:    get(v, "category") || "General",
        allergens:   allergenRaw ? allergenRaw.split(/[;,|]/).map(s => s.trim()).filter(Boolean) : [],
        spiceLevel:  Math.min(5, Math.max(0, parseInt(get(v, "spice_level")) || 0)),
        isVeg:       parseBool(get(v, "is_veg")),
        isVegan:     parseBool(get(v, "is_vegan")),
        isGlutenFree: parseBool(get(v, "is_gluten_free")),
        prepTime:    Math.max(1, parseInt(get(v, "prep_time")) || 15),
      };
    })
    .filter(d => d.name);
}

// ---------------------------------------------------------------------------
// UploadMenuModal — tabbed: Paste Text (AI) | CSV Import (no AI)
// ---------------------------------------------------------------------------

function UploadMenuModal({
  onClose,
  onParsed,
}: {
  onClose:  () => void;
  onParsed: (dishes: ExtractedDish[]) => void;
}) {
  const [tab,     setTab]     = useState<"paste" | "csv">("paste");
  const [text,    setText]    = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Tab 1: Paste text → Claude ───────────────────────────────────────────
  async function handlePasteAI() {
    if (!text.trim()) { setError("Please paste some menu text first."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/menu/parse", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });
      const body = await res.json() as { dishes?: ExtractedDish[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Parse failed");
      if (!body.dishes?.length) throw new Error("No dishes found. Try pasting more complete menu text.");
      onParsed(body.dishes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setBusy(false);
    }
  }

  // ── Tab 2: CSV upload → client-side parse ────────────────────────────────
  async function handleCSV() {
    if (!csvFile) { setError("Please select a CSV file first."); return; }
    setBusy(true); setError(null);
    try {
      const rawText = await csvFile.text();
      const dishes = parseMenuCSV(rawText);
      if (!dishes.length) throw new Error("No dishes found. Make sure the CSV uses the template column headers.");
      onParsed(dishes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = tab === "paste" ? text.trim().length > 0 : csvFile !== null;
  const handleSubmit = tab === "paste" ? handlePasteAI : handleCSV;

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Import Menu"
      description="Choose how to import your menu items."
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-red-400">{error ?? ""}</div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="amber" size="sm" loading={busy} disabled={!canSubmit || busy} onClick={handleSubmit}>
              {busy
                ? (tab === "paste" ? "Parsing…" : "Reading…")
                : (tab === "paste" ? "Parse with AI" : "Import CSV")}
            </Button>
          </div>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex rounded-xl border border-ra-border overflow-hidden mb-5">
        {(["paste", "csv"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-ra-accent/15 text-ra-accent"
                : "text-ra-muted hover:text-ra-text hover:bg-white/5"
            }`}
          >
            {t === "paste" ? "✨ Paste Text (AI)" : "📊 CSV Import"}
          </button>
        ))}
      </div>

      {tab === "paste" ? (
        <div className="space-y-3">
          <p className="text-xs text-ra-muted">
            Copy your menu text from any source — a PDF viewer, website, email, or Word document —
            and paste it below. Claude will extract all dishes automatically.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Starters\nGarlic Bread - $6.99\nSoup of the Day - $8.99\n\nMains\nGrilled Salmon - $24.99\n..."}
            rows={10}
            className="w-full rounded-xl border border-ra-border bg-ra-bg px-3 py-2.5 text-sm text-ra-text placeholder:text-ra-muted/40 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30 resize-none font-mono"
          />
          {busy && (
            <div className="flex items-center gap-2 text-xs text-ra-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ra-accent" />
              Claude is reading your menu — this may take a few seconds…
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-ra-muted leading-relaxed">
              Download the template, fill it in Excel or Google Sheets, then upload it here.
              No AI involved — instant and 100% reliable.
            </p>
            <a
              href="/api/menu/csv-template"
              download="servemytable-menu-template.csv"
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-ra-accent/40 px-3 py-1.5 text-xs font-medium text-ra-accent hover:bg-ra-accent/10 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Download Template
            </a>
          </div>

          {/* Column guide */}
          <div className="rounded-xl border border-ra-border bg-ra-bg p-3 text-xs text-ra-muted space-y-1">
            <p className="font-medium text-ra-text mb-1.5">CSV columns:</p>
            {[
              ["name", "Dish name (required)"],
              ["description", "Short description"],
              ["price", "Price as a number, e.g. 18.99 (required)"],
              ["category", "Section name, e.g. Starters, Mains, Desserts (required)"],
              ["allergens", "Comma-separated: Dairy,Nuts,Gluten,Shellfish,Soy,Eggs,Fish,Wheat,Sesame,Mustard"],
              ["spice_level", "0–5 (0=not spicy, 5=extra hot)"],
              ["is_veg / is_vegan / is_gluten_free", "true or false"],
              ["prep_time", "Minutes, e.g. 15"],
            ].map(([col, desc]) => (
              <div key={col} className="flex gap-2">
                <span className="font-mono text-ra-accent shrink-0">{col}</span>
                <span>— {desc}</span>
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ra-border p-6 hover:border-ra-accent/40 transition-all">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { setCsvFile(e.target.files?.[0] ?? null); setError(null); }}
            />
            <Upload className="h-5 w-5 text-ra-accent" />
            {csvFile ? (
              <div className="text-center">
                <p className="text-sm font-medium text-ra-text">{csvFile.name}</p>
                <p className="text-xs text-ra-muted mt-0.5">
                  {(csvFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-ra-text">Click to choose CSV file</p>
                <p className="text-xs text-ra-muted">or drag and drop</p>
              </div>
            )}
          </label>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ParsePreviewModal — step 2: review extracted dishes, map categories, import
// ---------------------------------------------------------------------------

function ParsePreviewModal({
  extracted,
  categories,
  onClose,
}: {
  extracted:  ExtractedDish[];
  categories: Category[];
  onClose:    () => void;
}) {
  const router = useRouter();

  // Each extracted dish gets a selected flag + a mapped categoryId.
  // Rows that can't pass the dish API (no name / no valid price) are flagged and
  // auto-deselected so they don't fail silently on import.
  const [rows, setRows] = useState(() =>
    extracted.map((d) => {
      // Auto-match category name (case-insensitive) to existing categories
      const matched = categories.find(
        (c) => c.name.toLowerCase() === d.category.toLowerCase()
      );
      const invalidReason =
        !d.name?.trim()      ? "Missing name"
        : !(d.price > 0)     ? "Missing or invalid price"
        : null;
      return {
        ...d,
        selected:     invalidReason === null,
        categoryId:   matched?.id ?? (categories[0]?.id ?? ""),
        invalidReason,
      };
    })
  );
  const [importing, setImporting] = useState(false);
  const [progress,  setProgress]  = useState<{ done: number; total: number } | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [results,   setResults]   = useState<{ imported: number; failures: { name: string; reason: string }[] } | null>(null);

  function toggleRow(i: number) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  }

  async function handleImport() {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return;
    setImporting(true);
    setError(null);

    // Auto-create any category names that don't already exist
    const newCategoryNames = [
      ...new Set(
        selected
          .map((d) => d.category)
          .filter((name) => name && !categories.find(
            (c) => c.name.toLowerCase() === name.toLowerCase()
          ))
      ),
    ];

    const createdMap = new Map<string, string>(); // lowercase name → new id
    for (const name of newCategoryNames) {
      try {
        const res = await fetch("/api/categories", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name }),
        });
        if (res.ok) {
          const cat = await res.json() as { id: string };
          createdMap.set(name.toLowerCase(), cat.id);
        }
      } catch {
        // continue — dish will fall back to row.categoryId
      }
    }

    setProgress({ done: 0, total: selected.length });

    let done = 0;
    let imported = 0;
    const failures: { name: string; reason: string }[] = [];

    for (const row of selected) {
      // Prefer newly created category, then existing match, then dropdown selection
      const categoryId =
        createdMap.get(row.category.toLowerCase()) ??
        categories.find((c) => c.name.toLowerCase() === row.category.toLowerCase())?.id ??
        row.categoryId;

      try {
        const res = await fetch("/api/menu", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            name:        row.name,
            description: row.description?.trim() || row.name, // fall back so a blank desc never blocks import
            price:       row.price,
            categoryId,
            allergens:   row.allergens,
            spiceLevel:  row.spiceLevel,
            isVeg:       row.isVeg,
            isVegan:     row.isVegan,
            isGlutenFree: row.isGlutenFree,
            isJain:      false,
            prepTime:    row.prepTime,
            isChefPick:  false,
            isPopular:   false,
            isAvailable: true,
            upsellIds:   [],
          }),
        });
        if (res.ok) {
          imported++;
        } else {
          const body = await res.json().catch(() => ({}));
          failures.push({ name: row.name, reason: (body as { error?: string }).error ?? `Failed (${res.status})` });
        }
      } catch {
        failures.push({ name: row.name, reason: "Network error" });
      }
      done++;
      setProgress({ done, total: selected.length });
    }

    router.refresh();
    setImporting(false);
    setProgress(null);

    if (failures.length === 0) {
      onClose();
    } else {
      // Keep the modal open, show what imported vs not, and leave only the
      // failed rows selected so a re-import retries them without duplicating.
      const failedNames = new Set(failures.map((f) => f.name));
      setRows((prev) => prev.map((r) => ({ ...r, selected: r.selected && failedNames.has(r.name) })));
      setResults({ imported, failures });
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const newCatCount = new Set(
    rows
      .filter((r) => r.selected && r.category && !categories.find(
        (c) => c.name.toLowerCase() === r.category.toLowerCase()
      ))
      .map((r) => r.category.toLowerCase())
  ).size;

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Review Extracted Dishes (${extracted.length} found)`}
      description={
        newCatCount > 0
          ? `${newCatCount} new categor${newCatCount === 1 ? "y" : "ies"} will be created automatically. Just click Import — no manual setup needed.`
          : "Select which dishes to import and confirm their categories."
      }
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-ra-muted">
            {progress
              ? `Importing ${progress.done} / ${progress.total}…`
              : `${selectedCount} of ${rows.length} selected`}
            {error && <span className="ml-2 text-red-400">{error}</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={importing}>{results ? "Close" : "Cancel"}</Button>
            <Button
              variant="amber"
              size="sm"
              loading={importing}
              disabled={selectedCount === 0 || importing}
              onClick={handleImport}
            >
              Import {selectedCount} Dish{selectedCount !== 1 ? "es" : ""}
            </Button>
          </div>
        </div>
      }
    >
      {results && (
        <div className="mb-3 rounded-xl border border-ra-border bg-ra-bg p-3">
          <p className="text-sm font-medium text-ra-text">
            Imported {results.imported} of {results.imported + results.failures.length} dish
            {results.imported + results.failures.length !== 1 ? "es" : ""}.
            {results.failures.length > 0 && ` ${results.failures.length} skipped:`}
          </p>
          {results.failures.length > 0 && (
            <ul className="mt-1.5 max-h-32 space-y-0.5 overflow-auto text-xs text-red-400">
              {results.failures.map((f, i) => (
                <li key={i}>• {f.name || "(unnamed)"} — {f.reason}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ra-muted">
            Fix the flagged rows in your CSV and re-import, or close to keep what imported.
          </p>
        </div>
      )}

      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-ra-surface">
            <tr className="border-b border-ra-border text-xs font-medium uppercase tracking-wider text-ra-muted">
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  checked={rows.every((r) => r.selected)}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))
                  }
                  className="accent-ra-accent"
                />
              </th>
              <th className="px-3 py-2 text-left">Dish</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-center">Dietary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-ra-border/50 transition-colors ${
                  row.selected ? "" : "opacity-40"
                }`}
              >
                <td className="px-2 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleRow(i)}
                    className="accent-ra-accent"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-ra-text">{row.name}</p>
                  <p className="text-xs text-ra-muted mt-0.5 line-clamp-1">{row.description}</p>
                  {row.allergens.length > 0 && (
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      ⚠ {row.allergens.join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-xs font-medium text-ra-text truncate">{row.category || "General"}</p>
                  {!categories.find((c) => c.name.toLowerCase() === (row.category || "").toLowerCase()) && row.category && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 mt-0.5">
                      new
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-ra-text">
                  {row.invalidReason ? (
                    <span className="font-sans text-[10px] font-medium text-red-400" title={row.invalidReason}>
                      ⚠ {row.invalidReason}
                    </span>
                  ) : (
                    `$${row.price.toFixed(2)}`
                  )}
                </td>
                <td className="px-3 py-2.5 text-center text-xs text-ra-muted space-x-1">
                  {row.isVeg    && <span title="Vegetarian">🌱</span>}
                  {row.isVegan  && <span title="Vegan">🌿</span>}
                  {row.isGlutenFree && <span title="Gluten-free">🌾</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SpiceDots({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {level === 0 ? (
        <span className="text-xs text-ra-muted">—</span>
      ) : (
        Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < level ? "bg-orange-500" : "bg-ra-border"
            }`}
          />
        ))
      )}
    </span>
  );
}

function AllergenBadges({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0) {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
        None
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {allergens.slice(0, 3).map((a) => (
        <span
          key={a}
          className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400"
        >
          {a}
        </span>
      ))}
      {allergens.length > 3 && (
        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
          +{allergens.length - 3}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Dish Form Modal (Add + Edit)
// ---------------------------------------------------------------------------

function DishModal({
  dish,
  categories,
  allDishes,
  onClose,
}: {
  dish?:       Dish;
  categories:  Category[];
  allDishes:   Dish[];
  onClose:     () => void;
}) {
  const router = useRouter();
  const [apiError,       setApiError]       = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isEdit = Boolean(dish);
  const otherDishes = allDishes.filter((d) => d.id !== dish?.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DishFormValues>({
    resolver: zodResolver(DishFormSchema),
    defaultValues: dish
      ? {
          name:         dish.name,
          description:  dish.description,
          categoryId:   dish.categoryId,
          price:        dish.price,
          imageEmoji:   dish.imageEmoji ?? "",
          spiceLevel:   dish.spiceLevel,
          isVeg:        dish.isVeg,
          isVegan:      dish.isVegan,
          isGlutenFree: dish.isGlutenFree,
          isJain:       dish.isJain,
          allergens:    dish.allergens,
          prepTime:     dish.prepTime,
          isChefPick:   dish.isChefPick,
          isPopular:    dish.isPopular,
          isAvailable:  dish.isAvailable,
          upsellIds:    dish.upsellIds,
        }
      : {
          name:         "",
          description:  "",
          categoryId:   categories[0]?.id ?? "",
          price:        0,
          imageEmoji:   "",
          spiceLevel:   0,
          isVeg:        false,
          isVegan:      false,
          isGlutenFree: false,
          isJain:       false,
          allergens:    [],
          prepTime:     15,
          isChefPick:   false,
          isPopular:    false,
          isAvailable:  true,
          upsellIds:    [],
        },
  });

  const spiceLevel  = watch("spiceLevel");
  const emoji       = watch("imageEmoji");
  const allergens   = watch("allergens");
  const upsellIds   = watch("upsellIds");
  const isVeg       = watch("isVeg");
  const isVegan     = watch("isVegan");
  const isGlutenFree= watch("isGlutenFree");
  const isJain      = watch("isJain");

  function toggleAllergen(a: string) {
    setValue(
      "allergens",
      allergens.includes(a) ? allergens.filter((x) => x !== a) : [...allergens, a]
    );
  }

  function toggleUpsell(id: string) {
    setValue(
      "upsellIds",
      upsellIds.includes(id) ? upsellIds.filter((x) => x !== id) : [...upsellIds, id]
    );
  }

  async function onSubmit(data: DishFormValues) {
    setApiError(null);
    try {
      const url    = isEdit ? `/api/menu/${dish!.id}` : "/api/menu";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...data,
          imageEmoji: data.imageEmoji || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to save dish.");
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "An error occurred.");
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={isEdit ? `Edit: ${dish!.name}` : "Add New Dish"}
      description="Fill in the dish details. Allergen information is required for customer safety."
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Basic Info ─────────────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted">Basic Info</legend>

          <div>
            <label className="block text-sm font-medium text-ra-text mb-1">Dish Name *</label>
            <input
              {...register("name")}
              placeholder="e.g. Butter Chicken"
              className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text placeholder:text-ra-muted/50 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ra-text mb-1">Description *</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="A brief, appetising description…"
              className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text placeholder:text-ra-muted/50 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30 resize-none"
            />
            {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>}
          </div>
        </fieldset>

        {/* ── Category + Emoji ───────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted">Classification</legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ra-text mb-1">Category *</label>
              <select
                {...register("categoryId")}
                className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ra-text mb-1">Image Emoji</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex w-full items-center gap-3 rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm hover:border-ra-accent/40 transition-colors"
                >
                  <span className="text-xl">{emoji || "🍽️"}</span>
                  <span className="text-ra-muted">{emoji ? "Change emoji" : "Pick emoji"}</span>
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-36 overflow-y-auto rounded-xl border border-ra-border bg-ra-surface p-2 shadow-xl">
                    <div className="grid grid-cols-8 gap-1">
                      {FOOD_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setValue("imageEmoji", e); setShowEmojiPicker(false); }}
                          className={`rounded p-1 text-lg hover:bg-white/10 transition-colors ${emoji === e ? "bg-ra-accent/20" : ""}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* ── Pricing + Prep Time ────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-4">Pricing & Timing</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ra-text mb-1">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ra-muted text-sm">$</span>
                <input
                  {...register("price", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full rounded-lg border border-ra-border bg-ra-bg pl-7 pr-3 py-2 text-sm text-ra-text placeholder:text-ra-muted/50 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
                />
              </div>
              {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ra-text mb-1">Prep Time (min)</label>
              <input
                {...register("prepTime", { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="15"
                className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text placeholder:text-ra-muted/50 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
              />
            </div>
          </div>
        </fieldset>

        {/* ── Spice Level ────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">Spice Level</legend>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setValue("spiceLevel", level)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-all ${
                  spiceLevel === level
                    ? "border-ra-accent bg-ra-accent/20"
                    : "border-ra-border hover:border-ra-accent/40"
                }`}
                title={SPICE_LABELS[level]}
              >
                {level === 0 ? "—" : "🌶"}
              </button>
            ))}
            <span className="ml-2 text-sm text-ra-muted">{SPICE_LABELS[spiceLevel]}</span>
          </div>
        </fieldset>

        {/* ── Dietary Toggles ────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">Dietary</legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["isVeg",        "🌱 Vegetarian", isVeg],
              ["isVegan",      "🌿 Vegan",      isVegan],
              ["isGlutenFree", "🌾 Gluten Free", isGlutenFree],
              ["isJain",       "🙏 Jain",       isJain],
            ] as [keyof DishFormValues, string, boolean][]).map(([key, label, active]) => (
              <button
                key={key}
                type="button"
                onClick={() => setValue(key, !active)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    : "border-ra-border text-ra-muted hover:border-ra-accent/40 hover:text-ra-text"
                }`}
              >
                {label}
                {active && <CheckCircle2 className="ml-auto h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── Allergens ──────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
            Allergens <span className="normal-case font-normal text-red-400">(select all that apply)</span>
          </legend>
          <div className="grid grid-cols-5 gap-2">
            {ALLERGENS.map((a) => {
              const checked = allergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAllergen(a)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                    checked
                      ? "border-red-500/40 bg-red-500/15 text-red-400"
                      : "border-ra-border text-ra-muted hover:border-red-500/30 hover:text-red-400/70"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
          {allergens.length === 0 && (
            <p className="mt-2 text-xs text-ra-muted/70">
              Leave empty if the dish contains no common allergens.
            </p>
          )}
        </fieldset>

        {/* ── Highlights ─────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">Highlights & Status</legend>
          <div className="grid grid-cols-3 gap-3">
            <Controller
              control={control}
              name="isChefPick"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label="⭐ Chef's Pick"
                  accent="amber"
                />
              )}
            />
            <Controller
              control={control}
              name="isPopular"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label="🔥 Popular"
                  accent="amber"
                />
              )}
            />
            <Controller
              control={control}
              name="isAvailable"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label="Available"
                  accent="amber"
                />
              )}
            />
          </div>
        </fieldset>

        {/* ── Upsell Suggestions ─────────────────────────────────────── */}
        {otherDishes.length > 0 && (
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
              Upsell Suggestions <span className="normal-case font-normal">(optional)</span>
            </legend>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-ra-border divide-y divide-ra-border/50">
              {otherDishes.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={upsellIds.includes(d.id)}
                    onChange={() => toggleUpsell(d.id)}
                    className="rounded accent-amber-500"
                  />
                  <span className="text-base leading-none">{d.imageEmoji || "🍽️"}</span>
                  <span className="min-w-0 flex-1 text-sm text-ra-text truncate">{d.name}</span>
                  <span className="shrink-0 text-xs text-ra-muted">${d.price.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {apiError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {apiError}
          </div>
        )}

        <ModalFooter className="border-t border-ra-border">
          <Button variant="ghost" type="button" onClick={onClose} className="text-ra-muted">
            Cancel
          </Button>
          <Button variant="amber" type="submit" loading={isSubmitting}>
            {isEdit ? "Save Changes" : "Add Dish"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteModal({
  dish,
  onClose,
}: {
  dish:    Dish;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/menu/${dish.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Delete failed.");
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Delete dish?"
      description={`"${dish.name}" will be permanently removed. This cannot be undone.`}
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="sm"
    >
      {error && (
        <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <ModalFooter className="border-t border-ra-border">
        <Button variant="ghost" onClick={onClose} className="text-ra-muted">Cancel</Button>
        <Button variant="danger" loading={loading} onClick={handleDelete}
          leftIcon={<Trash2 className="h-4 w-4" />}>
          Delete dish
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add category inline modal
// ---------------------------------------------------------------------------

function AddCategoryModal({ onClose }: { onClose: () => void }) {
  const router   = useRouter();
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create category.");
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="New category"
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="sm"
    >
      <div className="px-6 pb-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Starters, Mains, Desserts…"
          className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text placeholder:text-ra-muted/50 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
      <ModalFooter className="border-t border-ra-border">
        <Button variant="ghost" onClick={onClose} className="text-ra-muted">Cancel</Button>
        <Button variant="amber" loading={loading} onClick={handleAdd}>Create</Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Dish row
// ---------------------------------------------------------------------------

function DishRow({
  dish,
  onEdit,
  onDelete,
}: {
  dish:     Dish;
  onEdit:   (d: Dish) => void;
  onDelete: (d: Dish) => void;
}) {
  const router = useRouter();
  const [available, setAvailable] = useState(dish.isAvailable);
  const [toggling,  setToggling]  = useState(false);

  async function toggleAvailability() {
    setToggling(true);
    const next = !available;
    setAvailable(next); // optimistic
    try {
      await fetch(`/api/menu/${dish.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isAvailable: next }),
      });
      router.refresh();
    } catch {
      setAvailable(!next); // rollback
    } finally {
      setToggling(false);
    }
  }

  return (
    <tr className="group border-b border-ra-border/50 hover:bg-white/3 transition-colors">
      {/* Emoji */}
      <td className="w-10 px-4 py-3 text-xl leading-none">
        {dish.imageEmoji || <span className="text-ra-muted/30">🍽️</span>}
      </td>

      {/* Name + badges */}
      <td className="px-4 py-3 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-ra-text">{dish.name}</span>
          {dish.isVeg    && <span className="text-xs text-emerald-400">🌱</span>}
          {dish.isVegan  && <span className="text-xs text-emerald-400">🌿</span>}
          {dish.isChefPick && <ChefHat className="h-3.5 w-3.5 text-amber-400" />}
          {dish.isPopular  && <Flame   className="h-3.5 w-3.5 text-orange-500" />}
        </div>
        <p className="mt-0.5 text-xs text-ra-muted truncate max-w-xs">{dish.description}</p>
      </td>

      {/* Category */}
      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="text-sm text-ra-muted">{dish.category.name}</span>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-sm font-medium text-ra-text">
        ${dish.price.toFixed(2)}
      </td>

      {/* Spice */}
      <td className="hidden px-4 py-3 md:table-cell">
        <SpiceDots level={dish.spiceLevel} />
      </td>

      {/* Allergens */}
      <td className="hidden px-4 py-3 xl:table-cell">
        <AllergenBadges allergens={dish.allergens} />
      </td>

      {/* Prep */}
      <td className="hidden px-4 py-3 text-sm text-ra-muted lg:table-cell">
        {dish.prepTime}m
      </td>

      {/* Available toggle */}
      <td className="px-4 py-3">
        <Switch
          checked={available}
          onCheckedChange={toggleAvailability}
          disabled={toggling}
          accent="amber"
        />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(dish)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ra-muted hover:bg-white/10 hover:text-ra-text transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(dish)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ra-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface MenuPageClientProps {
  categories: Category[];
  dishes:     Dish[];
}

export function MenuPageClient({ categories, dishes }: MenuPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [dishModal,      setDishModal]      = useState<null | "add" | Dish>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Dish | null>(null);
  const [addCatOpen,     setAddCatOpen]     = useState(false);
  const [uploadOpen,     setUploadOpen]     = useState(false);
  const [parsedDishes,   setParsedDishes]   = useState<ExtractedDish[] | null>(null);

  const filteredDishes =
    activeCategory === "all"
      ? dishes
      : dishes.filter((d) => d.categoryId === activeCategory);

  const handleEdit   = useCallback((d: Dish) => setDishModal(d), []);
  const handleDelete = useCallback((d: Dish) => setDeleteTarget(d), []);

  return (
    <div className="px-4 py-8 sm:px-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ra-text">Menu Manager</h1>
          <p className="mt-1 text-sm text-ra-muted">
            {dishes.length} dishes across {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Menu
          </Button>
          <Button
            variant="amber"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setDishModal("add")}
          >
            Add Dish
          </Button>
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* All tab */}
        <button
          onClick={() => setActiveCategory("all")}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "border-ra-accent bg-ra-accent/15 text-ra-accent"
              : "border-ra-border text-ra-muted hover:border-ra-accent/40 hover:text-ra-text"
          }`}
        >
          All <span className="ml-1 text-xs opacity-70">({dishes.length})</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? "border-ra-accent bg-ra-accent/15 text-ra-accent"
                : "border-ra-border text-ra-muted hover:border-ra-accent/40 hover:text-ra-text"
            }`}
          >
            {cat.name}
            <span className="ml-1 text-xs opacity-70">({cat._count.dishes})</span>
          </button>
        ))}

        {/* Add category */}
        <button
          onClick={() => setAddCatOpen(true)}
          className="shrink-0 flex items-center gap-1 rounded-full border border-dashed border-ra-border px-4 py-1.5 text-sm text-ra-muted hover:border-ra-accent/40 hover:text-ra-accent transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Category
        </button>
      </div>

      {/* ── Dish table ───────────────────────────────────────────────── */}
      {filteredDishes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ra-border py-24 text-center">
          <span className="text-4xl">🍽️</span>
          <div>
            <p className="font-display text-base font-semibold text-ra-text">No dishes yet</p>
            <p className="mt-1 text-sm text-ra-muted">
              {activeCategory === "all"
                ? 'Click "Add Dish" to create your first menu item.'
                : "No dishes in this category. Add one or switch category."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ra-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ra-border bg-ra-surface/60">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted w-10" />
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted">Dish</th>
                <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted lg:table-cell">Category</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted">Price</th>
                <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted md:table-cell">Spice</th>
                <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted xl:table-cell">Allergens</th>
                <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted lg:table-cell">Prep</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-ra-muted">Available</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-ra-surface">
              {filteredDishes.map((dish) => (
                <DishRow
                  key={dish.id}
                  dish={dish}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {dishModal !== null && (
        <DishModal
          dish={dishModal === "add" ? undefined : dishModal}
          categories={categories}
          allDishes={dishes}
          onClose={() => setDishModal(null)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          dish={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {addCatOpen && (
        <AddCategoryModal onClose={() => setAddCatOpen(false)} />
      )}
      {uploadOpen && (
        <UploadMenuModal
          onClose={() => setUploadOpen(false)}
          onParsed={(dishes) => {
            setUploadOpen(false);
            setParsedDishes(dishes);
          }}
        />
      )}
      {parsedDishes && (
        <ParsePreviewModal
          extracted={parsedDishes}
          categories={categories}
          onClose={() => setParsedDishes(null)}
        />
      )}
    </div>
  );
}
