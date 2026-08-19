-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Security hardening
-- แก้ตามที่ Supabase Security Advisor รายงาน (0 errors / 16 warnings)
--
-- 1) Postgres ให้สิทธิ์ EXECUTE ของฟังก์ชันแก่ role PUBLIC โดยปริยาย
--    การเขียน `grant execute ... to authenticated` ไม่ได้ลบสิทธิ์ PUBLIC ออก
--    ผลคือ anon (ยังไม่ล็อกอิน) เรียกฟังก์ชัน SECURITY DEFINER ได้ทุกตัว
--    → revoke จาก public และ anon ให้หมด แล้วให้เฉพาะ authenticated
--
--    หมายเหตุ: ฟังก์ชันที่ถูกใช้ใน RLS policy (is_store_member, has_store_role,
--    store_has_no_members, has_consent) ต้องคง EXECUTE ให้ authenticated ไว้
--    เพราะ policy ประเมินด้วยสิทธิ์ของผู้เรียก ถ้าไม่มีสิทธิ์ query จะ error
--
-- 2) policy stores_insert เดิมเป็น `with check (true)` = ใครที่ล็อกอินก็สร้าง
--    ร้านเปล่าได้ไม่จำกัด → บังคับให้ต้องยินยอมก่อน (ตรงกับ members_write)
--
-- string literal ทั้งไฟล์เป็น ASCII โดยเจตนา
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. ปิดสิทธิ์ที่หลุดไปถึง anon / public ───────────────────────────────
revoke execute on function is_store_member(uuid)                             from public, anon;
revoke execute on function has_store_role(uuid, store_role[])                from public, anon;
revoke execute on function store_has_no_members(uuid)                        from public, anon;
revoke execute on function has_consent(consent_purpose)                      from public, anon;
revoke execute on function grant_consents(consent_purpose[], text)           from public, anon;
revoke execute on function withdraw_consent(consent_purpose)                 from public, anon;
revoke execute on function delete_my_account()                               from public, anon;

-- ฟังก์ชัน trigger ไม่ควรถูกเรียกจาก API เลย
revoke execute on function touch_updated_at()            from public, anon, authenticated;
revoke execute on function assign_order_code()           from public, anon, authenticated;
revoke execute on function fill_order_line_snapshot()    from public, anon, authenticated;
revoke execute on function apply_stock_on_complete()     from public, anon, authenticated;
revoke execute on function guard_ingredient_cost()       from public, anon, authenticated;

-- คงสิทธิ์เท่าที่จำเป็นให้ผู้ที่ล็อกอินแล้ว
grant execute on function is_store_member(uuid)                    to authenticated;
grant execute on function has_store_role(uuid, store_role[])       to authenticated;
grant execute on function store_has_no_members(uuid)               to authenticated;
grant execute on function has_consent(consent_purpose)             to authenticated;
grant execute on function grant_consents(consent_purpose[], text)  to authenticated;
grant execute on function withdraw_consent(consent_purpose)        to authenticated;
grant execute on function delete_my_account()                      to authenticated;

-- กันของใหม่ในอนาคตไม่ให้หลุดถึง public โดยปริยายอีก
alter default privileges in schema public revoke execute on functions from public;

-- ─── 2. ปิดช่องสร้างร้านเปล่าไม่จำกัด ─────────────────────────────────────
drop policy if exists stores_insert on stores;
create policy stores_insert on stores for insert to authenticated
  with check (has_consent('account'));

-- ─── 3. ตรวจผล ───────────────────────────────────────────────────────────
select p.proname as function_name,
       coalesce(array_to_string(p.proacl, ' '), '(default = public ok)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
