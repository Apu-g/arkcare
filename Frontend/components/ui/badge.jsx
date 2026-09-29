import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Pill badges. `copper` is the proof/verification tone — anchored, verified,
 * on-chain — so a record that has been committed always reads the same warm
 * hue across the entire product.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--celadon-soft)] text-[var(--celadon)]",
        secondary: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        solid: "bg-[var(--primary)] text-[var(--primary-foreground)]",
        copper: "bg-[var(--copper-soft)] text-[var(--copper)]",
        success: "bg-[var(--success-soft)] text-[var(--success)]",
        info: "bg-[var(--info-soft)] text-[var(--info)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
        destructive: "bg-[var(--destructive-soft)] text-[var(--destructive)]",
        outline:
          "bg-transparent text-[var(--text-muted)] [box-shadow:inset_0_0_0_1px_var(--border)]",
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
