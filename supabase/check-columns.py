#!/usr/bin/env python3
"""เทียบชื่อคอลัมน์ที่ JS เรียกใช้ กับคอลัมน์ที่ view/ตารางให้ออกมาจริง

จับบั๊กประเภท "db-check ขึ้น ✕ เพราะ column ไม่มีอยู่" ได้ก่อนรันกับฐานข้อมูลจริง
รัน: /tmp/sqlv/bin/python supabase/check-columns.py
"""
import sys
import pglast

USED = {
    'v_menu_cost':            ['menu_id','name','emoji','category','price','cost','profit','margin_pct','store_id'],
    'v_stock_status':         ['id','name','unit','stock_qty','min_qty','status','need_tomorrow','shortfall','store_id'],
    'v_customer_stats':       ['name','orders_count','total_spend','days_since_last','segment','favorite_menu','store_id'],
    'v_daily_sales':          ['sale_date','revenue','orders_count','gross_profit','aov','store_id'],
    'v_hourly_sales':         ['hour','revenue','sale_date','store_id'],
    'v_channel_sales':        ['channel','orders_count','revenue','sale_date','store_id'],
    'v_menu_daily':           ['name','units','revenue','profit','sale_date','store_id'],
    'v_pnl_monthly':          ['month','revenue','food_cost','gross_profit','labor','rent','marketing',
                               'other_expenses','net_profit','net_margin_pct','store_id'],
    'v_campaign_performance': ['name','spend','revenue','status','store_id','roas','cac'],
}
# view ที่ใช้ table.* → ต้องเทียบกับตารางต้นทางด้วย
STAR_SOURCE = {'v_campaign_performance': 'campaigns'}


def view_columns(sql):
    out = {}
    for stmt in pglast.parse_sql(sql):
        node = stmt.stmt
        if node.__class__.__name__ != 'ViewStmt':
            continue
        cols = set()

        def walk(sel):
            if sel is None:
                return
            for t in (getattr(sel, 'targetList', None) or []):
                if t.name:
                    cols.add(t.name)
                    continue
                v = t.val
                if v.__class__.__name__ == 'ColumnRef':
                    f = v.fields[-1]
                    s = getattr(f, 'sval', None)
                    cols.add(s if s else '*')
            for part in ('larg', 'rarg'):
                walk(getattr(sel, part, None))

        walk(node.query)
        out[node.view.relname] = cols
    return out


def table_columns(sql, table):
    for stmt in pglast.parse_sql(sql):
        n = stmt.stmt
        if n.__class__.__name__ == 'CreateStmt' and n.relation.relname == table:
            return {e.colname for e in n.tableElts if getattr(e, 'colname', None)}
    return set()


schema = open('supabase/01_schema.sql').read()
views = view_columns(open('supabase/02_views.sql').read())

bad = 0
for v, wanted in USED.items():
    if v not in views:
        print(f'❌ ไม่พบ view {v}')
        bad += 1
        continue
    have = set(views[v])
    if '*' in have and v in STAR_SOURCE:
        have |= table_columns(schema, STAR_SOURCE[v])
        have.discard('*')
    miss = [c for c in wanted if c not in have]
    if miss:
        print(f'❌ {v:24s} ไม่มีคอลัมน์: {", ".join(miss)}')
        bad += len(miss)
    else:
        print(f'✅ {v:24s} ครบทั้ง {len(wanted)} คอลัมน์ที่ JS ใช้')

print()
print('ผลรวม:', 'ตรงกันหมด ✅' if bad == 0 else f'ไม่ตรง {bad} จุด ❌')
sys.exit(1 if bad else 0)
