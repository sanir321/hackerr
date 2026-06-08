import { getConvexClient } from "@/lib/db/convex-client";
import { api } from "@/convex/_generated/api";
import type { SubscriptionTier } from "@/types";

type Tier = SubscriptionTier;

export async function getSubscriptionTier(userId: string): Promise<Tier> {
  try {
    const convex = getConvexClient();
    const tier = await convex.query(api.manualSubscriptions.getTier, {
      userId,
    });
    return (tier as Tier) ?? "free";
  } catch (error) {
    console.error("[Manual Subscription] Failed to get tier from Convex:", error);
    return "free";
  }
}

export async function setSubscriptionTier(
  userId: string,
  tier: Tier,
): Promise<void> {
  try {
    const convex = getConvexClient();
    await convex.mutation(api.manualSubscriptions.setTier, {
      userId,
      tier: tier as any,
    });
  } catch (error) {
    console.error("[Manual Subscription] Failed to set tier in Convex:", error);
    throw error;
  }
}
