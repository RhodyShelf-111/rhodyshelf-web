"use client"

import { cn } from "@/lib/utils"

/**
 * Theme-consistent radio row shared by every filter surface (the deals/drops
 * sidebar + sheet and the search bottom sheet). Replaces the browser-native
 * `accent-primary` radios, which rendered as bright white discs in the dark
 * theme. Keeps a real <input type="radio"> for semantics/keyboard, restyled
 * with appearance-none into a hollow ring that fills with a primary dot.
 */
export function FilterRadio({
  name,
  checked,
  onChange,
  label,
  labelClassName,
}: {
  name: string
  checked: boolean
  onChange: () => void
  label: React.ReactNode
  labelClassName?: string
}) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 cursor-pointer">
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          // Every consumer passes a toggle (re-select ⇒ clear), but a radio
          // fires no change event when it's already checked — so the clear
          // branch was unreachable. Catch the click on the active radio and
          // route it to onChange; for an unchecked radio the click precedes
          // the change event while `checked` is still the stale false, so
          // this never double-fires.
          onClick={() => {
            if (checked) onChange()
          }}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-full border-2 border-muted-foreground/40 bg-transparent transition-colors hover:border-muted-foreground/70 checked:border-primary checked:hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
        <span className="pointer-events-none absolute h-2 w-2 scale-0 rounded-full bg-primary transition-transform peer-checked:scale-100" />
      </span>
      <span className={cn("text-sm", labelClassName)}>{label}</span>
    </label>
  )
}

/**
 * The "On Sale Only" switch, shared so both filter surfaces stay identical.
 * A roving div with role="switch" (keyboard + ARIA), not a checkbox, to match
 * the existing visual treatment.
 */
export function OnSaleToggle({
  checked,
  onChange,
  label = "On Sale Only",
}: {
  checked: boolean
  onChange: () => void
  label?: string
}) {
  return (
    // min-h-11: a 44px touch row — the visual switch is 24px tall, and
    // without the taller hit area it was the one sub-44px control left in
    // the mobile filter sheet. The click lives on the row and the name on
    // aria-label because a role="switch" div isn't labelable: a wrapping
    // <label> alone neither makes the text tappable nor names the switch.
    <label
      className="flex min-h-11 items-center gap-3 cursor-pointer"
      onClick={onChange}
    >
      <div
        role="switch"
        aria-checked={checked}
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onChange()
          }
        }}
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-4" : ""
          )}
        />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </label>
  )
}
