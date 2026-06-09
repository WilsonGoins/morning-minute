import type { MarketTicker } from "@/types"

const BASE = "https://api.twelvedata.com"
const API_KEY = process.env.TWELVE_DATA_API_KEY!

const TICKERS: { symbol: string; label: string; unit: "pct" | "bps" }[] = [
  { symbol: "SPX", label: "S&P 500", unit: "pct" },
  { symbol: "NDX", label: "Nasdaq 100", unit: "pct" },
  { symbol: "SX5E", label: "EURO STOXX 50", unit: "pct" },
  { symbol: "SXXP", label: "STOXX 600", unit: "pct" },
  { symbol: "DAX", label: "DAX", unit: "pct" },
  { symbol: "FTSE", label: "FTSE 100", unit: "pct" },
  { symbol: "NI225", label: "Nikkei 225", unit: "pct" },
  { symbol: "SHCOMP", label: "Shanghai Comp.", unit: "pct" },
  { symbol: "NIFTY50", label: "Nifty 50", unit: "pct" },
  { symbol: "VIX", label: "VIX", unit: "pct" },
  { symbol: "VSTOXX", label: "VSTOXX", unit: "pct" },
  { symbol: "US10Y", label: "US 10yr Treasury", unit: "bps" },
  { symbol: "DE10Y", label: "German 10yr (Bund)", unit: "bps" },
  { symbol: "JP10Y", label: "Japan 10yr (JGB)", unit: "bps" },
  { symbol: "EUR/USD", label: "EUR / USD", unit: "pct" },
  { symbol: "GBP/USD", label: "GBP / USD", unit: "pct" },
  { symbol: "XAU/USD", label: "Gold", unit: "pct" },
  { symbol: "WTI", label: "WTI Crude", unit: "pct" },
  { symbol: "BRENT", label: "Brent Crude", unit: "pct" },
]

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res
    } catch {
      if (i === attempts - 1) throw new Error("Twelve Data fetch failed")
      await sleep(i === 0 ? 10_000 : 30_000)
    }
  }
  throw new Error("Twelve Data fetch failed after retries")
}

export async function fetchMarketData(): Promise<MarketTicker[]> {
  const symbols = TICKERS.map((t) => t.symbol).join(",")
  const url = `${BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${API_KEY}`

  const res = await fetchWithRetry(url)
  const data = await res.json()

  const tickers: MarketTicker[] = []

  for (const { symbol, label, unit } of TICKERS) {
    const q = data[symbol] ?? data
    if (!q || q.status === "error") {
      tickers.push({
        ticker: symbol,
        label,
        value: "N/A",
        move: "N/A",
        move_unit: unit,
        direction: "flat",
      })
      continue
    }

    const price = parseFloat(q.close ?? q.price ?? "0")
    const prev = parseFloat(q.previous_close ?? "0")
    const rawMove = prev ? price - prev : 0

    let moveDisplay: string
    let direction: "up" | "down" | "flat"

    if (unit === "bps") {
      const bps = +(rawMove * 100).toFixed(1)
      moveDisplay = bps > 0 ? `+${bps}bp` : `${bps}bp`
      direction = bps > 0 ? "up" : bps < 0 ? "down" : "flat"
    } else {
      const pct = prev ? +((rawMove / prev) * 100).toFixed(2) : 0
      moveDisplay = pct > 0 ? `+${pct}%` : `${pct}%`
      direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat"
    }

    tickers.push({
      ticker: symbol,
      label,
      value: price.toLocaleString("en-US", { maximumFractionDigits: 2 }),
      move: moveDisplay,
      move_unit: unit,
      direction,
    })
  }

  return tickers
}
