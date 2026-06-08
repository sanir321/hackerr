import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionTier } from "@/lib/auth/manual-subscription";

const CACHED_USER_ID = "x-umbraa-user-id";

export async function GET(req: NextRequest) {
  try {
    // Fast path: read from middleware-injected header
    const cachedUserId = req.headers.get(CACHED_USER_ID);
    let userId: string | undefined = cachedUserId ?? undefined;

    // Slow path: call authkit() if header missing
    if (!userId) {
      const { authkit } = await import("@workos-inc/authkit-nextjs");
      const { session } = await authkit(req);
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json({ tier: "free" });
    }

    const tier = await getSubscriptionTier(userId);
    return NextResponse.json({ tier });
  } catch {
    return NextResponse.json({ tier: "free" });
  }
}
