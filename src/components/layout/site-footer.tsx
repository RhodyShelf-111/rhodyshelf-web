import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {/* Brand */}
          <div>
            <span className="font-heading text-xl font-bold text-foreground">
              RhodyShelf
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Rhode Island Cannabis Discovery
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/menu" className="hover:text-foreground transition-colors">
              Menu
            </Link>
            <Link href="/deals" className="hover:text-foreground transition-colors">
              Deals
            </Link>
            <Link href="/drops" className="hover:text-foreground transition-colors">
              Drops
            </Link>
            <Link
              href="/dispensary"
              className="hover:text-foreground transition-colors"
            >
              Dispensaries
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
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
      </div>
    </footer>
  )
}
