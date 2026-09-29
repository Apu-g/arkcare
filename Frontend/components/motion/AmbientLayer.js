"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMotion";

/**
 * AmbientLayer — the level-2 surface in the glass hierarchy.
 *
 * Two very soft mineral washes behind everything, so the glass panels have
 * something to actually refract. Deliberately NOT glowing blobs or neon:
 * a celadon wash and a copper wash at low opacity read as depth in a calm
 * room, which is the clinical register we want.
 *
 * It is a fixed, pointer-events-none div with two blurred radial gradients —
 * composited once, no per-frame JS, and effectively free. It also re-tints
 * itself when the surrounding scope flips to the ink (trust) surface, which is
 * what makes the audit views feel like a different, heavier material.
 */
export default function AmbientLayer({ className = "" }) {
  const reduced = usePrefersReducedMotion();
  // Delay mounting one frame so first paint is not held up by a blur filter.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (reduced) return null;

  return (
    <div
      className={"ambient-layer " + className}
      data-ready={ready ? "true" : "false"}
      aria-hidden="true"
    />
  );
}
