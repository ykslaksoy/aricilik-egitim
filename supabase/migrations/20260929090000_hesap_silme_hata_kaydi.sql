-- SüperArı: (1) KVKK — kullanıcının kendi hesabını silmesi, (2) kendi sunucumuzda uygulama hata kaydı.
-- Supabase → SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

-- (1) Hesabı sil: sahibi olunan arılıklar (ve içindeki tüm kovan/kayıt/görev/stok/fotoğraf satırları, ekip üyelikleri,
--     davetler) ile kullanıcının kendi satırları silinir, ardından auth kullanıcısı silinir (diğer tablolar «on delete cascade»).
--     Fotoğraf dosyaları (storage) uygulama tarafından önce Storage API ile silinir.
create or replace function public.sa_delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Oturum yok';
  end if;
  delete from public.apiaries where owner_id = me;
  delete from auth.users where id = me;
  return true;
end;
$$;
revoke all on function public.sa_delete_my_account() from public;
revoke all on function public.sa_delete_my_account() from anon;
grant execute on function public.sa_delete_my_account() to authenticated;

-- (2) Hata kaydı: yalnız /api/log (Vercel) yazar; tabloya istemci doğrudan erişemez (RLS açık, politika yok).
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  app_version text,
  page text,
  kind text,
  message text not null,
  source text,
  line integer,
  col integer,
  stack text,
  ua text,
  mode text,
  ip_hash text
);
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
create index if not exists client_errors_ip_idx on public.client_errors (ip_hash, created_at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

-- Yazma: sınırlı (saatte en çok 2000 kayıt; aynı istemci özeti için 10 dakikada en çok 20; aynı mesaj 10 dakikada bir kez).
create or replace function public.sa_log_client_error(p jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ih text := left(coalesce(p->>'ip_hash', ''), 64);
  msg text := left(coalesce(p->>'message', ''), 500);
begin
  if msg = '' then return false; end if;
  if (select count(*) from public.client_errors where created_at > now() - interval '1 hour') >= 2000 then return false; end if;
  if ih <> '' and (select count(*) from public.client_errors where ip_hash = ih and created_at > now() - interval '10 minutes') >= 20 then return false; end if;
  if exists (select 1 from public.client_errors where ip_hash = ih and message = msg and created_at > now() - interval '10 minutes') then return false; end if;
  insert into public.client_errors (app_version, page, kind, message, source, line, col, stack, ua, mode, ip_hash)
  values (
    left(p->>'v', 40), left(p->>'page', 120), left(p->>'kind', 20), msg, left(p->>'source', 200),
    case when coalesce(p->>'line', '') ~ '^[0-9]{1,9}$' then (p->>'line')::int end,
    case when coalesce(p->>'col', '') ~ '^[0-9]{1,9}$' then (p->>'col')::int end,
    left(p->>'stack', 2000), left(p->>'ua', 300), left(p->>'mode', 10), nullif(ih, '')
  );
  -- ara sıra 90 günden eski kayıtları temizle
  if random() < 0.02 then
    delete from public.client_errors where created_at < now() - interval '90 days';
  end if;
  return true;
end;
$$;
revoke all on function public.sa_log_client_error(jsonb) from public;
grant execute on function public.sa_log_client_error(jsonb) to anon, authenticated, service_role;
