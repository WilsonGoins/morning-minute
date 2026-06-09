-- Morning Briefing — Supabase Schema
-- Run this in the Supabase SQL editor to initialize the database.

create extension if not exists "uuid-ossp";

-- Daily briefings: one row per calendar day
create table if not exists daily_briefings (
  id          uuid primary key default uuid_generate_v4(),
  date        date unique not null,
  market_data jsonb not null default '[]',
  headlines   jsonb not null default '[]',
  macro_events jsonb not null default '[]',
  overnight_summary text not null default '',
  created_at  timestamptz not null default now()
);

-- Talking points cache: one row per article per day
create table if not exists article_talking_points (
  id               uuid primary key default uuid_generate_v4(),
  article_url_hash text not null,
  article_title    text not null default '',
  briefing_date    date not null,
  talking_points   jsonb not null default '[]',
  claim_count      integer not null default 0,
  created_at       timestamptz not null default now(),
  unique (article_url_hash, briefing_date)
);

-- Cron job audit log
create table if not exists cron_logs (
  id            uuid primary key default uuid_generate_v4(),
  job_name      text not null,
  status        text not null check (status in ('success', 'error')),
  error_message text,
  ran_at        timestamptz not null default now()
);

-- RLS: allow public read on daily_briefings and article_talking_points
alter table daily_briefings enable row level security;
alter table article_talking_points enable row level security;
alter table cron_logs enable row level security;

create policy "public read daily_briefings"
  on daily_briefings for select using (true);

create policy "public read article_talking_points"
  on article_talking_points for select using (true);

-- Service role can do everything (bypasses RLS by default)

-- Helper: atomically increment claim_count
create or replace function increment_claim_count(
  p_url_hash text,
  p_briefing_date date
) returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update article_talking_points
  set claim_count = claim_count + 1
  where article_url_hash = p_url_hash
    and briefing_date = p_briefing_date
  returning claim_count into v_count;

  if v_count is null then
    raise exception 'Article not found: %', p_url_hash;
  end if;

  return v_count;
end;
$$;
