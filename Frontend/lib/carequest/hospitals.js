import connectDB from "@/lib/db";
import Organization from "@/models/Organization";
import HospitalProgram from "@/models/HospitalProgram";
import CapsuleAward from "@/models/CapsuleAward";
import CapsuleBalanceProjection from "@/models/CapsuleBalanceProjection";
import Doctor from "@/models/Doctor";
import Patient from "@/models/Patient";
import PatientMembership from "@/models/PatientMembership";
import AuditEvent from "@/models/AuditEvent";
import AuditAnchorBatch from "@/models/AuditAnchorBatch";
import Appointment from "@/models/Appointment";
import HandoffCase from "@/models/HandoffCase";
import { verifyAuditChain } from "@/lib/carequest/audit";
import { verifyAnchorOnChain } from "@/lib/carequest/blockchain";

/**
 * Hospital reputation = the total participation Capsules earned by a hospital's
 * own patients, together with a small set of quality signals.
 *
 * IMPORTANT SAFETY NOTE: this is a REPUTATION metric, not a claimable balance.
 * Capsules are hospital-specific, non-transferable participation units. A
 * hospital does NOT receive, own, or cash out a share of a patient's capsules.
 * The number is simply "how much care engagement this hospital's cohort has
 * generated", used to rank and surface trustworthy hospitals. The blockchain is
 * a non-clinical proof rail and holds no monetary value.
 */

/**
 * Reputation tiers derived purely from the engagement volume. Deliberately
 * coarse and non-monetary (no INR, no claimable balance).
 */
function reputationTier(totalCapsules) {
  if (totalCapsules >= 400) return { label: "Distinguished", score: 95 };
  if (totalCapsules >= 250) return { label: "Trusted", score: 85 };
  if (totalCapsules >= 120) return { label: "Established", score: 72 };
  if (totalCapsules >= 40) return { label: "Emerging", score: 60 };
  return { label: "New", score: 45 };
}

/**
 * Hospital reputation is a SIGNED sum over the hospital's active programs:
 *
 *     reputation(hospital) = Σ  amount   for every CapsuleAward row whose
 *                                           program ∈ that hospital's ACTIVE programs
 *
 * i.e. awards are positive, redemptions and REVERSALS are negative, and every
 * row is counted. There is deliberately no `amount: { $gt: 0 }` filter: a
 * mis-awarded Capsule that an admin reverses, or a benefit a patient redeems,
 * genuinely REDUCES the engagement this hospital's cohort has generated.
 * Filtering to positive rows made reversals invisible, so a hospital's
 * reputation could never come down and the leaderboard/network totals silently
 * disagreed with the ledger.
 *
 * The number remains a REPUTATION metric: non-monetary, non-cash, and not a
 * claimable balance for the hospital.
 */
function signedCapsuleSumPipeline(programIds) {
  return [
    { $match: { program: { $in: programIds } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ];
}

async function activeProgramIdsForOrg(organizationId) {
  const programs = await HospitalProgram.find({
    organization: organizationId,
    status: "active",
  })
    .select("_id")
    .lean();
  return programs.map((program) => program._id);
}

async function organizationTotals(organizationId) {
  const programs = await HospitalProgram.find({
    organization: organizationId,
    status: "active",
  })
    .select("_id capsuleSymbol capsuleName name rules")
    .lean();

  const programIds = programs.map((program) => program._id);

  const [capsuleAgg, patientCount, doctorCount, appointmentCount, resolvedCases, openCases] =
    await Promise.all([
      programIds.length
        ? CapsuleAward.aggregate(signedCapsuleSumPipeline(programIds))
        : [],
      programIds.length ? PatientMembership.countDocuments({ program: { $in: programIds } }) : 0,
      Doctor.countDocuments({
        userId: { $in: await doctorUserIdsForOrg(organizationId) },
      }),
      Appointment.countDocuments({ organization: organizationId }),
      HandoffCase.countDocuments({ organization: organizationId, status: "resolved" }),
      HandoffCase.countDocuments({
        organization: organizationId,
        status: { $ne: "resolved" },
      }),
    ]);

  const totalCapsules = Number(capsuleAgg[0]?.total || 0);
  const tier = reputationTier(totalCapsules);

  return {
    totalCapsules,
    tier,
    programCount: programs.length,
    patientCount,
    doctorCount,
    appointmentCount,
    resolvedCases,
    openCases,
  };
}

async function doctorUserIdsForOrg(organizationId) {
  const { default: CareQuestMembership } = await import("@/models/CareQuestMembership");
  const memberships = await CareQuestMembership.find({
    organization: organizationId,
    role: "doctor",
    active: true,
  })
    .select("user")
    .lean();
  return memberships.map((m) => m.user);
}

/**
 * List every active hospital with its reputation and on-chain audit head.
 * Used by the public "Hospitals" directory and the platform (master) console.
 */
export async function getHospitalDirectory() {
  await connectDB();

  const organizations = await Organization.find({}).sort({ name: 1 }).lean();

  const rows = [];
  for (const organization of organizations) {
    const totals = await organizationTotals(organization._id);

    // Per-hospital audit head + integrity: each hospital has its own chain.
    // No `limit` here on purpose — verifyAuditChain defaults to verifying the
    // WHOLE chain. Capping at 500 made headHash the 500th event's hash and
    // reported it as "the chain head", which is both wrong and unverifiable.
    let chainValid = null;
    let headHash = null;
    let chainChecked = 0;
    let chainTotal = 0;
    let chainTruncated = false;
    try {
      const verification = await verifyAuditChain({
        organizationId: organization._id,
      });
      chainValid = verification.valid;
      headHash = verification.headHash || null;
      chainChecked = verification.checked;
      chainTotal = verification.total;
      chainTruncated = Boolean(verification.truncated);
    } catch {
      chainValid = null;
    }

    // A chain with zero events verifies vacuously. Reporting that as "chain
    // valid" would claim an integrity proof that does not exist — there is
    // nothing to verify. Report it as unknown/no-events instead.
    if (chainTotal === 0) {
      chainValid = null;
    }

    // Newest confirmed on-chain anchor, so the master console can show real
    // transaction provenance (root + txHash + block) per hospital.
    const latestAnchor = await AuditAnchorBatch.findOne({
      organization: organization._id,
      status: "confirmed",
      txHash: { $nin: [null, ""] },
    })
      .sort({ confirmedAt: -1, createdAt: -1 })
      .select("batchId merkleRoot txHash eventCount network chainId confirmedAt")
      .lean();

    const anchorCount = await AuditAnchorBatch.countDocuments({
      organization: organization._id,
      status: "confirmed",
      txHash: { $nin: [null, ""] },
    });

    // Ask the chain whether the newest commitment is really there. A DB row
    // saying "confirmed" only proves a transaction hash was once returned; the
    // in-memory local chain resets on restart, which would otherwise leave the
    // console showing proofs that no longer exist.
    let anchorOnChain = null;
    if (latestAnchor?.batchId) {
      const check = await verifyAnchorOnChain(latestAnchor.batchId);
      anchorOnChain = check.anchored === true;
    }

    const program = await HospitalProgram.findOne({
      organization: organization._id,
      status: "active",
    })
      .select("capsuleSymbol capsuleName name blockchain.tokenId")
      .lean();

    rows.push({
      organizationId: String(organization._id),
      name: organization.name,
      slug: organization.slug,
      city: organization.settings?.city || null,
      about:
        organization.settings?.about ||
        "A CareQuest hospital running its own clinical and engagement program.",
      symbol: program?.capsuleSymbol || "CAP",
      capsuleName: program?.capsuleName || "CareQuest Capsule",
      tokenId: program?.blockchain?.tokenId || null,
      // Reputation (non-cash)
      totalCapsules: totals.totalCapsules,
      reputationLabel: totals.tier.label,
      reputationScore: totals.tier.score,
      patientCount: totals.patientCount,
      doctorCount: totals.doctorCount,
      appointmentCount: totals.appointmentCount,
      resolvedCases: totals.resolvedCases,
      openCases: totals.openCases,
      // Audit provenance (per-hospital chain head + on-chain anchor)
      chainValid,
      chainChecked,
      chainTotal,
      chainTruncated,
      headHash: headHash || null,
      anchorCount,
      anchorOnChain,
      latestAnchor: latestAnchor
        ? {
            batchId: latestAnchor.batchId,
            merkleRoot: latestAnchor.merkleRoot,
            txHash: latestAnchor.txHash,
            eventCount: latestAnchor.eventCount,
            network: latestAnchor.network,
            chainId: latestAnchor.chainId,
            confirmedAt: latestAnchor.confirmedAt,
          }
        : null,
    });
  }

  // Rank by reputation, then engagement volume.
  rows.sort(
    (a, b) =>
      b.totalCapsules - a.totalCapsules ||
      b.reputationScore - a.reputationScore ||
      a.name.localeCompare(b.name)
  );

  return rows;
}

/**
 * Single-hospital profile for a hospital admin's own dashboard.
 */
export async function getHospitalProfile(organizationId) {
  await connectDB();
  const organization = await Organization.findById(organizationId).lean();
  if (!organization) return null;

  const directory = await getHospitalDirectory();
  const profile = directory.find(
    (row) => row.organizationId === String(organizationId)
  );

  // Per-patient engagement leaderboard for this hospital (reputation driver).
  // Signed, and over EVERY active program the hospital runs (not just the first
  // one), so it uses exactly the same aggregate as organizationTotals: a
  // reversed award must push a patient DOWN this board, not be ignored.
  const programIds = await activeProgramIdsForOrg(organizationId);

  let leaderboard = [];
  if (programIds.length) {
    const rows = await CapsuleAward.aggregate([
      { $match: { program: { $in: programIds } } },
      { $group: { _id: "$patient", capsules: { $sum: "$amount" } } },
      { $sort: { capsules: -1 } },
      { $limit: 10 },
    ]);
    const patientIds = rows.map((row) => row._id);
    const patients = await Patient.find({ _id: { $in: patientIds } })
      .select("name")
      .lean();
    const nameById = new Map(patients.map((p) => [String(p._id), p.name]));
    leaderboard = rows.map((row) => ({
      patientId: String(row._id),
      patientName: nameById.get(String(row._id)) || "Patient",
      capsules: Number(row.capsules || 0),
    }));
  }

  return { ...profile, leaderboard };
}

/**
 * Platform (master) console: every hospital, where every audit went, and the
 * network-wide totals. This is the "know everything / master hospital" view.
 */
export async function getPlatformOverview() {
  await connectDB();

  const directory = await getHospitalDirectory();

  const [totalAuditEvents, totalHandoffs, recentEvents] = await Promise.all([
    AuditEvent.countDocuments({ schemaVersion: 2 }),
    HandoffCase.countDocuments({}),
    AuditEvent.find({ schemaVersion: 2 })
      .sort({ createdAt: -1 })
      .limit(40)
      .populate("organization", "name")
      .lean(),
  ]);

  // The network total is DEFINED as the sum of the per-hospital figures shown
  // directly above it. The previous `CapsuleAward.aggregate({ amount: { $gt: 0 } })`
  // summed every award on the platform regardless of program, which
  // double-counted awards belonging to inactive/retired programs and hid
  // reversals — so the headline number could never reconcile with the
  // per-hospital rows, and disagreed with the signed ledger.
  const networkTotalCapsules = directory.reduce(
    (sum, row) => sum + Number(row.totalCapsules || 0),
    0
  );

  // "All valid" must be a real claim: a hospital whose chain failed to
  // verify (chainValid === null) is UNKNOWN, not valid. The previous
  // `!== false` check reported unknown chains as valid.
  const knownChains = directory.filter((row) => row.chainValid !== null);
  const brokenChains = directory.filter((row) => row.chainValid === false);
  const unknownChains = directory.filter((row) => row.chainValid === null);

  return {
    hospitals: directory,
    networkTotals: {
      hospitalCount: directory.length,
      totalCapsules: networkTotalCapsules,
      totalAuditEvents,
      totalHandoffs,
      allChainsValid:
        directory.length > 0 &&
        brokenChains.length === 0 &&
        unknownChains.length === 0,
      brokenChainCount: brokenChains.length,
      unknownChainCount: unknownChains.length,
      totalOnChainAnchors: directory.reduce(
        (sum, row) => sum + (row.anchorCount || 0),
        0
      ),
    },
    recentEvents: recentEvents.map((event) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      resourceType: event.resourceType,
      verificationLevel: event.verificationLevel,
      actorRole: event.actorRole,
      // Expose the per-event hash so the console can show the same provenance
      // the hospital audit log shows.
      eventHash: event.eventHash,
      previousHash: event.previousHash,
      organizationName: event.organization?.name || "Platform",
      organizationId: event.organization ? String(event.organization) : null,
      createdAt: event.createdAt,
    })),
  };
}
