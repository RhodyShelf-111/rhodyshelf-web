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
        actions && "flex items-start justify-between gap-4",
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
