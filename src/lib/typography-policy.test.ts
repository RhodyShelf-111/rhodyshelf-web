import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

/**
 * The font-weight policy, enforced instead of documented.
 *
 * The codebase drifted to 95 heavy weights against 44 light ones — bold had
 * become the default rather than a hierarchy tool, which is the single loudest
 * "nobody chose this" signal a UI can send. A rule written down in a design doc
 * doesn't survive contact with the next component; a failing test does.
 *
 * The scale, in full:
 *   400 (unset)       body copy, and every muted-foreground string
 *   500 font-medium   the default UI emphasis: buttons, chips, badges, labels
 *   600 font-semibold real hierarchy peaks: headings, the price, active state
 *   700 font-bold     the page <h1> and the RhodyShelf wordmark. Nothing else.
 */

const SRC = path.resolve(__dirname, "..")

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return tsxFiles(full)
    if (!full.endsWith(".tsx") || full.endsWith(".test.tsx")) return []
    return [full]
  })
}

const FILES = tsxFiles(SRC).map((file) => ({
  rel: path.relative(SRC, file),
  lines: readFileSync(file, "utf8").split("\n"),
}))

describe("font-weight policy", () => {
  it("finds source files to check (guards against the walker silently matching nothing)", () => {
    expect(FILES.length).toBeGreaterThan(30)
  })

  /**
   * Colour has already de-emphasised the text; adding weight on top asks it to
   * be quiet and loud at once. This is a line-level heuristic, so a className
   * split across lines by cn() can slip past — it's a tripwire for the common
   * shape, not a proof.
   */
  it("never stacks a heavy weight on muted-foreground", () => {
    const offenders = FILES.flatMap(({ rel, lines }) =>
      lines
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(
          ({ line }) =>
            /font-(semibold|bold)/.test(line) &&
            line.includes("text-muted-foreground")
        )
        .map(({ n, line }) => `${rel}:${n}  ${line.trim().slice(0, 100)}`)
    )
    expect(offenders).toEqual([])
  })

  /**
   * font-bold is the page's single loudest voice. If it appears on a section
   * header, a price, a button, or a badge, it isn't loudest any more — it's
   * just the default again, which is exactly the drift this policy exists to
   * stop. Adding a file here should feel like a decision.
   */
  it("reserves font-bold for page h1s and the wordmark", () => {
    const ALLOWED = new Set([
      // Page <h1>
      "app/global-error.tsx",
      "app/(browse)/about/page.tsx",
      "app/(browse)/error.tsx",
      "app/(browse)/page.tsx",
      "app/(browse)/privacy/page.tsx",
      "app/(browse)/terms/page.tsx",
      "app/(browse)/product/[id]/not-found.tsx",
      "app/(browse)/product/[id]/page.tsx",
      "components/layout/not-found-content.tsx",
      "components/layout/page-heading.tsx",
      // The age gate is a full-screen interstitial: its own h1, plus the wordmark.
      "components/layout/age-gate.tsx",
      // The RhodyShelf wordmark.
      "components/layout/site-footer.tsx",
      "components/layout/site-header.tsx",
    ])
    const used = FILES.filter(({ lines }) =>
      lines.some((line) => /\bfont-bold\b/.test(line))
    ).map(({ rel }) => rel)
    expect(used.filter((rel) => !ALLOWED.has(rel))).toEqual([])
  })

  /**
   * The point of the sweep: light weights should outnumber heavy ones. If this
   * ever inverts again the UI has drifted back to bold-by-default, whatever the
   * individual diffs looked like.
   */
  it("keeps light weights in the majority", () => {
    const tally = { light: 0, heavy: 0 }
    for (const { lines } of FILES) {
      for (const line of lines) {
        tally.light += (line.match(/font-(normal|medium)/g) ?? []).length
        tally.heavy += (line.match(/font-(semibold|bold)/g) ?? []).length
      }
    }
    expect(tally.heavy).toBeLessThan(tally.light)
  })
})

/**
 * The type scale, enforced the same way.
 *
 * globals.css clears Tailwind's default --text-* namespace, so text-sm and
 * text-lg no longer generate anything. That failure is silent in the browser —
 * the element just inherits — which is worse than a build error. This catches
 * it in CI instead.
 *
 * Arbitrary values are the other half. Tailwind always honours text-[13px]
 * regardless of the theme, and five of those (11/12/13/15/17px) are how the
 * scale grew to fourteen steps in the first place.
 */
describe("type scale", () => {
  const SCALE = ["meta", "body", "lead", "subhead", "title", "display"]

  it("uses only the six named steps", () => {
    const offenders = FILES.flatMap(({ rel, lines }) =>
      lines.flatMap((line, i) => {
        const hits = line.match(/(?<![\w-])text-(?!\[)[a-z0-9]+(?![\w-])/g) ?? []
        return hits
          .map((hit) => hit.replace("text-", ""))
          // text-* is also the colour namespace (text-foreground, text-primary,
          // text-red-400…). Only flag the size words Tailwind used to ship.
          .filter((word) =>
            /^(xs|sm|base|lg|xl|[2-9]xl)$/.test(word) && !SCALE.includes(word)
          )
          .map((word) => `${rel}:${i + 1}  text-${word}`)
      })
    )
    expect(offenders).toEqual([])
  })

  it("has no arbitrary font sizes outside the one deliberate exception", () => {
    const offenders = FILES.flatMap(({ rel, lines }) =>
      lines
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => /(?<![\w-])text-\[[0-9]/.test(line))
        // The homepage h1 is fluid on purpose: text-[clamp(1.625rem,3.2vw,2.5rem)]
        // spans 26→40px so the one headline on the site scales with the viewport
        // instead of stepping. It is the display step, just not a fixed one.
        .filter(({ line }) => !line.includes("clamp("))
        .map(({ n, line }) => `${rel}:${n}  ${line.trim().slice(0, 80)}`)
    )
    expect(offenders).toEqual([])
  })

  /**
   * Measured in a real browser against the shipped font stack: with
   * proportional figures the ten digits spanned 28.75px across a ten-character
   * run, with "1" fully 29% narrower than "4". "1" is the most common leading
   * digit in a price, so a column of prices was measurably crooked. Tabular
   * brings the spread to exactly 0.
   *
   * This lives at :root rather than on call sites because as an opt-in it had
   * reached one file out of roughly forty that render a number, and forgetting
   * it fails silently.
   */
  it("declares tabular figures once, globally", () => {
    const css = readFileSync(path.join(SRC, "app/globals.css"), "utf8")
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  it("keeps the 16px floor on form controls so iOS does not zoom on focus", () => {
    // Safari zooms the viewport when a focused input is under 16px. Every input
    // must therefore rest at text-lead and only drop to text-body from md up,
    // where there is no touch keyboard to trigger it. The two classes need not
    // be adjacent — input.tsx carries a long className with them far apart.
    for (const file of [
      "components/ui/input.tsx",
      "components/layout/search-bar.tsx",
      "components/search/hero-search.tsx",
    ]) {
      const found = FILES.find(({ rel }) => rel === file)
      expect(found, `${file} not found`).toBeDefined()
      const source = found!.lines.join("\n")
      expect(source, `${file} lost its 16px resting size`).toMatch(
        /(?<![\w-:])text-lead(?![\w-])/
      )
      expect(source, `${file} lost its md:text-body step-down`).toContain(
        "md:text-body"
      )
    }
  })
})
