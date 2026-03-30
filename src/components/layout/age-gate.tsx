"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

export function AgeGate() {
  const [rejected, setRejected] = useState(false)
  const [visible, setVisible] = useState(false)
  const yesRef = useRef<HTMLButtonElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)
  const leaveRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!rejected) {
      yesRef.current?.focus()
    } else {
      leaveRef.current?.focus()
    }
  }, [rejected])

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
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  function handleAccept() {
    document.cookie =
      "rhodyshelf_age_verified=true; path=/; max-age=2592000; SameSite=Lax"
    const el = document.getElementById("age-gate")
    if (el) {
      el.style.opacity = "0"
      setTimeout(() => el.remove(), 300)
    }
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
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="max-w-sm w-full text-center">
        {!rejected ? (
          <>
            <div className="flex justify-center mb-6">
              <span className="text-5xl">🌿</span>
            </div>

            <p className="font-heading text-xl font-semibold text-foreground mb-8">
              RhodyShelf
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
              <span className="text-4xl opacity-40">🌿</span>
            </div>

            <h1
              id="age-gate-title"
              className="font-heading text-2xl font-bold text-foreground mb-3"
            >
              You must be 21 or older to access this site.
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              We&apos;re unable to grant access at this time.
            </p>

            <a
              ref={leaveRef}
              href="https://google.com"
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
