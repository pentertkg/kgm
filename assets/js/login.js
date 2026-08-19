/* ============================================================
   หน้าเข้าสู่ระบบ — 3 ขั้น: อีเมล → ความยินยอม → รหัส 6 หลัก
   ============================================================ */
(function () {
  'use strict';
  const A = window.SFOS_AUTH, U = window.UI;
  const stage = document.getElementById('stage');
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || 'app.html#/dashboard';
  /* ลิงก์ในอีเมลต้องพากลับมาที่หน้านี้ พร้อมจำปลายทางเดิมไว้ */
  const backTo = location.origin + location.pathname + '?next=' + encodeURIComponent(next);

    /* ทุกข้อเริ่มจาก "ไม่ติ๊ก" โดยเจตนา — PDPA ถือว่าความยินยอมต้องเป็นการกระทำ
     เชิงบวกของเจ้าของข้อมูล การติ๊กมาให้ล่วงหน้าใช้เป็นความยินยอมไม่ได้ */
  /* pw อยู่ในหน่วยความจำระหว่างขั้นสมัครเท่านั้น — ไม่เคยถูกเขียนลง storage
     และถูกล้างทันทีที่สมัครเสร็จ (ดู s2) */
  const S = { step: 1, mode: 'signin', email: '', pw: '',
              chosen: { account: false, service_email: false, product_news: false } };

  /* ความยินยอมที่ค้างจากโฟลวลิงก์อีเมลเดิม — เก็บกวาดให้ครบเมื่อผู้ใช้กลับมา
     ทางลิงก์เก่าที่ส่งไปก่อนเปลี่ยนมาใช้รหัสผ่าน */
  const PEND = 'sfos_pending_consent';
  const takePending = () => {
    try {
      const v = JSON.parse(localStorage.getItem(PEND) || 'null');
      localStorage.removeItem(PEND);
      return v && Array.isArray(v.chosen) ? v.chosen : null;
    } catch (e) { return null; }
  };

  function steps() {
    const box = document.getElementById('steps');
    if (S.mode !== 'signup') { box.innerHTML = ''; box.className = 'steps mb24'; return; }
    const names = ['อีเมลและรหัสผ่าน', 'ความยินยอม'];
    box.className = 'steps steps--few mb24';
    document.getElementById('steps').innerHTML = names.map((n, i) => {
      const k = i + 1, cls = k === S.step ? 'on' : k < S.step ? 'done' : '';
      return `<div class="step-i ${cls}"><span class="step-n">${k < S.step ? '✓' : k}</span>
        <span class="step-l">${n}</span></div>${i < names.length - 1 ? `<span class="step-line ${k < S.step ? 'done' : ''}"></span>` : ''}`;
    }).join('');
  }

  const err = m => `<div class="caution-box mt16" role="alert" style="border-left:3px solid var(--bad);background:var(--bad-soft);border-radius:0 10px 10px 0;padding:13px 16px">
      <div class="t-sm b7" style="color:var(--bad-ink)">${U.esc(m)}</div></div>`;

  /* ── ขั้น 1: อีเมล + รหัสผ่าน ───────────────────────────
     รหัสผ่านอยู่ในตัวแปรชั่วคราวเท่านั้น ส่งตรงไป Supabase แล้วทิ้ง
     ไม่เขียนลง localStorage/sessionStorage และไม่ใส่ใน URL เด็ดขาด */
  const pwField = (id, label, auto, hint) => `
      <div class="field mt16">
        <label class="label" for="${id}">${label}</label>
        <div style="position:relative">
          <input class="input" id="${id}" type="password" autocomplete="${auto}"
                 placeholder="••••••••" style="padding-right:76px">
          <button type="button" class="btn btn-ghost btn-xs" data-eye="${id}"
                  style="position:absolute;right:8px;top:50%;transform:translateY(-50%)"
                  aria-label="สลับการแสดงรหัสผ่าน">แสดง</button>
        </div>
        ${hint ? `<span class="hint">${hint}</span>` : ''}
      </div>`;

  function bindEyes() {
    stage.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => {
      const f = document.getElementById(b.dataset.eye);
      const show = f.type === 'password';
      f.type = show ? 'text' : 'password';
      b.textContent = show ? 'ซ่อน' : 'แสดง';
    });
  }

  function s1(msg) {
    const isUp = S.mode === 'signup';
    stage.innerHTML = `
      <div class="tabs mb16" id="mTabs" role="tablist">
        <button data-m="signin" class="${isUp ? '' : 'on'}" role="tab">เข้าสู่ระบบ</button>
        <button data-m="signup" class="${isUp ? 'on' : ''}" role="tab">สมัครสมาชิก</button>
      </div>
      <h2>${isUp ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}</h2>
      <p class="muted mt8">${isUp
        ? 'ใช้อีเมลกับรหัสผ่าน สมัครเสร็จใช้งานได้ทันที ไม่ต้องรออีเมลยืนยัน'
        : 'กรอกอีเมลและรหัสผ่านที่ตั้งไว้ตอนสมัคร'}</p>

      <div class="field mt20">
        <label class="label" for="em">อีเมล</label>
        <input class="input" id="em" type="email" inputmode="email" autocomplete="${isUp ? 'email' : 'username'}"
               placeholder="you@example.com" value="${U.esc(S.email)}">
      </div>
      ${pwField('pw', 'รหัสผ่าน', isUp ? 'new-password' : 'current-password',
        isUp ? 'อย่างน้อย ' + A.MIN_PW + ' ตัวอักษร — ยาวสำคัญกว่าอักขระพิเศษ' : '')}
      ${isUp ? pwField('pw2', 'ยืนยันรหัสผ่าน', 'new-password', '') : ''}
      ${msg ? err(msg) : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">${isUp ? 'ต่อไป: ความยินยอม' : 'เข้าสู่ระบบ'}</button>
      ${isUp ? '' : '<div class="ctr mt12"><button class="btn btn-ghost btn-sm" id="forgot">ลืมรหัสผ่าน?</button></div>'}

      <div class="row g10 mt20" style="align-items:center">
        <span style="flex:1;height:1px;background:var(--line)"></span>
        <span class="t-xs muted">หรือ</span>
        <span style="flex:1;height:1px;background:var(--line)"></span>
      </div>
      <button class="btn btn-ghost btn-block mt16" id="demo">ดูโหมดเดโมก่อน (ไม่ต้องสมัคร)</button>
      <p class="t-xs muted ctr mt8">ใช้ข้อมูลตัวอย่างในเครื่อง ไม่บันทึกอะไรลงฐานข้อมูล</p>
      <div class="ctr mt16"><a class="t-sm" href="index.html">← กลับหน้าแรก</a></div>`;

    bindEyes();
    const em = document.getElementById('em'), pw = document.getElementById('pw');
    (S.email ? pw : em).focus();

    stage.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      S.mode = b.dataset.m; S.email = em.value.trim().toLowerCase(); render();
    });

    const go = async () => {
      const btn = document.getElementById('go');
      S.email = em.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email)) return s1('รูปแบบอีเมลไม่ถูกต้อง');
      const p1 = pw.value;
      if (!p1) return s1('กรอกรหัสผ่าน');

      if (isUp) {
        if (p1.length < A.MIN_PW) return s1('รหัสผ่านต้องยาวอย่างน้อย ' + A.MIN_PW + ' ตัวอักษร');
        if (p1 !== document.getElementById('pw2').value) return s1('รหัสผ่านสองช่องไม่ตรงกัน');
        S.pw = p1;                       // ถือไว้ชั่วคราวเพื่อสมัครหลังยินยอม
        S.step = 2; render(); return;
      }

      btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ…';
      try {
        await A.signIn(S.email, p1);
        if (await A.consentComplete()) {
          U.toast('เข้าสู่ระบบสำเร็จ', 'ok');
          setTimeout(() => location.replace(next), 300);
        } else {
          consentOnly();                 // บัญชีเก่าที่ยังไม่เคยยินยอม
        }
      } catch (e) {
        btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
        s1(e.message);
      }
    };
    document.getElementById('go').onclick = go;
    [em, pw].forEach(f => f.onkeydown = e => { if (e.key === 'Enter') go(); });
    const p2 = document.getElementById('pw2');
    if (p2) p2.onkeydown = e => { if (e.key === 'Enter') go(); };

    const fg = document.getElementById('forgot');
    if (fg) fg.onclick = () => { S.email = em.value.trim().toLowerCase(); forgotView(); };

    document.getElementById('demo').onclick = () => {
      A.enterDemo();
      /* เดโมใช้ Mock data — พาเข้า onboarding ไม่ได้เพราะร้านจะไม่ถูกบันทึกจริง */
      location.replace(next.startsWith('onboarding') ? 'app.html#/dashboard' : next);
    };
  }

  /* ── ลืมรหัสผ่าน — ต้องพึ่งอีเมล จึงบอกข้อจำกัดไว้ตรงๆ ── */
  function forgotView(msg, ok) {
    document.getElementById('steps').innerHTML = '';
    stage.innerHTML = `
      <h2>ตั้งรหัสผ่านใหม่</h2>
      <p class="muted mt8">ใส่อีเมลที่สมัครไว้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้</p>
      <div class="tile mt16" style="border-left:3px solid var(--warn);background:var(--warn-soft);border-radius:0 10px 10px 0">
        <span class="t-sm">ขั้นนี้ต้องส่งอีเมล ซึ่งช่วง Beta ยังจำกัดประมาณ 3–4 ฉบับต่อชั่วโมง
          ถ้าไม่ได้รับ ให้รอสักครู่แล้วลองใหม่</span></div>
      <div class="field mt16">
        <label class="label" for="fem">อีเมล</label>
        <input class="input" id="fem" type="email" inputmode="email" autocomplete="email"
               placeholder="you@example.com" value="${U.esc(S.email)}">
      </div>
      ${msg ? err(msg) : ''}
      ${ok ? `<div class="tile mt16" style="border-left:3px solid var(--good);background:var(--good-soft);border-radius:0 10px 10px 0">
        <span class="t-sm">ส่งลิงก์ไปที่ <b>${U.esc(S.email)}</b> แล้ว — เปิดอีเมลแล้วกดลิงก์เพื่อตั้งรหัสใหม่</span></div>` : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">ส่งลิงก์ตั้งรหัสใหม่</button>
      <div class="ctr mt12"><button class="btn btn-ghost btn-sm" id="back">← กลับไปเข้าสู่ระบบ</button></div>`;
    document.getElementById('fem').focus();
    document.getElementById('back').onclick = () => { S.mode = 'signin'; S.step = 1; render(); };
    document.getElementById('go').onclick = async () => {
      const b = document.getElementById('go');
      S.email = document.getElementById('fem').value.trim().toLowerCase();
      b.disabled = true; b.textContent = 'กำลังส่ง…';
      try {
        await A.requestPasswordReset(S.email, location.origin + location.pathname + '?reset=1');
        forgotView(null, true);
      } catch (e) { forgotView(e.message); }
    };
  }

  /* ── ตั้งรหัสผ่านใหม่ (กลับมาจากลิงก์ในอีเมล พร้อม session) ── */
  function resetView(msg) {
    document.getElementById('steps').innerHTML = '';
    stage.innerHTML = `
      <h2>ตั้งรหัสผ่านใหม่</h2>
      <p class="muted mt8">ยืนยันตัวตนจากลิงก์ในอีเมลแล้ว — ตั้งรหัสผ่านใหม่ได้เลย</p>
      ${pwField('np', 'รหัสผ่านใหม่', 'new-password', 'อย่างน้อย ' + A.MIN_PW + ' ตัวอักษร')}
      ${pwField('np2', 'ยืนยันรหัสผ่านใหม่', 'new-password', '')}
      ${msg ? err(msg) : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">บันทึกรหัสผ่านใหม่</button>`;
    bindEyes();
    document.getElementById('np').focus();
    document.getElementById('go').onclick = async () => {
      const b = document.getElementById('go');
      const a1 = document.getElementById('np').value, a2 = document.getElementById('np2').value;
      if (a1.length < A.MIN_PW) return resetView('รหัสผ่านต้องยาวอย่างน้อย ' + A.MIN_PW + ' ตัวอักษร');
      if (a1 !== a2) return resetView('รหัสผ่านสองช่องไม่ตรงกัน');
      b.disabled = true; b.textContent = 'กำลังบันทึก…';
      try {
        await A.changePassword(a1);
        const done = await A.consentComplete();
        U.toast('ตั้งรหัสผ่านใหม่แล้ว', 'ok');
        setTimeout(() => location.replace(done ? next : 'login.html?step=consent'), 400);
      } catch (e) { resetView(e.message); }
    };
  }

  /* ── ขั้น 2: ความยินยอม ──────────────────────────────────
     ออกแบบใหม่หลังทดสอบบนมือถือ ปัญหาเดิม:
       · บอก "ขั้นที่ 2" ซ้ำ 3 ที่ (วงกลม + badge + หัวข้อ)
       · ข้อความ 530 ตัวอักษรก่อนถึงปุ่ม ต้องอ่านเยอะกว่าจะรู้ว่าต้องทำอะไร
       · ทุกข้อหน้าตาเหมือนกันหมด ไม่รู้ว่าข้อไหนต้องติ๊ก
       · กดปุ่มแล้วค่อยรู้ว่าลืมติ๊ก (ลองผิดลองถูก)
     แนวทางใหม่: ข้อจำเป็น 1 ข้อเด่นชัดอยู่บนสุด · ข้อไม่บังคับยุบสั้น
     · ปุ่มปิดไว้จนติ๊กข้อจำเป็น พร้อมบอกเหตุผลใต้ปุ่มตั้งแต่ต้น */
  function s2(msg) {
    const req = A.PURPOSES.find(p => p.required);
    const opt = A.PURPOSES.filter(p => !p.required);
    stage.innerHTML = `
      <h2>อีกขั้นเดียว — ขอความยินยอม</h2>
      <p class="muted mt8" style="line-height:1.65">ตามกฎหมาย PDPA เราต้องได้รับความยินยอมจากคุณก่อน
        จะสร้างบัญชีให้ <b>${U.esc(S.email)}</b></p>

      <label class="consent-main mt20" id="reqBox">
        <input type="checkbox" data-p="${req.id}" ${S.chosen[req.id] ? 'checked' : ''}>
        <span>
          <b>${U.esc(req.title)}</b>
          <span class="t-sm muted">เก็บแค่อีเมล ไม่เก็บชื่อ เบอร์โทร ที่อยู่ IP หรือพฤติกรรมการใช้งาน
            และไม่ส่งต่อให้ใคร · <a href="privacy.html" target="_blank" rel="noopener">อ่านคำชี้แจง</a></span>
        </span>
      </label>

      <div class="consent-opt-h mt20">ไม่บังคับ — ปฏิเสธได้ ใช้งานได้ปกติ และเปลี่ยนใจภายหลังได้</div>
      <div class="col g8 mt10" id="cons"></div>

      ${msg ? err(msg) : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">สร้างบัญชี</button>
      <p class="t-xs muted ctr mt10" id="goHint"></p>
      <div class="ctr mt8"><button class="btn btn-ghost btn-sm" id="back">← กลับไปแก้อีเมลหรือรหัสผ่าน</button></div>`;

    document.getElementById('cons').innerHTML = opt.map(p => `
      <label class="consent-opt">
        <input type="checkbox" data-p="${p.id}" ${S.chosen[p.id] ? 'checked' : ''}>
        <span><b class="t-sm">${U.esc(p.title)}</b>
          <span class="t-xs muted">${U.esc(p.detail.replace(' — ถอนได้ทุกเมื่อ', ''))}</span></span>
      </label>`).join('');

    /* ปุ่มพร้อมใช้เมื่อไร บอกตั้งแต่ก่อนกด ไม่ใช่หลังกด */
    const syncGate = () => {
      const ok = !!S.chosen[req.id];
      const btn = document.getElementById('go');
      btn.disabled = !ok;
      btn.style.opacity = ok ? '' : '.5';
      btn.style.cursor = ok ? '' : 'not-allowed';
      document.getElementById('goHint').textContent = ok
        ? 'สร้างบัญชีแล้วเข้าใช้งานได้ทันที'
        : 'ติ๊กข้อบนสุดก่อนจึงจะสร้างบัญชีได้';
      document.getElementById('reqBox').classList.toggle('on', ok);
    };
    stage.querySelectorAll('[data-p]').forEach(cb => {
      cb.onchange = () => {
        S.chosen[cb.dataset.p] = cb.checked;
        const box = cb.closest('.consent-opt,.consent-main');
        if (box) box.classList.toggle('on', cb.checked);
        syncGate();
      };
      const box = cb.closest('.consent-opt,.consent-main');
      if (box) box.classList.toggle('on', cb.checked);
    });
    syncGate();
    document.getElementById('back').onclick = () => { S.step = 1; render(); };
    document.getElementById('go').onclick = async () => {
      if (!S.chosen.account) return s2('ต้องยินยอมข้อที่จำเป็น (ใช้อีเมลยืนยันตัวตน) จึงจะสร้างบัญชีได้');
      const btn = document.getElementById('go');
      btn.disabled = true; btn.textContent = 'กำลังสร้างบัญชี…';
      try {
        const r = await A.signUp(S.email, S.pw);
        S.pw = '';                        // ทิ้งรหัสผ่านจากหน่วยความจำทันทีที่ใช้เสร็จ
        if (r.needsConfirm) {
          /* เผื่อกรณีเปิด "Confirm email" ในอนาคต */
          document.getElementById('steps').innerHTML = '';
          stage.innerHTML = `<h2>สร้างบัญชีแล้ว — เหลือยืนยันอีเมล</h2>
            <p class="muted mt8">เปิดอีเมล <b>${U.esc(S.email)}</b> แล้วกดยืนยัน
              จากนั้นกลับมาเข้าสู่ระบบด้วยรหัสผ่านที่ตั้งไว้</p>
            <a class="btn btn-primary btn-lg btn-block mt20" href="login.html">ไปหน้าเข้าสู่ระบบ</a>`;
          return;
        }
        await A.grantConsents(Object.keys(S.chosen).filter(k => S.chosen[k]));
        U.toast('สร้างบัญชีสำเร็จ', 'ok');
        setTimeout(() => location.replace(next), 400);
      } catch (e) {
        s2(e.message);
      }
    };
  }

  /* ── โหมดเก็บความยินยอมเพิ่ม (ล็อกอินแล้วแต่ยังไม่ยินยอม) ── */
  async function consentOnly() {
    document.getElementById('steps').innerHTML = '';
    stage.innerHTML = `<div class="ctr" style="padding:20px"><div class="t-sm muted">กำลังตรวจสถานะ…</div></div>`;
    const current = await A.myConsents();
    A.PURPOSES.forEach(p => { S.chosen[p.id] = !!(current[p.id] && !current[p.id].withdrawn_at); });
    stage.innerHTML = `
      <span class="badge badge-warn">ต้องยืนยันความยินยอม</span>
      <h2 class="mt12">คำชี้แจงมีการอัปเดต</h2>
      <p class="muted mt8">บัญชี <b>${U.esc(A.email() || '')}</b> เข้าสู่ระบบอยู่แล้ว
        แต่ต้องยืนยันความยินยอมตามคำชี้แจงเวอร์ชันปัจจุบัน (${A.POLICY_VERSION}) ก่อนใช้งานต่อ</p>
      <div class="col g10 mt16" id="cons"></div>
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">ยินยอมและใช้งานต่อ</button>
      <div class="ctr mt12"><button class="btn btn-ghost btn-sm" id="out">ออกจากระบบ</button></div>`;
    document.getElementById('cons').innerHTML = A.PURPOSES.map(p => `
      <label class="choice" style="align-items:flex-start;cursor:pointer">
        <input type="checkbox" data-p="${p.id}" ${S.chosen[p.id] ? 'checked' : ''}
               style="width:19px;height:19px;margin-top:2px;flex:none;accent-color:var(--brand)">
        <span class="grow"><b class="t-sm">${U.esc(p.title)}</b>
          ${p.required ? '<span class="badge badge-bad" style="margin-left:6px">จำเป็น</span>' : ''}
          <br><span class="t-xs muted">${U.esc(p.detail)}</span></span></label>`).join('');
    stage.querySelectorAll('[data-p]').forEach(cb => cb.onchange = () => { S.chosen[cb.dataset.p] = cb.checked; });
    document.getElementById('out').onclick = async () => { await A.signOut(); location.replace('login.html'); };
    document.getElementById('go').onclick = async () => {
      if (!S.chosen.account) return U.toast('ต้องยินยอมข้อที่จำเป็นจึงจะใช้งานต่อได้', 'warn');
      try {
        await A.grantConsents(Object.keys(S.chosen).filter(k => S.chosen[k]));
        location.replace(next);
      } catch (e) { U.toast(e.message, 'warn'); }
    };
  }

  function render() { steps(); (S.step === 2 ? s2 : s1)(); }

  /* ── เริ่มทำงาน ────────────────────────────────────────── */
  (async function start() {
    if (!A.ready) {
      document.getElementById('steps').innerHTML = '';
      stage.innerHTML = `
        <span class="badge badge-warn">ยังไม่ได้ตั้งค่า</span>
        <h2 class="mt12">ระบบสมาชิกยังไม่พร้อมใช้</h2>
        <p class="muted mt8">ไฟล์ <code>assets/js/config.js</code> ยังไม่มี <code>supabaseUrl</code>
          หรือ <code>supabaseAnonKey</code> — ใส่ค่าก่อนจึงจะเข้าสู่ระบบได้</p>
        <a class="btn btn-ghost btn-block mt20" href="app.html#/dashboard">ใช้โหมดเดโมต่อ (ไม่ต้องล็อกอิน)</a>`;
      return;
    }
    /* กลับมาจากการกดลิงก์ในอีเมล — เก็บ session แล้วไปต่อทันที */
    const link = A.consumeLinkSession();
    if (link && link.error) {
      stage.innerHTML = '';
      render();
      U.toast(link.error, 'warn');
      return;
    }
    if (link && link.ok) {
      try {
        await A.hydrateUser();
        /* ลิงก์ตั้งรหัสผ่านใหม่ — พาไปหน้าตั้งรหัสทันที */
        if (params.get('reset') === '1') return resetView();
        const pend = takePending();
        if (pend && pend.length) { try { await A.grantConsents(pend); } catch (e) {} }
        if (await A.consentComplete()) {
          U.toast('เข้าสู่ระบบสำเร็จ', 'ok');
          setTimeout(() => location.replace(next), 400);
          return;
        }
        return consentOnly();        // ยังไม่เคยยินยอม → ขอความยินยอมก่อน
      } catch (e) {
        /* token ใช้ไม่ได้/หมดอายุ — ล้าง session แล้วให้เริ่มใหม่ ห้ามปล่อยหน้าว่าง */
        await A.signOut();
        render();
        U.toast('ลิงก์นี้ใช้ไม่ได้แล้ว — กรอกอีเมลเพื่อขอลิงก์ใหม่', 'warn');
        return;
      }
    }

    if (params.get('step') === 'consent' && A.isSignedIn()) return consentOnly();
    if (await A.ensure()) {
      if (await A.consentComplete()) { location.replace(next); return; }
      return consentOnly();
    }
    render();
  })();
})();
