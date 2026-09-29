import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Glass card. Hierarchy comes from the surface ladder, not from outlines:
 * a 1px light edge, a soft drop, and a top highlight are what read as glass.
 * `.glass-data` (near-opaque) is used for anything carrying medical values.
 */
function Card({ className, tone = "glass", ...props }) {
  const surface =
    tone === "data"
      ? "bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-[20px] saturate-[150%]"
      : tone === "ink"
        ? "bg-[var(--dark-card)] border-white/[.08] text-[var(--dark-text)]"
        : "bg-[var(--glass-1)] backdrop-blur-[20px] saturate-[150%]";

  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-5 rounded-[22px] border border-[var(--glass-edge)] text-card-foreground",
        "shadow-[var(--shadow-card)] [box-shadow:var(--shadow-card),inset_0_1px_0_var(--glass-edge-strong)]",
        surface,
        className
      )}
      {...props}
    />
  );
}
function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-5 pt-5",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4",
        className
      )}
      {...props}
    />
  );
}
function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[13px] font-semibold leading-tight text-[var(--text-strong)]", className)}
      {...props}
    />
  );
}
function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[12px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}
function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("px-5", className)} {...props} />;
}
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5 pb-5 [.border-t]:pt-4", className)}
      {...props}
    />
  );
}
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
