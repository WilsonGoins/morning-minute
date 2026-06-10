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

  // Step 1: Use web search to gather raw news information
  const searchPrompt = `You are a financial morning briefing assistant. Today is ${today} EST.

Search the web and gather:
1. The top 5-7 financial news headlines from CNBC, Financial Times, WSJ, Bloomberg, and Barron's published in the last 12 hours. Focus on market-moving news: central bank decisions, economic data, earnings, geopolitical events.
2. Any major macro events scheduled for TODAY only: Fed/ECB/BoJ decisions, Non-farm payrolls, CPI, PCE, unemployment data. If none, note that.
3. What happened overnight: Asian markets, European open, US pre-market activity.

For each headline include: exact title, brief summary, source name, URL, and approximate publish time.`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 } as any],
    messages: [{ role: "user", content: searchPrompt }],
  })

  const searchText = searchResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  // Step 2: Format the gathered information as strict JSON
  const formatPrompt = `Convert the following financial news summary into a JSON object with EXACTLY this structure. Return ONLY valid JSON — no markdown, no explanation, no prose.

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

Rules:
- Include 5-7 headlines
- macro_events should only include events scheduled for today; use empty array [] if none
- overnight_summary must cover Asian markets, European open, and US pre-market

News summary to convert:
${searchText}`

  const formatResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: formatPrompt }],
  })

  const rawText = formatResponse.content.find((b) => b.type === "text")?.text ?? ""
  const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) as BriefingContent
}

export async function generateTalkingPoints(
  title: string,
  summary: string,
  url: string
): Promise<TalkingPoint[]> {
  const prompt = `You are a financial educator. Generate structured talking points for this article using our framework.

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
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]"
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(cleaned) as TalkingPoint[]
}
