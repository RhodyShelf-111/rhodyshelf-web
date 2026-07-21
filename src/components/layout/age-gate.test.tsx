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

  // Regression: the reveal used to run inside requestAnimationFrame, which
  // browsers pause/throttle in hidden/background tabs — so a gate loaded in a
  // background tab stayed opacity-0/pointer-events-none (fail-open) until the
  // tab was foregrounded. The reveal must now be driven by a plain post-mount
  // setState, independent of rAF. jsdom's rAF timing differs from a real hidden
  // tab, so the strongest signal is that the effect flips the overlay to its
  // visible ("show") classes synchronously on mount, with no rAF tick.
  it("reveals the gate on mount without waiting for requestAnimationFrame", () => {
    render(<AgeGate />)
    const dialog = screen.getByRole("alertdialog")
    // "show" state → opacity-100 and clickable; not the hidden pending markup.
    expect(dialog).toHaveClass("opacity-100")
    expect(dialog).not.toHaveClass("opacity-0")
    expect(dialog).not.toHaveClass("pointer-events-none")
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

  // document.cookie can throw SecurityError in a sandboxed iframe without
  // allow-same-origin, and there is no error boundary above this component. The
  // effect must swallow that and fail closed — show the gate — rather than let
  // an unverified visitor through (or crash the whole subtree).
  it("shows the gate (fails closed) when reading document.cookie throws", () => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError")
      },
    })
    try {
      render(<AgeGate />)
      const dialog = screen.getByRole("alertdialog")
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveClass("opacity-100")
    } finally {
      // Remove the throwing shadow so the prototype getter is restored and
      // afterEach's clearAgeCookie() (a write) doesn't blow up.
      delete (document as unknown as { cookie?: unknown }).cookie
    }
  })

  // Companion to the read guard: writing the cookie on "Yes, I'm 21+" can also
  // throw SecurityError in a sandboxed iframe. If the throw escaped handleAccept,
  // the fade-out/unmount below it would never run and an affirmed visitor would
  // be trapped behind an undismissable overlay. The write must be guarded so
  // dismissal always proceeds (the affirmation just won't persist across loads).
  it("still dismisses the gate when writing the cookie throws", () => {
    // Read returns empty (gate shows); write throws.
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        return ""
      },
      set() {
        throw new DOMException("blocked", "SecurityError")
      },
    })
    try {
      render(<AgeGate />)
      const dialog = screen.getByRole("alertdialog")
      // Clicking must not throw past the guarded write; the fade-out that
      // follows it (opacity → 0, then unmount) must still run.
      fireEvent.click(screen.getByRole("button", { name: /21\+/ }))
      expect(dialog.style.opacity).toBe("0")
    } finally {
      delete (document as unknown as { cookie?: unknown }).cookie
    }
  })
})
