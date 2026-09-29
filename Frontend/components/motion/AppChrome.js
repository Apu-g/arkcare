"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AmbientLayer from "@/components/motion/AmbientLayer";
import { usePrefersReducedMotion, useScrollProgress } from "@/hooks/useMotion";

/**
 * AppChrome — the two global motion pieces that must exist exactly once.
 *
 * 1. ScrollProgressRail: a 2px celadon→copper rule at the very top. Extracted
 *    from `Scroll-Transition-main/js/script2.js` (`initProgressBar`), but
 *    rewritten so it writes ONE custom property from ONE rAF loop, consumed by
 *    `transform: scaleX()`. The original set `style.width` on every bar on
 *    every scroll update, which is a layout-thrashing pattern; this is
 *    compositor-only.
 *
 * 2. AmbientLayer: mounted here at the root so glass always has something to
 *    refract, instead of each page painting its own background.
 *
 * Both live here rather than in each page so that navigating between routes
 * never tears them down and restarts them.
 */
export default function AppChrome({ children, withProgress = true }) {
  return (
    <>
      {withProgress ? <ScrollProgressRail /> : null}
      <AmbientLayer />
      {children}
    </>
  );
}

function ScrollProgressRail() {
  const reduced = usePrefersReducedMotion();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The hook owns the single rAF loop and writes `--scroll-progress` on the
  // document element. It tears itself down on unmount.
  useScrollProgress();

  // Between routes the bar must not appear to rewind, so reset to 0 and let
  // the loop re-measure the new document height.
  useEffect(() => {
    document.documentElement.style.setProperty("--scroll-progress", "0");
  }, [pathname]);

  if (!mounted || reduced) return null;

  return (
    <div className="nm-progress-rail" aria-hidden="true">
      <div className="nm-progress-fill" />
    </div>
  );
}
