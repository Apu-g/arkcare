import Notification, { NOTIFICATION_TYPES } from "@/models/Notification";
import { pusherServer } from "@/lib/pusher";
import {
  emitCareQuestStaff,
  emitCareQuestUser,
} from "@/lib/carequest/realtime";

const MAX_LIMIT = 50;

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function sanitizeData(data) {
  if (!data || typeof data !== "object") return {};
  // Keys are flattened to plain values: a Mixed field is directly readable by
  // the client, so nothing exotic (functions, undefined, prototypes) rides in.
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const type = typeof value;
    if (type === "string" || type === "number" || type === "boolean") {
      out[String(key).slice(0, 60)] = type === "string" ? value.slice(0, 500) : value;
    } else {
      out[String(key).slice(0, 60)] = String(value).slice(0, 500);
    }
  }
  return out;
}

/**
 * Persist a notification for one recipient and best-effort push it over Pusher
 * on that user's private channel.
 *
 * The push is a courtesy: if Pusher is unconfigured or down we still return the
 * stored document and never throw, because every caller is a clinical or payment
 * path that must not be failed by a realtime outage. The client polls as the
 * fallback.
 */
export async function createNotification({
  recipientUserId,
  recipientRole = null,
  type,
  title,
  body = "",
  data = {},
  organizationId = null,
}) {
  if (!recipientUserId) return null;
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const notification = await Notification.create({
    recipient: recipientUserId,
    type,
    title: clean(title, 200) || "Update",
    body: clean(body, 2000),
    data: sanitizeData({
      ...data,
      recipientRole,
      organizationId,
    }),
    readAt: null,
  });

  const payload = {
    id: String(notification._id),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    createdAt: notification.createdAt,
  };

  try {
    await pusherServer.trigger(
      "private-user-" + String(recipientUserId),
      "notification.created",
      payload
    );
  } catch {
    // Realtime is best-effort; the stored notification is still delivered.
  }

  // Also publish on the existing per-user channel, which the app's Pusher auth
  // endpoint already authorizes. Without this the browser could never subscribe
  // to the channel above, so the live nudge would be a no-op in practice.
  await emitCareQuestUser(recipientUserId, "notification.created", payload);

  return notification;
}

export async function getNotifications(userId, { limit = 20 } = {}) {
  if (!userId) return [];

  const capped = Math.min(Math.max(1, Number(limit) || 20), MAX_LIMIT);

  const rows = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(capped)
    .lean();

  return JSON.parse(JSON.stringify(rows));
}

export async function getUnreadCount(userId) {
  if (!userId) return 0;
  return Notification.countDocuments({ recipient: userId, readAt: null });
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return 0;

  const result = await Notification.updateMany(
    { recipient: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return result.modifiedCount || 0;
}

/**
 * Fan a notification out to the hospital staff who can act on it (nurse /
 * coordinator / admin) AND put it on the hospital's live staff channel.
 *
 * Used for the "a doctor was just booked" alert: the staff console needs the
 * live channel, and each named staff member needs a durable inbox entry so the
 * alert is not lost while their socket is down.
 */
export async function notifyHospitalStaff({
  organizationId,
  type,
  title,
  body = "",
  data = {},
  excludeUserId = null,
}) {
  if (!organizationId) return [];

  const { default: CareQuestMembership } = await import(
    "@/models/CareQuestMembership"
  );

  const memberships = await CareQuestMembership.find({
    organization: organizationId,
    role: { $in: ["nurse", "coordinator", "hospital_admin"] },
    active: true,
  })
    .select("user role")
    .lean();

  const created = [];

  for (const membership of memberships) {
    if (excludeUserId && String(membership.user) === String(excludeUserId)) {
      continue;
    }
    try {
      const notification = await createNotification({
        recipientUserId: membership.user,
        recipientRole: membership.role,
        type,
        title,
        body,
        data,
        organizationId,
      });
      if (notification) created.push(notification);
    } catch (error) {
      console.error("Failed to create a staff notification:", error);
    }
  }

  await emitCareQuestStaff(organizationId, "appointment.booked", {
    appointmentId: data.appointmentId || null,
    doctorId: data.doctorId || null,
    notifiedStaff: created.length,
  });

  return created;
}
