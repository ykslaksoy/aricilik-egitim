-- koloni-165: davet bekleyen üyenin yetkileri kabul edilene kadar kapalı (zorunlu)
alter table public.apiary_invites add column if not exists mali_gorur boolean not null default false;
alter table public.apiary_invites add column if not exists gorev_atar boolean not null default false;
alter table public.apiary_invites add column if not exists duzenler boolean not null default false;
alter table public.apiary_invites drop constraint if exists apiary_invites_yetki_kapali;
alter table public.apiary_invites add constraint apiary_invites_yetki_kapali check (not mali_gorur and not gorev_atar and not duzenler);
-- yetki RPC'si yalnız kabul edilmiş üye satırına işler (davet satırına değil) — sa_uye_yetki zaten apiary_members'a yazar
