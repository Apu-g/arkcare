"use client";

import { Building2, Link2, ShieldCheck } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import CapsuleIcon from "@/components/carequest/CapsuleIcon";

/**
 * A hospital admin's own hospital: reputation (capsules earned by its patients,
 * a non-cash metric), the per-patient engagement leaderboard, and the hospital's
 * independent audit head. Scoped to the admin's assigned organization.
 */
export default function HospitalProfileCard({ profile }) {
  if (!profile) {
    return (
      <p className="border-l-2 border-[var(--border)] pl-3 text-[13px] text-[var(--text-muted)]">
        No hospital is assigned to this admin account yet.
      </p>
    );
  }

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        <Reveal as="section">
          <div className="section-rule">
            <span>Hospital reputation</span>
          </div>
          <div className="section-head">
            <MaskedText as="h1" className="section-title">
              {profile.name}
            </MaskedText>
            <Building2
              className="h-[18px] w-[18px] text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
          </div>
          <p className="section-lede">
            Your hospital&apos;s reputation is the participation its own patients have
            generated. It reflects engagement and trust — it is never a claimable
            balance, and Capsules remain hospital-specific, non-transferable units.
          </p>

          <dl className="stat-strip mt-5">
            <div className="stat-inline">
              <dt>
                <CapsuleIcon size={14} className="mr-1 inline-block align-[-2px]" />
                {profile.symbol} earned by your patients
              </dt>
              <dd>
                {profile.totalCapsules}
                <small> participation, not a claimable balance</small>
              </dd>
            </div>
            <div className="stat-inline">
              <dt>Enrolled patients</dt>
              <dd>{profile.patientCount}</dd>
            </div>
            <div className="stat-inline">
              <dt>Doctors on your roster</dt>
              <dd>{profile.doctorCount}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--celadon-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--celadon)]">
              <CapsuleIcon size={15} />
              {profile.reputationLabel}
            </span>
            <span className="text-[13px] text-[var(--text-muted)]">
              reputation {profile.reputationScore}/100
            </span>
            <PixelCharacter
              variant="guardian"
              mood="wave"
              size={64}
              speech="Every patient engagement counts toward your trust score."
            />
          </div>
        </Reveal>

        {/* Operational record lists: appointments and resolved handoffs are
            counts about work, not things the admin can act on, so they read as
            an inline figure strip rather than as more cards. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Program operations</span>
          </div>
          <div className="section-head">
            <h2 className="section-title">Where the work went</h2>
            <p className="section-lede">
              Appointment volume and handoff resolution for this hospital.
            </p>
          </div>
          <dl className="stat-strip mt-4">
            <div className="stat-inline">
              <dt>Appointments</dt>
              <dd>{profile.appointmentCount}</dd>
            </div>
            <div className="stat-inline">
              <dt>Handoffs resolved</dt>
              <dd>{profile.resolvedCases}</dd>
            </div>
            <div className="stat-inline">
              <dt>Handoffs open</dt>
              <dd>{profile.openCases}</dd>
            </div>
          </dl>
        </Reveal>

        {/* Patient participation is a record list, so it is a ledger. */}
        <Reveal as="section">
          <div className="section-rule">
            <span>Patient engagement</span>
          </div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Top participating patients
            </MaskedText>
            <p className="section-lede">
              Recognising consistent participation — not health outcomes.
            </p>
          </div>

          <div className="ledger">
            <div className="ledger-head">
              <span>Patient</span>
              <span>Capsules</span>
            </div>
            {profile.leaderboard.map((row, index) => (
              <div key={row.patientId} className="ledger-row">
                <div className="flex items-center gap-2">
                  <span className="cq-pixel-label">#{index + 1}</span>
                  <span className="ledger-title">{row.patientName}</span>
                </div>
                <span className="ledger-actions text-[13px] font-semibold text-[var(--text)]">
                  <CapsuleIcon size={14} className="text-[var(--primary)]" />
                  {row.capsules} {profile.symbol}
                </span>
              </div>
            ))}
          </div>
          {!profile.leaderboard.length ? (
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              No capsule activity recorded yet.
            </p>
          ) : null}
        </Reveal>
      </div>

      <aside className="nm-rail">
        <div>
          <div className="cq-kicker">Independent audit</div>
          <h2 className="mt-1 text-[14px] font-semibold text-[var(--text-strong)]">
            This hospital&apos;s chain
          </h2>
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
            Every hospital verifies its own append-only audit chain, separate from all
            other hospitals.
          </p>
        </div>

        {/* Provenance is the PROOF half, so this panel alone drops onto the ink
            scope. No colour is redeclared — the scope remaps the tokens. */}
        <Reveal data-scope="ink" className="nm-dark-card p-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-[16px] w-[16px] text-[var(--copper)]" strokeWidth={1.75} />
            <span className="cq-kicker">Chain head</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {profile.chainValid ? (
              <span className="cq-pixel-label cq-real-label">
                <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                chain valid
              </span>
            ) : (
              <span className="cq-pixel-label cq-sim-label">chain check</span>
            )}
          </div>
          <div className="mt-2 text-[30px] font-bold leading-none tracking-[-0.02em] text-[var(--text-strong)]">
            {profile.chainValid ? "VALID" : "CHECK"}
          </div>
          <div className="cq-kicker mt-1.5">your audit chain</div>

          {/* The hash is the credibility: shown in full, selectable, never
              truncated, on a near-opaque data surface. */}
          <div className="well mt-3 select-all break-all px-3 py-2.5 font-mono text-[12px] leading-5 text-[var(--text)]">
            {profile.headHash || "—"}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
            {profile.chainChecked} event hash(es) recomputed for this hospital.{" "}
            {profile.anchorCount} on-chain anchor
            {profile.anchorCount === 1 ? "" : "s"}.
          </p>
          {profile.tokenId ? (
            <dl className="dl-grid mt-3 border-t border-[var(--glass-hairline)] pt-3">
              <dt>On-chain token</dt>
              <dd className="select-all break-all font-mono text-[11px] leading-4">
                {profile.tokenId}
              </dd>
            </dl>
          ) : null}
        </Reveal>
      </aside>
    </div>
  );
}
