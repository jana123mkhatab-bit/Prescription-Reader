import { Stethoscope, Clock, ShieldAlert, Apple, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TOPICS = [
  { key: "what_its_for", title: "What it's for", icon: Stethoscope },
  { key: "how_to_take", title: "How to take it", icon: Clock },
  { key: "side_effects", title: "Side effects to watch for", icon: ShieldAlert },
  { key: "nutrition_notes", title: "Food & nutrition notes", icon: Apple },
];

export function SummaryCards({ summary }) {
  if (!summary) {
    return (
      <Alert tone="neutral">
        <AlertTitle>No plain-language summary available</AlertTitle>
        <AlertDescription>We couldn&apos;t find label details for this medication. Your pharmacist can walk you through it.</AlertDescription>
      </Alert>
    );
  }

  if (summary.error) {
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

  if (!summary.structured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>About this medication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{summary.what_its_for}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {TOPICS.map(({ key, title, icon: Icon }) => {
        const text = summary[key];
        if (!text) return null;
        return (
          <Card key={key}>
            <CardHeader className="flex-row items-center gap-2 pb-2">
              <Icon className="h-4 w-4 text-brand" strokeWidth={2} />
              <CardTitle className="text-[15px]">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-ink-muted">{text}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
