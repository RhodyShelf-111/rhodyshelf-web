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
      <h1 className="font-heading text-display font-bold text-foreground mb-6">
        Privacy Policy
      </h1>
      <div className="space-y-4 text-muted-foreground">
        <p>Last updated: August 2026</p>
        <p>
          RhodyShelf displays publicly available cannabis menu information from
          Rhode Island dispensaries. We do not collect personal information, require
          account creation, or use tracking cookies beyond the age verification
          cookie required by law. We do measure which pages are visited, in a way
          that stores nothing on your device and does not build a profile of you —
          described under Analytics below.
        </p>
        <h2 className="text-foreground font-semibold text-subhead mt-6">
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
        <h2 className="text-foreground font-semibold text-subhead mt-6">Analytics</h2>
        <p>
          We use PostHog to understand which pages people visit and which
          features get used, so we know what to improve. It runs in cookieless
          mode: nothing is written to cookies, local storage, or session
          storage, and there is no identifier stored on your device. Visitor
          counts are worked out from a one-way hash computed on PostHog&apos;s
          servers, which cannot be reversed to identify you.
        </p>
        <p>
          What we record: the page addresses you visit (which include your
          search terms and filter selections, since those live in the address),
          the site that referred you, clicks on a dispensary&apos;s
          &ldquo;Buy&rdquo; link, upvotes, and how many results a search
          returned. We do not record your screen, your typing, or your mouse
          movements &mdash; session recording is switched off deliberately.
        </p>
        <h2 className="text-foreground font-semibold text-subhead mt-6">
          Third-Party Services
        </h2>
        <p>
          We use Vercel for hosting (which may collect anonymous analytics),
          PostHog for the cookieless analytics described above, and display
          product images hosted by dispensary platforms.
        </p>
        <h2 className="text-foreground font-semibold text-subhead mt-6">Contact</h2>
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
