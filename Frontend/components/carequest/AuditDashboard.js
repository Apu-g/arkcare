"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Blocks,
  Fingerprint,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  anchorPendingAuditEvents,
  getAuditOverview,
} from "@/actions/auditActions";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import SimulationBadge from "@/components/carequest/SimulationBadge";

function HashRow({ label, value, tone }) {
  if (!value) return null;
  return (
    <div className="border-t border-[var(--border-subtle)] py-2 first:border-t-0 first:pt-0">
      <div className="cq-kicker">{label}</div>
      <div
        className={
          "mt-1 select-all break-all font-mono text-[12px] leading-5 " +
          (tone || "text-[var(--text)]")
        }
      >
        {value}
      </div>
    </div>
  );
}

export default function AuditDashboard({ initialData }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reaction, setReaction] = useState("idle");

  async function refresh() {
    setData(await getAuditOverview());
  }

  async function anchor() {
    setBusy(true);
    setMessage("");
    try {
      const result = await anchorPendingAuditEvents();
      setMessage(
        result.message ||
          (result.status === "confirmed"
            ? "Audit commitment confirmed on the configured blockchain."
            : "Audit batch prepared; blockchain may be disabled or unavailable.")
      );
      setReaction(result.status === "confirmed" ? "celebrate" : "wave");
      await refresh();
    } catch (error) {
      setMessage(error.message);
      setReaction("alert");
    } finally {
      setBusy(false);
      setTimeout(() => setReaction("idle"), 1400);
    }
  }

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        {/* Charcoal anchor card: provenance headline. */}
        <section className="nm-dark-card cq-reveal p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
              Provenance
            </span>
            <SimulationBadge real>Real local blockchain</SimulationBadge>
          </div>
          <h1 className="mt-4 text-[20px] font-bold leading-tight tracking-[-0.01em] text-white">
            CareQuest audit &amp; integrity
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#B7B7BE]">
            {data.organization?.name || "This hospital"} sees only its own provenance
            chain and anchor batches. The trail detects changes inside its trust model;
            it does not prove that a self-reported health action happened in the physical
            world.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            {data.verification.valid ? (
              <span className="cq-pixel-label cq-real-label">
                <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                hash chain internally consistent
              </span>
            ) : (
              <span className="cq-pixel-label cq-danger-label">
                <TriangleAlert className="h-[13px] w-[13px]" strokeWidth={1.75} />
                integrity check needs review
              </span>
            )}
            <span className="text-[11px] text-[#B7B7BE]">
              {data.verification.checked} event hash(es) recomputed
            </span>
          </div>
        </section>

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className="cq-card-soft cq-achievement px-4 py-3 text-[13px] leading-6 text-[var(--text)]"
          >
            {message}
          </div>
        ) : null}

        {data.legacyUnscopedExcluded ? (
          <div className="cq-card-soft px-4 py-3 text-[12px] leading-5 text-[var(--text-muted)]">
            <span className="cq-pixel-label cq-sim-label mr-2 align-middle">
              Tenant scoped
            </span>
            Legacy unscoped audit records are intentionally excluded from this hospital
            view rather than being exposed across tenants.
          </div>
        ) : null}

        <section className="nm-grid-3">
          <div className="nm-stat">
            <div className="nm-stat-icon">
              <Fingerprint className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="nm-stat-value mt-3">
              {data.verification.valid ? "VALID" : "CHECK"}
            </div>
            <div className="nm-stat-label">Hash-chain status</div>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-subtle)]">
              {data.verification.checked} events recomputed
            </p>
          </div>
          <div className="nm-stat">
            <div className="nm-stat-icon">
              <Blocks className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="nm-stat-value mt-3">
              {data.blockchain?.ok ? "ONLINE" : "OFFLINE"}
            </div>
            <div className="nm-stat-label">Local EVM bridge</div>
            <p className="mt-1 break-words text-[11px] leading-4 text-[var(--text-subtle)]">
              {data.blockchain?.network || data.blockchain?.error || "optional proof rail"}
            </p>
          </div>
          <div className="nm-stat">
            <div className="nm-stat-icon">
              <Link2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="nm-stat-value mt-3">{data.batches.length}</div>
            <div className="nm-stat-label">Anchor batches</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={anchor} disabled={busy}>
                <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {busy ? "Anchoring…" : "Anchor pending events"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={refresh}
                aria-label="Refresh audit overview"
                title="Refresh audit overview"
              >
                <RefreshCw className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </section>

        <section className="cq-card p-5 md:p-6">
          <div className="cq-kicker">Anchor batches</div>
          <h2 className="cq-section-title mt-1">Recent commitments</h2>
          <div className="mt-4 grid gap-3">
            {data.batches.map((batch) => (
              <article key={batch._id} className="cq-card-soft px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{batch.status}</Badge>
                  <Badge variant="success">{batch.network}</Badge>
                  <span className="cq-pixel-label">Batch {batch.batchId}</span>
                </div>
                <div className="mt-2">
                  <HashRow label="Merkle root" value={batch.merkleRoot} />
                  <HashRow label="Transaction hash" value={batch.txHash} />
                </div>
              </article>
            ))}
            {!data.batches.length ? (
              <p className="text-[13px] text-[var(--text-muted)]">
                No audit batches anchored yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="cq-card p-5 md:p-6">
          <div className="cq-kicker">Append-only events</div>
          <h2 className="cq-section-title mt-1">Recent provenance</h2>
          <div className="mt-4">
            {data.events.map((event) => (
              <article key={event.eventId} className="nm-row py-3 text-[12px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="nm-card-title">{event.eventType}</strong>
                    <span className="text-[var(--text-muted)]">{event.resourceType}</span>
                  </div>
                  <div className="mt-1 select-all break-all font-mono text-[11px] leading-4 text-[var(--text-muted)]">
                    {event.eventHash}
                  </div>
                </div>
              </article>
            ))}
            {!data.events.length ? (
              <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                <Link2Off className="h-[18px] w-[18px]" strokeWidth={1.75} />
                No provenance events recorded yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="nm-rail">
        <div>
          <PixelCharacter
            variant="guardian"
            mood={reaction}
            size={80}
            speech={
              data.verification.valid
                ? "Hash chain is internally consistent."
                : "Integrity check needs review."
            }
          />
        </div>

        <div>
          <div className="cq-kicker">What this view proves</div>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
            Every event hash is recomputed from the stored event, so a tampered record
            breaks the link to the chain head. Anchor batches commit a merkle root of
            many events in one transaction.
          </p>
        </div>

        <div>
          <div className="cq-kicker">Anchor health</div>
          <div className="mt-2 grid gap-2">
            <div className="rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
              <div className="text-[12px] font-semibold text-[var(--text)]">
                Batches anchored
              </div>
              <div className="nm-metric-xl mt-1">{data.batches.length}</div>
            </div>
            <div className="rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
              <div className="text-[12px] font-semibold text-[var(--text)]">
                EVM bridge
              </div>
              <div className="mt-1.5">
                {data.blockchain?.ok ? (
                  <span className="cq-pixel-label cq-real-label">Online</span>
                ) : (
                  <span className="cq-pixel-label cq-sim-label">Offline</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
