import Link from "next/link"
import { SearchX } from "lucide-react"
import { NotFoundTitle } from "./not-found-title"

// The 404 message body only — icon, heading, and the two "escape hatch" links.
// It renders NO SiteHeader/SiteFooter/<main> of its own so the surrounding
// chrome is supplied exactly once by whatever wraps it:
//   - the root `app/not-found.tsx` wraps this in its own header/footer (the
//     truly-unwrapped case, so a bare 404 still has brand + nav);
//   - the `(browse)/not-found.tsx` lets the browse layout's single chrome wrap
//     it, avoiding the doubled header/footer that a self-chromed 404 caused.
// Keeping the body here stops the two 404 screens from drifting apart.
export function NotFoundContent() {
  return (
    <div className="flex items-start justify-center px-4 pt-24 pb-16">
      <NotFoundTitle />
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-5">
          <SearchX className="w-12 h-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/search"
            className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Browse all products
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
