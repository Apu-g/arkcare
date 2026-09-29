import * as React from "react";
import { cn } from "@/lib/utils";

/* Recessed glass well — a translucent field the page reads through. */
function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[13px] border border-[var(--glass-hairline)] bg-[var(--glass-2)] px-3.5 py-1",
        "text-[14px] text-foreground outline-none backdrop-blur-[6px]",
        "placeholder:text-[var(--text-subtle)]",
        "focus-visible:border-[var(--celadon-line)] focus-visible:ring-[3px] focus-visible:ring-[var(--celadon-soft)]",
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
