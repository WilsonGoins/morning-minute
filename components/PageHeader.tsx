"use client"

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
          <DateNav selectedDate={selectedDate} onSelectDate={onSelectDate} />
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
