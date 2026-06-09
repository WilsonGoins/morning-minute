import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let ratelimit: Ratelimit | null = null

function getRatelimit() {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(15, "1 h"),
      prefix: "mm:talking-points",
    })
  }
  return ratelimit
}

export async function checkRateLimit(ip: string): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const rl = getRatelimit()
  return rl.limit(ip)
}
