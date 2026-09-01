import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createShareLink, ApiError } from "@/lib/api";

export function ShareCard({ scanId }) {
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [url, setUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (state === "ready" && url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 152, margin: 1, color: { dark: "#0b1b2b", light: "#ffffff" } });
    }
  }, [state, url]);

  async function generate() {
    setState("loading");
    try {
      const { url } = await createShareLink(scanId);
      setUrl(url);
      setState("ready");
    } catch (err) {
      setState("error");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can be unavailable (older browsers, non-secure context) -- link is still selectable
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT bg-secondary-soft text-secondary-ink">
            <Share2 className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">Share with a caregiver</p>
            <p className="text-xs text-ink-muted">A read-only summary — drug name, dosage, and key warnings only.</p>
          </div>
        </div>

        {state === "idle" && (
          <Button variant="secondary" size="sm" className="w-fit" onClick={generate}>
            Generate share link
          </Button>
        )}

        {state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Creating link…
          </div>
        )}

        {state === "error" && (
          <p className="text-sm text-danger">Couldn&apos;t create a share link right now. Please try again.</p>
        )}

        {state === "ready" && (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <canvas ref={canvasRef} className="shrink-0 rounded-DEFAULT border border-border" />
            <div className="flex flex-1 flex-col gap-2">
              <p className="break-all rounded-DEFAULT bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">{url}</p>
              <Button variant="secondary" size="sm" className="w-fit" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
