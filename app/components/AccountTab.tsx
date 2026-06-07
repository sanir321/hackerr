"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  freeFeatures,
  proFeatures,
  proPlusFeatures,
  ultraFeatures,
  teamFeatures,
  PLAN_HEADERS,
} from "@/lib/pricing/features";
import DeleteAccountDialog from "./DeleteAccountDialog";
import { useGlobalState } from "../contexts/GlobalState";
import { Sparkles } from "lucide-react";

const AccountTab = () => {
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const { subscription } = useGlobalState();

  const currentPlanName = useMemo(() => {
    switch (subscription) {
      case "pro":
        return "Umbraa Pro";
      case "pro-plus":
        return "Umbraa Pro+";
      case "ultra":
        return "Umbraa Ultra";
      case "team":
        return "Umbraa Team";
      default:
        return "Umbraa Free";
    }
  }, [subscription]);

  const features = useMemo(() => {
    switch (subscription) {
      case "pro":
        return proFeatures;
      case "pro-plus":
        return proPlusFeatures;
      case "ultra":
        return ultraFeatures;
      case "team":
        return teamFeatures;
      default:
        return freeFeatures;
    }
  }, [subscription]);

  const featureHeader = PLAN_HEADERS[subscription || "free"];

  return (
    <div className="space-y-6 min-h-0">
      <div className="border-b py-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{currentPlanName}</div>
          </div>
          {subscription !== "ultra" && subscription !== "team" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 font-medium bg-[#615eeb] hover:bg-[#504bb8] text-white border-none"
              onClick={() => (window.location.hash = "pricing")}
            >
              <Sparkles className="size-3.5 fill-current" />
              Upgrade
            </Button>
          )}
        </div>

        <div className="mt-2 rounded-lg bg-transparent px-0">
          {featureHeader && (
            <span className="text-sm font-semibold inline-block pb-4">
              {featureHeader}
            </span>
          )}
          <ul className="mb-2 flex flex-col gap-5">
            {features.map((feature, index) => (
              <li key={index} className="relative">
                <div className="flex justify-start gap-3.5">
                  <feature.icon className="h-5 w-5 shrink-0" />
                  <span className="font-normal">{feature.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Delete Account Section */}
      <div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium">Delete account</div>
          </div>
          <Button
            type="button"
            data-testid="delete-account-button"
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteAccount(true)}
            aria-label="Delete account"
          >
            Delete
          </Button>
        </div>
      </div>

      <DeleteAccountDialog
        open={showDeleteAccount}
        onOpenChange={setShowDeleteAccount}
      />
    </div>
  );
};

export { AccountTab };
