# API Routes

All routes use the Next.js App Router convention (`app/api/**/route.ts`).

---

## `POST /api/cron/fetch-briefing`

The main daily pipeline. Fetches market data, generates the AI briefing, and writes to Supabase.

**Auth:** `x-cron-secret` header (or `Authorization: Bearer <secret>`) must match `CRON_SECRET` env var. Returns 401 otherwise.

**Runtime:** `nodejs`, `maxDuration: 300` (5 minutes)

**Response (success):**
```json
{ "ok": true, "date": "2026-06-10" }
```

**Response (failure after 3 retries):**
```json
{ "error": "Supabase upsert failed: ..." }
```

**Retry logic:** Up to 3 attempts. Waits 10s after attempt 1, 30s after attempt 2. Logs final outcome to `cron_logs`.

**Triggered by:** Vercel Cron at `0 11 * * 1-5` (7:00am ET, Mon–Fri), or manually via curl.

---

## `POST /api/cron/watchdog`

Checks if today's briefing exists. Re-triggers `fetch-briefing` if it does not.

**Auth:** Same `CRON_SECRET` check as above.

**Runtime:** `nodejs`, `maxDuration: 60`

**Response:**
```json
{ "ok": true, "action": "none" }
// or
{ "ok": true, "action": "triggered", "result": { ... } }
```

**Triggered by:** Vercel Cron at `45 11 * * 1-5` (7:45am ET, Mon–Fri).

---

## `POST /api/talking-points`

Fetches or generates talking points for a headline. Checks cache first; calls Anthropic only on a miss.

**Auth:** None (public). Rate-limited by IP.

**Rate limit:** 15 requests per hour per IP (Upstash Redis, sliding window). Returns 429 on breach.

**Runtime:** `nodejs`, `maxDuration: 60`

**Request body:**
```json
{
  "title": "Fed Holds Rates Steady",
  "summary": "The Federal Reserve kept its benchmark rate unchanged...",
  "url": "https://www.reuters.com/...",
  "briefing_date": "2026-06-10"
}
```

**Response (cache hit):**
```json
{
  "talking_points": [ { "label": "...", "content": "..." } ],
  "cached": true
}
```

**Response (cache miss — freshly generated):**
```json
{
  "talking_points": [ { "label": "...", "content": "..." } ],
  "cached": false
}
```

**Response (rate limited):**
```json
{ "error": "You've generated a lot of talking points this hour — try again shortly." }
```

---

## `GET /api/debug/market-data`

Diagnostic endpoint — returns the processed market data for all 19 symbols directly from Yahoo Finance without writing to the database.

**Auth:** Same `CRON_SECRET` check.

**Runtime:** `nodejs`

**Response:**
```json
{
  "tickers": [ { "ticker": "SPY", "label": "S&P 500", "value": "...", ... } ]
}
```

---

## Vercel Cron Configuration

Defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/fetch-briefing", "schedule": "0 11 * * 1-5" },
    { "path": "/api/cron/watchdog",       "schedule": "45 11 * * 1-5" }
  ]
}
```

Vercel sends a `POST` request with an `Authorization: Bearer <CRON_SECRET>` header. Both routes accept this format as an alternative to `x-cron-secret`.
