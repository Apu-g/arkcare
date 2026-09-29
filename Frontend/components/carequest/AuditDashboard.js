"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PathMorph from "@/components/motion/PathMorph";
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

/**
 * This hospital's chain, drawn on as the panel enters view. The caption is the
 * live recomputation figure from the same query that fills the page, so the
 * line and the number it labels are always the same fact.
 */
const CUSTODY_PATH =
  "M 10 46 C 54 46 70 16 118 16 C 166 16 182 52 232 52 " +
  "C 282 52 298 16 346 16 C 394 16 412 44 490 44";

function HashRow({ label, value, tone }) {
  if (!value) return null;
  return (
    <div className="border-t border-[var(--border-subtle)] py-2.5 first:border-t-0 first:pt-0">
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

  const confirmedBatches = data.batches.filter(
    (batch) => batch.status === "confirmed" && batch.txHash
  ).length;

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        {/* Framing first, on the light clinical base: what this hospital sees
            and the honest limits of what a chain can prove. */}
        <Reveal as="section" className="cq-card p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="cq-pixel-label">Provenance</span>
            <SimulationBadge real>Real local blockchain</SimulationBadge>
          </div>
          <MaskedText
            as="h1"
            className="mt-4 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
          >
            CareQuest audit &amp; integrity
          </MaskedText>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
            {data.organization?.name || "This hospital"} sees only its own provenance
            chain and anchor batches. The trail detects changes inside its trust model;
            it does not prove that a self-reported health action happened in the physical
            world.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
            <span className="cq-pixel-label">
              Tenant scoped · {data.events.length} event(s) in view
            </span>
          </div>
        </Reveal>

        {/* ============================================================ INK
            Everything below is proof: the hash chain verdict, the anchor
            batches and the append-only events. `data-scope="ink"` re-maps the
            whole token set for this subtree, so it reads warm-dark and
            weightier against the light clinical framing above without any
            colour being re-declared here. */}
        <Reveal as="section" data-scope="ink" className="nm-dark-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="cq-kicker">Verification</div>
              <MaskedText
                as="h2"
                className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-strong)]"
              >
                Hash-chain verdict
              </MaskedText>
            </div>
            {/* The status indicator is the one thing on this page that is
                allowed to move: it re-plays its entrance whenever the verdict
                itself changes, so a re-anchoring is visibly a state change. */}
            <span
              key={data.verification.valid ? "valid" : "invalid"}
              className={
                "cq-achievement inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 " +
                "text-[12px] font-semibold " +
                (data.verification.valid
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-[var(--destructive-soft)] text-[var(--destructive)]")
              }
            >
              {data.verification.valid ? (
                <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={1.75} />
              ) : (
                <TriangleAlert className="h-[14px] w-[14px]" strokeWidth={1.75} />
              )}
              {data.verification.valid
                ? "Chain internally consistent"
                : "Integrity check needs review"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="nm-dark-elevated px-4 py-3">
              <Fingerprint className="h-[18px] w-[18px] text-[var(--copper)]" strokeWidth={1.75} />
              <div className="mt-3 text-[24px] font-bold leading-none text-[var(--text-strong)]">
                {data.verification.valid ? "VALID" : "CHECK"}
              </div>
              <div className="cq-kicker mt-1.5">Hash-chain status</div>
              <div className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">
                {data.verification.checked} event hash(es) recomputed
              </div>
            </div>
            <div className="nm-dark-elevated px-4 py-3">
              <Blocks className="h-[18px] w-[18px] text-[var(--copper)]" strokeWidth={1.75} />
              <div className="mt-3 text-[24px] font-bold leading-none text-[var(--text-strong)]">
                {data.blockchain?.ok ? "ONLINE" : "OFFLINE"}
              </div>
              <div className="cq-kicker mt-1.5">Local EVM bridge</div>
              <div className="mt-1.5 break-words text-[11px] leading-4 text-[var(--text-muted)]">
                {data.blockchain?.network || data.blockchain?.error || "optional proof rail"}
              </div>
            </div>
            <div className="nm-dark-elevated px-4 py-3">
              <Link2 className="h-[18px] w-[18px] text-[var(--copper)]" strokeWidth={1.75} />
              <div className="mt-3 text-[24px] font-bold leading-none text-[var(--copper)]">
                {data.batches.length}
              </div>
              <div className="cq-kicker mt-1.5">Anchor batches</div>
              <div className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">
                {confirmedBatches} confirmed on chain
              </div>
            </div>
          </div>

          <div className="mt-5">
            <PathMorph
              d={CUSTODY_PATH}
              variant="chain"
              mode="draw"
              viewBox="0 0 500 64"
              className="h-12 w-full"
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="cq-kicker">Chain of custody</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {data.verification.checked} hash(es) recomputed ·{" "}
                {data.batches.length} anchor batch(es)
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--glass-hairline)] pt-4">
            {/* Committing a record is always copper, everywhere in the app. */}
            <Button type="button" variant="copper" onClick={anchor} disabled={busy}>
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
            {data.blockchain?.ok ? (
              <span className="cq-pixel-label cq-real-label">
                <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                EVM bridge online
              </span>
            ) : (
              <span className="cq-pixel-label cq-sim-label">
                <Link2Off className="h-[13px] w-[13px]" strokeWidth={1.75} />
                proof rail offline
              </span>
            )}
          </div>
        </Reveal>

        {message ? (
          <div
            key={message}
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

        <Reveal as="section" className="nm-stack-sm">
          <div>
            <div className="cq-kicker">Anchor batches</div>
            <MaskedText as="h2" className="cq-section-title mt-1">
              Recent commitments
            </MaskedText>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Each batch commits one merkle root over many event hashes in a single
              transaction. Roots and receipts are shown in full.
            </p>
          </div>
          {data.batches.length === 0 ? (
            <div className="cq-card-soft flex items-center gap-2 px-4 py-3 text-[13px] text-[var(--text-muted)]">
              <Link2Off className="h-[18px] w-[18px]" strokeWidth={1.75} />
              No audit batches anchored yet.
            </div>
          ) : null}
          {data.batches.map((batch) => (
            <article
              key={batch._id}
              data-scope="ink"
              className="nm-dark-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{batch.status}</Badge>
                <Badge variant="copper">{batch.network}</Badge>
                <span className="cq-pixel-label">Batch {batch.batchId}</span>
                {batch.txHash ? (
                  <span className="cq-pixel-label cq-real-label">
                    <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    on chain
                  </span>
                ) : null}
              </div>
              <div className="mt-3">
                <HashRow label="Merkle root" value={batch.merkleRoot} />
                <HashRow label="Transaction hash" value={batch.txHash} />
              </div>
            </article>
          ))}
        </Reveal>

        <Reveal as="section" className="cq-card p-5 md:p-6">
          <div className="cq-kicker">Append-only events</div>
          <MaskedText as="h2" className="cq-section-title mt-1">
            Recent provenance
          </MaskedText>
          <div className="mt-4">
            {data.events.map((event) => (
              <article key={event.eventId} className="nm-row py-3 text-[12px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="nm-card-title">{event.eventType}</strong>
                    <span className="text-[var(--text-muted)]">{event.resourceType}</span>
                  </div>
                  <div className="glass-data mt-1.5 select-all break-all rounded-[10px] px-2.5 py-1.5 font-mono text-[11px] leading-4 text-[var(--text-muted)]">
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
        </Reveal>
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
            <div className="glass-data rounded-[16px] p-3">
              <div className="text-[12px] font-semibold text-[var(--text)]">
                Batches anchored
              </div>
              <div className="nm-metric-xl mt-1">{data.batches.length}</div>
              <div className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
                {confirmedBatches} with a transaction hash
              </div>
            </div>
            <div className="glass-data rounded-[16px] p-3">
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
