import type { Metadata, Viewport } from "next"
import { Space_Grotesk } from "next/font/google"
import "./globals.css"

// Display/heading face. Exposed as --font-display and mapped onto the
// `font-heading` Tailwind token in globals.css.
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
})

const SITE_NAME = "RhodyShelf"
const SITE_DESCRIPTION =
  "Browse cannabis menus across 9 Rhode Island dispensaries in one place. Search products, compare prices, find deals, and see where to buy."

export const metadata: Metadata = {
  title: {
    default: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
    template: "%s | RhodyShelf",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"
  ),
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  // Only `card` here: pages that set their own openGraph (product, brand, …)
  // then fall back to their og:title/og:description on X, instead of every page
  // inheriting the generic homepage Twitter title/description. twitter-image.png
  // still supplies the sitewide default card image.
  twitter: {
    card: "summary_large_image",
  },
  // Search-engine ownership verification. Inert until the matching env var is
  // set in Vercel (DNS TXT is the primary method; this is a paste-a-token
  // fallback). Tokens are public in the HTML anyway.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_SITE_VERIFICATION,
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
  // Site-wide crawl defaults. Individual pages (e.g. /search, /saved) override
  // `robots` to opt out of indexing.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
}

// viewport-fit=cover lets the page (and the product bottom sheet) extend into the
// notch / home-indicator zones so `env(safe-area-inset-*)` returns real values on
// modern phones; without it those insets are always 0. themeColor tints the
// mobile browser chrome to match the app's near-black background, and colorScheme
// tells the UA this is a dark surface (correct form controls, no white flashes).
export const viewport: Viewport = {
  themeColor: "#0a0f0a",
  colorScheme: "dark",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark h-full antialiased ${display.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
