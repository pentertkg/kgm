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
