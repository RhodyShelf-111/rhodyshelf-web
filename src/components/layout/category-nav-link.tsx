"use client"

import type { ReactNode, MouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { carryFilterParams } from "@/lib/filter-params"

/**
 * A category chip that carries the shopper's active filters across the
 * switch: a plain left-click on /category/flower?brand=Sweetspot lands on
 * /category/concentrate?brand=Sweetspot instead of a reset page.
 *
 * The carry happens at click time (window.location), so the server-rendered
 * href stays the clean canonical /category/[slug] for crawlers and for
 * new-tab/copy-link affordances — modifier and non-left clicks fall through
 * to the plain link untouched.
 */
export function CategoryNavLink({
  href,
  className,
  ariaCurrent,
  children,
}: {
  href: string
  className?: string
  ariaCurrent?: "page"
  children: ReactNode
}) {
  const router = useRouter()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return
    }
    const carried = carryFilterParams(window.location.search)
    if (!carried) return
    e.preventDefault()
    router.push(`${href}?${carried}`)
  }

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={ariaCurrent}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  )
}
