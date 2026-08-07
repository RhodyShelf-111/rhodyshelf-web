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
   analytics*. This is required. Without it, events still arrive but people are
   not counted, so every visitor-count number will read zero.
3. **Set two env vars in Vercel** (Production, Preview, and Development):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_POSTHOG_KEY` | your project API key (`phc_…`) |
   | `NEXT_PUBLIC_POSTHOG_HOST` | optional; defaults to `https://us.i.posthog.com`. Set it if your project is on EU cloud (`https://eu.i.posthog.com`) |

Redeploy and the first pageview should land within seconds.

## Why cookieless

`cookieless_mode: "always"` writes **nothing** to cookies, localStorage, or
sessionStorage. People are counted by a one-way hash computed on PostHog's
servers, which cannot be reversed. This keeps `/privacy`'s "no tracking cookies
beyond age verification" claim true.

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

## Adding an event

Add it to `ANALYTICS_EVENTS` in `src/lib/analytics.ts` (a const object, so
typos are a type error), then call `track(ANALYTICS_EVENTS.YOUR_EVENT, {...})`.
`track()` never throws and no-ops when analytics is off, so it is safe to call
from anywhere client-side without a guard.

For an outbound link, prefer the attribute over a handler:
`data-track="buy"` works from server components too, which a handler cannot.

## The kill criterion — read this before drawing conclusions

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
