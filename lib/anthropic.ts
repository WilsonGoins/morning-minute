import Anthropic from "@anthropic-ai/sdk"
import type { Headline, MacroEvent, TalkingPoint } from "@/types"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface BriefingContent {
  headlines: Headline[]
  macro_events: MacroEvent[]
  overnight_summary: string
}

export async function fetchDailyBriefing(): Promise<BriefingContent> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  })

  const prompt = `You are a financial morning briefing assistant for the Hawks & Doves intern cohort. Today is ${today} EST.

Search the web and return a JSON object with this exact structure:
{
  "headlines": [
    {
      "title": "Exact headline text",
      "summary": "1-2 sentence summary of the article",
      "source": "Publication name (e.g. Financial Times, Bloomberg, WSJ, CNBC, Barron's)",
      "url": "Article URL",
      "published_at": "Time in format like 5:40am"
    }
  ],
  "macro_events": [
    { "name": "Event name", "time": "Time EST" }
  ],
  "overnight_summary": "2-3 sentence narrative of overnight and pre-market activity"
}

Instructions:
- Find the top 5-7 financial news headlines from CNBC, Financial Times, WSJ, Bloomberg, and Barron's published in the last 12 hours
- Focus on market-moving news: central bank decisions, economic data, earnings, geopolitical events affecting markets
- For macro_events, list only: Fed/ECB/BoJ decisions, Non-farm payrolls, unemployment, CPI, PCE scheduled for TODAY
- If no major macro events today, return an empty array
- The overnight_summary should cover: what happened in Asian markets, European open, US pre-market
- Return ONLY valid JSON, no markdown, no explanation`

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 } as any],
    messages: [{ role: "user", content: prompt }],
  })

  let jsonText = ""
  for (const block of response.content) {
    if (block.type === "text") {
      jsonText = block.text
      break
    }
  }

  const cleaned = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(cleaned) as BriefingContent
}

export async function generateTalkingPoints(
  title: string,
  summary: string,
  url: string
): Promise<TalkingPoint[]> {
  const prompt = `You are a financial educator for the Hawks & Doves intern morning meeting. Generate structured talking points for this article using our framework.

Article title: ${title}
Summary: ${summary}
URL: ${url}

Return ONLY a JSON array with exactly these 7 items (in this order):
[
  { "label": "Expected vs. happened", "content": "..." },
  { "label": "Price reaction", "content": "..." },
  { "label": "The flows", "content": "..." },
  { "label": "Change in expectations", "content": "..." },
  { "label": "Cross-asset links", "content": "..." },
  { "label": "Fact or speculation", "content": "..." },
  { "label": "Historical comparison", "content": "..." }
]

Each content field: 2-4 sentences. Enough to speak to in a morning meeting, short enough to read in 30 seconds.
Return ONLY valid JSON, no markdown, no explanation.`

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]"
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(cleaned) as TalkingPoint[]
}
