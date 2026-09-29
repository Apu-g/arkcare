"use client";

import { formatDateTime } from "@/lib/formatDate";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PathMorph from "@/components/motion/PathMorph";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
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

/**
 * Chain of custody — a real path, not artwork.
 *
 * The line is scrubbed by PathMorph as the panel enters view, and the caption
 * under it is the live figure from the query behind this screen
 * (`networkTotals.totalAuditEvents` / `hospitalCount`), so the drawing and the
 * number it labels can never disagree.
 */
const CUSTODY_PATH =
  "M 10 46 C 58 46 74 18 124 18 C 174 18 190 50 244 50 " +
  "C 298 50 314 18 364 18 C 414 18 430 40 490 40";

function ChainOfCustody({ eventCount, chainCount }) {
  return (
    <div>
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
          {eventCount} audit event{eventCount === 1 ? "" : "s"} ·{" "}
          {chainCount} independent hospital chain{chainCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

/**
 * Full, untruncated hash with a copy button. The master console is the
 * operator's window into the proof rail, so the value shown here must be the
 * complete hash (not an ellipsised prefix) and must be copyable so it can be
 * checked against the chain.
 */
function HashField({ label, value, hint, tone, bare = false }) {
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
    /* `bare` puts the hash on an existing data surface as a hairline-separated
       row, so a hospital with three provenance values does not become three
       nested boxes. It is always the same hash rendering either way. */
    <div className={bare ? "border-b border-[var(--glass-hairline)] py-3 first:pt-0 last:border-b-0 last:pb-0" : "well"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="cq-kicker">{label}</span>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
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
 * The platform (master) console.
 *
 * EDITORIAL ORDER — the page answers an operator's questions in the order they
 * actually ask them, as document sections rather than a symmetric grid:
 *   1. the network at a glance            (stat strip, no tiles)
 *   2. is the network verified?           (the single ink anchor)
 *   3. what is anchored, per hospital     (ledger, one row per hospital)
 *   4. what is happening right now        (timeline of recent events)
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
      ? "border-[var(--destructive)] bg-[var(--destructive-soft)] text-[var(--destructive)]"
      : reanchor.tone === "success"
        ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]"
        : "border-[var(--border)] bg-[var(--surface-well)] text-[var(--text-muted)]";

  const broken = totals.brokenChainCount || 0;
  const unknown = totals.unknownChainCount || 0;

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        {/* ====================================================== 1. THE
            NETWORK AT A GLANCE. Header is editorial — a rule and a heading,
            never a boxed panel — and the three headline figures read as one
            inline strip instead of three identical tiles. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Platform / master</span>
          </div>
          <div className="section-head">
            <MaskedText as="h1" className="section-title">
              ArkCare hospital network
            </MaskedText>
            <SimulationBadge real>Network-wide</SimulationBadge>
          </div>
          <p className="section-lede">
            Every hospital runs its own clinical program, Capsule wallet and audit
            chain, stored and verified separately. A hospital&apos;s reputation is the
            participation its patients have generated — it is a quality signal, not a
            claimable balance, and Capsules are never cashable or transferable.
          </p>

          <dl className="stat-strip mt-5">
            <div className="stat-inline">
              <dt>Hospitals</dt>
              <dd>{totals.hospitalCount}</dd>
            </div>
            <div className="stat-inline">
              <dt>Participation earned</dt>
              <dd>
                <HeartPulse
                  className="mr-1.5 inline-block h-4 w-4 align-[-1px] text-[var(--celadon)]"
                  strokeWidth={1.75}
                />
                {totals.totalCapsules}
                <small> non-cash</small>
              </dd>
            </div>
            <div className="stat-inline">
              <dt>On-chain anchors</dt>
              <dd className="text-[var(--copper)]">{totals.totalOnChainAnchors}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Each hospital holds an independent chain; an anchor commits one merkle root
            of many event hashes to it.
          </p>
        </Reveal>

        {/* ====================================================== 2. VERDICT.
            Chain integrity is the PROOF half of the product, so this is the one
            ink anchor on the screen. Everything the operator must trust before
            reading anything else is here; the framing above stays on the light
            clinical base. Nothing in here re-declares a colour — the scope does
            it. */}
        <Reveal as="section" data-scope="ink" className="nm-dark-card p-5 md:p-6">
          <div className="section-rule mt-0">
            <span>Verification</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Is the network verified?
            </MaskedText>
            <span className="cq-pixel-label">
              Append-only · one chain per hospital
            </span>
          </div>

          <dl className="stat-strip mt-2">
            <div className="stat-inline">
              <dt>Verdict</dt>
              <dd>{totals.allChainsValid ? "VALID" : "CHECK"}</dd>
            </div>
            <div className="stat-inline">
              <dt>Chain heads checked</dt>
              <dd>
                {totals.hospitalCount - broken - unknown}
                <small> /{totals.hospitalCount}</small>
              </dd>
            </div>
            <div className="stat-inline">
              <dt>Audit events</dt>
              <dd className="text-[var(--copper)]">{totals.totalAuditEvents}</dd>
            </div>
          </dl>

          <ul className="mt-3 grid gap-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
            <li>
              {totals.allChainsValid
                ? "Every hospital chain is internally consistent."
                : `${broken} chain(s) need review.`}
            </li>
            <li>
              {unknown > 0
                ? `${unknown} chain(s) not verified yet.`
                : "All chains verified."}
            </li>
            <li>Every event is hash-chained and tenant scoped.</li>
          </ul>

          <div className="mt-5">
            <ChainOfCustody
              eventCount={totals.totalAuditEvents}
              chainCount={totals.hospitalCount}
            />
          </div>

          {/* The local chain is in-memory and resets on every restart, which
              leaves the stored anchors unverifiable until they are re-committed.
              This re-commits the SAME merkle roots, so it restores the proof
              without rewriting any event. */}
          <div className="mt-5 border-t border-[var(--glass-hairline)] pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="copper"
                onClick={handleReanchor}
                disabled={reanchor.busy}
              >
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
                key={reanchor.message}
                role="status"
                aria-live="polite"
                className={
                  "cq-achievement mt-3 rounded-[14px] border px-3 py-2 text-[12px] leading-5 " +
                  reanchorTone
                }
              >
                {reanchor.message}
              </div>
            ) : null}
          </div>
        </Reveal>

        {/* ====================================================== 3. WHAT IS
            ANCHORED. Hospitals are records, so they are a ledger: hairline
            rows, not one card per hospital. A row expands in place to reveal
            that hospital's chain head, merkle root and anchor receipt. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Hospitals &amp; reputation</span>
          </div>
          <div className="section-head">
            <MaskedText
              as="h2"
              className="section-title"
              lines={["Ranked by the participation", "their patient cohort generated"]}
            />
            <p className="section-lede">
              Open a hospital to read its full chain head, merkle root and anchor
              transaction.
            </p>
          </div>

          <div className="ledger">
            <div className="ledger-head">
              <span>Hospital</span>
              <span>Chain &amp; anchors</span>
            </div>

            {overview.hospitals.map((hospital, index) => {
              const isOpen = expanded === hospital.organizationId;
              return (
                <div key={hospital.organizationId}>
                  <div className="ledger-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="cq-kicker">#{index + 1}</span>
                        <span className="ledger-title">{hospital.name}</span>
                        <Badge variant="default">{hospital.reputationLabel}</Badge>
                        {hospital.chainValid === false ? (
                          <Badge variant="warning">chain check</Badge>
                        ) : null}
                      </div>
                      <p className="ledger-meta mt-1 flex flex-wrap items-center gap-1.5">
                        <CapsuleIcon size={14} className="text-[var(--primary)]" />
                        <strong className="text-[var(--text)]">
                          {hospital.totalCapsules}
                        </strong>{" "}
                        {hospital.symbol} earned by its patients · {hospital.patientCount}{" "}
                        patients · {hospital.doctorCount} doctors
                      </p>
                    </div>

                    <div className="ledger-actions flex-col items-end gap-1.5">
                      {/* On-chain state is always an icon plus a word, so it
                          never depends on colour alone. */}
                      {hospital.anchorOnChain === true ? (
                        <Badge variant="copper">
                          <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
                          {hospital.anchorCount} anchor
                          {hospital.anchorCount === 1 ? "" : "s"} on chain
                        </Badge>
                      ) : hospital.anchorCount > 0 ? (
                        <span className="cq-pixel-label cq-sim-label">
                          <TriangleAlert className="h-[13px] w-[13px]" strokeWidth={1.75} />{" "}
                          {hospital.anchorCount} anchor
                          {hospital.anchorCount === 1 ? "" : "s"} off chain
                        </span>
                      ) : null}
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
                    <div className="border-b border-[var(--border-subtle)] pb-6 pt-1">
                      <dl className="dl-grid">
                        <dt>Reputation score</dt>
                        <dd>
                          {hospital.reputationScore}
                          <small className="ml-1 text-[12px] font-semibold text-[var(--text-muted)]">
                            /100
                          </small>
                        </dd>
                        <dt>Handoffs resolved</dt>
                        <dd>{hospital.resolvedCases}</dd>
                        <dt>On-chain token</dt>
                        <dd className="select-all break-all font-mono text-[13px]">
                          {hospital.tokenId || "—"}
                        </dd>
                      </dl>

                      {/* Full hash provenance, same as the hospital audit log.
                          The provenance block is the proof surface, so it alone
                          drops onto the ink scope; the ledger row above stays on
                          the light clinical base. */}
                      <div data-scope="ink" className="nm-dark-card mt-4 p-4">
                        <div className="flex flex-wrap items-center gap-2">
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
                          {hospital.anchorOnChain === true ? (
                            <Badge variant="copper">
                              <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
                              anchor verified on chain
                            </Badge>
                          ) : null}
                        </div>
                        {/* Chain health and anchor metadata are key/values, so
                            they read as a definition list beside the hashes
                            rather than as another box. */}
                        <dl className="dl-grid mt-3">
                          <dt>Chain health</dt>
                          <dd>
                            {hospital.chainChecked} of {hospital.chainTotal} events
                            recomputed
                            {hospital.chainTruncated ? " (truncated)" : ""}
                          </dd>
                          <dt>On-chain anchors</dt>
                          <dd>
                            {hospital.anchorCount} confirmed batch
                            {hospital.anchorCount === 1 ? "" : "es"}
                          </dd>
                          <dt>Anchor network</dt>
                          <dd>
                            {hospital.latestAnchor
                              ? `Chain ${hospital.latestAnchor.chainId ?? "—"} · ${
                                  hospital.latestAnchor.network || "local EVM"
                                }`
                              : "—"}
                          </dd>
                          <dt>Batch committed</dt>
                          <dd>
                            {hospital.latestAnchor
                              ? hospital.latestAnchor.eventCount + " event hashes"
                              : "—"}
                          </dd>
                        </dl>
                        {hospital.anchorCount > 0 &&
                        hospital.anchorOnChain === false ? (
                          <div className="mt-2">
                            <span className="cq-pixel-label cq-sim-label">
                              <TriangleAlert className="h-[13px] w-[13px]" strokeWidth={1.75} />
                              anchor not on current chain
                            </span>
                          </div>
                        ) : null}

                        {/* Provenance is three key/values, so it is ONE data
                            surface with a definition list inside it — not three
                            stacked boxes. Every hash is rendered in full, in
                            mono, break-all and selectable, so an operator can
                            copy it and check it against the chain. */}
                        <div className="well mt-3">
                          <HashField
                            bare
                            label="Audit chain head (latest event hash)"
                            value={hospital.headHash}
                            hint="Final link in this hospital's hash chain. Changing any earlier event breaks the link back to the genesis head."
                          />

                          <HashField
                            bare
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
                            bare
                            label="Anchor transaction hash"
                            value={hospital.latestAnchor?.txHash}
                            hint={
                              hospital.latestAnchor
                                ? "Chain " +
                                  (hospital.latestAnchor.chainId ?? "—") +
                                  " · " +
                                  (hospital.latestAnchor.network || "local EVM") +
                                  " · anchored " +
                                  formatDateTime(hospital.latestAnchor.confirmedAt)
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* ====================================================== 4. RECENT
            ACTIVITY. Events are chronological, so they are a timeline — the
            most honest shape for a provenance narrative. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Where every audit went</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Recent network activity
            </MaskedText>
            <p className="section-lede">
              Every event is tagged to the hospital it belongs to, with an independent
              chain per hospital.
            </p>
          </div>

          <div className="timeline">
            {overview.recentEvents.map((event) => (
              <article key={event.eventId} className="timeline-item" data-tone="copper">
                <div className="timeline-time">
                  {formatDateTime(event.createdAt)}
                </div>
                <div className="timeline-title flex flex-wrap items-center gap-2">
                  {event.eventType}
                  <Badge variant="outline">{event.actorRole}</Badge>
                </div>
                <div className="timeline-body">
                  {event.organizationName} · {event.resourceType}
                </div>
                {/* Per-event hash, matching the hospital audit log view. */}
                <div className="well mt-2 select-all break-all px-2.5 py-1.5 font-mono text-[11px] leading-4 text-[var(--text-muted)]">
                  {event.eventHash || "no hash"}
                </div>
              </article>
            ))}
          </div>
        </Reveal>
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
          <dl className="dl-grid mt-2">
            <dt>Verified chains</dt>
            <dd>{totals.hospitalCount - broken - unknown}</dd>
            <dt>Broken chains</dt>
            <dd>{broken}</dd>
            <dt>Unverified chains</dt>
            <dd>{unknown}</dd>
          </dl>
          <div className="glass-data mt-3 rounded-[16px] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--text)]">
                Verified share
              </span>
              <span className="nm-card-title">
                {totals.hospitalCount - broken - unknown}/{totals.hospitalCount}
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
            <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
              A broken chain means recomputation found a broken link. An unverified chain
              has no verdict yet, so it is never counted as valid.
            </p>
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
