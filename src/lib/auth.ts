import { createHmac, timingSafeEqual } from "node:crypto";
import { getAddress, isAddress } from "ethers";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "pager_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = { sub: string; exp: number };

function getSecret(): string {
  const secret = process.env.PAGER_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("PAGER_SESSION_SECRET must be set to at least 32 characters");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(walletAddress: string): string {
  const payload: SessionPayload = {
    sub: getAddress(walletAddress),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function getSessionWallet(request: NextRequest): string | null {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) return null;

    const expected = sign(encoded);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) return null;

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (
      !payload ||
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      !isAddress(payload.sub)
    ) return null;

    return getAddress(payload.sub);
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
