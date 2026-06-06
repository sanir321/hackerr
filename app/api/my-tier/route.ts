import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionTier } from "@/lib/auth/manual-subscription";

export async function GET(req: NextRequest) {
  try {
    const { authkit } = await import("@workos-inc/authkit-nextjs");
    const { session } = await authkit(req);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ tier: "free" });
    }

    const tier = getSubscriptionTier(userId);
    return NextResponse.json({ tier });
  } catch {
    return NextResponse.json({ tier: "free" });
  }
}
