import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _anon: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _anon
}

// Named export for server components that use the anon client
export const supabase = {
  from: (...args: Parameters<SupabaseClient["from"]>) => getClient().from(...args),
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
