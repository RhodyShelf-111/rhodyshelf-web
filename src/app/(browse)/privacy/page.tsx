import { PageContainer } from "@/components/layout/page-container"
import { pageOpenGraph } from "@/lib/seo/og"
import type { Metadata } from "next"

// ISR so the footer (async, fetches dispensaries) can self-heal instead of
// baking a degraded or stale dispensary column into a build-time-only page.
export const revalidate = 86400

const DESCRIPTION =
  "How RhodyShelf handles data: no accounts, no personal information, and what our analytics and session recording collect."

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
          Rhode Island dispensaries. We do not collect personal information or
          require account creation. We do use analytics cookies to measure how the
          site is used, including session recordings of how pages are used —
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
          features get used, so we know what to improve. PostHog sets cookies in
          your browser to recognise return visits. We have no accounts, so this
          is never linked to a name, email, or any identity we hold.
        </p>
        <p>
          What we record: the page addresses you visit (which include your
          search terms and filter selections, since those live in the address),
          the site that referred you, clicks on a dispensary&apos;s
          &ldquo;Buy&rdquo; link, upvotes, and how many results a search
          returned.
        </p>
        <p>
          We also record browsing sessions &mdash; a replay of the pages you
          view and how you move through them &mdash; so we can see where the
          site is confusing. Anything you type into a field is masked before it
          leaves your browser, and we do not record network requests or browser
          console output. Recordings are deleted after 30 days.
        </p>
        <h2 className="text-foreground font-semibold text-subhead mt-6">
          Third-Party Services
        </h2>
        <p>
          We use Vercel for hosting (which may collect anonymous analytics),
          PostHog for the analytics and session recording described above, and
          display product images hosted by dispensary platforms.
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
