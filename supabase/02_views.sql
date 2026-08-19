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
