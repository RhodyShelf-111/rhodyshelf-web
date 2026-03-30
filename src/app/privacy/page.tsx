import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Privacy Policy
      </h1>
      <div className="prose prose-gray max-w-none space-y-4 text-muted-foreground">
        <p>Last updated: March 2026</p>
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
          remember your age verification. We store product upvotes in your
          browser&apos;s local storage. Neither of these are transmitted to our
          servers.
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
    </div>
  )
}
