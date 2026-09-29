import { CalendarDays, ShieldCheck, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PixelCharacter from "@/components/carequest/PixelCharacter";

export default function PatientCarePlans({ plans }) {
  return (
    <div className="nm-stack">
      <Reveal>
        <section className="plain-panel">
          <div className="section-rule">Care plan</div>
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="cq-pixel-label cq-real-label">DOCTOR APPROVED</span>
                <span className="cq-pixel-label">READ ONLY</span>
              </div>
              <MaskedText
                as="h1"
                className="mt-3 text-[20px] font-bold tracking-[-0.01em] text-[var(--text-strong)]"
              >
                My CareQuest Plan
              </MaskedText>
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
      </Reveal>

      {plans.length === 0 ? (
        <Reveal>
          <section className="plain-panel flex items-center gap-4 py-6">
            <PixelCharacter variant="guide" mood="idle" size={62} />
            <div>
              <h2 className="nm-card-title text-[14px]">No approved care plan yet</h2>
              <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
                Drafts and rejected versions are never shown in the patient view.
              </p>
            </div>
          </section>
        </Reveal>
      ) : (
        plans.map((plan) => {
          const version = plan.approvedVersion;
          return (
            <Reveal key={plan._id}>
              <article>
                <div className="section-rule">
                  {plan.organization?.name || "Care plan"}
                </div>

                <div className="section-head">
                  <h2 className="section-title">{version.title}</h2>
                  <p className="section-lede">
                    {version.summary || "Clinician-approved continuity plan"}
                  </p>
                </div>

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

                <div className="mt-4 flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                    <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-[var(--text-strong)]">
                      {plan.ownerDoctor?.name || "Care team"}
                    </div>
                    {plan.ownerDoctor?.specialization ? (
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Owning clinician · {plan.ownerDoctor.specialization}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Validity window and timezone are record metadata: a data surface,
                    set inline as figures rather than three separate tiles. */}
                <dl className="stat-strip well mt-5">
                  <div className="stat-inline">
                    <dt>Valid from</dt>
                    <dd>
                      {new Date(version.validFrom).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="stat-inline">
                    <dt>Valid to</dt>
                    <dd className="text-[14px]">
                      {version.validTo
                        ? new Date(version.validTo).toLocaleDateString()
                        : "Until clinician revision"}
                    </dd>
                  </div>
                  <div className="stat-inline">
                    <dt>Time zone</dt>
                    <dd className="text-[14px]">{version.timezone}</dd>
                  </div>
                </dl>

                {version.safetyText ? (
                  <div className="mt-4 rounded-[16px] bg-[var(--warning-soft)] p-4">
                    <div className="cq-kicker text-[var(--warning)]">SAFETY</div>
                    <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--text)]">
                      {version.safetyText}
                    </p>
                  </div>
                ) : null}

                <div className="mt-6">
                  <div className="section-head">
                    <h3 className="section-title text-[15px]!">Plan activities</h3>
                    <p className="section-lede">
                      {(version.activities || []).length} activities, in the order your
                      clinician set them.
                    </p>
                  </div>
                  {/* Activities are an ordered list, so they read as ledger rows. */}
                  <div className="ledger">
                    <div className="ledger-head">
                      <span>#</span>
                      <span>Activity</span>
                    </div>
                    {(version.activities || []).map((activity, index) => (
                      <div key={activity.activityKey} className="ledger-row items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="timeline-time">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Badge variant="outline">{activity.type}</Badge>
                            <span className="ledger-title">{activity.title}</span>
                          </div>
                          <p className="ledger-meta mt-1 max-w-2xl">
                            {activity.instructions}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
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
                            <p className="mt-2 rounded-[12px] bg-[var(--primary-soft)] px-3 py-2 text-[11.5px] leading-5 text-[var(--text-strong)]">
                              {activity.helpText}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {version.helpText ? (
                  <div className="well mt-4">
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
              </article>
            </Reveal>
          );
        })
      )}
    </div>
  );
}
