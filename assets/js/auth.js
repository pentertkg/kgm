/* ============================================================
   StreetFood OS — ระบบสมาชิก (passwordless) + ความยินยอม PDPA
   ------------------------------------------------------------
   · เข้าสู่ระบบด้วยรหัส 6 หลักที่ส่งไปยังอีเมล — ไม่มีรหัสผ่าน
     จึงไม่มีรหัสผ่านให้เก็บ ไม่มีให้รั่ว และไม่ต้องมี flow ลืมรหัสผ่าน
   · ข้อมูลส่วนบุคคลที่ระบบเก็บ = อีเมลเท่านั้น (อยู่ใน auth.users ของ Supabase)
   · ความยินยอมบันทึกใน public.consents พร้อมเวอร์ชันของคำชี้แจง
   · ไม่มี dependency ไม่ต้อง build — คุย REST ตรงด้วย fetch
   ============================================================ */
window.SFOS_AUTH = (function () {
  'use strict';
  const CFG = window.SFOS_CONFIG || {};
  const ready = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const base = (CFG.supabaseUrl || '').replace(/\/$/, '');
  const AUTH = base + '/auth/v1';
  const REST = base + '/rest/v1';
  const KEY = 'sfos_session';
  const POLICY_VERSION = '2026-08-19';

  /* วัตถุประสงค์ที่ขอความยินยอม — ข้อความที่ผู้ใช้เห็นอยู่ที่นี่ที่เดียว */
  const PURPOSES = [
    { id: 'account', required: true,
      title: 'ใช้อีเมลเพื่อยืนยันตัวตนและเข้าสู่ระบบ',
      detail: 'จำเป็นต่อการมีบัญชี ถ้าไม่ยินยอมจะใช้งานระบบไม่ได้' },
    { id: 'service_email', required: false,
      title: 'ส่งอีเมลแจ้งเตือนเรื่องร้าน',
      detail: 'เช่น วัตถุดิบใกล้หมด หรือสรุปยอดขายสิ้นวัน — ถอนได้ทุกเมื่อ' },
    { id: 'product_news', required: false,
      title: 'ส่งข่าวฟีเจอร์ใหม่',
      detail: 'เดือนละไม่เกิน 1 ครั้ง — ถอนได้ทุกเมื่อ' }
  ];

  let session = null;
  try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}

  /* ---------- HTTP ---------- */
  function headers(withAuth) {
    const h = { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json' };
    h.Authorization = 'Bearer ' + ((withAuth !== false && session && session.access_token) || CFG.supabaseAnonKey);
    return h;
  }
  async function req(url, opts) {
    const r = await fetch(url, opts);
    const txt = await r.text();
    let body = null;
    try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
    if (!r.ok) {
      const err = new Error(friendly(r.status, body));
      err.status = r.status; err.body = body;
      throw err;
    }
    return body;
  }
  /* แปล error ของ Supabase เป็นภาษาที่คนอ่านรู้เรื่องและรู้ว่าต้องทำอะไรต่อ */
  function friendly(status, b) {
    const code = b && (b.error_code || b.code);
    const msg = (b && (b.msg || b.message || b.error_description || b.error)) || '';
    if (code === 'validation_failed' || /invalid format/i.test(msg)) return 'รูปแบบอีเมลไม่ถูกต้อง';
    if (code === 'otp_expired' || /expired/i.test(msg)) return 'รหัสหมดอายุแล้ว กดขอรหัสใหม่อีกครั้ง';
    if (/invalid|incorrect/i.test(msg) && /token|otp|code/i.test(msg)) return 'รหัสไม่ถูกต้อง ตรวจดูอีกครั้งหรือขอรหัสใหม่';
    if (status === 429 || code === 'over_email_send_rate_limit')
      return 'ขอรหัสถี่เกินไป รออีกสักครู่แล้วลองใหม่ (โปรเจกต์ที่ยังไม่ตั้ง SMTP เองจะส่งอีเมลได้จำกัด)';
    if (status === 403 && /signups not allowed/i.test(msg)) return 'ระบบปิดรับสมัครสมาชิกใหม่อยู่';
    if (msg) return msg;
    return 'เกิดข้อผิดพลาด (HTTP ' + status + ')';
  }

  /* ---------- session ---------- */
  function save(d) {
    session = d || null;
    if (session && session.expires_in) session.expires_at = Date.now() + (session.expires_in - 60) * 1000;
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }
  const isSignedIn = () => !!(session && session.access_token);
  const token = () => (session && session.access_token) || null;
  const email = () => (session && session.user && session.user.email) || null;

  async function refresh() {
    if (!session || !session.refresh_token) return null;
    const d = await req(AUTH + '/token?grant_type=refresh_token', {
      method: 'POST', headers: headers(false),
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    save(d); return d;
  }
  async function ensure() {
    if (session && session.expires_at && Date.now() > session.expires_at) {
      try { await refresh(); } catch (e) { save(null); }
    }
    return isSignedIn();
  }

  /* ---------- เข้าสู่ระบบด้วยรหัสทางอีเมล ---------- */
  async function sendCode(addr) {
    const e = String(addr || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    await req(AUTH + '/otp', {
      method: 'POST', headers: headers(false),
      body: JSON.stringify({ email: e, create_user: true })
    });
    return e;
  }
  async function verifyCode(addr, code) {
    const e = String(addr || '').trim().toLowerCase();
    const t = String(code || '').replace(/\D/g, '');
    if (t.length < 6) throw new Error('กรอกรหัส 6 หลักให้ครบ');
    const d = await req(AUTH + '/verify', {
      method: 'POST', headers: headers(false),
      body: JSON.stringify({ email: e, token: t, type: 'email' })
    });
    save(d);
    return d;
  }
  async function signOut() {
    try { if (isSignedIn()) await req(AUTH + '/logout', { method: 'POST', headers: headers() }); } catch (e) {}
    save(null);
  }

  /* ---------- ความยินยอม ---------- */
  async function rpc(fn, args) {
    await ensure();
    return req(REST + '/rpc/' + fn, { method: 'POST', headers: headers(), body: JSON.stringify(args || {}) });
  }
  async function myConsents() {
    await ensure();
    const rows = await req(REST + '/consents?select=purpose,policy_version,granted_at,withdrawn_at', { headers: headers() });
    const map = {};
    (rows || []).forEach(r => {
      if (!map[r.purpose] || r.granted_at > map[r.purpose].granted_at) map[r.purpose] = r;
    });
    return map;
  }
  const grantConsents = purposes => rpc('grant_consents', { p_purposes: purposes, p_version: POLICY_VERSION });
  const withdrawConsent = purpose => rpc('withdraw_consent', { p_purpose: purpose });
  const hasConsent = purpose => rpc('has_consent', { p_purpose: purpose });
  const deleteAccount = async () => { const r = await rpc('delete_my_account'); save(null); return r; };

  /* ต้องยินยอมข้อที่จำเป็นครบก่อนใช้งานระบบ */
  async function consentComplete() {
    const c = await myConsents();
    return PURPOSES.filter(p => p.required)
      .every(p => c[p.id] && !c[p.id].withdrawn_at && c[p.id].policy_version === POLICY_VERSION);
  }

  /* ---------- โหมดเดโม ----------
     ให้คนที่มาดูเดโม (เช่นตอนพิตช์) เข้าดูระบบได้โดยไม่ต้องสมัคร
     โหมดนี้ใช้ข้อมูลตัวอย่างในเครื่องเท่านั้น ไม่แตะฐานข้อมูลจริง
     เก็บใน sessionStorage จึงหมดเมื่อปิดแท็บ */
  const DEMO_KEY = 'sfos_demo';
  const isDemo = () => { try { return sessionStorage.getItem(DEMO_KEY) === '1'; } catch (e) { return false; } };
  const enterDemo = () => { try { sessionStorage.setItem(DEMO_KEY, '1'); } catch (e) {} };
  const exitDemo = () => { try { sessionStorage.removeItem(DEMO_KEY); } catch (e) {} };

  /* ---------- ตัวช่วยสำหรับหน้าอื่น ---------- */
  /* เรียกที่ต้นหน้าที่ต้องล็อกอิน — ถ้าไม่ผ่านจะพาไปหน้า login */
  async function requireAuth(redirect) {
    if (!ready) return { ok: true, mode: 'demo' };      // ยังไม่ตั้งค่า = เดโม
    // ลิงก์ "ทดลองใช้งาน" จากหน้า Landing ส่ง ?demo=1 มา → เข้าดูได้ในคลิกเดียว
    try { if (new URLSearchParams(location.search).get('demo') === '1') enterDemo(); } catch (e) {}
    if (isDemo() && !isSignedIn()) return { ok: true, mode: 'demo' };
    if (!(await ensure())) {
      if (redirect !== false) location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.hash));
      return { ok: false, reason: 'signed-out' };
    }
    if (!(await consentComplete())) {
      if (redirect !== false) location.replace('login.html?step=consent');
      return { ok: false, reason: 'no-consent' };
    }
    return { ok: true, mode: 'live', email: email() };
  }

  return {
    ready, POLICY_VERSION, PURPOSES,
    sendCode, verifyCode, signOut, refresh, ensure, isSignedIn, token, email,
    myConsents, grantConsents, withdrawConsent, hasConsent, consentComplete,
    deleteAccount, requireAuth, isDemo, enterDemo, exitDemo,
    get session() { return session; }
  };
})();
