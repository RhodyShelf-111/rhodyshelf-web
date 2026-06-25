import Link from "next/link"
import { SearchX } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

export default function NotFound() {
  // Root-level not-found sits outside the (browse) group, so it doesn't inherit
  // the browse chrome — render the header/footer here so a 404 still has the
  // brand, navigation, and a way home (not a dead end).
  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex items-start justify-center px-4 pt-24 pb-16">
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
      </main>
      <SiteFooter />
    </>
  )
}
