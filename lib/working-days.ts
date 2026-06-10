export function getLastNWorkingDays(n: number, from: Date = new Date()): Date[] {
  const days: Date[] = []
  // Parse the ET date string to get the correct starting date, then anchor
  // each day at UTC noon so toDateString and display formatting both agree.
  const [y, mo, d] = toDateString(from).split("-").map(Number)
  const cursor = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))

  while (days.length < n) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    const dow = cursor.getUTCDay()
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor))
    }
  }

  return days
}

export function isWorkingDay(date: Date): boolean {
  const dow = date.getDay()
  return dow !== 0 && dow !== 6
}

export function toDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function getDayLabel(date: Date, today: Date): string {
  const d = toDateString(date)
  const t = toDateString(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const y = toDateString(yesterday)

  if (d === t) return "Today"
  if (d === y) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "long" })
}
