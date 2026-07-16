import Link from "next/link"
import { PageContainer } from "./page-container"
import { getDispensaries } from "@/lib/queries/dispensaries"
import { HOMEPAGE_CATEGORIES } from "@/lib/queries/products"

// Server component: pulls the (already-cached) dispensary list so the footer
// can deep-link into category and dispensary pages on every page render — the
// richest site-wide internal-linking surface, with descriptive anchor text.
export async function SiteFooter() {
  const dispensaries = await getDispensaries()
    .then((rows) =>
      [...rows]
        .filter((d) => d.product_count > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    .catch(() => [])

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <PageContainer className="pt-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <span className="font-heading text-xl font-bold text-foreground">
              Rhody<span className="text-primary">Shelf</span>
            </span>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Rhode Island cannabis menus, prices, and deals — all in one place.
            </p>
          </div>

          {/* Browse by category */}
          <FooterColumn title="Browse">
            {HOMEPAGE_CATEGORIES.map((c) => (
              <FooterLink key={c.key} href={`/category/${c.key}`}>
                {c.label}
              </FooterLink>
            ))}
            <FooterLink href="/deals">Deals</FooterLink>
            <FooterLink href="/drops">New Drops</FooterLink>
          </FooterColumn>

          {/* Dispensaries */}
          <FooterColumn title="Dispensaries">
            {dispensaries.slice(0, 9).map((d) => (
              <FooterLink key={d.id} href={`/dispensary/${d.slug}`}>
                {d.name}
              </FooterLink>
            ))}
            <FooterLink href="/dispensary">All dispensaries</FooterLink>
          </FooterColumn>

          {/* Company */}
          <FooterColumn title="RhodyShelf">
            <FooterLink href="/brand">Brands</FooterLink>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/saved">Saved</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <a
              href="mailto:hello@rhodyshelf.com"
              className="inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </FooterColumn>
        </div>

        <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
          <p>
            For informational purposes only. Not medical advice. Cannabis is for
            adults 21+ and legal for recreational use in Rhode Island.
          </p>
          <p>Prices and availability subject to change. Verify at dispensary.</p>
          <p>
            &copy; {new Date().getFullYear()} RhodyShelf. Not affiliated with any
            dispensary.
          </p>
        </div>
      </PageContainer>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-2">
        {title}
      </h2>
      <ul className="flex flex-col">{children}</ul>
    </div>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {children}
      </Link>
    </li>
  )
}
