/* ============================================================
   NEW SALES — Wash Entry (per KG)
   ------------------------------------------------------------
   Step 01 : Invoice date (aaj) — delivery date tab set hogi
             jab maal wapis deliver hoga.
   Step 02 : ITEMS + kitne KG (per KG billing, category/pcs nahi)
             (product list se click karke select).
   Slip    : Sale slip par amount nahi hota (sirf KG / items).
   Invoice : Custom invoice print — rate, kg, total, paid, due.
   ============================================================ */

const NS = {
  customerId: '',
  entryDate: todayISO(),
  expected: '',
  branchId: '',
  lines: [],
  note: '',
  paymentMode: 'Credit',
  advance: '',
  tab: 'A',
  rate: ''   // is bill ka rate (khali = default rate)
};

function renderNewSales(param) {
  const p = param || {};
  const s = DB.settings();
  NS.branchId = NS.branchId || ((DB.all('branches')[0] || {}).id || '');
  if (p.customer) NS.customerId = p.customer;
  if (p.reorder) nsLoadFromSale(p.reorder);

  UI.renderLayout('newsales', `<div id="nsBody"></div>`, {
    title: '➕ New Sales — Wash Entry',
    subtitle: 'Daily clients se kapre receive karein — items select karein aur KG likhein'
  });
  nsPaint();
}

function nsLoadFromSale(saleId) {
  const s = DB.get('sales', saleId);
  if (!s) return;
  NS.customerId = s.customerId;
  NS.lines = (s.lines || []).map(l => ({ id: uid('ln'), productId: l.productId, category: l.category, type: l.type || '', kg: round1(l.qtyKg), pcs: num(l.pcs), note: l.note || '' }));
}

function nsPaint() {
  const el = $('#nsBody');
  if (!el) return;
  const cats = Biz.categories();
  const products = DB.all('products').filter(p => p.active !== false);
  const rate = num(NS.rate) || Biz.rate();   // is bill ka rate (purane bill ke liye badla ja sakta hai)
  const totalKg = round1(NS.lines.reduce((a, l) => a + num(l.kg), 0));
  const amount = round2(totalKg * rate);
  const cust = NS.customerId ? Biz.customerAccount(NS.customerId) : null;

  /* -------- header: customer + dates -------- */
  const head = `
    <div class="card mb14">
      <div class="card-body">
        <div class="grid g2">
          <div>
            <label class="fld mb0"><span>Customer / Vendor <b class="req">*</b></span>${UI.customerPicker('nsCust', NS.customerId)}</label>
            <div class="fld-hint">Naya client? ➕ button se turant add karein.</div>
            ${cust ? `<div class="note-box ${cust.balance > 0 ? 'bad' : 'ok'} tiny" style="margin-top:8px">
              Purana Balance: <b>${fmtMoney(cust.balance)}</b> (${fmtKg(cust.kgBalance)}) ·
              ${cust.advance > 0 ? 'Advance: <b>' + fmtMoney(cust.advance) + '</b> · ' : ''}
              Total received till date: <b>${fmtKg(cust.kgTotal)}</b>
            </div>` : ''}
          </div>
          <div>
            <div class="grid g2" style="gap:10px">
              <label class="fld mb0"><span>Invoice Date</span>
                <input type="date" class="inp" id="nsEntryDate" value="${esc(NS.entryDate)}"/></label>
              <label class="fld mb0"><span>Expected Delivery</span>
                <input type="date" class="inp" id="nsExpected" value="${esc(NS.expected)}"/></label>
            </div>
            <label class="fld" style="margin-top:10px"><span>Branch</span>
              <select class="inp" id="nsBranch">${DB.all('branches').map(b =>
    `<option value="${b.id}" ${b.id === NS.branchId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
            <div class="note-box info tiny">
              <b>Delivery Date (baad mein):</b> Jab maal wapis deliver ho, us waqt <b>Delivery Date</b> khud set ho jayegi
              (Sales tab → Deliver). Tab tak yeh slip “In Factory” rahegi.
            </div>
          </div>
        </div>
      </div>
    </div>`;

  /* -------- Step 02: items + KG (category / pieces nahi) -------- */
  const tabBar = `
    <div class="row mb10" style="gap:6px">
      <span class="small dim"><b>ITEMS</b> — product par click karein (multiple select kar sakte hain)</span>
      <div class="sp flex1"></div>
      <button class="btn btn-ghost btn-sm" id="nsNewItem">➕ New Item in Product List</button>
    </div>`;

  const selected = nsSelectedItems();

  const catPanel = `
    <div class="cat-card on" style="--cat-color:#4f7cff">
      <div class="cat-card-head">
        <span class="cat-name">🧺 Wash Items</span>
        <span class="tag" style="cursor:pointer" id="nsCatRate" title="Rate edit karein">${fmtMoney(rate)} / kg ✏️</span>
      </div>
      <div class="cat-items">
        ${products.length ? products.map(p => `<button class="item-chip ${selected.indexOf(p.id) >= 0 ? 'on' : ''}" data-nsitem="${p.id}">
            ${esc(p.name)}</button>`).join('')
      : '<span class="tiny muted">Koi item nahi — “➕ New Item” se add karein.</span>'}
      </div>
      <div class="grid g2 mt14" style="gap:10px;align-items:end">
        <label class="fld mb0"><span>Kitne KG? <b class="req">*</b></span>
          <div class="cat-kg-input"><input type="number" step="0.1" min="0" class="inp" id="nsKg" placeholder="0.0"/><span class="cat-unit">KG</span></div>
        </label>
        <button class="btn btn-primary btn-block" id="nsAdd" style="height:44px">➕ Add to Slip (Enter)</button>
      </div>
      <div class="fld-hint">Koi item select na karein to KG “Wash” ke naam par slip mein chali jayegi.</div>
    </div>`;

  /* -------- lines table -------- */
  const linesTable = `
    <div class="card">
      <div class="card-head"><h3>🧾 Slip Items (${NS.lines.length})</h3><div class="sp"></div>
        ${NS.lines.length ? `<button class="btn btn-ghost btn-sm" id="nsClearLines">🗑️ Sab clear</button>` : ''}</div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:560px">
          <thead><tr>
            <th>Item</th><th class="t-right">KG</th><th>Note</th><th class="t-right">Amount</th><th></th>
          </tr></thead>
          <tbody>
            ${NS.lines.length ? NS.lines.map((l, i) => {
    const p = Biz.product(l.productId);
    return `<tr>
                <td class="t-strong">${esc(Biz.lineName(l))}</td>
                <td class="t-right"><input type="number" step="0.1" min="0" class="inp inp-xs t-right" style="width:84px"
                     value="${l.kg}" data-linekg="${l.id}"/> kg</td>
                <td><input class="inp inp-xs" value="${esc(l.note || '')}" placeholder="—" data-linenote="${l.id}"/></td>
                <td class="t-right t-mono">${fmtNum(round2(num(l.kg) * rate))}</td>
                <td><button class="icon-btn" style="width:30px;height:30px;font-size:12px" data-linedel="${l.id}">✕</button></td>
              </tr>`;
  }).join('') : emptyRow(5, 'Abhi koi item add nahi hua — item select karke KG enter karein aur “Add to Slip” dabayein', '🧺')}
          </tbody>
          ${NS.lines.length ? `<tfoot><tr>
            <td>TOTAL</td><td class="t-right">${fmtKg(totalKg)}</td>
            <td></td><td class="t-right">${fmtMoney(amount)}</td><td></td></tr></tfoot>` : ''}
        </table>
      </div>
    </div>`;

  /* -------- total bar -------- */
  const totalBar = `
    <div class="kg-total-bar mb14">
      <div class="kt-item"><div class="kt-lbl">Total Clothes Received</div><div class="kt-val">${fmtKg(totalKg)}</div></div>
      <div class="kt-sep"></div>
      <div class="kt-item"><div class="kt-lbl">Items</div><div class="kt-val">${fmtNum(NS.lines.length)}</div></div>
      <div class="kt-sep"></div>
      <div class="kt-item"><div class="kt-lbl">Rate / KG</div><div class="kt-val">${fmtMoney(rate)}</div></div>
      <div class="kt-sep"></div>
      <div class="kt-item"><div class="kt-lbl">Tentative Amount (internal)</div><div class="kt-val">${fmtMoney(amount)}</div></div>
    </div>`;

  /* -------- Step 03: item types / KG breakup -------- */
  const step3 = nsStep3HTML();

  /* -------- summary panel -------- */
  const summary = `
    <div class="card sum-panel">
      <div class="card-head"><h3>📋 Slip Summary</h3></div>
      <div class="card-body">
        <div class="kv"><span>Invoice No.</span><b>${DB.countersPreview('invoice')}</b></div>
        <div class="kv"><span>Customer</span><b>${esc(NS.customerId ? Biz.customerName(NS.customerId) : '—')}</b></div>
        <div class="kv"><span>Invoice Date</span><b>${fmtDate(NS.entryDate)}</b></div>
        <div class="kv"><span>Delivery Date</span><b class="t-warn">Pending (baad mein)</b></div>
        <div class="kv"><span>Total KG</span><b>${fmtKg(totalKg)}</b></div>
        <div class="kv"><span>Is bill ka Rate / kg</span>
          <span class="row" style="gap:6px;justify-content:flex-end">
            <input type="number" step="1" min="1" class="inp inp-xs t-right" style="width:86px" id="nsRateInp" value="${num(rate)}"/>
            <span class="tiny muted" style="cursor:pointer;text-decoration:underline" id="nsRateEdit" title="Default rate (sab naye bills) change karein">default ✏️</span>
          </span></div>
        ${round2(num(rate)) !== round2(Biz.rate()) ? `<div class="fld-hint">⚠️ Is bill par purana rate <b>${fmtMoney(num(rate))}/kg</b> lagega (default ${fmtMoney(Biz.rate())}/kg). Save ke baad form wapis default par aa jayega.</div>` : ''}
        <div class="kv total"><span>Tentative Amount</span><b>${fmtMoney(amount)}</b></div>

        <div class="note-box warn tiny mt10">
          ⚠️ <b>Sale Slip par amount nahi aayegi.</b> Yeh slip sirf KG / items ka record hai.
          Amount wala <b>Custom Invoice</b> ledger se banega (payment ke waqt).
        </div>

        <div class="grid g2 mt14" style="gap:10px">
          <label class="fld mb0"><span>Payment at Entry (optional)</span>
            <input type="number" min="0" step="1" class="inp" id="nsAdvance" placeholder="0" value="${esc(NS.advance)}"/></label>
          <label class="fld mb0"><span>Mode</span>
            <select class="inp" id="nsMode">
              ${['Credit', 'Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque'].map(x => `<option ${NS.paymentMode === x ? 'selected' : ''}>${x}</option>`).join('')}
            </select></label>
        </div>
        <label class="fld"><span>Note</span>
          <textarea class="inp" id="nsNote" placeholder="e.g. 2 bedsheet, 5 kurte... (optional)">${esc(NS.note)}</textarea></label>

        <div class="grid g2" style="gap:8px">
          <button class="btn btn-primary btn-block" id="nsSaveSlip">🖨️ Save + Print Slip</button>
          <button class="btn btn-success btn-block" id="nsSaveInvoice">💵 Save + Custom Invoice</button>
        </div>
        <div class="grid g2 mt6" style="gap:8px">
          <button class="btn btn-ghost btn-block" id="nsSaveOnly">💾 Save Only</button>
          <button class="btn btn-ghost btn-block" id="nsReset">↺ Reset Form</button>
        </div>
      </div>
    </div>`;

  el.innerHTML = `
    ${head}
    <div class="grid g-2-1">
      <div>
        <div class="card mb14"><div class="card-body">
          <div class="row mb10"><h3 style="font-size:14.5px;font-weight:800">🧺 Step 02 — Items &amp; KG</h3></div>
          ${tabBar}
          ${catPanel}
        </div></div>
        ${totalBar}
        ${linesTable}
        ${step3}
      </div>
      <div>${summary}</div>
    </div>`;

  nsBind();
}

/* ============================================================
   STEP 03 — ITEM TYPES (jaise Shoes → Junior / Sports / Man / CH)
   Type ka naam cashier khud likh sakta hai; naya naam product par
   save ho jata hai, agli dafa khud aa jata hai.
   ============================================================ */
const NS_NONE = '__none__';
function nsKey(l) { return l.productId || NS_NONE; }
function nsProductName(pid) {
  if (pid === NS_NONE) return 'Wash (general)';
  const p = Biz.product(pid);
  if (p && p.name) return p.name;
  const l = NS.lines.find(x => nsKey(x) === pid);
  return (l && l.productName) || 'Item';
}
/** is item ke types: product par saved + slip mein use hue */
function nsTypes(pid) {
  const out = Biz.productTypes(pid).slice();
  NS.lines.forEach(l => { if (nsKey(l) === pid && l.type && out.indexOf(l.type) < 0) out.push(l.type); });
  return out.filter(Boolean);
}
function nsTypedLines(pid) { return NS.lines.filter(l => nsKey(l) === pid && !!l.type); }
function nsBaseLines(pid) { return NS.lines.filter(l => nsKey(l) === pid && !l.type); }
function nsBaseKgInSlip(pid) { return round1(nsBaseLines(pid).reduce((a, l) => a + num(l.kg), 0)); }
function nsTypeKgSum(pid) { return round1(nsTypedLines(pid).reduce((a, l) => a + num(l.kg), 0)); }
function nsSlipKg(pid) { return round1(nsBaseKgInSlip(pid) + nsTypeKgSum(pid)); }
/** Step 02 ka original KG (types mein baantne se pehle wala) */
function nsOrigKg(pid) {
  const rem = round1(num((NS._base || {})[pid]) || 0);
  return round1(Math.max(rem, nsSlipKg(pid)));
}
function nsLeftKg(pid) { return round1(Math.max(0, nsOrigKg(pid) - nsSlipKg(pid))); }
function nsSlipProductIds() {
  const ids = [];
  NS.lines.forEach(l => { const k = nsKey(l); if (ids.indexOf(k) < 0) ids.push(k); });
  return ids;
}
/** type ka naam product par save karein (customize — agli dafa khud aayega) */
function nsSaveTypeName(pid, name) {
  if (!name || pid === NS_NONE) return false;
  return Biz.saveProductType(pid, name);
}
/** pehla type banane se pehle item ka original (general) KG yaad rakhein */
function nsEnsureBaseStored(pid) {
  NS._base = NS._base || {};
  const base = nsBaseLines(pid);
  if (base.length) {
    const kg = round1(base.reduce((a, l) => a + num(l.kg), 0));
    NS._base[pid] = round1(num(NS._base[pid]) + kg);
    NS.lines = NS.lines.filter(l => !(nsKey(l) === pid && !l.type));
  }
}
/** ek type ki KG set karein (row = ek line) */
function nsSetTypeKg(pid, type, kg) {
  type = String(type || '').trim();
  if (!type) return toast('Type ka naam likhein', 'warn');
  if (kg > 0) nsEnsureBaseStored(pid);
  let ln = NS.lines.find(l => nsKey(l) === pid && l.type === type);
  const isNew = !ln;
  if (!ln) {
    const p = Biz.product(pid) || {};
    ln = { id: uid('ln'), productId: pid === NS_NONE ? null : pid, productName: nsProductName(pid), category: p.category || '', type, kg: 0, pcs: 0, note: '' };
    NS.lines.push(ln);
  }
  ln.kg = round1(Math.max(0, kg));
  if (!ln.kg) NS.lines = NS.lines.filter(l => l !== ln);      // KG khali → line hata dein
  const saved = nsSaveTypeName(pid, type);
  nsPaint();
  if (isNew && saved) toast('“' + type + '” ' + nsProductName(pid) + ' ke types mein save ho gaya ✔', 'success', 2200);
  else if (isNew) toast('“' + type + '” add ho gaya — KG ' + fmtKg(ln ? ln.kg : kg), 'success', 1800);
}
function nsRenameType(pid, oldT, newT) {
  newT = String(newT || '').trim();
  if (!newT) { nsPaint(); return; }
  if (newT === oldT) return;
  NS.lines.filter(l => nsKey(l) === pid && l.type === oldT).forEach(l => { l.type = newT; });
  const p = Biz.product(pid);
  if (p && Array.isArray(p.types)) {
    const list = p.types.filter(t => t !== oldT);
    if (list.indexOf(newT) < 0) list.push(newT);
    DB.upsert('products', Object.assign({}, p, { types: list }), { silent: true });
    DB.save();
  } else nsSaveTypeName(pid, newT);
  nsPaint();
  toast('Type ka naam badal kar “' + newT + '” kar diya', 'success', 1800);
}
function nsRestoreBase(pid) {
  const rem = round1(num((NS._base || {})[pid]) || 0);
  if (rem <= 0) return;
  const need = round1(rem - nsBaseKgInSlip(pid));
  if (need > 0.05) {
    const p = Biz.product(pid) || {};
    NS.lines.push({ id: uid('ln'), productId: pid === NS_NONE ? null : pid, productName: nsProductName(pid), category: p.category || '', type: '', kg: need, pcs: 0, note: '' });
  }
}
function nsDeleteType(pid, type) {
  NS.lines = NS.lines.filter(l => !(nsKey(l) === pid && l.type === type));
  if (!nsTypedLines(pid).length) nsRestoreBase(pid);      // saare types hat gaye → original KG wapis
  nsPaint();
  toast('“' + type + '” hata diya', 'info', 1600);
}
function nsAddLeftover(pid) {
  const left = nsLeftKg(pid);
  if (left <= 0) return toast('Koi baaki KG nahi — sab types mein baant di gayi hai ✔', 'info', 1800);
  const p = Biz.product(pid) || {};
  NS.lines.push({ id: uid('ln'), productId: pid === NS_NONE ? null : pid, productName: nsProductName(pid), category: p.category || '', type: '', kg: left, pcs: 0, note: '' });
  nsPaint();
  toast(fmtKg(left) + ' “' + nsProductName(pid) + '” (general) mein daal di gayi', 'success', 2200);
}

/** Step 03 ka poora panel */
function nsStep3HTML() {
  if (!NS.lines.length) return '';
  const blocks = nsSlipProductIds().map(pid => {
    const name = nsProductName(pid);
    const types = nsTypes(pid);
    const typed = nsTypedLines(pid);
    const typeKg = nsTypeKgSum(pid);
    const origKg = nsOrigKg(pid);
    const left = nsLeftKg(pid);
    const rowsHtml = types.length ? types.map(t => {
      const ln = typed.find(l => l.type === t);
      return `<div class="row mb6" style="gap:8px;align-items:center">
        <input class="inp inp-xs" style="flex:1;min-width:130px" value="${esc(t)}" data-tname="${esc(t)}" data-tp="${esc(pid)}" title="Naam badalne ke liye likhein — item ke sath save ho jayega"/>
        <input type="number" step="0.1" min="0" class="inp inp-xs t-right" style="width:96px" value="${ln ? ln.kg : ''}" placeholder="0.0" data-tkg="${esc(t)}" data-tp="${esc(pid)}"/>
        <span class="tiny muted" style="width:22px">kg</span>
        ${ln ? `<button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-tdel="${esc(t)}" data-tp="${esc(pid)}" title="Hata dein">✕</button>` : '<span style="width:28px"></span>'}
      </div>`;
    }).join('') : '<div class="tiny muted mb6">Abhi koi type nahi — neeche naya type likh kar KG daalein (jaise Junior Shoes).</div>';
    return `
      <div class="card card-flat mb10" data-tblock="${esc(pid)}">
        <div class="card-head" style="gap:8px;flex-wrap:wrap">
          <h3 style="font-size:13.5px">🧩 ${esc(name)}</h3>
          <div class="sp"></div>
          <span class="pill pill-info">Slip: ${fmtKg(nsSlipKg(pid))}</span>
          <span class="pill ${typeKg > 0 ? 'pill-ok' : 'pill-muted'}">Types: ${fmtKg(typeKg)}</span>
          ${left > 0.05 ? `<span class="pill pill-warn">Baaki: ${fmtKg(left)}</span>` : ''}
        </div>
        <div class="card-body" style="padding-top:8px">
          ${rowsHtml}
          <div class="row" style="gap:8px;align-items:center;margin-top:6px">
            <input class="inp inp-xs" style="flex:1;min-width:130px" id="nsNewTypeName_${esc(pid)}" placeholder="➕ Naya type ka naam (jaise Junior Shoes)"/>
            <input type="number" step="0.1" min="0" class="inp inp-xs t-right" style="width:96px" id="nsNewTypeKg_${esc(pid)}" placeholder="0.0"/>
            <span class="tiny muted" style="width:22px">kg</span>
            <button class="btn btn-ghost btn-xs" data-tadd="${esc(pid)}">➕ Add</button>
          </div>
          ${left > 0.05 ? `<button class="btn btn-ghost btn-xs mt6" data-tleft="${esc(pid)}">⬅️ Baaki ${fmtKg(left)} type ke bina (“${esc(name)}” general) daal dein</button>` : ''}
          <div class="fld-hint">Type ka naam + KG likh kar Enter/Add dabayein → slip mein <b>${esc(name)} — (type)</b> ban jata hai. Naya naam item ke sath <b>save</b> hota hai, agli dafa khud nazar aayega (naam badalna ho to likh kar bahar click karein).</div>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="card mb14">
      <div class="card-head" style="gap:8px;flex-wrap:wrap">
        <h3 style="font-size:14.5px;font-weight:800">🧩 Step 03 — Types / KG Breakup</h3>
        <span class="tiny muted">optional — item ko chhote types mein baant dein (jaise Shoes → Junior / Sports / Man / CH)</span>
      </div>
      <div class="card-body">${blocks}</div>
    </div>`;
}

/* ---------- helpers ---------- */
function nsCatKg(cat) { return round1(NS.lines.filter(l => l.category === cat).reduce((a, l) => a + num(l.kg), 0)); }
/* items selection — ek hi list (category nahi) */
function nsSelectedItems() { return NS._sel && NS._sel.all ? NS._sel.all : (NS._sel = NS._sel || {}, NS._sel.all = NS._sel.all || []); }

function nsBind() {
  const el = $('#nsBody');
  /* customer */
  UI.bindCustomerPicker('nsCust', cid => { NS.customerId = cid; nsPaint(); });

  /* header fields */
  const ed = $('#nsEntryDate'); if (ed) ed.onchange = e => { NS.entryDate = e.target.value; };
  const ex = $('#nsExpected'); if (ex) ex.onchange = e => { NS.expected = e.target.value; };
  const br = $('#nsBranch'); if (br) br.onchange = e => { NS.branchId = e.target.value; };
  const nt = $('#nsNote'); if (nt) nt.oninput = e => { NS.note = e.target.value; };
  const ad = $('#nsAdvance'); if (ad) ad.oninput = e => { NS.advance = e.target.value; };
  const md = $('#nsMode'); if (md) md.onchange = e => { NS.paymentMode = e.target.value; };

  /* item chips */
  $$('[data-nsitem]', el).forEach(b => b.onclick = () => {
    const list = nsSelectedItems(), id = b.dataset.nsitem;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    b.classList.toggle('on');
  });

  /* add to slip */
  const add = $('#nsAdd');
  const kgIn = $('#nsKg');
  if (kgIn) {
    kgIn.focus();
    kgIn.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); nsAddLine(); } };
  }
  if (add) add.onclick = nsAddLine;

  /* new item in product list */
  const ni = $('#nsNewItem');
  if (ni) ni.onclick = async () => {
    const p = await productForm(null);
    if (p) { toast('Item add ho gaya — ab click karke select karein', 'success'); nsPaint(); }
  };

  /* line edits */
  $$('[data-linekg]', el).forEach(i => i.onchange = e => {
    const l = NS.lines.find(x => x.id === e.target.dataset.linekg);
    if (l) { l.kg = round1(e.target.value); nsPaint(); }
  });
  $$('[data-linenote]', el).forEach(i => i.oninput = e => {
    const l = NS.lines.find(x => x.id === e.target.dataset.linenote);
    if (l) l.note = e.target.value;
  });
  $$('[data-linedel]', el).forEach(b => b.onclick = () => {
    NS.lines = NS.lines.filter(l => l.id !== b.dataset.linedel); nsPaint();
  });
  /* ---- STEP 03 bindings ---- */
  $$('[data-tkg]', el).forEach(inp => {
    inp.onchange = e => {
      const pid = e.target.dataset.tp, t = e.target.dataset.tkg;
      nsSetTypeKg(pid, t, round1(e.target.value));
    };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
  });
  $$('[data-tname]', el).forEach(inp => {
    inp.onchange = e => nsRenameType(e.target.dataset.tp, e.target.dataset.tname, e.target.value);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
  });
  $$('[data-tdel]', el).forEach(b => b.onclick = () => nsDeleteType(b.dataset.tp, b.dataset.tdel));
  $$('[data-tleft]', el).forEach(b => b.onclick = () => nsAddLeftover(b.dataset.tleft));
  $$('[data-tadd]', el).forEach(b => {
    const addType = () => {
      const pid = b.dataset.tadd;
      const nEl = $('#nsNewTypeName_' + pid), kEl = $('#nsNewTypeKg_' + pid);
      const name = (nEl && nEl.value || '').trim();
      const kg = round1(kEl && kEl.value || 0);
      if (!name) { toast('Type ka naam likhein (jaise Junior Shoes)', 'warn'); if (nEl) nEl.focus(); return; }
      nsSetTypeKg(pid, name, kg);
    };
    b.onclick = addType;
    const nEl = $('#nsNewTypeName_' + b.dataset.tadd);
    const kEl = $('#nsNewTypeKg_' + b.dataset.tadd);
    if (nEl) nEl.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (kEl) kEl.focus(); } };
    if (kEl) kEl.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addType(); } };
  });

  const cl = $('#nsClearLines'); if (cl) cl.onclick = async () => {
    if (await confirmDialog('Saare items hata dein?', { title: 'Clear items', danger: true })) { NS.lines = []; NS._base = {}; nsPaint(); }
  };

  const nr = $('#nsRateEdit'); if (nr) nr.onclick = () => openRateForm();
  const ncr = $('#nsCatRate'); if (ncr) ncr.onclick = () => openRateForm();
  /* is bill ka rate — purane record (e.g. Rs.200/kg) enter karne ke liye */
  const nri = $('#nsRateInp');
  if (nri) {
    nri.onchange = e => {
      const v = num(e.target.value);
      NS.rate = v > 0 ? v : '';
      if (NS.rate && round2(NS.rate) !== round2(Biz.rate())) {
        toast('Is bill ka rate ' + fmtMoney(NS.rate) + '/kg set — sirf isi bill par lagega', 'info', 3000);
      }
      nsPaint();
    };
    nri.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
  }

  /* save buttons */
  const sv = $('#nsSaveSlip'); if (sv) sv.onclick = () => nsSave('slip');
  const si = $('#nsSaveInvoice'); if (si) si.onclick = () => nsSave('invoice');
  const so = $('#nsSaveOnly'); if (so) so.onclick = () => nsSave('only');
  const rs = $('#nsReset'); if (rs) rs.onclick = async () => {
    if (await confirmDialog('Form reset karein?', { title: 'Reset' })) {
      NS.lines = []; NS._sel = {}; NS._base = {}; NS.advance = ''; NS.note = ''; NS.customerId = ''; NS.tab = 'A'; nsPaint();
    }
  };
}

function nsAddLine() {
  const kgIn = $('#nsKg');
  const kg = round1(kgIn ? kgIn.value : 0);
  if (kg <= 0) { toast('Pehle KG enter karein', 'warn'); if (kgIn) kgIn.focus(); return; }
  const sel = nsSelectedItems().slice();
  const products = DB.all('products').filter(p => p.active !== false);

  if (!sel.length) {
    NS.lines.push({ id: uid('ln'), productId: null, productName: 'Wash', category: '', type: NS._type ? '' : '', kg, pcs: 0, note: '' });
  } else {
    const each = round1(Math.floor((kg / sel.length) * 10) / 10);
    let used = 0;
    sel.forEach((pid, i) => {
      const lkg = (i === sel.length - 1) ? round1(kg - used) : each;
      used = round1(used + lkg);
      const pd = products.find(p => p.id === pid) || Biz.product(pid) || {};
      NS.lines.push({ id: uid('ln'), productId: pid, category: pd.category || '', type: '', kg: lkg, pcs: 0, note: '' });
    });
  }
  nsSelectedItems().length = 0;
  if (kgIn) kgIn.value = '';
  nsPaint();
  toast(fmtKg(kg) + ' slip mein add ho gaya', 'success', 1600);
}

async function nsSave(mode) {
  if (!NS.customerId) return toast('Customer select karein', 'error');
  if (!NS.lines.length) return toast('Kam az kam ek item / KG add karein', 'error');
  const rate = num(NS.rate) || Biz.rate();   // is bill ka rate
  const kgTotal = round1(NS.lines.reduce((a, l) => a + num(l.kg), 0));
  const sale = {
    id: uid('sal'),
    invoiceNo: DB.nextNumber('invoice'),
    branchId: NS.branchId || ((DB.all('branches')[0] || {}).id || ''),
    customerId: NS.customerId,
    entryDate: NS.entryDate || todayISO(),
    expectedDelivery: NS.expected || '',
    deliveryDate: '',
    status: 'open',
    lines: NS.lines.map(l => ({ id: l.id, productId: l.productId, productName: (Biz.product(l.productId) || {}).name || l.productName || 'Item', category: l.category || '', type: l.type || '', qtyKg: round1(l.kg), pcs: 0, note: l.note || '' })),
    kgTotal,
    piecesTotal: 0,
    rate,
    amount: round2(kgTotal * rate),
    paymentMode: NS.paymentMode || 'Credit',
    amountPaidAtEntry: round2(NS.advance),
    note: NS.note || '',
    createdBy: (DB.currentUser() || {}).name || '',
    createdAt: new Date().toISOString()
  };
  DB.upsert('sales', sale);
  DB.audit('sale', 'New wash entry ' + sale.invoiceNo + ' — ' + Biz.customerName(sale.customerId) + ' · ' + fmtKg(kgTotal), { ref: sale.invoiceNo });

  if (round2(NS.advance) > 0) {
    Biz.payAgainstSale(sale.id, round2(NS.advance), { mode: NS.paymentMode === 'Credit' ? 'Cash' : NS.paymentMode, note: 'Entry ke waqt received' });
  }

  toast('✔ ' + sale.invoiceNo + ' save ho gaya — ' + fmtKg(kgTotal), 'success');

  // reset cart but keep customer for fast repeat entry
  NS.lines = []; NS._sel = {}; NS._base = {}; NS.advance = ''; NS.note = '';
  NS.rate = '';   // rate override sirf usi bill ke liye tha

  if (mode === 'slip') {
    printSaleSlip(sale.id);
    nsAfterSaveDialog(sale, true);
  } else if (mode === 'invoice') {
    openCustomInvoice(sale.id, { afterSave: true });
  } else {
    nsAfterSaveDialog(sale, false);
  }
}

function nsAfterSaveDialog(sale, printed) {
  const w = openModal({
    title: '✔ ' + sale.invoiceNo + ' saved',
    size: 'sm',
    body: `<div class="note-box ok tiny mb10">Entry save ho gayi. Ab aap slip print kar sakte hain ya custom invoice bana sakte hain.</div>
      <div class="grid g2" style="gap:8px">
        <button class="btn btn-primary btn-block" id="asSlip">🖨️ Sale Slip</button>
        <button class="btn btn-success btn-block" id="asInv">💵 Custom Invoice</button>
        <button class="btn btn-ghost btn-block" id="asView">👁️ View Invoice</button>
        <button class="btn btn-ghost btn-block" id="asNew">➕ Next Entry</button>
      </div>`,
    footer: null
  });
  $('#asSlip', w).onclick = () => { printSaleSlip(sale.id); };
  $('#asInv', w).onclick = () => { closeModal(w); openCustomInvoice(sale.id); };
  $('#asView', w).onclick = () => { closeModal(w); app.go('sales?sale=' + sale.id); };
  $('#asNew', w).onclick = () => { closeModal(w); nsPaint(); };
}
