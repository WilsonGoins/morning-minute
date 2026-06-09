export interface MarketTicker {
  ticker: string
  label: string
  value: string
  move: string
  move_unit: "pct" | "bps"
  direction: "up" | "down" | "flat"
}

export interface MarketGroup {
  group: string
  unit: string
  tickers: MarketTicker[]
}

export interface MacroEvent {
  name: string
  time: string
}

export interface Headline {
  title: string
  summary: string
  source: string
  url: string
  published_at: string
}

export interface TalkingPoint {
  label: string
  content: string
}

export interface DailyBriefing {
  id: string
  date: string
  market_data: MarketTicker[]
  headlines: Headline[]
  macro_events: MacroEvent[]
  overnight_summary: string
  created_at: string
}

export interface ArticleTalkingPoints {
  id: string
  article_url_hash: string
  article_title: string
  briefing_date: string
  talking_points: TalkingPoint[]
  claim_count: number
  created_at: string
}
