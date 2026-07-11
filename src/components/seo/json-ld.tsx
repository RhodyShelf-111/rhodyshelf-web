/**
 * Renders a schema.org JSON-LD block. Server component — safe to drop into any
 * server-rendered page. The `<` escaping prevents the serialized JSON from
 * breaking out of the <script> tag (same guard used by Breadcrumbs).
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[]
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
