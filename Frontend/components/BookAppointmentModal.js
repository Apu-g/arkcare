"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  checkSlotAvailability,
  getLiveDoctorDayAvailability,
} from "@/actions/availabilityActions";
import { createAppointment } from "@/actions/appointmentActions";
import {
  createPaymentOrder,
  getPaymentConfigurationStatus,
  releasePaymentOrder,
  reportPaymentFailure,
  verifyPayment,
} from "@/actions/paymentActions";
import { useAuth } from "@/hooks/useAuth";

function localDateKey(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function BookAppointmentModal({
  doctor,
  isOpen,
  onClose,
  onViewAppointments,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState("booking");
  const [error, setError] = useState("");
  const [checkoutReady, setCheckoutReady] = useState(
    typeof window !== "undefined" && Boolean(window.Razorpay)
  );
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [checkoutMode, setCheckoutMode] = useState(null);
  const [liveAvailability, setLiveAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState(null);

  const testBookingBypass =
    process.env.NEXT_PUBLIC_CAREQUEST_TEST_BOOKING_BYPASS === "true";

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const reset = useCallback(() => {
    setSelectedDate(null);
    setSelectedSlot("");
    setReason("");
    setLoading(false);
    setPaymentStep("booking");
    setError("");
    setActiveOrderId(null);
    setPaymentResult(null);
    setCheckoutMode(null);
    setLiveAvailability(null);
    setAvailabilityLoading(false);
    setGatewayStatus(null);
  }, []);

  const releaseActiveHold = useCallback(
    async (reasonCode = "checkout_closed") => {
      if (!activeOrderId) return;
      const orderId = activeOrderId;
      setActiveOrderId(null);
      try {
        await releasePaymentOrder(orderId, reasonCode);
      } catch (releaseError) {
        console.error("Could not release booking hold:", releaseError);
      }
    },
    [activeOrderId]
  );

  const handleClose = useCallback(async () => {
    await releaseActiveHold("modal_closed");
    reset();
    onClose();
  }, [onClose, releaseActiveHold, reset]);

  const handleViewAppointment = useCallback(() => {
    if (pathname === "/chatbot") {
      router.push("/patient?tab=my-appointments");
    } else if (onViewAppointments) {
      onViewAppointments();
    } else {
      router.push("/patient?tab=my-appointments");
    }
  }, [pathname, router, onViewAppointments]);

  const isDateAvailable = useCallback(
    (date) => {
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      return (doctor.availability || []).some(
        (entry) => entry.day === dayName && (entry.slots || []).length > 0
      );
    },
    [doctor.availability]
  );

  const isDateDisabled = useCallback(
    (date) => date < today || !isDateAvailable(date),
    [today, isDateAvailable]
  );

  const appointmentDay = useMemo(
    () => localDateKey(selectedDate),
    [selectedDate]
  );

  const slotRows = useMemo(() => {
    if (!selectedDate) return [];

    if (
      liveAvailability?.appointmentDay === appointmentDay &&
      Array.isArray(liveAvailability?.slots)
    ) {
      return liveAvailability.slots;
    }

    const dayName = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    return (
      (doctor.availability || []).find((entry) => entry.day === dayName)?.slots ||
      []
    ).map((time) => ({
      time,
      available: true,
      reason: null,
      provisional: true,
    }));
  }, [selectedDate, appointmentDay, liveAvailability, doctor.availability]);

  const selectedSlotRow = useMemo(
    () => slotRows.find((row) => row.time === selectedSlot) || null,
    [slotRows, selectedSlot]
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    getPaymentConfigurationStatus()
      .then((status) => {
        if (!cancelled) setGatewayStatus(status);
      })
      .catch((statusError) => {
        if (!cancelled) {
          setGatewayStatus({
            configured: false,
            mode: "unconfigured",
            ready: false,
          });
          setError(
            statusError.message || "Secure payment is not configured"
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || window.Razorpay) {
      if (window.Razorpay) setCheckoutReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existing) {
      const timer = window.setInterval(() => {
        if (window.Razorpay) {
          setCheckoutReady(true);
          window.clearInterval(timer);
        }
      }, 100);
      return () => window.clearInterval(timer);
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setCheckoutReady(true);
    script.onerror = () => {
      setCheckoutReady(false);
      setError("Secure checkout could not load. Check your connection and try again.");
    };
    document.head.appendChild(script);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen || !selectedDate || !appointmentDay) {
      setLiveAvailability(null);
      return;
    }

    let cancelled = false;
    setAvailabilityLoading(true);

    getLiveDoctorDayAvailability(doctor._id, appointmentDay)
      .then((result) => {
        if (cancelled) return;
        setLiveAvailability(result);
        setSelectedSlot((current) => {
          if (!current) return current;
          return result?.slots?.some(
            (row) => row.time === current && row.available
          )
            ? current
            : "";
        });
        if (result?.error) setError(result.error);
      })
      .catch((availabilityError) => {
        if (!cancelled) {
          setError(
            availabilityError.message || "Could not refresh live availability"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedDate, appointmentDay, doctor._id]);



  const validateSelectedSlot = useCallback(async () => {
    if (!appointmentDay || !selectedSlot) {
      throw new Error("Select a date and time before continuing");
    }

    const result = await checkSlotAvailability({
      doctorId: doctor._id,
      appointmentDay,
      appointmentTime: selectedSlot,
    });

    if (!result.available) {
      throw new Error(result.error || "That slot is no longer available");
    }

    return result;
  }, [appointmentDay, selectedSlot, doctor._id]);

  const handlePayment = useCallback(async () => {
    if (!appointmentDay || !selectedSlot) {
      setError("Select a date and time before continuing.");
      return;
    }

    if (!checkoutReady || !window.Razorpay) {
      setError("Secure Razorpay checkout is still loading. Try again in a moment.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await validateSelectedSlot();

      const orderData = await createPaymentOrder({
        doctorId: doctor._id,
        appointmentDay,
        appointmentTime: selectedSlot,
        reason,
      });

      setActiveOrderId(orderData.orderId);
      setCheckoutMode(orderData.checkoutMode || null);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ArkCare",
        description: `Consultation with ${doctor.name}`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.name || user?.fullName || undefined,
          email:
            user?.email ||
            user?.primaryEmailAddress?.emailAddress ||
            undefined,
        },
        notes: {
          appointment: orderData.appointmentId,
        },
        theme: {
          color: "#100E1A",
        },
        modal: {
          confirm_close: true,
          escape: true,
          ondismiss: async () => {
            await releasePaymentOrder(orderData.orderId, "checkout_dismissed").catch(
              () => null
            );
            setActiveOrderId(null);
            setLoading(false);
          },
        },
        handler: async (response) => {
          try {
            setPaymentStep("confirming");
            const result = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (!result?.success) {
              throw new Error("Payment could not be confirmed");
            }

            setActiveOrderId(null);
            setPaymentResult(result);
            setPaymentStep("success");
            setError("");
          } catch (verificationError) {
            console.error("Payment verification error:", verificationError);
            setError(
              verificationError.message ||
                "Payment was received but confirmation is still pending. Check My Appointments before retrying."
            );
            setPaymentStep("booking");
          } finally {
            setLoading(false);
          }
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", (response) => {
        const description =
          response?.error?.description ||
          "That payment attempt failed. Your slot is still held while Checkout remains open; you can retry or close Checkout to release it.";

        void reportPaymentFailure({
          orderId: orderData.orderId,
          paymentId: response?.error?.metadata?.payment_id || null,
          reason: description,
        }).catch((failureError) => {
          console.error("Could not persist Razorpay failure state:", failureError);
        });

        setPaymentStep("booking");
        setLoading(false);
        setError(description);
      });

      checkout.open();
    } catch (paymentError) {
      console.error("Payment initiation failed:", paymentError);
      setError(paymentError.message || "Could not start secure checkout");
      setLoading(false);
      setPaymentStep("booking");
    }
  }, [
    appointmentDay,
    selectedSlot,
    checkoutReady,
    doctor._id,
    doctor.name,
    reason,
    user,
    validateSelectedSlot,
  ]);

  const handleTestBooking = useCallback(async () => {
    if (!testBookingBypass || !appointmentDay || !selectedSlot) return;
    setLoading(true);
    setError("");
    try {
      const availability = await validateSelectedSlot();
      const result = await createAppointment({
        doctorId: doctor._id,
        appointmentDate: availability.appointmentDate,
        reason,
        demoBooking: true,
      });
      setPaymentResult(result);
      setCheckoutMode("demo");
      setPaymentStep("success");
    } catch (bookingError) {
      setError(bookingError.message || "Could not create test booking");
    } finally {
      setLoading(false);
    }
  }, [
    testBookingBypass,
    appointmentDay,
    selectedSlot,
    validateSelectedSlot,
    doctor._id,
    reason,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss booking backdrop"
        onClick={handleClose}
        className="absolute inset-0 bg-[rgba(16,14,26,0.28)] backdrop-blur-[1px]"
      />

      <section className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface-shell)] shadow-[var(--shadow-soft)]">
        <header className="relative border-b border-[var(--border-subtle)] bg-[var(--surface)] p-5 pr-16 md:p-6 md:pr-16">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Close booking"
            onClick={handleClose}
            className="absolute right-4 top-4"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Button>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="cq-pixel-label cq-real-label">
                  <ShieldCheck className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  Real booking flow
                </span>
                <span className="cq-pixel-label">
                  <LockKeyhole className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  Razorpay
                </span>
              </div>
              <h2 className="mt-3 text-[18px] font-bold tracking-tight text-[var(--text-strong)]">
                Book Appointment
              </h2>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {doctor.name} · {doctor.specialization}
              </p>
            </div>
            <div className="glass-data shrink-0 rounded-[16px] px-4 py-3 text-right">
              <div className="text-[11px] font-semibold text-[var(--text-muted)]">
                Consultation fee
              </div>
              <div className="mt-1 text-[20px] font-bold tabular-nums text-[var(--text-strong)]">
                ₹{Number(doctor.consultationFee || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </header>

        {paymentStep === "success" ? (
          <div className="p-8 text-center">
            <div className="nm-stat-icon mx-auto !h-14 !w-14 !rounded-full">
              <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h3 className="mt-5 text-[18px] font-bold text-[var(--text-strong)]">
              Appointment Booked!
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[var(--text-muted)]">
              {paymentResult?.demoBooking
                ? `Synthetic demo booking confirmed with ${doctor.name}. No payment was charged.`
                : `Razorpay payment was verified on the server and your appointment with ${doctor.name} is confirmed.`}
            </p>

            {paymentResult && !paymentResult.demoBooking ? (
              <div className="glass-data mx-auto mt-5 max-w-md rounded-[18px] p-4 text-left text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[var(--text-strong)]">
                    Payment verified
                  </span>
                  {/* Copper = proof: a committed, server-verified payment. */}
                  <Badge variant="copper">
                    {checkoutMode === "live" ? "Razorpay live" : "Razorpay test"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-[var(--text-muted)]">
                  <div>
                    Amount:{" "}
                    <strong className="text-[var(--text-strong)]">
                      ₹{Number(paymentResult.amount || doctor.consultationFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  {paymentResult.paymentId ? (
                    <div className="select-all break-all font-mono text-[11px]">
                      Payment {paymentResult.paymentId}
                    </div>
                  ) : null}
                  {paymentResult.orderId ? (
                    <div className="select-all break-all font-mono text-[11px]">
                      Order {paymentResult.orderId}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              onClick={handleViewAppointment}
              className="mt-6 w-full"
            >
              View My Appointments
            </Button>
          </div>
        ) : paymentStep === "confirming" ? (
          <div className="p-10 text-center">
            <Loader2
              className="mx-auto h-7 w-7 animate-spin text-[var(--primary)]"
              strokeWidth={1.75}
            />
            <h3 className="mt-4 text-[16px] font-semibold text-[var(--text-strong)]">
              Confirming payment
            </h3>
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              ArkCare is verifying the gateway signature, captured amount and booking
              order before confirming the appointment.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 p-5 md:p-6">
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-[18px] bg-[var(--destructive-soft)] p-4 text-[13px] text-[var(--destructive)]"
              >
                <XCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--text-strong)]">
                <CalendarDays className="h-[18px] w-[18px] text-[var(--primary)]" strokeWidth={1.75} />
                Choose a date
              </div>
              <div className="glass-data rounded-[18px] p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot("");
                    setError("");
                  }}
                  disabled={isDateDisabled}
                  className="w-full"
                />
              </div>
            </div>

            {selectedDate ? (
              <div>
                <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--text-strong)]">
                  <Clock3 className="h-[18px] w-[18px] text-[var(--primary)]" strokeWidth={1.75} />
                  Available times
                </div>
                <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
                  <span>
                    {availabilityLoading
                      ? "Refreshing live availability..."
                      : liveAvailability?.timezone
                        ? `Live · ${liveAvailability.timezone}`
                        : "Checking live availability"}
                  </span>
                  {liveAvailability?.refreshedAt ? (
                    <span>
                      refreshed{" "}
                      {new Date(liveAvailability.refreshedAt).toLocaleTimeString(
                        "en-IN",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slotRows.map((row) => (
                    <button
                      key={row.time}
                      type="button"
                      disabled={!row.available || availabilityLoading}
                      onClick={() => {
                        setSelectedSlot(row.time);
                        setError("");
                      }}
                      className={
                        "min-h-10 rounded-[14px] border px-3 text-[13px] font-semibold transition hover:-translate-y-px " +
                        (selectedSlot === row.time
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : row.available
                            ? "border-transparent bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-hover)]"
                            : "cursor-not-allowed border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] line-through opacity-70")
                      }
                    >
                      {row.time}
                      {!row.available && row.reason === "taken" ? (
                        <span className="ml-1 text-[9px] no-underline">taken</span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {!availabilityLoading && selectedDate && !slotRows.length ? (
                  <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                    No bookable slots remain for this date.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="reason"
                className="mb-2 block text-[13px] font-semibold text-[var(--text-strong)]"
              >
                Reason for visit{" "}
                <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
              <Textarea
                id="reason"
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Briefly describe what you want to discuss with the doctor."
                rows={3}
              />
            </div>

            {appointmentDay && selectedSlot ? (
              <div className="glass-data rounded-[18px] p-4">
                <div className="cq-kicker">Booking summary</div>
                <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
                  <div>
                    <span className="text-[var(--text-muted)]">Date</span>
                    <div className="font-semibold text-[var(--text-strong)]">
                      {selectedDate.toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Time</span>
                    <div className="font-semibold text-[var(--text-strong)]">
                      {selectedSlot}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="cq-card-soft p-4 text-[12px] leading-5 text-[var(--text-muted)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-strong)]">
                  <CreditCard className="h-[18px] w-[18px] text-[var(--primary)]" strokeWidth={1.75} />
                  Secure payment
                </div>
                {gatewayStatus ? (
                  <span
                    className={
                      "cq-pixel-label " +
                      (gatewayStatus.ready ? "cq-real-label" : "")
                    }
                  >
                    {gatewayStatus.ready
                      ? `Razorpay ${String(
                          gatewayStatus.mode || ""
                        ).toLowerCase()} ready`
                      : "Gateway not ready"}
                  </span>
                ) : null}
              </div>
              <p className="mt-2">
                ArkCare holds the selected slot while Razorpay Checkout is open.
                The appointment is confirmed only after server-side signature, amount
                and capture verification.
              </p>
              {gatewayStatus?.mode === "live" &&
              !gatewayStatus?.webhookConfigured ? (
                <p className="mt-2 font-semibold text-[var(--destructive)]">
                  Live checkout is disabled until the signed Razorpay webhook is configured.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handlePayment}
                disabled={
                  loading ||
                  !appointmentDay ||
                  !selectedSlot ||
                  selectedSlotRow?.available === false ||
                  !checkoutReady ||
                  gatewayStatus?.ready !== true ||
                  Number(doctor.consultationFee || 0) <= 0
                }
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
                ) : (
                  <LockKeyhole className="h-[18px] w-[18px]" strokeWidth={1.75} />
                )}
                {loading
                  ? "Preparing secure checkout…"
                  : `Pay ₹${Number(doctor.consultationFee || 0).toLocaleString(
                      "en-IN"
                    )} & Book`}
              </Button>
            </div>

            {testBookingBypass ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleTestBooking}
                disabled={loading || !appointmentDay || !selectedSlot}
                className="w-full !border-dashed !text-[12px] !text-[var(--text-muted)]"
              >
                Demo Book — Skip Payment
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

export default memo(BookAppointmentModal);
