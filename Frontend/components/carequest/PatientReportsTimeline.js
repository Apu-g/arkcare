"use client";

import { Button } from "@/components/ui/button";
import ReportQuizCard from "@/components/carequest/ReportQuizCard";
import Link from "next/link";
import { FileUp, Link2, Pill, ShieldCheck, Stethoscope } from "lucide-react";

/**
 * "Doctors visited" + report-derived activities for the patient's CareQuest
 * page. Each row shows the consulting doctor, their remarks, the prescription
 * they recorded, the on-chain proof, and the knowledge check.
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
    <section className="nm-stack-sm" id="carequest-reports">
      <div>
        <div className="cq-kicker">DOCTORS VISITED</div>
        <h2 className="cq-section-title mt-1">Your consultation reports</h2>
        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
          Every report is recorded by your doctor, anchored on the local chain, and
          turned into your daily activities.
        </p>
        <Link
          href="/reports"
          className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-strong)] hover:opacity-70"
        >
          <FileUp className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Scan or upload a prescription
        </Link>
      </div>

      <div className="cq-card p-5">
        {reports.map((report) => {
          const expanded = openId === report._id;
          return (
            <article key={report._id} className="py-1 first:pt-0 last:pb-0">
              <div className="nm-row grid-cols-[minmax(0,1fr)_auto] items-start py-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="nm-stat-icon h-9 w-9 shrink-0 rounded-[12px]">
                    <Stethoscope className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-semibold text-[var(--text-strong)]">
                        {report.doctorName || "Doctor"}
                      </span>
                      {report.doctorSpecialization ? (
                        <span className="cq-pixel-label">{report.doctorSpecialization}</span>
                      ) : null}
                      {report.appointmentDate ? (
                        <span className="text-[11px] text-[var(--text-subtle)]">
                          {new Date(report.appointmentDate).toLocaleDateString()}
                        </span>
                      ) : null}
                      {report.blockchain?.status === "anchored" ? (
                        <span className="cq-pixel-label cq-real-label">
                          <Link2 className="h-3 w-3" strokeWidth={2} />
                          on-chain
                        </span>
                      ) : null}
                    </div>
                    <h3 className="nm-card-title mt-1 text-[13px]">
                      {report.remarkSummary || "Consultation summary"}
                    </h3>
                    {report.followUpWindow ? (
                      <p className="mt-1 text-[11px] font-semibold text-[var(--text-strong)]">
                        Follow-up advised: {report.followUpWindow}
                      </p>
                    ) : null}
                    <p className="mt-1 break-all font-mono text-[10px] text-[var(--text-subtle)]">
                      proof {report.contentHash?.slice(0, 18) || "—"}…
                      {report.blockchain?.txHash
                        ? ` · tx ${report.blockchain.txHash.slice(0, 12)}…`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant={expanded ? "secondary" : "outline"}
                    size="sm"
                    aria-expanded={expanded}
                    onClick={() => onOpenReport?.(expanded ? null : report._id)}
                  >
                    {expanded ? "Hide" : "View report"}
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="nm-stack-sm mb-4 ml-0 rounded-[16px] bg-[var(--surface-subtle)] p-4 sm:ml-12">
                  {report.medications?.length ? (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        <Pill className="h-[15px] w-[15px]" strokeWidth={1.75} />
                        Prescription
                      </div>
                      <ul className="mt-1.5 space-y-1 text-[12.5px] leading-6 text-[var(--text)]">
                        {report.medications.map((med, index) => (
                          <li key={index}>
                            • {med.name}
                            {med.dose ? ` · ${med.dose}` : ""}
                            {med.frequency ? ` · ${med.frequency}` : ""}
                            {med.duration ? ` · ${med.duration}` : ""}
                          </li>
                        ))}
                      </ul>
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
  );
}
