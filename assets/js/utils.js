/* ============================================================
   MR LAUNDRY FACTORY PORTAL — UTILITIES
   Helpers: DOM, formatting, date ranges, modal, toast, print, export
   ============================================================ */

/* ---------------- DOM ----------------
   Scoped lookup: agar root diya gaya ho aur selector sirf "#id" ho to
   apne aap descendants mein dhoondein — is tarah ek jaisi id wale do
   modals (ya band hone wala modal) aapas mein conflict nahi karte. */
function $(sel, root) {
  root = root || document;
  if (root !== document && typeof sel === 'string' && /^#[A-Za-z][\w:.-]*$/.test(sel)) {
    const id = sel.slice(1);
    const all = root.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) { if (all[i].id === id) return all[i]; }
    return null;
  }
  return root.querySelector(sel);
}
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

/* ---------------- SAFE STORAGE ----------------
   Sandboxed iframe / private mode mein localStorage block ho sakta hai —
   is liye har access safe wrapper se hota hai (warna woh jagah chal nahi pati). */
const SafeStore = {
  mem: {},
  ok: (function () {
    try { localStorage.setItem('__mlfTest', '1'); localStorage.removeItem('__mlfTest'); return true; }
    catch (e) { return false; }
  })(),
  get(k) {
    try { return this.ok ? localStorage.getItem(k) : (Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null); }
    catch (e) { return Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null; }
  },
  set(k, v) {
    try { if (this.ok) { localStorage.setItem(k, v); return true; } } catch (e) { /* fall through */ }
    this.mem[k] = String(v);
    return false;
  },
  del(k) {
    try { if (this.ok) localStorage.removeItem(k); } catch (e) {}
    delete this.mem[k];
  }
};

/* ---------------- IDS ---------------- */
function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------------- NUMBERS ---------------- */
function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function round1(v) { return Math.round((num(v) + Number.EPSILON) * 10) / 10; }
function round2(v) { return Math.round((num(v) + Number.EPSILON) * 100) / 100; }
function fmtNum(v, dp) {
  const n = num(v);
  const d = (dp === undefined) ? (Math.abs(n % 1) > 0.001 ? 2 : 0) : dp;
  return n.toLocaleString('en-PK', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtKg(v) { return fmtNum(round1(v), Math.abs(num(v) % 1) > 0.001 ? 1 : 0) + ' kg'; }
function fmtPcs(v) { return fmtNum(v, 0) + ' pcs'; }
function fmtMoney(v, noSym) {
  const n = round2(v);
  const s = Math.abs(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '-' : '') + (noSym ? '' : 'Rs. ') + s;
}
function fmtMoneyShort(v) {
  const n = num(v);
  if (Math.abs(n) >= 10000000) return 'Rs. ' + (n / 10000000).toFixed(2) + ' Cr';
  if (Math.abs(n) >= 100000) return 'Rs. ' + (n / 100000).toFixed(2) + ' Lac';
  return fmtMoney(n);
}

/* ---------------- DATES ---------------- */
function todayISO() { return isoDay(new Date()); }
function isoDay(d) {
  const x = (d instanceof Date) ? d : new Date(d);
  if (isNaN(x)) return '';
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return x.getFullYear() + '-' + m + '-' + day;
}
function monthKey(d) { const s = (typeof d === 'string' ? d : isoDay(d)); return (s || '').slice(0, 7); }
function monthStart(ym) { return (ym || monthKey(todayISO())) + '-01'; }
function monthEnd(ym) {
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  return isoDay(new Date(y, m, 0));
}
function monthLabel(ym) {
  const L = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!ym) return '';
  return (L[+ym.slice(5, 7)] || '') + ' ' + ym.slice(0, 4);
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(iso) {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10).split('-');
  if (s.length !== 3) return iso;
  return s[2] + '-' + (MONTH_NAMES[+s[1] - 1] || s[1]).slice(0, 3) + '-' + s[0];
}
function fmtDateLong(iso) {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10).split('-');
  if (s.length !== 3) return iso;
  return (+s[2]) + ' ' + (MONTH_NAMES[+s[1] - 1] || s[1]) + ' ' + s[0];
}
function addDays(iso, n) {
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
function daysBetween(a, b) {
  const d1 = new Date(String(a).slice(0, 10) + 'T00:00:00');
  const d2 = new Date(String(b).slice(0, 10) + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}
function lastMonths(n) {
  const out = [], d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) { out.push(monthKey(isoDay(d))); d.setMonth(d.getMonth() - 1); }
  return out;
}

/* ---------------- STRINGS ---------------- */
function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}
function titleCase(s) { return String(s || '').replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()); }
function debounce(fn, ms) {
  let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 250); };
}

/* Amount in words — Pakistani invoice style */
function amountInWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function two(n) { return n < 20 ? ones[n] : (tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')); }
  function three(n) { return (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n)); }
  let n = Math.floor(Math.abs(num(amount)));
  const paisa = Math.round((Math.abs(num(amount)) - n) * 100);
  if (n === 0 && !paisa) return 'Rupees Zero Only';
  let out = '';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lac = Math.floor(n / 100000); n %= 100000;
  const thou = Math.floor(n / 1000); n %= 1000;
  if (crore) out += three(crore) + ' Crore ';
  if (lac) out += three(lac) + ' Lac ';
  if (thou) out += three(thou) + ' Thousand ';
  if (n) out += three(n);
  out = out.trim();
  if (paisa) out += ' and ' + two(paisa) + ' Paisa';
  return 'Rupees ' + out + ' Only';
}

/* ---------------- TOAST ---------------- */
function toast(msg, type, ms) {
  let box = $('#toast-container');
  if (!box) { box = document.createElement('div'); box.id = 'toast-container'; document.body.appendChild(box); }
  const icons = { success: '✅', error: '⛔', warn: '⚠️', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'info');
  t.innerHTML = '<span class="t-ico">' + (icons[type] || icons.info) + '</span><span>' + esc(msg) + '</span>';
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 2800);
}

/* ---------------- MODAL ---------------- */
function openModal(opts) {
  const o = opts || {};
  let root = $('#modal-root');
  if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="modal ${o.size ? 'modal-' + o.size : ''}">
      <div class="modal-head">
        <h3>${esc(o.title || '')}</h3>
        <button class="icon-btn" data-close="1" title="Close">✕</button>
      </div>
      <div class="modal-body">${o.body || ''}</div>
      ${o.footer === null ? '' : `<div class="modal-foot">${o.footer !== undefined ? o.footer : '<button class="btn btn-ghost" data-close="1">Close</button>'}</div>`}
    </div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(wrap); });
  if (o.onMount) o.onMount(wrap);
  return wrap;
}
function closeModal(w) {
  const wrap = w || $('#modal-root .modal-wrap:last-child');
  if (!wrap) return;
  wrap.classList.remove('show');
  setTimeout(() => wrap.remove(), 200);
}
function closeAllModals() { $$('#modal-root .modal-wrap').forEach(w => w.remove()); }
function confirmDialog(message, opts) {
  const o = opts || {};
  return new Promise(resolve => {
    const w = openModal({
      title: o.title || 'Confirm',
      size: 'sm',
      body: `<p style="margin:6px 0 0;line-height:1.6">${esc(message)}</p>`,
      footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
               <button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" id="cfmYes">${esc(o.yes || 'Yes, continue')}</button>`
    });
    $('#cfmYes', w).onclick = () => { closeModal(w); resolve(true); };
    w.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => setTimeout(() => resolve(false), 10)));
  });
}

/* ---------------- PERIOD (Today / Month / Custom) ---------------- */
const Period = {
  range: 'month',          // today | month | custom | all
  month: monthKey(todayISO()),
  from: monthStart(monthKey(todayISO())),
  to: todayISO(),
  match(dateStr) {
    const d = String(dateStr || '').slice(0, 10);
    if (!d) return false;
    if (this.range === 'all') return true;
    if (this.range === 'today') return d === todayISO();
    if (this.range === 'custom') return d >= (this.from || '0000-01-01') && d <= (this.to || '9999-12-31');
    return d.slice(0, 7) === this.month;
  },
  label() {
    if (this.range === 'today') return 'Today (' + fmtDate(todayISO()) + ')';
    if (this.range === 'all') return 'All Time';
    if (this.range === 'custom') return fmtDate(this.from) + ' → ' + fmtDate(this.to);
    return monthLabel(this.month);
  },
  shortLabel() {
    if (this.range === 'today') return 'Today';
    if (this.range === 'all') return 'All Time';
    if (this.range === 'custom') return 'Custom';
    return monthLabel(this.month);
  },
  bar(idPrefix) {
    const p = idPrefix || 'period';
    const months = lastMonths(18);
    return `<div class="period-bar">
      <div class="seg">
        <button class="seg-btn ${this.range === 'today' ? 'on' : ''}" data-prange="today">📆 Today</button>
        <button class="seg-btn ${this.range === 'month' ? 'on' : ''}" data-prange="month">🗓️ This Month</button>
        <button class="seg-btn ${this.range === 'custom' ? 'on' : ''}" data-prange="custom">🎯 Custom Date</button>
        <button class="seg-btn ${this.range === 'all' ? 'on' : ''}" data-prange="all">♾️ All Time</button>
      </div>
      ${this.range === 'month' ? `<select class="inp inp-sm" data-pmonth>
          ${months.map(m => `<option value="${m}" ${this.month === m ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}
        </select>` : ''}
      ${this.range === 'custom' ? `<span class="pb-lbl">From</span>
          <input type="date" class="inp inp-sm" data-pfrom value="${this.from || ''}"/>
          <span class="pb-lbl">To</span>
          <input type="date" class="inp inp-sm" data-pto value="${this.to || ''}"/>` : ''}
      <span class="pb-lbl" style="margin-left:auto">${esc(this.label())}</span>
    </div>`;
  },
  bind(container, onChange) {
    const root = container || document;
    $$('[data-prange]', root).forEach(b => b.onclick = () => {
      this.range = b.dataset.prange;
      if (this.range === 'custom') {
        if (!this.from) this.from = monthStart(this.month);
        if (!this.to) this.to = todayISO();
      }
      onChange && onChange();
    });
    const ms = $('[data-pmonth]', root); if (ms) ms.onchange = e => { this.month = e.target.value; this.range = 'month'; onChange && onChange(); };
    const ff = $('[data-pfrom]', root); if (ff) ff.onchange = e => { this.from = e.target.value; this.range = 'custom'; onChange && onChange(); };
    const ft = $('[data-pto]', root); if (ft) ft.onchange = e => { this.to = e.target.value; this.range = 'custom'; onChange && onChange(); };
  }
};

/* ---------------- TABLE HELPERS ---------------- */
function sortRows(rows, keyFn, dir) {
  const d = dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const x = keyFn(a), y = keyFn(b);
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * d;
    return String(x).localeCompare(String(y)) * d;
  });
}
function emptyRow(colspan, msg, icon) {
  return `<tr><td colspan="${colspan}"><div class="empty"><div class="empty-ico">${icon || '📭'}</div><div>${esc(msg || 'No records found')}</div></div></td></tr>`;
}

/* ---------------- EXPORT / BACKUP ---------------- */
function downloadFile(filename, content, mime) {
  const blob = (content instanceof Blob) ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function toCSV(headers, rows) {
  const q = v => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
  return [headers.map(q).join(',')].concat(rows.map(r => r.map(q).join(','))).join('\r\n');
}
function exportCSV(filename, headers, rows) {
  downloadFile(filename, '\uFEFF' + toCSV(headers, rows), 'text/csv;charset=utf-8');
  toast('CSV exported: ' + filename, 'success');
}

/* ---------------- PRINT ENGINE ---------------- */
/** Paper profile — Settings se aata hai (thermal80 default) */
function paperProfile() {
  const s = (typeof DB !== 'undefined' && DB.settings) ? DB.settings() : {};
  return {
    paper: s.slipPaper || 'thermal80',
    logoOnSlip: s.slipLogo !== false,
    logoH: Math.max(20, Math.min(64, num(s.slipLogoHeight) || 40)),
    showPhone: s.slipPhone !== false,
    showAddress: s.slipAddress !== false
  };
}

function printStyles(size, extra) {
  const base = `
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#000;margin:0;padding:0;background:#fff}
    h1,h2,h3,h4,p{margin:0}
    table{width:100%;border-collapse:collapse}
    .pr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px}
    .pr-head img{max-height:74px;max-width:150px;object-fit:contain}
    .pr-logo-block{display:flex;flex-direction:column;align-items:center;gap:7px}
    .pr-logo-block img{display:block;margin:0 auto}
    .pr-cust{font-size:14px;font-weight:800;line-height:1.35;letter-spacing:.2px}
    .pr-shop{font-size:19px;font-weight:800}
    .pr-sub{font-size:11px;color:#000;line-height:1.5}
    .pr-title{text-align:center;font-size:15px;font-weight:800;letter-spacing:1.5px;margin:6px 0 10px;background:#000;color:#fff;padding:6px;border-radius:4px}
    .pr-meta{display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-bottom:10px}
    .pr-meta div{line-height:1.7}
    .pr-block{border:1px solid #000;border-radius:5px;padding:8px 10px;font-size:12px;background:#fff}
    table.pr-tbl{font-size:12px;border:1px solid #000}
    table.pr-tbl th{background:#eee;border:1px solid #000;padding:6px;text-align:left;font-size:11px;text-transform:uppercase}
    table.pr-tbl td{border:1px solid #000;padding:6px;vertical-align:top}
    .r{text-align:right}.c{text-align:center}
    .pr-tot{width:100%;margin-top:8px;font-size:12px}
    .pr-tot td{padding:5px 8px;border-bottom:1px solid #ddd}
    .pr-tot tr.grand td{border-top:2px solid #000;border-bottom:2px double #000;font-size:14px;font-weight:800}
    .words{font-size:11px;font-style:italic;margin-top:8px;border:1px dashed #000;padding:6px}
    .pr-foot{margin-top:14px;display:flex;justify-content:space-between;font-size:11px;gap:20px}
    .sign{border-top:1px solid #000;width:180px;text-align:center;padding-top:4px;margin-top:34px}
    .small{font-size:10.5px;color:#000;line-height:1.5}
    .badge-pr{display:inline-block;border:1.5px solid #000;border-radius:3px;padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:.5px}
    .pr-page{padding:0}
    .tk{display:flex;justify-content:space-between;gap:8px}
    .tk-b{font-weight:800}
  `;

  const mm = (size === 'thermal58') ? '58mm' : '80mm';
  const w = (size === 'thermal58') ? '44mm' : '70mm';
  const is58 = (size === 'thermal58');

  let sizing = '';
  if (size === 'thermal' || size === 'thermal80' || size === 'thermal58') {
    sizing = `
      /* Black-copper thermal: sirf black / white, koi gray fill nahi */
      @page{size:${mm} auto;margin:2mm}
      html,body{background:#fff}
      body{width:${w};margin:0 auto;padding:0;font-size:10.5px;line-height:1.3;
           -webkit-print-color-adjust:exact;print-color-adjust:exact}
      .pr-page{padding:0 1mm}
      /* HEADER — logo + brand, compact (koi faaltu space nahi) */
      .pr-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;
               border-bottom:1.5px solid #000;padding:0 0 2mm;margin:0 0 2mm}
      .pr-head img{max-height:${is58 ? '9mm' : '13mm'};max-width:100%;margin:0 auto;display:block;
                   filter:grayscale(1) contrast(2.2)}
      .pr-logo-block{gap:2px}
      .pr-shop{font-size:${is58 ? '12px' : '14px'};font-weight:800;letter-spacing:.2px;line-height:1.15}
      .pr-sub{font-size:${is58 ? '8.5px' : '9.5px'};line-height:1.3}
      .badge-pr{border:1.2px solid #000;padding:1px 6px;font-size:${is58 ? '7.5px' : '8.5px'};font-weight:800;letter-spacing:.4px;border-radius:2px}
      /* TITLE — solid black bar, white text (thermal par sab se saaf) */
      .pr-title{background:#000!important;color:#fff!important;font-size:${is58 ? '10px' : '11px'};
                font-weight:800;letter-spacing:.6px;padding:3px 2px;border-radius:0;margin:0 0 2mm;text-align:center}
      /* META — customer name bold 14px */
      .pr-meta{display:block;font-size:${is58 ? '9px' : '10px'};margin:0 0 1.5mm}
      .pr-meta > div{line-height:1.35;margin-bottom:1mm}
      .pr-cust{font-size:14px!important;font-weight:800!important;line-height:1.2;margin-bottom:.5mm}
      /* TABLE — extra borders nahi, sirf zaroori lines */
      table.pr-tbl{font-size:${is58 ? '9px' : '10px'};border:0;border-top:1.2px solid #000;border-bottom:1.2px solid #000;margin-bottom:1.5mm}
      table.pr-tbl th{background:#fff;color:#000;border:0;border-bottom:1.2px solid #000;padding:1.2mm .5mm;
                      font-size:${is58 ? '7.5px' : '8.5px'};font-weight:800;text-transform:uppercase;letter-spacing:.2px}
      table.pr-tbl td{border:0;border-bottom:.4px dotted #000;padding:1.2mm .5mm;line-height:1.25}
      table.pr-tbl tr:last-child td{border-bottom:0}
      table.pr-tbl .small{font-size:${is58 ? '7.5px' : '8.5px'};line-height:1.2}
      /* TOTALS */
      .pr-tot{font-size:${is58 ? '10px' : '11px'};margin-top:0}
      .pr-tot td{padding:1mm .5mm;border-bottom:.4px dotted #888}
      .pr-tot tr.grand td{border-top:1.2px solid #000;border-bottom:1.2px solid #000;
                          font-size:${is58 ? '12px' : '13.5px'};font-weight:800}
      .words{font-size:${is58 ? '8px' : '9px'};padding:1.5mm;margin-top:1.5mm;border:.6px dashed #000;font-style:normal}
      /* FOOTER — signature + printed time, kam jagah */
      .pr-foot{display:block;margin-top:4mm;font-size:${is58 ? '7.5px' : '8.5px'};text-align:center}
      .sign{margin:7mm auto 0;width:${is58 ? '38mm' : '52mm'};border-top:1px solid #000;padding-top:1mm;font-size:inherit}
      .small{font-size:${is58 ? '8px' : '9px'};line-height:1.3}
      .noprint{display:none!important}
      body > *:last-child{margin-bottom:0}
      .tk{margin-bottom:.5mm}
    `;
  } else if (size === 'a5') {
    sizing = '@page{size:A5;margin:9mm}body{font-size:11px}.pr-page{padding:0}';
  } else {
    sizing = '@page{size:A4;margin:11mm}body{font-size:12px}.pr-page{padding:0}';
  }
  return '<style>' + base + sizing + (extra || '') + '</style>';
}

/* Thermal par lambe titles chhote karein (paper bachta hai) */
function shortDocTitle(t, size) {
  const s = String(t || '');
  if (size !== 'thermal' && size !== 'thermal80' && size !== 'thermal58') return s;
  return s.replace('WASH RECEIVING SLIP (SALE SLIP)', 'SALE SLIP')
    .replace('WASH INVOICE (PER KG)', 'WASH BILL')
    .replace('CONSOLIDATED WASH INVOICE (PER KG)', 'WEEKLY WASH BILL')
    .replace('DELIVERY / GATE PASS', 'DELIVERY SLIP')
    .replace('ACCOUNT STATEMENT', 'STATEMENT');
}

/** Hidden iframe mein print document likhta hai aur print dialog kholta hai. */
function printHTML(title, bodyHtml, opts) {
  const o = opts || {};
  const prev = $('#print-frame');
  if (prev) prev.remove();
  const frame = document.createElement('iframe');
  frame.id = 'print-frame';
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  const baseHref = (function () {
    try { return new URL('.', location.href).href; } catch (e) { return ''; }
  })();
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title || 'Print') + '</title>' +
    (baseHref ? '<base href="' + esc(baseHref) + '"/>' : '') +
    printStyles(o.size, o.extraCss) + '</head><body>' + (o.wrap === false ? bodyHtml : '<div class="pr-page">' + bodyHtml + '</div>') +
    '<scr' + 'ipt>setTimeout(function(){try{window.focus();window.print();}catch(e){}},250);<\/scr' + 'ipt></body></html>');
  doc.close();
  return frame;
}

/** Kaun sa logo kis document par — thermal = black-only mono logo */
function logoPath(forThermal) {
  const s = (typeof DB !== 'undefined' && DB.settings) ? DB.settings() : {};
  if (forThermal) {
    if (s.logoMono === false) return s.logoImage || 'assets/img/logo.jpeg';
    return s.logoMonoImage || 'assets/img/logo-thermal.png';
  }
  return s.logoColorImage || s.logoImage || 'assets/img/logo.jpeg';
}

function absUrl(p) {
  const v = String(p || '');
  if (!v) return '';
  if (/^(data:|https?:|\/\/)/i.test(v)) return v;
  try { return new URL(v, location.href).href; } catch (e) { return v; }
}

/** A4 / invoice header (tables aur statements ke liye) */
function printHeader(settings, docKind, extraLeft) {
  const s = settings || {};
  const logo = absUrl(logoPath(false));
  return '<div class="pr-head">' +
    '<div class="pr-logo-block">' +
      '<img src="' + esc(logo) + '" alt="logo"/>' +
      (docKind ? '<div class="badge-pr">' + esc(docKind) + '</div>' : '') +
    '</div>' +
    '<div>' +
      '<div class="pr-shop">' + esc(s.shopName || 'Mr Laundry Factory') + '</div>' +
      '<div class="pr-sub">' + esc(s.tagline || '') +
        (s.phone ? '<br>Tel: ' + esc(s.phone) : '') +
        (s.address ? '<br>' + esc(s.address) : '') +
        (s.ntn ? '<br>NTN: ' + esc(s.ntn) : '') +
        (extraLeft || '') +
      '</div>' +
    '</div>' +
  '</div>';
}

/** Thermal slip / receipt / delivery slip ke liye compact header */
function printSlipHeader(settings, docKind) {
  const s = settings || {};
  const p = paperProfile();
  const logo = absUrl(logoPath(true));
  return '<div class="pr-head">' +
    (p.logoOnSlip
      ? '<div class="pr-logo-block"><img src="' + esc(logo) + '" alt="logo" style="max-height:' + p.logoH + 'px"/></div>'
      : '') +
    '<div>' +
      '<div class="pr-shop">' + esc(s.shopName || 'Mr Laundry Factory') + '</div>' +
      (s.tagline ? '<div class="pr-sub">' + esc(s.tagline) + '</div>' : '') +
      (p.showPhone && s.phone ? '<div class="pr-sub">Tel: ' + esc(s.phone) + '</div>' : '') +
      (p.showAddress && s.address ? '<div class="pr-sub">' + esc(s.address) + '</div>' : '') +
      (docKind ? '<div style="margin-top:1mm"><span class="badge-pr">' + esc(docKind) + '</span></div>' : '') +
    '</div>' +
  '</div>';
}

/* ---------- TEST PRINTS (printer setting check karne ke liye) ---------- */
function printTestSlip() {
  const shop = DB.settings();
  const p = paperProfile();
  const paper = p.paper || 'thermal80';
  const rate = num(shop.ratePerKg) || 320;
  const rows = [
    { i: 1, name: 'BEDSHEET WASH', kg: 12.5 },
    { i: 2, name: 'SHOES / SNEAKERS', kg: 6 },
    { i: 3, name: 'TOWEL DRY CLEAN', kg: 4.5 }
  ];
  const totalKg = round1(rows.reduce((a, r) => a + r.kg, 0));
  const body = `
    ${printSlipHeader(shop, 'TEST PRINT')}
    <div class="pr-title">SALE SLIP (TEST)</div>
    <div class="pr-meta">
      <div class="pr-cust">TEST CUSTOMER (SAMPLE)</div>
      <div class="small">0300-0000000</div>
      <div class="tk"><span>Slip No:</span><b class="tk-b">INV-TEST</b></div>
      <div class="tk"><span>Invoice Date:</span><b class="tk-b">${fmtDate(todayISO())}</b></div>
      <div class="tk"><span>Delivery Date:</span><b class="tk-b">____________</b></div>
    </div>
    <table class="pr-tbl">
      <thead><tr><th style="width:12%">#</th><th>ITEM</th><th class="r" style="width:28%">KG</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.i}</td><td>${r.name}</td>
        <td class="r">${fmtNum(r.kg, 1)}</td></tr>`).join('')}</tbody>
    </table>
    <table class="pr-tot">
      <tr class="grand"><td>TOTAL RECEIVED</td><td class="r">${fmtKg(totalKg)}</td></tr>
    </table>
    <div class="pr-foot">
      <div class="small">Yeh TEST print hai (printer setting check). Rate: ${fmtMoney(rate)}/kg</div>
      <div class="sign">Customer Signature</div>
    </div>`;
  printHTML('Test Print — Sale Slip', body, { size: paper });
  toast('Test slip bheji gayi — print dialog mein thermal printer select karein', 'info', 4200);
}

function printTestInvoice() {
  const shop = DB.settings();
  const rate = num(shop.ratePerKg) || 320;
  const body = `
    ${printHeader(shop, 'TEST PRINT')}
    <div class="pr-title">WASH INVOICE (TEST — A4)</div>
    <div class="pr-meta">
      <div><b>Bill To:</b><div class="pr-cust">TEST CUSTOMER (SAMPLE)</div>0300-0000000<br>Karachi</div>
      <div style="text-align:right">Invoice No: <b>INV-TEST</b><br>Invoice Date: <b>${fmtDate(todayISO())}</b><br>Rate: <b>${fmtMoney(rate)} / KG</b></div>
    </div>
    <table class="pr-tbl">
      <thead><tr><th style="width:26px">#</th><th>DESCRIPTION</th><th class="c">CATEGORY</th><th class="r">QTY (KG)</th><th class="r">RATE</th><th class="r">AMOUNT</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>BEDSHEET WASH</td><td class="c">A</td><td class="r">12.5</td><td class="r">${fmtNum(rate)}</td><td class="r">${fmtNum(round2(12.5 * rate))}</td></tr>
        <tr><td>2</td><td>SHOES / SNEAKERS</td><td class="c">A</td><td class="r">6</td><td class="r">${fmtNum(rate)}</td><td class="r">${fmtNum(round2(6 * rate))}</td></tr>
      </tbody>
    </table>
    <table class="pr-tot">
      <tr><td>Total Weight</td><td class="r"><b>18.5 kg</b></td></tr>
      <tr><td>Wash Charges @ ${fmtMoney(rate)} / KG</td><td class="r">${fmtMoney(round2(18.5 * rate))}</td></tr>
      <tr class="grand"><td>TOTAL PAYABLE</td><td class="r">${fmtMoney(round2(18.5 * rate))}</td></tr>
      <tr class="grand"><td>BALANCE DUE</td><td class="r">${fmtMoney(round2(18.5 * rate))}</td></tr>
    </table>
    <div class="words">Amount in words: <b>${esc(amountInWords(round2(18.5 * rate)))}</b></div>
    <div class="pr-foot"><div class="small">Yeh TEST invoice hai.</div><div class="sign">Authorised Signature</div></div>`;
  printHTML('Test Print — Invoice', body, { size: 'a4' });
  toast('Test invoice bheji gayi (A4)', 'info', 3600);
}

/** Slip/receipt/delivery ke liye kaun sa paper profile use karna hai */
function printSizeFor(kind, fallback) {
  if (kind === 'slip' || kind === 'receipt' || kind === 'delivery') {
    const p = paperProfile();
    return p.paper || fallback || 'thermal80';
  }
  return fallback || 'a4';
}

/* ============================================================
   PER KG RATE — quick edit form (Products / New Sales / Dashboard
   / Settings — sab jagah se yahi form khulta hai)
   ============================================================ */
function openRateForm(opts) {
  const s = DB.settings();
  const cur = num(s.ratePerKg);
  const quick = [100, 120, 150, 175, 200, 225, 250, 300, 350, 400];

  const body = `
    <div class="note-box info tiny mb10">
      Yeh rate <b>sab categories (A / B / C)</b> aur sab customers par lagta hai.
      Naye entries isi rate se banenge — <b>purane bill apne purane rate par hi rahenge</b>.
    </div>
    <label class="fld"><span>Rate per KG (Rs) <b class="req">*</b></span>
      <input type="number" step="1" min="1" class="inp" id="rtRate" value="${cur}" style="font-size:22px;font-weight:850;text-align:center"/>
    </label>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:-4px">
      ${quick.map(v => `<button class="btn btn-ghost btn-xs" data-rq="${v}">Rs. ${v}</button>`).join('')}
    </div>
    <div class="grid g2 mt14" style="gap:10px">
      <div class="note-box tiny"><b>Abhi ka rate</b><div class="big">${fmtMoney(cur)} / KG</div></div>
      <div class="note-box ok tiny"><b>Naya rate</b><div class="big" id="rtNew">${fmtMoney(cur)} / KG</div>
        <span class="tiny" id="rtEg">100 KG = ${fmtMoney(round2(cur * 100))}</span></div>
    </div>`;

  const w = openModal({
    title: '⚖️ Per KG Rate Edit', size: 'sm', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-primary" id="rtSave">💾 Save Rate</button>`
  });

  const inp = $('#rtRate', w);
  if (!inp) return w;   // safety: kuch ghalat ho to crash na ho
  const upd = () => {
    const v = num(inp.value);
    $('#rtNew', w).textContent = fmtMoney(v) + ' / KG';
    $('#rtEg', w).textContent = '100 KG = ' + fmtMoney(round2(v * 100)) + ' · 240 KG = ' + fmtMoney(round2(v * 240));
  };
  inp.oninput = upd;
  $$('[data-rq]', w).forEach(b => b.onclick = () => { inp.value = b.dataset.rq; upd(); });
  setTimeout(() => { inp.focus(); inp.select(); }, 120);

  $('#rtSave', w).onclick = () => {
    const v = num(inp.value);
    if (v <= 0) return toast('Rate 0 se bara likhein', 'error');
    DB.saveSettings({ ratePerKg: v });
    DB.audit('settings', 'Per KG rate change: ' + fmtMoney(cur) + ' to ' + fmtMoney(v));
    toast('Rate update ho gaya - ab naye entries ' + fmtMoney(v) + ' / KG par banenge', 'success', 4200);
    closeModal(w);
    refreshCurrent();
  };
  return w;
}
