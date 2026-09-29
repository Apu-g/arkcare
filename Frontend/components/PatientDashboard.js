"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    Brain,
    Calendar,
    CheckCircle2,
    CreditCard,
    Eye,
    Heart,
    MessageCircle,
    Shield,
    Sparkles,
    Star,
    Stethoscope,
    User,
    Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import BookAppointmentModal from "./BookAppointmentModal";
import ChatModal from "./ChatModal";
import {
    cancelPatientAppointment,
    getPatientAppointments,
} from "@/actions/appointmentActions";

/* Status chips use the semantic palette (design spec §22). */
const STATUS_TONE = {
    pending: "warning",
    confirmed: "success",
    completed: "info",
    cancelled: "destructive",
};

const CATEGORY_ICON = {
    cardiology: Heart,
    neurology: Brain,
    dermatology: Shield,
    ophthalmology: Eye,
    general: Activity,
};

/* Dark anchor card: the single strong visual anchor per screen (spec §12).
   Everything around it is editorial — a rule + heading, then inline figures —
   so the anchor actually reads as the anchor instead of one box among many. */
const DashboardHeader = ({ doctorCount, appointmentCount, nextAppointment }) => (
    <Reveal>
        <section className="nm-dash">
            <div className="nm-dash-col nm-stack">
                <div className="nm-dark-card p-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">
                            Patient journey
                        </span>
                        <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">
                            Care missions ready
                        </span>
                    </div>
                    <MaskedText
                        as="h1"
                        className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.01em] text-[var(--dark-text)] md:text-[26px]"
                    >
                        Your care command center
                    </MaskedText>
                    <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--dark-muted)]">
                        Find doctors, complete consultations, understand reports, and build a
                        continuous health journey.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Link href="/health" className="nm-btn-primary">
                            <Heart className="h-4 w-4" strokeWidth={1.75} />
                            Health Journey
                        </Link>
                        <Link
                            href="/chatbot"
                            className="nm-dark-elevated inline-flex min-h-10 items-center gap-2 rounded-[14px] px-4 text-[13px] font-semibold text-[var(--dark-text)] transition hover:bg-white/10"
                        >
                            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                            AI Guide
                        </Link>
                    </div>
                </div>

                {/* Figures set inline, not as two more tiles. */}
                <div>
                    <div className="section-rule">At a glance</div>
                    <div className="section-head">
                        <h2 className="section-title">Your care so far</h2>
                        <p className="section-lede">
                            A running count of the people you can consult and the visits you
                            have already booked.
                        </p>
                    </div>
                    <dl className="stat-strip">
                        <div className="stat-inline">
                            <dt>Doctors available</dt>
                            <dd>
                                {doctorCount}
                                <small> in network</small>
                            </dd>
                        </div>
                        <div className="stat-inline">
                            <dt>Your appointments</dt>
                            <dd>
                                {appointmentCount}
                                <small> on record</small>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            <aside className="nm-rail">
                <div>
                    <div className="cq-kicker">Next up</div>
                    <h2 className="nm-card-title mt-1 text-[14px]">
                        {nextAppointment ? "Upcoming visit" : "Nothing booked"}
                    </h2>
                </div>
                {nextAppointment ? (
                    // Date + time are clinical scheduling data: near-opaque surface.
                    <div className="glass-data rounded-[18px] p-4">
                        <div className="text-[13px] font-semibold text-[var(--text-strong)]">
                            {nextAppointment.doctor?.name || "Doctor"}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                            {nextAppointment.doctor?.specialization}
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                            {new Date(nextAppointment.appointmentDate).toLocaleString("en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            })}
                        </div>
                    </div>
                ) : (
                    <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                        Book a consultation and your next visit will appear here with the time
                        and doctor.
                    </p>
                )}

                <div className="border-t border-[var(--border-subtle)] pt-4">
                    <div className="cq-kicker">Shortcuts</div>
                    <div className="mt-1.5">
                        {[
                            { href: "/patient/carequest", label: "CareQuest missions", icon: Zap },
                            { href: "/patient/care-plans", label: "My care plan", icon: CheckCircle2 },
                            { href: "/reports", label: "Reports & prescriptions", icon: Activity },
                            { href: "/patient/hospitals", label: "Hospitals", icon: Shield },
                        ].map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="nm-row justify-start text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                            >
                                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            </aside>
        </section>
    </Reveal>
);

const CategoryFilters = ({ categories, selectedCategory, setSelectedCategory }) => (
    <div className="flex flex-wrap items-center gap-2">
        <span className="cq-kicker mr-1">Specialization</span>
        {categories.map((category) => {
            const Icon = category === "all" ? null : CATEGORY_ICON[category.toLowerCase()] || Activity;
            const active = selectedCategory === category;
            return (
                <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={active}
                    className="nm-pill inline-flex min-h-9 items-center gap-1.5 px-3.5"
                    data-active={active ? "true" : "false"}
                >
                    {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={1.75} /> : null}
                    <span className="capitalize">
                        {category === "all" ? "All doctors" : category}
                    </span>
                </button>
            );
        })}
    </div>
);

const DoctorCard = ({ doctor, onBookAppointment }) => (
    <article className="cq-card cq-card-hover flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-[var(--text-strong)]">
                    {doctor.name}
                </h3>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--text-muted)]">
                    {doctor.specialization}
                </p>
            </div>
            <div className="nm-stat-icon h-9 w-9 shrink-0 rounded-[12px]">
                <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
            </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-[var(--accent-gold)]" strokeWidth={1.75} />
                {doctor.experience} yrs
            </span>
            {/* An amount, so it gets the near-opaque data surface, not a blur. */}
            <span className="glass-data inline-flex items-center gap-1.5 rounded-[10px] px-2 py-1 font-semibold text-[var(--text-strong)]">
                <CreditCard className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />₹
                {doctor.consultationFee}
            </span>
        </div>

        {doctor.qualifications?.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
                {doctor.qualifications.slice(0, 2).map((qual, index) => (
                    <Badge key={index} variant="secondary">
                        {qual}
                    </Badge>
                ))}
                {doctor.qualifications.length > 2 ? (
                    <Badge variant="outline">+{doctor.qualifications.length - 2} more</Badge>
                ) : null}
            </div>
        ) : null}

        <button
            type="button"
            onClick={() => onBookAppointment(doctor)}
            className="nm-btn-primary mt-5 w-full"
        >
            <Calendar className="h-4 w-4" strokeWidth={1.75} />
            Book appointment
        </button>
    </article>
);

/* Appointments are records, so they read as a ledger: hairline-separated rows
   with a title, the metadata, and the actions that apply to that record. The
   payment and notes blocks span the full row width beneath it. */
const AppointmentRow = ({ appointment, onOpenChat, onCancel, cancelling }) => {
    const tone = STATUS_TONE[appointment.status] || STATUS_TONE.pending;
    return (
        <article className="ledger-row">
            <div className="min-w-0">
                <h3 className="ledger-title flex flex-wrap items-center gap-2">
                    {appointment.doctor?.name || "N/A"}
                    <Badge variant={tone} className="capitalize">
                        {appointment.status}
                    </Badge>
                </h3>
                <p className="ledger-meta mt-0.5">
                    {appointment.doctor?.specialization || "N/A"}
                </p>
                {/* Appointment datetime is medical scheduling data: solid, not blurred. */}
                <p className="ledger-meta mt-1.5 flex items-start gap-2 font-semibold text-[var(--text-strong)]">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    {new Date(appointment.appointmentDate).toLocaleString("en-US", {
                        dateStyle: "full",
                        timeStyle: "short",
                    })}
                </p>
            </div>

            {appointment.status === "confirmed" ? (
                <div className="ledger-actions">
                    <button
                        type="button"
                        onClick={() => onOpenChat(appointment)}
                        className="nm-btn-secondary"
                    >
                        <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                        Chat with doctor
                    </button>
                    {new Date(appointment.appointmentDate) > new Date() ? (
                        <button
                            type="button"
                            onClick={() => onCancel(appointment)}
                            disabled={cancelling}
                            className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-[var(--destructive-soft)] px-4 text-[13px] font-semibold text-[var(--destructive)] transition hover:brightness-95 disabled:opacity-50"
                        >
                            {cancelling
                                ? "Cancelling..."
                                : appointment.payment?.provider === "razorpay"
                                  ? "Cancel & refund"
                                  : "Cancel appointment"}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {(appointment.payment ||
                appointment.paymentId ||
                appointment.reason ||
                appointment.notes ||
                (appointment.status === "cancelled" && appointment.cancellationReason)) ? (
                <div className="col-[1/-1] mt-1 grid gap-2.5">
                    {appointment.payment ? (
                        // Amounts and payment ids: near-opaque data surface.
                        <div className="well">
                            <div className="flex flex-wrap items-center gap-2">
                                <CreditCard className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.75} />
                                <span className="text-[12px] font-semibold text-[var(--text-strong)]">
                                    {appointment.payment.provider === "razorpay"
                                        ? "Razorpay"
                                        : "Demo payment"}
                                </span>
                                <span className="cq-pixel-label">
                                    {String(appointment.payment.status || "unknown").toUpperCase()}
                                </span>
                            </div>
                            <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                                {appointment.payment.provider === "razorpay" ? (
                                    <>
                                        <div>
                                            Paid: ₹
                                            {Number(appointment.payment.grossAmount || 0).toLocaleString("en-IN")}
                                            {appointment.payment.paymentMethod
                                                ? ` · ${String(appointment.payment.paymentMethod).toUpperCase()}`
                                                : ""}
                                            {Number(appointment.payment.refundAmount || 0) > 0
                                                ? ` · Refunded ₹${Number(
                                                      appointment.payment.refundAmount
                                                  ).toLocaleString("en-IN")}`
                                                : ""}
                                        </div>
                                        {appointment.payment.paymentId ? (
                                            <div className="break-all font-mono">
                                                Payment {appointment.payment.paymentId}
                                            </div>
                                        ) : null}
                                        {appointment.payment.orderId ? (
                                            <div className="break-all font-mono">
                                                Order {appointment.payment.orderId}
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div>Synthetic demo booking · no money charged</div>
                                )}
                            </div>
                        </div>
                    ) : appointment.paymentId ? (
                        <div className="well flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                            <CreditCard className="h-4 w-4" strokeWidth={1.75} />Paid: ₹
                            {appointment.amount}
                        </div>
                    ) : null}

                    {appointment.reason ? (
                        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text-strong)]">Reason: </span>
                            {appointment.reason}
                        </p>
                    ) : null}
                    {appointment.notes ? (
                        <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text-strong)]">
                                Doctor&apos;s notes:{" "}
                            </span>
                            {appointment.notes}
                        </p>
                    ) : null}
                    {appointment.status === "cancelled" && appointment.cancellationReason ? (
                        <p className="rounded-[12px] bg-[var(--destructive-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--destructive)]">
                            Cancelled: {appointment.cancellationReason}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
};

export default function PatientDashboard({ doctors }) {
    const searchParams = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppointmentForChat, setSelectedAppointmentForChat] = useState(null);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("find-doctors");
    const [cancellingId, setCancellingId] = useState("");
    const [appointmentMessage, setAppointmentMessage] = useState("");

    useEffect(() => {
        fetchAppointments();
        const tabParam = searchParams.get("tab");
        if (tabParam === "my-appointments") {
            setActiveTab("my-appointments");
        }
    }, [searchParams]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const data = await getPatientAppointments();
            setAppointments(data);
        } catch (error) {
            console.error("Error fetching appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = (doctor) => {
        setSelectedDoctor({ ...doctor, _id: doctor._id?.toString() });
        setIsBookingModalOpen(true);
    };

    const handleOpenChat = (appointment) => {
        setSelectedAppointmentForChat(appointment);
        setIsChatModalOpen(true);
    };

    const handleCancelAppointment = async (appointment) => {
        const isPaid = appointment.payment?.provider === "razorpay";
        const confirmed = window.confirm(
            isPaid
                ? "Cancel this appointment and start the Razorpay refund?"
                : "Cancel this appointment?"
        );
        if (!confirmed) return;

        setCancellingId(appointment._id);
        setAppointmentMessage("");

        try {
            const result = await cancelPatientAppointment(
                appointment._id,
                "Cancelled by patient from My Appointments"
            );

            setAppointmentMessage(
                result?.refund?.refunded
                    ? "Appointment cancelled. Razorpay refund was initiated to the original payment method."
                    : "Appointment cancelled."
            );
            await fetchAppointments();
        } catch (error) {
            setAppointmentMessage(
                error.message || "Could not cancel this appointment"
            );
        } finally {
            setCancellingId("");
        }
    };

    const doctorsByCategory = doctors.reduce((acc, doctor) => {
        acc[doctor.category] = acc[doctor.category] || [];
        acc[doctor.category].push(doctor);
        return acc;
    }, {});

    const categories = ["all", ...Object.keys(doctorsByCategory)];
    const filteredDoctors =
        selectedCategory === "all" ? doctors : doctorsByCategory[selectedCategory] || [];

    // The next visit drives the insight rail, so the patient sees what is
    // coming without hunting through the appointment list.
    const nextAppointment = appointments
        .filter(
            (item) =>
                ["confirmed", "pending"].includes(item.status) &&
                new Date(item.appointmentDate) >= new Date()
        )
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))[0];

    return (
        <div className="nm-stack">
            <DashboardHeader
                doctorCount={doctors.length}
                appointmentCount={appointments.length}
                nextAppointment={nextAppointment}
            />

            <Reveal delay={90}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="nm-stack">
                    <div className="section-rule">Care</div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            <TabsList className="flex w-auto gap-2 border-0 bg-transparent p-0">
                                <TabsTrigger
                                    value="find-doctors"
                                    className="nm-pill inline-flex min-h-9 items-center gap-1.5 border-0 px-3.5 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white data-[state=inactive]:bg-[var(--surface-subtle)] data-[state=inactive]:text-[var(--text-muted)]"
                                >
                                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                                    Find doctors
                                </TabsTrigger>
                                <TabsTrigger
                                    value="my-appointments"
                                    className="nm-pill inline-flex min-h-9 items-center gap-1.5 border-0 px-3.5 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white data-[state=inactive]:bg-[var(--surface-subtle)] data-[state=inactive]:text-[var(--text-muted)]"
                                >
                                    <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                                    My appointments
                                    {appointments.length ? (
                                        <span className="ml-0.5 rounded-full bg-[var(--surface-muted)] px-1.5 text-[10px] font-semibold data-[state=active]:bg-white/20">
                                            {appointments.length}
                                        </span>
                                    ) : null}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <p className="section-lede">
                            {activeTab === "find-doctors"
                                ? "Every clinician in the network, filterable by specialization. Book a slot directly from a card."
                                : "Every consultation you have booked, newest information first, with payment and notes on the record."}
                        </p>
                    </div>

                    <TabsContent value="find-doctors" className="nm-stack">
                        <CategoryFilters
                            categories={categories}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                        />
                        {filteredDoctors.length > 0 ? (
                            /* A doctor is a distinct entity the patient acts on, so a
                               card per doctor is correct here — this is the one place
                               a repeated card grid is the right answer. */
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {filteredDoctors.map((doctor) => (
                                    <DoctorCard
                                        key={doctor._id}
                                        doctor={doctor}
                                        onBookAppointment={handleBookAppointment}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="py-12 text-center text-[13px] text-[var(--text-muted)]">
                                No doctors found for this category.
                            </p>
                        )}
                    </TabsContent>

                    <TabsContent value="my-appointments" className="nm-stack">
                        {appointmentMessage ? (
                            <div
                                role="status"
                                className="glass-data rounded-[16px] px-4 py-3 text-[13px] text-[var(--text-muted)]"
                            >
                                {appointmentMessage}
                            </div>
                        ) : null}
                        {loading ? (
                            <p className="py-12 text-center text-[13px] text-[var(--text-muted)]">
                                Loading appointments…
                            </p>
                        ) : appointments.length > 0 ? (
                            <div className="ledger">
                                <div className="ledger-head">
                                    <span>Consultation</span>
                                    <span>
                                        {appointments.length}{" "}
                                        {appointments.length === 1 ? "record" : "records"}
                                    </span>
                                </div>
                                {appointments.map((appointment) => (
                                    <AppointmentRow
                                        key={appointment._id}
                                        appointment={appointment}
                                        onOpenChat={handleOpenChat}
                                        onCancel={handleCancelAppointment}
                                        cancelling={cancellingId === appointment._id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="plain-panel py-14 text-center">
                                <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--surface-subtle)]">
                                    <User className="h-6 w-6 text-[var(--text-subtle)]" strokeWidth={1.5} />
                                </div>
                                <h3 className="mt-4 text-[16px] font-semibold text-[var(--text-strong)]">
                                    No appointments yet
                                </h3>
                                <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--text-muted)]">
                                    Book your first consultation and it will be listed here as a
                                    record, with the time, doctor and payment details.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("find-doctors")}
                                    className="nm-btn-primary mt-5"
                                >
                                    <Calendar className="h-4 w-4" strokeWidth={1.75} />
                                    Find doctors
                                </button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </Reveal>

            {selectedDoctor ? (
                <BookAppointmentModal
                    doctor={selectedDoctor}
                    isOpen={isBookingModalOpen}
                    onClose={() => {
                        setIsBookingModalOpen(false);
                        setSelectedDoctor(null);
                        fetchAppointments();
                    }}
                    onViewAppointments={() => {
                        setActiveTab("my-appointments");
                        setIsBookingModalOpen(false);
                        setSelectedDoctor(null);
                        void fetchAppointments();
                    }}
                />
            ) : null}
            {selectedAppointmentForChat ? (
                <ChatModal
                    appointment={selectedAppointmentForChat}
                    isOpen={isChatModalOpen}
                    onClose={() => setIsChatModalOpen(false)}
                />
            ) : null}
        </div>
    );
}
