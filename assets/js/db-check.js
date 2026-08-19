/* หน้าตรวจการเชื่อมต่อฐานข้อมูล (dev tool) */
(function () {
  'use strict';
  const L = window.SFOS_LIVE, U = window.UI, C = window.SFOS_CONFIG;
  const $ = id => document.getElementById(id);
  const row = (name, ok, detail) =>
    `<div class="between" style="padding:9px 0;border-bottom:1px solid var(--line-2)">
       <span class="row g10"><span class="badge ${ok ? 'badge-good' : 'badge-bad'}">${ok ? '✓' : '✕'}</span>
         <b class="t-sm">${U.esc(name)}</b></span>
       <span class="t-sm ${ok ? 'muted' : ''}" style="${ok ? '' : 'color:var(--bad)'}">${U.esc(detail)}</span></div>`;

  $('cfgBox').innerHTML = L.enabled
    ? `<div class="row-t g12"><span class="badge badge-good" style="width:32px;height:32px;justify-content:center">✓</span>
        <div><b>ตั้งค่าแล้ว</b><div class="t-sm muted mt4">
        URL: <code>${U.esc(C.supabaseUrl)}</code><br>
        anon key: <code>${U.esc((C.supabaseAnonKey || '').slice(0, 12))}…</code> (${(C.supabaseAnonKey || '').length} ตัวอักษร)</div></div></div>`
    : `<div class="row-t g12"><span class="badge badge-warn" style="width:32px;height:32px;justify-content:center">!</span>
        <div><b>ยังไม่ได้ตั้งค่า — อยู่ในโหมดเดโม</b>
        <div class="t-sm muted mt4">เปิด <code>assets/js/config.js</code> แล้วใส่ <code>supabaseUrl</code> และ
        <code>supabaseAnonKey</code> จาก Supabase → Project Settings → API Keys<br>
        อย่าลืมเพิ่มโดเมนของ Supabase ใน <code>connect-src</code> ของ CSP ใน <code>vercel.json</code></div></div></div>`;

  const setAuth = () => {
    $('authState').textContent = L.isSignedIn() ? 'เข้าสู่ระบบแล้ว' : 'ยังไม่ได้เข้าสู่ระบบ';
    $('authState').className = 'badge ' + (L.isSignedIn() ? 'badge-good' : '');
  };
  setAuth();

  const guard = fn => async () => {
    if (!L.enabled) return U.toast('ยังไม่ได้ตั้งค่า Supabase ใน config.js', 'warn');
    try { await fn(); } catch (e) { U.toast(e.message, 'warn'); console.error(e); }
  };

  $('btnIn').onclick  = guard(async () => { await L.signIn($('email').value.trim(), $('pw').value); setAuth(); U.toast('เข้าสู่ระบบสำเร็จ', 'ok'); });
  $('btnUp').onclick  = guard(async () => { await L.signUp($('email').value.trim(), $('pw').value); setAuth();
                          U.toast('สมัครแล้ว — ถ้า Supabase เปิด confirm email ต้องยืนยันในอีเมลก่อน', 'ok'); });
  $('btnOut').onclick = () => { L.signOut(); setAuth(); U.toast('ออกจากระบบแล้ว', 'ok'); };

  $('btnRun').onclick = guard(async () => {
    $('results').innerHTML = '<div class="t-sm muted">กำลังทดสอบ…</div>';
    const tests = [
      ['store — stores + RLS',            () => L.store(),        d => d ? d.name : '—'],
      ['v_menu_cost — ต้นทุน/margin',      () => L.menus(),        d => `${d.length} เมนู · ตัวอย่าง margin ${d[0] ? d[0].margin_pct + '%' : '-'}`],
      ['v_stock_status — สต็อก+คาดการณ์',   () => L.ingredients(),  d => `${d.length} วัตถุดิบ · ต่ำ/หมด ${d.filter(x => x.status !== 'ok').length}`],
      ['v_daily_sales — ยอดขายรายวัน',      () => L.dailySales(30), d => `${d.length} วัน · ล่าสุด ฿${d.length ? d[d.length-1].revenue : 0}`],
      ['v_hourly_sales — รายชั่วโมง',       () => L.hourlySales(),  d => `${d.length} ช่วงเวลา`],
      ['v_menu_daily — เมนูขายดีวันนี้',     () => L.menuDaily(),    d => d.length ? `อันดับ 1: ${d[0].name} (${d[0].units} จาน)` : 'ยังไม่มียอดขายวันนี้'],
      ['v_customer_stats — CRM+segment',   () => L.customers(),    d => `${d.length} คน · VIP ${d.filter(x => x.segment === 'vip').length} · At risk ${d.filter(x => x.segment === 'risk').length}`],
      ['v_campaign_performance — ROAS',    () => L.campaigns(),     d => `${d.length} campaign · ROAS สูงสุด ${d.length ? Math.max(...d.map(x => +x.roas)) + 'x' : '-'}`],
      ['v_pnl_monthly — กำไรสุทธิ',         () => L.pnl(),          d => d.length ? `net ฿${d[0].net_profit} (${d[0].net_margin_pct}%)` : 'ยังไม่มีข้อมูล'],
      ['orders + order_lines (embed)',     () => L.orders(),        d => `${d.length} บิล · รายการรวม ${d.reduce((s, o) => s + (o.order_lines || []).length, 0)}`]
    ];
    const html = [];
    for (const [name, fn, fmt] of tests) {
      try { const d = await fn(); html.push(row(name, true, fmt(d))); }
      catch (e) { html.push(row(name, false, e.message)); }
      $('results').innerHTML = html.join('');
    }
  });

  $('btnWrite').onclick = guard(async () => {
    $('writeOut').innerHTML = '<div class="t-sm muted">กำลังสร้าง…</div>';
    const menus = await L.menus();
    if (!menus.length) throw new Error('ยังไม่มีเมนูในร้าน — รัน 04_seed.sql ก่อน');
    const o = await L.createOrder({ channel: 'walkin', note: 'บิลทดสอบจาก db-check', lines: [{ menuId: menus[0].menu_id, qty: 2 }] });
    const [full] = await L.select('orders', { select: '*,order_lines(qty,unit_price,unit_cost)', id: 'eq.' + o.id });
    const l = (full.order_lines || [])[0] || {};
    $('writeOut').innerHTML =
      row('สร้างออเดอร์', true, 'เลขบิล ' + full.code) +
      row('trigger snapshot ราคา', !!l.unit_price, 'unit_price = ฿' + l.unit_price) +
      row('trigger snapshot ต้นทุน', l.unit_cost !== undefined && l.unit_cost !== null, 'unit_cost = ฿' + l.unit_cost) +
      `<div class="row g8 mt12">
        <button class="btn btn-ghost btn-xs" id="btnDone">เลื่อนสถานะเป็น completed (ทดสอบตัดสต็อก)</button>
        <button class="btn btn-soft btn-xs" id="btnDel">ลบบิลทดสอบนี้</button></div>`;
    document.getElementById('btnDone').onclick = guard(async () => {
      const before = (await L.ingredients()).reduce((m, i) => (m[i.name] = i.stock_qty, m), {});
      await L.setOrderStatus(o.id, 'completed');
      const after = (await L.ingredients()).reduce((m, i) => (m[i.name] = i.stock_qty, m), {});
      const moved = Object.keys(before).filter(k => +before[k] !== +after[k]);
      $('writeOut').insertAdjacentHTML('beforeend',
        row('ตัดสต็อกอัตโนมัติเมื่อ completed', moved.length > 0,
            moved.length ? moved.map(k => `${k}: ${before[k]} → ${after[k]}`).join(' · ') : 'สต็อกไม่ขยับ — ตรวจ trigger orders_stock'));
    });
    document.getElementById('btnDel').onclick = guard(async () => {
      await L.remove('orders', { id: 'eq.' + o.id });
      U.toast('ลบบิลทดสอบแล้ว', 'ok');
      $('writeOut').innerHTML = '<div class="t-sm muted">ลบแล้ว</div>';
    });
  });
})();
