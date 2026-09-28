import CapsuleAward from "@/models/CapsuleAward";
import Patient from "@/models/Patient";
import UserPreference from "@/models/UserPreference";
import CapsuleBalanceProjection from "@/models/CapsuleBalanceProjection";
import CapsuleDailyCounter from "@/models/CapsuleDailyCounter";
import HospitalProgram from "@/models/HospitalProgram";
import { appendAuditEvent } from "@/lib/carequest/audit";
import { getPrimaryProgramContext } from "@/lib/carequest/programs";

export const CAPSULE_RULE_VERSION = 2;
/**
 * Display ceiling for the animated capsule gauge. This is a UI milestone, not
 * a cap on how many Capsules a patient can earn.
 */
export const CAPSULE_DISPLAY_MAX = 2000;
export const CAPSULE_RULES = Object.freeze({
  lesson_completed: { amount: 2, verificationLevel: "system_confirmed" },
  scheduled_response: { amount: 1, verificationLevel: "self_report" },
  follow_up_booked: { amount: 2, verificationLevel: "system_confirmed" },
  follow_up_attended: { amount: 2, verificationLevel: "staff_documented" },
  activity_goal: { amount: 3, verificationLevel: "system_confirmed" },
  // Report knowledge check. The default amount is the completion credit; the
  // caller passes an explicit amount of 1 + correct answers.
  quiz_completed: { amount: 1, verificationLevel: "system_confirmed" },
  // --- Doctor-facing work -------------------------------------------------
  // The core loop is: a doctor does documented work -> the PATIENT's hospital
  // reputation rises. These rules are the missing link; without them, filing a
  // report or completing a consultation awarded nothing at all.
  //
  // consultation_completed: a doctor marks the appointment completed.
  //   Idempotency key = patient:org:program:<appointmentId>:consultation_completed:v2
  //   -> a retry of the same appointment can never double-award.
  consultation_completed: { amount: 2, verificationLevel: "staff_documented" },
  // report_filed: a doctor publishes a consultation report. The award belongs to
  //   the PATIENT (engagement reward for being seen and getting a plan), which
  //   is why sourceId is the report id and verificationLevel is the highest
  //   tier: the report only exists because a clinician approved it.
  //   Idempotency key = patient:org:program:<reportId>:report_filed:v2
  report_filed: { amount: 3, verificationLevel: "clinician_approved" },
  // remark_added: a doctor records a remark/notes on an appointment.
  //   Deliberately the SMALLEST award (1) and idempotent PER APPOINTMENT
  //   (sourceId = appointmentId), so repeated save-on-keystroke cannot farm
  //   capsules: one appointment can ever yield one remark capsule. Combined
  //   with the hospital's dailyAwardCap this cannot be farmed.
  //   Idempotency key = patient:org:program:<appointmentId>:remark_added:v2
  remark_added: { amount: 1, verificationLevel: "staff_documented" },
});

function hospitalDayKey(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return [parts.year, parts.month, parts.day].join("-");
}

async function getAwardPolicy(organizationId, programId) {
  const program = await HospitalProgram.findOne({
    _id: programId,
    organization: organizationId,
    status: "active",
  })
    .populate("organization", "settings.defaultTimezone")
    .lean();

  if (!program) {
    throw new Error("Active hospital Capsule program not found");
  }

  const dailyAwardCap = Number(program.rules?.dailyAwardCap || 0);
  if (!Number.isFinite(dailyAwardCap) || dailyAwardCap < 1) {
    throw new Error("Hospital Capsule program has an invalid daily award cap");
  }

  return {
    dailyAwardCap,
    timezone:
      program.organization?.settings?.defaultTimezone || "Asia/Kolkata",
  };
}

async function reserveDailyAward({
  patient,
  organization,
  program,
  amount,
}) {
  const policy = await getAwardPolicy(organization, program);
  if (amount > policy.dailyAwardCap) {
    throw new Error("Capsule award exceeds this hospital's daily award cap");
  }

  const dayKey = hospitalDayKey(new Date(), policy.timezone);
  const identity = {
    patient,
    organization,
    program,
    dayKey,
  };

  try {
    await CapsuleDailyCounter.findOneAndUpdate(
      identity,
      {
        $setOnInsert: {
          ...identity,
          awarded: 0,
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Concurrent first-use inserts converge on the unique patient/program/day key.
    if (error?.code !== 11000) throw error;
  }

  const reserved = await CapsuleDailyCounter.findOneAndUpdate(
    {
      ...identity,
      awarded: {
        $lte: policy.dailyAwardCap - amount,
      },
    },
    { $inc: { awarded: amount } },
    { new: true }
  );

  if (!reserved) {
    throw new Error(
      "Daily Capsule cap reached for this hospital program. New rewards resume on the next local calendar day."
    );
  }

  return {
    counterId: reserved._id,
    amount,
    dayKey,
    dailyAwardCap: policy.dailyAwardCap,
  };
}

async function releaseDailyAwardReservation(reservation) {
  if (!reservation?.counterId || !reservation?.amount) return;
  await CapsuleDailyCounter.updateOne(
    {
      _id: reservation.counterId,
      awarded: { $gte: reservation.amount },
    },
    { $inc: { awarded: -reservation.amount } }
  );
}

export async function ensureCapsuleBalanceProjection(
  patient,
  organization,
  program
) {
  let projection = await CapsuleBalanceProjection.findOne({
    patient,
    organization,
    program,
  });
  if (projection) return projection;

  const [summary] = await CapsuleAward.aggregate([
    {
      $match: {
        patient,
        organization,
        program,
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: "$amount" },
        lifetimeEarned: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$eventType", "award"] }, { $gt: ["$amount", 0] }] },
              "$amount",
              0,
            ],
          },
        },
        lifetimeRedeemed: {
          $sum: {
            $cond: [
              { $eq: ["$eventType", "redemption"] },
              { $abs: "$amount" },
              0,
            ],
          },
        },
      },
    },
  ]);

  try {
    projection = await CapsuleBalanceProjection.create({
      patient,
      organization,
      program,
      balance: Number(summary?.balance || 0),
      lifetimeEarned: Number(summary?.lifetimeEarned || 0),
      lifetimeRedeemed: Number(summary?.lifetimeRedeemed || 0),
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    projection = await CapsuleBalanceProjection.findOne({
      patient,
      organization,
      program,
    });
  }

  return projection;
}

export async function awardCapsules({
  patient,
  organization = null,
  program = null,
  ruleId,
  sourceType,
  sourceId,
  actorUserId,
  actorRole,
  verificationLevel,
  amount = null,
}) {
  const rule = CAPSULE_RULES[ruleId];
  if (!rule) throw new Error("Unknown Capsule rule");

  const patientRecord = await Patient.findById(patient).select("userId").lean();
  if (patientRecord?.userId) {
    const preference = await UserPreference.findOne({
      userId: patientRecord.userId,
    }).lean();
    if (preference?.careQuestOptIn === false) {
      return { award: null, created: false, optedOut: true };
    }
  }

  let organizationId = organization;
  let programId = program;
  if (!organizationId || !programId) {
    const context = await getPrimaryProgramContext(patientRecord || { _id: patient });
    organizationId = context.organization._id;
    programId = context.program._id;
  }

  await ensureCapsuleBalanceProjection(patient, organizationId, programId);

  const idempotencyKey = [
    String(patient),
    String(organizationId),
    String(programId),
    String(sourceId),
    ruleId,
    "v" + CAPSULE_RULE_VERSION,
  ].join(":");

  let award = await CapsuleAward.findOne({ idempotencyKey });
  if (award) return { award, created: false };

  const hasExplicitAmount = amount !== null && amount !== undefined;
  const awardAmount = hasExplicitAmount ? Number(amount) : rule.amount;
  if (!Number.isFinite(awardAmount) || awardAmount <= 0) {
    throw new Error("Capsule award amount must be a positive number");
  }

  const dailyReservation = await reserveDailyAward({
    patient,
    organization: organizationId,
    program: programId,
    amount: awardAmount,
  });

  try {
    award = await CapsuleAward.create({
      patient,
      organization: organizationId,
      program: programId,
      ruleId,
      ruleVersion: CAPSULE_RULE_VERSION,
      sourceType,
      sourceId: String(sourceId),
      amount: awardAmount,
      verificationLevel: verificationLevel || rule.verificationLevel,
      idempotencyKey,
      blockchain: {
        status:
          process.env.CAREQUEST_BLOCKCHAIN_ENABLED === "true" ? "pending" : "disabled",
      },
    });
  } catch (error) {
    await releaseDailyAwardReservation(dailyReservation);
    if (error?.code === 11000) {
      award = await CapsuleAward.findOne({ idempotencyKey });
      return { award, created: false };
    }
    throw error;
  }

  await CapsuleBalanceProjection.updateOne(
    {
      patient,
      organization: organizationId,
      program: programId,
    },
    {
      $inc: {
        balance: award.amount,
        lifetimeEarned: Math.max(0, Number(award.amount || 0)),
      },
    }
  );

  // The award + projection are already committed at this point, so a failure
  // here must NOT propagate to the caller (a retry would hit the idempotency
  // key and return success while the audit event was never written). Retry a
  // few times for a contended chain head, and only then mark the award as
  // needing a repair marker rather than losing the award silently.
  let auditRecorded = false;
  for (let attempt = 0; attempt < 4 && !auditRecorded; attempt += 1) {
    try {
      await appendAuditEvent({
        organizationId,
        programId,
        actorUserId,
        actorRole,
        eventType: "capsule.awarded",
        resourceType: "CapsuleAward",
        resourceId: award._id,
        verificationLevel: award.verificationLevel,
        metadata: {
          organizationId: String(organizationId),
          programId: String(programId),
          ruleId,
          ruleVersion: CAPSULE_RULE_VERSION,
          amount: award.amount,
          sourceType,
          sourceId: String(sourceId),
          dailyCap: dailyReservation.dailyAwardCap,
          dailyCapDayKey: dailyReservation.dayKey,
        },
      });
      auditRecorded = true;
    } catch {
      // contended chain head: retry
    }
  }

  if (!auditRecorded) {
    // Flag it so the admin audit console can surface the gap instead of the
    // award silently existing with no provenance.
    await CapsuleAward.updateOne(
      { _id: award._id },
      { $set: { auditPending: true, auditPendingAt: new Date() } }
    ).catch(() => {});
  }

  return { award, created: true };
}

/**
 * Record a benefit redemption as an audited, negative ledger row.
 *
 * This is the ONLY supported way to spend Capsules. A raw `CapsuleAward.create`
 * leaves a row in the authoritative ledger with no provenance: it never
 * appears in the audit chain, so the balance can silently diverge from a
 * provable history. Redemptions therefore go through this function, which
 * writes the negative row AND the `capsule.redeemed` audit event.
 *
 * The caller is responsible for the conditional projection/budget/inventory
 * reservation that proves the patient could afford it; this function only
 * records the spend once that reservation has been taken.
 */
export async function redeemCapsules({
  patient,
  organization,
  program,
  redemption,
  redemptionKey,
  capsulesSpent,
  actorUserId,
  actorRole,
}) {
  const spend = Math.abs(Number(capsulesSpent || 0));
  if (!Number.isFinite(spend) || spend <= 0) {
    throw new Error("Redemption must spend a positive number of Capsules");
  }
  if (!organization || !program) {
    throw new Error("A redemption must be scoped to a hospital program");
  }

  const key = "redemption:" + String(redemptionKey || redemption?._id || "");
  if (key === "redemption:") {
    throw new Error("A redemption key is required");
  }

  const existing = await CapsuleAward.findOne({ idempotencyKey: key }).lean();
  if (existing) return { award: existing, created: false };

  await ensureCapsuleBalanceProjection(patient, organization, program);

  let award;
  try {
    award = await CapsuleAward.create({
      patient,
      organization,
      program,
      ruleId: "benefit_redemption",
      ruleVersion: 1,
      sourceType: "Redemption",
      sourceId: String(redemption?._id || key),
      amount: -spend,
      verificationLevel: "system_confirmed",
      idempotencyKey: key,
      eventType: "redemption",
      blockchain: {
        status:
          process.env.CAREQUEST_BLOCKCHAIN_ENABLED === "true"
            ? "pending"
            : "disabled",
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const winner = await CapsuleAward.findOne({ idempotencyKey: key }).lean();
      if (winner) return { award: winner, created: false };
    }
    throw error;
  }

  await appendAuditEvent({
    organizationId: organization,
    programId: program,
    actorUserId,
    actorRole,
    eventType: "capsule.redeemed",
    resourceType: "CapsuleAward",
    resourceId: award._id,
    verificationLevel: "system_confirmed",
    metadata: {
      organizationId: String(organization),
      programId: String(program),
      redemptionId: String(redemption?._id || ""),
      redemptionKey: String(redemptionKey || ""),
      capsulesSpent: spend,
      ruleId: "benefit_redemption",
      ruleVersion: 1,
    },
  });

  return { award, created: true };
}

/**
 * Recompute CapsuleBalanceProjection from the authoritative CapsuleAward
 * ledger. Used after any operation that moves historical rows between
 * (organization, program) buckets, so the running balance can never drift from
 * the ledger. This is a repair/idempotent operation.
 */
export async function recomputeBalanceProjection({ patient, organization, program }) {
  const [summary] = await CapsuleAward.aggregate([
    { $match: { patient, organization, program } },
    {
      $group: {
        _id: null,
        balance: { $sum: "$amount" },
        lifetimeEarned: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$eventType", "award"] }, { $gt: ["$amount", 0] }] },
              "$amount",
              0,
            ],
          },
        },
        lifetimeRedeemed: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "redemption"] }, { $abs: "$amount" }, 0],
          },
        },
      },
    },
  ]);

  const balance = Number(summary?.balance || 0);
  await CapsuleBalanceProjection.updateOne(
    { patient, organization, program },
    {
      $set: {
        balance,
        lifetimeEarned: Math.max(0, Number(summary?.lifetimeEarned || 0)),
        lifetimeRedeemed: Math.max(0, Number(summary?.lifetimeRedeemed || 0)),
      },
    },
    { upsert: true }
  );
  return balance;
}

/**
 * A patient's redeemable balance.
 *
 * Capsules are HOSPITAL-SPECIFIC: they are only redeemable against the reward
 * catalog of the program they were earned in. So the balance MUST be scoped to
 * one program. When no programId is supplied we resolve the patient's active
 * primary program rather than summing across every hospital they belong to —
 * a cross-hospital sum advertises a benefit the patient can never redeem
 * (e.g. "60 capsules" next to a gauge that says 0).
 */
export async function getCapsuleBalance(patientId, programId = null) {
  let resolvedProgramId = programId;
  if (!resolvedProgramId) {
    const context = await getPrimaryProgramContext({ _id: patientId });
    resolvedProgramId = context.program._id;
  }

  const [result] = await CapsuleAward.aggregate([
    { $match: { patient: patientId, program: resolvedProgramId } },
    { $group: { _id: "$patient", balance: { $sum: "$amount" } } },
  ]);
  return result?.balance || 0;
}

export function getSimulatedBenefitEligibility(balance) {
  if (balance >= 80) return { tier: "support-80", modeledInr: 350 };
  if (balance >= 50) return { tier: "travel-50", modeledInr: 200 };
  if (balance >= 30) return { tier: "care-30", modeledInr: 100 };
  return { tier: "none", modeledInr: 0 };
}

export async function reverseCapsuleAward({
  awardId,
  reason,
  actorUserId,
  actorRole,
}) {
  const cleanReason = String(reason || "").trim().slice(0, 2000);
  if (!cleanReason) throw new Error("A documented correction reason is required");

  const original = await CapsuleAward.findOne({
    _id: awardId,
    eventType: "award",
  });
  if (!original) throw new Error("Original Capsule award not found");

  await ensureCapsuleBalanceProjection(
    original.patient,
    original.organization,
    original.program
  );

  const idempotencyKey = "reversal:" + String(original._id);
  let reversal = await CapsuleAward.findOne({ idempotencyKey });
  if (reversal) return { reversal, created: false };

  reversal = await CapsuleAward.create({
    patient: original.patient,
    organization: original.organization,
    program: original.program,
    ruleId: original.ruleId,
    ruleVersion: original.ruleVersion,
    sourceType: "CapsuleAwardCorrection",
    sourceId: String(original._id),
    amount: -Math.abs(original.amount),
    verificationLevel: "staff_documented",
    idempotencyKey,
    eventType: "reversal",
    reversalOf: original._id,
    blockchain: {
      status:
        process.env.CAREQUEST_BLOCKCHAIN_ENABLED === "true" ? "pending" : "disabled",
    },
  });

  // Re-derive the projection from the ledger rather than blindly $inc-ing it:
  // a reversal is a correction, so it must leave the balance exactly equal to
  // the signed sum of the ledger rows, even if the projection had drifted.
  await recomputeBalanceProjection({
    patient: original.patient,
    organization: original.organization,
    program: original.program,
  });

  await appendAuditEvent({
    organizationId: original.organization,
    programId: original.program,
    actorUserId,
    actorRole,
    eventType: "capsule.reversed",
    resourceType: "CapsuleAward",
    resourceId: reversal._id,
    verificationLevel: "staff_documented",
    metadata: {
      organizationId: String(original.organization || ""),
      programId: String(original.program || ""),
      originalAwardId: String(original._id),
      amount: reversal.amount,
      reason: cleanReason,
    },
  });

  return { reversal, created: true };
}
