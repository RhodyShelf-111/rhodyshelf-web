import { PageContainer } from "@/components/layout/page-container"
import { pageOpenGraph } from "@/lib/seo/og"
import type { Metadata } from "next"

// ISR so the footer (async, fetches dispensaries) can self-heal instead of
// baking a degraded or stale dispensary column into a build-time-only page.
export const revalidate = 86400

const DESCRIPTION =
  "RhodyShelf terms of use: an informational cannabis menu service for adults 21+ in Rhode Island. Not a dispensary."

export const metadata: Metadata = {
  title: "Terms of Use",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: pageOpenGraph({
    title: "Terms of Use",
    description: DESCRIPTION,
    url: "/terms",
  }),
}

export default function TermsPage() {
  return (
    <PageContainer className="max-w-3xl py-12">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-6">
        Terms of Use
      </h1>
      <div className="space-y-4 text-muted-foreground">
        <p>Last updated: March 2026</p>
        <p>
          By using RhodyShelf, you confirm that you are 21 years of age or older
          and legally permitted to view cannabis-related content in your
          jurisdiction.
        </p>
        <h2 className="text-foreground font-semibold text-lg mt-6">
          Accuracy of Information
        </h2>
        <p>
          Product information, prices, and availability are sourced from
          dispensary menus and may not reflect real-time inventory. Always verify
          with the dispensary before visiting. RhodyShelf is not responsible for
          inaccuracies in dispensary-provided data.
        </p>
        <h2 className="text-foreground font-semibold text-lg mt-6">
          Not a Dispensary
        </h2>
        <p>
          RhodyShelf is an information service. We do not sell, distribute, or
          deliver cannabis products. All purchases must be made directly at
          licensed Rhode Island dispensaries.
        </p>
        <h2 className="text-foreground font-semibold text-lg mt-6">
          Limitation of Liability
        </h2>
        <p>
          RhodyShelf is provided &quot;as is&quot; without warranties of any kind.
          We are not liable for decisions made based on the information displayed
          on this site.
        </p>
      </div>
    </PageContainer>
  )
}
