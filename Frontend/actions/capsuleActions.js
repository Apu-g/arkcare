"use server";

/**
 * Capsule correction actions.
 *
 * `reverseCapsuleAward` (lib/carequest/capsules.js) writes the correct signed
 * ledger row and the `capsule.reversed` audit event, but it had ZERO call
 * sites: no mis-awarded Capsule could ever be corrected, so a bad award was
 * permanent. This module is the authorized correction path.
 *
 * Authorization model (mirrors lib/carequest/permissions.js):
 *   - `hospital_admin` may ONLY reverse awards inside their own hospital's
 *     programs.
 *   - `platform_admin` may reverse any award (they are intentionally not scoped
 *     to one hospital).
 *   - Patients, doctors, nurses and coordinators CANNOT reverse anything.
 *
 * Every reversal requires a written reason, which is stored on the audit event
 * as the documented justification. Capsules remain non-transferable and
 * non-cash: reversing an award only moves a participation counter, it never
 * creates, settles or refunds anything of monetary value.
 */

import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import connectDB from "@/lib/db";
import CapsuleAward from "@/models/CapsuleAward";
import HospitalProgram from "@/models/HospitalProgram";
import {
  isPlatformAdmin,
  requireStaffMembership,
} from "@/lib/carequest/permissions";
import { reverseCapsuleAward, recomputeBalanceProjection } from "@/lib/carequest/capsules";

function serialize(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Resolve the caller's correction scope. Returns null for anyone who is not
 * allowed to correct a Capsule award.
 */
async function requireCorrectionAuthority() {
  const user = await requireUser();
  await connectDB();

  if (user.role !== "hospital_admin" && !isPlatformAdmin(user)) {
    throw new Error("Only a hospital admin or the platform admin can correct Capsules");
  }

  const membership = await requireStaffMembership(user, ["hospital_admin"]);

  if (isPlatformAdmin(user)) {
    return { user, organization: membership.organization, isPlatform: true };
  }

  if (!membership?.organization?._id) {
    throw new Error("Active hospital membership required");
  }
  return { user, organization: membership.organization, isPlatform: false };
}

/**
 * Reject a reversal for a ledger row this admin does not own. A hospital admin
 * must never be able to reverse another hospital's award and move its
 * reputation.
 */
async function assertAwardInScope(award, authority) {
  if (authority.isPlatform) return;

  const awardOrg = award.organization ? String(award.organization) : "";
  const scopeOrg = String(authority.organization._id);

  if (!awardOrg) {
    // Legacy unscoped row: adopt it into the caller's own hospital program
    // before allowing a correction, so the reversal is not written unscoped.
    throw new Error(
      "This legacy award is not attached to a hospital program and cannot be reversed automatically"
    );
  }

  if (awardOrg !== scopeOrg) {
    throw new Error("That Capsule award belongs to another hospital");
  }

  if (award.program) {
    const owned = await HospitalProgram.exists({
      _id: award.program,
      organization: authority.organization._id,
    });
    if (!owned) {
      throw new Error("That Capsule award belongs to another hospital program");
    }
  }
}

/**
 * Awards an admin may correct, newest first, scoped to their own hospital
 * (all hospitals for the platform admin). Read-only helper so a correction UI
 * has an authoritative list rather than hand-typed ids.
 */
export async function listCorrectableCapsuleAwards({ limit = 50 } = {}) {
  const authority = await requireCorrectionAuthority();
  await connectDB();

  const query = authority.isPlatform
    ? { eventType: "award" }
    : { eventType: "award", organization: authority.organization._id };

  const awards = await CapsuleAward.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .populate("patient", "name")
    .populate("organization", "name")
    .populate("program", "name capsuleSymbol")
    .lean();

  return serialize({
    scope: {
      organizationId: authority.organization
        ? String(authority.organization._id)
        : null,
      organizationName: authority.organization?.name || null,
      isPlatform: authority.isPlatform,
    },
    awards: awards.map((award) => ({
      awardId: String(award._id),
      patientId: String(award.patient?._id || award.patient),
      patientName: award.patient?.name || "Patient",
      organizationName: award.organization?.name || null,
      programName: award.program?.name || null,
      symbol: award.program?.capsuleSymbol || null,
      ruleId: award.ruleId,
      amount: award.amount,
      verificationLevel: award.verificationLevel,
      sourceType: award.sourceType,
      sourceId: award.sourceId,
      createdAt: award.createdAt,
    })),
  });
}

/**
 * Reverse a mis-awarded Capsule.
 *
 * Writes a signed negative row (`eventType: "reversal"`) in the SAME
 * (patient, organization, program) bucket as the original, decrements the
 * running balance, and records the `capsule.reversed` audit event including
 * the required documented reason.
 *
 * Idempotent: the reversal row's key is `reversal:<originalAwardId>`, so a
 * retry can never reverse the same award twice. Returns
 * `{ created: false }` in that case.
 *
 * @param {{ awardId: string, reason: string }} input
 */
export async function reverseCapsuleAwardAction({ awardId, reason } = {}) {
  const authority = await requireCorrectionAuthority();
  await connectDB();

  if (!mongoose.isValidObjectId(String(awardId || ""))) {
    throw new Error("Invalid Capsule award");
  }

  // A reason is REQUIRED, not advisory: an undocumented reversal is
  // indistinguishable from tampering in the audit chain.
  const cleanReason = String(reason || "")
    .trim()
    .slice(0, 2000);
  if (cleanReason.length < 10) {
    throw new Error(
      "A documented correction reason (at least 10 characters) is required"
    );
  }

  const original = await CapsuleAward.findOne({
    _id: awardId,
    eventType: "award",
  }).lean();
  if (!original) throw new Error("Capsule award not found");

  await assertAwardInScope(original, authority);

  const result = await reverseCapsuleAward({
    awardId: original._id,
    reason: cleanReason,
    actorUserId: authority.user._id,
    actorRole: authority.user.role,
  });

  // Re-derive the projection from the ledger so a reversal can never leave the
  // running balance drifting from the authoritative rows.
  const balance = await recomputeBalanceProjection({
    patient: original.patient,
    organization: original.organization,
    program: original.program,
  });

  return serialize({
    created: result.created,
    awardId: String(original._id),
    reversalId: result.reversal ? String(result.reversal._id) : null,
    patientId: String(original.patient),
    ruleId: original.ruleId,
    reversedAmount: result.reversal ? result.reversal.amount : 0,
    programBalance: balance,
    reason: cleanReason,
    reversedBy: {
      userId: String(authority.user._id),
      role: authority.user.role,
    },
  });
}
