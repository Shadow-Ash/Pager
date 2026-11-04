import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionWallet } from "@/lib/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const walletAddress = getSessionWallet(req);
    if (!walletAddress) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters using letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    await connectDB();
    const walletRegex = new RegExp(`^${walletAddress}$`, "i");
    const user = await User.findOne({ walletAddress: walletRegex });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await User.findOne({
      username: new RegExp(`^${username}$`, "i"),
      _id: { $ne: user._id },
    });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    user.username = username;
    await user.save();
    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        profilePic: user.profilePic ?? "",
      },
    });
  } catch (error) {
    console.error("Username update error:", error);
    return NextResponse.json({ error: "Unable to update username" }, { status: 500 });
  }
}
