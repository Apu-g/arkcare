"use server";

import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import Message from "@/models/Message";
import Appointment from "@/models/Appointment";
import Doctor from "@/models/Doctor";
import Patient from "@/models/Patient";
import { pusherServer } from "@/lib/pusher";
import { requireUser } from "@/lib/auth";

/** Resolve the sender's display name from their profile document. */
async function resolveSenderName(user) {
  const userId = user._id.toString();

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId }).select("name").lean();
    if (doctor?.name) return doctor.name;
  } else {
    const patient = await Patient.findOne({ userId }).select("name").lean();
    if (patient?.name) return patient.name;
  }

  return user.name;
}

async function assertChatParticipant(chatId, userId) {
  if (!/^[0-9a-fA-F]{24}$/.test(String(chatId || ""))) {
    throw new Error("Invalid chat");
  }

  const chat = await Chat.findById(chatId).populate("doctorId patientId");
  if (!chat || !chat.doctorId || !chat.patientId) {
    throw new Error("Chat not found");
  }

  const hasAccess =
    chat.doctorId.userId === userId || chat.patientId.userId === userId;

  if (!hasAccess) {
    throw new Error("Unauthorized access");
  }

  return chat;
}

/**
 * Post a text message. The sender identity comes from the session cookie, never
 * from the client.
 */
export async function sendMessage(chatId, message) {
  try {
    const user = await requireUser();
    const senderId = user._id.toString();

    await connectDB();

    await assertChatParticipant(chatId, senderId);

    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) throw new Error("Message cannot be empty");
    if (cleanMessage.length > 4000) throw new Error("Message is too long");

    const senderName = await resolveSenderName(user);

    // Save message to database (authoritative). A non-clinician staff member
    // with a patient profile is still a chat participant, but the Message
    // enum only allows doctor|patient, so map the role rather than writing
    // user.role and risking a ValidationError that loses the message.
    const newMessage = await Message.create({
      chatId,
      senderId,
      senderType: user.role === "doctor" ? "doctor" : "patient",
      senderName,
      message: cleanMessage,
      messageType: "text",
    });

    // Realtime delivery is ADVISORY. The message is already durably saved; a
    // Pusher failure must not fail the request, otherwise the client keeps the
    // text in the box and re-sending creates a duplicate clinical record.
    try {
      await pusherServer.trigger(`private-chat-${chatId}`, "new-message", {
        _id: newMessage._id.toString(),
        chatId: newMessage.chatId,
        senderId: newMessage.senderId,
        senderType: newMessage.senderType,
        senderName: newMessage.senderName,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("Realtime delivery failed (message still saved):", error);
    }

    return JSON.parse(JSON.stringify(newMessage));
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export async function createOrGetChat(appointmentId) {
  try {
    const user = await requireUser();
    const userId = user._id.toString();

    await connectDB();

    // Get appointment details
    const appointment = await Appointment.findById(appointmentId).populate(
      "doctor patient"
    );

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Check if doctor or patient data is missing
    if (!appointment.doctor || !appointment.patient) {
      throw new Error("Appointment has missing doctor or patient information");
    }

    // Check if user has access to this appointment
    const hasAccess =
      appointment.doctor.userId === userId ||
      appointment.patient.userId === userId;

    if (!hasAccess) {
      throw new Error("Unauthorized access");
    }

    // Chat stays available after the visit so the doctor can file the
    // consultation report and the patient can still read it. Cancelled
    // appointments close the thread.
    if (!["confirmed", "completed"].includes(appointment.status)) {
      throw new Error("Chat is not available for this appointment");
    }

    // Atomically resolve one chat room for the appointment. Patient and doctor
    // can open chat at the same instant; a plain find-then-create can race and
    // put them on different Pusher channels.
    let chat;
    try {
      chat = await Chat.findOneAndUpdate(
        { appointmentId },
        {
          $setOnInsert: {
            appointmentId,
            doctorId: appointment.doctor._id,
            patientId: appointment.patient._id,
            isActive: true,
            lastActivity: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    } catch (error) {
      // If another request won the unique-index race, use the room it created.
      if (error?.code === 11000) {
        chat = await Chat.findOne({ appointmentId });
      } else {
        throw error;
      }
    }

    if (!chat) throw new Error("Could not initialize chat");

    return JSON.parse(JSON.stringify(chat));
  } catch (error) {
    console.error("Error creating/getting chat:", error);
    throw error;
  }
}

export async function getChatMessages(chatId, { limit = 100, before = null } = {}) {
  try {
    const user = await requireUser();
    const userId = user._id.toString();

    await connectDB();

    // Same guards as assertChatParticipant: a malformed id or a chat whose
    // doctor/patient document is missing must not 500.
    if (!/^[0-9a-fA-F]{24}$/.test(String(chatId || ""))) {
      throw new Error("Invalid chat");
    }
    const chat = await Chat.findById(chatId).populate("doctorId patientId");

    if (!chat || !chat.doctorId || !chat.patientId) {
      throw new Error("Chat not found");
    }

    const hasAccess =
      chat.doctorId.userId === userId || chat.patientId.userId === userId;

    if (!hasAccess) {
      throw new Error("Unauthorized access");
    }

    // Return the LATEST `limit` messages (ascending), not the oldest — the old
    // sort(+1).limit(100) permanently hid everything after the 100th message.
    const query = { chatId };
    if (before) {
      const cursor = await Message.findOne({ _id: before }).select("createdAt").lean();
      if (cursor) query.createdAt = { $lt: cursor.createdAt };
    }
    const capped = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const messages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(capped);

    return JSON.parse(
      JSON.stringify(messages.reverse())
    );
  } catch (error) {
    console.error("Error getting chat messages:", error);
    throw error;
  }
}

export async function sendImageMessage(chatId, imageUrl, imagePublicId) {
  try {
    const user = await requireUser();
    const senderId = user._id.toString();

    await connectDB();

    await assertChatParticipant(chatId, senderId);

    // Only accept a Cloudinary-hosted URL that this app actually produced. A
    // participant-supplied arbitrary URL would be rendered as <img> and opened
    // via window.open inside a clinical thread, leaking the reader's IP/UA.
    const cleanImageUrl = String(imageUrl || "").trim();
    if (!cleanImageUrl) throw new Error("An image URL is required");
    if (cleanImageUrl.length > 600) throw new Error("Image URL is too long");
    let parsedUrl;
    try {
      parsedUrl = new URL(cleanImageUrl);
    } catch {
      throw new Error("Image URL is not valid");
    }
    const allowedHost = process.env.CLOUDINARY_CLOUD_NAME;
    if (parsedUrl.protocol !== "https:" || !allowedHost) {
      throw new Error("Image must be an https Cloudinary upload");
    }
    if (parsedUrl.hostname !== "res.cloudinary.com") {
      throw new Error("Image must be hosted on Cloudinary");
    }
    if (!parsedUrl.hostname.includes(allowedHost)) {
      throw new Error("Image does not belong to this Cloudinary account");
    }

    const senderName = await resolveSenderName(user);

    const newMessage = await Message.create({
      chatId,
      senderId,
      senderType: user.role === "doctor" ? "doctor" : "patient",
      senderName,
      imageUrl: cleanImageUrl,
      imagePublicId: String(imagePublicId || "").slice(0, 200),
      messageType: "image",
    });

    // Realtime is advisory; the image message is already saved.
    try {
      await pusherServer.trigger(`private-chat-${chatId}`, "new-message", {
        _id: newMessage._id.toString(),
        chatId: newMessage.chatId,
        senderId: newMessage.senderId,
        senderType: newMessage.senderType,
        senderName: newMessage.senderName,
        imageUrl: newMessage.imageUrl,
        messageType: newMessage.messageType,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("Realtime delivery failed (image message still saved):", error);
    }

    return JSON.parse(JSON.stringify(newMessage));
  } catch (error) {
    console.error("Error sending image message:", error);
    throw error;
  }
}
