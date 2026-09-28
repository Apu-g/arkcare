import mongoose from "mongoose";

const HandoffCaseSchema = new mongoose.Schema(
  {
    dedupeKey: { type: String, required: true, unique: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    carePlan: { type: mongoose.Schema.Types.ObjectId, ref: "CarePlan", required: true, index: true },
    planVersion: { type: mongoose.Schema.Types.ObjectId, ref: "PlanVersion", required: true },
    occurrence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledOccurrence",
      required: true,
      index: true,
    },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal", index: true },
    assignedRole: {
      type: String,
      enum: ["nurse", "coordinator", "doctor"],
      default: "coordinator",
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    team: { type: String, default: "CareQuest Demo Team" },
    dueAt: { type: Date, required: true, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["open", "assigned", "contacted", "escalated", "resolved"],
      default: "open",
      index: true,
    },
    lastContactSuccessful: { type: Boolean, default: null },
    outcome: { type: String, trim: true, maxlength: 3000, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

HandoffCaseSchema.index({ organization: 1, status: 1, dueAt: 1 });

export default mongoose.models.HandoffCase ||
  mongoose.model("HandoffCase", HandoffCaseSchema);
