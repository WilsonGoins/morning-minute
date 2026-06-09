import { supabase } from "@/lib/supabase"
import { getLastNWorkingDays, toDateString } from "@/lib/working-days"
import type { DailyBriefing } from "@/types"
import BriefingClient from "@/components/BriefingClient"

export const dynamic = "force-dynamic"

async function getBriefings(): Promise<Record<string, DailyBriefing>> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateString(today)
  const pastDays = getLastNWorkingDays(5, today)
  const allDates = [todayStr, ...pastDays.map(toDateString)]

  const { data, error } = await supabase
    .from("daily_briefings")
    .select("*")
    .in("date", allDates)
    .order("date", { ascending: false })

  if (error || !data) return {}

  const map: Record<string, DailyBriefing> = {}
  for (const row of data) {
    map[row.date] = row as DailyBriefing
  }
  return map
}

export default async function HomePage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDate = toDateString(today)
  const briefings = await getBriefings()
  return <BriefingClient briefings={briefings} todayDate={todayDate} />
}
