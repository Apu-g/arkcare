"use client";

import { Building2, Gift, WalletCards } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";

export default function CarePassport({ passport, selectedProgramId, onSelect }) {
  const programs = passport?.programs || [];

  return (
    <Reveal>
      <section className="nm-stack-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="cq-kicker">YOUR CARE PASSPORT</div>
            <MaskedText as="h2" className="cq-section-title mt-1">
              Hospital programs
            </MaskedText>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Each hospital keeps its own Capsule balance, benefits and program terms.
            </p>
          </div>
          <PixelCharacter variant="guide" mood="idle" size={54} />
        </div>

        <div className="nm-grid-2">
          {programs.map((card) => {
            const selected = String(card.program._id) === String(selectedProgramId);
            return (
              <button
                type="button"
                key={card.program._id}
                onClick={() => onSelect(card.program._id)}
                aria-pressed={selected}
                className={
                  "cq-card cq-card-hover overflow-hidden p-5 text-left " +
                  (selected
                    ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface-shell)]"
                    : "")
                }
              >
                <div
                  className={
                    "-mx-5 -mt-5 mb-4 h-1.5 " +
                    (card.program.visualTheme?.accent === "lavender"
                      ? "bg-[var(--lavender)]"
                      : "bg-[var(--sky)]")
                  }
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-muted)]">
                      <Building2
                        className="h-[16px] w-[16px] shrink-0 text-[var(--text-strong)]"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{card.organization.name}</span>
                    </div>
                    <h3 className="nm-card-title mt-2 text-[14px]">{card.program.name}</h3>
                  </div>
                  <span className="cq-pixel-label">{card.program.capsuleSymbol}</span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                  {/* Capsule balance: a numeric value, so it sits on a data surface. */}
                  <div className="glass-data rounded-[14px] px-3 py-2">
                    <div className="nm-metric-xl text-[26px] tabular-nums">{card.balance}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {card.program.capsuleSymbol} capsules
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                    <Gift className="h-[16px] w-[16px]" strokeWidth={1.75} />
                    {card.catalog?.length || 0} benefits
                  </div>
                </div>

                <div
                  className={
                    "mt-4 flex items-center gap-2 text-[11px] font-semibold " +
                    (selected
                      ? "text-[var(--text-strong)]"
                      : "text-[var(--text-muted)]")
                  }
                >
                  <WalletCards className="h-[16px] w-[16px]" strokeWidth={1.75} />
                  {selected ? "Current hospital context" : "Open this hospital journey"}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}
