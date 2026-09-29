import PixelCharacter from "@/components/carequest/PixelCharacter";
import { Activity, Coins, HeartPulse, ShieldCheck } from "lucide-react";

export default function PixelCareScene({ compact = false }) {
  return (
    <div className="cq-grid-paper relative overflow-hidden rounded-[24px] bg-[var(--surface-subtle)] p-5 md:p-6">
      <div className="absolute bottom-0 left-0 right-0 h-[34%] bg-[var(--surface-muted)]" />
      <div className="relative z-10 flex min-h-[240px] items-end justify-between gap-3">
        <div className="mb-8 hidden rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] sm:block">
          <HeartPulse className="h-[18px] w-[18px] text-[var(--text-strong)]" strokeWidth={1.75} />
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-strong)]">
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
        <div className="mb-8 hidden rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] sm:block">
          <ShieldCheck className="h-[18px] w-[18px] text-[var(--text-strong)]" strokeWidth={1.75} />
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-strong)]">
            Handoff
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">Human care team</div>
        </div>
      </div>
      <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
        {[
          [Activity, "Mission"],
          [Coins, "Capsules"],
          [ShieldCheck, "Audit"],
        ].map(([Icon, label]) => (
          <div
            key={label}
            className="rounded-[14px] bg-[var(--surface)] p-2.5 text-center shadow-[var(--shadow-card)]"
          >
            <Icon className="mx-auto h-[18px] w-[18px] text-[var(--text-strong)]" strokeWidth={1.75} />
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
