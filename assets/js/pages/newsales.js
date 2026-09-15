/* ============================================================
   NEW SALES — Wash Entry (per KG)
   ------------------------------------------------------------
   Step 01 : Invoice date (aaj) — delivery date tab set hogi
             jab maal wapis deliver hoga.
   Step 02 : Category tabs (A / B / C) + kitne KG + ITEMS
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
  tab: 'A'
};

function renderNewSales(param) {
  const p = param || {};
  const s = DB.settings();
  NS.branchId = NS.branchId || ((DB.all('branches')[0] || {}).id || '');
  if (p.customer) NS.customerId = p.customer;
  if (p.reorder) nsLoadFromSale(p.reorder);

  UI.renderLayout('newsales', `<div id="nsBody"></div>`, {
    title: '➕ New Sales — Wash Entry',
    subtitle: 'Daily clients se kapre receive karein — category wise KG + items select karein'
  });
  nsPaint();
}

function nsLoadFromSale(saleId) {
  const s = DB.get('sales', saleId);
  if (!s) return;
  NS.customerId = s.customerId;
  NS.lines = (s.lines || []).map(l => ({ id: uid('ln'), productId: l.productId, category: l.category, kg: round1(l.qtyKg), pcs: num(l.pcs), note: l.note || '' }));
}

function nsPaint() {
  const el = $('#nsBody');
  if (!el) return;
  const cats = Biz.categories();
  const products = DB.all('products').filter(p => p.active !== false);
  const rate = Biz.rate();
  const totalKg = round1(NS.lines.reduce((a, l) => a + num(l.kg), 0));
  const totalPcs = NS.lines.reduce((a, l) => a + num(l.pcs), 0);
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

  /* -------- Step 02: category tabs + KG + items -------- */
  const tabBar = `
    <div class="row mb10" style="gap:6px">
      ${cats.map(c => `<button class="seg-btn ${NS.tab === c.key ? 'on' : ''}" data-nstab="${c.key}"
        style="${NS.tab === c.key ? 'background:' + c.color + ';color:#fff;box-shadow:0 6px 16px ' + c.color + '55' : ''}">
        ${esc(c.label)} <span class="tag" style="background:rgba(255,255,255,.25);color:inherit">${fmtKg(nsCatKg(c.key))}</span></button>`).join('')}
      <div class="sp flex1"></div>
      <button class="btn btn-ghost btn-sm" id="nsNewItem">➕ New Item in Product List</button>
    </div>`;

  const activeCat = cats.find(c => c.key === NS.tab) || cats[0];
  const catProducts = products.filter(p => p.category === activeCat.key);
  const selected = nsSelectedItems(activeCat.key);

  const catPanel = `
    <div class="cat-card on" style="--cat-color:${activeCat.color}">
      <div class="cat-card-head">
        <span class="cat-dot" style="background:${activeCat.color}"></span>
        <span class="cat-name">${esc(activeCat.label)} — ${esc(activeCat.desc || '')}</span>
        <span class="tag" style="cursor:pointer" id="nsCatRate" title="Rate edit karein">${fmtMoney(rate)} / kg ✏️</span>
      </div>
      <div class="small dim mb6"><b>ITEMS</b> — product par click karein (multiple select kar sakte hain):</div>
      <div class="cat-items">
        ${catProducts.length ? catProducts.map(p => `<button class="item-chip ${selected.indexOf(p.id) >= 0 ? 'on' : ''}" data-nsitem="${p.id}">
            ${esc(p.name)} <small>${esc(p.inputType || 'kg')}</small></button>`).join('')
      : '<span class="tiny muted">Is category mein koi product nahi. “➕ New Item” se add karein.</span>'}
      </div>
      <div class="grid g3 mt14" style="gap:10px;align-items:end">
        <label class="fld mb0"><span>Kitne KG? (${esc(activeCat.label)})</span>
          <div class="cat-kg-input"><input type="number" step="0.1" min="0" class="inp" id="nsKg" placeholder="0.0"/><span class="cat-unit">KG</span></div>
        </label>
        <label class="fld mb0"><span>Pieces (optional)</span>
          <div class="cat-kg-input"><input type="number" step="1" min="0" class="inp" id="nsPcs" placeholder="0"/><span class="cat-unit">PCS</span></div>
        </label>
        <button class="btn btn-primary btn-block" id="nsAdd" style="height:44px">➕ Add to Slip (Enter)</button>
      </div>
      <div class="fld-hint">Agar 2 items select hain to yeh KG barabar taqseem ho jayegi (baad mein table se adjust kar sakte hain).</div>
    </div>`;

  /* -------- lines table -------- */
  const linesTable = `
    <div class="card">
      <div class="card-head"><h3>🧾 Slip Items (${NS.lines.length})</h3><div class="sp"></div>
        ${NS.lines.length ? `<button class="btn btn-ghost btn-sm" id="nsClearLines">🗑️ Sab clear</button>` : ''}</div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:640px">
          <thead><tr>
            <th>Item</th><th>Category</th><th class="t-right">KG</th><th class="t-center">Pieces</th>
            <th>Note</th><th class="t-right">Amount</th><th></th>
          </tr></thead>
          <tbody>
            ${NS.lines.length ? NS.lines.map((l, i) => {
    const p = Biz.product(l.productId);
    return `<tr>
                <td class="t-strong">${esc(p ? p.name : (l.productName || 'Item'))}</td>
                <td><span class="tag" style="background:${Biz.catColor(l.category)}22;color:${Biz.catColor(l.category)}">${esc(l.category)} Category</span></td>
                <td class="t-right"><input type="number" step="0.1" min="0" class="inp inp-xs t-right" style="width:84px"
                     value="${l.kg}" data-linekg="${l.id}"/> kg</td>
                <td class="t-center"><input type="number" step="1" min="0" class="inp inp-xs t-center" style="width:70px"
                     value="${l.pcs || ''}" data-linepcs="${l.id}"/></td>
                <td><input class="inp inp-xs" value="${esc(l.note || '')}" placeholder="—" data-linenote="${l.id}"/></td>
                <td class="t-right t-mono">${fmtNum(round2(num(l.kg) * rate))}</td>
                <td><button class="icon-btn" style="width:30px;height:30px;font-size:12px" data-linedel="${l.id}">✕</button></td>
              </tr>`;
  }).join('') : emptyRow(7, 'Abhi koi item add nahi hua — upar category se KG enter karke “Add to Slip” dabayein', '🧺')}
          </tbody>
          ${NS.lines.length ? `<tfoot><tr>
            <td colspan="2">TOTAL</td><td class="t-right">${fmtKg(totalKg)}</td>
            <td class="t-center">${fmtNum(totalPcs)}</td><td></td>
            <td class="t-right">${fmtMoney(amount)}</td><td></td></tr></tfoot>` : ''}
        </table>
      </div>
    </div>`;

  /* -------- total bar -------- */
  const totalBar = `
    <div class="kg-total-bar mb14">
      <div class="kt-item"><div class="kt-lbl">Total Clothes Received</div><div class="kt-val">${fmtKg(totalKg)}</div></div>
      <div class="kt-sep"></div>
      <div class="kt-item"><div class="kt-lbl">Pieces</div><div class="kt-val">${fmtNum(totalPcs)}</div></div>
      <div class="kt-sep"></div>
      ${cats.map(c => `<div class="kt-item"><div class="kt-lbl">${esc(c.key)} Category</div><div class="kt-val">${fmtKg(nsCatKg(c.key))}</div></div>`).join('<div class="kt-sep"></div>')}
      <div class="kt-sep"></div>
      <div class="kt-item"><div class="kt-lbl">Tentative Amount (internal)</div><div class="kt-val">${fmtMoney(amount)}</div></div>
    </div>`;

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
        <div class="kv"><span>Total Pieces</span><b>${fmtNum(totalPcs)}</b></div>
        <div class="kv"><span>Rate</span><b style="cursor:pointer" id="nsRateEdit" title="Rate edit karein">${fmtMoney(rate)} / kg ✏️</b></div>
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
          <div class="row mb10"><h3 style="font-size:14.5px;font-weight:800">🧺 Step 02 — Category &amp; Items &amp; KG</h3></div>
          ${tabBar}
          ${catPanel}
        </div></div>
        ${totalBar}
        ${linesTable}
      </div>
      <div>${summary}</div>
    </div>`;

  nsBind();
}

/* ---------- helpers ---------- */
function nsCatKg(cat) { return round1(NS.lines.filter(l => l.category === cat).reduce((a, l) => a + num(l.kg), 0)); }
function nsSelectedItems(cat) { return NS._sel && NS._sel[cat] ? NS._sel[cat] : (NS._sel = NS._sel || {}, NS._sel[cat] = NS._sel[cat] || []); }

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

  /* category tabs */
  $$('[data-nstab]', el).forEach(b => b.onclick = () => { NS.tab = b.dataset.nstab; nsPaint(); });

  /* item chips */
  $$('[data-nsitem]', el).forEach(b => b.onclick = () => {
    const cat = NS.tab, list = nsSelectedItems(cat), id = b.dataset.nsitem;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    b.classList.toggle('on');
  });

  /* add to slip */
  const add = $('#nsAdd');
  const kgIn = $('#nsKg'), pcsIn = $('#nsPcs');
  if (kgIn) {
    kgIn.focus();
    kgIn.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); nsAddLine(); } };
  }
  if (add) add.onclick = nsAddLine;

  /* new item in product list */
  const ni = $('#nsNewItem');
  if (ni) ni.onclick = async () => {
    const p = await productForm(null, NS.tab);
    if (p) { toast('Item add ho gaya — ab click karke select karein', 'success'); nsPaint(); }
  };

  /* line edits */
  $$('[data-linekg]', el).forEach(i => i.onchange = e => {
    const l = NS.lines.find(x => x.id === e.target.dataset.linekg);
    if (l) { l.kg = round1(e.target.value); nsPaint(); }
  });
  $$('[data-linepcs]', el).forEach(i => i.onchange = e => {
    const l = NS.lines.find(x => x.id === e.target.dataset.linepcs);
    if (l) { l.pcs = num(e.target.value); nsPaint(); }
  });
  $$('[data-linenote]', el).forEach(i => i.oninput = e => {
    const l = NS.lines.find(x => x.id === e.target.dataset.linenote);
    if (l) l.note = e.target.value;
  });
  $$('[data-linedel]', el).forEach(b => b.onclick = () => {
    NS.lines = NS.lines.filter(l => l.id !== b.dataset.linedel); nsPaint();
  });
  const cl = $('#nsClearLines'); if (cl) cl.onclick = async () => {
    if (await confirmDialog('Saare items hata dein?', { title: 'Clear items', danger: true })) { NS.lines = []; nsPaint(); }
  };

  const nr = $('#nsRateEdit'); if (nr) nr.onclick = () => openRateForm();
  const ncr = $('#nsCatRate'); if (ncr) ncr.onclick = () => openRateForm();

  /* save buttons */
  const sv = $('#nsSaveSlip'); if (sv) sv.onclick = () => nsSave('slip');
  const si = $('#nsSaveInvoice'); if (si) si.onclick = () => nsSave('invoice');
  const so = $('#nsSaveOnly'); if (so) so.onclick = () => nsSave('only');
  const rs = $('#nsReset'); if (rs) rs.onclick = async () => {
    if (await confirmDialog('Form reset karein?', { title: 'Reset' })) {
      NS.lines = []; NS._sel = {}; NS.advance = ''; NS.note = ''; NS.customerId = ''; NS.tab = 'A'; nsPaint();
    }
  };
}

function nsAddLine() {
  const kgIn = $('#nsKg'), pcsIn = $('#nsPcs');
  const kg = round1(kgIn ? kgIn.value : 0);
  if (kg <= 0) { toast('Pehle KG enter karein', 'warn'); if (kgIn) kgIn.focus(); return; }
  const cat = NS.tab;
  const sel = nsSelectedItems(cat).slice();
  const pcs = num(pcsIn ? pcsIn.value : 0);
  const products = DB.all('products').filter(p => p.category === cat && p.active !== false);

  if (!sel.length) {
    // generic line for this category
    NS.lines.push({ id: uid('ln'), productId: products[0] ? products[0].id : null, productName: 'Wash (' + cat + ' Category)', category: cat, kg, pcs, note: '' });
  } else {
    const each = round1(Math.floor((kg / sel.length) * 10) / 10);
    let used = 0;
    sel.forEach((pid, i) => {
      const lkg = (i === sel.length - 1) ? round1(kg - used) : each;
      used = round1(used + lkg);
      NS.lines.push({ id: uid('ln'), productId: pid, category: cat, kg: lkg, pcs: i === 0 ? pcs : 0, note: '' });
    });
  }
  nsSelectedItems(cat).length = 0;
  nsPaint();
  toast(fmtKg(kg) + ' ' + cat + ' Category mein add ho gaya', 'success', 1600);
}

async function nsSave(mode) {
  if (!NS.customerId) return toast('Customer select karein', 'error');
  if (!NS.lines.length) return toast('Kam az kam ek item / KG add karein', 'error');
  const rate = Biz.rate();
  const kgTotal = round1(NS.lines.reduce((a, l) => a + num(l.kg), 0));
  const pieces = NS.lines.reduce((a, l) => a + num(l.pcs), 0);
  const sale = {
    id: uid('sal'),
    invoiceNo: DB.nextNumber('invoice'),
    branchId: NS.branchId || ((DB.all('branches')[0] || {}).id || ''),
    customerId: NS.customerId,
    entryDate: NS.entryDate || todayISO(),
    expectedDelivery: NS.expected || '',
    deliveryDate: '',
    status: 'open',
    lines: NS.lines.map(l => ({ id: l.id, productId: l.productId, productName: (Biz.product(l.productId) || {}).name || l.productName || 'Item', category: l.category, qtyKg: round1(l.kg), pcs: num(l.pcs), note: l.note || '' })),
    kgTotal,
    piecesTotal: pieces,
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
  NS.lines = []; NS._sel = {}; NS.advance = ''; NS.note = '';

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
