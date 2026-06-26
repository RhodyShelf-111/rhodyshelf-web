// Parallel-route slots keep their last active subpage visible across
// client-side navigations. Without this, soft-navigating away while the drawer
// is open (e.g. tapping the dispensary or brand link inside it) would leave the
// drawer stranded on top of the new page. Matching every other route to a slot
// that renders nothing closes the drawer on any such navigation.
export default function ModalCatchAll() {
  return null
}
