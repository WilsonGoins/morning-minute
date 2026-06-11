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

// Initial lock held while a refresh is in flight. Short enough that an anomalous
// timeout / hard crash self-clears quickly, long enough to outlast a normal run
// (~80–120s) so the in-flight request can't be re-triggered. The lock is only
// EXTENDED to the full cooldown on success.
const IN_PROGRESS_COOLDOWN_SECONDS = 5 * 60

// Lock applied on a clean failure — lets the user retry soon, but not instantly.
const FAILURE_COOLDOWN_SECONDS = 5 * 60

export async function POST(req: NextRequest) {
  const redis = getRedis()

  // Acquire a SHORT lock ATOMICALLY before doing any work. If the key already
  // exists, it's either an active cooldown or an in-flight refresh — in both cases
  // we must NOT fire another web search. Starting short means that if this function
  // is killed by a timeout before it can resolve, the lock self-clears in ~10 min
  // instead of stranding the user for the full 4 hours.
  const acquired = await redis.set(COOLDOWN_KEY, "1", { nx: true, ex: IN_PROGRESS_COOLDOWN_SECONDS })
  if (!acquired) {
    const ttl = await redis.ttl(COOLDOWN_KEY)
    return NextResponse.json({ error: "cooldown", ttl: Math.max(0, ttl) }, { status: 429 })
  }

  const origin = new URL(req.url).origin
  try {
    const res = await fetch(`${origin}/api/cron/fetch-briefing`, {
      method: "GET",
      headers: { "x-cron-secret": process.env.CRON_SECRET! },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      // Pipeline failed — shorten the lock so the user can retry in a few minutes.
      await redis.set(COOLDOWN_KEY, "1", { ex: FAILURE_COOLDOWN_SECONDS })
      return NextResponse.json(
        { error: (body as { error?: string }).error ?? "Pipeline failed" },
        { status: 500 }
      )
    }

    // Success — extend the short in-flight lock to the full cooldown.
    await redis.set(COOLDOWN_KEY, "1", { ex: COOLDOWN_SECONDS })
    return NextResponse.json({ ok: true })
  } catch (err) {
    await redis.set(COOLDOWN_KEY, "1", { ex: FAILURE_COOLDOWN_SECONDS })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
