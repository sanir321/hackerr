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
    method: "email" | "whatsapp" = "whatsapp", // Default to WhatsApp for better reliability
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

    bodyText += `\nTo upgrade, run:\ncurl -X POST https://umbraa.ai/api/admin/set-tier \\\n  -H "x-api-key: YOUR_ADMIN_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userId":"${user.id}","tier":"${_planKey?.split("-")[0] || "pro"}"}'`;

    setUpgradeLoading(false);

    if (method === "email") {
      const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";
      const subject = encodeURIComponent(
        `Upgrade request: ${isTeamPlan ? "TEAM - " : ""}${user.email ?? user.id}`,
      );
      const body = encodeURIComponent(bodyText);
      const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

      window.location.href = mailtoUrl;

      toast.success("Opening your email client...", {
        description: "If your email app didn't open, click 'Retry' below.",
        action: {
          label: "Retry",
          onClick: () => {
            window.location.href = mailtoUrl;
          },
        },
        duration: 6000,
      });
    } else {
      const phone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "919000000000"; 
      const text = encodeURIComponent(`*Upgrade Request*\n\n${bodyText}`);
      const whatsappUrl = `https://wa.me/${phone}?text=${text}`;

      window.location.href = whatsappUrl;

      toast.success("Opening WhatsApp...", {
        description: "Please send the pre-filled message to the admin.",
      });
    }
  };

  return {
    upgradeLoading,
    handleUpgrade,
  };
};
