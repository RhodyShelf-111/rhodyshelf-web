"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { useState, useCallback, useRef, useEffect, useId } from "react"
import { cn } from "@/lib/utils"
import type { Suggestion, SuggestionType } from "@/lib/types"

interface HeroSearchProps {
  /** Brand names for the instant local seed shown while the API responds. */
  brands: string[]
  initialValue?: string
  placeholder?: string
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
          if (d?.suggestions) setSuggestions(d.suggestions as Suggestion[])
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
        setActiveIndex((i) => (i - 1 + total) % total)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        } else {
          handleSubmit()
        }
      } else if (e.key === "Escape") {
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-11 pl-11 pr-10 rounded-xl text-base md:text-sm",
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
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
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
          className={cn(
            "absolute z-50 left-0 right-0 mt-1",
            "bg-popover border border-border rounded-xl shadow-lg",
            "overflow-hidden py-1"
          )}
        >
          {suggestions.map((s, i) => {
            const newGroup = i === 0 || suggestions[i - 1].type !== s.type
            return (
              <div key={`${s.type}:${s.value}`}>
                {newGroup && (
                  <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {GROUP_LABELS[s.type]}
                  </p>
                )}
                <button
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(s)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors truncate",
                    i === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {s.value}
                </button>
              </div>
            )
          })}
          <button
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onMouseDown={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
            className={cn(
              "w-full text-left px-4 py-3 mt-1 text-sm border-t border-border transition-colors",
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
