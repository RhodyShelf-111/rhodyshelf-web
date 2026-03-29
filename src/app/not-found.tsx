import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <span className="text-5xl opacity-30 block mb-4">🌿</span>
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/menu"
          className="inline-flex items-center justify-center h-8 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Browse the full menu
        </Link>
      </div>
    </div>
  )
}
