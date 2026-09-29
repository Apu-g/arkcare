"use client";

import { formatDate } from "@/lib/formatDate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import ReportQuizCard from "@/components/carequest/ReportQuizCard";
import Link from "next/link";
import { FileUp, Link2, Pill, ShieldCheck } from "lucide-react";

/**
 * "Doctors visited" + report-derived activities for the patient's CareQuest
 * page. Each row shows the consulting doctor, their remarks, the prescription
 * they recorded, the on-chain proof, and the knowledge check.
 *
 * This is a provenance view, so it is built from divider rows rather than boxed
 * cards: a record list reads as a ledger, not a feed. Anchored / on-chain state
 * uses the copper proof tone, the same one the audit screens use, so "committed"
 * looks identical everywhere in the product.
 *
 * Open state is controlled by the parent so a mission can deep-link here.
 */
export default function PatientReportsTimeline({
  reports,
  openId,
  onOpenReport,
  onChanged,
}) {
  if (!reports || !reports.length) return null;

  return (
    <Reveal>
      <section className="nm-stack-sm" id="carequest-reports">
        <div>
          <div className="section-rule">Doctors visited</div>
          <div className="section-head">
            <MaskedText as="h2" className="section-title">
              Your consultation reports
            </MaskedText>
            <p className="section-lede">
              Every report is recorded by your doctor, anchored on the local chain, and
              turned into your daily activities.
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[var(--text-strong)] hover:opacity-70"
          >
            <FileUp className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Scan or upload a prescription
          </Link>
        </div>

        {/* A record list: hairline rows, not a card per report. */}
        <div className="ledger">
          <div className="ledger-head">
            <span>Consultation</span>
            <span>
              {reports.length} {reports.length === 1 ? "report" : "reports"}
            </span>
          </div>
          {reports.map((report) => {
            const expanded = openId === report._id;
            return (
              <article key={report._id} className="ledger-row items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ledger-title">{report.doctorName || "Doctor"}</span>
                    {report.doctorSpecialization ? (
                      <span className="cq-pixel-label">{report.doctorSpecialization}</span>
                    ) : null}
                    {report.blockchain?.status === "anchored" ? (
                      <Badge variant="copper">
                        <Link2 className="h-3 w-3" strokeWidth={2} />
                        on-chain
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="ledger-meta mt-0.5 font-semibold text-[var(--text-strong)]">
                    {report.remarkSummary || "Consultation summary"}
                  </h3>
                  {report.appointmentDate ? (
                    <p className="ledger-meta mt-0.5">
                      Consultation date{" "}
                      {formatDate(report.appointmentDate)}
                    </p>
                  ) : null}
                  {report.followUpWindow ? (
                    <p className="mt-1 text-[11px] font-semibold text-[var(--text-strong)]">
                      Follow-up advised: {report.followUpWindow}
                    </p>
                  ) : null}
                  <p className="mt-1 break-all font-mono text-[10px] text-[var(--text-muted)]">
                    proof {report.contentHash?.slice(0, 18) || "—"}…
                    {report.blockchain?.txHash
                      ? ` · tx ${report.blockchain.txHash.slice(0, 12)}…`
                      : ""}
                  </p>
                </div>

                <div className="ledger-actions">
                  <Button
                    variant={expanded ? "secondary" : "outline"}
                    size="sm"
                    aria-expanded={expanded}
                    onClick={() => onOpenReport?.(expanded ? null : report._id)}
                  >
                    {expanded ? "Hide" : "View report"}
                  </Button>
                </div>

                {expanded ? (
                  // Doses and record metadata: near-opaque data surface, never blurred.
                  <div className="col-[1/-1] well nm-stack-sm mt-1">
                    {report.medications?.length ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          <Pill className="h-[15px] w-[15px]" strokeWidth={1.75} />
                          Prescription
                        </div>
                        {/* Clinical key/value pairs: drug, dose, frequency, duration. */}
                        <div className="mt-2 grid gap-4">
                          {report.medications.map((med, index) => (
                            <div key={index}>
                              <div className="text-[12.5px] font-semibold text-[var(--text-strong)]">
                                {med.name}
                              </div>
                              <dl className="dl-grid mt-1.5">
                                {med.dose ? (
                                  <>
                                    <dt>Dose</dt>
                                    <dd>{med.dose}</dd>
                                  </>
                                ) : null}
                                {med.frequency ? (
                                  <>
                                    <dt>Frequency</dt>
                                    <dd>{med.frequency}</dd>
                                  </>
                                ) : null}
                                {med.duration ? (
                                  <>
                                    <dt>Duration</dt>
                                    <dd>{med.duration}</dd>
                                  </>
                                ) : null}
                              </dl>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {report.patientActivity ? (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          Activity your doctor advised
                        </div>
                        <p className="mt-1 text-[12.5px] leading-6 text-[var(--text)]">
                          {report.patientActivity}
                        </p>
                      </div>
                    ) : null}

                    {report.conditions?.length ? (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          Conditions on your report
                        </div>
                        <div className="mt-1 text-[12.5px] leading-6 text-[var(--text)]">
                          {report.conditions.map((c) => c.label).join(", ")}
                        </div>
                      </div>
                    ) : null}

                    {report.images?.length ? (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          Attached documents
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {report.images.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="cq-pixel-label"
                            >
                              View
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                      <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      Report proof is a non-clinical integrity record. Care decisions always
                      come from your doctor.
                    </div>

                    <ReportQuizCard report={report} onCompleted={onChanged} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}
