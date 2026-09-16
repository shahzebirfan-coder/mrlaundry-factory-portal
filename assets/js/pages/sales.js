/* ============================================================
   ORDER INVOICES / SALES — list, detail, delivery, printing
   ============================================================ */

const SalesUI = { q: '', status: 'all', branch: '', sort: 'entry_desc', page: 1, perPage: 25 };

function renderSales(param) {
  const p = param || {};
  UI.renderLayout('sales', `<div id="salesBody"></div>`);
  salesPaint();
  if (p.sale) setTimeout(() => openSaleDetail(p.sale), 60);
}

function salesFiltered() {
  let rows = Biz.sales();
  if (SalesUI.status !== 'all') rows = rows.filter(s => (SalesUI.status === 'open' ? s.status !== 'delivered' : s.status === SalesUI.status));
  if (SalesUI.branch) rows = rows.filter(s => s.branchId === SalesUI.branch);
  rows = rows.filter(s => Period.match(s.entryDate));
  const q = SalesUI.q.trim().toLowerCase();
  if (q) rows = rows.filter(s => String(s.invoiceNo).toLowerCase().includes(q) ||
    Biz.customerName(s.customerId).toLowerCase().includes(q) ||
    Biz.saleItemsSummary(s).toLowerCase().includes(q));
  const sorters = {
    entry_desc: (a, b) => String(b.entryDate).localeCompare(String(a.entryDate)) || String(b.invoiceNo).localeCompare(String(a.invoiceNo)),
    entry_asc: (a, b) => String(a.entryDate).localeCompare(String(b.entryDate)),
    kg_desc: (a, b) => num(b.kgTotal) - num(a.kgTotal),
    amount_desc: (a, b) => Biz.saleAmount(b) - Biz.saleAmount(a),
    cust_asc: (a, b) => Biz.customerName(a.customerId).localeCompare(Biz.customerName(b.customerId))
  };
  return rows.sort(sorters[SalesUI.sort] || sorters.entry_desc);
}

function salesPaint() {
  const el = $('#salesBody');
  if (!el) return;
  const rows = salesFiltered();
  const totalKg = round1(rows.reduce((a, s) => a + Biz.saleKg(s), 0));
  const totalAmt = round2(rows.reduce((a, s) => a + Biz.saleAmount(s), 0));
  const totalPend = round1(rows.reduce((a, s) => a + Biz.pendingKg(s), 0));
  const pages = Math.max(1, Math.ceil(rows.length / SalesUI.perPage));
  if (SalesUI.page > pages) SalesUI.page = pages;
  const slice = rows.slice((SalesUI.page - 1) * SalesUI.perPage, SalesUI.page * SalesUI.perPage);

  el.innerHTML = `
    ${Period.bar()}
    <div class="stats">
      ${UI.statCard({ icon: '🧾', label: 'Entries', value: fmtNum(rows.length), tone: 'info' })}
      ${UI.statCard({ icon: '⚖️', label: 'Total KG', value: fmtKg(totalKg), tone: 'purple' })}
      ${UI.statCard({ icon: '💰', label: 'Billed Amount', value: fmtMoney(totalAmt), tone: 'good' })}
      ${UI.statCard({ icon: '🏭', label: 'Pending in Factory', value: fmtKg(totalPend), tone: 'warn' })}
    </div>

    <div class="card">
      <div class="card-head">
        <h3>🧾 Order Invoices / Sales</h3>
        <div class="sp"></div>
        <div class="row" style="gap:6px;flex-wrap:nowrap">
          <input class="inp inp-sm" id="sSearch" placeholder="🔍 Invoice / customer / item" value="${esc(SalesUI.q)}" style="width:220px"/>
          <select class="inp inp-sm" id="sStatus" style="width:130px">
            <option value="all" ${SalesUI.status === 'all' ? 'selected' : ''}>All status</option>
            <option value="open" ${SalesUI.status === 'open' ? 'selected' : ''}>In Factory</option>
            <option value="delivered" ${SalesUI.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
          <select class="inp inp-sm" id="sBranch" style="width:140px">
            <option value="">All branches</option>
            ${DB.all('branches').map(b => `<option value="${b.id}" ${SalesUI.branch === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
          </select>
          <select class="inp inp-sm" id="sSort" style="width:150px">
            <option value="entry_desc" ${SalesUI.sort === 'entry_desc' ? 'selected' : ''}>Newest first</option>
            <option value="entry_asc" ${SalesUI.sort === 'entry_asc' ? 'selected' : ''}>Oldest first</option>
            <option value="kg_desc" ${SalesUI.sort === 'kg_desc' ? 'selected' : ''}>KG (high→low)</option>
            <option value="amount_desc" ${SalesUI.sort === 'amount_desc' ? 'selected' : ''}>Amount (high→low)</option>
            <option value="cust_asc" ${SalesUI.sort === 'cust_asc' ? 'selected' : ''}>Customer (A→Z)</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="sExport">⬇️ CSV</button>
          <button class="btn btn-primary btn-sm" id="sNew">➕ New Sale</button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:1080px">
          <thead><tr>
            <th>Invoice</th><th>Customer</th><th>Invoice Date</th><th>Delivery Date</th>
            <th>Items</th><th class="t-right">KG (A/B/C)</th><th class="t-center">Status</th>
            <th class="t-right">Amount</th><th class="t-right">Due</th><th class="t-center">Actions</th>
          </tr></thead>
          <tbody>
            ${slice.length ? slice.map(s => {
    const due = num(s._due != null ? s._due : Biz.saleAmount(s));
    return `<tr class="row-click" data-view="${s.id}">
              <td class="t-strong t-nowrap">${esc(s.invoiceNo)}</td>
              <td>${esc(Biz.customerName(s.customerId))}<div class="tiny muted">${esc(Biz.branchName(s.branchId))}</div></td>
              <td class="t-nowrap">${fmtDate(s.entryDate)}</td>
              <td class="t-nowrap">${s.deliveryDate ? '<span class="t-ok">' + fmtDate(s.deliveryDate) + '</span>' : '<span class="t-warn tiny">pending</span>'}</td>
              <td class="tiny">${esc(Biz.saleItemsSummary(s))}</td>
              <td class="t-right t-nowrap"><b>${fmtKg(s.kgTotal)}</b><div class="tiny muted">
                ${Biz.catKeys().map(k => esc(k) + ' ' + fmtNum(Biz.saleCatKg(s, k), 1)).join(' / ')}</div></td>
              <td class="t-center">${UI.statusPill(s.status)}</td>
              <td class="t-right t-nowrap">${fmtMoney(Biz.saleAmount(s))}</td>
              <td class="t-right t-nowrap">${due > 0.009 ? '<b class="t-bad">' + fmtMoney(due) + '</b>' : '<span class="t-ok tiny">paid</span>'}</td>
              <td class="t-center t-nowrap">
                <button class="icon-btn" style="width:30px;height:30px;font-size:12px" data-view="${s.id}" title="View">👁️</button>
                ${s.status !== 'delivered' ? `<button class="icon-btn" style="width:30px;height:30px;font-size:12px" data-deliver="${s.id}" title="Deliver">🚚</button>` : ''}
                <button class="icon-btn" style="width:30px;height:30px;font-size:12px" data-pay="${s.id}" title="Payment">💵</button>
                <button class="icon-btn" style="width:30px;height:30px;font-size:12px" data-slip="${s.id}" title="Print slip">🖨️</button>
              </td>
            </tr>`;
  }).join('') : emptyRow(10, 'Is period mein koi sale nahi mili — “New Sale” se entry karein', '🧾')}
          </tbody>
          <tfoot><tr>
            <td colspan="5">TOTAL (${rows.length} entries)</td>
            <td class="t-right">${fmtKg(totalKg)}</td><td></td>
            <td class="t-right">${fmtMoney(totalAmt)}</td><td colspan="2"></td>
          </tr></tfoot>
        </table>
      </div>
      ${pages > 1 ? `<div class="card-body row" style="justify-content:center">
        <button class="btn btn-ghost btn-sm" ${SalesUI.page === 1 ? 'disabled' : ''} data-pg="${SalesUI.page - 1}">← Prev</button>
        <span class="small dim">Page ${SalesUI.page} of ${pages}</span>
        <button class="btn btn-ghost btn-sm" ${SalesUI.page === pages ? 'disabled' : ''} data-pg="${SalesUI.page + 1}">Next →</button>
      </div>` : ''}
    </div>`;

  Period.bind(el, () => { SalesUI.page = 1; salesPaint(); });
  const q = $('#sSearch'); if (q) q.oninput = debounce(e => { SalesUI.q = e.target.value; SalesUI.page = 1; salesPaint(); }, 250);
  const st = $('#sStatus'); if (st) st.onchange = e => { SalesUI.status = e.target.value; salesPaint(); };
  const sb = $('#sBranch'); if (sb) sb.onchange = e => { SalesUI.branch = e.target.value; salesPaint(); };
  const so = $('#sSort'); if (so) so.onchange = e => { SalesUI.sort = e.target.value; salesPaint(); };
  $('#sNew').onclick = () => app.go('newsales');
  $('#sExport').onclick = () => exportCSV('sales-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
    ['Invoice', 'Customer', 'Invoice Date', 'Delivery Date', 'Items', 'KG', 'A', 'B', 'C', 'Pieces', 'Rate', 'Amount', 'Status'],
    rows.map(s => [s.invoiceNo, Biz.customerName(s.customerId), s.entryDate, s.deliveryDate || '',
    Biz.saleItemsSummary(s), s.kgTotal, Biz.saleCatKg(s, 'A'), Biz.saleCatKg(s, 'B'), Biz.saleCatKg(s, 'C'),
    s.piecesTotal, Biz.saleRate(s), Biz.saleAmount(s), s.status]));

  $$('[data-pg]', el).forEach(b => b.onclick = () => { SalesUI.page = +b.dataset.pg; salesPaint(); });
  $$('[data-view]', el).forEach(b => b.onclick = e => { e.stopPropagation(); openSaleDetail(b.dataset.view); });
  $$('[data-deliver]', el).forEach(b => b.onclick = e => { e.stopPropagation(); openDeliveryForm(b.dataset.deliver); });
  $$('[data-pay]', el).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const s = DB.get('sales', b.dataset.pay);
    openPaymentForm(s.customerId, { saleId: s.id });
  });
  $$('[data-slip]', el).forEach(b => b.onclick = e => { e.stopPropagation(); printSaleSlip(b.dataset.slip); });
  $$('.row-click', el).forEach(tr => tr.onclick = () => openSaleDetail(tr.dataset.view));
}

/* ============================================================
   SALE DETAIL
   ============================================================ */
function openSaleDetail(id, opts) {
  const o = opts || {};
  const s = DB.get('sales', id);
  if (!s) return toast('Invoice nahi mili', 'error');
  const acc = Biz.customerAccount(s.customerId);
  const me = acc.saleRows.find(x => x.id === s.id) || Object.assign({}, s, { _due: Biz.saleAmount(s), _applied: 0, _kgDue: Biz.saleKg(s), _kgApplied: 0, _amount: Biz.saleAmount(s) });
  const pays = Biz.payments().filter(p => p.saleId === s.id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const pendKg = Biz.pendingKg(s);
  const age = s.entryDate ? daysBetween(s.entryDate, s.deliveryDate || todayISO()) : 0;

  const body = `
    <div class="timeline">
      <div class="tl-step done"><div class="tl-dot">📥</div><div class="tl-lbl">Received</div><div class="tl-sub">${fmtDate(s.entryDate)}</div></div>
      <div class="tl-step ${s.status === 'delivered' ? 'done' : (s.status === 'partial' ? 'done' : 'cur')}"><div class="tl-dot">🏭</div>
        <div class="tl-lbl">In Factory</div><div class="tl-sub">${pendKg > 0 ? fmtKg(pendKg) + ' baqi' : 'complete'}</div></div>
      <div class="tl-step ${s.status === 'delivered' ? 'done' : 'cur'}"><div class="tl-dot">🚚</div><div class="tl-lbl">Delivered</div>
        <div class="tl-sub">${s.deliveryDate ? fmtDate(s.deliveryDate) : 'pending'}</div></div>
    </div>

    <div class="grid g2">
      <div class="card card-flat"><div class="card-body">
        <div class="kv"><span>Invoice No.</span><b>${esc(s.invoiceNo)}</b></div>
        <div class="kv"><span>Customer</span><b>${esc(Biz.customerName(s.customerId))}</b></div>
        <div class="kv"><span>Branch</span><b>${esc(Biz.branchName(s.branchId))}</b></div>
        <div class="kv"><span>Invoice Date</span><b>${fmtDate(s.entryDate)}</b></div>
        <div class="kv"><span>Expected Delivery</span><b>${s.expectedDelivery ? fmtDate(s.expectedDelivery) : '—'}</b></div>
        <div class="kv"><span>Delivery Date</span><b class="${s.deliveryDate ? 't-ok' : 't-warn'}">${s.deliveryDate ? fmtDate(s.deliveryDate) : 'Pending'}</b></div>
        <div class="kv"><span>Status</span><b>${UI.statusPill(s.status)}</b></div>
        <div class="kv"><span>Days (received → ${s.deliveryDate ? 'delivered' : 'today'})</span><b>${age} din</b></div>
        <div class="kv"><span>Created By</span><b>${esc(s.createdBy || '—')}</b></div>
        ${s.note ? `<div class="kv"><span>Note</span><b>${esc(s.note)}</b></div>` : ''}
      </div></div>

      <div class="card card-flat"><div class="card-body">
        <div class="kv"><span>Total KG</span><b>${fmtKg(s.kgTotal)}</b></div>
        ${Biz.catKeys().map(k => `<div class="kv"><span>${esc(Biz.catLabel(k))}</span><b>${fmtKg(Biz.saleCatKg(s, k))}</b></div>`).join('')}
        <div class="kv"><span>Pieces</span><b>${fmtNum(s.piecesTotal)}</b></div>
        <div class="kv"><span>Rate</span><b>${fmtMoney(Biz.saleRate(s))} / kg</b></div>
        <div class="kv total"><span>Invoice Amount</span><b>${fmtMoney(me._amount)}</b></div>
        <div class="kv"><span>Received against this bill</span><b class="t-ok">${fmtMoney(me._applied)}</b></div>
        <div class="kv"><span>Balance Due</span><b class="${me._due > 0.009 ? 't-bad' : 't-ok'}">${fmtMoney(me._due)}</b></div>
        <div class="kv"><span>Balance KG (${fmtMoney(Biz.saleRate(s))}/kg)</span><b>${fmtKg(me._kgDue)}</b></div>
      </div></div>
    </div>

    <div class="card card-flat mt14"><div class="card-head"><h3>🧺 Items</h3></div>
      <div class="tbl-wrap"><table class="tbl" style="min-width:520px">
        <thead><tr><th>#</th><th>Item</th><th>Category</th><th class="t-right">KG</th><th class="t-center">Pieces</th><th class="t-right">Amount</th></tr></thead>
        <tbody>${(s.lines || []).map((l, i) => `<tr>
          <td>${i + 1}</td><td class="t-strong">${esc((Biz.product(l.productId) || {}).name || l.productName || 'Item')}</td>
          <td><span class="tag" style="background:${Biz.catColor(l.category)}22;color:${Biz.catColor(l.category)}">${esc(l.category)}</span></td>
          <td class="t-right">${fmtKg(l.qtyKg)}</td><td class="t-center">${fmtNum(l.pcs)}</td>
          <td class="t-right">${fmtMoney(round2(num(l.qtyKg) * Biz.saleRate(s)))}</td></tr>`).join('')}</tbody>
      </table></div></div>

    <div class="card card-flat mt14"><div class="card-head"><h3>💵 Payments on this bill</h3><div class="sp"></div>
      <span class="pill ${me._due > 0.009 ? 'pill-due' : 'pill-ok'}">${me._due > 0.009 ? 'Balance ' + fmtMoney(me._due) : 'Fully paid'}</span></div>
      <div class="tbl-wrap"><table class="tbl" style="min-width:520px">
        <thead><tr><th>Date</th><th>Voucher</th><th>Mode</th><th class="t-right">Amount</th><th class="t-right">KG covered</th><th>Note</th></tr></thead>
        <tbody>${pays.length ? pays.map(p => `<tr>
          <td>${fmtDate(p.date)}</td><td>${esc(p.no || '—')}</td><td>${esc(p.mode || '')}</td>
          <td class="t-right t-ok">${fmtMoney(p.amount)}</td><td class="t-right">${fmtKg(p.kgCovered)}</td><td class="tiny">${esc(p.note || '')}</td>
        </tr>`).join('') : emptyRow(6, 'Abhi koi payment nahi aayi', '💤')}</tbody>
      </table></div></div>

    <div class="card card-flat mt14"><div class="card-body">
      <div class="row" style="justify-content:space-between">
        <div class="small dim"><b>Customer account:</b> Total ${fmtKg(acc.kgTotal)} · Billed ${fmtMoney(acc.amount)} · Paid ${fmtMoney(acc.paid)} ·
          <b class="${acc.balance > 0 ? 't-bad' : 't-ok'}">Balance ${fmtMoney(acc.balance)}</b> (${fmtKg(acc.kgBalance)})${acc.advance > 0 ? ' · Advance ' + fmtMoney(acc.advance) : ''}</div>
        <button class="btn btn-ghost btn-sm" data-openledger="${s.customerId}">📒 Full ledger kholen</button>
      </div>
    </div></div>`;

  const w = openModal({
    title: '🧾 ' + s.invoiceNo + ' — ' + Biz.customerName(s.customerId),
    size: 'xl',
    body,
    footer: `
      <button class="btn btn-ghost" id="sdClose">Close</button>
      <button class="btn btn-ghost" id="sdEdit">✏️ Edit</button>
      <button class="btn btn-ghost" id="sdCancel">🗑️ Cancel Entry</button>
      <button class="btn btn-primary" id="sdSlip">🖨️ Sale Slip</button>
      <button class="btn btn-success" id="sdInv">💵 Custom Invoice</button>
      ${s.status !== 'delivered' ? '<button class="btn btn-warn" id="sdDeliver">🚚 Mark Delivered</button>' : ''}
      <button class="btn btn-success" id="sdPay">💵 Receive Payment</button>`
  });
  $('#sdClose', w).onclick = () => closeModal(w);
  $('#sdSlip', w).onclick = () => printSaleSlip(s.id);
  $('#sdInv', w).onclick = () => { closeModal(w); openCustomInvoice(s.id); };
  $('#sdEdit', w).onclick = () => { closeModal(w); editSaleForm(s.id); };
  $('#sdPay', w).onclick = () => { closeModal(w); openPaymentForm(s.customerId, { saleId: s.id }); };
  const dl = $('#sdDeliver', w); if (dl) dl.onclick = () => { closeModal(w); openDeliveryForm(s.id); };
  const cn = $('#sdCancel', w); if (cn) cn.onclick = async () => {
    const yes = await confirmDialog('Yeh entry cancel karni hai? Invoice ' + s.invoiceNo + ' cancelled ho jayegi (data delete nahi hoga, ledger se hat jayegi).', { title: 'Cancel Entry', danger: true, yes: 'Yes, cancel' });
    if (!yes) return;
    DB.upsert('sales', Object.assign({}, s, { status: 'cancelled', cancelledAt: new Date().toISOString() }));
    DB.audit('sale-cancel', 'Invoice ' + s.invoiceNo + ' cancel ki gayi', { ref: s.invoiceNo });
    toast('Entry cancel ho gayi', 'warn');
    closeModal(w);
    if (app.current === 'sales') salesPaint(); else app.go('sales');
  };
  const ol = w.querySelector('[data-openledger]');
  if (ol) ol.onclick = () => { closeModal(w); app.go('ledger?customer=' + ol.dataset.openledger); };
}

/* ============================================================
   EDIT SALE
   ============================================================ */
function editSaleForm(id) {
  const s = DB.get('sales', id);
  if (!s) return;
  const cats = Biz.categories();
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Customer</span>${UI.customerPicker('edCust', s.customerId, { addBtn: false })}</label>
      <label class="fld"><span>Branch</span><select class="inp" id="edBranch">
        ${DB.all('branches').map(b => `<option value="${b.id}" ${b.id === s.branchId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Invoice Date</span><input type="date" class="inp" id="edEntry" value="${esc(s.entryDate)}"/></label>
      <label class="fld"><span>Delivery Date ${s.deliveryDate ? '' : '(pending ho to khali rakhein)'}</span>
        <input type="date" class="inp" id="edDelivery" value="${esc(s.deliveryDate || '')}"/></label>
      <label class="fld"><span>Rate / KG</span><input type="number" class="inp" id="edRate" value="${esc(Biz.saleRate(s))}"/></label>
    </div>
    <div class="card card-flat"><div class="card-head"><h3>Items / KG</h3><div class="sp"></div>
      <button class="btn btn-ghost btn-sm" id="edAddLine">➕ Add row</button></div>
      <div class="tbl-wrap"><table class="tbl" style="min-width:560px">
        <thead><tr><th>Item</th><th>Category</th><th class="t-right">KG</th><th class="t-center">Pcs</th><th></th></tr></thead>
        <tbody id="edLines"></tbody></table></div></div>
    <label class="fld mt10"><span>Note</span><textarea class="inp" id="edNote">${esc(s.note || '')}</textarea></label>`;

  const w = openModal({
    title: '✏️ Edit ' + s.invoiceNo, size: 'lg', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="edSave">💾 Save Changes</button>`
  });

  const prods = DB.all('products').filter(p => p.active !== false);
  function lineRow(l) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="inp inp-xs edProd">
        ${prods.map(p => `<option value="${p.id}" ${p.id === l.productId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        <option value="" ${!l.productId ? 'selected' : ''}>— other —</option></select></td>
      <td><select class="inp inp-xs edCat">${cats.map(c => `<option ${c.key === l.category ? 'selected' : ''}>${c.key}</option>`).join('')}</select></td>
      <td class="t-right"><input type="number" step="0.1" class="inp inp-xs edKg t-right" style="width:80px" value="${l.qtyKg}"/></td>
      <td class="t-center"><input type="number" step="1" class="inp inp-xs edPcs t-center" style="width:64px" value="${num(l.pcs) || ''}"/></td>
      <td><button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-rml>✕</button></td>`;
    tr.querySelector('[data-rml]').onclick = () => tr.remove();
    tr.querySelector('.edProd').onchange = e => {
      const p = Biz.product(e.target.value);
      if (p) { tr.querySelector('.edCat').value = p.category; }
    };
    return tr;
  }
  const tbody = $('#edLines', w);
  (s.lines || []).forEach(l => tbody.appendChild(lineRow(l)));
  $('#edAddLine', w).onclick = () => tbody.appendChild(lineRow({ productId: prods[0] ? prods[0].id : '', category: 'A', qtyKg: 0, pcs: 0 }));

  $('#edSave', w).onclick = () => {
    const lines = $$('tr', tbody).map(tr => {
      const pid = tr.querySelector('.edProd').value;
      const cat = tr.querySelector('.edCat').value;
      const kg = round1(tr.querySelector('.edKg').value);
      const pcs = num(tr.querySelector('.edPcs').value);
      return { id: uid('ln'), productId: pid || null, productName: (Biz.product(pid) || {}).name || 'Item', category: cat, qtyKg: kg, pcs, note: '' };
    }).filter(l => l.qtyKg > 0 || l.pcs > 0);
    if (!lines.length) return toast('Kam az kam ek item rakhein', 'error');
    const rate = num($('#edRate', w).value) || Biz.rate();
    const kgTotal = round1(lines.reduce((a, l) => a + l.qtyKg, 0));
    const deliveryDate = $('#edDelivery', w).value || '';
    const status = deliveryDate ? (round2(num(s.deliveredKg)) >= kgTotal ? 'delivered' : 'delivered') : 'open';
    DB.upsert('sales', Object.assign({}, s, {
      customerId: $('#edCust', w).value || s.customerId,
      branchId: $('#edBranch', w).value,
      entryDate: $('#edEntry', w).value || s.entryDate,
      deliveryDate,
      status: deliveryDate ? 'delivered' : 'open',
      deliveredKg: deliveryDate ? kgTotal : 0,
      deliveredPcs: deliveryDate ? lines.reduce((a, l) => a + l.pcs, 0) : 0,
      lines, kgTotal, piecesTotal: lines.reduce((a, l) => a + l.pcs, 0),
      rate, amount: round2(kgTotal * rate), amountManual: null, note: $('#edNote', w).value || ''
    }));
    DB.audit('sale-edit', 'Invoice ' + s.invoiceNo + ' edit hui');
    toast('✔ Changes save ho gaye', 'success');
    closeModal(w);
    salesPaint();
  };
}

/* ============================================================
   DELIVERY
   ============================================================ */
function openDeliveryForm(saleId) {
  const s = DB.get('sales', saleId);
  if (!s) return;
  const pendKg = Biz.pendingKg(s);
  const body = `
    <div class="note-box info tiny mb10">
      Invoice <b>${esc(s.invoiceNo)}</b> · ${esc(Biz.customerName(s.customerId))} · Received <b>${fmtKg(s.kgTotal)}</b>
      ${s.deliveryDate ? ' · Pehle ' + fmtKg(s.deliveredKg || 0) + ' deliver ho chuka' : ''}
    </div>
    <div class="grid g2">
      <label class="fld"><span>Delivery Date <b class="req">*</b></span>
        <input type="date" class="inp" id="dvDate" value="${todayISO()}"/></label>
      <label class="fld"><span>Delivered KG</span>
        <input type="number" step="0.1" class="inp" id="dvKg" value="${pendKg}"/>
        <div class="fld-hint">Poora maal deliver ho raha ho to wahi rakhein. Aadha bhi ho sakta hai.</div></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Pieces</span><input type="number" step="1" class="inp" id="dvPcs" value="${num(s.piecesTotal) - num(s.deliveredPcs || 0)}"/></label>
      <label class="fld"><span>Receiver ka naam</span><input class="inp" id="dvRecv" placeholder="e.g. Ahmed"/></label>
      <label class="fld"><span>Vehicle / Rider</span><input class="inp" id="dvRider" placeholder="optional"/></label>
    </div>
    <label class="fld"><span>Note</span><input class="inp" id="dvNote" placeholder="optional"/></label>
    <label class="row small" style="gap:8px"><input type="checkbox" id="dvPayNow"/> Is waqt payment bhi receive hua (ledger form khul jayega)</label>`;

  const w = openModal({
    title: '🚚 Mark Delivered — ' + s.invoiceNo, body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-ghost" id="dvSlip">🖨️ Delivery Slip</button>
             <button class="btn btn-success" id="dvSave">✔ Save Delivery</button>`
  });
  $('#dvSave', w).onclick = () => {
    const kg = round1($('#dvKg', w).value);
    if (kg <= 0) return toast('KG enter karein', 'error');
    const date = $('#dvDate', w).value || todayISO();
    const prevDel = num(s.deliveredKg);
    const newDel = round1(prevDel + kg);
    const newPcs = num(s.deliveredPcs) + num($('#dvPcs', w).value);
    const full = newDel >= round1(num(s.kgTotal)) - 0.05;
    const rec = {
      id: uid('dlv'), saleId: s.id, invoiceNo: s.invoiceNo, customerId: s.customerId, date,
      kg, pcs: num($('#dvPcs', w).value), receiver: $('#dvRecv', w).value || '', rider: $('#dvRider', w).value || '',
      note: $('#dvNote', w).value || '', by: (DB.currentUser() || {}).name || '', createdAt: new Date().toISOString()
    };
    DB.upsert('deliveries', rec, { silent: true });
    DB.upsert('sales', Object.assign({}, s, {
      deliveryDate: date, deliveredKg: newDel, deliveredPcs: newPcs,
      status: full ? 'delivered' : 'partial', lastDeliveryNote: rec.note
    }));
    DB.audit('delivery', 'Invoice ' + s.invoiceNo + ' — ' + fmtKg(kg) + ' deliver hua' + (full ? ' (complete)' : ' (partial)'), { ref: s.invoiceNo });
    toast('✔ ' + fmtKg(kg) + ' delivery mark ho gayi' + (full ? '' : ' — ' + fmtKg(round1(num(s.kgTotal) - newDel)) + ' baqi hai'), 'success', 3600);
    const payNow = $('#dvPayNow', w).checked;
    closeModal(w);
    if (payNow) openPaymentForm(s.customerId, { saleId: s.id });
    else refreshCurrent();
  };
  $('#dvSlip', w).onclick = () => printDeliverySlip(s.id);
}

/* ============================================================
   SALES SLIP PRINT (NO AMOUNT!)
   ============================================================ */
function printSaleSlip(saleId, size) {
  const s = DB.get('sales', saleId);
  if (!s) return;
  const shop = DB.settings();
  const p = paperProfile();
  const paper = size || printSizeFor('slip');
  const is58 = (paper === 'thermal58');
  const acc = Biz.customerAccount(s.customerId);

  const lineRows = (s.lines || []).map((l, i) => {
    const pr = Biz.product(l.productId);
    return { i: i + 1, name: (pr ? pr.name : l.productName) || 'Item', cat: l.category, kg: num(l.qtyKg), pcs: num(l.pcs), note: l.note || '' };
  });
  /* ek hi item + category ko merge kar dein (slip chhoti rehti hai) */
  const merged = [];
  lineRows.forEach(r => {
    const f = merged.find(m => m.name === r.name && m.cat === r.cat);
    if (f) { f.kg = round1(f.kg + r.kg); f.pcs += r.pcs; } else merged.push(Object.assign({}, r));
  });
  const totalKg = round1(merged.reduce((a, r) => a + r.kg, 0));
  const totalPcs = merged.reduce((a, r) => a + r.pcs, 0);
  const catLines = Biz.catKeys().map(k => ({ k, kg: Biz.saleCatKg(s, k) })).filter(c => c.kg > 0);

  const title = shortDocTitle('WASH RECEIVING SLIP (SALE SLIP)', is58 ? 'thermal58' : 'thermal80');

  const body = `
    ${printSlipHeader(shop)}
    <div class="pr-title">${esc(title)}</div>
    <div class="pr-meta">
      <div class="pr-cust">${esc(Biz.customerName(s.customerId))}</div>
      ${(DB.get('customers', s.customerId) || {}).phone ? '<div class="small">' + esc((DB.get('customers', s.customerId) || {}).phone) + '</div>' : ''}
      <div class="tk"><span>Slip No:</span><b class="tk-b">${esc(s.invoiceNo)}</b></div>
      <div class="tk"><span>Invoice Date:</span><b class="tk-b">${fmtDate(s.entryDate)}</b></div>
      <div class="tk"><span>Delivery Date:</span><b class="tk-b">${s.deliveryDate ? fmtDate(s.deliveryDate) : '____________'}</b></div>
    </div>
    <table class="pr-tbl">
      <thead><tr><th style="width:${is58 ? '12%' : '8%'}">#</th><th>ITEM</th><th class="c" style="width:${is58 ? '20%' : '18%'}">CAT</th><th class="r" style="width:${is58 ? '18%' : '16%'}">KG</th><th class="r" style="width:${is58 ? '16%' : '14%'}">PCS</th></tr></thead>
      <tbody>
        ${merged.map(r => `<tr><td>${r.i}</td><td>${esc(r.name)}${r.note ? '<br><span class="small">' + esc(r.note) + '</span>' : ''}</td>
          <td class="c">${esc(r.cat)}</td><td class="r">${fmtNum(r.kg, r.kg % 1 ? 1 : 0)}</td><td class="r">${r.pcs ? fmtNum(r.pcs) : '—'}</td></tr>`).join('')}
      </tbody>
    </table>
    <table class="pr-tot">
      <tr class="grand"><td>TOTAL RECEIVED</td><td class="r">${fmtKg(totalKg)}</td></tr>
      <tr><td>Total Pieces</td><td class="r"><b>${fmtNum(totalPcs)}</b></td></tr>
      ${catLines.map(c => `<tr><td>&nbsp;&nbsp;— ${esc(c.k)} Category</td><td class="r">${fmtKg(c.kg)}</td></tr>`).join('')}
      <tr><td>Delivery Pending</td><td class="r"><b>${fmtKg(acc.kgInFactory)}</b></td></tr>
    </table>
    <div class="pr-foot">
      <div class="small">Received by: ${esc(s.createdBy || '')} &middot; ${new Date().toLocaleString()}</div>
      <div class="sign">Customer Signature</div>
    </div>`;
  printHTML('Sale Slip ' + s.invoiceNo, body, { size: paper });
}

/* ============================================================
   CUSTOM INVOICE (WITH AMOUNT) — kg, rate, total, paid, due,
   aur purana balance / remaining KG ka statement
   ============================================================ */
function openCustomInvoice(saleId, opts) {
  const o = opts || {};
  const s = DB.get('sales', saleId);
  if (!s) return;
  const acc = Biz.customerAccount(s.customerId);
  const me = acc.saleRows.find(x => x.id === s.id) || { _due: Biz.saleAmount(s), _applied: 0, _amount: Biz.saleAmount(s), _kgDue: Biz.saleKg(s) };
  const othersDue = round2(acc.balance - me._due);
  const otherKg = round1(acc.kgBalance - me._kgDue);

  const body = `
    <div class="note-box info tiny mb10">Yeh invoice amount ke sath hai — ledger / weekly billing ke liye. KG/rate edit kar sakte hain.</div>
    <div class="grid g3">
      <label class="fld"><span>Bill KG (is invoice ka)</span><input type="number" step="0.1" class="inp" id="ciKg" value="${Biz.saleKg(s)}"/></label>
      <label class="fld"><span>Rate per KG</span><input type="number" step="1" class="inp" id="ciRate" value="${Biz.saleRate(s)}"/></label>
      <label class="fld"><span>Discount</span><input type="number" step="1" class="inp" id="ciDisc" value="0"/></label>
    </div>
    <div class="kv"><span>Is invoice ka amount</span><b id="ciAmt">${fmtMoney(me._amount)}</b></div>
    <div class="kv"><span>Purana balance (baqi KG / amount)</span><b>${fmtMoney(othersDue)} · ${fmtKg(otherKg)}</b></div>
    <div class="kv total"><span>Total Payable</span><b id="ciTotal">${fmtMoney(round2(me._amount + othersDue))}</b></div>
    <div class="grid g2 mt10">
      <label class="fld"><span>Received Now (khali chhorein agar baad mein)</span><input type="number" step="1" class="inp" id="ciPaid" value="0"/></label>
      <label class="fld"><span>Mode</span><select class="inp" id="ciMode">
        ${['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque'].map(m => `<option>${m}</option>`).join('')}</select></label>
    </div>
    <label class="row small" style="gap:8px"><input type="checkbox" id="ciStatement" checked/> Purana statement / remaining KG invoice par show karein</label>
    <div class="row mt14" style="gap:8px">
      <button class="btn btn-primary" id="ciPrintA4">🖨️ Print A4</button>
      <button class="btn btn-ghost" id="ciPrintA5">🖨️ Print A5</button>
      <button class="btn btn-ghost" id="ciPrintThermal">🧾 Thermal</button>
    </div>`;

  const w = openModal({
    title: '💵 Custom Invoice — ' + s.invoiceNo, size: 'lg', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-success" id="ciSave">💾 Save + Receive Payment</button>`
  });

  const recalc = () => {
    const kg = num($('#ciKg', w).value), rate = num($('#ciRate', w).value), disc = num($('#ciDisc', w).value);
    const amt = round2(Math.max(0, kg * rate - disc));
    const paid = num($('#ciPaid', w).value);
    $('#ciAmt', w).textContent = fmtMoney(amt);
    $('#ciTotal', w).textContent = fmtMoney(round2(amt + othersDue));
    return { kg, rate, disc, amt, paid, due: round2(amt + othersDue - paid) };
  };
  ['ciKg', 'ciRate', 'ciDisc', 'ciPaid'].forEach(id => { const e = $('#' + id, w); if (e) e.oninput = recalc; });

  const doPrint = (size) => {
    const v = recalc();
    printCustomInvoice(s.id, {
      kg: v.kg, rate: v.rate, discount: v.disc, paid: v.paid, size,
      showStatement: $('#ciStatement', w).checked,
      mode: $('#ciMode', w).value
    });
  };
  $('#ciPrintA4', w).onclick = () => doPrint('a4');
  $('#ciPrintA5', w).onclick = () => doPrint('a5');
  $('#ciPrintThermal', w).onclick = () => doPrint('thermal');

  $('#ciSave', w).onclick = () => {
    const v = recalc();
    const sale = DB.get('sales', s.id);
    DB.upsert('sales', Object.assign({}, sale, {
      billKg: v.kg, rate: v.rate, discount: v.disc, amount: v.amt,
      amountManual: v.amt, invoiced: true, invoicePrintedAt: new Date().toISOString()
    }));
    if (v.paid > 0) Biz.payAgainstSale(s.id, v.paid, { mode: $('#ciMode', w).value, note: 'Custom invoice ke waqt received' });
    DB.audit('invoice', 'Custom invoice banaya ' + s.invoiceNo + ' — ' + fmtMoney(v.amt) + (v.paid ? ', received ' + fmtMoney(v.paid) : ''), { ref: s.invoiceNo });
    toast('✔ Invoice save ho gaya' + (v.paid > 0 ? ' + payment record ho gayi' : ''), 'success');
    closeModal(w);
    refreshCurrent();
  };
}

function printCustomInvoice(saleId, cfg) {
  const c = cfg || {};
  const s = DB.get('sales', saleId);
  if (!s) return;
  const shop = DB.settings();
  const rate = num(c.rate) || Biz.saleRate(s);
  const kg = c.kg != null ? round1(c.kg) : Biz.saleKg(s);
  const disc = round2(c.discount);
  const amount = round2(Math.max(0, kg * rate - disc));
  const acc = Biz.customerAccount(s.customerId);
  const me = acc.saleRows.find(x => x.id === s.id);
  const already = me ? num(me._applied) : 0;
  const otherDue = round2(acc.balance - (me ? me._due : 0));
  const otherKg = round1(acc.kgBalance - (me ? me._kgDue : 0));
  const paidNow = round2(c.paid);
  const grossPayable = round2(amount + otherDue);
  const advHeld = round2(acc.advance);
  const totalPayable = round2(Math.max(0, grossPayable - advHeld));
  const balance = round2(Math.max(0, totalPayable - paidNow));
  /* rate-aware: is bill ka KG apne rate par + purane bills ke KG apne rate par */
  const settledKg = round1((paidNow + Math.min(advHeld, grossPayable)) / rate);
  const balanceKg = round1(Math.max(0, kg + otherKg - settledKg));

  /* kg breakdown per category for the bill */
  const cats = Biz.catKeys().map(k => ({ k, kg: Biz.saleCatKg(s, k) })).filter(x => x.kg > 0);
  const cust = DB.get('customers', s.customerId) || {};

  const statement = `
    <table class="pr-tbl" style="margin-top:10px">
      <tr><th colspan="2">LEDGER STATEMENT (purana hisaab)</th></tr>
      <tr><td>Total wash received till date</td><td class="r"><b>${fmtKg(acc.kgTotal)}</b></td></tr>
      <tr><td>Total billed till date</td><td class="r">${fmtMoney(acc.amount)}</td></tr>
      <tr><td>Total received till date</td><td class="r">${fmtMoney(acc.paid)}</td></tr>
      <tr><td><b>Remaining KG (jiska bill baqi hai)</b></td><td class="r"><b>${fmtKg(acc.kgBalance)}</b> = ${fmtMoney(acc.balance)}</td></tr>
      ${acc.advance > 0 ? `<tr><td>Advance / extra received (adjust hoga)</td><td class="r">${fmtMoney(acc.advance)}</td></tr>` : ''}
      <tr><td>Purana balance (is invoice se pehle)</td><td class="r">${fmtKg(otherKg)} = ${fmtMoney(otherDue)}</td></tr>
    </table>`;

  const body = `
    ${printHeader(shop, 'TAX INVOICE')}
    <div class="pr-title">WASH INVOICE (PER KG)</div>
    <div class="pr-meta">
      <div><b>Bill To:</b><div class="pr-cust">${esc(cust.name || Biz.customerName(s.customerId))}</div>
        ${esc(cust.phone || '')}${cust.address ? '<br>' + esc(cust.address) : ''}${cust.ntn ? '<br>NTN: ' + esc(cust.ntn) : ''}</div>
      <div style="text-align:right">
        Invoice No: <b>${esc(s.invoiceNo)}</b><br>
        Invoice Date: <b>${fmtDate(s.entryDate)}</b><br>
        Print Date: <b>${fmtDate(todayISO())}</b><br>
        Delivery Date: <b>${s.deliveryDate ? fmtDate(s.deliveryDate) : '—'}</b>
      </div>
    </div>
    <table class="pr-tbl">
      <thead><tr><th style="width:24px">#</th><th>Description</th><th class="c" style="width:60px">Category</th>
        <th class="r" style="width:60px">Qty (KG)</th><th class="r" style="width:74px">Rate</th><th class="r" style="width:86px">Amount</th></tr></thead>
      <tbody>
        ${(s.lines || []).map((l, i) => {
    const p = Biz.product(l.productId);
    return `<tr><td>${i + 1}</td><td>${esc((p ? p.name : l.productName) || 'Wash')}<br><span class="small">${num(l.pcs) ? l.pcs + ' pcs' : ''}${l.note ? ' · ' + esc(l.note) : ''}</span></td>
          <td class="c">${esc(l.category || '')}</td><td class="r">${fmtNum(l.qtyKg, 1)}</td><td class="r">${fmtNum(rate)}</td>
          <td class="r">${fmtNum(round2(num(l.qtyKg) * rate))}</td></tr>`;
  }).join('')}
      </tbody>
    </table>
    <table class="pr-tot">
      <tr><td>Total Weight (billed)</td><td class="r"><b>${fmtKg(kg)}</b></td></tr>
      ${cats.map(x => `<tr><td style="padding-left:18px" class="small">— ${esc(Biz.catLabel(x.k))}</td><td class="r small">${fmtKg(x.kg)}</td></tr>`).join('')}
      <tr><td>Wash Charges @ ${fmtMoney(rate)} / KG</td><td class="r">${fmtMoney(round2(kg * rate))}</td></tr>
      ${disc > 0 ? `<tr><td>Discount</td><td class="r">− ${fmtMoney(disc)}</td></tr>` : ''}
      <tr><td><b>This Invoice Amount</b></td><td class="r"><b>${fmtMoney(amount)}</b></td></tr>
      ${otherDue > 0 ? `<tr><td>Previous Balance (${fmtKg(otherKg)})</td><td class="r">${fmtMoney(otherDue)}</td></tr>` : ''}
      ${advHeld > 0 ? `<tr><td>Advance already received (adjust)</td><td class="r">− ${fmtMoney(advHeld)}</td></tr>` : ''}
      <tr class="grand"><td>TOTAL PAYABLE</td><td class="r">${fmtMoney(totalPayable)}</td></tr>
      ${paidNow > 0 ? `<tr><td>Received Now ${c.mode ? '(' + esc(c.mode) + ')' : ''}</td><td class="r">− ${fmtMoney(paidNow)}</td></tr>` : ''}
      <tr class="grand"><td>BALANCE DUE (${fmtKg(balanceKg)})</td><td class="r">${fmtMoney(balance)}</td></tr>
      ${round2(advHeld - grossPayable) > 0 ? `<tr><td>Advance baqi (next bill mein adjust)</td><td class="r">${fmtMoney(round2(advHeld - grossPayable))}</td></tr>` : ''}
    </table>
    <div class="words">Amount in words: <b>${esc(amountInWords(balance > 0 ? balance : totalPayable))}</b></div>
    ${c.showStatement === false ? '' : statement}
    <div class="pr-foot">
      <div class="small">${esc(shop.invoiceTerms || '')}<br>
        Note: Yeh bill ${fmtKg(kg)} wash ka hai. Baqi KG ka hisaab agle bill mein continue hoga.</div>
      <div class="sign">Authorised Signature</div>
    </div>`;
  printHTML('Invoice ' + s.invoiceNo, body, { size: c.size || 'a4' });
}

/* Delivery slip (gate pass style) */
function printDeliverySlip(saleId) {
  const s = DB.get('sales', saleId);
  if (!s) return;
  const shop = DB.settings();
  const paper = printSizeFor('delivery');
  const is58 = (paper === 'thermal58');
  const pend = Biz.pendingKg(s);
  const body = `
    ${printSlipHeader(shop, 'DELIVERY SLIP')}
    <div class="pr-title">DELIVERY / GATE PASS</div>
    <div class="pr-meta">
      <div><div class="pr-cust">${esc(Biz.customerName(s.customerId))}</div>
        <div class="small">${esc((DB.get('customers', s.customerId) || {}).phone || '')}</div></div>
      <div style="text-align:right">Invoice: <b>${esc(s.invoiceNo)}</b><br>Invoice Date: <b>${fmtDate(s.entryDate)}</b><br>
        Delivery Date: <b>${fmtDate(s.deliveryDate || todayISO())}</b></div>
    </div>
    <table class="pr-tbl">
      <thead><tr><th>Item</th><th class="c">Category</th><th class="r">KG</th><th class="r">Pcs</th></tr></thead>
      <tbody>${(s.lines || []).map(l => `<tr><td>${esc((Biz.product(l.productId) || {}).name || l.productName || 'Item')}</td>
        <td class="c">${esc(l.category)}</td><td class="r">${fmtNum(l.qtyKg, 1)}</td><td class="r">${fmtNum(l.pcs)}</td></tr>`).join('')}</tbody>
    </table>
    <table class="pr-tot">
      <tr><td>Total KG Received</td><td class="r"><b>${fmtKg(s.kgTotal)}</b></td></tr>
      <tr><td>Delivered (cumulative)</td><td class="r"><b>${fmtKg(s.deliveredKg)}</b></td></tr>
      <tr class="grand"><td>Still in Factory</td><td class="r">${fmtKg(pend)}</td></tr>
    </table>
    <div class="pr-foot">
      <div class="small">Received by: ${esc((DB.currentUser() || {}).name || '')} &middot; ${new Date().toLocaleString()}</div>
      <div class="sign">Receiver Signature</div>
    </div>`;
  printHTML('Delivery ' + s.invoiceNo, body, { size: paper });
}

/* helper: current page refresh */
function refreshCurrent() {
  if (app.current === 'sales') return salesPaint();
  if (app.current === 'newsales') return nsPaint();
  if (app.current === 'dashboard') return dashPaint();
  if (app.current === 'ledger') return ledgerPaint();
  if (app.current === 'delivery') return deliveryPaint();
  if (app.current === 'customers') return customersPaint();
  app.go(app.current || 'dashboard');
}
