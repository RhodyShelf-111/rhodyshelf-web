import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SocialLinks } from "./social-links"
import { SOCIAL_PROFILES } from "@/lib/social"
import { organizationJsonLd } from "@/lib/seo/structured-data"

describe("SocialLinks", () => {
  it("renders a glyph link for every configured profile", () => {
    render(<SocialLinks />)

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(SOCIAL_PROFILES.length)
    // A profile added to SOCIAL_PROFILES without a registered glyph is a build
    // error (ICONS is keyed to the profile-name union) and degrades to a text
    // link at runtime. Asserting an svg per profile catches the third case:
    // a glyph that type-checks and renders but silently isn't there.
    for (const link of links) {
      expect(link.querySelector("svg")).not.toBeNull()
    }
  })

  it("names the link with visible text, not just a glyph", () => {
    render(<SocialLinks />)

    // The network name is rendered as real text so the link is readable on
    // touch, where a title tooltip never fires. That visible text is also the
    // accessible name — deliberately no aria-label, which could drift from it
    // and trip WCAG 2.5.3 (Label in Name).
    const instagram = screen.getByRole("link", { name: "Instagram" })
    expect(instagram).toHaveTextContent("Instagram")
    expect(instagram).not.toHaveAttribute("aria-label")
  })

  it("hides the glyph from assistive tech so the label is not doubled up", () => {
    render(<SocialLinks />)

    const svg = screen.getByRole("link").querySelector("svg")!
    expect(svg).toHaveAttribute("aria-hidden", "true")
    // focusable="false" keeps IE/legacy-Edge SVG out of the tab order; the
    // anchor is the only thing that should take focus.
    expect(svg).toHaveAttribute("focusable", "false")
  })

  it("opens the profile in a new tab without leaking the opener", () => {
    render(<SocialLinks />)

    const instagram = screen.getByRole("link")
    expect(instagram).toHaveAttribute("href", "https://www.instagram.com/rhodyshelf")
    expect(instagram).toHaveAttribute("target", "_blank")
    // Tokenize rather than substring-match: toContain("me") on the raw string
    // also passes for rel="home noopener", which proves nothing. rel="me" is
    // an optional one-way identity hint (microformats/IndieAuth) kept to
    // future-proof Mastodon-style verification — it is NOT what backs the
    // sameAs claim, which is self-declared and never cross-checked via rel.
    const rel = instagram.getAttribute("rel")!.split(/\s+/)
    expect(rel).toEqual(expect.arrayContaining(["me", "noopener", "noreferrer"]))
  })

  it("gives the link a 44px minimum tap target", () => {
    render(<SocialLinks />)

    // min-h-11 is 44px — the floor for a thumb-sized target. The row is only as
    // tall as 18px glyph + text on its own, so the min-height is what makes it
    // tappable, matching the FooterLink pattern beside it.
    expect(screen.getByRole("link")).toHaveClass("min-h-11")
  })

  it("keeps a visible keyboard focus ring", () => {
    render(<SocialLinks />)

    // globals.css sets an outline COLOR but no width/style, so without an
    // explicit ring a keyboard user gets only the UA default. Every other
    // interactive element in this codebase declares the same ring.
    expect(screen.getByRole("link")).toHaveClass(
      "focus-visible:ring-2",
      "focus-visible:ring-ring"
    )
  })

  it("merges caller classes onto the default stack layout", () => {
    const { rerender } = render(<SocialLinks />)

    // Default: no caller class, cn() still emits the stack layout.
    expect(screen.getByRole("list")).toHaveClass("flex", "flex-col")

    // The footer passes positioning classes; they must survive the merge.
    rerender(<SocialLinks className="mt-2" />)
    expect(screen.getByRole("list")).toHaveClass("flex", "flex-col", "mt-2")
  })

  it("links the same URLs the Organization sameAs claims", () => {
    render(<SocialLinks />)

    // The whole reason src/lib/social.ts exists: a rendered link that does not
    // match sameAs breaks the profile association Google needs for the brand
    // knowledge panel.
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"))

    // Pin to an independent literal FIRST. Comparing only the two derived
    // values is tautological — both read the same constant, so editing
    // INSTAGRAM_HANDLE moves them together and the cross-check still passes.
    expect(hrefs).toEqual(["https://www.instagram.com/rhodyshelf"])
    // Then the cross-check, which catches the other failure mode: one side
    // hardcoding a URL and decoupling from the shared constant.
    expect(hrefs).toEqual(organizationJsonLd().sameAs)
  })
})
