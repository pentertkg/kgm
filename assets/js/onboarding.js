/* ============================================================
   onboarding.js — ส่วน JS ของหน้า onboarding.html
   แยกออกจาก HTML เพื่อให้ตั้ง CSP script-src 'self' ได้บน production
   ============================================================ */
(function(){
  const U = window.UI;
  const S = {
    step: 1,
    name:'', emoji:'🌿', format:'', type:'ตามสั่ง / อาหารจานเดียว',
    location:'', open:'08:00', close:'20:00', staff:'2',
    goal: 300000, aov: 65,
    menu: [
      { on:true,  name:'กะเพราหมูกรอบ',    emoji:'🍚', price:69, cost:49, cat:'จานเดียว' },
      { on:true,  name:'กะเพราหมู',        emoji:'🥘', price:60, cost:38, cat:'จานเดียว' },
      { on:true,  name:'กะเพราไก่',        emoji:'🍗', price:55, cost:33, cat:'จานเดียว' },
      { on:true,  name:'ข้าวผัดหมู',       emoji:'🍛', price:55, cost:31, cat:'จานเดียว' },
      { on:true,  name:'ไข่ดาว',           emoji:'🍳', price:12, cost:6,  cat:'ท็อปปิ้ง' },
      { on:true,  name:'น้ำเปล่า',         emoji:'💧', price:10, cost:5,  cat:'เครื่องดื่ม' },
      { on:true,  name:'น้ำอัดลม',         emoji:'🥤', price:20, cost:12, cat:'เครื่องดื่ม' },
      { on:false, name:'ข้าวไข่เจียวหมูสับ', emoji:'🍳', price:50, cost:27, cat:'จานเดียว' },
      { on:false, name:'ชาเย็น',           emoji:'🧋', price:25, cost:11, cat:'เครื่องดื่ม' }
    ]
  };
  const FORMATS = [
    { v:'Street Food',   ic:'🛒', d:'รถเข็น / แผงลอย / หน้าบ้าน' },
    { v:'Food Truck',    ic:'🚚', d:'รถขายอาหารเคลื่อนที่' },
    { v:'Kiosk',         ic:'🏪', d:'ซุ้มในห้าง / ปั๊มน้ำมัน' },
    { v:'ร้านอาหาร',      ic:'🍽️', d:'มีหน้าร้าน มีที่นั่ง' },
    { v:'Delivery Only', ic:'🛵', d:'ขายผ่านแอปเท่านั้น ไม่มีหน้าร้าน' }
  ];
  const GOALS = [50000, 100000, 300000, 500000];
  const stage = document.getElementById('stage');

  const sel = () => S.menu.filter(m => m.on);
  const calc = () => {
    const perDay = S.goal / 30;
    const orders = Math.round(perDay / (S.aov || 1));
    return { perDay, orders, aov: S.aov, perHour: perDay / 12 };
  };

  function renderSteps(){
    const names = ['ข้อมูลร้าน','เป้าหมายร้าน','เพิ่มเมนู','พร้อมเปิดร้าน'];
    document.getElementById('stepNum').textContent = S.step;
    document.getElementById('steps').innerHTML = names.map((n,i)=>{
      const k = i+1, cls = k === S.step ? 'on' : k < S.step ? 'done' : '';
      return `<div class="step-i ${cls}"><span class="step-n">${k < S.step ? '✓' : k}</span>
        <span class="step-l">${n}</span></div>${i<3?`<span class="step-line ${k<S.step?'done':''}"></span>`:''}`;
    }).join('');
  }

  /* ================= STEP 1 ================= */
  function step1(){
    stage.innerHTML = `
    <div class="ob-card">
      <span class="badge badge-brand">ขั้นที่ 1</span>
      <h2 class="mt12">ร้านของคุณชื่ออะไร?</h2>
      <p class="muted mt8">ข้อมูลพื้นฐานนี้จะใช้แสดงบนใบเสร็จ หน้าสั่งอาหาร และรายงานทั้งหมด</p>

      <div class="grid g-2 mt24">
        <div class="field" style="grid-column:1/-1">
          <label class="label">ชื่อร้าน *</label>
          <div class="row g10">
            <button class="btn btn-ghost" id="emojiBtn" style="width:52px;height:46px;font-size:22px;flex:none">${S.emoji}</button>
            <input class="input" id="f_name" placeholder="เช่น ร้านกะเพราเฮียสม" value="${U.esc(S.name)}">
          </div>
          <span class="hint">กดที่ไอคอนเพื่อเปลี่ยนสัญลักษณ์ร้าน</span>
        </div>

        <div class="field" style="grid-column:1/-1">
          <label class="label">รูปแบบร้าน *</label>
          <div class="grid g-3" style="gap:10px" id="fmtWrap">
            ${FORMATS.map(f=>`<button class="choice choice-c ${S.format===f.v?'on':''}" data-fmt="${f.v}">
              <span class="ci">${f.ic}</span>
              <span><span class="b7">${f.v}</span><br><span class="t-xs muted">${f.d}</span></span></button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label class="label">ประเภทอาหาร</label>
          <select class="select" id="f_type">
            ${['ตามสั่ง / อาหารจานเดียว','ก๋วยเตี๋ยว / เส้น','ปิ้งย่าง / ทอด','ข้าวมันไก่ / ข้าวหมู','ของหวาน / เครื่องดื่ม','อาหารอีสาน / ส้มตำ','อื่นๆ']
              .map(t=>`<option ${S.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="label">ทำเล</label>
          <input class="input" id="f_loc" placeholder="เช่น ซอยสุขุมวิท 23 หน้าออฟฟิศ" value="${U.esc(S.location)}">
        </div>
        <div class="field">
          <label class="label">เวลาเปิด–ปิด</label>
          <div class="row g8">
            <input class="input" type="time" id="f_open" value="${S.open}">
            <span class="muted">ถึง</span>
            <input class="input" type="time" id="f_close" value="${S.close}">
          </div>
        </div>
        <div class="field">
          <label class="label">จำนวนพนักงาน (รวมตัวคุณ)</label>
          <select class="select" id="f_staff">
            ${['1','2','3','4','5 คนขึ้นไป'].map(n=>`<option ${S.staff===n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="row between mt24 wrap g12">
        <a class="btn btn-ghost" href="index.html">← กลับหน้าแรก</a>
        <button class="btn btn-primary btn-lg" id="next1">ต่อไป: ตั้งเป้าหมาย →</button>
      </div>
    </div>`;

    const EMO = ['🌿','🍜','🍗','🍚','🌮','🥘','🍢','🧋','🍤','🔥','🥟','🍛'];
    document.getElementById('emojiBtn').onclick = () => {
      S.emoji = EMO[(EMO.indexOf(S.emoji)+1) % EMO.length];
      document.getElementById('emojiBtn').textContent = S.emoji;
    };
    stage.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => {
      S.format = b.dataset.fmt;
      stage.querySelectorAll('[data-fmt]').forEach(x => x.classList.toggle('on', x === b));
    });
    document.getElementById('next1').onclick = () => {
      S.name = document.getElementById('f_name').value.trim();
      S.type = document.getElementById('f_type').value;
      S.location = document.getElementById('f_loc').value.trim();
      S.open = document.getElementById('f_open').value;
      S.close = document.getElementById('f_close').value;
      S.staff = document.getElementById('f_staff').value;
      if (!S.name) { U.toast('กรุณาใส่ชื่อร้านก่อนไปขั้นถัดไป','warn'); document.getElementById('f_name').focus(); return; }
      if (!S.format) { U.toast('เลือกรูปแบบร้าน 1 อย่าง','warn'); return; }
      go(2);
    };
  }

  /* ================= STEP 2 ================= */
  function step2(){
    stage.innerHTML = `
    <div class="ob-card">
      <span class="badge badge-brand">ขั้นที่ 2</span>
      <h2 class="mt12">คุณอยากให้ร้านมียอดขายเดือนละเท่าไร?</h2>
      <p class="muted mt8">ระบบจะแตกเป้าใหญ่ให้เป็นเป้ารายวันที่จับต้องได้ เพื่อให้รู้ว่าต้องขายกี่จานจึงถึงเป้า</p>

      <div class="grid g-4 mt24" style="gap:10px" id="goalWrap">
        ${GOALS.map((g,i)=>`<button class="choice choice-c ${S.goal===g?'on':''}" data-goal="${g}">
          <span class="num b8" style="font-size:19px">${U.nf(g)}${i===GOALS.length-1?'+':''}</span>
          <span class="t-xs muted">บาท/เดือน</span></button>`).join('')}
      </div>

      <div class="field mt16">
        <label class="label">หรือระบุเป้าเอง (บาท/เดือน)</label>
        <div class="input-prefix" style="max-width:260px"><span>฿</span>
          <input class="input num" id="f_goal" type="number" min="0" step="10000" value="${S.goal}"></div>
      </div>

      <div class="field mt16">
        <label class="label">ราคาต่อบิลที่คาดว่าจะได้ (Average Order Value)</label>
        <div class="row g12 wrap">
          <div class="input-prefix" style="width:150px"><span>฿</span>
            <input class="input num" id="f_aov" type="number" min="1" value="${S.aov}"></div>
          <span class="hint" style="max-width:380px">ร้านตามสั่งทั่วไปอยู่ที่ 55–80 บาท/บิล ถ้าขายเครื่องดื่มควบด้วยจะดันได้ถึง 90 บาท</span>
        </div>
      </div>

      <div class="calc-box mt24">
        <div class="between wrap g12">
          <div class="row g8">${(window.ICON||(()=>""))("analytics",18)}
            <b>ถ้าอยากได้ <span class="num" id="goalEcho"></span> บาท/เดือน คุณต้องทำได้เท่านี้</b></div>
          <span class="badge" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.18)">คำนวณจาก 30 วัน</span>
        </div>
        <div class="grid g-4 mt20" id="calcOut"></div>
        <div class="mt20">
          <div class="between t-xs" style="color:#9aa5b4;margin-bottom:6px">
            <span>ยอดขายที่ต้องทำต่อชั่วโมง (เปิด 12 ชม.)</span>
            <span class="num b7" id="perHour"></span></div>
          <div class="bar bar-lg" style="background:rgba(255,255,255,.14)"><i id="feasBar" style="background:linear-gradient(90deg,#ff6a2b,#ffb089)"></i></div>
          <div class="t-xs mt8" id="feasNote" style="color:#c8d0da"></div>
        </div>
      </div>

      <div class="row between mt24 wrap g12">
        <button class="btn btn-ghost" id="back2">← ย้อนกลับ</button>
        <button class="btn btn-primary btn-lg" id="next2">ต่อไป: เพิ่มเมนู →</button>
      </div>
    </div>`;

    const paint = () => {
      const c = calc();
      document.getElementById('goalEcho').textContent = U.nf(S.goal);
      document.getElementById('calcOut').innerHTML = [
        ['ยอดขายต่อวัน', U.baht(c.perDay), 'เป้ารายวันที่ต้องทำ'],
        ['จำนวน Order ต่อวัน', U.nf(c.orders) + ' บิล', 'ที่ AOV ฿' + U.nf(S.aov)],
        ['Order ต่อชั่วโมง', U.nf(c.orders/12,1) + ' บิล', 'ช่วงเที่ยงจะหนักกว่านี้ 2–3 เท่า'],
        ['Average Order Value', U.baht(S.aov), 'ยิ่งสูง ยิ่งทำเป้าง่าย']
      ].map(([l,v,s])=>`<div><div class="cl">${l}</div><div class="cv">${v}</div>
        <div class="t-xs" style="color:#7f8b9b;margin-top:2px">${s}</div></div>`).join('');
      document.getElementById('perHour').textContent = U.baht(c.perHour);
      const feas = Math.min(100, c.orders / 300 * 100);
      document.getElementById('feasBar').style.width = feas.toFixed(0) + '%';
      const note = c.orders <= 120 ? 'ระดับพอดีสำหรับร้านเจ้าเดียว ทำคนเดียวยังไหว'
        : c.orders <= 200 ? 'ต้องมีผู้ช่วยอย่างน้อย 1 คน และควรเตรียมวัตถุดิบล่วงหน้าช่วงเช้า'
        : c.orders <= 300 ? 'ต้องมีทีม 3 คนขึ้นไป + ระบบครัวชัดเจน (Kitchen Display จะช่วยมาก)'
        : 'เป้านี้สูงมากสำหรับ 1 จุดขาย ควรพิจารณาเพิ่มสาขาหรือช่องทาง Delivery';
      document.getElementById('feasNote').textContent = note;
    };
    paint();

    stage.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => {
      S.goal = +b.dataset.goal;
      document.getElementById('f_goal').value = S.goal;
      stage.querySelectorAll('[data-goal]').forEach(x => x.classList.toggle('on', x === b));
      paint();
    });
    document.getElementById('f_goal').oninput = e => {
      S.goal = Math.max(0, +e.target.value || 0);
      stage.querySelectorAll('[data-goal]').forEach(x => x.classList.toggle('on', +x.dataset.goal === S.goal));
      paint();
    };
    document.getElementById('f_aov').oninput = e => { S.aov = Math.max(1, +e.target.value || 1); paint(); };
    document.getElementById('back2').onclick = () => go(1);
    document.getElementById('next2').onclick = () => go(3);
  }

  /* ================= STEP 3 ================= */
  function step3(){
    stage.innerHTML = `
    <div class="ob-card">
      <span class="badge badge-brand">ขั้นที่ 3</span>
      <h2 class="mt12">เพิ่มเมนูของร้าน</h2>
      <p class="muted mt8">เราเตรียมเมนูยอดนิยมของร้านตามสั่งไว้ให้แล้ว เลือกที่ขายจริง แก้ราคา/ต้นทุนได้ทันที
        ระบบจะคำนวณกำไรและ Margin ให้อัตโนมัติ</p>

      <div class="card mt20" style="overflow:hidden">
        <div class="scroll-x">
          <table class="tbl">
            <thead><tr>
              <th style="width:44px"></th><th>เมนู</th><th>Category</th>
              <th class="r">ราคาขาย</th><th class="r">ต้นทุน</th><th class="r">กำไร/จาน</th><th class="r">Margin</th>
            </tr></thead>
            <tbody id="menuRows"></tbody>
          </table>
        </div>
        <div class="card-f">
          <button class="btn btn-ghost btn-sm" id="addMenu">+ เพิ่มเมนูของร้านเอง</button>
        </div>
      </div>

      <div class="grid g-3 mt20" id="menuSum"></div>

      <div class="ai-strip mt20" id="menuAi"></div>

      <div class="row between mt24 wrap g12">
        <button class="btn btn-ghost" id="back3">← ย้อนกลับ</button>
        <button class="btn btn-primary btn-lg" id="next3">ต่อไป: สรุปร้าน →</button>
      </div>
    </div>`;
    paintMenu();
    document.getElementById('back3').onclick = () => go(2);
    document.getElementById('next3').onclick = () => {
      if (!sel().length) { U.toast('เลือกเมนูอย่างน้อย 1 รายการ','warn'); return; }
      go(4);
    };
    document.getElementById('addMenu').onclick = addMenuModal;
  }

  function paintMenu(){
    document.getElementById('menuRows').innerHTML = S.menu.map((m,i)=>{
      const profit = m.price - m.cost, margin = m.price ? profit/m.price*100 : 0;
      return `<tr style="${m.on?'':'opacity:.45'}">
        <td><button class="switch ${m.on?'on':''}" data-tog="${i}" aria-label="เปิด/ปิดเมนู"></button></td>
        <td><div class="row g10"><span style="font-size:19px">${m.emoji}</span>
          <span class="b7">${U.esc(m.name)}</span>${m.custom?'<span class="badge badge-brand">เพิ่มเอง</span>':''}</div></td>
        <td><span class="badge">${U.esc(m.cat)}</span></td>
        <td class="r"><input class="input input-sm num r" style="width:82px;text-align:right" type="number" min="0" value="${m.price}" data-p="${i}"></td>
        <td class="r"><input class="input input-sm num r" style="width:82px;text-align:right" type="number" min="0" value="${m.cost}" data-c="${i}"></td>
        <td class="r num b7" style="color:${profit>0?'var(--good)':'var(--bad)'}">${U.baht(profit)}</td>
        <td class="r">${U.marginBadge(margin)}</td></tr>`;
    }).join('');

    document.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
      S.menu[+b.dataset.tog].on = !S.menu[+b.dataset.tog].on; paintMenu(); });
    document.querySelectorAll('[data-p]').forEach(inp => inp.oninput = e => {
      S.menu[+inp.dataset.p].price = Math.max(0, +e.target.value||0); paintMenu(); });
    document.querySelectorAll('[data-c]').forEach(inp => inp.oninput = e => {
      S.menu[+inp.dataset.c].cost = Math.max(0, +e.target.value||0); paintMenu(); });

    const s = sel();
    const avgP = s.length ? s.reduce((a,m)=>a+m.price,0)/s.length : 0;
    const avgC = s.length ? s.reduce((a,m)=>a+m.cost,0)/s.length : 0;
    const avgM = avgP ? (avgP-avgC)/avgP*100 : 0;
    document.getElementById('menuSum').innerHTML = [
      ['จำนวนเมนูที่เปิดขาย', U.nf(s.length) + ' รายการ', 'menu'],
      ['ราคาขายเฉลี่ย', U.baht(avgP,0), 'money'],
      ['Margin เฉลี่ย', U.pc(avgM), 'analytics']
    ].map(([l,v,ic])=>`<div class="tile row g12">
      ${(window.ICON||(()=>''))(ic,20)}
      <div><div class="t-xs muted b6">${l}</div><div class="num b8" style="font-size:19px">${v}</div></div></div>`).join('');

    const low = s.filter(m => m.price && (m.price-m.cost)/m.price*100 < 30);
    const best = s.slice().sort((a,b)=>((b.price-b.cost)/b.price)-((a.price-a.cost)/a.price))[0];
    document.getElementById('menuAi').innerHTML = `
      <div class="ic">AI</div>
      <div class="t-sm">
        <b>AI ตรวจเมนูให้แล้ว</b><br>
        ${low.length
          ? `พบ <b>${low.length} เมนู</b> ที่ Margin ต่ำกว่า 30% (${low.map(m=>U.esc(m.name)).join(', ')})
             — เมนูกลุ่มนี้ขายดีแต่กำไรน้อย ควรขึ้นราคา 3–5 บาท หรือลดต้นทุนวัตถุดิบ`
          : 'ทุกเมนูมี Margin เกิน 30% ถือว่าโครงสร้างราคาแข็งแรงดี'}
        ${best ? `<br>เมนูที่กำไรดีที่สุดคือ <b>${U.esc(best.name)}</b> (${U.pc((best.price-best.cost)/best.price*100)})
          — ควรดันเป็นตัวชูโรงหรือจับคู่ทำ Bundle` : ''}
      </div>`;
  }

  function addMenuModal(){
    U.modal({
      title:'เพิ่มเมนูของร้าน', icon:(window.ICON||(()=>''))('menu',20), okText:'เพิ่มเมนูนี้', cancelText:'ยกเลิก',
      body:`<div class="grid g-2" style="gap:14px">
        <div class="field" style="grid-column:1/-1"><label class="label">ชื่อเมนู *</label>
          <input class="input" id="n_name" placeholder="เช่น กะเพราเนื้อ"></div>
        <div class="field"><label class="label">ราคาขาย (บาท) *</label>
          <input class="input num" id="n_price" type="number" min="0" placeholder="69"></div>
        <div class="field"><label class="label">ต้นทุนต่อจาน (บาท) *</label>
          <input class="input num" id="n_cost" type="number" min="0" placeholder="45"></div>
        <div class="field"><label class="label">Category</label>
          <select class="select" id="n_cat"><option>จานเดียว</option><option>ท็อปปิ้ง</option><option>เครื่องดื่ม</option><option>ของหวาน</option></select></div>
        <div class="field"><label class="label">ไอคอน</label>
          <select class="select" id="n_emoji">${['🍽️','🍚','🥘','🍗','🍜','🍛','🍳','🥤','🧋','🍤','🌮','🥟'].map(e=>`<option>${e}</option>`).join('')}</select></div>
        <div class="tile" style="grid-column:1/-1;background:var(--surface-2)">
          <div class="between"><span class="t-sm b7">ระบบคำนวณให้</span><span class="badge badge-ai">อัตโนมัติ</span></div>
          <div class="grid g-2 mt12" id="n_out">
            <div><div class="t-xs muted">กำไรต่อจาน</div><div class="num b8" style="font-size:19px">฿0</div></div>
            <div><div class="t-xs muted">Margin</div><div class="num b8" style="font-size:19px">0.0%</div></div>
          </div>
        </div></div>`,
      onMount(el){
        const upd = () => {
          const p = +el.querySelector('#n_price').value || 0, c = +el.querySelector('#n_cost').value || 0;
          const pr = p - c, mg = p ? pr/p*100 : 0;
          el.querySelector('#n_out').innerHTML = `
            <div><div class="t-xs muted">กำไรต่อจาน</div>
              <div class="num b8" style="font-size:19px;color:${pr>0?'var(--good)':'var(--bad)'}">${U.baht(pr)}</div></div>
            <div><div class="t-xs muted">Margin</div>
              <div class="row g8"><div class="num b8" style="font-size:19px">${U.pc(mg)}</div>${p?U.marginBadge(mg):''}</div></div>`;
        };
        el.querySelector('#n_price').oninput = upd; el.querySelector('#n_cost').oninput = upd;
      },
      onOk(el){
        const name = el.querySelector('#n_name').value.trim();
        const price = +el.querySelector('#n_price').value || 0;
        const cost = +el.querySelector('#n_cost').value || 0;
        if (!name || !price) { U.toast('กรุณาใส่ชื่อเมนูและราคาขาย','warn'); return false; }
        S.menu.push({ on:true, custom:true, name, price, cost, cat:el.querySelector('#n_cat').value, emoji:el.querySelector('#n_emoji').value });
        paintMenu(); U.toast('เพิ่ม "'+name+'" แล้ว','ok');
      }
    });
  }

  /* ================= STEP 4 ================= */
  function step4(){
    const s = sel(), c = calc();
    const avgP = s.reduce((a,m)=>a+m.price,0)/s.length;
    const avgC = s.reduce((a,m)=>a+m.cost,0)/s.length;
    const avgM = avgP ? (avgP-avgC)/avgP*100 : 0;
    const dishesPerDay = Math.round(c.perDay / avgP);

    stage.innerHTML = `
    <div class="ctr mb24">
      
      <h2 class="mt8">ร้านของคุณพร้อมเปิดแล้ว</h2>
      <p class="muted mt8">ตรวจสอบข้อมูลอีกครั้ง แล้วเข้าสู่ Dashboard เพื่อเริ่มรับออเดอร์</p>
    </div>

    <div class="grid g-3-2" style="gap:16px">
      <div class="card">
        <div class="card-h"><h4>สรุปข้อมูลร้าน</h4><span class="badge badge-good">พร้อมใช้งาน</span></div>
        <div class="card-b col g16">
          <div class="row g12">
            <div class="logo" style="width:52px;height:52px;font-size:26px">${S.emoji}</div>
            <div><div class="b8" style="font-size:19px">${U.esc(S.name)}</div>
              <div class="t-sm muted">${U.esc(S.format)} · ${U.esc(S.type)}</div></div>
          </div>
          <div class="grid g-2" style="gap:12px">
            ${[['ทำเล', S.location || '—'],['เวลาเปิด–ปิด', S.open+' – '+S.close],
               ['จำนวนพนักงาน', S.staff+' คน'],['เป้ายอดขาย', U.baht(S.goal)+'/เดือน'],
               ['จำนวนเมนู', U.nf(s.length)+' รายการ'],['ราคาเฉลี่ย', U.baht(avgP,0)],
               ['ต้นทุนเฉลี่ย', U.baht(avgC,0)],['Margin เฉลี่ย', U.pc(avgM)]]
              .map(([l,v])=>`<div class="tile"><div class="t-xs muted b6">${l}</div>
                <div class="b8 mt4" style="font-size:15.5px">${U.esc(String(v))}</div></div>`).join('')}
          </div>
          <div>
            <div class="up muted mb8">เมนูที่จะเปิดขาย</div>
            <div class="row wrap g8">${s.map(m=>`<span class="badge badge-lg">${m.emoji} ${U.esc(m.name)}
              <b class="num">฿${U.nf(m.price)}</b></span>`).join('')}</div>
          </div>
        </div>
      </div>

      <div class="col g16">
        <div class="calc-box">
          <div class="up" style="color:#9aa5b4">เป้าที่ต้องทำให้ได้</div>
          <div class="cv mt8">${U.baht(c.perDay)}<span style="font-size:14px;color:#9aa5b4"> /วัน</span></div>
          <div class="col g12 mt16">
            ${[['จำนวน Order/วัน', U.nf(c.orders)+' บิล'],
               ['Average Order', U.baht(S.aov)],
               ['จำนวนจาน/วัน (ประมาณ)', U.nf(dishesPerDay)+' จาน'],
               ['กำไรขั้นต้นคาดการณ์/วัน', U.baht(c.perDay*avgM/100)]]
              .map(([l,v])=>`<div class="between"><span class="t-sm" style="color:#9aa5b4">${l}</span>
                <span class="num b7">${v}</span></div>`).join('')}
          </div>
        </div>
        <div class="ai-card">
          <div class="in">
            <span class="ai-badge">AI เตรียมงานวันแรกให้แล้ว</span>
            <div class="col g10 mt16">
              ${[`เตรียมวัตถุดิบสำหรับ ~${dishesPerDay} จาน/วัน โดยเผื่อไว้ 15% สำหรับวันที่ลูกค้าเยอะ`,
                 `เมนูราคา ${U.baht(avgP,0)} ต้องขาย ${U.nf(c.orders)} บิล/วัน ช่วงเที่ยง (11:00–13:00) จะกินสัดส่วนราว 45% ของทั้งวัน`,
                 `ตั้ง Bundle จานเดียว + เครื่องดื่ม เพื่อดัน AOV จาก ${U.baht(S.aov)} เป็น ${U.baht(S.aov+8)}`]
                .map((t,i)=>`<div class="rec"><span class="rn">${i+1}</span><span class="t-sm">${t}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row between mt24 wrap g12">
      <button class="btn btn-ghost" id="back4">← แก้ไขเมนู</button>
      <button class="btn btn-primary btn-lg" id="finish">เข้าสู่ Dashboard →</button>
    </div>`;

    document.getElementById('back4').onclick = () => go(3);
    document.getElementById('finish').onclick = () => {
      try{
        localStorage.setItem('sfos_store', JSON.stringify({
          name:S.name, emoji:S.emoji, format:S.format, type:S.type, location:S.location,
          open:S.open, close:S.close, staff:parseInt(S.staff,10)||1, goal:S.goal
        }));
        localStorage.setItem('sfos_menu_extra', JSON.stringify(
          S.menu.filter(m => m.on && m.custom).map(m => ({ name:m.name, price:m.price, cost:m.cost, cat:m.cat, emoji:m.emoji }))
        ));
      }catch(e){}
      U.toast('สร้างร้าน "'+S.name+'" สำเร็จ','ok');
      setTimeout(()=>{ location.href = 'app.html#/dashboard?welcome=1'; }, 500);
    };
  }

  function go(n){ S.step = n; renderSteps(); [step1,step2,step3,step4][n-1](); window.scrollTo({top:0,behavior:'smooth'}); }
  go(1);
})();
