# Anti-AI-slop design checklist

Companion to [`DESIGN.md`](../../DESIGN.md), which holds the system itself. This
file holds the tells, each with a command so a future agent can re-run the audit
instead of eyeballing it — plus where we actually stand.

Source: YC Design Review interview with Steven Haney (founder, Paper), 2026-08.

The premise worth keeping: **design is the differentiator that survives the
commoditization of building.** Shipping whatever the model emitted makes you look
like the million other projects that did the same. That matters more than usual
here — a page that reads "nobody proofread this" makes a shopper wonder what else
we didn't check, and our entire product is a claim that our prices are right.

Run every command from `src/`.

---

## 1. Bold as the default ✅ FIXED — PR #65

The highest-leverage tell in the interview. Bold reads as an agent's insecurity:
it can't decide what matters, so it emphasizes all of it.

```bash
rg -o 'font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)' --no-filename -g '*.tsx' | sort | uniq -c | sort -rn
```

**Was:** 64 `font-semibold` + 31 `font-bold` = 95 heavy, against 35
`font-medium` + 9 `font-normal` = 44 light. On a product card the name, the
price *and* the Buy button were all semibold at the same size, so nothing won.

**Now:** 47 heavy against 84 light. The policy is four steps (400 body, 500 UI
emphasis, 600 hierarchy peaks, 700 page h1 and wordmark only) and it is
**enforced by `src/lib/typography-policy.test.ts`**, which fails on any heavy
weight stacked on `text-muted-foreground`, on `font-bold` outside an allowlist,
and if heavy ever outnumbers light again.

## 2. Too many type sizes ✅ FIXED — PR #66

```bash
rg -o 'text-(\[[^\]]+\]|meta|body|lead|subhead|title|display)\b' --no-filename -g '*.tsx' | sort | uniq -c | sort -rn
```

**Was:** fourteen sizes. Nine Tailwind steps plus `text-[11px]` ×12, `[12px]`
×14, `[13px]` ×17, `[15px]` ×3, `[17px]` ×3, and two more hiding in other units
(`[0.8rem]` ×2, `[11.5px]`). `text-[13px]` and `text-sm` sat one pixel apart with
139 uses between them — imperceptible to a reader, but every maintainer had to
reason about it.

**Now:** six named steps, and Tailwind's default `--text-*` namespace is
*cleared* rather than extended, so `text-sm` and `text-lg` no longer exist. The
same test fails on any off-scale size and on any arbitrary `text-[Npx]` except
the homepage h1's deliberate fluid clamp.

## 3. Emoji as an icon system ✅ FIXED — PR #64

Not named in the interview, but the same species: the placeholder a model reaches
for when a real asset is missing.

```bash
rg -n '[\x{1F300}-\x{1FAFF}]' -g '*.tsx' -g '*.ts'
```

**Was:** `getCategoryIcon()` returned emoji for all nine categories, rendering in
the homepage chips, category rails, filter bar, and the card fallback. Different
picture on every platform, unable to take the palette, and 🚬 for pre-rolls drew
a cigarette.

**Now:** `src/components/ui/category-icon.tsx` — lucide on a 24×24 / 1.5-stroke
grid, with pre-roll and vape hand-drawn because lucide has no honest equivalent.

## 4. Purple and glow gradients ✅ PASS

The signature of the era. Linear made it great, then the models encoded it.

```bash
rg -o 'bg-gradient-to-[a-z]+|from-(purple|violet|indigo|fuchsia)' --no-filename -g '*.tsx'
```

Zero color gradients, zero purple, and it should stay that way. A future gradient
needs a reason beyond "it looked flat."

## 5. Free light + dark mode ✅ PASS

The tell isn't dark mode, it's *unearned* dark mode — both themes shipped because
the model produces them for free, and the dark one is just inverted.

Dark-only, declared via `color-scheme: dark` with the white-flash reasoning in a
comment, and `--product-plate` is a single intentional light surface with a
measured justification behind it. A theme decision with an argument attached.

## 6. Uppercase letterspaced micro-kickers ✅ FIXED — PR #65

`text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` is
named in the interview as one of the four horsemen.

```bash
rg -n 'uppercase' -g '*.tsx'
```

Six survive, all functional section dividers in secondary chrome (filter panels,
footer columns, mobile nav, autocomplete groups) rather than decorative kickers
on a hero. Each used to stack all four traits at once; dropping `font-semibold`
kept the function and lost the tell.

## 7. Widgets for widgets' sake ✅ PASS

The test: does this element communicate something, or is it anchoring a corner?
If the numbers don't mean anything, delete them.

Every badge carries real state — `DealBadge` shows the actual discount percent,
`StockBadge` live availability, `DropBadge` recency. The `rounded-full` uses are
category chips and status dots. Nothing is decorative. **This is the one to
protect:** the pressure to add a fake "4.8★" or a stat row to fill space is
exactly this failure.

---

## The working method

Three ideas from the interview worth keeping independently of any tool:

**Generate variations, then curate.** Ask for 3–5 versions of a section and
combine the best parts. The value is escaping your own defaults, not the raw
output — none of the variants ships as-is.

**Design is deleting.** Overbuild, then pull back. Most of what separates a page
from a good one is subtraction. When a section feels wrong, try removing
something before adding something.

**Direct manipulation beats re-prompting for small fixes.** Re-prompting to nudge
one element is slow and lossy. For us that means: edit the JSX, don't regenerate
the component.

---

## The one-minute pre-merge pass

1. Count the font weights in the diff. Is every `font-semibold` beating something
   lighter next to it?
2. Any new `text-[Npx]`? It needs a reason a named step can't serve. The test
   will stop you.
3. Any new badge or pill — does it carry state a shopper would act on?
4. Does the page say what it is and what you get, above the fold?
5. Does it look like a person made it on purpose, or like the first thing a model
   emitted?

## Still open

Tracked in [`DESIGN.md`](../../DESIGN.md) under *Known open items*. The two with
the most left on the table:

- **`tabular-nums` is in exactly one file.** Not one platform in this category
  sets tabular figures — it is the clearest unclaimed advantage available to a
  site that stacks the same SKU across nine shops.
- **Space Grotesk is still the display face.** It is what every AI design tool
  reaches for as the safe alternative to Inter; using it is indistinguishable
  from not having chosen.

Audit performed 2026-08-08. Check git history before trusting any status above.
