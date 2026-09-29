"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  LifeBuoy,
  Link2,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import { getMyHelpRequests, requestDirectHelp } from "@/actions/staffActions";
import { pusherClient } from "@/lib/pusher";
import { useAuth } from "@/hooks/useAuth";

const QUICK = [
  "I have a side effect from my medicine",
  "I need help understanding my prescription",
  "My symptoms are getting worse",
  "I want to talk to a nurse",
];

/**
 * Floating "Need Help" affordance for the patient. Raises a Need-Help handoff
 * that lands in the nurse/coordinator queue (and the doctor's view once
 * escalated). The request is content-hashed and anchored on-chain, and the
 * patient sees that proof plus the eventual resolution.
 */
export default function NeedHelpButton({ userId: userIdProp }) {
  const { user } = useAuth();
  const userId = userIdProp || user?.id || user?._id || "";
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const [mine, setMine] = useState([]);

  const load = useCallback(async () => {
    try {
      setMine(await getMyHelpRequests());
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Refresh the request list when staff update a case in realtime.
  useEffect(() => {
    if (!userId) return undefined;
    let channel;
    try {
      channel = pusherClient.subscribe("private-carequest-user-" + userId);
      channel.bind("mission.updated", load);
    } catch {}
    return () => {
      try {
        channel?.unbind("mission.updated", load);
        pusherClient.unsubscribe("private-carequest-user-" + userId);
      } catch {}
    };
  }, [userId, load]);

  async function send() {
    setBusy(true);
    setError("");
    setSent(null);
    try {
      const result = await requestDirectHelp({ problem, category });
      setSent(result);
      setProblem("");
      await load();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  const openCount = mine.filter((c) => c.status !== "resolved").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cq-need-help-btn"
        title="Ask a nurse or your care team for help"
      >
        <LifeBuoy className="h-[18px] w-[18px]" strokeWidth={1.75} />
        <span className="text-[12px] font-semibold">Need Help</span>
        {openCount > 0 ? (
          <span className="cq-need-help-badge">{openCount}</span>
        ) : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-[18px] w-[18px]" strokeWidth={1.75} /> Need help
            </DialogTitle>
            <DialogDescription>
              Tell a nurse (and your care team) what you need. Your request is hashed
              and anchored on the local chain so it can&apos;t be lost or quietly
              dropped.
            </DialogDescription>
          </DialogHeader>

          <div className="nm-stack-sm">
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setProblem(text)}
                  className="cq-pixel-label hover:bg-[var(--surface-muted)]"
                >
                  {text}
                </button>
              ))}
            </div>

            <Textarea
              rows={4}
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              placeholder="Describe what you need help with (non-emergency)."
            />

            <div className="flex flex-wrap gap-1.5">
              {["general", "medication", "symptoms", "appointment"].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={
                    "cq-pixel-label " +
                    (category === c ? "cq-info-label" : "hover:bg-[var(--surface-muted)]")
                  }
                >
                  {c}
                </button>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={busy || problem.trim().length < 4}
              onClick={send}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Send className="h-4 w-4" strokeWidth={1.75} />
              )}
              Send to my care team
            </Button>

            {error ? (
              <p className="text-[11.5px] text-[var(--destructive)]">{error}</p>
            ) : null}

            {sent ? (
              <div className="rounded-[16px] bg-[var(--success-soft)] p-3 text-[11.5px] text-[var(--success)]">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                  <CheckCircle2 className="h-[16px] w-[16px]" strokeWidth={1.75} /> Help request sent
                </div>
                <p className="mt-1">
                  A nurse will pick this up. Your request is on-chain
                  {sent.onChain === "anchored" ? " (anchored)" : ""}.
                </p>
                {/* Request hash is provenance data: readable, never blurred. */}
                <p className="mt-1 break-all font-mono text-[10px] text-[var(--text-muted)]">
                  proof {String(sent.requestHash || "").slice(0, 20)}…
                </p>
              </div>
            ) : null}

            {mine.length ? (
              <div className="nm-stack-sm border-t border-[var(--border-subtle)] pt-3">
                <div className="cq-kicker">MY REQUESTS</div>
                {/* Divider rows, not boxes: this is a case list, not a feed. */}
                {mine.map((item) => (
                  <div
                    key={item._id}
                    className="nm-row grid-cols-1 items-start py-3 text-[11.5px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--text-strong)]">
                        {item.status === "resolved" ? "Resolved" : "In progress"}
                      </span>
                      {item.resolution?.blockchain?.status === "anchored" ? (
                        <Badge variant="copper">
                          <Link2 className="h-3 w-3" strokeWidth={2} /> on-chain
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[var(--text-muted)]">{item.summary}</p>
                    {item.status === "resolved" && item.outcome ? (
                      <p className="mt-1 text-[var(--success)]">
                        Done: {item.outcome}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <p className="flex items-center gap-1.5 text-[10.5px] leading-4 text-[var(--text-muted)]">
              <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={1.75} />
              For emergencies, use local emergency services — this is not urgent care.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
