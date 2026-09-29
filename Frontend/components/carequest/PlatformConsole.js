"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  Fingerprint,
  HeartPulse,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import CapsuleIcon from "@/components/carequest/CapsuleIcon";
import SimulationBadge from "@/components/carequest/SimulationBadge";
import { reanchorStaleAuditBatches } from "@/actions/auditActions";

function Stat({ icon: Icon, value, label, note }) {
  return (
    <div className="nm-stat">
      <div className="nm-stat-icon">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="nm-stat-value mt-3">{value}</div>
      <div className="nm-stat-label">{label}</div>
      {note ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-subtle)]">{note}</p>
      ) : null}
    </div>
  );
}

/**
 * Full, untruncated hash with a copy button. The master console is the
 * operator's window into the proof rail, so the value shown here must be the
 * complete hash (not an ellipsised prefix) and must be copyable so it can be
 * checked against the chain.
 */
function HashField({ label, value, hint, tone }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context / permission): the hash is still
      // visible in full and selectable, so this is not a dead end.
    }
  }

  return (
    <div className="cq-card-soft px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="cq-kicker">{label}</span>
        {value ? (
          <Button
            type="button"
            variant="outline"
            onClick={copy}
            aria-label={"Copy " + label}
          >
            {copied ? (
              <ShieldCheck className="h-[15px] w-[15px]" strokeWidth={1.75} />
            ) : (
              <Copy className="h-[15px] w-[15px]" strokeWidth={1.75} />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        ) : null}
      </div>
      {value ? (
        <div
          className={
            "mt-1.5 select-all break-all font-mono text-[12px] leading-5 " +
            (tone || "text-[var(--text)]")
          }
        >
          {value}
        </div>
      ) : (
        <div className="mt-1.5 font-mono text-[12px] text-[var(--text-muted)]">
          not yet generated
        </div>
      )}
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * The platform (master) console. Shows every hospital in the network, each
 * hospital's reputation (capsules earned by its patients — a non-cash metric),
 * and the per-hospital audit head so an operator can see exactly where every
 * audit went and that each chain is internally consistent.
 */
export default function PlatformConsole({ overview }) {
  const [expanded, setExpanded] = useState(null);
  const router = useRouter();
  const [reanchor, setReanchor] = useState({ busy: false, message: "", tone: "info" });
  const totals = overview.networkTotals;

  const anchorsStale = (overview.hospitals || []).some(
    (h) => h.anchorCount > 0 && h.anchorOnChain === false
  );

  async function handleReanchor() {
    setReanchor({ busy: true, message: "Checking the chain…", tone: "info" });
    try {
      const result = await reanchorStaleAuditBatches();
      setReanchor({
        busy: false,
        message:
          `Checked ${result.checked} anchor batch(es): ` +
          `${result.reanchored} re-committed to the chain, ` +
          `${result.alreadyOnChain} already present. Reload to refresh the hashes.`,
        tone: result.reanchored > 0 ? "success" : "info",
      });
      router.refresh();
    } catch (error) {
      setReanchor({
        busy: false,
        message: error?.message || "Could not re-anchor the audit batches.",
        tone: "error",
      });
    }
  }

  const reanchorTone =
    reanchor.tone === "error"
      ? "border-[rgba(191,67,67,0.3)] bg-[rgba(235,90,90,0.08)] text-[var(--destructive)]"
      : reanchor.tone === "success"
        ? "border-[rgba(49,185,120,0.3)] bg-[rgba(49,185,120,0.08)] text-[var(--success)]"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]";

  const broken = totals.brokenChainCount || 0;
  const unknown = totals.unknownChainCount || 0;

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        {/* One charcoal anchor card: the network headline + the audit action. */}
        <section className="nm-dark-card cq-reveal p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
              Platform / master
            </span>
            <SimulationBadge real>Network-wide</SimulationBadge>
          </div>
          <h1 className="mt-4 text-[20px] font-bold leading-tight tracking-[-0.01em] text-white">
            ArkCare hospital network
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#B7B7BE]">
            Every hospital runs its own clinical program, Capsule wallet and audit chain,
            stored and verified separately. A hospital&apos;s reputation is the
            participation its patients have generated — it is a quality signal, not a
            claimable balance, and Capsules are never cashable or transferable.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="nm-dark-elevated px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                Chain integrity
              </div>
              <div className="mt-1 text-[24px] font-bold leading-none text-white">
                {totals.allChainsValid ? "VALID" : "CHECK"}
              </div>
              <div className="mt-1.5 text-[11px] text-[#B7B7BE]">
                {totals.allChainsValid
                  ? "Every hospital chain is internally consistent."
                  : `${broken} chain(s) need review.`}
              </div>
            </div>
            <div className="nm-dark-elevated px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                Hospitals
              </div>
              <div className="mt-1 text-[24px] font-bold leading-none text-white">
                {totals.hospitalCount}
              </div>
              <div className="mt-1.5 text-[11px] text-[#B7B7BE]">
                {unknown > 0
                  ? `${unknown} chain(s) not verified yet.`
                  : "All chains verified."}
              </div>
            </div>
            <div className="nm-dark-elevated px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                Audit events
              </div>
              <div className="mt-1 text-[24px] font-bold leading-none text-white">
                {totals.totalAuditEvents}
              </div>
              <div className="mt-1.5 text-[11px] text-[#B7B7BE]">
                Append-only, one chain per hospital.
              </div>
            </div>
          </div>

          {/* The local chain is in-memory and resets on every restart, which
              leaves the stored anchors unverifiable until they are re-committed.
              This re-commits the SAME merkle roots, so it restores the proof
              without rewriting any event. */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleReanchor} disabled={reanchor.busy}>
                <RefreshCw
                  className={
                    "h-[18px] w-[18px]" + (reanchor.busy ? " animate-spin" : "")
                  }
                  strokeWidth={1.75}
                />
                {reanchor.busy ? "Checking chain…" : "Re-anchor audit proofs to chain"}
              </Button>
              {anchorsStale ? (
                <span className="cq-pixel-label cq-sim-label">
                  <TriangleAlert className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  some anchors are not on the current chain
                </span>
              ) : (
                <span className="cq-pixel-label cq-real-label">
                  <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  all anchors present on chain
                </span>
              )}
            </div>
            {reanchor.message ? (
              <div
                role="status"
                aria-live="polite"
                className={
                  "mt-3 rounded-[14px] border px-3 py-2 text-[12px] leading-5 " +
                  reanchorTone
                }
              >
                {reanchor.message}
              </div>
            ) : null}
          </div>
        </section>

        <section className="nm-grid-3">
          <Stat
            icon={Building2}
            value={totals.hospitalCount}
            label="Hospitals in network"
          />
          <Stat
            icon={HeartPulse}
            value={totals.totalCapsules}
            label="Participation capsules earned"
            note="Non-cash participation signal"
          />
          <Stat
            icon={Fingerprint}
            value={totals.totalAuditEvents}
            label="Audit events (all hospitals)"
            note="Hash-chained, tenant scoped"
          />
        </section>

        <section className="nm-stack-sm">
          <div>
            <div className="cq-kicker">Hospitals &amp; reputation</div>
            <h2 className="cq-section-title mt-1">
              Ranked by participation their patient cohort has generated
            </h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Expand a hospital to see its full chain head, merkle root and anchor
              transaction.
            </p>
          </div>

          {overview.hospitals.map((hospital, index) => {
            const isOpen = expanded === hospital.organizationId;
            return (
              <article key={hospital.organizationId} className="cq-card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="nm-stat-icon shrink-0">
                      <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="cq-pixel-label">#{index + 1}</span>
                        <h3 className="nm-card-title text-[14px]">{hospital.name}</h3>
                        <Badge variant="default">{hospital.reputationLabel}</Badge>
                        {hospital.chainValid === false ? (
                          <Badge variant="warning">chain check</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                        <CapsuleIcon size={14} className="text-[var(--primary)]" />
                        <strong className="text-[var(--text)]">
                          {hospital.totalCapsules}
                        </strong>{" "}
                        {hospital.symbol} earned by its patients · {hospital.patientCount}{" "}
                        patients · {hospital.doctorCount} doctors
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hospital.chainValid ? (
                      <span className="cq-pixel-label cq-real-label">
                        <Link2 className="h-[13px] w-[13px]" strokeWidth={1.75} /> chain
                        valid
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setExpanded(isOpen ? null : hospital.organizationId)
                      }
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronUp className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      ) : (
                        <ChevronDown className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      )}
                      {isOpen ? "Hide audit" : "View audit"}
                    </Button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                    <div className="nm-grid-3">
                      <div className="nm-stat">
                        <div className="nm-stat-label">Reputation score</div>
                        <div className="nm-stat-value mt-1.5">
                          {hospital.reputationScore}
                          <span className="ml-1 text-[12px] font-semibold text-[var(--text-muted)]">
                            /100
                          </span>
                        </div>
                      </div>
                      <div className="nm-stat">
                        <div className="nm-stat-label">Handoffs resolved</div>
                        <div className="nm-stat-value mt-1.5">
                          {hospital.resolvedCases}
                        </div>
                      </div>
                      <div className="nm-stat">
                        <div className="nm-stat-label">On-chain token</div>
                        <div className="mt-1.5 break-all font-mono text-[13px] font-semibold text-[var(--text-strong)]">
                          {hospital.tokenId || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Full hash provenance, same as the hospital audit log. */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {hospital.chainValid ? (
                        <span className="cq-pixel-label cq-real-label">
                          <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          chain verified
                        </span>
                      ) : hospital.chainValid === false ? (
                        <span className="cq-pixel-label cq-danger-label">
                          <TriangleAlert className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          chain inconsistent
                        </span>
                      ) : hospital.chainTotal === 0 ? (
                        <span className="cq-pixel-label">
                          <Link2Off className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          no audit events yet
                        </span>
                      ) : (
                        <span className="cq-pixel-label cq-info-label">
                          <Link2Off className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          chain not verified
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {hospital.chainChecked} of {hospital.chainTotal} events checked
                        {hospital.chainTruncated ? " (truncated)" : ""} ·{" "}
                        {hospital.anchorCount} on-chain anchor
                        {hospital.anchorCount === 1 ? "" : "s"}
                      </span>
                      {hospital.anchorCount > 0 &&
                      hospital.anchorOnChain === false ? (
                        <span className="cq-pixel-label cq-sim-label">
                          <TriangleAlert className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          anchor not on current chain
                        </span>
                      ) : null}
                      {hospital.anchorOnChain === true ? (
                        <span className="cq-pixel-label cq-real-label">
                          <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          anchor verified on chain
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-3">
                      <HashField
                        label="Audit chain head (latest event hash)"
                        value={hospital.headHash}
                        hint="Final link in this hospital's hash chain. Changing any earlier event breaks the link back to the genesis head."
                      />

                      <HashField
                        label="Latest merkle root (anchored on-chain)"
                        value={hospital.latestAnchor?.merkleRoot}
                        hint={
                          hospital.latestAnchor
                            ? "Batch of " +
                              hospital.latestAnchor.eventCount +
                              " event hashes, committed to the chain in one transaction."
                            : undefined
                        }
                      />

                      <HashField
                        label="Anchor transaction hash"
                        value={hospital.latestAnchor?.txHash}
                        hint={
                          hospital.latestAnchor
                            ? "Block " +
                              (hospital.latestAnchor.chainId ?? "—") +
                              " network · anchored " +
                              new Date(hospital.latestAnchor.confirmedAt).toLocaleString()
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="cq-card p-5 md:p-6">
          <div className="cq-kicker">Where every audit went</div>
          <h2 className="cq-section-title mt-1">Recent network activity</h2>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            Every event is tagged to the hospital it belongs to, with an independent
            chain per hospital.
          </p>
          <div className="mt-4">
            {overview.recentEvents.map((event) => (
              <div key={event.eventId} className="nm-row py-3 text-[12px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="nm-card-title">{event.eventType}</strong>
                    <span className="text-[var(--text-muted)]">{event.resourceType}</span>
                    <Badge variant="outline">{event.actorRole}</Badge>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {event.organizationName} ·{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {/* Per-event hash, matching the hospital audit log view. */}
                  <div className="mt-1 select-all break-all font-mono text-[11px] leading-4 text-[var(--text-muted)]">
                    {event.eventHash || "no hash"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="nm-rail">
        <div className="flex items-start gap-3">
          <PixelCharacter
            variant="guardian"
            mood={totals.allChainsValid ? "idle" : "alert"}
            size={72}
            speech={`${totals.hospitalCount} hospitals · ` +
              (totals.allChainsValid
                ? "all chains valid"
                : `${broken} chain(s) need review`)}
          />
        </div>

        <div>
          <div className="cq-kicker">Chain health</div>
          <div className="mt-2 grid gap-2">
            <div className="rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text)]">
                  Verified chains
                </span>
                <span className="nm-card-title">
                  {totals.hospitalCount - broken - unknown}
                </span>
              </div>
              <div className="cq-progress mt-2">
                <span
                  style={{
                    width:
                      (totals.hospitalCount
                        ? ((totals.hospitalCount - broken - unknown) /
                            totals.hospitalCount) *
                          100
                        : 0) + "%",
                  }}
                />
              </div>
            </div>
            <div className="rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text)]">
                  Broken chains
                </span>
                <span className="nm-card-title">{broken}</span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                Recomputation found a broken link.
              </p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text)]">
                  Unverified chains
                </span>
                <span className="nm-card-title">{unknown}</span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                No verdict yet — not counted as valid.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="cq-kicker">Reading a hash</div>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
            Every hash on this screen is shown in full, never truncated, and can be
            copied for independent checking. The chain head is the latest event hash;
            the merkle root commits a whole batch; the transaction hash is the
            on-chain receipt.
          </p>
        </div>
      </aside>
    </div>
  );
}
