"use client" // Error boundaries must be Client Components

import { useEffect } from "react"
import Link from "next/link"
import { CloudOff } from "lucide-react"

// The (browse) group's error boundary. Every browse route calls data-layer
// helpers that deliberately THROW on a Postgres/network failure (so a degraded
// result is never written into the cache) — and with no error.tsx anywhere,
// those throws fell through to Next's unbranded framework screen: the visitor
// lost the header, the search bar, the footer's 21+/verify-at-dispensary copy
// and every link out, with no way to retry. A menu that is briefly unreachable
// should look busy, not broken.
//
// Like `(browse)/not-found.tsx`, this renders the BODY ONLY. The `@modal`
// catch-all keeps the browse layout matched, so that layout's <main> already
// wraps this in the single header/footer chrome (and the age gate comes from
// the root layout) — adding our own here is what produced doubled chrome.
export default function BrowseError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Server errors reach the client as a bare digest — log it so it can be
    // matched against the real stack trace in the server logs.
    console.error(error)
  }, [error])

  return (
    <div className="flex items-start justify-center px-4 pt-24 pb-16">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-5">
          <CloudOff
            className="w-12 h-12 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          We couldn&apos;t load this menu
        </h1>
        <p className="text-muted-foreground mb-6">
          This is on our end, not yours — nothing is wrong with the dispensary.
          Rhode Island menus refresh throughout the day, so trying again usually
          works.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            // unstable_retry re-fetches and re-renders this segment; the data
            // layer never cached the failure, so it is a real second attempt.
            onClick={() => unstable_retry()}
            className="inline-flex items-center justify-center h-11 sm:h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 sm:h-10 px-5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
