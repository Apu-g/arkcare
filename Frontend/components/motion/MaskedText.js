"use client";

import { useMemo } from "react";
import { usePrefersReducedMotion, useRevealOnScroll } from "@/hooks/useMotion";

/**
 * MaskedText — per-line masked reveal.
 *
 * TECHNIQUE EXTRACTED FROM: `files/script.js` (the "Capsules®" preloader).
 * The original splits a heading into `<span class="line-mask"><span
 * class="reveal-line">` pairs, sets `yPercent: 100`, and staggers the inner
 * spans up to 0. The mask (`overflow: hidden`) is what produces the effect.
 *
 * WHAT IS ADAPTED, NOT COPIED:
 *  - The original hardcodes GSAP, per-character splitting, a fake stepped
 *    progress bar and a 3.5s "preloader" that lies about load time. None of
 *    that is kept.
 *  - Here it is a pure CSS transition driven by one data-attribute flip from
 *    `useRevealOnScroll`, so it cannot re-run on re-render, and it is
 *    server-rendered (no DOM mutation, so no hydration mismatch).
 *  - Reduced motion renders the text plainly.
 *
 * Lines are split on the newline in `lines` (or on `\n` inside `children`),
 * NOT by measuring the DOM — measuring would need a client pass and would
 * produce a different result on the server and the client.
 */
export default function MaskedText({
  as: Tag = "h2",
  lines,
  children,
  className = "",
  lineClassName = "",
  delay = 0,
  step = 45,
  trigger = true,
  ...rest
}) {
  const reduced = usePrefersReducedMotion();

  const split =
    Array.isArray(lines) && lines.length
      ? lines
      : String(children ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

  const { ref, revealed } = useRevealOnScroll({ disabled: reduced || !trigger });

  const units = useMemo(
    () =>
      split.map((line, index) => ({
        key: `${index}-${line.slice(0, 12)}`,
        text: line,
        delay: delay + index * step,
      })),
    [split, delay, step]
  );

  if (reduced) {
    return (
      <Tag className={className} {...rest}>
        {split.join(" ")}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={className} data-revealed={revealed ? "true" : "false"} {...rest}>
      {units.map((unit) => (
        <span key={unit.key} className={"mask-line " + lineClassName}>
          <span
            className="mask-unit"
            style={{ "--mask-delay": `${unit.delay}ms` }}
          >
            {unit.text}
          </span>
        </span>
      ))}
    </Tag>
  );
}
