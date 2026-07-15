import { cn } from "@/lib/utils"

/**
 * Standard page header: a bold display title with an optional muted
 * description, and optional trailing actions aligned to the right.
 *
 * Every list/detail page used to hand-roll this block, and it drifted —
 * /search rendered its title at `text-2xl` with a `text-sm` subtitle while
 * every other page used `text-3xl` with a base subtitle. Centralizing keeps
 * them identical. `description` is a node (not just a string) so pages with a
 * richer subtitle (icon + multiple lines) can still use it.
 */
export function PageHeading({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-6",
        // Stack the title and actions on mobile so a long title + a "Visit
        // Site"-style action don't cramp into one narrow row; side-by-side on sm+.
        actions &&
          "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {title}
        </h1>
        {description != null && (
          <div className="text-muted-foreground mt-1">{description}</div>
        )}
      </div>
      {actions}
    </div>
  )
}
