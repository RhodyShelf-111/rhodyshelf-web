"use client" // Error boundaries must be Client Components

import { useEffect } from "react"
import "./globals.css"

// Last-resort boundary: only reached when the ROOT layout itself throws, which
// replaces the entire document — so this file has to ship its own <html>/<body>
// and its own stylesheet import (the root layout's are gone, and with them the
// header, footer, age gate and the display font). `metadata` is not supported
// in a client component, hence the React <title>.
//
// `(browse)/error.tsx` handles every realistic failure (it wraps all the
// data-fetching routes) and keeps the site chrome; this exists so the one case
// it cannot catch still lands on a RhodyShelf-branded page with a retry rather
// than a raw framework stack trace.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Only the digest survives the trip from the server — log it so it can be
    // matched to the real stack trace.
    console.error(error)
  }, [error])

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col items-center justify-center gap-6 px-4 py-16 text-center font-sans bg-background text-foreground">
        <title>Something went wrong | RhodyShelf</title>
        <div>
          <p className="font-heading text-2xl font-semibold tracking-tight mb-2">
            RhodyShelf
          </p>
          <h1 className="font-heading text-3xl font-bold mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground max-w-md">
            We hit an unexpected error loading the site. It&apos;s on our end —
            try again in a moment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center h-11 sm:h-10 px-5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
