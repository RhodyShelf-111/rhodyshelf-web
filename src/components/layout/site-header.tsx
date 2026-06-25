"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Menu, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SearchBar } from "./search-bar"
import { useSavedProductIds } from "@/hooks/use-upvotes"
import { useState } from "react"

const NAV_LINKS = [
  { href: "/search", label: "Search" },
  { href: "/dispensary", label: "Dispensaries" },
  { href: "/deals", label: "Deals" },
  { href: "/drops", label: "Drops" },
]

/** Nav entry to the personal saved list, with a live count badge. The count is
 *  0 on the server / first render (matching useSavedProductIds), so the badge
 *  only appears after hydration — no mismatch. */
function SavedNavLink({
  active,
  mobile,
  onNavigate,
}: {
  active: boolean
  mobile?: boolean
  onNavigate?: () => void
}) {
  const count = useSavedProductIds().length
  return (
    <Link
      href="/saved"
      onClick={onNavigate}
      className={cn(
        "rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
        mobile ? "px-4 py-3 text-base" : "px-3 py-2 text-[15px]",
        active
          ? "text-primary bg-accent"
          : mobile
            ? "text-foreground hover:bg-muted"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Bookmark className={cn("w-4 h-4", active && "fill-current")} />
      Saved
      {count > 0 && (
        <span className="ml-0.5 min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
          {count}
        </span>
      )}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-16">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label="RhodyShelf home">
          <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Rhody<span className="text-primary">Shelf</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 text-[15px] font-medium rounded-lg transition-colors whitespace-nowrap",
                pathname?.startsWith(link.href)
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
          <SavedNavLink active={pathname?.startsWith("/saved") ?? false} />
        </nav>

        {/* Desktop search */}
        <div className="hidden md:block w-64 lg:w-72">
          <SearchBar />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          {mobileSearchOpen ? (
            <div className="absolute inset-x-0 top-0 h-16 bg-background px-4 flex items-center gap-2 z-10">
              <SearchBar autoFocus onBlur={() => setMobileSearchOpen(false)} />
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="text-sm text-muted-foreground shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[260px]">
              <nav className="flex flex-col gap-1 pt-8">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "px-4 py-3 text-base font-medium rounded-lg transition-colors",
                      pathname?.startsWith(link.href)
                        ? "text-primary bg-accent"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <SavedNavLink
                  active={pathname?.startsWith("/saved") ?? false}
                  mobile
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
