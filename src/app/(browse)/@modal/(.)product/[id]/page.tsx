import { getListingById } from "@/lib/queries/products"
import { ProductDrawer } from "@/components/product/product-drawer"
import { ProductQuickLook } from "@/components/product/product-quick-look"
import { SheetTitle } from "@/components/ui/sheet"

// Intercepts client-side navigations to /product/[id] from anywhere in
// (browse) and renders the product as a quick-look drawer over the current
// page, instead of navigating away. `(.)` matches the same route-segment level
// because @modal is a slot, not a segment. A hard load / refresh / shared link
// is NOT intercepted and falls through to the full page at
// src/app/(browse)/product/[id]/page.tsx.
export default async function ProductModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListingById(id)

  return (
    <ProductDrawer>
      {listing ? (
        <ProductQuickLook listing={listing} />
      ) : (
        <div className="p-8 text-center">
          <SheetTitle className="font-medium text-foreground">
            Product not found
          </SheetTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            It may no longer be in stock.
          </p>
        </div>
      )}
    </ProductDrawer>
  )
}
