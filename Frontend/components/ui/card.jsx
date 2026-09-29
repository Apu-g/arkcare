import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Card primitive (design spec §11).
 * White surface, 24px radius, soft dual-direction shadow, and an almost
 * invisible border. Hierarchy comes from shadow and spacing, not outlines.
 */
function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-5 rounded-[24px] border border-white/70 bg-card text-card-foreground",
        "shadow-[6px_7px_16px_rgba(160,168,184,0.16),-6px_-6px_14px_rgba(255,255,255,0.95)]",
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
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-6 pt-6",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-5",
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
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}
function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-5", className)}
      {...props}
    />
  );
}
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
