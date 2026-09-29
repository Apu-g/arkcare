"use client";

import { useMemo } from "react";
import { usePrefersReducedMotion, useRevealOnScroll } from "@/hooks/useMotion";

/**
 * MaskedText — per-line masked heading reveal.
 *
 * TECHNIQUE EXTRACTED FROM: `files/script.js` (the "Capsules" preloader).
 * The original splits a heading into `<span class="line-mask"><span
 * class="reveal-line">` pairs, sets `yPercent: 100` and staggers the inner
 * spans up to 0. The `overflow: hidden` mask is what produces the effect.
 *
 * WHAT IS ADAPTED, NOT COPIED:
 *  - No GSAP, and no DOM mutation. Lines are split at render time, so there is
 *    no hydration mismatch and no client-side re-parenting.
 *  - The text is VISIBLE by default; the mask only clips once JS has marked the
 *    element pending (i.e. it starts below the fold). A heading can therefore
 *    never be permanently invisible.
 *  - Reduced motion renders plain text.
 *
 * Lines come from the `lines` prop or from newlines in `children` — never from
 * measuring the DOM, which would need a client pass and could disagree with
 * the server render.
 */
export default function MaskedText({
  as: Tag = "h2",
  lines,
  children,
  className = "",
  lineClassName = "",
  delay = 0,
  step = 45,
  margin = 100,
  ...rest
}) {
  const reduced = usePrefersReducedMotion();

  const split = useMemo(
    () =>
      Array.isArray(lines) && lines.length
        ? lines
        : String(children ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
    [lines, children]
  );

  const { ref, revealed, pending } = useRevealOnScroll({
    disabled: reduced,
    margin,
  });

  if (reduced) {
    return (
      <Tag className={className} {...rest}>
        {split.join(" ")}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={className}
      data-revealed={revealed ? "true" : "false"}
      data-reveal-pending={pending ? "true" : "false"}
      {...rest}
    >
      {split.map((line, index) => (
        <span
          key={`${index}-${line.slice(0, 12)}`}
          className={"mask-line " + lineClassName}
          data-revealed={revealed ? "true" : "false"}
          data-reveal-pending={pending ? "true" : "false"}
        >
          <span className="mask-unit" style={{ "--mask-delay": `${delay + index * step}ms` }}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
