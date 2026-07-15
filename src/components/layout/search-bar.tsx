"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useCallback, useRef, useEffect } from "react"

interface SearchBarProps {
  autoFocus?: boolean
  onBlur?: () => void
  /** Lets a parent focus the input synchronously inside its own tap handler
   *  (the only way iOS reliably raises the keyboard). */
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function SearchBar({ autoFocus, onBlur, inputRef: externalRef }: SearchBarProps) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = externalRef ?? internalRef

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
    // inputRef is a stable ref object; autoFocus is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (value.trim()) {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`)
        setValue("")
      }
    },
    [value, router]
  )

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        placeholder="Search products, brands, strains..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        className="pl-9 h-11 text-base md:text-sm bg-muted/50 border-transparent focus:border-border focus:bg-card"
      />
    </form>
  )
}
