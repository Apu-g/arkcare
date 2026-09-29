import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Glass buttons. Primary is deep celadon (CARE), `copper` is reserved for
 * proof/anchor actions so "this commits a record" looks identical everywhere.
 * All motion comes from the shared tokens in styles/theme.css, so every button
 * in the app moves on the same curve and at the same speed.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[13px] text-[13px] font-semibold outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-shell)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-cta)] hover:bg-[var(--primary-hover)] hover:-translate-y-px active:translate-y-0",
        copper:
          "bg-[var(--copper)] text-white shadow-[0_10px_24px_-10px_rgba(169,114,60,0.55)] hover:bg-[var(--copper-bright)] hover:-translate-y-px active:translate-y-0",
        outline:
          "border border-[var(--glass-edge)] bg-[var(--glass-1)] text-[var(--text)] shadow-[var(--shadow-card)] backdrop-blur-[12px] hover:bg-[var(--glass-2)] hover:-translate-y-px",
        secondary:
          "bg-[var(--glass-2)] text-[var(--text)] shadow-[var(--shadow-inset)] hover:bg-[var(--glass-3)]",
        destructive:
          "bg-[var(--destructive)] text-white shadow-[0_10px_24px_-10px_rgba(169,58,58,0.5)] hover:brightness-105 hover:-translate-y-px",
        accent:
          "bg-[var(--info)] text-white shadow-[0_10px_24px_-10px_rgba(44,90,138,0.45)] hover:brightness-110 hover:-translate-y-px",
        ghost:
          "bg-transparent text-[var(--text-muted)] hover:bg-[var(--glass-2)] hover:text-[var(--text-strong)]",
        link:
          "bg-transparent text-[var(--text-strong)] underline underline-offset-4 hover:opacity-70",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3.5",
        sm: "h-8 gap-1.5 rounded-[11px] px-3 text-[12px] has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-[14px] has-[>svg]:px-5",
        icon: "size-10 rounded-[13px]",
        iconSm: "size-8 rounded-[11px]",
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
