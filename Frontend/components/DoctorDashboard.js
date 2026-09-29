"use client";

import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Clock,
  FileText,
  Hourglass,
  MessageCircle,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  requestDoctorSupport,
} from "@/actions/appointmentActions";
import ChatModal from "./ChatModal";
import NotificationBell from "./NotificationBell";

// Lightweight freshness window for the appointment list. Long enough to be
// cheap, short enough that a doctor does not sit on a stale schedule.
const REFRESH_MS = 30000;

export default function DoctorDashboard({ doctor }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingAppointment, setUpdatingAppointment] = useState(null);

  // Chat states
  const [selectedAppointmentForChat, setSelectedAppointmentForChat] =
    useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Support request state (the "Contact Support" action)
  const [supportSending, setSupportSending] = useState(false);
  const [supportResult, setSupportResult] = useState(null);
  const [supportError, setSupportError] = useState("");

  const fetchAppointments = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await getDoctorAppointments();
      // Store original notes to compare onBlur. A silent poll must not clobber
      // notes the doctor is mid-way through typing, so only adopt the server
      // value for rows that are not currently focused.
      setAppointments((previous) => {
        const editing = new Set(
          previous.filter((apt) => apt.notes !== apt.originalNotes).map((apt) => apt._id)
        );
        const next = (data || []).map((apt) => ({ ...apt, originalNotes: apt.notes || "" }));
        return next.map((apt) =>
          editing.has(apt._id)
            ? previous.find((item) => item._id === apt._id) || apt
            : apt
        );
      });
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (doctor.status === "approved") {
      fetchAppointments();
    }
  }, [doctor.status, fetchAppointments]);

  // Poll so a booking that lands while this tab is open actually shows up.
  useEffect(() => {
    if (doctor.status !== "approved") return undefined;
    const timer = setInterval(
      () => fetchAppointments({ silent: true }),
      REFRESH_MS
    );
    return () => clearInterval(timer);
  }, [doctor.status, fetchAppointments]);

  // Live nudge: refresh as soon as the notification channel fires, so a new
  // booking appears in seconds rather than at the next poll. Guarded because
  // subscribe() throws synchronously when Pusher is not configured.
  useEffect(() => {
    if (doctor.status !== "approved") return undefined;

    let cancelled = false;
    let client = null;
    const channelRef = { current: null };

    (async () => {
      try {
        const [{ pusherClient }, { getSessionPayload }] = await Promise.all([
          import("@/lib/pusher"),
          import("@/lib/session"),
        ]);
        const payload = await getSessionPayload();
        if (!payload?.sub || cancelled) return;

        client = pusherClient;
        const channel = pusherClient.subscribe(
          "private-carequest-user-" + payload.sub
        );
        channelRef.current = channel;
        channel.bind("appointment.booked", () =>
          fetchAppointments({ silent: true })
        );
        channel.bind("notification.created", () =>
          fetchAppointments({ silent: true })
        );
      } catch (error) {
        // Realtime unavailable; the poll above still keeps the list fresh.
      }
    })();

    return () => {
      cancelled = true;
      if (channelRef.current && client) {
        try {
          client.unsubscribe(channelRef.current.name);
        } catch {
          // ignore
        }
      }
    };
  }, [doctor.status, fetchAppointments]);

  // Reload when the tab becomes visible again (a doctor switching back from
  // another app should not stare at a stale schedule).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && doctor.status === "approved") {
        fetchAppointments({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [doctor.status, fetchAppointments]);

  const handleStatusUpdate = async (appointmentId, status, notes) => {
    setUpdatingAppointment(appointmentId);
    try {
      // `notes` is passed through ONLY when the caller actually has notes to
      // save. Omitting it keeps the server from touching the clinical record.
      if (notes === undefined) {
        await updateAppointmentStatus(appointmentId, status);
      } else {
        await updateAppointmentStatus(appointmentId, status, notes);
      }
      await fetchAppointments({ silent: true });
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setUpdatingAppointment(null);
    }
  };

  const handleContactSupport = async () => {
    setSupportSending(true);
    setSupportError("");
    setSupportResult(null);
    try {
      const result = await requestDoctorSupport({
        problem: `My doctor profile is ${doctor.status} and I need help with my ArkCare doctor account.`,
        category: "profile_review",
      });
      setSupportResult(result);
    } catch (error) {
      setSupportError(
        error?.message || "Could not reach support. Please try again."
      );
    } finally {
      setSupportSending(false);
    }
  };

  const handleOpenChat = (appointment) => {
    setSelectedAppointmentForChat(appointment);
    setIsChatModalOpen(true);
  };

  // Status is carried by a semantic Badge variant *and* the visible status
  // word, so it never depends on colour alone (spec §24).
  const getAppointmentStatusVariant = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "confirmed":
        return "info";
      case "completed":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const todayAppointments = appointments.filter((apt) => {
    const today = new Date().toDateString();
    return new Date(apt.appointmentDate).toDateString() === today;
  });

  const confirmedCount = appointments.filter(
    (apt) => apt.status === "confirmed"
  ).length;
  const pendingCount = appointments.filter(
    (apt) => apt.status === "pending"
  ).length;

  // Clinical priority order. The appointments are PARTITIONED into these
  // groups (order inside each group is the server order, untouched) purely so
  // the page reads top-down the way a clinician works: confirm first, then
  // consult, then the record of what already happened.
  const appointmentGroups = [
    {
      key: "pending",
      rule: "First · confirm",
      title: "Awaiting your confirmation",
      lede: "Confirm before the consultation — chat, calls and the report flow stay locked until then.",
      match: (status) => status === "pending",
    },
    {
      key: "confirmed",
      rule: "Next · consult",
      title: "Confirmed and ready to consult",
      lede: "Open the conversation or start a call, then file the report when the visit is done.",
      match: (status) => status === "confirmed",
    },
    {
      key: "closed",
      rule: "Then · the record",
      title: "Completed and cancelled",
      lede: "The record of what already happened. Filing a report commits an immutable, hashed record.",
      match: (status) => status === "completed" || status === "cancelled",
    },
    {
      key: "other",
      rule: "Other",
      title: "Other appointment states",
      lede: "Records in a state outside the clinical flow above.",
      match: (status, seen) => !seen.has(status),
    },
  ].map((group) => ({
    ...group,
    items: appointments.filter(
      (apt) =>
        group.key !== "other"
          ? group.match(apt.status)
          : group.match(apt.status, new Set(["pending", "confirmed", "completed", "cancelled"]))
    ),
  }));

  const visibleGroups = appointmentGroups.filter((group) => group.items.length);

  // One appointment record = one ledger row. No card per record: the record
  // list is the document, and the row is just a ruled band inside it.
  const renderAppointmentRow = (appointment) => (
    <article key={appointment._id} className="ledger-row">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="nm-stat-icon h-7 w-7 rounded-[9px]">
            <User className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          <h3 className="ledger-title">
            {appointment.patient?.name || "Patient not available"}
          </h3>
          {/* Status indicator: the one element whose change is animated, so a
              confirmed→completed flip is legible rather than a silent repaint. */}
          <Badge
            variant={getAppointmentStatusVariant(appointment.status)}
            data-status={appointment.status}
            className="transition-[background-color,color,box-shadow] duration-[var(--dur-3)] ease-[var(--ease-soft)]"
          >
            {appointment.status}
          </Badge>
        </div>

        {/* Date, time and presenting reason are clinical scheduling data: a
            near-opaque data surface, never behind a heavy blur. */}
        <div className="glass-data mt-3 rounded-[14px] px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
              {formatDate(appointment.appointmentDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              {new Date(appointment.appointmentDate).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {appointment.reason ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text)]">
              <span className="font-semibold text-[var(--text-strong)]">
                Reason:{" "}
              </span>
              {appointment.reason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="ledger-actions">
        <Select
          value={appointment.status}
          // No notes argument here on purpose: a status change must never write
          // over the clinical record. Notes are saved only from the textarea's
          // onBlur.
          onValueChange={(value) =>
            handleStatusUpdate(appointment._id, value)
          }
          disabled={updatingAppointment === appointment._id}
        >
          <SelectTrigger className="h-10 w-[168px] rounded-[14px] border border-transparent bg-[var(--surface-subtle)] px-3.5 text-[13px] font-semibold text-[var(--text)] shadow-[var(--shadow-inset)] focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {appointment.status === "pending" && (
              <SelectItem value="pending" disabled>
                Pending
              </SelectItem>
            )}
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {["confirmed", "completed"].includes(appointment.status) && (
          <Button
            variant="outline"
            onClick={() => handleOpenChat(appointment)}
            aria-label={`Chat with ${
              appointment.patient?.name || "patient"
            }`}
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
            Chat
            {appointment.status === "completed" ? (
              /* Copper hint: filing the report is what commits the immutable
                 record. */
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--copper-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--copper)]">
                <FileText className="h-3 w-3" strokeWidth={1.75} />
                Report
              </span>
            ) : null}
          </Button>
        )}
      </div>

      {/* Clinical notes: near-opaque data surface so typed record text is
          never read through a blur. */}
      <div className="col-span-full">
        <div className="glass-data rounded-[16px] p-1">
          <Textarea
            placeholder="Add notes for this appointment..."
            value={appointment.notes || ""}
            onChange={(e) => {
              setAppointments((prev) =>
                prev.map((apt) =>
                  apt._id === appointment._id
                    ? { ...apt, notes: e.target.value }
                    : apt
                )
              );
            }}
            onBlur={(e) => {
              if (e.target.value !== appointment.originalNotes) {
                handleStatusUpdate(
                  appointment._id,
                  appointment.status,
                  e.target.value
                );
              }
            }}
            rows={3}
            disabled={appointment.status === "cancelled"}
            className="border-transparent bg-[var(--surface)] text-[13px] shadow-none backdrop-blur-none"
          />
        </div>
      </div>
    </article>
  );

  return (
    <div className="nm-dash">
      <div className="nm-dash-col nm-stack">
        {/* --------------------------------- ink anchor: today's clinic, compact */}
        <Reveal>
          <section className="nm-dark-card p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">
                    Doctor workspace
                  </span>
                  <span className="nm-dark-elevated inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {doctor.status === "approved" ? (
                      <ShieldCheck
                        className="h-3 w-3 text-[var(--celadon-bright)]"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <Hourglass
                        className="h-3 w-3 text-[var(--copper-bright)]"
                        strokeWidth={1.75}
                      />
                    )}
                    <span
                      className={
                        doctor.status === "approved"
                          ? "text-[var(--celadon-bright)]"
                          : "text-[var(--copper-bright)]"
                      }
                    >
                      {doctor.status === "approved"
                        ? "Profile verified"
                        : "Review pending"}
                    </span>
                  </span>
                </div>

                <MaskedText
                  as="h1"
                  className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--dark-text)] md:text-[22px]"
                >
                  Today&apos;s clinic
                </MaskedText>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[var(--dark-muted)]">
                  Welcome back, {doctor.name}. Manage consultations, notes,
                  conversations, and your care schedule.
                </p>
              </div>

              {/* The day's shape: the one figure that earns emphasis, on a
                  near-opaque data surface with the supporting counts set
                  inline beside it rather than in their own tiles. */}
              <div className="glass-data flex shrink-0 items-center gap-4 rounded-[18px] px-5 py-4">
                <div className="nm-stat-icon shrink-0">
                  <Activity className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="nm-metric-xl">{todayAppointments.length}</div>
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    {todayAppointments.length === 1
                      ? "consultation today"
                      : "consultations today"}
                  </div>
                </div>
                <div className="hidden h-10 w-px bg-[var(--border-subtle)] sm:block" />
                <dl className="hidden sm:flex">
                  <div className="stat-inline pr-4! mr-4! border-r-0!">
                    <dt className="text-[var(--dark-muted)]!">Awaiting</dt>
                    <dd className="text-[var(--dark-text)]!">{pendingCount}</dd>
                  </div>
                  <div className="stat-inline">
                    <dt className="text-[var(--dark-muted)]!">Confirmed</dt>
                    <dd className="text-[var(--dark-text)]!">{confirmedCount}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-4">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--dark-muted)]">
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                Milestone layer ready
              </span>
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </div>
          </section>
        </Reveal>

        {doctor.status === "approved" ? (
          <Tabs defaultValue="appointments" className="nm-stack">
            <div className="flex flex-wrap items-center gap-3">
              <TabsList
                className="h-auto w-auto gap-1 rounded-[var(--radius-pill)] border
                  border-[var(--glass-edge)] bg-[var(--glass-2)] p-1 shadow-[var(--shadow-inset)]
                  backdrop-blur-[12px]
                  data-[orientation=horizontal]:flex-row"
              >
                <TabsTrigger
                  value="appointments"
                  className="h-9 rounded-[var(--radius-pill)] px-4 text-[12px] font-semibold
                    text-[var(--text-muted)] hover:text-[var(--text-strong)]
                    data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[#fff]
                    data-[state=active]:shadow-[var(--shadow-cta)]"
                >
                  Appointments
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="h-9 rounded-[var(--radius-pill)] px-4 text-[12px] font-semibold
                    text-[var(--text-muted)] hover:text-[var(--text-strong)]
                    data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[#fff]
                    data-[state=active]:shadow-[var(--shadow-cta)]"
                >
                  Profile
                </TabsTrigger>
              </TabsList>
              <p className="ml-auto text-[11px] font-medium text-[var(--text-muted)]">
                Status saves immediately &middot; notes save on blur
              </p>
            </div>

            <TabsContent value="appointments" className="nm-stack">
              {/* The day's shape: one inline figure row with hairline
                  dividers, not four identical tiles. */}
              <Reveal delay={60}>
                <section>
                  <div className="section-rule">
                    <span>Today at a glance</span>
                  </div>
                  <dl className="stat-strip">
                    <div className="stat-inline">
                      <dt>Scheduled today</dt>
                      <dd>
                        {todayAppointments.length}{" "}
                        <small>
                          {todayAppointments.length === 1
                            ? "consultation"
                            : "consultations"}
                        </small>
                      </dd>
                    </div>
                    <div className="stat-inline">
                      <dt>Awaiting confirmation</dt>
                      <dd>{pendingCount}</dd>
                    </div>
                    <div className="stat-inline">
                      <dt>Ready to consult</dt>
                      <dd>{confirmedCount}</dd>
                    </div>
                    <div className="stat-inline">
                      <dt>All appointments</dt>
                      <dd>{appointments.length}</dd>
                    </div>
                  </dl>
                </section>
              </Reveal>

              {/* Appointments, as a record ledger rather than a wall of
                  identical cards. Sections run in clinical priority order. */}
              <Reveal delay={120}>
                <section className="nm-stack">
                  {loading ? (
                    <div className="glass-data rounded-[18px] p-10 text-center text-[13px] text-muted-foreground">
                      Loading appointments...
                    </div>
                  ) : appointments.length > 0 ? (
                    visibleGroups.map((group) => (
                      <div key={group.key}>
                        <div className="section-rule">
                          <span>{group.rule}</span>
                        </div>
                        <div className="section-head">
                          <h2 className="section-title">
                            {group.title}{" "}
                            <span className="text-[13px] font-normal text-[var(--text-muted)]">
                              ({group.items.length})
                            </span>
                          </h2>
                          <p className="section-lede">{group.lede}</p>
                        </div>
                        <div className="ledger">
                          <div className="ledger-head">
                            <span>Patient and presenting reason</span>
                            <span>Status and action</span>
                          </div>
                          {group.items.map(renderAppointmentRow)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <div className="section-rule">
                        <span>Schedule</span>
                      </div>
                      <div className="section-head">
                        <h2 className="section-title">No appointments yet</h2>
                        <p className="section-lede">
                          Patients can book with you as soon as your profile is
                          approved.
                        </p>
                      </div>
                      <div className="glass-data flex flex-col items-center rounded-[18px] p-10 text-center">
                        <Calendar
                          className="h-5 w-5 text-[var(--text-muted)]"
                          strokeWidth={1.75}
                        />
                        <p className="mt-3 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                          Nothing is booked for you yet. Once a patient books,
                          the appointment appears here with its status and
                          clinical notes.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </Reveal>
            </TabsContent>

            <TabsContent value="profile" className="nm-stack">
              {/* Credentials read as a reference document: key/value pairs and
                  ruled rows, not four tiles in a card. */}
              <section>
                <div className="section-rule">
                  <span>Credentials</span>
                </div>
                <div className="section-head">
                  <h2 className="section-title">Profile information</h2>
                  <p className="section-lede">
                    The details patients see when they book, and the basis for
                    the clinical review of your profile.
                  </p>
                </div>

                <div className="glass-data rounded-[18px] px-4 py-3.5">
                  <dl className="dl-grid">
                    <dt>Specialization</dt>
                    <dd>{doctor.specialization}</dd>
                    <dt>Category</dt>
                    <dd>{doctor.category}</dd>
                    <dt>Experience</dt>
                    <dd>{doctor.experience} years</dd>
                    <dt>Consultation fee</dt>
                    <dd>₹{doctor.consultationFee}</dd>
                  </dl>
                </div>

                <div className="section-rule">
                  <span>Qualifications</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doctor.qualifications?.map((qual, index) => (
                    <Badge key={index} variant="secondary">
                      {qual}
                    </Badge>
                  ))}
                </div>

                <div className="section-rule">
                  <span>Availability</span>
                </div>
                <div className="ledger">
                  <div className="ledger-head">
                    <span>Day</span>
                    <span>Open slots</span>
                  </div>
                  {doctor.availability?.map((avail, index) => (
                    <div
                      key={index}
                      className="ledger-row grid-cols-1! gap-2! sm:grid-cols-[minmax(0,1fr)_auto]!"
                    >
                      <span className="ledger-title inline-flex items-center gap-2">
                        <Calendar
                          className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
                          strokeWidth={1.75}
                        />
                        {avail.day}
                      </span>
                      <div className="ledger-actions justify-self-start! sm:justify-self-end!">
                        {avail.slots?.map((slot, slotIndex) => (
                          <span key={slotIndex} className="cq-pixel-label">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        ) : (
          /* Not yet approved: a status notice on a data surface, not a card. */
          <section>
            <div className="section-rule">
              <span>Verification</span>
            </div>
            <div className="glass-data rounded-[18px] p-8 text-center">
              <div className="mx-auto flex w-fit items-center gap-2">
                <AlertCircle
                  className="h-5 w-5 text-[var(--warning)]"
                  strokeWidth={1.75}
                />
                <span className="cq-pixel-label cq-sim-label">Under review</span>
              </div>
              <h2 className="mt-4 text-[15px] font-semibold text-[var(--text-strong)]">
                Profile under review
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                Thank you for submitting your profile. Our team is reviewing
                your application and will notify you once it&apos;s approved.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleContactSupport}
                  disabled={supportSending}
                >
                  <Siren className="h-4 w-4" strokeWidth={1.75} />
                  {supportSending ? "Sending request..." : "Contact Support"}
                </Button>

                {supportResult && (
                  /* Reference hash is proof data: mono, near-opaque, fully
                     legible. */
                  <div className="glass-data flex items-center justify-center gap-2 rounded-[14px] px-3.5 py-2.5 text-[12px] text-[var(--success)]">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                    <span>
                      Support request sent. Reference{" "}
                      <span className="font-mono text-[11px]">
                        {supportResult.requestHash?.slice(0, 12)}
                      </span>
                      {supportResult.notifiedStaff > 0
                        ? ` — ${supportResult.notifiedStaff} coordinator${
                            supportResult.notifiedStaff === 1 ? "" : "s"
                          } notified`
                        : ""}
                      .
                    </span>
                  </div>
                )}
                {supportError && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[var(--destructive)]">
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {supportError}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {selectedAppointmentForChat && (
          <ChatModal
            appointment={selectedAppointmentForChat}
            isOpen={isChatModalOpen}
            onClose={() => {
              setIsChatModalOpen(false);
              setSelectedAppointmentForChat(null);
            }}
          />
        )}
      </div>

      {/* --------------------------------------------- right insight rail */}
      <Reveal delay={90}>
        <aside className="nm-rail nm-stack-sm">
          {/* Triage. The single ink anchor on this screen is the clinic header
              in the main column, so the rail stays pale and reads as a
              sidebar index rather than a second competing block. */}
          <div>
            <div className="section-rule m-0! mb-2!">
              <span>Needs attention</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="nm-metric-xl">{pendingCount}</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                awaiting your confirmation
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              Chat, calls and the report flow stay locked until an appointment
              is confirmed.
            </p>
            <Link
              href="/doctor/escalations"
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[13px] bg-[var(--primary-soft)] px-3 text-[12px] font-semibold text-[var(--celadon)] transition-colors hover:bg-[var(--celadon-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--celadon-bright)]/60"
            >
              <Siren className="h-4 w-4" strokeWidth={1.75} />
              Open escalations
              <ArrowUpRight
                className="h-3.5 w-3.5 opacity-70"
                strokeWidth={1.75}
              />
            </Link>
          </div>

          <div className="h-px w-full bg-[var(--border)]" />

          <div>
            <div className="section-rule m-0! mb-2!">
              <span>The day&apos;s shape</span>
            </div>
            {todayAppointments.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Nothing scheduled today. Confirmed appointments for the day
                appear here with their times.
              </p>
            ) : (
              <div className="timeline">
                {todayAppointments
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.appointmentDate) -
                      new Date(b.appointmentDate)
                  )
                  .map((apt, index, list) => (
                    <div
                      key={apt._id}
                      className="timeline-item pb-3!"
                      data-tone={index === list.length - 1 ? "muted" : undefined}
                    >
                      <div className="timeline-time">
                        {new Date(apt.appointmentDate).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="timeline-title">
                        {apt.patient?.name || "Patient"}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="h-px w-full bg-[var(--border)]" />

          <div>
            <div className="section-rule m-0! mb-2!">
              <span>Queue health</span>
            </div>
            <dl className="stat-strip">
              <div className="stat-inline">
                <dt>Awaiting</dt>
                <dd>{pendingCount}</dd>
              </div>
              <div className="stat-inline">
                <dt>Ready</dt>
                <dd>{confirmedCount}</dd>
              </div>
              <div className="stat-inline">
                <dt>Total</dt>
                <dd>{appointments.length}</dd>
              </div>
            </dl>
          </div>

          <div className="h-px w-full bg-[var(--border)]" />

          <div>
            <div className="section-rule m-0! mb-2!">
              <span>Clinical workspace</span>
            </div>
            <div className="nm-stack-sm">
              <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
                <Stethoscope
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span>
                  Mark an appointment confirmed before the consultation so
                  chat, calls and the report flow unlock.
                </span>
              </p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Notes save when you leave the field. A status change never
                rewrites the clinical record.
              </p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                AI may draft education and follow-up questions only. It cannot
                prescribe, change doses, publish, or approve.
              </p>
            </div>
          </div>
        </aside>
      </Reveal>
    </div>
  );
}
