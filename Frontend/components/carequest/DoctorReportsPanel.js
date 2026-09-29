"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDoctorReportWorkspace } from "@/actions/reportActions";
import { AlertCircle, Building2, Link2, Loader2, Pill, RefreshCw, ShieldCheck, Stethoscope, Users } from "lucide-react";

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
      <div className="cq-card p-6 text-[13px] text-muted-foreground">
        {error ? error : "Loading patient reports…"}
      </div>
    );
  }

  return (
    <section className="nm-stack">
      <div className="cq-card p-5 md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="cq-kicker">MY PATIENTS</div>
            <h2 className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-[var(--text-strong)]">
              <Users className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} /> Reports &amp; activity
            </h2>
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

      {error ? (
        <div className="flex items-start gap-2 rounded-[14px] bg-[var(--destructive-soft)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--destructive)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          {error}
        </div>
      ) : null}

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

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-[16px] bg-[var(--surface-subtle)] p-2.5 text-center shadow-[var(--shadow-inset)]">
                  <div className="text-[16px] font-bold text-[var(--text-strong)]">{patient.missionsCompleted}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">missions done</div>
                </div>
                <div className="rounded-[16px] bg-[var(--surface-subtle)] p-2.5 text-center shadow-[var(--shadow-inset)]">
                  <div className="text-[16px] font-bold text-[var(--text-strong)]">{patient.missionsDue}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">due now</div>
                </div>
                <div className="rounded-[16px] bg-[var(--surface-subtle)] p-2.5 text-center shadow-[var(--shadow-inset)]">
                  <div className="text-[16px] font-bold text-[var(--text-strong)]">{patient.capsulesEarned}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">capsules</div>
                </div>
              </div>

              {patientReports.length ? (
                <div className="mt-3 nm-stack-sm">
                  {patientReports.map((report) => (
                    <div
                      key={report._id}
                      className="rounded-[16px] bg-[var(--surface-subtle)] p-3 text-[11px] shadow-[var(--shadow-inset)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">rev {report.revision}</span>
                        {report.blockchain?.status === "anchored" ? (
                          <span className="cq-pixel-label cq-real-label">
                            <Link2 className="mr-1 h-3 w-3" strokeWidth={1.75} /> on-chain
                          </span>
                        ) : (
                          <Badge variant="outline">
                            {report.blockchain?.status || "pending"}
                          </Badge>
                        )}
                        {report.aiNeedsReview ? (
                          <Badge variant="outline">needs review</Badge>
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
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Pill className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          {report.medications
                            .map((m) => m.name + (m.dose ? ` ${m.dose}` : ""))
                            .join(", ")}
                        </div>
                      ) : null}
                      <div className="mt-1 break-all font-mono text-[9px] text-muted-foreground">
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
