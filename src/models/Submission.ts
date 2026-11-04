import { Schema, models, model } from "mongoose";

const SubmissionSchema = new Schema(
  {
    bountyId: { type: Schema.Types.ObjectId, ref: "Bounty", required: true, index: true },
    hunter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true },
    description: { type: String, default: "", maxlength: 500 },
    mediaUrl: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    hunterWallet: { type: String, required: true },
    payoutTxHash: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

const Submission = models.Submission || model("Submission", SubmissionSchema);
export default Submission;
