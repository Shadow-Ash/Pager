import { Schema, models, model } from "mongoose";

const BountySchema = new Schema(
  {
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    reward: { type: Number, required: true, min: 0.000001, max: 100000 },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
      address: { type: String, maxlength: 240 },
    },
    mediaUrl: { type: String, default: "" },
    status: { type: String, enum: ["open", "completed"], default: "open", index: true },
    onChainId: { type: Number, default: null },
    transactionHash: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

const Bounty = models.Bounty || model("Bounty", BountySchema);
export default Bounty;
