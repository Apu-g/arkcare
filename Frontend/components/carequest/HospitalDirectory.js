"use client";

import { Building2, HeartPulse, Link2, Link2Off, ShieldCheck } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import CapsuleIcon from "@/components/carequest/CapsuleIcon";

/**
 * The public hospital network directory. Shows every hospital, its reputation
 * (capsules earned by its patients — a non-cash, non-transferable engagement
 * metric) and the fact that each keeps its own independent audit chain.
 *
 * EDITORIAL SHAPE: this used to be a grid of one card per hospital, each card
 * carrying its own three `.nm-stat` tiles — so a directory of eight hospitals
 * read as ~32 identical boxes with no sense of which hospital matters. It is now:
 *   - the lead hospital as a single card (the one worth a box),
 *   - every other hospital as a hairline ledger row with an inline figure strip.
 * The ledger is the honest shape here because the records are structurally
 * identical: name, tier, capsules earned, headcount, chain verdict.
 */
export default function HospitalDirectory({ hospitals }) {
  const [lead, ...rest] = hospitals;

  return (
    <div className="nm-stack">
      <Reveal as="section">
        <div className="section-rule">
          <span>CareQuest network</span>
        </div>
        <div className="section-head">
          <MaskedText as="h1" className="section-title">
            Choose a hospital you trust
          </MaskedText>
          <span className="cq-pixel-label">
            {hospitals.length} hospital{hospitals.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="section-lede">
          Each hospital runs its own clinical program and its own audit chain. Reputation
          reflects the participation its patients have generated — it is a quality
          signal, never a cashable balance. Capsules are hospital-specific and cannot
          be transferred or cashed out.
        </p>
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <PixelCharacter
            variant="guardian"
            mood="idle"
            size={64}
            speech={`${hospitals.length} hospitals in the network`}
          />
        </div>
      </Reveal>

      {/* ------------------------------------------------- the lead hospital.
          Ranked first by participation earned, so it is the one hospital a
          patient is most likely to choose — the only record on this page that
          earns a card. Its balances are values, so they sit on `.well` (the
          near-opaque data surface) rather than behind the primary blur. */}
      {lead ? (
        <Reveal as="section">
          <div className="section-rule">
            <span>Ranked first</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Highest participation earned
            </MaskedText>
            <span className="cq-kicker">#1 of {hospitals.length}</span>
          </div>

          <article className="cq-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="nm-stat-icon shrink-0">
                  <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="nm-card-title text-[15px]">{lead.name}</h3>
                  <p className="mt-0.5 text-[12px] font-semibold text-[var(--text)]">
                    {lead.reputationLabel}{" "}
                    <span className="font-normal text-[var(--text-muted)]">
                      · reputation {lead.reputationScore}/100
                    </span>
                  </p>
                </div>
              </div>
              {lead.chainValid ? (
                <span className="cq-pixel-label cq-real-label">
                  <Link2 className="h-[13px] w-[13px]" strokeWidth={1.75} /> chain valid
                </span>
              ) : (
                <span className="cq-pixel-label">
                  <Link2Off className="h-[13px] w-[13px]" strokeWidth={1.75} /> no chain
                  verdict yet
                </span>
              )}
            </div>

            <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[var(--text-muted)]">
              {lead.about}
            </p>

            <dl className="stat-strip mt-4">
              <div className="stat-inline">
                <dt>
                  <CapsuleIcon size={14} className="mr-1 inline-block align-[-2px]" />
                  {lead.symbol} earned
                </dt>
                <dd>{lead.totalCapsules}</dd>
              </div>
              <div className="stat-inline">
                <dt>Doctors</dt>
                <dd>{lead.doctorCount}</dd>
              </div>
              <div className="stat-inline">
                <dt>Patients</dt>
                <dd>{lead.patientCount}</dd>
              </div>
              <div className="stat-inline">
                <dt>Appointments</dt>
                <dd>{lead.appointmentCount}</dd>
              </div>
            </dl>
          </article>
        </Reveal>
      ) : null}

      {/* --------------------------------------------------- the rest of the
          network. Records, so a ledger — one row per hospital, hairline
          separated. The chain verdict is an icon plus a word, never colour
          alone. */}
      {rest.length ? (
        <Reveal as="section">
          <div className="section-rule">
            <span>Rest of the network</span>
          </div>
          <div className="section-head">
            <h2 className="section-title">
              {rest.length} more hospital{rest.length === 1 ? "" : "s"}
            </h2>
            <p className="section-lede">
              Ranked by the participation their own patient cohorts generated.
            </p>
          </div>

          <div className="ledger">
            <div className="ledger-head">
              <span>Hospital</span>
              <span>Chain &amp; participation</span>
            </div>
            {rest.map((hospital, index) => (
              <div key={hospital.organizationId} className="ledger-row items-start!">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="cq-kicker">#{index + 2}</span>
                    <span className="ledger-title">{hospital.name}</span>
                    <span className="cq-pixel-label">{hospital.reputationLabel}</span>
                  </div>
                  <p className="ledger-meta mt-1">{hospital.about}</p>
                  <p className="ledger-meta mt-1 flex flex-wrap items-center gap-1.5">
                    <CapsuleIcon size={14} className="text-[var(--primary)]" />
                    <strong className="text-[var(--text)]">
                      {hospital.totalCapsules}
                    </strong>{" "}
                    {hospital.symbol} earned · {hospital.patientCount} patients ·{" "}
                    {hospital.doctorCount} doctors
                  </p>
                </div>

                <div className="ledger-actions flex-col items-end gap-1.5">
                  {hospital.chainValid ? (
                    <span className="cq-pixel-label cq-real-label">
                      <Link2 className="h-[13px] w-[13px]" strokeWidth={1.75} /> chain
                      valid
                    </span>
                  ) : (
                    <span className="cq-pixel-label">
                      <Link2Off className="h-[13px] w-[13px]" strokeWidth={1.75} /> no chain
                      verdict yet
                    </span>
                  )}
                  <span className="cq-pixel-label">
                    <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} /> own
                    audit head verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-[var(--text-muted)]">
        <HeartPulse className="h-[15px] w-[15px]" strokeWidth={1.75} />
        Reputation is participation, not a health score. A hospital cannot claim or cash
        out a share of your Capsules.
      </p>
    </div>
  );
}
