"use client"

import Image from "next/image"
import { getCategoryIcon } from "@/lib/utils"

interface ProductHeroImageProps {
  imageUrl: string | null
  alt: string
  category: string
}

/**
 * Hero product image with a broken-image fallback, mirroring ProductCard.
 * A client island because the server product page can't attach onError.
 * Dispensary CDN URLs are third-party and rot, so a dead URL falls back to
 * the category emoji instead of a broken-image glyph on the page's focal point.
 */
export function ProductHeroImage({ imageUrl, alt, category }: ProductHeroImageProps) {
  return (
    <>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain p-6"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            target.style.display = "none"
            const fallback = target.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = "flex"
          }}
        />
      ) : null}
      <div
        className="absolute inset-0 items-center justify-center text-6xl"
        style={{ display: imageUrl ? "none" : "flex" }}
        aria-hidden="true"
      >
        {getCategoryIcon(category)}
      </div>
    </>
  )
}
