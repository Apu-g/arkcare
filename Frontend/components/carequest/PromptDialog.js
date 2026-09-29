"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, ShieldCheck } from "lucide-react";

/**
 * A proper inline input field that replaces the native window.prompt popup.
 * Used for mission responses that need a written note (Need Help / Not done).
 */
export default function PromptDialog({
  open,
  title,
  description,
  placeholder,
  confirmLabel = "Submit",
  required = false,
  onCancel,
  onConfirm,
}) {
  const [value, setValue] = useState("");

  function close() {
    setValue("");
    onCancel?.();
  }

  function confirm() {
    if (required && !value.trim()) return;
    onConfirm(value);
    setValue("");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-[18px] w-[18px] text-[var(--celadon)]" strokeWidth={1.75} />
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Textarea
          rows={4}
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
        />
        <p className="flex items-start gap-1.5 text-[10.5px] leading-4 text-[var(--text-muted)]">
          <ShieldCheck className="mt-0.5 h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
          AI never prescribes, diagnoses or approves anything. What you write here goes to
          your care team.
        </p>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={required && !value.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
