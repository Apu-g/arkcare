import { formatDateTime } from "@/lib/formatDate";
import Link from "next/link";
import { ArrowUpRight, Building2, ShieldCheck } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import SimulationBadge from "@/components/carequest/SimulationBadge";

/**
 * An inline figure with an optional qualifier. Preferred over `.nm-stat`
 * tiles: a run of related numbers belongs in one strip, not in a grid of
 * identical boxes.
 */
function Figure({ label, value, note }) {
  return (
    <div className="stat-inline">
      <dt>{label}</dt>
      <dd>
        {value}
        {note ? <small> {note}</small> : null}
      </dd>
    </div>
  );
}

function SectionHead({ kicker, title, text, aside = null }) {
  return (
    <>
      <div className="section-rule">
        <span>{kicker}</span>
      </div>
      <div className="section-head">
        <MaskedText as="h2" className="section-title">
          {title}
        </MaskedText>
        {aside}
      </div>
      {text ? <p className="section-lede">{text}</p> : null}
    </>
  );
}

export default function ServiceImprovementDashboard({ data }) {
  const m = data.metrics;
  const r = data.rewards;
  const f = data.finance;
  const s = data.simulation;

  return (
    <div className="nm-stack">
      {/* ==================================================== FRAMING.
          An editorial masthead, not a card: rule, heading, lede, and the one
          proof-coloured action this page offers. */}
      <Reveal as="section">
        <div className="section-rule">
          <span>Aggregate hospital view</span>
        </div>
        <div className="section-head">
          <MaskedText as="h1" className="section-title">
            CareQuest service improvement
          </MaskedText>
          <SimulationBadge real>Tenant scoped</SimulationBadge>
        </div>
        <p className="section-lede">
          {data.organization?.name || "Hospital"} sees operational continuity, reward
          program obligations and recorded payment evidence as separate systems. Patient
          identity is not required on this aggregate screen.
        </p>
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
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

      <Reveal as="section">
        <SectionHead
          kicker="Engagement"
          title="Care continuity"
          text="Participation and follow-up signals from this hospital only. These measures are not clinical quality scores."
          aside={
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
        <dl className="stat-strip mt-4">
          <Figure label="Enrolled patients" value={m.enrolledPatients} />
          <Figure label="Mission response rate" value={m.responseRate + "%"} />
          <Figure label="Missions" value={m.totalOccurrences} />
          <Figure label="Follow-ups completed" value={m.completedFollowups} />
        </dl>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          {data.definitions.responseRate}
        </p>
      </Reveal>

      <Reveal as="section">
        <SectionHead
          kicker="Care operations"
          title="Exception workflow"
          text="Handoffs surface patients who need human follow-up; staff workload metrics reveal whether the system is reducing or adding work."
        />
        <dl className="stat-strip mt-4">
          <Figure label="Open handoffs" value={m.openCases} />
          <Figure label="Overdue" value={m.overdue} />
          <Figure label="Resolved" value={m.resolvedCases} />
          <Figure label="Median resolution" value={m.medianResolutionMinutes} note="min" />
        </dl>
        <dl className="stat-strip mt-5">
          <Figure label="Unowned cases" value={m.unowned} />
          <Figure label="Failed deliveries" value={m.failedDeliveries} />
          <Figure label="Unsuccessful contacts" value={m.unsuccessfulContacts} />
          <Figure label="Opt-outs" value={m.optOuts} />
        </dl>
        <dl className="stat-strip mt-5">
          <Figure
            label="Duplicate-entry minutes"
            value={m.duplicateEntryMinutes}
            note={`· ${m.staffFeedbackCount} staff feedback record(s)`}
          />
          <Figure
            label="Average alert burden"
            value={m.averageAlertBurden}
            note="/ 5 · lower is preferable"
          />
        </dl>
      </Reveal>

      <Reveal as="section">
        <SectionHead
          kicker="Reward program"
          title="Capsule obligations and funded benefits"
          text="Capsule issuance is not revenue. Benefit redemption debits the hospital program's funded reward budget."
          aside={<SimulationBadge real>Real program ledger</SimulationBadge>}
        />
        <dl className="stat-strip mt-4">
          <Figure label="Capsules issued" value={r.capsulesIssued} />
          <Figure label="Capsules redeemed" value={r.capsulesRedeemed} />
          <Figure label="Benefit redemptions" value={r.redemptionCount} />
          <Figure
            label="Budget remaining"
            value={"₹" + Number(r.remainingBudgetInr || 0).toLocaleString("en-IN")}
          />
        </dl>

        {/* Programs are records with money attached: a ledger with one row per
            program, each row carrying its own progress bar. */}
        <div className="ledger mt-6">
          <div className="ledger-head">
            <span>Program</span>
            <span>Issued · redemptions · remaining</span>
          </div>
          {(data.programs || []).map((program) => {
            const spentPct = program.fundedBudgetInr
              ? Math.min(
                  100,
                  Math.round((program.spentBudgetInr / program.fundedBudgetInr) * 100)
                )
              : 0;
            return (
              <div key={program._id} className="ledger-row items-start!">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2
                      className="h-4 w-4 text-[var(--text-muted)]"
                      strokeWidth={1.75}
                    />
                    <span className="ledger-title">{program.name}</span>
                    <span className="cq-pixel-label">{program.capsuleSymbol} program</span>
                  </div>
                  <p className="ledger-meta mt-1">
                    ₹{program.spentBudgetInr} spent of ₹{program.fundedBudgetInr} funded ·{" "}
                    {spentPct}% used
                  </p>
                  <div className="cq-progress mt-2 max-w-sm">
                    <span style={{ width: spentPct + "%" }} />
                  </div>
                </div>
                {/* Budget figures are money: they read as key/values on the
                    near-opaque data surface, never behind the primary blur. */}
                <dl className="well dl-grid text-right">
                  <dt>Issued</dt>
                  <dd>{program.capsulesIssued}</dd>
                  <dt>Redemptions</dt>
                  <dd>{program.redemptionCount}</dd>
                  <dt>Remaining</dt>
                  <dd>₹{program.remainingBudgetInr}</dd>
                </dl>
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal as="section">
        <SectionHead
          kicker="Recorded finance"
          title="Payment evidence"
          text={data.definitions.recordedFinance}
          aside={<SimulationBadge real>Recorded application data</SimulationBadge>}
        />
        <dl className="stat-strip mt-4">
          <Figure
            label="Paid consultations recorded"
            value={f.recordedPaidConsultations}
          />
          <Figure
            label="Recorded paid amount"
            value={"₹" + Number(f.recordedPaidInr || 0).toLocaleString("en-IN")}
          />
          <Figure label="Refunds imported" value={f.refundsRecordedInCareQuest} />
          <Figure
            label="Demo bookings excluded"
            value={f.demoAppointmentsExcluded}
          />
        </dl>
        {/* Money and its exclusions are key/values, so they read as a
            definition list beside the headline figures. */}
        <dl className="dl-grid mt-4">
          <dt>Recorded refunds</dt>
          <dd>₹{Number(f.recordedRefundInr || 0).toLocaleString("en-IN")}</dd>
          <dt>Included in totals</dt>
          <dd>PaymentEvidence records only</dd>
        </dl>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">{f.note}</p>
      </Reveal>

      <Reveal as="section">
        <SectionHead
          kicker="Future compute model"
          title="Simulated pilot economics"
          text={data.definitions.simulatedCompute}
          aside={<SimulationBadge>Simulated compute / market</SimulationBadge>}
        />
        <dl className="stat-strip mt-4">
          <Figure label="Virtual sessions" value={s.sessionCount} />
          <Figure label="Virtual gross" value={"₹" + s.simulatedGrossValueInr.toFixed(2)} />
          <Figure
            label="Patient allocation"
            value={"₹" + s.simulatedPatientShareInr.toFixed(2)}
          />
          <Figure
            label="Hospital allocation"
            value={"₹" + s.simulatedHospitalShareInr.toFixed(2)}
          />
          <Figure
            label="Platform allocation"
            value={"₹" + s.simulatedPlatformShareInr.toFixed(2)}
          />
        </dl>
        <p className="mt-4 border-l-2 border-[var(--border)] pl-3 text-[12px] leading-5 text-[var(--text-muted)]">
          This panel is deliberately excluded from recorded hospital finance. It is a
          concept simulation of phone compute, public token value and hypothetical payout
          splits—not actual mining income or hospital revenue.
        </p>
      </Reveal>
    </div>
  );
}
