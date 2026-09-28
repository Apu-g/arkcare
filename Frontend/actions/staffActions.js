"use server";

import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import connectDB from "@/lib/db";
import HandoffCase from "@/models/HandoffCase";
import CaseEvent from "@/models/CaseEvent";
import Doctor from "@/models/Doctor";
import CarePlan from "@/models/CarePlan";
import WorkflowFeedback from "@/models/WorkflowFeedback";
import {
  ensureCareQuestMembership,
  requireStaffMembership,
} from "@/lib/carequest/permissions";
import { appendAuditEvent } from "@/lib/carequest/audit";
import { emitCareQuestStaff } from "@/lib/carequest/realtime";

function serialize(value) {
  return JSON.parse(JSON.stringify(value));
}

async function getAuthorizedCase(user, caseId) {
  if (!mongoose.isValidObjectId(caseId)) throw new Error("Invalid handoff case");

  if (["nurse", "coordinator"].includes(user.role)) {
    const membership = await requireStaffMembership(user, ["nurse", "coordinator"]);
    const handoff = await HandoffCase.findOne({
      _id: caseId,
      organization: membership.organization._id,
    });
    if (!handoff) throw new Error("Handoff case not found");
    return handoff;
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id.toString() }).lean();
    if (!doctor) throw new Error("Doctor profile not found");
    const membership = await ensureCareQuestMembership(user, "doctor");
    if (!membership?.active) throw new Error("Inactive CareQuest membership");
    const plans = await CarePlan.find({
      ownerDoctor: doctor._id,
      $or: [
        { organization: membership.organization._id },
        { organization: null },
        { organization: { $exists: false } },
      ],
    })
      .select("_id")
      .lean();
    const handoff = await HandoffCase.findOne({
      _id: caseId,
      carePlan: { $in: plans.map((plan) => plan._id) },
    });
    if (!handoff) throw new Error("Handoff case not found");
    return handoff;
  }

  throw new Error("Staff access required");
}

export async function getHandoffQueue() {
  const user = await requireUser();
  await connectDB();

  let query;
  if (["nurse", "coordinator"].includes(user.role)) {
    const membership = await requireStaffMembership(user);
    query = { organization: membership.organization._id };
  } else if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id.toString() }).lean();
    if (!doctor) return [];
    const membership = await ensureCareQuestMembership(user, "doctor");
    if (!membership?.active) return [];
    const plans = await CarePlan.find({
      ownerDoctor: doctor._id,
      $or: [
        { organization: membership.organization._id },
        { organization: null },
        { organization: { $exists: false } },
      ],
    })
      .select("_id")
      .lean();
    query = {
      carePlan: { $in: plans.map((plan) => plan._id) },
      organization: membership.organization._id,
      status: "escalated",
    };
  } else {
    throw new Error("Staff access required");
  }

  const cases = await HandoffCase.find(query)
    .populate("patient", "name email userId")
    .populate("occurrence", "title activityKey currentResponse")
    .populate("assignedTo", "name email role")
    .sort({ status: 1, priority: -1, dueAt: 1 })
    .lean();

  const ids = cases.map((item) => item._id);
  const events = await CaseEvent.find({ caseId: { $in: ids } })
    .sort({ createdAt: 1 })
    .lean();
  const grouped = new Map();
  for (const event of events) {
    const key = String(event.caseId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }

  return serialize(
    cases.map((item) => ({
      ...item,
      overdue: item.status !== "resolved" && new Date(item.dueAt) < new Date(),
      events: grouped.get(String(item._id)) || [],
    }))
  );
}

export async function assignHandoffCase(caseId) {
  const user = await requireUser();
  await connectDB();
  const handoff = await getAuthorizedCase(user, caseId);

  if (!["nurse", "coordinator"].includes(user.role)) {
    throw new Error("Only nurse/coordinator staff can own a handoff");
  }

  handoff.assignedTo = user._id;
  handoff.assignedRole = user.role;
  handoff.status = "assigned";
  await handoff.save();

  await CaseEvent.create({
    caseId: handoff._id,
    eventType: "case.assigned",
    actorUserId: user._id.toString(),
    actorRole: user.role,
    note: "Case assigned to current staff member",
  });

  await appendAuditEvent({
    organizationId: handoff.organization,
    actorUserId: user._id,
    actorRole: user.role,
    eventType: "handoff.assigned",
    resourceType: "HandoffCase",
    resourceId: handoff._id,
    verificationLevel: "staff_documented",
    metadata: { assignedRole: handoff.assignedRole },
  });

  await emitCareQuestStaff(
    handoff.organization,
    "handoff.updated",
    {
      caseId: String(handoff._id),
      status: handoff.status,
    }
  );

  return serialize(handoff);
}

export async function recordHandoffContact(caseId, { successful, note }) {
  const user = await requireUser();
  await connectDB();
  const handoff = await getAuthorizedCase(user, caseId);
  const cleanNote = String(note || "").trim().slice(0, 3000);
  if (!cleanNote) throw new Error("Document what happened during the contact attempt");

  handoff.lastContactSuccessful = Boolean(successful);
  handoff.status = "contacted";
  await handoff.save();

  await CaseEvent.create({
    caseId: handoff._id,
    eventType: successful ? "contact.successful" : "contact.unsuccessful",
    actorUserId: user._id.toString(),
    actorRole: user.role,
    note: cleanNote,
  });

  await appendAuditEvent({
    organizationId: handoff.organization,
    actorUserId: user._id,
    actorRole: user.role,
    eventType: successful ? "handoff.contact.successful" : "handoff.contact.unsuccessful",
    resourceType: "HandoffCase",
    resourceId: handoff._id,
    verificationLevel: "staff_documented",
    metadata: { successful: Boolean(successful) },
  });

  await emitCareQuestStaff(
    handoff.organization,
    "handoff.updated",
    {
      caseId: String(handoff._id),
      status: handoff.status,
    }
  );

  return serialize(handoff);
}

export async function escalateHandoffCase(caseId, note) {
  const user = await requireUser();
  await connectDB();
  const handoff = await getAuthorizedCase(user, caseId);
  const cleanNote = String(note || "").trim().slice(0, 3000);
  if (!cleanNote) throw new Error("Document the clinical question before escalation");

  if (!["nurse", "coordinator"].includes(user.role)) {
    throw new Error("Only staff can escalate a case to the doctor");
  }

  handoff.status = "escalated";
  handoff.assignedRole = "doctor";
  handoff.assignedTo = null;
  await handoff.save();

  await CaseEvent.create({
    caseId: handoff._id,
    eventType: "case.escalated",
    actorUserId: user._id.toString(),
    actorRole: user.role,
    note: cleanNote,
  });

  await appendAuditEvent({
    organizationId: handoff.organization,
    actorUserId: user._id,
    actorRole: user.role,
    eventType: "handoff.escalated",
    resourceType: "HandoffCase",
    resourceId: handoff._id,
    verificationLevel: "staff_documented",
    metadata: { reason: "clinical_review_requested" },
  });

  await emitCareQuestStaff(
    handoff.organization,
    "handoff.updated",
    {
      caseId: String(handoff._id),
      status: handoff.status,
    }
  );

  return serialize(handoff);
}

export async function reassignHandoffForShift(caseId, note = "Shift change") {
  const user = await requireUser();
  await connectDB();
  const handoff = await getAuthorizedCase(user, caseId);
  if (!["nurse", "coordinator"].includes(user.role)) {
    throw new Error("Staff access required");
  }

  handoff.assignedTo = null;
  handoff.assignedRole = "coordinator";
  handoff.status = "open";
  await handoff.save();

  await CaseEvent.create({
    caseId: handoff._id,
    eventType: "case.reassigned",
    actorUserId: user._id.toString(),
    actorRole: user.role,
    note: String(note || "Shift change").slice(0, 3000),
  });

  await emitCareQuestStaff(
    handoff.organization,
    "handoff.updated",
    {
      caseId: String(handoff._id),
      status: handoff.status,
    }
  );

  return serialize(handoff);
}

export async function resolveHandoffCase(caseId, outcome) {
  const user = await requireUser();
  await connectDB();
  const handoff = await getAuthorizedCase(user, caseId);
  const cleanOutcome = String(outcome || "").trim().slice(0, 3000);
  if (!cleanOutcome) throw new Error("A case cannot close without a documented outcome or reason");

  if (handoff.status === "escalated" && user.role !== "doctor") {
    throw new Error("A doctor must resolve an escalated clinical question");
  }

  handoff.status = "resolved";
  handoff.outcome = cleanOutcome;
  handoff.resolvedAt = new Date();
  await handoff.save();

  await CaseEvent.create({
    caseId: handoff._id,
    eventType: "case.resolved",
    actorUserId: user._id.toString(),
    actorRole: user.role,
    note: cleanOutcome,
  });

  await appendAuditEvent({
    organizationId: handoff.organization,
    actorUserId: user._id,
    actorRole: user.role,
    eventType: "handoff.resolved",
    resourceType: "HandoffCase",
    resourceId: handoff._id,
    verificationLevel: user.role === "doctor" ? "clinician_approved" : "staff_documented",
    metadata: { resolutionDocumented: true },
  });

  await emitCareQuestStaff(
    handoff.organization,
    "handoff.updated",
    {
      caseId: String(handoff._id),
      status: handoff.status,
    }
  );

  return serialize(handoff);
}


export async function submitWorkflowFeedback({
  duplicateEntryMinutes,
  alertBurden,
  note = "",
}) {
  const user = await requireUser();
  await connectDB();
  const membership = await requireStaffMembership(user, ["nurse", "coordinator"]);

  const minutes = Number(duplicateEntryMinutes);
  const burden = Number(alertBurden);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 480) {
    throw new Error("Duplicate-entry minutes must be between 0 and 480");
  }
  if (!Number.isInteger(burden) || burden < 1 || burden > 5) {
    throw new Error("Alert burden must be rated from 1 to 5");
  }

  const feedback = await WorkflowFeedback.create({
    organization: membership.organization._id,
    staffUser: user._id,
    staffRole: user.role,
    duplicateEntryMinutes: minutes,
    alertBurden: burden,
    note: String(note || "").trim().slice(0, 2000),
  });

  await appendAuditEvent({
    organizationId: membership.organization._id,
    actorUserId: user._id,
    actorRole: user.role,
    eventType: "workflow.feedback.recorded",
    resourceType: "WorkflowFeedback",
    resourceId: feedback._id,
    verificationLevel: "staff_documented",
    metadata: { duplicateEntryMinutes: minutes, alertBurden: burden },
  });

  return serialize(feedback);
}
