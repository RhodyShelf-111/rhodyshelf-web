import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import fs from "node:fs"
import path from "node:path"

// Mock the data layer so the route's branching (validation, rate limit,
// add/remove, error paths) is what's under test — not Supabase.
const rpc = vi.fn()
const upsert = vi.fn()
const deleteEq = vi.fn()

/** `.delete().eq().eq()` — chainable, and awaitable at the end of the chain. */
function deleteChain(result: { error: unknown }) {
  const chain = {
    eq: (...args: unknown[]) => {
      deleteEq(...args)
      return chain
    },
    then: (resolve: (v: { error: unknown }) => unknown) => resolve(result),
  }
  return chain
}

let deleteResult: { error: unknown } = { error: null }

const from = vi.fn(() => ({
  upsert: (...a: unknown[]) => upsert(...a),
  delete: () => deleteChain(deleteResult),
}))

vi.mock("@/lib/supabase/service-client", () => ({
  createServiceClient: () => ({
    rpc: (...a: unknown[]) => rpc(...a),
    from: (...a: unknown[]) => from(...(a as [])),
  }),
}))

import { POST } from "./route"

const PRODUCT_ID = "0f9d2b1a-4c3e-4b5a-8d7f-1e2a3b4c5d6e"

function req(body: unknown) {
  return new NextRequest("http://localhost/api/upvote", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("UPVOTE_SALT", "test-salt")
  // Default: under the limit, writes succeed.
  rpc.mockResolvedValue({ data: true, error: null })
  upsert.mockResolvedValue({ error: null })
  deleteResult = { error: null }
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("POST /api/upvote", () => {
  describe("happy paths", () => {
    it("records an add and reports success", async () => {
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({ ok: true })
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: PRODUCT_ID }),
        expect.objectContaining({ ignoreDuplicates: true })
      )
    })

    it("records a remove scoped to both the product and the caller", async () => {
      const res = await POST(req({ product_id: PRODUCT_ID, action: "remove" }))
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({ ok: true })
      // Scoped by product AND ip_hash — never a blanket delete for the product.
      expect(deleteEq).toHaveBeenCalledWith("product_id", PRODUCT_ID)
      expect(deleteEq).toHaveBeenCalledTimes(2)
      expect(deleteEq.mock.calls[1][0]).toBe("ip_hash")
    })

    it("hashes the IP rather than storing it, and salts it", async () => {
      await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      const row = upsert.mock.calls[0][0] as { ip_hash: string }
      expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/)
      expect(row.ip_hash).not.toContain("1.2.3.4")
    })
  })

  // Regression: a `remove` for a product the caller never upvoted deletes zero
  // rows, does not error, and used to still return that product's total — which
  // made every product's count publicly readable and enumerable, with no vote
  // required and no rate limit. The response must never carry a count again.
  describe("count oracle (regression)", () => {
    it("omits the upvote count from an add response", async () => {
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(await res.json()).not.toHaveProperty("count")
    })

    it("omits the upvote count from a remove response", async () => {
      const res = await POST(req({ product_id: PRODUCT_ID, action: "remove" }))
      expect(await res.json()).not.toHaveProperty("count")
    })

    it("never reads product_upvote_counts", async () => {
      await POST(req({ product_id: PRODUCT_ID, action: "remove" }))
      expect(from).not.toHaveBeenCalledWith("product_upvote_counts")
    })
  })

  describe("rate limiting", () => {
    it("counts the attempt before writing", async () => {
      await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(rpc).toHaveBeenCalledWith(
        "check_upvote_rate_limit",
        expect.objectContaining({
          p_ip_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
          p_limit: 30,
          p_window: "1 hour",
        })
      )
    })

    it("rejects with 429 once the cap is exceeded", async () => {
      rpc.mockResolvedValue({ data: false, error: null })
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(res.status).toBe(429)
      await expect(res.json()).resolves.toEqual({
        ok: false,
        error: "rate_limited",
      })
    })

    it("performs no write when rate limited", async () => {
      rpc.mockResolvedValue({ data: false, error: null })
      await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(upsert).not.toHaveBeenCalled()
    })

    it("rate limits removes too, not just adds", async () => {
      rpc.mockResolvedValue({ data: false, error: null })
      const res = await POST(req({ product_id: PRODUCT_ID, action: "remove" }))
      expect(res.status).toBe(429)
      expect(deleteEq).not.toHaveBeenCalled()
    })

    // Fail OPEN: a limiter outage must not break upvoting for everyone.
    it("allows the write when the limiter itself errors", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "boom" } })
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(res.status).toBe(200)
      expect(upsert).toHaveBeenCalled()
    })

    it("logs the limiter failure so a silent outage is visible", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "boom" } })
      await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("rate limit"),
        expect.anything()
      )
    })
  })

  describe("input validation", () => {
    it("rejects a malformed body", async () => {
      const res = await POST(req("not json"))
      expect(res.status).toBe(400)
      await expect(res.json()).resolves.toEqual({
        ok: false,
        error: "invalid_json",
      })
      expect(rpc).not.toHaveBeenCalled()
    })

    it("rejects a product_id that is not a UUID", async () => {
      const res = await POST(req({ product_id: "'; drop table --", action: "add" }))
      expect(res.status).toBe(400)
      expect(rpc).not.toHaveBeenCalled()
    })

    it("rejects a missing product_id", async () => {
      const res = await POST(req({ action: "add" }))
      expect(res.status).toBe(400)
    })

    it("rejects an unknown action", async () => {
      const res = await POST(req({ product_id: PRODUCT_ID, action: "delete_all" }))
      expect(res.status).toBe(400)
    })

    it("rejects a missing action", async () => {
      const res = await POST(req({ product_id: PRODUCT_ID }))
      expect(res.status).toBe(400)
    })
  })

  describe("failure paths", () => {
    it("returns 500 when UPVOTE_SALT is not configured", async () => {
      vi.stubEnv("UPVOTE_SALT", "")
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(res.status).toBe(500)
      await expect(res.json()).resolves.toEqual({ ok: false, error: "db_error" })
    })

    it("returns 500 when the add write fails", async () => {
      upsert.mockResolvedValue({ error: { message: "insert failed" } })
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(res.status).toBe(500)
    })

    it("returns 500 when the remove write fails", async () => {
      deleteResult = { error: { message: "delete failed" } }
      const res = await POST(req({ product_id: PRODUCT_ID, action: "remove" }))
      expect(res.status).toBe(500)
    })

    it("never leaks the underlying error to the caller", async () => {
      upsert.mockResolvedValue({ error: { message: "relation does not exist" } })
      const res = await POST(req({ product_id: PRODUCT_ID, action: "add" }))
      expect(JSON.stringify(await res.json())).not.toContain("relation")
    })
  })
})

// The window-rollover and atomicity semantics live in SQL, which vitest/jsdom
// cannot execute — there is no database in this test environment. These assert
// the migration text instead, so the properties the route depends on cannot be
// silently edited away.
describe("upvote_rate_limit migration", () => {
  const sql = (() => {
    const dir = path.resolve(process.cwd(), "supabase/migrations")
    const file = fs
      .readdirSync(dir)
      .find((f) => f.endsWith("_upvote_rate_limit.sql"))
    if (!file) throw new Error("upvote_rate_limit migration not found")
    return fs.readFileSync(path.join(dir, file), "utf8")
  })()

  it("counts attempts in a single atomic upsert", () => {
    expect(sql).toMatch(/on conflict \(ip_hash\) do update/i)
    expect(sql).toMatch(/returning r\.n into v_n/i)
  })

  it("rolls the window over instead of counting forever", () => {
    expect(sql).toMatch(/window_start < now\(\) - p_window/i)
  })

  it("denies anon access to the table and the function", () => {
    expect(sql).toMatch(/enable row level security/i)
    expect(sql).toMatch(/revoke all on function[\s\S]*from public, anon, authenticated/i)
  })

  it("declares no RLS policy, so the table is deny-all outside the service role", () => {
    expect(sql).not.toMatch(/create policy/i)
  })

  // Supabase grants ALL on a new public table to anon/authenticated. RLS with no
  // policies already returns them nothing, but the grant contradicts the table
  // comment and is one `create policy` away from mattering. This caught it in
  // production (has_table_privilege('anon', …, 'SELECT') was true after the first
  // migration), so keep a test on the follow-up revoke.
  it("revokes the default anon table grants Supabase auto-applies", () => {
    const dir = path.resolve(process.cwd(), "supabase/migrations")
    const file = fs
      .readdirSync(dir)
      .find((f) => f.endsWith("_upvote_rate_limit_revoke_table_grants.sql"))
    expect(file, "revoke-table-grants migration is missing").toBeDefined()
    const revokeSql = fs.readFileSync(path.join(dir, file!), "utf8")
    expect(revokeSql).toMatch(
      /revoke all on table public\.upvote_rate_limit from anon, authenticated/i
    )
  })
})
