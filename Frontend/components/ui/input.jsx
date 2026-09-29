import * as React from "react";
import { cn } from "@/lib/utils";

/* Recessed input (design spec §19): inset shadow, no hard border, blue focus. */
function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[14px] border border-transparent bg-soft px-3.5 py-1",
        "text-[14px] text-foreground outline-none shadow-[inset_3px_3px_8px_rgba(157,166,184,0.14),inset_-3px_-3px_8px_rgba(255,255,255,0.92)]",
        "placeholder:text-[var(--text-subtle)]",
        "focus-visible:border-[rgba(79,110,247,0.45)] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,110,247,0.12)]",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--destructive)]",
        className
      )}
      {...props}
    />
  );
}
export { Input };
