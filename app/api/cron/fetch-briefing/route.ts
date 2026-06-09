import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase"
import { fetchMarketData } from "@/lib/twelve-data"
import { fetchDailyBriefing } from "@/lib/anthropic"
import { toDateString, getLastNWorkingDays } from "@/lib/working-days"

export const runtime = "nodejs"
export const maxDuration = 300

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "")
  return secret === process.env.CRON_SECRET
}

async function runPipeline(date: string, db: ReturnType<typeof getServiceClient>) {
  // 1. Fetch market data
  const market_data = await fetchMarketData()

  // 2. Fetch AI briefing
  const { headlines, macro_events, overnight_summary } = await fetchDailyBriefing()

  // 3. Upsert to daily_briefings
  const { error } = await db.from("daily_briefings").upsert(
    { date, market_data, headlines, macro_events, overnight_summary },
    { onConflict: "date" }
  )
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`)

  // 4. Prune records older than 5 working days
  const cutoff = getLastNWorkingDays(5)
  const oldest = cutoff[cutoff.length - 1]
  const cutoffDate = toDateString(oldest)

  await db.from("daily_briefings").delete().lt("date", cutoffDate)
  await db.from("article_talking_points").delete().lt("briefing_date", cutoffDate)
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getServiceClient()
  const date = toDateString(new Date())
  let attempt = 0

  while (attempt < 3) {
    try {
      await runPipeline(date, db)

      await db.from("cron_logs").insert({
        job_name: "fetch-briefing",
        status: "success",
        error_message: null,
      })

      return NextResponse.json({ ok: true, date })
    } catch (err) {
      attempt++
      if (attempt === 3) {
        const msg = err instanceof Error ? err.message : String(err)
        await db.from("cron_logs").insert({
          job_name: "fetch-briefing",
          status: "error",
          error_message: msg,
        })
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      await new Promise((r) => setTimeout(r, attempt === 1 ? 10_000 : 30_000))
    }
  }

  return NextResponse.json({ error: "Max retries reached" }, { status: 500 })
}
