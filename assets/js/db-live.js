/* ============================================================
   StreetFood OS — Supabase data layer (ไม่มี dependency)
   ------------------------------------------------------------
   คุยกับ Supabase ผ่าน REST ตรงๆ (PostgREST + GoTrue) ด้วย fetch
   จึงไม่ต้องลง npm ไม่ต้อง build และไม่ต้องโหลด script จาก CDN
   (สำคัญเพราะ CSP ของเราเป็น script-src 'self')

   ให้ผลลัพธ์ในรูปทรงเดียวกับ window.DB ของโหมดเดโม เพื่อให้หน้าต่างๆ
   ใช้ข้อมูลได้โดยแก้โค้ดหน้าน้อยที่สุด

   ยังไม่ได้ทดสอบกับ project จริง — ดู supabase/README.md ขั้นตอนที่ 6
   ============================================================ */
window.SFOS_LIVE = (function () {
  'use strict';
  const CFG = window.SFOS_CONFIG || {};
  const enabled = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const REST = CFG.supabaseUrl ? CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1' : '';
  const AUTH = CFG.supabaseUrl ? CFG.supabaseUrl.replace(/\/$/, '') + '/auth/v1' : '';
  const TOKEN_KEY = 'sfos_session';

  /* session เป็นของ auth.js เจ้าเดียว (assets/js/auth.js) — ที่นี่แค่ยืมมาใช้
     ถ้ายังไม่ได้โหลด auth.js จะ fallback ไปอ่าน localStorage เองเพื่อความเข้ากันได้ */
  const A = () => window.SFOS_AUTH || null;
  let session = null;
  try { session = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) {}

  /* ---------- HTTP ---------- */
  function headers(extra) {
    const h = Object.assign({
      apikey: CFG.supabaseAnonKey,
      'Content-Type': 'application/json'
    }, extra || {});
    const t = (A() && A().token()) || (session && session.access_token);
    h.Authorization = 'Bearer ' + (t || CFG.supabaseAnonKey);
    return h;
  }

  async function req(url, opts) {
    const r = await fetch(url, opts);
    const text = await r.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
    if (!r.ok) {
      const msg = (body && (body.message || body.error_description || body.error || body.hint)) || ('HTTP ' + r.status);
      const err = new Error(msg);
      err.status = r.status; err.body = body;
      throw err;
    }
    return body;
  }

  const qs = params => Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

  /* ---------- Auth ---------- */
  async function signUp(email, password) {
    const d = await req(AUTH + '/signup', {
      method: 'POST', headers: headers(), body: JSON.stringify({ email, password })
    });
    if (d && d.access_token) saveSession(d);
    return d;
  }
  async function signIn(email, password) {
    const d = await req(AUTH + '/token?grant_type=password', {
      method: 'POST', headers: headers(), body: JSON.stringify({ email, password })
    });
    saveSession(d);
    return d;
  }
  async function refresh() {
    if (!session || !session.refresh_token) return null;
    const d = await req(AUTH + '/token?grant_type=refresh_token', {
      method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    saveSession(d);
    return d;
  }
  function saveSession(d) {
    session = d;
    if (d && d.expires_in) session.expires_at = Date.now() + (d.expires_in - 60) * 1000;
    try { localStorage.setItem(TOKEN_KEY, JSON.stringify(session)); } catch (e) {}
  }
  function signOut() {
    session = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  const isSignedIn = () => !!(session && session.access_token);

  /* ต่ออายุ token ให้อัตโนมัติก่อนยิงทุก request */
  async function ensureSession() {
    if (A()) return A().ensure();          // ให้ auth.js จัดการต่ออายุ token
    if (session && session.expires_at && Date.now() > session.expires_at) {
      try { await refresh(); } catch (e) { signOut(); }
    }
  }

  /* ---------- PostgREST ---------- */
  async function select(table, params) {
    await ensureSession();
    const q = qs(params);
    return req(REST + '/' + table + (q ? '?' + q : ''), { headers: headers() });
  }
  async function insert(table, rows, opts) {
    await ensureSession();
    const pref = ['return=representation'];
    if (opts && opts.upsert) pref.push('resolution=merge-duplicates');
    return req(REST + '/' + table, {
      method: 'POST', headers: headers({ Prefer: pref.join(',') }),
      body: JSON.stringify(rows)
    });
  }
  async function update(table, match, patch) {
    await ensureSession();
    return req(REST + '/' + table + '?' + qs(match), {
      method: 'PATCH', headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch)
    });
  }
  async function remove(table, match) {
    await ensureSession();
    return req(REST + '/' + table + '?' + qs(match), { method: 'DELETE', headers: headers() });
  }

  async function rpc(fn, args) {
    await ensureSession();
    return req(REST + '/rpc/' + fn, {
      method: 'POST', headers: headers(), body: JSON.stringify(args || {})
    });
  }

  /* ---------- ร้านของผู้ใช้ ---------- */
  let storeId = CFG.storeId || null;
  async function resolveStore() {
    if (storeId) return storeId;
    const rows = await select('store_members', { select: 'store_id,role', limit: 1 });
    if (!rows || !rows.length) throw new Error('บัญชีนี้ยังไม่มีร้าน — สร้างร้านที่หน้า Onboarding ก่อน');
    storeId = rows[0].store_id;
    return storeId;
  }
  const eq = v => 'eq.' + v;
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD

  /* ---------- API ที่หน้าต่างๆ เรียกใช้ ---------- */
  const api = {
    store:       async () => (await select('stores', { select: '*', id: eq(await resolveStore()) }))[0],
    menus:       async () => select('v_menu_cost',   { select: '*', store_id: eq(await resolveStore()), order: 'name' }),
    ingredients: async () => select('v_stock_status', { select: '*', store_id: eq(await resolveStore()), order: 'name' }),
    customers:   async () => select('v_customer_stats', { select: '*', store_id: eq(await resolveStore()), order: 'total_spend.desc' }),
    campaigns:   async () => select('v_campaign_performance', { select: '*', store_id: eq(await resolveStore()) }),
    promotions:  async () => select('promotions',    { select: '*', store_id: eq(await resolveStore()) }),

    dailySales:  async (days) => select('v_daily_sales', {
                    select: '*', store_id: eq(await resolveStore()),
                    sale_date: 'gte.' + isoDaysAgo(days || 30), order: 'sale_date' }),
    hourlySales: async () => select('v_hourly_sales', {
                    select: '*', store_id: eq(await resolveStore()), sale_date: eq(today()), order: 'hour' }),
    channelMix:  async () => select('v_channel_sales', {
                    select: '*', store_id: eq(await resolveStore()), sale_date: eq(today()) }),
    menuDaily:   async (date) => select('v_menu_daily', {
                    select: '*', store_id: eq(await resolveStore()), sale_date: eq(date || today()),
                    order: 'revenue.desc' }),
    pnl:         async () => select('v_pnl_monthly', {
                    select: '*', store_id: eq(await resolveStore()), order: 'month.desc', limit: 12 }),

    /* ออเดอร์ + รายการในบิล (embed แบบ PostgREST) */
    orders: async (statuses) => {
      const p = {
        select: '*,order_lines(id,qty,unit_price,unit_cost,menus(id,name,emoji))',
        store_id: eq(await resolveStore()),
        order: 'placed_at.desc',
        limit: 200
      };
      if (statuses && statuses.length) p.status = 'in.(' + statuses.join(',') + ')';
      return select('orders', p);
    },

    async createOrder(o) {
      const sid = await resolveStore();
      const [order] = await insert('orders', [{
        store_id: sid, channel: o.channel || 'walkin', status: 'new',
        customer_id: o.customerId || null, note: o.note || null
      }]);
      if (o.lines && o.lines.length) {
        // unit_price / unit_cost ปล่อยว่างได้ — trigger ในฐานข้อมูลจะ snapshot ให้เอง
        await insert('order_lines', o.lines.map(l => ({
          order_id: order.id, menu_id: l.menuId, qty: l.qty
        })));
      }
      return order;
    },
    setOrderStatus: async (id, status) => (await update('orders', { id: eq(id) }, { status }))[0],
    cancelOrder:    async (id, reason) => (await update('orders', { id: eq(id) },
                        { status: 'cancelled', cancel_reason: reason || null }))[0],

    async saveMenu(m) {
      const sid = await resolveStore();
      if (m.id) return (await update('menus', { id: eq(m.id) }, {
        name: m.name, emoji: m.emoji, category: m.category, price: m.price,
        description: m.description, is_active: m.isActive !== false }))[0];
      return (await insert('menus', [{
        store_id: sid, name: m.name, emoji: m.emoji, category: m.category,
        price: m.price, description: m.description }]))[0];
    },
    saveRecipeLine: async (menuId, ingredientId, qty, note) =>
      insert('menu_recipes', [{ menu_id: menuId, ingredient_id: ingredientId, qty, note }], { upsert: true }),
    setIngredientStock: async (id, qty) => (await update('ingredients', { id: eq(id) }, { stock_qty: qty }))[0],
    addExpense: async (e) => (await insert('expenses', [{
      store_id: await resolveStore(), expense_type: e.type, amount: e.amount,
      note: e.note || null, spent_on: e.date || today() }]))[0],

    /* อ่านสูตรของเมนู (สำหรับ Cost Calculator) */
    menuRecipe: async (menuId) =>
      select('menu_recipes', { select: 'qty,note,ingredients(id,name,cost_per_unit)', menu_id: eq(menuId) }),

    /* บันทึกเมนู + แทนที่สูตรทั้งชุด
       แต่ละบรรทัดใน Cost Calculator = วัตถุดิบ 1 ตัว (unit 'ต่อจาน', qty 1)
       วัตถุดิบ match กันด้วยชื่อ (unique ต่อร้าน) — แก้ราคา "ข้าวสวย" ที่เมนูเดียว
       margin ของทุกเมนูที่ใช้ข้าวสวยจะขยับตาม ซึ่งเป็นพฤติกรรมที่ตั้งใจ */
    async saveMenuFull(m, lines) {
      const sid = await resolveStore();
      const menu = await api.saveMenu(m);
      await remove('menu_recipes', { menu_id: eq(menu.id) });
      for (const l of (lines || []).filter(l => l.name && l.name.trim())) {
        const nm = l.name.trim(), cost = +l.cost || 0;
        let ing = (await select('ingredients', {
          select: 'id,cost_per_unit', store_id: eq(sid), name: eq(nm), limit: 1 }))[0];
        if (!ing) {
          ing = (await insert('ingredients', [{
            store_id: sid, name: nm, unit: 'ต่อจาน', cost_per_unit: cost }]))[0];
        } else if (+ing.cost_per_unit !== cost) {
          await update('ingredients', { id: eq(ing.id) }, { cost_per_unit: cost });
        }
        await insert('menu_recipes', [{ menu_id: menu.id, ingredient_id: ing.id, qty: 1, note: nm }]);
      }
      return menu;
    },

    /* สร้างร้าน — ทำผ่านฟังก์ชันในฐานข้อมูล (supabase/07_store_create.sql)
       เพราะการแยกเป็น insert stores + insert store_members จาก client มี 2 ปัญหา:
       ถ้าล้มกลางทางจะได้ร้านที่ไม่มีสมาชิก (มองไม่เห็น ลบไม่ได้) และ
       insert...returning ของ PostgREST ต้องผ่าน policy SELECT ที่ต้องเป็นสมาชิกร้าน
       ซึ่งตอน insert ยังไม่มีแถวสมาชิก ทำให้สร้างร้านครั้งแรกไม่ผ่าน RLS */
    async createStore(s) {
      const store = await rpc('create_my_store', {
        p_name: s.name, p_emoji: s.emoji, p_format: s.format, p_food_type: s.type,
        p_location: s.location || null, p_open: s.open, p_close: s.close,
        p_staff: s.staff, p_goal: s.goal
      });
      const row = Array.isArray(store) ? store[0] : store;
      if (!row || !row.id) throw new Error('สร้างร้านไม่สำเร็จ — ไม่ได้รับข้อมูลร้านกลับมา');
      storeId = row.id;
      return row;
    }
  };

  function isoDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  }

  return Object.assign({
    enabled, signUp, signIn, signOut, refresh, isSignedIn,
    select, insert, update, remove, rpc, resolveStore,
    get session() { return session; },
    get storeId() { return storeId; }
  }, api);
})();
