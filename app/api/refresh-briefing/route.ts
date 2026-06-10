import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

export const runtime = "nodejs"
export const maxDuration = 300

const COOLDOWN_KEY = "mm:manual-refresh:lock"
const COOLDOWN_SECONDS = 4 * 60 * 60

function getRedis() {
  return Redis.fromEnv()
}

export async function GET() {
  const ttl = await getRedis().ttl(COOLDOWN_KEY)
  return NextResponse.json({ available: ttl <= 0, ttl: Math.max(0, ttl) })
}

export async function POST(req: NextRequest) {
  const redis = getRedis()

  const ttl = await redis.ttl(COOLDOWN_KEY)
  if (ttl > 0) {
    return NextResponse.json({ error: "cooldown", ttl }, { status: 429 })
  }

  const origin = new URL(req.url).origin
  const res = await fetch(`${origin}/api/cron/fetch-briefing`, {
    method: "GET",
    headers: { "x-cron-secret": process.env.CRON_SECRET! },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: (body as { error?: string }).error ?? "Pipeline failed" },
      { status: 500 }
    )
  }

  // Only lock on success
  await redis.set(COOLDOWN_KEY, "1", { ex: COOLDOWN_SECONDS })
  return NextResponse.json({ ok: true })
}
