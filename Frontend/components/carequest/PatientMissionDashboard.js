"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  HelpCircle,
  HeartPulse,
  Pause,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  XCircle,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import {
  completeLessonMission,
  getPatientMissionDashboard,
  makeNextSyntheticMissionDue,
  respondToMission,
  simulateSyntheticDeliveryFailure,
  updateCareQuestPreferences,
} from "@/actions/missionActions";
import { getCarePassport } from "@/actions/programActions";
import {
  getPatientBlockchainState,
  syncPatientCapsulesToBlockchain,
} from "@/actions/blockchainActions";
import { pusherClient } from "@/lib/pusher";
import { getPatientReportTimeline } from "@/actions/reportActions";
import CarePassport from "@/components/carequest/CarePassport";
import ActivitySimulationCard from "@/components/carequest/ActivitySimulationCard";
import BenefitCatalog from "@/components/carequest/BenefitCatalog";
import PatientReportsTimeline from "@/components/carequest/PatientReportsTimeline";
import CapsuleIcon from "@/components/carequest/CapsuleIcon";
import PromptDialog from "@/components/carequest/PromptDialog";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import SimulationBadge from "@/components/carequest/SimulationBadge";

function formatWhen(value) {
  return new Date(value).toLocaleString();
}

export default function PatientMissionDashboard({ initialData, initialPassport }) {
  const [data, setData] = useState(initialData);
  const [passport, setPassport] = useState(initialPassport);
  const [selectedProgramId, setSelectedProgramId] = useState(
    initialPassport?.programs?.[0]?.program?._id || ""
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reaction, setReaction] = useState("idle");
  const [blockchain, setBlockchain] = useState(null);
  const [reports, setReports] = useState([]);
  const [openReportId, setOpenReportId] = useState(null);

  const primaryProgramId = passport?.programs?.[0]?.program?._id;
  const selectedProgram = useMemo(
    () =>
      (passport?.programs || []).find(
        (item) => String(item.program._id) === String(selectedProgramId)
      ) || passport?.programs?.[0],
    [passport, selectedProgramId]
  );

  async function refresh() {
    const [next, nextPassport, nextReports] = await Promise.all([
      getPatientMissionDashboard(),
      getCarePassport(),
      getPatientReportTimeline(),
    ]);
    setData(next);
    setPassport(nextPassport);
    setReports(nextReports);
  }

  useEffect(() => {
    let channel;
    try {
      channel = pusherClient.subscribe("private-carequest-user-" + initialData.userId);
      channel.bind("mission.updated", refresh);
    } catch {}
    return () => {
      try {
        channel?.unbind("mission.updated", refresh);
        pusherClient.unsubscribe("private-carequest-user-" + initialData.userId);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData.userId]);

  // Reports are not part of the server-provided initial payload, so load them
  // once on mount. A doctor filing a report triggers mission.updated, which
  // calls refresh() and pulls the new report in.
  useEffect(() => {
    let active = true;
    getPatientReportTimeline()
      .then((next) => {
        if (active) setReports(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function openReport(id) {
    setOpenReportId(id);
    if (id) {
      const el = document.getElementById("carequest-reports");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function action(key, fn, mood = "celebrate") {
    setBusy(key);
    setMessage("");
    try {
      await fn();
      await refresh();
      // Nudge the capsule gauge to refetch immediately after any reward-affecting action.
      window.dispatchEvent(new Event("arkcare-capsules"));
      setReaction(mood);
      setTimeout(() => setReaction("idle"), 1300);
    } catch (error) {
      setReaction("alert");
      setMessage(error.message || "CareQuest action failed");
      setTimeout(() => setReaction("idle"), 1300);
    } finally {
      setBusy("");
    }
  }

  // Mission responses that need a written note use a proper input field
  // (PromptDialog) rather than the native window.prompt popup.
  const [notePrompt, setNotePrompt] = useState(null);

  function respond(occurrence, response) {
    if (response === "need_help" || response === "not_done") {
      setNotePrompt({ occurrence, response });
      return;
    }
    action(occurrence._id + response, () =>
      respondToMission(occurrence._id, response, "", 15),
      "celebrate"
    );
  }

  function confirmNote(note) {
    const { occurrence, response } = notePrompt;
    setNotePrompt(null);
    action(
      occurrence._id + response,
      () => respondToMission(occurrence._id, response, note, 15),
      response === "need_help" ? "alert" : "celebrate"
    );
  }

  async function savePreference(patch) {
    const next = {
      ...data.preference,
      ...patch,
      accessibility: {
        ...(data.preference.accessibility || {}),
        ...(patch.accessibility || {}),
      },
      quietHours: {
        ...(data.preference.quietHours || {}),
        ...(patch.quietHours || {}),
      },
    };
    await action("preferences", async () => {
      await updateCareQuestPreferences(next);
      setMessage("CareQuest preferences updated.");
    }, "wave");
  }

  async function readBlockchain() {
    setBusy("blockchain");
    try {
      setBlockchain(await getPatientBlockchainState());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  async function syncBlockchain() {
    setBusy("blockchain-sync");
    try {
      const state = await syncPatientCapsulesToBlockchain();
      setBlockchain(state);
      setMessage(
        state.disabled
          ? "Blockchain is disabled; the database Capsule ledger remains authoritative."
          : "Local blockchain proof synchronized."
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  }

  const rewardsEnabled = data.preference?.careQuestOptIn !== false;
  const selectedOrganizationId = selectedProgram?.organization?._id || "";
  const selectedOccurrences = (data.occurrences || []).filter((item) => {
    if (item.program) {
      return String(item.program) === String(selectedProgramId);
    }
    return String(selectedProgramId) === String(primaryProgramId);
  });
  const selectedHandoffs = (data.openHandoffs || []).filter((item) => {
    if (item.organization) {
      return String(item.organization) === String(selectedOrganizationId);
    }
    return String(selectedProgramId) === String(primaryProgramId);
  });
  const approvedActivityOccurrence =
    selectedOccurrences.find(
      (item) =>
        item.activityType === "activity" &&
        !["completed", "cancelled", "expired"].includes(item.status)
    ) || null;

  const openMissionCount = selectedOccurrences.filter(
    (item) => !["responded", "completed", "cancelled", "expired"].includes(item.status)
  ).length;
  const answeredMissionCount = selectedOccurrences.length - openMissionCount;
  const journeyProgress = selectedOccurrences.length
    ? Math.round((answeredMissionCount / selectedOccurrences.length) * 100)
    : 0;

  return (
    <div className="nm-dash">
      {/* ============================================== main column */}
      <div className="nm-dash-col nm-stack">
        {/* Page masthead: a rule and a heading, not a boxed header. */}
        <Reveal>
          <section className="plain-panel">
            <div className="section-rule">CareQuest</div>
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="cq-pixel-label">CAREQUEST</span>
                  <span className="cq-pixel-label">PARTICIPATION ≠ HEALTH SCORE</span>
                </div>
                <MaskedText
                  as="h2"
                  className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
                >
                  Your care missions
                </MaskedText>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
                  Follow the clinician-approved plan, communicate honestly and ask for human
                  support when you need it. CareQuest rewards participation, not perfect outcomes.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/patient/care-plans"
                    className="nm-btn-secondary"
                  >
                    View approved plan
                  </Link>
                  <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="h-4 w-4" strokeWidth={1.75} /> Refresh
                  </Button>
                </div>
              </div>
              <PixelCharacter
                variant={selectedProgram?.program?.visualTheme?.mascot === "walker" ? "walker" : "guide"}
                mood={reaction}
                size={88}
                speech={selectedHandoffs.length ? "Your care team can see your open help request." : "Small steps count."}
              />
            </div>
          </section>
        </Reveal>

        {message ? (
          <div className="cq-card-soft cq-achievement px-4 py-3 text-[13px] leading-6 text-[var(--text)]">
            {message}
          </div>
        ) : null}

        <CarePassport
          passport={passport}
          selectedProgramId={selectedProgramId}
          onSelect={setSelectedProgramId}
        />

        <PatientReportsTimeline
          reports={reports}
          openId={openReportId}
          onOpenReport={openReport}
          onChanged={refresh}
        />

        {selectedProgram ? (
          <ActivitySimulationCard
            programCard={selectedProgram}
            activityOccurrence={approvedActivityOccurrence}
            onChanged={refresh}
          />
        ) : null}

        <Reveal>
          <section className="nm-stack-sm">
            <div className="section-rule">Clinician-approved journey</div>
            <div className="section-head">
              <MaskedText as="h2" className="section-title">
                Mission timeline
              </MaskedText>
              <p className="section-lede">
                Upcoming tasks stay visible even if a notification channel fails.
              </p>
            </div>
            {!selectedOccurrences.length ? (
              <span className="cq-pixel-label w-fit">
                No clinician-approved missions in this hospital journey yet
              </span>
            ) : null}

            {/* Missions are a chronological narrative, so they read as a timeline
                rather than one card per mission. */}
            {selectedOccurrences.length ? (
              <div className="timeline">
                {selectedOccurrences.map((occurrence) => {
                  const final = ["responded", "completed", "cancelled", "expired"].includes(
                    occurrence.status
                  );
                  return (
                    <article
                      key={occurrence._id}
                      className="timeline-item"
                      data-tone={final ? "muted" : undefined}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="timeline-time">
                          <Clock3
                            className="mr-1 inline h-[13px] w-[13px]"
                            strokeWidth={1.75}
                          />
                          {formatWhen(occurrence.scheduledFor)} · {occurrence.timezone}
                        </span>
                        <Badge variant="outline">{occurrence.activityType}</Badge>
                        <Badge variant={final ? "secondary" : "info"}>{occurrence.status}</Badge>
                        {occurrence.deliveryStatus === "failed" ? (
                          <SimulationBadge>DELIVERY FAILED</SimulationBadge>
                        ) : null}
                      </div>

                      <div className="mt-1.5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-6">
                        <div className="min-w-0">
                          <h3 className="timeline-title">{occurrence.title}</h3>
                          <p className="timeline-body max-w-2xl">
                            {occurrence.instructions}
                          </p>
                          {occurrence.currentResponse ? (
                            <p className="mt-1.5 text-[12px] font-semibold text-[var(--text-strong)]">
                              You reported: {occurrence.currentResponse.replace("_", " ")}
                            </p>
                          ) : null}
                          {occurrence.safetyText ? (
                            <div className="mt-2.5 rounded-[12px] bg-[var(--warning-soft)] px-3 py-2 text-[11.5px] leading-5 text-[var(--warning)]">
                              {occurrence.safetyText}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:w-[250px] lg:justify-end">
                          {occurrence.activityType === "lesson" && !final ? (
                            <>
                              <Button
                                disabled={busy !== ""}
                                onClick={() =>
                                  action(occurrence._id + "understood", () =>
                                    completeLessonMission(occurrence._id, "understood")
                                  )
                                }
                              >
                                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                                I understand{rewardsEnabled ? " +2 CAP" : ""}
                              </Button>
                              <Button
                                variant="outline"
                                disabled={busy !== ""}
                                onClick={() =>
                                  action(
                                    occurrence._id + "question",
                                    () => completeLessonMission(occurrence._id, "needs_clarification"),
                                    "alert"
                                  )
                                }
                              >
                                <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
                                I have a question{rewardsEnabled ? " +2 CAP" : ""}
                              </Button>
                            </>
                          ) : null}

                          {occurrence.activityType === "activity" && !final ? (
                            <span className="cq-pixel-label">
                              Complete in the activity panel above
                            </span>
                          ) : null}

                          {occurrence.activityType === "follow_up" && !occurrence.linkedAppointment ? (
                            <Link
                              href="/patient"
                              className="nm-btn-secondary"
                            >
                              Book through appointments
                            </Link>
                          ) : null}

                          {occurrence.activityType === "quiz" && !final ? (
                            <Button
                              disabled={busy !== ""}
                              onClick={() => openReport(occurrence.sourceReport)}
                            >
                              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                              Take knowledge check
                            </Button>
                          ) : null}

                          {!final &&
                          occurrence.status === "due" &&
                          !["lesson", "follow_up", "activity", "quiz"].includes(occurrence.activityType) ? (
                            <>
                              <Button disabled={busy !== ""} onClick={() => respond(occurrence, "done")}>
                                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                                Done{rewardsEnabled ? " +1" : ""}
                              </Button>
                              <Button variant="outline" disabled={busy !== ""} onClick={() => respond(occurrence, "not_done")}>
                                <XCircle className="h-4 w-4" strokeWidth={1.75} />
                                Not done{rewardsEnabled ? " +1" : ""}
                              </Button>
                              <Button variant="outline" disabled={busy !== ""} onClick={() => respond(occurrence, "need_help")}>
                                <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
                                Need help{rewardsEnabled ? " +1" : ""}
                              </Button>
                              <Button variant="outline" disabled={busy !== ""} onClick={() => respond(occurrence, "snooze")}>
                                Snooze
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="plain-panel">
                <div className="flex items-center gap-4 py-6">
                  <PixelCharacter variant="walker" mood="idle" size={62} />
                  <div>
                    <h3 className="nm-card-title text-[14px]">Independent hospital journey</h3>
                    <p className="mt-1 text-[12.5px] leading-6 text-[var(--text-muted)]">
                      This hospital journey has its own membership, Capsule wallet, activity
                      program, benefits and clinician-approved missions. Nothing is borrowed
                      from another hospital&apos;s clinical plan.
                    </p>
                    <p className="mt-3 text-[13px] text-[var(--text-muted)]">
                      No missions yet. A doctor must approve a CareQuest plan first.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </Reveal>

        {selectedProgram ? (
          <BenefitCatalog programCard={selectedProgram} onChanged={refresh} />
        ) : null}

        <Reveal>
          <section className="plain-panel">
            <div className="section-rule">Preferences &amp; demo controls</div>
            <div className="section-head">
              <h2 className="section-title">Keep control of the journey</h2>
              <p className="section-lede">
                Opting out stops gamified rewards without blocking ordinary care.
                Accelerated/failure controls below are synthetic judge tools only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy === "preferences"}
                  onClick={() =>
                    savePreference({
                      careQuestOptIn: data.preference?.careQuestOptIn === false,
                    })
                  }
                >
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                  {data.preference?.careQuestOptIn === false
                    ? "Opt back into CareQuest"
                    : "Opt out of gamified CareQuest"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === "preferences"}
                  onClick={() => savePreference({ paused: !data.preference?.paused })}
                >
                  <Pause className="h-4 w-4" strokeWidth={1.75} />
                  {data.preference?.paused ? "Resume reminders" : "Pause reminders"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === "demo-clock"}
                  onClick={() =>
                    action("demo-clock", async () => {
                      const result = await makeNextSyntheticMissionDue(selectedProgramId);
                      setMessage(
                        result.success
                          ? "Synthetic demo clock moved the next mission to due."
                          : "No scheduled synthetic mission is available."
                      );
                    }, "wave")
                  }
                >
                  <Clock3 className="h-4 w-4" strokeWidth={1.75} />
                  Make next mission due (demo)
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === "demo-failure"}
                  onClick={() =>
                    action("demo-failure", async () => {
                      const result = await simulateSyntheticDeliveryFailure(selectedProgramId);
                      setMessage(
                        result.success
                          ? "Synthetic notification failure recorded. Mission remains visible in-app."
                          : "No synthetic mission is available for failure simulation."
                      );
                    }, "alert")
                  }
                >
                  Simulate notification failure
                </Button>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="plain-panel">
            <div className="section-rule">Blockchain proof rail</div>
            <div className="section-head">
              <h2 className="section-title flex items-center gap-2">
                <WalletCards className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Local EVM verification
              </h2>
              <p className="section-lede">
                Blockchain remains non-clinical. Care responses and staff workflows continue
                even when this local proof rail is offline.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={readBlockchain} disabled={busy === "blockchain"}>
                Check
              </Button>
              <Button variant="copper" onClick={syncBlockchain} disabled={busy === "blockchain-sync"}>
                Sync proof
              </Button>
            </div>
            {blockchain ? (
              // Chain head + hashes are provenance data: never behind a blur.
              // The dump wraps rather than scrolling — the document scrolls, so
              // a code block must never become a nested scroll container.
              <pre className="well mt-4 whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[var(--text-muted)]">
                {JSON.stringify(blockchain, null, 2)}
              </pre>
            ) : null}
          </section>
        </Reveal>
      </div>

      {/* ============================================== right insight rail */}
      <aside className="nm-rail" aria-label="Capsule and journey insights">
        {selectedProgram ? (
          <div>
            <div className="cq-kicker">CAPSULE BALANCE</div>
            {/* A balance is a number you act on: near-opaque data surface. */}
            <div className="well mt-2">
              <div className="flex items-end gap-2">
                <div className="nm-metric-xl tabular-nums">{selectedProgram.balance}</div>
                <CapsuleIcon
                  size={18}
                  className="mb-1 text-[var(--text-muted)]"
                  title="Capsules"
                />
                <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {selectedProgram.program.capsuleSymbol}
                </div>
              </div>
              <div className="cq-capsule-bar mt-3" style={{ minWidth: 0 }}>
                <span
                  style={{
                    width: Math.min(
                      100,
                      Math.max(
                        2,
                        Math.round(
                          (selectedProgram.balance /
                            Math.max(selectedProgram.balance + (selectedProgram.catalog?.[0]?.costCapsules || 0), 1)) *
                            100
                        )
                      )
                    ) + "%",
                  }}
                />
              </div>
              <p className="mt-2 text-[10.5px] leading-4 text-[var(--text-muted)]">
                Hospital-specific, non-transferable participation units.
              </p>
            </div>
            <Link href="/patient/care-plans" className="nm-btn-secondary mt-3 w-full">
              View approved plan
            </Link>
          </div>
        ) : (
          <div>
            <div className="cq-kicker">CAPSULE BALANCE</div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
              Join a clinician-approved hospital program to earn Capsules.
            </p>
          </div>
        )}

        {/* Journey progress: the one solid ink anchor in the rail. */}
        <div className="nm-dark-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dark-muted)]">
            Journey progress
          </div>
          <div className="mt-1.5 flex items-end gap-2">
            <span className="text-[26px] font-bold leading-none text-[var(--dark-text)] tabular-nums">
              {journeyProgress}%
            </span>
            <span className="pb-0.5 text-[11px] text-[var(--dark-muted)]">
              {answeredMissionCount}/{selectedOccurrences.length} answered
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/12">
            <span
              className="block h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: journeyProgress + "%" }}
            />
          </div>
          <p className="mt-2.5 text-[10.5px] leading-4 text-[var(--dark-muted)]">
            Rewards never affect your health score or clinical decisions.
          </p>
        </div>

        {/* Three related counts, set inline rather than as three more boxes. */}
        <div>
          <div className="cq-kicker">Journey at a glance</div>
          <dl className="stat-strip mt-2.5 flex-col">
            <div className="stat-inline mr-0 w-full border-r-0 border-b border-[var(--border-subtle)] pb-3 pr-0 sm:flex-row sm:items-center sm:gap-3">
              <dt className="sm:w-[150px] sm:shrink-0">Open care-team requests</dt>
              <dd className="flex flex-wrap items-baseline gap-2">
                {selectedHandoffs.length}
                <small className="font-normal normal-case tracking-normal">
                  {selectedHandoffs.length
                    ? "owned by the care workflow until a person resolves them"
                    : "no open handoffs in this hospital context"}
                </small>
              </dd>
            </div>
            <div className="stat-inline mr-0 w-full border-r-0 border-b border-[var(--border-subtle)] pb-3 pr-0 sm:flex-row sm:items-center sm:gap-3">
              <dt className="sm:w-[150px] sm:shrink-0">Missions still open</dt>
              <dd className="flex flex-wrap items-baseline gap-2">
                {openMissionCount}
                <small className="font-normal normal-case tracking-normal">
                  visible even when a notification channel fails
                </small>
              </dd>
            </div>
            <div className="stat-inline mr-0 w-full border-r-0 pr-0 sm:flex-row sm:items-center sm:gap-3">
              <dt className="sm:w-[150px] sm:shrink-0">Next funded benefit</dt>
              <dd className="flex flex-wrap items-baseline gap-2">
                {selectedProgram?.catalog?.[0]
                  ? selectedProgram.catalog[0].costCapsules + " " + selectedProgram.program.capsuleSymbol
                  : "—"}
                <small className="font-normal normal-case tracking-normal">
                  hospital-specific, never cash-out tokens
                </small>
              </dd>
            </div>
          </dl>
        </div>

        <div className="nm-stack-sm">
          <div className="cq-kicker">QUICK LINKS</div>
          <Link href="/patient/care-plans" className="nm-row justify-start text-[12px] font-semibold">
            <BookOpenCheck className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} />
            Approved care plan
          </Link>
          <Link href="/reports" className="nm-row justify-start text-[12px] font-semibold">
            <FileCheck2 className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} />
            Medical reports
          </Link>
          <Link href="/health" className="nm-row justify-start text-[12px] font-semibold">
            <HeartPulse className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} />
            Health insights
          </Link>
          <Link href="/patient" className="nm-row justify-start text-[12px] font-semibold">
            <Stethoscope className="h-[18px] w-[18px] text-[var(--text-muted)]" strokeWidth={1.75} />
            Book an appointment
          </Link>
        </div>

        <div className="rounded-[16px] bg-[var(--warning-soft)] px-3.5 py-3 text-[11px] leading-5 text-[var(--warning)]">
          AI never prescribes, diagnoses or approves anything here. Any AI draft needs
          explicit clinician approval before it becomes part of your plan.
        </div>
      </aside>

      <PromptDialog
        open={Boolean(notePrompt)}
        title={
          notePrompt?.response === "need_help"
            ? "What do you need help with?"
            : "What made this difficult?"
        }
        description={
          notePrompt?.response === "need_help"
            ? "Describe what you need. Your care team and a nurse will see this. Do not use this queue for an emergency."
            : "Optional: tell your care team what got in the way. You still receive participation credit."
        }
        placeholder={
          notePrompt?.response === "need_help"
            ? "e.g. I have a side effect from my new medicine"
            : "e.g. I did not have time today"
        }
        required={notePrompt?.response === "need_help"}
        confirmLabel={notePrompt?.response === "need_help" ? "Send to my care team" : "Submit"}
        onCancel={() => setNotePrompt(null)}
        onConfirm={confirmNote}
      />
    </div>
  );
}
