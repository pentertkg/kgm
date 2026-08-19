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
  const S = { step: 1, email: '', chosen: { account: false, service_email: false, product_news: false } };

  /* ความยินยอมถูกเลือกก่อนส่งอีเมล แต่ผู้ใช้จะออกจากหน้านี้ไปกดลิงก์
     แล้วกลับมาเป็นหน้าใหม่ — จึงต้องพักสิ่งที่เขาเลือกไว้ก่อน
     (เป็นการ "จำการกระทำเชิงบวก" ที่เกิดขึ้นแล้ว ไม่ใช่การยินยอมล่วงหน้าแทนผู้ใช้)
     ถ้าหายไปด้วยเหตุใดก็ตาม ระบบจะพากลับมาถามความยินยอมใหม่ ไม่ข้ามให้ */
  const PEND = 'sfos_pending_consent';
  const savePending = () => {
    try { localStorage.setItem(PEND, JSON.stringify({
      email: S.email, chosen: Object.keys(S.chosen).filter(k => S.chosen[k]) })); } catch (e) {}
  };
  const takePending = () => {
    try {
      const v = JSON.parse(localStorage.getItem(PEND) || 'null');
      localStorage.removeItem(PEND);
      return v && Array.isArray(v.chosen) ? v.chosen : null;
    } catch (e) { return null; }
  };

  function steps() {
    const names = ['อีเมล', 'ความยินยอม', 'ยืนยันรหัส'];
    document.getElementById('steps').innerHTML = names.map((n, i) => {
      const k = i + 1, cls = k === S.step ? 'on' : k < S.step ? 'done' : '';
      return `<div class="step-i ${cls}"><span class="step-n">${k < S.step ? '✓' : k}</span>
        <span class="step-l">${n}</span></div>${i < 2 ? `<span class="step-line ${k < S.step ? 'done' : ''}"></span>` : ''}`;
    }).join('');
  }

  const err = m => `<div class="caution-box mt16" role="alert" style="border-left:3px solid var(--bad);background:var(--bad-soft);border-radius:0 10px 10px 0;padding:13px 16px">
      <div class="t-sm b7" style="color:#b8232f">${U.esc(m)}</div></div>`;

  /* ── ขั้น 1: อีเมล ─────────────────────────────────────── */
  function s1(msg) {
    stage.innerHTML = `
      <span class="badge badge-brand">ขั้นที่ 1</span>
      <h2 class="mt12">เข้าสู่ระบบด้วยอีเมล</h2>
      <p class="muted mt8">เราจะส่งรหัส 6 หลักไปให้ — <b>ไม่ต้องตั้งรหัสผ่าน</b>
        ถ้ายังไม่มีบัญชี ระบบจะสร้างให้อัตโนมัติ</p>
      <div class="field mt20">
        <label class="label" for="em">อีเมล</label>
        <input class="input" id="em" type="email" inputmode="email" autocomplete="email"
               placeholder="you@example.com" value="${U.esc(S.email)}">
        <span class="hint">ใช้อีเมลที่เปิดอ่านได้ตอนนี้ เพราะต้องเอารหัสจากในเมล</span>
      </div>
      ${msg ? err(msg) : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">ต่อไป</button>

      <div class="row g10 mt20" style="align-items:center">
        <span style="flex:1;height:1px;background:var(--line)"></span>
        <span class="t-xs muted">หรือ</span>
        <span style="flex:1;height:1px;background:var(--line)"></span>
      </div>
      <button class="btn btn-ghost btn-block mt16" id="demo">ดูโหมดเดโมก่อน (ไม่ต้องสมัคร)</button>
      <p class="t-xs muted ctr mt8">ใช้ข้อมูลตัวอย่างในเครื่อง ไม่บันทึกอะไรลงฐานข้อมูล</p>
      <div class="ctr mt16"><a class="t-sm" href="index.html">← กลับหน้าแรก</a></div>`;
    const em = document.getElementById('em');
    em.focus();
    const go = () => {
      S.email = em.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email)) return s1('รูปแบบอีเมลไม่ถูกต้อง');
      S.step = 2; render();
    };
    document.getElementById('go').onclick = go;
    em.onkeydown = e => { if (e.key === 'Enter') go(); };
    document.getElementById('demo').onclick = () => {
      A.enterDemo();
      /* เดโมใช้ Mock data — พาเข้า onboarding ไม่ได้เพราะร้านจะไม่ถูกบันทึกจริง */
      location.replace(next.startsWith('onboarding') ? 'app.html#/dashboard' : next);
    };
  }

  /* ── ขั้น 2: ความยินยอม ────────────────────────────────── */
  function s2(msg) {
    stage.innerHTML = `
      <span class="badge badge-brand">ขั้นที่ 2</span>
      <h2 class="mt12">ขอความยินยอมก่อนเริ่มใช้งาน</h2>
      <p class="muted mt8">เลือกได้ว่าจะยินยอมเรื่องใด ข้อที่ไม่บังคับปฏิเสธได้และยังใช้ระบบได้ปกติ</p>

      <div class="tile mt16" style="background:var(--surface-2)">
        <div class="row g10">${(window.ICON||(()=>''))('bell',17)}
          <div class="t-sm"><b>ข้อมูลที่ระบบเก็บ: อีเมลของคุณเท่านั้น</b><br>
            <span class="muted">ไม่เก็บชื่อ เบอร์โทร ที่อยู่ IP หรือพฤติกรรมการใช้งาน
            และไม่ส่งต่อให้ใคร — <a href="privacy.html" target="_blank" rel="noopener">อ่านรายละเอียด</a></span></div></div>
      </div>

      <div class="col g10 mt16" id="cons"></div>
      ${msg ? err(msg) : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">ยินยอมและขอรหัสเข้าสู่ระบบ</button>
      <div class="ctr mt12"><button class="btn btn-ghost btn-sm" id="back">← เปลี่ยนอีเมล</button></div>`;

    document.getElementById('cons').innerHTML = A.PURPOSES.map(p => `
      <label class="choice" style="align-items:flex-start;cursor:pointer">
        <input type="checkbox" data-p="${p.id}" ${S.chosen[p.id] ? 'checked' : ''}
               style="width:19px;height:19px;margin-top:2px;flex:none;accent-color:var(--brand)">
        <span class="grow">
          <b class="t-sm">${U.esc(p.title)}</b>
          ${p.required ? '<span class="badge badge-bad" style="margin-left:6px">จำเป็น</span>'
                       : '<span class="badge" style="margin-left:6px">เลือกได้</span>'}
          <br><span class="t-xs muted">${U.esc(p.detail)}</span>
        </span></label>`).join('');

    stage.querySelectorAll('[data-p]').forEach(cb => {
      cb.onchange = () => { S.chosen[cb.dataset.p] = cb.checked; };
    });
    document.getElementById('back').onclick = () => { S.step = 1; render(); };
    document.getElementById('go').onclick = async () => {
      if (!S.chosen.account) return s2('ต้องยินยอมข้อที่จำเป็น (ใช้อีเมลยืนยันตัวตน) จึงจะสร้างบัญชีได้');
      const btn = document.getElementById('go');
      btn.disabled = true; btn.textContent = 'กำลังส่งรหัส…';
      try {
        await A.sendCode(S.email, backTo);
        savePending();
        S.step = 3; render();
      } catch (e) {
        btn.disabled = false; btn.textContent = 'ยินยอมและขอรหัสเข้าสู่ระบบ';
        s2(e.message);
      }
    };
  }

  /* ── ขั้น 3: รหัส 6 หลัก ───────────────────────────────── */
  function s3(msg) {
    stage.innerHTML = `
      <span class="badge badge-brand">ขั้นที่ 3</span>
      <h2 class="mt12">เปิดอีเมลเพื่อเข้าสู่ระบบ</h2>
      <p class="muted mt8">ส่งอีเมลไปที่ <b>${U.esc(S.email)}</b> แล้ว —
        <b>กดปุ่ม "Sign in" ในอีเมลนั้นได้เลย</b> ระบบจะพากลับมาเข้าสู่ระบบให้อัตโนมัติ<br>
        ถ้าอีเมลมีรหัส 6 หลักมาด้วย จะกรอกที่ช่องล่างนี้ก็ได้ · มีอายุ 10 นาที · ไม่เจอลองดูในโฟลเดอร์สแปม</p>
      <div class="field mt20">
        <label class="label" for="code">หรือกรอกรหัส 6 หลัก (ถ้ามี)</label>
        <input class="input num" id="code" inputmode="numeric" autocomplete="one-time-code"
               maxlength="6" placeholder="000000"
               style="font-size:28px;letter-spacing:.35em;text-align:center;height:60px">
      </div>
      ${msg ? err(msg) : ''}
      <button class="btn btn-primary btn-lg btn-block mt20" id="go">เข้าสู่ระบบด้วยรหัส</button>
      <div class="row g8 mt16" style="justify-content:center">
        <button class="btn btn-ghost btn-sm" id="resend">ส่งอีเมลอีกครั้ง</button>
        <button class="btn btn-ghost btn-sm" id="back">เปลี่ยนอีเมล</button>
      </div>`;
    const code = document.getElementById('code');
    code.focus();
    code.oninput = () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); };
    const go = async () => {
      const btn = document.getElementById('go');
      btn.disabled = true; btn.textContent = 'กำลังตรวจรหัส…';
      try {
        await A.verifyCode(S.email, code.value);
        // บันทึกความยินยอมหลังล็อกอินสำเร็จ (ต้องมี auth.uid() ก่อน)
        const chosen = Object.keys(S.chosen).filter(k => S.chosen[k]);
        await A.grantConsents(chosen);
        U.toast('เข้าสู่ระบบสำเร็จ', 'ok');
        setTimeout(() => location.replace(next), 400);
      } catch (e) {
        btn.disabled = false; btn.textContent = 'เข้าสู่ระบบด้วยรหัส';
        s3(e.message);
      }
    };
    document.getElementById('go').onclick = go;
    code.onkeydown = e => { if (e.key === 'Enter') go(); };
    document.getElementById('back').onclick = () => { S.step = 1; render(); };
    document.getElementById('resend').onclick = async () => {
      const b = document.getElementById('resend');
      b.disabled = true; b.textContent = 'กำลังส่ง…';
      try { await A.sendCode(S.email, backTo); savePending(); U.toast('ส่งอีเมลใหม่แล้ว', 'ok'); }
      catch (e) { s3(e.message); return; }
      b.disabled = false; b.textContent = 'ส่งอีเมลอีกครั้ง';
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

  function render() { steps(); [s1, s2, s3][S.step - 1](); }

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
