"use client";

import { usePrefersReducedMotion, useRevealOnScroll } from "@/hooks/useMotion";

/**
 * Reveal — the app's single scroll-reveal primitive.
 *
 * Wraps `useRevealOnScroll` so no component ever hand-rolls its own
 * IntersectionObserver (which is how duplicate/never-cleaned observers
 * accumulate). It sets `data-revealed` once; the CSS transition does the rest.
 *
 * @param delay    ms, kept small and consistent with the motion scale
 * @param as       element to render
 * @param stagger  number of children to cascade across
 */
export default function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  stagger = 0,
  threshold = 0.12,
  disabled = false,
  ...rest
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, revealed } = useRevealOnScroll({
    threshold,
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
      style={delay ? { "--reveal-delay": `${delay}ms` } : undefined}
      {...rest}
    >
      {stagger > 0 && Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={child?.key ?? index}
              data-reveal=""
              data-revealed={revealed ? "true" : "false"}
              style={{ "--reveal-delay": `${delay + index * stagger}ms` }}
            >
              {child}
            </div>
          ))
        : children}
    </Tag>
  );
}
