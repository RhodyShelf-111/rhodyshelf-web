import { createElement, type ComponentType } from "react"
import {
  Cannabis,
  Cookie,
  Droplets,
  Hand,
  Package,
  Pipette,
  Sprout,
  type LucideProps,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Category iconography.
 *
 * These were emoji (🌿 💧 🍪 🚬 …) until they weren't. Emoji render as a
 * different picture on every platform, can't take the palette, and 🚬 for
 * pre-rolls draws a cigarette — which is both the wrong product and the wrong
 * connotation for a regulated cannabis catalog.
 *
 * Everything below is drawn on lucide's grid — 24x24 viewBox, 1.5 stroke,
 * round caps and joins, currentColor — because the product card already sits
 * MapPin, Clock, ChevronUp and ExternalLink next to these. Mixing a filled or
 * differently-weighted set next to those reads as two icon systems in one card.
 *
 * Two glyphs are hand-drawn because lucide has no honest equivalent:
 * pre-roll (lucide's Cigarette is the wrong product) and vape (lucide has no
 * cartridge at all). They follow the same construction so the set stays one
 * voice.
 */

const GLYPH_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

/**
 * A cone pre-roll: tapered body running lower-left to upper-right, wide at the
 * lit end, crutch marked at the narrow end, one curl of smoke off the tip.
 * Rendered at 16/20/36/60px before shipping — the body is thickened past what
 * looks right at 60px so the shape survives the 16px chip.
 */
function PreRoll(props: LucideProps) {
  return (
    <svg {...GLYPH_PROPS} {...props}>
      <path d="M2.4 20.2 L4.8 22.6 L17.3 12.4 L14 9.1 Z" />
      <path d="M4.6 18.4 L7 20.8" />
      <path d="M16.2 8.5 A3.2 3.2 0 0 1 19.6 5.1" />
    </svg>
  )
}

/**
 * A 510 cartridge: mouthpiece, tank, and the fill line across it. The tank is
 * 8 units wide, not 6 — at 6 it used a quarter of its box and read as a
 * battery sitting next to glyphs that fill theirs.
 */
function Vape(props: LucideProps) {
  return (
    <svg {...GLYPH_PROPS} {...props}>
      <path d="M9.75 2.5 h4.5 v2.5 h-4.5 z" />
      <path d="M8 5 h8 v13.5 a2.5 2.5 0 0 1 -2.5 2.5 h-3 a2.5 2.5 0 0 1 -2.5 -2.5 z" />
      <path d="M8 9.5 h8" />
    </svg>
  )
}

/** Wide enough to hold both our plain function glyphs and lucide's forwardRefs. */
type GlyphComponent = ComponentType<LucideProps>

/**
 * Null-prototype so a category value coming off the database can't reach
 * Object.prototype — a `__proto__` or `constructor` key on a plain object
 * literal returns something React will refuse to render, blanking the grid.
 */
const ICONS: Record<string, GlyphComponent> = Object.assign(
  Object.create(null),
  {
    flower: Cannabis,
    concentrate: Droplets,
    "pre-roll": PreRoll,
    vape: Vape,
    edible: Cookie,
    tincture: Pipette,
    topical: Hand,
    accessory: Package,
    other: Sprout,
    // Plural aliases, for display names and filter UI that carry the label
    // rather than the DB key.
    concentrates: Droplets,
    "pre-rolls": PreRoll,
    vapes: Vape,
    edibles: Cookie,
    tinctures: Pipette,
    topicals: Hand,
    accessories: Package,
  } satisfies Record<string, GlyphComponent>
)

/** Everything uncategorized, plus categories we haven't drawn yet. */
const FALLBACK: GlyphComponent = Sprout

export function getCategoryGlyph(category: string | null | undefined): GlyphComponent {
  if (!category) return FALLBACK
  return ICONS[category.toLowerCase()] ?? FALLBACK
}

interface CategoryIconProps {
  category: string | null | undefined
  className?: string
}

/**
 * Decorative by default: every call site pairs this with the category label in
 * text, so announcing it again is noise for a screen reader.
 */
export function CategoryIcon({ category, className }: CategoryIconProps) {
  // createElement, not `const Glyph = …; <Glyph />`. Every glyph is a stable
  // module-level reference out of ICONS, so nothing is really being created per
  // render — but react-hooks/static-components can't see through the lookup and
  // reads a capitalized local rendered as JSX as a component defined during
  // render. This says the same thing in a form the rule can verify.
  return createElement(getCategoryGlyph(category), {
    "aria-hidden": true,
    focusable: "false",
    className: cn("size-4 shrink-0", className),
  })
}
