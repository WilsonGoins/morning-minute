"use client"

import { useState } from "react"
import type { MarketTicker, MacroEvent } from "@/types"

const GROUPS = [
  {
    label: "Equities",
    unit: "% move",
    tickers: ["S&P 500", "Nasdaq 100", "EURO STOXX 50", "STOXX 600", "DAX", "FTSE 100", "Nikkei 225", "Shanghai Comp.", "Nifty 50", "VIX", "VSTOXX"],
    subgroups: [
      { label: "US", tickers: ["S&P 500", "Nasdaq 100"] },
      { label: "Europe / UK", tickers: ["EURO STOXX 50", "STOXX 600", "DAX", "FTSE 100"] },
      { label: "Asia", tickers: ["Nikkei 225", "Shanghai Comp.", "Nifty 50"] },
      { label: "Volatility", tickers: ["VIX", "VSTOXX"] },
    ],
  },
  {
    label: "Gov Bonds",
    unit: "bps move",
    tickers: ["US 2yr Treasury", "US 10yr Treasury", "US 30yr Treasury", "German 10yr (Bund)", "Japan 10yr (JGB)"],
    subgroups: [],
  },
  {
    label: "FX & Commodities",
    unit: "% move",
    tickers: ["EUR / USD", "GBP / USD", "Gold", "WTI Crude", "Brent Crude"],
    subgroups: [],
  },
]

const COMPACT_TICKERS = ["S&P 500", "Nasdaq 100", "EURO STOXX 50", "STOXX 600", "DAX", "FTSE 100", "Nikkei 225", "Shanghai Comp.", "Nifty 50", "VIX", "VSTOXX", "US 2yr Treasury", "US 10yr Treasury", "US 30yr Treasury", "German 10yr (Bund)", "Japan 10yr (JGB)", "EUR / USD", "GBP / USD", "Gold", "WTI Crude", "Brent Crude"]

interface Props {
  market_data: MarketTicker[]
  macro_events: MacroEvent[]
  compact?: boolean
  date?: string
}

function MoveCell({ ticker }: { ticker: MarketTicker }) {
  const color =
    ticker.direction === "up"
      ? "var(--wf-up)"
      : ticker.direction === "down"
      ? "var(--wf-down)"
      : "var(--wf-ink-3)"

  return (
    <span className="mono text-xs font-semibold" style={{ color }}>
      {ticker.move}
    </span>
  )
}

function TickerRow({ ticker, subLabel }: { ticker: MarketTicker; subLabel?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: "var(--wf-line-2)" }}>
      <div>
        <span className="text-[13px]" style={{ color: "var(--wf-ink)" }}>{ticker.label}</span>
        {subLabel && (
          <span className="ml-1.5 text-[11px]" style={{ color: "var(--wf-ink-3)" }}>{subLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="mono text-[13px]" style={{ color: "var(--wf-ink)" }}>{ticker.value}</span>
        <MoveCell ticker={ticker} />
      </div>
    </div>
  )
}

export default function MarketTable({ market_data, macro_events, compact = false, date }: Props) {
  const dateLabel = date
    ? (() => { const [y, m, d] = date.split("-").map(Number); return `${m}/${d}` })()
    : null
  const [expanded, setExpanded] = useState(false)

  const byLabel: Record<string, MarketTicker> = {}
  for (const t of market_data) {
    byLabel[t.label] = t
  }

  const showCompact = compact && !expanded

  return (
    <div>
      {/* Section header */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="section-title" style={{ color: "var(--wf-ink)" }}>Quick Daily Check</span>
        <span className="eyebrow">— Market Data</span>
        {!compact && (
          <span className="ml-auto eyebrow">21 instruments</span>
        )}
      </div>

      {/* Market groups */}
      {GROUPS.map((group) => {
        const groupTickers = group.tickers
          .filter((l) => byLabel[l])
          .filter((l) => !showCompact || COMPACT_TICKERS.includes(l))

        if (groupTickers.length === 0) return null

        return (
          <div key={group.label} className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow">{group.label}</span>
              <span className="eyebrow">·</span>
              <span className="eyebrow">{group.unit}</span>
            </div>

            {group.subgroups.length > 0 ? (
              group.subgroups.map((sg) => {
                const sgTickers = sg.tickers
                  .filter((l) => byLabel[l])
                  .filter((l) => !showCompact || COMPACT_TICKERS.includes(l))
                if (sgTickers.length === 0) return null
                return (
                  <div key={sg.label} className="mb-2">
                    <div className="text-[11px] font-medium mb-1" style={{ color: "var(--wf-ink-3)" }}>
                      {sg.label}
                    </div>
                    {sgTickers.map((label) => (
                      <TickerRow key={label} ticker={byLabel[label]} />
                    ))}
                  </div>
                )
              })
            ) : (
              groupTickers.map((label) => {
                const t = byLabel[label]
                const subLabel = label.startsWith("US ") && label.endsWith("Treasury") ? "yield" : label === "Gold" ? "spot" : undefined
                return <TickerRow key={label} ticker={t} subLabel={subLabel} />
              })
            )}
          </div>
        )
      })}

      {/* Compact expand toggle */}
      {compact && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium mt-1"
          style={{ color: "var(--wf-ink-2)" }}
        >
          {expanded ? "compact table ▴" : "full market table ▾"}
        </button>
      )}

      {/* Macro Events */}
      {macro_events.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2">Macro Events Today{dateLabel ? ` (${dateLabel})` : ""}</div>
          <div className="flex flex-wrap gap-2">
            {macro_events.map((ev) => (
              <span
                key={ev.name}
                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
              >
                {ev.name} · {ev.time}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
