// Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
// on vitest's expect for every test file.
import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Deterministic base URL: the SEO builders (structured-data.ts,
// breadcrumbs.tsx) fall back to the production origin when
// NEXT_PUBLIC_SITE_URL is unset. A dev shell or CI job exporting it (it
// lives in .env.local) would otherwise break every URL assertion. Setup
// runs before test-file module imports, so module-level fallbacks see this.
delete process.env.NEXT_PUBLIC_SITE_URL

// No vitest globals, so Testing Library's auto-cleanup never registers —
// do it once here so renders can't stack across tests in a file.
afterEach(cleanup)
