import type { Metadata } from "next"
import { DM_Sans, Fraunces } from "next/font/google"
import "./globals.css"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "RhodyShelf — Rhode Island Cannabis Menus & Deals",
    template: "%s | RhodyShelf",
  },
  description:
    "Browse cannabis menus across 8 Rhode Island dispensaries. Find deals, discover new drops, compare prices.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://rhodyshelf.com"
  ),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}
