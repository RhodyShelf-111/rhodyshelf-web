import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import AboutPage, { metadata } from "./page"

describe("AboutPage", () => {
  it("links the Instagram profile from the contact section", () => {
    render(<AboutPage />)

    const instagram = screen.getByRole("link", { name: /Instagram @rhodyshelf/i })
    expect(instagram).toHaveAttribute(
      "href",
      "https://www.instagram.com/rhodyshelf"
    )
    expect(instagram).toHaveAttribute("target", "_blank")
    // Tokenized: a substring check for "me" also matches rel="home".
    const rel = instagram.getAttribute("rel")!.split(/\s+/)
    expect(rel).toEqual(expect.arrayContaining(["me", "noopener", "noreferrer"]))
  })

  it("keeps the email contact alongside the social link", () => {
    render(<AboutPage />)

    // The Instagram sentence was appended to the existing mailto paragraph —
    // guard that the edit did not swallow the primary contact route.
    expect(
      screen.getByRole("link", { name: "hello@rhodyshelf.com" })
    ).toHaveAttribute("href", "mailto:hello@rhodyshelf.com")
    expect(
      screen.getByRole("link", { name: /Browse Rhode Island dispensaries/i })
    ).toHaveAttribute("href", "/dispensary")
  })

  it("declares a self-canonical URL and a full openGraph block", () => {
    expect(metadata.alternates?.canonical).toBe("/about")
    // pageOpenGraph re-adds siteName/locale, which a per-page openGraph object
    // would otherwise drop (Next merges metadata shallowly).
    expect(metadata.openGraph).toMatchObject({
      url: "/about",
      siteName: "RhodyShelf",
      locale: "en_US",
    })
  })
})
