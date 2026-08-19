# Production Readiness — StreetFood OS

## สรุปสั้น

| คำถาม | คำตอบ |
|---|---|
| ขึ้น prod เป็น **เว็บ Demo / Sales site** ได้ไหม | **ได้ทันที** — deploy ได้เลย ค่าใช้จ่าย **฿0** |
| ขึ้น prod เป็น **SaaS ที่ร้านค้าใช้จริง** ได้ไหม | **ยังไม่ได้** — ต้องมี Backend + Auth + Database ก่อน (ดูหัวข้อสุดท้าย) |
| ต้องมี API Key ไหม | **ไม่ต้องเลย** — ไม่มี key/secret/token ในโปรเจกต์ |
| มีค่าใช้จ่ายรายเดือนไหม | **ไม่มี** — ไม่เรียกใช้บริการที่คิดเงินเลยแม้แต่ตัวเดียว |
| ต้อง build / npm install ไหม | **ไม่ต้อง** — static ล้วน อัปโหลดโฟลเดอร์แล้วใช้ได้ |
| Vercel แพ็ก Hobby พอไหม | **พอ** — static ไม่มี serverless function ไม่มี bandwidth cost ในทางปฏิบัติ |

## สิ่งที่ตัดออกไปแล้ว เพื่อให้ไม่พึ่งบริการภายนอก

| เดิม | ปัญหาบน prod | เปลี่ยนเป็น |
|---|---|---|
| Google Fonts CDN (`fonts.googleapis.com`, `fonts.gstatic.com`) | request ออกนอกเครื่อง · เว็บพังถ้า CDN ล่มหรือถูกบล็อก · ส่ง IP ผู้ใช้ให้ third-party (มีคำตัดสินว่าผิด GDPR ในยุโรป) · โหลดช้าในบางเครือข่าย | **Self-host ที่ `assets/fonts/`** — variable woff2 3 ไฟล์ รวม **108 KB** (Noto Sans Thai + Inter, สัญญาอนุญาต SIL OFL 1.1 แนบมาด้วย) |
| `<script>` เขียนติดใน HTML | ตั้ง CSP `script-src 'self'` ไม่ได้ ทำให้กัน XSS ได้ไม่สุด | แยกเป็น `assets/js/landing.js` และ `assets/js/onboarding.js` แล้ว → **CSP เข้มงวดผ่านแล้ว (ทดสอบจริง ไม่มี error)** |

ผลลัพธ์: ทั้งเว็บเรียกเฉพาะไฟล์ในโดเมนตัวเอง — **ใช้งานแบบ offline ได้ 100%** และไม่มี request ออกนอกเครื่องแม้แต่รายการเดียว

ตรวจสอบเองได้:
```bash
grep -rnoE "https?://" --include="*.html" --include="*.js" --include="*.css" . | grep -v "w3.org/2000/svg"
```
(ต้องไม่มีผลลัพธ์ — `w3.org` คือ XML namespace ของ SVG ไม่ใช่การเรียกเน็ต)

## Deploy — Vercel (แพ็ก Hobby ฟรี)

รันจากในโฟลเดอร์โปรเจกต์ ไม่ต้องผ่าน GitHub ก็ได้:

```bash
npx vercel login
```
```bash
npx vercel --prod
```

ครั้งแรก CLI จะถามไม่กี่ข้อ — ตอบตามนี้:

| คำถาม | ตอบ |
|---|---|
| Set up and deploy? | `Y` |
| Which scope? | บัญชีของคุณ |
| Link to existing project? | `N` |
| Project name? | `streetfood-os` (หรือกด Enter) |
| In which directory is your code located? | `./` |
| Want to modify these settings? | `N` — Vercel จะตรวจว่าเป็น static site เอง ไม่มี build command |

ครั้งต่อไปแก้โค้ดแล้ว deploy ซ้ำด้วย `npx vercel --prod` คำสั่งเดียว

**ตรวจหลัง deploy ว่า header ติดจริง:**
```bash
curl -sI https://<โดเมนที่ได้>.vercel.app | grep -iE "content-security-policy|x-frame-options|cache-control"
```

### ⚠️ Vercel ไม่อ่านไฟล์ `_headers`

`_headers` เป็นรูปแบบของ Cloudflare Pages / Netlify — Vercel ใช้ **`vercel.json`** แทน
ซึ่งเตรียมไว้ให้แล้วโดยตั้ง header ชุดเดียวกัน (CSP, X-Frame-Options, nosniff, Permissions-Policy)
บวก cache 1 ปีสำหรับฟอนต์ · ไฟล์ `_headers` ยังอยู่ในโปรเจกต์เพื่อให้ย้ายไป Cloudflare/Netlify ได้ทันที
และถูกใส่ใน `.vercelignore` ไม่ให้อัปโหลดไปเปล่าๆ

ไม่ต้องตั้ง rewrite rule ใดๆ เพราะระบบใช้ **hash routing** (`app.html#/orders`) ซึ่งเบราว์เซอร์จัดการเองทั้งหมด
และตั้ง `cleanUrls: false` ไว้ตั้งใจ เพื่อให้ลิงก์ภายในที่เขียนเป็น `onboarding.html` / `app.html` ทำงานตรงๆ ไม่มี redirect

### ทางเลือกอื่น (ฟรีเหมือนกัน)

**Cloudflare Pages** — bandwidth ไม่จำกัดในแพ็กฟรี · อ่าน `_headers` ให้อัตโนมัติ
```bash
npx wrangler pages deploy . --project-name streetfood-os
```

**GitHub Pages** — ฟรี แต่ตั้ง security header ไม่ได้ (ไม่อ่านทั้ง `_headers` และ `vercel.json`)
push ขึ้น repo แล้วเปิด Settings → Pages → Deploy from branch: `main` / `(root)`

## ไฟล์สำหรับ prod ที่เตรียมไว้ให้แล้ว

| ไฟล์ | หน้าที่ |
|---|---|
| `vercel.json` | CSP + security header + cache สำหรับ **Vercel** |
| `_headers` | เนื้อหาเดียวกัน สำหรับ **Cloudflare Pages / Netlify** (Vercel ไม่อ่านไฟล์นี้) |
| `.vercelignore` | ไม่อัปโหลด `.claude/`, `.git/`, `_headers` ขึ้น Vercel |
| `robots.txt` | เปิดให้ index หน้า Landing · กัน `app.html` ไม่ให้ถูก index |
| `sitemap.xml` | สำหรับ Search Console |
| meta ในทุกหน้า | `description`, `og:*`, `twitter:*`, `theme-color`, และ `noindex` บนหน้า app |

CSP ที่ใช้ (ทดสอบแล้วว่าไม่มี error):
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'none';
frame-ancestors 'none'; base-uri 'self'; form-action 'none'
```
> `style-src` ยังต้องมี `'unsafe-inline'` เพราะโค้ดใช้ `style="..."` กับกราฟและแถบสัดส่วนจำนวนมาก
> ซึ่งความเสี่ยงต่ำกว่า inline script มาก · `connect-src 'none'` การันตีว่าหน้าเว็บส่งข้อมูลออกไม่ได้เลย

## ก่อนกดขึ้นจริง (checklist)

- [ ] แก้โดเมนใน `sitemap.xml` และ `robots.txt` เป็นโดเมนจริง
- [ ] ถ้าจะแชร์ลิงก์ใน LINE/Facebook ให้เพิ่มรูป `og:image` ขนาด 1200×630 px (ตอนนี้ใส่ meta ไว้แต่ยังไม่มีไฟล์รูป จึงจะขึ้นเป็นการ์ดแบบไม่มีรูป)
- [ ] ใส่คำว่า “ตัวอย่าง/Prototype” ให้ชัดถ้าเผยแพร่สู่สาธารณะ เพราะตัวเลขทั้งหมดเป็นข้อมูลสมมติ (ราคาแพ็กเกจในหน้า Pricing และ Settings ก็เป็นตัวอย่าง)
- [ ] วันที่ในระบบตรึงไว้ที่ 19 ส.ค. 2569 เพื่อให้ตัวเลขทุกหน้าตรงกัน — แก้ได้ที่ `assets/js/ui.js` บรรทัด `const TODAY = new Date(2026, 7, 19)` (ถ้าเปลี่ยนเป็น `new Date()` ป้ายวันที่จะขยับตามจริง แต่ตัวเลข MTD 19 วันจะไม่สอดคล้องกับวันจริง)

## สิ่งที่ “ยังใช้จริงไม่ได้” เพราะไม่มี Backend

ตารางนี้คือความจริงที่ต้องรู้ก่อนเอาไปให้ร้านค้าใช้:

| เรื่อง | สถานะปัจจุบัน | ถ้าจะใช้จริงต้องมี | ค่าใช้จ่ายที่จะเกิด |
|---|---|---|---|
| **ข้อมูลไม่ถูกบันทึก** | ออเดอร์/เมนูที่แก้ หายเมื่อรีเฟรช (เก็บใน memory) · Onboarding เก็บใน `localStorage` เท่านั้น | Database (Postgres/Firestore) | Supabase / Neon แพ็กฟรีพอสำหรับเริ่มต้น (~฿0–800/เดือนเมื่อโต) |
| **ไม่มีระบบ Login** | ใครเปิดลิงก์ก็เห็นข้อมูลทั้งหมด | Auth (email/OTP/LINE Login) | Supabase Auth ฟรี · LINE Login ฟรี |
| **AI ยังไม่ใช่ AI จริง** | เป็นกฎ if/else จับคำในภาษาไทย (ฟังก์ชัน `answer()` ใน `app.js`) — **ข้อดี: ไม่ต้องมี API key ไม่มีค่าใช้จ่าย ตอบเร็ว ตัวเลขไม่มีทางหลอน** | ถ้าอยากให้ตอบคำถามอิสระได้ ต้องต่อ LLM API | Claude API ~฿0.3–3 ต่อคำถาม · **ทางเลือกฟรี: คงระบบกฎเดิมไว้และเพิ่มคำถามที่รองรับ** ซึ่งเพียงพอสำหรับคำถามซ้ำๆ 20–30 แบบที่เจ้าของร้านถามจริง |
| **ออเดอร์ไม่ขึ้นสดข้ามเครื่อง** | หน้าครัวกับหน้าแคชเชียร์ไม่ซิงก์กัน (คนละแท็บคือคนละ state) | Realtime (WebSocket / Supabase Realtime) | รวมอยู่ในแพ็กฟรีของ Supabase |
| **ไม่ดึงออเดอร์จากแอปส่งอาหาร** | สถานะ “เชื่อมต่อแล้ว” ในหน้า Integrations เป็นข้อมูลสมมติ | Partner API ของ LINE MAN / Grab | ต้องสมัครเป็น merchant partner · มีค่า GP ตามสัญญาแต่ละราย |
| **ไม่พิมพ์ใบเสร็จ / ไม่รับเงิน** | กดแล้วขึ้นแค่ข้อความแจ้งเตือน | Web Bluetooth/USB สำหรับเครื่องพิมพ์ · Payment Gateway | เครื่องพิมพ์ ~฿1,500–4,000 ครั้งเดียว · GB Prime/Omise คิด 2.65–3.65% ต่อรายการ |
| **ไม่มี Export ไฟล์** | ปุ่ม Export ยังไม่ทำงาน | ทำ CSV ฝั่ง client ได้เลย | **฿0** — สร้าง Blob แล้วดาวน์โหลดได้โดยไม่ต้องมี server |
| **รูปเมนูอัปโหลดไม่ได้** | เป็น emoji ทั้งหมด | Object storage | Cloudflare R2 / Supabase Storage แพ็กฟรี ~1–10 GB |

### ลำดับที่แนะนำถ้าจะทำต่อให้ใช้จริง

1. **Supabase** (Postgres + Auth + Realtime + Storage) — แพ็กฟรีครอบคลุมเกือบทุกข้อในตารางข้างบน และไม่ต้องเขียน backend เอง
2. ย้าย `assets/js/data.js` จาก object คงที่ → เรียกจากตาราง Supabase (โครงสร้างข้อมูลถูกออกแบบให้ map เป็นตารางได้ตรงๆ อยู่แล้ว: `store`, `menu`, `ingredients`, `orders`, `customers`, `campaigns`)
3. เพิ่ม Export CSV (ทำได้ฟรีทันที ไม่ต้องรอ backend)
4. คง AI แบบกฎไว้ก่อน แล้วค่อยพิจารณาต่อ LLM API เมื่อมีผู้ใช้จริงและรู้ว่าเจ้าของร้านถามอะไรบ่อย
