"use client";

import React from "react";
import { ChatInput } from "../components/ChatInput";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Chat } from "../components/chat";
import { TeamWelcomeDialog } from "../components/TeamDialogs";
import MigratePentestgptDialog from "../components/MigratePentestgptDialog";

import { useGlobalState } from "../contexts/GlobalState";
import { usePentestgptMigration } from "../hooks/usePentestgptMigration";
import { upsertDraft } from "@/lib/utils/client-storage";

const AuthenticatedContent = () => {
  return <Chat autoResume={false} />;
};

export default function Page() {
  const {
    teamWelcomeDialogOpen,
    setTeamWelcomeDialogOpen,
    migrateFromPentestgptDialogOpen,
    setMigrateFromPentestgptDialogOpen,
  } = useGlobalState();

  const { isMigrating, migrate } = usePentestgptMigration();
  const searchParams =
    typeof window !== "undefined" ? window.location.search : "";
  const { initialSeats, initialPlan } = React.useMemo(() => {
    if (typeof window === "undefined") {
      return { initialSeats: 5, initialPlan: "monthly" as const };
    }
    const urlParams = new URLSearchParams(searchParams);
    const urlSeats = urlParams.get("numSeats");
    const urlPlan = urlParams.get("selectedPlan");

    let seats = 5;
    if (urlSeats) {
      const parsed = parseInt(urlSeats, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        seats = parsed;
      }
    }

    const plan = (urlPlan === "yearly" ? "yearly" : "monthly") as
      | "monthly"
      | "yearly";

    return { initialSeats: seats, initialPlan: plan };
  }, [searchParams]);

  return (
    <>
      <AuthenticatedContent />
      <TeamWelcomeDialog
        open={teamWelcomeDialogOpen}
        onOpenChange={setTeamWelcomeDialogOpen}
      />
      <MigratePentestgptDialog
        open={migrateFromPentestgptDialogOpen}
        onOpenChange={setMigrateFromPentestgptDialogOpen}
        isMigrating={isMigrating}
        onConfirm={migrate}
      />
    </>
  );
}
