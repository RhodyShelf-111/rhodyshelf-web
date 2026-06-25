import type { Metadata } from "next"
import { SavedClient } from "./saved-client"

export const metadata: Metadata = {
  title: "Saved",
  description:
    "Your saved Rhode Island cannabis products — everything you've upvoted, kept in one place on this device.",
  // Personal, device-local list — no value in indexing.
  robots: { index: false, follow: true },
}

export default function SavedPage() {
  return <SavedClient />
}
