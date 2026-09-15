/* ============================================================
   VENDORS — jin se khareedari hoti hai + unki REQUIREMENTS
   (rate quotes / new demands — factory barhne ke sath)
   ============================================================ */

function renderVendors() {
  UI.renderLayout('vendorlist', `<div id="venBody"></div>`);
  vendorsPaint();
}

function vendorsPaint() {
  const el = $('#venBody');
  if (!el) return;
  const rows = DB.all('vendors').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const stats = rows.map(v => {
    const buys = Biz.purchases().filter(p => p.vendorId === v.id);
    const total = round2(buys.reduce((a, p) => a + num(p.amount), 0));
    const paid = round2(buys.reduce((a, p) => a + num(p.paid), 0));
    const reqs = DB.all('vendorRequests').filter(r => r.vendorId === v.id && r.status !== 'closed');
    return { v, buys: buys.length, total, paid, payable: round2(total - paid), reqs: reqs.length };
  });
  const totalPayable = round2(stats.reduce((a, s) => a + s.payable, 0));
  const openReqs = DB.all('vendorRequests').filter(r => r.status !== 'closed');

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '🏬', label: 'Total Vendors', value: fmtNum(rows.length), tone: 'info' })}
      ${UI.statCard({ icon: '⏳', label: 'Total Payable', value: fmtMoney(totalPayable), tone: totalPayable > 0 ? 'bad' : 'good' })}
      ${UI.statCard({ icon: '📋', label: 'Open Requirements', value: fmtNum(openReqs.length), tone: 'warn', foot: 'naye demands / quotes' })}
      ${UI.statCard({ icon: '🛒', label: 'Purchases (all time)', value: fmtMoney(round2(Biz.purchases().reduce((a, p) => a + num(p.amount), 0))), tone: 'purple' })}
    </div>

    <div class="card">
      <div class="card-head"><h3>🏬 Vendors</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" id="vExport">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" id="vNew">➕ New Vendor</button></div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:880px">
          <thead><tr><th>Vendor</th><th>Contact</th><th>Supplies</th><th class="t-right">Purchases</th><th class="t-right">Paid</th>
            <th class="t-right">Payable</th><th class="t-center">Reqs</th><th class="t-center">Actions</th></tr></thead>
          <tbody>${rows.length ? stats.map(s => `<tr>
            <td class="t-strong">${esc(s.v.name)}${s.v.active === false ? ' <span class="tag">inactive</span>' : ''}
              <div class="tiny muted">${esc(s.v.address || '')}</div></td>
            <td class="tiny">${esc(s.v.phone || '—')}<div class="muted">${esc(s.v.contactPerson || '')}</div></td>
            <td class="tiny">${esc(s.v.supplies || '—')}</td>
            <td class="t-right">${fmtMoney(s.total)}</td>
            <td class="t-right t-ok">${fmtMoney(s.paid)}</td>
            <td class="t-right ${s.payable > 0.009 ? 't-bad' : 't-ok'}"><b>${fmtMoney(s.payable)}</b></td>
            <td class="t-center">${s.reqs ? '<span class="pill pill-warn">' + s.reqs + '</span>' : '<span class="t-muted">—</span>'}</td>
            <td class="t-center t-nowrap">
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-vreq="${s.v.id}" title="Requirements">📋</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-vbuy="${s.v.id}" title="Purchase entry">🛒</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-vedit="${s.v.id}" title="Edit">✏️</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-vdel="${s.v.id}" title="Delete">🗑️</button>
            </td>
          </tr>`).join('') : emptyRow(8, 'Koi vendor nahi — “New Vendor” se add karein', '🏬')}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>📋 Vendor Requirements / Rate Quotes</h3><div class="sp"></div>
        <span class="pill pill-info">${openReqs.length} open</span>
        <button class="btn btn-ghost btn-sm" id="reqNew">➕ New Requirement</button></div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:900px">
          <thead><tr><th>Date</th><th>Vendor</th><th>Item / Requirement</th><th class="t-right">Qty</th><th class="t-right">Quoted Rate</th>
            <th class="t-right">Est. Amount</th><th class="t-center">Status</th><th>Note</th><th class="t-center">Actions</th></tr></thead>
          <tbody>${openReqs.length ? openReqs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map(r => `<tr>
            <td class="t-nowrap">${fmtDate(r.date)}</td>
            <td>${esc(Biz.vendorName(r.vendorId))}</td>
            <td class="t-strong">${esc(r.item || '')}</td>
            <td class="t-right">${fmtNum(r.qty, r.qty % 1 ? 2 : 0)} ${esc(r.unit || '')}</td>
            <td class="t-right">${fmtMoney(r.rate)}</td>
            <td class="t-right">${fmtMoney(round2(num(r.qty) * num(r.rate)))}</td>
            <td class="t-center"><span class="pill ${r.status === 'ordered' ? 'pill-warn' : (r.status === 'received' ? 'pill-ok' : 'pill-info')}">${esc(titleCase(r.status || 'pending'))}</span></td>
            <td class="tiny">${esc(r.note || '')}</td>
            <td class="t-center t-nowrap">
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-rnext="${r.id}" title="Next status">➡️</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-redit="${r.id}" title="Edit">✏️</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-rdel="${r.id}" title="Delete">🗑️</button></td>
          </tr>`).join('') : emptyRow(9, 'Koi open requirement nahi — “New Requirement” se vendor ki nayi demand likhein', '📋')}</tbody>
        </table>
      </div>
    </div>`;

  $('#vNew').onclick = () => vendorForm();
  $('#reqNew').onclick = () => vendorRequestForm();
  $('#vExport').onclick = () => exportCSV('vendors.csv',
    ['Vendor', 'Phone', 'Contact Person', 'Supplies', 'Purchases', 'Paid', 'Payable'],
    stats.map(s => [s.v.name, s.v.phone, s.v.contactPerson, s.v.supplies, s.total, s.paid, s.payable]));
  $$('[data-vreq]', el).forEach(b => b.onclick = () => vendorRequestForm(null, b.dataset.vreq));
  $$('[data-vbuy]', el).forEach(b => b.onclick = () => { app.go('purchases'); setTimeout(() => openPurchaseForm(), 80); });
  $$('[data-vedit]', el).forEach(b => b.onclick = () => vendorForm(b.dataset.vedit));
  $$('[data-vdel]', el).forEach(b => b.onclick = async () => {
    const v = DB.get('vendors', b.dataset.vdel);
    const yes = await confirmDialog('Vendor “' + v.name + '” delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('vendors', v.id);
    DB.audit('vendor-delete', 'Vendor delete: ' + v.name);
    vendorsPaint();
  });
  $$('[data-redit]', el).forEach(b => b.onclick = () => vendorRequestForm(b.dataset.redit));
  $$('[data-rdel]', el).forEach(b => b.onclick = async () => {
    const r = DB.get('vendorRequests', b.dataset.rdel);
    const yes = await confirmDialog('Requirement “' + r.item + '” delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('vendorRequests', r.id);
    vendorsPaint();
  });
  $$('[data-rnext]', el).forEach(b => b.onclick = () => {
    const r = DB.get('vendorRequests', b.dataset.rnext);
    const order = ['pending', 'quoted', 'ordered', 'received', 'closed'];
    const nx = order[(order.indexOf(r.status || 'pending') + 1) % order.length];
    DB.upsert('vendorRequests', Object.assign({}, r, { status: nx }));
    toast('Status: ' + titleCase(nx), 'info');
    vendorsPaint();
  });
}

function vendorForm(id) {
  return new Promise(resolve => {
    const v = id ? DB.get('vendors', id) : null;
    const body = `
      <div class="grid g2">
        <label class="fld"><span>Vendor Name <b class="req">*</b></span><input class="inp" id="vfName" value="${esc(v ? v.name : '')}" placeholder="e.g. Al-Karam Chemicals"/></label>
        <label class="fld"><span>Phone</span><input class="inp" id="vfPhone" value="${esc(v ? v.phone : '')}"/></label>
      </div>
      <div class="grid g2">
        <label class="fld"><span>Contact Person</span><input class="inp" id="vfPerson" value="${esc(v ? v.contactPerson : '')}"/></label>
        <label class="fld"><span>Supplies</span><input class="inp" id="vfSupplies" value="${esc(v ? v.supplies : '')}" placeholder="e.g. detergent, bleach, packaging"/></label>
      </div>
      <label class="fld"><span>Address</span><input class="inp" id="vfAddr" value="${esc(v ? v.address : '')}"/></label>
      <label class="fld"><span>Status</span>
        <select class="inp" id="vfActive"><option value="1" ${!v || v.active !== false ? 'selected' : ''}>Active</option>
          <option value="0" ${v && v.active === false ? 'selected' : ''}>Inactive</option></select></label>
      <label class="fld"><span>Note</span><textarea class="inp" id="vfNote">${esc(v ? v.note : '')}</textarea></label>`;
    const w = openModal({
      title: v ? '✏️ Edit Vendor' : '➕ New Vendor', size: 'sm', body,
      footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="vfSave">💾 Save</button>`,
      onMount: m => m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => setTimeout(() => resolve(null), 10)))
    });
    $('#vfSave', w).onclick = () => {
      const name = $('#vfName', w).value.trim();
      if (!name) return toast('Vendor ka naam likhein', 'error');
      const rec = {
        id: v ? v.id : uid('ven'), code: v ? v.code : DB.nextNumber('vendor'),
        name, phone: $('#vfPhone', w).value, contactPerson: $('#vfPerson', w).value,
        supplies: $('#vfSupplies', w).value, address: $('#vfAddr', w).value,
        active: $('#vfActive', w).value === '1', note: $('#vfNote', w).value,
        createdAt: v ? v.createdAt : new Date().toISOString()
      };
      DB.upsert('vendors', rec);
      DB.audit(v ? 'vendor-edit' : 'vendor', (v ? 'Vendor edit: ' : 'Naya vendor: ') + name);
      toast('✔ Vendor save ho gaya', 'success');
      closeModal(w);
      resolve(rec);
      if (app.current === 'vendorlist') vendorsPaint();
    };
  });
}

function vendorRequestForm(id, vendorId) {
  const r = id ? DB.get('vendorRequests', id) : null;
  const vendors = DB.all('vendors').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Vendor <b class="req">*</b></span>
        <select class="inp" id="vrVendor"><option value="">— Select —</option>
          ${vendors.map(v => `<option value="${v.id}" ${((r ? r.vendorId : vendorId) === v.id) ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
      <label class="fld"><span>Date</span><input type="date" class="inp" id="vrDate" value="${esc(r ? r.date : todayISO())}"/></label>
    </div>
    <label class="fld"><span>Item / Requirement <b class="req">*</b></span>
      <input class="inp" id="vrItem" value="${esc(r ? r.item : '')}" placeholder="e.g. Liquid detergent 20 litre drum"/></label>
    <div class="grid g3">
      <label class="fld"><span>Qty</span><input type="number" step="0.01" class="inp" id="vrQty" value="${r ? r.qty : ''}"/></label>
      <label class="fld"><span>Unit</span><input class="inp" id="vrUnit" value="${esc(r ? r.unit : 'pcs')}" placeholder="kg / litre / pcs"/></label>
      <label class="fld"><span>Quoted Rate</span><input type="number" step="0.01" class="inp" id="vrRate" value="${r ? r.rate : ''}"/></label>
    </div>
    <div class="grid g2">
      <label class="fld"><span>Status</span>
        <select class="inp" id="vrStatus">${['pending', 'quoted', 'ordered', 'received', 'closed'].map(x => `<option ${r && r.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="fld"><span>Expected Date</span><input type="date" class="inp" id="vrExp" value="${esc(r ? r.expected : '')}"/></label>
    </div>
    <label class="fld"><span>Note</span><textarea class="inp" id="vrNote">${esc(r ? r.note : '')}</textarea></label>`;
  const w = openModal({
    title: r ? '✏️ Edit Requirement' : '📋 Vendor Requirement', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="vrSave">💾 Save</button>`
  });
  $('#vrSave', w).onclick = () => {
    const item = $('#vrItem', w).value.trim();
    if (!item) return toast('Requirement likhein', 'error');
    const rec = {
      id: r ? r.id : uid('req'),
      vendorId: $('#vrVendor', w).value, date: $('#vrDate', w).value || todayISO(),
      item, qty: num($('#vrQty', w).value), unit: $('#vrUnit', w).value, rate: num($('#vrRate', w).value),
      status: $('#vrStatus', w).value, expected: $('#vrExp', w).value, note: $('#vrNote', w).value,
      createdAt: r ? r.createdAt : new Date().toISOString()
    };
    DB.upsert('vendorRequests', rec);
    DB.audit('vendor-req', 'Vendor requirement: ' + item);
    toast('✔ Requirement save ho gayi', 'success');
    closeModal(w);
    if (app.current === 'vendorlist') vendorsPaint();
    // vendor requirements ko cloud/local me rakhne ke liye table ensure
    DB._data.vendorRequests = DB._data.vendorRequests || [];
  };
}
