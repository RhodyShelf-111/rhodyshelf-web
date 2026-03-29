import { cookies } from "next/headers"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AgeGate } from "@/components/layout/age-gate"

export default async function BrowseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const ageVerified =
    cookieStore.get("rhodyshelf_age_verified")?.value === "true"

  return (
    <>
      {!ageVerified && <AgeGate />}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
