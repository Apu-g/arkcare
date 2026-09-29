"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MaskedText from "@/components/motion/MaskedText";
import Reveal from "@/components/motion/Reveal";
import PDFUploaderModal from './PDFUploaderModal';
import {
    Send,
    Bot,
    User,
    Stethoscope,
    Phone,
    Calendar,
    ArrowDown,
    ArrowLeft,
    FileText,
} from "lucide-react";
import BookAppointmentModal from "@/components/BookAppointmentModal";
import { getDoctorForBooking } from "@/actions/doctorActions";

export default function ChatbotPage() {
    const router = useRouter();

    // Generate a permanent discussion thread ID for this session when component mounts
    const threadId = useMemo(() => uuidv4(), []);

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const scrollAreaRef = useRef(null);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { text: input, isUser: true, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");

            const raw = JSON.stringify({
                "prompt": input,
                "thread_id": threadId // Send the thread ID generated on component load
            });

            const requestOptions = {
                method: "POST",
                headers: myHeaders,
                body: raw,
                redirect: "follow"
            };

            const response = await fetch("/api/chat", requestOptions);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const aiMessage = {
                text: data.response,
                isUser: false,
                timestamp: new Date(),
                analysis: data.analysis || null,
                specialists: data.specialists || [],
                doctorSource: data.doctor_source || null,
                isSerious: data.is_serious || false,
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = {
                text: `Sorry, I'm having trouble connecting to the AI service. ${error.message}`,
                isUser: false,
                timestamp: new Date(),
                isError: true,
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async (doctor) => {
        try {
            const doctorData = await getDoctorForBooking({
                doctorId: doctor.doctor_id,
            });
            setSelectedDoctor(doctorData);
            setIsBookingModalOpen(true);
        } catch (error) {
            console.error("Could not load doctor booking details:", error);
            alert(error.message || "This doctor is not available for booking");
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    /* SCROLLING: the transcript is page content, so the DOCUMENT scrolls it.
       There is no inner scroller here — an earlier revision had one, which
       clipped the conversation behind a fixed-height box and made the newest
       message unreachable. Both auto-follow and the explicit control scroll
       the transcript into view instead of moving an element's scrollTop. */
    useEffect(() => {
        const node = scrollAreaRef.current;
        if (!node || typeof node.scrollIntoView !== "function") return;
        node.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, loading]);

    const handleScrollToBottom = () => {
        const node = scrollAreaRef.current;
        if (!node) return;
        if (typeof node.scrollIntoView === "function") {
            node.scrollIntoView({ behavior: "smooth", block: "end" });
            return;
        }
        node.scrollTop = node.scrollHeight;
    };

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
            {/* Masthead, not a card: the transcript is the page's dominant
                surface and a boxed header competed with it. */}
            <header>
                <div className="section-rule mt-0">
                    <span>Care quest</span>
                </div>
                <div className="section-head">
                    <div className="flex items-center gap-2">
                        <div className="nm-stat-icon">
                            <Bot className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </div>
                        <div>
                            <MaskedText
                                as="h1"
                                className="text-[16px] font-semibold text-[var(--text-strong)]"
                            >
                                ArkCare AI Guide
                            </MaskedText>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                Private session • triage + specialist discovery
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsUploaderOpen(true)}>
                            <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                            Upload Reports
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push('/patient')}
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </Button>
                    </div>
                </div>
            </header>
            <PDFUploaderModal isOpen={isUploaderOpen} onClose={() => setIsUploaderOpen(false)} />

            {/* Chat area. The transcript grows the document and the page
                scrolls it normally — no inner scroller, no fixed height. */}
            <div className="relative">
                <div ref={scrollAreaRef} className="py-2">
                    {messages.length === 0 ? (
                        <div className="well flex flex-col items-center p-8 text-center">
                            <div className="mb-5 grid size-16 place-items-center rounded-full bg-[var(--surface-subtle)] shadow-[var(--shadow-inset)]">
                                <Bot className="h-8 w-8 text-[var(--text-muted)]" strokeWidth={1.75} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[var(--text-strong)]">
                                Start a care conversation
                            </h3>
                            <p className="mt-2 max-w-md text-[13px] leading-6 text-[var(--text-muted)]">
                                Describe what you are experiencing. ArkCare can organize the concern, suggest an appropriate specialty, and surface bookable doctors when relevant.
                            </p>
                            <p className="mt-5 text-[12px] leading-5 text-[var(--text-muted)]">
                                <span className="font-semibold text-[var(--text)]">Example:</span>{" "}
                                &ldquo;I have a persistent headache and feel dizzy&rdquo;
                            </p>
                        </div>
                    ) : (
                        /* A conversation is chronological, so it reads as a
                           timeline rather than a stack of bubbles-in-boxes. */
                        <div className="timeline max-w-3xl">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={
                                        message.isUser
                                            ? "flex justify-end pb-5"
                                            : "timeline-item"
                                    }
                                    data-tone={message.isUser ? "muted" : "copper"}
                                >
                                    <div
                                        className={
                                            "max-w-[88%] rounded-[16px] px-4 py-3 " +
                                            (message.isUser
                                                ? "ml-auto bg-[var(--primary)] text-[var(--primary-foreground)]"
                                                : message.isError
                                                    ? "border border-[var(--destructive)] bg-[var(--destructive-soft)] text-[var(--destructive)]"
                                                    // AI text is clinical content, so it sits on the
                                                    // near-opaque data surface, never heavy glass.
                                                    : "glass-data text-[var(--text)]")
                                        }
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {message.isUser ? (
                                                    <span className="grid size-6 place-items-center rounded-full bg-white/15">
                                                        <User className="h-3 w-3" strokeWidth={1.75} />
                                                    </span>
                                                ) : (
                                                    <span className="nm-stat-icon h-6! w-6! rounded-[9px]! p-0!">
                                                        <Bot className="h-3 w-3" strokeWidth={1.75} />
                                                    </span>
                                                )}
                                                <span className={
                                                    "text-[11px] font-semibold " +
                                                    (message.isUser ? "text-white/80" : "text-[var(--text-muted)]")
                                                }>
                                                    {message.isUser ? "You" : "AI Assistant"}
                                                </span>
                                            </div>
                                            <span className={
                                                "text-[11px] " +
                                                (message.isUser ? "text-white/60" : "text-[var(--text-subtle)]")
                                            }>
                                                {formatTime(message.timestamp)}
                                            </span>
                                        </div>

                                        <div className="whitespace-pre-wrap text-[13px] leading-6">
                                            {message.text}
                                        </div>

                                        {message.specialists && message.specialists.length > 0 && (
                                            <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                                                <div className="mb-3 flex items-center gap-2">
                                                    <Stethoscope
                                                        className="h-[18px] w-[18px] text-[var(--text-muted)]"                                                        strokeWidth={1.75}
                                                    />
                                                    <span className="nm-card-title">
                                                        Recommended Specialists
                                                    </span>
                                                    {message.doctorSource === "mongodb_live" && (
                                                        <span className="cq-pixel-label cq-real-label ml-auto">
                                                            Live database
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Suggested doctors are a record list the user
                                                    can act on, so they are a ledger with one
                                                    action per row. */}
                                                <div className="ledger">
                                                    {message.specialists.map((specialist, specIndex) => (
                                                        <div
                                                            key={specialist.doctor_id || specIndex}
                                                            data-doctor-id={specialist.doctor_id || ""}
                                                            className="ledger-row"
                                                        >
                                                            <div className="min-w-0">
                                                                <h4 className="ledger-title">
                                                                    {specialist.name}
                                                                </h4>
                                                                <p className="ledger-meta">
                                                                    {specialist.specialization}
                                                                </p>
                                                                <p className="ledger-meta mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                                                    <span>{specialist.experience} years exp</span>
                                                                    {Number.isFinite(Number(specialist.consultationFee)) && (
                                                                        <span>₹{Number(specialist.consultationFee).toLocaleString("en-IN")}</span>
                                                                    )}
                                                                    {specialist.phone && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Phone className="h-3 w-3" strokeWidth={1.75} />
                                                                            {specialist.phone}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="ledger-actions">
                                                                <Button
                                                                    onClick={() => handleBookAppointment(specialist)}
                                                                >
                                                                    <Calendar className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                                                    Book Now
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="timeline-item" data-tone="muted">
                                    <div className="glass-data inline-block rounded-[16px] px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="nm-stat-icon h-6! w-6! rounded-[9px]! p-0!">
                                                <Bot className="h-3 w-3" strokeWidth={1.75} />
                                            </span>
                                            <span className="text-[13px] text-[var(--text-muted)]">
                                                AI is analyzing your symptoms…
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Scroll to the newest message. It sits in the flow rather than
                    absolutely positioned over the transcript, so it can never
                    cover a message. */}
                {messages.length > 0 && (
                    <div className="flex justify-end pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleScrollToBottom}
                            aria-label="Scroll to the newest message"
                            title="Scroll to the newest message"
                        >
                            <ArrowDown className="h-[18px] w-[18px]" strokeWidth={1.75} />
                            Newest
                        </Button>
                    </div>
                )}
            </div>

            {/* Composer — the single card on the page, because it is a
                distinct, always-present control surface. */}
            <Reveal>
                <div className="cq-card p-4">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <div className="flex-1">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Describe your symptoms or ask a health question…"
                                disabled={loading}
                                aria-label="Describe your symptoms or ask a health question"
                                className="h-12!"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={loading || !input.trim()}
                            aria-label="Send message"
                        >
                            <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </Button>
                    </form>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                        <p className="text-[11px] text-[var(--text-muted)]">
                            Try: &ldquo;I have chest pain and shortness of breath&rdquo; or
                            &ldquo;What are the symptoms of diabetes?&rdquo;
                        </p>
                        <span className="status-chip">AI Assistant online</span>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--text-subtle)]">
                        AI never diagnoses, prescribes, changes a dose or approves anything.
                        Only a clinician can.
                    </p>
                </div>
            </Reveal>

            {/* Booking Modal */}
            {selectedDoctor && (
                <BookAppointmentModal
                    doctor={selectedDoctor}
                    isOpen={isBookingModalOpen}
                    onClose={() => {
                        setIsBookingModalOpen(false);
                        setSelectedDoctor(null);
                    }}
                />
            )}

        </div>
    );
}
