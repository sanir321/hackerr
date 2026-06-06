import { useState } from "react";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { toast } from "sonner";

export const useUpgrade = () => {
  const { user } = useAuth();
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleUpgrade = async (
    _planKey?:
      | "pro-monthly-plan"
      | "pro-plus-monthly-plan"
      | "ultra-monthly-plan"
      | "pro-yearly-plan"
      | "pro-plus-yearly-plan"
      | "ultra-yearly-plan"
      | "team-monthly-plan"
      | "team-yearly-plan",
    e?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>,
    _quantity?: number,
    _currentSubscription?: "free" | "pro" | "pro-plus" | "ultra" | "team",
  ) => {
    e?.preventDefault();

    if (upgradeLoading) return;

    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setUpgradeLoading(true);

    const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";
    const subject = encodeURIComponent(
      `Upgrade request: ${user.email ?? user.id}`,
    );
    const body = encodeURIComponent(
      `User ID: ${user.id}\nEmail: ${user.email ?? "N/A"}\n\nPlease upgrade my subscription tier.\n\nTo upgrade, run:\ncurl -X POST https://hackerai.co/api/admin/set-tier \\\n  -H "x-api-key: YOUR_ADMIN_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userId":"${user.id}","tier":"pro"}'
`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

    toast.success("Opening your email client...", {
      description: `Your user ID (${user.id}) will be included for the admin.`,
    });

    setUpgradeLoading(false);
  };

  return {
    upgradeLoading,
    handleUpgrade,
  };
};
