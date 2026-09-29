import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Pill badges with semantic colors (design spec §22). */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary-soft)] text-[var(--text-strong)]",
        secondary: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        // dark selected/pill state
        solid: "bg-[var(--primary)] text-white",
        success: "bg-[rgba(49,185,120,0.12)] text-[#248A5A]",
        info: "bg-[rgba(79,110,247,0.12)] text-[#405BD0]",
        warning: "bg-[rgba(244,198,78,0.18)] text-[#9A7316]",
        destructive: "bg-[rgba(235,90,90,0.12)] text-[#BF4343]",
        outline: "bg-transparent text-[var(--text-muted)] shadow-[inset_0_0_0_1px_var(--border)]",
        gold: "bg-[rgba(217,184,104,0.16)] text-[#8A6F34]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
export { Badge, badgeVariants };
