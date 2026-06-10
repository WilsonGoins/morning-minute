"use client"

import { useState } from "react"
import type { Headline, TalkingPoint } from "@/types"


interface Props {
  headline: Headline
  briefingDate: string
  isPastDay: boolean
  initialClaimCount?: number
  initialTalkingPoints?: TalkingPoint[] | null
}

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `https://${url}`
}

export default function HeadlineCard({
  headline,
  briefingDate,
  isPastDay,
  initialClaimCount = 0,
  initialTalkingPoints = null,
}: Props) {
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[] | null>(initialTalkingPoints)
  const [isOpen, setIsOpen] = useState(!!initialTalkingPoints)
  const [isFetching, setIsFetching] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [claimCount, setClaimCount] = useState(initialClaimCount)

  const [error, setError] = useState<string | null>(null)
  const [hasClaimed, setHasClaimed] = useState(false)

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
      setClaimCount(data.claim_count ?? 0)
      setIsOpen(true)
    } catch {
      setError("Failed to load talking points. Please try again.")
    } finally {
      setIsFetching(false)
    }
  }

  async function handleClaim() {
    if (hasClaimed || isPastDay) return

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: headline.url, briefing_date: briefingDate }),
      })
      const data = await res.json()
      setClaimCount(data.claim_count ?? claimCount + 1)
      setHasClaimed(true)
    } catch {
      // Silently fail — claim is best-effort
    }
  }

  const displayPoints = talkingPoints ?? []

  return (
    <div
      className="rounded-[10px] border p-3 mb-3"
      style={{ background: "var(--wf-card)", borderColor: "var(--wf-line)" }}
    >
      {/* Meta row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="eyebrow">{headline.source}</span>
          <span className="text-[11px]" style={{ color: "var(--wf-ink-3)" }}>·</span>
          <span className="text-[11px]" style={{ color: "var(--wf-ink-3)" }}>{headline.published_at}</span>
        </div>

        {isPastDay ? (
          claimCount > 0 && (
            <span
              className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-3)" }}
            >
              🙋 Claimed{claimCount > 1 ? ` · ${claimCount}` : ""}
            </span>
          )
        ) : hasClaimed ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{ borderColor: "var(--wf-line)", color: "var(--wf-up)" }}
          >
            🙋 Claimed{claimCount > 1 ? ` · ${claimCount}` : ""}
          </span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={!hasTalkingPoints}
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-opacity"
            style={{
              borderColor: "var(--wf-line)",
              color: hasTalkingPoints ? "var(--wf-ink-2)" : "var(--wf-ink-3)",
              opacity: hasTalkingPoints ? 1 : 0.6,
              cursor: hasTalkingPoints ? "pointer" : "default",
            }}
          >
            🙋 {hasTalkingPoints ? "Claim this story" : "Claim · locked"}
          </button>
        )}
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

          {hasClaimed && (
            <p className="text-[11px] mt-2" style={{ color: "var(--wf-ink-3)" }}>
              You claimed this story
            </p>
          )}
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
            className="rounded-[7px] border px-2.5 py-1 text-[12px] font-medium"
            style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
          >
            {isOpen ? "Hide talking points ▴" : "View talking points ▾"}
          </button>
        )}
      </div>
    </div>
  )
}
