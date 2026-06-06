import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { SubscriptionTier } from "@/types";

const DATA_DIR = join(process.cwd(), "data");
const FILE_PATH = join(DATA_DIR, "subscriptions.json");

type Tier = SubscriptionTier;

type Store = Record<string, Tier>;

function readStore(): Store {
  try {
    if (!existsSync(FILE_PATH)) return {};
    return JSON.parse(readFileSync(FILE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE_PATH, JSON.stringify(store, null, 2));
}

export function getSubscriptionTier(userId: string): Tier {
  const store = readStore();
  return store[userId] ?? "free";
}

export function setSubscriptionTier(userId: string, tier: Tier): void {
  const store = readStore();
  store[userId] = tier;
  writeStore(store);
}
