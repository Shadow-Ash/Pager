import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionWallet } from "@/lib/auth";
import Submission from "@/models/Submission";
import Bounty from "@/models/Bounty";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const walletAddress = getSessionWallet(req);
    if (!walletAddress) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const bountyId = typeof body?.bountyId === "string" ? body.bountyId : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl : "";

    if (!mongoose.Types.ObjectId.isValid(bountyId)) {
      return NextResponse.json({ error: "Valid bounty ID is required" }, { status: 400 });
    }
    if (description.length > 500) {
      return NextResponse.json({ error: "Description must be 500 characters or fewer" }, { status: 400 });
    }
    try {
      const parsed = new URL(mediaUrl);
      if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") throw new Error("Invalid media URL");
    } catch {
      return NextResponse.json({ error: "A valid Cloudinary HTTPS proof image is required" }, { status: 400 });
    }

    await connectDB();
    const walletRegex = new RegExp(`^${walletAddress}$`, "i");
    const user = await User.findOne({ walletAddress: walletRegex });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const bounty = await Bounty.findById(bountyId);
    if (!bounty) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    if (bounty.status !== "open") return NextResponse.json({ error: "This bounty is no longer open" }, { status: 409 });
    if (String(bounty.creator) === String(user._id)) {
      return NextResponse.json({ error: "You cannot submit proof to your own bounty" }, { status: 403 });
    }

    const existing = await Submission.findOne({ bountyId, hunter: user._id, status: "pending" });
    if (existing) return NextResponse.json({ error: "You already have a pending submission for this bounty" }, { status: 409 });

    const submission = await Submission.create({
      bountyId,
      hunter: user._id,
      username: user.username || walletAddress,
      description,
      mediaUrl,
      hunterWallet: walletAddress,
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error) {
    console.error("Submission creation error:", error);
    return NextResponse.json({ error: "Unable to create submission" }, { status: 500 });
  }
}
