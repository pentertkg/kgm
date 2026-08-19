# Phase 2 — ฐานข้อมูลจริงด้วย Supabase

โฟลเดอร์นี้คือ backend ของ StreetFood OS ทั้งหมด ยังไม่ผูกกับ project จริงจนกว่าจะทำขั้นตอนด้านล่าง
ระหว่างนี้เว็บที่ deploy อยู่ยังทำงานในโหมดเดโม (Mock Data) ตามปกติ ไม่กระทบอะไร

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
|---|---|
| `01_schema.sql` | 15 ตาราง · 8 enum · 5 trigger · index — โครงสร้างข้อมูลทั้งหมด |
| `02_views.sql` | 11 view ที่คำนวณ KPI ทุกตัวที่แอปใช้ (margin, ยอดขายรายวัน, สต็อก, CRM, P&L, ROAS) |
| `03_rls.sql` | Row Level Security — กันข้อมูลข้ามร้าน + แยกสิทธิ์ owner/manager/cashier |
| `04_seed.sql` | ข้อมูลเริ่มต้น **generate จาก `assets/js/data.js`** (อย่าแก้มือ) |
| `gen-seed.js` | ตัว generate seed — รัน `node supabase/gen-seed.js` หลังแก้ `data.js` |
| `validate.py` | ตรวจ SQL ทุกไฟล์ด้วย parser จริงของ Postgres |

ตรวจก่อนรันจริงได้เสมอ:
```bash
/tmp/sqlv/bin/python supabase/validate.py
```

## การออกแบบ 3 ข้อที่ต้องเข้าใจก่อนแก้อะไร

**1. ต้นทุนเมนูไม่ได้เก็บเป็นตัวเลข**
`menu_recipes.qty × ingredients.cost_per_unit` คือที่มาของต้นทุน ดังนั้นเวลาแก้ราคาหมูที่เดียว
margin ของทุกเมนูที่ใช้หมูจะขยับเองทันที — นี่คือกลไกที่ทำให้ insight
*"ต้นทุนหมูขึ้น 8% ทำให้กำไรลด 4%"* เกิดขึ้นได้จริง ไม่ใช่ข้อความที่เขียนไว้

**2. `order_lines` เก็บ snapshot ราคาและต้นทุน ณ เวลาขาย**
ถ้าขึ้นราคากะเพราวันนี้ ยอดขายและกำไรของเดือนที่แล้วต้องไม่เปลี่ยน
ไม่ต้องส่ง `unit_price`/`unit_cost` ตอน insert — trigger `order_lines_snapshot` เติมให้เอง

**3. `segment` ของลูกค้าไม่ใช่คอลัมน์**
`v_customer_stats` คำนวณจากประวัติการซื้อทุกครั้งที่ query (VIP / regular / risk / inactive / new)
จึงไม่มีปัญหาข้อมูลค้างเก่า

## ขั้นตอนติดตั้ง

**1) สร้าง project** — [supabase.com](https://supabase.com) → New project
- Region: **Southeast Asia (Singapore)** — ใกล้ผู้ใช้ไทยที่สุด
- ตั้งรหัส database ให้แข็ง (ไม่ต้องใช้ในแอป แต่ใช้ตอนเข้า SQL Editor)

**2) รัน SQL ตามลำดับ** — SQL Editor → วางทีละไฟล์ → Run

```
01_schema.sql  →  02_views.sql  →  03_rls.sql
```

**3) สร้างผู้ใช้คนแรก** — Authentication → Users → Add user (ใส่อีเมล+รหัสผ่าน, ติ๊ก auto-confirm)

**4) รัน seed** — SQL Editor รัน `04_seed.sql`
> ⚠️ `04_seed.sql` ใช้ `auth.uid()` เพื่อผูกร้านเข้ากับบัญชีคุณ ถ้ารันใน SQL Editor แล้วขึ้น error
> ว่าต้อง login ให้ใช้วิธีนี้แทน: หา user id จากหน้า Authentication แล้วแก้บรรทัด
> `v_user uuid := auth.uid();` เป็น `v_user uuid := '<user-id-ที่คัดลอกมา>';`

**5) ใส่ค่าใน `assets/js/config.js`** — เอาจาก Project Settings → API
```javascript
window.SFOS_CONFIG = {
  supabaseUrl: 'https://xxxxxxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
  storeId: ''
};
```
> `anonKey` **เปิดเผยในหน้าเว็บได้โดยการออกแบบ** — สิ่งที่กันข้อมูลคือ RLS ไม่ใช่การซ่อน key
> **ห้ามใส่ `service_role` key** เด็ดขาด เพราะตัวนั้นข้าม RLS ทั้งหมด

**6) เปิด `db-check.html` แล้วกดทดสอบ** — หน้านี้จะเช็คให้ครบว่า
เข้าสู่ระบบได้ · ทุก view คืนค่าถูก · RLS ไม่บล็อกเจ้าของร้าน · trigger snapshot ราคาทำงาน ·
และตัดสต็อกอัตโนมัติเมื่อออเดอร์เสร็จ

**7) แก้ CSP** — ตอนนี้ `vercel.json` ตั้ง `connect-src 'none'` ไว้ (หน้าเว็บยิง request ออกไม่ได้เลย)
ต้องเปลี่ยนเป็นโดเมนของ project คุณ:
```
connect-src 'self' https://xxxxxxxxxxxx.supabase.co wss://xxxxxxxxxxxx.supabase.co
```
(`wss:` ต้องมีถ้าจะใช้ Realtime ให้จอครัวซิงก์กับหน้าแคชเชียร์)

## สิ่งที่ยังไม่ได้ทำในรอบนี้ (งานรอบถัดไป)

- [ ] เปลี่ยนหน้าแอปจาก `window.DB` (mock) ไปอ่านจาก `window.SFOS_LIVE` — เริ่มที่ **Menu & Cost → Orders → Dashboard** ตามลำดับ core loop
- [ ] หน้า Login / Sign up ในแอปจริง (ตอนนี้มีแค่ใน `db-check.html`)
- [ ] ผูก Onboarding wizard เข้ากับ `createStore()` แทนการเขียน localStorage
- [ ] Realtime subscription สำหรับ Kitchen Display (ตอนนี้ต้องรีเฟรชเอง)
- [ ] Attribution ของ campaign — ตอนนี้ `campaigns.revenue` กรอกมือ ยังไม่ได้ผูกกับออเดอร์จริง

## หมายเหตุเรื่องความถูกต้อง

- SQL ทุกไฟล์ผ่าน parser จริงของ Postgres แล้ว (syntax + โครงสร้าง PL/pgSQL)
- แต่ยัง **ไม่ได้รันกับฐานข้อมูลจริง** จึงยังไม่ได้ยืนยันเรื่อง semantic เช่นชื่อคอลัมน์ในทุก view
  หรือพฤติกรรม RLS ตอนรันจริง — `db-check.html` มีไว้เพื่อยืนยันสองเรื่องนี้ในขั้นตอนที่ 6
- `04_seed.sql` สร้างประวัติการขายย้อนหลัง 29 วันแบบสุ่มด้วย `setseed(0.4242)` (ผลเหมือนกันทุกครั้ง)
  โดยย่อจำนวนบิลลง 8 เท่าเพื่อให้ seed เร็ว → **ตัวเลขยอดขายจะไม่เท่ากับเดโมเป๊ะๆ**
  แต่สัดส่วนเมนู ช่วงเวลาพีค และโครงสร้างต้นทุนเหมือนกัน ส่วนออเดอร์ 18 บิลของวันนี้ตรงกับเดโมทุกใบ
