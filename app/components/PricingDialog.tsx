"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { Loader2, X, MessageCircle } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalState";
import { useUpgrade } from "../hooks/useUpgrade";
import {
  freeFeatures,
  proFeatures,
  proPlusFeatures,
  ultraFeatures,
  teamFeatures,
} from "@/lib/pricing/features";
import BillingFrequencySelector from "./BillingFrequencySelector";
import UpgradeConfirmationDialog from "./UpgradeConfirmationDialog";

interface PricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

  interface PlanCardProps {
    planName: string;
    price: number;
    description: string;
    features: Array<{
      icon: React.ComponentType<{ className?: string }>;
      text: string;
    }>;
    buttonText: string;
    buttonVariant?: "default" | "secondary";
    buttonClassName?: string;
    onButtonClick?: () => void;
    isButtonDisabled?: boolean;
    isButtonLoading?: boolean;
  customClassName?: string;
  badgeText?: string;
  badgeClassName?: string;
  footerNote?: string;
  featureHeader?: string | null;
  headerAction?: React.ReactNode;
}

const PlanCard: React.FC<PlanCardProps> = ({
  planName,
  price,
  description,
  features,
  buttonText,
  buttonVariant = "secondary",
  buttonClassName = "",
  onButtonClick,
  isButtonDisabled = false,
  isButtonLoading = false,
  customClassName = "",
  badgeText,
  badgeClassName = "",
  footerNote,
  featureHeader,
  headerAction,
}) => {
  return (
    <div
      className={`border border-border md:min-h-[30rem] md:rounded-2xl relative flex w-full min-w-0 flex-col justify-center gap-4 rounded-xl px-6 py-6 text-sm bg-background ${customClassName}`}
    >
      <div className="relative flex flex-col mt-0">
        <div className="flex flex-col gap-5">
          <div className="flex min-h-10 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[28px] font-medium leading-tight">
              <span>{planName}</span>
              {badgeText ? (
                <Badge
                  className={`border-none rounded-4xl px-2 pt-1.5 pb-1.25 text-[11px] font-semibold bg-[#DCDBFF] text-[#615EEB] dark:bg-[#444378] dark:text-[#B9B7FF] ${badgeClassName}`}
                >
                  {badgeText}
                </Badge>
              ) : null}
            </div>
            {headerAction ? (
              <div className="shrink-0 pt-0.5">{headerAction}</div>
            ) : null}
          </div>
          <div className="flex items-end gap-1.5">
            <div className="flex text-foreground">
              <div className="text-2xl text-muted-foreground">$</div>
              <div className="text-5xl">{price}</div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="mt-auto mb-0.5 flex h-full flex-col items-start">
                <p className="text-muted-foreground w-full text-xs">
                  USD / <br />
                  month
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-foreground text-base mt-4 font-medium">
          {description}
        </p>
      </div>

      <div className="mb-2.5 w-full flex flex-col gap-2">
        {onButtonClick ? (
          <Button
            onClick={onButtonClick}
            disabled={isButtonDisabled}
            className={`w-full rounded-xl bg-[#25D366] hover:bg-[#20bd56] text-white ${buttonClassName}`}
            variant="default"
            size="lg"
          >
            {isButtonLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4 fill-current" />
            )}
            {isButtonLoading ? "Redirecting..." : `Chat to ${buttonText}`}
          </Button>
        ) : (
          <Button
            disabled={isButtonDisabled}
            className={`w-full ${buttonClassName}`}
            variant={buttonVariant}
            size="lg"
          >
            {buttonText}
          </Button>
        )}
      </div>

      <div className="flex flex-col grow gap-2">
        {featureHeader && (
          <p className="text-base font-semibold mb-2">{featureHeader}</p>
        )}
        <ul className="mb-2 flex flex-col gap-5">
          {features.map((feature, index) => (
            <li key={index} className="relative">
              <div className="flex justify-start gap-3.5">
                <feature.icon className="h-5 w-5 shrink-0" />
                <span className="text-foreground font-normal">
                  {feature.text}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {footerNote ? (
        <p className="text-muted-foreground text-xs mt-auto">{footerNote}</p>
      ) : null}
    </div>
  );
};

type PremiumPlan = "pro-plus" | "ultra";

interface PremiumPlanSelectorProps {
  value: PremiumPlan;
  onChange: (value: PremiumPlan) => void;
}

const PremiumPlanSelector: React.FC<PremiumPlanSelectorProps> = ({
  value,
  onChange,
}) => {
  const options: Array<{ value: PremiumPlan; label: string }> = [
    { value: "pro-plus", label: "Pro+" },
    { value: "ultra", label: "Ultra" },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full bg-muted p-1"
      role="radiogroup"
      aria-label="Premium plan tier"
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={cn(
              "min-w-16 rounded-full px-3 py-1.5 text-sm font-medium transition",
              isSelected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

const PricingDialog: React.FC<PricingDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { subscription, setTeamPricingDialogOpen } =
    useGlobalState();
  const { upgradeLoading, handleUpgrade } = useUpgrade();
  const [isYearly, setIsYearly] = React.useState(false);
  const [selectedPremiumPlan, setSelectedPremiumPlan] =
    React.useState<PremiumPlan>("pro-plus");
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingUpgrade, setPendingUpgrade] = React.useState<{
    plan: string;
    planName: string;
    price: number;
  } | null>(null);

  // Auto-close pricing dialog for ultra/team users (pro-plus can still upgrade to ultra)
  React.useEffect(() => {
    if (isOpen && (subscription === "ultra" || subscription === "team")) {
      onClose();
    }
  }, [isOpen, subscription, onClose]);

  React.useEffect(() => {
    if (isOpen && subscription === "pro-plus") {
      setSelectedPremiumPlan("ultra");
    } else if (isOpen) {
      setSelectedPremiumPlan("pro-plus");
    }
  }, [isOpen, subscription]);

  const handleBillingChange = (value: "monthly" | "yearly") => {
    setIsYearly(value === "yearly");
  };

  const handleUpgradeClick = async (
    plan:
      | "pro-monthly-plan"
      | "pro-plus-monthly-plan"
      | "ultra-monthly-plan"
      | "pro-yearly-plan"
      | "pro-plus-yearly-plan"
      | "ultra-yearly-plan",
    planName: string,
    price: number,
  ) => {
    if (subscription !== "free") {
      setPendingUpgrade({ plan, planName, price });
      setShowConfirmDialog(true);
      return;
    }

    try {
      await handleUpgrade(plan, undefined, undefined, subscription);
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
  };

  const confirmUpgrade = async () => {
    if (!pendingUpgrade) return;
    try {
      await handleUpgrade(
        pendingUpgrade.plan as any, 
        undefined, 
        undefined, 
        subscription
      );
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
  };

  const handleSignUp = () => {
    window.location.href = "/signup";
  };

  const handleTeamClick = () => {
    onClose();
    setTeamPricingDialogOpen(true);
  };

  const [showTeamPlan, setShowTeamPlan] = React.useState(false);

  // Button configurations for Free plan
  const getFreeButtonConfig = () => {
    if (user && subscription === "free") {
      return {
        text: "Your current plan",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    } else if (!user) {
      return {
        text: "Get Started",
        disabled: false,
        className: "",
        variant: "secondary" as const,
        onClick: handleSignUp,
      };
    } else {
      return {
        text: "Current Plan",
        disabled: true,
        className: "opacity-50 cursor-not-allowed",
        variant: "secondary" as const,
      };
    }
  };

  const freeButtonConfig = getFreeButtonConfig();

  const premiumPlanPrice =
    selectedPremiumPlan === "pro-plus"
      ? isYearly
        ? 50
        : 60
      : isYearly
        ? 166
        : 200;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="!max-w-none !w-screen !h-screen !max-h-none !m-0 !rounded-none !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 overflow-y-auto"
          data-testid="modal-account-payment"
          showCloseButton={false}
        >
          <div className="relative grid grid-cols-[1fr_auto_1fr] px-6 py-4 md:pt-[4.5rem] md:pb-6">
            <div></div>
            <div className="my-1 flex flex-col items-center justify-center md:mt-0 md:mb-0">
              <DialogTitle className="text-3xl font-semibold">
                Upgrade your plan
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="text-foreground justify-self-end opacity-50 transition hover:opacity-75 md:absolute md:end-6 md:top-6"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-2 mb-4 flex justify-center px-6">
            <BillingFrequencySelector
              value={isYearly ? "yearly" : "monthly"}
              onChange={handleBillingChange}
              isOpen={isOpen}
            />
          </div>

          <div className="flex justify-center gap-6 flex-col md:flex-row pb-6">
            {showTeamPlan ? (
              <>
                {/* Free Plan */}
                <PlanCard
                  planName="Free"
                  price={0}
                  description="Intelligence for everyday tasks"
                  features={freeFeatures}
                  buttonText={freeButtonConfig.text}
                  buttonVariant={freeButtonConfig.variant}
                  buttonClassName={freeButtonConfig.className}
                  isButtonDisabled={freeButtonConfig.disabled}
                />

                {/* Team Plan */}
                <PlanCard
                  planName="Team"
                  price={isYearly ? 33 : 40}
                  description="Supercharge your team with a secure, collaborative workspace"
                  features={teamFeatures}
                  buttonText={"Upgrade"}
                  buttonVariant={"default"}
                  buttonClassName="font-semibold"
                  onButtonClick={(method) => {
                    handleTeamClick();
                  }}
                  isButtonDisabled={false}
                  customClassName="border-[#CFCEFC] bg-[#F5F5FF] dark:bg-[#282841] dark:border-[#484777]"
                  badgeText="RECOMMENDED"
                />
              </>
            ) : (
              <>
                {/* Free Plan */}
                <PlanCard
                  planName="Free"
                  price={0}
                  description="Intelligence for everyday tasks"
                  features={freeFeatures}
                  buttonText={freeButtonConfig.text}
                  buttonVariant={freeButtonConfig.variant}
                  buttonClassName={freeButtonConfig.className}
                  isButtonDisabled={freeButtonConfig.disabled}
                />

                {/* Pro Plan */}
                <PlanCard
                  planName="Pro"
                  price={isYearly ? 21 : 25}
                  description="More access to advanced intelligence"
                  features={proFeatures}
                  buttonText="Upgrade"
                  buttonVariant="default"
                  buttonClassName="font-semibold"
                  onButtonClick={() => {
                    const plan = isYearly ? "pro-yearly-plan" : "pro-monthly-plan";
                    handleUpgradeClick(plan, "Pro", isYearly ? 21 : 25);
                  }}
                  isButtonDisabled={upgradeLoading}
                  isButtonLoading={upgradeLoading && pendingUpgrade?.planName === "Pro"}
                  customClassName="border-[#CFCEFC] bg-[#F5F5FF] dark:bg-[#282841] dark:border-[#484777]"
                  badgeText="POPULAR"
                />

                {/* Premium Plan (Pro+ or Ultra) */}
                <PlanCard
                  planName={selectedPremiumPlan === "pro-plus" ? "Pro+" : "Ultra"}
                  price={premiumPlanPrice}
                  description={
                    selectedPremiumPlan === "pro-plus"
                      ? "The perfect balance of power and value"
                      : "Full access to the best of HackerAI"
                  }
                  features={
                    selectedPremiumPlan === "pro-plus"
                      ? proPlusFeatures
                      : ultraFeatures
                  }
                  buttonText="Upgrade"
                  buttonVariant="default"
                  buttonClassName=""
                  onButtonClick={() => {
                    const planName = selectedPremiumPlan === "pro-plus" ? "Pro+" : "Ultra";
                    const plan = (isYearly ? `${selectedPremiumPlan}-yearly-plan` : `${selectedPremiumPlan}-monthly-plan`) as "pro-plus-monthly-plan" | "pro-plus-yearly-plan" | "ultra-monthly-plan" | "ultra-yearly-plan";
                    handleUpgradeClick(plan, planName, premiumPlanPrice);
                  }}
                  isButtonDisabled={upgradeLoading}
                  isButtonLoading={upgradeLoading && pendingUpgrade?.planName === (selectedPremiumPlan === "pro-plus" ? "Pro+" : "Ultra")}
                  footerNote={
                    selectedPremiumPlan === "ultra"
                      ? "Unlimited subject to abuse guardrails."
                      : undefined
                  }
                  headerAction={
                    <PremiumPlanSelector
                      value={selectedPremiumPlan}
                      onChange={setSelectedPremiumPlan}
                    />
                  }
                />
              </>
            )}
          </div>

          <div className="flex justify-center pb-8">
            <Button
              variant="secondary"
              className="rounded-full border border-border bg-background text-foreground hover:bg-muted/60"
              onClick={() => setShowTeamPlan((prev) => !prev)}
            >
              {showTeamPlan ? "View Individual Plan" : "View Team Plan"}
            </Button>
          </div>

          <div className="flex justify-center pb-10 text-sm text-muted-foreground">
            Questions?{" "}
            <button
              onClick={() => window.open("https://wa.me/" + (process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "917904721312"), "_blank")}
              className="ml-1 font-medium text-foreground underline underline-offset-2 hover:opacity-70"
            >
              Chat with us
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        planName={pendingUpgrade?.planName || ""}
        price={pendingUpgrade?.price || 0}
        targetPlan={pendingUpgrade?.plan || ""}
      />
    </>
  );
};

export default PricingDialog;
