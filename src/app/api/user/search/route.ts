import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const query = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 32);
    if (!query) return NextResponse.json({ success: true, users: [] });

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await connectDB();
    const users = await User.find({ username: { $regex: escaped, $options: "i" } })
      .limit(20)
      .select("username walletAddress profilePic")
      .lean();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Unable to search users" }, { status: 500 });
  }
}
