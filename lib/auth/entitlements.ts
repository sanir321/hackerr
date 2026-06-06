import type { SubscriptionTier } from "@/types";
import { getSubscriptionTier } from "@/lib/auth/manual-subscription";

const PAID_TIERS: SubscriptionTier[] = ["pro", "ultra"];

export function parseEntitlements(entitlements: readonly string[]) {
  return entitlements;
}

export function resolveSubscriptionTier(
  userIdOrEntitlements: string | readonly string[],
): SubscriptionTier {
  if (typeof userIdOrEntitlements === "string") {
    return getSubscriptionTier(userIdOrEntitlements);
  }
  return "free";
}

export function hasPaidEntitlement(
  userIdOrEntitlements: string | readonly string[],
): boolean {
  if (typeof userIdOrEntitlements === "string") {
    return PAID_TIERS.includes(getSubscriptionTier(userIdOrEntitlements));
  }
  return true;
}
