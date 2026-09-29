"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One reduced-motion source of truth.
 *
 * Every motion primitive in the app reads this, so "reduced motion" cannot be
 * honoured in some places and ignored in others. It also tracks changes live
 * rather than only reading the media query once, which matters for users who
 * toggle the OS setting while the app is open.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);

    const onChange = (event) => setReduced(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Reveal-on-enter via IntersectionObserver.
 *
 * Why a hook and not a CSS-only animation: a CSS animation starts on mount and
 * replays on every re-render, which is exactly the "element animates twice"
 * problem. This flips a data attribute once and never again, and disconnects
 * the observer on unmount.
 *
 * @param options.threshold  how much of the element must be visible
 * @param options.rootMargin negative margin triggers slightly before entry
 * @param options.once       reveal only the first time (default true)
 * @param options.disabled   skip observation entirely (reduced motion, SSR)
 */
export function useRevealOnScroll({
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
  once = true,
  disabled = false,
} = {}) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (disabled) {
      // Reduced motion: show immediately, observe nothing.
      setRevealed(true);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    // No IntersectionObserver (very old browsers, or jsdom in tests):
    // degrade to "always visible" rather than an invisible element.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, disabled]);

  return { ref, revealed };
}

/**
 * Reads a DOM node's scroll progress through ONE rAF loop.
 *
 * This deliberately does not use a `scroll` event listener: scroll events fire
 * at unpredictable rates and force synchronous layout reads on every fire,
 * which is the usual cause of jank. Instead we poll a cached geometry on rAF
 * and only write `--scroll-progress` (a custom property consumed by a
 * `transform: scaleX`), so the browser only ever does compositor work.
 *
 * @param selector  element whose scroll progress is measured (the scroller)
 * @param onProgress called with 0..1 on change only
 */
export function useScrollProgress(selector = null, onProgress) {
  const progressRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const root = document.documentElement;
    let cachedMax = 1;

    const measure = () => {
      const scroller =
        (selector ? document.querySelector(selector) : null) ||
        document.scrollingElement ||
        root;
      const max = scroller.scrollHeight - scroller.clientHeight;
      cachedMax = max > 0 ? max : 1;
      return scroller.scrollTop / cachedMax;
    };

    let running = true;
    const tick = () => {
      if (!running) return;
      const next = Math.min(1, Math.max(0, measure()));
      // Only touch the DOM when the value actually moved.
      if (Math.abs(next - progressRef.current) > 0.0005) {
        progressRef.current = next;
        root.style.setProperty("--scroll-progress", next.toFixed(4));
        if (onProgress) onProgress(next);
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };

    // Re-measure geometry when the document size changes (async data landing).
    const onResize = () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      measure();
      frameRef.current = window.requestAnimationFrame(tick);
    };

    measure();
    frameRef.current = window.requestAnimationFrame(tick);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      running = false;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      root.style.removeProperty("--scroll-progress");
    };
  }, [selector, onProgress]);

  return progressRef;
}

/**
 * Shared damped-lerp loop.
 *
 * Lifted out of the extracted slider demo so the lerp math exists in exactly
 * one place. A single rAF drives it and it always terminates, so no animation
 * loop can outlive its component (the leak the brief called out).
 */
export function useLerpLoop({ from, to, lerp, onFrame, enabled = true }) {
  const stateRef = useRef({ current: from, target: to, running: false });
  const frameRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  // `step` is defined once and re-entrant on `frameRef`, so nudging the
  // target re-uses the same loop instead of spawning a second one.
  const stepRef = useRef(() => {});
  stepRef.current = () => {
    const s = stateRef.current;
    s.current += (s.target - s.current) * lerp;
    if (Math.abs(s.target - s.current) < 0.0001) s.current = s.target;
    if (onFrameRef.current) onFrameRef.current(s.current);

    // Settle instead of spinning an idle rAF forever.
    if (s.current === s.target) {
      s.running = false;
      return;
    }
    frameRef.current = window.requestAnimationFrame(() => stepRef.current());
  };

  const ensureRunning = () => {
    if (stateRef.current.running) return;
    stateRef.current.running = true;
    frameRef.current = window.requestAnimationFrame(() => stepRef.current());
  };

  useEffect(() => {
    if (!enabled) {
      stateRef.current.running = false;
      return undefined;
    }
    stateRef.current.target = to;
    ensureRunning();

    // Capture the ref's identity so cleanup never reads a newer value.
    const state = stateRef.current;
    return () => {
      state.running = false;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [to, enabled]);

  const nudge = (delta) => {
    if (!enabled) return;
    stateRef.current.target += delta;
    ensureRunning();
  };

  return { stateRef, nudge };
}
