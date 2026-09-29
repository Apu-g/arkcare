"use client";

import { Building2, Gift, WalletCards } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";

/**
 * Hospital programs are a short list of contexts the patient switches between,
 * so it reads as a selectable ledger rather than a grid of identical cards. The
 * selected row is the only one that gets a surface and a ring; the rest are
 * hairline rows. The balance is a number the patient acts on, so it stays on a
 * near-opaque data surface.
 */
export default function CarePassport({ passport, selectedProgramId, onSelect }) {
  const programs = passport?.programs || [];

  return (
    <Reveal>
      <section className="nm-stack-sm">
        <div>
          <div className="section-rule">Your care passport</div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Hospital programs
            </MaskedText>
            <p className="section-lede">
              Each hospital keeps its own Capsule balance, benefits and program terms.
            </p>
          </div>
        </div>
        <PixelCharacter variant="guide" mood="idle" size={54} />

        <div className="ledger">
          <div className="ledger-head">
            <span>Hospital program</span>
            <span>Context</span>
          </div>
          {programs.map((card) => {
            const selected = String(card.program._id) === String(selectedProgramId);
            return (
              <button
                type="button"
                key={card.program._id}
                onClick={() => onSelect(card.program._id)}
                aria-pressed={selected}
                className={
                  "ledger-row items-start text-left " +
                  (selected
                    ? "rounded-[14px] bg-[var(--surface)] px-3.5 ring-2 ring-[var(--primary)]"
                    : "")
                }
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2
                      className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                      strokeWidth={1.75}
                    />
                    <span className="ledger-title">{card.organization.name}</span>
                    <span className="cq-pixel-label">{card.program.capsuleSymbol}</span>
                  </div>
                  <p className="ledger-meta mt-0.5">{card.program.name}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Gift className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      {card.catalog?.length || 0} benefits
                    </span>
                  </p>
                </div>

                <div className="ledger-actions flex-col items-end gap-2">
                  {/* Capsule balance: a numeric value, so it sits on a data surface. */}
                  <div className="well px-3 py-1.5 text-right">
                    <div className="text-[18px] font-bold leading-tight text-[var(--text-strong)] tabular-nums">
                      {card.balance}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {card.program.capsuleSymbol} capsules
                    </div>
                  </div>
                  <span
                    className={
                      "inline-flex items-center gap-1.5 text-[11px] font-semibold " +
                      (selected
                        ? "text-[var(--text-strong)]"
                        : "text-[var(--text-muted)]")
                    }
                  >
                    <WalletCards className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    {selected ? "Current hospital context" : "Open this hospital journey"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}
