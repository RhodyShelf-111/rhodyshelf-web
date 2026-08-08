# RhodyShelf

Cannabis price comparison for Rhode Island. Shoppers search one catalog of every
dispensary's live menu, compare the same product across shops, and sort by what
it actually costs per gram or per 10mg of THC.

Live at **[rhodyshelf.com](https://rhodyshelf.com)**.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, RSC) — **see [AGENTS.md](AGENTS.md)** |
| UI | React 19, Tailwind 4, shadcn + Base UI |
| Data | Supabase (Postgres), read server-side via the service-role key |
| Tests | Vitest 4 + Testing Library, jsdom — see [TESTING.md](TESTING.md) |
| Analytics | PostHog, cookieless — see [docs/analytics.md](docs/analytics.md) |
| Hosting | Vercel — push to `main` auto-deploys |

## Getting started

```bash
npm install
```

Then create `.env.local`:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
UPVOTE_SALT=<any-random-string>
```

Without it, every data-backed page 500s with `supabaseUrl is required`. Search,
privacy, and terms still render — they don't touch the service client at request
time. The real values are in the Vercel project settings.

```bash
npm run dev
```

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run verify     # lint + typecheck + test — run before pushing
npm run test       # vitest, single run
npm run test:watch # vitest, watch mode
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Where things live

```
src/app/(browse)/     shopper-facing routes (all SSG/ISR)
src/app/api/          route handlers — listings, search, product, saved, upvote
src/lib/queries/      every Supabase read; nothing else queries the DB
src/lib/              units, sorting, filtering, search terms, SEO builders
src/components/       product/, filters/, search/, layout/, seo/, ui/
supabase/migrations/  mirrored from the remote project (which is source of truth)
docs/architecture.md  how the data layer works and what will bite you
```

## Where the data comes from

RhodyShelf does not scrape. A separate service (`rhodyshelf-sync`, on its own
droplet) reads dispensary menus and upserts `current_inventory` roughly daily.
This app is read-only against that table.

Two consequences that explain most of the surprising behavior:

- **Nothing is deleted when a product sells out.** Rows persist and
  `last_seen_at` stops advancing, so every query applies an explicit 24h
  freshness window rather than trusting the table.
- **The sync rewrites a large share of rows every run**, so anything that must
  survive it lives in a database trigger, not in an app-side one-off UPDATE.

## Deploying

Push to `main`. Vercel builds and deploys automatically.

Do **not** run `vercel --prod` from a dirty working tree — that is how live
production silently drifted away from `main` once already.

## Docs

- **[AGENTS.md](AGENTS.md)** — read this before writing Next.js code
- **[CLAUDE.md](CLAUDE.md)** — working rules and the traps that don't announce themselves
- **[docs/architecture.md](docs/architecture.md)** — data layer, caching, units, sorting
- **[TESTING.md](TESTING.md)** — test layers, conventions, CI
- **[docs/analytics.md](docs/analytics.md)** — what's measured and the kill criterion
- **[supabase/migrations/README.md](supabase/migrations/README.md)** — migration workflow
