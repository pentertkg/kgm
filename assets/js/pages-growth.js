/* ============================================================
   PAGES (P1) — Stock · Customers · Marketing · Promotion Builder
   ============================================================ */
(function () {
  'use strict';
  const D = window.DB, U = window.UI, A = window.APP;
  const st = () => A.state;
  const SLBL = { ok:['ปกติ','badge-good'], low:['ต่ำ','badge-warn'], out:['หมด','badge-bad'] };

  /* ============================================================
     STOCK
     ============================================================ */
  window.PAGES.stock = function (el, actions) {
    const fc = D.forecastTomorrow(), need = fc.filter(i => i.gap > 0);
    const low = D.ingredients.filter(i => D.stockStatus(i) === 'low');
    const out = D.ingredients.filter(i => D.stockStatus(i) === 'out');
    const value = D.ingredients.reduce((s,i)=>s+i.stock*i.cost,0);

    actions.innerHTML = `<button class="btn btn-ghost btn-sm" id="sAdj">✏️ ปรับยอดคงเหลือ</button>
      <button class="btn btn-primary btn-sm" id="sPO">🛒 สร้างรายการสั่งซื้อ</button>`;
    actions.querySelector('#sPO').onclick = () => poModal(need);
    actions.querySelector('#sAdj').onclick = () => U.toast('Prototype: การนับสต็อกจริงจะทำใน Phase ถัดไป','warn');

    el.innerHTML = `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'วัตถุดิบทั้งหมด', icon:'📦', value:U.nf(D.ingredients.length),
          foot:`<span class="t-xs muted">มูลค่าสต็อกคงเหลือ ${U.baht(value)}</span>` })}
        ${U.kpi({ label:'ใกล้หมด (ต่ำ)', icon:'⚠️', iconBg:'var(--warn-soft)', value:U.nf(low.length),
          foot:`<span class="badge badge-warn">ต้องสั่งภายในวันนี้</span>` })}
        ${U.kpi({ label:'หมดแล้ว', icon:'🚫', iconBg:'var(--bad-soft)', value:U.nf(out.length),
          foot:`<span class="t-xs muted">${out.map(i=>U.esc(i.name)).join(', ') || 'ไม่มี'}</span>` })}
        ${U.kpi({ label:'มูลค่าที่ต้องสั่งพรุ่งนี้', icon:'🛒', iconBg:'var(--info-soft)',
          value:U.baht(need.reduce((s,i)=>s+i.gap*i.cost,0)),
          foot:`<span class="t-xs muted">${need.length} รายการ</span>` })}
      </div>

      <!-- AI FORECAST -->
      <div class="ai-card mb16"><div class="in">
        <div class="between wrap g12">
          <div class="row g10"><span class="ai-badge">🤖 คาดการณ์วัตถุดิบพรุ่งนี้</span>
            <span class="badge">คำนวณจากยอดขาย 7 วัน + แนวโน้ม +4%</span></div>
          <button class="btn btn-ai btn-sm" id="fcPO">สร้างรายการสั่งซื้อ →</button>
        </div>
        <h3 class="mt16" style="line-height:1.5">จากยอดขายย้อนหลัง ระบบคาดว่าพรุ่งนี้จะใช้<b> หมูสับประมาณ 7.8 kg</b>
          แต่ตอนนี้เหลือเพียง 3.2 kg — <span style="color:var(--bad)">ขาดอีก 4.6 kg</span></h3>
        <p class="muted t-sm mt8">ถ้าไม่สั่งเพิ่มวันนี้ จะขายกะเพราหมูและข้าวผัดหมูได้ถึงประมาณ 12:40 เท่านั้น
          คิดเป็นยอดขายที่จะเสียไปราว ${U.baht(4.6/0.13*58)}</p>
        <div class="grid g-3 mt16">
          ${need.slice(0,6).map(i=>`<div class="rec" style="background:var(--surface)">
            <span class="rn" style="background:${i.gap>0?'var(--bad)':'var(--good)'}">!</span>
            <div class="grow"><b class="t-sm">${U.esc(i.name)}</b>
              <div class="t-xs muted">ต้องใช้ ${U.nf(i.need,2)} ${i.unit} · มี ${U.nf(i.stock,1)} ${i.unit}</div>
              <div class="between mt8"><span class="badge badge-bad">ขาด ${U.nf(i.gap,2)} ${i.unit}</span>
                <span class="num t-xs b7">≈ ${U.baht(i.gap*i.cost)}</span></div></div></div>`).join('')}
        </div>
      </div></div>

      <div class="card mb16">
        <div class="card-h"><div><h4>วัตถุดิบคงเหลือ</h4>
          <div class="t-sm muted mt4">แถบสีแสดงระดับคงเหลือเทียบกับจุดสั่งซื้อขั้นต่ำ</div></div>
          <div class="tabs" id="stTabs">
            <button data-s="all" class="on">ทั้งหมด<span class="n num">${D.ingredients.length}</span></button>
            <button data-s="low">ต่ำ<span class="n num">${low.length}</span></button>
            <button data-s="out">หมด<span class="n num">${out.length}</span></button></div>
        </div>
        <div class="scroll-x"><table class="tbl"><thead><tr>
          <th>Ingredient</th><th class="r">Current Stock</th><th>Unit</th><th class="r">Minimum Stock</th>
          <th style="width:150px">ระดับคงเหลือ</th><th class="r">ใช้เฉลี่ย/วัน</th><th>Status</th><th></th></tr></thead>
          <tbody id="stRows"></tbody></table></div>
      </div>

      <div class="grid g-2">
        <div class="card">
          <div class="card-h"><h4>วัตถุดิบผูกกับเมนูอะไร</h4><span class="badge badge-info">Recipe Link</span></div>
          <div class="card-b col g12">
            ${['pork','porkc','egg','sea'].map(k=>{ const i = D.ing(k);
              const used = D.menu.filter(m=>m.recipe.some(r=>r[0]===k));
              return `<div>
                <div class="between t-sm"><b>${U.esc(i.name)}</b>
                  <span class="badge ${SLBL[D.stockStatus(i)][1]}">${SLBL[D.stockStatus(i)][0]}</span></div>
                <div class="row wrap g6 mt8">${used.map(m=>`<span class="badge">${m.emoji} ${U.esc(m.name)}</span>`).join('') || '<span class="t-xs muted">ยังไม่ผูกกับเมนู</span>'}</div>
                ${D.stockStatus(i)==='out' ? `<div class="t-xs mt8" style="color:var(--bad)">
                  ⚠️ วัตถุดิบหมด → ${used.length} เมนูถูกปิดขายชั่วคราว</div>`:''}
              </div>`; }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-h"><h4>ซัพพลายเออร์</h4><span class="badge">P2</span></div>
          <div class="card-b col g10">
            ${[['ตลาดคลองเตย (เนื้อสัตว์)','ส่ง 05:30 ทุกวัน','หมูสับ, หมูกรอบ, อกไก่','badge-good'],
               ['ร้านของสด ป้าน้อย','ส่ง 06:00 จ/พ/ศ','ใบกะเพรา, พริก, ไข่','badge-good'],
               ['ยี่ปั๊วเครื่องดื่ม','ส่งทุกวันจันทร์','น้ำอัดลม, น้ำดื่ม','badge-warn']]
              .map(([n,t,items,cls])=>`<div class="tile">
                <div class="between"><b class="t-sm">${n}</b><span class="badge ${cls}">${t}</span></div>
                <div class="t-xs muted mt4">${items}</div></div>`).join('')}
            <div class="ai-strip mt8"><div class="ic">🤖</div>
              <div class="t-sm">ราคาหมูสับจากตลาดคลองเตยขึ้น 8% ใน 3 วัน — แนะนำเทียบราคากับซัพพลายเออร์รายที่ 2
                ก่อนสั่งล็อตหน้า อาจประหยัดได้ ${U.baht(1450)}/เดือน</div></div>
          </div>
        </div>
      </div>`;

    let filt = 'all';
    const paintRows = () => {
      const rows = D.ingredients.filter(i => filt === 'all' || D.stockStatus(i) === filt);
      el.querySelector('#stRows').innerHTML = rows.map(i => {
        const s = D.stockStatus(i), [lbl, cls] = SLBL[s];
        const ratio = Math.min(100, i.min ? i.stock / (i.min * 1.6) * 100 : 100);
        return `<tr>
          <td><b class="t-sm">${U.esc(i.name)}</b><div class="t-xs muted">฿${U.nf(i.cost)}/${i.unit}</div></td>
          <td class="r num b7" style="${s!=='ok'?'color:var(--bad)':''}">${U.nf(i.stock,1)}</td>
          <td class="t-sm muted">${i.unit}</td>
          <td class="r num">${U.nf(i.min,1)}</td>
          <td><div class="bar ${s==='ok'?'bar-good':s==='low'?'bar-warn':'bar-bad'}"><i style="width:${ratio}%"></i></div></td>
          <td class="r num t-sm">${U.nf(i.use,2)}</td>
          <td><span class="badge ${cls}">${lbl}</span></td>
          <td class="r">${s!=='ok'?`<button class="btn btn-xs btn-primary" data-buy="${i.id}">สั่งซื้อ</button>`:''}</td></tr>`;
      }).join('');
      el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
        const i = D.ing(b.dataset.buy);
        poModal(D.forecastTomorrow().filter(x => x.id === i.id).map(x => ({ ...x, gap: Math.max(x.gap, i.min * 1.5 - i.stock) })));
      });
    };
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
      filt = b.dataset.s; el.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',x===b)); paintRows(); });
    el.querySelector('#fcPO').onclick = () => poModal(need);
    paintRows();
  };

  function poModal(items) {
    const rows = items.map(i => ({ ...i, order: Math.max(i.gap || 0, (i.min || 0) * 1.5 - i.stock) }));
    U.modal({ title:'ใบสั่งซื้อวัตถุดิบ', icon:'🛒', sub:'สำหรับรอบส่งพรุ่งนี้ 05:30', wide:true, okText:'ยืนยันรายการสั่งซื้อ',
      body:`<div class="card" style="overflow:hidden"><table class="tbl">
        <thead><tr><th>วัตถุดิบ</th><th class="r">คงเหลือ</th><th class="r">ต้องใช้พรุ่งนี้</th>
          <th class="r">สั่งเพิ่ม</th><th class="r">ราคาประมาณ</th></tr></thead>
        <tbody>${rows.map(i=>`<tr>
          <td><b class="t-sm">${U.esc(i.name)}</b></td>
          <td class="r num">${U.nf(i.stock,1)} ${i.unit}</td>
          <td class="r num">${U.nf(i.need,2)} ${i.unit}</td>
          <td class="r num b7" style="color:var(--brand-ink)">${U.nf(Math.ceil(i.order*10)/10,1)} ${i.unit}</td>
          <td class="r num">${U.baht(Math.ceil(i.order*10)/10*i.cost)}</td></tr>`).join('')}
        <tr style="background:var(--surface-2)"><td colspan="4"><b>รวมทั้งสิ้น</b></td>
          <td class="r num b8">${U.baht(rows.reduce((s,i)=>s+Math.ceil(i.order*10)/10*i.cost,0))}</td></tr>
        </tbody></table></div>
        <div class="ai-strip mt16"><div class="ic">🤖</div><div class="t-sm">
          <b>คำแนะนำก่อนสั่ง</b> — สั่งหมูสับเผื่อไว้ 15% เพราะพรุ่งนี้เป็นวันพฤหัสบดีซึ่งยอดขายสูงกว่าเฉลี่ย 6%
          และควรล็อกราคากับซัพพลายเออร์ล่วงหน้า 1 สัปดาห์เพื่อกันต้นทุนผันผวน</div></div>`,
      onOk(){ U.toast('สร้างใบสั่งซื้อแล้ว — ส่งให้ซัพพลายเออร์ตอน 20:00','ok'); } });
  }

  /* ============================================================
     CUSTOMERS / CRM
     ============================================================ */
  window.PAGES.customers = function (el, actions) {
    let seg = 'all';
    actions.innerHTML = `<button class="btn btn-ghost btn-sm" id="cExp">⬇️ Export รายชื่อ</button>
      <button class="btn btn-primary btn-sm" id="cCam">🎁 สร้าง Campaign เรียกลูกค้ากลับ</button>`;
    actions.querySelector('#cCam').onclick = () => A.go('promotion?goal=winback');
    actions.querySelector('#cExp').onclick = () => {
      const rows = [['ชื่อลูกค้า','กลุ่ม','จำนวนออเดอร์','ยอดสะสม (บาท)','ค่าเฉลี่ยต่อบิล (บาท)','ซื้อครั้งล่าสุด','เมนูโปรด']];
      D.customers.forEach(c => {
        const sg = D.segments.find(x => x.key === c.seg), m = D.mi(c.fav);
        rows.push([c.name, sg ? sg.label : '', c.orders, c.spend, Math.round(c.spend/c.orders), c.last, m ? m.name : '']);
      });
      rows.push([]);
      rows.push(['สรุป','ลูกค้าทั้งหมด',D.crm.total,'ลูกค้าใหม่ 30 วัน',D.crm.new30,'ซื้อซ้ำ',D.crm.repeat]);
      rows.push(['','Repeat rate (%)',D.crm.repeatRate,'CLV เฉลี่ย (บาท)',D.crm.clv,'หายไปเกิน 30 วัน',D.crm.lost]);
      U.csv('customers-19-08-2569.csv', rows);
    };

    el.innerHTML = `
      <div class="grid g-4 mb16">
        ${U.kpi({ label:'ลูกค้าทั้งหมด', icon:'👥', value:U.nf(D.crm.total),
          foot:U.delta(8.4) + ' <span class="t-xs muted">เทียบเดือนก่อน</span>' })}
        ${U.kpi({ label:'ลูกค้าใหม่ (30 วัน)', icon:'✨', iconBg:'var(--info-soft)', value:U.nf(D.crm.new30),
          foot:`<span class="t-xs muted">CAC ${U.baht(D.marketing.cac,0)}/คน</span>` })}
        ${U.kpi({ label:'ลูกค้าซื้อซ้ำ', icon:'🔁', iconBg:'var(--good-soft)', value:U.nf(D.crm.repeat),
          foot:`<span class="badge badge-good">Repeat rate ${U.pc(D.crm.repeatRate)}</span>` })}
        ${U.kpi({ label:'ลูกค้าที่หายไป', icon:'💔', iconBg:'var(--bad-soft)', value:U.nf(D.crm.lost),
          foot:`<span class="t-xs muted">ไม่กลับมาเกิน 30 วัน</span>` })}
      </div>

      <div class="ai-card mb16"><div class="in">
        <div class="between wrap g12">
          <span class="ai-badge">🤖 AI Insight — Customer</span>
          <button class="btn btn-ai btn-sm" id="aiCam">สร้าง Campaign เรียกลูกค้ากลับมา →</button></div>
        <h3 class="mt16">มีลูกค้า <b style="color:var(--bad)">${D.crm.lost} คน</b> ที่ไม่ได้กลับมาซื้อเกิน 30 วัน</h3>
        <p class="muted t-sm mt8">กลุ่มนี้เคยซื้อเฉลี่ย 4.2 ครั้ง/คน มูลค่าเฉลี่ย ${U.baht(120)}/เดือน/คน
          รวมเป็นรายได้ที่หายไปประมาณ <b>${U.baht(D.crm.lost*120)}/เดือน</b>
          ต้นทุนดึงกลับ (คูปองลด 20 บาท) ถูกกว่าการหาลูกค้าใหม่ ${U.nf(D.marketing.cac/20,1)} เท่า</p>
        <div class="grid g-3 mt16">
          ${[['ส่งคูปองลด 20 บาท','อายุ 7 วัน สร้างความเร่งด่วน','คาดว่ากลับมา 22% ≈ 13 คน'],
             ['ทักผ่าน LINE OA','ข้อความส่วนตัว ไม่ใช่บรอดแคสต์','อัตราเปิดอ่านสูงกว่า SMS 3 เท่า'],
             ['เสนอเมนูโปรดเดิม','อ้างอิงจากประวัติการสั่งของแต่ละคน','เพิ่มโอกาสปิดการขาย 1.8 เท่า']]
            .map((x,i)=>`<div class="rec" style="background:var(--surface);flex-direction:column;align-items:stretch">
              <div class="row g10"><span class="rn">${i+1}</span><b class="t-sm">${x[0]}</b></div>
              <div class="t-sm muted mt8">${x[1]}</div>
              <div class="badge badge-good mt12" style="align-self:flex-start">${x[2]}</div></div>`).join('')}
        </div>
      </div></div>

      <div class="grid g-2-1 mb16">
        <div class="card">
          <div class="card-h"><h4>Customer Segments</h4><span class="badge">แบ่งอัตโนมัติจากพฤติกรรมการซื้อ</span></div>
          <div class="card-b col g14">
            ${D.segments.map(s=>`<button class="choice" data-seg="${s.key}" style="padding:12px">
              <span class="ci" style="background:${s.color}22;color:${s.color}">${
                {new:'✨',regular:'🔁',vip:'👑',risk:'⚠️',inactive:'😴'}[s.key]}</span>
              <span class="grow" style="text-align:left">
                <span class="between"><b class="t-sm">${s.label}</b>
                  <b class="num">${U.nf(s.n)} คน</b></span>
                <span class="t-xs muted">${s.desc}</span>
                <span class="bar mt8" style="display:block"><i style="width:${s.n/D.crm.total*100}%;background:${s.color}"></i></span>
              </span></button>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-h"><h4>สัดส่วนลูกค้า</h4></div>
          <div class="card-b ctr">
            ${U.donut(D.segments.map(s=>({label:s.label,v:s.n,color:s.color})),
              { center:U.nf(D.crm.total), sub:'ลูกค้าทั้งหมด', size:190 })}
            <div class="col g8 mt16" style="text-align:left">
              ${D.segments.map(s=>`<div class="between t-sm">
                <span class="row g8"><i style="width:10px;height:10px;border-radius:3px;background:${s.color};display:block"></i>${s.label}</span>
                <span class="num b7">${U.pc(s.n/D.crm.total*100,0)}</span></div>`).join('')}
            </div>
            <div class="tile mt16" style="text-align:left">
              <div class="t-xs muted b6">Customer Lifetime Value เฉลี่ย</div>
              <div class="num b8" style="font-size:21px">${U.baht(D.crm.clv)}</div>
              <div class="t-xs muted">ซื้อซ้ำเฉลี่ยทุก ${U.nf(D.crm.avgVisitGap,1)} วัน</div></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><div><h4>รายชื่อลูกค้า</h4>
          <div class="t-sm muted mt4">ข้อมูลผูกกับออเดอร์จริงในระบบ (Mock)</div></div>
          <div class="tabs" id="segTabs"></div></div>
        <div class="scroll-x"><table class="tbl"><thead><tr>
          <th>Name</th><th>Segment</th><th class="r">Orders</th><th class="r">Total Spend</th>
          <th>Last Order</th><th>Favorite Menu</th><th></th></tr></thead>
          <tbody id="cRows"></tbody></table></div>
      </div>`;

    const paint = () => {
      el.querySelector('#segTabs').innerHTML = [['all','ทั้งหมด'], ...D.segments.map(s=>[s.key,s.label])]
        .map(([k,l])=>`<button data-t="${k}" class="${seg===k?'on':''}">${l}</button>`).join('');
      el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { seg = b.dataset.t; paint(); });
      el.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { seg = b.dataset.seg; paint();
        el.querySelector('#cRows').scrollIntoView({ behavior:'smooth', block:'center' }); });

      const rows = D.customers.filter(c => seg === 'all' || c.seg === seg);
      const SB = { new:'badge-info', regular:'badge-good', vip:'badge-brand', risk:'badge-warn', inactive:'badge' };
      el.querySelector('#cRows').innerHTML = rows.length ? rows.map(c=>{
        const m = D.mi(c.fav), sg = D.segments.find(s=>s.key===c.seg);
        const late = /\d+ วันก่อน/.test(c.last) && parseInt(c.last) > 30;
        return `<tr>
          <td><div class="row g10"><span class="avatar" style="width:32px;height:32px;font-size:12px">${U.esc(c.name.slice(0,2))}</span>
            <b class="t-sm">${U.esc(c.name)}</b></div></td>
          <td><span class="badge ${SB[c.seg]}">${sg.label}</span></td>
          <td class="r num b7">${c.orders}</td>
          <td class="r num b7">${U.baht(c.spend)}</td>
          <td class="t-sm ${late?'':''}" style="${late?'color:var(--bad);font-weight:700':''}">${U.esc(c.last)}</td>
          <td class="t-sm">${m?m.emoji+' '+U.esc(m.name):'—'}</td>
          <td class="r">${c.seg==='risk'||c.seg==='inactive'
            ? `<button class="btn btn-xs btn-primary" data-win="${U.esc(c.name)}">ส่งคูปอง</button>`
            : `<button class="btn btn-xs btn-soft" data-view="${U.esc(c.name)}">ดูประวัติ</button>`}</td></tr>`;
      }).join('') : `<tr><td colspan="7">${U.empty('👥','ไม่มีลูกค้าในกลุ่มนี้','')}</td></tr>`;

      el.querySelectorAll('[data-win]').forEach(b => b.onclick = () => {
        U.toast('เตรียมคูปองสำหรับ ' + b.dataset.win + ' แล้ว','ok'); A.go('promotion?goal=winback'); });
      el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => custModal(b.dataset.view));
    };
    el.querySelector('#aiCam').onclick = () => A.go('promotion?goal=winback');
    paint();
  };

  function custModal(name) {
    const c = D.customers.find(x => x.name === name); if (!c) return;
    const m = D.mi(c.fav), sg = D.segments.find(s => s.key === c.seg);
    U.modal({ title:c.name, icon:'👤', sub:sg.label + ' · ลูกค้าตั้งแต่ 12 มิ.ย. 2569', foot:false,
      body:`<div class="grid g-2" style="gap:12px">
        ${[['จำนวนออเดอร์', c.orders+' ครั้ง'],['ยอดสะสม', U.baht(c.spend)],
           ['ค่าเฉลี่ยต่อบิล', U.baht(c.spend/c.orders,0)],['ซื้อครั้งล่าสุด', c.last]]
          .map(([l,v])=>`<div class="tile"><div class="t-xs muted b6">${l}</div>
            <div class="num b8 mt4" style="font-size:18px">${U.esc(String(v))}</div></div>`).join('')}
      </div>
      <div class="mt16"><div class="up muted mb8">เมนูโปรด</div>
        <div class="row g10 tile">${m?`<span style="font-size:24px">${m.emoji}</span>
          <div><b>${U.esc(m.name)}</b><div class="t-xs muted">สั่งบ่อยที่สุด ${Math.round(c.orders*0.6)} ครั้ง</div></div>`:'—'}</div></div>
      <div class="ai-strip mt16"><div class="ic">🤖</div><div class="t-sm">
        ${c.seg==='vip' ? `ลูกค้ากลุ่ม VIP — แนะนำให้สิทธิพิเศษ เช่น ไข่ดาวฟรีทุกบิล เพื่อรักษาไว้
          เพราะกลุ่มนี้ทำรายได้ ${U.pc(28)} ของทั้งร้าน`
        : c.seg==='risk' ? `ห่างหายไป ${parseInt(c.last)} วัน — แนะนำส่งคูปองลด 20 บาทพร้อมชื่อเมนูโปรด
          (${m?U.esc(m.name):'-'}) โอกาสกลับมาสูงกว่าคูปองทั่วไป 1.8 เท่า`
        : `ซื้อสม่ำเสมอ — ถ้าดันให้สั่งเครื่องดื่มเพิ่มทุกบิล จะเพิ่มกำไรราว ${U.baht(8*c.orders)}/เดือน`}</div></div>` });
  }

  /* ============================================================
     MARKETING
     ============================================================ */
  window.PAGES.marketing = function (el, actions) {
    actions.innerHTML = `<button class="btn btn-ghost btn-sm" id="mkAi">🤖 ถาม AI เรื่องงบโฆษณา</button>
      <button class="btn btn-primary btn-sm" id="mkNew">+ สร้าง Campaign</button>`;
    actions.querySelector('#mkNew').onclick = () => A.go('promotion');
    actions.querySelector('#mkAi').onclick = () => A.aiAsk('ถ้ามีงบโฆษณา 10,000 บาทควรยิงอะไร?');

    const M = D.marketing, best = st().campaigns.slice().sort((a,b)=>b.roas-a.roas)[0];
    const worst = st().campaigns.slice().sort((a,b)=>a.roas-b.roas)[0];

    el.innerHTML = `
      <div class="grid g-5 mb16">
        ${U.kpi({ label:'Ad Spend', icon:'💳', value:U.baht(M.spend), foot:`<span class="t-xs muted">MTD ${D.month.days} วัน</span>` })}
        ${U.kpi({ label:'Revenue from Ads', icon:'💵', iconBg:'var(--good-soft)', value:U.baht(M.revenue),
          foot:`<span class="t-xs muted">${U.pc(M.revenue/D.month.revenue*100)} ของยอดขายเดือนนี้</span>` })}
        ${U.kpi({ label:'ROAS', icon:'📈', iconBg:'var(--info-soft)', value:U.nf(M.roas,2)+'x',
          foot:`<span class="badge badge-good">คุ้มค่า (จุดคุ้มทุน 2.70x)</span>` })}
        ${U.kpi({ label:'CAC', icon:'🎯', iconBg:'var(--warn-soft)', value:U.baht(M.cac,0),
          foot:`<span class="t-xs muted">CLV ${U.baht(D.crm.clv)} → คุ้ม ${U.nf(D.crm.clv/M.cac,1)} เท่า</span>` })}
        ${U.kpi({ label:'New Customers', icon:'✨', value:U.nf(M.newCust),
          foot:`<span class="t-xs muted">Conversion ${U.pc(M.conversion)}</span>` })}
      </div>

      <div class="ai-card mb16"><div class="in">
        <div class="between wrap g12"><span class="ai-badge">🤖 AI Recommendation — Marketing</span>
          <div class="row g8">
            <button class="btn btn-ghost btn-sm" id="mvBudget">ย้ายงบตามคำแนะนำ</button>
            <button class="btn btn-ai btn-sm" id="boost20">เพิ่มงบ Campaign ที่ดีที่สุด +20%</button></div></div>
        <h3 class="mt16">Campaign “${U.esc(best.name)}” มีประสิทธิภาพดีที่สุด (ROAS ${U.nf(best.roas,2)}x) — แนะนำเพิ่มงบ 20%</h3>
        <p class="muted t-sm mt8">
          ถ้าเพิ่มงบจาก ${U.baht(best.spend)} → ${U.baht(best.spend*1.2)} คาดว่าจะได้ยอดขายเพิ่มราว
          <b>${U.baht(best.spend*0.2*best.roas)}</b> (สมมติ ROAS คงที่ที่ระดับงบนี้)<br>
          ขณะเดียวกัน “${U.esc(worst.name)}” มี ROAS เพียง ${U.nf(worst.roas,2)}x ซึ่งต่ำกว่าจุดคุ้มทุน 2.70x
          — <b style="color:var(--bad)">แนะนำหยุดและย้ายงบ ${U.baht(worst.spend)}</b> ไปที่แคมเปญที่ดีที่สุด</p>
        <div class="grid g-3 mt16">
          <div class="rec" style="background:var(--surface)"><span class="rn">1</span>
            <div class="t-sm"><b>เพิ่มงบ ${U.esc(best.name)} +20%</b><br>
              <span class="muted">คาดได้ยอดขายเพิ่ม ${U.baht(best.spend*0.2*best.roas)}</span></div></div>
          <div class="rec" style="background:var(--surface)"><span class="rn">2</span>
            <div class="t-sm"><b>หยุด ${U.esc(worst.name)}</b><br>
              <span class="muted">ประหยัดงบเสียเปล่า ${U.baht(worst.spend)}/เดือน</span></div></div>
          <div class="rec" style="background:var(--surface)"><span class="rn">3</span>
            <div class="t-sm"><b>ยิงกลุ่มลูกค้าที่หายไป ${D.crm.lost} คน</b><br>
              <span class="muted">CAC ถูกกว่าหาลูกค้าใหม่ ${U.nf(M.cac/20,1)} เท่า</span></div></div>
        </div>
      </div></div>

      <div class="grid g-3-2 mb16">
        <div class="card">
          <div class="card-h"><h4>ประสิทธิภาพแต่ละ Campaign</h4>
            <span class="badge badge-info">เส้นแบ่ง = จุดคุ้มทุน 2.70x</span></div>
          <div class="card-b">
            ${U.hBars(st().campaigns.map(c=>({ label:c.name + ' — ' + U.nf(c.roas,2) + 'x', v:c.revenue,
              color: c.roas>=4?'var(--good)':c.roas>=2.7?'var(--c5)':'var(--bad)',
              sub:'จ่าย '+U.baht(c.spend) })), { fmt:U.baht })}
          </div>
        </div>
        <div class="card">
          <div class="card-h"><h4>งบโฆษณาไปที่ไหน</h4></div>
          <div class="card-b ctr">
            ${U.donut(st().campaigns.map((c,i)=>({ label:c.name, v:c.spend,
              color:['var(--c1)','var(--c2)','var(--c3)','var(--c5)','var(--bad)'][i] })),
              { center:U.bahtK(M.spend), sub:'Ad Spend', size:180 })}
            <div class="tile mt16" style="text-align:left">
              <div class="between t-sm"><span class="muted">Reach</span><b class="num">${U.nf(M.reach)}</b></div>
              <div class="between t-sm"><span class="muted">Clicks</span><b class="num">${U.nf(M.clicks)}</b></div>
              <div class="between t-sm"><span class="muted">Conversion</span><b class="num">${U.pc(M.conversion)}</b></div>
              <div class="between t-sm"><span class="muted">ต้นทุนต่อออเดอร์</span>
                <b class="num">${U.baht(M.spend/st().campaigns.reduce((s,c)=>s+c.orders,0),0)}</b></div></div>
          </div>
        </div>
      </div>

      <div class="card mb16">
        <div class="card-h"><h4>Campaign List</h4>
          <button class="btn btn-primary btn-sm" id="mkNew2">+ สร้าง Campaign</button></div>
        <div class="scroll-x"><table class="tbl"><thead><tr>
          <th>Campaign Name</th><th>ช่องทาง</th><th>Status</th><th class="r">Spend</th>
          <th class="r">Revenue</th><th class="r">ROAS</th><th class="r">ลูกค้าใหม่</th><th class="r">CAC</th><th></th></tr></thead>
          <tbody id="camRows"></tbody></table></div>
      </div>

      <div class="card">
        <div class="card-h"><h4>Promotion ที่กำลังใช้งาน</h4>
          <button class="btn btn-ghost btn-sm" id="toPromo">ไปที่ Promotion Builder →</button></div>
        <div class="scroll-x"><table class="tbl"><thead><tr>
          <th>Promotion</th><th>ประเภท</th><th>Status</th><th class="r">ใช้ไปแล้ว</th>
          <th class="r">ยอดขายที่เกิดขึ้น</th><th>สิ้นสุด</th></tr></thead>
          <tbody>${D.promotions.map(p=>`<tr>
            <td><b class="t-sm">${U.esc(p.name)}</b></td>
            <td><span class="badge">${U.esc(p.type)}</span></td>
            <td><span class="badge ${p.st==='active'?'badge-good':p.st==='draft'?'badge-warn':'badge'}">${
              p.st==='active'?'กำลังใช้':p.st==='draft'?'ฉบับร่าง':'สิ้นสุด'}</span></td>
            <td class="r num">${U.nf(p.used)} ครั้ง</td>
            <td class="r num b7">${U.baht(p.revenue)}</td>
            <td class="t-sm muted">${U.esc(p.until)}</td></tr>`).join('')}
          </tbody></table></div>
      </div>`;

    const paintCam = () => {
      el.querySelector('#camRows').innerHTML = st().campaigns.map((c,i)=>`<tr>
        <td><b class="t-sm">${U.esc(c.name)}</b><div class="t-xs muted">${U.esc(c.days)}</div></td>
        <td class="t-sm">${U.esc(c.ch)}</td>
        <td><span class="badge ${c.st==='active'?'badge-good':'badge'}">${c.st==='active'?'กำลังยิง':'หยุดชั่วคราว'}</span></td>
        <td class="r num">${U.baht(c.spend)}</td>
        <td class="r num b7">${U.baht(c.revenue)}</td>
        <td class="r"><span class="badge ${c.roas>=4?'badge-good':c.roas>=2.7?'badge-warn':'badge-bad'}">${U.nf(c.roas,2)}x</span></td>
        <td class="r num">${c.newCust}</td>
        <td class="r num t-sm">${U.baht(c.cac,0)}</td>
        <td class="r"><div class="row g6" style="justify-content:flex-end">
          ${c.roas<2.7 ? `<button class="btn btn-xs btn-bad" data-stop="${i}">หยุด</button>`
                       : `<button class="btn btn-xs btn-soft" data-plus="${i}">+20% งบ</button>`}
        </div></td></tr>`).join('');
      el.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => {
        const c = st().campaigns[+b.dataset.plus];
        c.spend = Math.round(c.spend*1.2); c.revenue = Math.round(c.spend*c.roas);
        U.toast('เพิ่มงบ "'+c.name+'" เป็น '+U.baht(c.spend),'ok'); paintCam(); });
      el.querySelectorAll('[data-stop]').forEach(b => b.onclick = () => {
        const c = st().campaigns[+b.dataset.stop]; c.st = c.st==='active' ? 'paused' : 'active';
        U.toast((c.st==='paused'?'หยุด':'เปิด')+' Campaign "'+c.name+'" แล้ว','ok'); paintCam(); });
    };
    paintCam();
    el.querySelector('#mkNew2').onclick = () => A.go('promotion');
    el.querySelector('#toPromo').onclick = () => A.go('promotion');
    el.querySelector('#boost20').onclick = () => {
      const c = st().campaigns.find(x=>x.name===best.name);
      c.spend = Math.round(c.spend*1.2); c.revenue = Math.round(c.spend*c.roas);
      U.toast('เพิ่มงบ "'+c.name+'" +20% แล้ว','ok'); paintCam(); };
    el.querySelector('#mvBudget').onclick = () => {
      const w = st().campaigns.find(x=>x.name===worst.name), b2 = st().campaigns.find(x=>x.name===best.name);
      const moved = w.spend; w.st='paused'; w.spend=0; w.revenue=0;
      b2.spend += moved; b2.revenue = Math.round(b2.spend*b2.roas);
      U.toast('ย้ายงบ '+U.baht(moved)+' ไปที่ "'+b2.name+'" แล้ว','ai'); paintCam(); };
  };

  /* ============================================================
     PROMOTION BUILDER (Wizard 5 ขั้น)
     ============================================================ */
  window.PAGES.promotion = function (el, actions, q) {
    const W = { step:1, goal:q.goal || '', menus:[], type:'', disc:20, days:7, name:'' };
    const GOALS = [
      { k:'sales',   ic:'💰', t:'ยอดขาย',         d:'ดันยอดรวมให้ถึงเป้าเดือนนี้' },
      { k:'newcust', ic:'✨', t:'ลูกค้าใหม่',      d:'ให้คนที่ยังไม่เคยซื้อ ลองเป็นครั้งแรก' },
      { k:'repeat',  ic:'🔁', t:'ลูกค้าซื้อซ้ำ',   d:'ให้ลูกค้าเดิมกลับมาถี่ขึ้น' },
      { k:'winback', ic:'💔', t:'เรียกลูกค้าเก่า',  d:`ดึงลูกค้า ${D.crm.lost} คนที่หายไปเกิน 30 วัน` },
      { k:'clear',   ic:'📦', t:'ระบายเมนู',       d:'ดันเมนูที่ขายไม่ออกหรือวัตถุดิบใกล้หมดอายุ' }
    ];
    const TYPES = [
      { k:'discount', ic:'🏷️', t:'Discount',     d:'ลดราคาเป็นบาทหรือเปอร์เซ็นต์' },
      { k:'bogo',     ic:'🎁', t:'Buy 1 Get 1',  d:'ซื้อ 1 แถม 1 เหมาะกับเครื่องดื่ม' },
      { k:'bundle',   ic:'🍱', t:'Bundle',       d:'จับคู่เมนูขายเป็นเซ็ตราคาพิเศษ' },
      { k:'coupon',   ic:'🎟️', t:'Coupon',       d:'คูปองส่งให้ลูกค้าเฉพาะกลุ่ม' }
    ];

    actions.innerHTML = `<button class="btn btn-ghost btn-sm" id="pList">ดู Promotion ทั้งหมด</button>`;
    actions.querySelector('#pList').onclick = () => A.go('marketing');
    el.innerHTML = `<div class="steps mb24" id="pSteps"></div><div id="pStage"></div>`;

    const stage = () => el.querySelector('#pStage');
    const steps = () => {
      const names = ['เป้าหมาย','เลือกเมนู','รูปแบบโปร','กำหนดเวลา','ตรวจสอบ'];
      el.querySelector('#pSteps').innerHTML = names.map((n,i)=>{
        const k=i+1, cls = k===W.step?'on':k<W.step?'done':'';
        return `<div class="step-i ${cls}"><span class="step-n">${k<W.step?'✓':k}</span>
          <span class="step-l">${n}</span></div>${i<4?`<span class="step-line ${k<W.step?'done':''}"></span>`:''}`;
      }).join('');
    };
    const nav = (back, next, nextLabel) => `<div class="row between mt24 wrap g12">
      ${back ? `<button class="btn btn-ghost" id="pBack">← ย้อนกลับ</button>` : '<span></span>'}
      <button class="btn btn-primary btn-lg" id="pNext">${nextLabel || 'ต่อไป →'}</button></div>`;
    const bind = () => {
      const b = el.querySelector('#pBack'), n = el.querySelector('#pNext');
      if (b) b.onclick = () => go(W.step-1);
      if (n) n.onclick = () => next();
    };

    function s1(){
      stage().innerHTML = `<div class="card card-p">
        <span class="badge badge-brand">ขั้นที่ 1</span>
        <h2 class="mt12">คุณต้องการเพิ่มอะไร?</h2>
        <p class="muted mt8">AI จะออกแบบโปรโมชันให้ตรงกับเป้าหมายนี้ พร้อมคำนวณผลที่คาดว่าจะได้</p>
        <div class="grid g-3 mt24" style="gap:12px">
          ${GOALS.map(g=>`<button class="choice choice-c ${W.goal===g.k?'on':''}" data-g="${g.k}">
            <span class="ci">${g.ic}</span><span><b>${g.t}</b><br><span class="t-xs muted">${g.d}</span></span></button>`).join('')}
        </div>
        ${W.goal ? `<div class="ai-strip mt20"><div class="ic">🤖</div><div class="t-sm">${goalNote()}</div></div>` : ''}
        ${nav(false,true)}</div>`;
      stage().querySelectorAll('[data-g]').forEach(b => b.onclick = () => { W.goal = b.dataset.g; s1(); });
      bind();
    }
    function goalNote(){
      return ({
        sales: `เดือนนี้ทำได้ ${U.baht(D.month.revenue)} จากเป้า ${U.baht(D.store.goalMonth)} — เหลืออีก ${U.baht(D.store.goalMonth-D.month.revenue)} ใน ${D.month.daysInMonth-D.month.days} วัน แนะนำ <b>Bundle</b> เพื่อดัน AOV เร็วที่สุด`,
        newcust: `ลูกค้าใหม่ 30 วันล่าสุด ${D.crm.new30} คน CAC ${U.baht(D.marketing.cac,0)} — แนะนำ <b>Discount ครั้งแรก</b> คู่กับโฆษณาที่ ROAS สูงสุด`,
        repeat: `Repeat rate ปัจจุบัน ${U.pc(D.crm.repeatRate)} ซื้อซ้ำทุก ${U.nf(D.crm.avgVisitGap,1)} วัน — แนะนำ <b>คูปองใช้ครั้งถัดไป</b> เพื่อบีบรอบให้สั้นลง`,
        winback: `มีลูกค้า <b>${D.crm.lost} คน</b> หายไปเกิน 30 วัน มูลค่าที่เสียราว ${U.baht(D.crm.lost*120)}/เดือน — แนะนำ <b>Coupon ลด 20 บาท อายุ 7 วัน</b>`,
        clear: `กะเพราทะเลขายได้ 0 จานวันนี้ และวัตถุดิบทะเลหมดสต็อก — ควรระบายเมนูที่ margin ดีแต่คนไม่รู้จัก เช่น ข้าวไข่เจียวหมูสับ (${U.pc(D.mi('m5').margin)})`
      })[W.goal] || '';
    }
    function s2(){
      const sug = W.goal==='winback' ? ['m1'] : W.goal==='clear' ? ['m5','m6'] : ['m1','m9'];
      if (!W.menus.length) W.menus = sug.slice();
      stage().innerHTML = `<div class="card card-p">
        <span class="badge badge-brand">ขั้นที่ 2</span>
        <h2 class="mt12">เลือกเมนูที่จะใช้ในโปรโมชัน</h2>
        <p class="muted mt8">AI เลือกเมนูที่เหมาะกับเป้าหมายไว้ให้แล้ว ปรับได้ตามต้องการ</p>
        <div class="grid g-4 mt24" style="gap:12px">
          ${st().menu.map(m=>`<button class="choice ${W.menus.includes(m.id)?'on':''}" data-m="${m.id}" style="padding:11px">
            <span class="ci">${m.emoji}</span>
            <span class="grow" style="text-align:left"><b class="t-sm">${U.esc(m.name)}</b><br>
              <span class="t-xs muted">${U.baht(m.price)} · margin ${U.pc(m.margin)}</span></span>
            ${sug.includes(m.id)?'<span class="badge badge-ai">AI</span>':''}</button>`).join('')}
        </div>
        <div class="ai-strip mt20"><div class="ic">🤖</div><div class="t-sm">
          เลือกแล้ว ${W.menus.length} เมนู · margin เฉลี่ยของกลุ่มนี้
          <b>${U.pc(W.menus.length ? W.menus.reduce((s,id)=>s+(st().menu.find(m=>m.id===id)||{margin:0}).margin,0)/W.menus.length : 0)}</b>
          — ควรเหลือ margin หลังลดราคาไม่ต่ำกว่า 20% เพื่อไม่ให้ขายแล้วขาดทุน</div></div>
        ${nav(true,true)}</div>`;
      stage().querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        const id = b.dataset.m;
        W.menus = W.menus.includes(id) ? W.menus.filter(x=>x!==id) : W.menus.concat(id);
        s2(); });
      bind();
    }
    function s3(){
      if (!W.type) W.type = W.goal==='winback' ? 'coupon' : W.goal==='sales' ? 'bundle' : 'discount';
      const first = st().menu.find(m=>m.id===W.menus[0]) || st().menu[0];
      stage().innerHTML = `<div class="card card-p">
        <span class="badge badge-brand">ขั้นที่ 3</span>
        <h2 class="mt12">เลือกรูปแบบโปรโมชัน</h2>
        <div class="grid g-4 mt24" style="gap:12px">
          ${TYPES.map(t=>`<button class="choice choice-c ${W.type===t.k?'on':''}" data-t="${t.k}">
            <span class="ci">${t.ic}</span><span><b>${t.t}</b><br><span class="t-xs muted">${t.d}</span></span></button>`).join('')}
        </div>
        <div class="grid g-2 mt20" style="gap:16px">
          <div class="field"><label class="label">ส่วนลด (บาทต่อบิล)</label>
            <div class="input-prefix"><span>฿</span><input class="input num" id="pDisc" type="number" min="0" value="${W.disc}"></div>
            <span class="hint">ระบบจะเตือนถ้าลดมากจนกำไรติดลบ</span></div>
          <div class="tile">
            <div class="up muted mb8">ผลกระทบต่อกำไรต่อบิล</div>
            <div id="pImpact"></div></div>
        </div>
        ${nav(true,true)}</div>`;
      const impact = () => {
        W.disc = +stage().querySelector('#pDisc').value || 0;
        const after = first.profit - W.disc, mg = (first.price - W.disc) ? after/(first.price-W.disc)*100 : 0;
        stage().querySelector('#pImpact').innerHTML = `
          <div class="between t-sm"><span class="muted">${U.esc(first.name)} ราคาปกติ</span><b class="num">${U.baht(first.price)}</b></div>
          <div class="between t-sm"><span class="muted">ราคาหลังโปร</span><b class="num">${U.baht(first.price-W.disc)}</b></div>
          <div class="between t-sm"><span class="muted">กำไรเดิม</span><b class="num">${U.baht(first.profit)}</b></div>
          <div class="between t-sm"><span class="muted">กำไรหลังโปร</span>
            <b class="num" style="color:${after>0?'var(--good)':'var(--bad)'}">${U.baht(after)}</b></div>
          <div class="bar mt8 ${after>0?'bar-good':'bar-bad'}"><i style="width:${Math.max(3,Math.min(100,mg*2))}%"></i></div>
          <div class="t-xs mt8 ${after>0?'muted':''}" style="${after<=0?'color:var(--bad);font-weight:700':''}">
            ${after>0 ? `margin หลังโปร ${U.pc(mg)} — ยังมีกำไร` : '⚠️ ลดมากเกินไป จะขายขาดทุนทุกบิล'}</div>`;
      };
      stage().querySelectorAll('[data-t]').forEach(b => b.onclick = () => { W.type = b.dataset.t; s3(); });
      stage().querySelector('#pDisc').oninput = impact; impact(); bind();
    }
    function s4(){
      stage().innerHTML = `<div class="card card-p">
        <span class="badge badge-brand">ขั้นที่ 4</span>
        <h2 class="mt12">กำหนดเวลาและกลุ่มเป้าหมาย</h2>
        <div class="grid g-2 mt24" style="gap:16px">
          <div class="field"><label class="label">ระยะเวลา</label>
            <div class="grid g-4" style="gap:8px">
              ${[3,7,14,30].map(d=>`<button class="choice ctr ${W.days===d?'on':''}" data-d="${d}" style="justify-content:center;padding:12px">
                <b class="num">${d}</b> วัน</button>`).join('')}</div></div>
          <div class="field"><label class="label">วันที่เริ่ม</label>
            <input class="input" type="date" value="2026-08-20">
            <span class="hint">สิ้นสุด ${new Date(2026,7,20+W.days).getDate()} ${U.TH_M[7]} 2569</span></div>
          <div class="field" style="grid-column:1/-1"><label class="label">ส่งให้กลุ่มไหน</label>
            <div class="grid g-3" style="gap:10px">
              ${[['ทุกคน', D.crm.total],['ลูกค้าที่หายไปเกิน 30 วัน', D.crm.lost],['VIP', 64]]
                .map(([l,n],i)=>`<button class="choice ${((W.goal==='winback'&&i===1)||(W.goal!=='winback'&&i===0))?'on':''}" data-aud="${i}" style="padding:12px">
                  <span class="grow" style="text-align:left"><b class="t-sm">${l}</b><br>
                    <span class="t-xs muted">${U.nf(n)} คน</span></span></button>`).join('')}</div></div>
          <div class="field" style="grid-column:1/-1"><label class="label">ช่องทางที่จะส่ง</label>
            <div class="row wrap g8">${['LINE OA','Facebook','ป้ายหน้าร้าน','SMS','ในแอปสั่งอาหาร']
              .map((c,i)=>`<button class="badge badge-lg ${i<2?'badge-brand':''}" data-cn="${i}">${i<2?'✓ ':''}${c}</button>`).join('')}</div></div>
        </div>
        ${nav(true,true,'ดู Preview →')}</div>`;
      stage().querySelectorAll('[data-d]').forEach(b => b.onclick = () => { W.days = +b.dataset.d; s4(); });
      stage().querySelectorAll('[data-aud]').forEach(b => b.onclick = () => {
        stage().querySelectorAll('[data-aud]').forEach(x=>x.classList.toggle('on',x===b)); });
      stage().querySelectorAll('[data-cn]').forEach(b => b.onclick = () => {
        const on = b.classList.toggle('badge-brand');
        b.textContent = (on?'✓ ':'') + b.textContent.replace('✓ ',''); });
      bind();
    }
    function s5(){
      const first = st().menu.find(m=>m.id===W.menus[0]) || st().menu[0];
      const isWin = W.goal==='winback';
      const title = isWin ? 'กลับมากินกะเพราอีกครั้ง' : W.goal==='sales' ? 'เซ็ตอิ่มคุ้ม กะเพรา + เครื่องดื่ม' :
        W.goal==='clear' ? 'เมนูซ่อนเพชร ลดพิเศษ' : W.goal==='newcust' ? 'ครั้งแรกต้องลอง' : 'ซื้อซ้ำรับส่วนลด';
      const aud = isWin ? D.crm.lost : W.goal==='newcust' ? 400 : D.crm.total;
      const cvr = isWin ? .22 : .12;
      const expOrders = Math.round(aud*cvr);
      const billProfit = D.today.profit / D.today.orders;          // กำไรเฉลี่ยต่อบิลจริงในระบบ
      const expRev = expOrders*(D.today.aov-W.disc);
      const expProfit = expOrders*(billProfit-W.disc);              // กำไรจากบิลแรก
      const ltProfit = expOrders*billProfit*3;                      // ถ้ากลับมาซื้อซ้ำอีก 3 ครั้งใน 90 วัน

      stage().innerHTML = `<div class="grid g-3-2" style="gap:16px">
        <div class="card card-p">
          <span class="badge badge-brand">ขั้นที่ 5</span>
          <h2 class="mt12">ตรวจสอบก่อนสร้าง Campaign</h2>
          <div class="tile mt20" style="background:linear-gradient(135deg,var(--brand-soft),#fff);border-color:var(--brand-line)">
            <div class="ctr" style="padding:14px 8px">
              <div style="font-size:34px">${first.emoji}</div>
              <h3 class="mt8">${U.esc(title)}</h3>
              <p class="t-sm muted mt8">${isWin?`สำหรับลูกค้าที่ไม่ได้ซื้อเกิน 21 วัน`:`สำหรับ${W.goal==='newcust'?'ลูกค้าใหม่':'ลูกค้าทุกคน'}`}</p>
              <div class="row g10 mt12" style="justify-content:center">
                <span class="badge badge-lg badge-bad">ส่วนลด ${U.baht(W.disc)}</span>
                <span class="badge badge-lg">${TYPES.find(t=>t.k===W.type).t}</span>
                <span class="badge badge-lg">ระยะเวลา ${W.days} วัน</span></div>
              <div class="row wrap g6 mt16" style="justify-content:center">
                ${W.menus.map(id=>{ const m = st().menu.find(x=>x.id===id); return m?`<span class="badge">${m.emoji} ${U.esc(m.name)}</span>`:''; }).join('')}</div>
            </div>
          </div>
          <div class="grid g-2 mt20" style="gap:12px">
            ${[['เป้าหมาย', GOALS.find(g=>g.k===W.goal).t],['กลุ่มเป้าหมาย', U.nf(aud)+' คน'],
               ['ระยะเวลา', W.days+' วัน (เริ่ม 20 ส.ค.)'],['ช่องทาง','LINE OA + Facebook']]
              .map(([l,v])=>`<div class="tile"><div class="t-xs muted b6">${l}</div>
                <div class="b7 mt4 t-sm">${U.esc(String(v))}</div></div>`).join('')}
          </div>
          <div class="row between mt24 wrap g12">
            <button class="btn btn-ghost" id="pBack">← ย้อนกลับ</button>
            <div class="row g8"><button class="btn btn-soft" id="pDraft">บันทึกฉบับร่าง</button>
              <button class="btn btn-primary btn-lg" id="pCreate">สร้าง Campaign</button></div></div>
        </div>

        <div class="col g16">
          <div class="card">
            <div class="card-h"><h4>ผลที่คาดว่าจะได้</h4><span class="badge badge-ai">AI ประมาณการ</span></div>
            <div class="card-b col g12">
              ${[['อัตราการใช้สิทธิ์ที่คาด', U.pc(cvr*100,0), ''],
                 ['จำนวนบิลที่คาดว่าจะเกิด', U.nf(expOrders)+' บิล', ''],
                 ['ยอดขายที่คาดว่าจะได้', U.baht(expRev), ''],
                 ['ต้นทุนส่วนลดรวม', '−'+U.baht(expOrders*W.disc), 'var(--bad)'],
                 ['กำไรจากบิลแรก', U.baht(expProfit), expProfit>0?'var(--good-ink)':'var(--warn-ink)'],
                 ['กำไรถ้าลูกค้ากลับมาซื้อซ้ำ 3 ครั้ง', U.baht(ltProfit), 'var(--good)']]
                .map(([l,v,c],i)=>`<div class="between"><span class="t-sm muted">${l}</span>
                  <b class="num" style="font-size:${i>=4?'18px':'15px'};${c?'color:'+c:''}">${v}</b></div>`).join('')}
              <div class="bar bar-lg mt4"><i style="width:${Math.min(100,cvr*100*3)}%"></i></div>
              <div class="t-xs muted">คำนวณจากกำไรเฉลี่ยต่อบิลจริง ${U.baht(billProfit,0)} และพฤติกรรมลูกค้าในระบบ 19 วันที่ผ่านมา</div>
              ${expProfit<=0 ? `<div class="ai-strip mt4" style="padding:11px 13px"><div class="ic" style="width:24px;height:24px;font-size:12px">💡</div>
                <div class="t-sm">ส่วนลด ${U.baht(W.disc)} ทำให้ <b>บิลแรกแทบไม่เหลือกำไร</b> — ให้มองเป็น
                <b>ต้นทุนดึงลูกค้ากลับ ${U.baht(W.disc)}/คน</b> ซึ่งยังถูกกว่าค่าหาลูกค้าใหม่ (CAC ${U.baht(D.marketing.cac,0)})
                ${U.nf(D.marketing.cac/W.disc,1)} เท่า และคุ้มทันทีที่ลูกค้ากลับมาซื้อครั้งที่ 2<br>
                <span class="muted">ถ้าต้องการให้บิลแรกมีกำไร ให้ลดเหลือ ${U.baht(Math.floor(billProfit/2))} หรือใช้เป็นของแถม (ไข่ดาว ต้นทุน ${U.baht(D.mi('m7').cost)}) แทนส่วนลดเงินสด</span></div></div>` : ''}
            </div>
          </div>
          <div class="ai-card"><div class="in">
            <span class="ai-badge">🤖 ข้อควรระวัง</span>
            <div class="col g10 mt16">
              ${[`หลังจบโปรโมชัน ให้ดูว่าลูกค้ากลุ่มนี้กลับมาซื้อในราคาเต็มหรือไม่ ถ้าไม่ แสดงว่าโปรดึงแต่คนล่าส่วนลด`,
                 `ส่วนลด ${U.baht(W.disc)} ทำให้ margin ของ ${U.esc(first.name)} เหลือ ${U.pc(Math.max(0,(first.profit-W.disc)/(first.price-W.disc)*100))}` +
                 ((first.profit-W.disc) > 0 ? ' — ยังอยู่ในระดับที่รับได้' : ' — ควรจำกัดสิทธิ์ 1 ครั้ง/คน และห้ามใช้ร่วมกับโปรอื่น'),
                 `อย่ายิงพร้อมกับ Campaign ที่ ROAS ต่ำ เพราะจะแยกไม่ออกว่ายอดที่เพิ่มมาจากอะไร`]
                .map((t,i)=>`<div class="rec"><span class="rn">${i+1}</span><span class="t-sm">${t}</span></div>`).join('')}
            </div>
          </div></div>
        </div></div>`;
      stage().querySelector('#pBack').onclick = () => go(4);
      stage().querySelector('#pDraft').onclick = () => { U.toast('บันทึกฉบับร่างแล้ว','ok'); };
      stage().querySelector('#pCreate').onclick = () => {
        D.promotions.unshift({ name:title, type:TYPES.find(t=>t.k===W.type).t, st:'active',
          used:0, revenue:0, until:(20+W.days)+' ส.ค.' });
        st().campaigns.push({ name:title, ch:'LINE OA', st:'active', spend:0, revenue:0,
          orders:0, newCust:0, days:'20–'+(20+W.days)+' ส.ค.', roas:0, cac:0 });
        U.toast('สร้าง Campaign "'+title+'" แล้ว','ok');
        setTimeout(()=>A.go('marketing'), 600);
      };
    }
    function next(){
      if (W.step===1 && !W.goal) return U.toast('เลือกเป้าหมาย 1 ข้อ','warn');
      if (W.step===2 && !W.menus.length) return U.toast('เลือกเมนูอย่างน้อย 1 รายการ','warn');
      go(W.step+1);
    }
    function go(n){ W.step = Math.max(1, Math.min(5, n)); steps(); [s1,s2,s3,s4,s5][W.step-1]();
      window.scrollTo({ top:0, behavior:'smooth' }); }
    go(W.goal ? 2 : 1);
  };
})();
