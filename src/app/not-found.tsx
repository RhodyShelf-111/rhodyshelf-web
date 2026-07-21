import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { NotFoundContent } from "@/components/layout/not-found-content"

export default function NotFound() {
  // Root-level not-found sits outside the (browse) group, so it doesn't inherit
  // the browse chrome — render the header/footer here so a truly-unwrapped 404
  // still has the brand, navigation, and a way home (not a dead end). 404s that
  // DO fall inside the (browse) group are handled by `(browse)/not-found.tsx`,
  // which reuses NotFoundContent without re-adding chrome (that layout already
  // supplies it) — otherwise the two would stack into a doubled header/footer.
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  )
}
