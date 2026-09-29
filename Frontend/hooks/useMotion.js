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
 * PROGRESSIVE ENHANCEMENT. Returns a `pending` flag alongside `revealed`:
 * `pending` is only true for elements that are genuinely below the fold when
 * the component mounts. CSS hides ONLY `[data-reveal-pending="true"]`, so:
 *   - no JS / no IntersectionObserver  -> content visible
 *   - element already in the viewport  -> no animation, no layout shift
 *   - element below the fold           -> animates on approach
 *
 * Why not hide by default: an earlier revision did, which made real content
 * permanently invisible whenever the observer failed to fire. A reveal must
 * never be load-bearing for readability.
 *
 * @param options.margin  px of viewport below the fold to count as "pending"
 */
export function useRevealOnScroll({
  // threshold 0 = reveal as soon as ANY part of the element enters the
  // viewport. A non-zero threshold is a trap here: it is a fraction OF THE
  // ELEMENT, not of the screen, so a section taller than the viewport can
  // never satisfy it. A 22,000px section at threshold 0.12 needs 2,659px
  // visible inside a ~900px viewport — impossible — and it stayed at
  // opacity:0 forever, which silently blanked most of the page.
  threshold = 0,
  rootMargin = "0px 0px -4% 0px",
  margin = 120,
  once = true,
  disabled = false,
} = {}) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (disabled) return undefined; // reduced motion -> never pending, always visible

    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === "undefined") return undefined;

    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    // Already on screen at mount: leave it alone. Animating content the user
    // is already looking at is noise, and it costs a layout shift.
    if (rect.top < vh - margin) return undefined;

    setPending(true);

    const reveal = () => {
      setRevealed(true);
      setPending(false);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
            setPending(true);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    // SAFETY NET. Content must never be permanently invisible because an
    // observer misbehaved. Anything still pending after a bounded time is
    // shown regardless. This is a backstop only — the observer normally wins.
    const failsafe = window.setTimeout(() => {
      setPending((stillPending) => {
        if (stillPending) reveal();
        return false;
      });
    }, 4000);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [threshold, rootMargin, margin, once, disabled]);

  return { ref, revealed, pending };
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
