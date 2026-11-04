import { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    walletAddress: { type: String, required: true, unique: true, index: true },
    username: { type: String, unique: true, sparse: true, trim: true, minlength: 3, maxlength: 20 },
    profilePic: { type: String, default: "" },
    authMessage: { type: String, select: false },
    authMessageExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

const User = models.User || model("User", UserSchema);
export default User;
