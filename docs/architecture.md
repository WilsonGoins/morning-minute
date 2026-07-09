# Architecture

## Overview

Morning Minute is a read-heavy app with a single expensive write operation per day. All AI and market-data work happens in a background cron job. Page loads are pure database reads.

```
[Cron: 7:00am ET, Mon–Fri]
        |
        ▼
/api/cron/fetch-briefing
        |
        ├─ yahoo-finance2 → prices + moves for 19 tickers
        |
        ├─ Anthropic claude-sonnet-4-6 + web_search_20250305
        |    └─ 7–10 headlines, macro events, overnight narrative
        |
        ├─ Anthropic claude-haiku-4-5
        |    └─ formats search output → strict JSON
        |
        └─ Supabase upsert → daily_briefings
           Supabase delete → prune rows older than 5 working days

[User opens app]
        └─ Supabase SELECT from daily_briefings → page renders instantly

[User clicks "Get Talking Points"]
        ├─ Supabase lookup by article_url_hash + briefing_date
        ├─ Cache hit  → return talking_points immediately
        └─ Cache miss → Anthropic claude-sonnet-4-6 → Supabase insert → return
```

---

## Daily Fetch Pipeline

### Step 1 — Market Data

`lib/market-data.ts` calls **yahoo-finance2** for all 19 symbols. Each ticker is fetched with `quoteSummary()`, pulling `price` and `summaryDetail` modules. Day-over-day moves are computed as percentage change (equities, FX, commodities) or basis point change (bonds).

### Step 2 — News Search (Anthropic, two-step)

**Why two steps?** When Claude uses the `web_search` tool it returns natural language prose, not JSON. Forcing JSON output in the same call is unreliable. The two-step approach separates concerns cleanly:

**Step 2a — Search call** (`claude-sonnet-4-6`):
- Prompt instructs Claude to search for the 7–10 most market-moving headlines across CNBC, AP, Reuters, FT, Bloomberg, Yahoo Finance, Barron's, and WSJ
- `max_uses: 10` allows up to 10 web searches
- Returns prose summarizing what it found, including titles, URLs, and publish times

**Step 2b — Format call** (`claude-haiku-4-5`):
- Takes the prose from Step 2a and converts it to strict JSON matching the `BriefingContent` schema
- No tools — pure text-to-JSON conversion
- Haiku is used here for speed and cost; the task is mechanical, not reasoning-heavy

### Step 3 — Supabase Upsert

The full briefing is written to `daily_briefings` with `onConflict: "date"`. Re-running the cron overwrites the day's briefing and refreshes `created_at` (which drives the "Data as of" timestamp in the UI).

### Step 4 — Prune Old Data

Rows older than the 5 most recent working days are deleted from both `daily_briefings` and `article_talking_points`. Weekend days are excluded from the count.

---

## Retry Logic

The fetch pipeline retries up to 3 times with exponential backoff:
- Attempt 1 fails → wait 10 seconds
- Attempt 2 fails → wait 30 seconds
- Attempt 3 fails → log error to `cron_logs` and return 500

---

## Talking Points Cache

Article talking points are keyed by `SHA-256(article_url) + briefing_date`. This means:
- The same article appearing in multiple days' briefings gets separate talking points per day (context may differ)
- Re-clicking "Get Talking Points" on the same article in the same day's briefing returns instantly from cache
- Cache is never invalidated — talking points are immutable once generated

---

## Rate Limiting

`POST /api/talking-points` is rate-limited via Upstash Redis: 15 requests per hour per IP address, using a sliding window. This prevents a single user from looping through all articles and burning API credits. The cron endpoints are not rate-limited — they are blocked entirely without `CRON_SECRET`.

---

## No Authentication

There are no user accounts, sessions, or auth. All users share the same URL and see identical content.
