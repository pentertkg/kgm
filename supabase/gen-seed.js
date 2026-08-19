/* ============================================================
   gen-seed.js — สร้าง supabase/04_seed.sql จาก assets/js/data.js
   รัน: node supabase/gen-seed.js
   จุดประสงค์: ให้ฐานข้อมูลจริงเริ่มต้นด้วยข้อมูลชุดเดียวกับที่เดโมใช้
   ============================================================ */
global.window = {}; global.localStorage = { getItem: () => null };
require('../assets/js/data.js');
const D = global.window.DB;

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const n = v => (v === null || v === undefined || v === '' ? 'null' : Number(v));
const out = [];
const w = (...l) => out.push(...l);

w(`-- ═══════════════════════════════════════════════════════════════════════════
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
  values (${q(D.store.name)}, ${q(D.store.emoji)}, ${q(D.store.format)}, ${q(D.store.type)},
          ${q(D.store.location)}, ${q(D.store.open)}, ${q(D.store.close)},
          ${n(D.store.staff)}, ${n(D.store.goalMonth)}, 35, 1284)
  returning id into v_store;

  insert into store_members (store_id, user_id, role) values (v_store, v_user, 'owner');
`);

/* ---------- suppliers ---------- */
w(`  -- ─── ซัพพลายเออร์ ───────────────────────────────────────────────────────`);
const SUP = [
  ['ตลาดคลองเตย (เนื้อสัตว์)', 'ส่ง 05:30 ทุกวัน'],
  ['ร้านของสด ป้าน้อย', 'ส่ง 06:00 จ/พ/ศ'],
  ['ยี่ปั๊วเครื่องดื่ม', 'ส่งทุกวันจันทร์']
];
SUP.forEach(([nm, note]) =>
  w(`  insert into suppliers (store_id, name, delivery_note) values (v_store, ${q(nm)}, ${q(note)});`));

/* ---------- ingredients ---------- */
w(``, `  -- ─── วัตถุดิบ (stock_qty/min_qty ตรงกับที่เดโมแสดง) ─────────────────────`);
D.ingredients.forEach(i => {
  const sup = ['porkc','pork','chick','sea'].includes(i.id) ? SUP[0][0]
            : ['egg','basil','chili'].includes(i.id)        ? SUP[1][0]
            : ['water','soda','tea'].includes(i.id)         ? SUP[2][0] : null;
  w(`  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)`,
    `  values (v_store, ${q(i.name)}, ${q(i.unit)}, ${n(i.cost)}, ${n(i.stock)}, ${n(i.min)},`,
    `          ${sup ? `(select id from suppliers where store_id = v_store and name = ${q(sup)})` : 'null'});`);
});

/* ---------- menus + recipes ---------- */
w(``, `  -- ─── เมนู + สูตร (qty = ต้นทุนต่อจาน ÷ ราคาต่อหน่วยของวัตถุดิบ) ──────────`);
D.menu.forEach((m, idx) => {
  w(`  insert into menus (store_id, name, emoji, category, price, description, is_active, sort_order)`,
    `  values (v_store, ${q(m.name)}, ${q(m.emoji)}, ${q(m.cat)}, ${n(m.price)}, ${q(m.desc || '')}, true, ${idx});`);
  m.recipe.forEach(([ingId, label, cost]) => {
    const ing = D.ing(ingId);
    if (!ing || !ing.cost) return;
    const qty = +(cost / ing.cost).toFixed(4);
    w(`  insert into menu_recipes (menu_id, ingredient_id, qty, note) values (`,
      `    (select id from menus where store_id = v_store and name = ${q(m.name)}),`,
      `    (select id from ingredients where store_id = v_store and name = ${q(ing.name)}),`,
      `    ${qty}, ${q(label)});`);
  });
});

/* ---------- customers ---------- */
w(``, `  -- ─── ลูกค้า (segment ไม่ต้อง seed — view คำนวณจากประวัติการซื้อเอง) ───────`);
D.customers.forEach(c =>
  w(`  insert into customers (store_id, name) values (v_store, ${q(c.name)});`));

/* ---------- expenses (ทำให้ P&L มีข้อมูลจริง) ---------- */
w(``, `  -- ─── ค่าใช้จ่ายเดือนนี้ (ทำให้ v_pnl_monthly คำนวณกำไรสุทธิได้) ──────────`);
const M = D.month;
[['labor', M.labor, 'ค่าแรงพนักงาน 3 คน'],
 ['rent',  M.rent,  'ค่าเช่าที่ + ค่าน้ำไฟ'],
 ['marketing', M.marketing, 'ค่าโฆษณา Facebook/LINE/TikTok'],
 ['other', M.other, 'แก๊ส ขนส่ง เบ็ดเตล็ด']
].forEach(([type, amt, note]) =>
  w(`  insert into expenses (store_id, expense_type, amount, note, spent_on)`,
    `  values (v_store, ${q(type)}, ${n(amt)}, ${q(note)}, date_trunc('month', v_today)::date);`));

/* ---------- campaigns / promotions ---------- */
w(``, `  -- ─── แคมเปญ ────────────────────────────────────────────────────────────`);
D.campaigns.forEach(c =>
  w(`  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)`,
    `  values (v_store, ${q(c.name)}, ${q(c.ch)}, ${q(c.st)}, ${n(c.spend)}, ${n(c.revenue)},`,
    `          ${n(c.orders)}, ${n(c.newCust)}, date_trunc('month', v_today)::date);`));
w(``);
D.promotions.forEach(p => {
  const t = { 'Bundle':'bundle', 'Coupon':'coupon', 'Free item':'free_item' }[p.type] || 'discount';
  const st = p.st === 'ended' ? 'ended' : p.st;
  w(`  insert into promotions (store_id, name, promo_type, status, redeemed_count, discount_amount)`,
    `  values (v_store, ${q(p.name)}, ${q(t)}, ${q(st)}, ${n(p.used)}, 20);`);
});

/* ---------- 18 ออเดอร์จริงของวันนี้ (ให้หน้า Orders/Kitchen เหมือนเดโม) ---------- */
w(``, `  -- ─── ออเดอร์วันนี้ 18 บิล ตรงกับเดโม (มีทั้ง new/preparing/ready/completed) ──`);
D.orders.slice().reverse().forEach(o => {
  const cust = o.cust === 'ลูกค้าหน้าร้าน' ? 'null'
    : `(select id from customers where store_id = v_store and name = ${q(o.cust.replace(/ ว\.$/, ' วงศ์ใหญ่'))} limit 1)`;
  w(`  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)`,
    `  values (v_store, ${q(o.id)}, ${q(o.ch)}, ${q(o.st)}, ${cust}, ${o.note ? q(o.note) : 'null'},`,
    `          (v_today + time ${q(o.t)}) at time zone 'Asia/Bangkok')`,
    `  returning id into v_order;`);
  o.lines.forEach(l =>
    w(`  insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost) values (v_order,`,
      `    (select id from menus where store_id = v_store and name = ${q(l.menu.name)}),`,
      `    ${l.qty}, ${n(l.menu.price)}, ${n(l.menu.cost)});`));
});

/* ---------- ประวัติ 30 วัน (สร้างแบบ procedural ให้ไฟล์ไม่บวม) ---------- */
const weights = D.menu.map(m => ({ name: m.name, w: D.todayUnits[m.id] || 0 })).filter(x => x.w > 0);
const totalW = weights.reduce((s, x) => s + x.w, 0);
const dayOrders = D.trend30.map(r => r.orders);
const hourW = D.hourly.map(h => ({ h: +h.h, w: h.r }));

w(``, `  -- ─── ประวัติการขาย 29 วันก่อนหน้า (สร้างจากน้ำหนักเมนูและช่วงเวลาจริง) ────`,
     `  --     ใช้ setseed เพื่อให้ผลลัพธ์เหมือนกันทุกครั้งที่ seed ใหม่`);
w(`  perform setseed(0.4242);`);
w(`    for d in 1..29 loop`);
w(`      declare`);
w(`        v_day date := v_today - d;`);
w(`        v_cnt int := (array[${dayOrders.slice(0, 29).reverse().join(',')}])[d];`);
w(`        v_i int; v_j int; v_h int; v_items int; v_menu uuid; v_price numeric; v_cost numeric;`);
w(`      begin`);
w(`        for v_i in 1..greatest(1, round(v_cnt / 8.0)::int) loop   -- ย่อจำนวนบิลลง 8 เท่าเพื่อให้ seed เร็ว`);
w(`          v_h := (array[${hourW.flatMap(x => Array(Math.max(1, Math.round(x.w / 200))).fill(x.h)).join(',')}])`);
w(`                 [1 + floor(random() * ${hourW.reduce((s, x) => s + Math.max(1, Math.round(x.w / 200)), 0)})::int];`);
w(`          insert into orders (store_id, code, channel, status, placed_at)`);
w(`          values (v_store, '#H' || d::text || '-' || v_i::text,   -- แยก range ไม่ให้ชนบิลจริง`);
w(`                  (array['walkin','walkin','walkin','delivery','online'])[1 + floor(random()*5)::int]::order_channel,`);
w(`                  'completed',`);
w(`                  (v_day + make_time(v_h, floor(random()*60)::int, 0)) at time zone 'Asia/Bangkok')`);
w(`          returning id into v_order;`);
w(`          v_items := 1 + floor(random() * 3)::int;`);
w(`          for v_j in 1..v_items loop`);
w(`            select m.id, m.price, c.cost into v_menu, v_price, v_cost`);
w(`              from menus m join v_menu_cost c on c.menu_id = m.id`);
w(`             where m.store_id = v_store and m.name = (array[${weights.map(x => q(x.name)).join(',')}])`);
w(`                   [1 + floor(random() * ${weights.length})::int];`);
w(`            insert into order_lines (order_id, menu_id, qty, unit_price, unit_cost)`);
w(`            values (v_order, v_menu, 1 + floor(random()*2)::int, v_price, v_cost)`);
w(`            on conflict do nothing;`);
w(`          end loop;`);
w(`        end loop;`);
w(`      end;`);
w(`    end loop;`);

w(``, `  -- บิลถัดไปที่ผู้ใช้สร้างจะเป็น #1285 ต่อจากเดโม`,
     `  update stores set order_counter = 1284 where id = v_store;`,
     `  raise notice 'seed สำเร็จ — store_id = %', v_store;`, `end $seed$;`);

require('fs').writeFileSync('supabase/04_seed.sql', out.join('\n') + '\n');
console.log('เขียน supabase/04_seed.sql แล้ว —', out.length, 'บรรทัด');
