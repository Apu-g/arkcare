"use client";

import { Building2, Link2, ShieldCheck, Stethoscope, Users } from "lucide-react";
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
      <div className="cq-card border-dashed p-8 text-center text-[13px] text-[var(--text-muted)]">
        No hospital is assigned to this admin account yet.
      </div>
    );
  }

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        <section className="nm-dark-card cq-reveal p-5 md:p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-[18px] w-[18px] text-white/70" strokeWidth={1.75} />
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
              Hospital reputation
            </span>
          </div>
          <h1 className="mt-4 text-[20px] font-bold leading-tight tracking-[-0.01em] text-white">
            {profile.name}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#B7B7BE]">
            Your hospital&apos;s reputation is the participation its own patients have
            generated. It reflects engagement and trust — it is never a claimable
            balance, and Capsules remain hospital-specific, non-transferable units.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white">
              <CapsuleIcon size={15} />
              {profile.reputationLabel}
            </span>
            <span className="text-[13px] text-[#B7B7BE]">
              reputation {profile.reputationScore}/100
            </span>
            <PixelCharacter
              variant="guardian"
              mood="wave"
              size={64}
              speech="Every patient engagement counts toward your trust score."
            />
          </div>
        </section>

        <section className="nm-grid-3">
          <div className="nm-stat">
            <div className="nm-stat-icon">
              <CapsuleIcon size={18} />
            </div>
            <div className="nm-stat-value mt-3">{profile.totalCapsules}</div>
            <div className="nm-stat-label">
              {profile.symbol} earned by your patients
            </div>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-subtle)]">
              Participation, not a claimable balance
            </p>
          </div>
          <div className="nm-stat">
            <div className="nm-stat-icon">
              <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="nm-stat-value mt-3">{profile.patientCount}</div>
            <div className="nm-stat-label">enrolled patients</div>
          </div>
          <div className="nm-stat">
            <div className="nm-stat-icon">
              <Stethoscope className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="nm-stat-value mt-3">{profile.doctorCount}</div>
            <div className="nm-stat-label">doctors on your roster</div>
          </div>
        </section>

        <section className="cq-card p-5 md:p-6">
          <div className="cq-kicker">Patient engagement</div>
          <h2 className="cq-section-title mt-1">Top participating patients</h2>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            Recognising consistent participation — not health outcomes.
          </p>
          <div className="mt-3">
            {profile.leaderboard.map((row, index) => (
              <div key={row.patientId} className="nm-row text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="cq-pixel-label">#{index + 1}</span>
                  <span className="font-semibold text-[var(--text)]">
                    {row.patientName}
                  </span>
                </div>
                <span className="flex items-center justify-end gap-1 font-semibold text-[var(--text)]">
                  <CapsuleIcon size={14} className="text-[var(--primary)]" />
                  {row.capsules} {profile.symbol}
                </span>
              </div>
            ))}
            {!profile.leaderboard.length ? (
              <p className="text-[13px] text-[var(--text-muted)]">
                No capsule activity recorded yet.
              </p>
            ) : null}
          </div>
        </section>
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

        <div className="rounded-[18px] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
          {profile.chainValid ? (
            <span className="cq-pixel-label cq-real-label">
              <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
              chain valid
            </span>
          ) : (
            <span className="cq-pixel-label cq-sim-label">chain check</span>
          )}
          <div className="nm-metric-xl mt-2">
            {profile.chainValid ? "VALID" : "CHECK"}
          </div>
          <div className="nm-stat-label">your audit chain</div>
        </div>

        <div className="cq-card-soft px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-[14px] w-[14px] text-[var(--text-muted)]" strokeWidth={1.75} />
            <span className="cq-kicker">Chain head hash</span>
          </div>
          <div className="mt-1.5 select-all break-all font-mono text-[12px] leading-5 text-[var(--text)]">
            {profile.headHash || "—"}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
            {profile.chainChecked} event hash(es) recomputed for this hospital.
          </p>
        </div>
      </aside>
    </div>
  );
}
