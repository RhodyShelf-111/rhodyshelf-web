"use client"

import Image from "next/image"
import { CategoryIcon } from "@/components/ui/category-icon"

interface ProductHeroImageProps {
  imageUrl: string | null
  alt: string
  category: string
}

/**
 * Hero product image with a broken-image fallback, mirroring ProductCard.
 * A client island because the server product page can't attach onError.
 * Dispensary CDN URLs are third-party and rot, so a dead URL falls back to the
 * category glyph instead of a broken-image icon on the page's focal point.
 */
export function ProductHeroImage({ imageUrl, alt, category }: ProductHeroImageProps) {
  return (
    <>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          // The hero is the product page's LCP element and there's only one
          // candidate, so preloading it is right here. (`priority` is the
          // deprecated Next 15 spelling of this.)
          preload
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            target.style.display = "none"
            const fallback = target.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = "flex"
          }}
        />
      ) : null}
      <div
        className="absolute inset-0 items-center justify-center"
        style={{ display: imageUrl ? "none" : "flex" }}
      >
        <CategoryIcon
          category={category}
          className="size-16 text-product-plate-foreground"
        />
      </div>
    </>
  )
}
