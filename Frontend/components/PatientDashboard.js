"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Activity,
    Brain,
    Calendar,
    CalendarClock,
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

const STATUS_CLASS = {
    pending: "bg-[rgba(244,198,78,0.18)] text-[#9A7316]",
    confirmed: "bg-[rgba(49,185,120,0.12)] text-[#248A5A]",
    completed: "bg-[rgba(79,110,247,0.12)] text-[#405BD0]",
    cancelled: "bg-[rgba(235,90,90,0.12)] text-[#BF4343]",
};

const CATEGORY_ICON = {
    cardiology: Heart,
    neurology: Brain,
    dermatology: Shield,
    ophthalmology: Eye,
    general: Activity,
};

/* Dark anchor card: the single strong visual anchor per screen (spec §12). */
const DashboardHeader = ({ doctorCount, appointmentCount, nextAppointment }) => (
    <section className="nm-dash">
        <div className="nm-dash-col">
            <div className="nm-dark-card p-6">
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                        Patient journey
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                        Care missions ready
                    </span>
                </div>
                <h1 className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.01em] text-white md:text-[26px]">
                    Your care command center
                </h1>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#B7B7BE]">
                    Find doctors, complete consultations, understand reports, and build a
                    continuous health journey.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                        href="/health"
                        className="inline-flex min-h-10 items-center gap-2 rounded-[14px] bg-white px-4 text-[13px] font-semibold text-[#100E1A] transition hover:-translate-y-px"
                    >
                        <Heart className="h-4 w-4" strokeWidth={1.75} />
                        Health Journey
                    </Link>
                    <Link
                        href="/chatbot"
                        className="inline-flex min-h-10 items-center gap-2 rounded-[14px] bg-white/10 px-4 text-[13px] font-semibold text-white transition hover:bg-white/15"
                    >
                        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                        AI Guide
                    </Link>
                </div>
            </div>

            <div className="nm-primary-row">
                <div className="nm-stat">
                    <div className="nm-stat-icon">
                        <Stethoscope className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="nm-stat-value mt-3">{doctorCount}</div>
                    <div className="nm-stat-label">Doctors available</div>
                </div>
                <div className="nm-stat">
                    <div className="nm-stat-icon">
                        <CalendarClock className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="nm-stat-value mt-3">{appointmentCount}</div>
                    <div className="nm-stat-label">Your appointments</div>
                </div>
            </div>
        </div>

        <aside className="nm-rail">
            <div>
                <div className="cq-kicker">Next up</div>
                <h2 className="mt-1 text-[14px] font-semibold text-[var(--text-strong)]">
                    {nextAppointment ? "Upcoming visit" : "Nothing booked"}
                </h2>
            </div>
            {nextAppointment ? (
                <div className="rounded-[18px] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
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
                <div className="mt-2 grid gap-1.5">
                    {[
                        { href: "/patient/carequest", label: "CareQuest missions", icon: Zap },
                        { href: "/patient/care-plans", label: "My care plan", icon: CheckCircle2 },
                        { href: "/reports", label: "Reports & prescriptions", icon: Activity },
                        { href: "/patient/hospitals", label: "Hospitals", icon: Shield },
                    ].map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="flex min-h-10 items-center gap-2.5 rounded-[12px] px-2.5 text-[12px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text-strong)]"
                        >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </aside>
    </section>
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
            <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" strokeWidth={1.75} />₹
                {doctor.consultationFee}
            </span>
        </div>

        {doctor.qualifications?.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
                {doctor.qualifications.slice(0, 2).map((qual, index) => (
                    <span
                        key={index}
                        className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]"
                    >
                        {qual}
                    </span>
                ))}
                {doctor.qualifications.length > 2 ? (
                    <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                        +{doctor.qualifications.length - 2} more
                    </span>
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

const AppointmentCard = ({ appointment, onOpenChat, onCancel, cancelling }) => {
    const tone = STATUS_CLASS[appointment.status] || STATUS_CLASS.pending;
    return (
        <article className="cq-card cq-card-hover p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--text-strong)]">
                        {appointment.doctor?.name || "N/A"}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        {appointment.doctor?.specialization || "N/A"}
                    </p>
                </div>
                <span
                    className={
                        "inline-flex shrink-0 items-center self-start rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize " +
                        tone
                    }
                >
                    {appointment.status}
                </span>
            </div>

            <div className="mt-4 flex items-start gap-2 border-t border-[var(--border-subtle)] pt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {new Date(appointment.appointmentDate).toLocaleString("en-US", {
                    dateStyle: "full",
                    timeStyle: "short",
                })}
            </div>

            {appointment.payment ? (
                <div className="mt-3 rounded-[16px] bg-[var(--surface-subtle)] p-3.5">
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
                <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                    <CreditCard className="h-4 w-4" strokeWidth={1.75} />Paid: ₹
                    {appointment.amount}
                </div>
            ) : null}

            {appointment.reason ? (
                <p className="mt-3 rounded-[14px] bg-[var(--surface-subtle)] p-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-strong)]">Reason: </span>
                    {appointment.reason}
                </p>
            ) : null}
            {appointment.notes ? (
                <p className="mt-2 rounded-[14px] bg-[var(--surface-subtle)] p-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-strong)]">Doctor&apos;s notes: </span>
                    {appointment.notes}
                </p>
            ) : null}

            {appointment.status === "confirmed" ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => onOpenChat(appointment)}
                        className="nm-btn-secondary w-full"
                    >
                        <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                        Chat with doctor
                    </button>
                    {new Date(appointment.appointmentDate) > new Date() ? (
                        <button
                            type="button"
                            onClick={() => onCancel(appointment)}
                            disabled={cancelling}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-[14px] bg-[rgba(235,90,90,0.12)] px-4 text-[13px] font-semibold text-[var(--destructive)] transition hover:brightness-95 disabled:opacity-50"
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

            {appointment.status === "cancelled" && appointment.cancellationReason ? (
                <p className="mt-3 rounded-[14px] bg-[rgba(235,90,90,0.12)] p-3 text-[12px] leading-relaxed text-[var(--destructive)]">
                    Cancelled: {appointment.cancellationReason}
                </p>
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="nm-stack">
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

                <TabsContent value="find-doctors" className="nm-stack">
                    <CategoryFilters
                        categories={categories}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                    />
                    {filteredDoctors.length > 0 ? (
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
                            className="rounded-[16px] border border-white/70 bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--text-muted)] shadow-[var(--shadow-card)]"
                        >
                            {appointmentMessage}
                        </div>
                    ) : null}
                    {loading ? (
                        <p className="py-12 text-center text-[13px] text-[var(--text-muted)]">
                            Loading appointments…
                        </p>
                    ) : appointments.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {appointments.map((appointment) => (
                                <AppointmentCard
                                    key={appointment._id}
                                    appointment={appointment}
                                    onOpenChat={handleOpenChat}
                                    onCancel={handleCancelAppointment}
                                    cancelling={cancellingId === appointment._id}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="cq-card px-6 py-16 text-center">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--surface-subtle)] shadow-[var(--shadow-card)]">
                                <User className="h-6 w-6 text-[var(--text-subtle)]" strokeWidth={1.5} />
                            </div>
                            <h3 className="mt-4 text-[16px] font-semibold text-[var(--text-strong)]">
                                No appointments yet
                            </h3>
                            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                                Book your first consultation to see it here.
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
