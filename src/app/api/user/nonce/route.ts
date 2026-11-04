import { randomBytes } from "node:crypto";
import { getAddress, isAddress } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const suppliedAddress = body?.walletAddress;
    if (typeof suppliedAddress !== "string" || !isAddress(suppliedAddress)) {
      return NextResponse.json({ error: "A valid wallet address is required" }, { status: 400 });
    }

    await connectDB();
    const walletAddress = getAddress(suppliedAddress);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const nonce = randomBytes(24).toString("hex");
    const message = [
      "Pager authentication",
      `Address: ${walletAddress}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
      `Expiration Time: ${new Date(expiresAt).toISOString()}`,
      "Sign this message to prove control of this wallet. This does not authorize a blockchain transaction.",
    ].join("\n");

    const walletRegex = new RegExp(`^${walletAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    let user = await User.findOne({ walletAddress: walletRegex });
    if (!user) {
      try {
        user = await User.create({ walletAddress });
      } catch (error) {
        // Handle two simultaneous first-time sign-in requests safely.
        user = await User.findOne({ walletAddress: walletRegex });
        if (!user) throw error;
      }
    }

    user.authMessage = message;
    user.authMessageExpiresAt = new Date(expiresAt);
    await user.save();

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Wallet nonce error:", error);
    return NextResponse.json({ error: "Unable to start wallet authentication" }, { status: 500 });
  }
}
