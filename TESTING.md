# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast,
trust your instincts, and ship with confidence — without them, vibe coding is
just yolo coding. With tests, it's a superpower.

## Framework

- **Vitest 4** (`vitest.config.ts`) with the jsdom environment
- **@testing-library/react** for component tests
- **@testing-library/jest-dom** matchers, registered in `vitest.setup.ts`
- No `@vitejs/plugin-react`: vitest 4 transforms TSX natively; the plugin's
  current release peer-depends on Babel 8 while shadcn pins Babel 7

## Running tests

```bash
npm run test        # single run (CI mode)
npm run test:watch  # watch mode
npm run verify      # lint + typecheck + test — what CI runs
```

## CI

`.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run typecheck`,
and `npm run test` on every push to `main` and every PR.

The `npm ci` step matters as much as the test step. On 2026-08-08 `posthog-js`
was in `package.json` and the lockfile but had never been installed locally, so
11 test files failed to load and `tsc` errored — on `main`, for two days, with
nothing watching. Vercel was fine (it installs from the lockfile); only the
local checkouts were stale.

There is **no build step** in CI. Browse routes are SSG/ISR and query Supabase
at build time, so building here would mean putting the service-role key in repo
secrets. Vercel builds every PR as a preview deployment with the real env, so
that coverage already exists elsewhere.

**Editing the workflow requires a token with `workflow` scope.** The default
`gh` login (`repo`) cannot push changes to `.github/workflows/`. Either run
`gh auth refresh -h github.com -s workflow` once, or edit the file through
GitHub's web UI.

## Test layers

- **Unit tests** — pure logic in `src/lib/**` (formatters, filters, JSON-LD
  builders). Colocated as `*.test.ts` next to the module.
- **Integration/component tests** — React components rendered with Testing
  Library, colocated as `*.test.tsx`. Server components without async data
  fetching (e.g. `Breadcrumbs`) render directly; components that hit Supabase
  need their query layer stubbed.
- **Smoke/E2E** — not set up yet. When needed, add Playwright against
  `next dev` (see the SEO verification pattern: curl/inspect rendered HTML).

## Conventions

- Test files live next to the code they test: `foo.ts` → `foo.test.ts`
- Import `describe/it/expect` from `vitest` explicitly (no globals)
- Build fixtures with a local `makeListing()`-style helper and overrides —
  don't share mutable fixtures across files
- Test real behavior with meaningful assertions; never `expect(x).toBeDefined()`
- Never import secrets or `.env` values into tests; the JSON-LD tests rely on
  `NEXT_PUBLIC_SITE_URL` being **unset** so builders use the production fallback
