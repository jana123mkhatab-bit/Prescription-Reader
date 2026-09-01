import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chatAboutDrug, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["Can I take this with food?", "What if I miss a dose?", "Any interactions with alcohol?"];

export function DrugChat({ drugName }) {
  const [messages, setMessages] = useState([]); // {role: "patient"|"assistant", content}
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function ask(text) {
    const q = text.trim();
    if (!q || loading) return;
    setQuestion("");
    setError(null);
    const nextMessages = [...messages, { role: "patient", content: q }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const { answer } = await chatAboutDrug(drugName, q, messages);
      setMessages([...nextMessages, { role: "assistant", content: answer }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-violet-soft bg-gradient-to-b from-violet-soft/40 to-surface-raised">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT bg-violet text-white">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">Ask about {drugName}</p>
            <p className="text-xs text-ink-muted">Grounded in this medication&apos;s actual label data.</p>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-violet-soft bg-surface-raised px-3 py-1.5 text-xs font-medium text-violet-ink transition-colors hover:bg-violet-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "patient"
                    ? "self-end bg-brand text-white"
                    : "self-start whitespace-pre-wrap bg-surface-sunken text-ink"
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 self-start rounded-lg bg-surface-sunken px-3.5 py-2.5 text-sm text-ink-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type a question…"
            className="flex-1 rounded-DEFAULT border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/20"
          />
          <Button type="submit" size="default" disabled={!question.trim() || loading} className="bg-violet hover:bg-violet-ink">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
