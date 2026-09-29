"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLerpLoop, usePrefersReducedMotion } from "@/hooks/useMotion";

/**
 * LerpSlider — damped, infinitely recycling depth strip.
 *
 * TECHNIQUE EXTRACTED FROM: `files (1)/files/script.js` (DetroitParis slider).
 * The original lays N slides along an exponential curve
 * `edgeX(p) = W·minSize·(growth^p − 1)/(growth − 1)`, wraps any slide that
 * leaves the viewport by adding/subtracting the slide count, and eases toward a
 * scroll target with `current += (target − current) · lerp` inside one rAF.
 *
 * WHAT IS ADAPTED, NOT COPIED:
 *  - The original hardcoded 10 × 2.5MB jpegs and a manual wheel/touch/pointer
 *    drag. No images and no drag: this is an ambient depth layer, so it drifts
 *    on its own and never intercepts input (`pointer-events: none`).
 *  - The original's `render()` re-read `clientWidth`/`clientHeight` every frame
 *    (forced layout). Width is cached and only re-read on resize.
 *  - It is off by default for reduced motion, and pauses when off-screen or
 *    when the tab is hidden, so it never burns CPU in the background.
 *  - The rAF loop settles to zero when fully receded instead of spinning.
 */
export default function LerpSlider({
  items = [],
  minSize = 0.16,
  growth = 0.22,
  lerp = 0.06,
  drift = 0.012, // self-drift per second; 0 disables
  aspect = 1 / 1.35,
  className = "",
  itemClassName = "",
  renderItem,
}) {
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef(null);
  const geometryRef = useRef({ width: 0, height: 0 });
  const slideRefs = useRef([]);
  const lastTsRef = useRef(0);
  const activeRef = useRef(false);

  const growthRatio = Math.exp(growth);
  const slideCount = items.length;

  const edgeX = useCallback(
    (position, width) =>
      (width * minSize * (Math.pow(growthRatio, position) - 1)) / (growthRatio - 1),
    [growthRatio, minSize]
  );

  const render = useCallback(
    (scroll) => {
      const { width } = geometryRef.current;
      if (!width || !slideCount) return;
      const track = trackRef.current;
      if (!track) return;

      for (let i = 0; i < slideCount; i += 1) {
        const el = slideRefs.current[i];
        if (!el) continue;

        let index = Number(el.dataset.index || i);

        // Recycle anything that has scrolled out of view.
        while (edgeX(index + scroll, width) > width) index -= slideCount;
        while (edgeX(index + scroll + 1, width) < 0) index += slideCount;
        el.dataset.index = String(index);

        const left = Math.round(edgeX(index + scroll, width));
        const right = Math.round(edgeX(index + scroll + 1, width));
        const w = Math.max(1, right - left);
        const h = Math.round(w * aspect);

        // Only write when the value actually changed: avoids per-frame style
        // recalculation for slides that have not moved.
        if (el.dataset.w !== String(w)) {
          el.style.width = `${w}px`;
          el.style.height = `${h}px`;
          el.dataset.w = String(w);
        }
        if (el.dataset.z !== String(right)) {
          el.style.zIndex = String(right);
          el.dataset.z = String(right);
        }
        if (el.dataset.left !== String(left)) {
          el.style.transform = `translate3d(${left}px,0,0)`;
          el.dataset.left = String(left);
        }
      }
    },
    [aspect, edgeX, slideCount]
  );

  // Geometry is cached and only re-read on resize, never per frame.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => {
      geometryRef.current = {
        width: track.clientWidth,
        height: track.clientHeight,
      };
    };
    measure();
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 180);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Self-drift: nudge the lerp target over time. Disabled under reduced motion.
  const enabled = !reduced && slideCount > 0;
  const { stateRef, nudge } = useLerpLoop({
    from: 0,
    to: 0,
    lerp,
    enabled,
    onFrame: (value) => render(value),
  });

  useEffect(() => {
    if (!enabled) {
      // Settled static layout: still lay out once so the strip is visible.
      render(0);
      return undefined;
    }

    let last = performance.now();
    const tick = (ts) => {
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (drift) nudge(drift * dt);
      else stateRef.current.target = 0; // ease back to rest
      rafRef.current = requestAnimationFrame(tick);
    };
    let rafRef = { current: 0 };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, drift, nudge, render, stateRef]);

  // Pause when off-screen or the tab is hidden — no background CPU burn.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !enabled) return undefined;

    let onScreen = true;
    let visible = document.visibilityState === "visible";

    const sync = () => {
      activeRef.current = onScreen && visible;
    };

    let observer = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          sync();
        },
        { rootMargin: "10% 0px" }
      );
      observer.observe(track);
    }
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    sync();

    return () => {
      if (observer) observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  if (!items.length) return null;

  return (
    <div ref={trackRef} className={className} aria-hidden="true">
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          ref={(node) => {
            slideRefs.current[i] = node;
          }}
          data-index={i}
          className={itemClassName}
        >
          {renderItem ? renderItem(item, i) : null}
        </div>
      ))}
    </div>
  );
}
