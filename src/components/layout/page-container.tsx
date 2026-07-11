import { cn } from "@/lib/utils"

/**
 * The single source of truth for the site's horizontal content bounds.
 *
 * The header, footer, and every page render their content inside one of these
 * so their left/right edges line up on every viewport. Before this existed the
 * header spanned `max-w-screen-2xl` (1536px, responsive gutters) while most
 * pages used `max-w-7xl` (1280px, flat `px-4`) — so the logo/nav floated ~144px
 * wider than the page content beneath them, and the homepage (which did match
 * the header) looked wider than the rest of the app.
 *
 * Keep the width/gutter classes here and nowhere else. Pages that want a
 * narrower reading measure (product detail, legal copy) pass `max-w-*` in
 * `className`; tailwind-merge lets it win over the default.
 */
export function PageContainer({
  as: Comp = "div",
  className,
  ...props
}: React.ComponentProps<"div"> & { as?: React.ElementType }) {
  return (
    <Comp
      className={cn(
        "mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    />
  )
}
