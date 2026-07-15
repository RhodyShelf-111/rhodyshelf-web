import Link from "next/link"
import { PageContainer } from "./page-container"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <PageContainer className="pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {/* Brand */}
          <div>
            <span className="font-heading text-xl font-bold text-foreground">
              Rhody<span className="text-primary">Shelf</span>
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Rhode Island Cannabis Discovery
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/search" className="inline-flex min-h-11 items-center hover:text-foreground transition-colors">
              Search
            </Link>
            <Link href="/deals" className="inline-flex min-h-11 items-center hover:text-foreground transition-colors">
              Deals
            </Link>
            <Link href="/drops" className="inline-flex min-h-11 items-center hover:text-foreground transition-colors">
              Drops
            </Link>
            <Link
              href="/dispensary"
              className="inline-flex min-h-11 items-center hover:text-foreground transition-colors"
            >
              Dispensaries
            </Link>
            <Link href="/saved" className="inline-flex min-h-11 items-center hover:text-foreground transition-colors">
              Saved
            </Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
        </div>

        <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
          <p>
            Prices and availability subject to change. Verify at dispensary.
          </p>
          <p className="mt-1">
            &copy; {new Date().getFullYear()} RhodyShelf. Not affiliated with
            any dispensary.
          </p>
        </div>
      </PageContainer>
    </footer>
  )
}
