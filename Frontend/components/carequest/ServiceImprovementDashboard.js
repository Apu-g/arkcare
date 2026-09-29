import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  BellRing,
  Building2,
  Clock3,
  Coins,
  Gift,
  HeartHandshake,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import SimulationBadge from "@/components/carequest/SimulationBadge";

function Metric({ label, value, note, icon: Icon = Activity, tone }) {
  return (
    <div className="nm-stat">
      {Icon ? (
        <div className="nm-stat-icon" data-tone={tone}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      ) : null}
      <div className="nm-stat-value mt-3">{value}</div>
      <div className="nm-stat-label">{label}</div>
      {note ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-subtle)]">{note}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ kicker, title, text, badge = null }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div className="cq-kicker">{kicker}</div>
        <MaskedText as="h2" className="cq-section-title mt-1">
          {title}
        </MaskedText>
        {text ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
            {text}
          </p>
        ) : null}
      </div>
      {badge}
    </div>
  );
}

export default function ServiceImprovementDashboard({ data }) {
  const m = data.metrics;
  const r = data.rewards;
  const f = data.finance;
  const s = data.simulation;

  return (
    <div className="nm-stack">
      <Reveal as="section" className="cq-card p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="cq-pixel-label">Aggregate hospital view</span>
          <SimulationBadge real>Tenant scoped</SimulationBadge>
        </div>
        <MaskedText
          as="h1"
          className="mt-4 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
        >
          CareQuest service improvement
        </MaskedText>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
          {data.organization?.name || "Hospital"} sees operational continuity, reward
          program obligations and recorded payment evidence as separate systems. Patient
          identity is not required on this aggregate screen.
        </p>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
          {/* Proof lives on its own surface, so the link carries the copper tone
              the whole product reserves for audit and commitment. */}
          <Link
            href="/admin/carequest/audit"
            className="nm-btn-copper inline-flex min-h-10 items-center gap-2 rounded-[13px] px-4 text-[13px] font-semibold"
          >
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Audit &amp; blockchain proof
            <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
        </div>
      </Reveal>

      <Reveal as="section" className="nm-stack-sm">
        <SectionTitle
          kicker="Engagement"
          title="Care continuity"
          text="Participation and follow-up signals from this hospital only. These measures are not clinical quality scores."
          badge={
            <div className="shrink-0">
              <PixelCharacter
                variant="guardian"
                mood={m.overdue > 0 ? "alert" : "idle"}
                size={68}
                speech={
                  m.overdue > 0
                    ? m.overdue + " overdue handoff(s) need attention."
                    : "Program systems look calm."
                }
              />
            </div>
          }
        />
        <div className="nm-grid-3">
          <Metric icon={Users} label="Enrolled patients" value={m.enrolledPatients} />
          <Metric
            icon={Activity}
            label="Mission response rate"
            value={m.responseRate + "%"}
            note={data.definitions.responseRate}
          />
          <Metric icon={WalletCards} label="Missions" value={m.totalOccurrences} />
          <Metric
            icon={HeartHandshake}
            label="Follow-ups completed"
            value={m.completedFollowups}
          />
        </div>
      </Reveal>

      <Reveal as="section" className="nm-stack-sm">
        <SectionTitle
          kicker="Care operations"
          title="Exception workflow"
          text="Handoffs surface patients who need human follow-up; staff workload metrics reveal whether the system is reducing or adding work."
        />
        <div className="nm-grid-3">
          <Metric icon={BellRing} label="Open handoffs" value={m.openCases} />
          <Metric icon={Clock3} label="Overdue" value={m.overdue} />
          <Metric icon={HeartHandshake} label="Resolved" value={m.resolvedCases} />
          <Metric
            icon={Clock3}
            label="Median resolution"
            value={m.medianResolutionMinutes + " min"}
          />
          <Metric label="Unowned cases" value={m.unowned} />
          <Metric label="Failed deliveries" value={m.failedDeliveries} />
          <Metric label="Unsuccessful contacts" value={m.unsuccessfulContacts} />
          <Metric label="Opt-outs" value={m.optOuts} />
          <Metric
            label="Duplicate-entry minutes"
            value={m.duplicateEntryMinutes}
            note={m.staffFeedbackCount + " staff feedback record(s)"}
          />
          <Metric
            label="Average alert burden"
            value={m.averageAlertBurden + " / 5"}
            note="Staff reported; lower is preferable"
          />
        </div>
      </Reveal>

      <Reveal as="section" className="nm-stack-sm">
        <SectionTitle
          kicker="Reward program"
          title="Capsule obligations and funded benefits"
          text="Capsule issuance is not revenue. Benefit redemption debits the hospital program's funded reward budget."
          badge={<SimulationBadge real>Real program ledger</SimulationBadge>}
        />
        <div className="nm-grid-3">
          <Metric icon={Coins} label="Capsules issued" value={r.capsulesIssued} />
          <Metric icon={Gift} label="Capsules redeemed" value={r.capsulesRedeemed} />
          <Metric
            icon={WalletCards}
            label="Benefit redemptions"
            value={r.redemptionCount}
          />
          <Metric
            icon={Banknote}
            label="Budget remaining"
            value={"₹" + r.remainingBudgetInr.toLocaleString()}
          />
        </div>

        <div className="nm-grid-2">
          {(data.programs || []).map((program) => {
            const spentPct = program.fundedBudgetInr
              ? Math.min(
                  100,
                  Math.round((program.spentBudgetInr / program.fundedBudgetInr) * 100)
                )
              : 0;
            return (
              <article key={program._id} className="cq-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-muted)]">
                      <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      {program.name}
                    </div>
                    <h3 className="nm-card-title mt-1.5 text-[14px]">
                      {program.capsuleSymbol} program
                    </h3>
                  </div>
                  <span className="cq-pixel-label">{program.capsuleSymbol}</span>
                </div>
                {/* Budget figures are money: near-opaque data surface, never
                    behind the primary blur. */}
                <div className="glass-data mt-4 rounded-[16px] p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="nm-metric-xl">{program.capsulesIssued}</div>
                      <div className="nm-stat-label">issued</div>
                    </div>
                    <div>
                      <div className="nm-metric-xl">{program.redemptionCount}</div>
                      <div className="nm-stat-label">redemptions</div>
                    </div>
                    <div>
                      <div className="break-words text-[20px] font-bold leading-tight text-[var(--text-strong)]">
                        ₹{program.remainingBudgetInr}
                      </div>
                      <div className="nm-stat-label">remaining</div>
                    </div>
                  </div>
                  <div className="cq-progress mt-4">
                    <span style={{ width: spentPct + "%" }} />
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                    ₹{program.spentBudgetInr} spent of ₹{program.fundedBudgetInr} funded ·{" "}
                    {spentPct}% used
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>

      <Reveal as="section" className="nm-stack-sm">
        <SectionTitle
          kicker="Recorded finance"
          title="Payment evidence"
          text={data.definitions.recordedFinance}
          badge={<SimulationBadge real>Recorded application data</SimulationBadge>}
        />
        <div className="nm-grid-3">
          <Metric
            icon={Banknote}
            label="Paid consultations recorded"
            value={f.recordedPaidConsultations}
          />
          <Metric
            icon={Banknote}
            label="Recorded paid amount"
            value={"₹" + f.recordedPaidInr.toLocaleString()}
          />
          <Metric
            icon={ShieldCheck}
            label="Refunds imported"
            value={f.refundsRecordedInCareQuest}
            note={f.note}
          />
        </div>
      </Reveal>

      <Reveal as="section" className="cq-card p-5 md:p-6">
        <SectionTitle
          kicker="Future compute model"
          title="Simulated pilot economics"
          text={data.definitions.simulatedCompute}
          badge={<SimulationBadge>Simulated compute / market</SimulationBadge>}
        />
        <div className="mt-4 nm-grid-3">
          {[
            [s.sessionCount, "virtual sessions"],
            ["₹" + s.simulatedGrossValueInr.toFixed(2), "virtual gross"],
            ["₹" + s.simulatedPatientShareInr.toFixed(2), "patient allocation"],
            ["₹" + s.simulatedHospitalShareInr.toFixed(2), "hospital allocation"],
            ["₹" + s.simulatedPlatformShareInr.toFixed(2), "platform allocation"],
          ].map(([value, label]) => (
            <div key={label} className="glass-data rounded-[18px] p-[15px_14px]">
              <div className="break-words text-[20px] font-bold leading-tight text-[var(--text-strong)]">
                {value}
              </div>
              <div className="nm-stat-label mt-1">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] leading-5 text-[var(--text-muted)]">
          This panel is deliberately excluded from recorded hospital finance. It is a
          concept simulation of phone compute, public token value and hypothetical payout
          splits—not actual mining income or hospital revenue.
        </p>
      </Reveal>
    </div>
  );
}
