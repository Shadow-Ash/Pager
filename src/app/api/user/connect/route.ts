import { NextResponse } from "next/server";

// Wallet addresses supplied in JSON are not proof of wallet ownership.
// Authentication now requires the nonce + signature flow at /api/user/nonce
// and /api/user/verify.
export async function POST() {
  return NextResponse.json(
    { error: "Use the signed wallet authentication flow" },
    { status: 410 }
  );
}
