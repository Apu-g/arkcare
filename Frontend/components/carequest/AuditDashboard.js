"use client";

import { formatDateTime } from "@/lib/formatDate";
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

/**
 * A hash, always in full. The credibility of this whole screen is that the
 * operator can read a complete 64-character value and copy it out — so there
 * is no truncation, no ellipsis and no `truncate` class anywhere on it. Mono,
 * `break-all` and `select-all`, on the near-opaque `.well` data surface.
 */
function HashRow({ label, value, tone }) {
  if (!value) return null;
  return (
    <div className="border-b border-[var(--border-subtle)] py-2.5 last:border-b-0 last:pb-0 first:pt-0">
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
        {/* ====================================================== FRAMING.
            First, on the light clinical base: what this hospital sees and the
            honest limits of what a chain can prove. An editorial header, not a
            boxed panel. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Provenance</span>
          </div>
          <div className="section-head">
            <MaskedText as="h1" className="section-title">
              CareQuest audit &amp; integrity
            </MaskedText>
            <SimulationBadge real>Real local blockchain</SimulationBadge>
          </div>
          <p className="section-lede">
            {data.organization?.name || "This hospital"} sees only its own provenance
            chain and anchor batches. The trail detects changes inside its trust model;
            it does not prove that a self-reported health action happened in the
            physical world.
          </p>
          <p className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <span className="cq-pixel-label">
              Tenant scoped · {data.events.length} event(s) in view
            </span>
          </p>
        </Reveal>

        {/* ====================================================== VERDICT.
            Everything below is proof: the hash-chain verdict, the anchor
            batches and the append-only events. `data-scope="ink"` re-maps the
            whole token set for this subtree, so it reads warm-dark and
            weightier against the light clinical framing above without any colour
            being re-declared here. */}
        <Reveal as="section" data-scope="ink" className="nm-dark-card p-5 md:p-6">
          <div className="section-rule mt-0">
            <span>Verification</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Hash-chain verdict
            </MaskedText>
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

          <dl className="stat-strip mt-2">
            <div className="stat-inline">
              <dt>
                <Fingerprint
                  className="mr-1 inline-block h-4 w-4 align-[-1px] text-[var(--copper)]"
                  strokeWidth={1.75}
                />
                Hash-chain status
              </dt>
              <dd>{data.verification.valid ? "VALID" : "CHECK"}</dd>
            </div>
            <div className="stat-inline">
              <dt>
                <Blocks
                  className="mr-1 inline-block h-4 w-4 align-[-1px] text-[var(--copper)]"
                  strokeWidth={1.75}
                />
                Local EVM bridge
              </dt>
              <dd>{data.blockchain?.ok ? "ONLINE" : "OFFLINE"}</dd>
            </div>
            <div className="stat-inline">
              <dt>
                <Link2
                  className="mr-1 inline-block h-4 w-4 align-[-1px] text-[var(--copper)]"
                  strokeWidth={1.75}
                />
                Anchor batches
              </dt>
              <dd className="text-[var(--copper)]">{data.batches.length}</dd>
            </div>
          </dl>

          <dl className="dl-grid mt-3">
            <dt>Hashes recomputed</dt>
            <dd>
              {data.verification.checked} of {data.verification.total}
              {data.verification.truncated ? " (truncated)" : ""}
            </dd>
            <dt>Bridge network</dt>
            <dd className="break-words">
              {data.blockchain?.network || data.blockchain?.error || "optional proof rail"}
            </dd>
            <dt>Chain id</dt>
            <dd>{data.batches[0]?.chainId ?? "—"}</dd>
            <dt>Events in view</dt>
            <dd>{data.events.length}</dd>
            <dt>Confirmed on chain</dt>
            <dd>
              {confirmedBatches} of {data.batches.length} batch
              {data.batches.length === 1 ? "" : "es"}
            </dd>
          </dl>

          {/* The chain head, in full, on the ink anchor itself — this is the
              value an auditor checks first, so it must be readable and
              copyable without opening anything. */}
          {data.verification.headHash ? (
            <div className="well mt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="cq-kicker">Chain head (latest event hash)</span>
              </div>
              <div className="mt-1 select-all break-all font-mono text-[12px] leading-5 text-[var(--text)]">
                {data.verification.headHash}
              </div>
            </div>
          ) : null}

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
            className="well cq-achievement text-[13px] leading-6 text-[var(--text)]"
          >
            {message}
          </div>
        ) : null}

        {data.legacyUnscopedExcluded ? (
          <p className="border-l-2 border-[var(--border)] pl-3 text-[12px] leading-5 text-[var(--text-muted)]">
            <span className="cq-pixel-label cq-sim-label mr-2 align-middle">
              Tenant scoped
            </span>
            Legacy unscoped audit records are intentionally excluded from this hospital
            view rather than being exposed across tenants.
          </p>
        ) : null}

        {/* ====================================================== ANCHOR
            BATCHES. These are records with receipts, so they are a ledger on
            the ink scope: hairline-separated rows, hashes in full. One card per
            batch used to hide the fact that they are one repeated kind of
            thing. */}
        <Reveal as="section" data-scope="ink">
          <div className="section-rule">
            <span>Anchor batches</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Recent commitments
            </MaskedText>
            <p className="section-lede">
              Each batch commits one merkle root over many event hashes in a single
              transaction. Roots and receipts are shown in full.
            </p>
          </div>

          {data.batches.length === 0 ? (
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <Link2Off className="h-[18px] w-[18px]" strokeWidth={1.75} />
              No audit batches anchored yet.
            </p>
          ) : (
            <div className="nm-dark-card p-4 md:p-5">
              <div className="ledger">
                <div className="ledger-head">
                  <span>Batch</span>
                  <span>Status</span>
                </div>
                {data.batches.map((batch) => (
                  <div key={batch._id} className="ledger-row items-start!">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ledger-title">{batch.batchId}</span>
                        <span className="cq-kicker">
                          {batch.eventCount} event
                          {batch.eventCount === 1 ? "" : "s"} ·{" "}
                          {formatDateTime(batch.createdAt)}
                        </span>
                      </div>
                      {/* Receipt metadata is key/value, so it is a definition
                          list. The two hashes sit inside ONE well rather than
                          two boxes: they are one commitment, read in two forms. */}
                      <dl className="dl-grid mt-2">
                        <dt>Events committed</dt>
                        <dd>{batch.eventCount}</dd>
                        <dt>Chain id</dt>
                        <dd>{batch.chainId ?? "—"}</dd>
                        <dt>Confirmed</dt>
                        <dd>
                          {batch.confirmedAt
                            ? formatDateTime(batch.confirmedAt)
                            : "not yet confirmed"}
                        </dd>
                      </dl>

                      <div className="well mt-3">
                        <HashRow label="Merkle root" value={batch.merkleRoot} />
                        <HashRow label="Transaction hash" value={batch.txHash} />
                      </div>
                    </div>
                    <div className="ledger-actions flex-col items-end gap-1.5">
                      <Badge variant="copper">{batch.network}</Badge>
                      {batch.txHash ? (
                        <span className="cq-pixel-label cq-real-label">
                          <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          on chain
                        </span>
                      ) : (
                        <span className="cq-pixel-label cq-sim-label">
                          <Link2Off className="h-[13px] w-[13px]" strokeWidth={1.75} />
                          not on chain
                        </span>
                      )}
                      <Badge variant="secondary">{batch.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Reveal>

        {/* ====================================================== PROVENANCE.
            Append-only events are chronological, so they are a timeline: the
            most honest shape for a provenance narrative, and it leaves room
            for the full event hash to sit under its own entry. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Append-only events</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Recent provenance
            </MaskedText>
            <p className="section-lede">
              {data.events.length} event{data.events.length === 1 ? "" : "s"} in this
              hospital&apos;s chain, newest first. Each hash links to the one before it.
            </p>
          </div>

          <div className="timeline">
            {data.events.map((event) => (
              <article key={event.eventId} className="timeline-item" data-tone="copper">
                <div className="timeline-time">
                  {event.createdAt ? formatDateTime(event.createdAt) : "—"}
                </div>
                <div className="timeline-title flex flex-wrap items-center gap-2">
                  {event.eventType}
                  <span className="text-[12px] font-normal text-[var(--text-muted)]">
                    {event.resourceType}
                  </span>
                </div>
                <div className="timeline-body">
                  Event id{" "}
                  <span className="select-all break-all font-mono">
                    {event.eventId}
                  </span>
                </div>
                {/* The chain head, in full, on every entry — this is the value a
                    reviewer actually checks. No truncation anywhere. */}
                <div className="well mt-2 select-all break-all px-2.5 py-1.5 font-mono text-[11px] leading-4 text-[var(--text-muted)]">
                  {event.eventHash}
                </div>
              </article>
            ))}
            {!data.events.length ? (
              <p className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                <Link2Off className="h-[18px] w-[18px]" strokeWidth={1.75} />
                No provenance events recorded yet.
              </p>
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
          <dl className="dl-grid mt-2">
            <dt>Batches anchored</dt>
            <dd>{data.batches.length}</dd>
            <dt>With a tx hash</dt>
            <dd>{confirmedBatches}</dd>
            <dt>EVM bridge</dt>
            <dd>
              {data.blockchain?.ok ? (
                <span className="cq-pixel-label cq-real-label">Online</span>
              ) : (
                <span className="cq-pixel-label cq-sim-label">Offline</span>
              )}
            </dd>
          </dl>
        </div>
      </aside>
    </div>
  );
}
