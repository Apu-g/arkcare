"use client";

import { formatDateTime } from "@/lib/formatDate";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Info,
  Link2,
  Lock,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  assignHandoffCase,
  escalateHandoffCase,
  getHandoffQueue,
  reassignHandoffForShift,
  recordHandoffContact,
  resolveHandoffCase,
  submitWorkflowFeedback,
} from "@/actions/staffActions";
import { pusherClient } from "@/lib/pusher";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";

// Status is always an explicit word AND an icon, never colour alone
// (spec §24). The icon is what survives greyscale and colour-blindness.
function statusMeta(item) {
  if (item.overdue)
    return {
      label: "OVERDUE",
      word: "Overdue",
      Icon: AlertTriangle,
      className:
        "bg-[var(--warning-soft)] text-[var(--warning)]",
    };
  if (item.status === "resolved")
    return {
      label: "RESOLVED",
      word: "Resolved",
      Icon: CheckCircle2,
      className: "bg-[var(--success-soft)] text-[var(--success)]",
    };
  if (item.status === "escalated")
    return {
      label: "ESCALATED",
      word: "Escalated",
      Icon: ArrowUpRight,
      className: "bg-[var(--info-soft)] text-[var(--info)]",
    };
  if (item.status === "open")
    return {
      label: "OPEN",
      word: "Open",
      Icon: CircleDot,
      className: "bg-[var(--surface-subtle)] text-[var(--text-muted)]",
    };
  return {
    label: String(item.status || "open").toUpperCase(),
    word: String(item.status || "open"),
    Icon: CircleDot,
    className: "bg-[var(--surface-subtle)] text-[var(--text-muted)]",
  };
}

export default function StaffHandoffQueue({
  initialCases,
  role,
  organizationId,
}) {
  const [cases, setCases] = useState(initialCases);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reaction, setReaction] = useState("idle");

  async function refresh() {
    setCases(await getHandoffQueue());
  }

  useEffect(() => {
    if (!organizationId) return undefined;

    const channelName =
      "private-carequest-staff-" + String(organizationId);
    let channel;
    try {
      channel = pusherClient.subscribe(channelName);
      channel.bind("handoff.updated", refresh);
    } catch {}

    return () => {
      try {
        channel?.unbind("handoff.updated", refresh);
        pusherClient.unsubscribe(channelName);
      } catch {}
    };
    // refresh reads authoritative server state and intentionally is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function run(key, fn, mood = "celebrate") {
    setBusy(key);
    setMessage("");
    try {
      await fn();
      await refresh();
      setReaction(mood);
      setTimeout(() => setReaction("idle"), 1200);
    } catch (error) {
      setMessage(error.message || "Handoff action failed");
      setReaction("alert");
      setTimeout(() => setReaction("idle"), 1200);
    } finally {
      setBusy("");
    }
  }

  function ask(label) {
    return window.prompt(label) || "";
  }

  const open = cases.filter((item) => item.status !== "resolved");
  const overdue = open.filter((item) => item.overdue);
  const unowned = open.filter((item) => !item.assignedTo);

  return (
    <div className="nm-stack">
      <Reveal>
      <section className="nm-dark-card p-5 md:p-6">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">{role} workspace</span>
              <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">Human handoff</span>
            </div>
            <MaskedText
              as="h1"
              className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--dark-text)] md:text-[22px]"
            >
              CareQuest handoff queue
            </MaskedText>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-[var(--dark-muted)]">
              One owned case per configured help event. Escalation is a safe workflow
              action—not a failure—and clinical changes remain doctor-only.
            </p>
            <Button
              variant="outline"
              className="mt-4 border-0 bg-[rgba(255,255,255,0.10)] text-[#fff] shadow-none hover:bg-[rgba(255,255,255,0.16)]"
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} /> Refresh queue
            </Button>
          </div>
          <PixelCharacter
            variant={role === "doctor" ? "doctor" : "nurse"}
            mood={overdue.length ? "alert" : reaction}
            size={90}
            speech={
              overdue.length
                ? overdue.length + " overdue case(s)."
                : open.length
                  ? open.length + " open case(s) to coordinate."
                  : "Queue is clear."
            }
          />
        </div>
      </section>
      </Reveal>

      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="cq-achievement inline-flex items-start gap-2 rounded-[16px] bg-[var(--surface-subtle)] px-4 py-3 text-[12px] leading-relaxed text-[var(--text)] shadow-[var(--shadow-inset)]"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
          {message}
        </div>
      ) : null}

      <Reveal delay={60}>
      {/* Queue health reads as three inline figures, not three identical
          tiles. Only the overdue figure earns emphasis, and it is a tile
          because "how many are overdue" is the one question this page
          exists to answer. */}
      <section>
        <div className="section-rule">
          <span>Queue health</span>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <dl className="stat-strip">
            <div className="stat-inline">
              <dt>Open</dt>
              <dd>{open.length}</dd>
            </div>
            <div className="stat-inline">
              <dt>Unowned</dt>
              <dd>{unowned.length}</dd>
            </div>
          </dl>
          {overdue.length ? (
            <div className="nm-stat py-3!">
              <div className="nm-stat-icon" data-tone="copper">
                <Clock3 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="mt-3 nm-stat-value">{overdue.length}</div>
              <div className="nm-stat-label">Overdue</div>
            </div>
          ) : null}
        </div>
      </section>
      </Reveal>

      {["nurse", "coordinator"].includes(role) ? (
        <section>
          <div className="section-rule">
            <span>Workload feedback</span>
          </div>
          <div className="section-head">
            <h2 className="section-title">Measure the workflow, not staff speed.</h2>
            <Button
              variant="outline"
              onClick={() => {
                const minutes = window.prompt(
                  "Minutes spent on duplicate/manual entry in this work period:",
                  "0"
                );
                if (minutes === null) return;
                const burden = window.prompt(
                  "Alert burden from 1 (low) to 5 (high):",
                  "2"
                );
                if (burden === null) return;
                const note = window.prompt("Optional workflow note:", "") || "";
                run("workflow-feedback", async () => {
                  await submitWorkflowFeedback({
                    duplicateEntryMinutes: Number(minutes),
                    alertBurden: Number(burden),
                    note,
                  });
                  setMessage("Workflow feedback recorded.");
                });
              }}
            >
              Record workload feedback
            </Button>
          </div>
          <p className="section-lede">
            Report duplicate-entry time and alert burden so the hospital can see
            whether CareQuest is reducing or adding operational work.
          </p>
        </section>
      ) : null}

      <section>
        <div className="section-rule">
          <span>Cases</span>
          <span>{cases.length}</span>
        </div>
        <div className="section-head">
          <h2 className="section-title">Handoff cases</h2>
          <p className="section-lede">
            One owned case per configured help event. Each case reads as a
            ledger row with its own audit trail beneath it.
          </p>
        </div>
        <div className="ledger">
        {cases.map((item) => {
          const status = statusMeta(item);
          const StatusIcon = status.Icon;
          return (
          /* A case is a RECORD, so it is a ledger row, not a card. The
             action set sits in `.ledger-actions`; the owner/due facts are
             clinical key-values in a `.dl-grid`. */
          <article key={item._id} className="ledger-row grid-cols-1! items-start! gap-4!">
              <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="ledger-title">
                      {item.patient?.name || "Authorized patient case"}
                    </h2>
                    <Badge variant="outline">{item.priority}</Badge>
                    {/* The state indicator. Word + icon, and it transitions:
                        resolving or escalating a case is exactly the moment a
                        queue watcher needs to catch. */}
                    <span
                      data-case-status={item.overdue ? "overdue" : item.status}
                      className={
                        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold transition-colors duration-[var(--dur-3)] ease-[var(--ease-soft)] " +
                        status.className
                      }
                    >
                      <StatusIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      {status.word}
                    </span>
                    {item.source === "direct_help" ? (
                      <span className="cq-pixel-label inline-flex">
                        NEED HELP REQUEST
                      </span>
                    ) : null}
                  </div>
                  {/* Presenting summary is clinical content: data surface. */}
                  <p className="glass-data mt-2 max-w-3xl rounded-[14px] p-3 text-[12px] leading-relaxed text-[var(--text)]">
                    {item.summary}
                  </p>
                  {item.requestHash ? (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 break-all font-mono text-[10px] text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 shrink-0 text-[var(--copper)]" strokeWidth={1.75} />
                      request {item.requestHash.slice(0, 22)}…
                      {item.requestBlockchain?.status === "anchored" ? (
                        <span className="cq-real-label cq-pixel-label ml-1 inline-flex items-center gap-1">
                          <Link2 className="h-3 w-3" strokeWidth={1.75} />
                          on-chain
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {item.status === "resolved" && item.resolution ? (
                    <div className="mt-2.5 rounded-[14px] bg-[var(--success-soft)] p-2.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--success)]">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Work done
                        {item.resolution.blockchain?.status === "anchored" ? (
                          <span className="ml-1 inline-flex items-center gap-1 font-mono text-[9px]">
                            <Link2 className="h-3 w-3" strokeWidth={1.75} /> on-chain
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text)]">
                        {item.resolution.outcome}
                      </p>
                      <p className="mt-1 break-all font-mono text-[9px] text-muted-foreground">
                        by {item.resolution.resolvedByName || item.resolution.resolvedByRole}
                        {" · "}res {item.resolution.outcomeHash?.slice(0, 20)}…
                      </p>
                    </div>
                  ) : null}
              </div>

              {/* Ownership and due-by are the two facts a coordinator
                  triages on: a definition list, not two boxes. */}
              <dl className="dl-grid w-full min-w-[220px] text-[12px]!">
                <dt>Owner</dt>
                <dd>{item.assignedTo?.name || "Unowned"}</dd>
                <dt>Due</dt>
                <dd>{formatDateTime(item.dueAt)}</dd>
              </dl>

              <div className="col-span-full flex flex-wrap gap-2">
                {["nurse", "coordinator"].includes(role) && item.status !== "resolved" ? (
                  <Button
                    variant="outline"
                    disabled={busy !== ""}
                    onClick={() =>
                      run(item._id + "assign", () => assignHandoffCase(item._id))
                    }
                  >
                    <UserCheck className="h-4 w-4" strokeWidth={1.75} /> Assign to me
                  </Button>
                ) : null}

                {["nurse", "coordinator"].includes(role) && item.status !== "resolved" ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy !== ""}
                      onClick={() => {
                        const note = ask("Document successful contact:");
                        if (note)
                          run(item._id + "contact", () =>
                            recordHandoffContact(item._id, {
                              successful: true,
                              note,
                            })
                          );
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> Contacted
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy !== ""}
                      onClick={() => {
                        const note = ask("Document unsuccessful contact:");
                        if (note)
                          run(item._id + "miss", () =>
                            recordHandoffContact(item._id, {
                              successful: false,
                              note,
                            })
                          , "alert");
                      }}
                    >
                      <AlertTriangle className="h-4 w-4" strokeWidth={1.75} /> Unsuccessful contact
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy !== ""}
                      onClick={() => {
                        const note = ask("Clinical question for doctor:");
                        if (note)
                          run(item._id + "escalate", () =>
                            escalateHandoffCase(item._id, note)
                          , "wave");
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} /> Escalate to doctor
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy !== ""}
                      onClick={() =>
                        run(item._id + "shift", () =>
                          reassignHandoffForShift(item._id, "Demo shift change")
                        )
                      }
                    >
                      Shift reassignment
                    </Button>
                  </>
                ) : null}

                {item.status !== "resolved" ? (
                  <Button
                    disabled={busy !== ""}
                    onClick={() => {
                      const outcome = ask("Document outcome/reason before closing:");
                      if (outcome)
                        run(item._id + "resolve", () =>
                          resolveHandoffCase(item._id, outcome)
                        );
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> Resolve with outcome
                  </Button>
                ) : null}
              </div>

              {/* Case history is the audit trail. A chronology, so it is a
                  timeline of events, not a stack of event cards. */}
              <details className="group col-span-full">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-[11px] font-semibold text-[var(--text-strong)] transition-colors hover:text-[var(--celadon)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--celadon-soft)]">
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-[var(--dur-2)] ease-[var(--ease-soft)] group-open:rotate-90"
                    strokeWidth={1.75}
                  />
                  <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--copper)]" strokeWidth={1.75} />
                  Immutable case history ({item.events?.length || 0})
                </summary>
                <div className="timeline mt-1 pl-1">
                  {(item.events || []).map((event) => (
                    <div
                      key={event._id}
                      className="timeline-item"
                      data-tone={event.blockchain?.status === "anchored" ? "copper" : "muted"}
                    >
                      <div className="timeline-time">
                        {formatDateTime(event.createdAt)}
                      </div>
                      <div className="timeline-title">{event.eventType}</div>
                      {event.note ? (
                        <p className="timeline-body">{event.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
          </article>
          );
        })}
        </div>

        {!cases.length ? (
          <div className="well flex items-center gap-4">
            <PixelCharacter variant={role === "doctor" ? "doctor" : "nurse"} mood="idle" size={66} />
            <div>
              <h3 className="nm-card-title text-[14px]">No authorized handoff cases</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                The queue will refresh when a patient requests help or a configured exception creates a case.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
