import type { SubscriptionTier } from "@/types";
import { getSubscriptionTier } from "@/lib/auth/manual-subscription";

const PAID_TIERS: SubscriptionTier[] = ["pro", "ultra"];

export function parseEntitlements(entitlements: readonly string[]) {
  return entitlements;
}

export async function resolveSubscriptionTier(
  userIdOrEntitlements: string | readonly string[],
): Promise<SubscriptionTier> {
  if (typeof userIdOrEntitlements === "string") {
    return await getSubscriptionTier(userIdOrEntitlements);
  }
  return "free";
}

export async function hasPaidEntitlement(
  userIdOrEntitlements: string | readonly string[],
): Promise<boolean> {
  if (typeof userIdOrEntitlements === "string") {
    return PAID_TIERS.includes(await getSubscriptionTier(userIdOrEntitlements));
  }
  return true;
}
