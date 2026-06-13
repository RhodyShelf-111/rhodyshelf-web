import { redirect } from "next/navigation"

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Redirect /menu -> /search, mapping old param names to new ones
  const resolved = await searchParams
  const params = new URLSearchParams()
  const get = (key: string) => {
    const value = resolved[key]
    return typeof value === "string" ? value : undefined
  }

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
