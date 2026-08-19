-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Phase 2 · ระบบสมาชิก + ความยินยอม (PDPA)
--
-- หลักการที่ยึดไว้
-- 1) เก็บข้อมูลส่วนบุคคลเท่าที่จำเป็น = "อีเมลเท่านั้น"
--    อีเมลอยู่ใน auth.users ของ Supabase อยู่แล้ว จึงไม่สร้างตาราง profiles
--    มาเก็บซ้ำ และไม่มีคอลัมน์ชื่อ-นามสกุล เบอร์โทร รูป หรืออื่นใด
-- 2) ไม่มีรหัสผ่าน — เข้าสู่ระบบด้วยรหัส 6 หลักที่ส่งไปยังอีเมล (OTP)
--    ไม่มีรหัสผ่านให้เก็บ ไม่มีให้รั่ว ไม่มี flow ลืมรหัสผ่าน
-- 3) ตาราง consents เก็บ "หลักฐานการยินยอม" เท่าที่จำเป็น:
--    ใคร (user_id) · ยินยอมเรื่องอะไร (purpose) · นโยบายเวอร์ชันไหน · เมื่อไร
--    ตั้งใจ *ไม่* เก็บ IP address และ user-agent เพราะทั้งสองเป็นข้อมูล
--    ส่วนบุคคลเพิ่มเติมที่ไม่จำเป็นต่อการพิสูจน์ความยินยอม
-- 4) ถอนความยินยอมได้ง่ายเท่ากับการให้ และลบบัญชีได้เอง (สิทธิที่จะถูกลืม)
--
-- string literal ทั้งไฟล์เป็น ASCII โดยเจตนา เพื่อให้วางผ่านเครื่องมือใดก็ไม่เพี้ยน
-- ข้อความภาษาไทยที่ผู้ใช้เห็น อยู่ในหน้าเว็บ (login.html / privacy.html)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── เวอร์ชันของคำชี้แจงความเป็นส่วนตัว ───────────────────────────────────
create table if not exists privacy_policies (
  version        text primary key,               -- '2026-08-19'
  summary        text not null,
  effective_from date not null default current_date,
  created_at     timestamptz not null default now()
);

insert into privacy_policies (version, summary, effective_from)
values ('2026-08-19',
        'Collects email address only. Purpose: account identity and service notices. No tracking, no profiling, no sharing.',
        current_date)
on conflict (version) do nothing;

-- ─── วัตถุประสงค์ที่ขอความยินยอม ──────────────────────────────────────────
do $$ begin
  create type consent_purpose as enum (
    -- account       = จำเป็นต่อการมีบัญชี (ไม่ยินยอม = ใช้งานไม่ได้)
    -- service_email = อีเมลแจ้งเตือนเรื่องร้าน เช่น ของใกล้หมด (เลือกได้)
    -- product_news  = ข่าวฟีเจอร์ใหม่ (เลือกได้)
    'account',
    'service_email',
    'product_news'
  );
exception when duplicate_object then null; end $$;

-- ─── บันทึกความยินยอม ────────────────────────────────────────────────────
create table if not exists consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  purpose        consent_purpose not null,
  policy_version text not null references privacy_policies(version),
  granted_at     timestamptz not null default now(),
  withdrawn_at   timestamptz,
  unique (user_id, purpose, policy_version)
);
create index if not exists consents_user_idx on consents(user_id);

comment on table consents is
  'Consent records. Intentionally stores no IP address or user-agent: not required to evidence consent and would collect more personal data than necessary.';

-- ─── helper: ผู้ใช้ปัจจุบันยินยอมเรื่องนี้อยู่หรือไม่ ────────────────────────
create or replace function has_consent(p_purpose consent_purpose)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from consents
    where user_id = auth.uid()
      and purpose = p_purpose
      and withdrawn_at is null
  );
$$;

-- ─── ให้ความยินยอม (idempotent: ให้ซ้ำได้ ถือเป็นการยืนยันอีกครั้ง) ────────
create or replace function grant_consents(p_purposes consent_purpose[], p_version text)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'must be signed in to record consent';
  end if;
  insert into consents (user_id, purpose, policy_version)
  select uid, p, p_version from unnest(p_purposes) as p
  on conflict (user_id, purpose, policy_version)
  do update set withdrawn_at = null, granted_at = now();
end $$;

-- ─── ถอนความยินยอม (ง่ายเท่ากับการให้) ────────────────────────────────────
create or replace function withdraw_consent(p_purpose consent_purpose)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'must be signed in';
  end if;
  update consents set withdrawn_at = now()
   where user_id = uid and purpose = p_purpose and withdrawn_at is null;
end $$;

-- ─── ลบบัญชีตัวเอง (สิทธิที่จะถูกลืม) ─────────────────────────────────────
-- ลบทั้งบัญชี ความยินยอม และสมาชิกภาพร้าน
-- ถ้าเป็นเจ้าของร้านคนเดียว ร้านและข้อมูลทั้งหมดของร้านจะถูกลบตามไปด้วย
create or replace function delete_my_account()
returns json language plpgsql security definer
set search_path = public, auth, pg_temp as $$
declare
  uid            uuid := auth.uid();
  stores_removed int  := 0;
begin
  if uid is null then
    raise exception 'must be signed in';
  end if;

  with sole_owner as (
    select m.store_id from store_members m
     where m.user_id = uid and m.role = 'owner'
       and (select count(*) from store_members m2 where m2.store_id = m.store_id) = 1
  ), gone as (
    delete from stores s where s.id in (select store_id from sole_owner) returning 1
  )
  select count(*) into stores_removed from gone;

  delete from store_members where user_id = uid;
  delete from consents      where user_id = uid;
  delete from auth.users    where id = uid;

  return json_build_object('deleted', true, 'stores_removed', stores_removed);
end $$;

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table privacy_policies enable row level security;
alter table consents         enable row level security;

drop policy if exists policies_read on privacy_policies;
create policy policies_read on privacy_policies for select
  -- คำชี้แจงต้องอ่านได้ก่อนสมัคร จึงเปิดให้ anon อ่านด้วย
  to anon, authenticated using (true);

drop policy if exists consents_own_read on consents;
create policy consents_own_read on consents for select to authenticated
  using (user_id = auth.uid());

-- เขียนได้ผ่านฟังก์ชันเท่านั้น (grant_consents / withdraw_consent)
-- จึงไม่เปิด policy insert/update/delete ให้เขียนตรง

-- ต้องยินยอม 'account' ก่อน จึงจะผูกตัวเองเข้าร้านได้
drop policy if exists members_write on store_members;
create policy members_write on store_members for all to authenticated
  using (
    (user_id = auth.uid() and role = 'owner' and store_has_no_members(store_id))
    or has_store_role(store_id, array['owner']::store_role[])
  )
  with check (
    (
      user_id = auth.uid() and role = 'owner'
      and store_has_no_members(store_id)
      and has_consent('account')
    )
    or has_store_role(store_id, array['owner']::store_role[])
  );

-- ─── สิทธิเรียกใช้ ────────────────────────────────────────────────────────
grant select on privacy_policies to anon, authenticated;
grant select on consents to authenticated;
grant execute on function has_consent(consent_purpose)                     to authenticated;
grant execute on function grant_consents(consent_purpose[], text)          to authenticated;
grant execute on function withdraw_consent(consent_purpose)                to authenticated;
grant execute on function delete_my_account()                              to authenticated;
