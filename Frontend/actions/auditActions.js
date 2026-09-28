"use server";

import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import connectDB from "@/lib/db";
import AuditEvent from "@/models/AuditEvent";
import AuditAnchorBatch from "@/models/AuditAnchorBatch";
import { buildMerkleRoot, verifyAuditChain } from "@/lib/carequest/audit";
import { anchorAuditRoot, blockchainHealth, verifyAnchorOnChain } from "@/lib/carequest/blockchain";
import { requireStaffMembership } from "@/lib/carequest/permissions";

async function requireAuditMembership(user) {
  if (user.role !== "hospital_admin") {
    throw new Error("Hospital admin audit access required");
  }
  return requireStaffMembership(user, ["hospital_admin"]);
}

export async function getAuditOverview() {
  const user = await requireUser();
  await connectDB();
  const membership = await requireAuditMembership(user);
  const organizationId = membership.organization._id;

  const [events, batches, verification, chain, legacyUnscopedExists] =
    await Promise.all([
      AuditEvent.find({
        organization: organizationId,
        schemaVersion: 2,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      AuditAnchorBatch.find({ organization: organizationId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      verifyAuditChain({ organizationId }),
      blockchainHealth(),
      AuditEvent.exists({
        $or: [
          { organization: null },
          { organization: { $exists: false } },
        ],
      }),
    ]);

  return JSON.parse(
    JSON.stringify({
      organization: membership.organization,
      events,
      batches,
      verification,
      blockchain: chain,
      legacyUnscopedExcluded: Boolean(legacyUnscopedExists),
    })
  );
}

export async function anchorPendingAuditEvents() {
  const user = await requireUser();
  if (user.role !== "hospital_admin") {
    throw new Error("Hospital admin access required");
  }

  await connectDB();
  const membership = await requireStaffMembership(user, ["hospital_admin"]);
  const organizationId = membership.organization._id;

  const existing = await AuditAnchorBatch.find({
    organization: organizationId,
  })
    .select("eventIds")
    .lean();
  const anchored = new Set(
    existing.flatMap((batch) => batch.eventIds || [])
  );

  // No hard .limit() here: previously this read only the oldest 500 events, so
  // once a hospital's chain passed 500 events the remaining events could never
  // be selected and anchoring silently stalled forever.
  const events = (
    await AuditEvent.find({
      organization: organizationId,
      schemaVersion: 2,
    })
      .sort({ createdAt: 1, _id: 1 })
      .lean()
  )
    .filter((event) => !anchored.has(event.eventId))
    .slice(0, 100);

  if (!events.length) {
    return {
      success: true,
      message: "No unanchored events for this hospital",
    };
  }

  const batchId = crypto.randomUUID();
  const privateSalt = crypto.randomBytes(32).toString("hex");
  const merkleRoot = buildMerkleRoot(
    events.map((event) => event.eventHash),
    privateSalt
  );

  const batch = await AuditAnchorBatch.create({
    batchId,
    organization: organizationId,
    eventIds: events.map((event) => event.eventId),
    merkleRoot,
    eventCount: events.length,
    privateSalt,
    status: "pending",
  });

  try {
    const result = await anchorAuditRoot({ batchId, merkleRoot });
    if (result.disabled) {
      batch.status = "pending";
      batch.error = "Blockchain disabled; batch prepared locally";
    } else if (!result?.txHash) {
      // No transaction hash means the commitment never reached the chain.
      batch.status = "failed";
      batch.error = "Bridge returned no transaction hash";
    } else {
      batch.status = "confirmed";
      batch.txHash = result.txHash;
      batch.network = result.network || "carequest-local-evm";
      batch.chainId = result.chainId || 31337;
      batch.confirmedAt = new Date();
    }
  } catch (error) {
    batch.status = "failed";
    batch.error = error.message;
  }

  await batch.save();
  return JSON.parse(JSON.stringify(batch));
}

/**
 * Re-commit audit batches that the database believes are anchored but which the
 * current chain does not actually hold.
 *
 * WHY THIS EXISTS: the local Hardhat network is in-memory and resets to block 0
 * on every `./scripts/start-local-all.sh`. The audit rows (and their merkle
 * roots) live in MongoDB, so after a restart the database still says
 * "confirmed" while the chain holds no such proof. The merkle root is derived
 * from the immutable event hashes, so re-committing the SAME batchId + root is
 * safe and reproduces the identical commitment — it does not rewrite history.
 *
 * This is deliberately idempotent: a batch already present on-chain is skipped.
 */
export async function reanchorStaleAuditBatches() {
  const user = await requireUser();
  if (user.role !== "platform_admin") {
    throw new Error("Platform admin access required to re-anchor the network");
  }
  await connectDB();

  const batches = await AuditAnchorBatch.find({ status: "confirmed" }).lean();
  const reanchored = [];
  let skipped = 0;

  for (const batch of batches) {
    const check = await verifyAnchorOnChain(batch.batchId);
    if (check.anchored === true) {
      skipped += 1;
      continue;
    }

    // The commitment may already exist under a different batchId only if the
    // row was superseded; skip anything flagged as such.
    if (batch.error) {
      skipped += 1;
      continue;
    }

    try {
      const result = await anchorAuditRoot({
        batchId: batch.batchId,
        merkleRoot: batch.merkleRoot,
      });

      if (result.alreadyOnChain) {
        // Present after all (e.g. only the local reference was pruned).
        await AuditAnchorBatch.updateOne(
          { _id: batch._id },
          { $set: { status: "confirmed", error: "", confirmedAt: new Date() } }
        );
        skipped += 1;
        continue;
      }

      if (!result?.txHash) {
        throw new Error("Bridge returned no transaction hash");
      }

      await AuditAnchorBatch.updateOne(
        { _id: batch._id },
        {
          $set: {
            status: "confirmed",
            txHash: result.txHash,
            network: result.network || "carequest-local-evm",
            chainId: result.chainId || 31337,
            confirmedAt: new Date(),
            error: "",
          },
        }
      );
      reanchored.push({
        batchId: batch.batchId,
        organization: batch.organization ? String(batch.organization) : null,
        txHash: result.txHash,
        blockNumber: result.blockNumber ?? null,
      });
    } catch (error) {
      await AuditAnchorBatch.updateOne(
        { _id: batch._id },
        { $set: { status: "failed", error: String(error?.message || error) } }
      );
    }
  }

  return JSON.parse(
    JSON.stringify({
      success: true,
      checked: batches.length,
      reanchored: reanchored.length,
      alreadyOnChain: skipped,
      details: reanchored,
    })
  );
}
