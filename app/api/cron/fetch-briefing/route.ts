import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase"
import { fetchMarketData } from "@/lib/market-data"
import { fetchDailyBriefing } from "@/lib/anthropic"
import { toDateString, getLastNWorkingDays } from "@/lib/working-days"

export const runtime = "nodejs"
export const maxDuration = 300

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "")
  return secret === process.env.CRON_SECRET
}

async function runPipeline(date: string, db: ReturnType<typeof getServiceClient>) {
  // 1. Fetch market data (external, cheap)
  const market_data = await fetchMarketData()

  // 2. Fetch AI briefing — EXPENSIVE (web search). Runs EXACTLY ONCE; never retried.
  //    A downstream failure (DB write, prune) must not re-trigger the search.
  const { headlines, macro_events, overnight_summary } = await fetchDailyBriefing()

  // 3. Upsert to daily_briefings. This is the only step worth retrying — it's
  //    cheap and the failures here are transient (network/DB blips).
  let upsertErr: string | null = null
  for (let i = 0; i < 3; i++) {
    const { error } = await db.from("daily_briefings").upsert(
      { date, market_data, headlines, macro_events, overnight_summary, created_at: new Date().toISOString() },
      { onConflict: "date" }
    )
    if (!error) {
      upsertErr = null
      break
    }
    upsertErr = error.message
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
  }
  if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr}`)

  // 4. Prune records older than 5 working days
  const cutoff = getLastNWorkingDays(5)
  const oldest = cutoff[cutoff.length - 1]
  const cutoffDate = toDateString(oldest)

  await db.from("daily_briefings").delete().lt("date", cutoffDate)
  await db.from("article_talking_points").delete().lt("briefing_date", cutoffDate)
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getServiceClient()
  const date = toDateString(new Date())

  // No outer retry loop: the web search inside runPipeline is expensive and must
  // fire at most once per invocation. The web-search call (lib/anthropic.ts) and
  // the DB upsert have their own narrow, cheap retries.
  try {
    await runPipeline(date, db)

    await db.from("cron_logs").insert({
      job_name: "fetch-briefing",
      status: "success",
      error_message: null,
    })

    return NextResponse.json({ ok: true, date })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db.from("cron_logs").insert({
      job_name: "fetch-briefing",
      status: "error",
      error_message: msg,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
