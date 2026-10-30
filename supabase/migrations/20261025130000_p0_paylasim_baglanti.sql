-- P0-1: Kovan paneli — süreli salt okunur paylaşım bağlantısı (girişsiz okuma)

create table if not exists public.kovan_paylasim (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  apiary_id uuid not null references public.apiaries (id) on delete cascade,
  hive_key text not null,
  hive_name text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  baslangic timestamptz not null default now(),
  bitis timestamptz not null,
  iptal_at timestamptz,
  created_at timestamptz not null default now(),
  constraint kovan_paylasim_token_key unique (token)
);

create index if not exists kovan_paylasim_owner_idx on public.kovan_paylasim (owner_id, created_at desc);
create index if not exists kovan_paylasim_hive_idx on public.kovan_paylasim (hive_key, bitis desc);

alter table public.kovan_paylasim enable row level security;

drop policy if exists kpay_owner_sel on public.kovan_paylasim;
create policy kpay_owner_sel on public.kovan_paylasim for select to authenticated
  using (owner_id = auth.uid());

revoke all on public.kovan_paylasim from anon, authenticated;
grant select on public.kovan_paylasim to authenticated;

create or replace function public.sa_ozellik_acik(p_anahtar text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select acik from public.ozellik_bayraklari where anahtar = p_anahtar limit 1), false);
$$;
revoke all on function public.sa_ozellik_acik(text) from public;
grant execute on function public.sa_ozellik_acik(text) to anon, authenticated;

create or replace function public.sa_paylasim_olustur(p_hive_key text, p_gun int default 7)
returns table (token uuid, bitis timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  h public.hives%rowtype;
  ap_name text;
  snap jsonb;
  g int := greatest(1, least(coalesce(p_gun, 7), 90));
  exp timestamptz := now() + make_interval(days => g);
  tok uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'Giriş gerekli'; end if;
  if not public.sa_ozellik_acik('paylasim_baglanti') then raise exception 'Paylaşım bağlantısı kapalı'; end if;
  select * into h from public.hives where key = p_hive_key and not deleted;
  if not found then raise exception 'Kovan bulunamadı'; end if;
  if not public.sa_is_member(h.apiary_id) then raise exception 'Yetki yok'; end if;
  select a.name into ap_name from public.apiaries a where a.id = h.apiary_id;
  snap := jsonb_build_object(
    'v', 1,
    'hiveKey', h.key,
    'hiveName', h.name,
    'apiaryName', coalesce(ap_name, ''),
    'hive', h.data
  );
  insert into public.kovan_paylasim (token, owner_id, apiary_id, hive_key, hive_name, snapshot, bitis)
  values (tok, uid, h.apiary_id, h.key, h.name, snap, exp);
  return query select tok, exp;
end;
$$;
revoke all on function public.sa_paylasim_olustur(text, int) from public, anon;
grant execute on function public.sa_paylasim_olustur(text, int) to authenticated;

create or replace function public.sa_paylasim_oku(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  row public.kovan_paylasim%rowtype;
begin
  if not public.sa_ozellik_acik('paylasim_baglanti') then return null; end if;
  select * into row from public.kovan_paylasim
  where token = p_token and iptal_at is null and baslangic <= now() and bitis > now();
  if not found then return null; end if;
  return jsonb_build_object(
    'hiveName', row.hive_name,
    'apiaryName', coalesce(row.snapshot->>'apiaryName', ''),
    'bitis', row.bitis,
    'snapshot', row.snapshot
  );
end;
$$;
revoke all on function public.sa_paylasim_oku(uuid) from public;
grant execute on function public.sa_paylasim_oku(uuid) to anon, authenticated;

create or replace function public.sa_paylasim_iptal(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null then return false; end if;
  update public.kovan_paylasim set iptal_at = now()
  where token = p_token and owner_id = uid and iptal_at is null;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
revoke all on function public.sa_paylasim_iptal(uuid) from public, anon;
grant execute on function public.sa_paylasim_iptal(uuid) to authenticated;

create or replace function public.sa_paylasim_liste(p_hive_key text)
returns table (token uuid, bitis timestamptz, iptal_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select k.token, k.bitis, k.iptal_at, k.created_at
  from public.kovan_paylasim k
  where k.owner_id = auth.uid() and k.hive_key = p_hive_key
  order by k.created_at desc
  limit 30;
$$;
revoke all on function public.sa_paylasim_liste(text) from public, anon;
grant execute on function public.sa_paylasim_liste(text) to authenticated;
