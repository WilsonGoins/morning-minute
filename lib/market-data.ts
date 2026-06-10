import YahooFinance from "yahoo-finance2"
const yahooFinance = new YahooFinance()
import type { MarketTicker } from "@/types"

// Yahoo Finance symbols for all 19 instruments.
// Bond yields (unit="bps"): Yahoo returns the yield as a plain percentage
// (e.g. 4.32 means 4.32%). Day-over-day move is (current − prev) × 100 bps.
const TICKERS: { symbol: string; label: string; unit: "pct" | "bps"; subLabel?: string }[] = [
  { symbol: "^GSPC",     label: "S&P 500",            unit: "pct" },
  { symbol: "^NDX",      label: "Nasdaq 100",          unit: "pct" },
  { symbol: "^STOXX50E", label: "EURO STOXX 50",       unit: "pct" },
  { symbol: "^STOXX",    label: "STOXX 600",           unit: "pct" },
  { symbol: "^GDAXI",    label: "DAX",                 unit: "pct" },
  { symbol: "^FTSE",     label: "FTSE 100",            unit: "pct" },
  { symbol: "^N225",     label: "Nikkei 225",          unit: "pct" },
  { symbol: "000001.SS", label: "Shanghai Comp.",       unit: "pct" },
  { symbol: "^NSEI",     label: "Nifty 50",            unit: "pct" },
  { symbol: "^VIX",      label: "VIX",                 unit: "pct" },
  { symbol: "^V2TX",     label: "VSTOXX",              unit: "pct" },
  { symbol: "^TNX",      label: "US 10yr Treasury",    unit: "bps", subLabel: "yield" },
  { symbol: "^BUND",     label: "German 10yr (Bund)",  unit: "bps" },
  { symbol: "^JGB",      label: "Japan 10yr (JGB)",    unit: "bps" },
  { symbol: "EURUSD=X",  label: "EUR / USD",           unit: "pct" },
  { symbol: "GBPUSD=X",  label: "GBP / USD",           unit: "pct" },
  { symbol: "GC=F",      label: "Gold",                unit: "pct", subLabel: "spot" },
  { symbol: "CL=F",      label: "WTI Crude",           unit: "pct" },
  { symbol: "BZ=F",      label: "Brent Crude",         unit: "pct" },
]

function formatValue(price: number, unit: "pct" | "bps"): string {
  if (unit === "bps") {
    // Bond yields: display as percentage with 2 decimal places (e.g. "4.32%")
    return price.toFixed(2) + "%"
  }
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function formatMove(rawMove: number, unit: "pct" | "bps", prev: number): {
  move: string
  direction: "up" | "down" | "flat"
} {
  if (unit === "bps") {
    // rawMove is already in percentage-point terms; multiply × 100 → basis points
    const bps = +(rawMove * 100).toFixed(1)
    return {
      move: bps > 0 ? `+${bps}bp` : `${bps}bp`,
      direction: bps > 0 ? "up" : bps < 0 ? "down" : "flat",
    }
  }
  const pct = prev ? +((rawMove / prev) * 100).toFixed(2) : 0
  return {
    move: pct > 0 ? `+${pct}%` : `${pct}%`,
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
  }
}

export async function fetchMarketData(): Promise<MarketTicker[]> {
  const symbols = TICKERS.map((t) => t.symbol)

  // Suppress yahoo-finance2's runtime validation noise.
  // Cast to array — quote() returns Quote[] when passed string[].
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes = (await yahooFinance.quote(symbols as any, {}, { validateResult: false })) as any[]

  const quoteMap = new Map<string, { regularMarketPrice?: number; regularMarketPreviousClose?: number }>()
  for (const q of quotes) {
    if (q?.symbol) quoteMap.set(q.symbol, q)
  }

  return TICKERS.map(({ symbol, label, unit }) => {
    const q = quoteMap.get(symbol)
    const price = q?.regularMarketPrice ?? null
    const prev = q?.regularMarketPreviousClose ?? null

    if (price === null || price === undefined) {
      return { ticker: symbol, label, value: "N/A", move: "N/A", move_unit: unit, direction: "flat" as const }
    }

    const rawMove = prev != null ? price - prev : 0
    const { move, direction } = formatMove(rawMove, unit, prev ?? 0)

    return {
      ticker: symbol,
      label,
      value: formatValue(price, unit),
      move,
      move_unit: unit,
      direction,
    }
  })
}
