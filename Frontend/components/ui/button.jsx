import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Soft-neumorphic buttons (design spec §18).
 * Primary is deep charcoal with a soft lift; secondary is a white neumorphic
 * surface. Focus keeps a visible ring because shadow alone is a weak affordance.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-[13px] font-semibold outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-shell)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // charcoal CTA
        default:
          "bg-[var(--primary)] text-white shadow-[0_8px_18px_rgba(16,14,26,0.15)] hover:bg-[var(--primary-hover)] hover:-translate-y-px active:translate-y-0",
        // white neumorphic surface
        outline:
          "bg-[var(--surface)] text-[var(--text)] shadow-[6px_7px_16px_rgba(160,168,184,0.16),-6px_-6px_14px_rgba(255,255,255,0.95)] hover:shadow-[10px_12px_24px_rgba(145,154,172,0.21),-8px_-8px_18px_rgba(255,255,255,0.96)] hover:-translate-y-px",
        secondary:
          "bg-[var(--surface-subtle)] text-[var(--text)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-hover)] hover:-translate-y-px",
        destructive:
          "bg-[var(--destructive)] text-white shadow-[0_8px_18px_rgba(191,67,67,0.18)] hover:brightness-95 hover:-translate-y-px",
        // single important accent per workflow
        accent:
          "bg-[var(--accent-blue)] text-white shadow-[0_8px_18px_rgba(79,110,247,0.22)] hover:brightness-105 hover:-translate-y-px",
        ghost:
          "bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]",
        link:
          "bg-transparent text-[var(--text-strong)] underline underline-offset-4 hover:opacity-70",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3.5",
        sm: "h-8 gap-1.5 rounded-[12px] px-3 text-[12px] has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-[14px] has-[>svg]:px-5",
        icon: "size-10 rounded-[14px]",
        iconSm: "size-8 rounded-[12px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
