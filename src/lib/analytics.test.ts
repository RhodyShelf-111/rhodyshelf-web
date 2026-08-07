import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const init = vi.fn()
const capture = vi.fn()

vi.mock("posthog-js", () => ({
  default: {
    init: (...a: unknown[]) => init(...a),
    capture: (...a: unknown[]) => capture(...a),
  },
}))

import {
  initAnalytics,
  isAnalyticsEnabled,
  track,
  trackPageview,
  ANALYTICS_EVENTS,
  __resetAnalyticsForTests,
} from "./analytics"

/** Let the dynamic import()'s .then callbacks run. */
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.clearAllMocks()
  __resetAnalyticsForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("analytics", () => {
  // The site ships this code with no key set — it must be completely inert
  // until one is added in Vercel, the same way the SEO verification tokens are.
  describe("with no key configured (the default)", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "")
    })

    it("reports itself disabled", () => {
      expect(isAnalyticsEnabled()).toBe(false)
    })

    it("never loads or initializes posthog", async () => {
      initAnalytics()
      await flush()
      expect(init).not.toHaveBeenCalled()
    })

    it("drops events instead of queueing them", async () => {
      track(ANALYTICS_EVENTS.UPVOTE, { action: "add" })
      trackPageview("/deals")
      // Turning analytics on later must not replay everything that happened
      // while it was off.
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_later")
      initAnalytics()
      await flush()
      expect(capture).not.toHaveBeenCalled()
    })
  })

  describe("with a key configured", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key")
    })

    it("reports itself enabled", () => {
      expect(isAnalyticsEnabled()).toBe(true)
    })

    it("initializes cookieless, with replay and autocapture off", async () => {
      initAnalytics()
      await flush()
      expect(init).toHaveBeenCalledTimes(1)
      const [key, config] = init.mock.calls[0] as [string, Record<string, unknown>]
      expect(key).toBe("phc_test_key")
      expect(config.cookieless_mode).toBe("always")
      expect(config.disable_session_recording).toBe(true)
      expect(config.autocapture).toBe(false)
      // Pageviews are captured by hand: App Router client navigations are not
      // page loads, so automatic capture would only ever see the first one.
      expect(config.capture_pageview).toBe(false)
    })

    it("only initializes once however many times it is called", async () => {
      initAnalytics()
      initAnalytics()
      await flush()
      initAnalytics()
      await flush()
      expect(init).toHaveBeenCalledTimes(1)
    })

    it("captures an event once ready", async () => {
      initAnalytics()
      await flush()
      track(ANALYTICS_EVENTS.BUY_CLICK, { dispensary: "Mother Earth" })
      expect(capture).toHaveBeenCalledWith("buy_click", {
        dispensary: "Mother Earth",
      })
    })

    // The very first pageview is fired in the same tick as init(), before the
    // dynamic import resolves. Without a queue it would simply be lost — and
    // that is the one event that answers "does anyone visit this site?".
    it("queues events fired before the import resolves, then flushes them", async () => {
      initAnalytics()
      track(ANALYTICS_EVENTS.UPVOTE, { action: "add" })
      expect(capture).not.toHaveBeenCalled()
      await flush()
      expect(capture).toHaveBeenCalledWith("upvote", { action: "add" })
    })

    it("bounds the queue so a slow or broken load cannot grow it forever", async () => {
      initAnalytics()
      for (let i = 0; i < 100; i++) {
        track(ANALYTICS_EVENTS.UPVOTE, { action: "add" })
      }
      await flush()
      expect(capture).toHaveBeenCalledTimes(20)
    })

    it("keeps flushing the queue when one queued event throws", async () => {
      capture.mockImplementationOnce(() => {
        throw new Error("bad event")
      })
      initAnalytics()
      track(ANALYTICS_EVENTS.UPVOTE, { action: "add" })
      track(ANALYTICS_EVENTS.BUY_CLICK, {})
      await flush()
      expect(capture).toHaveBeenCalledTimes(2)
    })

    it("never throws when capture throws after init", async () => {
      initAnalytics()
      await flush()
      capture.mockImplementation(() => {
        throw new Error("network gone")
      })
      expect(() => track(ANALYTICS_EVENTS.UPVOTE, { action: "add" })).not.toThrow()
    })

    describe("pageviews", () => {
      it("sends an absolute current_url built from a path", async () => {
        initAnalytics()
        await flush()
        trackPageview("/search?q=indica")
        expect(capture).toHaveBeenCalledWith("$pageview", {
          $current_url: "http://localhost:3000/search?q=indica",
        })
      })

      it("keeps the query string, which is where search and filters live", async () => {
        initAnalytics()
        await flush()
        trackPageview("/search?q=gummies&category=edible")
        const props = capture.mock.calls[0][1] as { $current_url: string }
        expect(props.$current_url).toContain("q=gummies")
        expect(props.$current_url).toContain("category=edible")
      })

      it("falls back to the raw value when the URL will not parse", async () => {
        initAnalytics()
        await flush()
        expect(() => trackPageview("::::")).not.toThrow()
        expect(capture).toHaveBeenCalled()
      })
    })
  })
})
