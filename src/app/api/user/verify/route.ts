import { getAddress, isAddress, verifyMessage } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const suppliedAddress = body?.walletAddress;
    const signature = body?.signature;
    if (
      typeof suppliedAddress !== "string" ||
      !isAddress(suppliedAddress) ||
      typeof signature !== "string" ||
      !/^0x[0-9a-fA-F]+$/.test(signature)
    ) {
      return NextResponse.json({ error: "Invalid wallet authentication payload" }, { status: 400 });
    }

    await connectDB();
    const walletAddress = getAddress(suppliedAddress);
    const walletRegex = new RegExp(`^${walletAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const user = await User.findOne({ walletAddress: walletRegex })
      .select("+authMessage +authMessageExpiresAt");

    if (
      !user ||
      !user.authMessage ||
      !user.authMessageExpiresAt ||
      user.authMessageExpiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json({ error: "Authentication challenge expired. Please retry." }, { status: 401 });
    }

    let recoveredAddress: string;
    try {
      recoveredAddress = getAddress(verifyMessage(user.authMessage, signature));
    } catch {
      return NextResponse.json({ error: "Wallet signature is invalid" }, { status: 401 });
    }

    if (recoveredAddress !== getAddress(user.walletAddress)) {
      return NextResponse.json({ error: "Wallet signature does not match" }, { status: 401 });
    }

    user.authMessage = undefined;
    user.authMessageExpiresAt = undefined;
    await user.save();

    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        walletAddress: user.walletAddress,
        username: user.username ?? "",
        profilePic: user.profilePic ?? "",
      },
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken(user.walletAddress),
      sessionCookieOptions
    );
    return response;
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json({ error: "Unable to verify wallet" }, { status: 500 });
  }
}
