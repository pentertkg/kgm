/* ============================================================
   PAGES (P0) — Dashboard · Orders · Kitchen · Menu & Cost
   ============================================================ */
window.PAGES = window.PAGES || {};
(function () {
  'use strict';
  const D = window.DB, U = window.UI, A = window.APP;
  const st = () => A.state;

  /* ============================================================
     DASHBOARD
     ============================================================ */
  window.PAGES.dashboard = function (el, actions) {
    const t = D.today, c = D.cmpYesterday, m = D.month;
    const trend = D.trend7.map((r, i) => ({ label: U.dayLabel(r.d), revenue: r.revenue, profit: r.profit, orders: r.orders, hi: i === 6 }));
    const top = D.topMenuToday();
    const alerts = D.ingredients.filter(i => D.stockStatus(i) !== 'ok');

    actions.innerHTML = `
      <span class="badge badge-lg"><span class="dot dot-live"></span> เปิดร้าน · ${D.store.open}–${D.store.close}</span>
      <button class="btn btn-ghost btn-sm" id="dRep">📄 ดูรายงาน</button>
      <button class="btn btn-primary btn-sm" id="dNew">+ รับออเดอร์</button>`;
    actions.querySelector('#dNew').onclick = A.newOrderModal;
    actions.querySelector('#dRep').onclick = () => A.go('analytics');

    el.innerHTML = `
    <!-- greeting -->
    <div class="card card-p mb16" style="background:linear-gradient(120deg,#fff,var(--brand-soft) 130%)">
      <div class="between wrap g16">
        <div class="row g14">
          <div class="logo" style="width:48px;height:48px;font-size:24px">${D.store.emoji}</div>
          <div>
            <h3>สวัสดี ${U.esc(D.store.name)} 👋</h3>
            <div class="t-sm muted">${U.fullToday()} · ${U.esc(D.store.location)}</div>
          </div>
        </div>
        <div class="row g20 wrap">
          <div>
            <div class="t-xs muted b6">เป้าเดือน ${U.monthLabel()}</div>
            <div class="row g10 mt4">
              ${U.ring(m.goalProgress, { size:44, thick:6, color:'var(--brand)' })}
              <div><div class="num b8" style="font-size:17px">${U.baht(m.revenue)}</div>
                <div class="t-xs muted">จากเป้า ${U.baht(D.store.goalMonth)}</div></div>
            </div>
          </div>
          <div style="border-left:1px solid var(--line);padding-left:20px">
            <div class="t-xs muted b6">เป้าวันนี้</div>
            <div class="num b8 mt4" style="font-size:17px">${U.baht(m.dailyTarget)}</div>
            <div class="t-xs"><span class="badge badge-good">ทำได้ ${U.pc(t.revenue / m.dailyTarget * 100)}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI -->
    <div class="grid g-4 mb16">
      ${U.kpi({ label:'ยอดขายวันนี้', icon:'💵', iconBg:'var(--brand-soft)', value:U.baht(t.revenue),
        spark:D.trend7.map(r=>r.revenue), sparkColor:'var(--c1)',
        foot:U.delta(c.revenue) + ' <span class="t-xs muted">เทียบเมื่อวาน ' + U.baht(D.trend7[5].revenue) + '</span>' })}
      ${U.kpi({ label:'Orders', icon:'🧾', iconBg:'var(--info-soft)', value:U.nf(t.orders),
        spark:D.trend7.map(r=>r.orders), sparkColor:'var(--c2)',
        foot:U.delta(c.orders) + ' <span class="t-xs muted">' + U.nf(t.orders/12,1) + ' บิล/ชม.</span>' })}
      ${U.kpi({ label:'Average Order', icon:'🧮', iconBg:'var(--ai-soft)', value:U.baht(t.aov,0),
        spark:D.trend7.map(r=>r.revenue/r.orders), sparkColor:'var(--c4)',
        foot:U.delta(c.aov) + ' <span class="t-xs muted">เป้า ฿73 (Bundle)</span>' })}
      ${U.kpi({ label:'กำไรโดยประมาณ', icon:'📈', iconBg:'var(--good-soft)', value:U.baht(t.profit),
        spark:D.trend7.map(r=>r.profit), sparkColor:'var(--c3)',
        foot:U.delta(c.profit) + ' <span class="t-xs muted">margin ' + U.pc(t.profit/t.revenue*100) + '</span>' })}
    </div>

    <!-- AI INSIGHT -->
    <div class="ai-card mb16">
      <div class="in">
        <div class="between wrap g12">
          <div class="row g10"><span class="ai-badge">🤖 AI แนะนำวันนี้</span>
            <span class="badge">อัปเดต 5 นาทีที่แล้ว</span></div>
          <button class="btn btn-ghost btn-sm" id="aiMore">ดูรายละเอียด →</button>
        </div>
        <h3 class="mt16" style="max-width:820px;line-height:1.45">${U.esc(D.ai.headline)}</h3>
        <p class="muted t-md mt8" style="max-width:820px">${U.esc(D.ai.detail)}</p>
        <div class="insight-chain mt16">
          <span class="step">📊 ยอดขาย +12%</span><span class="arw">→</span>
          <span class="step">🔍 ต้นทุนหมู +8%</span><span class="arw">→</span>
          <span class="step">📉 กำไร −4%</span><span class="arw">→</span>
          <span class="step" style="background:var(--ai-soft);border-color:var(--ai-line);color:#4c33cf">🤖 3 คำแนะนำ</span>
        </div>
        <div class="grid g-3 mt16">
          ${D.ai.recs.map((r,i)=>`
            <div class="rec" style="flex-direction:column;align-items:stretch;background:var(--surface)">
              <div class="row g10"><span class="rn">${i+1}</span><b class="t-sm">${U.esc(r.t)}</b></div>
              <div class="t-sm muted" style="margin-top:8px">${U.esc(r.d)}</div>
              <div class="between mt12">
                <span class="badge badge-good">${U.esc(r.impact)}</span>
                <button class="btn btn-ai btn-xs" data-act="${r.act}">ทำเลย →</button></div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- CHART + TOP MENU -->
    <div class="grid g-3-2 mb16">
      <div class="card">
        <div class="card-h">
          <div><h4>ยอดขาย 7 วันย้อนหลัง</h4>
            <div class="t-sm muted mt4">แท่ง = Revenue · เส้น = กำไร · เส้นประ = เป้ารายวัน</div></div>
          <div class="legend">
            <span class="lk"><i class="sw" style="background:var(--c1)"></i>Revenue</span>
            <span class="lk"><i class="sw" style="background:var(--c3)"></i>Profit</span>
            <span class="lk"><i class="sw" style="background:var(--c2)"></i>Orders</span>
          </div>
        </div>
        <div class="card-b">
          ${U.comboChart(trend, { target: m.dailyTarget, lines:['profit'] })}
          <div class="grid g-3 mt16">
            ${[['ยอดขายรวม 7 วัน', U.baht(D.trend7.reduce((s,r)=>s+r.revenue,0))],
               ['ออเดอร์รวม', U.nf(D.trend7.reduce((s,r)=>s+r.orders,0)) + ' บิล'],
               ['กำไรรวม', U.baht(D.trend7.reduce((s,r)=>s+r.profit,0))]]
              .map(([l,v])=>`<div class="tile"><div class="t-xs muted b6">${l}</div>
                <div class="num b8 mt4" style="font-size:17px">${v}</div></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h4>Top 5 เมนูวันนี้</h4>
          <button class="btn btn-ghost btn-xs" id="allMenu">ดูทั้งหมด</button></div>
        <div class="scroll-x">
          <table class="tbl">
            <thead><tr><th>Menu</th><th class="r">Orders</th><th class="r">Revenue</th><th class="r">Profit</th></tr></thead>
            <tbody>${top.slice(0,5).map((l,i)=>`
              <tr><td><div class="row g10">
                    <span class="num b8 muted-2" style="width:14px">${i+1}</span>
                    <span style="font-size:17px">${l.emoji}</span>
                    <span><b class="t-sm">${U.esc(l.name)}</b><br>
                      <span class="t-xs muted">margin ${U.pc(l.margin)}</span></span></div></td>
                <td class="r num b7">${U.nf(l.units)}</td>
                <td class="r num b7">${U.baht(l.revenue)}</td>
                <td class="r num b7" style="color:var(--good)">${U.baht(l.profit)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-f">
          <div class="ai-strip" style="padding:10px 12px">
            <div class="ic" style="width:24px;height:24px;font-size:12px;border-radius:7px">🤖</div>
            <div class="t-sm">เมนูอันดับ 1 ทำรายได้สูงสุดแต่ margin ต่ำสุด (${U.pc(top[0].margin)})
              — ขึ้นราคา 4 บาทจะได้กำไรเพิ่ม ${U.baht(top[0].units*4)}/วัน</div>
          </div>
        </div>
      </div>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="card card-p mb16">
      <div class="between mb16"><h4>Quick Actions</h4>
        <span class="t-sm muted">ทางลัดสำหรับงานที่ทำบ่อยที่สุด</span></div>
      <div class="grid g-5" id="qa"></div>
    </div>

    <!-- lower grid -->
    <div class="grid g-3">
      <div class="card">
        <div class="card-h"><h4>ยอดขายรายชั่วโมง</h4><span class="badge badge-brand">พีค 12:00</span></div>
        <div class="card-b">${U.hBars(D.hourly.map(h=>({label:h.h+':00',v:h.r,color:h.r>3000?'var(--brand)':undefined})),{fmt:U.baht})}</div>
      </div>
      <div class="card">
        <div class="card-h"><h4>สัดส่วนช่องทางขาย</h4></div>
        <div class="card-b row g20 wrap" style="justify-content:center">
          ${U.donut(D.channelMix.map(c=>({label:c.label,v:c.revenue,color:c.color})),
            { center:U.nf(D.today.orders), sub:'ออเดอร์วันนี้' })}
          <div class="col g12 grow" style="min-width:150px">
            ${D.channelMix.map(c=>`<div>
              <div class="between t-sm"><span class="row g8"><i class="sw" style="width:10px;height:10px;border-radius:3px;background:${c.color};display:block"></i>
                <b>${c.label}</b></span><span class="num b7">${U.baht(c.revenue)}</span></div>
              <div class="t-xs muted">${c.orders} ออเดอร์ · ${U.pc(c.revenue/D.today.revenue*100)}</div></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h4>ต้องรีบจัดการ</h4><span class="badge badge-bad">${alerts.length} รายการ</span></div>
        <div class="card-b col g10">
          ${alerts.slice(0,4).map(i=>{ const s = D.stockStatus(i); return `
            <div class="between">
              <div class="row g10"><span class="dot ${s==='out'?'dot-bad':'dot-warn'}"></span>
                <div><b class="t-sm">${U.esc(i.name)}</b><br>
                  <span class="t-xs muted">เหลือ ${U.nf(i.stock,1)} ${i.unit} · ขั้นต่ำ ${U.nf(i.min,1)}</span></div></div>
              <span class="badge ${s==='out'?'badge-bad':'badge-warn'}">${s==='out'?'หมด':'ต่ำ'}</span></div>`; }).join('')}
          <button class="btn btn-soft btn-block btn-sm mt8" id="toStock">ไปที่ Stock →</button>
        </div>
      </div>
    </div>`;

    /* quick actions */
    const QA = [
      { ic:'🧾', t:'รับออเดอร์',      d:'สร้างบิลใหม่',        fn:A.newOrderModal },
      { ic:'🍽️', t:'เพิ่มเมนู',        d:'ตั้งราคาจากต้นทุน',   fn:()=>A.go('menu?new=1') },
      { ic:'💸', t:'เพิ่มค่าใช้จ่าย',   d:'บันทึกรายจ่ายวันนี้', fn:expenseModal },
      { ic:'🎁', t:'สร้าง Promotion',  d:'ตอบ 5 คำถาม',       fn:()=>A.go('promotion') },
      { ic:'📄', t:'ดูรายงาน',         d:'ยอดขาย/กำไร',        fn:()=>A.go('analytics') }
    ];
    const qa = el.querySelector('#qa');
    qa.innerHTML = QA.map((q,i)=>`<button class="choice choice-c" data-qa="${i}">
      <span class="ci">${q.ic}</span><span><b class="t-sm">${q.t}</b><br>
      <span class="t-xs muted">${q.d}</span></span></button>`).join('');
    qa.querySelectorAll('[data-qa]').forEach(b => b.onclick = () => QA[+b.dataset.qa].fn());

    el.querySelector('#aiMore').onclick = () => A.go('advisor');
    el.querySelector('#allMenu').onclick = () => A.go('menu');
    el.querySelector('#toStock').onclick = () => A.go('stock');
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const map = { menu:'menu', promo:'promotion', marketing:'marketing', stock:'stock' };
      A.go(map[b.dataset.act] || 'advisor');
    });
  };

  function expenseModal(){
    U.modal({ title:'เพิ่มค่าใช้จ่าย', icon:'💸', okText:'บันทึกรายจ่าย',
      body:`<div class="grid g-2" style="gap:14px">
        <div class="field"><label class="label">ประเภท</label>
          <select class="select">${['วัตถุดิบ','ค่าแรง/พนักงาน','ค่าเช่าที่','ค่าแก๊ส/ไฟ/น้ำ','ค่าโฆษณา','บรรจุภัณฑ์','อื่นๆ'].map(x=>`<option>${x}</option>`).join('')}</select></div>
        <div class="field"><label class="label">จำนวนเงิน</label>
          <div class="input-prefix"><span>฿</span><input class="input num" type="number" placeholder="0"></div></div>
        <div class="field" style="grid-column:1/-1"><label class="label">รายละเอียด</label>
          <input class="input" placeholder="เช่น ซื้อหมูสับ 5 กก. จากตลาดคลองเตย"></div>
        <div class="field" style="grid-column:1/-1"><label class="label">วันที่</label>
          <input class="input" type="date" value="2026-08-19"></div>
      </div>
      <div class="ai-strip mt16"><div class="ic">🤖</div>
        <div class="t-sm">ค่าใช้จ่ายจะถูกนำไปคำนวณกำไรสุทธิในหน้า Analytics → Profit อัตโนมัติ</div></div>`,
      onOk(){ U.toast('บันทึกรายจ่ายแล้ว (Prototype: ไม่แก้ตัวเลข Mock กลาง)','ok'); } });
  }

  /* ============================================================
     ORDERS
     ============================================================ */
  window.PAGES.orders = function (el, actions, q) {
    let tab = q.tab || 'all';
    actions.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="oKds">👨‍🍳 เปิด Kitchen Display</button>
      <button class="btn btn-primary btn-sm" id="oNew">+ รับออเดอร์</button>`;
    actions.querySelector('#oNew').onclick = A.newOrderModal;
    actions.querySelector('#oKds').onclick = () => A.go('kitchen');

    el.innerHTML = `
      <div class="grid g-4 mb16" id="oKpi"></div>
      <div class="between mb16 wrap g12">
        <div class="tabs" id="oTabs"></div>
        <div class="row g8">
          <select class="select input-sm" id="oCh" style="width:auto">
            <option value="all">ทุกช่องทาง</option>
            <option value="walkin">หน้าร้าน</option>
            <option value="delivery">Delivery</option>
            <option value="online">Online</option></select>
        </div>
      </div>
      <div id="oList"></div>`;

    const TABS = [['all','ทั้งหมด'],['new','New'],['preparing','Preparing'],['ready','Ready'],['completed','Completed'],['cancelled','Cancelled']];
    const paint = () => {
      const ch = el.querySelector('#oCh').value;
      const all = st().orders;
      const cnt = k => all.filter(o => k === 'all' ? true : o.st === k).length;

      el.querySelector('#oTabs').innerHTML = TABS.map(([k,l])=>`
        <button data-tab="${k}" class="${tab===k?'on':''}">${l}<span class="n num">${cnt(k)}</span></button>`).join('');
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; paint(); });

      const live = all.filter(o => o.st === 'new' || o.st === 'preparing' || o.st === 'ready');
      el.querySelector('#oKpi').innerHTML = `
        ${U.kpi({ label:'ออเดอร์วันนี้', icon:'🧾', value:U.nf(D.today.orders), foot:U.delta(D.cmpYesterday.orders) })}
        ${U.kpi({ label:'กำลังดำเนินการ', icon:'⏳', iconBg:'var(--warn-soft)', value:U.nf(live.length),
          foot:`<span class="t-xs muted">ใหม่ ${all.filter(o=>o.st==='new').length} · ทำอยู่ ${all.filter(o=>o.st==='preparing').length} · พร้อม ${all.filter(o=>o.st==='ready').length}</span>` })}
        ${U.kpi({ label:'ยอดขายวันนี้', icon:'💵', value:U.baht(D.today.revenue), foot:U.delta(D.cmpYesterday.revenue) })}
        ${U.kpi({ label:'Average Order', icon:'🧮', value:U.baht(D.today.aov,0),
          foot:`<span class="t-xs muted">บิลสูงสุดวันนี้ ${U.baht(Math.max(...all.map(o=>o.total)))}</span>` })}`;

      let rows = all.filter(o => (tab === 'all' || o.st === tab) && (ch === 'all' || o.ch === ch));
      const list = el.querySelector('#oList');
      if (!rows.length) { list.innerHTML = `<div class="card">${U.empty('🧾','ยังไม่มีออเดอร์ในสถานะนี้','เมื่อมีลูกค้าสั่ง ออเดอร์จะขึ้นที่นี่ทันที',
        `<button class="btn btn-primary" id="eNew">+ รับออเดอร์</button>`)}</div>`;
        const b = list.querySelector('#eNew'); if (b) b.onclick = A.newOrderModal; return; }

      list.innerHTML = `<div class="grid g-3">${rows.map(o=>{
        const ch2 = D.CH[o.ch], s = D.ST[o.st];
        return `<div class="ord">
          <div class="between">
            <div class="row g10"><span class="ord-id">${o.id}</span>
              <span class="badge ${ch2.cls}">${ch2.icon} ${ch2.label}</span></div>
            <span class="badge ${s.cls}">${s.label}</span>
          </div>
          <div class="between t-xs muted">
            <span>🕐 ${o.t} · ${U.esc(o.cust)}</span><span>${o.qty} รายการ</span></div>
          <div class="ord-items">
            ${o.lines.map(l=>`<div class="ord-item"><span class="q">${l.qty}</span>
              <span class="grow">${l.menu.emoji} ${U.esc(l.menu.name)}</span>
              <span class="num b6">${U.baht(l.sum)}</span></div>`).join('')}
          </div>
          ${o.note ? `<div class="ord-note">📝 ${U.esc(o.note)}</div>` : ''}
          <div class="between">
            <div><div class="t-xs muted">ยอดรวม</div>
              <div class="num b8" style="font-size:19px">${U.baht(o.total)}</div>
              <div class="t-xs" style="color:var(--good)">กำไร ${U.baht(o.profit)}</div></div>
            <div class="row g6">
              ${o.st==='new'||o.st==='preparing' ? `<button class="btn btn-ghost btn-sm" data-cancel="${o.id}">ยกเลิก</button>`:''}
              ${s.next ? `<button class="btn ${o.st==='ready'?'btn-good':'btn-primary'} btn-sm" data-next="${o.id}">${s.nextLabel} →</button>`
                       : `<button class="btn btn-soft btn-sm" data-print="${o.id}">🧾 ใบเสร็จ</button>`}
            </div>
          </div>
        </div>`; }).join('')}</div>`;

      list.querySelectorAll('[data-next]').forEach(b => b.onclick = () => A.advance(b.dataset.next));
      list.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => A.cancelOrder(b.dataset.cancel));
      list.querySelectorAll('[data-print]').forEach(b => b.onclick = () => receipt(b.dataset.print));
    };
    el.querySelector('#oCh').onchange = paint;
    paint();
  };

  function receipt(id){
    const o = st().orders.find(x => x.id === id); if (!o) return;
    U.modal({ title:'ใบเสร็จ ' + o.id, icon:'🧾', foot:false,
      body:`<div class="ctr mb16"><div class="logo" style="width:44px;height:44px;font-size:22px;margin:0 auto">${D.store.emoji}</div>
        <h4 class="mt8">${U.esc(D.store.name)}</h4>
        <div class="t-xs muted">${U.esc(D.store.location)}<br>${U.fullToday()} · ${o.t}</div></div>
        <div class="col g8" style="border-block:1px dashed var(--line);padding:14px 0">
        ${o.lines.map(l=>`<div class="between t-sm"><span>${l.qty} × ${U.esc(l.menu.name)}</span>
          <span class="num">${U.baht(l.sum)}</span></div>`).join('')}</div>
        <div class="between mt12"><b>รวมทั้งสิ้น</b><b class="num" style="font-size:20px">${U.baht(o.total)}</b></div>
        <div class="between t-xs muted"><span>ช่องทาง ${D.CH[o.ch].label}</span><span>${U.esc(o.cust)}</span></div>
        <div class="ctr t-xs muted mt16">ขอบคุณที่อุดหนุนครับ 🙏<br>Prototype — ไม่มีการเชื่อมต่อเครื่องพิมพ์จริง</div>` });
  }

  /* ============================================================
     KITCHEN DISPLAY
     ============================================================ */
  window.PAGES.kitchen = function (el, actions) {
    actions.innerHTML = `
      <span class="badge badge-lg"><span class="dot dot-live"></span> Live · อัปเดตอัตโนมัติ</span>
      <button class="btn btn-ghost btn-sm" id="kOrd">← กลับไปหน้า Orders</button>
      <button class="btn btn-primary btn-sm" id="kNew">+ รับออเดอร์</button>`;
    actions.querySelector('#kNew').onclick = A.newOrderModal;
    actions.querySelector('#kOrd').onclick = () => A.go('orders');

    const COLS = [
      { k:'new',       t:'New',     ic:'🆕', cls:'kds-new',   badge:'badge-info', act:'เริ่มทำ' },
      { k:'preparing', t:'Cooking', ic:'🔥', cls:'kds-cook',  badge:'badge-warn', act:'พร้อมเสิร์ฟ' },
      { k:'ready',     t:'Ready',   ic:'✅', cls:'kds-ready', badge:'badge-good', act:'เสร็จแล้ว' }
    ];
    const mins = t => { const [h,m] = t.split(':').map(Number); return Math.max(0, (11*60+58) - (h*60+m)) + 2; };

    const paint = () => {
      el.innerHTML = `
      <div class="grid g-4 mb16">
        ${COLS.map(c=>U.kpi({ label:c.t, icon:c.ic, value:U.nf(st().orders.filter(o=>o.st===c.k).length),
          foot:`<span class="t-xs muted">${c.k==='new'?'รอเริ่มทำ':c.k==='preparing'?'อยู่บนเตา':'รอลูกค้ารับ'}</span>` })).join('')}
        ${U.kpi({ label:'เวลาทำเฉลี่ย', icon:'⏱️', iconBg:'var(--good-soft)', value:'6:20',
          foot:`<span class="badge badge-good">เร็วกว่าเป้า 8:00</span>` })}
      </div>
      <div class="kds">
        ${COLS.map(c=>{
          const rows = st().orders.filter(o=>o.st===c.k);
          return `<div class="kds-col">
            <div class="kds-h"><span class="t">${c.ic} ${c.t}
              <span class="badge ${c.badge}">${rows.length}</span></span></div>
            ${rows.length ? rows.map(o=>{
              const late = mins(o.t) > 8;
              return `<div class="kds-card ${c.cls}">
                <div class="between">
                  <span class="no">${o.id}</span>
                  <span class="timer ${late?'late':''}">${late?'⚠ ':''}${mins(o.t)} นาที</span></div>
                <div class="between t-xs muted mb8">
                  <span>${D.CH[o.ch].icon} ${D.CH[o.ch].label}</span><span>สั่ง ${o.t}</span></div>
                <div style="border-top:1px dashed var(--line);padding-top:10px">
                  ${o.lines.map(l=>`<div class="it"><span class="q">${l.qty}</span>
                    <span>${U.esc(l.menu.name)}</span></div>`).join('')}
                </div>
                ${o.note ? `<div class="ord-note mt8">📝 ${U.esc(o.note)}</div>` : ''}
                <button class="btn ${c.k==='ready'?'btn-good':'btn-dark'} btn-block mt12" data-next="${o.id}">${c.act} →</button>
              </div>`;
            }).join('') : `<div class="ctr t-sm muted" style="padding:26px 10px">ว่าง 🎉</div>`}
          </div>`;
        }).join('')}
      </div>
      <div class="ai-strip mt16">
        <div class="ic">🤖</div>
        <div class="t-sm"><b>AI เตือนครัว</b> — ช่วง 11:00–13:00 คือพีคของร้าน (คิดเป็น 34% ของยอดทั้งวัน)
          แนะนำเตรียมหมูกรอบทอดล่วงหน้า 40 ชิ้น และหั่นเครื่องกะเพราให้พร้อมก่อน 10:45
          ${(function(){ const out = D.ingredients.filter(i=>D.stockStatus(i)==='out');
            return out.length ? `<br><b style="color:var(--bad)">${out.map(i=>U.esc(i.name)).join(', ')} หมด</b> — เมนูที่ใช้วัตถุดิบนี้ถูกปิดขายชั่วคราว` : ''; })()}
        </div>
      </div>`;
      el.querySelectorAll('[data-next]').forEach(b => b.onclick = () => A.advance(b.dataset.next));
    };
    paint();
  };

  /* ============================================================
     MENU & COST
     ============================================================ */
  window.PAGES.menu = function (el, actions, q) {
    let view = 'table', cat = 'all';
    actions.innerHTML = `
      <div class="tabs" id="vTabs">
        <button data-v="table" class="on">☰ ตาราง</button>
        <button data-v="card">▦ การ์ด</button></div>
      <button class="btn btn-primary btn-sm" id="mNew">+ เพิ่มเมนู</button>`;
    actions.querySelector('#mNew').onclick = () => menuEditor(null);
    actions.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      view = b.dataset.v; actions.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x===b)); paint(); });

    el.innerHTML = `<div class="grid g-4 mb16" id="mKpi"></div>
      <div class="between mb16 wrap g12"><div class="tabs" id="cTabs"></div>
        <span class="t-sm muted">เป้า Margin ของร้าน: <b>35%</b> · เมนูที่ต่ำกว่านี้จะถูกเตือน</span></div>
      <div id="mBody"></div>`;

    const paint = () => {
      const M = st().menu;
      const cats = ['all', ...Array.from(new Set(M.map(m=>m.cat)))];
      const avgM = M.reduce((s,m)=>s+m.margin,0)/M.length;
      const low = M.filter(m=>m.margin<35);
      const sold = D.todayLines.filter(l=>l.units>0).length;

      el.querySelector('#mKpi').innerHTML = `
        ${U.kpi({ label:'เมนูทั้งหมด', icon:'🍽️', value:U.nf(M.length),
          foot:`<span class="t-xs muted">ขายได้วันนี้ ${sold} เมนู · ไม่ขยับ ${M.length-sold} เมนู</span>` })}
        ${U.kpi({ label:'Margin เฉลี่ย', icon:'📊', iconBg:'var(--good-soft)', value:U.pc(avgM),
          foot:`<span class="badge ${avgM>=35?'badge-good':'badge-warn'}">${avgM>=35?'สูงกว่าเป้า':'ต่ำกว่าเป้า 35%'}</span>` })}
        ${U.kpi({ label:'เมนู Margin ต่ำ', icon:'⚠️', iconBg:'var(--warn-soft)', value:U.nf(low.length),
          foot:`<span class="t-xs muted">${low.slice(0,2).map(m=>U.esc(m.name)).join(', ')}${low.length>2?' +'+(low.length-2):''}</span>` })}
        ${U.kpi({ label:'ราคาเฉลี่ย/ต้นทุนเฉลี่ย', icon:'🧮', value:U.baht(M.reduce((s,m)=>s+m.price,0)/M.length,0),
          foot:`<span class="t-xs muted">ต้นทุนเฉลี่ย ${U.baht(M.reduce((s,m)=>s+m.cost,0)/M.length,0)}</span>` })}`;

      el.querySelector('#cTabs').innerHTML = cats.map(c=>`<button data-c="${c}" class="${cat===c?'on':''}">
        ${c==='all'?'ทุกหมวด':U.esc(c)}<span class="n num">${c==='all'?M.length:M.filter(m=>m.cat===c).length}</span></button>`).join('');
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; paint(); });

      const rows = M.filter(m => cat === 'all' || m.cat === cat);
      const body = el.querySelector('#mBody');

      if (view === 'table') {
        body.innerHTML = `<div class="card"><div class="scroll-x"><table class="tbl tbl-clickable">
          <thead><tr><th>Menu</th><th>Category</th><th class="r">Price</th><th class="r">Cost</th>
            <th class="r">Profit</th><th class="r">Margin</th><th class="r">ขายวันนี้</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map(m=>{
            const u = D.todayUnits[m.id] || 0;
            return `<tr data-m="${m.id}">
              <td><div class="row g10"><span style="font-size:19px">${m.emoji}</span>
                <span><b class="t-sm">${U.esc(m.name)}</b>${m.hero?' <span class="badge badge-brand">ขายดี</span>':''}
                ${m.watch?' <span class="badge badge-warn">เฝ้าระวัง</span>':''}<br>
                <span class="t-xs muted">${m.recipe.length} วัตถุดิบ</span></span></div></td>
              <td><span class="badge">${U.esc(m.cat)}</span></td>
              <td class="r num b7">${U.baht(m.price)}</td>
              <td class="r num">${U.baht(m.cost)}</td>
              <td class="r num b7" style="color:var(--good)">${U.baht(m.profit)}</td>
              <td class="r">${U.marginBadge(m.margin)}</td>
              <td class="r num">${u ? U.nf(u)+' จาน' : '<span class="muted">—</span>'}</td>
              <td>${u===0 && !m.custom ? '<span class="badge badge-bad">ไม่ขยับ</span>' : '<span class="badge badge-good">ขายอยู่</span>'}</td>
              <td class="r"><button class="btn btn-xs btn-soft" data-edit="${m.id}">แก้ไข</button></td></tr>`;
          }).join('')}</tbody></table></div></div>
          <div class="ai-strip mt16"><div class="ic">🤖</div>
            <div class="t-sm"><b>AI Warning</b> — ${low.length} เมนูมี Margin ต่ำกว่าเป้า 35%:
              ${low.map(m=>`<b>${U.esc(m.name)}</b> (${U.pc(m.margin)})`).join(', ')}<br>
              <span class="muted">กลุ่มนี้กินสัดส่วนยอดขาย ${U.pc(low.reduce((s,m)=>s+(D.todayUnits[m.id]||0)*m.price,0)/D.today.revenue*100)}
              ของทั้งวัน ถ้าขึ้นราคาเฉลี่ย 4 บาท จะได้กำไรเพิ่มราว ${U.baht(low.reduce((s,m)=>s+(D.todayUnits[m.id]||0)*4,0))}/วัน</span></div></div>`;
      } else {
        body.innerHTML = `<div class="grid g-4">${rows.map(m=>{
          const u = D.todayUnits[m.id] || 0;
          return `<div class="menu-card" data-m="${m.id}">
            <div class="menu-thumb" style="background:linear-gradient(135deg,var(--brand-soft),var(--bg-2))">${m.emoji}
              <span class="badge ${u?'badge-good':'badge-bad'}" style="position:absolute;top:10px;right:10px">${u?u+' จาน':'ไม่ขยับ'}</span></div>
            <div class="mb">
              <div class="between"><b>${U.esc(m.name)}</b><span class="num b8">${U.baht(m.price)}</span></div>
              <div class="t-xs muted mt4">${U.esc(m.cat)} · ต้นทุน ${U.baht(m.cost)}</div>
              <div class="row g12 mt12">${U.ring(m.margin,{size:46,thick:6})}
                <div><div class="t-xs muted">กำไร/จาน</div>
                  <div class="num b8" style="color:var(--good)">${U.baht(m.profit)}</div></div></div>
            </div></div>`; }).join('')}</div>`;
      }
      body.querySelectorAll('[data-m]').forEach(r => r.onclick = e => {
        if (e.target.closest('[data-edit]')) return; menuDetail(r.dataset.m); });
      body.querySelectorAll('[data-edit]').forEach(b => b.onclick = e => { e.stopPropagation(); menuEditor(b.dataset.edit); });
    };
    paint();
    if (q.new) setTimeout(()=>menuEditor(null), 150);
  };

  function menuDetail(id) {
    const m = D.mi(id) || st().menu.find(x=>x.id===id); if (!m) return;
    const u = D.todayUnits[m.id] || 0;
    U.modal({ title:m.name, icon:m.emoji, sub:m.cat + ' · ' + (m.active?'กำลังขาย':'ปิดขาย'), wide:true,
      okText:'แก้ไขต้นทุน', cancelText:'ปิด',
      body:`<div class="grid g-2" style="gap:20px">
        <div>
          <div class="menu-thumb" style="height:160px;border-radius:var(--r);font-size:64px;background:linear-gradient(135deg,var(--brand-soft),var(--bg-2))">${m.emoji}</div>
          <p class="t-sm muted mt12">${U.esc(m.desc||'')}</p>
          <div class="grid g-2 mt16" style="gap:10px">
            ${[['ราคาขาย',U.baht(m.price)],['ต้นทุน',U.baht(m.cost)],
               ['กำไร/จาน',U.baht(m.profit)],['ขายวันนี้',u+' จาน']]
              .map(([l,v])=>`<div class="tile"><div class="t-xs muted b6">${l}</div>
                <div class="num b8 mt4" style="font-size:17px">${v}</div></div>`).join('')}
          </div>
        </div>
        <div>
          <div class="between mb12"><h4>Recipe & Ingredients</h4>${U.marginBadge(m.margin)}</div>
          <div class="card" style="overflow:hidden">
            <table class="tbl"><thead><tr><th>วัตถุดิบ</th><th class="r">ต้นทุน</th><th class="r">สัดส่วน</th></tr></thead>
            <tbody>${m.recipe.map(r=>`<tr><td class="t-sm">${U.esc(r[1])}</td>
              <td class="r num b7">${U.baht(r[2])}</td>
              <td class="r"><span class="t-xs muted">${U.pc(r[2]/m.cost*100,0)}</span></td></tr>`).join('')}
              <tr style="background:var(--surface-2)"><td><b>ต้นทุนรวม</b></td>
                <td class="r num b8">${U.baht(m.cost)}</td><td class="r">100%</td></tr>
            </tbody></table>
          </div>
          <div class="grid g-2 mt16" style="gap:10px">
            <div class="tile ctr">${U.ring(m.margin,{size:74,thick:9})}
              <div class="t-xs muted mt8">Margin ปัจจุบัน</div></div>
            <div class="tile">
              <div class="t-xs muted b6">ยอดขายวันนี้จากเมนูนี้</div>
              <div class="num b8" style="font-size:19px">${U.baht(u*m.price)}</div>
              <div class="t-xs" style="color:var(--good)">กำไร ${U.baht(u*m.profit)}</div>
              <div class="bar mt8"><i style="width:${Math.min(100,u*m.price/D.today.revenue*100*3).toFixed(0)}%"></i></div>
              <div class="t-xs muted mt4">${U.pc(u*m.price/D.today.revenue*100)} ของยอดขายวันนี้</div></div>
          </div>
          ${m.margin < 35 ? `<div class="ai-strip mt16"><div class="ic">⚠️</div>
            <div class="t-sm"><b>Margin ต่ำกว่าค่าเป้าหมาย (35%)</b><br>
            <span class="muted">ที่ต้นทุน ${U.baht(m.cost)} ควรตั้งราคาอย่างน้อย
            <b>${U.baht(Math.ceil(m.cost/0.65))}</b> เพื่อให้ได้ margin 35%
            (ตอนนี้ ${U.baht(m.price)} → margin ${U.pc(m.margin)})</span></div></div>`
          : `<div class="ai-strip mt16" style="background:var(--good-soft);border-color:var(--good-line)">
            <div class="ic" style="background:var(--good)">✓</div>
            <div class="t-sm"><b>Margin อยู่ในเกณฑ์ดี</b><br>
            <span class="muted">เมนูนี้กำไรต่อจาน ${U.baht(m.profit)} ควรดันให้ขายมากขึ้นด้วย Bundle หรือป้ายหน้าร้าน</span></div></div>`}
        </div></div>`,
      onOk(){ setTimeout(()=>menuEditor(m.id), 160); } });
  }

  /* ---------- Menu editor + Cost calculator ---------- */
  function menuEditor(id) {
    const m = id ? (D.mi(id) || st().menu.find(x=>x.id===id)) : null;
    const rows = m ? m.recipe.map(r=>({ name:r[1], cost:r[2] }))
                   : [{ name:'หมู', cost:30 },{ name:'ข้าว', cost:7 },{ name:'เครื่องปรุง', cost:4 },
                      { name:'ไข่', cost:5 },{ name:'Packaging', cost:3 }];
    let price = m ? m.price : 69;

    U.modal({
      title: m ? 'แก้ไข ' + m.name : 'เพิ่มเมนูใหม่', icon: m ? m.emoji : '🍽️', wide:true,
      okText: m ? 'บันทึกการแก้ไข' : 'เพิ่มเมนูนี้',
      body:`<div class="grid g-2" style="gap:20px">
        <div class="col g14">
          <div class="field"><label class="label">ชื่อเมนู *</label>
            <input class="input" id="e_name" value="${m?U.esc(m.name):''}" placeholder="เช่น กะเพราหมูกรอบ"></div>
          <div class="field"><label class="label">Description</label>
            <textarea class="textarea" id="e_desc" placeholder="อธิบายสั้นๆ ให้ลูกค้าเห็นตอนสั่ง">${m?U.esc(m.desc||''):''}</textarea></div>
          <div class="row g12">
            <div class="field grow"><label class="label">Category</label>
              <select class="select" id="e_cat">${['จานเดียว','ท็อปปิ้ง','เครื่องดื่ม','ของหวาน'].map(c=>`<option ${m&&m.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
            <div class="field" style="width:110px"><label class="label">ไอคอน</label>
              <select class="select" id="e_emoji">${['🍚','🥘','🍗','🍛','🍳','🍜','🥤','🧋','🍤','🦐','🌮','🍽️'].map(e=>`<option ${m&&m.emoji===e?'selected':''}>${e}</option>`).join('')}</select></div>
          </div>
          <div class="field"><label class="label">ราคาขาย (บาท) *</label>
            <div class="input-prefix"><span>฿</span><input class="input num" id="e_price" type="number" min="0" value="${price}"></div></div>
          <div class="field"><label class="label">รูปอาหาร</label>
            <div class="tile ctr" style="border-style:dashed;cursor:pointer" id="e_img">
              <div style="font-size:26px">🖼️</div>
              <div class="t-sm muted mt4">อัปโหลดรูป (Prototype — ยังไม่เชื่อมต่อที่เก็บไฟล์)</div></div></div>
        </div>

        <div>
          <div class="between mb12"><h4>Cost Calculator</h4>
            <button class="btn btn-ghost btn-xs" id="addIng">+ เพิ่มวัตถุดิบ</button></div>
          <div class="col g8" id="ingList"></div>
          <div class="card mt16" style="background:var(--surface-2)">
            <div class="card-b col g10" id="costOut"></div>
          </div>
          <div id="warnBox" class="mt12"></div>
        </div></div>`,
      onMount(el){
        const paint = () => {
          el.querySelector('#ingList').innerHTML = rows.map((r,i)=>`
            <div class="ing-row">
              <input class="input input-sm" value="${U.esc(r.name)}" data-in="${i}" placeholder="ชื่อวัตถุดิบ">
              <div class="input-prefix"><span style="font-size:12px">฿</span>
                <input class="input input-sm num" style="padding-left:26px" type="number" min="0" step="0.5" value="${r.cost}" data-ic="${i}"></div>
              <button class="btn btn-xs btn-soft" data-idel="${i}" title="ลบ">✕</button>
            </div>`).join('');
          const cost = rows.reduce((s,r)=>s+(+r.cost||0),0);
          price = +el.querySelector('#e_price').value || 0;
          const profit = price - cost, margin = price ? profit/price*100 : 0;

          el.querySelector('#costOut').innerHTML = `
            ${[['ต้นทุนรวม', U.baht(cost), ''],
               ['ราคาขาย', U.baht(price), ''],
               ['กำไรต่อจาน', U.baht(profit), profit>0?'var(--good)':'var(--bad)'],
               ['Margin', U.pc(margin), '']]
              .map(([l,v,c])=>`<div class="between"><span class="t-sm ${l==='Margin'?'b7':'muted'}">${l}</span>
                <b class="num ${l==='Margin'?'':'b7'}" style="font-size:${l==='Margin'?'19px':'15px'};${c?'color:'+c:''}">${v}</b></div>`).join('')}
            <div class="stacked mt4">
              <i style="width:${Math.min(100,cost/(price||1)*100)}%;background:var(--c5)"></i>
              <i style="width:${Math.max(0,Math.min(100,profit/(price||1)*100))}%;background:var(--good)"></i></div>
            <div class="between t-xs muted"><span>ต้นทุน ${U.pc(cost/(price||1)*100,0)}</span>
              <span>กำไร ${U.pc(Math.max(0,margin),0)}</span></div>`;

          el.querySelector('#warnBox').innerHTML = margin < 35
            ? `<div class="ai-strip"><div class="ic">⚠️</div><div class="t-sm">
                <b>AI Warning — Margin ต่ำกว่าค่าเป้าหมาย</b><br>
                <span class="muted">เป้าของร้านคือ 35% แต่เมนูนี้ได้ ${U.pc(margin)}<br>
                ทางเลือก: ขึ้นราคาเป็น <b>${U.baht(Math.ceil(cost/0.65))}</b>
                หรือลดต้นทุนลง <b>${U.baht(Math.max(0,cost - price*0.65))}</b></span></div></div>`
            : `<div class="ai-strip" style="background:var(--good-soft);border-color:var(--good-line)">
                <div class="ic" style="background:var(--good)">✓</div><div class="t-sm">
                <b>โครงสร้างราคาดี</b><br><span class="muted">Margin ${U.pc(margin)} สูงกว่าเป้า 35% ของร้าน</span></div></div>`;

          el.querySelectorAll('[data-in]').forEach(i2 => i2.oninput = e => { rows[+i2.dataset.in].name = e.target.value; });
          el.querySelectorAll('[data-ic]').forEach(i2 => i2.oninput = e => { rows[+i2.dataset.ic].cost = +e.target.value||0; paint(); });
          el.querySelectorAll('[data-idel]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.idel,1); paint(); });
        };
        el.querySelector('#addIng').onclick = () => { rows.push({ name:'', cost:0 }); paint(); };
        el.querySelector('#e_price').oninput = paint;
        el.querySelector('#e_img').onclick = () => U.toast('Prototype: ยังไม่เชื่อมต่อที่เก็บไฟล์','warn');
        paint();
      },
      onOk(el){
        const name = el.querySelector('#e_name').value.trim();
        if (!name) { U.toast('กรุณาใส่ชื่อเมนู','warn'); return false; }
        const cost = rows.reduce((s,r)=>s+(+r.cost||0),0);
        const p = +el.querySelector('#e_price').value || 0;
        if (m) {
          m.name = name; m.price = p; m.cost = cost; m.profit = p-cost; m.margin = p?(p-cost)/p*100:0;
          m.cat = el.querySelector('#e_cat').value; m.emoji = el.querySelector('#e_emoji').value;
          m.desc = el.querySelector('#e_desc').value.trim();
          m.recipe = rows.filter(r=>r.name).map(r=>['custom', r.name, +r.cost||0]);
          U.toast('บันทึก "'+name+'" แล้ว','ok');
        } else {
          st().menu.push({ id:'n'+Date.now(), name, emoji:el.querySelector('#e_emoji').value,
            cat:el.querySelector('#e_cat').value, price:p, cost, profit:p-cost,
            margin: p?(p-cost)/p*100:0, active:true, custom:true,
            desc:el.querySelector('#e_desc').value.trim(),
            recipe: rows.filter(r=>r.name).map(r=>['custom', r.name, +r.cost||0]) });
          U.toast('เพิ่มเมนู "'+name+'" แล้ว','ok');
        }
        A.refresh();
      }
    });
  }
})();
