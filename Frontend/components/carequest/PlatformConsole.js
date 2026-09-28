"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Blocks,
  Building2,
  Fingerprint,
  HeartPulse,
  Link2,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import CapsuleIcon from "@/components/carequest/CapsuleIcon";
import SimulationBadge from "@/components/carequest/SimulationBadge";

function Stat({ icon: Icon, value, label, tone }) {
  return (
    <div className="cq-card p-4">
      <Icon className={"h-5 w-5 " + (tone || "text-primary")} />
      <div className="mt-4 text-3xl font-black">{value}</div>
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
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
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {value ? (
          <button
            type="button"
            onClick={copy}
            className="cq-pixel-label hover:bg-muted"
            aria-label={"Copy " + label}
          >
            {copied ? "copied" : "copy"}
          </button>
        ) : null}
      </div>
      {value ? (
        <div
          className={
            "mt-1 break-all font-mono text-[11px] leading-4 " +
            (tone || "text-foreground")
          }
        >
          {value}
        </div>
      ) : (
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          not yet generated
        </div>
      )}
      {hint ? (
        <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>
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
  const totals = overview.networkTotals;

  return (
    <div className="space-y-6 pb-24 lg:pb-4">
      <section className="cq-card cq-reveal p-5 md:p-6">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="cq-pixel-label">PLATFORM / MASTER</span>
              <SimulationBadge real>NETWORK-WIDE</SimulationBadge>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              ArkCare hospital network
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Every hospital runs its own clinical program, Capsule wallet and audit
              chain, stored and verified separately. A hospital&apos;s reputation is the
              participation its patients have generated — it is a quality signal, not a
              claimable balance, and Capsules are never cashable or transferable.
            </p>
          </div>
          <PixelCharacter
            variant="guardian"
            mood="idle"
            size={92}
            speech={`${totals.hospitalCount} hospitals · ` +
              (totals.allChainsValid
                ? "all chains valid"
                : `${totals.brokenChainCount || 0} chain(s) need review`)}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Building2}
          value={totals.hospitalCount}
          label="Hospitals in network"
        />
        <Stat
          icon={HeartPulse}
          value={totals.totalCapsules}
          label="Participation capsules earned"
          tone="text-[#b3541e]"
        />
        <Stat
          icon={Fingerprint}
          value={totals.totalAuditEvents}
          label="Audit events (all hospitals)"
          tone="text-[#817996]"
        />
        <Stat
          icon={ShieldCheck}
          value={totals.allChainsValid ? "VALID" : "CHECK"}
          label={
            totals.unknownChainCount
              ? "Audit chains (" + totals.unknownChainCount + " unverified)"
              : "All audit chains consistent"
          }
          tone={totals.allChainsValid ? "text-[#416457]" : "text-[#b3541e]"}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-black">Hospitals &amp; reputation</h2>
          <p className="text-sm text-muted-foreground">
            Ranked by participation their patient cohort has generated. Expand a
            hospital to see its audit head, doctors and patients.
          </p>
        </div>

        {overview.hospitals.map((hospital, index) => {
          const isOpen = expanded === hospital.organizationId;
          return (
            <article key={hospital.organizationId} className="cq-card overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="cq-pixel-label">#{index + 1}</span>
                        <h3 className="text-lg font-black">{hospital.name}</h3>
                        <Badge variant="outline">
                          {hospital.reputationLabel}
                        </Badge>
                        {hospital.chainValid === false ? (
                          <Badge variant="outline">chain check</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CapsuleIcon size={14} className="text-primary" />
                        <strong>{hospital.totalCapsules}</strong>{" "}
                        {hospital.symbol} earned by its patients ·{" "}
                        {hospital.patientCount} patients · {hospital.doctorCount} doctors
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hospital.chainValid ? (
                      <span className="cq-pixel-label cq-real-label">
                        <Link2 className="mr-1 h-3 w-3" /> chain valid
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="cq-pixel-label hover:bg-muted"
                      onClick={() =>
                        setExpanded(isOpen ? null : hospital.organizationId)
                      }
                    >
                      {isOpen ? "Hide audit" : "View audit"}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-[#fafbf8] p-3 text-xs">
                        <div className="font-bold text-muted-foreground">
                          Reputation score
                        </div>
                        <div className="mt-1 text-2xl font-black">
                          {hospital.reputationScore}
                          <span className="ml-1 text-xs font-semibold text-muted-foreground">
                            /100
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-[#fafbf8] p-3 text-xs">
                        <div className="font-bold text-muted-foreground">
                          Handoffs resolved
                        </div>
                        <div className="mt-1 text-2xl font-black">
                          {hospital.resolvedCases}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-[#fafbf8] p-3 text-xs">
                        <div className="font-bold text-muted-foreground">
                          On-chain token
                        </div>
                        <div className="mt-1 font-mono text-sm font-bold">
                          {hospital.tokenId || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Full hash provenance, same as the hospital audit log. */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span
                          className={
                            "cq-pixel-label " +
                            (hospital.chainValid
                              ? "cq-real-label"
                              : hospital.chainValid === false
                                ? "border-red-300 text-red-700"
                                : "")
                          }
                        >
                          {hospital.chainValid
                            ? "chain verified"
                            : hospital.chainValid === false
                              ? "chain inconsistent"
                              : hospital.chainTotal === 0
                                ? "no audit events yet"
                                : "chain not verified"}
                        </span>
                        <span className="text-muted-foreground">
                          {hospital.chainChecked} of {hospital.chainTotal} events
                          checked
                          {hospital.chainTruncated ? " (truncated)" : ""}
                        </span>
                        <span className="text-muted-foreground">
                          · {hospital.anchorCount} on-chain anchor
                          {hospital.anchorCount === 1 ? "" : "s"}
                        </span>
                        {hospital.anchorCount > 0 &&
                        hospital.anchorOnChain === false ? (
                          <span className="cq-pixel-label border-amber-300 text-amber-700">
                            anchor not on current chain
                          </span>
                        ) : null}
                        {hospital.anchorOnChain === true ? (
                          <span className="cq-pixel-label cq-real-label">
                            anchor verified on chain
                          </span>
                        ) : null}
                      </div>

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
                        tone="text-[#416457]"
                        hint={
                          hospital.latestAnchor
                            ? "Block " +
                              (hospital.latestAnchor.chainId ?? "—") +
                              " network · anchored " +
                              new Date(
                                hospital.latestAnchor.confirmedAt
                              ).toLocaleString()
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="cq-card p-5 md:p-6">
        <div className="cq-kicker">WHERE EVERY AUDIT WENT</div>
        <h2 className="mt-1 text-xl font-black">Recent network activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every event is tagged to the hospital it belongs to, with an independent
          chain per hospital.
        </p>
        <div className="mt-4 space-y-2">
          {overview.recentEvents.map((event) => (
            <div
              key={event.eventId}
              className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 text-xs md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{event.eventType}</strong>
                  <span className="text-muted-foreground">{event.resourceType}</span>
                  <Badge variant="outline">{event.actorRole}</Badge>
                </div>
                {/* Per-event hash, matching the hospital audit log view. */}
                <div className="mt-1.5 break-all font-mono text-[10px] text-muted-foreground">
                  {event.eventHash || "no hash"}
                </div>
              </div>
              <div className="shrink-0 text-muted-foreground">
                {event.organizationName} ·{" "}
                {new Date(event.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
