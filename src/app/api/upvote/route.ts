import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { createServiceClient } from "@/lib/supabase/service-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

  const { product_id, action } = body
  if (!product_id || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }

  try {
    const ipHash = hashIp(getIp(req))
    const supabase = createServiceClient()

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

    const { data } = await supabase
      .from("product_upvote_counts")
      .select("upvote_count")
      .eq("product_id", product_id)
      .maybeSingle()

    return NextResponse.json({ ok: true, count: data?.upvote_count ?? 0 })
  } catch (err) {
    console.error("[api/upvote]", err)
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 })
  }
}
