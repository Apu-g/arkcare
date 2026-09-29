import { CalendarDays, ShieldCheck, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PixelCharacter from "@/components/carequest/PixelCharacter";

export default function PatientCarePlans({ plans }) {
  return (
    <div className="nm-stack">
      <section className="cq-card cq-reveal p-5 md:p-6">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="cq-pixel-label cq-real-label">DOCTOR APPROVED</span>
              <span className="cq-pixel-label">READ ONLY</span>
            </div>
            <h1 className="mt-3 text-[20px] font-bold tracking-[-0.01em] text-[var(--text-strong)]">
              My CareQuest Plan
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
              Only the current clinician-approved version appears here. Drafts, rejected
              revisions and AI suggestions remain private until a doctor explicitly
              approves them.
            </p>
          </div>
          <PixelCharacter
            variant="guide"
            mood="idle"
            size={82}
            speech="This is the plan your clinician approved."
          />
        </div>
      </section>

      {plans.length === 0 ? (
        <section className="cq-card flex items-center gap-4 p-6">
          <PixelCharacter variant="guide" mood="idle" size={62} />
          <div>
            <h2 className="nm-card-title text-[14px]">No approved care plan yet</h2>
            <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
              Drafts and rejected versions are never shown in the patient view.
            </p>
          </div>
        </section>
      ) : (
        plans.map((plan) => {
          const version = plan.approvedVersion;
          return (
            <article key={plan._id} className="cq-card overflow-hidden">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {plan.organization?.name ? (
                        <span className="cq-pixel-label">
                          {plan.organization.name}
                          {plan.program?.capsuleSymbol
                            ? " · " + plan.program.capsuleSymbol
                            : ""}
                        </span>
                      ) : null}
                      <span className="cq-pixel-label cq-real-label">
                        <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                        APPROVED V{version.versionNumber}
                      </span>
                      <Badge variant="outline">{plan.status}</Badge>
                    </div>
                    <h2 className="cq-section-title mt-3 text-[17px]">{version.title}</h2>
                    <p className="mt-1.5 max-w-2xl text-[12.5px] leading-6 text-[var(--text-muted)]">
                      {version.summary || "Clinician-approved continuity plan"}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[16px] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--text-strong)]">
                      <Stethoscope className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      {plan.ownerDoctor?.name || "Care team"}
                    </div>
                    {plan.ownerDoctor?.specialization ? (
                      <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {plan.ownerDoctor.specialization}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="nm-grid-3 rounded-[18px] bg-[var(--surface-subtle)] p-4">
                  <div>
                    <div className="cq-kicker">VALID FROM</div>
                    <div className="mt-1 text-[13px] font-semibold text-[var(--text-strong)]">
                      {new Date(version.validFrom).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="cq-kicker">VALID TO</div>
                    <div className="mt-1 text-[13px] font-semibold text-[var(--text-strong)]">
                      {version.validTo
                        ? new Date(version.validTo).toLocaleDateString()
                        : "Until clinician revision"}
                    </div>
                  </div>
                  <div>
                    <div className="cq-kicker">TIME ZONE</div>
                    <div className="mt-1 text-[13px] font-semibold text-[var(--text-strong)]">
                      {version.timezone}
                    </div>
                  </div>
                </div>

                {version.safetyText ? (
                  <div className="mt-4 rounded-[16px] bg-[var(--warning-soft)] p-4">
                    <div className="cq-kicker text-[var(--warning)]">SAFETY</div>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--text)]">
                      {version.safetyText}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5">
                  <div className="cq-kicker">PLAN ACTIVITIES</div>
                  <div className="mt-3 nm-stack-sm">
                    {(version.activities || []).map((activity, index) => (
                      <section
                        key={activity.activityKey}
                        className="rounded-[18px] bg-[var(--surface-subtle)] p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[var(--primary)] text-[11px] font-bold text-[var(--dark-text)]">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{activity.type}</Badge>
                              <h3 className="nm-card-title text-[13px]">{activity.title}</h3>
                            </div>
                            <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--text-muted)]">
                              {activity.instructions}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-[14px] w-[14px]" strokeWidth={1.75} />
                                {activity.recurrence?.kind || "once"}
                              </span>
                              {activity.recurrence?.timeLocal ? (
                                <span>
                                  {activity.recurrence.timeLocal} {version.timezone}
                                </span>
                              ) : null}
                            </div>
                            {activity.helpText ? (
                              <p className="mt-2.5 rounded-[12px] bg-[var(--primary-soft)] px-3 py-2 text-[11.5px] leading-5 text-[var(--text-strong)]">
                                {activity.helpText}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                </div>

                {version.helpText ? (
                  <div className="mt-4 rounded-[16px] bg-[var(--surface-subtle)] p-4">
                    <div className="cq-kicker">NEED HELP?</div>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--text)]">
                      {version.helpText}
                    </p>
                  </div>
                ) : null}

                <p className="mt-4 flex items-start gap-1.5 text-[10.5px] leading-4 text-[var(--text-muted)]">
                  <ShieldCheck className="mt-0.5 h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
                  AI never prescribes, diagnoses or approves this plan. Any AI draft must be
                  explicitly approved by a clinician before it reaches you.
                </p>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
