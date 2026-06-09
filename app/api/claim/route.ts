import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase"
import { hashUrl } from "@/lib/hash"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { url, briefing_date } = body as { url: string; briefing_date: string }

  if (!url || !briefing_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const urlHash = hashUrl(url)
  const db = getServiceClient()

  const { data, error } = await db.rpc("increment_claim_count", {
    p_url_hash: urlHash,
    p_briefing_date: briefing_date,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ claim_count: data })
}
