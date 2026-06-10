"use client"

import { useState } from "react"
import type { DailyBriefing } from "@/types"
import PageHeader from "@/components/PageHeader"
import MarketTable from "@/components/MarketTable"
import HeadlineCard from "@/components/HeadlineCard"
import { toDateString } from "@/lib/working-days"

interface Props {
  briefings: Record<string, DailyBriefing>
  todayDate: string
}

export default function BriefingClient({ briefings, todayDate }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const briefing = briefings[selectedDate]
  const isPastDay = selectedDate !== todayDate
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <div className="min-h-screen" style={{ background: "var(--wf-fill)" }}>
      {briefing ? (
        <>
          <PageHeader
            createdAt={briefing.created_at}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            isPastDay={isPastDay}
          />

          <main className="max-w-5xl mx-auto px-4 py-4 md:px-6 md:py-6">
            {/* Two-column layout on desktop */}
            <div className="md:grid md:grid-cols-[1fr_1.1fr] md:gap-8">
              {/* Left column: Market Data */}
              <section
                className="rounded-[10px] border p-4 mb-4 md:mb-0"
                style={{ background: "var(--wf-card)", borderColor: "var(--wf-line)" }}
              >
                <MarketTable
                  market_data={briefing.market_data}
                  macro_events={briefing.macro_events}
                  compact={false}
                />
              </section>

              {/* Right column: Headlines */}
              <section>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="section-title" style={{ color: "var(--wf-ink)" }}>
                    Top Headlines
                  </span>
                  {isPastDay && (
                    <span className="eyebrow">
                      · {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <span className="ml-auto text-[11px]" style={{ color: "var(--wf-ink-3)" }}>
                    click to expand talking points →
                  </span>
                </div>

                {briefing.headlines.map((h, i) => (
                  <HeadlineCard
                    key={`${i}-${h.url}`}
                    headline={h}
                    briefingDate={selectedDate}
                    isPastDay={isPastDay}
                  />
                ))}
              </section>
            </div>

            {/* Overnight summary */}
            {briefing.overnight_summary && (
              <div
                className="mt-6 rounded-[10px] border p-4"
                style={{ background: "var(--wf-card)", borderColor: "var(--wf-line)" }}
              >
                <div className="eyebrow mb-2">Overnight &amp; Pre-Market</div>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--wf-ink-2)" }}>
                  {briefing.overnight_summary}
                </p>
              </div>
            )}
          </main>
        </>
      ) : (
        <>
          <PageHeader
            createdAt={new Date().toISOString()}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            isPastDay={isPastDay}
          />
          <main className="max-w-5xl mx-auto px-4 py-12 text-center">
            <p className="text-[13px]" style={{ color: "var(--wf-ink-3)" }}>
              {isPastDay
                ? "No briefing available for this date."
                : "Today's briefing hasn't been generated yet. Check back after 6:00am EST."}
            </p>
          </main>
        </>
      )}
    </div>
  )
}
