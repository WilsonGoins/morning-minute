"use client"

import { useState } from "react"
import type { Headline, TalkingPoint } from "@/types"

const PAID_SOURCES = new Set([
  "Financial Times",
  "Bloomberg",
  "WSJ",
  "Wall Street Journal",
  "Barron's",
])

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `https://${url}`
}

interface Props {
  headline: Headline
  briefingDate: string
  isPastDay: boolean
  initialTalkingPoints?: TalkingPoint[] | null
}

export default function HeadlineCard({
  headline,
  briefingDate,
  isPastDay,
  initialTalkingPoints = null,
}: Props) {
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[] | null>(initialTalkingPoints)
  const [isOpen, setIsOpen] = useState(!!initialTalkingPoints)
  const [isFetching, setIsFetching] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const articleUrl = normalizeUrl(headline.url)
  const hasTalkingPoints = !!talkingPoints

  async function handleGetTalkingPoints() {
    if (isPastDay && !talkingPoints) return
    if (isFetching) return

    setIsFetching(true)
    setError(null)

    try {
      const res = await fetch("/api/talking-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: headline.title,
          summary: headline.summary,
          url: headline.url,
          briefing_date: briefingDate,
        }),
      })

      if (res.status === 429) {
        const data = await res.json()
        setError(data.error)
        return
      }

      const data = await res.json()
      setTalkingPoints(data.talking_points)
      setIsCached(data.cached)
      setIsOpen(true)
    } catch {
      setError("Failed to load talking points. Please try again.")
    } finally {
      setIsFetching(false)
    }
  }

  const displayPoints = talkingPoints ?? []

  return (
    <div
      className="rounded-[10px] border p-3 mb-3"
      style={{ background: "var(--wf-card)", borderColor: "var(--wf-line)" }}
    >
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="eyebrow">{headline.source}</span>
        {PAID_SOURCES.has(headline.source) && (
          <span className="relative group">
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold cursor-help select-none"
              style={{ background: "var(--wf-line)", color: "var(--wf-ink-3)" }}
            >
              $
            </span>
            <span
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-52 rounded-[6px] px-2 py-1.5 text-[11px] leading-snug text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20"
              style={{ background: "var(--wf-ink)", color: "var(--wf-card)" }}
            >
              Paid source — article may be paywalled. Talking points are generated from the headline and summary only.
            </span>
          </span>
        )}
        <span className="text-[11px]" style={{ color: "var(--wf-ink-3)" }}>·</span>
        <span className="text-[11px]" style={{ color: "var(--wf-ink-3)" }}>{headline.published_at}</span>
      </div>

      {/* Headline title */}
      {articleUrl ? (
        <a
          href={articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[13px] font-semibold leading-snug mb-2 hover:underline"
          style={{ color: "var(--wf-ink)" }}
        >
          {headline.title} <span style={{ color: "var(--wf-ink-3)" }}>↗</span>
        </a>
      ) : (
        <p className="text-[13px] font-semibold leading-snug mb-2" style={{ color: "var(--wf-ink)" }}>
          {headline.title}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-[12px] mb-2" style={{ color: "var(--wf-down)" }}>{error}</p>
      )}

      {/* Talking points dropdown */}
      {hasTalkingPoints && isOpen && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--wf-line-2)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="section-title text-[11px]" style={{ color: "var(--wf-ink-2)" }}>
              Talking Points
            </span>
            <span
              className="rounded border px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ borderColor: "var(--wf-line-2)", color: "var(--wf-ink-3)" }}
            >
              {isCached ? "cached" : "generated · cached"}
            </span>
          </div>

          {displayPoints.map((tp) => (
            <div key={tp.label} className="mb-2.5">
              <div className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--wf-ink-2)" }}>
                {tp.label}
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--wf-ink)" }}>
                {tp.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Action button row */}
      <div className="mt-2 flex items-center gap-2">
        {isFetching ? (
          <span className="text-[12px]" style={{ color: "var(--wf-ink-3)" }}>
            Generating talking points…
          </span>
        ) : !hasTalkingPoints ? (
          isPastDay ? (
            <span className="text-[12px]" style={{ color: "var(--wf-ink-3)" }}>Not generated</span>
          ) : (
            <button
              onClick={handleGetTalkingPoints}
              className="rounded-[7px] border px-2.5 py-1 text-[12px] font-medium hover:bg-[#f6f6f6] transition-colors cursor-pointer"
              style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
            >
              Get Talking Points
            </button>
          )
        ) : (
          <button
            onClick={() => setIsOpen((o) => !o)}
            className="rounded-[7px] border px-2.5 py-1 text-[12px] font-medium cursor-pointer"
            style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
          >
            {isOpen ? "Hide talking points ▴" : "View talking points ▾"}
          </button>
        )}
      </div>
    </div>
  )
}
