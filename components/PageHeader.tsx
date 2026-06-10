"use client"

import { useState, useEffect } from "react"
import DateNav from "@/components/DateNav"

interface Props {
  createdAt: string
  selectedDate: string
  onSelectDate: (date: string) => void
  isPastDay: boolean
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  })
  const day = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  })
  return `${time} ET · ${day}`
}

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

type RefreshState = "checking" | "available" | "loading" | "success" | "error" | "cooldown"

function formatCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function RefreshButton() {
  const [state, setState] = useState<RefreshState>("checking")
  const [ttl, setTtl] = useState(0)
  const [errMsg, setErrMsg] = useState("")

  useEffect(() => {
    fetch("/api/refresh-briefing")
      .then((r) => r.json())
      .then((d: { available: boolean; ttl: number }) => {
        if (d.available) {
          setState("available")
        } else {
          setTtl(d.ttl)
          setState("cooldown")
        }
      })
      .catch(() => setState("available"))
  }, [])

  async function handleRefresh() {
    setState("loading")
    try {
      const res = await fetch("/api/refresh-briefing", { method: "POST" })
      const data = await res.json() as { error?: string; ttl?: number; ok?: boolean }
      if (res.status === 429 && data.ttl) {
        setTtl(data.ttl)
        setState("cooldown")
      } else if (!res.ok) {
        setErrMsg(data.error ?? "Something went wrong")
        setState("error")
      } else {
        setState("success")
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch {
      setErrMsg("Network error")
      setState("error")
    }
  }

  if (state === "checking") return null

  if (state === "cooldown") {
    return (
      <span className="text-[11px]" style={{ color: "var(--wf-ink-3)" }}>
        Next refresh in {formatCooldown(ttl)}
      </span>
    )
  }

  if (state === "success") {
    return (
      <span className="text-[11px]" style={{ color: "var(--wf-up)" }}>
        ✓ Refreshed — reloading…
      </span>
    )
  }

  if (state === "loading") {
    return (
      <span className="text-[11px]" style={{ color: "var(--wf-ink-3)" }}>
        Refreshing…
      </span>
    )
  }

  if (state === "error") {
    return (
      <button onClick={handleRefresh} className="text-[11px]" style={{ color: "var(--wf-down)" }}>
        ✕ {errMsg} — retry?
      </button>
    )
  }

  return (
    <button
      onClick={handleRefresh}
      className="text-[11px] rounded-md border px-2 py-1 transition-colors hover:bg-[#f0f0f0]"
      style={{ borderColor: "var(--wf-line)", color: "var(--wf-ink-2)", background: "var(--wf-card)" }}
    >
      ↻ Refresh data
    </button>
  )
}

export default function PageHeader({ createdAt, selectedDate, onSelectDate, isPastDay }: Props) {
  return (
    <header
      className="border-b px-4 py-3 md:px-6"
      style={{ background: "var(--wf-card)", borderColor: "var(--wf-line)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: "var(--wf-ink)" }}>
              Morning Minute <span className="font-normal" style={{ color: "var(--wf-ink-3)" }}></span>
            </h1>
            <p className="text-[13px]" style={{ color: "var(--wf-ink-2)" }}>
              {formatFullDate(selectedDate)}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--wf-ink-3)" }}>
              Data as of {formatTimestamp(createdAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <DateNav selectedDate={selectedDate} onSelectDate={onSelectDate} />
            {!isPastDay && <RefreshButton />}
          </div>
        </div>

        {isPastDay && (
          <div
            className="mt-2 rounded-lg px-3 py-2 text-[12px] font-medium"
            style={{ background: "var(--wf-fill-2)", color: "var(--wf-ink-2)", border: "1px solid var(--wf-line)" }}
          >
            🔒 Viewing a past day — headlines are read-only
          </div>
        )}
      </div>
    </header>
  )
}
