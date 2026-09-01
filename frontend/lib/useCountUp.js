import { useEffect, useRef, useState } from "react";

// Animates a numeric stat tile from 0 to `value` on mount/change. Falls back
// to an instant jump for non-numeric values (e.g. "—") and respects
// prefers-reduced-motion by skipping straight to the final value.
export function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(typeof value === "number" ? 0 : value);
  const frame = useRef(null);

  useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      setDisplay(value);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}
