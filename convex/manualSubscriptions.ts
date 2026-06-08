import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getTier = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("user_subscriptions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .unique();
    return subscription?.tier ?? "free";
  },
});

export const setTier = mutation({
  args: {
    userId: v.string(),
    tier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("pro-plus"),
      v.literal("ultra"),
      v.literal("team"),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_subscriptions")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: args.tier,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("user_subscriptions", {
        user_id: args.userId,
        tier: args.tier,
        updated_at: Date.now(),
      });
    }
  },
});
