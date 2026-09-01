import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "rx-theme";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

// Binary light/dark toggle. Un-set (no explicit choice) follows the OS
// preference via the prefers-color-scheme block in globals.css; clicking
// pins an explicit choice in localStorage and flips the data-theme attribute
// immediately (see the blocking script in _document.js for the no-flash
// initial load).
export function ThemeToggle({ className }) {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    setTheme(stored === "light" || stored === "dark" ? stored : systemPrefersDark() ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  if (theme === null) {
    return <div className={cn("h-9 w-9", className)} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT border border-border bg-surface-raised text-ink-muted transition-colors hover:text-ink",
        className
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  );
}
