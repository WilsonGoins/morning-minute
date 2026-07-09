# Morning Minute

A daily financial morning briefing app. Every user opens the same URL and sees the same content — no login required. The briefing is fetched on demand (manual trigger or the in-app refresh button), cached in a database, and served instantly on page load.

**Created by [Wilson Goins](https://github.com/wilsonfgoins)**

---

## What It Does

When the briefing is triggered (manually via the cron endpoint, or by the in-app refresh button), the pipeline:
1. Fetches live prices for 21 market instruments via Yahoo Finance
2. Uses Claude (Anthropic) with web search to pull the top 7–10 financial headlines from major outlets, identify today's macro events, and write an overnight market narrative
3. Caches everything in Supabase — zero AI or market-data calls on page load

Users can then click any headline to generate structured talking points. Talking points are cached on first generation and served instantly on repeat views. The app retains the last 5 working days of briefings for historical reference.

---

## News Sources

Headlines are sourced from the following publications via Anthropic's web search tool. Claude selects the 7–10 most market-moving stories across all sources each morning:

| Source | Type |
|---|---|
| Reuters | Free |
| AP (Associated Press) | Free |
| CNBC | Free |
| Yahoo Finance | Free |
| Financial Times | Paid (paywalled) |
| Bloomberg | Paid (paywalled) |
| Wall Street Journal | Paid (paywalled) |
| Barron's | Paid (paywalled) |

Paywalled articles are marked with a `$` badge in the UI. Talking points for these are generated from the headline and summary only, since the full article text is not accessible.

---

## Market Data

Prices and moves for all 21 instruments are fetched via **yahoo-finance2** (open source, no API key required):

| Asset Class | Instruments |
|---|---|
| US Equities | S&P 500, Nasdaq 100 |
| European Equities | EURO STOXX 50, STOXX 600, DAX, FTSE 100 |
| Asian Equities | Nikkei 225, Shanghai Composite, Nifty 50 |
| Volatility | VIX, VSTOXX |
| Government Bonds | US 2yr Treasury, US 10yr Treasury, US 30yr Treasury, German 10yr Bund, Japan 10yr JGB |
| FX | EUR/USD, GBP/USD |
| Commodities | Gold (spot), WTI Crude, Brent Crude |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (Postgres + RLS) |
| Hosting & Cron | Vercel |
| Market Data | yahoo-finance2 |
| AI — News Search | Anthropic `claude-sonnet-4-6` + `web_search_20250305` |
| AI — JSON Format | Anthropic `claude-haiku-4-5` |
| AI — Talking Points | Anthropic `claude-sonnet-4-6` |
| Rate Limiting | Upstash Redis + `@upstash/ratelimit` |
| Styling | Tailwind CSS v4 |

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (auto-clears .next cache on each start)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To manually trigger the briefing fetch locally:

```bash
curl http://localhost:3000/api/cron/fetch-briefing \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
```

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API |
| `UPSTASH_REDIS_REST_URL` | [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | [console.upstash.com](https://console.upstash.com) |
| `CRON_SECRET` | Any long random string — used to protect cron endpoints |

---

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel project settings.

There are no scheduled cron jobs — briefings are fetched on demand. `/api/cron/fetch-briefing` can be triggered manually (with the `CRON_SECRET` header), and users can trigger a refresh from the in-app retry button (`/api/refresh-briefing`, 4-hour cooldown).

Query the `cron_logs` table in Supabase for detailed run history.

---

## Documentation

- [Architecture](docs/architecture.md) — data flow, pipeline, retry logic
- [Database Schema](docs/database-schema.md) — all tables and columns
- [API Routes](docs/api-routes.md) — every endpoint, auth, and rate limits
- [Talking Points Framework](docs/talking-points-framework.md) — framework detail

---

## License

Public.
