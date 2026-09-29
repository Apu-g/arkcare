import * as React from "react";
import { cn } from "@/lib/utils";

/* Recessed glass well, matching Input. */
function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-20 w-full rounded-[13px] border border-[var(--glass-hairline)] bg-[var(--glass-2)] px-3.5 py-2.5",
        "text-[14px] leading-relaxed text-foreground outline-none backdrop-blur-[6px]",
        "placeholder:text-[var(--text-subtle)]",
        "focus-visible:border-[var(--celadon-line)] focus-visible:ring-[3px] focus-visible:ring-[var(--celadon-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--destructive)]",
        className
      )}
      {...props}
    />
  );
}
export { Textarea };
