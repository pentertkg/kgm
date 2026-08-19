# StreetFood OS — UI Prototype

> “ผู้ช่วยบริหารร้านอาหารที่ช่วยคิด ตั้งร้าน ขาย วิเคราะห์ และทำให้ร้านโต”

Frontend Prototype ของ SaaS สำหรับเจ้าของร้าน Street Food ครอบคลุมตั้งแต่ “กำลังจะเปิดร้าน”
ไปจนถึง “บริหารร้าน–รับออเดอร์–วิเคราะห์กำไร–ทำการตลาด”

## วิธีเปิดใช้งาน

เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ได้ทันที (ไม่ต้อง build ไม่ต้องติดตั้งอะไร)

หรือถ้าต้องการรันผ่าน local server:

```bash
python3 -m http.server 8731
```

แล้วเปิด http://localhost:8731

## Demo Flow (เดินได้ครบใน Prototype เดียว)

```
index.html                → Landing Page + Product Preview
  └─ "เริ่มสร้างร้าน"
onboarding.html           → Wizard 4 ขั้น (ข้อมูลร้าน → เป้าหมาย → เมนู → พร้อมเปิดร้าน)
  └─ "เข้าสู่ Dashboard"
app.html#/dashboard       → Dashboard (KPI + กราฟ + AI แนะนำวันนี้ + Quick Actions)
  ├─ #/orders             → Order Management (New → Preparing → Ready → Completed)
  ├─ #/kitchen            → Kitchen Display 3 คอลัมน์ + ตัวจับเวลา
  ├─ #/menu               → Menu & Cost + Cost Calculator + AI Margin Warning
  ├─ #/stock              → Inventory + AI Forecast วัตถุดิบพรุ่งนี้ + ใบสั่งซื้อ
  ├─ #/customers          → CRM + Segment + ลูกค้าที่หายไป
  ├─ #/marketing          → ROAS / CAC ต่อ Campaign + ย้ายงบตามคำแนะนำ AI
  ├─ #/promotion          → Promotion Builder (Wizard 5 ขั้น + Preview + ผลที่คาดว่าจะได้)
  ├─ #/analytics          → Sales / Product / Customer / Marketing / Profit (P&L Waterfall)
  ├─ #/advisor            → AI Advisor (แผนงานวันนี้ + Insight แยกตามโมดูล)
  └─ #/settings           → Store / Users / Staff / Roles / Payment / Notification / Integrations / Subscription
```

Global AI Assistant อยู่ที่ปุ่มลอยมุมขวาล่างของทุกหน้า (กด `⌘K` / `Ctrl+K` เพื่อค้นหาทั่วระบบ)

## โครงสร้างไฟล์

```
kgm/                        ← repo root = site root (deploy ได้เลยไม่ต้องตั้งค่า)
├── index.html              Landing Page
├── onboarding.html         Create Store Wizard
├── app.html                App shell (โหลด script ทั้งหมด)
├── _headers · robots.txt · sitemap.xml   ไฟล์สำหรับ production (ดู DEPLOY.md)
└── assets/
    ├── css/styles.css      Design system + responsive (Desktop / Tablet / Mobile) + @font-face
    ├── fonts/              ฟอนต์ self-host (Noto Sans Thai + Inter, SIL OFL 1.1) รวม 108 KB
    └── js/
        ├── data.js         ★ Mock Data ชุดกลาง — ทุกหน้าดึงจากไฟล์นี้
        ├── ui.js           Formatter + Chart engine (SVG ล้วน) + Modal/Toast
        ├── app.js          Sidebar / Router / Global AI Assistant / Order actions
        ├── landing.js      JS ของหน้า Landing (แยกออกจาก HTML เพื่อรองรับ CSP)
        ├── onboarding.js   JS ของ Wizard สร้างร้าน
        ├── pages-core.js   Dashboard · Orders · Kitchen · Menu & Cost      (P0)
        ├── pages-growth.js Stock · Customers · Marketing · Promotion       (P1)
        └── pages-insight.js Analytics · AI Advisor · Settings              (P1/P2)
```

## Mock Data ผูกกันทั้งระบบ

ทุกตัวเลขคำนวณต่อกันจาก `assets/js/data.js` ไฟล์เดียว ไม่มีเลขลอย:

| แหล่งข้อมูล | ตัวเลขที่ถูกคำนวณต่อ |
|---|---|
| `menu[].recipe` (วัตถุดิบต่อจาน) | `cost` → `profit` → `margin` ของทุกเมนู |
| `todayUnits` (จำนวนที่ขายได้ต่อเมนู) | ยอดขายวันนี้ **฿18,520** · กำไร **฿6,823** · Top 5 เมนู |
| `todayUnits` + `orders` | Average Order **฿65** (284 บิล) |
| `trend7` | กราฟ 7 วัน · % เทียบเมื่อวาน (+12.0% / −4.0%) |
| `orders[].items` | ยอดต่อบิล · Kitchen Display · ช่องทางขาย |
| `ingredients[].use` vs `.stock` | สถานะ Low/Out · AI Forecast (หมูสับต้องใช้ 7.8 kg มี 3.2 kg) |
| `campaigns[]` | ROAS **4.04x** · CAC **฿65** · คำแนะนำย้ายงบ |
| `month` | P&L Waterfall → Net Profit **฿36,540** (12.08%) |

ตัวอย่างความเชื่อมโยงข้ามหน้า: **กุ้ง/ปลาหมึกหมดสต็อก (Stock)** → **กะเพราทะเลขายได้ 0 จาน (Menu/Analytics)**
→ **ออเดอร์ #1268 ถูกยกเลิกเพราะกุ้งหมด (Orders)** → **AI แนะนำหยุดขายเมนูนี้ (AI Advisor)**

## UX Principle: Data → Insight → Recommendation → Action

ทุกหน้าไม่ได้แสดงแค่ข้อมูล แต่ปิดท้ายด้วย “แล้วควรทำอะไรต่อ” เสมอ พร้อมปุ่มที่พาไปทำได้จริง เช่น

```
ยอดขาย +12% แต่กำไร −4%   (Data)
        ↓
ต้นทุนหมูขึ้น 8% ทำให้ margin เมนูขายดีสุดเหลือ 29%   (Insight)
        ↓
ปรับราคา 65 → 69 บาท (+฿11,160/เดือน) หรือทำ Bundle (+฿2,272/วัน)   (Recommendation)
        ↓
[ทำเลย →] พาไปหน้า Menu & Cost / Promotion Builder   (Action)
```

## Responsive

| อุปกรณ์ | พฤติกรรม |
|---|---|
| Desktop (≥1025px) | Sidebar ถาวร · Grid 4–5 คอลัมน์ |
| Tablet (641–1024px) | Sidebar เป็น Drawer + Bottom Navigation · Kitchen ยังเป็น 3 คอลัมน์ · Orders 2 คอลัมน์ |
| Mobile (≤640px) | Bottom Navigation · การ์ดคอลัมน์เดียว · ตารางเลื่อนแนวนอนได้ |

## ข้อจำกัดของ Prototype (ตามที่กำหนด)

- **ไม่มีการเชื่อมต่อ Backend, Database, API, MCP หรือ External Service ใดๆ** — ทั้งเว็บเรียกเฉพาะไฟล์ในโดเมนตัวเอง (ฟอนต์ self-host ด้วย) จึงใช้งานแบบ offline ได้
- ไม่มี API key / secret / token ใดๆ และไม่มีค่าใช้จ่ายรายเดือน — ดูรายละเอียดที่ [DEPLOY.md](DEPLOY.md)
- ข้อมูลทั้งหมดเป็น Local Mock Data · ปุ่มที่ยังไม่ทำงานจริงและจะขึ้นข้อความแจ้ง: อัปโหลดรูปเมนู, พิมพ์ใบเสร็จ, ชำระเงิน, นับสต็อก
- **ทำงานได้จริง:** Export CSV (Analytics ทั้ง 5 แท็บ + รายชื่อลูกค้า — มี UTF-8 BOM ให้ Excel อ่านภาษาไทยได้), เลื่อนสถานะออเดอร์, สร้าง/แก้เมนูพร้อมคำนวณต้นทุน, สร้างออเดอร์ใหม่, ปรับ/ย้ายงบ Campaign, สร้าง Promotion, ค้นหาทั่วระบบ, ถาม AI (ระบบกฎ ไม่ต้องต่อ LLM)
- ข้อมูลจาก Onboarding เก็บใน `localStorage` เท่านั้น (ชื่อร้าน, เป้ายอดขาย, เมนูที่เพิ่มเอง) — ล้างได้ด้วย `localStorage.clear()`
- วันที่อ้างอิงถูกตรึงไว้ที่ 19 ส.ค. 2569 เพื่อให้ตัวเลขทุกหน้าตรงกันตลอด
- ตัวเลขค่าบริการ/แพ็กเกจในหน้า Landing และ Settings เป็นข้อมูลตัวอย่างสำหรับ Prototype เท่านั้น

## การนำขึ้น Production

ดู **[DEPLOY.md](DEPLOY.md)** — สรุปว่าอะไรขึ้น prod ได้ทันที อะไรยังใช้จริงไม่ได้เพราะไม่มี Backend พร้อมคำสั่ง deploy (ฟรี) และ security header ที่เตรียมไว้ให้
