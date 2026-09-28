import crypto from "node:crypto";
import Razorpay from "razorpay";
import Appointment from "@/models/Appointment";
import BookingPayment from "@/models/BookingPayment";
import PaymentEvidence from "@/models/PaymentEvidence";
import AuditEvent from "@/models/AuditEvent";
import Doctor from "@/models/Doctor";
import {
  doctorOffersSlot,
  expirePendingHoldForSlot,
  slotIsOccupied,
} from "@/lib/bookingSlots";
import { appendAuditEvent } from "@/lib/carequest/audit";
import { anchorAuditRoot, blockchainEnabled } from "@/lib/carequest/blockchain";
import {
  createNotification,
  notifyHospitalStaff,
} from "@/lib/carequest/notifications";

let razorpay;

export function getRazorpayConfiguration() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = String(
    process.env.RAZORPAY_WEBHOOK_SECRET || ""
  ).trim();

  const configured = Boolean(keyId && keySecret);
  const mode = keyId.startsWith("rzp_live_")
    ? "live"
    : keyId.startsWith("rzp_test_")
      ? "test"
      : configured
        ? "unknown"
        : "unconfigured";

  return {
    configured,
    mode,
    webhookConfigured: Boolean(webhookSecret),
    ready:
      configured &&
      mode !== "unknown" &&
      (mode !== "live" || Boolean(webhookSecret)),
  };
}

export function getRazorpayClient() {
  if (!razorpay) {
    const config = getRazorpayConfiguration();
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

    if (!config.configured) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }

    if (config.mode === "unknown") {
      throw new Error("Razorpay key ID is not a recognized test or live key");
    }

    if (config.mode === "live" && !config.webhookConfigured) {
      throw new Error(
        "Live Razorpay bookings require RAZORPAY_WEBHOOK_SECRET to be configured"
      );
    }

    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

export function getRazorpayKeyId() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  if (!keyId) throw new Error("Razorpay key ID is not configured");
  return keyId;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slotKeyFor(doctorId, appointmentDate) {
  return `${String(doctorId)}:${new Date(appointmentDate).toISOString()}`;
}

function safeReason(reason) {
  return String(reason || "").trim().slice(0, 1000);
}

function makeReceipt() {
  return (
    "ark_" +
    Date.now().toString(36) +
    "_" +
    crypto.randomUUID().replace(/-/g, "").slice(0, 14)
  ).slice(0, 40);
}

// ---------------------------------------------------------------------------
// Non-clinical proof rail (audit chain + blockchain).
//
// Money moving is a fact that must be provable, so every payment outcome gets an
// append-only audit event. The chain anchor is a NON-CLINICAL proof: if the
// bridge is down we record the failure and continue. A blockchain outage must
// never block a patient from getting their appointment, so every helper below is
// individually try/caught and returns a status instead of throwing.
// ---------------------------------------------------------------------------

/**
 * Canonical hash over the captured-payment facts. Anchoring this commits to
 * exactly what was charged, for which appointment, by which payer.
 */
export function paymentDigest({
  orderId,
  paymentId,
  amountPaise,
  currency,
  appointmentId,
  doctorId,
  patientUserId,
}) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        provider: "razorpay",
        orderId: String(orderId || ""),
        paymentId: String(paymentId || ""),
        amountPaise: Number(amountPaise || 0),
        currency: String(currency || ""),
        appointmentId: String(appointmentId || ""),
        doctorId: String(doctorId || ""),
        patientUserId: String(patientUserId || ""),
      })
    )
    .digest("hex");
}

/**
 * Append one payment audit event, retrying a contended chain head the same way
 * awardCapsules does, and swallowing the final failure. Returns
 * { recorded: true } or { recorded: false, error } — never throws.
 */
async function recordPaymentAudit(payload, { attempts = 4 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await appendAuditEvent(payload);
      return { recorded: true };
    } catch (error) {
      lastError = error;
    }
  }
  console.error("Payment audit append failed:", lastError);
  return {
    recorded: false,
    error: String(lastError?.message || "audit append failed").slice(0, 300),
  };
}

/**
 * Anchor the payment digest on-chain and record the outcome as its own audit
 * event, mirroring the report flow: status is only ever "anchored" when the
 * bridge actually returned a transaction hash.
 */
async function anchorPaymentDigest({
  digest,
  batchId,
  organizationId,
  programId,
  actorUserId,
  actorRole,
  resourceId,
  metadata,
}) {
  if (!blockchainEnabled()) {
    // Still record the intent so the audit chain shows the payment was
    // hash-committed locally even with the bridge switched off. Explicitly
    // NOT "anchored": nothing was anchored.
    return recordPaymentAudit({
      organizationId,
      programId,
      actorUserId,
      actorRole,
      eventType: "payment.anchor_disabled",
      resourceType: "BookingPayment",
      resourceId,
      verificationLevel: "system_confirmed",
      metadata: {
        batchId,
        merkleRoot: "0x" + digest,
        anchored: false,
        anchorStatus: "disabled",
        ...metadata,
      },
    });
  }

  try {
    const result = await anchorAuditRoot({
      batchId,
      merkleRoot: "0x" + digest,
    });
    // A commitment without a transaction hash was never actually anchored.
    if (!result?.txHash) {
      throw new Error("Bridge returned no transaction hash");
    }

    return recordPaymentAudit({
      organizationId,
      programId,
      actorUserId,
      actorRole,
      eventType: "payment.anchored",
      resourceType: "BookingPayment",
      resourceId,
      verificationLevel: "system_confirmed",
      metadata: {
        batchId,
        merkleRoot: "0x" + digest,
        txHash: result.txHash,
        blockNumber: result.blockNumber ?? null,
        network: result.network || "carequest-local-evm",
        anchored: true,
        ...metadata,
      },
    });
  } catch (error) {
    const message = String(error?.message || "anchor failed").slice(0, 300);
    // Record the failure (never swallow it) so the audit console can surface
    // the gap. The payment itself is already settled and must not be rolled back.
    await recordPaymentAudit({
      organizationId,
      programId,
      actorUserId,
      actorRole,
      eventType: "payment.anchor_failed",
      resourceType: "BookingPayment",
      resourceId,
      verificationLevel: "system_confirmed",
      metadata: {
        batchId,
        merkleRoot: "0x" + digest,
        anchored: false,
        anchorStatus: "failed",
        error: message,
        ...metadata,
      },
    });
    return { recorded: false, error: message };
  }
}

/**
 * Record the `payment.captured` fact and anchor its digest. Safe to call on
 * every finalize: the audit append is guarded by a uniqueness check on the
 * booking so a retried capture cannot double-log a payment.
 */
async function recordPaymentCaptured({ booking, appointment, paymentId, orderId }) {
  const organizationId = appointment.organization || null;
  const programId = appointment.program || null;
  const actorUserId = booking.userId;
  const digest = paymentDigest({
    orderId,
    paymentId,
    amountPaise: booking.amountPaise,
    currency: booking.currency,
    appointmentId: appointment._id,
    doctorId: booking.doctor,
    patientUserId: booking.userId,
  });

  const metadata = {
    provider: "razorpay",
    organizationId: String(organizationId || ""),
    programId: String(programId || ""),
    orderId: String(orderId),
    paymentId: String(paymentId),
    amountPaise: Number(booking.amountPaise),
    currency: booking.currency,
    appointmentId: String(appointment._id),
    doctorId: String(booking.doctor),
    patientUserId: String(booking.userId),
    paymentDigest: digest,
  };

  // Idempotency: the same capture reaching us twice (checkout verify + webhook)
  // must not append a second "money was taken" event.
  const alreadyRecorded = await AuditEvent.exists({
    eventType: "payment.captured",
    resourceType: "BookingPayment",
    resourceId: String(booking._id),
  });

  if (!alreadyRecorded) {
    await recordPaymentAudit({
      organizationId,
      programId,
      actorUserId,
      actorRole: "patient",
      eventType: "payment.captured",
      resourceType: "BookingPayment",
      resourceId: booking._id,
      verificationLevel: "system_confirmed",
      metadata,
    });
  }

  await anchorPaymentDigest({
    digest,
    // One anchor per capture, keyed by the payment id so a retry re-submits the
    // same batch rather than creating a second commitment.
    batchId: "payment:" + String(paymentId),
    organizationId,
    programId,
    actorUserId,
    actorRole: "patient",
    resourceId: booking._id,
    metadata: {
      appointmentId: String(appointment._id),
      paymentId: String(paymentId),
    },
  });
}

/**
 * `payment.refunded`. Same posture as capture: appended to the chain, never
 * allowed to fail the refund that already happened at the gateway.
 */
export async function recordPaymentRefunded({
  booking,
  appointment,
  refundId,
  paymentId,
  amountPaise,
  reason,
}) {
  const organizationId = appointment?.organization || null;
  const programId = appointment?.program || null;

  return recordPaymentAudit(
    {
      organizationId,
      programId,
      actorUserId: booking.userId,
      actorRole: "patient",
      eventType: "payment.refunded",
      resourceType: "BookingPayment",
      resourceId: booking._id,
      verificationLevel: "system_confirmed",
      metadata: {
        organizationId: String(organizationId || ""),
        programId: String(programId || ""),
        provider: "razorpay",
        refundId: String(refundId || ""),
        paymentId: String(paymentId || ""),
        amountPaise: Number(amountPaise || 0),
        currency: booking.currency,
        appointmentId: String(booking.appointment),
        reason: String(reason || "").slice(0, 200),
      },
    },
    { attempts: 3 }
  );
}

/**
 * `appointment.booked` for EVERY successful booking, independent of CareQuest.
 *
 * This is the guarantee: whatever the CareQuest follow-up hook does, a paid
 * booking is on the audit chain. The hook in service.js may legitimately return
 * early (no linked ScheduledOccurrence), and it is the parent's file, so this
 * emission cannot depend on it.
 *
 * The dedup below keys on (eventType, resourceType, resourceId) so there is
 * EXACTLY ONE `appointment.booked` per appointment. When the hook already
 * emitted one, this is a no-op rather than a second, contradictory record; when
 * the hook did not (or regresses to the early return), this event is the one
 * that lands. The payment-level facts (orderId, paymentId, amountPaise,
 * currency) reach the chain via `payment.captured` either way.
 */
async function recordAppointmentBookedEvent({ booking, appointment, paymentId, orderId }) {
  const organizationId = appointment.organization || null;
  const programId = appointment.program || null;

  const alreadyRecorded = await AuditEvent.exists({
    eventType: "appointment.booked",
    resourceType: "Appointment",
    resourceId: String(appointment._id),
  });
  if (alreadyRecorded) return;

  await recordPaymentAudit({
    organizationId,
    programId,
    actorUserId: booking.userId,
    actorRole: "patient",
    eventType: "appointment.booked",
    resourceType: "Appointment",
    resourceId: appointment._id,
    verificationLevel: "system_confirmed",
    metadata: {
      organizationId: String(organizationId || ""),
      programId: String(programId || ""),
      appointmentId: String(appointment._id),
      doctorId: String(appointment.doctor),
      patientId: String(appointment.patient),
      patientUserId: String(booking.userId),
      appointmentDate: new Date(appointment.appointmentDate).toISOString(),
      amount: Number(booking.amountPaise) / 100,
      currency: booking.currency,
      paymentId: String(paymentId),
      orderId: String(orderId),
      provider: "razorpay",
    },
  });
}

/**
 * Tell the booked doctor and their hospital's staff that a consultation landed.
 * The doctor notification is addressed to the SPECIFIC doctor, never broadcast,
 * so one doctor's booking cannot surface on another doctor's dashboard.
 */
async function notifyBookingActors({ booking, appointment }) {
  const organizationId = appointment.organization || null;
  const appointmentDate = new Date(appointment.appointmentDate);
  const when = appointmentDate.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const doctor = await Doctor.findById(booking.doctor)
    .select("name userId")
    .lean();

  if (doctor?.userId) {
    try {
      await createNotification({
        recipientUserId: doctor.userId,
        recipientRole: "doctor",
        type: "appointment_booked",
        title: "New appointment booked",
        body: `A patient booked a consultation for ${when}.`,
        organizationId,
        data: {
          appointmentId: String(appointment._id),
          doctorId: String(booking.doctor),
          patientId: String(appointment.patient),
          appointmentDate: appointmentDate.toISOString(),
          amount: Number(booking.amountPaise) / 100,
          currency: booking.currency,
        },
      });
    } catch (error) {
      console.error("Doctor booking notification failed:", error);
    }
  }

  if (organizationId) {
    try {
      await notifyHospitalStaff({
        organizationId,
        type: "appointment_booked",
        title: "New appointment booked",
        body: `A consultation was booked for ${when}.`,
        data: {
          appointmentId: String(appointment._id),
          doctorId: String(booking.doctor),
          patientId: String(appointment.patient),
          appointmentDate: appointmentDate.toISOString(),
        },
        // The doctor already got their own notification above.
        excludeUserId: doctor?.userId || null,
      });
    } catch (error) {
      console.error("Hospital staff booking notification failed:", error);
    }
  }
}

/**
 * Post-booking side effects: the CareQuest capsule award, the audit events and
 * the notifications.
 *
 * ORDERING (see the call site for the full rationale): this runs BEFORE the
 * BookingPayment status flips to "booked", and it is fully idempotent, so a
 * crash here is re-driven by the next finalize instead of losing the award.
 * Every step is individually guarded — a dead blockchain or Pusher cannot fail
 * a paid booking.
 */
async function runPostBookingWork({ booking, appointment, paymentId, orderId }) {
  try {
    const { recordAppointmentBooked } = await import("@/lib/carequest/service");
    await recordAppointmentBooked(appointment, booking.userId);
  } catch (error) {
    console.error("CareQuest follow-up booking hook failed:", error);
  }

  try {
    await recordPaymentCaptured({ booking, appointment, paymentId, orderId });
  } catch (error) {
    console.error("Payment capture audit failed:", error);
  }

  try {
    await recordAppointmentBookedEvent({ booking, appointment, paymentId, orderId });
  } catch (error) {
    console.error("Appointment booked audit failed:", error);
  }

  try {
    await notifyBookingActors({ booking, appointment });
  } catch (error) {
    console.error("Booking notifications failed:", error);
  }
}

export async function createRazorpayBookingOrder({
  user,
  patient,
  doctor,
  appointmentDate,
  reason,
  programContext,
}) {
  const when = new Date(appointmentDate);
  if (Number.isNaN(when.getTime()) || when <= new Date()) {
    throw new Error("Choose a valid future appointment time");
  }

  const timezone =
    programContext?.organization?.settings?.defaultTimezone || "Asia/Kolkata";

  if (!doctorOffersSlot(doctor, when, timezone)) {
    throw new Error("That time is not in this doctor's current availability");
  }

  await expirePendingHoldForSlot({
    doctorId: doctor._id,
    appointmentDate: when,
  });

  if (
    await slotIsOccupied({
      doctorId: doctor._id,
      appointmentDate: when,
    })
  ) {
    throw new Error("That appointment slot was just taken. Please choose another slot.");
  }

  const amountPaise = Math.round(Number(doctor.consultationFee || 0) * 100);
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new Error("This doctor does not have a valid payable consultation fee");
  }

  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const slotKey = slotKeyFor(doctor._id, when);

  let appointment;
  try {
    appointment = await Appointment.create({
      organization: programContext.organization._id,
      program: programContext.program._id,
      patient: patient._id,
      doctor: doctor._id,
      appointmentDate: when,
      reason: safeReason(reason),
      status: "pending",
      slotKey,
      holdExpiresAt,
      amount: amountPaise / 100,
      currency: "INR",
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.slotKey) {
      throw new Error("That appointment slot was just taken. Please choose another slot.");
    }
    throw error;
  }

  const receipt = makeReceipt();
  let order;

  try {
    order = await getRazorpayClient().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        appointmentId: appointment._id.toString(),
        doctorId: doctor._id.toString(),
        patientId: patient._id.toString(),
        userId: user._id.toString(),
        organizationId: programContext.organization._id.toString(),
        programId: programContext.program._id.toString(),
        appointmentDate: when.toISOString(),
      },
    });
  } catch (error) {
    await Appointment.deleteOne({
      _id: appointment._id,
      status: "pending",
      paymentId: { $exists: false },
    });
    throw error;
  }

  try {
    await BookingPayment.create({
      userId: user._id.toString(),
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      orderId: order.id,
      receipt,
      amountPaise,
      currency: "INR",
      status: "created",
      gatewayStatus: order.status || "created",
      expiresAt: holdExpiresAt,
    });
  } catch (error) {
    await Appointment.updateOne(
      { _id: appointment._id, status: "pending" },
      {
        $set: { status: "cancelled" },
        $unset: { slotKey: "", holdExpiresAt: "" },
      }
    );
    throw error;
  }

  return {
    orderId: order.id,
    appointmentId: appointment._id.toString(),
    amount: amountPaise,
    currency: "INR",
    keyId: getRazorpayKeyId(),
    checkoutMode: getRazorpayKeyId().startsWith("rzp_live_") ? "live" : "test",
    expiresAt: holdExpiresAt.toISOString(),
    doctorFee: amountPaise / 100,
  };
}

async function fetchProviderState(orderId, paymentId) {
  const client = getRazorpayClient();
  const [payment, order] = await Promise.all([
    client.payments.fetch(paymentId),
    client.orders.fetch(orderId),
  ]);
  return { payment, order };
}

async function captureIfAuthorized({
  payment,
  orderId,
  amountPaise,
  currency,
  allowCapture,
}) {
  if (payment.status !== "authorized" || !allowCapture) return payment;

  try {
    return await getRazorpayClient().payments.capture(
      payment.id,
      amountPaise,
      currency
    );
  } catch (error) {
    // A concurrent webhook/callback may have captured it first.
    const latest = await getRazorpayClient().payments.fetch(payment.id);
    if (latest.status === "captured") return latest;
    throw error;
  }
}

async function fetchPaidOrder(orderId) {
  let latest;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    latest = await getRazorpayClient().orders.fetch(orderId);
    if (latest.status === "paid") return latest;
    await sleep(250);
  }
  return latest;
}

async function refundBecauseSlotUnavailable(booking, paymentId) {
  const client = getRazorpayClient();
  let refund = null;

  try {
    refund = await client.payments.refund(paymentId, {
      amount: booking.amountPaise,
      notes: {
        reason: "appointment_slot_unavailable",
        bookingOrderId: booking.orderId,
      },
    });
  } catch (error) {
    await BookingPayment.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "failed",
          gatewayStatus: "captured_refund_required",
          failureReason:
            "Payment captured but appointment slot unavailable; manual refund check required",
        },
      }
    );
    throw new Error(
      "Payment was captured but the slot became unavailable. Refund processing needs review."
    );
  }

  await BookingPayment.updateOne(
    { _id: booking._id },
    {
      $set: {
        status: "refunded",
        gatewayStatus: refund?.status || "refund_created",
        paymentId,
        failureReason: "Slot unavailable after payment; refund initiated",
      },
    }
  );

  // The money moved back out, so it belongs in the audit chain just as much as
  // the capture did. Best-effort: the refund itself already succeeded.
  try {
    const appointment = await Appointment.findById(booking.appointment)
      .select("organization program doctor patient")
      .lean();
    await recordPaymentRefunded({
      booking,
      appointment,
      refundId: refund?.id || null,
      paymentId,
      amountPaise: booking.amountPaise,
      reason: "appointment_slot_unavailable",
    });
  } catch (error) {
    console.error("Refund audit failed:", error);
  }

  return refund;
}

export async function finalizeCapturedBooking({
  orderId,
  paymentId,
  expectedUserId = null,
  allowCapture = false,
}) {
  const booking = await BookingPayment.findOne({ orderId });
  if (!booking) throw new Error("Booking payment order not found");

  if (expectedUserId && booking.userId !== String(expectedUserId)) {
    throw new Error("Payment order belongs to another user");
  }

  if (booking.status === "booked") {
    const existing = await Appointment.findById(booking.appointment).lean();
    return {
      success: true,
      appointmentId: existing?._id?.toString() || booking.appointment.toString(),
      paymentId: booking.paymentId,
      orderId: booking.orderId,
      duplicate: true,
    };
  }

  if (booking.status === "refunded") {
    throw new Error("This payment was refunded and cannot create an appointment");
  }

  let { payment, order } = await fetchProviderState(orderId, paymentId);

  if (payment.order_id !== orderId) {
    throw new Error("Payment does not belong to this Razorpay order");
  }
  if (String(payment.currency || "").toUpperCase() !== booking.currency) {
    throw new Error("Payment currency does not match booking");
  }
  if (
    Number(payment.amount) !== Number(booking.amountPaise) ||
    Number(order.amount) !== Number(booking.amountPaise)
  ) {
    throw new Error("Payment amount does not match the booking amount");
  }
  if (String(order.notes?.userId || "") !== booking.userId) {
    throw new Error("Razorpay order user does not match booking");
  }
  if (String(order.notes?.doctorId || "") !== booking.doctor.toString()) {
    throw new Error("Razorpay order doctor does not match booking");
  }
  if (String(order.notes?.appointmentId || "") !== booking.appointment.toString()) {
    throw new Error("Razorpay order appointment does not match booking");
  }

  payment = await captureIfAuthorized({
    payment,
    orderId,
    amountPaise: booking.amountPaise,
    currency: booking.currency,
    allowCapture,
  });

  if (payment.status !== "captured") {
    throw new Error(
      `Payment is ${payment.status || "not captured"}; appointment is not confirmed`
    );
  }

  order = await fetchPaidOrder(orderId);
  if (order.status !== "paid") {
    throw new Error("Razorpay order is not in paid state");
  }

  await BookingPayment.updateOne(
    { _id: booking._id, status: { $in: ["created", "verified", "failed"] } },
    {
      $set: {
        status: "verified",
        paymentId,
        gatewayStatus: payment.status,
        verifiedAt: new Date(),
        failureReason: "",
      },
    }
  );

  let appointment = await Appointment.findById(booking.appointment);
  if (!appointment) {
    await refundBecauseSlotUnavailable(booking, paymentId);
    throw new Error("Appointment hold no longer exists; refund initiated");
  }

  if (appointment.status !== "confirmed") {
    const targetSlotKey = slotKeyFor(booking.doctor, appointment.appointmentDate);

    if (appointment.status !== "pending") {
      await expirePendingHoldForSlot({
        doctorId: booking.doctor,
        appointmentDate: appointment.appointmentDate,
      });

      const occupied = await Appointment.findOne({
        _id: { $ne: appointment._id },
        doctor: booking.doctor,
        appointmentDate: appointment.appointmentDate,
        status: { $in: ["pending", "confirmed"] },
      }).lean();

      if (occupied) {
        await refundBecauseSlotUnavailable(booking, paymentId);
        throw new Error("Appointment slot became unavailable; refund initiated");
      }
    }

    appointment.status = "confirmed";
    appointment.slotKey = targetSlotKey;
    appointment.holdExpiresAt = undefined;
    appointment.paymentId = paymentId;
    appointment.paymentOrderId = orderId;
    appointment.amount = booking.amountPaise / 100;
    appointment.currency = booking.currency;

    try {
      await appointment.save();
    } catch (error) {
      if (error?.code === 11000) {
        await refundBecauseSlotUnavailable(booking, paymentId);
        throw new Error("Appointment slot became unavailable; refund initiated");
      }
      throw error;
    }
  }

  await PaymentEvidence.findOneAndUpdate(
    { appointment: appointment._id },
    {
      $set: {
        organization: appointment.organization,
        program: appointment.program,
        appointment: appointment._id,
        provider: "razorpay",
        providerPaymentId: paymentId,
        providerOrderId: orderId,
        currency: booking.currency,
        paymentMethod: payment.method || null,
        grossAmount: booking.amountPaise / 100,
        refundAmount: 0,
        netPaidAmount: booking.amountPaise / 100,
        status: "paid",
        capturedAt: new Date(
          Number(payment.captured_at || payment.created_at || Date.now() / 1000) *
            1000
        ),
        refundedAt: null,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true }
  );

  // ---------------------------------------------------------------------
  // TASK 4 — crash-window ordering.
  //
  // The capsule award, the audit events and the notifications ALL run BEFORE
  // the `status: "booked"` compare-and-set below, and the CAS is the LAST
  // write of the function.
  //
  // Why this order: the CAS is the booking's terminal "this is done" marker.
  // Anything after it that crashes is unrecoverable, because a retry
  // short-circuits on `status === "booked"` at the top of this function and
  // awardCapsules' idempotency key would return `created:false` for a second
  // attempt. Anything BEFORE it is re-driven by the next finalize call, because
  // the booking is still in `verified` and the retry falls through to this
  // exact code path again.
  //
  // Idempotency (why the re-drive is safe, not a double-booking):
  //  - recordAppointmentBooked links the ScheduledOccurrence to the appointment
  //    as its marker, so a second run finds nothing to award; and
  //  - awardCapsules keys on (patient, org, program, sourceId, ruleId), so even
  //    a concurrent award returns created:false instead of double-crediting.
  //  - the audit appends are guarded by an AuditEvent.exists() check on
  //    (eventType, resourceId).
  //  - the notifications are naturally at-least-once; the unread badge simply
  //    shows a second copy rather than dropping the alert.
  //
  // The alternative (a durable "pending work" marker re-driven by a sweeper)
  // was rejected: it needs a background job to exist for the guarantee to hold,
  // whereas this ordering is self-healing on the very next client retry or
  // Razorpay webhook replay, with no new moving parts.
  // ---------------------------------------------------------------------
  await runPostBookingWork({ booking, appointment, paymentId, orderId });

  await BookingPayment.updateOne(
    {
      _id: booking._id,
      status: { $ne: "booked" },
    },
    {
      $set: {
        status: "booked",
        paymentId,
        gatewayStatus: payment.status,
        bookedAt: new Date(),
      },
    }
  );

  return {
    success: true,
    appointmentId: appointment._id.toString(),
    paymentId,
    orderId,
    amount: booking.amountPaise / 100,
    currency: booking.currency,
  };
}

export async function markPaymentAttemptFailed({
  orderId,
  paymentId = null,
  reason = "payment_failed",
}) {
  const update = {
    gatewayStatus: "payment_failed",
    failureReason: String(reason || "payment_failed").slice(0, 500),
  };
  if (paymentId) update.paymentId = paymentId;

  const booking = await BookingPayment.findOne({ orderId });
  const result = await BookingPayment.updateOne(
    {
      orderId,
      status: "created",
      expiresAt: { $gt: new Date() },
    },
    { $set: update }
  );

  const updated = result.modifiedCount > 0;

  // A failed attempt is a money fact too: record it so the chain shows the
  // checkout was tried and declined, not silently dropped. No blockchain anchor
  // here — nothing was captured, so there is no payment id to commit to.
  if (updated && booking) {
    try {
      const appointment = await Appointment.findById(booking.appointment)
        .select("organization program doctor patient")
        .lean();

      await recordPaymentAudit(
        {
          organizationId: appointment?.organization || null,
          programId: appointment?.program || null,
          actorUserId: booking.userId,
          actorRole: "patient",
          eventType: "payment.failed",
          resourceType: "BookingPayment",
          resourceId: booking._id,
          verificationLevel: "system_confirmed",
          metadata: {
            organizationId: String(appointment?.organization || ""),
            programId: String(appointment?.program || ""),
            provider: "razorpay",
            orderId: String(orderId),
            paymentId: String(paymentId || ""),
            amountPaise: Number(booking.amountPaise),
            currency: booking.currency,
            appointmentId: String(booking.appointment),
            doctorId: String(booking.doctor),
            reason: String(reason || "payment_failed").slice(0, 300),
          },
        },
        { attempts: 3 }
      );
    } catch (error) {
      console.error("Payment failure audit failed:", error);
    }
  }

  return { updated };
}

export async function releaseBookingHold({
  orderId,
  userId = null,
  reason = "checkout_closed",
}) {
  const query = { orderId, status: "created" };
  if (userId) query.userId = String(userId);

  const booking = await BookingPayment.findOneAndUpdate(
    query,
    {
      $set: {
        status: "failed",
        gatewayStatus: "checkout_closed",
        failureReason: String(reason).slice(0, 500),
      },
    },
    { new: true }
  );

  if (!booking) return { released: false };

  await Appointment.deleteOne({
    _id: booking.appointment,
    status: "pending",
    paymentId: { $exists: false },
  });

  return { released: true };
}

export async function refundBookedAppointment({
  appointmentId,
  reason = "appointment_cancelled",
}) {
  const booking = await BookingPayment.findOne({ appointment: appointmentId });
  if (!booking) {
    return { refunded: false, paymentRequired: false };
  }

  if (booking.status === "refunded") {
    return {
      refunded: true,
      duplicate: true,
      paymentId: booking.paymentId || null,
    };
  }

  // Demo/test-bypass appointments intentionally have no BookingPayment.
  // A real paid appointment must have reached the booked state before refund.
  if (booking.status !== "booked" || !booking.paymentId) {
    throw new Error(
      "Paid booking is not in a refundable state. Review the payment before cancelling."
    );
  }

  const client = getRazorpayClient();
  const payment = await client.payments.fetch(booking.paymentId);

  if (payment.status !== "captured") {
    throw new Error(
      "Razorpay payment is not captured; cancellation requires payment review."
    );
  }

  let refund;
  try {
    refund = await client.payments.refund(booking.paymentId, {
      amount: booking.amountPaise,
      notes: {
        reason: String(reason || "appointment_cancelled").slice(0, 200),
        bookingOrderId: booking.orderId,
        appointmentId: String(booking.appointment),
      },
    });
  } catch (error) {
    const latest = await BookingPayment.findById(booking._id).lean();
    if (latest?.status === "refunded") {
      return {
        refunded: true,
        duplicate: true,
        paymentId: latest.paymentId || booking.paymentId,
      };
    }
    throw new Error(
      "Razorpay refund could not be initiated. Appointment remains confirmed."
    );
  }

  await Promise.all([
    BookingPayment.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "refunded",
          gatewayStatus: refund?.status || "refund_created",
          failureReason: "Appointment cancelled; refund initiated",
        },
      }
    ),
    PaymentEvidence.updateOne(
      { appointment: booking.appointment },
      {
        $set: {
          refundAmount: booking.amountPaise / 100,
          netPaidAmount: 0,
          status: "refunded",
          refundedAt: new Date(),
        },
      }
    ),
  ]);

  // The gateway refund is already done; recording it in the chain must not be
  // able to fail the cancellation.
  try {
    const appointment = await Appointment.findById(booking.appointment)
      .select("organization program doctor patient")
      .lean();
    await recordPaymentRefunded({
      booking,
      appointment,
      refundId: refund?.id || null,
      paymentId: booking.paymentId,
      amountPaise: booking.amountPaise,
      reason,
    });
  } catch (error) {
    console.error("Refund audit failed:", error);
  }

  return {
    refunded: true,
    refundId: refund?.id || null,
    refundStatus: refund?.status || "refund_created",
    paymentId: booking.paymentId,
    orderId: booking.orderId,
    amount: booking.amountPaise / 100,
    currency: booking.currency,
  };
}

export async function markRefundFromWebhook({
  orderId,
  paymentId,
  refundAmountPaise,
  refundStatus,
}) {
  const booking = await BookingPayment.findOne({ orderId });
  if (!booking) return { updated: false };

  const amount = Math.max(0, Number(refundAmountPaise || 0)) / 100;
  const fullRefund = amount >= booking.amountPaise / 100;

  await BookingPayment.updateOne(
    { _id: booking._id },
    {
      $set: {
        status: fullRefund ? "refunded" : booking.status,
        gatewayStatus: refundStatus || "refunded",
        paymentId: paymentId || booking.paymentId,
      },
    }
  );

  await PaymentEvidence.updateOne(
    { appointment: booking.appointment },
    {
      $set: {
        refundAmount: amount,
        netPaidAmount: Math.max(0, booking.amountPaise / 100 - amount),
        status: fullRefund ? "refunded" : "partially_refunded",
        refundedAt: new Date(),
      },
    }
  );

  // A refund the gateway processed on its own is still money leaving the
  // account, so it gets the same chain record as an in-app cancellation.
  try {
    const appointment = await Appointment.findById(booking.appointment)
      .select("organization program doctor patient")
      .lean();
    await recordPaymentRefunded({
      booking,
      appointment,
      refundId: null,
      paymentId: paymentId || booking.paymentId,
      amountPaise: Math.round(amount * 100),
      reason: "refund_processed_webhook",
    });
  } catch (error) {
    console.error("Webhook refund audit failed:", error);
  }

  return { updated: true };
}
