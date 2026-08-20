/* ============================================================
   PAGES (P1/P2) — Analytics · AI Advisor · Settings
   ============================================================ */
(function () {
  'use strict';
  const D = window.DB, U = window.UI, A = window.APP;
  const ICO = (n, s2) => (window.ICON ? window.ICON(n, s2) : '');
  const st = () => A.state;

  /* ============================================================
     ANALYTICS
     ============================================================ */
  window.PAGES.analytics = function (el, actions, q) {
    let tab = q.tab || 'sales';
    let range = 30;
    actions.innerHTML = `
      <div class="tabs" id="rTabs">
        <button data-r="7">7 วัน</button><button data-r="30" class="on">30 วัน</button>
        <button data-r="mtd">เดือนนี้</button></div>
      <button class="btn btn-ghost btn-sm" id="anExp">${ICO('download',16)} Export</button>`;
    actions.querySelector('#anExp').onclick = () => exportTab();
    actions.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      range = b.dataset.r === 'mtd' ? 'mtd' : +b.dataset.r;
      actions.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('on',x===b)); paint(); });

    el.innerHTML = `<div class="underline-tabs mb24" id="anTabs"></div><div id="anBody"></div>`;
    const TABS = [['sales','Sales','money'],['product','Product','menu'],['customer','Customer','customers'],
                  ['marketing','Marketing','marketing'],['profit','Profit','analytics']];

    const paint = () => {
      el.querySelector('#anTabs').innerHTML = TABS.map(([k,l,ic])=>`
        <button data-t="${k}" class="${tab===k?'on':''}">${ICO(ic,16)} ${l}</button>`).join('');
      el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
      el.querySelector('#anBody').innerHTML = ({ sales:vSales, product:vProduct, customer:vCustomer,
        marketing:vMarketing, profit:vProfit })[tab]();
      const chart = el.querySelector('[data-heat]'); if (chart) chart.innerHTML = U.heatmap();
      el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => A.go(b.dataset.go));
      el.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => A.aiAsk(b.dataset.ask));
    };

    /* Export ข้อมูลของแท็บที่กำลังดูอยู่เป็น CSV (ฝั่ง browser ล้วน) */
    function exportTab(){
      const m = D.month, head = [['StreetFood OS — รายงาน Analytics'],
        ['ร้าน', D.store.name], ['วันที่ออกรายงาน', U.fullToday()],
        ['ช่วงข้อมูล', range === 7 ? '7 วันย้อนหลัง' : range === 30 ? '30 วันย้อนหลัง' : 'ตั้งแต่ต้นเดือน'], []];
      let rows, name;
      if (tab === 'sales') {
        name = 'analytics-sales';
        rows = head.concat([['วันที่','ยอดขาย (บาท)','จำนวนออเดอร์','กำไรขั้นต้น (บาท)','Average Order (บาท)']],
          rangeData().map(r => [U.dayLabel(r.d), r.revenue, r.orders, r.profit, Math.round(r.revenue/r.orders)]),
          [[]], [['ยอดขายรายชั่วโมง (วันนี้)','บาท']], D.hourly.map(h => [h.h + ':00', h.r]));
      } else if (tab === 'product') {
        name = 'analytics-product';
        rows = head.concat([['เมนู','หมวด','ราคาขาย','ต้นทุน','กำไรต่อจาน','Margin (%)','ขายวันนี้ (จาน)','ยอดขาย (บาท)','กำไรรวม (บาท)']],
          st().menu.map(x => { const u = A.todayUnits()[x.id] || 0;
            return [x.name, x.cat, x.price, x.cost, x.profit, x.margin.toFixed(2), u, u*x.price, u*x.profit]; }));
      } else if (tab === 'customer') {
        name = 'analytics-customer';
        rows = head.concat([['กลุ่มลูกค้า','จำนวน (คน)','สัดส่วน (%)','คำอธิบาย']],
          D.segments.map(x => [x.label, x.n, (x.n/D.crm.total*100).toFixed(2), x.desc]),
          [[]], [['ลูกค้าทั้งหมด', D.crm.total], ['ลูกค้าใหม่ 30 วัน', D.crm.new30],
                 ['Repeat rate (%)', D.crm.repeatRate], ['CLV เฉลี่ย (บาท)', D.crm.clv],
                 ['หายไปเกิน 30 วัน (คน)', D.crm.lost]]);
      } else if (tab === 'marketing') {
        name = 'analytics-marketing';
        rows = head.concat([['Campaign','ช่องทาง','สถานะ','งบที่ใช้ (บาท)','รายได้ (บาท)','ROAS (เท่า)','ออเดอร์','ลูกค้าใหม่','CAC (บาท)']],
          st().campaigns.map(c => [c.name, c.ch, c.st === 'active' ? 'กำลังยิง' : 'หยุดชั่วคราว',
            c.spend, c.revenue, c.roas.toFixed(2), c.orders, c.newCust, Math.round(c.cac)]),
          [[]], [['รวมงบโฆษณา', D.marketing.spend], ['รวมรายได้จากโฆษณา', D.marketing.revenue],
                 ['ROAS รวม (เท่า)', D.marketing.roas.toFixed(2)], ['CAC เฉลี่ย (บาท)', Math.round(D.marketing.cac)]]);
      } else {
        name = 'analytics-profit';
        rows = head.concat([['รายการ','จำนวนเงิน (บาท)','% ของยอดขาย']],
          [['Revenue', m.revenue, '100.00'],
           ['Food Cost', -m.foodCost, (m.foodCost/m.revenue*100).toFixed(2)],
           ['Labor', -m.labor, (m.labor/m.revenue*100).toFixed(2)],
           ['Rent', -m.rent, (m.rent/m.revenue*100).toFixed(2)],
           ['Marketing', -m.marketing, (m.marketing/m.revenue*100).toFixed(2)],
           ['Other Expenses', -m.other, (m.other/m.revenue*100).toFixed(2)],
           ['Gross Profit', m.grossProfit, (m.grossProfit/m.revenue*100).toFixed(2)],
           ['Net Profit', m.netProfit, m.netMargin.toFixed(2)]],
          [[]], [['คาดการณ์ยอดขายสิ้นเดือน', m.projected], ['เป้ายอดขายเดือนนี้', D.store.goalMonth]]);
      }
      U.csv(name + '-19-08-2569.csv', rows);
    }

    function rangeData(){
      if (range === 7) return D.trend7;
      if (range === 30) return D.trend30;
      return D.trend30.slice(-D.month.days);
    }
    function sums(){
      const r = rangeData();
      return { revenue:r.reduce((s,x)=>s+x.revenue,0), orders:r.reduce((s,x)=>s+x.orders,0),
               profit:r.reduce((s,x)=>s+x.profit,0), days:r.length };
    }

    function vSales(){
      const s = sums();
      return `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'Revenue', icon:ICO('money'), value:U.baht(s.revenue),
          foot:U.delta(6.8)+' <span class="t-xs muted">เทียบช่วงก่อน</span>' })}
        ${U.kpi({ label:'Orders', icon:ICO('receipt'), value:U.nf(s.orders),
          foot:U.delta(5.2)+` <span class="t-xs muted">${U.nf(s.orders/s.days,0)} บิล/วัน</span>` })}
        ${U.kpi({ label:'Average Order Value', icon:ICO('report'), value:U.baht(s.revenue/s.orders,0),
          foot:U.delta(1.5)+' <span class="t-xs muted">เป้า ฿73</span>' })}
        ${U.kpi({ label:'ยอดขายเฉลี่ย/วัน', icon:ICO('clock'), value:U.baht(s.revenue/s.days),
          foot:`<span class="badge ${s.revenue/s.days>=D.month.dailyTarget?'badge-good':'badge-warn'}">เป้า ${U.baht(D.month.dailyTarget)}</span>` })}
      </div>
      <div class="card mb16">
        <div class="card-h"><div><h4>Sales Trend</h4>
          <div class="t-sm muted mt4">${range===7?'7 วันย้อนหลัง':range===30?'30 วันย้อนหลัง':'ตั้งแต่ต้นเดือน'}</div></div>
          <div class="legend"><span class="lk"><i class="sw" style="background:${range===7?'var(--c1)':'var(--c2)'}"></i>Revenue</span>
            ${range===7?'<span class="lk"><i class="sw" style="background:var(--c3)"></i>Profit</span>':''}</div></div>
        <div class="card-b">
          ${range===7
            ? U.comboChart(D.trend7.map((r,i)=>({label:U.dayLabel(r.d),revenue:r.revenue,profit:r.profit,hi:i===6})),
                { target:D.month.dailyTarget })
            : U.areaChart(rangeData().map(r=>r.revenue), { h:230, labels:i=>i%4===0?U.dayLabel(rangeData()[i].d):'' })}
        </div>
      </div>
      <div class="grid g-2">
        <div class="card"><div class="card-h"><h4>ยอดขายรายชั่วโมง</h4>
          <span class="badge badge-brand">พีค 11:00–13:00 = 34% ของวัน</span></div>
          <div class="card-b">${U.hBars(D.hourly.map(h=>({label:h.h+':00',v:h.r,
            color:h.r>3000?'var(--brand)':h.r>1500?'var(--c5)':undefined})),{fmt:U.baht})}</div></div>
        <div class="card"><div class="card-h"><h4>ช่วงเวลาที่ขายดี (วัน × ชั่วโมง)</h4>
          <span class="badge">ยิ่งเข้ม = ยิ่งคึกคัก</span></div>
          <div class="card-b"><div data-heat></div>
            <div class="ai-strip mt16"><div class="ic">${ICO('advisor',15)}</div><div class="t-sm">
              วันศุกร์–เสาร์เย็น (17:00–19:00) เป็นช่วงที่โตเร็วที่สุด (+18% ใน 2 สัปดาห์)
              แต่ร้านปิด 20:00 — ถ้ายืดเป็น 21:00 คาดว่าจะได้เพิ่มราว ${U.baht(1400)}/สัปดาห์
              <button class="btn btn-xs btn-ai mt8" data-ask="ควรทำ Promotion อะไร?">ถาม AI ต่อ</button></div></div></div></div>
      </div>`;
    }

    function vProduct(){
      const lines = A.todayLines().slice().sort((a,b)=>b.revenue-a.revenue);
      const M = st().menu;
      const byProfit = M.slice().sort((a,b)=>b.profit-a.profit);
      const byMargin = M.slice().sort((a,b)=>a.margin-b.margin);
      const table = (title, rows, cols, note) => `<div class="card">
        <div class="card-h"><h4>${title}</h4>${note?`<span class="badge">${note}</span>`:''}</div>
        <div class="scroll-x"><table class="tbl"><thead><tr>${cols.map(c=>`<th class="${c[2]||''}">${c[0]}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]||''}">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;

      return `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'Best Seller วันนี้', icon:ICO('analytics'), value:lines[0].emoji+' '+U.nf(lines[0].units),
          foot:`<span class="t-xs muted">${U.esc(lines[0].name)} · ${U.baht(lines[0].revenue)}</span>` })}
        ${U.kpi({ label:'Worst Seller', icon:ICO('alert'), iconBg:'var(--bad-soft)', value:'0 จาน',
          foot:`<span class="t-xs muted">กะเพราทะเล (วัตถุดิบหมด)</span>` })}
        ${U.kpi({ label:'กำไรต่อจานสูงสุด', icon:ICO('money'), iconBg:'var(--good-soft)', value:U.baht(byProfit[0].profit),
          foot:`<span class="t-xs muted">${U.esc(byProfit[0].name)}</span>` })}
        ${U.kpi({ label:'Margin ต่ำสุด', icon:ICO('alert'), iconBg:'var(--warn-soft)', value:U.pc(byMargin[0].margin),
          foot:`<span class="t-xs muted">${U.esc(byMargin[0].name)} — ควรทบทวนราคา</span>` })}
      </div>
      <div class="grid g-2 mb16">
        ${table('เมนูขายดี (Best Seller)', lines.filter(l=>l.units>0).slice(0,6), [
          ['Menu', l=>`<div class="row g8"><span style="font-size:17px">${l.emoji}</span><b class="t-sm">${U.esc(l.name)}</b></div>`],
          ['จำนวน', l=>U.nf(l.units), 'r num b7'],
          ['Revenue', l=>U.baht(l.revenue), 'r num'],
          ['Profit', l=>`<span style="color:var(--good-ink)">${U.baht(l.profit)}</span>`, 'r num b7']], 'วันนี้')}
        ${table('เมนูที่ควรทบทวน', lines.filter(l=>l.units<=14).slice(0,6), [
          ['Menu', l=>`<div class="row g8"><span style="font-size:17px">${l.emoji}</span><b class="t-sm">${U.esc(l.name)}</b></div>`],
          ['จำนวน', l=>U.nf(l.units), 'r num'],
          ['Margin', l=>U.marginBadge(l.margin), 'r'],
          ['ข้อเสนอ', l=>l.units===0?'<span class="badge badge-bad">หยุดขาย/แก้สูตร</span>':'<span class="badge badge-warn">ดันการขาย</span>', 'r']], 'ขายน้อยกว่า 15 จาน')}
      </div>
      <div class="grid g-2 mb16">
        <div class="card"><div class="card-h"><h4>สัดส่วนยอดขายตามเมนู</h4></div>
          <div class="card-b">${U.hBars(lines.filter(l=>l.units>0).slice(0,8)
            .map(l=>({label:l.emoji+' '+l.name,v:l.revenue,sub:'('+l.units+' จาน)'})),{fmt:U.baht})}</div></div>
        <div class="card"><div class="card-h"><h4>กำไรต่อจาน vs จำนวนที่ขายได้</h4>
          <span class="badge badge-info">ควรดันมุมขวาบน</span></div>
          <div class="card-b">
            ${(function(){
              const W=420,H=260,PL=44,PB=34;
              const maxU=Math.max(...lines.map(l=>l.units))*1.15, maxP=Math.max(...st().menu.map(m=>m.profit))*1.2;
              let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" style="height:260px"><g class="chart-grid">`;
              for(let i=0;i<=4;i++){const gy=10+(H-PB-10)*i/4;s+=`<line x1="${PL}" y1="${gy}" x2="${W-10}" y2="${gy}"/>
                <text class="chart-ax" x="${PL-6}" y="${gy+4}" text-anchor="end">฿${U.nf(maxP-maxP*i/4,0)}</text>`;}
              s+=`</g>`;
              lines.forEach(l=>{ const m=D.mi(l.id)||{profit:0};
                const x=PL+(l.units/maxU)*(W-PL-16), y=H-PB-(m.profit/maxP)*(H-PB-10);
                s+=`<circle cx="${x}" cy="${y}" r="${6+l.units/22}" fill="var(--c1)" opacity=".7"><title>${U.esc(l.name)}: ${l.units} จาน · กำไร ${U.baht(m.profit)}</title></circle>
                    <text class="chart-ax" x="${x}" y="${y-11-l.units/22}" text-anchor="middle" font-size="10">${l.emoji}</text>`;});
              s+=`<text class="chart-ax" x="${(W+PL)/2}" y="${H-6}" text-anchor="middle">จำนวนที่ขายได้วันนี้ (จาน) →</text></svg>`;
              return s; })()}
            <div class="ai-strip mt12"><div class="ic">${ICO('advisor',15)}</div><div class="t-sm">
              กะเพราหมูกรอบอยู่ขวาล่าง (ขายเยอะ กำไรต่อจานน้อย) — เป็นเมนูที่ <b>ขึ้นราคาได้ผลที่สุด</b>
              ขณะที่ชาเย็นอยู่ซ้ายบน (กำไรดี ขายน้อย) — ควรดันด้วย Bundle
              <button class="btn btn-xs btn-ai mt8" data-go="menu">ไปที่ Menu & Cost</button></div></div>
          </div></div>
      </div>`;
    }

    function vCustomer(){
      return `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'New Customers (30 วัน)', icon:ICO('advisor'), value:U.nf(D.crm.new30), foot:U.delta(12.6) })}
        ${U.kpi({ label:'Repeat Rate', icon:ICO('analytics'), iconBg:'var(--good-soft)', value:U.pc(D.crm.repeatRate),
          foot:`<span class="badge badge-good">สูงกว่าค่าเฉลี่ยร้านตามสั่ง (42%)</span>` })}
        ${U.kpi({ label:'Customer Lifetime Value', icon:ICO('money'), value:U.baht(D.crm.clv),
          foot:`<span class="t-xs muted">CAC ${U.baht(D.marketing.cac,0)} → คุ้ม ${U.nf(D.crm.clv/D.marketing.cac,1)} เท่า</span>` })}
        ${U.kpi({ label:'ลูกค้าที่หายไป', icon:ICO('alert'), iconBg:'var(--bad-soft)', value:U.nf(D.crm.lost),
          foot:`<span class="t-xs muted">มูลค่าที่เสีย ${U.baht(D.crm.lost*120)}/เดือน</span>` })}
      </div>
      <div class="grid g-2 mb16">
        <div class="card"><div class="card-h"><h4>Segment Breakdown</h4></div>
          <div class="card-b">${U.hBars(D.segments.map(s=>({label:s.label,v:s.n,color:s.color})),
            { fmt:v=>U.nf(v)+' คน' })}</div></div>
        <div class="card"><div class="card-h"><h4>ลูกค้าใหม่ vs ซื้อซ้ำ (รายสัปดาห์)</h4></div>
          <div class="card-b">
            ${U.comboChart([
              {label:'สัปดาห์ 1',revenue:64,profit:132},{label:'สัปดาห์ 2',revenue:52,profit:148},
              {label:'สัปดาห์ 3',revenue:48,profit:161},{label:'สัปดาห์นี้',revenue:22,profit:74,hi:true}
            ], { h:220, bars:'revenue', lines:['profit'], colors:{revenue:'var(--c2)',profit:'var(--c3)'} })}
            <div class="legend mt12"><span class="lk"><i class="sw" style="background:var(--c1)"></i>ลูกค้าใหม่ (คน)</span>
              <span class="lk"><i class="sw" style="background:var(--c3)"></i>ลูกค้าซื้อซ้ำ (คน)</span></div>
            <div class="ai-strip mt12"><div class="ic">${ICO('advisor',15)}</div><div class="t-sm">
              ลูกค้าใหม่ลดลงต่อเนื่อง 3 สัปดาห์ (64 → 48) แต่ลูกค้าซื้อซ้ำเพิ่มขึ้น — ฐานลูกค้าประจำแข็งแรง
              แต่ <b>ปากท่อลูกค้าใหม่ตีบ</b> ควรเพิ่มงบโฆษณาที่ ROAS สูงสุด
              <button class="btn btn-xs btn-ai mt8" data-go="marketing">ไปที่ Marketing</button></div></div>
          </div></div>
      </div>`;
    }

    function vMarketing(){
      const M = D.marketing;
      return `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'Ad Spend', icon:ICO('money'), value:U.baht(M.spend), foot:`<span class="t-xs muted">${U.pc(M.spend/D.month.revenue*100)} ของยอดขาย</span>` })}
        ${U.kpi({ label:'ROAS', icon:ICO('analytics'), iconBg:'var(--good-soft)', value:U.nf(M.roas,2)+'x', foot:`<span class="badge badge-good">จุดคุ้มทุน 2.70x</span>` })}
        ${U.kpi({ label:'CAC', icon:ICO('analytics'), value:U.baht(M.cac,0), foot:U.delta(-6.4,{invert:true})+' <span class="t-xs muted">ถูกลง</span>' })}
        ${U.kpi({ label:'Conversion', icon:ICO('analytics'), value:U.pc(M.conversion), foot:`<span class="t-xs muted">${U.nf(M.clicks)} คลิก → ${U.nf(M.newCust)} ลูกค้าใหม่</span>` })}
      </div>
      <div class="grid g-2 mb16">
        <div class="card"><div class="card-h"><h4>ROAS แต่ละ Campaign</h4>
          <span class="badge badge-info">แดง = ต่ำกว่าจุดคุ้มทุน</span></div>
          <div class="card-b">${U.hBars(st().campaigns.map(c=>({ label:c.name, v:c.roas,
            color:c.roas>=4?'var(--good)':c.roas>=2.7?'var(--c5)':'var(--bad)' })),
            { fmt:v=>U.nf(v,2)+'x' })}</div></div>
        <div class="card"><div class="card-h"><h4>เงินที่จ่าย vs เงินที่ได้กลับ</h4></div>
          <div class="card-b">
            ${U.comboChart(st().campaigns.map(c=>({ label:c.name.split(' ')[0], revenue:c.revenue, profit:c.spend })),
              { h:240, lines:['profit'], colors:{revenue:'var(--c1)',profit:'var(--bad)'} })}
            <div class="legend mt12"><span class="lk"><i class="sw" style="background:var(--c1)"></i>รายได้จากโฆษณา</span>
              <span class="lk"><i class="sw" style="background:var(--bad)"></i>งบที่จ่าย</span></div>
          </div></div>
      </div>
      <div class="ai-card"><div class="in">
        <span class="ai-badge">${ICO('advisor',16)} สรุป Marketing</span>
        <h3 class="mt16">ทุก 1 บาทที่จ่ายค่าโฆษณา ได้ยอดขายกลับมา ${U.nf(M.roas,2)} บาท</h3>
        <p class="muted t-sm mt8">แต่ถ้าคิดเป็น "กำไร" ไม่ใช่ "ยอดขาย" — ที่ margin เฉลี่ย ${U.pc(D.month.grossProfit/D.month.revenue*100)}
          หมายความว่าได้กำไรกลับมา ${U.baht(M.roas*D.month.grossProfit/D.month.revenue)} ต่อ 1 บาท
          ซึ่งยังคุ้ม แต่ต้องมี ROAS ไม่ต่ำกว่า <b>2.70x</b> จึงจะไม่ขาดทุน</p>
        <div class="row g8 mt16"><button class="btn btn-ai btn-sm" data-ask="ถ้ามีงบโฆษณา 10,000 บาทควรยิงอะไร?">ถาม AI เรื่องการแบ่งงบ</button>
          <button class="btn btn-ghost btn-sm" data-go="marketing">จัดการ Campaign</button></div>
      </div></div>`;
    }

    function vProfit(){
      const m = D.month;
      const steps = [
        { label:'Revenue',        v:m.revenue },
        { label:'Food Cost',      v:-m.foodCost },
        { label:'Labor',          v:-m.labor },
        { label:'Rent',           v:-m.rent },
        { label:'Marketing',      v:-m.marketing },
        { label:'Other Expenses', v:-m.other },
        { label:'Net Profit',     type:'total' }
      ];
      const rows = [
        ['Revenue', m.revenue, 100, 'var(--c2)'],
        ['Food Cost (ต้นทุนวัตถุดิบ)', -m.foodCost, m.foodCost/m.revenue*100, 'var(--c5)'],
        ['Labor (ค่าแรงพนักงาน 3 คน)', -m.labor, m.labor/m.revenue*100, 'var(--c4)'],
        ['Rent (ค่าเช่าที่ + ค่าน้ำไฟ)', -m.rent, m.rent/m.revenue*100, 'var(--c6)'],
        ['Marketing (ค่าโฆษณา)', -m.marketing, m.marketing/m.revenue*100, 'var(--c1)'],
        ['Other Expenses (แก๊ส/ขนส่ง/เบ็ดเตล็ด)', -m.other, m.other/m.revenue*100, 'var(--muted-2)']
      ];
      return `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'Revenue (MTD)', icon:ICO('money'), value:U.baht(m.revenue),
          foot:`<span class="t-xs muted">${m.days} วัน · เฉลี่ย ${U.baht(m.revenue/m.days)}/วัน</span>` })}
        ${U.kpi({ label:'Gross Profit', icon:ICO('dashboard'), iconBg:'var(--info-soft)', value:U.baht(m.grossProfit),
          foot:`<span class="badge badge-good">${U.pc(m.grossProfit/m.revenue*100)} ของยอดขาย</span>` })}
        ${U.kpi({ label:'Net Profit', icon:ICO('money'), iconBg:'var(--good-soft)', value:U.baht(m.netProfit),
          foot:`<span class="badge ${m.netMargin>=10?'badge-good':'badge-warn'}">Net margin ${U.pc(m.netMargin)}</span>` })}
        ${U.kpi({ label:'คาดการณ์สิ้นเดือน', icon:ICO('advisor'), iconBg:'var(--ai-soft)', value:U.baht(m.projected),
          foot:`<span class="badge ${m.projected>=D.store.goalMonth?'badge-good':'badge-warn'}">เป้า ${U.baht(D.store.goalMonth)}</span>` })}
      </div>

      <div class="card mb16">
        <div class="card-h"><div><h4>โครงสร้างกำไร (P&amp;L) — ${U.monthLabel()}</h4>
          <div class="t-sm muted mt4">จากยอดขายทั้งหมด เหลือเป็นกำไรสุทธิเท่าไร</div></div>
          <span class="badge badge-good">Net ${U.pc(m.netMargin)}</span></div>
        <div class="card-b"><div class="scroll-x">${U.waterfall(steps)}</div></div>
      </div>

      <div class="grid g-2-1">
        <div class="card">
          <div class="card-h"><h4>รายละเอียดรายรับ–รายจ่าย</h4></div>
          <div class="scroll-x"><table class="tbl"><thead><tr>
            <th>รายการ</th><th class="r">จำนวนเงิน</th><th class="r">% ของยอดขาย</th><th style="width:130px">สัดส่วน</th></tr></thead>
            <tbody>${rows.map(([l,v,p,c])=>`<tr>
              <td><b class="t-sm">${l}</b></td>
              <td class="r num b7" style="color:${v<0?'var(--bad)':'var(--ink)'}">${v<0?'−':''}${U.baht(Math.abs(v))}</td>
              <td class="r num">${U.pc(p)}</td>
              <td><div class="bar"><i style="width:${Math.min(100,p)}%;background:${c}"></i></div></td></tr>`).join('')}
              <tr style="background:var(--good-soft)"><td><b>Net Profit</b></td>
                <td class="r num b8" style="color:var(--good-ink);font-size:16px">${U.baht(m.netProfit)}</td>
                <td class="r num b8">${U.pc(m.netMargin)}</td>
                <td><div class="bar bar-good"><i style="width:${m.netMargin}%"></i></div></td></tr>
            </tbody></table></div>
          <div class="card-f"><div class="t-sm muted">
            ร้านตามสั่งที่บริหารดีมักมี Net margin 10–15% — ร้านคุณอยู่ที่ ${U.pc(m.netMargin)} ถือว่าอยู่ในเกณฑ์ดี
            แต่ Food cost ${U.pc(m.foodCost/m.revenue*100)} สูงกว่าค่าแนะนำ (55–60%)</div></div>
        </div>

        <div class="col g16">
          <div class="card"><div class="card-h"><h4>สัดส่วนค่าใช้จ่าย</h4></div>
            <div class="card-b ctr">
              ${U.donut([
                {label:'Food Cost',v:m.foodCost,color:'var(--c5)'},
                {label:'Labor',v:m.labor,color:'var(--c4)'},
                {label:'Rent',v:m.rent,color:'var(--c6)'},
                {label:'Marketing',v:m.marketing,color:'var(--c1)'},
                {label:'Other',v:m.other,color:'var(--muted-2)'},
                {label:'Net Profit',v:m.netProfit,color:'var(--good)'}
              ], { center:U.pc(m.netMargin,0), sub:'Net margin', size:190 })}
            </div></div>
          <div class="ai-card"><div class="in">
            <span class="ai-badge">${ICO('advisor',16)} ทางเพิ่มกำไร 3 ทาง</span>
            <div class="col g10 mt16">
              ${[[`ลด Food cost 3% → กำไรเพิ่ม ${U.baht(m.revenue*0.03)}`,'เจรจาราคาหมูกับซัพพลายเออร์รายที่ 2 หรือลดขนาดพอร์ชันเมนู margin ต่ำ'],
                 [`ขึ้นราคาเมนู margin ต่ำ → กำไรเพิ่ม ${U.baht(11160)}`,'กะเพราหมูกรอบ 65 → 69 บาท (ขายดีสุด margin ต่ำสุด)'],
                 [`หยุด Campaign ROAS ต่ำ → ประหยัด ${U.baht(1600)}`,'"Boost เมนูใหม่ กะเพราทะเล" ROAS 1.69x ต่ำกว่าจุดคุ้มทุน']]
                .map(([t,d],i)=>`<div class="rec"><span class="rn">${i+1}</span>
                  <div class="t-sm"><b>${t}</b><br><span class="muted">${d}</span></div></div>`).join('')}
            </div>
            <div class="row g8 mt16"><button class="btn btn-ai btn-sm" data-go="advisor">ดูแผนเต็มจาก AI</button></div>
          </div></div>
        </div>
      </div>`;
    }
    paint();
  };

  /* ============================================================
     AI ADVISOR
     ============================================================ */
  window.PAGES.advisor = function (el, actions) {
    actions.innerHTML = `<span class="badge badge-ai badge-lg">${ICO('advisor',16)} อ่านข้อมูล 11 โมดูลแล้ว</span>
      <button class="btn btn-ai btn-sm" id="adChat">เปิดแชทถาม AI</button>`;
    actions.querySelector('#adChat').onclick = () => A.aiOpen(true);

    const t = A.today(), m = D.month;
    el.innerHTML = `
    <!-- วันนี้ควรทำอะไร -->
    <div class="ai-card mb16"><div class="in">
      <div class="between wrap g12">
        <div><span class="ai-badge">${ICO('advisor',16)} แผนงานวันนี้</span>
          <h2 class="mt12">มี 3 เรื่องที่ควรทำวันนี้</h2>
          <p class="muted t-sm mt8">เรียงตามผลกระทบต่อกำไร มากไปน้อย</p></div>
        <div class="tile" style="min-width:190px">
          <div class="t-xs muted b6">ผลรวมที่คาดว่าจะได้เพิ่ม</div>
          <div class="num b8" style="font-size:23px;color:var(--good-ink)">+${U.baht(21304)}</div>
          <div class="t-xs muted">ต่อเดือน ถ้าทำครบทั้ง 3 ข้อ</div></div>
      </div>
      <div class="col g12 mt20" id="todoList"></div>
    </div></div>

    <!-- ถามอะไรได้บ้าง -->
    <div class="card card-p mb16">
      <div class="between mb16"><h4>ถามอะไรได้บ้าง</h4>
        <span class="t-sm muted">AI ตอบโดยอ้างอิงข้อมูลจริงในระบบ</span></div>
      <div class="grid g-4" id="qList"></div>
    </div>

    <!-- Insight per module -->
    <div class="between mb16"><h3>AI Insight แยกตามโมดูล</h3>
      <span class="t-sm muted">ทุกหน้าในระบบมี Insight ของตัวเอง ไม่ใช่แค่ Chatbot</span></div>
    <div class="grid g-2 mb16" id="modIn"></div>

    <!-- Data → Insight → Action -->
    <div class="card card-p">
      <div class="between mb16 wrap g12"><div><h4>AI ทำงานอย่างไร</h4>
        <div class="t-sm muted mt4">ทุกคำแนะนำต้องอ้างอิงตัวเลขจริงในระบบ ไม่ใช่คำแนะนำทั่วไป</div></div></div>
      <div class="grid g-4">
        ${[['1. Data','dashboard','อ่านข้อมูลจริง',`ยอดขาย ${U.baht(t.revenue)} · ${t.orders} บิล · ต้นทุนหมู +8% · Stock หมูเหลือ 3.2 kg`],
           ['2. Insight','search','หาความสัมพันธ์','ยอดขายขึ้นแต่กำไรลง เพราะเมนูที่ขายดีที่สุดคือเมนูที่ margin ต่ำที่สุด'],
           ['3. Recommendation','advisor','เสนอทางเลือกพร้อมตัวเลข','ขึ้นราคา 4 บาท (+฿372/วัน) หรือทำ Bundle (+฿2,272/วัน)'],
           ['4. Action','check','กดทำได้ทันที','ปุ่ม "ทำเลย" พาไปหน้าที่แก้ไขได้จริง ไม่ต้องหาเอง']]
          .map(([s,ic,t2,d])=>`<div class="tile">
            <div class="row g10">${ICO(ic,18)}<b class="t-sm">${s}</b></div>
            <div class="b7 mt8 t-sm">${t2}</div>
            <div class="t-sm muted mt4" style="line-height:1.6">${d}</div></div>`).join('')}
      </div>
    </div>`;

    /* todo list */
    const paintTodo = () => {
      el.querySelector('#todoList').innerHTML = D.ai.todo.map((x,i)=>{
        const done = st().doneTodos[i];
        return `<div class="rec" style="background:var(--surface);${done?'opacity:.55':''}">
          <span class="rn" style="background:${done?'var(--good)':x.urgent?'var(--bad)':'var(--ink)'}">${done?'✓':i+1}</span>
          <div class="grow">
            <div class="row g8 wrap"><b class="${done?'':'b7'}" style="${done?'text-decoration:line-through':''}">${U.esc(x.t)}</b>
              ${x.urgent?'<span class="badge badge-bad">ด่วน</span>':''}</div>
            <div class="t-sm muted mt4">${U.esc(x.d)}</div>
          </div>
          <div class="row g8">
            ${done ? '<span class="badge badge-good">ทำแล้ว</span>' :
              `<button class="btn btn-ai btn-sm" data-do="${i}">${U.esc(x.cta)} →</button>
               <button class="btn btn-ghost btn-sm" data-skip="${i}">ทำแล้ว</button>`}
          </div></div>`;
      }).join('');
      el.querySelectorAll('[data-do]').forEach(b => b.onclick = () => {
        const map = { stock:'stock', marketing:'marketing', promo:'promotion' };
        A.go(map[D.ai.todo[+b.dataset.do].act] || 'dashboard'); });
      el.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => {
        st().doneTodos[+b.dataset.skip] = true; U.toast('ทำเครื่องหมายว่าทำแล้ว','ok'); paintTodo(); });
    };
    paintTodo();

    /* question grid */
    const QS = ['วันนี้ร้านเป็นยังไง?','เมนูไหนควรขึ้นราคา?','พรุ่งนี้ต้องซื้อวัตถุดิบอะไร?',
      'ถ้ามีงบโฆษณา 10,000 บาทควรยิงอะไร?','ทำไมกำไรลด?','เมนูไหนควรหยุดขาย?',
      'ควรทำ Promotion อะไร?','เดือนนี้จะถึงเป้าไหม?'];
    el.querySelector('#qList').innerHTML = QS.map(q=>`<button class="choice" data-q="${U.esc(q)}" style="padding:13px">
      <span class="ci" style="width:32px;height:32px;background:var(--brand-soft);color:var(--brand-ink)">${ICO('advisor',16)}</span>
      <span class="grow b6 t-sm" style="text-align:left">${U.esc(q)}</span></button>`).join('');
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => A.aiAsk(b.dataset.q));

    /* module insights */
    const MODS = [
      { ic:'dashboard', mod:'Dashboard', to:'dashboard', head:D.ai.headline,
        body:`เกินเป้ารายวัน ${U.pc(t.revenue/m.dailyTarget*100-100)} แต่กำไรสวนทาง — ปัญหาอยู่ที่โครงสร้างต้นทุน ไม่ใช่ยอดขาย` },
      { ic:'menu', mod:'Menu & Cost', to:'menu', head:`3 เมนูมี Margin ต่ำกว่าเป้า 35%`,
        body:`กะเพราหมูกรอบ (${U.pc(D.mi('m1').margin)}) เป็นเมนูขายดีที่สุดแต่กำไรน้อยสุด ขึ้นราคา 4 บาท = +${U.baht((A.todayUnits()['m1'] || 0)*4)}/วัน` },
      { ic:'stock', mod:'Stock', to:'stock', head:`หมูสับจะไม่พอขายพรุ่งนี้`,
        body:`ต้องใช้ 7.8 kg แต่มี 3.2 kg — ถ้าไม่สั่งวันนี้ จะขายได้ถึงประมาณ 12:40 เท่านั้น` },
      { ic:'customers', mod:'Customers', to:'customers', head:`ลูกค้า ${D.crm.lost} คนหายไปเกิน 30 วัน`,
        body:`มูลค่าที่เสียราว ${U.baht(D.crm.lost*120)}/เดือน ต้นทุนดึงกลับถูกกว่าหาลูกค้าใหม่ ${U.nf(D.marketing.cac/20,1)} เท่า` },
      { ic:'marketing', mod:'Marketing', to:'marketing', head:`1 Campaign ROAS ต่ำกว่าจุดคุ้มทุน`,
        body:`"Boost เมนูใหม่ กะเพราทะเล" ROAS 1.69x — ย้ายงบไป "กะเพรามื้อเที่ยง" (5.92x) จะได้เพิ่ม ${U.baht(7872)}` },
      { ic:'analytics', mod:'Analytics — Profit', to:'analytics?tab=profit', head:`Food cost ${U.pc(m.foodCost/m.revenue*100)} สูงกว่าค่าแนะนำ`,
        body:`Net margin ${U.pc(m.netMargin)} ยังอยู่ในเกณฑ์ดี แต่ถ้าลด Food cost ลง 3% จะได้กำไรเพิ่ม ${U.baht(m.revenue*0.03)}/เดือน` }
    ];
    el.querySelector('#modIn').innerHTML = MODS.map(x=>`
      <div class="card card-p card-hover" data-to="${x.to}" style="cursor:pointer">
        <div class="between"><div class="row g10">${ICO(x.ic,18)}
          <span class="badge">${x.mod}</span></div><span class="muted">→</span></div>
        <h4 class="mt12" style="line-height:1.45">${U.esc(x.head)}</h4>
        <p class="t-sm muted mt8" style="line-height:1.65">${U.esc(x.body)}</p></div>`).join('');
    el.querySelectorAll('[data-to]').forEach(b => b.onclick = () => A.go(b.dataset.to));
  };

  /* ============================================================
     SETTINGS
     ============================================================ */
  window.PAGES.settings = function (el, actions, q) {
    let tab = q.tab || 'store';
    const TABS = [['account','บัญชีและความยินยอม','key'],
      ['store','Store Profile','store'],['users','Users','user'],['staff','Staff','customers'],
      ['roles','Roles & Permissions','key'],['payment','Payment','money'],['noti','Notification','bell'],
      ['integrations','Integrations','settings'],['subscription','Subscription','money']];
    actions.innerHTML = `<button class="btn btn-primary btn-sm" id="sSave">บันทึกการตั้งค่า</button>`;
    actions.querySelector('#sSave').onclick = () => U.toast('บันทึกการตั้งค่าแล้ว','ok');

    el.innerHTML = `<div class="grid" style="grid-template-columns:240px 1fr;gap:16px" id="sWrap">
      <div class="card" style="align-self:start;overflow:hidden"><div class="col" id="sNav" style="padding:8px"></div></div>
      <div id="sBody"></div></div>`;
    if (window.innerWidth < 820) el.querySelector('#sWrap').style.gridTemplateColumns = '1fr';

    const paint = () => {
      el.querySelector('#sNav').innerHTML = TABS.map(([k,l,ic])=>`
        <button class="nav-i ${tab===k?'on':''}" data-t="${k}" style="width:100%;text-align:left">
          <span class="ni">${ICO(ic,18)}</span><span>${l}</span></button>`).join('');
      el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; paint(); });
      el.querySelector('#sBody').innerHTML = ({ account:vAccount, store:vStore, users:vUsers, staff:vStaff,
        roles:vRoles, payment:vPayment, noti:vNoti, integrations:vInteg, subscription:vSub })[tab]();
      if (tab === 'account') mountAccount(el.querySelector('#sBody'));
      const up = el.querySelector('#doUpgrade'); if (up) up.onclick = () => U.toast('ยังไม่เชื่อมต่อระบบชำระเงิน','warn');
      el.querySelectorAll('.switch').forEach(s => s.onclick = () => s.classList.toggle('on'));
    };

    const card = (title, sub, body, foot) => `<div class="card mb16">
      <div class="card-h"><div><h4>${title}</h4>${sub?`<div class="t-sm muted mt4">${sub}</div>`:''}</div>${foot||''}</div>
      <div class="card-b">${body}</div></div>`;

    /* ─── บัญชีและความยินยอม (PDPA) ─────────────────────────────── */
    function vAccount(){
      const A = window.SFOS_AUTH;
      const configured = !!(A && A.ready);
      const signedIn = !!(configured && A.isSignedIn());

      if (!signedIn) {
        return card('บัญชีและความยินยอม', configured ? 'กำลังดูในโหมดเดโม' : 'ยังไม่ได้ตั้งค่าฐานข้อมูล', `
          <div class="ai-strip" style="background:var(--warn-soft);border-color:var(--warn-line)">
            <div class="ic" style="background:var(--warn-soft);color:var(--warn-ink)">${ICO('alert',15)}</div>
            <div class="t-sm"><b>ยังไม่ได้เข้าสู่ระบบ</b><br>
            <span class="muted">${configured
              ? 'ตอนนี้ใช้ข้อมูลตัวอย่างในเครื่อง ไม่มีบัญชีผู้ใช้และไม่บันทึกอะไรลงฐานข้อมูล เข้าสู่ระบบเพื่อใช้ข้อมูลจริงและจัดการความยินยอม'
              : 'ยังไม่ได้ใส่ค่า Supabase ใน <code>assets/js/config.js</code> จึงยังไม่มีระบบสมาชิก'}</span></div></div>
          <div class="row g8 mt16 wrap">
            <a class="btn btn-primary" href="login.html">เข้าสู่ระบบ / สมัครสมาชิก</a>
            <a class="btn btn-ghost" href="privacy.html" target="_blank" rel="noopener">อ่านคำชี้แจงการเก็บข้อมูล</a>
          </div>
          <div class="ai-strip mt16"><div class="ic">${ICO('bell',15)}</div>
            <div class="t-sm">ระบบเก็บข้อมูลส่วนบุคคลเพียง <b>อีเมล</b> อย่างเดียว · รหัสผ่านเก็บเป็น hash อ่านย้อนกลับไม่ได้</div></div>`);
      }
      return card('บัญชีของคุณ','ข้อมูลส่วนบุคคลที่ระบบเก็บมีเพียงอีเมลเท่านั้น', `
          <div class="grid g-2" style="gap:12px">
            <div class="tile"><div class="t-xs muted b6">อีเมล</div>
              <div class="b7 mt4" style="font-size:15.5px;word-break:break-all">${U.esc(A.email() || '—')}</div></div>
            <div class="tile"><div class="t-xs muted b6">วิธีเข้าสู่ระบบ</div>
              <div class="b7 mt4" style="font-size:15.5px">อีเมล + รหัสผ่าน</div></div>
          </div>
          <div class="row g8 mt16 wrap">
            <button class="btn btn-soft btn-sm" id="chgPw">เปลี่ยนรหัสผ่าน</button>
            <button class="btn btn-ghost btn-sm" id="doOut">ออกจากระบบ</button>
          </div>
          <div class="ai-strip mt16"><div class="ic">${ICO('key',15)}</div>
            <div class="t-sm">ระบบไม่เก็บชื่อ เบอร์โทร ที่อยู่ IP หรือพฤติกรรมการใช้งาน
              และรหัสผ่านถูกเก็บเป็น hash อ่านย้อนกลับไม่ได้ —
              <a href="privacy.html" target="_blank" rel="noopener">อ่านคำชี้แจง</a></div></div>`) +
        card('ความยินยอม','ถอนได้ง่ายเท่ากับตอนให้ ผลมีทันที', `<div id="consentBox">
            <div class="t-sm muted">กำลังโหลด…</div></div>`,
          `<span class="badge" id="polVer">เวอร์ชัน ${A.POLICY_VERSION}</span>`) +
        card('ลบบัญชีและข้อมูล','สิทธิที่จะถูกลืม — ทำได้เองทันที ไม่ต้องติดต่อใคร', `
          <div class="caution" style="border-left:3px solid var(--bad);background:var(--bad-soft);border-radius:0 10px 10px 0;padding:15px 18px">
            <div class="lbl" style="font-family:var(--f-mono);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--bad-ink)">ลบแล้วกู้คืนไม่ได้</div>
            <p class="t-sm mt8">จะลบอีเมล บันทึกความยินยอม และสมาชิกภาพร้านของคุณทันที
              และถ้าคุณเป็น<b>เจ้าของร้านคนเดียว</b> ข้อมูลร้านทั้งหมด (เมนู ออเดอร์ ลูกค้า สต็อก)
              จะถูกลบไปพร้อมกัน</p>
          </div>
          <div class="row g8 mt16 wrap">
            <button class="btn btn-bad" id="delAcct">ลบบัญชีของฉัน</button>
            <button class="btn btn-ghost" id="signOutBtn">ออกจากระบบ</button>
          </div>`);
    }

    async function mountAccount(root){
      const A = window.SFOS_AUTH;
      if (!A || !A.ready || !A.isSignedIn()) return;   // โหมดเดโม ไม่มีอะไรต้อง mount

      /* เปลี่ยนรหัสผ่าน — รหัสอยู่ในฟอร์มชั่วคราว ส่งตรงไป Supabase แล้วทิ้ง */
      const cp = root.querySelector('#chgPw');
      if (cp) cp.onclick = () => {
        U.modal({
          title:'เปลี่ยนรหัสผ่าน', icon:ICO('key',20), okText:'บันทึกรหัสผ่านใหม่', cancelText:'ยกเลิก',
          body:`<div class="col g14">
            <div class="field"><label class="label" for="cp1">รหัสผ่านใหม่</label>
              <input class="input" id="cp1" type="password" autocomplete="new-password" placeholder="••••••••">
              <span class="hint">อย่างน้อย ${A.MIN_PW} ตัวอักษร — ยาวสำคัญกว่าอักขระพิเศษ</span></div>
            <div class="field"><label class="label" for="cp2">ยืนยันรหัสผ่านใหม่</label>
              <input class="input" id="cp2" type="password" autocomplete="new-password" placeholder="••••••••"></div>
            <div class="t-xs muted">เปลี่ยนแล้วอุปกรณ์อื่นที่ล็อกอินอยู่จะยังใช้ได้จนกว่า session จะหมดอายุ</div>
          </div>`,
          onOk(el){
            const a = el.querySelector('#cp1').value, b2 = el.querySelector('#cp2').value;
            if (a.length < A.MIN_PW) { U.toast('รหัสผ่านต้องยาวอย่างน้อย ' + A.MIN_PW + ' ตัวอักษร','warn'); return false; }
            if (a !== b2) { U.toast('รหัสผ่านสองช่องไม่ตรงกัน','warn'); return false; }
            A.changePassword(a)
              .then(() => U.toast('เปลี่ยนรหัสผ่านแล้ว','ok'))
              .catch(e => U.toast(e.message,'warn'));
          }
        });
      };
      const out = root.querySelector('#doOut');
      if (out) out.onclick = async () => { await A.signOut(); location.href = 'login.html'; };

      const box = root.querySelector('#consentBox');
      const paint = async () => {
        let cur = {};
        try { cur = await A.myConsents(); }
        catch (e) { box.innerHTML = `<div class="t-sm" style="color:var(--bad-ink)">โหลดไม่สำเร็จ: ${U.esc(e.message)}</div>`; return; }
        box.innerHTML = `<div class="col g10">` + A.PURPOSES.map(p => {
          const r = cur[p.id];
          const on = !!(r && !r.withdrawn_at);
          return `<div class="tile between" style="align-items:flex-start">
            <div class="grow"><b class="t-sm">${U.esc(p.title)}</b>
              ${p.required ? '<span class="badge badge-bad" style="margin-left:6px">จำเป็น</span>'
                           : '<span class="badge" style="margin-left:6px">เลือกได้</span>'}
              <div class="t-xs muted mt4">${U.esc(p.detail)}</div>
              <div class="t-xs mt4" style="color:${on ? 'var(--good-ink)' : 'var(--muted)'}">
                ${on ? '✓ ยินยอมเมื่อ ' + new Date(r.granted_at).toLocaleString('th-TH')
                     : (r ? '✕ ถอนเมื่อ ' + new Date(r.withdrawn_at).toLocaleString('th-TH') : '— ยังไม่ได้ยินยอม')}
                ${r ? ' · นโยบาย ' + U.esc(r.policy_version) : ''}
              </div>
            </div>
            <div class="row g6">
              ${on
                ? (p.required
                    ? `<span class="badge badge-good">ใช้งานอยู่</span>`
                    : `<button class="btn btn-xs btn-soft" data-wd="${p.id}">ถอนความยินยอม</button>`)
                : `<button class="btn btn-xs btn-primary" data-gr="${p.id}">ยินยอม</button>`}
            </div></div>`;
        }).join('') + `</div>
          <div class="ai-strip mt12"><div class="ic">${ICO('alert',15)}</div>
            <div class="t-sm">ข้อที่จำเป็นถอนไม่ได้จากหน้านี้ เพราะถอนแล้วจะใช้ระบบไม่ได้ —
              ถ้าต้องการยุติทั้งหมด ให้ใช้ปุ่ม <b>ลบบัญชีของฉัน</b> ด้านล่าง
              ซึ่งเป็นการถอนความยินยอมทุกข้อพร้อมลบข้อมูล</div></div>`;

        box.querySelectorAll('[data-wd]').forEach(b => b.onclick = async () => {
          b.disabled = true;
          try { await A.withdrawConsent(b.dataset.wd); U.toast('ถอนความยินยอมแล้ว','ok'); await paint(); }
          catch (e) { b.disabled = false; U.toast(e.message,'warn'); }
        });
        box.querySelectorAll('[data-gr]').forEach(b => b.onclick = async () => {
          b.disabled = true;
          try { await A.grantConsents([b.dataset.gr]); U.toast('บันทึกความยินยอมแล้ว','ok'); await paint(); }
          catch (e) { b.disabled = false; U.toast(e.message,'warn'); }
        });
      };
      await paint();

      root.querySelector('#signOutBtn').onclick = async () => {
        await A.signOut(); location.replace('login.html');
      };
      root.querySelector('#delAcct').onclick = () => {
        U.modal({ title:'ลบบัญชีของคุณ', icon:ICO('alert'), okText:'ลบบัญชีถาวร', cancelText:'ไม่ลบ',
          body:`<p>พิมพ์คำว่า <b>ลบบัญชี</b> เพื่อยืนยัน — การลบมีผลทันทีและกู้คืนไม่ได้</p>
            <div class="field mt16"><label class="label" for="confirmDel">ยืนยัน</label>
              <input class="input" id="confirmDel" placeholder="ลบบัญชี" autocomplete="off"></div>
            <div class="t-sm muted mt12">อีเมลที่จะถูกลบ: <b>${U.esc(A.email() || '')}</b></div>`,
          onOk(m){
            if (m.querySelector('#confirmDel').value.trim() !== 'ลบบัญชี') {
              U.toast('พิมพ์คำยืนยันให้ตรง','warn'); return false;
            }
            A.deleteAccount().then(r => {
              U.toast('ลบบัญชีแล้ว' + (r && r.stores_removed ? ' · ลบร้าน ' + r.stores_removed + ' ร้าน' : ''), 'ok');
              setTimeout(() => location.replace('index.html'), 700);
            }).catch(e => U.toast(e.message, 'warn'));
          } });
      };
    }

    function vStore(){
      return card('ข้อมูลร้าน','ข้อมูลนี้จะแสดงบนใบเสร็จและหน้าสั่งอาหาร', `
        <div class="grid g-2" style="gap:16px">
          <div class="field" style="grid-column:1/-1"><label class="label">ชื่อร้าน</label>
            <div class="row g10"><button class="btn btn-ghost" style="width:52px;height:46px;font-size:22px">${D.store.emoji}</button>
              <input class="input" value="${U.esc(D.store.name)}"></div></div>
          <div class="field"><label class="label">รูปแบบร้าน</label>
            <select class="select">${['Street Food','Food Truck','Kiosk','ร้านอาหาร','Delivery Only']
              .map(f=>`<option ${D.store.format===f?'selected':''}>${f}</option>`).join('')}</select></div>
          <div class="field"><label class="label">ประเภทอาหาร</label><input class="input" value="${U.esc(D.store.type)}"></div>
          <div class="field" style="grid-column:1/-1"><label class="label">ทำเล / ที่ตั้ง</label>
            <input class="input" value="${U.esc(D.store.location)}"></div>
          <div class="field"><label class="label">เวลาเปิด</label><input class="input" type="time" value="${D.store.open}"></div>
          <div class="field"><label class="label">เวลาปิด</label><input class="input" type="time" value="${D.store.close}"></div>
          <div class="field"><label class="label">เป้ายอดขายต่อเดือน</label>
            <div class="input-prefix"><span>฿</span><input class="input num" type="number" value="${D.store.goalMonth}"></div>
            <span class="hint">เป้ารายวันจะคำนวณเป็น ${U.baht(D.month.dailyTarget)}</span></div>
          <div class="field"><label class="label">เป้า Margin ของร้าน (%)</label>
            <input class="input num" type="number" value="35">
            <span class="hint">เมนูที่ margin ต่ำกว่านี้จะถูกเตือนอัตโนมัติ</span></div>
        </div>`) +
        card('วันหยุดร้าน','ระบบจะไม่นับวันหยุดในการคำนวณเป้ารายวัน', `
        <div class="row wrap g8">${['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'].map((d,i)=>
          `<button class="badge badge-lg ${i===6?'badge-bad':'badge-good'}">${i===6?'ปิด':'เปิด'} ${d}</button>`).join('')}</div>`);
    }
    function vUsers(){
      return card('ผู้ใช้ระบบ','ผู้ที่เข้าใช้ระบบหลังบ้านได้', `
        <div class="col g10">
          ${[['สมชาย เจ้าของร้าน','owner@streetfoodos.app','Owner','badge-brand','สม'],
             ['นภา ผู้จัดการ','manager@streetfoodos.app','Manager','badge-info','นภ'],
             ['เอ พนักงานหน้าร้าน','staff1@streetfoodos.app','Cashier','badge','เอ']]
            .map(([n,e,r,c,av])=>`<div class="tile between">
              <div class="row g12"><span class="avatar">${av}</span>
                <div><b class="t-sm">${n}</b><div class="t-xs muted">${e}</div></div></div>
              <div class="row g8"><span class="badge ${c}">${r}</span>
                <button class="btn btn-xs btn-soft">แก้ไข</button></div></div>`).join('')}
          <button class="btn btn-ghost btn-block mt8">+ เชิญผู้ใช้ใหม่ทางอีเมล</button>
        </div>`, `<span class="badge">3 / 5 ที่นั่ง</span>`);
    }
    function vStaff(){
      return card('พนักงานและกะการทำงาน','ใช้คำนวณต้นทุนค่าแรงในหน้า Analytics → Profit', `
        <div class="scroll-x"><table class="tbl"><thead><tr>
          <th>ชื่อ</th><th>ตำแหน่ง</th><th>กะ</th><th class="r">ค่าแรง/วัน</th><th>สถานะวันนี้</th></tr></thead>
          <tbody>${[['สมชาย','เจ้าของ/พ่อครัว','08:00–20:00',700,'ok'],
                    ['เอ','หน้าร้าน/แคชเชียร์','08:00–16:00',450,'ok'],
                    ['บี','ผู้ช่วยครัว','10:00–20:00',450,'ok'],
                    ['ซี','พาร์ทไทม์ (เสาร์–อาทิตย์)','11:00–19:00',400,'off']]
            .map(([n,r,s,w,st2])=>`<tr><td><b class="t-sm">${n}</b></td><td class="t-sm">${r}</td>
              <td class="t-sm num">${s}</td><td class="r num b7">${U.baht(w)}</td>
              <td><span class="badge ${st2==='ok'?'badge-good':'badge'}">${st2==='ok'?'เข้างาน':'วันหยุด'}</span></td></tr>`).join('')}
            <tr style="background:var(--surface-2)"><td colspan="3"><b>ค่าแรงรวมวันนี้</b></td>
              <td class="r num b8">${U.baht(1600)}</td><td></td></tr>
          </tbody></table></div>
        <div class="ai-strip mt16"><div class="ic">${ICO('advisor',15)}</div><div class="t-sm">
          ค่าแรงคิดเป็น ${U.pc(D.month.labor/D.month.revenue*100)} ของยอดขาย ซึ่งอยู่ในเกณฑ์ดี (ค่าแนะนำ 15–20%)
          ช่วง 14:00–16:00 ยอดขายต่ำสุดของวัน — ถ้าลดคนช่วงนั้นลง 1 คน จะประหยัดได้ราว ${U.baht(3400)}/เดือน</div></div>`);
    }
    function vRoles(){
      const PERM = [['ดู Dashboard',1,1,1],['รับ/แก้ออเดอร์',1,1,1],['แก้เมนูและต้นทุน',1,1,0],
        ['ดูกำไรและ P&L',1,1,0],['จัดการ Stock',1,1,1],['สร้าง Promotion/Campaign',1,1,0],
        ['จัดการผู้ใช้',1,0,0],['เปลี่ยนแพ็กเกจ',1,0,0]];
      return card('Roles & Permissions','กำหนดว่าตำแหน่งไหนเห็นและทำอะไรได้', `
        <div class="scroll-x"><table class="tbl"><thead><tr><th>สิทธิ์การใช้งาน</th>
          <th class="r">Owner</th><th class="r">Manager</th><th class="r">Cashier</th></tr></thead>
          <tbody>${PERM.map(([l,a,b,c])=>`<tr><td class="t-sm b6">${l}</td>
            ${[a,b,c].map(v=>`<td class="r">${v?'<span style="color:var(--good-ink);font-weight:800">✓</span>':'<span class="muted-2">—</span>'}</td>`).join('')}
          </tr>`).join('')}</tbody></table></div>`);
    }
    function vPayment(){
      return card('ช่องทางรับเงิน','เปิด/ปิดช่องทางที่ร้านรับได้', `
        <div class="tile mb12" style="border-left:3px solid var(--warn);background:var(--warn-soft)">
          <b class="t-sm">หมายเหตุ:</b> <span class="t-sm">การตั้งค่านี้ใช้บันทึกช่องทางรับเงินเพื่อการรายงานเท่านั้น
          ระบบยังไม่มีการตัดเงินออนไลน์ (Payment Gateway) — จะเปิดใช้เมื่อจดทะเบียนนิติบุคคลและผ่าน KYC กับผู้ให้บริการชำระเงินแล้ว</span></div>
        <div class="col g10">
          ${[['เงินสด','รับเงินสดหน้าร้าน',1],['พร้อมเพย์ / QR Code','สแกนจ่ายผ่านธนาคาร',1],
             ['บัตรเครดิต/เดบิต','ต้องมีเครื่อง EDC',0],['LINE MAN / Grab / Robinhood','รับผ่านแอปส่งอาหาร',1],
             ['TrueMoney / Rabbit LINE Pay','อีวอลเล็ต',0]]
            .map(([n,d,on])=>`<div class="tile between">
              <div><b class="t-sm">${n}</b><div class="t-xs muted">${d}</div></div>
              <button class="switch ${on?'on':''}"></button></div>`).join('')}
        </div>
        <div class="ai-strip mt16"><div class="ic">${ICO('advisor',15)}</div><div class="t-sm">
          ลูกค้า ${U.pc(58)} จ่ายผ่าน QR Code แล้ว — การเปิดบัตรเครดิตอาจไม่คุ้มค่าธรรมเนียม
          สำหรับบิลเฉลี่ย ${U.baht(A.today().aov,0)}</div></div>`);
    }
    function vNoti(){
      return card('การแจ้งเตือน','เลือกเรื่องที่อยากให้ระบบเตือน', `
        <div class="col g10">
          ${[['วัตถุดิบต่ำกว่าจุดสั่งซื้อ','แจ้งทันทีเมื่อของใกล้หมด',1],
             ['ยอดขายถึง/ไม่ถึงเป้ารายวัน','สรุปตอนปิดร้านทุกวัน',1],
             ['ออเดอร์ใหม่','เตือนทุกครั้งที่มีออเดอร์เข้า',1],
             ['ออเดอร์ค้างในครัวเกิน 8 นาที','ป้องกันลูกค้ารอนาน',1],
             ['Margin เมนูต่ำกว่าเป้า','เมื่อต้นทุนวัตถุดิบเปลี่ยน',1],
             ['Campaign ROAS ต่ำกว่า 2x','เตือนก่อนงบเสียเปล่า',1],
             ['สรุปรายสัปดาห์จาก AI','ทุกวันจันทร์ 08:00',0]]
            .map(([n,d,on])=>`<div class="tile between">
              <div><b class="t-sm">${n}</b><div class="t-xs muted">${d}</div></div>
              <button class="switch ${on?'on':''}"></button></div>`).join('')}
        </div>`);
    }
    function vInteg(){
      return card('Integrations','เชื่อมต่อบริการภายนอก — ยังไม่เปิดใช้งานทั้งหมด', `
        <div class="ai-strip mb16" style="background:var(--warn-soft);border-color:var(--warn-line)">
          <div class="ic" style="background:var(--warn-soft);color:var(--warn-ink)">${ICO('alert',15)}</div>
          <div class="t-sm"><b>ทุกรายการด้านล่างยังไม่ได้เชื่อมต่อจริง</b><br>
          <span class="muted">ระบบยังไม่ได้ต่อบริการภายนอกใดๆ
          รายการนี้แสดงไว้เพื่อให้เห็นขอบเขตของงานในเฟสถัดไปเท่านั้น</span></div>
        </div>
        <div class="grid g-2" style="gap:12px">
          ${[['LM','LINE MAN','ดึงออเดอร์เข้าระบบอัตโนมัติ','ยังไม่เชื่อมต่อ','badge'],
             ['GF','Grab Food','ซิงก์เมนูและสถานะร้าน','ยังไม่เชื่อมต่อ','badge'],
             ['OA','LINE OA','ส่งโปรโมชันหาลูกค้า','ยังไม่เชื่อมต่อ','badge'],
             ['FB','Facebook Page','ดึงข้อมูลโฆษณาและ ROAS','ยังไม่เชื่อมต่อ','badge'],
             ['FA','FlowAccount','ส่งข้อมูลบัญชี/ภาษี','ยังไม่เชื่อมต่อ','badge'],
             ['PR','เครื่องพิมพ์ใบเสร็จ','พิมพ์บิลอัตโนมัติ','ยังไม่เชื่อมต่อ','badge']]
            .map(([ic,n,d,s,c])=>`<div class="tile">
              <div class="between"><div class="row g10"><span class="mono-chip">${ic}</span><b class="t-sm">${n}</b></div>
                <span class="badge ${c}">${s}</span></div>
              <div class="t-xs muted mt8">${d}</div></div>`).join('')}
        </div>
        <div class="ai-strip mt16"><div class="ic">${ICO('alert',15)}</div><div class="t-sm">
          ยังไม่มีการเชื่อมต่อบริการภายนอกใดๆ
          สถานะที่เห็นเป็น Mock Data ทั้งหมด</div></div>`);
    }
    function vSub(){
      return card('แพ็กเกจปัจจุบัน','', `
        <div class="between wrap g16">
          <div><div class="row g10"><h3>${U.esc(D.store.plan)}</h3>
            <span class="badge badge-warn">เหลือ ${D.store.trialDaysLeft} วัน</span></div>
            <p class="t-sm muted mt8">ทดลองใช้ฟีเจอร์ทั้งหมดฟรี 14 วัน · ยังไม่ผูกบัตร</p></div>
          <button class="btn btn-primary" id="doUpgrade">อัปเกรดเป็น Growth ฿590/เดือน</button>
        </div>
        <div class="bar bar-lg mt20"><i style="width:${(14-D.store.trialDaysLeft)/14*100}%"></i></div>
        <div class="t-xs muted mt8">ใช้ไป ${14-D.store.trialDaysLeft} จาก 14 วัน</div>`) +
        card('เปรียบเทียบแพ็กเกจ','', `
        <div class="scroll-x"><table class="tbl"><thead><tr><th>ฟีเจอร์</th>
          <th class="r">Starter<br><span class="t-xs muted">ฟรี</span></th>
          <th class="r">Growth<br><span class="t-xs muted">฿590/ด.</span></th>
          <th class="r">Multi-store<br><span class="t-xs muted">฿1,490/ด.</span></th></tr></thead>
          <tbody>${[['จำนวนร้าน','1','1','ไม่จำกัด'],['ผู้ใช้','1','5','ไม่จำกัด'],
            ['เมนู','20','ไม่จำกัด','ไม่จำกัด'],['Orders + Kitchen','✓','✓','✓'],
            ['Stock + CRM','—','✓','✓'],['Marketing + Promotion','—','✓','✓'],
            ['AI Advisor','จำกัด','✓','✓'],['Analytics ย้อนหลัง','7 วัน','12 เดือน','ไม่จำกัด'],
            ['Roles & Permissions','—','—','✓']]
            .map(r=>`<tr><td class="t-sm b6">${r[0]}</td>${r.slice(1).map(v=>
              `<td class="r t-sm ${v==='✓'?'':'muted'}" style="${v==='✓'?'color:var(--good-ink);font-weight:800':''}">${v}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
        <p class="t-xs muted mt16">* ตัวเลขค่าบริการเป็นข้อมูลตัวอย่าง ยังไม่เปิดขายจริง</p>`);
    }
    paint();
  };
})();
