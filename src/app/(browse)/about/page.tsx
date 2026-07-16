import Link from "next/link"
import { PageContainer } from "@/components/layout/page-container"
import type { Metadata } from "next"

const TITLE = "About RhodyShelf"
const DESCRIPTION =
  "RhodyShelf aggregates cannabis menus from Rhode Island dispensaries into one searchable place. How we source data, how often it updates, and how to reach us."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", title: `${TITLE} | RhodyShelf`, description: DESCRIPTION, url: "/about" },
}

export default function AboutPage() {
  return (
    <PageContainer className="max-w-3xl py-12">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-6">
        About RhodyShelf
      </h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          RhodyShelf brings every Rhode Island cannabis dispensary menu into one
          searchable place. Instead of opening nine different websites, you can
          search products, compare prices across the state, spot deals, and find
          new drops — then head to the dispensary&apos;s own site to buy.
        </p>

        <h2 className="text-foreground font-semibold text-lg mt-6">
          How we source our data
        </h2>
        <p>
          We aggregate publicly available menu information published by licensed
          Rhode Island dispensaries and their menu platforms (including Dutchie,
          iHeartJane, Leafly, SweedPOS, Leaflogix, and Dispense). Menus are
          refreshed throughout the day, and each listing shows when its price
          was last seen so you know how fresh it is.
        </p>
        <p>
          Prices and availability are indicative, not real-time — always confirm
          with the dispensary before you go. RhodyShelf is an independent
          information service and is not affiliated with any dispensary.
        </p>

        <h2 className="text-foreground font-semibold text-lg mt-6">
          Who it&apos;s for
        </h2>
        <p>
          RhodyShelf is for adults 21 and older shopping the legal recreational
          cannabis market in Rhode Island. It is provided for informational
          purposes only and is not medical advice.
        </p>

        <h2 className="text-foreground font-semibold text-lg mt-6">Contact</h2>
        <p>
          Questions, corrections, or a dispensary that should be listed? Email us
          at{" "}
          <a
            href="mailto:hello@rhodyshelf.com"
            className="text-primary hover:underline"
          >
            hello@rhodyshelf.com
          </a>
          .
        </p>
        <p className="pt-2">
          <Link href="/dispensary" className="text-primary hover:underline">
            Browse Rhode Island dispensaries →
          </Link>
        </p>
      </div>
    </PageContainer>
  )
}
