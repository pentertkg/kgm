#!/usr/bin/env python3
"""ตรวจไฟล์ SQL ทั้งหมดด้วย parser จริงของ Postgres (libpg_query ผ่าน pglast)

  · parse_sql     — ตรวจ syntax ของทุก statement
  · parse_plpgsql — ตรวจ body ของทุก function / DO block ที่เป็น PL/pgSQL

หมายเหตุเรื่องบั๊กของ library: libpg_query เวอร์ชันนี้คืน JSON ที่เสียหาย
เมื่อ parse ฟังก์ชันที่ประกาศ `returns trigger` (ตัวแปรอัตโนมัติ NEW/OLD/TG_*
ถูก serialize ผิด) จึงต้องแกะ body ออกมาห่อเป็น `returns void` พร้อมประกาศ
new/old เป็น record เอง แล้วแปลง `return new;` → `return;` เพื่อให้ตรวจ
syntax ของ body ได้จริง — ไม่ใช่การข้ามการตรวจ

รัน: /tmp/sqlv/bin/python supabase/validate.py
"""
import re, sys, glob
import pglast

FUNC = re.compile(r"create or replace function[\s\S]*?\$(\w*)\$([\s\S]*?)\$\1\$\s*;", re.I)
DO   = re.compile(r"\bdo\s+\$(\w*)\$([\s\S]*?)\$\1\$\s*;", re.I)
DECL = "new record; old record; tg_op text;"


def probe_body(body: str) -> str:
    """ห่อ body ของ plpgsql ให้ parser ตรวจได้ โดยไม่แตะตรรกะของโค้ด"""
    b = re.sub(r"\breturn\s+(new|old|null)\s*;", "return;", body, flags=re.I)
    s = b.strip()
    if re.match(r"^declare\b", s, re.I):
        s = re.sub(r"^declare\b", "declare " + DECL, s, count=1, flags=re.I)
    else:
        s = "declare " + DECL + " " + s
    return f"create or replace function __probe() returns void language plpgsql as $z$ {s} $z$;"


fail = 0
for path in sorted(glob.glob("supabase/*.sql")):
    src, label = open(path).read(), path.split("/")[-1]
    try:
        stmts = pglast.parse_sql(src)
    except Exception as e:
        print(f"❌ {label} — SQL syntax: {str(e)[:220]}")
        fail += 1
        continue

    nf = nd = 0
    for m in FUNC.finditer(src):
        stmt = m.group(0)
        if "language plpgsql" not in stmt.lower():
            continue
        name = re.search(r"function\s+(\w+)", stmt, re.I).group(1)
        try:
            pglast.parse_plpgsql(probe_body(m.group(2)))
            nf += 1
        except Exception as e:
            print(f"❌ {label} — plpgsql ใน {name}(): {str(e)[:200]}")
            fail += 1

    for i, m in enumerate(DO.finditer(src)):
        try:
            pglast.parse_plpgsql(probe_body(m.group(2)))
            nd += 1
        except Exception as e:
            print(f"❌ {label} — plpgsql ใน DO block #{i+1}: {str(e)[:220]}")
            fail += 1

    print(f"✅ {label:18s} {len(stmts):3d} statements · function {nf} · DO block {nd}")

print()
print("ผลรวม:", "ผ่านทั้งหมด ✅" if fail == 0 else f"พบปัญหา {fail} จุด ❌")
sys.exit(1 if fail else 0)
