"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { useState, useCallback, useRef, useEffect, useId, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Suggestion, SuggestionType } from "@/lib/types"

interface HeroSearchProps {
  /** Brand names for the instant local seed shown while the API responds. */
  brands: string[]
  initialValue?: string
  placeholder?: string
  /** Accessible name for the field. A placeholder is not one — it disappears
   *  the moment the user types and screen readers may skip it entirely. Pass
   *  this alongside any custom `placeholder` so the two stay in sync. */
  label?: string
  className?: string
}

const GROUP_LABELS: Record<SuggestionType, string> = {
  product: "Products",
  brand: "Brands",
  strain: "Strains",
}

export function HeroSearch({
  brands,
  initialValue = "",
  placeholder = "Search products, brands, strains...",
  label = "Search products, brands, strains",
  className,
}: HeroSearchProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // Debounced fetch of product/brand/strain suggestions. The onChange handler
  // seeds an instant local brand match so the menu is never empty for the
  // ~110ms before the API answers; this effect then enriches/replaces it.
  useEffect(() => {
    const term = value.trim()
    if (term.length < 1) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.suggestions) return
          const next = d.suggestions as Suggestion[]
          setSuggestions(next)
          // The response can be shorter than the local brand seed the user has
          // already arrowed into. Left alone, activeIndex sits past the end and
          // aria-activedescendant points at an id that no longer exists —
          // nothing is highlighted and the screen reader announces nothing.
          setActiveIndex((i) => Math.min(i, next.length))
        })
        .catch(() => {})
    }, 110)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setValue(v)
      setOpen(true)
      setActiveIndex(-1)
      const term = v.trim().toLowerCase()
      // Instant local seed from the brand list we already have on the client.
      setSuggestions(
        term
          ? brands
              .filter((b) => b.toLowerCase().includes(term))
              .slice(0, 3)
              .map((b) => ({ type: "brand" as const, value: b }))
          : []
      )
    },
    [brands]
  )

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (value.trim()) {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`)
        setOpen(false)
      }
    },
    [value, router]
  )

  const handleSelect = useCallback(
    (s: Suggestion) => {
      if (s.type === "brand") {
        router.push(`/search?brand=${encodeURIComponent(s.value)}`)
      } else {
        // product / strain: run it as a keyword search (a name maps to many
        // listings across dispensaries; the results page shows them all).
        router.push(`/search?q=${encodeURIComponent(s.value)}`)
      }
      setValue(s.value)
      setOpen(false)
    },
    [router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return
      const total = suggestions.length + 1 // +1 for "View all"
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % total)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        // From the unhighlighted start (-1), Up goes to the *last* option;
        // the modulo on its own lands one short and strands "View all".
        setActiveIndex((i) => (i <= 0 ? total - 1 : i - 1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        } else {
          handleSubmit()
        }
      } else if (e.key === "Escape" || e.key === "Tab") {
        // Tab leaves the widget entirely — without this the menu keeps
        // floating over the page while focus is already somewhere else.
        setOpen(false)
        setActiveIndex(-1)
      }
    },
    [open, suggestions, activeIndex, handleSelect, handleSubmit]
  )

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  const showDropdown =
    open && value.trim().length > 0 && suggestions.length > 0

  // Every option needs a stable id so aria-activedescendant can point at it.
  // The index past the end of `suggestions` is the trailing "View all" option.
  const optionId = useCallback(
    (i: number) => `${listboxId}-opt-${i}`,
    [listboxId]
  )

  // A listbox may only own options and groups, so fold the (already
  // type-clustered) suggestions into real groups rather than leaving the type
  // heading as a stray text node between options. `start` is the offset into
  // `suggestions`, which is what activeIndex counts.
  const groups = useMemo(() => {
    const out: { type: SuggestionType; start: number; items: Suggestion[] }[] = []
    suggestions.forEach((s, i) => {
      const last = out[out.length - 1]
      if (last && last.type === s.type) last.items.push(s)
      else out.push({ type: s.type, start: i, items: [s] })
    })
    return out
  }, [suggestions])

  // aria-activedescendant highlights without moving focus, so the browser
  // never scrolls the capped-height list for us — do it by hand.
  useEffect(() => {
    if (!showDropdown || activeIndex < 0) return
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView?.({ block: "nearest" })
  }, [showDropdown, activeIndex, optionId])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
            aria-label={label}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              // pr clears the 44px clear button on touch, the 32px one on sm+.
              "w-full h-11 pl-11 pr-12 sm:pr-11 rounded-xl text-lead md:text-body",
              "bg-card border border-border",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              "transition-all"
            )}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("")
                setSuggestions([])
                setOpen(false)
                inputRef.current?.focus()
              }}
              // 44px hit area on touch layouts (was 24px), compact on sm+.
              // Clearing a mistyped query is the commonest recovery here, and
              // missing the target just drops the caret back in the field.
              className="absolute right-1 sm:right-2.5 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          role="listbox"
          id={listboxId}
          aria-label="Search suggestions"
          className={cn(
            "absolute z-50 left-0 right-0 mt-1",
            "bg-popover border border-border rounded-xl shadow-lg",
            // Cap + scroll so lower options and "View all" aren't stranded
            // behind the mobile keyboard; overscroll-contain stops the scroll
            // from chaining out to the page.
            "max-h-[60dvh] overflow-y-auto overscroll-contain py-1"
          )}
        >
          {groups.map((group) => (
            <div
              key={`${group.type}:${group.start}`}
              role="group"
              aria-label={GROUP_LABELS[group.type]}
            >
              <p
                aria-hidden="true"
                className="px-4 pt-2 pb-1 text-meta uppercase tracking-wider text-muted-foreground"
              >
                {GROUP_LABELS[group.type]}
              </p>
              {group.items.map((s, j) => {
                const i = group.start + j
                return (
                  <button
                    key={`${s.type}:${s.value}`}
                    id={optionId(i)}
                    role="option"
                    type="button"
                    // In a combobox focus never leaves the input — the options
                    // are driven by arrow keys + aria-activedescendant — so Tab
                    // has to skip the whole list instead of walking into it.
                    tabIndex={-1}
                    aria-selected={i === activeIndex}
                    // preventDefault on mousedown keeps focus (and the mobile
                    // keyboard) in the input; the selection itself rides on
                    // click, which is what touch and AT activation fire.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(s)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "w-full text-left px-4 py-3 text-body transition-colors truncate",
                      i === activeIndex
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {s.value}
                  </button>
                )
              })}
            </div>
          ))}
          <button
            id={optionId(suggestions.length)}
            role="option"
            type="button"
            tabIndex={-1}
            aria-selected={activeIndex === suggestions.length}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSubmit()}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
            className={cn(
              "w-full text-left px-4 py-3 mt-1 text-body border-t border-border transition-colors",
              activeIndex === suggestions.length
                ? "bg-accent text-accent-foreground"
                : "text-primary hover:bg-muted"
            )}
          >
            View all results for &ldquo;{value}&rdquo; →
          </button>
        </div>
      )}
    </div>
  )
}
