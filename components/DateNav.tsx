"use client"

import { useState, useRef, useEffect } from "react"
import { getLastNWorkingDays, toDateString, getDayLabel } from "@/lib/working-days"

interface DateNavProps {
  selectedDate: string
  onSelectDate: (date: string) => void
}

export default function DateNav({ selectedDate, onSelectDate }: DateNavProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateString(today)
  const pastDays = getLastNWorkingDays(5, today)

  const allDays = [today, ...pastDays]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selectedDayObj = allDays.find((d) => toDateString(d) === selectedDate) ?? today

  function formatPill(date: Date): string {
    if (toDateString(date) === todayStr) {
      return `Today · ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
    }
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  function formatDropdownRight(date: Date): string {
    return date.toLocaleDateString("en-US", {
      weekday: undefined,
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
        style={{ borderColor: "var(--wf-line)", background: "var(--wf-card)", color: "var(--wf-ink)" }}
      >
        {formatPill(selectedDayObj)}
        <span className="text-[10px]" style={{ color: "var(--wf-ink-3)" }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl border shadow-lg min-w-[220px] overflow-hidden"
          style={{ background: "var(--wf-card)", borderColor: "var(--wf-line)" }}
        >
          {allDays.map((date, i) => {
            const ds = toDateString(date)
            const isSelected = ds === selectedDate
            const label = getDayLabel(date, today)
            const right = i === 0
              ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
              : `${date.toLocaleDateString("en-US", { weekday: "short" })} · ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

            return (
              <button
                key={ds}
                onClick={() => { onSelectDate(ds); setOpen(false) }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[#f0f0f0] transition-colors"
                style={{
                  color: isSelected ? "var(--wf-ink)" : "var(--wf-ink-2)",
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? "var(--wf-fill-2)" : undefined,
                }}
              >
                <span>{label}</span>
                <span className="text-xs" style={{ color: "var(--wf-ink-3)" }}>{right}</span>
              </button>
            )
          })}

          <div
            className="border-t px-4 py-2.5"
            style={{ borderColor: "var(--wf-line-2)" }}
          >
            <p className="text-xs" style={{ color: "var(--wf-ink-3)" }}>Older than 5 working days</p>
            <p className="text-xs font-medium" style={{ color: "var(--wf-ink-3)" }}>not retained</p>
          </div>
        </div>
      )}
    </div>
  )
}
