import { query } from "./_generated/server";
import { v } from "convex/values";
import { validateServiceKey } from "./lib/utils";

export const countUsers = query({
  args: {
    serviceKey: v.string(),
  },
  handler: async (ctx, args) => {
    validateServiceKey(args.serviceKey);

    const chats = await ctx.db.query("chats").collect();
    const chatUsers = new Set(chats.map((c) => c.user_id));

    const customizations = await ctx.db.query("user_customization").collect();
    const customizationUsers = new Set(customizations.map((c) => c.user_id));

    const usageLogs = await ctx.db.query("usage_logs").collect();
    const usageUsers = new Set(usageLogs.map((u) => u.user_id));

    const allUsers = new Set([
      ...chatUsers,
      ...customizationUsers,
      ...usageUsers,
    ]);

    return {
      totalUniqueUsers: allUsers.size,
      chatUsers: chatUsers.size,
      customizationUsers: customizationUsers.size,
      usageUsers: usageUsers.size,
    };
  },
});
