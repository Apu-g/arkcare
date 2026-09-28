import connectDB from "@/lib/db";
import Organization from "@/models/Organization";
import CareQuestMembership from "@/models/CareQuestMembership";

export async function getOrCreateDemoOrganization() {
  await connectDB();
  return Organization.findOneAndUpdate(
    { slug: "arkcare-demo-hospital" },
    {
      $setOnInsert: {
        name: "ArkCare Demo Hospital",
        slug: "arkcare-demo-hospital",
        demo: true,
        settings: {
          defaultTimezone: "Asia/Kolkata",
          handoffDueMinutes: 240,
          simulatedCareBenefitPoolInr: 25000,
        },
      },
    },
    { upsert: true, new: true }
  );
}

export async function ensureCareQuestMembership(user, role = user.role) {
  const allowed = new Set(["doctor", "nurse", "coordinator", "hospital_admin"]);
  if (!allowed.has(role)) return null;

  const organization = await getOrCreateDemoOrganization();
  return CareQuestMembership.findOneAndUpdate(
    { user: user._id, organization: organization._id },
    {
      $set: {
        role,
        active: true,
        team: "CareQuest Demo Team",
      },
    },
    { upsert: true, new: true }
  ).populate("organization");
}

export async function requireStaffMembership(user, allowedRoles = ["nurse", "coordinator", "hospital_admin"]) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("CareQuest staff access required");
  }

  const membership = await ensureCareQuestMembership(user, user.role);
  if (!membership?.active) throw new Error("Inactive CareQuest membership");
  return membership;
}
