import { SOCIAL_PROFILES } from "@/lib/social"
import { cn } from "@/lib/utils"

/**
 * Instagram glyph, inlined. lucide-react v1 ships no brand icons, so this is a
 * hand-rolled mark drawn on the same 24x24 grid / 2px stroke as the lucide
 * icons used elsewhere, keeping the footer visually consistent.
 */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Keying ICONS to the profile-name union (rather than `string`) turns "added a
 *  profile, forgot the icon" into a build error. With a plain `string` key the
 *  lookup types as always-defined but resolves to undefined at runtime, which
 *  would throw in the footer and blank every page on the site. */
type SocialName = (typeof SOCIAL_PROFILES)[number]["name"]

const ICONS: Record<SocialName, typeof InstagramIcon> = {
  Instagram: InstagramIcon,
}

/**
 * Links to the official RhodyShelf profiles. Rendered in the footer, so it's
 * present on every page — which is also what makes the Organization JSON-LD
 * `sameAs` claim verifiable by crawlers (they expect a real link).
 *
 * Glyph *and* visible name: this footer is otherwise built entirely from text
 * links, and a lone monochrome mark reads as decoration. The `title` tooltip
 * that would otherwise carry the network name never fires on touch, which is
 * most of this site's traffic. The name is the accessible name too — no
 * aria-label, which would only risk diverging from the visible text.
 */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {SOCIAL_PROFILES.map((profile) => {
        const Icon = ICONS[profile.name]
        return (
          <li key={profile.name}>
            {/* rel: `noopener` is the token that carries the security property
                (no window.opener back-reference). `noreferrer` additionally
                suppresses the Referer header — a deliberate tradeoff. It costs
                attribution (clicks land in Instagram Insights as "direct"
                rather than referred), but it also stops Meta learning that a
                given visitor was browsing specific cannabis products here.
                Visitor privacy wins on a regulated vertical; drop `noreferrer`
                if follower attribution turns out to matter more.
                `me` is an optional identity hint, not an SEO signal. */}
            <a
              href={profile.url}
              target="_blank"
              rel="me noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {profile.name}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
