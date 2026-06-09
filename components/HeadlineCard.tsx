"use client"

import { useState } from "react"
import type { Headline, TalkingPoint } from "@/types"

const FRAMEWORK_ORDER = [
  "Expected vs. happened",
  "Price reaction",
  "The flows",
  "Change in expectations",
  "Cross-asset links",
  "Fact or speculation",
  "Historical comparison",
]

const VISIBLE_COUNT = 5

interface Props {
  headline: Headline
  briefingDate: string
  isPastDay: boolean
  initialClaimCount?: number
  initialTalkingPoints?: TalkingPoint[] | null
}

type State = "collapsed" | "loading" | "expanded" | "claimed"

export default function HeadlineCard({
  headline,
  briefingDate,
  isPastDay,
  initialClaimCount = 0,
  initialTalkingPoints = null,
}: Props) {
  const [cardState, setCardState] = useState<State>(
    initialTalkingPoints ? "expanded" : "collapsed"
  )
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[] | null>(initialTalkingPoints)
  const [isCached, setIsCached] = useState(false)
  const [claimCount, setClaimCount] = useState(initialClaimCount)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasClaimed, setHasClaimed] = useState(false)

  async function handleGetTalkingPoints() {
    if (isPastDay && !talkingPoints) return
    if (cardState === "expanded" || cardState === "claimed") return

    setCardState("loading")
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
        setCardState("collapsed")
        return
      }

      const data = await res.json()
      setTalkingPoints(data.talking_points)
      setIsCached(data.cached)
      setClaimCount(data.claim_count ?? 0)
      setCardState("expanded")
    } catch {
      setError("Failed to load talking points. Please try again.")
      setCardState("collapsed")
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
      setCardState("claimed")
    } catch {
      // Silently fail — claim is best-effort
    }
  }

  const canClaim = (cardState === "expanded" || cardState === "claimed") && !isPastDay
  const displayPoints = talkingPoints ?? []
  const visiblePoints = showAll ? displayPoints : displayPoints.slice(0, VISIBLE_COUNT)
  const hiddenCount = displayPoints.length - VISIBLE_COUNT

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

        {/* Claim badge */}
        {isPastDay ? (
          claimCount > 0 && (
            <span
              className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-3)" }}
            >
              🙋 Claimed{claimCount > 1 ? ` · ${claimCount}` : ""}
            </span>
          )
        ) : (cardState === "claimed" || hasClaimed) ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{ borderColor: "var(--wf-line)", color: "var(--wf-up)" }}
          >
            🙋 Claimed{claimCount > 1 ? ` · ${claimCount}` : ""}
          </span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-opacity"
            style={{
              borderColor: "var(--wf-line)",
              color: canClaim ? "var(--wf-ink-2)" : "var(--wf-ink-3)",
              opacity: canClaim ? 1 : 0.6,
              cursor: canClaim ? "pointer" : "default",
            }}
          >
            🙋 {canClaim ? "Claim this story" : "Claim · locked"}
          </button>
        )}
      </div>

      {/* Headline title */}
      <a
        href={headline.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[13px] font-semibold leading-snug mb-2 hover:underline"
        style={{ color: "var(--wf-ink)" }}
      >
        {headline.title} <span style={{ color: "var(--wf-ink-3)" }}>↗</span>
      </a>

      {/* Error message */}
      {error && (
        <p className="text-[12px] mb-2" style={{ color: "var(--wf-down)" }}>{error}</p>
      )}

      {/* Talking points (State C/D) */}
      {(cardState === "expanded" || cardState === "claimed") && talkingPoints && (
        <div
          className="mt-2 pt-2 border-t"
          style={{ borderColor: "var(--wf-line-2)" }}
        >
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

          {visiblePoints.map((tp) => (
            <div key={tp.label} className="mb-2.5">
              <div className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--wf-ink-2)" }}>
                {tp.label}
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--wf-ink)" }}>
                {tp.content}
              </p>
            </div>
          ))}

          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-[12px] font-medium"
              style={{ color: "var(--wf-ink-2)" }}
            >
              + {hiddenCount} more framework prompts ▾
            </button>
          )}

          {hasClaimed && (
            <p className="text-[11px] mt-2" style={{ color: "var(--wf-ink-3)" }}>
              You claimed this story
            </p>
          )}
        </div>
      )}

      {/* Action button row */}
      <div className="mt-2 flex items-center gap-2">
        {cardState === "loading" ? (
          <span className="text-[12px]" style={{ color: "var(--wf-ink-3)" }}>
            Generating talking points…
          </span>
        ) : isPastDay ? (
          talkingPoints ? (
            <button
              onClick={handleGetTalkingPoints}
              className="rounded-[7px] border px-2.5 py-1 text-[12px] font-medium"
              style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
            >
              {cardState === "expanded" ? "Hide talking points" : "View cached talking points"}
            </button>
          ) : (
            <span className="text-[12px]" style={{ color: "var(--wf-ink-3)" }}>Not generated</span>
          )
        ) : cardState === "collapsed" ? (
          <button
            onClick={handleGetTalkingPoints}
            className="rounded-[7px] border px-2.5 py-1 text-[12px] font-medium hover:bg-[#f6f6f6] transition-colors"
            style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
          >
            Get Talking Points
          </button>
        ) : null}
      </div>
    </div>
  )
}
