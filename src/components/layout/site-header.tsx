"use client"

import Link from "next/link"
import { createPortal, flushSync } from "react-dom"
import { usePathname } from "next/navigation"
import {
  Search,
  Menu,
  Bookmark,
  Store,
  Percent,
  Sparkles,
  Tags,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SearchBar } from "./search-bar"
import { PageContainer } from "./page-container"
import { useSavedProductIds } from "@/hooks/use-upvotes"
import { useSwipeDismiss } from "@/hooks/use-swipe-dismiss"
import { useEffect, useRef, useState } from "react"

type NavLink = {
  href: string
  label: string
  /** Short scannable subtitle shown in the mobile menu (not on desktop). */
  desc: string
  icon: LucideIcon
}

const NAV_LINKS: NavLink[] = [
  { href: "/search", label: "Search", desc: "Find any product", icon: Search },
  { href: "/dispensary", label: "Dispensaries", desc: "All 9 RI shops", icon: Store },
  { href: "/brand", label: "Brands", desc: "Browse by brand", icon: Tags },
  { href: "/deals", label: "Deals", desc: "Today's price drops", icon: Percent },
  { href: "/drops", label: "Drops", desc: "Just added", icon: Sparkles },
]

/** Nav entry to the personal saved list, with a live count badge. The count is
 *  0 on the server / first render (matching useSavedProductIds), so the badge
 *  only appears after hydration — no mismatch. */
function SavedNavLink({
  active,
  onNavigate,
}: {
  active: boolean
  onNavigate?: () => void
}) {
  const count = useSavedProductIds().length
  return (
    <Link
      href="/saved"
      onClick={onNavigate}
      className={cn(
        "rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[15px]",
        active
          ? "text-primary bg-accent"
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

/** One row in the mobile menu bottom sheet: icon chip, label + subtitle, and a
 *  trailing chevron (or count badge). Big full-width tap target. */
function MobileMenuRow({
  href,
  label,
  desc,
  icon: Icon,
  active,
  onNavigate,
  trailing,
}: {
  href: string
  label: string
  desc: string
  icon: LucideIcon
  active: boolean
  onNavigate: () => void
  trailing?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      // prefetch={false}: opening the menu mounts all six rows at once, and
      // /drops and /brand are static routes with no loading.js — default
      // prefetch pulls their entire payloads (~120 KB gz together) over
      // cellular the moment the sheet rises. Same call the footer makes.
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors min-h-14",
        active ? "bg-accent" : "hover:bg-muted active:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-base font-medium leading-tight",
            active ? "text-accent-foreground" : "text-foreground"
          )}
        >
          {label}
        </span>
        <span className="block text-xs text-muted-foreground leading-tight mt-0.5">
          {desc}
        </span>
      </span>
      {trailing ?? (
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-primary" : "text-muted-foreground/40"
          )}
        />
      )}
    </Link>
  )
}

/** Saved row for the mobile menu — same rhythm as MobileMenuRow but with a live
 *  count badge instead of a chevron once the user has saved something. */
function MobileSavedRow({
  active,
  onNavigate,
}: {
  active: boolean
  onNavigate: () => void
}) {
  const count = useSavedProductIds().length
  return (
    <MobileMenuRow
      href="/saved"
      label="Saved"
      desc="Your shortlist"
      icon={Bookmark}
      active={active}
      onNavigate={onNavigate}
      trailing={
        count > 0 ? (
          <span className="min-w-6 h-6 px-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
            {count}
          </span>
        ) : undefined
      }
    />
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const searchDialogRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) => pathname?.startsWith(href) ?? false

  // The menu shows a grab handle, so it has to honour the gesture that handle
  // advertises. Base UI's Dialog has none of its own — same shared hook the
  // filter sheet uses, so both bottom sheets dismiss identically.
  const {
    popupRef: navPopupRef,
    dragHandlers: navDragHandlers,
    onOpenChange: onNavOpenChange,
  } = useSwipeDismiss({ open: mobileNavOpen, setOpen: setMobileNavOpen })

  // Route link taps through the same slide-out as a swipe, so the menu never
  // leaves two different ways.
  const closeNav = () => onNavOpenChange(false)

  // Make the mobile search overlay a real modal. Locking body scroll isn't
  // enough on its own: without `inert` the whole page behind the scrim stays
  // tabbable and in the accessibility tree, so a keyboard user who Tabs past
  // Cancel lands on nav links and product cards they can neither see nor
  // (scroll being locked) bring into view. The dialog itself is a body-level
  // portal, so it's simply the one child we skip.
  useEffect(() => {
    if (!mobileSearchOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const dialog = searchDialogRef.current
    const behind = Array.from(document.body.children).filter(
      (el) => el !== dialog && !el.hasAttribute("inert")
    )
    behind.forEach((el) => el.setAttribute("inert", ""))
    return () => {
      document.body.style.overflow = previous
      behind.forEach((el) => el.removeAttribute("inert"))
    }
  }, [mobileSearchOpen])

  // Turning a phone to landscape crosses `md` (an iPhone is 844px wide that
  // way), and the overlay is md:hidden — so it would vanish while leaving the
  // page inert and scroll-locked, with nothing on screen left to dismiss it.
  // Close it and hand the user the desktop header, which has its own search.
  useEffect(() => {
    if (!mobileSearchOpen) return
    const desktop = window.matchMedia("(min-width: 768px)")
    const closeIfDesktop = () => {
      if (desktop.matches) setMobileSearchOpen(false)
    }
    closeIfDesktop()
    desktop.addEventListener("change", closeIfDesktop)
    return () => desktop.removeEventListener("change", closeIfDesktop)
  }, [mobileSearchOpen])

  // Open the search AND focus its input within the same tap, so iOS raises the
  // keyboard. flushSync renders the overlay synchronously so the input exists
  // before we focus it; a post-render effect happens outside the gesture and
  // iOS then refuses to show the keyboard.
  const openMobileSearch = () => {
    flushSync(() => setMobileSearchOpen(true))
    searchInputRef.current?.focus()
  }

  // Closing hands focus back to the button that opened the overlay — otherwise
  // it falls to <body> and a keyboard user restarts from the top of the page.
  // Same flushSync trick, so the button is back in the DOM before we reach it.
  const closeMobileSearch = () => {
    flushSync(() => setMobileSearchOpen(false))
    searchButtonRef.current?.focus()
  }

  // Escape dismisses, and Tab cycles inside the bar. `inert` already pulls the
  // page out of the tab order, but without a wrap the cycle leaves through the
  // browser chrome before it comes back.
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeMobileSearch()
      return
    }
    if (e.key !== "Tab") return
    const focusable = Array.from(
      searchDialogRef.current?.querySelectorAll<HTMLElement>(
        "input:not([disabled]), button:not([disabled])"
      ) ?? []
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (document.activeElement !== (e.shiftKey ? first : last)) return
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
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
              // prefetch={false}: this nav is in-viewport on every single page,
              // so the default would background-download /drops and /brand in
              // full (they're static with no loading.js) during the LCP window,
              // competing with product images. Matches the footer/home chips.
              prefetch={false}
              className={cn(
                "px-3 py-2 text-[15px] font-medium rounded-lg transition-colors whitespace-nowrap",
                isActive(link.href)
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
          <SavedNavLink active={isActive("/saved")} />
        </nav>

        {/* Desktop search */}
        <div className="hidden md:block w-64 lg:w-72">
          <SearchBar />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          {mobileSearchOpen ? (
            /* The whole overlay is portaled to <body>: the header's
               backdrop-blur is a containing block for fixed children, and only
               as a body-level sibling can this mark the rest of the page
               inert. */
            createPortal(
              <div
                ref={searchDialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Search"
                className="md:hidden"
                onKeyDown={handleSearchKeyDown}
                // Submitting navigates to the results — leave the overlay up
                // and the scrim (and the inert page under it) would sit on top
                // of the very results the shopper just asked for.
                onSubmit={closeMobileSearch}
              >
                {/* Dimming scrim over the page body so the search reads as a
                    focused mode; tap it (or Cancel) to close. We intentionally
                    don't auto-close on input blur — focus loss on mobile is
                    common and non-deliberate. */}
                <div
                  className="fixed inset-x-0 top-16 bottom-0 z-40 bg-black/55"
                  onClick={closeMobileSearch}
                  aria-hidden="true"
                />
                {/* z-50 + later in the DOM than the sticky header, so the bar
                    covers it. */}
                <div className="fixed inset-x-0 top-0 h-16 bg-background px-4 flex items-center gap-2 z-50">
                  <SearchBar autoFocus inputRef={searchInputRef} />
                  <button
                    onClick={closeMobileSearch}
                    className="px-2 min-h-11 inline-flex items-center text-sm text-muted-foreground shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>,
              document.body
            )
          ) : (
            <button
              ref={searchButtonRef}
              onClick={openMobileSearch}
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          {/* Mobile menu — a bottom sheet that rises into the thumb zone, matching
              the app's product quick-look and filter sheets. */}
          <Sheet open={mobileNavOpen} onOpenChange={onNavOpenChange}>
            <SheetTrigger
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg hover:bg-muted transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </SheetTrigger>
            <SheetContent
              ref={navPopupRef}
              side="bottom"
              className="rounded-t-2xl gap-0 px-0 pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto overscroll-contain"
            >
              {/* Grab handle + section label — the swipe's drag zone. touch-none
                  so the browser doesn't claim a downward drag for scrolling
                  first; the nav rows below keep scrolling normally. */}
              <div
                data-testid="nav-sheet-drag-zone"
                className="shrink-0 touch-none select-none"
                {...navDragHandlers}
              >
                <div
                  aria-hidden="true"
                  className="mx-auto mt-2.5 mb-1 h-1.5 w-9 cursor-grab rounded-full bg-border active:cursor-grabbing"
                />
                <SheetTitle className="px-5 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Browse
                </SheetTitle>
              </div>
              <nav className="px-3 pb-1 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <MobileMenuRow
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    desc={link.desc}
                    icon={link.icon}
                    active={isActive(link.href)}
                    onNavigate={closeNav}
                  />
                ))}
                <MobileSavedRow active={isActive("/saved")} onNavigate={closeNav} />
              </nav>
              <div className="mt-2 mx-3 pt-3 border-t border-border flex items-center justify-between px-3 text-[11.5px] text-muted-foreground">
                <span>Rhode Island · 21+</span>
                {/* -my-1 keeps the row height while giving the links a taller tap area. */}
                <span className="flex items-center gap-1 -my-1">
                  <Link
                    href="/privacy"
                    onClick={closeNav}
                    className="px-2 py-1 rounded hover:text-foreground transition-colors"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    onClick={closeNav}
                    className="px-2 py-1 rounded hover:text-foreground transition-colors"
                  >
                    Terms
                  </Link>
                </span>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </PageContainer>
    </header>
  )
}
