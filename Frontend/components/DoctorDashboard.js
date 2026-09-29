"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  User,
  Users,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  getDoctorAppointments,
  updateAppointmentStatus,
  requestDoctorSupport,
} from "@/actions/appointmentActions";
import ChatModal from "./ChatModal";
import NotificationBell from "./NotificationBell";
import { AlertCircle } from "lucide-react";

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

  return (
    <div className="nm-dash">
      <div className="nm-dash-col">
        {/* ------------------------------------------- dark anchor: today at a glance */}
        <section className="nm-dark-card p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="nm-stat-icon shrink-0">
                <Activity className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="cq-pixel-label bg-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.88)]">
                    Doctor workspace
                  </span>
                  <span
                    className={
                      doctor.status === "approved"
                        ? "cq-pixel-label cq-real-label"
                        : "cq-pixel-label cq-sim-label"
                    }
                  >
                    {doctor.status === "approved"
                      ? "Profile verified"
                      : "Review pending"}
                  </span>
                </div>
                <h1 className="text-[20px] font-bold leading-tight tracking-[-0.01em] text-[#fff] md:text-[22px]">
                  Care operations
                </h1>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--dark-muted)]">
                  Welcome back, {doctor.name}. Manage consultations, notes,
                  conversations, and your care schedule.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden items-center gap-2 rounded-[14px] bg-[rgba(255,255,255,0.10)] px-3.5 py-2.5 text-[11px] font-semibold text-[rgba(255,255,255,0.92)] sm:inline-flex">
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                Milestone layer ready
              </span>
              <NotificationBell />
            </div>
          </div>
        </section>

        {doctor.status === "approved" ? (
          <Tabs defaultValue="appointments" className="nm-stack">
            <TabsList
              className="h-auto w-auto gap-1 rounded-[var(--radius-pill)] border-0
                bg-[var(--surface-subtle)] p-1 shadow-[var(--shadow-inset)]
                data-[orientation=horizontal]:flex-row"
            >
              <TabsTrigger
                value="appointments"
                className="h-9 rounded-[var(--radius-pill)] px-4 text-[12px] font-semibold
                  text-[var(--text-muted)] hover:text-[var(--text-strong)]
                  data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[#fff]
                  data-[state=active]:shadow-[0_6px_14px_rgba(16,14,26,0.16)]"
              >
                Appointments
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="h-9 rounded-[var(--radius-pill)] px-4 text-[12px] font-semibold
                  text-[var(--text-muted)] hover:text-[var(--text-strong)]
                  data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[#fff]
                  data-[state=active]:shadow-[0_6px_14px_rgba(16,14,26,0.16)]"
              >
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="nm-stack">
              {/* metric tiles */}
              <div className="nm-primary-row">
                <div className="nm-stat">
                  <div className="nm-stat-icon">
                    <CalendarCheck2 className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="mt-3 nm-stat-value">{todayAppointments.length}</div>
                  <div className="nm-stat-label">
                    {todayAppointments.length === 0
                      ? "No appointments today"
                      : "scheduled today"}
                  </div>
                </div>
                <div className="nm-stat">
                  <div className="nm-stat-icon">
                    <Users className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="mt-3 nm-stat-value">{appointments.length}</div>
                  <div className="nm-stat-label">Total appointments</div>
                </div>
                <div className="nm-stat">
                  <div className="nm-stat-icon">
                    <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="mt-3 nm-stat-value">{confirmedCount}</div>
                  <div className="nm-stat-label">Confirmed consults</div>
                </div>
              </div>

              {/* appointments */}
              <section className="nm-stack">
                <header className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="cq-kicker">Schedule</div>
                    <h2 className="cq-section-title mt-1">All appointments</h2>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Status saves immediately &middot; notes save on blur
                  </p>
                </header>

                {loading ? (
                  <div className="cq-card p-10 text-center text-[13px] text-muted-foreground">
                    Loading appointments...
                  </div>
                ) : appointments.length > 0 ? (
                  <div className="nm-stack-sm">
                    {appointments.map((appointment) => (
                      <article
                        key={appointment._id}
                        className="cq-card cq-card-hover p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <User
                                className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                                strokeWidth={1.75}
                              />
                              <span className="nm-card-title text-[14px]">
                                {appointment.patient?.name ||
                                  "Patient not available"}
                              </span>
                              <Badge
                                variant={getAppointmentStatusVariant(
                                  appointment.status
                                )}
                              >
                                {appointment.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar
                                  className="h-4 w-4"
                                  strokeWidth={1.75}
                                />
                                {new Date(
                                  appointment.appointmentDate
                                ).toLocaleDateString()}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-4 w-4" strokeWidth={1.75} />
                                {new Date(
                                  appointment.appointmentDate
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {appointment.reason ? (
                              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text)]">
                                <span className="font-semibold text-[var(--text-strong)]">
                                  Reason:{" "}
                                </span>
                                {appointment.reason}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
                          <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto">
                            <Select
                              value={appointment.status}
                              // No notes argument here on purpose: a status change
                              // must never write over the clinical record. Notes are
                              // saved only from the textarea's onBlur.
                              onValueChange={(value) =>
                                handleStatusUpdate(appointment._id, value)
                              }
                              disabled={updatingAppointment === appointment._id}
                            >
                              <SelectTrigger className="h-10 w-full rounded-[14px] border border-transparent bg-[var(--surface-subtle)] px-3.5 text-[13px] font-semibold text-[var(--text)] shadow-[var(--shadow-inset)] focus-visible:ring-2 focus-visible:ring-ring/40 md:w-[190px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {appointment.status === "pending" && (
                                  <SelectItem value="pending" disabled>
                                    Pending
                                  </SelectItem>
                                )}
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {["confirmed", "completed"].includes(
                              appointment.status
                            ) && (
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
                                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                                    + Report
                                  </span>
                                ) : null}
                              </Button>
                            )}
                          </div>
                          <div className="w-full flex-1">
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
                                if (
                                  e.target.value !== appointment.originalNotes
                                ) {
                                  handleStatusUpdate(
                                    appointment._id,
                                    appointment.status,
                                    e.target.value
                                  );
                                }
                              }}
                              rows={3}
                              disabled={appointment.status === "cancelled"}
                              className="text-[13px]"
                            />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cq-card p-10 text-center">
                    <div className="nm-stat-icon mx-auto">
                      <Calendar className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-4 nm-card-title text-[14px]">
                      No appointments yet
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                      Patients will be able to book appointments with you once
                      your profile is approved.
                    </p>
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="profile" className="nm-stack">
              <Card className="cq-card gap-0 p-0">
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="nm-stat-icon">
                      <User className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <CardTitle>Profile information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="nm-stack pb-6">
                  <div className="nm-grid-2">
                    {[
                      ["Specialization", doctor.specialization],
                      ["Category", doctor.category],
                      ["Experience", `${doctor.experience} years`],
                      ["Consultation fee", `₹${doctor.consultationFee}`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[18px] bg-[var(--surface-subtle)] p-4 shadow-[var(--shadow-inset)]"
                      >
                        <div className="cq-kicker">{label}</div>
                        <p className="mt-1.5 text-[15px] font-semibold text-[var(--text-strong)]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="cq-kicker">Qualifications</div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {doctor.qualifications?.map((qual, index) => (
                        <Badge key={index} variant="secondary">
                          {qual}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="cq-kicker">Availability</div>
                    <div className="mt-2.5 nm-stack-sm">
                      {doctor.availability?.map((avail, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-start gap-3 border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
                        >
                          <Calendar
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                            strokeWidth={1.75}
                          />
                          <span className="w-24 shrink-0 text-[13px] font-semibold text-[var(--text-strong)]">
                            {avail.day}
                          </span>
                          <div className="flex flex-1 flex-wrap gap-1.5">
                            {avail.slots?.map((slot, slotIndex) => (
                              <span
                                key={slotIndex}
                                className="cq-pixel-label"
                              >
                                {slot}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="cq-card gap-0 p-0">
            <CardContent className="p-10 text-center">
              <div className="nm-stat-icon mx-auto">
                <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-strong)]">
                Profile under review
              </h3>
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
                  {supportSending ? "Sending request..." : "Contact Support"}
                </Button>

                {supportResult && (
                  <p className="text-[12px] text-[var(--success)]">
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
                  </p>
                )}
                {supportError && (
                  <p className="text-[12px] text-[var(--destructive)]">
                    {supportError}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
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
      <aside className="nm-rail">
        <div>
          <div className="cq-kicker">Today</div>
          <div className="mt-1.5 nm-metric-xl">{todayAppointments.length}</div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {todayAppointments.length === 0
              ? "Nothing scheduled today."
              : `consultation${
                  todayAppointments.length === 1 ? "" : "s"
                } scheduled today.`}
          </p>
        </div>

        <div className="h-px w-full bg-[var(--border)]" />

        <div>
          <div className="cq-kicker">Queue health</div>
          <div className="mt-2 nm-stack-sm">
            <div className="nm-row grid-cols-[1fr_auto]">
              <span className="text-[12px] text-muted-foreground">
                Awaiting confirmation
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-strong)]">
                {pendingCount}
              </span>
            </div>
            <div className="nm-row grid-cols-[1fr_auto]">
              <span className="text-[12px] text-muted-foreground">
                Ready to consult
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-strong)]">
                {confirmedCount}
              </span>
            </div>
            <div className="nm-row grid-cols-[1fr_auto]">
              <span className="text-[12px] text-muted-foreground">
                All appointments
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-strong)]">
                {appointments.length}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-[var(--border)]" />

        <div>
          <div className="cq-kicker">Clinical workspace</div>
          <div className="mt-2.5 nm-stack-sm">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Mark an appointment confirmed before the consultation so chat,
              calls and the report flow unlock.
            </p>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Notes save when you leave the field. A status change never
              rewrites the clinical record.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
