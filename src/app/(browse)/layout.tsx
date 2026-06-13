import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AgeGate } from "@/components/layout/age-gate"

// No request APIs here (no cookies/headers): the age-gate cookie is checked
// client-side inside AgeGate so every browse route stays static/ISR-cacheable.
export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AgeGate />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
