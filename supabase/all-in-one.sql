-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — ติดตั้งทั้งหมดในไฟล์เดียว
--
-- ไฟล์นี้รวม 01_schema + 02_views + 03_rls + 04_seed ไว้ตามลำดับที่ถูกต้อง
-- เพื่อให้วางใน SQL Editor ของ Supabase ครั้งเดียวจบ
--
-- ⚠️ ต้องสร้างผู้ใช้คนแรกก่อน (Authentication → Users → Add user
--    → ติ๊ก Auto Confirm User) ไม่งั้นส่วน seed จะหยุดและบอกให้ไปสร้างก่อน
--    ส่วน schema/views/RLS ที่รันไปแล้วจะยังอยู่ครบ รันไฟล์นี้ซ้ำได้ปลอดภัย
--
-- ไฟล์นี้ถูก generate — แก้ไฟล์ต้นทางแล้วรัน: node supabase/gen-all.js
-- ═══════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- ▓▓▓  01_schema.sql
-- ════════════════════════════════════════════════════════════════════════

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



-- ════════════════════════════════════════════════════════════════════════
-- ▓▓▓  02_views.sql
-- ════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Phase 2 · Views (ชั้นคำนวณ KPI ทั้งหมด)
--
-- ⚠️ ทุก view ตั้ง security_invoker = on
--    ค่าเริ่มต้นของ Postgres คือ view รันด้วยสิทธิ์ของ "เจ้าของ view" ซึ่งจะ
--    ข้าม RLS ของตารางข้างใต้ → ผู้ใช้ร้าน A จะเห็นข้อมูลร้าน B ผ่าน view ได้
--    การตั้ง security_invoker บังคับให้ RLS ของผู้เรียกทำงานตามปกติ
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── ต้นทุน/กำไร/มาร์จิ้นต่อเมนู (คำนวณจากราคาวัตถุดิบสด ๆ) ────────────────
create or replace view v_menu_cost with (security_invoker = on) as
select
  m.id            as menu_id,
  m.store_id,
  m.name,
  m.emoji,
  m.category,
  m.price,
  m.is_active,
  m.description,
  round(coalesce(sum(mr.qty * i.cost_per_unit), 0), 2)                    as cost,
  round(m.price - coalesce(sum(mr.qty * i.cost_per_unit), 0), 2)          as profit,
  case when m.price > 0
       then round((m.price - coalesce(sum(mr.qty * i.cost_per_unit), 0)) / m.price * 100, 2)
       else 0 end                                                        as margin_pct,
  count(mr.id)                                                           as ingredient_count
from menus m
left join menu_recipes mr on mr.menu_id = m.id
left join ingredients  i  on i.id = mr.ingredient_id
group by m.id, m.store_id, m.name, m.emoji, m.category, m.price, m.is_active, m.description;

-- ─── ยอดรวม/กำไรต่อบิล ───────────────────────────────────────────────────
create or replace view v_order_totals with (security_invoker = on) as
select
  o.id as order_id, o.store_id, o.code, o.channel, o.status,
  o.customer_id, o.note, o.placed_at, o.ready_at, o.completed_at,
  round(coalesce(sum(ol.qty * ol.unit_price), 0), 2)                      as total,
  round(coalesce(sum(ol.qty * (ol.unit_price - ol.unit_cost)), 0), 2)     as profit,
  coalesce(sum(ol.qty), 0)::int                                          as item_count
from orders o
left join order_lines ol on ol.order_id = o.id
group by o.id, o.store_id, o.code, o.channel, o.status, o.customer_id,
         o.note, o.placed_at, o.ready_at, o.completed_at;

-- ─── ยอดขายรายวัน (แหล่งข้อมูลของ KPI card + กราฟ 7/30 วัน) ────────────────
create or replace view v_daily_sales with (security_invoker = on) as
select
  store_id,
  (placed_at at time zone 'Asia/Bangkok')::date                          as sale_date,
  count(*)::int                                                          as orders_count,
  round(sum(total), 2)                                                   as revenue,
  round(sum(profit), 2)                                                  as gross_profit,
  case when count(*) > 0 then round(sum(total) / count(*), 2) else 0 end  as aov
from v_order_totals
where status <> 'cancelled'
group by store_id, (placed_at at time zone 'Asia/Bangkok')::date;

-- ─── ยอดขายรายชั่วโมง (กราฟช่วงพีค) ──────────────────────────────────────
create or replace view v_hourly_sales with (security_invoker = on) as
select
  store_id,
  (placed_at at time zone 'Asia/Bangkok')::date                          as sale_date,
  extract(hour from placed_at at time zone 'Asia/Bangkok')::int          as hour,
  count(*)::int                                                          as orders_count,
  round(sum(total), 2)                                                   as revenue
from v_order_totals
where status <> 'cancelled'
group by store_id, (placed_at at time zone 'Asia/Bangkok')::date,
         extract(hour from placed_at at time zone 'Asia/Bangkok');

-- ─── สัดส่วนช่องทางขาย ───────────────────────────────────────────────────
create or replace view v_channel_sales with (security_invoker = on) as
select
  store_id,
  (placed_at at time zone 'Asia/Bangkok')::date as sale_date,
  channel,
  count(*)::int        as orders_count,
  round(sum(total), 2) as revenue
from v_order_totals
where status <> 'cancelled'
group by store_id, (placed_at at time zone 'Asia/Bangkok')::date, channel;

-- ─── ผลงานเมนูรายวัน (Top seller / เมนูที่ควรทบทวน) ───────────────────────
create or replace view v_menu_daily with (security_invoker = on) as
select
  o.store_id,
  (o.placed_at at time zone 'Asia/Bangkok')::date                        as sale_date,
  ol.menu_id, m.name, m.emoji, m.category,
  sum(ol.qty)::int                                                      as units,
  round(sum(ol.qty * ol.unit_price), 2)                                 as revenue,
  round(sum(ol.qty * (ol.unit_price - ol.unit_cost)), 2)                as profit
from order_lines ol
join orders o on o.id = ol.order_id and o.status <> 'cancelled'
join menus  m on m.id = ol.menu_id
group by o.store_id, (o.placed_at at time zone 'Asia/Bangkok')::date,
         ol.menu_id, m.name, m.emoji, m.category;

-- ─── ปริมาณวัตถุดิบที่ใช้จริงรายวัน (derive จากยอดขาย × สูตร) ──────────────
create or replace view v_ingredient_usage_daily with (security_invoker = on) as
select
  o.store_id,
  (o.placed_at at time zone 'Asia/Bangkok')::date as sale_date,
  mr.ingredient_id,
  round(sum(ol.qty * mr.qty), 4) as qty_used
from order_lines ol
join orders       o  on o.id = ol.order_id and o.status <> 'cancelled'
join menu_recipes mr on mr.menu_id = ol.menu_id
group by o.store_id, (o.placed_at at time zone 'Asia/Bangkok')::date, mr.ingredient_id;

-- ─── สถานะสต็อก + คาดการณ์ของที่ต้องซื้อพรุ่งนี้ ───────────────────────────
create or replace view v_stock_status with (security_invoker = on) as
with usage7 as (
  select ingredient_id, avg(qty_used) as avg_daily
  from v_ingredient_usage_daily
  where sale_date >= (now() at time zone 'Asia/Bangkok')::date - 7
  group by ingredient_id
)
select
  i.id, i.store_id, i.name, i.unit, i.cost_per_unit, i.stock_qty, i.min_qty, i.supplier_id,
  round(coalesce(u.avg_daily, 0), 3)                                     as avg_daily_usage,
  case when i.stock_qty <= 0 then 'out'
       when i.stock_qty <  i.min_qty then 'low'
       else 'ok' end                                                     as status,
  -- คาดว่าพรุ่งนี้ใช้เท่าไร (บวกแนวโน้ม 4%) และขาดอีกเท่าไร
  round(coalesce(u.avg_daily, 0) * 1.04, 3)                              as need_tomorrow,
  round(greatest(0, coalesce(u.avg_daily, 0) * 1.04 - i.stock_qty), 3)   as shortfall,
  round(greatest(0, coalesce(u.avg_daily, 0) * 1.04 - i.stock_qty) * i.cost_per_unit, 2) as shortfall_cost
from ingredients i
left join usage7 u on u.ingredient_id = i.id;

-- ─── สถิติลูกค้า + จัดกลุ่มอัตโนมัติ (ไม่เก็บ segment เป็นคอลัมน์) ──────────
create or replace view v_customer_stats with (security_invoker = on) as
with agg as (
  select
    c.id, c.store_id, c.name, c.phone,
    count(distinct o.id)::int      as orders_count,
    coalesce(sum(t.total), 0)      as total_spend,
    max(o.placed_at)               as last_order_at,
    min(o.placed_at)               as first_order_at
  from customers c
  left join orders          o on o.customer_id = c.id and o.status <> 'cancelled'
  left join v_order_totals  t on t.order_id = o.id
  group by c.id, c.store_id, c.name, c.phone
),
fav as (
  select customer_id, favorite_menu from (
    select o.customer_id, m.name as favorite_menu,
           row_number() over (partition by o.customer_id order by sum(ol.qty) desc, m.name) as rn
    from order_lines ol
    join orders o on o.id = ol.order_id and o.status <> 'cancelled'
    join menus  m on m.id = ol.menu_id
    where o.customer_id is not null
    group by o.customer_id, m.name
  ) x where rn = 1
)
select
  a.id, a.store_id, a.name, a.phone, a.orders_count,
  round(a.total_spend, 2) as total_spend,
  case when a.orders_count > 0 then round(a.total_spend / a.orders_count, 2) else 0 end as avg_bill,
  a.first_order_at, a.last_order_at,
  case when a.last_order_at is null then null
       else extract(day from (now() - a.last_order_at))::int end as days_since_last,
  f.favorite_menu,
  case
    when a.orders_count = 0                                          then 'inactive'
    when a.last_order_at < now() - interval '60 days'                then 'inactive'
    when a.last_order_at < now() - interval '30 days'                then 'risk'
    when a.total_spend  >= 1000                                      then 'vip'
    when a.orders_count >= 3                                         then 'regular'
    when a.first_order_at > now() - interval '30 days'               then 'new'
    else 'regular'
  end as segment
from agg a
left join fav f on f.customer_id = a.id;

-- ─── งบกำไรขาดทุนรายเดือน (Waterfall ในหน้า Analytics) ────────────────────
create or replace view v_pnl_monthly with (security_invoker = on) as
with rev as (
  select store_id,
         date_trunc('month', sale_date)::date as month,
         sum(revenue)      as revenue,
         sum(gross_profit) as gross_profit,
         sum(orders_count) as orders_count
  from v_daily_sales
  group by store_id, date_trunc('month', sale_date)::date
),
ex as (
  select store_id,
         date_trunc('month', spent_on)::date as month,
         coalesce(sum(amount) filter (where expense_type = 'labor'), 0)     as labor,
         coalesce(sum(amount) filter (where expense_type = 'rent'), 0)      as rent,
         coalesce(sum(amount) filter (where expense_type = 'marketing'), 0) as marketing,
         coalesce(sum(amount) filter (where expense_type in ('utility','packaging','other')), 0) as other
  from expenses
  group by store_id, date_trunc('month', spent_on)::date
)
select
  r.store_id, r.month, r.orders_count,
  round(r.revenue, 2)                       as revenue,
  round(r.revenue - r.gross_profit, 2)      as food_cost,
  round(r.gross_profit, 2)                  as gross_profit,
  coalesce(ex.labor, 0)                     as labor,
  coalesce(ex.rent, 0)                      as rent,
  coalesce(ex.marketing, 0)                 as marketing,
  coalesce(ex.other, 0)                     as other_expenses,
  round(r.gross_profit - coalesce(ex.labor,0) - coalesce(ex.rent,0)
        - coalesce(ex.marketing,0) - coalesce(ex.other,0), 2) as net_profit,
  case when r.revenue > 0 then round((r.gross_profit - coalesce(ex.labor,0) - coalesce(ex.rent,0)
        - coalesce(ex.marketing,0) - coalesce(ex.other,0)) / r.revenue * 100, 2) else 0 end as net_margin_pct
from rev r
left join ex on ex.store_id = r.store_id and ex.month = r.month;

-- ─── ประสิทธิภาพแคมเปญ (ROAS / CAC) ──────────────────────────────────────
create or replace view v_campaign_performance with (security_invoker = on) as
select
  c.*,
  case when c.spend > 0 then round(c.revenue / c.spend, 2) else 0 end          as roas,
  case when c.new_customers > 0 then round(c.spend / c.new_customers, 2) else 0 end as cac
from campaigns c;



-- ════════════════════════════════════════════════════════════════════════
-- ▓▓▓  03_rls.sql
-- ════════════════════════════════════════════════════════════════════════

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



-- ════════════════════════════════════════════════════════════════════════
-- ▓▓▓  04_seed.sql
-- ════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Phase 2 · Seed data
-- ⚠️ ไฟล์นี้ถูก GENERATE จาก assets/js/data.js — อย่าแก้มือ
--    แก้ที่ data.js แล้วรัน: node supabase/gen-seed.js
--
-- ต้อง login เข้า Supabase ก่อนรัน เพราะใช้ auth.uid() ผูกร้านเข้ากับบัญชีคุณ
-- ═══════════════════════════════════════════════════════════════════════════

do $seed$
declare
  v_store uuid;
  -- ใน SQL Editor ของ Supabase จะรันด้วย role postgres ซึ่งไม่มี JWT
  -- ทำให้ auth.uid() เป็น NULL จึง fallback ไปใช้ผู้ใช้คนแรกที่สร้างไว้
  v_user  uuid := coalesce(auth.uid(), (select id from auth.users order by created_at limit 1));
  v_order uuid;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if v_user is null then
    raise exception 'ยังไม่มีผู้ใช้ในระบบ — ไปสร้างที่ Authentication → Users → Add user ก่อน แล้วรันไฟล์นี้อีกครั้ง';
  end if;

  -- ─── ร้าน ───────────────────────────────────────────────────────────────
  insert into stores (name, emoji, format, food_type, location, open_time, close_time,
                      staff_count, goal_month, target_margin, order_counter)
  values ('ร้านกะเพราเฮียสม', '🌿', 'Street Food', 'ตามสั่ง / อาหารจานเดียว',
          'ซอยสุขุมวิท 23 (หน้าออฟฟิศ อโศก)', '08:00', '20:00',
          3, 500000, 35, 1284)
  returning id into v_store;

  insert into store_members (store_id, user_id, role) values (v_store, v_user, 'owner');

  -- ─── ซัพพลายเออร์ ───────────────────────────────────────────────────────
  insert into suppliers (store_id, name, delivery_note) values (v_store, 'ตลาดคลองเตย (เนื้อสัตว์)', 'ส่ง 05:30 ทุกวัน');
  insert into suppliers (store_id, name, delivery_note) values (v_store, 'ร้านของสด ป้าน้อย', 'ส่ง 06:00 จ/พ/ศ');
  insert into suppliers (store_id, name, delivery_note) values (v_store, 'ยี่ปั๊วเครื่องดื่ม', 'ส่งทุกวันจันทร์');

  -- ─── วัตถุดิบ (stock_qty/min_qty ตรงกับที่เดโมแสดง) ─────────────────────
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'หมูกรอบ', 'kg', 280, 2.4, 5,
          (select id from suppliers where store_id = v_store and name = 'ตลาดคลองเตย (เนื้อสัตว์)'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'หมูสับ', 'kg', 165, 3.2, 8,
          (select id from suppliers where store_id = v_store and name = 'ตลาดคลองเตย (เนื้อสัตว์)'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'อกไก่', 'kg', 95, 6.5, 4,
          (select id from suppliers where store_id = v_store and name = 'ตลาดคลองเตย (เนื้อสัตว์)'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'กุ้ง/ปลาหมึกรวม', 'kg', 320, 0, 2,
          (select id from suppliers where store_id = v_store and name = 'ตลาดคลองเตย (เนื้อสัตว์)'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'ข้าวสาร', 'kg', 42, 12, 10,
          null);
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'ไข่ไก่', 'แผง', 132, 8, 6,
          (select id from suppliers where store_id = v_store and name = 'ร้านของสด ป้าน้อย'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'ใบกะเพรา', 'kg', 120, 1.2, 2,
          (select id from suppliers where store_id = v_store and name = 'ร้านของสด ป้าน้อย'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'พริก+กระเทียม', 'kg', 95, 1.8, 1.5,
          (select id from suppliers where store_id = v_store and name = 'ร้านของสด ป้าน้อย'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'น้ำมันพืช', 'ลิตร', 58, 4, 5,
          null);
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'เครื่องปรุง (ซอส/น้ำปลา)', 'ขวด', 45, 3, 2,
          null);
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'กล่องข้าว + ถุง', 'ใบ', 2.4, 180, 250,
          null);
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'น้ำดื่มขวด', 'ขวด', 5, 96, 60,
          (select id from suppliers where store_id = v_store and name = 'ยี่ปั๊วเครื่องดื่ม'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'น้ำอัดลมกระป๋อง', 'กระป๋อง', 12, 24, 48,
          (select id from suppliers where store_id = v_store and name = 'ยี่ปั๊วเครื่องดื่ม'));
  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  values (v_store, 'ผงชา + นมข้น', 'ชุด', 135, 2, 1,
          (select id from suppliers where store_id = v_store and name = 'ยี่ปั๊วเครื่องดื่ม'));

  -- ─── เมนู + สูตร (qty = ต้นทุนต่อจาน ÷ ราคาต่อหน่วยของวัตถุดิบ) ──────────
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'กะเพราหมูกรอบ', '🍚', 'จานเดียว', 69, 'หมูกรอบเจ้าประจำ ผัดใบกะเพราไฟแรง ราดข้าวสวยร้อนๆ ขายดีที่สุดของร้าน', true, 0);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    (select id from ingredients where store_id = v_store and name = 'หมูกรอบ'),
    0.1071, 'หมูกรอบ 105 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    (select id from ingredients where store_id = v_store and name = 'ข้าวสาร'),
    0.1667, 'ข้าวสวย 250 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    (select id from ingredients where store_id = v_store and name = 'เครื่องปรุง (ซอส/น้ำปลา)'),
    0.0889, 'เครื่องปรุง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    (select id from ingredients where store_id = v_store and name = 'ไข่ไก่'),
    0.0379, 'ไข่ดาว 1 ฟอง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    1.25, 'บรรจุภัณฑ์');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'กะเพราหมู', '🥘', 'จานเดียว', 60, 'กะเพราหมูสับสูตรต้นตำรับ เผ็ดกลาง สั่งเพิ่มไข่ดาวได้', true, 1);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    (select id from ingredients where store_id = v_store and name = 'หมูสับ'),
    0.1333, 'หมูสับ 130 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    (select id from ingredients where store_id = v_store and name = 'ข้าวสาร'),
    0.1667, 'ข้าวสวย 250 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    (select id from ingredients where store_id = v_store and name = 'เครื่องปรุง (ซอส/น้ำปลา)'),
    0.0889, 'เครื่องปรุง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    (select id from ingredients where store_id = v_store and name = 'ใบกะเพรา'),
    0.0167, 'ใบกะเพรา');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    1.25, 'บรรจุภัณฑ์');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'กะเพราไก่', '🍗', 'จานเดียว', 55, 'อกไก่สับ แคลอรีต่ำ กลุ่มออฟฟิศสั่งเยอะช่วงเที่ยง', true, 2);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    (select id from ingredients where store_id = v_store and name = 'อกไก่'),
    0.1789, 'อกไก่ 140 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    (select id from ingredients where store_id = v_store and name = 'ข้าวสาร'),
    0.1667, 'ข้าวสวย 250 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    (select id from ingredients where store_id = v_store and name = 'เครื่องปรุง (ซอส/น้ำปลา)'),
    0.0889, 'เครื่องปรุง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    (select id from ingredients where store_id = v_store and name = 'ใบกะเพรา'),
    0.0167, 'ใบกะเพรา');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    1.25, 'บรรจุภัณฑ์');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'ข้าวผัดหมู', '🍛', 'จานเดียว', 55, 'ข้าวผัดหมูใส่ไข่ เมนูสำรองสำหรับคนไม่กินเผ็ด', true, 3);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    (select id from ingredients where store_id = v_store and name = 'หมูสับ'),
    0.0909, 'หมูสับ 90 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    (select id from ingredients where store_id = v_store and name = 'ข้าวสาร'),
    0.1667, 'ข้าวสวย 250 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    (select id from ingredients where store_id = v_store and name = 'ไข่ไก่'),
    0.0227, 'ไข่ 1 ฟอง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    (select id from ingredients where store_id = v_store and name = 'เครื่องปรุง (ซอส/น้ำปลา)'),
    0.0667, 'เครื่องปรุง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    1.25, 'บรรจุภัณฑ์');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'ข้าวไข่เจียวหมูสับ', '🍳', 'จานเดียว', 50, 'ไข่เจียวฟูหมูสับ ราคาเข้าถึงง่าย', true, 4);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวไข่เจียวหมูสับ'),
    (select id from ingredients where store_id = v_store and name = 'ไข่ไก่'),
    0.0682, 'ไข่ 3 ฟอง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวไข่เจียวหมูสับ'),
    (select id from ingredients where store_id = v_store and name = 'หมูสับ'),
    0.0485, 'หมูสับ 50 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวไข่เจียวหมูสับ'),
    (select id from ingredients where store_id = v_store and name = 'ข้าวสาร'),
    0.1667, 'ข้าวสวย 250 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ข้าวไข่เจียวหมูสับ'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    1.25, 'บรรจุภัณฑ์');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'กะเพราทะเล', '🦐', 'จานเดียว', 79, 'เมนูใหม่ กุ้ง+ปลาหมึก ต้นทุนสูง ยอดขายยังไม่ขึ้น', true, 5);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราทะเล'),
    (select id from ingredients where store_id = v_store and name = 'กุ้ง/ปลาหมึกรวม'),
    0.1313, 'กุ้ง+ปลาหมึก 130 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราทะเล'),
    (select id from ingredients where store_id = v_store and name = 'ข้าวสาร'),
    0.1667, 'ข้าวสวย 250 ก.');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราทะเล'),
    (select id from ingredients where store_id = v_store and name = 'เครื่องปรุง (ซอส/น้ำปลา)'),
    0.0889, 'เครื่องปรุง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราทะเล'),
    (select id from ingredients where store_id = v_store and name = 'ใบกะเพรา'),
    0.0167, 'ใบกะเพรา');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'กะเพราทะเล'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    1.25, 'บรรจุภัณฑ์');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'ไข่ดาว', '🍳', 'ท็อปปิ้ง', 12, 'ท็อปปิ้งยอดนิยม เพิ่มกำไรต่อบิลได้ดี', true, 6);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ไข่ดาว'),
    (select id from ingredients where store_id = v_store and name = 'ไข่ไก่'),
    0.0303, 'ไข่ 1 ฟอง');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ไข่ดาว'),
    (select id from ingredients where store_id = v_store and name = 'น้ำมันพืช'),
    0.0345, 'น้ำมัน');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'น้ำเปล่า', '💧', 'เครื่องดื่ม', 10, 'น้ำดื่มขวดเล็ก 600 มล.', true, 7);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'น้ำเปล่า'),
    (select id from ingredients where store_id = v_store and name = 'น้ำดื่มขวด'),
    1, 'ขวด 600 มล.');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'น้ำอัดลม', '🥤', 'เครื่องดื่ม', 20, 'กระป๋อง 325 มล. เหมาะทำ Bundle คู่กับจานเดียว', true, 8);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'น้ำอัดลม'),
    (select id from ingredients where store_id = v_store and name = 'น้ำอัดลมกระป๋อง'),
    1, 'กระป๋อง 325 มล.');
  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)
  values (v_store, 'ชาเย็น', '🧋', 'เครื่องดื่ม', 25, 'ชาไทยเย็น มาร์จิ้นสูงสุดในร้าน', true, 9);
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    (select id from ingredients where store_id = v_store and name = 'ผงชา + นมข้น'),
    0.0296, 'ผงชา + นมข้น');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    (select id from ingredients where store_id = v_store and name = 'น้ำดื่มขวด'),
    0.4, 'น้ำแข็ง/แก้ว');
  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    (select id from ingredients where store_id = v_store and name = 'กล่องข้าว + ถุง'),
    2.0833, 'หลอด+ฝา');

  -- ─── ลูกค้า (segment ไม่ต้อง seed — view คำนวณจากประวัติการซื้อเอง) ───────
  insert into customers (store_id, name) values (v_store, 'สมชาย ใจดี');
  insert into customers (store_id, name) values (v_store, 'มานี รักเรียน');
  insert into customers (store_id, name) values (v_store, 'ปรีชา ตั้งใจ');
  insert into customers (store_id, name) values (v_store, 'สุดา แสนดี');
  insert into customers (store_id, name) values (v_store, 'ณัฐพล วงศ์ใหญ่');
  insert into customers (store_id, name) values (v_store, 'วิภา สายลม');
  insert into customers (store_id, name) values (v_store, 'เอกชัย พูนทรัพย์');
  insert into customers (store_id, name) values (v_store, 'ธนา มั่งมี');
  insert into customers (store_id, name) values (v_store, 'กมล ศรีสุข');
  insert into customers (store_id, name) values (v_store, 'จันทร์เพ็ญ ดีงาม');
  insert into customers (store_id, name) values (v_store, 'ภาคิน ทองแท้');
  insert into customers (store_id, name) values (v_store, 'อรุณี แจ่มใส');
  insert into customers (store_id, name) values (v_store, 'ชาลี เพื่อนบ้าน');
  insert into customers (store_id, name) values (v_store, 'สมหญิง ขยันทำ');
  insert into customers (store_id, name) values (v_store, 'พิชัย ค้าขาย');

  -- ─── ค่าใช้จ่ายเดือนนี้ (ทำให้ v_pnl_monthly คำนวณกำไรสุทธิได้) ──────────
  insert into expenses (store_id, expense_type, amount, note, spent_on)
  values (v_store, 'labor', 42000, 'ค่าแรงพนักงาน 3 คน', date_trunc('month', v_today)::date);
  insert into expenses (store_id, expense_type, amount, note, spent_on)
  values (v_store, 'rent', 18000, 'ค่าเช่าที่ + ค่าน้ำไฟ', date_trunc('month', v_today)::date);
  insert into expenses (store_id, expense_type, amount, note, spent_on)
  values (v_store, 'marketing', 12000, 'ค่าโฆษณา Facebook/LINE/TikTok', date_trunc('month', v_today)::date);
  insert into expenses (store_id, expense_type, amount, note, spent_on)
  values (v_store, 'other', 8400, 'แก๊ส ขนส่ง เบ็ดเตล็ด', date_trunc('month', v_today)::date);

  -- ─── แคมเปญ ────────────────────────────────────────────────────────────
  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)
  values (v_store, 'กะเพรามื้อเที่ยง', 'Facebook Ads', 'active', 2500, 14800,
          214, 62, date_trunc('month', v_today)::date);
  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)
  values (v_store, 'ส่งฟรีรัศมี 3 กม.', 'LINE OA', 'active', 3800, 15300,
          236, 71, date_trunc('month', v_today)::date);
  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)
  values (v_store, 'เปิดร้านเช้า จับกลุ่มออฟฟิศ', 'TikTok', 'active', 2200, 9400,
          148, 34, date_trunc('month', v_today)::date);
  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)
  values (v_store, 'โปรเย็นวันศุกร์', 'Facebook Ads', 'paused', 1900, 6300,
          96, 12, date_trunc('month', v_today)::date);
  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)
  values (v_store, 'Boost เมนูใหม่ กะเพราทะเล', 'Facebook Ads', 'active', 1600, 2700,
          38, 7, date_trunc('month', v_today)::date);

  insert into promotions (store_id, name, promo_type, status, redeemed_count, discount_amount)
  values (v_store, 'กะเพรา + เครื่องดื่ม 75฿', 'bundle', 'active', 142, 20);
  insert into promotions (store_id, name, promo_type, status, redeemed_count, discount_amount)
  values (v_store, 'ลด 20฿ ลูกค้าหายเกิน 21 วัน', 'coupon', 'draft', 0, 20);
  insert into promotions (store_id, name, promo_type, status, redeemed_count, discount_amount)
  values (v_store, 'ไข่ดาวฟรี เมื่อครบ 100฿', 'free_item', 'ended', 318, 20);

  -- ─── ออเดอร์วันนี้ 18 บิล ตรงกับเดโม (มีทั้ง new/preparing/ready/completed) ──
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1267', 'walkin', 'completed', null, null,
          (v_today + time '10:58') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    1, 60, 38);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำเปล่า'),
    1, 10, 5);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1268', 'delivery', 'cancelled', (select id from customers where store_id = v_store and name = 'ธนา มั่งมี' limit 1), 'ยกเลิก: กุ้งหมด',
          (v_today + time '11:05') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราทะเล'),
    1, 79, 58);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1269', 'walkin', 'completed', null, null,
          (v_today + time '11:12') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    1, 55, 33);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ไข่ดาว'),
    1, 12, 6);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    1, 25, 11);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1270', 'online', 'completed', (select id from customers where store_id = v_store and name = 'เอกชัย พูนทรัพย์' limit 1), null,
          (v_today + time '11:16') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    2, 55, 31);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำอัดลม'),
    1, 20, 12);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1271', 'walkin', 'completed', null, null,
          (v_today + time '11:20') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    1, 69, 49);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1272', 'delivery', 'completed', (select id from customers where store_id = v_store and name = 'วิภา สายลม' limit 1), null,
          (v_today + time '11:24') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    2, 60, 38);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ไข่ดาว'),
    1, 12, 6);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำอัดลม'),
    1, 20, 12);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1273', 'walkin', 'completed', null, null,
          (v_today + time '11:27') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ข้าวไข่เจียวหมูสับ'),
    1, 50, 27);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำเปล่า'),
    1, 10, 5);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1274', 'online', 'completed', (select id from customers where store_id = v_store and name = 'สมชาย ใจดี' limit 1), null,
          (v_today + time '11:31') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    1, 69, 49);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    1, 60, 38);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    2, 25, 11);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1275', 'walkin', 'completed', null, null,
          (v_today + time '11:35') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    1, 55, 33);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำเปล่า'),
    1, 10, 5);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1276', 'delivery', 'completed', (select id from customers where store_id = v_store and name = 'สุดา แสนดี' limit 1), null,
          (v_today + time '11:38') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    2, 69, 49);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำอัดลม'),
    2, 20, 12);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1277', 'walkin', 'ready', null, null,
          (v_today + time '11:42') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    1, 55, 31);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    1, 25, 11);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1278', 'online', 'ready', (select id from customers where store_id = v_store and name = 'มานี รักเรียน' limit 1), null,
          (v_today + time '11:44') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    1, 69, 49);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ไข่ดาว'),
    2, 12, 6);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1279', 'walkin', 'preparing', null, 'ไม่ใส่ใบกะเพรา 1 จาน',
          (v_today + time '11:47') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    3, 60, 38);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1280', 'delivery', 'preparing', (select id from customers where store_id = v_store and name = 'ปรีชา ตั้งใจ' limit 1), 'แยกข้าว',
          (v_today + time '11:49') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    1, 69, 49);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ข้าวผัดหมู'),
    1, 55, 31);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำอัดลม'),
    2, 20, 12);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1281', 'walkin', 'preparing', null, null,
          (v_today + time '11:51') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราไก่'),
    2, 55, 33);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำเปล่า'),
    2, 10, 5);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1282', 'online', 'new', (select id from customers where store_id = v_store and name = 'สมชาย ใจดี' limit 1), 'เผ็ดมาก',
          (v_today + time '11:54') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    1, 69, 49);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ชาเย็น'),
    1, 25, 11);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1283', 'delivery', 'new', (select id from customers where store_id = v_store and name = 'ณัฐพล วงศ์ใหญ่' limit 1), null,
          (v_today + time '11:56') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมู'),
    1, 60, 38);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'ไข่ดาว'),
    1, 12, 6);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำเปล่า'),
    1, 10, 5);
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  values (v_store, '#1284', 'walkin', 'new', null, 'ไม่ใส่พริก 1 จาน',
          (v_today + time '11:58') at time zone 'Asia/Bangkok')
  returning id into v_order;
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'กะเพราหมูกรอบ'),
    2, 69, 49);
  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,
    (select id from menus where store_id = v_store and name = 'น้ำอัดลม'),
    1, 20, 12);

  -- ─── ประวัติการขาย 29 วันก่อนหน้า (สร้างจากน้ำหนักเมนูและช่วงเวลาจริง) ────
  --     ใช้ setseed เพื่อให้ผลลัพธ์เหมือนกันทุกครั้งที่ seed ใหม่
  perform setseed(0.4242);
    for d in 1..29 loop
      declare
        v_day date := v_today - d;
        v_cnt int := (array[284,254,244,267,260,271,217,265,282,242,259,262,236,256,281,270,229,248,273,232,252,278,244,258,264,219,247,233])[d];
        v_i int; v_j int; v_h int; v_items int; v_menu uuid; v_price numeric; v_cost numeric;
      begin
        for v_i in 1..greatest(1, round(v_cnt / 8.0)::int) loop   -- ย่อจำนวนบิลลง 8 เท่าเพื่อให้ seed เร็ว
          v_h := (array[8,8,8,9,9,9,9,10,10,10,10,10,10,11,11,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13,13,13,13,13,13,13,13,13,13,13,13,14,14,14,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19])
                 [1 + floor(random() * 93)::int];
          insert into orders (store_id, code, channel, status, placed_at)
          values (v_store, '#H' || d::text || '-' || v_i::text,   -- แยก range ไม่ให้ชนบิลจริง
                  (array['walkin','walkin','walkin','delivery','online'])[1 + floor(random()*5)::int]::order_channel,
                  'completed',
                  (v_day + make_time(v_h, floor(random()*60)::int, 0)) at time zone 'Asia/Bangkok')
          returning id into v_order;
          v_items := 1 + floor(random() * 3)::int;
          for v_j in 1..v_items loop
            select m.id, m.price, c.cost into v_menu, v_price, v_cost
              from menus m join v_menu_cost c on c.menu_id = m.id
             where m.store_id = v_store and m.name = (array['กะเพราหมูกรอบ','กะเพราหมู','กะเพราไก่','ข้าวผัดหมู','ข้าวไข่เจียวหมูสับ','ไข่ดาว','น้ำเปล่า','น้ำอัดลม','ชาเย็น'])
                   [1 + floor(random() * 9)::int];
            insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost)
            values (v_order, v_menu, 1 + floor(random()*2)::int, v_price, v_cost)
            on conflict do nothing;
          end loop;
        end loop;
      end;
    end loop;

  -- บิลถัดไปที่ผู้ใช้สร้างจะเป็น #1285 ต่อจากเดโม
  update stores set order_counter = 1284 where id = v_store;
  raise notice 'seed สำเร็จ — store_id = %', v_store;
end $seed$;

