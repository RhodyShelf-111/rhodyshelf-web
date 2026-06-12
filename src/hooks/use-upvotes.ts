"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "rhodyshelf_upvotes"

// Module-level pub/sub — every useUpvotes instance subscribes so a toggle
// anywhere (card, detail drawer, full page) updates all mounted consumers.
const listeners = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb()
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage)
  }
  return () => {
    listeners.delete(cb)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage)
    }
  }
}

function notify() {
  for (const cb of listeners) cb()
}

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function writeStorage(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage full or unavailable
  }
}

function postUpvote(product_id: string, action: "add" | "remove") {
  fetch("/api/upvote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id, action }),
    keepalive: true,
  }).catch((err) => {
    console.warn("[useUpvotes] POST failed", err)
  })
}

// Always return `false` during SSR + first client render so hydration matches.
const getServerSnapshot = () => false

export function useUpvotes(productId: string) {
  const isUpvoted = useSyncExternalStore(
    subscribe,
    () => readStorage().has(productId),
    getServerSnapshot
  )

  const toggle = useCallback(() => {
    const upvotes = readStorage()
    const action: "add" | "remove" = upvotes.has(productId) ? "remove" : "add"
    if (action === "remove") {
      upvotes.delete(productId)
    } else {
      upvotes.add(productId)
    }
    writeStorage(upvotes)
    notify() // all mounted useUpvotes consumers re-read instantly
    postUpvote(productId, action)
  }, [productId])

  return { isUpvoted, toggle }
}
