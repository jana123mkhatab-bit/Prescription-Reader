import { useState } from "react";
import { Stethoscope, Clock, ShieldAlert, Apple, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const TOPICS = [
  { key: "what_its_for", title: "What it's for", titleAr: "الغرض من الدواء", icon: Stethoscope },
  { key: "how_to_take", title: "How to take it", titleAr: "طريقة الاستخدام", icon: Clock },
  { key: "side_effects", title: "Side effects to watch for", titleAr: "الآثار الجانبية المحتملة", icon: ShieldAlert },
  { key: "nutrition_notes", title: "Food & nutrition notes", titleAr: "ملاحظات غذائية", icon: Apple },
];

function LanguageToggle({ lang, setLang }) {
  return (
    <div className="inline-flex items-center gap-1 self-start rounded-DEFAULT bg-surface-sunken p-1">
      {[
        ["en", "English"],
        ["ar", "العربية"],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors",
            lang === value ? "bg-surface-raised text-ink shadow-sm" : "text-ink-muted hover:text-ink"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SummaryCards({ summary }) {
  const [lang, setLang] = useState("en");
  const hasArabic = !!summary?.ar?.structured;
  const active = summary?.[lang] ?? summary?.en;

  if (!summary) {
    return (
      <Alert tone="neutral">
        <AlertTitle>No plain-language summary available</AlertTitle>
        <AlertDescription>We couldn&apos;t find label details for this medication. Your pharmacist can walk you through it.</AlertDescription>
      </Alert>
    );
  }

  if (active?.error) {
    return (
      <Alert tone="neutral">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" strokeWidth={1.75} />
        <div>
          <AlertTitle>AI summary unavailable right now</AlertTitle>
          <AlertDescription>Ask your pharmacist to walk you through what it&apos;s for, how to take it, and what to watch for.</AlertDescription>
        </div>
      </Alert>
    );
  }

  if (!active?.structured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>About this medication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{active?.what_its_for}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3" dir={lang === "ar" ? "rtl" : "ltr"}>
      {hasArabic && <LanguageToggle lang={lang} setLang={setLang} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map(({ key, title, titleAr, icon: Icon }) => {
          const text = active[key];
          if (!text) return null;
          return (
            <Card key={key}>
              <CardHeader className="flex-row items-center gap-2 pb-2">
                <Icon className="h-4 w-4 text-brand" strokeWidth={2} />
                <CardTitle className="text-[15px]">{lang === "ar" ? titleAr : title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-ink-muted">{text}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
