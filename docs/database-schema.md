# Database Schema

Hosted on Supabase (Postgres). All tables use UUID primary keys and Row Level Security (RLS).

---

## `daily_briefings`

One row per calendar day. Written by the cron job, read by the page.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `date` | `date` | Unique. One row per calendar day (Eastern Time). |
| `market_data` | `jsonb` | Array of `MarketTicker` objects for all 21 instruments |
| `headlines` | `jsonb` | Array of `Headline` objects (7–10 per day) |
| `macro_events` | `jsonb` | Array of `{ name, time }` for today's scheduled events |
| `overnight_summary` | `text` | AI-generated 2–3 sentence pre-market narrative |
| `created_at` | `timestamptz` | When the cron last wrote this row — drives "Data as of" UI label |

### `MarketTicker` shape
```json
{
  "ticker": "SPY",
  "label": "S&P 500",
  "value": "5,283.40",
  "move": "+0.42%",
  "move_unit": "pct",
  "direction": "up"
}
```
`move_unit` is `"pct"` for equities/FX/commodities, `"bps"` for bonds.
`direction` is `"up"`, `"down"`, or `"flat"`.

### `Headline` shape
```json
{
  "title": "Fed Holds Rates Steady, Signals Caution on Cuts",
  "summary": "The Federal Reserve kept its benchmark rate unchanged...",
  "source": "Reuters",
  "url": "https://www.reuters.com/markets/us/fed-holds-rates-2025-06-10/",
  "published_at": "Jun 10, 6:15am ET"
}
```

---

## `article_talking_points`

One row per article per briefing day. Written on first "Get Talking Points" click, read on all subsequent clicks.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `article_url_hash` | `text` | SHA-256 of the article URL — lookup key |
| `article_title` | `text` | Stored for logging and debugging |
| `briefing_date` | `date` | Links to the day this article appeared in |
| `talking_points` | `jsonb` | Array of 7 `{ label, content }` objects |
| `claim_count` | `integer` | Default 0 — reserved for future use |
| `created_at` | `timestamptz` | When talking points were first generated |

Unique constraint on `(article_url_hash, briefing_date)`.

### `TalkingPoint` shape
```json
{
  "label": "Expected vs. happened",
  "content": "Analysts had expected a 25bps cut..."
}
```

---

## `cron_logs`

Append-only audit log. Written after every cron run — both success and failure.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `job_name` | `text` | `"fetch-briefing"` |
| `status` | `text` | `"success"` or `"error"` |
| `error_message` | `text` | Null on success; error detail on failure |
| `ran_at` | `timestamptz` | Default `now()` |

### Useful queries

```sql
-- Last 10 cron runs
SELECT * FROM cron_logs ORDER BY ran_at DESC LIMIT 10;

-- All failures in the past week
SELECT * FROM cron_logs
WHERE status = 'error'
  AND ran_at > now() - interval '7 days'
ORDER BY ran_at DESC;

-- Check if today's briefing was fetched
SELECT job_name, status, ran_at FROM cron_logs
WHERE ran_at::date = current_date
ORDER BY ran_at DESC;
```
