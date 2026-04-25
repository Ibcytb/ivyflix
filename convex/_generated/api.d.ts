/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as anime from "../anime.js";
import type * as auth from "../auth.js";
import type * as ecchiSkips from "../ecchiSkips.js";
import type * as episodes from "../episodes.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as languages from "../languages.js";
import type * as router from "../router.js";
import type * as subtitleProxy from "../subtitleProxy.js";
import type * as subtitles from "../subtitles.js";
import type * as userPreferences from "../userPreferences.js";
import type * as watchHistory from "../watchHistory.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  anime: typeof anime;
  auth: typeof auth;
  ecchiSkips: typeof ecchiSkips;
  episodes: typeof episodes;
  favorites: typeof favorites;
  http: typeof http;
  languages: typeof languages;
  router: typeof router;
  subtitleProxy: typeof subtitleProxy;
  subtitles: typeof subtitles;
  userPreferences: typeof userPreferences;
  watchHistory: typeof watchHistory;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
