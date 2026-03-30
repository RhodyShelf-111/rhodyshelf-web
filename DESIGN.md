# RhodyShelf Design System

## Typography

**Font:** DM Sans (Google Fonts) for all text.

| Role | Size | Weight | Class |
|------|------|--------|-------|
| Page title | 24-30px | Bold (700) | `text-2xl font-bold` / `text-3xl font-bold` |
| Section header | 17px | Bold (700) | `text-[17px] font-bold` |
| Card product name | 14px | Semibold (600) | `text-sm font-semibold` |
| Card metadata | 12-13px | Normal (400) | `text-[12px]` / `text-[13px]` |
| Body text | 14px | Normal (400) | `text-sm` |
| Small label | 12px | Normal (400) | `text-[12px]` |

## Colors (Dark Theme)

CSS custom properties defined in `globals.css`. The app ships dark-only.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0f0a` | Page background |
| `--foreground` | `#f9fafb` | Primary text |
| `--card` | `#141a14` | Card surfaces |
| `--primary` | `#22c55e` | Links, accents, CTAs |
| `--muted` | `#1a221a` | Hover states, secondary surfaces |
| `--muted-foreground` | `#9ca3af` | Secondary text |
| `--border` | `#2d3d2d` | Borders, dividers |
| `--rs-sale` | `#ef4444` | Sale badges |
| `--rs-new-drop` | `#3b82f6` | New drop badges |

## Product Card

- Width: `w-36` (144px) in search brand groups, `w-40` (160px) on homepage
- Layout: flex column, equal height via `h-full` + `mt-auto` on dispensary row
- Image: square aspect ratio with category emoji fallback
- Content stack: category/strain, product name (2-line clamp), brand, price, THC%, dispensary
- Border radius: `rounded-xl` (12px)
- Hover: shadow + slight lift (`-translate-y-0.5`)

## Spacing

Tailwind defaults. Key patterns:
- Page container: `max-w-7xl mx-auto px-4`
- Section padding: `py-6` to `py-8`
- Card content: `px-3 py-2.5`
- Card gap in scroll rows: `gap-3`

## Component Library

Built on shadcn/ui with Tailwind CSS 4. Key components:
- Sheet (mobile filter panel)
- Card
- Button
- Input

## Accessibility

- Touch targets: minimum 44px (heart/upvote button uses `p-2.5`)
- Color contrast: light text on dark backgrounds meets WCAG AA
- Keyboard navigation: search autocomplete supports arrow keys, enter, escape
