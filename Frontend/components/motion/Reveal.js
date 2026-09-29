"use client";

import { usePrefersReducedMotion, useRevealOnScroll } from "@/hooks/useMotion";

/**
 * Reveal — the app's single scroll-reveal primitive.
 *
 * Wraps `useRevealOnScroll` so no component hand-rolls its own
 * IntersectionObserver (which is how duplicate and uncleaned observers
 * accumulate).
 *
 * The element is VISIBLE by default. JS only sets `data-reveal-pending` for
 * content that starts below the fold, and the observer then flips
 * `data-revealed`. Consequences that matter:
 *   - content is never invisible if JS or the observer fails
 *   - above-the-fold content does not animate or shift
 *   - a re-render cannot restart or double-run the reveal
 */
export default function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  stagger = 0,
  threshold = 0.12,
  margin = 120,
  disabled = false,
  ...rest
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, revealed, pending } = useRevealOnScroll({
    threshold,
    margin,
    disabled: disabled || reduced,
  });

  if (reduced || disabled) {
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal=""
      data-revealed={revealed ? "true" : "false"}
      data-reveal-pending={pending ? "true" : "false"}
      style={delay ? { "--reveal-delay": `${delay}ms` } : undefined}
      {...rest}
    >
      {stagger > 0 && Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={child?.key ?? index}
              data-reveal=""
              data-revealed={revealed ? "true" : "false"}
              data-reveal-pending={pending ? "true" : "false"}
              style={{ "--reveal-delay": `${delay + index * stagger}ms` }}
            >
              {child}
            </div>
          ))
        : children}
    </Tag>
  );
}
