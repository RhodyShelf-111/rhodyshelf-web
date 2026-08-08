# Design System — RhodyShelf

The source of truth for visual decisions. Read this before any UI change.

Where this document and the code disagree, **the code wins and this document is
wrong** — fix it here. That isn't humility, it's the reason design systems rot:
two copies drift, and the one nobody can run is the one that lies.

---

## Product Context

- **What this is:** a cannabis price-comparison and menu-search engine for Rhode
  Island. Live inventory from 9 dispensaries in one searchable catalog: search
  and filter by brand, category, strain and price, compare the same SKU across
  shops, see price-per-gram and price-per-10mg-dose, browse deals, new drops and
  a best-value ranking.
- **Who it's for:** an RI shopper deciding where to buy, who already knows
  roughly what they want and is asking *where is it cheapest, and can I get
  there.*
- **What it is not:** a dispensary, a storefront, or a checkout. The money action
  is a deep link out to the shop's own menu. There is no cart.
- **Its actual category:** comparison shopping. It happens to be about cannabis,
  but functionally it is Kayak, PCPartPicker, camelcamelcamel. That distinction
  drives most of what follows — for years the site has been dressed as a
  dispensary menu while doing a comparison engine's job.

**The memorable thing:** *the numbers line up.* A visitor should leave
remembering a page where the money column is straight, where a price they can't
compute themselves (per gram, per 10mg of THC) is sitting right there, and where
the page tells them when it last checked. Every decision below serves that.

**What we are actually selling is trust.** The claim is "our prices are right."
A page that reads sloppy or unproofread undercuts that claim more than it would
on a site whose product is anything else.

---

## Aesthetic Direction

- **Direction:** industrial / utilitarian. A near-black ruled ledger where the
  packshots are the only bright shapes and the only colored thing is the number
  that won.
- **Decoration level:** minimal. Type, space and rule carry the hierarchy. There
  is no texture, no gradient, no glow, no illustration.
- **Mood:** an instrument, not a storefront. Dense the way a spec sheet is
  dense. Quiet enough that a price is the loudest thing on screen.
- **Peers worth studying:** Kayak, PCPartPicker, camelcamelcamel, Backmarket.
  **Not** Weedmaps, Leafly, Dutchie, Jane — see below.

### What the cannabis category actually looks like

Measured in-browser, 2026-08. Four of the five major platforms (Weedmaps,
Leafly, Dutchie/Tymber, Jane) are white-background, neutral-gray, rounded-card
e-commerce generic — visually interchangeable with a mid-tier Shopify theme. The
accent hue is the only thing separating them: Leafly teal `#017c6b`, Jane
electric purple `#5e1ff0`, Tymber green `#0d865e`.

**Table stakes we must honour**, because a shopper reads their absence as us
knowing less than the menus we aggregate:

- Potency on the card, never buried.
- Strain type as a small chip.
- Product name above brand, both on the tile.
- Package size stated next to the price.
- Discounts shown quietly — struck-through compare-at price plus a small
  percentage. Loud filled discount pills are *not* the category norm.
- Cards borderless or hairline, and shadowless. Nobody in this category puts a
  drop shadow on a catalog tile.

**Where the whole category is identical, and we go elsewhere:** every platform
sets the product *name* as the typographic hero and treats price as metadata.
For a comparison layer that inversion is simply wrong. The name is the lookup
key; the price and the per-unit rate are the answer.

---

## Typography

### Current state

`--font-sans` is the system stack and `--font-heading` is **Space Grotesk**.
Both are liabilities: a system-ui body face is the "we gave up on typography"
signal, and Space Grotesk is what every AI design tool reaches for as the safe
alternative to Inter. Using it is indistinguishable from not having chosen.

### The recommendation: Archivo

Replace both with **Archivo** (Omnibus-Type, Google Fonts, variable, `wght`
100–900) as the text face — headings, body, UI and numerals. A grotesque drawn
for newspaper highlight *and* small text, which is this product in a typeface.

Its figure toolkit was read straight out of the shipped variable TTF's GSUB
table: `tnum`, `pnum`, `lnum`, `onum`, `frac`, `numr`, `dnom`, `zero`, `case`,
`ordn`. That is complete rather than a checkbox — `frac`/`numr`/`dnom` mean
"1/8 oz" and "1/2 oz" can set as **real fractions** in a catalog where half the
SKUs are priced by fractional ounce, and `zero` gives a slashed zero.

Load it without the `wdth` axis; nothing here varies width and requesting it
roughly doubles the file. Omit `weight` so `next/font` resolves the variable
face instead of pinning static instances.

**Why not Familjen Grotesk**, which was the earlier recommendation here: it is
tabular *by construction* — measured with fontTools, all ten digits and the
dollar sign are exactly 680/1200 units at every weight, against Archivo's
521–574, Geist's 384–663, Instrument Sans' 391–666 and Figtree's 413–641. That
was a real advantage while `tabular-nums` was an opt-in that had reached one
file, because a forgotten opt-in fails silently. **Declaring it once on `body`
removed that risk**, and with the silent-failure argument gone, Archivo's
fractions and its `opsz`-adjacent range are worth more than Familjen's
belt-and-braces metrics. If the global declaration is ever reverted, Familjen
becomes the correct choice again.

**Optional display face:** Newsreader (variable, real `opsz` axis) for the
wordmark, the page `h1`, and empty-state headlines — two or three elements per
page, never setting a number. `preload: false`; it must not compete with the LCP
packshot. This is the one genuinely optional piece: dropping it and setting
those elements in Archivo 600 loses a voice and nothing structural.

Explicitly rejected: a monospace numeral face (reads terminal, and Archivo
already carries `tnum`), and Fraunces with `WONK` on — a characterful wonky
serif over a workhorse grotesque is itself a 2026-tier convergence, and "wonk"
is a strange thing to ask of a ledger.

**Ruled out.** Beyond the usual convergent set (Inter, Roboto, Helvetica, Open
Sans, Lato, Montserrat, Poppins, Space Grotesk), the census of this category also
rules out anything already in it: Circular, Matter, Manrope, Proxima Nova, Public
Sans, Source Sans Pro, Euclid Circular B, Jost. Using one would read as another
menu skin.

### The scale — six steps

Defined in `src/app/globals.css`. Tailwind's default `--text-*` namespace is
**cleared**, not extended, so `text-sm` and `text-lg` do not exist.

| token | size | line-height | used for |
|---|---|---|---|
| `text-meta` | 12px | 16 | badges, ordinals, timestamps, card metadata, section labels |
| `text-body` | 14px | 20 | the workhorse: names, prices, buttons, nav, copy |
| `text-lead` | 16px | 24 | form controls, body copy wanting more room |
| `text-subhead` | 18px | 26 | section and rail headings, stat values, empty states |
| `text-title` | 22px | 28 | sheet and dialog titles, the wordmark |
| `text-display` | 30px | 36 | the page `h1`, and nothing else |

This replaced fourteen sizes — nine Tailwind steps plus `text-[11px]`, `[12px]`,
`[13px]`, `[15px]`, `[17px]`, and two hiding in other units (`[0.8rem]`,
`[11.5px]`). `text-[13px]` and `text-sm` were one pixel apart with 139 uses
between them.

`text-lead` is a **floor, not a preference**: iOS Safari zooms the viewport when
a focused input is under 16px, so every input is `text-lead md:text-body`.

The one permitted arbitrary size is the homepage h1's
`text-[clamp(1.625rem,3.2vw,2.5rem)]` — the display step, fluid.

### Weight — four steps

| weight | class | used for |
|---|---|---|
| 400 | *(unset)* | body copy, and every `text-muted-foreground` string |
| 500 | `font-medium` | the default UI emphasis: buttons, chips, badges, labels |
| 600 | `font-semibold` | real hierarchy peaks: headings, the price, active state |
| 700 | `font-bold` | the page `h1` and the wordmark. Nothing else. |

Rules that survive code review:

1. **Never** stack a heavy weight on `text-muted-foreground`. Colour has already
   de-emphasised it; the two instructions contradict.
2. `font-semibold` only when something adjacent is lighter.
3. **One weighted element per card.** The price keeps it; the name yields.
4. Badges and pills never exceed `font-medium` — they already have a fill and a
   border doing the work.

Both the scale and the weight policy are enforced by
`src/lib/typography-policy.test.ts`, not by this document. A rule written down
only in prose does not survive contact with the next component.

### Numerals

`tabular-nums` on every price, per-gram rate, per-dose rate, THC percent and
delta. **Not one platform in this category sets tabular figures** — verified
across Weedmaps, Leafly, Dutchie, Tymber, Jane and Dispense. It is defensible
for them, since they show one price per card; it is indefensible for us, who
stack the same SKU across nine shops and rank by price-per-gram.

This is the single clearest unclaimed advantage in the category and it is
currently used in exactly one file.

---

## Color

Dark-only, deliberately. `color-scheme: dark` is declared, there is no light
theme, and there should not be one — a free light+dark pair is an AI tell, and a
dark shell differentiates against four of the five platform shells. One RI
competitor (Slater Center, on Dispense) already runs dark in-market, so this
needs no hedging.

| token | value | role |
|---|---|---|
| `--background` | `#0a0f0a` | page |
| `--card` | `#141a14` | tiles, panels |
| `--popover` / `--secondary` / `--muted` | `#1a221a` | raised surfaces |
| `--foreground` | `#f9fafb` | primary text |
| `--muted-foreground` | `#9ca3af` | metadata (6.96:1 on card, 7.62:1 on background) |
| `--border` / `--input` | `#2d3d2d` | rules and field edges |
| `--primary` / `--ring` | `oklch(0.792 0.209 151.711)` | the brand green |
| `--primary-foreground` | `#052e16` | text on green |
| `--accent` / `--accent-foreground` | `#14532d` / `#bbf7d0` | active states |
| `--destructive` | `#ef4444` | errors only |
| `--product-plate` | `#ffffff` | the packshot tile |
| `--product-plate-foreground` | `#8d978d` | glyph on that tile (3.02:1) |

**The white plate is an invention worth protecting.** Four of five platforms get
a white packshot backdrop for free by being light-themed. We had to build one
deliberately against a dark shell, which means no competitor has solved
dark-mode packshot edge cases. Treat it as a signature, not a compromise. The
value is measured: 62% of catalog packshots are shot on white and another 8% are
cutouts drawn for white.

### The brand green is a framework default

`--primary: oklch(0.792 0.209 151.711)` is **byte-identical to Tailwind's
`--color-green-400`**, which ships as `oklch(79.2% 0.209 151.711)` on line 74 of
`node_modules/tailwindcss/theme.css` — the same colour, written with a
percentage lightness. (`#05df72`.)

The brand hue of a cannabis product is an untouched framework default. That is
the most literal possible version of "nobody chose this," sitting on the one
colour the whole identity rests on. Nothing else in this document matters more
per byte changed.

Proposed: `oklch(0.80 0.165 145)` = `#72d978`. Chroma drops 21% and the hue
rotates away from mint toward the plant — neon spring-green becomes leaf.
Contrast is preserved and marginally better: **10.97:1** on `--background` (from
10.90) and **10.03:1** on `--card` (from 9.96), verified by converting both to
sRGB. `--ring` follows it. `--primary-foreground` moves `#052e16` → `#0a1f0c`, so
a filled control stops reading as two greens stacked.

Not shipped — the brand colour is your call, not a refactor.

### Green means cheaper

Green currently does triple duty — brand mark, active nav state, and cheapest
price — in *two* different hues (`--primary` in oklch, and Tailwind `emerald-*`
in the badges). That spends the signal. The workable split is two clauses rather
than one absolutist rule, since `bg-primary` appears 42 times and most of those
are selected-filter state that genuinely needs a fill:

- **Green as text = best price.**
- **Green as fill = selected / you are here.**

### Markdowns are not red

Retail convention codes discounts red; finance convention codes savings green.
We are closer to Kayak than to a store. But green is already spoken for, so
markdowns need a third colour — because today `deal-badge.tsx:19` renders a
*saving* in `bg-red-950/90 text-red-300` while `dispensary/page.tsx:119` renders
a *closed store* in `text-red-400`. **A win and a failure share a hue family**,
and red on a price says "problem" in the exact spot the site is claiming a win.

Proposed `--markdown: oklch(0.80 0.125 74)` = `#eeb15b`, measured at 10.18:1 on
`--background`. Amber, as text and never as a fill. Dutchie codes discounts red
and Tymber codes them green, so there is no convention to violate here. Red stays
for genuine errors only.

---

## Spacing

- **Base unit:** 4px.
- **Scale:** 4, 8, 12, 16, 24, 32. Component internals mostly 8 and 12; 24 is
  section separation, not card padding.
- **Density:** compact. This is a catalog, not a marketing page.

## Layout

- **Approach:** grid-disciplined. No asymmetry, no grid-breaking.
- **Grid:** 2 columns mobile → 3 sm → 4 md → 5 xl → 6 2xl.
- **Card radius:** 12px. No rounder.
- **Border radius scale:** derived from `--radius: 0.625rem` in `globals.css`.
- Mobile reduces columns; it never shrinks type. The category proves this works —
  Tymber renders the same 14px name and 20px price at 375px as at 1440px.
- We can afford a shorter card and more per screen than the category does, because
  our money action is one outbound link rather than a cart with quantity and
  variant pickers. Density is a legitimate differentiator for a comparison layer.

## Motion

- **Approach:** minimal-functional. Only transitions that aid comprehension.
- **Duration:** micro 50–100ms, short 150–250ms.
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`.
- Hover lift should be nearly imperceptible; the stronger signal is a border or
  price emphasis, not float.
- `prefers-reduced-motion: reduce` neutralizes all of it site-wide. Already
  implemented in `globals.css`.

---

## Iconography

Lucide, 24×24, 1.5 stroke, round caps and joins, `currentColor`. Category glyphs
live in `src/components/ui/category-icon.tsx`; two (pre-roll, vape) are
hand-drawn on the same grid because lucide has no honest equivalent.

**No emoji, ever.** They render differently on every platform, can't take the
palette, and the pre-roll one drew a cigarette.

One honest caveat: the category research found that Tymber and Leafly ship
category navigation as **pure text with zero iconography**, and argued the right
answer was to delete the icons rather than redraw them. We kept them because
they do a second job the text-only platforms don't need — standing in for a dead
third-party CDN image on the page's focal point, roughly 10% of listings. If the
chips ever feel like decoration, deleting them there while keeping the fallback
glyph is a defensible trim.

---

## Anti-slop rules

The full checklist with greppable commands lives in
[`docs/design/ai-slop-checklist.md`](docs/design/ai-slop-checklist.md). The short
version, before merging any new surface:

1. Count the font weights. Is every `font-semibold` beating something lighter?
2. Any new `text-[Npx]` needs a reason a named step can't serve. (The test will
   stop you.)
3. Does every new badge carry state a shopper would act on? If it's decorative,
   cut it.
4. No purple, no gradients, no glows, no uppercase letterspaced kickers, no
   three-column icon grids, no centered-everything.
5. Does the page say what it is and what you get, above the fold?
6. Does it look like a person made it on purpose?

**Design is deleting.** Most of what separates this from good is subtraction.
When a section feels wrong, try removing something before adding something.

---

## Known open items

Real, measured, not yet fixed:

- **`--border` is 1.53:1 on `--card`** and 1.67:1 on `--background`, below the
  3:1 floor for control boundaries. `input.tsx` already worked out the right
  answer for itself (`border-muted-foreground/70`, with the measurement in a
  comment); promoting that from one component to the token is the fix.
- **The brand green is Tailwind `green-400`, unmodified.** See Color above. The
  highest signal-per-byte change available.
- **Space Grotesk is still the display face.** See Typography above.
- **A saving and a failure share a hue.** Discount badges and closed-store
  warnings are both red. See Markdowns above.
- **Green is spent seven ways** — Buy fill, active upvote, focus ring, cheapest
  price, "Lowest", "% below typical", scrollbar thumb — in two hue systems. A
  colour that means seven things means none.
- **Mobile filter sheet** inherits the desktop sidebar's smaller controls, an
  invisible switch track (`bg-muted` on `bg-popover` is 1.00:1), and none of its
  focus states. The mobile surface is the primary one and should be designed
  first.
- **Price is not yet the typographic hero.** Weight now separates it from the
  product name, but they remain the same size. Leafly sets price at 24px against
  a 16px name.

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-08 | Category icons: emoji → lucide + 2 hand-drawn glyphs (#64) | Emoji render per-platform, ignore the palette, and 🚬 drew a cigarette |
| 2026-08-08 | Weight policy: 400/500/600/700, enforced by test (#65) | 95 heavy vs 44 light meant nothing won; now 47 vs 84 |
| 2026-08-08 | Type scale: 14 sizes → 6 named steps, Tailwind defaults cleared (#66) | `text-[13px]` and `text-sm` were 1px apart with 139 uses |
| 2026-08-08 | Stay dark-only | Deliberate, differentiating, with live local precedent |
| 2026-08-08 | Keep the white product plate | 70% of packshots are shot on or drawn for white; no competitor has solved this |
| 2026-08-08 | Green means price advantage, not "sale" | We are a comparison layer, not a store; finance convention beats retail convention here |
| 2026-08-08 | Tabular figures declared once on `body` (#68) | Digits spanned 28.75px proportionally; `1` was 29% narrower than `4` |
| 2026-08-08 | Typeface recommendation moved Familjen Grotesk → Archivo | #68 removed the silent-failure risk that made tabular-by-construction decisive; Archivo's `frac`/`numr`/`dnom` set real fractions for eighths and quarters |
| 2026-08-08 | Initial design system created | `/design-consultation`, grounded in a live census of the cannabis category and comparison-shopping tools |
