"use client"

import Link from "next/link"
import { createPortal, flushSync } from "react-dom"
import { usePathname } from "next/navigation"
import { Search, Menu, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SearchBar } from "./search-bar"
import { PageContainer } from "./page-container"
import { useSavedProductIds } from "@/hooks/use-upvotes"
import { useEffect, useRef, useState } from "react"

const NAV_LINKS = [
  { href: "/search", label: "Search" },
  { href: "/dispensary", label: "Dispensaries" },
  { href: "/brand", label: "Brands" },
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Lock body scroll while the mobile search overlay is open, matching the
  // hamburger Sheet — otherwise the page scrolls behind the focused scrim.
  useEffect(() => {
    if (!mobileSearchOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileSearchOpen])

  // Open the search AND focus its input within the same tap, so iOS raises the
  // keyboard. flushSync renders the overlay synchronously so the input exists
  // before we focus it; a post-render effect happens outside the gesture and
  // iOS then refuses to show the keyboard.
  const openMobileSearch = () => {
    flushSync(() => setMobileSearchOpen(true))
    searchInputRef.current?.focus()
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-16">
      <PageContainer className="h-full flex items-center justify-between gap-4">
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
            <>
              {/* Dimming scrim over the page body so the search reads as a
                  focused mode; tap it (or Cancel) to close. We intentionally
                  don't auto-close on input blur — focus loss on mobile is
                  common and non-deliberate. Portaled to <body> because the
                  header's backdrop-blur would otherwise trap this fixed
                  element inside the 64px header. */}
              {createPortal(
                <div
                  className="fixed inset-x-0 top-16 bottom-0 z-40 bg-black/55 md:hidden"
                  onClick={() => setMobileSearchOpen(false)}
                  aria-hidden="true"
                />,
                document.body
              )}
              <div className="absolute inset-x-0 top-0 h-16 bg-background px-4 flex items-center gap-2 z-10">
                <SearchBar autoFocus inputRef={searchInputRef} />
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="px-2 min-h-11 inline-flex items-center text-sm text-muted-foreground shrink-0"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={openMobileSearch}
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
              <SheetTitle className="sr-only">Menu</SheetTitle>
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
      </PageContainer>
    </header>
  )
}
