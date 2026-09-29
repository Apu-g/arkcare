"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMotion";

/**
 * BlindsReveal — tiled reveal, used as the route transition curtain.
 *
 * TECHNIQUE EXTRACTED FROM: `Scroll-Transition-main/js/script2.js`.
 * The original builds a responsive grid of `<rect>`s into an SVG `<mask>` and
 * staggers each one from `opacity: 0` to `1` in shuffled order, so a full-bleed
 * layer is uncovered tile by tile (`stagger.each: 0.02`).
 *
 * WHAT IS ADAPTED, NOT COPIED:
 *  - GSAP and the pinned `scrub: 2.5` timeline are NOT used. Pinning hijacks
 *    page scroll, which is hostile in a clinical tool where reading position
 *    must stay predictable.
 *  - The original rebuilt the whole timeline on every resize and animated each
 *    rect through JS. Here the tiles are React-rendered once per column count
 *    and the entire animation is ONE `data-active` toggle plus per-column CSS
 *    transition-delay. There is no animation frame at all, so it cannot
 *    jank, cannot leak, and costs the compositor almost nothing.
 *  - Tile count drops on small screens (fewer, larger tiles).
 *  - Reduced motion renders the content with no curtain whatsoever.
 *
 * `onComplete` fires via `transitionend` on the LAST column only, so callers
 * get a single accurate completion signal rather than N.
 */
export default function BlindsReveal({
  active = false,
  columns,
  children,
  className = "",
  duration = 520,
  stagger = 14,
  tone = "celadon", // "celadon" | "copper" | "ink"
  onComplete,
}) {
  const reduced = usePrefersReducedMotion();
  const [cols, setCols] = useState(columns ?? 0);
  const lastColRef = useRef(null);

  useEffect(() => {
    if (columns) {
      setCols(columns);
      return undefined;
    }
    const compute = () => {
      const w = window.innerWidth;
      setCols(w <= 599 ? 5 : w <= 1024 ? 8 : 12);
    };
    compute();

    // Debounced so a drag-resize does not thrash React state.
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(compute, 200);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [columns]);

  // Single completion signal, taken from the last tile finishing.
  useEffect(() => {
    const node = lastColRef.current;
    if (!active || reduced || !node) return undefined;

    const onEnd = (event) => {
      if (event.target === node) onComplete?.();
    };
    node.addEventListener("transitionend", onEnd);
    return () => node.removeEventListener("transitionend", onEnd);
  }, [active, reduced, onComplete]);

  if (reduced) return <div className={className}>{children}</div>;

  const toneColor =
    tone === "copper"
      ? "var(--copper)"
      : tone === "ink"
        ? "var(--dark-card-2)"
        : "var(--celadon)";

  return (
    <div
      className={className}
      data-active={active ? "true" : "false"}
      style={{
        "--blind-dur": `${duration}ms`,
        "--blind-stagger": `${stagger}ms`,
      }}
      aria-hidden={active ? "true" : undefined}
    >
      {cols > 0 ? (
        <div className="nm-blind-grid" aria-hidden="true">
          {Array.from({ length: cols }, (_, column) => (
            <span
              key={column}
              className="nm-blind-col"
              style={{
                "--blind-col": column,
                background:
                  column % 3 === 2
                    ? `linear-gradient(180deg, ${toneColor}, var(--copper))`
                    : `linear-gradient(180deg, ${toneColor}, var(--celadon))`,
              }}
              ref={column === cols - 1 ? (node) => { lastColRef.current = node; } : undefined}
            />
          ))}
        </div>
      ) : null}
      <div className="nm-blind-content">{children}</div>
    </div>
  );
}
