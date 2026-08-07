import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { createServiceClient } from "@/lib/supabase/service-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Attempts allowed per IP hash per window. Generous for a human browsing
 *  (a heavy session upvotes a handful of products), cheap for a script to hit. */
const RATE_LIMIT = 30
const RATE_WINDOW = "1 hour"

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

function hashIp(ip: string): string {
  const salt = process.env.UPVOTE_SALT
  if (!salt) throw new Error("UPVOTE_SALT not set")
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex")
}

export async function POST(req: NextRequest) {
  let body: { product_id?: string; action?: "add" | "remove" }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const { product_id, action } = body
  if (
    !product_id ||
    !UUID_RE.test(product_id) ||
    (action !== "add" && action !== "remove")
  ) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }

  try {
    const ipHash = hashIp(getIp(req))
    const supabase = createServiceClient()

    // Counts attempts, not stored rows — a remove deletes its row and a repeat
    // add is a no-op upsert, so either would otherwise be free to repeat.
    // Fails OPEN: if the limiter itself is unavailable, letting votes through
    // beats breaking upvoting for everyone over a table this small.
    const { data: allowed, error: limitError } = await supabase.rpc(
      "check_upvote_rate_limit",
      { p_ip_hash: ipHash, p_limit: RATE_LIMIT, p_window: RATE_WINDOW }
    )
    if (limitError) {
      console.error("[api/upvote] rate limit check failed, allowing", limitError)
    } else if (allowed === false) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429 }
      )
    }

    if (action === "add") {
      const { error } = await supabase
        .from("product_upvotes")
        .upsert(
          { product_id, ip_hash: ipHash },
          { onConflict: "product_id,ip_hash", ignoreDuplicates: true }
        )
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("product_upvotes")
        .delete()
        .eq("product_id", product_id)
        .eq("ip_hash", ipHash)
      if (error) throw error
    }

    // Deliberately no count in the response. Returning it made this endpoint a
    // public count oracle: `action: "remove"` for a product the caller never
    // upvoted deletes zero rows, does not error, and used to still hand back
    // that product's total — readable and enumerable for every product, with no
    // vote required. The client fires and forgets and never reads the body
    // (see postUpvote in src/hooks/use-upvotes.ts), so nothing needs it.
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api/upvote]", err)
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 })
  }
}
