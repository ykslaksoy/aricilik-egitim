-- SüperArı — Web Push abonelikleri ve tekrar önleme günlüğü.
-- Not: /api/push-subscribe ve /api/push-cron bu şemayı ilk çalıştırmada idempotent olarak kendisi de kurar (api/_push-lib.js SCHEMA_SQL).
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  keys jsonb not null,
  ua text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  fail_count integer not null default 0
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create table if not exists public.push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  title text,
  sent_at timestamptz not null default now(),
  primary key (user_id, dedupe_key)
);
alter table public.push_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'push_subscriptions_own') then
    create policy push_subscriptions_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_log' and policyname = 'push_log_own_read') then
    create policy push_log_own_read on public.push_log for select to authenticated using (user_id = auth.uid());
  end if;
end $$;
