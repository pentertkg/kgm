/* ============================================================
   StreetFood OS — Single Source of Truth (Local Mock Data)
   ไม่มีการเชื่อมต่อ Backend / API / Database ใดๆ
   ทุกตัวเลขในระบบคำนวณต่อกันจากไฟล์นี้
   ============================================================ */
window.DB = (function () {
  'use strict';

  /* ---------- 1) ร้าน ---------- */
  const store = {
    name: 'ร้านกะเพราเฮียสม',
    emoji: '🌿',
    type: 'ตามสั่ง / อาหารจานเดียว',
    format: 'Street Food',
    location: 'ซอยสุขุมวิท 23 (หน้าออฟฟิศ อโศก)',
    open: '08:00', close: '20:00',
    staff: 3,
    goalMonth: 500000,
    openDays: 30,
    plan: 'Growth Trial',
    trialDaysLeft: 11
  };

  /* ---------- 2) วัตถุดิบ + Stock ---------- */
  // cost = ต้นทุนต่อหน่วยนับ (บาท/หน่วย)
  const ingredients = [
    { id:'porkc', name:'หมูกรอบ',            unit:'kg',      cost:280, stock:2.4,  min:5,   use:1.28 },
    { id:'pork',  name:'หมูสับ',              unit:'kg',      cost:165, stock:3.2,  min:8,   use:7.80 },
    { id:'chick', name:'อกไก่',               unit:'kg',      cost:95,  stock:6.5,  min:4,   use:2.90 },
    { id:'sea',   name:'กุ้ง/ปลาหมึกรวม',      unit:'kg',      cost:320, stock:0,    min:2,   use:0.00 },
    { id:'rice',  name:'ข้าวสาร',              unit:'kg',      cost:42,  stock:12,   min:10,  use:9.60 },
    { id:'egg',   name:'ไข่ไก่',               unit:'แผง',     cost:132, stock:8,    min:6,   use:3.40 },
    { id:'basil', name:'ใบกะเพรา',            unit:'kg',      cost:120, stock:1.2,  min:2,   use:1.05 },
    { id:'chili', name:'พริก+กระเทียม',        unit:'kg',      cost:95,  stock:1.8,  min:1.5, use:0.85 },
    { id:'oil',   name:'น้ำมันพืช',            unit:'ลิตร',    cost:58,  stock:4,    min:5,   use:2.20 },
    { id:'sauce', name:'เครื่องปรุง (ซอส/น้ำปลา)', unit:'ขวด', cost:45,  stock:3,    min:2,   use:0.90 },
    { id:'pack',  name:'กล่องข้าว + ถุง',       unit:'ใบ',      cost:2.4, stock:180,  min:250, use:245 },
    { id:'water', name:'น้ำดื่มขวด',           unit:'ขวด',     cost:5,   stock:96,   min:60,  use:41 },
    { id:'soda',  name:'น้ำอัดลมกระป๋อง',      unit:'กระป๋อง', cost:12,  stock:24,   min:48,  use:58 },
    { id:'tea',   name:'ผงชา + นมข้น',         unit:'ชุด',     cost:135, stock:2,    min:1,   use:0.35 }
  ];
  const ing = id => ingredients.find(i => i.id === id);

  function stockStatus(i){
    if (i.stock <= 0) return 'out';
    if (i.stock < i.min) return 'low';
    return 'ok';
  }

  /* ---------- 3) เมนู + สูตร (ต้นทุนคำนวณจากสูตร) ---------- */
  // recipe: [ingredientId, ปริมาณที่แสดง, ต้นทุนบาทต่อจาน]
  const menu = [
    { id:'m1', name:'กะเพราหมูกรอบ', emoji:'🍚', cat:'จานเดียว', price:69, active:true, hero:true,
      desc:'หมูกรอบเจ้าประจำ ผัดใบกะเพราไฟแรง ราดข้าวสวยร้อนๆ ขายดีที่สุดของร้าน',
      recipe:[[ 'porkc','หมูกรอบ 105 ก.',30],['rice','ข้าวสวย 250 ก.',7],['sauce','เครื่องปรุง',4],['egg','ไข่ดาว 1 ฟอง',5],['pack','บรรจุภัณฑ์',3]] },
    { id:'m2', name:'กะเพราหมู', emoji:'🥘', cat:'จานเดียว', price:60, active:true,
      desc:'กะเพราหมูสับสูตรต้นตำรับ เผ็ดกลาง สั่งเพิ่มไข่ดาวได้',
      recipe:[['pork','หมูสับ 130 ก.',22],['rice','ข้าวสวย 250 ก.',7],['sauce','เครื่องปรุง',4],['basil','ใบกะเพรา',2],['pack','บรรจุภัณฑ์',3]] },
    { id:'m3', name:'กะเพราไก่', emoji:'🍗', cat:'จานเดียว', price:55, active:true,
      desc:'อกไก่สับ แคลอรีต่ำ กลุ่มออฟฟิศสั่งเยอะช่วงเที่ยง',
      recipe:[['chick','อกไก่ 140 ก.',17],['rice','ข้าวสวย 250 ก.',7],['sauce','เครื่องปรุง',4],['basil','ใบกะเพรา',2],['pack','บรรจุภัณฑ์',3]] },
    { id:'m4', name:'ข้าวผัดหมู', emoji:'🍛', cat:'จานเดียว', price:55, active:true,
      desc:'ข้าวผัดหมูใส่ไข่ เมนูสำรองสำหรับคนไม่กินเผ็ด',
      recipe:[['pork','หมูสับ 90 ก.',15],['rice','ข้าวสวย 250 ก.',7],['egg','ไข่ 1 ฟอง',3],['sauce','เครื่องปรุง',3],['pack','บรรจุภัณฑ์',3]] },
    { id:'m5', name:'ข้าวไข่เจียวหมูสับ', emoji:'🍳', cat:'จานเดียว', price:50, active:true,
      desc:'ไข่เจียวฟูหมูสับ ราคาเข้าถึงง่าย',
      recipe:[['egg','ไข่ 3 ฟอง',9],['pork','หมูสับ 50 ก.',8],['rice','ข้าวสวย 250 ก.',7],['pack','บรรจุภัณฑ์',3]] },
    { id:'m6', name:'กะเพราทะเล', emoji:'🦐', cat:'จานเดียว', price:79, active:true, watch:true,
      desc:'เมนูใหม่ กุ้ง+ปลาหมึก ต้นทุนสูง ยอดขายยังไม่ขึ้น',
      recipe:[['sea','กุ้ง+ปลาหมึก 130 ก.',42],['rice','ข้าวสวย 250 ก.',7],['sauce','เครื่องปรุง',4],['basil','ใบกะเพรา',2],['pack','บรรจุภัณฑ์',3]] },
    { id:'m7', name:'ไข่ดาว', emoji:'🍳', cat:'ท็อปปิ้ง', price:12, active:true,
      desc:'ท็อปปิ้งยอดนิยม เพิ่มกำไรต่อบิลได้ดี',
      recipe:[['egg','ไข่ 1 ฟอง',4],['oil','น้ำมัน',2]] },
    { id:'m8', name:'น้ำเปล่า', emoji:'💧', cat:'เครื่องดื่ม', price:10, active:true,
      desc:'น้ำดื่มขวดเล็ก 600 มล.',
      recipe:[['water','ขวด 600 มล.',5]] },
    { id:'m9', name:'น้ำอัดลม', emoji:'🥤', cat:'เครื่องดื่ม', price:20, active:true,
      desc:'กระป๋อง 325 มล. เหมาะทำ Bundle คู่กับจานเดียว',
      recipe:[['soda','กระป๋อง 325 มล.',12]] },
    { id:'m10', name:'ชาเย็น', emoji:'🧋', cat:'เครื่องดื่ม', price:25, active:true,
      desc:'ชาไทยเย็น มาร์จิ้นสูงสุดในร้าน',
      recipe:[['tea','ผงชา + นมข้น',4],['water','น้ำแข็ง/แก้ว',2],['pack','หลอด+ฝา',5]] }
  ];

  // derive cost / profit / margin
  menu.forEach(m => {
    m.cost = m.recipe.reduce((s, r) => s + r[2], 0);
    m.profit = m.price - m.cost;
    m.margin = m.price ? (m.profit / m.price) * 100 : 0;
  });
  const mi = id => menu.find(m => m.id === id);

  /* ---------- 4) ยอดขายวันนี้ (units ต่อเมนู → ทุก KPI มาจากตรงนี้) ---------- */
  const todayUnits = { m1:93, m2:74, m3:41, m4:48, m5:4, m6:0, m7:54, m8:41, m9:58, m10:14 };
  const ordersCountToday = 284;

  const todayLines = menu.map(m => {
    const u = todayUnits[m.id] || 0;
    return { id:m.id, name:m.name, emoji:m.emoji, units:u,
             revenue:u * m.price, profit:u * m.profit, margin:m.margin, price:m.price, cost:m.cost };
  });
  const today = {
    revenue: todayLines.reduce((s,l)=>s+l.revenue,0),   // 18,520
    profit:  todayLines.reduce((s,l)=>s+l.profit,0),    // 6,823
    orders:  ordersCountToday,
    get aov(){ return this.revenue / this.orders; }
  };

  /* ---------- 5) 7 วันย้อนหลัง (index 6 = วันนี้) ---------- */
  const trend7 = [
    { d:-6, revenue:14180, orders:221, profit:6010 },
    { d:-5, revenue:17650, orders:272, profit:7480 },
    { d:-4, revenue:16980, orders:264, profit:7240 },
    { d:-3, revenue:17420, orders:268, profit:7390 },
    { d:-2, revenue:15930, orders:249, profit:6760 },
    { d:-1, revenue:16540, orders:258, profit:7107 },
    { d: 0, revenue:today.revenue, orders:today.orders, profit:today.profit }
  ];
  const yest = trend7[5], now = trend7[6];
  const cmpYesterday = {
    revenue: pct(now.revenue, yest.revenue),      // +12.0%
    orders:  pct(now.orders,  yest.orders),       // +10.1%
    aov:     pct(now.revenue/now.orders, yest.revenue/yest.orders),
    profit:  pct(now.profit,  yest.profit)        // -4.0%
  };
  function pct(a,b){ return b ? ((a-b)/b)*100 : 0; }

  /* 30 วันย้อนหลัง สำหรับ Analytics */
  const trend30 = (function(){
    const base=[15200,16100,14300,17200,16800,15900,18100,16400,15100,17800,16200,14900,17600,18300,16700,
                15400,17100,16900,15800,18400,17300,14180,17650,16980,17420,15930,16540,18520];
    return base.map((r,i)=>({ d:i-(base.length-1), revenue:r, orders:Math.round(r/65.2),
                              profit:Math.round(r*(i>=25?0.375:0.428)) }));
  })();

  /* ---------- 6) เดือนนี้ (MTD 19 วัน) + P&L ---------- */
  const month = {
    days: 19, daysInMonth: 31,
    revenue: 302480, orders: 4652, grossProfit: 116940,
    foodCost: 185540, labor: 42000, rent: 18000, marketing: 12000, other: 8400,
    get netProfit(){ return this.grossProfit - this.labor - this.rent - this.marketing - this.other },
    get netMargin(){ return this.netProfit / this.revenue * 100 },
    get goalProgress(){ return this.revenue / store.goalMonth * 100 },
    get projected(){ return Math.round(this.revenue / this.days * this.daysInMonth) },
    get dailyTarget(){ return store.goalMonth / this.daysInMonth }
  };

  /* ---------- 7) ออเดอร์ ---------- */
  // items: [menuId, qty]
  const rawOrders = [
    { id:'#1284', t:'11:58', ch:'walkin',   st:'new',       cust:'ลูกค้าหน้าร้าน', items:[['m1',2],['m9',1]], note:'ไม่ใส่พริก 1 จาน' },
    { id:'#1283', t:'11:56', ch:'delivery', st:'new',       cust:'ณัฐพล ว.',      items:[['m2',1],['m7',1],['m8',1]], note:'' },
    { id:'#1282', t:'11:54', ch:'online',   st:'new',       cust:'สมชาย ใจดี',     items:[['m1',1],['m10',1]], note:'เผ็ดมาก' },
    { id:'#1281', t:'11:51', ch:'walkin',   st:'preparing', cust:'ลูกค้าหน้าร้าน', items:[['m3',2],['m8',2]], note:'' },
    { id:'#1280', t:'11:49', ch:'delivery', st:'preparing', cust:'ปรีชา ตั้งใจ',   items:[['m1',1],['m4',1],['m9',2]], note:'แยกข้าว' },
    { id:'#1279', t:'11:47', ch:'walkin',   st:'preparing', cust:'ลูกค้าหน้าร้าน', items:[['m2',3]], note:'ไม่ใส่ใบกะเพรา 1 จาน' },
    { id:'#1278', t:'11:44', ch:'online',   st:'ready',     cust:'มานี รักเรียน',  items:[['m1',1],['m7',2]], note:'' },
    { id:'#1277', t:'11:42', ch:'walkin',   st:'ready',     cust:'ลูกค้าหน้าร้าน', items:[['m4',1],['m10',1]], note:'' },
    { id:'#1276', t:'11:38', ch:'delivery', st:'completed', cust:'สุดา แสนดี',     items:[['m1',2],['m9',2]], note:'' },
    { id:'#1275', t:'11:35', ch:'walkin',   st:'completed', cust:'ลูกค้าหน้าร้าน', items:[['m3',1],['m8',1]], note:'' },
    { id:'#1274', t:'11:31', ch:'online',   st:'completed', cust:'สมชาย ใจดี',     items:[['m1',1],['m2',1],['m10',2]], note:'' },
    { id:'#1273', t:'11:27', ch:'walkin',   st:'completed', cust:'ลูกค้าหน้าร้าน', items:[['m5',1],['m8',1]], note:'' },
    { id:'#1272', t:'11:24', ch:'delivery', st:'completed', cust:'วิภา สายลม',     items:[['m2',2],['m7',1],['m9',1]], note:'' },
    { id:'#1271', t:'11:20', ch:'walkin',   st:'completed', cust:'ลูกค้าหน้าร้าน', items:[['m1',1]], note:'' },
    { id:'#1270', t:'11:16', ch:'online',   st:'completed', cust:'เอกชัย พูนทรัพย์',items:[['m4',2],['m9',1]], note:'' },
    { id:'#1269', t:'11:12', ch:'walkin',   st:'completed', cust:'ลูกค้าหน้าร้าน', items:[['m3',1],['m7',1],['m10',1]], note:'' },
    { id:'#1268', t:'11:05', ch:'delivery', st:'cancelled', cust:'ธนา มั่งมี',      items:[['m6',1]], note:'ยกเลิก: กุ้งหมด' },
    { id:'#1267', t:'10:58', ch:'walkin',   st:'completed', cust:'ลูกค้าหน้าร้าน', items:[['m2',1],['m8',1]], note:'' }
  ];
  const orders = rawOrders.map(o => {
    const lines = o.items.map(([id,q]) => { const m = mi(id); return { menu:m, qty:q, sum:m.price*q, profit:m.profit*q }; });
    return Object.assign({}, o, { lines,
      total: lines.reduce((s,l)=>s+l.sum,0),
      profit: lines.reduce((s,l)=>s+l.profit,0),
      qty: lines.reduce((s,l)=>s+l.qty,0) });
  });

  const CH = {
    walkin:   { label:'หน้าร้าน', icon:'🧍', cls:'badge' },
    delivery: { label:'Delivery', icon:'🛵', cls:'badge-info' },
    online:   { label:'Online',   icon:'📱', cls:'badge-brand' }
  };
  const ST = {
    new:       { label:'ออเดอร์ใหม่', cls:'badge-info', next:'preparing', nextLabel:'เริ่มทำ' },
    preparing: { label:'กำลังทำ',    cls:'badge-warn', next:'ready',     nextLabel:'พร้อมเสิร์ฟ' },
    ready:     { label:'พร้อมเสิร์ฟ', cls:'badge-good', next:'completed', nextLabel:'เสร็จแล้ว' },
    completed: { label:'เสร็จแล้ว',   cls:'badge',      next:null,        nextLabel:'' },
    cancelled: { label:'ยกเลิก',      cls:'badge-bad',  next:null,        nextLabel:'' }
  };
  const channelMix = [
    { key:'walkin',   label:'หน้าร้าน',  orders:171, revenue:10842, color:'var(--c1)' },
    { key:'delivery', label:'Delivery', orders:74,  revenue:5372,  color:'var(--c2)' },
    { key:'online',   label:'Online',   orders:39,  revenue:2306,  color:'var(--c4)' }
  ];

  /* ---------- 8) ยอดขายรายชั่วโมง ---------- */
  const hourly = [
    {h:'08',r:620},{h:'09',r:880},{h:'10',r:1120},{h:'11',r:2480},{h:'12',r:3960},
    {h:'13',r:2340},{h:'14',r:940},{h:'15',r:760},{h:'16',r:880},{h:'17',r:1580},
    {h:'18',r:1720},{h:'19',r:1240}
  ];

  /* ---------- 9) ลูกค้า / CRM ---------- */
  const segments = [
    { key:'new',      label:'ลูกค้าใหม่',   n:186, color:'var(--c2)', desc:'ซื้อครั้งแรกภายใน 30 วัน' },
    { key:'regular',  label:'ลูกค้าประจำ',  n:412, color:'var(--c3)', desc:'ซื้อซ้ำ 3 ครั้งขึ้นไป' },
    { key:'vip',      label:'VIP',          n:64,  color:'var(--c1)', desc:'ยอดสะสม 1,000 บาทขึ้นไป' },
    { key:'risk',     label:'At Risk',      n:58,  color:'var(--c5)', desc:'ไม่กลับมาเกิน 30 วัน' },
    { key:'inactive', label:'Inactive',     n:143, color:'var(--muted-2)', desc:'ไม่กลับมาเกิน 60 วัน' }
  ];
  const customers = [
    { name:'สมชาย ใจดี',       orders:12, spend:1280, last:'3 วันก่อน',  fav:'m1', seg:'vip' },
    { name:'มานี รักเรียน',     orders:9,  spend:742,  last:'วันนี้',     fav:'m3', seg:'regular' },
    { name:'ปรีชา ตั้งใจ',      orders:15, spend:1665, last:'วันนี้',     fav:'m1', seg:'vip' },
    { name:'สุดา แสนดี',        orders:7,  spend:658,  last:'1 วันก่อน',  fav:'m2', seg:'regular' },
    { name:'ณัฐพล วงศ์ใหญ่',    orders:4,  spend:296,  last:'วันนี้',     fav:'m2', seg:'new' },
    { name:'วิภา สายลม',        orders:11, spend:1024, last:'2 วันก่อน',  fav:'m2', seg:'vip' },
    { name:'เอกชัย พูนทรัพย์',   orders:6,  spend:534,  last:'4 วันก่อน',  fav:'m4', seg:'regular' },
    { name:'ธนา มั่งมี',         orders:3,  spend:214,  last:'34 วันก่อน', fav:'m1', seg:'risk' },
    { name:'กมล ศรีสุข',        orders:8,  spend:696,  last:'31 วันก่อน', fav:'m1', seg:'risk' },
    { name:'จันทร์เพ็ญ ดีงาม',   orders:5,  spend:410,  last:'38 วันก่อน', fav:'m3', seg:'risk' },
    { name:'ภาคิน ทองแท้',      orders:2,  spend:131,  last:'วันนี้',     fav:'m5', seg:'new' },
    { name:'อรุณี แจ่มใส',      orders:14, spend:1432, last:'1 วันก่อน',  fav:'m1', seg:'vip' },
    { name:'ชาลี เพื่อนบ้าน',    orders:1,  spend:69,   last:'วันนี้',     fav:'m1', seg:'new' },
    { name:'สมหญิง ขยันทำ',     orders:6,  spend:588,  last:'67 วันก่อน', fav:'m2', seg:'inactive' },
    { name:'พิชัย ค้าขาย',       orders:10, spend:915,  last:'5 วันก่อน',  fav:'m4', seg:'regular' }
  ];
  const crm = {
    total: segments.reduce((s,x)=>s+x.n,0),   // 863
    new30: 186, repeat: 412, lost: 58,
    repeatRate: 58.2, clv: 1180, avgVisitGap: 9.4
  };

  /* ---------- 10) Marketing ---------- */
  const campaigns = [
    { name:'กะเพรามื้อเที่ยง',        ch:'Facebook Ads', st:'active', spend:2500, revenue:14800, orders:214, newCust:62, days:'1–19 ส.ค.' },
    { name:'ส่งฟรีรัศมี 3 กม.',        ch:'LINE OA',      st:'active', spend:3800, revenue:15300, orders:236, newCust:71, days:'1–19 ส.ค.' },
    { name:'เปิดร้านเช้า จับกลุ่มออฟฟิศ', ch:'TikTok',    st:'active', spend:2200, revenue:9400,  orders:148, newCust:34, days:'5–19 ส.ค.' },
    { name:'โปรเย็นวันศุกร์',          ch:'Facebook Ads', st:'paused', spend:1900, revenue:6300,  orders:96,  newCust:12, days:'1–15 ส.ค.' },
    { name:'Boost เมนูใหม่ กะเพราทะเล', ch:'Facebook Ads', st:'active', spend:1600, revenue:2700,  orders:38,  newCust:7,  days:'8–19 ส.ค.' }
  ];
  campaigns.forEach(c => { c.roas = c.revenue / c.spend; c.cac = c.newCust ? c.spend / c.newCust : 0; });
  const marketing = {
    spend:   campaigns.reduce((s,c)=>s+c.spend,0),      // 12,000
    revenue: campaigns.reduce((s,c)=>s+c.revenue,0),    // 48,500
    newCust: campaigns.reduce((s,c)=>s+c.newCust,0),    // 186
    get roas(){ return this.revenue / this.spend },     // 4.04x
    get cac(){ return this.spend / this.newCust },      // 64.52
    conversion: 3.8, reach: 62400, clicks: 4920
  };

  const promotions = [
    { name:'กะเพรา + เครื่องดื่ม 75฿', type:'Bundle',   st:'active', used:142, revenue:10650, until:'31 ส.ค.' },
    { name:'ลด 20฿ ลูกค้าหายเกิน 21 วัน', type:'Coupon', st:'draft',  used:0,   revenue:0,     until:'—' },
    { name:'ไข่ดาวฟรี เมื่อครบ 100฿',   type:'Free item', st:'ended', used:318, revenue:24800, until:'10 ส.ค.' }
  ];

  /* ---------- 11) AI Insight กลาง (อ้างอิงจากตัวเลขข้างบน) ---------- */
  const ai = {
    headline: `ยอดขายวันนี้เพิ่มขึ้น ${cmpYesterday.revenue.toFixed(0)}% แต่กำไรลดลง ${Math.abs(cmpYesterday.profit).toFixed(0)}% เพราะต้นทุนหมูเพิ่มขึ้น 8%`,
    detail: 'ราคาหมูสับจากซัพพลายเออร์ปรับจาก 153 → 165 บาท/กก. (+7.8%) ตั้งแต่ 3 วันก่อน ทำให้มาร์จิ้นเฉลี่ยของกลุ่มเมนูหมูลดจาก 38.4% → 36.8% ขณะที่ราคาขายยังเท่าเดิม',
    recs: [
      { t:'ปรับราคากะเพราหมูกรอบ 65 → 69 บาท', d:'กู้กำไรได้ประมาณ ฿372/วัน จากยอดขาย 93 จาน/วัน โดยยังต่ำกว่าราคาเฉลี่ยคู่แข่งในรัศมี 500 ม. (72 บาท)', impact:'+฿11,160/เดือน', act:'menu' },
      { t:'สร้าง Bundle กะเพรา + เครื่องดื่ม 75 บาท', d:'ลูกค้า 41% ยังไม่สั่งเครื่องดื่ม ถ้าดันขึ้นเป็น 60% จะเพิ่ม AOV จาก ฿65 → ฿73', impact:'+฿2,272/วัน', act:'promo' },
      { t:'หยุด Campaign “Boost เมนูใหม่ กะเพราทะเล” (ROAS 1.69x)', d:'ต่ำกว่าจุดคุ้มทุน (ต้องมี ROAS ≥ 2.7x จึงจะกำไร) ย้ายงบ ฿1,600 ไป “กะเพรามื้อเที่ยง” ที่ ROAS 5.92x', impact:'+฿7,872 คาดการณ์', act:'marketing' }
    ],
    todo: [
      { t:'เติม Stock หมูสับด่วน', d:'เหลือ 3.2 กก. แต่พรุ่งนี้ต้องใช้ประมาณ 7.8 กก. — ขาดอีก 4.6 กก.', urgent:true, act:'stock', cta:'สร้างใบสั่งซื้อ' },
      { t:'หยุด Campaign ที่ ROAS ต่ำกว่า 2x', d:'“Boost เมนูใหม่ กะเพราทะเล” ROAS 1.69x ใช้งบไปแล้ว ฿1,600', urgent:false, act:'marketing', cta:'ไปที่ Marketing' },
      { t:'ทำ Promotion เรียกลูกค้าที่หายไป', d:'มีลูกค้า 58 คนไม่กลับมาเกิน 30 วัน มูลค่าที่หายไปประมาณ ฿6,960/เดือน', urgent:false, act:'promo', cta:'สร้าง Campaign' }
    ]
  };

  /* ---------- 12) Notifications ---------- */
  const notis = [
    { ic:'alert', t:'หมูสับต่ำกว่าจุดสั่งซื้อ', d:'เหลือ 3.2 กก. (ขั้นต่ำ 8 กก.)', time:'12 นาทีที่แล้ว', cls:'badge-bad' },
    { ic:'stock', t:'กุ้ง/ปลาหมึกหมด', d:'กะเพราทะเลถูกปิดขายอัตโนมัติ', time:'1 ชม.ที่แล้ว', cls:'badge-bad' },
    { ic:'analytics', t:'ยอดขายวันนี้เกินเป้ารายวันแล้ว', d:`฿${(18520).toLocaleString()} จากเป้า ฿16,129`, time:'2 ชม.ที่แล้ว', cls:'badge-good' },
    { ic:'advisor', t:'AI พบโอกาสเพิ่มกำไร 3 ข้อ', d:'ปรับราคา / Bundle / ย้ายงบโฆษณา', time:'เช้านี้', cls:'badge-ai' }
  ];

  /* ---------- helpers ---------- */
  const topMenuToday = () => todayLines.filter(l=>l.units>0).sort((a,b)=>b.revenue-a.revenue);

  function forecastTomorrow(){
    const growth = 1.04;
    return ingredients.map(i => ({
      ...i, need: +(i.use * growth).toFixed(2),
      gap: +Math.max(0, (i.use * growth) - i.stock).toFixed(2)
    })).filter(i => i.use > 0);
  }

  /* ---------- override จาก Onboarding (localStorage เท่านั้น) ---------- */
  function applyLocal(){
    try{
      const s = JSON.parse(localStorage.getItem('sfos_store') || 'null');
      if (s){
        if (s.name)   store.name = s.name;
        if (s.emoji)  store.emoji = s.emoji;
        if (s.format) store.format = s.format;
        if (s.type)   store.type = s.type;
        if (s.location) store.location = s.location;
        if (s.open)   store.open = s.open;
        if (s.close)  store.close = s.close;
        if (s.staff)  store.staff = +s.staff;
        if (s.goal)   store.goalMonth = +s.goal;
        store.fromWizard = true;
      }
      const extra = JSON.parse(localStorage.getItem('sfos_menu_extra') || '[]');
      extra.forEach((m,idx) => {
        if (menu.some(x => x.name === m.name)) return;
        const item = { id:'x'+idx, name:m.name, emoji:m.emoji||'🍽️', cat:m.cat||'จานเดียว',
          price:+m.price, active:true, custom:true, desc:'เมนูที่คุณเพิ่มตอนสร้างร้าน',
          recipe:[['sauce','ต้นทุนรวม (ประมาณ)', +m.cost]] };
        item.cost = +m.cost; item.profit = item.price - item.cost;
        item.margin = item.price ? item.profit/item.price*100 : 0;
        menu.push(item);
      });
    }catch(e){ /* prototype: เพิกเฉยได้ */ }
  }
  applyLocal();

  return { store, ingredients, ing, stockStatus, menu, mi, todayUnits, todayLines, today,
           trend7, trend30, cmpYesterday, month, orders, CH, ST, channelMix, hourly,
           segments, customers, crm, campaigns, marketing, promotions, ai, notis,
           topMenuToday, forecastTomorrow, pct };
})();
