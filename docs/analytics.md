# Analytics

RhodyShelf had no analytics of any kind until August 2026 — no Vercel Web
Analytics, no dependency, nothing. That meant no product question could be
answered with a number. This is the fix.

## Status: shipped but inert

The code is live and does nothing until `NEXT_PUBLIC_POSTHOG_KEY` is set. Same
posture as the search-engine verification tokens in the root layout. With no
key, `initAnalytics()` returns immediately, `track()` no-ops, and `posthog-js`
is never downloaded (the import is dynamic).

## Turning it on (3 steps, ~10 minutes)

1. **Create a PostHog project** at [posthog.com](https://posthog.com). The free
   tier is 1M events/month with no card, which is far above this site's volume.
2. **Enable "Cookieless server hash mode"** under *Project Settings → Web
   analytics*. Required, and do it **before** the key goes live — PostHog
   documents it as a prerequisite for client-side cookieless tracking, and
   identity cannot be re-derived for events already ingested (the daily salt is
   deleted after processing).
3. **Set one env var in Vercel — Production only:**

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_POSTHOG_KEY` | your project API key (`phc_…`) |
   | `NEXT_PUBLIC_POSTHOG_HOST` | only for EU cloud (`https://eu.i.posthog.com`). US cloud is the default — leave unset |

Redeploy and the first pageview should land within seconds. Env vars only take
effect on a new build.

**Do not set the key in Development or Preview.** Every hot reload fires a
`$pageview` and every test click fires a `buy_click`, into the same dataset the
kill criterion below is read from. At this site's volume local dev traffic would
not be noise — it would be most of the data. Leaving the key unset is the
designed off state, not a workaround: `initAnalytics()` returns early, `track()`
no-ops, and `posthog-js` is never downloaded. If real dev analytics are ever
wanted, use a **second PostHog project** with its own key rather than sharing
this one.

## Why cookieless

`cookieless_mode: "always"` writes **nothing** to cookies, localStorage, or
sessionStorage. People are counted by a one-way hash computed on PostHog's
servers, which cannot be reversed. This keeps `/privacy`'s "no tracking cookies
beyond age verification" claim true, and means no consent banner.

The identifier is `hash(team_id, daily_salt, ip_address, user_agent, hostname)`,
and PostHog deletes each day's salt once that day's events are processed. Two
consequences that change how the numbers must be read:

- **Returning visitors count as a new person every day.** The salt rotates at
  midnight, so unique-person counts are inflated and multi-day retention is
  close to meaningless. This is why the kill criterion below is written in
  *page views* and *event counts*, never users — event counts are unaffected by
  identity. Keep it that way.
- **Bot detection is half-disabled, and the half that still works is the half
  you need.** PostHog hashes and strips the IP before transformations run, so
  IP-based enrichment (GeoIP, the ingestion-time bot filter) is gone. But the
  user-agent-derived `$virt_*` properties are computed at *query* time and work
  normally. Filter every query with:

  ```sql
  AND NOT coalesce(properties.$virt_is_bot, false)
  ```

  Not optional. Measured on 2026-08-08, the day the key went live: **28 of 28
  events had `$virt_is_bot = true`** — agent browsing and crawlers, zero humans.
  An unfiltered pageview count on this project isn't a weak signal, it's a
  meaningless one. Note `$virt_*` won't appear in the project's property
  taxonomy and queries using it emit a "property not found" warning; it resolves
  correctly anyway.

Session replay is **off deliberately**, and not just as a default:

- It requires device storage, which would break cookieless mode.
- Recording what specific individuals browse on a cannabis site is
  sensitive-category behavior, whatever the privacy policy says.

If a funnel ever comes back genuinely ambiguous and replay is the only way to
resolve it, turn it on for a bounded window and ship the `/privacy` update in
the same PR.

## What is instrumented

| Event | Where | Why |
|---|---|---|
| `$pageview` | `instrumentation-client.ts` — once on load, then on every router transition | Answers "does anyone visit, and what do they land on?" |
| `buy_click` | delegated listener, `data-track="buy"` | The site's actual money action. Carries `dispensary`, `category`, `surface` |
| `upvote` | `use-upvotes.ts` | Measures intent to vote — fires even when the POST is rate-limited or fails |
| `search_performed` | `search-client.tsx` | Carries `results` and `zero_results`, the one thing a URL cannot tell you |

**Search terms and filter selections need no events of their own.** Both live in
the query string, so `/search?q=indica&category=flower` is already fully readable
off the `$pageview` URL. Breaking those down in PostHog is a URL breakdown, not a
new event.

### Deliberately not instrumented

- **Autocapture** — fires on every click and would bury the four events above.
- **The dispensary page's "Visit Site" link** — that is store browsing, not a
  product purchase. Tagging it would pollute `buy_click`, which is meant to be
  the money metric.
- **Session replay / `$pageleave`** — see above.

### Settings that live in PostHog, not in this repo

Some capture is controlled by **remote config** fetched at init
(`us-assets.i.posthog.com/array/<key>/config.js`), so the dashboard can switch
on features this codebase never asked for. Verified in production on
2026-08-08, two were loading despite `autocapture: false` — they are separate
features and that flag does not cover them:

| Script | Emits | Decision |
|---|---|---|
| `dead-clicks-autocapture.js` | `$dead_click` | **Off** — Project Settings → Autocapture |
| `web-vitals.js` | `$web_vitals` | **Off** — same page |

Both are off because neither answers a question this install exists to answer,
and `$web_vitals` in particular is chatty enough to matter against the free
tier. The broader point: if event volume or event types ever look wrong, check
the dashboard before reading the code — the code is not the only input.

Bounce rate is also unusable here and no threshold should be set for it.
PostHog scores a bounce as one pageview + **zero autocapture events** + under
10s, and its docs say the metric needs autocapture and `$pageleave` to be
accurate. Both are deliberately off, so it will read inflated regardless of the
duration setting. Use `buy_click` per product-page view instead — an event
ratio, immune to both this and the identity churn above.

## Adding an event

Add it to `ANALYTICS_EVENTS` in `src/lib/analytics.ts` (a const object, so
typos are a type error), then call `track(ANALYTICS_EVENTS.YOUR_EVENT, {...})`.
`track()` never throws and no-ops when analytics is off, so it is safe to call
from anywhere client-side without a guard.

For an outbound link, prefer the attribute over a handler:
`data-track="buy"` works from server components too, which a handler cannot.

## The kill criterion — read this before drawing conclusions

The numbers are pre-built on the [Kill Criterion Review
dashboard](https://us.posthog.com/project/263857/dashboard/1972621) — built
2026-08-08, before there was any data to argue with. Every tile filters bots.
Start with tile 5 (contamination); if the traffic is still mostly automation,
none of the others mean anything yet.

Written **before** install, on purpose, so the result cannot be
reinterpreted afterwards.

Two weeks after the key goes live, look at product-page views and `upvote`
events:

- **Under ~500 product-page views in 14 days** → the constraint is acquisition,
  not engagement. Every engagement feature (public upvote counts, community
  mechanics, anything social) is **cancelled, not deferred**. The next work is
  SEO, distribution, and traffic. Nothing about ranking or voting matters at
  this volume.
- **Meaningful traffic but upvotes under ~1 per 200 product views** → people use
  this as a price-comparison tool, not a feed. That is a legitimate finding, not
  a UI bug to fix. Stop trying to make voting happen.
- **Meaningful traffic and a healthy upvote rate** → revisit public counts, and
  re-derive any display threshold against the 15-day median SKU menu life rather
  than picking a round number.

Background on why the threshold is written this way: at the time of writing the
site had 23 upvotes from 12 people across four months, and the upvote button is
already visible on three separate surfaces — so "nobody can find the button" was
never a live hypothesis. See the plan in
`~/.gstack/projects/RhodyShelf-111-rhodyshelf-web/` for the full arithmetic.
