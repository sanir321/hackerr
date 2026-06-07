import { mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import { fileCountAggregate } from "./fileAggregate";
import { validateServiceKey } from "./lib/utils";
import { convexLogger } from "./lib/logger";

/**
 * Public mutation to delete all data for the currently authenticated user.
 */
export const deleteMyUserData = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Unauthorized: User not authenticated",
      });
    }

    // Reuse the internal logic by calling the internal mutation
    // We need to pass the service key which is available in process.env
    await ctx.runMutation(internal.userDeletion.deleteAllUserData, {
      serviceKey: process.env.CONVEX_SERVICE_ROLE_KEY!,
      userId: identity.subject,
    });

    return null;
  },
});

/**
 * Internal mutation to delete all data for a user.
 * This is a multi-step process that cleans up all associated records.
 *
 * @param serviceKey - Required server-side validation key
 * @param userId - The ID of the user whose data should be deleted
 */
export const deleteAllUserData = internalMutation({
  args: {
    serviceKey: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    validateServiceKey(args.serviceKey);

    const startTime = Date.now();
    convexLogger.info("user_deletion_started", {
      userId: args.userId,
    });

    try {
      // Step 1: Delete all chats and their messages/files
      // This uses existing mutation logic which handles file cleanup
      await ctx.runMutation(api.chats.deleteAllChatsForUser, {
        serviceKey: args.serviceKey,
        userId: args.userId,
      });

      // Step 2: Delete any orphaned files not caught by chat deletion
      // (e.g., uploaded but never sent in a message)
      const orphanedFiles = await ctx.db
        .query("files")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .collect();

      if (orphanedFiles.length > 0) {
        for (const file of orphanedFiles) {
          try {
            // Delete from Convex storage
            if (file.storage_id) {
              await ctx.storage.delete(file.storage_id);
            }

            // Delete from aggregate
            await fileCountAggregate.deleteIfExists(ctx, file);

            // Delete database record
            await ctx.db.delete(file._id);
          } catch (error) {
            console.error(
              `Failed to delete orphaned file ${file._id} for user ${args.userId}:`,
              error,
            );
          }
        }
      }

      // Step 3: Delete user customization settings
      const customization = await ctx.db
        .query("user_customization")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .unique();

      if (customization) {
        await ctx.db.delete(customization._id);
      }

      // Step 4: Delete referral codes (codes owned BY this user)
      const referralCodes = await ctx.db
        .query("referral_codes")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .collect();

      for (const code of referralCodes) {
        await ctx.db.delete(code._id);
      }

      // Step 5: Delete referral attributions (referrals made BY this user)
      const outgoingReferrals = await ctx.db
        .query("referral_attributions")
        .withIndex("by_referrer_user_id", (q) =>
          q.eq("referrer_user_id", args.userId),
        )
        .collect();

      for (const referral of outgoingReferrals) {
        await ctx.db.delete(referral._id);
      }

      // Step 6: Delete referral attribution (if this user WAS referred)
      const incomingReferral = await ctx.db
        .query("referral_attributions")
        .withIndex("by_referred_user_id", (q) =>
          q.eq("referred_user_id", args.userId),
        )
        .unique();

      if (incomingReferral) {
        await ctx.db.delete(incomingReferral._id);
      }

      // Step 7: Delete usage logs
      const usageLogs = await ctx.db
        .query("usage_logs")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .collect();

      for (const log of usageLogs) {
        await ctx.db.delete(log._id);
      }

      // Step 8: Delete extra usage records
      const extraUsages = await ctx.db
        .query("extra_usage")
        .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
        .collect();

      for (const extra of extraUsages) {
        await ctx.db.delete(extra._id);
      }

      convexLogger.info("user_deletion_completed", {
        userId: args.userId,
        durationMs: Date.now() - startTime,
        orphanedFilesDeleted: orphanedFiles.length,
      });

      return null;
    } catch (error) {
      convexLogger.error("user_deletion_failed", {
        userId: args.userId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ConvexError({
        code: "USER_DELETION_FAILED",
        message: "Failed to delete all user data",
      });
    }
  },
});
