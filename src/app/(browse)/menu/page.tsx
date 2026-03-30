import { redirect } from "next/navigation"

export default function MenuPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  // Redirect /menu -> /search, mapping old param names to new ones
  const params = new URLSearchParams()
  const get = (key: string) =>
    typeof searchParams[key] === "string" ? searchParams[key] : undefined

  const category = get("category")
  const brand = get("brand")
  const dispensary = get("dispensary")
  const search = get("search")
  const sale = get("sale")

  if (category) params.set("category", category)
  if (brand) params.set("brand", brand)
  if (dispensary) params.set("dispensary", dispensary)
  if (search) params.set("q", search)
  if (sale) params.set("sale", sale)

  const qs = params.toString()
  redirect(`/search${qs ? `?${qs}` : ""}`)
}
