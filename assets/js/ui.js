/* ============================================================
   StreetFood OS — UI kit: formatters, charts (pure SVG), overlays
   ============================================================ */
window.UI = (function () {
  'use strict';

  /* ---------- formatters ---------- */
  const nf = (n, d = 0) => (isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const baht  = (n, d = 0) => '฿' + nf(n, d);
  const bahtK = n => n >= 1000000 ? '฿' + nf(n / 1000000, 2) + 'M' : n >= 1000 ? '฿' + nf(n / 1000, 1) + 'K' : '฿' + nf(n);
  const pc    = (n, d = 1) => nf(n, d) + '%';
  const esc   = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const TH_M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const TH_D = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
  const TH_DFULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  // วันอ้างอิงของ Prototype (Mock) — คงที่เพื่อให้ตัวเลขทุกหน้าตรงกัน
  const TODAY = new Date(2026, 7, 19);
  const shift = d => { const x = new Date(TODAY); x.setDate(x.getDate() + d); return x; };
  const dayLabel = d => TH_D[shift(d).getDay()] + ' ' + shift(d).getDate();
  const fullToday = () => `วัน${TH_DFULL[TODAY.getDay()]}ที่ ${TODAY.getDate()} ${TH_M[TODAY.getMonth()]} ${TODAY.getFullYear() + 543}`;
  const monthLabel = () => `${TH_M[TODAY.getMonth()]} ${TODAY.getFullYear() + 543}`;

  /* ---------- deltas / status ---------- */
  function delta(v, opts) {
    const o = opts || {};
    const good = o.invert ? v < 0 : v > 0;
    const flat = Math.abs(v) < 0.05;
    const cls = flat ? 'delta-flat' : good ? 'delta-up' : 'delta-down';
    const arw = flat ? '→' : v > 0 ? '▲' : '▼';
    return `<span class="delta ${cls}">${arw} ${nf(Math.abs(v), 1)}%</span>` +
           (o.label ? ` <span class="t-xs muted">${esc(o.label)}</span>` : '');
  }
  function marginBadge(m, target) {
    const t = target == null ? 35 : target;
    if (m >= t + 8) return `<span class="badge badge-good">${pc(m)}</span>`;
    if (m >= t)     return `<span class="badge badge-good">${pc(m)}</span>`;
    if (m >= t - 8) return `<span class="badge badge-warn">${pc(m)}</span>`;
    return `<span class="badge badge-bad">${pc(m)}</span>`;
  }

  /* ============================================================
     CHARTS — SVG generators (responsive via viewBox)
     ============================================================ */

  /** Combo chart: bars (revenue) + line (profit) + optional line (orders) */
  function comboChart(rows, opt) {
    const o = Object.assign({ w: 760, h: 260, pad: 34, bars: 'revenue', lines: ['profit'],
      labels: r => r.label, target: null, colors: { revenue:'var(--c1)', profit:'var(--c3)', orders:'var(--c2)' } }, opt);
    const W = o.w, H = o.h, P = o.pad, PB = 26, PL = 44;
    const max = Math.max(...rows.map(r => Math.max(r[o.bars], ...o.lines.map(k => r[k] || 0))), o.target || 0) * 1.16;
    const x = i => PL + (i + .5) * ((W - PL - P) / rows.length);
    const y = v => H - PB - (v / max) * (H - PB - 14);
    const bw = Math.min(38, (W - PL - P) / rows.length * .52);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="img" aria-label="กราฟยอดขาย">`;
    s += '<g class="chart-grid">';
    for (let i = 0; i <= 4; i++) {
      const gy = 14 + (H - PB - 14) * i / 4, v = max - max * i / 4;
      s += `<line x1="${PL}" y1="${gy}" x2="${W - P}" y2="${gy}"/>`;
      s += `<text class="chart-ax" x="${PL - 8}" y="${gy + 4}" text-anchor="end">${bahtK(v)}</text>`;
    }
    s += '</g>';
    if (o.target) s += `<line x1="${PL}" y1="${y(o.target)}" x2="${W - P}" y2="${y(o.target)}" stroke="var(--brand)" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>
      <text class="chart-ax" x="${PL + 6}" y="${y(o.target) - 7}" text-anchor="start" fill="var(--brand)" font-weight="700">เป้ารายวัน ${bahtK(o.target)}</text>`;
    rows.forEach((r, i) => {
      const bh = Math.max(2, H - PB - y(r[o.bars]));
      s += `<rect class="bar-hover" x="${x(i) - bw / 2}" y="${y(r[o.bars])}" width="${bw}" height="${bh}" rx="6"
              fill="${r.hi ? 'var(--brand)' : 'url(#gRev)'}"><title>${esc(o.labels(r, i))}: ${baht(r[o.bars])}</title></rect>`;
      s += `<text class="chart-ax" x="${x(i)}" y="${H - 7}" text-anchor="middle" ${r.hi ? 'font-weight="800" fill="var(--ink)"' : ''}>${esc(o.labels(r, i))}</text>`;
    });
    o.lines.forEach(k => {
      const pts = rows.map((r, i) => `${x(i)},${y(r[k] || 0)}`).join(' ');
      s += `<polyline points="${pts}" fill="none" stroke="${o.colors[k]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      rows.forEach((r, i) => { s += `<circle cx="${x(i)}" cy="${y(r[k] || 0)}" r="3.6" fill="#fff" stroke="${o.colors[k]}" stroke-width="2.2"><title>${k}: ${baht(r[k] || 0)}</title></circle>`; });
    });
    s += `<defs><linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffb089"/><stop offset="100%" stop-color="#ffd9c8"/></linearGradient></defs></svg>`;
    return s;
  }

  /** Area/line chart for long series */
  function areaChart(vals, opt) {
    const o = Object.assign({ w: 760, h: 200, color: 'var(--c2)', fill: 'rgba(47,107,255,.12)', labels: null }, opt);
    const W = o.w, H = o.h, PB = o.labels ? 24 : 8, PL = 46;
    const max = Math.max(...vals) * 1.12, min = Math.min(...vals) * .84;
    const x = i => PL + i * ((W - PL - 12) / (vals.length - 1));
    const y = v => H - PB - ((v - min) / (max - min || 1)) * (H - PB - 10);
    const line = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">`;
    s += '<g class="chart-grid">';
    for (let i = 0; i <= 3; i++) { const gy = 10 + (H - PB - 10) * i / 3, v = max - (max - min) * i / 3;
      s += `<line x1="${PL}" y1="${gy}" x2="${W - 12}" y2="${gy}"/><text class="chart-ax" x="${PL - 8}" y="${gy + 4}" text-anchor="end">${bahtK(v)}</text>`; }
    s += '</g>';
    s += `<polygon points="${PL},${H - PB} ${line} ${x(vals.length - 1)},${H - PB}" fill="${o.fill}"/>`;
    s += `<polyline points="${line}" fill="none" stroke="${o.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<circle cx="${x(vals.length - 1)}" cy="${y(vals[vals.length - 1])}" r="5" fill="${o.color}" stroke="#fff" stroke-width="2.5"/>`;
    if (o.labels) vals.forEach((v, i) => { if (o.labels(i) !== '') s += `<text class="chart-ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(o.labels(i))}</text>`; });
    return s + '</svg>';
  }

  /** Horizontal bar list */
  function hBars(rows, opt) {
    const o = Object.assign({ color: 'var(--c1)', fmt: baht, sub: null }, opt);
    const max = Math.max(...rows.map(r => r.v), 1);
    return `<div class="col g12">` + rows.map(r => `
      <div>
        <div class="between t-sm" style="margin-bottom:5px">
          <span class="b6">${esc(r.label)}</span>
          <span class="num b7">${o.fmt(r.v)}${r.sub ? ` <span class="t-xs muted">${esc(r.sub)}</span>` : ''}</span>
        </div>
        <div class="bar"><i style="width:${(r.v / max * 100).toFixed(1)}%;background:${r.color || o.color}"></i></div>
      </div>`).join('') + `</div>`;
  }

  /** Donut chart */
  function donut(parts, opt) {
    const o = Object.assign({ size: 168, thick: 22, center: '', sub: '' }, opt);
    const total = parts.reduce((s, p) => s + p.v, 0) || 1;
    const R = o.size / 2, r = R - o.thick / 2, C = 2 * Math.PI * r;
    let off = 0;
    let s = `<svg viewBox="0 0 ${o.size} ${o.size}" style="width:${o.size}px;height:${o.size}px;flex:none">
      <g transform="rotate(-90 ${R} ${R})">`;
    parts.forEach(p => {
      const len = p.v / total * C;
      s += `<circle cx="${R}" cy="${R}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${o.thick}"
             stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" stroke-linecap="butt"><title>${esc(p.label)}: ${nf(p.v / total * 100, 1)}%</title></circle>`;
      off += len;
    });
    s += `</g>`;
    if (o.center) s += `<text x="${R}" y="${R - 2}" text-anchor="middle" font-size="21" font-weight="800" font-family="Inter,sans-serif" fill="var(--ink)">${esc(o.center)}</text>`;
    if (o.sub)    s += `<text x="${R}" y="${R + 17}" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--muted)">${esc(o.sub)}</text>`;
    return s + `</svg>`;
  }

  /** Ring gauge (margin / goal) */
  function ring(pctVal, opt) {
    const o = Object.assign({ size: 56, thick: 7, color: null, label: null }, opt);
    const v = Math.max(0, Math.min(100, pctVal));
    const col = o.color || (v >= 40 ? 'var(--good)' : v >= 30 ? 'var(--warn)' : 'var(--bad)');
    const R = o.size / 2, r = R - o.thick / 2, C = 2 * Math.PI * r;
    return `<svg viewBox="0 0 ${o.size} ${o.size}" style="width:${o.size}px;height:${o.size}px;flex:none">
      <circle cx="${R}" cy="${R}" r="${r}" fill="none" stroke="var(--bg-2)" stroke-width="${o.thick}"/>
      <g transform="rotate(-90 ${R} ${R})"><circle cx="${R}" cy="${R}" r="${r}" fill="none" stroke="${col}"
        stroke-width="${o.thick}" stroke-linecap="round" stroke-dasharray="${v / 100 * C} ${C}"/></g>
      <text x="${R}" y="${R + 4}" text-anchor="middle" font-size="${o.size > 70 ? 15 : 12.5}" font-weight="800"
        font-family="Inter,sans-serif" fill="var(--ink)">${o.label != null ? esc(o.label) : Math.round(v) + '%'}</text></svg>`;
  }

  /** Sparkline for KPI cards */
  function spark(vals, color) {
    const W = 200, H = 40, max = Math.max(...vals), min = Math.min(...vals);
    const x = i => i * (W / (vals.length - 1));
    const y = v => H - 4 - ((v - min) / (max - min || 1)) * (H - 12);
    const line = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    return `<svg class="kpi-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polygon points="0,${H} ${line} ${W},${H}" fill="${color}" opacity=".13"/>
      <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
  }

  /** Waterfall for P&L */
  function waterfall(steps, opt) {
    const o = Object.assign({ w: 780, h: 280 }, opt);
    const W = o.w, H = o.h, PB = 46, PL = 50;
    let run = 0; const pts = [];
    steps.forEach(s => {
      if (s.type === 'total') pts.push({ ...s, from: 0, to: run });
      else { pts.push({ ...s, from: run, to: run + s.v }); run += s.v; }
    });
    const max = Math.max(...pts.map(p => Math.max(p.from, p.to))) * 1.12;
    const bw = Math.min(64, (W - PL - 16) / steps.length * .62);
    const x = i => PL + (i + .5) * ((W - PL - 16) / steps.length);
    const y = v => H - PB - (v / max) * (H - PB - 16);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">`;
    s += '<g class="chart-grid">';
    for (let i = 0; i <= 4; i++) { const gy = 16 + (H - PB - 16) * i / 4;
      s += `<line x1="${PL}" y1="${gy}" x2="${W - 16}" y2="${gy}"/><text class="chart-ax" x="${PL - 8}" y="${gy + 4}" text-anchor="end">${bahtK(max - max * i / 4)}</text>`; }
    s += '</g>';
    pts.forEach((p, i) => {
      const top = Math.min(y(p.from), y(p.to)), hh = Math.max(3, Math.abs(y(p.from) - y(p.to)));
      const col = p.type === 'total' ? (p.dark ? 'var(--ink)' : 'var(--good)') : p.v > 0 ? 'var(--c2)' : 'var(--bad)';
      s += `<rect class="bar-hover" x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${hh}" rx="5" fill="${col}" opacity="${p.type === 'total' ? 1 : .88}">
        <title>${esc(p.label)}: ${baht(Math.abs(p.v || p.to))}</title></rect>`;
      s += `<text class="chart-ax" x="${x(i)}" y="${top - 7}" text-anchor="middle" font-weight="800" fill="var(--ink-2)">${bahtK(Math.abs(p.type === 'total' ? p.to : p.v))}</text>`;
      const words = String(p.label).split(' ');
      s += `<text class="chart-ax" x="${x(i)}" y="${H - 26}" text-anchor="middle" font-size="11" font-weight="600">${esc(words[0])}</text>`;
      if (words[1]) s += `<text class="chart-ax" x="${x(i)}" y="${H - 13}" text-anchor="middle" font-size="11" font-weight="600">${esc(words.slice(1).join(' '))}</text>`;
      if (i < pts.length - 1) s += `<line x1="${x(i) + bw / 2}" y1="${y(p.to)}" x2="${x(i + 1) - bw / 2}" y2="${y(p.to)}" stroke="var(--muted-2)" stroke-width="1" stroke-dasharray="3 3"/>`;
    });
    return s + '</svg>';
  }

  /** Heatmap grid (day × hour) */
  function heatmap(){
    const days = ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'];
    const hours = ['08','10','12','14','16','18','20'];
    const seed = [[2,3,9,4,2,6,3],[2,4,9,3,2,6,3],[3,4,9,4,3,7,4],[3,4,8,4,3,7,4],[4,5,9,5,4,9,6],[5,6,8,6,5,9,7],[3,4,7,5,3,6,4]];
    let s = `<div style="display:grid;grid-template-columns:34px repeat(${hours.length},1fr);gap:4px">`;
    s += `<div></div>` + hours.map(h => `<div class="t-xs muted ctr num">${h}</div>`).join('');
    days.forEach((d, di) => {
      s += `<div class="t-xs muted b7" style="display:grid;place-items:center">${d}</div>`;
      hours.forEach((h, hi) => {
        const v = seed[di][hi], a = (v / 9);
        s += `<div title="${d} ${h}:00 — ระดับความคึกคัก ${v}/9" style="height:30px;border-radius:6px;
          background:rgba(255,106,43,${(a * .9).toFixed(2)});display:grid;place-items:center;
          font-size:10.5px;font-weight:800;font-family:var(--f-num);color:${a > .6 ? '#fff' : 'var(--brand-ink)'}">${v >= 8 ? v : ''}</div>`;
      });
    });
    return s + '</div>';
  }

  /* ============================================================
     OVERLAYS
     ============================================================ */
  function toast(msg, kind) {
    let w = document.querySelector('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
    const ic = kind === 'ok' ? '✅' : kind === 'warn' ? '⚠️' : kind === 'ai' ? '🤖' : '✨';
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = `<span>${ic}</span><span>${esc(msg)}</span>`;
    w.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s,transform .3s'; t.style.opacity = 0; t.style.transform = 'translateY(10px)';
      setTimeout(() => t.remove(), 320); }, 2600);
  }

  let modalEl = null;
  function modal(o) {
    closeModal(true);
    modalEl = document.createElement('div');
    modalEl.className = 'modal-scrim';
    modalEl.innerHTML = `
      <div class="modal ${o.wide ? 'modal-w' : ''}" role="dialog" aria-modal="true">
        <div class="modal-h">
          <div class="row g10">${o.icon ? `<span style="font-size:22px">${o.icon}</span>` : ''}
            <div><h4>${esc(o.title)}</h4>${o.sub ? `<div class="t-sm muted">${esc(o.sub)}</div>` : ''}</div></div>
          <button class="btn-icon" data-x aria-label="ปิด">✕</button>
        </div>
        <div class="modal-b">${o.body || ''}</div>
        ${o.foot === false ? '' : `<div class="modal-f">
          <button class="btn btn-ghost" data-x>${esc(o.cancelText || 'ยกเลิก')}</button>
          ${o.okText ? `<button class="btn btn-primary" data-ok>${esc(o.okText)}</button>` : ''}
        </div>`}
      </div>`;
    document.body.appendChild(modalEl);
    requestAnimationFrame(() => modalEl.classList.add('on'));
    modalEl.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeModal());
    modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
    const ok = modalEl.querySelector('[data-ok]');
    if (ok) ok.onclick = () => { if (!o.onOk || o.onOk(modalEl) !== false) closeModal(); };
    if (o.onMount) o.onMount(modalEl);
    document.addEventListener('keydown', escClose);
    return modalEl;
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal(instant) {
    if (!modalEl) return;
    const m = modalEl; modalEl = null;
    document.removeEventListener('keydown', escClose);
    if (instant) return m.remove();
    m.classList.remove('on'); setTimeout(() => m.remove(), 200);
  }

  /* ---------- small components ---------- */
  function kpi(o) {
    return `<div class="kpi">
      ${o.spark ? spark(o.spark, o.sparkColor || 'var(--c1)') : ''}
      <div class="between" style="align-items:flex-start;position:relative">
        <div class="kl">${esc(o.label)}</div>
        ${o.icon ? `<div class="ki" style="background:${o.iconBg || 'var(--brand-soft)'}">${o.icon}</div>` : ''}
      </div>
      <div class="kv" style="position:relative">${o.value}</div>
      <div class="kf" style="position:relative">${o.foot || ''}</div>
    </div>`;
  }
  function empty(icon, title, sub, btn) {
    return `<div class="ctr" style="padding:44px 20px">
      <div style="font-size:40px;opacity:.5">${icon}</div>
      <h4 class="mt12">${esc(title)}</h4>
      ${sub ? `<p class="muted t-sm mt4" style="max-width:340px;margin:6px auto 0">${esc(sub)}</p>` : ''}
      ${btn ? `<div class="mt16">${btn}</div>` : ''}</div>`;
  }
  function sectionTitle(t, s, right) {
    return `<div class="between mb16"><div><h3>${esc(t)}</h3>${s ? `<div class="t-sm muted mt4">${esc(s)}</div>` : ''}</div>${right || ''}</div>`;
  }

  /* ============================================================
     EXPORT CSV — ทำงานฝั่ง browser ล้วน ไม่ต้องมี backend ไม่มีค่าใช้จ่าย
     ใส่ UTF-8 BOM เพื่อให้ Excel เปิดภาษาไทยไม่เป็นตัวยึกยือ
     ============================================================ */
  function csv(filename, rows) {
    const cell = v => {
      const t = v == null ? '' : String(v);
      return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const body = rows.map(r => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('ดาวน์โหลด ' + filename + ' แล้ว', 'ok');
  }

  return { csv, nf, baht, bahtK, pc, esc, delta, marginBadge, TH_M, TH_D, TODAY, shift, dayLabel, fullToday, monthLabel,
           comboChart, areaChart, hBars, donut, ring, spark, waterfall, heatmap,
           toast, modal, closeModal, kpi, empty, sectionTitle };
})();
