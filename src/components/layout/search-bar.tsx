"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useCallback, useRef, useEffect } from "react"

interface SearchBarProps {
  autoFocus?: boolean
  onBlur?: () => void
}

export function SearchBar({ autoFocus, onBlur }: SearchBarProps) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (value.trim()) {
        router.push(`/menu?search=${encodeURIComponent(value.trim())}`)
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
        placeholder="Search products, brands, strains..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        className="pl-9 h-9 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-white"
      />
    </form>
  )
}
