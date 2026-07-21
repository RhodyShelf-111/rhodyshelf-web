"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id="age-rs-g"
          x1="6"
          y1="4"
          x2="58"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3ddc84" />
          <stop offset="1" stopColor="#12a150" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#age-rs-g)" />
      <path
        d="M32 51 L32 27"
        fill="none"
        stroke="#06140c"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g fill="#06140c">
        <path d="M32 32 C23.5 32.5 17 27.5 15 18 C24.5 17.5 31 23 32 32 Z" />
        <path d="M32 32 C40.5 32.5 47 27.5 49 18 C39.5 17.5 33 23 32 32 Z" />
        <path d="M32 28 C28.5 21.5 29 14.5 32 10 C35 14.5 35.5 21.5 32 28 Z" />
      </g>
    </svg>
  )
}

export function AgeGate() {
  const [rejected, setRejected] = useState(false)
  // "pending" until the verification cookie is checked on mount, so the
  // server-rendered markup stays hidden (opacity-0) and verified visitors
  // never see a flash. The cookie is read client-side (not in the layout)
  // to keep browse routes static/ISR-cacheable.
  //
  // Known tradeoff: this is a client-side cosmetic overlay, so the page
  // content is always present in the SSR/ISR HTML. That's a deliberate choice
  // for SEO/ISR cacheability (see the data-layer-architecture notes) and means
  // the gate does not block JS-disabled or non-browser fetches. The gate is a
  // UX/compliance affordance for real browsers, not a hard content wall.
  const [status, setStatus] = useState<"pending" | "show" | "hidden">("pending")
  const yesRef = useRef<HTMLButtonElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)
  const leaveRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    let verified = false
    try {
      verified = document.cookie
        .split("; ")
        .includes("rhodyshelf_age_verified=true")
    } catch {
      // document.cookie can throw SecurityError in a sandboxed iframe without
      // allow-same-origin, and there's no error boundary above this component.
      // Fail closed: if the cookie can't be read, treat the visitor as
      // unverified and show the gate rather than let content through.
      verified = false
    }
    // Reveal directly here (post-mount) instead of via requestAnimationFrame:
    // rAF callbacks are paused/throttled in hidden/background tabs, so an rAF
    // reveal fails open — the gate would stay opacity-0/pointer-events-none on
    // a background-tab load until the tab is foregrounded. A plain setState
    // isn't throttled, and the opacity-0 initial paint still lets the CSS
    // transition-opacity animate the fade-in. Verified visitors take the
    // "hidden" branch and unmount before painting, so they never flash.
    // Cookie can only be read on the client; setting state here (post-mount) is
    // intentional and doesn't loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(verified ? "hidden" : "show")
  }, [])

  useEffect(() => {
    if (status !== "show") return
    if (!rejected) {
      yesRef.current?.focus()
    } else {
      leaveRef.current?.focus()
    }
  }, [rejected, status])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        if (rejected) {
          leaveRef.current?.focus()
          return
        }
        if (document.activeElement === yesRef.current) {
          noRef.current?.focus()
        } else {
          yesRef.current?.focus()
        }
      }
    },
    [rejected]
  )

  useEffect(() => {
    if (status !== "show") return
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown, status])

  if (status === "hidden") return null

  function handleAccept() {
    try {
      document.cookie =
        "rhodyshelf_age_verified=true; path=/; max-age=2592000; SameSite=Lax"
    } catch {
      // Same sandboxed-iframe SecurityError the read guard handles. The write
      // failing means the affirmation won't persist (the visitor re-gates on
      // the next load), but it must NOT throw past this point — otherwise the
      // fade-out/unmount below never runs and the affirmed visitor is trapped
      // behind an undismissable overlay.
    }
    // fade out, then unmount through React so the document-level key
    // listener is detached (raw el.remove() would leak it and keep
    // hijacking Tab/Escape sitewide)
    const el = document.getElementById("age-gate")
    if (el) el.style.opacity = "0"
    setTimeout(() => setStatus("hidden"), 300)
  }

  return (
    <div
      id="age-gate"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-desc"
      className={cn(
        // items-start + overflow-y-auto so the accept/reject buttons never clip
        // off-screen (and become unreachable, trapping the visitor) when the
        // viewport is short — landscape or large Dynamic Type. Centered once
        // there's room. Vertical padding folds in the safe-area insets.
        "fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex items-start sm:items-center justify-center overflow-y-auto px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]",
        "transition-opacity duration-[400ms]",
        // pending state must not swallow clicks: verified visitors get this
        // overlay in the static HTML until hydration removes it
        status === "show" ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="max-w-sm w-full text-center">
        {!rejected ? (
          <>
            <div className="flex justify-center mb-6">
              <BrandMark className="w-16 h-16 rounded-2xl shadow-[0_0_40px_-10px_rgba(34,197,94,0.45)]" />
            </div>

            <p className="font-heading text-xl font-bold text-foreground mb-8">
              Rhody<span className="text-primary">Shelf</span>
            </p>

            <h1
              id="age-gate-title"
              className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3"
            >
              Are you 21 or older?
            </h1>
            <p id="age-gate-desc" className="text-sm text-muted-foreground mb-10">
              You must be of legal age to view this site.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                ref={yesRef}
                onClick={handleAccept}
                className={cn(
                  "px-8 py-3.5 text-sm font-semibold rounded-xl min-h-[48px] transition-all",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "shadow-[0_0_20px_-5px_rgba(22,163,74,0.3)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                )}
              >
                Yes, I&apos;m 21+
              </button>
              <button
                ref={noRef}
                onClick={() => setRejected(true)}
                className={cn(
                  "px-8 py-3.5 text-sm font-semibold rounded-xl min-h-[48px] transition-all",
                  "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                )}
              >
                No
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <BrandMark className="w-14 h-14 rounded-2xl opacity-40" />
            </div>

            <h1
              id="age-gate-title"
              className="font-heading text-2xl font-bold text-foreground mb-3"
            >
              Come back when you&apos;re 21.
            </h1>
            <p id="age-gate-desc" className="text-sm text-muted-foreground mb-8">
              RhodyShelf is only available to adults 21 and older.
            </p>

            <a
              ref={leaveRef}
              href="https://www.google.com"
              rel="nofollow noopener"
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-3 text-sm text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-lg"
            >
              Leave this site &rarr;
            </a>
          </>
        )}
      </div>
    </div>
  )
}
