"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BlindsReveal from "@/components/motion/BlindsReveal";
import { usePrefersReducedMotion } from "@/hooks/useMotion";

/**
 * RouteCurtain — a short tiled wipe on route change.
 *
 * Built on `BlindsReveal`, whose technique came from the Scroll-Transition
 * reference. The original pinned a `scrub` timeline over a full-bleed image
 * layer; here the same tile cascade runs for ~500ms as a transition, so
 * navigation reads as one continuous surface rather than a page swap.
 *
 * Deliberately restrained and strictly bounded:
 *  - it never blocks input for more than one transition
 *  - it never delays navigation: it plays on top of the already-committed
 *    route, so a slow curtain can never stall navigation
 *  - it is skipped entirely under reduced motion, on first load, and for
 *    same-path updates, and it tears down on unmount
 */
export default function RouteCurtain() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();

  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const first = useRef(true);
  const timerRef = useRef(0);

  useEffect(() => {
    // Never curtain the very first paint — that is content arriving, not a
    // transition, and an entrance animation there only delays the page.
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (reduced) return undefined;

    setVisible(true);
    // One frame so the tiles mount in their closed state before animating.
    const raf = requestAnimationFrame(() => setActive(true));

    timerRef.current = window.setTimeout(() => {
      setActive(false);
      window.setTimeout(() => setVisible(false), 620);
    }, 40);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timerRef.current);
    };
  }, [pathname, reduced]);

  if (reduced) return null;

  return (
    <BlindsReveal
      active={active && visible}
      className="nm-curtain"
      tone="celadon"
      duration={420}
      stagger={11}
    />
  );
}
