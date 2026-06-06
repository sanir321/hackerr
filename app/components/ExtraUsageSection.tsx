"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BuyExtraUsageDialog } from "@/app/components/extra-usage";

const ExtraUsageSection = () => {
  const userCustomization = useQuery(
    api.userCustomization.getUserCustomization,
  );
  const saveUserCustomization = useMutation(
    api.userCustomization.saveUserCustomization,
  );

  const extraUsageSettings = useQuery(api.extraUsage.getExtraUsageSettings);

  const [isTogglingExtraUsage, setIsTogglingExtraUsage] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);

  const handleToggleExtraUsage = async (enabled: boolean) => {
    if (isTogglingExtraUsage) return;
    setIsTogglingExtraUsage(true);
    try {
      await saveUserCustomization({ extra_usage_enabled: enabled });
      if (!enabled) {
        toast.success("Extra usage disabled");
      } else {
        toast.success("Extra usage enabled");
      }
    } catch {
      toast.error("Failed to update extra usage setting");
    } finally {
      setIsTogglingExtraUsage(false);
    }
  };

  const isEnabled = userCustomization?.extra_usage_enabled ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Extra Usage Credits</p>
          <p className="text-sm text-muted-foreground">
            Balance: ${extraUsageSettings?.balanceDollars?.toFixed(2) ?? "0.00"}
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggleExtraUsage}
          disabled={isTogglingExtraUsage}
        />
      </div>

      {isEnabled && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            To purchase additional usage credits, please contact the admin.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBuyDialog(true)}
          >
            Buy Extra Usage
          </Button>
        </div>
      )}

      <BuyExtraUsageDialog
        open={showBuyDialog}
        onOpenChange={setShowBuyDialog}
      />
    </div>
  );
};

export { ExtraUsageSection };
