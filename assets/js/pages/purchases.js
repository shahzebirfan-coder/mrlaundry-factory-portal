/* ============================================================
   PURCHASES — vendors se khareedari (chemicals, packaging…)
   ============================================================ */

function renderPurchases() {
  UI.renderLayout('purchases', `<div id="purBody"></div>`);
  purchasesPaint();
}

function purchasesPaint() {
  const el = $('#purBody');
  if (!el) return;
  const rows = Biz.purchasesIn(Period).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = round2(rows.reduce((a, p) => a + num(p.amount), 0));
  const paid = round2(rows.reduce((a, p) => a + num(p.paid), 0));
  const byVendor = {};
  rows.forEach(p => { byVendor[p.vendorName || Biz.vendorName(p.vendorId)] = round2((byVendor[p.vendorName || Biz.vendorName(p.vendorId)] || 0) + num(p.amount)); });
  const vRows = Object.keys(byVendor).sort((a, b) => byVendor[b] - byVendor[a]);

  el.innerHTML = `
    ${Period.bar()}
    <div class="stats">
      ${UI.statCard({ icon: '🛒', label: 'Purchases — ' + Period.shortLabel(), value: fmtMoney(total), foot: rows.length + ' bills', tone: 'bad' })}
      ${UI.statCard({ icon: '✅', label: 'Paid', value: fmtMoney(paid), tone: 'good' })}
      ${UI.statCard({ icon: '⏳', label: 'Payable to Vendors', value: fmtMoney(round2(total - paid)), tone: 'warn' })}
      ${UI.statCard({ icon: '🏬', label: 'Vendors involved', value: fmtNum(vRows.length), tone: 'info' })}
    </div>

    <div class="grid g-2-1">
      <div class="card">
        <div class="card-head"><h3>🛒 Purchase Bills</h3><div class="sp"></div>
          <button class="btn btn-ghost btn-sm" id="puExport">⬇️ CSV</button>
          <button class="btn btn-primary btn-sm" id="puNew">➕ New Purchase</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:840px">
            <thead><tr><th>Date</th><th>Vendor</th><th>Bill No</th><th>Items / Detail</th><th>Category</th>
              <th class="t-right">Amount</th><th class="t-right">Paid</th><th class="t-right">Balance</th><th class="t-center">Actions</th></tr></thead>
            <tbody>${rows.length ? rows.map(p => `<tr>
              <td class="t-nowrap">${fmtDate(p.date)}</td>
              <td>${esc(p.vendorName || Biz.vendorName(p.vendorId))}</td>
              <td class="tiny">${esc(p.billNo || '')}</td>
              <td class="tiny">${esc(p.details || '')}</td>
              <td><span class="tag">${esc(p.category || '')}</span></td>
              <td class="t-right"><b>${fmtMoney(p.amount)}</b></td>
              <td class="t-right t-ok">${fmtMoney(p.paid)}</td>
              <td class="t-right ${num(p.amount) - num(p.paid) > 0.009 ? 't-bad' : 't-ok'}">${fmtMoney(round2(num(p.amount) - num(p.paid)))}</td>
              <td class="t-center t-nowrap">
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pedit="${p.id}">✏️</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pdel="${p.id}">🗑️</button></td>
            </tr>`).join('') : emptyRow(9, 'Is period mein koi purchase nahi', '🛒')}</tbody>
            ${rows.length ? `<tfoot><tr><td colspan="5">TOTAL</td><td class="t-right">${fmtMoney(total)}</td>
              <td class="t-right">${fmtMoney(paid)}</td><td class="t-right">${fmtMoney(round2(total - paid))}</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>📊 Vendor-wise (period)</h3></div>
        <div class="card-body">${vRows.length ? UI.progressRows(vRows.map(v => ({
    label: v, value: byVendor[v], color: '#0891b2', note: fmtMoney(byVendor[v])
  }))) : '<div class="empty"><div class="empty-ico">🏬</div><div>Koi data nahi</div></div>'}</div>
      </div>
    </div>`;

  Period.bind(el, purchasesPaint);
  $('#puNew').onclick = () => openPurchaseForm();
  $('#puExport').onclick = () => exportCSV('purchases-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
    ['Date', 'Vendor', 'Bill No', 'Category', 'Details', 'Amount', 'Paid', 'Balance'],
    rows.map(p => [p.date, p.vendorName || Biz.vendorName(p.vendorId), p.billNo, p.category, p.details, p.amount, p.paid, round2(num(p.amount) - num(p.paid))]));
  $$('[data-pedit]', el).forEach(b => b.onclick = () => openPurchaseForm(b.dataset.pedit));
  $$('[data-pdel]', el).forEach(b => b.onclick = async () => {
    const p = DB.get('purchases', b.dataset.pdel);
    const yes = await confirmDialog('Purchase ' + fmtMoney(p.amount) + ' delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('purchases', p.id);
    DB.audit('purchase-delete', 'Purchase delete: ' + fmtMoney(p.amount));
    toast('Purchase delete ho gaya', 'warn');
    purchasesPaint();
  });
}

function openPurchaseForm(id) {
  const p = id ? DB.get('purchases', id) : null;
  const vendors = DB.all('vendors').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const cats = DB.settings().purchaseCategories || [];
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Vendor <b class="req">*</b></span>
        <div class="picker">
          <select class="inp" id="puVendor"><option value="">— Select vendor —</option>
            ${vendors.map(v => `<option value="${v.id}" ${p && p.vendorId === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
          <button class="btn btn-ghost btn-sm" id="puVendorAdd" title="Naya vendor">➕</button>
        </div></label>
      <label class="fld"><span>Date <b class="req">*</b></span><input type="date" class="inp" id="puDate" value="${esc(p ? p.date : todayISO())}"/></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Category</span>
        <select class="inp" id="puCat">${cats.map(c => `<option ${p && p.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="fld"><span>Vendor Bill No</span><input class="inp" id="puBill" value="${esc(p ? p.billNo : '')}" placeholder="optional"/></label>
      <label class="fld"><span>Total Amount (Rs) <b class="req">*</b></span><input type="number" step="1" class="inp" id="puAmt" value="${p ? p.amount : ''}"/></label>
    </div>
    <label class="fld"><span>Items / Details</span>
      <input class="inp" id="puDetails" value="${esc(p ? p.details : '')}" placeholder="e.g. 20 kg detergent, 5 litre bleach"/></label>
    <div class="grid g2">
      <label class="fld"><span>Paid Now (Rs)</span><input type="number" step="1" class="inp" id="puPaid" value="${p ? p.paid : ''}"/>
        <div class="fld-hint">Poora credit ho to 0 rakhein — payable mein chala jayega</div></label>
      <label class="fld"><span>Mode</span>
        <select class="inp" id="puMode">${['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Credit'].map(m => `<option ${p && p.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    </div>`;

  const w = openModal({
    title: p ? '✏️ Edit Purchase' : '🛒 New Purchase', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-primary" id="puSave">💾 Save</button>`
  });
  $('#puVendorAdd', w).onclick = async () => {
    const v = await vendorForm();
    if (v) {
      const sel = $('#puVendor', w);
      sel.innerHTML = '<option value="">— Select vendor —</option>' + DB.all('vendors').map(x => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    }
  };
  $('#puSave', w).onclick = () => {
    const amt = round2($('#puAmt', w).value);
    if (amt <= 0) return toast('Amount likhein', 'error');
    const vendorId = $('#puVendor', w).value;
    const rec = {
      id: p ? p.id : uid('pur'),
      no: p ? p.no : DB.nextNumber('purchase'),
      date: $('#puDate', w).value || todayISO(),
      vendorId, vendorName: vendorId ? Biz.vendorName(vendorId) : 'Cash purchase',
      category: $('#puCat', w).value, billNo: $('#puBill', w).value, details: $('#puDetails', w).value,
      amount: amt, paid: round2($('#puPaid', w).value), mode: $('#puMode', w).value,
      createdBy: (DB.currentUser() || {}).name || '',
      createdAt: p ? p.createdAt : new Date().toISOString()
    };
    DB.upsert('purchases', rec);
    DB.audit(p ? 'purchase-edit' : 'purchase', (p ? 'Purchase edit: ' : 'Purchase: ') + rec.vendorName + ' ' + fmtMoney(amt), { ref: rec.no });
    toast('✔ Purchase save ho gaya', 'success');
    closeModal(w);
    refreshCurrent();
  };
}
