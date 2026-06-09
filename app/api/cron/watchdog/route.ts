import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase"
import { toDateString } from "@/lib/working-days"

export const runtime = "nodejs"
export const maxDuration = 60

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "")
  return secret === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getServiceClient()
  const date = toDateString(new Date())

  const { data } = await db
    .from("daily_briefings")
    .select("id")
    .eq("date", date)
    .single()

  if (data) {
    await db.from("cron_logs").insert({
      job_name: "watchdog",
      status: "success",
      error_message: "briefing exists, no action needed",
    })
    return NextResponse.json({ ok: true, action: "none" })
  }

  // Trigger the primary pipeline
  const origin = req.nextUrl.origin
  const res = await fetch(`${origin}/api/cron/fetch-briefing`, {
    method: "POST",
    headers: {
      "x-cron-secret": process.env.CRON_SECRET!,
      "Content-Type": "application/json",
    },
  })

  const body = await res.json()

  await db.from("cron_logs").insert({
    job_name: "watchdog",
    status: res.ok ? "success" : "error",
    error_message: res.ok ? "triggered fetch-briefing" : JSON.stringify(body),
  })

  return NextResponse.json({ ok: res.ok, action: "triggered", result: body })
}
