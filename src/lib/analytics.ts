/**
 * Cookieless product analytics.
 *
 * Inert until `NEXT_PUBLIC_POSTHOG_KEY` is set in the environment — the same
 * posture as the search-engine verification tokens in the root layout. With no
 * key, `init` returns immediately, `track` no-ops, and posthog-js is never even
 * downloaded (the import is dynamic).
 *
 * Cookie posture: this install used to run `cookieless_mode: "always"`, which
 * wrote nothing to any browser storage. That was dropped on 2026-08-08 to turn
 * on session replay, which is mutually exclusive with it — replay needs device
 * storage, and the PostHog SDK refuses to record in cookieless mode regardless
 * of any project-side toggle. PostHog now sets its own cookies, and /privacy
 * was updated in the same change to say so.
 *
 * Replay is deliberately narrow: input masking stays on (PostHog's default),
 * and console logs and network payloads are explicitly off. Recording what
 * individuals browse on a cannabis site is sensitive-category behavior, so the
 * recording captures the screen and nothing else.
 */

import type { PostHog } from "posthog-js"

export const ANALYTICS_EVENTS = {
  /** Outbound click to a dispensary menu — the site's actual money action. */
  BUY_CLICK: "buy_click",
  /** A product upvote toggled on or off. */
  UPVOTE: "upvote",
  /** A search rendered, with how many results it found. */
  SEARCH_PERFORMED: "search_performed",
} as const

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

type Props = Record<string, string | number | boolean | undefined>

const DEFAULT_HOST = "https://us.i.posthog.com"

/** Events fired before the async import resolves would otherwise be dropped —
 *  the very first pageview is fired in the same tick as init(). Bounded so a
 *  misconfigured key can't grow it without limit. */
const MAX_QUEUED = 20
let queue: Array<{ event: string; props?: Props }> = []

let client: PostHog | null = null
let starting = false

function key(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined
}

/** True when a key is configured. Everything else in this module no-ops without one. */
export function isAnalyticsEnabled(): boolean {
  return Boolean(key())
}

/**
 * Load and initialize PostHog. Safe to call more than once; only the first
 * call does any work. Never throws — analytics failing must never take a page
 * down with it.
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return
  const apiKey = key()
  if (!apiKey || client || starting) return
  starting = true

  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(apiKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
        // Pageviews are captured explicitly: App Router client navigations are
        // not full page loads, so automatic capture would only ever see the
        // first one. See instrumentation-client.ts.
        capture_pageview: false,
        capture_pageleave: false,
        // Session replay, on since 2026-08-08. The screen only: inputs stay
        // masked (PostHog's default), and the two settings below keep console
        // output and request/response bodies out of recordings — on a cannabis
        // site those add real exposure and answer no product question.
        disable_session_recording: false,
        enable_recording_console_log: false,
        session_recording: {
          maskAllInputs: true,
          recordCrossOriginIframes: false,
        },
        // No accounts on this site, so there is never anyone to identify.
        person_profiles: "identified_only",
        // Deliberately off: autocapture fires on every click and would bury the
        // handful of events that actually answer a question.
        autocapture: false,
      })
      client = posthog
      const pending = queue
      queue = []
      for (const item of pending) {
        try {
          posthog.capture(item.event, item.props)
        } catch {
          // one bad event must not drop the rest of the queue
        }
      }
    })
    .catch(() => {
      // Blocked by an ad blocker, offline, CDN down — all fine, the site works
      // without analytics. Drop anything queued so it can't leak.
      starting = false
      queue = []
    })
}

/**
 * Record an event. No-ops silently when analytics is disabled or not yet
 * loaded-and-ready (queued in the latter case). Never throws.
 */
export function track(event: AnalyticsEvent | "$pageview", props?: Props): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return
  try {
    if (client) {
      client.capture(event, props)
      return
    }
    if (queue.length < MAX_QUEUED) queue.push({ event, props })
  } catch {
    // never let instrumentation break a user interaction
  }
}

/**
 * Record a pageview for `url`. Called once on load and again at the start of
 * every client navigation, so `$current_url` is set explicitly — at transition
 * start the browser's own location is still the *previous* page.
 *
 * Search queries and filter selections both live in the query string, so their
 * usage is readable straight off these URLs; neither needs its own event.
 */
export function trackPageview(url: string): void {
  track("$pageview", { $current_url: absoluteUrl(url) })
}

/** Router transitions report a path; PostHog wants a full URL. */
function absoluteUrl(url: string): string {
  if (typeof window === "undefined") return url
  try {
    return new URL(url, window.location.origin).toString()
  } catch {
    return url
  }
}

/** Test seam — resets module state between cases. */
export function __resetAnalyticsForTests(): void {
  client = null
  starting = false
  queue = []
}
