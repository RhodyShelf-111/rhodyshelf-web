import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AgeGate } from "./age-gate"

// The gate is a 21+ compliance control, now mounted site-wide from the root
// layout — its behavior needs coverage on both sides of the cookie check, not
// just "is it in the DOM". (cleanup between tests is registered globally in
// vitest.setup.ts.)
const VERIFIED_COOKIE = "rhodyshelf_age_verified=true"

function clearAgeCookie() {
  document.cookie = "rhodyshelf_age_verified=; path=/; max-age=0; SameSite=Lax"
}

describe("AgeGate", () => {
  beforeEach(clearAgeCookie)
  afterEach(clearAgeCookie)

  it("stays hidden when the verification cookie is already set", () => {
    document.cookie = `${VERIFIED_COOKIE}; path=/`
    render(<AgeGate />)
    // On mount the effect reads the cookie and unmounts the gate (returns null),
    // so a verified visitor never sees the overlay — not even opacity-0 markup.
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(screen.queryByText("Are you 21 or older?")).toBeNull()
  })

  it("prompts for age affirmation when no cookie is present", () => {
    render(<AgeGate />)
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Are you 21 or older?" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /21\+/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument()
  })

  it("shows the reject panel and a leave link when the visitor answers No", () => {
    render(<AgeGate />)
    fireEvent.click(screen.getByRole("button", { name: "No" }))
    expect(screen.getByText(/Come back when you're 21/)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /Leave this site/ })
    ).toBeInTheDocument()
    // The prompt is gone — the reject panel replaces it.
    expect(screen.queryByRole("button", { name: /21\+/ })).toBeNull()
  })

  it("writes the verification cookie when the visitor confirms 21+", () => {
    render(<AgeGate />)
    expect(document.cookie).not.toContain(VERIFIED_COOKIE)
    fireEvent.click(screen.getByRole("button", { name: /21\+/ }))
    expect(document.cookie).toContain(VERIFIED_COOKIE)
  })
})
