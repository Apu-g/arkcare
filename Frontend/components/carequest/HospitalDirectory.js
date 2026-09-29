"use client";

import { Building2, HeartPulse, Link2, ShieldCheck, Stethoscope, Users } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import CapsuleIcon from "@/components/carequest/CapsuleIcon";

/**
 * The public hospital network directory. Shows every hospital, its reputation
 * (capsules earned by its patients — a non-cash, non-transferable engagement
 * metric) and the fact that each keeps its own independent audit chain.
 */
export default function HospitalDirectory({ hospitals }) {
  return (
    <div className="nm-stack">
      <Reveal as="section" className="cq-card p-5 md:p-6">
        <div className="cq-kicker">CareQuest network</div>
        <MaskedText
          as="h1"
          className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
        >
          Choose a hospital you trust
        </MaskedText>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
          Each hospital runs its own clinical program and its own audit chain. Reputation
          reflects the participation its patients have generated — it is a quality
          signal, never a cashable balance. Capsules are hospital-specific and cannot be
          transferred or cashed out.
        </p>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
          <PixelCharacter
            variant="guardian"
            mood="idle"
            size={64}
            speech={`${hospitals.length} hospitals in the network`}
          />
        </div>
      </Reveal>

      {/* Hospital cards carry no hashes or clinical values, so they sit on
          secondary glass rather than the near-opaque data surface. */}
      <Reveal className="nm-grid-2">
        {hospitals.map((hospital, index) => (
          <article key={hospital.organizationId} className="cq-card cq-card-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="nm-stat-icon shrink-0">
                  <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="cq-pixel-label">#{index + 1}</span>
                    <h3 className="nm-card-title text-[14px]">{hospital.name}</h3>
                  </div>
                  <p className="mt-0.5 text-[12px] font-semibold text-[var(--text)]">
                    {hospital.reputationLabel}{" "}
                    <span className="font-normal text-[var(--text-muted)]">
                      · reputation {hospital.reputationScore}/100
                    </span>
                  </p>
                </div>
              </div>
              {hospital.chainValid ? (
                <span className="cq-pixel-label cq-real-label">
                  <Link2 className="h-[13px] w-[13px]" strokeWidth={1.75} /> chain valid
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-[13px] leading-6 text-[var(--text-muted)]">
              {hospital.about}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="nm-stat !p-3">
                <div className="flex items-center gap-1.5 text-[18px] font-bold text-[var(--text-strong)]">
                  <CapsuleIcon size={15} className="text-[var(--primary)]" />
                  {hospital.totalCapsules}
                </div>
                <div className="nm-stat-label">{hospital.symbol} earned</div>
              </div>
              <div className="nm-stat !p-3">
                <div className="flex items-center gap-1.5 text-[18px] font-bold text-[var(--text-strong)]">
                  <Stethoscope className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  {hospital.doctorCount}
                </div>
                <div className="nm-stat-label">doctors</div>
              </div>
              <div className="nm-stat !p-3">
                <div className="flex items-center gap-1.5 text-[18px] font-bold text-[var(--text-strong)]">
                  <Users className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  {hospital.patientCount}
                </div>
                <div className="nm-stat-label">patients</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={1.75} />
              {hospital.appointmentCount} appointments · {hospital.resolvedCases} handoffs
              resolved · own audit head verified
            </div>
          </article>
        ))}
      </Reveal>

      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-[var(--text-muted)]">
        <HeartPulse className="h-[15px] w-[15px]" strokeWidth={1.75} />
        Reputation is participation, not a health score. A hospital cannot claim or cash
        out a share of your Capsules.
      </p>
    </div>
  );
}
