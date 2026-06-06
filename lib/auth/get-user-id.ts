import type { NextRequest } from "next/server";
import { ChatSDKError } from "@/lib/errors";
import type { SubscriptionTier } from "@/types";
import { getSubscriptionTier } from "@/lib/auth/manual-subscription";

/**
 * Get the current user ID from the authenticated session
 * Throws ChatSDKError if user is not authenticated
 */
export const getUserID = async (req: NextRequest): Promise<string> => {
  try {
    const { authkit } = await import("@workos-inc/authkit-nextjs");
    const { session } = await authkit(req);

    if (!session?.user?.id) {
      throw new ChatSDKError("unauthorized:auth");
    }

    return session.user.id;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }

    console.error("Failed to get user session:", error);
    throw new ChatSDKError("unauthorized:auth");
  }
};

/**
 * Get the current user ID and subscription tier.
 * Tier is read from manual-subscription store (defaults to "free").
 */
export const getUserIDAndPro = async (
  req: NextRequest,
): Promise<{
  userId: string;
  subscription: SubscriptionTier;
  organizationId?: string;
}> => {
  try {
    const { authkit } = await import("@workos-inc/authkit-nextjs");
    const { session } = await authkit(req);

    if (!session?.user?.id) {
      throw new ChatSDKError("unauthorized:auth");
    }

    const userId = session.user.id;
    const tier = getSubscriptionTier(userId);

    return {
      userId,
      subscription: tier,
      organizationId: (session as any).organizationId as string | undefined,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }

    console.error("Failed to get user session:", error);
    throw new ChatSDKError("unauthorized:auth");
  }
};

/**
 * Get the current user ID only if the user has signed in recently.
 */
export const getUserIDWithFreshLogin = async (
  req: NextRequest,
  windowMs: number = 10 * 60 * 1000,
): Promise<string> => {
  try {
    const { authkit } = await import("@workos-inc/authkit-nextjs");
    const { session } = await authkit(req);

    if (!session?.user?.id) {
      throw new ChatSDKError("unauthorized:auth", "missing_session_user");
    }

    const lastSignInAt: unknown = (session as any)?.user?.lastSignInAt;
    const lastSignInMs =
      typeof lastSignInAt === "string" ? Date.parse(lastSignInAt) : NaN;

    if (!Number.isFinite(lastSignInMs)) {
      throw new ChatSDKError("unauthorized:auth", "missing_last_sign_in");
    }

    const now = Date.now();
    const isFresh = now - lastSignInMs <= windowMs;
    if (!isFresh) {
      throw new ChatSDKError("unauthorized:auth", "recent_login_required");
    }

    return session.user.id;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }

    console.error("Failed to verify fresh login:", error);
    throw new ChatSDKError("unauthorized:auth", "recent_login_required");
  }
};
