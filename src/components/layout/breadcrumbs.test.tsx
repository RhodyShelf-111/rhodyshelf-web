import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Breadcrumbs } from "./breadcrumbs"

const ITEMS = [
  { name: "Dispensaries", href: "/dispensary" },
  { name: "Sweetspot Exeter", href: "/dispensary/sweetspot-exeter" },
]

describe("Breadcrumbs", () => {
  it("prepends Home and links every crumb except the current page", () => {
    render(<Breadcrumbs items={ITEMS} />)
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(screen.getByRole("link", { name: "Dispensaries" })).toHaveAttribute(
      "href",
      "/dispensary"
    )
    // Last crumb is the current page: plain text with aria-current, not a link.
    const current = screen.getByText("Sweetspot Exeter")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current.tagName).not.toBe("A")
  })

  it("emits BreadcrumbList JSON-LD with absolute item URLs", () => {
    const { container } = render(<Breadcrumbs items={ITEMS} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script!.textContent ?? "{}")
    expect(data["@type"]).toBe("BreadcrumbList")
    expect(data.itemListElement).toHaveLength(3)
    expect(data.itemListElement[0]).toMatchObject({
      position: 1,
      name: "Home",
      item: "https://rhodyshelf.com/",
    })
    expect(data.itemListElement[2].item).toBe(
      "https://rhodyshelf.com/dispensary/sweetspot-exeter"
    )
  })
})
