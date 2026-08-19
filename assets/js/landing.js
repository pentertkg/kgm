/* ============================================================
   landing.js — ส่วน JS ของหน้า index.html
   แยกออกจาก HTML เพื่อให้ตั้ง CSP script-src 'self' ได้บน production
   ============================================================ */
(function(){
  const D = window.DB, U = window.UI;

  /* ---- product preview (ตัวเลขชุดเดียวกับ Dashboard จริง) ---- */
  const t = D.today;
  document.getElementById('pvContent').innerHTML = `
    <div class="between">
      <div><div class="b8" style="font-size:13px">สวัสดี ${U.esc(D.store.name)}</div>
        <div class="t-xs muted">${U.fullToday()}</div></div>
      <span class="badge badge-good" style="height:20px;font-size:10px">● เปิดร้าน</span>
    </div>
    <div class="grid g-2 g-2-keep" style="gap:8px">
      ${[['ยอดขายวันนี้',U.baht(t.revenue),'+12.0%','var(--good)'],
         ['Orders',U.nf(t.orders),'+10.1%','var(--good)'],
         ['Average Order',U.baht(t.aov,0),'+1.7%','var(--good)'],
         ['กำไรโดยประมาณ',U.baht(t.profit),'-4.0%','var(--bad)']]
        .map(([l,v,d,c])=>`<div class="tile" style="padding:9px 10px">
          <div class="t-xs muted" style="font-size:10px">${l}</div>
          <div class="num b8" style="font-size:15px">${v}</div>
          <div class="num b8" style="font-size:9.5px;color:${c}">${d}</div></div>`).join('')}
    </div>
    <div class="tile" style="padding:10px">
      <div class="t-xs b7" style="font-size:10.5px;margin-bottom:4px">ยอดขาย 7 วัน</div>
      ${U.comboChart(D.trend7.map((r,i)=>({label:U.dayLabel(r.d),revenue:r.revenue,profit:r.profit,hi:i===6})),
        {w:420,h:96,pad:10,lines:['profit']})}
    </div>
    <div class="ai-strip" style="padding:9px 11px;gap:9px">
      <div class="ic" style="width:22px;height:22px;border-radius:7px">${(window.ICON||(()=>''))("advisor",12)}</div>
      <div style="font-size:10.5px;line-height:1.5"><b>AI แนะนำวันนี้</b><br>
        <span class="muted">ยอดขาย +12% แต่กำไร −4% เพราะต้นทุนหมูขึ้น 8% → แนะนำปรับราคากะเพราหมูกรอบ 65 → 69 บาท</span></div>
    </div>`;

  /* ---- metric strip ---- */
  document.getElementById('strip').innerHTML = [
    ['⚡','ตั้งร้านเสร็จใน','4 ขั้นตอน','ชื่อร้าน → เป้า → เมนู → เปิดร้าน'],
    ['menu','คำนวณต้นทุนต่อจาน','อัตโนมัติ','ใส่วัตถุดิบ ระบบคิด Margin ให้'],
    ['advisor','AI Insight ในทุกหน้า','11 โมดูล','ไม่ใช่แค่ Chatbot แยกต่างหาก'],
    ['dashboard','ใช้งานได้ทุกจอ','ครัว/หน้าร้าน','แท็บเล็ตในครัว มือถือหน้าร้าน']
  ].map(([ic,l,v,s])=>`<div class="row-t g12">
      <div class="ki" style="width:38px;height:38px;font-size:18px;border-radius:11px;background:var(--brand-soft);display:grid;place-items:center;flex:none">${(window.ICON||(()=>''))(ic,18)}</div>
      <div><div class="t-xs muted b6">${l}</div><div class="b8" style="font-size:17px">${v}</div>
      <div class="t-xs muted mt4">${s}</div></div></div>`).join('');

  /* ---- 4 core values ---- */
  document.getElementById('values').innerHTML = [
    { ic:'analytics', bg:'var(--info-soft)', t:'วางแผนร้าน', s:'ก่อนเปิดร้าน',
      d:'ตั้งเป้ายอดขาย แล้วระบบแตกให้เป็นเป้ารายวัน จำนวนออเดอร์ และ AOV ที่ต้องทำได้',
      li:['คำนวณเป้าจากยอดขายที่อยากได้','ออกแบบเมนูและตั้งราคาจากต้นทุนจริง','รู้ก่อนเปิดว่าต้องขายวันละกี่จาน'] },
    { ic:'menu', bg:'var(--brand-soft)', t:'บริหารร้าน', s:'ทุกวันที่เปิดขาย',
      d:'รับออเดอร์ ส่งเข้าครัว จัดการ Stock วัตถุดิบ ครบในจอเดียว ใช้บนแท็บเล็ตได้',
      li:['Order + Kitchen Display แยกจอ','เตือนวัตถุดิบใกล้หมดอัตโนมัติ','คาดการณ์ของที่ต้องซื้อพรุ่งนี้'] },
    { ic:'marketing', bg:'var(--ai-soft)', t:'เพิ่มยอดขาย', s:'เมื่ออยากโต',
      d:'สร้างโปรโมชันจากเป้าหมาย ไม่ใช่จากการเดา และวัด ROAS ของทุกแคมเปญได้',
      li:['Promotion Builder แบบตอบคำถาม','CRM แบ่งกลุ่มลูกค้าให้อัตโนมัติ','เรียกลูกค้าที่หายไปกลับมา'] },
    { ic:'money', bg:'var(--good-soft)', t:'วิเคราะห์กำไร', s:'ทุกสิ้นวัน/สิ้นเดือน',
      d:'เห็นกำไรจริงหลังหักต้นทุน ค่าแรง ค่าเช่า ค่าโฆษณา ไม่ใช่แค่ยอดขายสวยๆ',
      li:['P&L อ่านง่ายแบบ Waterfall','เมนูไหนกำไรดี/ขาดทุน','เตือนเมื่อ Margin ต่ำกว่าเป้า'] }
  ].map(v=>`<div class="val-card">
      <div class="val-ic" style="background:${v.bg}">${(window.ICON||(()=>''))(v.ic,20)}</div>
      <span class="badge">${v.s}</span>
      <h3 class="mt12">${v.t}</h3>
      <p class="muted t-md mt8" style="line-height:1.7">${v.d}</p>
      <div class="col g8 mt16">${v.li.map(x=>`<div class="check"><i>✓</i><span>${x}</span></div>`).join('')}</div>
    </div>`).join('');

  /* ---- flow ---- */
  const flow = [
    { n:'Plan',   ic:'analytics', t:'วางแผน',   d:'สร้างร้าน ตั้งเป้า เพิ่มเมนู คำนวณต้นทุนและราคาขาย', href:'onboarding.html' },
    { n:'Sell',   ic:'receipt', t:'ขาย',      d:'รับออเดอร์หน้าร้าน/Delivery ส่งเข้าครัวทันที', href:'app.html?demo=1#/orders' },
    { n:'Manage', ic:'box', t:'บริหาร',   d:'คุม Stock ต้นทุน พนักงาน และข้อมูลลูกค้า', href:'app.html?demo=1#/stock' },
    { n:'Grow',   ic:'analytics', t:'ทำให้โต',  d:'อ่าน Analytics ฟัง AI แล้วยิงโปรโมชัน/โฆษณา', href:'app.html?demo=1#/analytics' }
  ];
  document.getElementById('flowline').innerHTML = flow.map((f,i)=>`
    <a class="flow-node card-hover" href="${f.href}">
      <div class="between"><span class="badge badge-brand">${i+1}. ${f.n}</span>${(window.ICON||(()=>''))(f.ic,20)}</div>
      <h4 class="mt12">${f.t}</h4>
      <p class="t-sm muted mt4" style="line-height:1.65">${f.d}</p>
    </a>${i<flow.length-1?'<div class="flow-arw">→</div>':''}`).join('');

  /* ---- features ---- */
  document.getElementById('features').innerHTML = [
    ['dashboard','Dashboard','เห็นภาพร้านวันนี้ใน 5 วินาที ยอดขาย ออเดอร์ AOV กำไร พร้อมเทียบกับเมื่อวาน','app.html?demo=1#/dashboard'],
    ['receipt','Orders','แยกสถานะ ใหม่ → กำลังทำ → พร้อมเสิร์ฟ → เสร็จแล้ว ครบทุกช่องทาง','app.html?demo=1#/orders'],
    ['menu','Menu & Cost','ใส่วัตถุดิบทีละอย่าง ระบบคิดต้นทุน กำไร และ Margin ให้ทันที','app.html?demo=1#/menu'],
    ['kitchen','Kitchen Display','จอสำหรับครัว ตัวใหญ่ อ่านง่าย มีตัวจับเวลาต่อออเดอร์','app.html?demo=1#/kitchen'],
    ['stock','Stock','เตือนวัตถุดิบต่ำ และคาดการณ์ปริมาณที่ต้องใช้พรุ่งนี้','app.html?demo=1#/stock'],
    ['customers','Customers','แบ่งกลุ่มลูกค้า VIP/ประจำ/ใกล้หาย พร้อมเมนูโปรดของแต่ละคน','app.html?demo=1#/customers'],
    ['marketing','Marketing','วัด ROAS และ CAC ของทุกแคมเปญ รู้ว่าควรเพิ่มหรือหยุดงบ','app.html?demo=1#/marketing'],
    ['promotion','Promotion Builder','ตอบ 5 คำถาม ได้โปรโมชันที่ตรงกับเป้าหมายจริง','app.html?demo=1#/promotion'],
    ['analytics','Analytics','ยอดขาย สินค้า ลูกค้า การตลาด และกำไรสุทธิ ในที่เดียว','app.html?demo=1#/analytics']
  ].map(([ic,t,d,h])=>`<a class="card card-p card-hover" href="${h}">
      <div class="row g10">${(window.ICON||(()=>''))(ic,19)}<h4>${t}</h4></div>
      <p class="t-sm muted mt8" style="line-height:1.65">${d}</p>
      <div class="t-sm b7 mt12" style="color:var(--brand)">เปิดดู →</div></a>`).join('');

  /* ---- AI demo ---- */
  document.getElementById('aiQs').innerHTML = [
    '“วันนี้ร้านเป็นยังไง?”','“เมนูไหนควรขึ้นราคา?”','“พรุ่งนี้ต้องซื้อวัตถุดิบอะไร?”',
    '“ถ้ามีงบโฆษณา 10,000 บาทควรยิงอะไร?”','“ทำไมกำไรลด?”','“เมนูไหนควรหยุดขาย?”'
  ].map(q=>`<div class="row g10"><span class="dot dot-good"></span><span class="b6">${q}</span></div>`).join('');

  document.getElementById('aiDemo').innerHTML = `
    <div class="msg msg-me" style="align-self:flex-end">วันนี้ร้านเป็นยังไง แล้วทำไมกำไรลด?</div>
    <div class="msg msg-ai" style="max-width:100%">
      <b>สรุปวันนี้ (${U.fullToday()})</b><br>
      ยอดขาย <b class="num">${U.baht(D.today.revenue)}</b> เพิ่มขึ้น <b class="num" style="color:var(--good)">12.0%</b>
      จากเมื่อวาน แต่กำไรลดลง <b class="num" style="color:var(--bad)">4.0%</b>
      เพราะต้นทุนหมูสับปรับขึ้น <b class="num">8%</b> (153 → 165 บาท/กก.)
      ทำให้มาร์จิ้นกลุ่มเมนูหมูลดจาก 38.4% เหลือ 36.8%
      <div class="col g8 mt12">
        <div class="rec" style="background:var(--surface)"><span class="rn">1</span>
          <div class="t-sm"><b>ปรับราคากะเพราหมูกรอบ 65 → 69 บาท</b><br>
          <span class="muted">กู้กำไรได้ ~฿372/วัน · ยังต่ำกว่าราคาเฉลี่ยคู่แข่ง 72 บาท</span></div></div>
        <div class="rec" style="background:var(--surface)"><span class="rn">2</span>
          <div class="t-sm"><b>ทำ Bundle กะเพรา + เครื่องดื่ม 75 บาท</b><br>
          <span class="muted">ดัน AOV จาก ฿65 → ฿73 (+฿2,272/วัน)</span></div></div>
      </div>
      <div class="row g8 mt12"><a class="btn btn-ai btn-sm" href="app.html?demo=1#/advisor">ทำเลย</a>
        <a class="btn btn-ghost btn-sm" href="app.html?demo=1#/analytics">ดูรายละเอียด</a></div>
    </div>
    <div class="chips"><span class="chip">เมนูไหนควรหยุดขาย?</span><span class="chip">ควรทำ Promotion อะไร?</span></div>`;

  /* ---- pricing ---- */
  document.getElementById('pricing').innerHTML = [
    { n:'Starter', p:'ฟรี', s:'ตลอดชีพ', d:'สำหรับร้านที่กำลังจะเปิด',
      li:['1 ร้าน · 1 ผู้ใช้','เมนูไม่เกิน 20 รายการ','Orders + Kitchen Display','Dashboard พื้นฐาน'], cta:'เริ่มสร้างร้าน', hot:false },
    { n:'Growth', p:'฿590', s:'/เดือน', d:'สำหรับร้านที่ขายทุกวันและอยากโต',
      li:['เมนูไม่จำกัด · 5 ผู้ใช้','Stock + CRM + Marketing','Promotion Builder','AI Advisor เต็มรูปแบบ','Analytics ย้อนหลัง 12 เดือน'], cta:'ทดลองใช้ 14 วัน', hot:true },
    { n:'Multi-store', p:'฿1,490', s:'/เดือน', d:'สำหรับเจ้าของหลายสาขา',
      li:['ไม่จำกัดสาขา','เทียบผลงานระหว่างสาขา','Roles & Permissions','Supplier + ใบสั่งซื้อ','ผู้ช่วยดูแลบัญชีรายเดือน'], cta:'คุยกับทีมงาน', hot:false }
  ].map(t=>`<div class="card card-p ${t.hot?'':''}" style="${t.hot?'border-color:var(--brand);box-shadow:var(--sh-2);position:relative':''}">
      ${t.hot?'<span class="badge badge-brand" style="position:absolute;top:-12px;left:22px">แนะนำ</span>':''}
      <div class="between"><h4>${t.n}</h4>${t.hot?'<span class="badge badge-brand">แนะนำ</span>':''}</div>
      <div class="row g6 mt12" style="align-items:baseline">
        <span class="num b8" style="font-size:32px;letter-spacing:-.03em">${t.p}</span>
        <span class="muted t-sm b6">${t.s}</span></div>
      <p class="t-sm muted mt4">${t.d}</p>
      <div class="col g8 mt16">${t.li.map(x=>`<div class="check"><i>✓</i><span>${x}</span></div>`).join('')}</div>
      <a class="btn ${t.hot?'btn-primary':'btn-ghost'} btn-block mt20" href="onboarding.html">${t.cta}</a>
    </div>`).join('');

  /* smooth scroll */
  document.querySelectorAll('.lp-links a[href^="#"]').forEach(a=>{
    a.onclick = e => { const el = document.querySelector(a.getAttribute('href'));
      if(el){ e.preventDefault(); window.scrollTo({top:el.offsetTop-70,behavior:'smooth'}); } };
  });
})();
