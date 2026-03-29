import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client reading from WeedShelf prod DB.
 * Used server-side only — current_inventory and product_events require service-role.
 *
 * NEVER import this in client components or expose the key.
 * The 'server-only' import guard will cause a build error if a client component tries.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}
