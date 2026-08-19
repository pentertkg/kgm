/* ============================================================
   StreetFood OS — App shell, router, global AI assistant
   ============================================================ */
window.APP = (function () {
  'use strict';
  const D = window.DB, U = window.UI;

  /* ---------- mutable session state (prototype only, in-memory) ---------- */
  const state = {
    orders: D.orders.map(o => Object.assign({}, o)),
    campaigns: D.campaigns.map(c => Object.assign({}, c)),
    menu: D.menu,
    doneTodos: {},
    aiLog: []
  };

  const NAV = [
    { g:'ดำเนินงาน', items:[
      { id:'dashboard', t:'Dashboard',   ic:'📊' },
      { id:'orders',    t:'Orders',      ic:'🧾', badge:()=>state.orders.filter(o=>o.st==='new').length },
      { id:'menu',      t:'Menu & Cost', ic:'🍽️' },
      { id:'kitchen',   t:'Kitchen',     ic:'👨‍🍳', badge:()=>state.orders.filter(o=>o.st==='new'||o.st==='preparing').length },
      { id:'stock',     t:'Stock',       ic:'📦', badge:()=>D.ingredients.filter(i=>D.stockStatus(i)!=='ok').length }
    ]},
    { g:'เติบโต', items:[
      { id:'customers', t:'Customers',   ic:'👥' },
      { id:'marketing', t:'Marketing',   ic:'📣' },
      { id:'promotion', t:'Promotion',   ic:'🎁' },
      { id:'analytics', t:'Analytics',   ic:'📈' }
    ]},
    { g:'ผู้ช่วย', items:[
      { id:'advisor',   t:'AI Advisor',  ic:'🤖', soft:true },
      { id:'settings',  t:'Settings',    ic:'⚙️' }
    ]}
  ];
  const FLAT = NAV.flatMap(g => g.items);
  const TITLES = {
    dashboard:['Dashboard','ภาพรวมร้านวันนี้ และสิ่งที่ควรทำต่อ'],
    orders:['Orders','จัดการออเดอร์ทุกช่องทางในที่เดียว'],
    menu:['Menu & Cost','ตั้งราคาจากต้นทุนจริง ไม่ใช่การเดา'],
    kitchen:['Kitchen Display','จอสำหรับครัว — ใช้บนแท็บเล็ตได้ดีที่สุด'],
    stock:['Stock','วัตถุดิบคงเหลือ และของที่ต้องซื้อพรุ่งนี้'],
    customers:['Customers','ใครคือลูกค้าประจำ และใครกำลังจะหายไป'],
    marketing:['Marketing','งบโฆษณาที่จ่ายไป คืนกลับมาเท่าไร'],
    promotion:['Promotion Builder','สร้างโปรโมชันจากเป้าหมาย ไม่ใช่จากการเดา'],
    analytics:['Analytics','ยอดขาย สินค้า ลูกค้า การตลาด และกำไรสุทธิ'],
    advisor:['AI Advisor','ผู้ช่วยที่อ่านข้อมูลร้านคุณทั้งหมด'],
    settings:['Settings','ตั้งค่าร้าน ผู้ใช้ การชำระเงิน และแพ็กเกจ']
  };

  /* ============================================================
     SHELL
     ============================================================ */
  function boot() {
    document.body.innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sb">
        <div class="sb-brand">
          <a class="row g10" href="index.html"><span class="logo">🌿</span>
            <span class="logo-txt">StreetFood<span>OS</span></span></a>
        </div>
        <button class="sb-store" id="storeSel">
          <span class="av">${D.store.emoji}</span>
          <span class="grow" style="text-align:left;min-width:0">
            <span class="b7 t-sm" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(D.store.name)}</span>
            <span class="t-xs muted">${U.esc(D.store.format)}</span></span>
          <span class="muted">⌄</span>
        </button>
        <nav class="sb-nav" id="nav"></nav>
        <div class="sb-foot">
          <div class="plan">
            <div class="between"><b class="t-sm">${U.esc(D.store.plan)}</b><span class="badge" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.2)">${D.store.trialDaysLeft} วัน</span></div>
            <div class="pt mt4">ปลดล็อก AI Advisor, Marketing และ Multi-store</div>
            <button class="btn btn-primary btn-sm btn-block mt12" id="upgradeBtn">อัปเกรดแพ็กเกจ</button>
          </div>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="burger" id="burger" aria-label="เมนู">☰</button>
          <label class="search">
            <span>🔍</span>
            <input id="gsearch" placeholder="ค้นหาเมนู ออเดอร์ ลูกค้า หรือถาม AI…" aria-label="ค้นหา">
            <kbd>⌘K</kbd>
          </label>
          <div class="row g8" style="margin-left:auto">
            <button class="btn-icon" id="storeTop" title="เลือกร้าน">🏪</button>
            <button class="btn-icon bell" id="bellBtn" title="การแจ้งเตือน">🔔</button>
            <button class="avatar" id="profileBtn" title="โปรไฟล์">สม</button>
          </div>
        </header>
        <main class="page" id="page"></main>
      </div>
    </div>

    <div class="scrim" id="scrim"></div>

    <nav class="bottom-nav" id="bnav"></nav>

    <button class="fab" id="fab"><span class="fi">🤖</span><span>ถาม AI</span><span class="fd"></span></button>

    <div class="ai-panel" id="aiPanel">
      <div class="ai-head">
        <div class="fi" style="width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:16px">🤖</div>
        <div class="grow"><b>AI Advisor</b>
          <div class="t-xs" style="color:#d9d2ff">อ่านข้อมูลร้าน ${U.esc(D.store.name)} แล้ว</div></div>
        <button class="btn-icon" id="aiClose" style="border-color:rgba(255,255,255,.25);color:#fff">✕</button>
      </div>
      <div class="ai-body" id="aiBody"></div>
      <div class="ai-foot">
        <div class="chips mb12" id="aiChips"></div>
        <form class="search" id="aiForm" style="max-width:none">
          <input id="aiInput" placeholder="ถามอะไรก็ได้เกี่ยวกับร้านคุณ…" autocomplete="off">
          <button class="btn btn-ai btn-xs" type="submit" style="height:30px">ส่ง</button>
        </form>
      </div>
    </div>`;

    paintNav();
    document.getElementById('burger').onclick = () => toggleSide(true);
    document.getElementById('scrim').onclick = () => toggleSide(false);
    document.getElementById('bellBtn').onclick = notiModal;
    document.getElementById('storeSel').onclick = storeModal;
    document.getElementById('storeTop').onclick = storeModal;
    document.getElementById('profileBtn').onclick = profileModal;
    document.getElementById('upgradeBtn').onclick = () => go('settings?tab=subscription');
    document.getElementById('gsearch').addEventListener('focus', searchModal);
    document.getElementById('fab').onclick = () => aiOpen();
    document.getElementById('aiClose').onclick = () => aiOpen(false);
    document.getElementById('aiForm').onsubmit = e => { e.preventDefault(); const v = document.getElementById('aiInput').value.trim();
      if (v) { document.getElementById('aiInput').value = ''; aiAsk(v); } };
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchModal(); }
    });
    aiSeed();
    window.addEventListener('hashchange', route);
    route();
  }

  function paintNav() {
    document.getElementById('nav').innerHTML = NAV.map(g => `
      <div class="sb-sec">${g.g}</div>
      ${g.items.map(i => {
        const n = i.badge ? i.badge() : 0;
        return `<a class="nav-i" href="#/${i.id}" data-nav="${i.id}">
          <span class="ni">${i.ic}</span><span>${i.t}</span>
          ${n ? `<span class="nb ${i.soft ? 'nb-soft' : ''}">${n}</span>` : ''}</a>`;
      }).join('')}`).join('');

    const bn = ['dashboard','orders','kitchen','menu','advisor'];
    document.getElementById('bnav').innerHTML = bn.map(id => {
      const it = FLAT.find(x => x.id === id);
      return `<a class="bn-i" href="#/${id}" data-bnav="${id}"><span class="bi">${it.ic}</span><span>${it.t.split(' ')[0]}</span></a>`;
    }).join('');
    markActive(current());
  }

  function markActive(id) {
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === id));
    document.querySelectorAll('[data-bnav]').forEach(a => a.classList.toggle('on', a.dataset.bnav === id));
  }
  function toggleSide(on) {
    document.getElementById('sb').classList.toggle('on', on);
    document.getElementById('scrim').classList.toggle('on', on);
  }

  /* ---------- routing ---------- */
  function current() { return (location.hash.replace(/^#\//, '').split('?')[0]) || 'dashboard'; }
  function query() {
    const q = location.hash.split('?')[1] || '';
    return q.split('&').filter(Boolean).reduce((a, kv) => { const [k, v] = kv.split('='); a[k] = decodeURIComponent(v || ''); return a; }, {});
  }
  function go(path) { location.hash = '#/' + path; }
  function refresh() { route(); }

  function route() {
    const id = current(), q = query();
    U.closeModal(true);
    if (!window.PAGES || !window.PAGES[id]) { location.hash = '#/dashboard'; return; }
    const [t, s] = TITLES[id] || [id, ''];
    const page = document.getElementById('page');
    page.innerHTML = `<div class="page-h">
        <div><div class="page-t">${U.esc(t)}</div><div class="page-s">${U.esc(s)}</div></div>
        <div class="row g8 wrap" id="pageActions"></div>
      </div><div id="pageBody"></div>`;
    window.PAGES[id](document.getElementById('pageBody'), document.getElementById('pageActions'), q);
    markActive(id); paintNav();
    toggleSide(false);
    window.scrollTo({ top: 0 });
    if (q.welcome) { setTimeout(() => welcomeModal(), 400); location.hash = '#/' + id; }
  }

  /* ============================================================
     ORDER ACTIONS (ใช้ร่วมกันระหว่าง Orders / Kitchen / Dashboard)
     ============================================================ */
  function advance(id) {
    const o = state.orders.find(x => x.id === id); if (!o) return;
    const nx = D.ST[o.st].next; if (!nx) return;
    o.st = nx;
    U.toast(`${id} → ${D.ST[nx].label}`, 'ok');
    refresh();
  }
  function cancelOrder(id) {
    const o = state.orders.find(x => x.id === id); if (!o) return;
    U.modal({ title:'ยกเลิกออเดอร์ ' + id, icon:'⚠️', okText:'ยืนยันยกเลิก', cancelText:'ไม่ยกเลิก',
      body:`<p>ยอด ${U.baht(o.total)} จะถูกตัดออกจากยอดขายวันนี้ (Prototype: ไม่กระทบตัวเลข Mock กลาง)</p>`,
      onOk(){ o.st = 'cancelled'; U.toast(id + ' ถูกยกเลิก', 'warn'); refresh(); } });
  }
  function newOrderModal() {
    const cart = {};
    const body = () => `
      <div class="grid g-2" style="gap:16px">
        <div>
          <div class="up muted mb8">เลือกเมนู</div>
          <div class="col g8" style="max-height:320px;overflow-y:auto">
            ${state.menu.filter(m=>m.active).map(m=>`
              <button class="choice" data-add="${m.id}" style="padding:10px 12px">
                <span class="ci" style="width:34px;height:34px;font-size:16px">${m.emoji}</span>
                <span class="grow"><span class="b7 t-sm">${U.esc(m.name)}</span><br>
                  <span class="t-xs muted">ต้นทุน ${U.baht(m.cost)} · กำไร ${U.baht(m.profit)}</span></span>
                <span class="num b7">${U.baht(m.price)}</span></button>`).join('')}
          </div>
        </div>
        <div>
          <div class="up muted mb8">ตะกร้า</div>
          <div class="tile" style="background:var(--surface-2)"><div id="cartBox"></div></div>
          <div class="field mt12"><label class="label">ช่องทาง</label>
            <select class="select" id="o_ch"><option value="walkin">หน้าร้าน</option>
              <option value="delivery">Delivery</option><option value="online">Online</option></select></div>
          <div class="field mt12"><label class="label">หมายเหตุ</label>
            <input class="input" id="o_note" placeholder="เช่น ไม่ใส่พริก / แยกข้าว"></div>
        </div>
      </div>`;
    const el = U.modal({ title:'รับออเดอร์ใหม่', icon:'🧾', wide:true, okText:'ส่งเข้าครัว', cancelText:'ยกเลิก',
      body: body(),
      onMount(m){ bind(m); paint(m); },
      onOk(m){
        const ids = Object.keys(cart).filter(k => cart[k] > 0);
        if (!ids.length) { U.toast('เลือกเมนูอย่างน้อย 1 รายการ','warn'); return false; }
        const id = '#' + (1284 + state.orders.length - D.orders.length + 1);
        const lines = ids.map(k => { const mm = D.mi(k); return { menu:mm, qty:cart[k], sum:mm.price*cart[k], profit:mm.profit*cart[k] }; });
        state.orders.unshift({
          id, t: new Date().toTimeString().slice(0,5), ch: m.querySelector('#o_ch').value, st:'new',
          cust: m.querySelector('#o_ch').value === 'walkin' ? 'ลูกค้าหน้าร้าน' : 'ลูกค้าใหม่',
          note: m.querySelector('#o_note').value.trim(), lines,
          total: lines.reduce((s,l)=>s+l.sum,0), profit: lines.reduce((s,l)=>s+l.profit,0),
          qty: lines.reduce((s,l)=>s+l.qty,0)
        });
        U.toast('สร้างออเดอร์ ' + id + ' และส่งเข้าครัวแล้ว','ok');
        refresh();
      }
    });
    function bind(m){ m.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      cart[b.dataset.add] = (cart[b.dataset.add] || 0) + 1; paint(m); }); }
    function paint(m){
      const ids = Object.keys(cart).filter(k => cart[k] > 0);
      const box = m.querySelector('#cartBox');
      if (!ids.length) { box.innerHTML = `<div class="t-sm muted ctr" style="padding:18px 0">ยังไม่มีรายการ<br>กดเลือกเมนูด้านซ้าย</div>`; return; }
      const total = ids.reduce((s,k)=>s + D.mi(k).price*cart[k], 0);
      const cost  = ids.reduce((s,k)=>s + D.mi(k).cost*cart[k], 0);
      box.innerHTML = ids.map(k => { const mm = D.mi(k); return `
        <div class="between" style="padding:6px 0">
          <span class="t-sm b6">${mm.emoji} ${U.esc(mm.name)}</span>
          <span class="row g6"><button class="btn btn-xs btn-soft" data-mi="${k}">−</button>
            <b class="num" style="min-width:18px;text-align:center">${cart[k]}</b>
            <button class="btn btn-xs btn-soft" data-pl="${k}">+</button>
            <span class="num b7" style="min-width:56px;text-align:right">${U.baht(mm.price*cart[k])}</span></span></div>`; }).join('')
        + `<div class="between mt12" style="padding-top:10px;border-top:1px dashed var(--line)">
            <b>รวม</b><b class="num" style="font-size:18px">${U.baht(total)}</b></div>
           <div class="between t-xs muted"><span>กำไรจากบิลนี้</span><b class="num" style="color:var(--good)">${U.baht(total-cost)}</b></div>`;
      box.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { cart[b.dataset.pl]++; paint(m); });
      box.querySelectorAll('[data-mi]').forEach(b => b.onclick = () => { cart[b.dataset.mi] = Math.max(0, cart[b.dataset.mi]-1); paint(m); });
    }
    return el;
  }

  /* ============================================================
     GLOBAL AI ASSISTANT
     ============================================================ */
  const SUGGEST = ['วันนี้ควรทำอะไร?','วันนี้ร้านเป็นยังไง?','ทำไมกำไรลด?','เมนูไหนควรขึ้นราคา?',
                   'พรุ่งนี้ต้องซื้อวัตถุดิบอะไร?','ถ้ามีงบโฆษณา 10,000 บาทควรยิงอะไร?',
                   'เมนูไหนควรหยุดขาย?','ควรทำ Promotion อะไร?'];

  function aiOpen(on) {
    const p = document.getElementById('aiPanel');
    const show = on === undefined ? !p.classList.contains('on') : on;
    p.classList.toggle('on', show);
    document.getElementById('fab').style.opacity = show ? 0 : 1;
    document.getElementById('fab').style.pointerEvents = show ? 'none' : 'auto';
    if (show) setTimeout(()=>document.getElementById('aiInput').focus(), 220);
  }
  function aiSeed() {
    document.getElementById('aiChips').innerHTML = SUGGEST.slice(0,4).map(s=>`<button class="chip">${s}</button>`).join('');
    document.querySelectorAll('#aiChips .chip').forEach(c => c.onclick = () => aiAsk(c.textContent));
    aiPush('ai', `สวัสดีครับ 👋 ผมอ่านข้อมูลร้าน <b>${U.esc(D.store.name)}</b> วันนี้แล้ว<br>
      ยอดขาย <b class="num">${U.baht(D.today.revenue)}</b> · ${U.nf(D.today.orders)} ออเดอร์ · กำไร <b class="num">${U.baht(D.today.profit)}</b><br>
      <span class="muted t-sm">มี 3 เรื่องที่ควรทำวันนี้ — ลองพิมพ์ถามหรือกดปุ่มด้านล่างได้เลย</span>`);
  }
  function aiPush(who, html) {
    const b = document.getElementById('aiBody');
    const d = document.createElement('div');
    d.className = 'msg msg-' + (who === 'me' ? 'me' : 'ai');
    d.innerHTML = html;
    b.appendChild(d); b.scrollTop = b.scrollHeight;
    return d;
  }
  function aiAsk(q) {
    aiOpen(true);
    aiPush('me', U.esc(q));
    const t = aiPush('ai', `<span class="typing"><i></i><i></i><i></i></span>`);
    setTimeout(() => {
      const a = answer(q);
      t.innerHTML = a.html;
      if (a.actions) {
        const row = document.createElement('div');
        row.className = 'row g8 wrap mt12';
        row.innerHTML = a.actions.map(x => `<button class="btn btn-ai btn-xs" data-goto="${x.to}">${U.esc(x.label)}</button>`).join('');
        t.appendChild(row);
        row.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { go(b.dataset.goto); aiOpen(false); });
      }
      document.getElementById('aiBody').scrollTop = 99999;
      state.aiLog.push({ q, a: a.html });
    }, 620);
  }

  /* คำตอบอ้างอิงจาก Mock Data ภายในระบบทั้งหมด */
  function answer(qRaw) {
    const q = qRaw.toLowerCase();
    const t = D.today, m = D.month, top = D.topMenuToday();
    const has = (...ks) => ks.some(k => q.includes(k));

    if (has('ควรทำอะไร','ทำอะไรต่อ','วันนี้ควรทำ','todo','ทำอะไรดี'))
      return { html: `<b>มี 3 เรื่องที่ควรทำวันนี้</b>` + D.ai.todo.map((x,i)=>`
          <div class="rec mt8"><span class="rn">${i+1}</span><div class="t-sm">
            <b>${U.esc(x.t)}</b>${x.urgent?' <span class="badge badge-bad">ด่วน</span>':''}<br>
            <span class="muted">${U.esc(x.d)}</span></div></div>`).join(''),
        actions:[{label:'เติม Stock',to:'stock'},{label:'ดู Marketing',to:'marketing'},{label:'สร้าง Promotion',to:'promotion'}] };

    if (has('เป็นยังไง','เป็นอย่างไร','สรุปวันนี้','ภาพรวม','ยอดขายวันนี้'))
      return { html: `<b>สรุปวันนี้ (${U.fullToday()})</b><br>
        • ยอดขาย <b class="num">${U.baht(t.revenue)}</b> ${U.delta(D.cmpYesterday.revenue)} เทียบเมื่อวาน<br>
        • ออเดอร์ <b class="num">${U.nf(t.orders)}</b> บิล ${U.delta(D.cmpYesterday.orders)}<br>
        • Average Order <b class="num">${U.baht(t.aov,0)}</b> ${U.delta(D.cmpYesterday.aov)}<br>
        • กำไรขั้นต้น <b class="num">${U.baht(t.profit)}</b> ${U.delta(D.cmpYesterday.profit)}<br><br>
        เกินเป้ารายวัน (${U.baht(m.dailyTarget)}) อยู่ <b class="num" style="color:var(--good)">${U.pc(t.revenue/m.dailyTarget*100-100)}</b>
        แต่ <b>กำไรสวนทางกับยอดขาย</b> — สาเหตุคือต้นทุนหมูขึ้น 8%`,
        actions:[{label:'ดู Analytics',to:'analytics'},{label:'ดู Top เมนู',to:'menu'}] };

    if (has('ทำไมกำไรลด','กำไรลด','กำไรหาย','กำไรน้อย','ขาดทุน'))
      return { html: `<b>กำไรลดลง ${U.pc(Math.abs(D.cmpYesterday.profit))} ทั้งที่ยอดขายเพิ่ม ${U.pc(D.cmpYesterday.revenue)}</b><br>
        ${U.esc(D.ai.detail)}<br><br>
        <b>ผลกระทบเป็นตัวเงิน</b><br>
        • กะเพราหมูกรอบ: margin ${U.pc(D.mi('m1').margin)} (ต่ำสุดในกลุ่มจานเดียว) × ${D.todayUnits.m1} จาน<br>
        • ถ้าต้นทุนหมูยังอยู่ระดับนี้ทั้งเดือน กำไรจะหายราว <b class="num">${U.baht(11160)}</b>`,
        actions:[{label:'แก้ที่ Menu & Cost',to:'menu'},{label:'ดู P&L',to:'analytics?tab=profit'}] };

    if (has('ขึ้นราคา','ปรับราคา','ราคาเหมาะ'))
      { const low = state.menu.filter(x=>x.margin<32 && x.cat==='จานเดียว').sort((a,b)=>a.margin-b.margin);
        return { html: `<b>เมนูที่ควรพิจารณาขึ้นราคา</b> (Margin ต่ำกว่าเป้า 32%)` +
          low.map(x=>`<div class="rec mt8"><span class="rn">${x.emoji}</span><div class="t-sm">
            <b>${U.esc(x.name)}</b> — ตอนนี้ ${U.baht(x.price)} · ต้นทุน ${U.baht(x.cost)} · margin ${U.pc(x.margin)}<br>
            <span class="muted">แนะนำ ${U.baht(x.price)} → <b>${U.baht(Math.ceil((x.cost/0.65)/1)*1)}</b>
            จะได้ margin ~${U.pc((1-x.cost/(Math.ceil(x.cost/0.65)))*100)}</span></div></div>`).join('') +
          `<div class="t-sm muted mt12">ขึ้นทีละ 3–5 บาท ลูกค้ารับได้ดีกว่าการขึ้นครั้งเดียว 10 บาท</div>`,
          actions:[{label:'ไปที่ Menu & Cost',to:'menu'}] };
      }

    if (has('วัตถุดิบ','ซื้อของ','stock','สั่งของ','พรุ่งนี้ต้องซื้อ'))
      { const need = D.forecastTomorrow().filter(i=>i.gap>0);
        return { html: `<b>คาดการณ์วัตถุดิบสำหรับพรุ่งนี้</b><br>
          <span class="muted t-sm">คำนวณจากยอดขาย 7 วันย้อนหลัง + แนวโน้ม +4%</span>` +
          need.map(i=>`<div class="between t-sm mt8" style="padding-bottom:6px;border-bottom:1px dashed var(--line)">
            <span><b>${U.esc(i.name)}</b> <span class="muted">ต้องใช้ ${U.nf(i.need,2)} ${i.unit}</span></span>
            <span class="badge badge-bad">ขาด ${U.nf(i.gap,2)} ${i.unit}</span></div>`).join('') +
          `<div class="mt12 t-sm">รวมมูลค่าที่ต้องสั่งประมาณ <b class="num">${U.baht(need.reduce((s,i)=>s+i.gap*i.cost,0))}</b></div>`,
          actions:[{label:'สร้างใบสั่งซื้อ',to:'stock'}] };
      }

    if (has('งบโฆษณา','10,000','โฆษณา','ยิงแอด','ads','roas','การตลาด'))
      { const best = state.campaigns.slice().sort((a,b)=>b.roas-a.roas);
        return { html: `<b>ถ้ามีงบ ฿10,000 ควรแบ่งอย่างนี้</b><br>
          <span class="muted t-sm">อ้างอิง ROAS จริง 19 วันที่ผ่านมา (ROAS รวม ${U.nf(D.marketing.roas,2)}x)</span>
          <div class="col g8 mt12">
            ${[[best[0], 5000],[best[1], 3000],[null, 2000]].map(([c,amt])=>c
              ? `<div class="between t-sm"><span>• ${U.esc(c.name)} <span class="badge badge-good">${U.nf(c.roas,2)}x</span></span>
                 <b class="num">${U.baht(amt)}</b></div>`
              : `<div class="between t-sm"><span>• ทดสอบครีเอทีฟใหม่ 2 ชิ้น (เผื่อไว้)</span><b class="num">${U.baht(amt)}</b></div>`).join('')}
          </div>
          <div class="mt12 t-sm">คาดว่าจะได้ยอดขายกลับมาราว <b class="num">${U.baht(10000*4.3)}</b><br>
          <b>ห้ามใส่งบเพิ่ม</b>ที่ "Boost เมนูใหม่ กะเพราทะเล" — ROAS 1.69x ต่ำกว่าจุดคุ้มทุน (2.7x)</div>`,
          actions:[{label:'ไปที่ Marketing',to:'marketing'}] };
      }

    if (has('หยุดขาย','เมนูแย่','ขายไม่ดี','worst','ตัดเมนู'))
      return { html: `<b>เมนูที่ควรพิจารณาหยุดขายหรือปรับสูตร</b>
        <div class="rec mt8"><span class="rn">🦐</span><div class="t-sm">
          <b>กะเพราทะเล</b> — ขายได้ 0 จานวันนี้ · margin ${U.pc(D.mi('m6').margin)} (ต่ำสุดในร้าน)<br>
          <span class="muted">ต้นทุน ${U.baht(D.mi('m6').cost)} จาก ${U.baht(D.mi('m6').price)} และวัตถุดิบทะเลหมดสต็อกบ่อย
          ทำให้เสียโอกาสขายเมนูอื่น แนะนำหยุดขายชั่วคราว หรือลดขนาดพอร์ชันให้ต้นทุนเหลือ ฿48</span></div></div>
        <div class="rec mt8"><span class="rn">🍳</span><div class="t-sm">
          <b>ข้าวไข่เจียวหมูสับ</b> — ขายได้ 4 จาน/วัน<br>
          <span class="muted">margin ดี (${U.pc(D.mi('m5').margin)}) แต่ไม่มีคนรู้จัก ควรดันด้วยป้ายหน้าร้านก่อนตัดสินใจตัด</span></div></div>`,
        actions:[{label:'ไปที่ Menu & Cost',to:'menu'}] };

    if (has('promotion','โปรโมชั่น','โปรโมชัน','โปร','ลูกค้าหาย','เรียกลูกค้า'))
      return { html: `<b>โปรโมชันที่เหมาะกับร้านคุณตอนนี้</b>
        <div class="rec mt8"><span class="rn">1</span><div class="t-sm">
          <b>กลับมากินกะเพราอีกครั้ง — ลด 20 บาท</b><br>
          <span class="muted">ส่งให้ลูกค้า ${D.crm.lost} คนที่ไม่ได้ซื้อเกิน 30 วัน · คาดว่ากลับมา 22% = 13 บิล ≈ ${U.baht(13*65)}</span></div></div>
        <div class="rec mt8"><span class="rn">2</span><div class="t-sm">
          <b>Bundle กะเพรา + เครื่องดื่ม 75 บาท</b><br>
          <span class="muted">ดัน AOV จาก ${U.baht(D.today.aov,0)} → ฿73 · เพิ่มกำไรราว ฿2,272/วัน</span></div></div>`,
        actions:[{label:'สร้าง Promotion',to:'promotion'},{label:'ดูลูกค้าที่หายไป',to:'customers'}] };

    if (has('ลูกค้า','crm','ซื้อซ้ำ','vip'))
      return { html: `<b>สรุปลูกค้า</b><br>
        • ลูกค้าทั้งหมด <b class="num">${U.nf(D.crm.total)}</b> คน · ใหม่ 30 วัน <b class="num">${U.nf(D.crm.new30)}</b><br>
        • ซื้อซ้ำ <b class="num">${U.nf(D.crm.repeat)}</b> คน (Repeat rate ${U.pc(D.crm.repeatRate)})<br>
        • <b style="color:var(--bad)">At Risk ${D.crm.lost} คน</b> ไม่กลับมาเกิน 30 วัน<br>
        • CLV เฉลี่ย <b class="num">${U.baht(D.crm.clv)}</b> ต่อคน<br><br>
        ถ้าดึงกลับได้ครึ่งหนึ่ง จะได้ยอดขายเพิ่มราว <b class="num">${U.baht(29*65*2)}</b>/เดือน`,
        actions:[{label:'ดู Customers',to:'customers'},{label:'สร้าง Campaign',to:'promotion'}] };

    if (has('เป้า','goal','ถึงเป้า','เดือนนี้'))
      return { html: `<b>ความคืบหน้าเป้าเดือน ${U.monthLabel()}</b><br>
        • เป้า <b class="num">${U.baht(D.store.goalMonth)}</b> · ทำได้แล้ว <b class="num">${U.baht(m.revenue)}</b> (${U.pc(m.goalProgress)})<br>
        • เหลืออีก ${m.daysInMonth - m.days} วัน ต้องทำวันละ <b class="num">${U.baht((D.store.goalMonth-m.revenue)/(m.daysInMonth-m.days))}</b><br>
        • คาดการณ์สิ้นเดือน <b class="num">${U.baht(m.projected)}</b>
        <span class="badge ${m.projected>=D.store.goalMonth?'badge-good':'badge-warn'}">${m.projected>=D.store.goalMonth?'ถึงเป้า':'ต่ำกว่าเป้า'}</span><br>
        • กำไรสุทธิสะสม <b class="num">${U.baht(m.netProfit)}</b> (${U.pc(m.netMargin)} ของยอดขาย)`,
        actions:[{label:'ดู Analytics',to:'analytics'}] };

    if (has('เมนูขายดี','ขายดี','best seller','top'))
      return { html: `<b>Top 5 เมนูวันนี้</b>` + top.slice(0,5).map((l,i)=>`
        <div class="between t-sm mt8"><span>${i+1}. ${l.emoji} ${U.esc(l.name)} <span class="muted">${l.units} จาน</span></span>
        <span class="num b7">${U.baht(l.revenue)}</span></div>`).join('') +
        `<div class="t-sm muted mt12">น่าสนใจ: <b>${U.esc(top[0].name)}</b> ทำรายได้สูงสุด แต่ margin ต่ำสุด (${U.pc(top[0].margin)})
         ขณะที่ชาเย็นขายได้แค่ 14 แก้วแต่ margin ${U.pc(D.mi('m10').margin)} — ควรดันเครื่องดื่มเพิ่ม`,
        actions:[{label:'ดู Menu & Cost',to:'menu'}] };

    return { html: `ผมยังไม่มีข้อมูลพอสำหรับคำถามนี้ใน Prototype ครับ 🙏<br>
      <span class="t-sm muted">ลองถามเรื่องเหล่านี้ได้เลย:</span>
      <div class="chips mt8">${SUGGEST.slice(0,5).map(s=>`<span class="chip">${s}</span>`).join('')}</div>` };
  }

  /* ============================================================
     TOP-BAR MODALS
     ============================================================ */
  function notiModal() {
    U.modal({ title:'การแจ้งเตือน', icon:'🔔', sub:'4 รายการใหม่', foot:false,
      body:`<div class="col g10">${D.notis.map(n=>`
        <div class="row-t g12 tile card-hover" style="cursor:pointer">
          <span class="badge ${n.cls}" style="width:34px;height:34px;border-radius:11px;justify-content:center;font-size:16px">${n.ic}</span>
          <div class="grow"><div class="b7 t-sm">${U.esc(n.t)}</div>
            <div class="t-sm muted">${U.esc(n.d)}</div>
            <div class="t-xs muted-2 mt4">${U.esc(n.time)}</div></div></div>`).join('')}</div>` });
  }
  function storeModal() {
    U.modal({ title:'เลือกร้าน', icon:'🏪', sub:'บัญชีนี้มี 1 ร้าน (Multi-store อยู่ใน P2)', foot:false,
      body:`<div class="col g10">
        <button class="choice on"><span class="ci">${D.store.emoji}</span>
          <span class="grow" style="text-align:left"><b>${U.esc(D.store.name)}</b><br>
            <span class="t-xs muted">${U.esc(D.store.format)} · ${U.esc(D.store.location)}</span></span>
          <span class="badge badge-good">กำลังใช้</span></button>
        <button class="choice" id="addStore"><span class="ci">➕</span>
          <span class="grow" style="text-align:left"><b>เพิ่มสาขาใหม่</b><br>
            <span class="t-xs muted">ต้องใช้แพ็กเกจ Multi-store</span></span></button></div>`,
      onMount(el){ el.querySelector('#addStore').onclick = () => { U.closeModal(); go('settings?tab=subscription'); }; } });
  }
  function profileModal() {
    U.modal({ title:'สมชาย เจ้าของร้าน', icon:'👤', sub:'owner@streetfoodos.app', foot:false,
      body:`<div class="col g8">
        ${[['⚙️','ตั้งค่าร้าน','settings'],['👥','ผู้ใช้และพนักงาน','settings?tab=staff'],
           ['💳','แพ็กเกจและการชำระเงิน','settings?tab=subscription'],['🤖','AI Advisor','advisor']]
          .map(([ic,t,to])=>`<button class="choice" data-to="${to}"><span class="ci">${ic}</span>
            <span class="grow b6" style="text-align:left">${t}</span><span class="muted">→</span></button>`).join('')}
        <a class="choice" href="index.html"><span class="ci">🚪</span>
          <span class="grow b6" style="text-align:left">ออกจากระบบ (กลับหน้า Landing)</span></a></div>`,
      onMount(el){ el.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { U.closeModal(); go(b.dataset.to); }); } });
  }
  function searchModal() {
    const el = U.modal({ title:'ค้นหาทั่วระบบ', icon:'🔍', sub:'เมนู · ออเดอร์ · ลูกค้า · หน้าต่างๆ', foot:false,
      body:`<input class="input" id="sq" placeholder="พิมพ์เพื่อค้นหา… เช่น กะเพรา, #1284, สมชาย" autocomplete="off">
            <div class="mt16" id="sres"></div>` });
    const inp = el.querySelector('#sq'); inp.focus();
    const paint = () => {
      const q = inp.value.trim().toLowerCase();
      const res = el.querySelector('#sres');
      if (!q) {
        res.innerHTML = `<div class="up muted mb8">ไปที่หน้า</div><div class="col g6">` +
          FLAT.map(i=>`<button class="choice" data-to="${i.id}" style="padding:9px 12px">
            <span class="ci" style="width:30px;height:30px;font-size:15px">${i.ic}</span>
            <span class="grow b6 t-sm" style="text-align:left">${i.t}</span></button>`).join('') + `</div>`;
      } else {
        const menus = state.menu.filter(m => m.name.toLowerCase().includes(q));
        const ords  = state.orders.filter(o => o.id.includes(q) || o.cust.toLowerCase().includes(q));
        const custs = D.customers.filter(c => c.name.toLowerCase().includes(q));
        const pages = FLAT.filter(i => i.t.toLowerCase().includes(q));
        const group = (label, arr, fn) => arr.length ? `<div class="up muted mb8 mt16">${label}</div><div class="col g6">${arr.slice(0,5).map(fn).join('')}</div>` : '';
        res.innerHTML =
          group('เมนู', menus, m=>`<button class="choice" data-to="menu" style="padding:9px 12px">
            <span class="ci" style="width:30px;height:30px;font-size:15px">${m.emoji}</span>
            <span class="grow t-sm" style="text-align:left"><b>${U.esc(m.name)}</b><br>
            <span class="t-xs muted">${U.baht(m.price)} · margin ${U.pc(m.margin)}</span></span></button>`) +
          group('ออเดอร์', ords, o=>`<button class="choice" data-to="orders" style="padding:9px 12px">
            <span class="ci" style="width:30px;height:30px;font-size:14px">🧾</span>
            <span class="grow t-sm" style="text-align:left"><b>${o.id}</b> ${U.esc(o.cust)}<br>
            <span class="t-xs muted">${U.baht(o.total)} · ${D.ST[o.st].label}</span></span></button>`) +
          group('ลูกค้า', custs, c=>`<button class="choice" data-to="customers" style="padding:9px 12px">
            <span class="ci" style="width:30px;height:30px;font-size:14px">👤</span>
            <span class="grow t-sm" style="text-align:left"><b>${U.esc(c.name)}</b><br>
            <span class="t-xs muted">${c.orders} ออเดอร์ · ${U.baht(c.spend)}</span></span></button>`) +
          group('หน้า', pages, i=>`<button class="choice" data-to="${i.id}" style="padding:9px 12px">
            <span class="ci" style="width:30px;height:30px;font-size:15px">${i.ic}</span>
            <span class="grow b6 t-sm" style="text-align:left">${i.t}</span></button>`) +
          `<div class="mt16"><button class="btn btn-ai btn-block" id="askAi">🤖 ถาม AI ว่า “${U.esc(inp.value)}”</button></div>`;
        const ai = res.querySelector('#askAi');
        if (ai) ai.onclick = () => { const v = inp.value; U.closeModal(); aiAsk(v); };
      }
      res.querySelectorAll('[data-to]').forEach(b => b.onclick = () => { U.closeModal(); go(b.dataset.to); });
    };
    inp.oninput = paint; paint();
    document.getElementById('gsearch').blur();
  }
  function welcomeModal() {
    U.modal({ title:'ยินดีต้อนรับสู่ StreetFood OS 🎉', icon:'🌿', okText:'เริ่มรับออเดอร์', cancelText:'ดูรอบๆ ก่อน',
      body:`<p>ร้าน <b>${U.esc(D.store.name)}</b> ถูกสร้างเรียบร้อยแล้ว ข้อมูลใน Prototype นี้เป็น Mock Data ที่ผูกกันทุกหน้า</p>
        <div class="col g8 mt16">
          ${[['📊','Dashboard บอกว่าวันนี้ร้านเป็นอย่างไร และควรทำอะไรต่อ'],
             ['🧾','กด "รับออเดอร์" เพื่อสร้างบิล แล้วไปดูที่ Kitchen Display'],
             ['🤖','ปุ่ม "ถาม AI" มุมขวาล่าง ตอบได้ทุกเรื่องจากข้อมูลร้าน']]
            .map(([ic,t])=>`<div class="row-t g10"><span style="font-size:18px">${ic}</span><span class="t-sm">${t}</span></div>`).join('')}
        </div>`,
      onOk(){ newOrderModal(); } });
  }

  return { boot, go, refresh, state, advance, cancelOrder, newOrderModal, aiAsk, aiOpen, answer, NAV, FLAT };
})();
document.addEventListener('DOMContentLoaded', () => window.APP.boot());
