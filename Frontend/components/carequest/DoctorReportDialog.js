"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Lock,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Upload,
  XIcon,
} from "lucide-react";
import { parseDoctorReportPreview, submitDoctorReport } from "@/actions/reportActions";
import Reveal from "@/components/motion/Reveal";

/**
 * The doctor's "Report" flow, available during/after a consultation:
 *  - type remarks + activity advice, and/or attach a prescription image
 *  - "Parse with AI" -> OCR the image, structure the report into JSON, and
 *    build the RAG quiz preview. Nothing is saved yet.
 *  - "Submit report" -> the doctor publishes; the report is content-hashed,
 *    anchored on-chain, turned into a care plan + missions, and audited.
 */
export default function DoctorReportDialog({ appointment, isOpen, onClose, onDone }) {
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [patientActivity, setPatientActivity] = useState("");
  const [prescriptionText, setPrescriptionText] = useState("");
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  function reset() {
    setClinicalSummary("");
    setPatientActivity("");
    setPrescriptionText("");
    setImages([]);
    setPreview(null);
    setResult(null);
    setMessage("");
    setError("");
  }

  async function uploadImage(file) {
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/carequest/upload-report-image", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setImages((current) => [
        ...current,
        { url: data.url, publicId: data.publicId, fileName: data.fileName, kind: "prescription" },
      ]);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runParse() {
    setBusy("parse");
    setError("");
    setMessage("");
    try {
      const result = await parseDoctorReportPreview({
        clinicalSummary,
        patientActivity,
        prescriptionText,
        images,
      });
      setPreview(result);
      setMessage(
        `AI parsed the report (${result.parseMode}). Review the medications below, then submit.`
      );
    } catch (parseError) {
      setError(parseError.message);
    } finally {
      setBusy("");
    }
  }

  async function submit() {
    setBusy("submit");
    setError("");
    setMessage("");
    try {
      const submitted = await submitDoctorReport({
        appointmentId: appointment._id,
        clinicalSummary,
        patientActivity,
        prescriptionText,
        images,
      });
      setResult(submitted);
      if (submitted.created) {
        setMessage(
          "Report published, anchored and turned into a care plan. The patient's CareQuest is updated."
        );
        onDone?.(submitted);
      } else {
        setMessage("This exact report was already filed for this appointment.");
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy("");
    }
  }

  const canSubmit =
    clinicalSummary.trim().length > 0 && !result?.created && busy === "";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose?.();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="nm-stat-icon h-8 w-8 rounded-[10px]">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="text-[15px]">Consultation report</span>
          </DialogTitle>
          <DialogDescription>
            Document the visit for {appointment?.patient?.name || "this patient"}. Your
            report is anchored on the local chain so it cannot be later denied, and it
            becomes the patient&apos;s care plan.
          </DialogDescription>
        </DialogHeader>

        {result?.created ? (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-[var(--success-soft)] p-4 text-[12px] leading-relaxed text-[var(--success)]">
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> Report published
              </div>
              <p className="mt-1.5">
                Care plan v{result.plan?.versionNumber} created with{" "}
                {result.plan?.occurrenceCount} missions.
              </p>
            </div>
            {/* On-chain proof: the immutable-record readout. Near-opaque data
                surface + mono, so a hash is never read through a blur. */}
            <div className="glass-data rounded-[16px] p-3 text-[11px]">
              <div className="section-rule m-0!">
                <span>On-chain proof</span>
                <Lock className="h-3 w-3 text-[var(--copper)]" strokeWidth={1.75} />
              </div>
              <dl className="dl-grid mt-2 text-[11px]!">
                <dt>hash</dt>
                <dd className="break-all font-mono font-normal! text-[var(--text)]">
                  {result.contentHash}
                </dd>
                <dt>tx</dt>
                <dd className="break-all font-mono font-normal! text-[var(--text)]">
                  {result.blockchain?.txHash || result.blockchain?.status}
                </dd>
              </dl>
            </div>
            <Button
              onClick={() => {
                reset();
                onClose?.();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="nm-stack">
            <div className="space-y-2">
              <Label>Consultation remarks (required)</Label>
              <Textarea
                rows={4}
                value={clinicalSummary}
                onChange={(event) => setClinicalSummary(event.target.value)}
                placeholder="What you observed, assessed and advised during this visit."
              />
            </div>

            <div className="space-y-2">
              <Label>Patient activity / advice</Label>
              <Textarea
                rows={3}
                value={patientActivity}
                onChange={(event) => setPatientActivity(event.target.value)}
                placeholder="e.g. Walk 30 minutes daily, reduce salt, sleep 7 hours."
              />
            </div>

            <div className="space-y-2">
              <Label>Prescription (typed)</Label>
              <Textarea
                rows={3}
                value={prescriptionText}
                onChange={(event) => setPrescriptionText(event.target.value)}
                placeholder="e.g. Tab. Metoprolol 50mg once daily"
              />
            </div>

            <div className="space-y-2">
              <Label>Prescription image (optional)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => uploadImage(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy === "upload"}
                >
                  {busy === "upload" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Paperclip className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  )}
                  Attach prescription photo
                </Button>
                {images.map((image) => (
                  <span
                    key={image.url}
                    className="glass-data inline-flex items-center gap-1.5 rounded-[12px] px-2.5 py-1 text-[11px] text-[var(--text)]"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {image.fileName || "image"}
                    <button
                      type="button"
                      aria-label={`Remove ${image.fileName || "image"}`}
                      className="-my-2 -mr-1 ml-0.5 grid size-10 place-items-center rounded-full text-[var(--destructive)] transition-colors hover:bg-[var(--destructive-soft)]"
                      onClick={() =>
                        setImages((current) => current.filter((i) => i.url !== image.url))
                      }
                    >
                      <XIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Attached images are read with OCR and folded into the report; they are
                stored as evidence.
              </p>
            </div>

            {/* The commit action. Copper is reserved for exactly this:
                "this writes an immutable record". */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={runParse}
                disabled={busy !== "" || !clinicalSummary.trim()}
              >
                {busy === "parse" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.75} />
                )}
                Parse with AI
              </Button>
              <Button type="button" variant="copper" onClick={submit} disabled={!canSubmit} className="ml-auto">
                {busy === "submit" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Upload className="mr-2 h-4 w-4" strokeWidth={1.75} />
                )}
                Submit report &amp; build care plan
              </Button>
            </div>

            {message ? (
              <div className="inline-flex items-start gap-2 rounded-[14px] bg-[var(--surface-subtle)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--text-muted)] shadow-[var(--shadow-inset)]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="flex items-start gap-2 rounded-[14px] bg-[var(--destructive-soft)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--destructive)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {error}
              </div>
            ) : null}

            {preview?.parsed ? (
              /* Parsed medications/doses are clinical values: data surface.
                 One Reveal for the whole block, because a parse result is a
                 section appearing — never one per medication line. */
              <Reveal>
              <div className="glass-data space-y-3 rounded-[18px] p-4">
                <div className="section-rule m-0!">
                  <span>AI-structured preview</span>
                </div>
                {preview.parsed.needsReview || preview.warnings?.length ? (
                  <div className="rounded-[12px] bg-[var(--warning-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--warning)]">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} /> Needs review
                    </div>
                    <ul className="mt-1 list-disc pl-4">
                      {(preview.warnings || []).map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {preview.parsed.medications?.length ? (
                  <div>
                    <div className="section-rule m-0!">
                      <span>Medications</span>
                      <span>{preview.parsed.medications.length}</span>
                    </div>
                    {/* Drug / dose / frequency is a clinical key-value set, so
                        it reads as a definition list rather than as list items. */}
                    <dl className="dl-grid mt-2">
                      {preview.parsed.medications.map((med, index) => (
                        <div
                          key={index}
                          className="contents"
                        >
                          <dt>
                            {med.name}
                            {med.needsReview ? (
                              <span className="ml-1.5 inline-flex items-center gap-1 text-[var(--warning)]">
                                <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
                                verify
                              </span>
                            ) : null}
                          </dt>
                          <dd className="font-mono">
                            {med.dose || "—"}
                            {med.frequency ? ` · ${med.frequency}` : ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                {preview.parsed.conditions?.length ? (
                  <div>
                    <div className="section-rule m-0!">
                      <span>Conditions detected</span>
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                      {preview.parsed.conditions.map((c) => c.label).join(", ")}
                    </div>
                  </div>
                ) : null}
                {preview.quizPreview?.length ? (
                  <div>
                    <div className="section-rule m-0!">
                      <span>Knowledge check</span>
                    </div>
                    <div className="ledger mt-1">
                      {preview.quizPreview.map((item) => (
                        <div
                          key={item.questionId}
                          className="ledger-row grid-cols-1! items-start! gap-1! py-2!"
                        >
                          <span className="ledger-meta text-[var(--text-subtle)]!">
                            [{item.categoryTitle}]
                          </span>
                          <span className="ledger-meta">{item.question}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start gap-1.5 border-t border-[var(--border-subtle)] pt-2.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} />
                  AI only structures what you wrote. It cannot prescribe or change
                  doses, and correct answers never leave the server.
                </div>
              </div>
              </Reveal>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
