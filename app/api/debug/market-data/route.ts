import { NextRequest, NextResponse } from "next/server"
import { fetchMarketData } from "@/lib/market-data"

export const runtime = "nodejs"

// Protected diagnostic endpoint — shows processed market data for all 21 symbols.
// Usage:
//   curl http://localhost:3000/api/debug/market-data \
//     -H "x-cron-secret: YOUR_CRON_SECRET"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tickers = await fetchMarketData()
  return NextResponse.json({ tickers })
}
