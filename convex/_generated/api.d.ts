/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chatStreams from "../chatStreams.js";
import type * as chats from "../chats.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as debugUtils from "../debugUtils.js";
import type * as extraUsage from "../extraUsage.js";
import type * as feedback from "../feedback.js";
import type * as fileActions from "../fileActions.js";
import type * as fileAggregate from "../fileAggregate.js";
import type * as fileStorage from "../fileStorage.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_utils from "../lib/utils.js";
import type * as localSandbox from "../localSandbox.js";
import type * as manualSubscriptions from "../manualSubscriptions.js";
import type * as messages from "../messages.js";
import type * as notes from "../notes.js";
import type * as rateLimitStatus from "../rateLimitStatus.js";
import type * as redisPubsub from "../redisPubsub.js";
import type * as referrals from "../referrals.js";
import type * as sharedChats from "../sharedChats.js";
import type * as teamExtraUsage from "../teamExtraUsage.js";
import type * as tempStreams from "../tempStreams.js";
import type * as unitEconomics from "../unitEconomics.js";
import type * as unitEconomicsLib from "../unitEconomicsLib.js";
import type * as usageLogs from "../usageLogs.js";
import type * as userCustomization from "../userCustomization.js";
import type * as userDeletion from "../userDeletion.js";
import type * as userSuspensions from "../userSuspensions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chatStreams: typeof chatStreams;
  chats: typeof chats;
  constants: typeof constants;
  crons: typeof crons;
  debugUtils: typeof debugUtils;
  extraUsage: typeof extraUsage;
  feedback: typeof feedback;
  fileActions: typeof fileActions;
  fileAggregate: typeof fileAggregate;
  fileStorage: typeof fileStorage;
  "lib/logger": typeof lib_logger;
  "lib/utils": typeof lib_utils;
  localSandbox: typeof localSandbox;
  manualSubscriptions: typeof manualSubscriptions;
  messages: typeof messages;
  notes: typeof notes;
  rateLimitStatus: typeof rateLimitStatus;
  redisPubsub: typeof redisPubsub;
  referrals: typeof referrals;
  sharedChats: typeof sharedChats;
  teamExtraUsage: typeof teamExtraUsage;
  tempStreams: typeof tempStreams;
  unitEconomics: typeof unitEconomics;
  unitEconomicsLib: typeof unitEconomicsLib;
  usageLogs: typeof usageLogs;
  userCustomization: typeof userCustomization;
  userDeletion: typeof userDeletion;
  userSuspensions: typeof userSuspensions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  fileCountByUser: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"fileCountByUser">;
};
