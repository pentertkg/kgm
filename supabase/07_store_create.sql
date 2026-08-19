-- ============================================================
-- 07_store_create.sql — สร้างร้าน + ตั้งเจ้าของ ในคำสั่งเดียว
-- ------------------------------------------------------------
-- ทำไมต้องมีไฟล์นี้:
--   1) เดิม client ยิง 2 คำสั่ง (insert stores แล้ว insert store_members)
--      ถ้าล้มระหว่างกลางจะได้ "ร้านกำพร้า" ที่ไม่มีสมาชิก — มองไม่เห็นและลบไม่ได้
--      เพราะนโยบาย SELECT ของ stores ต้องเป็นสมาชิกร้านนั้น
--   2) insert ... returning ของ PostgREST (Prefer: return=representation)
--      ต้องผ่านนโยบาย SELECT ด้วย แต่ตอน insert ยังไม่มีแถวสมาชิก
--      จึงถูกปฏิเสธด้วย 42501 ทำให้ "สร้างร้านครั้งแรก" ใช้งานไม่ได้เลย
-- ทั้งสองข้อหายไปถ้าทำในฟังก์ชันเดียวแบบ atomic
-- ============================================================

create or replace function create_my_store(
  p_name         text,
  p_emoji        text default '🌿',
  p_format       text default 'Street Food',
  p_food_type    text default 'ตามสั่ง / อาหารจานเดียว',
  p_location     text default null,
  p_open         time default '08:00',
  p_close        time default '20:00',
  p_staff        int  default 1,
  p_goal         numeric default 300000,
  p_target_margin numeric default 35
) returns stores
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  s   stores;
begin
  if uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนสร้างร้าน';
  end if;
  -- ความยินยอมข้อจำเป็นต้องมีก่อน (เงื่อนไขเดียวกับ policy stores_insert)
  if not has_consent('account') then
    raise exception 'ต้องให้ความยินยอมข้อที่จำเป็นก่อนสร้างร้าน';
  end if;
  -- กันสร้างซ้ำจากการกดปุ่มรอบสอง/เน็ตกระตุก
  -- (Multi-store อยู่ใน P2 — เมื่อทำ ให้ผ่อนเงื่อนไขนี้)
  if exists (select 1 from store_members m
              where m.user_id = uid and m.role = 'owner') then
    raise exception 'บัญชีนี้มีร้านอยู่แล้ว';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'ต้องใส่ชื่อร้าน';
  end if;

  insert into stores (name, emoji, format, food_type, location,
                      open_time, close_time, staff_count, goal_month, target_margin)
  values (btrim(p_name), coalesce(p_emoji,'🌿'), p_format, p_food_type, p_location,
          p_open, p_close, greatest(coalesce(p_staff,1),1), p_goal, p_target_margin)
  returning * into s;

  insert into store_members (store_id, user_id, role) values (s.id, uid, 'owner');
  return s;
end $$;

comment on function create_my_store(text,text,text,text,text,time,time,int,numeric,numeric) is
  'สร้างร้านและตั้งผู้เรียกเป็น owner ในทรานแซกชันเดียว — เลี่ยงร้านกำพร้าและปัญหา RETURNING ติด RLS';

revoke execute on function create_my_store(text,text,text,text,text,time,time,int,numeric,numeric) from public, anon;
grant  execute on function create_my_store(text,text,text,text,text,time,time,int,numeric,numeric) to authenticated;

-- ─── เก็บกวาดร้านกำพร้าที่เกิดจากบั๊กนี้ (ไม่มีสมาชิกเลย = ไม่มีใครเข้าถึงได้) ───
delete from stores s
 where not exists (select 1 from store_members m where m.store_id = s.id);

select 'store creation fixed' as status,
       (select count(*) from stores) as stores_left;
