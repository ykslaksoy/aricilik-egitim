-- koloni-180 (1): Varroa/stres sesi — sadece kayıttan düşük seviyeli hatırlatmaya («Varroa sayımı önerilir»). Teşhis değil.
update public.ses_siniflari set seviye = 'bilgi',
  anlam = 'Varroa sayımı önerilir — düşük seviyeli hatırlatma (teşhis değil; bant tabandan saparsa, en çok haftada bir görev)',
  durum = 'tek çalışma / model özelliği · sapma eşiği uzman tahmini', updated_at = now()
where id = 'stres_varroa';
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}', coalesce(data->'sensor','{}'::jsonb) || jsonb_build_object('varroaHzMin', 122, 'varroaHzMax', 396, 'varroaSapmaDb', 4, 'varroaGun', 7)), updated_at = now()
where id = 1 and not (coalesce(data->'sensor','{}'::jsonb) ? 'varroaSapmaDb');
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('varroa_hatirlatma','muayene',90,'Varroa sayımı hatırlatması','Bant 122–396 Hz son 24 saat ortancası kovanın önceki tabanından ≥ 4 dB sapma (panelden) → görev; en çok 7 günde bir; son 7 günde sayım varsa yok','bilgi',
 'Teşhis değil: ses yalnız sayım hatırlatır. Kaynaktaki bant tek başına eşik değil, çok özellikli sınıflandırıcının girdisidir; sapma eşiği uzman tahminidir.',
 'Yıldız B.İ., Karabağ K. (2026). When the hive speaks: detecting Varroa destructor infestation in honey bees through acoustic biomarkers and machine learning. Experimental and Applied Acarology 97(3):23. doi:10.1007/s10493-026-01179-y',
 'uzman tahmini')
on conflict (id) do update set degerler = excluded.degerler, seviye = excluded.seviye, aciklama = excluded.aciklama, kaynak = excluded.kaynak, durum = excluded.durum, updated_at = now();

-- koloni-180 (2): su kaynağı önbelleği — hücre = koordinat 2 ondalık (~1 km); 30 gün geçerli. Yalnız servis (edge function) yazar.
create table if not exists public.su_onbellek (
  anahtar text primary key, lat double precision not null, lon double precision not null,
  yaricap_m int not null, noktalar jsonb not null default '[]'::jsonb, hesaplandi timestamptz not null default now()
);
alter table public.su_onbellek enable row level security;
revoke all on public.su_onbellek from anon, authenticated;
grant select on public.su_onbellek to authenticated;
drop policy if exists su_onbellek_admin_okur on public.su_onbellek;
create policy su_onbellek_admin_okur on public.su_onbellek for select to authenticated using (public.sa_is_admin());
