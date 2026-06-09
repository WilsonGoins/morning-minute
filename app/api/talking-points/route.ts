import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase"
import { generateTalkingPoints } from "@/lib/anthropic"
import { checkRateLimit } from "@/lib/rate-limit"
import { hashUrl } from "@/lib/hash"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1"
  const { success, remaining } = await checkRateLimit(ip)

  if (!success) {
    return NextResponse.json(
      {
        error:
          "You've generated a lot of talking points this hour — try again shortly.",
      },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    )
  }

  const body = await req.json()
  const { title, summary, url, briefing_date } = body as {
    title: string
    summary: string
    url: string
    briefing_date: string
  }

  if (!title || !url || !briefing_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const urlHash = hashUrl(url)
  const db = getServiceClient()

  // Cache check
  const { data: cached } = await db
    .from("article_talking_points")
    .select("talking_points, claim_count")
    .eq("article_url_hash", urlHash)
    .eq("briefing_date", briefing_date)
    .single()

  if (cached) {
    return NextResponse.json({
      talking_points: cached.talking_points,
      claim_count: cached.claim_count,
      cached: true,
    })
  }

  // Generate fresh
  const talking_points = await generateTalkingPoints(title, summary ?? "", url)

  await db.from("article_talking_points").upsert(
    {
      article_url_hash: urlHash,
      article_title: title,
      briefing_date,
      talking_points,
      claim_count: 0,
    },
    { onConflict: "article_url_hash,briefing_date" }
  )

  return NextResponse.json({ talking_points, claim_count: 0, cached: false })
}
