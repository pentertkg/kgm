-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Phase 2 · Schema
-- Postgres 15+ (Supabase) · รันในลำดับ 01 → 02 → 03 → 04
--
-- หลักการออกแบบที่สำคัญ 3 ข้อ
-- 1) ต้นทุนเมนู "ไม่เก็บเป็นตัวเลข" แต่คำนวณจาก menu_recipes.qty × ingredients.cost_per_unit
--    → เวลาราคาหมูขึ้น 8% margin ของทุกเมนูที่ใช้หมูจะขยับเองทันที (นี่คือหัวใจของโปรดักต์)
-- 2) order_lines เก็บ snapshot ของ unit_price/unit_cost ณ เวลาขาย
--    → ถ้าขึ้นราคาเมนูวันนี้ ยอดขาย/กำไรของเดือนก่อนต้องไม่เปลี่ยน
-- 3) ทุกตารางแยกด้วย store_id และคุมสิทธิ์ด้วย RLS ผ่าน store_members
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── enums ───────────────────────────────────────────────────────────────
do $$ begin
  create type store_role      as enum ('owner','manager','cashier');
  create type order_channel   as enum ('walkin','delivery','online');
  create type order_status     as enum ('new','preparing','ready','completed','cancelled');
  create type stock_move_type as enum ('purchase','usage','waste','adjust');
  create type expense_type    as enum ('ingredient','labor','rent','utility','marketing','packaging','other');
  create type campaign_status as enum ('draft','active','paused','ended');
  create type promo_type      as enum ('discount','bogo','bundle','coupon','free_item');
  create type po_status       as enum ('draft','sent','received','cancelled');
exception when duplicate_object then null; end $$;

-- ─── ร้าน + สิทธิ์ผู้ใช้ ───────────────────────────────────────────────────
create table if not exists stores (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  emoji          text not null default '🍽️',
  format         text not null default 'Street Food',
  food_type      text,
  location       text,
  open_time      time not null default '08:00',
  close_time     time not null default '20:00',
  staff_count    int  not null default 1 check (staff_count >= 0),
  goal_month     numeric(12,2) not null default 300000 check (goal_month >= 0),
  target_margin  numeric(5,2)  not null default 35 check (target_margin between 0 and 100),
  order_counter  int  not null default 1284,
  timezone       text not null default 'Asia/Bangkok',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists store_members (
  store_id   uuid not null references stores(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       store_role not null default 'cashier',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index if not exists store_members_user_idx on store_members(user_id);

-- ─── ซัพพลายเออร์ + วัตถุดิบ ──────────────────────────────────────────────
create table if not exists suppliers (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  name          text not null,
  delivery_note text,
  phone         text,
  created_at    timestamptz not null default now(),
  unique (store_id, name)
);

create table if not exists ingredients (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  name          text not null,
  unit          text not null,                                  -- kg, แผง, ขวด, ใบ
  cost_per_unit numeric(12,4) not null default 0 check (cost_per_unit >= 0),
  stock_qty     numeric(12,3) not null default 0,
  min_qty       numeric(12,3) not null default 0 check (min_qty >= 0),
  supplier_id   uuid references suppliers(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (store_id, name)
);
create index if not exists ingredients_store_idx on ingredients(store_id);

-- ─── เมนู + สูตร ─────────────────────────────────────────────────────────
create table if not exists menus (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null,
  emoji       text not null default '🍽️',
  category    text not null default 'จานเดียว',
  price       numeric(10,2) not null default 0 check (price >= 0),
  description text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, name)
);
create index if not exists menus_store_idx on menus(store_id, is_active);

create table if not exists menu_recipes (
  id            uuid primary key default gen_random_uuid(),
  menu_id       uuid not null references menus(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  qty           numeric(12,4) not null check (qty > 0),          -- ในหน่วยของ ingredient
  note          text,                                             -- เช่น 'หมูกรอบ 105 ก.'
  unique (menu_id, ingredient_id)
);
create index if not exists menu_recipes_menu_idx on menu_recipes(menu_id);

-- ─── ลูกค้า ──────────────────────────────────────────────────────────────
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  name       text not null,
  phone      text,
  line_id    text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists customers_store_idx on customers(store_id);

-- ─── ออเดอร์ ─────────────────────────────────────────────────────────────
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  code          text,                                            -- trigger เติมให้ เช่น '#1285'
  channel       order_channel not null default 'walkin',
  status        order_status  not null default 'new',
  customer_id   uuid references customers(id) on delete set null,
  note          text,
  cancel_reason text,
  placed_at     timestamptz not null default now(),
  ready_at      timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (store_id, code)
);
create index if not exists orders_store_placed_idx on orders(store_id, placed_at desc);
create index if not exists orders_store_status_idx on orders(store_id, status);

create table if not exists order_lines (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  menu_id    uuid not null references menus(id) on delete restrict,
  qty        int not null check (qty > 0),
  unit_price numeric(10,2) not null,                             -- snapshot ณ เวลาขาย
  unit_cost  numeric(10,2) not null                              -- snapshot ณ เวลาขาย
);
create index if not exists order_lines_order_idx on order_lines(order_id);
create index if not exists order_lines_menu_idx  on order_lines(menu_id);

-- ─── สต็อก ───────────────────────────────────────────────────────────────
create table if not exists stock_movements (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  move_type     stock_move_type not null,
  qty           numeric(12,4) not null,                          -- + เข้า / − ออก
  unit_cost     numeric(12,4),
  ref_order_id  uuid references orders(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists stock_moves_ing_idx on stock_movements(ingredient_id, created_at desc);

create table if not exists purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  supplier_id  uuid references suppliers(id) on delete set null,
  status       po_status not null default 'draft',
  ordered_for  date,
  note         text,
  created_at   timestamptz not null default now()
);

create table if not exists purchase_order_lines (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id     uuid not null references ingredients(id) on delete restrict,
  qty               numeric(12,4) not null check (qty > 0),
  unit_cost         numeric(12,4) not null default 0
);

-- ─── ค่าใช้จ่าย (ใช้คำนวณกำไรสุทธิ) ───────────────────────────────────────
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  expense_type expense_type not null,
  amount       numeric(12,2) not null check (amount >= 0),
  note         text,
  spent_on     date not null default (now() at time zone 'Asia/Bangkok')::date,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_store_date_idx on expenses(store_id, spent_on);

-- ─── การตลาด ─────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  name          text not null,
  channel       text,
  status        campaign_status not null default 'draft',
  spend         numeric(12,2) not null default 0 check (spend >= 0),
  revenue       numeric(12,2) not null default 0 check (revenue >= 0),
  orders_count  int not null default 0,
  new_customers int not null default 0,
  started_on    date,
  ended_on      date,
  created_at    timestamptz not null default now()
);

create table if not exists promotions (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  name            text not null,
  promo_type      promo_type not null,
  goal            text,
  discount_amount numeric(10,2) not null default 0,
  status          campaign_status not null default 'draft',
  redeemed_count  int not null default 0,
  starts_on       date,
  ends_on         date,
  created_at      timestamptz not null default now()
);

-- ═══ TRIGGERS ════════════════════════════════════════════════════════════

create or replace function touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists stores_touch on stores;
create trigger stores_touch before update on stores
  for each row execute function touch_updated_at();
drop trigger if exists menus_touch on menus;
create trigger menus_touch before update on menus
  for each row execute function touch_updated_at();
drop trigger if exists ingredients_touch on ingredients;
create trigger ingredients_touch before update on ingredients
  for each row execute function touch_updated_at();

-- เลขบิลรันต่อเนื่องต่อร้าน (#1285, #1286, ...)
create or replace function assign_order_code() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare n int;
begin
  if new.code is null then
    update stores set order_counter = order_counter + 1
      where id = new.store_id returning order_counter into n;
    new.code := '#' || n::text;
  end if;
  return new;
end $$;

drop trigger if exists orders_assign_code on orders;
create trigger orders_assign_code before insert on orders
  for each row execute function assign_order_code();

-- เติม snapshot ราคา/ต้นทุนอัตโนมัติถ้าไม่ได้ส่งมา
create or replace function fill_order_line_snapshot() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.unit_price is null then
    select price into new.unit_price from menus where id = new.menu_id;
  end if;
  if new.unit_cost is null then
    select coalesce(sum(mr.qty * i.cost_per_unit), 0) into new.unit_cost
      from menu_recipes mr join ingredients i on i.id = mr.ingredient_id
      where mr.menu_id = new.menu_id;
  end if;
  return new;
end $$;

drop trigger if exists order_lines_snapshot on order_lines;
create trigger order_lines_snapshot before insert on order_lines
  for each row execute function fill_order_line_snapshot();

-- ตัดสต็อกวัตถุดิบเมื่อออเดอร์เสร็จ (ครั้งเดียว ไม่ตัดซ้ำ)
create or replace function apply_stock_on_complete() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.status = 'completed' and coalesce(old.status, 'new') <> 'completed' then
    insert into stock_movements (store_id, ingredient_id, move_type, qty, ref_order_id, note)
    select new.store_id, mr.ingredient_id, 'usage', -(ol.qty * mr.qty), new.id, 'ตัดจากออเดอร์ ' || new.code
    from order_lines ol
    join menu_recipes mr on mr.menu_id = ol.menu_id
    where ol.order_id = new.id;

    update ingredients i set stock_qty = i.stock_qty - x.used
    from (
      select mr.ingredient_id, sum(ol.qty * mr.qty) as used
      from order_lines ol join menu_recipes mr on mr.menu_id = ol.menu_id
      where ol.order_id = new.id group by mr.ingredient_id
    ) x
    where i.id = x.ingredient_id;

    new.completed_at := coalesce(new.completed_at, now());
  end if;
  if new.status = 'ready' and coalesce(old.status,'new') <> 'ready' then
    new.ready_at := coalesce(new.ready_at, now());
  end if;
  return new;
end $$;

drop trigger if exists orders_stock on orders;
create trigger orders_stock before update of status on orders
  for each row execute function apply_stock_on_complete();

-- ─── Realtime (ให้จอครัวกับหน้าแคชเชียร์ซิงก์กัน) ─────────────────────────
do $$ begin
  alter publication supabase_realtime add table orders;
  alter publication supabase_realtime add table order_lines;
exception when duplicate_object then null; when undefined_object then null; end $$;
