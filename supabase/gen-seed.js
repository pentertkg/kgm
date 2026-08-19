/* ============================================================
   gen-seed.js — สร้าง supabase/04_seed.sql จาก assets/js/data.js
   รัน: node supabase/gen-seed.js

   เขียนแบบ VALUES + JOIN แทน subselect ต่อแถว ทำให้ไฟล์เล็กลงราว 3 เท่า
   และปล่อยให้ trigger ในฐานข้อมูลเติม unit_price/unit_cost เอง
   (เป็นการทดสอบ trigger ไปในตัว)
   ============================================================ */
global.window = {}; global.localStorage = { getItem: () => null };
require('../assets/js/data.js');
const D = global.window.DB;

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const n = v => (v === null || v === undefined || v === '' ? 'null' : +v);
const L = [];
const w = (...l) => L.push(...l);

const SUP = [
  ['ตลาดคลองเตย (เนื้อสัตว์)', 'ส่ง 05:30 ทุกวัน'],
  ['ร้านของสด ป้าน้อย', 'ส่ง 06:00 จ/พ/ศ'],
  ['ยี่ปั๊วเครื่องดื่ม', 'ส่งทุกวันจันทร์']
];
const supFor = id =>
  ['porkc','pork','chick','sea'].includes(id) ? SUP[0][0] :
  ['egg','basil','chili'].includes(id)        ? SUP[1][0] :
  ['water','soda','tea'].includes(id)         ? SUP[2][0] : null;

w(`-- ═══════════════════════════════════════════════════════════════════════════
-- StreetFood OS — Phase 2 · Seed data
-- ⚠️ GENERATE จาก assets/js/data.js — อย่าแก้มือ (รัน: node supabase/gen-seed.js)
-- ต้องมีผู้ใช้ใน Authentication ก่อน จึงจะผูกร้านเข้ากับเจ้าของได้
-- ═══════════════════════════════════════════════════════════════════════════

do $seed$
declare
  v_store uuid;
  -- SQL Editor รันด้วย role postgres (ไม่มี JWT) → auth.uid() เป็น NULL
  -- จึงถอยไปใช้ผู้ใช้คนแรกที่สร้างไว้
  v_user  uuid := coalesce(auth.uid(), (select id from auth.users order by created_at limit 1));
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  v_order uuid;
begin
  if v_user is null then
    raise exception 'ยังไม่มีผู้ใช้ในระบบ — ไปสร้างที่ Authentication → Users → Add user ก่อน';
  end if;

  insert into stores (name, emoji, format, food_type, location, open_time, close_time,
                      staff_count, goal_month, target_margin, order_counter)
  values (${q(D.store.name)}, ${q(D.store.emoji)}, ${q(D.store.format)}, ${q(D.store.type)},
          ${q(D.store.location)}, ${q(D.store.open)}, ${q(D.store.close)},
          ${n(D.store.staff)}, ${n(D.store.goalMonth)}, 35, 1284)
  returning id into v_store;

  insert into store_members (store_id, user_id, role) values (v_store, v_user, 'owner');
`);

/* ---------- suppliers ---------- */
w(`  insert into suppliers (store_id, name, delivery_note)`,
  `  select v_store, t.a, t.b from (values`,
  SUP.map(([a,b]) => `    (${q(a)},${q(b)})`).join(',\n'),
  `  ) t(a,b);`, ``);

/* ---------- ingredients ---------- */
w(`  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)`,
  `  select v_store, t.nm, t.un, t.cost, t.stock, t.mn,`,
  `         (select id from suppliers s where s.store_id = v_store and s.name = t.sup)`,
  `  from (values`,
  D.ingredients.map(i =>
    `    (${q(i.name)},${q(i.unit)},${n(i.cost)},${n(i.stock)},${n(i.min)},${supFor(i.id) ? q(supFor(i.id)) : 'null'})`
  ).join(',\n'),
  `  ) t(nm,un,cost,stock,mn,sup);`, ``);

/* ---------- menus ---------- */
w(`  insert into menus (store_id, name, emoji, category, price, description, sort_order)`,
  `  select v_store, t.nm, t.em, t.cat, t.price, t.descr, t.ord from (values`,
  D.menu.map((m,i) =>
    `    (${q(m.name)},${q(m.emoji)},${q(m.cat)},${n(m.price)},${q(m.desc||'')},${i})`
  ).join(',\n'),
  `  ) t(nm,em,cat,price,descr,ord);`, ``);

/* ---------- menu_recipes: qty = ต้นทุนต่อจาน ÷ ราคาต่อหน่วยวัตถุดิบ ---------- */
const rec = [];
D.menu.forEach(m => m.recipe.forEach(([ingId, label, cost]) => {
  const ing = D.ing(ingId);
  if (ing && ing.cost) rec.push(`    (${q(m.name)},${q(ing.name)},${+(cost/ing.cost).toFixed(4)},${q(label)})`);
}));
w(`  insert into menu_recipes (menu_id, ingredient_id, qty, note)`,
  `  select m.id, i.id, t.qty, t.note from (values`,
  rec.join(',\n'),
  `  ) t(mn,inn,qty,note)`,
  `  join menus       m on m.store_id = v_store and m.name = t.mn`,
  `  join ingredients i on i.store_id = v_store and i.name = t.inn;`, ``);

/* ---------- customers ---------- */
w(`  insert into customers (store_id, name)`,
  `  select v_store, t.nm from (values`,
  D.customers.map(c => `    (${q(c.name)})`).join(',\n'),
  `  ) t(nm);`, ``);


/* ---------- campaigns ---------- */
w(`  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)`,
  `  select v_store, t.nm, t.ch, t.st::campaign_status, t.sp, t.rev, t.ords, t.nc,`,
  `         date_trunc('month', v_today)::date from (values`,
  D.campaigns.map(c =>
    `    (${q(c.name)},${q(c.ch)},${q(c.st)},${n(c.spend)},${n(c.revenue)},${n(c.orders)},${n(c.newCust)})`
  ).join(',\n'),
  `  ) t(nm,ch,st,sp,rev,ords,nc);`, ``);

/* ---------- promotions ---------- */
const PT = { 'Bundle':'bundle', 'Coupon':'coupon', 'Free item':'free_item' };
w(`  insert into promotions (store_id, name, promo_type, status, redeemed_count, discount_amount)`,
  `  select v_store, t.nm, t.ty::promo_type, t.st::campaign_status, t.used, 20 from (values`,
  D.promotions.map(p =>
    `    (${q(p.name)},${q(PT[p.type]||'discount')},${q(p.st === 'ended' ? 'ended' : p.st)},${n(p.used)})`
  ).join(',\n'),
  `  ) t(nm,ty,st,used);`, ``);

/* ---------- ออเดอร์วันนี้ 18 บิล (ตรงกับเดโม) ---------- */
const fixName = s => s.replace(/ ว\.$/, ' วงศ์ใหญ่');
w(`  -- ออเดอร์วันนี้ 18 บิล เหมือนในเดโม (มีทั้ง new/preparing/ready/completed/cancelled)`,
  `  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)`,
  `  select v_store, t.code, t.ch::order_channel, t.st::order_status,`,
  `         (select id from customers c where c.store_id = v_store and c.name = t.cust),`,
  `         nullif(t.note,''), (v_today + t.tm::time) at time zone 'Asia/Bangkok'`,
  `  from (values`,
  D.orders.slice().reverse().map(o =>
    `    (${q(o.id)},${q(o.ch)},${q(o.st)},${o.cust === 'ลูกค้าหน้าร้าน' ? 'null' : q(fixName(o.cust))},${q(o.note||'')},${q(o.t)})`
  ).join(',\n'),
  `  ) t(code,ch,st,cust,note,tm);`, ``);

/* order_lines — ปล่อยให้ trigger เติม unit_price/unit_cost */
const lines = [];
D.orders.forEach(o => o.lines.forEach(l => lines.push(`    (${q(o.id)},${q(l.menu.name)},${l.qty})`)));
w(`  -- ไม่ส่ง unit_price/unit_cost — trigger order_lines_snapshot เติมให้เอง`,
  `  insert into order_lines (order_id, menu_id, qty)`,
  `  select o.id, m.id, t.qty from (values`,
  lines.join(',\n'),
  `  ) t(code,mn,qty)`,
  `  join orders o on o.store_id = v_store and o.code = t.code`,
  `  join menus  m on m.store_id = v_store and m.name = t.mn;`, ``);

/* ---------- ประวัติ 29 วัน (procedural — ไฟล์ไม่บวม) ---------- */
const wts = D.menu.map(m => ({ name: m.name, w: D.todayUnits[m.id] || 0 })).filter(x => x.w > 0);
const dayOrders = D.trend30.map(r => r.orders).slice(0, 29).reverse();
const hourPool = D.hourly.flatMap(h => Array(Math.max(1, Math.round(h.r / 200))).fill(+h.h));


/* ---------- expenses: คิดเป็นสัดส่วนของยอดขายที่ seed ได้จริง ----------
   ถ้าใส่เป็นตัวเลขคงที่เต็มเดือน แต่ history ถูกย่อจำนวนบิลลง
   กำไรสุทธิจะติดลบมหาศาลและหน้า P&L จะอ่านไม่ได้
   จึงคิดจากอัตราส่วนจริงของร้าน (จาก data.js) เทียบกับยอดขายที่เกิดขึ้นจริง */
const Mo = D.month;
const ratio = x => +(x / Mo.revenue).toFixed(4);
w(`  -- ค่าใช้จ่ายคิดเป็นสัดส่วนของยอดขายที่ seed ได้จริง (อัตราส่วนจาก data.js)`,
  `  declare v_rev numeric := (select coalesce(sum(revenue),0) from v_daily_sales`,
  `                            where store_id = v_store`,
  `                              and sale_date >= date_trunc('month', v_today));`,
  `  begin`,
  `    insert into expenses (store_id, expense_type, amount, note, spent_on)`,
  `    select v_store, t.ty::expense_type, round(v_rev * t.pct, 2), t.note,`,
  `           date_trunc('month', v_today)::date from (values`,
  [['labor', ratio(Mo.labor), 'ค่าแรงพนักงาน 3 คน'],
   ['rent',  ratio(Mo.rent),  'ค่าเช่าที่ + ค่าน้ำไฟ'],
   ['marketing', ratio(Mo.marketing), 'ค่าโฆษณา Facebook/LINE/TikTok'],
   ['other', ratio(Mo.other), 'แก๊ส ขนส่ง เบ็ดเตล็ด']]
    .map(([t,r,nt]) => `      (${q(t)},${r},${q(nt)})`).join(',\n'),
  `    ) t(ty,pct,note);`,
  `  end;`, ``);

w(`  -- ประวัติการขาย ${dayOrders.length} วันก่อนหน้า (ย่อจำนวนบิลลง 8 เท่าเพื่อให้ seed เร็ว)`,
  `  -- setseed ทำให้ผลลัพธ์เหมือนกันทุกครั้งที่ seed ใหม่`,
  `  perform setseed(0.4242);`,
  `  for d in 1..${dayOrders.length} loop`,
  `    declare`,
  `      v_day  date := v_today - d;`,
  `      v_cnt  int  := (array[${dayOrders.join(',')}])[d];`,
  `      v_i int; v_h int;`,
  `    begin`,
  `      for v_i in 1..greatest(1, round(coalesce(v_cnt, 240) / 8.0)::int) loop`,
  `        v_h := (array[${hourPool.join(',')}])[1 + floor(random() * ${hourPool.length})::int];`,
  `        insert into orders (store_id, code, channel, status, placed_at)`,
  `        values (v_store, '#H' || d::text || '-' || v_i::text,`,
  `                (array['walkin','walkin','walkin','delivery','online'])[1 + floor(random()*5)::int]::order_channel,`,
  `                'completed',`,
  `                (v_day + make_time(v_h, floor(random()*60)::int, 0)) at time zone 'Asia/Bangkok')`,
  `        returning id into v_order;`,
  `        -- เลือกเมนูด้วย JOIN + order by random() แทนการสุ่ม index ในอาร์เรย์`,
  `        -- วิธีเดิมทำให้ menu_id เป็น NULL ได้ถ้าหาไม่เจอ ซึ่งชน not-null constraint`,
  `        insert into order_lines (order_id, menu_id, qty)`,
  `        select v_order, m.id, 1 + floor(random()*2)::int`,
  `        from menus m`,
  `        where m.store_id = v_store and m.is_active`,
  `          and m.name in (${wts.map(x => q(x.name)).join(',')})`,
  `        order by random()`,
  `        limit 1 + floor(random() * 3)::int;`,
  `      end loop;`,
  `    end;`,
  `  end loop;`, ``,
  `  -- บิลถัดไปที่ผู้ใช้สร้างจะเป็น #1285 ต่อจากเดโม`,
  `  update stores set order_counter = 1284 where id = v_store;`,
  `  raise notice 'seed สำเร็จ — store_id = %', v_store;`,
  `end $seed$;`);

require('fs').writeFileSync('supabase/04_seed.sql', L.join('\n') + '\n');
const kb = (require('fs').statSync('supabase/04_seed.sql').size / 1024).toFixed(1);
console.log(`เขียน supabase/04_seed.sql — ${L.length} บรรทัด · ${kb} KB`);
