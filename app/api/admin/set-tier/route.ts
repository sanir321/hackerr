import { NextRequest, NextResponse } from "next/server";
import { setSubscriptionTier } from "@/lib/auth/manual-subscription";
import type { SubscriptionTier } from "@/types";

const VALID_TIERS: SubscriptionTier[] = ["free", "pro", "ultra"];

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, tier } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier. Must be: free, pro, or ultra" },
      { status: 400 },
    );
  }

  await setSubscriptionTier(userId, tier);
  return NextResponse.json({ userId, tier });
}
