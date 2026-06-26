// Fallback for the @modal slot. Renders nothing when no product drawer is
// active — i.e. on every normal browse page, and on a hard load / refresh of a
// route the slot can't recover (where it would otherwise 404 the whole page).
export default function ModalDefault() {
  return null
}
