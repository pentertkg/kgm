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

  let session = null;
  try { session = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) {}

  /* ---------- HTTP ---------- */
  function headers(extra) {
    const h = Object.assign({
      apikey: CFG.supabaseAnonKey,
      'Content-Type': 'application/json'
    }, extra || {});
    h.Authorization = 'Bearer ' + ((session && session.access_token) || CFG.supabaseAnonKey);
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

    async createStore(s) {
      const [store] = await insert('stores', [{
        name: s.name, emoji: s.emoji, format: s.format, food_type: s.type,
        location: s.location, open_time: s.open, close_time: s.close,
        staff_count: s.staff, goal_month: s.goal }]);
      const me = await req(AUTH + '/user', { headers: headers() });
      await insert('store_members', [{ store_id: store.id, user_id: me.id, role: 'owner' }]);
      storeId = store.id;
      return store;
    }
  };

  function isoDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  }

  return Object.assign({
    enabled, signUp, signIn, signOut, refresh, isSignedIn,
    select, insert, update, remove, resolveStore,
    get session() { return session; },
    get storeId() { return storeId; }
  }, api);
})();
