import PixelCharacter from "@/components/carequest/PixelCharacter";
import { Activity, Coins, HeartPulse, ShieldCheck } from "lucide-react";

/**
 * Marketing/demonstration scene — not a data surface, so it stays the quietest
 * level of the hierarchy: a recessed grid well with solid, readable chips. No
 * glass, because nothing here carries a value the patient must act on.
 */
export default function PixelCareScene({ compact = false }) {
  return (
    <div className="cq-grid-paper relative overflow-hidden rounded-[24px] border border-[var(--glass-hairline)] bg-[var(--surface-subtle)] p-5 md:p-6">
      <div className="absolute bottom-0 left-0 right-0 h-[34%] bg-[var(--surface-muted)]" />
      <div className="relative z-10 flex min-h-[240px] items-end justify-between gap-3">
        <div className="mb-8 hidden sm:block">
          <HeartPulse className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} />
          <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-strong)]">
            Plan
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">Doctor approved</div>
        </div>
        <PixelCharacter variant="doctor" mood="wave" size={compact ? 70 : 88} />
        <div className="mb-12 flex flex-col items-center">
          <div className="cq-pixel-label cq-real-label mb-2">+2 CAP</div>
          <PixelCharacter variant="guide" mood="celebrate" size={compact ? 78 : 100} />
        </div>
        <PixelCharacter variant="nurse" mood="idle" size={compact ? 70 : 88} />
        <div className="mb-8 hidden sm:block">
          <ShieldCheck className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} />
          <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-strong)]">
            Handoff
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">Human care team</div>
        </div>
      </div>
      <div className="relative z-10 mt-3 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
        {[
          [Activity, "Mission"],
          [Coins, "Capsules"],
          [ShieldCheck, "Audit"],
        ].map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.75} />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
