# Full design dive — report

A multi-page designer's-eye review of every RhodyShelf page and modal. Each page
was captured (desktop 1440px + mobile 390px, plus interaction states: age gate,
mobile nav sheet, mobile search overlay, search autocomplete, sort/filter
dropdowns, upvoted card, populated/empty Saved) and reviewed by a fan-out of
per-area agents, then **every finding was adversarially re-checked against the
source code** before being accepted.

**Result:** 62 raw findings → **49 confirmed real** (11 dismissed as subjective
taste, 2 as already-handled/intentional). Of the 49: **7 high, 16 medium, 26 low.**

Shipped across two PRs; the genuinely large or subjective items are listed as
follow-ups rather than rushed.

- **PR (1/2) — navigation, chrome & overlays** — see `claude/design-dive-chrome`
- **PR (2/2) — sort, filters & card polish** — see `claude/design-dive-polish`

---

## Fixed — navigation, chrome & overlays (PR 1/2)

| Sev | Finding | Fix |
|-----|---------|-----|
| HIGH | `/privacy` + `/terms` had no header/footer/nav (outside the `(browse)` group) | Moved into `(browse)/`; they now inherit chrome + age gate. URLs unchanged. |
| HIGH | 404 page had no chrome, one exit | Added header/footer, a "Go home" exit, lucide icon (was a 🌿 emoji) |
| HIGH | Mobile sheet backdrop nearly invisible (`bg-black/10`) | Raised to `bg-black/55` |
| MED | Mobile search overlay: fragile blur-dismiss, no scrim | Dropped blur-close, added a portaled scrim, 44px Cancel target |
| LOW | Mobile nav sheet had no accessible name | Added `sr-only` SheetTitle |
| LOW | Age-gate rings showed on mouse click | `focus:` → `focus-visible:` |
| LOW | Footer "Browse all" vs header "Search" for `/search` | Aligned to "Search" |
| LOW | Dead `prose prose-gray` classes on legal pages | Removed (no typography plugin) |

## Fixed — sort, filters & card polish (PR 2/2)

| Sev | Finding | Fix |
|-----|---------|-----|
| HIGH | Sort trigger showed raw enum (`newest`) not the label | Label formatter on `SelectValue` (fixes all menu pages) |
| HIGH | `/deals` sort read "Newest" while list was discount-ordered | Added "Biggest discount" sort + made it the deals default |
| HIGH | Brand filter shown on single-brand pages (dead control) | Hidden when ≤1 brand |
| HIGH | Product mobile CTA wrapped/squished | Stacks full-width on mobile, row at `sm+` |
| MED | Dispensary filter shown on single-dispensary pages | Hidden when ≤1 dispensary |
| MED | Redundant per-card dispensary chip on dispensary-detail (truncated "Ris…") | `showDispensary={false}` there |
| MED | Mobile result count wrapped to 3 lines (fixed 180px sort) | Responsive sort width, one-line count, aligned heights |
| MED | Product hero image had no broken-image fallback | Added (client island, matches ProductCard) |
| MED | Dispensary-list cards not height-aligned | Equal-height cards, stats pinned to bottom |
| MED | Two divergent sort systems | Canonical `lib/sort.ts` for ProductSort (search server-sort left as-is) |
| LOW | Filter heading levels `h1→h4` | `h4` → `h2` |
| LOW | Saved grid 5-wide looks sparse | Capped at 4 columns |
| LOW | "This Week" badge inaccurate at 8–14 days | → "New" |
| LOW | Mobile-only 🏷️ on On Sale chip | Removed |
| LOW | "Back to all products" → /search | Relabeled "Browse all products" |
| LOW | Coming-soon dispensary card had no disabled semantics | `aria-disabled` + `cursor-default` |

## Deferred — follow-ups (larger or subjective; not in these PRs)

- **Mobile filter UX unification** (MED) — dispensary pages use a left drawer of radios; search uses a bottom sheet of chips. Consolidating onto one shared filter component is a real refactor.
- **Autocomplete product/strain suggestions** (MED) — the hero autocomplete only suggests brands though the placeholder promises products + strains. Needs a new product/strain suggest query.
- **Search server-sort unification** (MED) — search sorts server-side with a different option set; fully merging with the client grid vocabulary needs server support for the extra orders.
- **Narrow-card dispensary-name truncation** (MED/LOW) — on the densest mobile/saved cards the dispensary name still truncates; a card-footer relayout (name on its own line) would fix it globally.
- **Native filter radios render as white discs** (LOW) — restyle to theme-consistent controls.
- **Card action 44px touch targets** (LOW) — bumping Buy/upvote would enlarge the compact cards; a deliberate density tradeoff.
- **Breadcrumbs/back links** on brand + dispensary-detail (LOW).
- **Duplicate count copy** on dispensary-detail header vs grid (LOW).
- **Dispensary-list city consistency** (LOW, data) — only the no-menu card surfaces a city line.
- **Home empty-state** if all sections come back empty (LOW, defensive).
- **Saved "upvote" vs "save" vocabulary** (LOW) — a product naming decision.
- **Search brand-row scroll affordance** / **empty-state chip de-dup** (LOW).
- Legal "Last updated" dates differ (kept — they're legitimately different revisions).
