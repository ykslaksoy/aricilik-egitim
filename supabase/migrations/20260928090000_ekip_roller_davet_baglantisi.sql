-- SüperArı · Ekip paylaşımı: roller (sahip / yardımcı / izleyici) + bağlantıyla davet
-- Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenlidir).
-- Roller: 'owner' = Sahip · 'yardimci' = Yardımcı (okur + yazar) · 'izleyici' = İzleyici (yalnız okur)
-- Eski 'uye' değeri 'yardimci' sayılır.

-- ---------------------------------------------------------------- roller
alter table public.apiary_members drop constraint if exists apiary_members_role_check;
alter table public.apiary_invites drop constraint if exists apiary_invites_role_check;
update public.apiary_members set role = 'yardimci' where role = 'uye';
update public.apiary_invites set role = 'yardimci' where role = 'uye';
alter table public.apiary_members alter column role set default 'yardimci';
alter table public.apiary_invites alter column role set default 'yardimci';
alter table public.apiary_members add constraint apiary_members_role_check check (role in ('owner', 'yardimci', 'izleyici', 'uye'));
alter table public.apiary_invites add constraint apiary_invites_role_check check (role in ('yardimci', 'izleyici', 'uye'));

-- ---------------------------------------------------------------- bağlantıyla davet (e-postasız)
alter table public.apiary_invites alter column email drop not null;
alter table public.apiary_invites drop constraint if exists apiary_invites_email_check;
alter table public.apiary_invites add constraint apiary_invites_email_check
  check (email is null or (email = lower(email) and position('@' in email) > 1));
alter table public.apiary_invites add column if not exists token uuid not null default gen_random_uuid();
alter table public.apiary_invites add column if not exists expires_at timestamptz;
create unique index if not exists invites_token_idx on public.apiary_invites (token);

-- Yazma yetkisi: sahip veya yardımcı (izleyici yazamaz)
create or replace function public.sa_can_write(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select aid is not null and exists (
    select 1 from public.apiary_members m
    where m.apiary_id = aid and m.user_id = auth.uid() and m.role in ('owner', 'yardimci', 'uye')
  );
$$;
grant execute on function public.sa_can_write(uuid) to authenticated;

-- arılıklar: sahip + yardımcı düzenler; izleyici yalnız görür
drop policy if exists sa_apiaries_update on public.apiaries;
create policy sa_apiaries_update on public.apiaries for update to authenticated
  using (owner_id = auth.uid() or public.sa_can_write(id))
  with check (owner_id = auth.uid() or public.sa_can_write(id));

-- davet: yalnız sahip; 'owner' rolüyle davet edilemez (check kısıtı)
drop policy if exists sa_invites_insert on public.apiary_invites;
create policy sa_invites_insert on public.apiary_invites for insert to authenticated
  with check (public.sa_is_owner(apiary_id));
drop policy if exists sa_invites_update on public.apiary_invites;
create policy sa_invites_update on public.apiary_invites for update to authenticated
  using (public.sa_is_owner(apiary_id)) with check (public.sa_is_owner(apiary_id));

-- üye rolü doğrudan güncellenmez; sa_set_member_role kullanılır (sahip satırı korunur)
drop policy if exists sa_members_update on public.apiary_members;

-- eşitlenen tablolar: izleyici yazamaz
do $$
declare t text;
begin
  foreach t in array array['hives', 'queens', 'records', 'tasks', 'stock_items', 'photos'] loop
    execute format('drop policy if exists sa_%s_insert on public.%I', t, t);
    execute format('create policy sa_%s_insert on public.%I for insert to authenticated with check (owner_id = auth.uid() and (apiary_id is null or public.sa_can_write(apiary_id)))', t, t);
    execute format('drop policy if exists sa_%s_update on public.%I', t, t);
    execute format('create policy sa_%s_update on public.%I for update to authenticated using ((apiary_id is null and owner_id = auth.uid()) or public.sa_can_write(apiary_id)) with check (public.sa_can_write(apiary_id) or (apiary_id is null and owner_id = auth.uid()))', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RPC
-- Bağlantıdaki davet kodunu kabul eder. E-postalı davette giriş e-postası eşleşmelidir.
create or replace function public.sa_accept_invite_token(tok uuid)
returns table (apiary_id uuid, name text, role text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  inv public.apiary_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Önce giriş yapın';
  end if;
  select * into inv from public.apiary_invites i
    where i.token = tok and i.accepted_at is null and (i.expires_at is null or i.expires_at > now());
  if not found then
    raise exception 'Davet bulunamadı, kullanılmış veya süresi dolmuş';
  end if;
  if inv.email is not null and inv.email <> em then
    raise exception 'Bu davet başka bir e-posta adresine gönderilmiş';
  end if;
  insert into public.apiary_members (apiary_id, user_id, role) values (inv.apiary_id, auth.uid(), inv.role)
    on conflict on constraint apiary_members_pkey do nothing;
  update public.apiary_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return query select a.id, a.name, inv.role from public.apiaries a where a.id = inv.apiary_id;
end $$;

-- Sahip, bir üyenin rolünü değiştirir (yardimci / izleyici). Sahip satırı değişmez.
create or replace function public.sa_set_member_role(aid uuid, uid uuid, new_role text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_owner(aid) then raise exception 'Yalnız arılık sahibi rol değiştirebilir'; end if;
  if new_role not in ('yardimci', 'izleyici') then raise exception 'Geçersiz rol'; end if;
  update public.apiary_members set role = new_role where apiary_id = aid and user_id = uid and role <> 'owner';
  return found;
end $$;

revoke all on function public.sa_accept_invite_token(uuid) from public, anon;
revoke all on function public.sa_set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.sa_accept_invite_token(uuid) to authenticated;
grant execute on function public.sa_set_member_role(uuid, uuid, text) to authenticated;
