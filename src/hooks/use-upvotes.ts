"use client"

import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "rhodyshelf_upvotes"

function getUpvotes(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveUpvotes(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage full or unavailable
  }
}

export function useUpvotes(listingId: string) {
  const [isUpvoted, setIsUpvoted] = useState(false)

  useEffect(() => {
    setIsUpvoted(getUpvotes().has(listingId))
  }, [listingId])

  const toggle = useCallback(() => {
    const upvotes = getUpvotes()
    if (upvotes.has(listingId)) {
      upvotes.delete(listingId)
      setIsUpvoted(false)
    } else {
      upvotes.add(listingId)
      setIsUpvoted(true)
    }
    saveUpvotes(upvotes)
  }, [listingId])

  return { isUpvoted, toggle }
}
