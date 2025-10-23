/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as oauth from "../oauth.js";
import type * as organizations from "../organizations.js";
import type * as pdfExtractionAI from "../pdfExtractionAI.js";
import type * as permissions from "../permissions.js";
import type * as reminders from "../reminders.js";
import type * as router from "../router.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  dashboard: typeof dashboard;
  http: typeof http;
  invoices: typeof invoices;
  oauth: typeof oauth;
  organizations: typeof organizations;
  pdfExtractionAI: typeof pdfExtractionAI;
  permissions: typeof permissions;
  reminders: typeof reminders;
  router: typeof router;
  utils: typeof utils;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
