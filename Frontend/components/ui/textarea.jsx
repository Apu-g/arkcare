import * as React from "react";
import { cn } from "@/lib/utils";

/* Recessed textarea, matching Input (design spec §19). */
function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-20 w-full rounded-[14px] border border-transparent bg-soft px-3.5 py-2.5",
        "text-[14px] leading-relaxed text-foreground outline-none",
        "shadow-[inset_3px_3px_8px_rgba(157,166,184,0.14),inset_-3px_-3px_8px_rgba(255,255,255,0.92)]",
        "placeholder:text-[var(--text-subtle)]",
        "focus-visible:border-[rgba(79,110,247,0.45)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,110,247,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--destructive)]",
        className
      )}
      {...props}
    />
  );
}
export { Textarea };
