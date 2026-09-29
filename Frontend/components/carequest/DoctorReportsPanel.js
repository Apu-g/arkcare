"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDoctorReportWorkspace } from "@/actions/reportActions";
import { AlertCircle, Building2, Clock3, Link2, Loader2, Pill, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";

/**
 * The doctor's "patients I've seen" workspace: every patient they interacted
 * with, the reports/remarks they filed, and a per-patient activity dashboard
 * (missions completed/due + Capsules earned). Shows the on-chain status of each
 * report so the doctor can see what is provable.
 */
export default function DoctorReportsPanel() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      setData(await getDoctorReportWorkspace());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <div className="cq-card flex items-center gap-2 p-6 text-[13px] text-muted-foreground">
        {error ? (
          <>
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {error}
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.75} />
            Loading patient reports…
          </>
        )}
      </div>
    );
  }

  return (
    <section className="nm-stack">
      <Reveal>
      <div className="cq-card p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="cq-kicker">MY PATIENTS</div>
            <MaskedText as="h2" className="mt-1 text-[15px] font-semibold text-[var(--text-strong)]">
              Reports &amp; activity
            </MaskedText>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {data.totals.patients} patients · {data.totals.reports} reports filed ·{" "}
              {data.totals.capsulesOnChain} capsules earned by your patients
            </p>
            {data.hospital?.name ? (
              <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-xs">
                <span className="cq-pixel-label">
                  <Building2 className="mr-1 h-3 w-3" strokeWidth={1.75} /> {data.hospital.name}
                </span>
                <span className="cq-pixel-label cq-real-label">
                  reputation {data.hospital.reputationScore}/100 · {data.hospital.reputationLabel}
                </span>
                <Link
                  href="/patient/hospitals"
                  className="font-semibold text-[var(--text-strong)] hover:underline"
                >
                  check hospital reputation
                </Link>
              </p>
            ) : null}
          </div>
          <Button variant="outline" onClick={load} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.75} />
            )}
            Refresh
          </Button>
        </div>
      </div>
      </Reveal>

      {error ? (
        <div className="flex items-start gap-2 rounded-[14px] bg-[var(--destructive-soft)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--destructive)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          {error}
        </div>
      ) : null}

      <Reveal delay={60}>
      <div className="nm-grid-2">
        {data.patients.map((patient) => {
          const patientReports = data.reports.filter(
            (r) => r.patientId === patient.patientId
          );
          return (
            <article key={patient.patientId} className="cq-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.75} />
                    <h3 className="nm-card-title text-[14px]">{patient.name}</h3>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {patient.reports} report{patient.reports === 1 ? "" : "s"} ·{" "}
                    {patient.medications} medication
                    {patient.medications === 1 ? "" : "s"} recorded
                    {patient.anchored > 0
                      ? ` · ${patient.anchored} on-chain`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Engagement figures: counts a doctor acts on, so they sit on
                  the data surface rather than behind a blur. */}
              <div className="glass-data mt-3 grid grid-cols-3 gap-2 rounded-[16px] p-1.5">
                <div className="rounded-[14px] p-2 text-center">
                  <div className="text-[16px] font-bold text-[var(--text-strong)]">{patient.missionsCompleted}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">missions done</div>
                </div>
                <div className="rounded-[14px] p-2 text-center">
                  <div className="text-[16px] font-bold text-[var(--text-strong)]">{patient.missionsDue}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">due now</div>
                </div>
                <div className="rounded-[14px] p-2 text-center">
                  <div className="text-[16px] font-bold text-[var(--copper)]">{patient.capsulesEarned}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">capsules</div>
                </div>
              </div>

              {patientReports.length ? (
                <div className="mt-3 nm-stack-sm">
                  {patientReports.map((report) => (
                    /* Remarks, medications and hashes are the record itself:
                       near-opaque, always fully readable. */
                    <div
                      key={report._id}
                      className="glass-data rounded-[16px] p-3 text-[11px]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[var(--text-strong)]">rev {report.revision}</span>
                        {/* Anchor state indicator: the one element here whose
                            change is animated, because "is this provable yet"
                            is the question this panel answers. */}
                        {report.blockchain?.status === "anchored" ? (
                          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)] transition-colors duration-[var(--dur-3)] ease-[var(--ease-soft)]">
                            <Link2 className="h-3 w-3" strokeWidth={1.75} /> on-chain
                          </span>
                        ) : (
                          <Badge variant="outline" className="transition-colors duration-[var(--dur-3)] ease-[var(--ease-soft)]">
                            <Clock3 className="h-3 w-3" strokeWidth={1.75} />
                            {report.blockchain?.status || "pending"}
                          </Badge>
                        )}
                        {report.aiNeedsReview ? (
                          <Badge variant="warning">needs review</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        <span>consulted {report.patientName || "patient"}</span>
                        {report.hospitalName ? (
                          <>
                            <span>· at {report.hospitalName}</span>
                            {typeof report.hospitalReputationScore === "number" ? (
                              <span className="cq-pixel-label cq-real-label">
                                rep {report.hospitalReputationScore}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                      {report.remarkSummary || report.clinicalSummary ? (
                        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text)]">
                          {report.remarkSummary || report.clinicalSummary?.slice(0, 120)}
                        </p>
                      ) : null}
                      {report.medications?.length ? (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                          <Pill className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          {report.medications
                            .map((m) => m.name + (m.dose ? ` ${m.dose}` : ""))
                            .join(", ")}
                        </div>
                      ) : null}
                      <div className="mt-1.5 flex items-start gap-1.5 break-all border-t border-[var(--border-subtle)] pt-1.5 font-mono text-[10px] text-[var(--text-muted)]">
                        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[var(--copper)]" strokeWidth={1.75} />
                        {report.contentHash?.slice(0, 20)}…
                        {report.blockchain?.txHash
                          ? ` · tx ${report.blockchain.txHash.slice(0, 10)}…`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  No reports filed yet for this patient.
                </p>
              )}
            </article>
          );
        })}
      </div>
      </Reveal>

      {data.patients.length === 0 ? (
        <div className="cq-card p-8 text-center text-[13px] text-muted-foreground">
          You have not interacted with any patients yet.
        </div>
      ) : null}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        Each report is content-hashed and anchored on the local chain, so a filed
        prescription or remark cannot be later denied. The activity dashboard is a
        view of the patient&apos;s engagement, not a clinical score.
      </p>
    </section>
  );
}
