-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Phase 2 · Row Level Security
--
-- กติกา
--  · ผู้ใช้ต้องเป็นสมาชิกของร้าน (store_members) จึงจะเห็นข้อมูลร้านนั้น
--  · owner / manager  = แก้เมนู ต้นทุน ค่าใช้จ่าย แคมเปญ และดูกำไรได้
--  · cashier          = รับออเดอร์ อัปเดตสถานะ และแก้สต็อกได้ แต่แก้ราคา/ต้นทุนไม่ได้
--  · role 'anon' ไม่มีสิทธิ์อะไรเลย — ต้อง login ก่อนใช้งาน
--
-- ตรงกับตาราง Roles & Permissions ในหน้า Settings ของแอป
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── helper: อยู่ในร้านนี้ไหม / มีตำแหน่งอะไร ───────────────────────────────
create or replace function is_store_member(p_store uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from store_members
    where store_id = p_store and user_id = auth.uid()
  );
$$;

-- ⚠️ ต้องเป็น SECURITY DEFINER เพื่อข้าม RLS ของ store_members เอง
--    ถ้า query store_members ตรงๆ ใน policy ของ store_members จะเกิด infinite recursion
create or replace function store_has_no_members(p_store uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select not exists (select 1 from store_members where store_id = p_store);
$$;

create or replace function has_store_role(p_store uuid, p_roles store_role[])
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from store_members
    where store_id = p_store and user_id = auth.uid() and role = any(p_roles)
  );
$$;

-- ─── เปิด RLS ทุกตาราง ───────────────────────────────────────────────────
alter table stores               enable row level security;
alter table store_members        enable row level security;
alter table suppliers            enable row level security;
alter table ingredients          enable row level security;
alter table menus                enable row level security;
alter table menu_recipes         enable row level security;
alter table customers            enable row level security;
alter table orders               enable row level security;
alter table order_lines          enable row level security;
alter table stock_movements      enable row level security;
alter table purchase_orders      enable row level security;
alter table purchase_order_lines enable row level security;
alter table expenses             enable row level security;
alter table campaigns            enable row level security;
alter table promotions           enable row level security;

-- ─── stores ──────────────────────────────────────────────────────────────
drop policy if exists stores_select on stores;
create policy stores_select on stores for select to authenticated
  using (is_store_member(id));

drop policy if exists stores_insert on stores;
create policy stores_insert on stores for insert to authenticated
  with check (true);   -- ใครก็สร้างร้านของตัวเองได้ (ตอน Onboarding)

drop policy if exists stores_update on stores;
create policy stores_update on stores for update to authenticated
  using (has_store_role(id, array['owner','manager']::store_role[]))
  with check (has_store_role(id, array['owner','manager']::store_role[]));

drop policy if exists stores_delete on stores;
create policy stores_delete on stores for delete to authenticated
  using (has_store_role(id, array['owner']::store_role[]));

-- ─── store_members ───────────────────────────────────────────────────────
drop policy if exists members_select on store_members;
create policy members_select on store_members for select to authenticated
  using (user_id = auth.uid() or is_store_member(store_id));

drop policy if exists members_write on store_members;
create policy members_write on store_members for all to authenticated
  using (
    -- คนสร้างร้านผูกตัวเองเป็น owner ได้ / owner จัดการสมาชิกได้
    (user_id = auth.uid() and role = 'owner' and store_has_no_members(store_id))
    or has_store_role(store_id, array['owner']::store_role[])
  )
  with check (
    (user_id = auth.uid() and role = 'owner' and store_has_no_members(store_id))
    or has_store_role(store_id, array['owner']::store_role[])
  );

-- ─── ตารางที่มี store_id ตรง ๆ : อ่านได้ทุกตำแหน่ง ────────────────────────
do $$
declare t text;
begin
  foreach t in array array['suppliers','ingredients','menus','customers','orders',
                           'stock_movements','purchase_orders','expenses','campaigns','promotions']
  loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format(
      'create policy %I_select on %I for select to authenticated using (is_store_member(store_id))', t, t);
  end loop;
end $$;

-- ─── สิทธิ์เขียน: owner/manager แก้ได้ทุกอย่าง ─────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['suppliers','menus','expenses','campaigns','promotions']
  loop
    execute format('drop policy if exists %I_write on %I', t, t);
    execute format($f$
      create policy %I_write on %I for all to authenticated
        using (has_store_role(store_id, array['owner','manager']::store_role[]))
        with check (has_store_role(store_id, array['owner','manager']::store_role[]))
    $f$, t, t);
  end loop;
end $$;

-- ─── สิทธิ์เขียน: ทุกตำแหน่งทำได้ (งานหน้าร้าน/ครัว/สต็อก) ──────────────────
do $$
declare t text;
begin
  foreach t in array array['orders','customers','stock_movements','purchase_orders']
  loop
    execute format('drop policy if exists %I_write on %I', t, t);
    execute format($f$
      create policy %I_write on %I for all to authenticated
        using (is_store_member(store_id))
        with check (is_store_member(store_id))
    $f$, t, t);
  end loop;
end $$;

-- ─── ingredients: อ่านได้ทุกคน · แก้ "จำนวนคงเหลือ" ได้ทุกคน
--     แต่การเปลี่ยน "ราคาต้นทุน" ควรจำกัดที่ owner/manager
--     (Postgres ไม่มี column-level RLS จึงคุมด้วย trigger) ────────────────
drop policy if exists ingredients_write on ingredients;
create policy ingredients_write on ingredients for all to authenticated
  using (is_store_member(store_id))
  with check (is_store_member(store_id));

create or replace function guard_ingredient_cost() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.cost_per_unit <> old.cost_per_unit
     and not has_store_role(new.store_id, array['owner','manager']::store_role[]) then
    raise exception 'ต้องเป็นเจ้าของร้านหรือผู้จัดการจึงจะแก้ราคาต้นทุนได้';
  end if;
  return new;
end $$;

drop trigger if exists ingredients_guard_cost on ingredients;
create trigger ingredients_guard_cost before update on ingredients
  for each row execute function guard_ingredient_cost();

-- ─── ตารางลูก (ไม่มี store_id) : สืบสิทธิ์จากตารางแม่ ──────────────────────
drop policy if exists menu_recipes_all on menu_recipes;
create policy menu_recipes_all on menu_recipes for all to authenticated
  using (exists (select 1 from menus m where m.id = menu_recipes.menu_id and is_store_member(m.store_id)))
  with check (exists (select 1 from menus m where m.id = menu_recipes.menu_id
                      and has_store_role(m.store_id, array['owner','manager']::store_role[])));

drop policy if exists order_lines_all on order_lines;
create policy order_lines_all on order_lines for all to authenticated
  using (exists (select 1 from orders o where o.id = order_lines.order_id and is_store_member(o.store_id)))
  with check (exists (select 1 from orders o where o.id = order_lines.order_id and is_store_member(o.store_id)));

drop policy if exists po_lines_all on purchase_order_lines;
create policy po_lines_all on purchase_order_lines for all to authenticated
  using (exists (select 1 from purchase_orders p
                 where p.id = purchase_order_lines.purchase_order_id and is_store_member(p.store_id)))
  with check (exists (select 1 from purchase_orders p
                 where p.id = purchase_order_lines.purchase_order_id and is_store_member(p.store_id)));

-- ─── สิทธิ์ระดับ role ของ Postgres ────────────────────────────────────────
-- แอปนี้ต้อง login ก่อนใช้งาน จึงไม่ให้ anon แตะอะไรเลย
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function is_store_member(uuid)               to authenticated;
grant execute on function has_store_role(uuid, store_role[])  to authenticated;
grant execute on function store_has_no_members(uuid)          to authenticated;
