-- ═══════════════════════════════════════════════════════════════════════════
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
  values ('ร้านกะเพราเฮียสม', '🌿', 'Street Food', 'ตามสั่ง / อาหารจานเดียว',
          'ซอยสุขุมวิท 23 (หน้าออฟฟิศ อโศก)', '08:00', '20:00',
          3, 500000, 35, 1284)
  returning id into v_store;

  insert into store_members (store_id, user_id, role) values (v_store, v_user, 'owner');

  insert into suppliers (store_id, name, delivery_note)
  select v_store, t.a, t.b from (values
    ('ตลาดคลองเตย (เนื้อสัตว์)','ส่ง 05:30 ทุกวัน'),
    ('ร้านของสด ป้าน้อย','ส่ง 06:00 จ/พ/ศ'),
    ('ยี่ปั๊วเครื่องดื่ม','ส่งทุกวันจันทร์')
  ) t(a,b);

  insert into ingredients (store_id, name, unit, cost_per_unit, stock_qty, min_qty, supplier_id)
  select v_store, t.nm, t.un, t.cost, t.stock, t.mn,
         (select id from suppliers s where s.store_id = v_store and s.name = t.sup)
  from (values
    ('หมูกรอบ','kg',280,2.4,5,'ตลาดคลองเตย (เนื้อสัตว์)'),
    ('หมูสับ','kg',165,3.2,8,'ตลาดคลองเตย (เนื้อสัตว์)'),
    ('อกไก่','kg',95,6.5,4,'ตลาดคลองเตย (เนื้อสัตว์)'),
    ('กุ้ง/ปลาหมึกรวม','kg',320,0,2,'ตลาดคลองเตย (เนื้อสัตว์)'),
    ('ข้าวสาร','kg',42,12,10,null),
    ('ไข่ไก่','แผง',132,8,6,'ร้านของสด ป้าน้อย'),
    ('ใบกะเพรา','kg',120,1.2,2,'ร้านของสด ป้าน้อย'),
    ('พริก+กระเทียม','kg',95,1.8,1.5,'ร้านของสด ป้าน้อย'),
    ('น้ำมันพืช','ลิตร',58,4,5,null),
    ('เครื่องปรุง (ซอส/น้ำปลา)','ขวด',45,3,2,null),
    ('กล่องข้าว + ถุง','ใบ',2.4,180,250,null),
    ('น้ำดื่มขวด','ขวด',5,96,60,'ยี่ปั๊วเครื่องดื่ม'),
    ('น้ำอัดลมกระป๋อง','กระป๋อง',12,24,48,'ยี่ปั๊วเครื่องดื่ม'),
    ('ผงชา + นมข้น','ชุด',135,2,1,'ยี่ปั๊วเครื่องดื่ม')
  ) t(nm,un,cost,stock,mn,sup);

  insert into menus (store_id, name, emoji, category, price, description, sort_order)
  select v_store, t.nm, t.em, t.cat, t.price, t.descr, t.ord from (values
    ('กะเพราหมูกรอบ','🍚','จานเดียว',69,'หมูกรอบเจ้าประจำ ผัดใบกะเพราไฟแรง ราดข้าวสวยร้อนๆ ขายดีที่สุดของร้าน',0),
    ('กะเพราหมู','🥘','จานเดียว',60,'กะเพราหมูสับสูตรต้นตำรับ เผ็ดกลาง สั่งเพิ่มไข่ดาวได้',1),
    ('กะเพราไก่','🍗','จานเดียว',55,'อกไก่สับ แคลอรีต่ำ กลุ่มออฟฟิศสั่งเยอะช่วงเที่ยง',2),
    ('ข้าวผัดหมู','🍛','จานเดียว',55,'ข้าวผัดหมูใส่ไข่ เมนูสำรองสำหรับคนไม่กินเผ็ด',3),
    ('ข้าวไข่เจียวหมูสับ','🍳','จานเดียว',50,'ไข่เจียวฟูหมูสับ ราคาเข้าถึงง่าย',4),
    ('กะเพราทะเล','🦐','จานเดียว',79,'เมนูใหม่ กุ้ง+ปลาหมึก ต้นทุนสูง ยอดขายยังไม่ขึ้น',5),
    ('ไข่ดาว','🍳','ท็อปปิ้ง',12,'ท็อปปิ้งยอดนิยม เพิ่มกำไรต่อบิลได้ดี',6),
    ('น้ำเปล่า','💧','เครื่องดื่ม',10,'น้ำดื่มขวดเล็ก 600 มล.',7),
    ('น้ำอัดลม','🥤','เครื่องดื่ม',20,'กระป๋อง 325 มล. เหมาะทำ Bundle คู่กับจานเดียว',8),
    ('ชาเย็น','🧋','เครื่องดื่ม',25,'ชาไทยเย็น มาร์จิ้นสูงสุดในร้าน',9)
  ) t(nm,em,cat,price,descr,ord);

  insert into menu_recipes (menu_id, ingredient_id, qty, note)
  select m.id, i.id, t.qty, t.note from (values
    ('กะเพราหมูกรอบ','หมูกรอบ',0.1071,'หมูกรอบ 105 ก.'),
    ('กะเพราหมูกรอบ','ข้าวสาร',0.1667,'ข้าวสวย 250 ก.'),
    ('กะเพราหมูกรอบ','เครื่องปรุง (ซอส/น้ำปลา)',0.0889,'เครื่องปรุง'),
    ('กะเพราหมูกรอบ','ไข่ไก่',0.0379,'ไข่ดาว 1 ฟอง'),
    ('กะเพราหมูกรอบ','กล่องข้าว + ถุง',1.25,'บรรจุภัณฑ์'),
    ('กะเพราหมู','หมูสับ',0.1333,'หมูสับ 130 ก.'),
    ('กะเพราหมู','ข้าวสาร',0.1667,'ข้าวสวย 250 ก.'),
    ('กะเพราหมู','เครื่องปรุง (ซอส/น้ำปลา)',0.0889,'เครื่องปรุง'),
    ('กะเพราหมู','ใบกะเพรา',0.0167,'ใบกะเพรา'),
    ('กะเพราหมู','กล่องข้าว + ถุง',1.25,'บรรจุภัณฑ์'),
    ('กะเพราไก่','อกไก่',0.1789,'อกไก่ 140 ก.'),
    ('กะเพราไก่','ข้าวสาร',0.1667,'ข้าวสวย 250 ก.'),
    ('กะเพราไก่','เครื่องปรุง (ซอส/น้ำปลา)',0.0889,'เครื่องปรุง'),
    ('กะเพราไก่','ใบกะเพรา',0.0167,'ใบกะเพรา'),
    ('กะเพราไก่','กล่องข้าว + ถุง',1.25,'บรรจุภัณฑ์'),
    ('ข้าวผัดหมู','หมูสับ',0.0909,'หมูสับ 90 ก.'),
    ('ข้าวผัดหมู','ข้าวสาร',0.1667,'ข้าวสวย 250 ก.'),
    ('ข้าวผัดหมู','ไข่ไก่',0.0227,'ไข่ 1 ฟอง'),
    ('ข้าวผัดหมู','เครื่องปรุง (ซอส/น้ำปลา)',0.0667,'เครื่องปรุง'),
    ('ข้าวผัดหมู','กล่องข้าว + ถุง',1.25,'บรรจุภัณฑ์'),
    ('ข้าวไข่เจียวหมูสับ','ไข่ไก่',0.0682,'ไข่ 3 ฟอง'),
    ('ข้าวไข่เจียวหมูสับ','หมูสับ',0.0485,'หมูสับ 50 ก.'),
    ('ข้าวไข่เจียวหมูสับ','ข้าวสาร',0.1667,'ข้าวสวย 250 ก.'),
    ('ข้าวไข่เจียวหมูสับ','กล่องข้าว + ถุง',1.25,'บรรจุภัณฑ์'),
    ('กะเพราทะเล','กุ้ง/ปลาหมึกรวม',0.1313,'กุ้ง+ปลาหมึก 130 ก.'),
    ('กะเพราทะเล','ข้าวสาร',0.1667,'ข้าวสวย 250 ก.'),
    ('กะเพราทะเล','เครื่องปรุง (ซอส/น้ำปลา)',0.0889,'เครื่องปรุง'),
    ('กะเพราทะเล','ใบกะเพรา',0.0167,'ใบกะเพรา'),
    ('กะเพราทะเล','กล่องข้าว + ถุง',1.25,'บรรจุภัณฑ์'),
    ('ไข่ดาว','ไข่ไก่',0.0303,'ไข่ 1 ฟอง'),
    ('ไข่ดาว','น้ำมันพืช',0.0345,'น้ำมัน'),
    ('น้ำเปล่า','น้ำดื่มขวด',1,'ขวด 600 มล.'),
    ('น้ำอัดลม','น้ำอัดลมกระป๋อง',1,'กระป๋อง 325 มล.'),
    ('ชาเย็น','ผงชา + นมข้น',0.0296,'ผงชา + นมข้น'),
    ('ชาเย็น','น้ำดื่มขวด',0.4,'น้ำแข็ง/แก้ว'),
    ('ชาเย็น','กล่องข้าว + ถุง',2.0833,'หลอด+ฝา')
  ) t(mn,inn,qty,note)
  join menus       m on m.store_id = v_store and m.name = t.mn
  join ingredients i on i.store_id = v_store and i.name = t.inn;

  insert into customers (store_id, name)
  select v_store, t.nm from (values
    ('สมชาย ใจดี'),
    ('มานี รักเรียน'),
    ('ปรีชา ตั้งใจ'),
    ('สุดา แสนดี'),
    ('ณัฐพล วงศ์ใหญ่'),
    ('วิภา สายลม'),
    ('เอกชัย พูนทรัพย์'),
    ('ธนา มั่งมี'),
    ('กมล ศรีสุข'),
    ('จันทร์เพ็ญ ดีงาม'),
    ('ภาคิน ทองแท้'),
    ('อรุณี แจ่มใส'),
    ('ชาลี เพื่อนบ้าน'),
    ('สมหญิง ขยันทำ'),
    ('พิชัย ค้าขาย')
  ) t(nm);

  insert into campaigns (store_id, name, channel, status, spend, revenue, orders_count, new_customers, started_on)
  select v_store, t.nm, t.ch, t.st::campaign_status, t.sp, t.rev, t.ords, t.nc,
         date_trunc('month', v_today)::date from (values
    ('กะเพรามื้อเที่ยง','Facebook Ads','active',2500,14800,214,62),
    ('ส่งฟรีรัศมี 3 กม.','LINE OA','active',3800,15300,236,71),
    ('เปิดร้านเช้า จับกลุ่มออฟฟิศ','TikTok','active',2200,9400,148,34),
    ('โปรเย็นวันศุกร์','Facebook Ads','paused',1900,6300,96,12),
    ('Boost เมนูใหม่ กะเพราทะเล','Facebook Ads','active',1600,2700,38,7)
  ) t(nm,ch,st,sp,rev,ords,nc);

  insert into promotions (store_id, name, promo_type, status, redeemed_count, discount_amount)
  select v_store, t.nm, t.ty::promo_type, t.st::campaign_status, t.used, 20 from (values
    ('กะเพรา + เครื่องดื่ม 75฿','bundle','active',142),
    ('ลด 20฿ ลูกค้าหายเกิน 21 วัน','coupon','draft',0),
    ('ไข่ดาวฟรี เมื่อครบ 100฿','free_item','ended',318)
  ) t(nm,ty,st,used);

  -- ออเดอร์วันนี้ 18 บิล เหมือนในเดโม (มีทั้ง new/preparing/ready/completed/cancelled)
  insert into orders (store_id, code, channel, status, customer_id, note, placed_at)
  select v_store, t.code, t.ch::order_channel, t.st::order_status,
         (select id from customers c where c.store_id = v_store and c.name = t.cust),
         nullif(t.note,''), (v_today + t.tm::time) at time zone 'Asia/Bangkok'
  from (values
    ('#1267','walkin','completed',null,'','10:58'),
    ('#1268','delivery','cancelled','ธนา มั่งมี','ยกเลิก: กุ้งหมด','11:05'),
    ('#1269','walkin','completed',null,'','11:12'),
    ('#1270','online','completed','เอกชัย พูนทรัพย์','','11:16'),
    ('#1271','walkin','completed',null,'','11:20'),
    ('#1272','delivery','completed','วิภา สายลม','','11:24'),
    ('#1273','walkin','completed',null,'','11:27'),
    ('#1274','online','completed','สมชาย ใจดี','','11:31'),
    ('#1275','walkin','completed',null,'','11:35'),
    ('#1276','delivery','completed','สุดา แสนดี','','11:38'),
    ('#1277','walkin','ready',null,'','11:42'),
    ('#1278','online','ready','มานี รักเรียน','','11:44'),
    ('#1279','walkin','preparing',null,'ไม่ใส่ใบกะเพรา 1 จาน','11:47'),
    ('#1280','delivery','preparing','ปรีชา ตั้งใจ','แยกข้าว','11:49'),
    ('#1281','walkin','preparing',null,'','11:51'),
    ('#1282','online','new','สมชาย ใจดี','เผ็ดมาก','11:54'),
    ('#1283','delivery','new','ณัฐพล วงศ์ใหญ่','','11:56'),
    ('#1284','walkin','new',null,'ไม่ใส่พริก 1 จาน','11:58')
  ) t(code,ch,st,cust,note,tm);

  -- ไม่ส่ง unit_price/unit_cost — trigger order_lines_snapshot เติมให้เอง
  insert into order_lines (order_id, menu_id, qty)
  select o.id, m.id, t.qty from (values
    ('#1284','กะเพราหมูกรอบ',2),
    ('#1284','น้ำอัดลม',1),
    ('#1283','กะเพราหมู',1),
    ('#1283','ไข่ดาว',1),
    ('#1283','น้ำเปล่า',1),
    ('#1282','กะเพราหมูกรอบ',1),
    ('#1282','ชาเย็น',1),
    ('#1281','กะเพราไก่',2),
    ('#1281','น้ำเปล่า',2),
    ('#1280','กะเพราหมูกรอบ',1),
    ('#1280','ข้าวผัดหมู',1),
    ('#1280','น้ำอัดลม',2),
    ('#1279','กะเพราหมู',3),
    ('#1278','กะเพราหมูกรอบ',1),
    ('#1278','ไข่ดาว',2),
    ('#1277','ข้าวผัดหมู',1),
    ('#1277','ชาเย็น',1),
    ('#1276','กะเพราหมูกรอบ',2),
    ('#1276','น้ำอัดลม',2),
    ('#1275','กะเพราไก่',1),
    ('#1275','น้ำเปล่า',1),
    ('#1274','กะเพราหมูกรอบ',1),
    ('#1274','กะเพราหมู',1),
    ('#1274','ชาเย็น',2),
    ('#1273','ข้าวไข่เจียวหมูสับ',1),
    ('#1273','น้ำเปล่า',1),
    ('#1272','กะเพราหมู',2),
    ('#1272','ไข่ดาว',1),
    ('#1272','น้ำอัดลม',1),
    ('#1271','กะเพราหมูกรอบ',1),
    ('#1270','ข้าวผัดหมู',2),
    ('#1270','น้ำอัดลม',1),
    ('#1269','กะเพราไก่',1),
    ('#1269','ไข่ดาว',1),
    ('#1269','ชาเย็น',1),
    ('#1268','กะเพราทะเล',1),
    ('#1267','กะเพราหมู',1),
    ('#1267','น้ำเปล่า',1)
  ) t(code,mn,qty)
  join orders o on o.store_id = v_store and o.code = t.code
  join menus  m on m.store_id = v_store and m.name = t.mn;

  -- ค่าใช้จ่ายคิดเป็นสัดส่วนของยอดขายที่ seed ได้จริง (อัตราส่วนจาก data.js)
  declare v_rev numeric := (select coalesce(sum(revenue),0) from v_daily_sales
                            where store_id = v_store
                              and sale_date >= date_trunc('month', v_today));
  begin
    insert into expenses (store_id, expense_type, amount, note, spent_on)
    select v_store, t.ty::expense_type, round(v_rev * t.pct, 2), t.note,
           date_trunc('month', v_today)::date from (values
      ('labor',0.1389,'ค่าแรงพนักงาน 3 คน'),
      ('rent',0.0595,'ค่าเช่าที่ + ค่าน้ำไฟ'),
      ('marketing',0.0397,'ค่าโฆษณา Facebook/LINE/TikTok'),
      ('other',0.0278,'แก๊ส ขนส่ง เบ็ดเตล็ด')
    ) t(ty,pct,note);
  end;

  -- ประวัติการขาย 28 วันก่อนหน้า (ย่อจำนวนบิลลง 8 เท่าเพื่อให้ seed เร็ว)
  -- setseed ทำให้ผลลัพธ์เหมือนกันทุกครั้งที่ seed ใหม่
  perform setseed(0.4242);
  for d in 1..28 loop
    declare
      v_day  date := v_today - d;
      v_cnt  int  := (array[284,254,244,267,260,271,217,265,282,242,259,262,236,256,281,270,229,248,273,232,252,278,244,258,264,219,247,233])[d];
      v_i int; v_h int;
    begin
      for v_i in 1..greatest(1, round(coalesce(v_cnt, 240) / 8.0)::int) loop
        v_h := (array[8,8,8,9,9,9,9,10,10,10,10,10,10,11,11,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,13,13,13,13,13,13,13,13,13,13,13,13,14,14,14,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19])[1 + floor(random() * 93)::int];
        insert into orders (store_id, code, channel, status, placed_at)
        values (v_store, '#H' || d::text || '-' || v_i::text,
                (array['walkin','walkin','walkin','delivery','online'])[1 + floor(random()*5)::int]::order_channel,
                'completed',
                (v_day + make_time(v_h, floor(random()*60)::int, 0)) at time zone 'Asia/Bangkok')
        returning id into v_order;
        -- เลือกเมนูด้วย JOIN + order by random() แทนการสุ่ม index ในอาร์เรย์
        -- วิธีเดิมทำให้ menu_id เป็น NULL ได้ถ้าหาไม่เจอ ซึ่งชน not-null constraint
        insert into order_lines (order_id, menu_id, qty)
        select v_order, m.id, 1 + floor(random()*2)::int
        from menus m
        where m.store_id = v_store and m.is_active
          and m.name in ('กะเพราหมูกรอบ','กะเพราหมู','กะเพราไก่','ข้าวผัดหมู','ข้าวไข่เจียวหมูสับ','ไข่ดาว','น้ำเปล่า','น้ำอัดลม','ชาเย็น')
        order by random()
        limit 1 + floor(random() * 3)::int;
      end loop;
    end;
  end loop;

  -- บิลถัดไปที่ผู้ใช้สร้างจะเป็น #1285 ต่อจากเดโม
  update stores set order_counter = 1284 where id = v_store;
  raise notice 'seed สำเร็จ — store_id = %', v_store;
end $seed$;
