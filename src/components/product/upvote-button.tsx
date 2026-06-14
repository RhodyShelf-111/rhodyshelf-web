"use client"

import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpvotes } from "@/hooks/use-upvotes"
import { Button } from "@/components/ui/button"

interface UpvoteButtonProps {
  productId: string
  /** When true, render a labeled pill ("Upvote" / "Upvoted") instead of an icon button. */
  withLabel?: boolean
  className?: string
}

/**
 * Client island for the upvote control so server-rendered surfaces (the full
 * product page) can offer the same upvote as the cards and drawer.
 */
export function UpvoteButton({ productId, withLabel, className }: UpvoteButtonProps) {
  const { isUpvoted, toggle } = useUpvotes(productId)

  if (withLabel) {
    return (
      <Button
        variant={isUpvoted ? "default" : "outline"}
        onClick={toggle}
        aria-pressed={isUpvoted}
        className={cn("gap-1.5", className)}
      >
        <ChevronUp className={cn("w-5 h-5", isUpvoted && "stroke-[3]")} />
        {isUpvoted ? "Upvoted" : "Upvote"}
      </Button>
    )
  }

  return (
    <Button
      variant={isUpvoted ? "default" : "outline"}
      size="icon"
      onClick={toggle}
      aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
      aria-pressed={isUpvoted}
      className={className}
    >
      <ChevronUp className={cn("w-5 h-5", isUpvoted && "stroke-[3]")} />
    </Button>
  )
}
