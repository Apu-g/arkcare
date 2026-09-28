import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "appointment_booked",
  "appointment_completed",
  "appointment_cancelled",
  "report_published",
  "carequest_alert",
];

/**
 * Durable, per-user notification inbox.
 *
 * Pusher is only the live nudge: the document is the record of truth, so a
 * dropped socket (or a Pusher outage) still leaves the notification readable on
 * the next poll. That is why nothing here depends on the realtime rail.
 */
const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: "", trim: true, maxlength: 2000 },
    // Free-form routing payload (appointmentId, reportId, links...). `dedupeKey`
    // is written by the emitters so a retried booking cannot fan out the same
    // alert twice.
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    // Set when hospital staff acknowledged the alert on the patient's behalf,
    // without the recipient ever opening it. Null = not acknowledged.
    readByOrg: { type: Date, default: null },
  },
  { timestamps: true }
);

// The bell list: newest first for one recipient.
NotificationSchema.index({ recipient: 1, createdAt: -1 });
// The unread badge count: only unread rows for one recipient.
NotificationSchema.index({ recipient: 1, readAt: 1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
