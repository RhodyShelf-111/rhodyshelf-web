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
  const [status, setStatus] = useState<"pending" | "show" | "hidden">("pending")
  const yesRef = useRef<HTMLButtonElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)
  const leaveRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (document.cookie.split("; ").includes("rhodyshelf_age_verified=true")) {
      // Cookie can only be read on the client; hiding here (post-mount) is what
      // keeps verified visitors from seeing a flash. Not a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("hidden")
      return
    }
    const frame = requestAnimationFrame(() => setStatus("show"))
    return () => cancelAnimationFrame(frame)
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
    document.cookie =
      "rhodyshelf_age_verified=true; path=/; max-age=2592000; SameSite=Lax"
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
      className={cn(
        "fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex items-center justify-center px-6",
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
            <p className="text-sm text-muted-foreground mb-10">
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
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
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
                  "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-2"
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
            <p className="text-sm text-muted-foreground mb-8">
              RhodyShelf is only available to adults 21 and older.
            </p>

            <a
              ref={leaveRef}
              href="https://www.google.com"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded"
            >
              Leave this site &rarr;
            </a>
          </>
        )}
      </div>
    </div>
  )
}
