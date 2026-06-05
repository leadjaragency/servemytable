"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { SupportedLocale } from "@/lib/admin-locale";

const LANGUAGES: {
  code: SupportedLocale;
  label: string;
  flag: string;
  comingSoon?: boolean;
}[] = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷", comingSoon: true },
  { code: "es", label: "Español",  flag: "🇪🇸", comingSoon: true },
];

interface LanguageSelectorProps {
  currentLocale: SupportedLocale;
  restaurantId: string;
}

export function LanguageSelector({ currentLocale, restaurantId }: LanguageSelectorProps) {
  const t = useTranslations("admin.layout");
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const current = LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0];

  async function handleSelect(code: SupportedLocale) {
    if (code === currentLocale || saving) return;
    setSaving(true);
    try {
      await fetch("/api/restaurant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage: code }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-2.5 py-1 text-xs font-medium text-[#FAF6ED] hover:bg-[#201F1F] disabled:opacity-60"
          disabled={saving}
          aria-label={t("language")}
        >
          <span>{current.flag}</span>
          <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3 text-[#AD897E]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[160px] rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-1 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#AD897E]">
            {t("language")}
          </p>
          {LANGUAGES.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              disabled={!!lang.comingSoon}
              onSelect={() => !lang.comingSoon && handleSelect(lang.code)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none transition-colors
                ${lang.comingSoon
                  ? "cursor-not-allowed opacity-50"
                  : lang.code === currentLocale
                    ? "bg-[#C6A34E]/15 font-semibold text-[#E8C269]"
                    : "text-[#FAF6ED]/80 hover:bg-white/5"
                }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1">{lang.label}</span>
              {lang.comingSoon && (
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[#AD897E]">
                  {t("languageSoon")}
                </span>
              )}
              {lang.code === currentLocale && !lang.comingSoon && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
