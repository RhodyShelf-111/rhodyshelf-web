"use client"

import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { useState, useCallback, useRef, useEffect, useMemo, useId } from "react"
import { cn } from "@/lib/utils"

interface HeroSearchProps {
  brands: string[]
  initialValue?: string
  placeholder?: string
  className?: string
}

export function HeroSearch({ brands, initialValue = "", placeholder = "Search products, brands, strains...", className }: HeroSearchProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const matchedBrands = useMemo(
    () =>
      value.trim().length > 0
        ? brands
            .filter((b) => b.toLowerCase().includes(value.toLowerCase()))
            .slice(0, 8)
        : [],
    [value, brands]
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

  const handleBrandClick = useCallback(
    (brand: string) => {
      router.push(`/search?brand=${encodeURIComponent(brand)}`)
      setValue(brand)
      setOpen(false)
    },
    [router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return
      const total = matchedBrands.length + 1 // +1 for "View all" option
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % total)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + total) % total)
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < matchedBrands.length) {
          handleBrandClick(matchedBrands[activeIndex])
        } else {
          handleSubmit()
        }
      } else if (e.key === "Escape") {
        setOpen(false)
        setActiveIndex(-1)
      }
    },
    [open, matchedBrands, activeIndex, handleBrandClick, handleSubmit]
  )

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  const showDropdown = open && value.trim().length > 0 && matchedBrands.length > 0

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
            onChange={(e) => {
              setValue(e.target.value)
              setOpen(true)
              setActiveIndex(-1)
            }}
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
              onClick={() => { setValue(""); setOpen(false); inputRef.current?.focus() }}
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
            "overflow-hidden"
          )}
        >
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Brands
          </p>
          {matchedBrands.map((brand, i) => (
            <button
              key={brand}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); handleBrandClick(brand) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                i === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {brand}
            </button>
          ))}
          <button
            role="option"
            aria-selected={activeIndex === matchedBrands.length}
            onMouseDown={(e) => { e.preventDefault(); handleSubmit() }}
            onMouseEnter={() => setActiveIndex(matchedBrands.length)}
            className={cn(
              "w-full text-left px-4 py-3 text-sm border-t border-border transition-colors",
              activeIndex === matchedBrands.length
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
