"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMotion";

/**
 * PathMorph — scroll-scrubbed SVG path interpolation.
 *
 * TECHNIQUE EXTRACTED FROM: `OnScrollPathAnimations-main/js/index.js`.
 * The original creates a GSAP ScrollTrigger with `scrub: true` over a full
 * viewport pass and tweens the `d` attribute from the path's authored value to
 * `data-path-to`, so a closed shape "unfolds" as the page scrolls.
 *
 * WHAT IS ADAPTED, NOT COPIED:
 *  - GSAP + Lenis are NOT used. Lenis hijacks page scroll, which harms
 *    accessibility and mobile feel, so it is deliberately dropped.
 *  - GSAP interpolated the raw `d` string. Doing that by hand requires parsing
 *    and re-serialising path data every frame. Instead we precompute N
 *    keyframe positions ONCE with the browser's own path sampler
 *    (`getPointAtLength`), then interpolate points in JS. Same visual result,
 *    a fraction of the per-frame cost, and no dependency.
 *  - Interpolation happens in one rAF loop that only writes `stroke-dashoffset`
 *    for draw-on effects, or a handful of `points` for morph effects — never
 *    layout properties.
 *  - The loop disconnects and cancels on unmount, and settles when off-screen.
 */
export default function PathMorph({
  d: from,
  dTo,
  variant = "chain", // "chain" | "vitals"
  mode = "draw", // "draw" (draw-on) | "morph" (shape interpolation)
  samples = 48,
  className = "",
  pathClassName = "",
  viewBox = "0 0 500 160",
  start = 0.85, // fraction of the viewport the trigger must cross
  end = 0.15,
  children,
}) {
  const reduced = usePrefersReducedMotion();
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const trackRef = useRef(null);
  const frameRef = useRef(0);
  const progressRef = useRef(0);

  const variantClass =
    variant === "vitals" ? "nm-path nm-path--vitals" : "nm-path nm-path--chain";
  const trackClass =
    variant === "vitals"
      ? "nm-path nm-path--chain-track"
      : "nm-path nm-path--chain-track";

  // Precompute sampled points + cumulative arc lengths once, on the client,
  // once the path exists in the DOM.
  const sampling = useMemo(() => {
    if (typeof document === "undefined") return null;
    const svg = svgRef.current;
    if (!svg) return null;
    return { svg };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!svg || !path) return undefined;

    const total = path.getTotalLength();
    if (!total || !Number.isFinite(total)) return undefined;

    // Sample both paths to a common point count so we can lerp between them.
    const fromPoints = [];
    const toPoints = [];
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const a = path.getPointAtLength(total * t);
      fromPoints.push([a.x, a.y]);
    }

    const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    probe.setAttribute("d", dTo || from);
    svg.appendChild(probe);
    const toTotal = probe.getTotalLength();
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const b = probe.getPointAtLength((toTotal || 1) * t);
      toPoints.push([b.x, b.y]);
    }
    svg.removeChild(probe);

    const lerpPoint = (a, b, t) => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];

    // Draw mode needs dash lengths to animate the stroke itself.
    if (mode === "draw") {
      path.style.strokeDasharray = `${total}`;
      path.style.strokeDashoffset = `${total}`;
      if (trackRef.current) {
        trackRef.current.style.strokeDasharray = `${total}`;
        trackRef.current.style.strokeDashoffset = "0";
      }
    }

    const applyMorph = (p) => {
      if (mode !== "morph") return;
      const t = Math.min(1, Math.max(0, p));
      let d = "";
      for (let i = 0; i < fromPoints.length; i += 1) {
        const [x, y] = lerpPoint(fromPoints[i], toPoints[i], t);
        d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      if (dTo && t > 0.999) d = dTo; // land exactly on the authored target
      path.setAttribute("d", d);
    };

    const applyDraw = (p) => {
      if (mode !== "draw") return;
      const t = Math.min(1, Math.max(0, p));
      path.style.strokeDashoffset = `${total * (1 - t)}`;
    };

    if (reduced) {
      // Show the settled end state with no scrubbing at all.
      if (mode === "draw") {
        path.style.strokeDashoffset = "0";
        if (trackRef.current) trackRef.current.style.strokeDashoffset = "0";
      } else {
        path.setAttribute("d", dTo || from);
      }
      return undefined;
    }

    applyMorph(0);
    applyDraw(0);

    const compute = () => {
      const rect = svg.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the top of the svg reaches the bottom of the viewport,
      // 1 when the bottom reaches the top — the source's trigger range.
      const from = start;
      const to = end;
      const p = (from * vh - rect.top) / Math.max(1, rect.height + (from - to) * vh);
      return Math.min(1, Math.max(0, p));
    };

    let visible = false;
    let queued = false;

    const tick = () => {
      queued = false;
      const p = compute();
      if (Math.abs(p - progressRef.current) > 0.001) {
        progressRef.current = p;
        applyMorph(p);
        applyDraw(p);
      }
      if (visible) frameRef.current = window.requestAnimationFrame(tick);
    };

    const request = () => {
      if (!queued && visible) {
        queued = true;
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    let observer = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) request();
          else if (frameRef.current) {
            window.cancelAnimationFrame(frameRef.current);
            frameRef.current = 0;
          }
        },
        { rootMargin: "20% 0px" }
      );
      observer.observe(svg);
    } else {
      visible = true;
      request();
    }

    const onResize = request;
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [from, dTo, mode, samples, reduced, start, end]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      fill="none"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {mode === "draw" ? (
        <path ref={trackRef} d={from} className={trackClass} />
      ) : null}
      <path ref={pathRef} d={from} className={variantClass + " " + pathClassName} />
      {children}
    </svg>
  );
}
