-- ============================================================
-- 08_fix_erasure.sql — ทำให้ "ลบร้าน / ลบบัญชี" ทำงานได้จริง
-- ------------------------------------------------------------
-- ปัญหาที่พบตอนทดสอบ:
--   menu_recipes.ingredient_id ประกาศเป็น `on delete restrict`
--   เมื่อลบร้าน Postgres จะ cascade ไปลบ ingredients ของร้านนั้น
--   แต่ RESTRICT บล็อกไว้ → ลบร้านล้มด้วย 23503
--   ผลกระทบจริง: delete_my_account() ของผู้ใช้ที่เป็นเจ้าของร้านเดียว
--   จะล้มทั้งก้อน = สิทธิในการลบข้อมูลของตัวเอง (PDPA ม.33) ใช้ไม่ได้
--
-- การแก้: เปลี่ยนเป็น on delete cascade
--   บรรทัดสูตรที่ไม่มีวัตถุดิบอ้างถึงแล้วไม่มีความหมายอยู่ดี
--   ส่วนการกัน "ลบวัตถุดิบที่ยังมีเมนูใช้อยู่" ควรเตือนที่ชั้น UI
--   (บอกได้ว่าเมนูไหนใช้) ไม่ใช่ใช้ FK มาบล็อกจนสิทธิตามกฎหมายพัง
-- ============================================================

alter table menu_recipes
  drop constraint if exists menu_recipes_ingredient_id_fkey;

alter table menu_recipes
  add constraint menu_recipes_ingredient_id_fkey
  foreign key (ingredient_id) references ingredients(id) on delete cascade;

-- ตรวจว่าตารางลูกอื่น ๆ ที่ต้องหายตามร้านก็ตั้งค่าถูก
select tc.table_name, kcu.column_name, rc.delete_rule
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
  join information_schema.referential_constraints rc
    on rc.constraint_name = tc.constraint_name
 where tc.constraint_type = 'FOREIGN KEY'
   and tc.table_schema = 'public'
   and rc.delete_rule <> 'CASCADE'
 order by tc.table_name;

-- ============================================================
-- purge_store — ลบร้านและข้อมูลลูกทั้งหมด "ตามลำดับที่กำหนดเอง"
-- ------------------------------------------------------------
-- ทำไมไม่พึ่ง cascade ล้วน ๆ:
--   order_lines.menu_id และ purchase_order_lines.ingredient_id เป็น RESTRICT
--   โดยเจตนา (กันลบเมนูที่มีประวัติขาย ซึ่งจะทำให้ยอดขายย้อนหลังหาย)
--   แต่ลำดับการ cascade ระหว่างกิ่งพี่น้อง (menus กับ orders) Postgres
--   ไม่รับประกัน จึงอาจชนกฎนี้เป็นครั้งคราว
--   การไล่ลบเองทำให้ผลลัพธ์แน่นอน โดยไม่ต้องผ่อนกฎที่ปกป้องข้อมูลขาย
-- ============================================================
create or replace function purge_store(p_store uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  delete from order_lines
   where order_id in (select id from orders where store_id = p_store);
  delete from orders where store_id = p_store;

  delete from purchase_order_lines
   where purchase_order_id in (select id from purchase_orders where store_id = p_store);
  delete from purchase_orders where store_id = p_store;

  delete from menu_recipes
   where menu_id in (select id from menus where store_id = p_store);
  delete from stock_movements where store_id = p_store;

  delete from menus       where store_id = p_store;
  delete from ingredients where store_id = p_store;
  delete from suppliers   where store_id = p_store;
  delete from customers   where store_id = p_store;
  delete from campaigns   where store_id = p_store;
  delete from promotions  where store_id = p_store;
  delete from expenses    where store_id = p_store;

  delete from store_members where store_id = p_store;
  delete from stores        where id = p_store;
end $$;

revoke execute on function purge_store(uuid) from public, anon, authenticated;

-- ─── delete_my_account: ใช้ purge_store เพื่อให้สิทธิลบข้อมูลทำงานได้จริง ───
create or replace function delete_my_account()
returns json language plpgsql security definer
set search_path = public, auth, pg_temp as $$
declare
  uid            uuid := auth.uid();
  stores_removed int  := 0;
  sid            uuid;
begin
  if uid is null then
    raise exception 'must be signed in';
  end if;

  -- ลบเฉพาะร้านที่ผู้ใช้เป็นเจ้าของ "คนเดียว" — ร้านที่มีคนอื่นอยู่ด้วยจะไม่ถูกลบ
  for sid in
    select m.store_id from store_members m
     where m.user_id = uid and m.role = 'owner'
       and (select count(*) from store_members m2 where m2.store_id = m.store_id) = 1
  loop
    perform purge_store(sid);
    stores_removed := stores_removed + 1;
  end loop;

  delete from store_members where user_id = uid;
  delete from consents      where user_id = uid;
  delete from auth.users    where id = uid;
  return json_build_object('deleted', true, 'stores_removed', stores_removed);
end $$;

revoke execute on function delete_my_account() from public, anon;
grant  execute on function delete_my_account() to authenticated;
