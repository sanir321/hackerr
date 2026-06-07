import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getConvexClient } from "@/lib/db/convex-client";
import { api } from "@/convex/_generated/api";
import { getUserIDAndPro } from "@/lib/auth/get-user-id";
import {
  getReferralRewardConfig,
  isValidReferralCode,
} from "@/lib/referrals/config";

export const runtime = "nodejs";

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 7;

const generateReferralCode = () =>
  Array.from(randomBytes(REFERRAL_CODE_LENGTH), (byte) =>
    REFERRAL_CODE_ALPHABET.charAt(byte % REFERRAL_CODE_ALPHABET.length),
  ).join("");

export async function GET(req: NextRequest) {
  const convex = getConvexClient();
  const config = getReferralRewardConfig();
  if (!config.enabled) {
    console.warn("[Referrals API] Program is disabled in config");
    return NextResponse.json(
      { error: "Referral program is paused" },
      { status: 403 },
    );
  }

  let auth;
  try {
    auth = await getUserIDAndPro(req);
  } catch (err) {
    console.error("[Referrals API] Auth failed:", err);
    return NextResponse.json(
      { error: "Authentication failed. Please sign in again." },
      { status: 401 },
    );
  }

  const { userId, subscription, organizationId } = auth;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error("[Referrals API] NEXT_PUBLIC_BASE_URL is missing");
    return NextResponse.json(
      { error: "Server configuration error: Base URL missing" },
      { status: 500 },
    );
  }

  const serviceKey = process.env.CONVEX_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[Referrals API] CONVEX_SERVICE_ROLE_KEY is missing");
    return NextResponse.json(
      { error: "Server configuration error: Database key missing" },
      { status: 500 },
    );
  }

  let result: {
    code: string;
    active: boolean;
    attributedSignups: number;
    paidConversions: number;
    awardedDollars: number;
  } | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const codeCandidate = generateReferralCode();
    if (!isValidReferralCode(codeCandidate)) continue;

    try {
      result = await convex.mutation(api.referrals.getOrCreateReferralCode, {
        serviceKey,
        userId,
        subscriptionTier: subscription,
        organizationId,
        codeCandidate,
      });
      break;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Referral code collision")
      ) {
        console.warn(`[Referrals API] Collision on attempt ${attempt + 1}`);
        continue;
      }
      console.error("[Referrals API] Mutation failed:", error);
      return NextResponse.json(
        { error: `Database error: ${error instanceof Error ? error.message : "Unknown"}` },
        { status: 500 },
      );
    }
  }

  if (!result) {
    console.error("[Referrals API] Failed to create result after 3 attempts");
    return NextResponse.json(
      { error: "Failed to create referral code" },
      { status: 500 },
    );
  }

  const referralUrl = new URL(
    `/invite/${encodeURIComponent(result.code)}`,
    baseUrl,
  );

  return NextResponse.json({
    code: result.code,
    active: result.active,
    referralUrl: referralUrl.toString(),
    referrerRewardDollars: config.referrerRewardDollars,
    referredSignupBonusUnits: config.referredSignupBonusUnits,
    stats: {
      attributedSignups: result.attributedSignups,
      paidConversions: result.paidConversions,
      awardedDollars: result.awardedDollars,
    },
  });
}
