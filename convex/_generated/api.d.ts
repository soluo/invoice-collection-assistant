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
import type * as crons from "../crons.js";
import type * as dev from "../dev.js";
import type * as emails from "../emails.js";
import type * as errors from "../errors.js";
import type * as events from "../events.js";
import type * as followUp from "../followUp.js";
import type * as http from "../http.js";
import type * as invitationEmails from "../invitationEmails.js";
import type * as invoiceEmails from "../invoiceEmails.js";
import type * as invoiceNotes from "../invoiceNotes.js";
import type * as invoices from "../invoices.js";
import type * as lib_emailHtml from "../lib/emailHtml.js";
import type * as lib_encoding from "../lib/encoding.js";
import type * as lib_invoiceStatus from "../lib/invoiceStatus.js";
import type * as oauth from "../oauth.js";
import type * as organizations from "../organizations.js";
import type * as payments from "../payments.js";
import type * as pdfExtractionAI from "../pdfExtractionAI.js";
import type * as permissions from "../permissions.js";
import type * as reminderDefaults from "../reminderDefaults.js";
import type * as reminders from "../reminders.js";
import type * as router from "../router.js";
import type * as testReminders from "../testReminders.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  dev: typeof dev;
  emails: typeof emails;
  errors: typeof errors;
  events: typeof events;
  followUp: typeof followUp;
  http: typeof http;
  invitationEmails: typeof invitationEmails;
  invoiceEmails: typeof invoiceEmails;
  invoiceNotes: typeof invoiceNotes;
  invoices: typeof invoices;
  "lib/emailHtml": typeof lib_emailHtml;
  "lib/encoding": typeof lib_encoding;
  "lib/invoiceStatus": typeof lib_invoiceStatus;
  oauth: typeof oauth;
  organizations: typeof organizations;
  payments: typeof payments;
  pdfExtractionAI: typeof pdfExtractionAI;
  permissions: typeof permissions;
  reminderDefaults: typeof reminderDefaults;
  reminders: typeof reminders;
  router: typeof router;
  testReminders: typeof testReminders;
  users: typeof users;
  utils: typeof utils;
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

export declare const components: {};
