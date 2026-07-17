import { PageContainer } from "@/components/layout/page-container"
import { pageOpenGraph } from "@/lib/seo/og"
import type { Metadata } from "next"

// ISR so the footer (async, fetches dispensaries) can self-heal instead of
// baking a degraded or stale dispensary column into a build-time-only page.
export const revalidate = 86400

const DESCRIPTION =
  "How RhodyShelf handles data: no accounts, no personal information, and a single age-verification cookie."

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: pageOpenGraph({
    title: "Privacy Policy",
    description: DESCRIPTION,
    url: "/privacy",
  }),
}

export default function PrivacyPage() {
  return (
    <PageContainer className="max-w-3xl py-12">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-6">
        Privacy Policy
      </h1>
      <div className="space-y-4 text-muted-foreground">
        <p>Last updated: June 2026</p>
        <p>
          RhodyShelf displays publicly available cannabis menu information from
          Rhode Island dispensaries. We do not collect personal information, require
          account creation, or use tracking cookies beyond the age verification
          cookie required by law.
        </p>
        <h2 className="text-foreground font-semibold text-lg mt-6">
          Information We Collect
        </h2>
        <p>
          We store a single cookie (<code>rhodyshelf_age_verified</code>) to
          remember your age verification; it contains no personal information.
        </p>
        <p>
          Product upvotes are saved in your browser&apos;s local storage and
          also counted on our servers so totals can be shared across visitors.
          To prevent duplicate votes, each vote is stored with a one-way salted
          hash of your IP address. We never store your raw IP address, and
          votes are not linked to any account, name, or profile.
        </p>
        <h2 className="text-foreground font-semibold text-lg mt-6">
          Third-Party Services
        </h2>
        <p>
          We use Vercel for hosting (which may collect anonymous analytics) and
          display product images hosted by dispensary platforms.
        </p>
        <h2 className="text-foreground font-semibold text-lg mt-6">Contact</h2>
        <p>
          Questions about this policy? Contact us at{" "}
          <a
            href="mailto:hello@rhodyshelf.com"
            className="text-primary hover:underline"
          >
            hello@rhodyshelf.com
          </a>
          .
        </p>
      </div>
    </PageContainer>
  )
}
