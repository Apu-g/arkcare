"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleScrollToBottom = () => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    };

    return (
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-3 px-4 py-4">
            {/* Top Header with Navigation */}
            <header className="cq-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/patient')}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="nm-stat-icon">
                            <Bot className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[15px] font-semibold text-[var(--text-strong)]">
                                    ArkCare AI Guide
                                </h1>
                                <span className="status-chip hidden sm:inline-flex">Care quest</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                Private session • triage + specialist discovery
                            </p>
                        </div>
                    </div>
                </div>
                <Button variant="outline" onClick={() => setIsUploaderOpen(true)}>
                    <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    Upload Reports
                </Button>
            </header>
            <PDFUploaderModal isOpen={isUploaderOpen} onClose={() => setIsUploaderOpen(false)} />

            {/* Chat area */}
            <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                    ref={scrollAreaRef}
                    className="flex-1 overflow-y-auto py-2"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(116,116,121,0.35) transparent'
                    }}
                >
                    {messages.length === 0 ? (
                        <div className="cq-card flex h-full items-center justify-center p-8">
                            <div className="max-w-md text-center">
                                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[var(--surface-subtle)] shadow-[var(--shadow-inset)]">
                                    <Bot className="h-8 w-8 text-[var(--text-muted)]" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-[15px] font-semibold text-[var(--text-strong)]">
                                    Start a care conversation
                                </h3>
                                <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
                                    Describe what you are experiencing. ArkCare can organize the concern, suggest an appropriate specialty, and surface bookable doctors when relevant.
                                </p>
                                <div className="mt-5">
                                    <p className="text-[12px] leading-5 text-[var(--text-muted)]">
                                        <span className="font-semibold text-[var(--text)]">Example:</span>{" "}
                                        &ldquo;I have a persistent headache and feel dizzy&rdquo;
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="nm-stack-sm max-w-3xl">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={
                                            "max-w-[88%] rounded-[18px] px-4 py-3 " +
                                            (message.isUser
                                                ? "bg-[var(--primary)] text-white"
                                                : message.isError
                                                    ? "border border-[rgba(191,67,67,0.3)] bg-[rgba(235,90,90,0.08)] text-[var(--destructive)]"
                                                    : "cq-card text-[var(--text)]")
                                        }
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {message.isUser ? (
                                                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                                                        <User className="h-3 w-3" strokeWidth={1.75} />
                                                    </span>
                                                ) : (
                                                    <span className="nm-stat-icon !h-6 !w-6 !rounded-[9px]">
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
                                                        className="h-[18px] w-[18px] text-[var(--text-muted)]"
                                                        strokeWidth={1.75}
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
                                                <div className="nm-stack-sm">
                                                    {message.specialists.map((specialist, specIndex) => (
                                                        <div
                                                            key={specialist.doctor_id || specIndex}
                                                            data-doctor-id={specialist.doctor_id || ""}
                                                            className="cq-card-soft p-3"
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="nm-card-title">
                                                                        {specialist.name}
                                                                    </h4>
                                                                    <p className="text-[12px] font-semibold text-[var(--text-muted)]">
                                                                        {specialist.specialization}
                                                                    </p>
                                                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
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
                                                                    </div>
                                                                </div>
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
                                <div className="flex justify-start">
                                    <div className="cq-card px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="nm-stat-icon !h-6 !w-6 !rounded-[9px]">
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

                {/* Scroll to Bottom */}
                {messages.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleScrollToBottom}
                        className="absolute bottom-2 right-2"
                        aria-label="Scroll to bottom"
                        title="Scroll to bottom"
                    >
                        <ArrowDown className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </Button>
                )}
            </div>

            {/* Input Area */}
            <div className="cq-card p-4">
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-1">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe your symptoms or ask a health question…"
                            disabled={loading}
                            aria-label="Describe your symptoms or ask a health question"
                            className="!h-12"
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-[var(--text-muted)]">
                        Try: &ldquo;I have chest pain and shortness of breath&rdquo; or
                        &ldquo;What are the symptoms of diabetes?&rdquo;
                    </p>
                    <span className="status-chip">AI Assistant online</span>
                </div>
            </div>

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
