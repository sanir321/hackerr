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
    organizationName?: string,
  ) => {
    e?.preventDefault();

    if (upgradeLoading) return;

    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setUpgradeLoading(true);

    const isTeamPlan = _planKey?.includes("team");
    const planDisplay = _planKey?.split("-")[0].toUpperCase() || "PRO";

    let bodyText = `User ID: ${user.id}\nEmail: ${user.email ?? "N/A"}\n\n`;
    bodyText += `Requesting upgrade to: ${planDisplay} plan\n`;

    if (isTeamPlan) {
      bodyText += `Requested Seats: ${_quantity || 2}\n`;
      if (organizationName) {
        bodyText += `Organization Name: ${organizationName}\n`;
      }
    }

    setUpgradeLoading(false);

    const phone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "917904721312";
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(`*Upgrade Request*\n\n${bodyText}`)}`;

    window.location.href = whatsappUrl;

    toast.success("Opening WhatsApp...", {
      description: "Please send the message to the admin.",
    });
  };

  return {
    upgradeLoading,
    handleUpgrade,
  };
};
