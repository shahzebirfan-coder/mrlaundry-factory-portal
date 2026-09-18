/* ============================================================
   CUSTOMERS (Vendor / Client accounts)
   ============================================================ */

const CustUI = { q: '', sort: 'name', onlyDue: false };

function renderCustomers(param) {
  const p = param || {};
  UI.renderLayout('customers', `<div id="cusBody"></div>`);
  customersPaint();
  if (p.customer) setTimeout(() => openCustomerProfile(p.customer), 60);
}

function customersPaint() {
  const el = $('#cusBody');
  if (!el) return;
  let rows = DB.all('customers').map(c => {
    const a = Biz.customerAccount(c.id);
    return {
      c, acc: a,
      kgMonth: round1(Biz.salesIn({ match: d => String(d).slice(0, 7) === monthKey(todayISO()) })
        .filter(s => s.customerId === c.id).reduce((x, s) => x + Biz.saleKg(s), 0)),
      lastDate: a.sales.length ? a.sales[a.sales.length - 1].entryDate : ''
    };
  });
  const q = CustUI.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => (r.c.name || '').toLowerCase().includes(q) || String(r.c.phone || '').includes(q) || String(r.c.code || '').toLowerCase().includes(q));
  if (CustUI.onlyDue) rows = rows.filter(r => r.acc.balance > 0.009);
  const sorters = {
    name: (a, b) => String(a.c.name).localeCompare(String(b.c.name)),
    kg: (a, b) => b.acc.kgTotal - a.acc.kgTotal,
    due: (a, b) => b.acc.balance - a.acc.balance,
    kgMonth: (a, b) => b.kgMonth - a.kgMonth
  };
  rows.sort(sorters[CustUI.sort] || sorters.name);

  const totKg = round1(rows.reduce((a, r) => a + r.acc.kgTotal, 0));
  const totDue = round2(rows.reduce((a, r) => a + r.acc.balance, 0));

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '👥', label: 'Total Customers', value: fmtNum(rows.length), tone: 'info' })}
      ${UI.statCard({ icon: '⚖️', label: 'Total Wash KG (all time)', value: fmtKg(totKg), tone: 'purple' })}
      ${UI.statCard({ icon: '📒', label: 'Total Balance Due', value: fmtMoney(totDue), tone: totDue > 0 ? 'bad' : 'good' })}
      ${UI.statCard({ icon: '🆕', label: 'New this month', value: fmtNum(DB.all('customers').filter(c => monthKey(c.createdAt) === monthKey(todayISO())).length), tone: 'good' })}
    </div>

    <div class="card">
      <div class="card-head">
        <h3>👥 Customers / Vendors</h3><div class="sp"></div>
        <input class="inp inp-sm" id="cSearch" placeholder="🔍 Naam / phone / code" value="${esc(CustUI.q)}" style="width:210px"/>
        <select class="inp inp-sm" id="cSort" style="width:170px">
          <option value="name" ${CustUI.sort === 'name' ? 'selected' : ''}>Sort: Name</option>
          <option value="kg" ${CustUI.sort === 'kg' ? 'selected' : ''}>Sort: Total KG</option>
          <option value="kgMonth" ${CustUI.sort === 'kgMonth' ? 'selected' : ''}>Sort: Is mahine KG</option>
          <option value="due" ${CustUI.sort === 'due' ? 'selected' : ''}>Sort: Balance Due</option>
        </select>
        <label class="row small dim" style="gap:6px;font-weight:700"><input type="checkbox" id="cOnlyDue" ${CustUI.onlyDue ? 'checked' : ''}/> Sirf due wale</label>
        <button class="btn btn-ghost btn-sm" id="cExport">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" id="cNew">➕ New Customer</button>
      </div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:980px">
          <thead><tr>
            <th>Code</th><th>Name</th><th>Phone</th><th class="t-right">Total KG</th><th class="t-right">In Factory</th>
            <th class="t-right">Billed</th><th class="t-right">Paid</th><th class="t-right">Balance</th><th class="t-right">Is mahine</th>
            <th class="t-center">Actions</th>
          </tr></thead>
          <tbody>
            ${rows.length ? rows.map(r => `<tr>
              <td class="tiny muted">${esc(r.c.code || '')}</td>
              <td class="t-strong row-click" style="cursor:pointer" data-prof="${r.c.id}">${esc(r.c.name)}
                ${r.c.active === false ? '<span class="tag">inactive</span>' : ''}
                <div class="tiny muted">${esc(r.c.type || '')}</div></td>
              <td class="tiny">${esc(r.c.phone || '—')}</td>
              <td class="t-right">${fmtKg(r.acc.kgTotal)}</td>
              <td class="t-right ${r.acc.kgInFactory > 0 ? 't-warn' : 't-muted'}">${fmtKg(r.acc.kgInFactory)}</td>
              <td class="t-right">${fmtMoney(r.acc.amount)}</td>
              <td class="t-right t-ok">${fmtMoney(r.acc.paid)}</td>
              <td class="t-right ${r.acc.balance > 0.009 ? 't-bad' : 't-ok'}"><b>${fmtMoney(r.acc.balance)}</b>
                <div class="tiny muted">${fmtKg(r.acc.kgBalance)}</div></td>
              <td class="t-right">${fmtKg(r.kgMonth)}</td>
              <td class="t-center t-nowrap">
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-new="${r.c.id}" title="New wash entry">➕</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pay="${r.c.id}" title="Payment receive">💵</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-ledger="${r.c.id}" title="Ledger">📒</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-edit="${r.c.id}" title="Edit">✏️</button>
              </td>
            </tr>`).join('') : emptyRow(10, 'Koi customer nahi — “New Customer” se add karein', '👥')}
          </tbody>
          ${rows.length ? `<tfoot><tr><td colspan="3">TOTAL</td><td class="t-right">${fmtKg(totKg)}</td><td></td>
            <td class="t-right">${fmtMoney(round2(rows.reduce((a, r) => a + r.acc.amount, 0)))}</td>
            <td class="t-right">${fmtMoney(round2(rows.reduce((a, r) => a + r.acc.paid, 0)))}</td>
            <td class="t-right">${fmtMoney(totDue)}</td><td colspan="2"></td></tr></tfoot>` : ''}
        </table>
      </div>
    </div>`;

  const q2 = $('#cSearch'); if (q2) q2.oninput = debounce(e => { CustUI.q = e.target.value; customersPaint(); }, 250);
  const s2 = $('#cSort'); if (s2) s2.onchange = e => { CustUI.sort = e.target.value; customersPaint(); };
  const od = $('#cOnlyDue'); if (od) od.onchange = e => { CustUI.onlyDue = e.target.checked; customersPaint(); };
  $('#cNew').onclick = () => customerForm();
  $('#cExport').onclick = () => exportCSV('customers-' + todayISO() + '.csv',
    ['Code', 'Name', 'Phone', 'Type', 'Total KG', 'In Factory KG', 'Billed', 'Paid', 'Balance', 'Balance KG'],
    rows.map(r => [r.c.code, r.c.name, r.c.phone, r.c.type, r.acc.kgTotal, r.acc.kgInFactory, r.acc.amount, r.acc.paid, r.acc.balance, r.acc.kgBalance]));

  $$('[data-prof]', el).forEach(t => t.onclick = () => openCustomerProfile(t.dataset.prof));
  $$('[data-new]', el).forEach(b => b.onclick = () => app.go('newsales?customer=' + b.dataset.new));
  $$('[data-pay]', el).forEach(b => b.onclick = () => openPaymentForm(b.dataset.pay));
  $$('[data-ledger]', el).forEach(b => b.onclick = () => app.go('ledger?customer=' + b.dataset.ledger));
  $$('[data-edit]', el).forEach(b => b.onclick = () => customerForm(b.dataset.edit));
}

/* ============================================================
   CUSTOMER FORM
   ============================================================ */
function customerForm(id) {
  return new Promise(resolve => {
    const c = id ? DB.get('customers', id) : null;
    const body = `
      <div class="grid g2">
        <label class="fld"><span>Name <b class="req">*</b></span>
          <input class="inp" id="cfName" value="${esc(c ? c.name : '')}" placeholder="e.g. Al-Habib Hotel"/></label>
        <label class="fld"><span>Phone</span><input class="inp" id="cfPhone" value="${esc(c ? c.phone : '')}" placeholder="0300-0000000"/></label>
      </div>
      <div class="grid g2">
        <label class="fld"><span>Type</span>
          <select class="inp" id="cfType">${['Vendor', 'Client', 'Hotel', 'Restaurant', 'Hostel', 'Salon', 'Other']
        .map(t => `<option ${c && c.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="fld"><span>NTN (optional)</span><input class="inp" id="cfNtn" value="${esc(c ? c.ntn : '')}"/></label>
      </div>
      <label class="fld"><span>Address</span><input class="inp" id="cfAddr" value="${esc(c ? c.address : '')}" placeholder="Shop / hotel ka pata"/></label>
      <div class="grid g3">
        <label class="fld"><span>Opening Balance (Rs)</span>
          <input type="number" step="1" class="inp" id="cfOpen" value="${num(c && c.openingBalance)}"/>
          <div class="fld-hint">Purana udhaar ho to yahan likhein</div></label>
        <label class="fld"><span>Credit Limit</span><input type="number" step="1" class="inp" id="cfLimit" value="${num(c && c.creditLimit)}"/></label>
        <label class="fld"><span>Status</span>
          <select class="inp" id="cfActive"><option value="1" ${!c || c.active !== false ? 'selected' : ''}>Active</option>
            <option value="0" ${c && c.active === false ? 'selected' : ''}>Inactive</option></select></label>
      </div>
      <label class="fld"><span>Note</span><textarea class="inp" id="cfNote">${esc(c ? c.note : '')}</textarea></label>`;

    const w = openModal({
      title: c ? '✏️ Edit Customer' : '➕ New Customer', body,
      footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
               <button class="btn btn-primary" id="cfSave">💾 ${c ? 'Save Changes' : 'Add Customer'}</button>`,
      onMount: m => m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => setTimeout(() => resolve(null), 10)))
    });

    $('#cfSave', w).onclick = () => {
      const name = $('#cfName', w).value.trim();
      if (!name) return toast('Naam likhein', 'error');
      const rec = {
        id: c ? c.id : uid('cus'),
        code: c ? c.code : DB.nextNumber('customer'),
        name, phone: $('#cfPhone', w).value.trim(), type: $('#cfType', w).value,
        ntn: $('#cfNtn', w).value, address: $('#cfAddr', w).value,
        openingBalance: num($('#cfOpen', w).value), creditLimit: num($('#cfLimit', w).value),
        active: $('#cfActive', w).value === '1', note: $('#cfNote', w).value,
        createdAt: c ? c.createdAt : new Date().toISOString()
      };
      DB.upsert('customers', rec);
      DB.audit(c ? 'customer-edit' : 'customer', (c ? 'Customer edit: ' : 'Naya customer: ') + name, { ref: rec.code });
      toast(c ? '✔ Customer update ho gaya' : '✔ Customer add ho gaya', 'success');
      closeModal(w);
      resolve(rec);
      if (app.current === 'customers') customersPaint();
    };
  });
}

/* ============================================================
   CUSTOMER PROFILE
   ============================================================ */
function openCustomerProfile(id) {
  const c = DB.get('customers', id);
  if (!c) return;
  const acc = Biz.customerAccount(id);
  const sales = acc.sales.slice().reverse();
  const pays = acc.payments.slice().reverse();

  const kpis = `
    <div class="stats" style="margin-bottom:12px">
      ${UI.statCard({ icon: '⚖️', label: 'Total Wash KG', value: fmtKg(acc.kgTotal), foot: acc.count + ' entries', tone: 'purple' })}
      ${UI.statCard({ icon: '🏭', label: 'In Factory', value: fmtKg(acc.kgInFactory), tone: acc.kgInFactory > 0 ? 'warn' : 'good' })}
      ${UI.statCard({ icon: '💰', label: 'Total Billed', value: fmtMoney(acc.amount), foot: 'Avg ' + fmtMoney(acc.kgTotal ? round2(acc.amount / acc.kgTotal) : 0) + '/kg', tone: 'info' })}
      ${UI.statCard({ icon: '📒', label: 'Balance Due', value: fmtMoney(acc.balance), foot: fmtKg(acc.kgBalance) + ' baqi' + (acc.advance > 0 ? ' · Adv ' + fmtMoney(acc.advance) : ''), tone: acc.balance > 0.009 ? 'bad' : 'good' })}
    </div>`;

  const body = `
    ${kpis}
    <div class="grid g3 mb14">
      <div class="note-box info tiny"><b>${esc(c.name)}</b><br>${esc(c.phone || '—')}<br>${esc(c.address || '')}</div>
      <div class="note-box tiny"><b>Total Received (cash)</b><div class="big">${fmtMoney(acc.paid)}</div>
        <span class="tiny">Pichla payment: ${pays[0] ? fmtDate(pays[0].date) + ' · ' + fmtMoney(pays[0].amount) : 'koi nahi'}</span></div>
      <div class="note-box ${acc.balance > 0.009 ? 'bad' : 'ok'} tiny"><b>Kg-wise hisaab</b>
        <div class="big">${fmtKg(acc.kgBalance)}</div>
        <span class="tiny">${fmtKg(acc.kgTotal)} received − ${fmtKg(acc.kgPaid)} paid = ${fmtKg(acc.kgBalance)} balance</span></div>
    </div>

    <div class="tabs" id="cpTabs">
      <button class="tab on" data-cpt="sales">🧾 Sales History (${sales.length})</button>
      <button class="tab" data-cpt="ledger">📒 Ledger (${acc.ledger.length})</button>
      <button class="tab" data-cpt="pay">💵 Payments (${pays.length})</button>
    </div>
    <div id="cpBody"></div>`;

  const w = openModal({
    title: '👤 ' + c.name + ' — Account', size: 'xl', body,
    footer: `<button class="btn btn-ghost" data-close="1">Close</button>
             <button class="btn btn-ghost" id="cpEdit">✏️ Edit</button>
             <button class="btn btn-ghost" id="cpStatement">🖨️ Statement</button>
             <button class="btn btn-primary" id="cpNew">➕ New Wash Entry</button>
             <button class="btn btn-success" id="cpPay">💵 Receive Payment</button>`
  });

  function paintTab(t) {
    const el2 = $('#cpBody', w);
    if (t === 'sales') {
      el2.innerHTML = `<div class="tbl-wrap"><table class="tbl" style="min-width:820px">
        <thead><tr><th>Invoice</th><th>Date</th><th>Delivery</th><th>Items</th><th class="t-right">KG</th>
          <th class="t-right">Amount</th><th class="t-right">Paid</th><th class="t-right">Due</th><th class="t-center">Status</th><th></th></tr></thead>
        <tbody>${sales.length ? sales.map(s => `<tr>
          <td class="t-strong">${esc(s.invoiceNo)}</td><td class="t-nowrap">${fmtDate(s.entryDate)}</td>
          <td class="t-nowrap">${s.deliveryDate ? fmtDate(s.deliveryDate) : '<span class="t-warn tiny">pending</span>'}</td>
          <td class="tiny">${esc(Biz.saleItemsSummary(s))}</td>
          <td class="t-right">${fmtKg(s.kgTotal)}</td>
          <td class="t-right">${fmtMoney(s._amount)}</td>
          <td class="t-right t-ok">${fmtMoney(s._applied)}</td>
          <td class="t-right ${s._due > 0.009 ? 't-bad' : 't-ok'}">${fmtMoney(s._due)}</td>
          <td class="t-center">${UI.statusPill(s.status)}</td>
          <td><button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-osale="${s.id}">👁️</button></td>
        </tr>`).join('') : emptyRow(10, 'Abhi koi entry nahi', '🧺')}</tbody>
        ${sales.length ? `<tfoot><tr><td colspan="4">TOTAL</td><td class="t-right">${fmtKg(acc.kgTotal)}</td>
          <td class="t-right">${fmtMoney(acc.amount)}</td><td class="t-right">${fmtMoney(acc.paid)}</td>
          <td class="t-right">${fmtMoney(acc.balance)}</td><td colspan="2"></td></tr></tfoot>` : ''}
      </table></div>`;
      $$('[data-osale]', el2).forEach(b => b.onclick = () => { closeModal(w); openSaleDetail(b.dataset.osale); });
    } else if (t === 'ledger') {
      el2.innerHTML = ledgerTableHTML(acc, { compact: false });
    } else {
      el2.innerHTML = `<div class="tbl-wrap"><table class="tbl" style="min-width:640px">
        <thead><tr><th>Date</th><th>Voucher</th><th>Against Invoice</th><th>Mode</th><th class="t-right">Amount</th>
          <th class="t-right">KG Covered</th><th>Note</th><th></th></tr></thead>
        <tbody>${pays.length ? pays.map(p => `<tr>
          <td>${fmtDate(p.date)}</td><td>${esc(p.no || '—')}</td>
          <td>${p.saleId ? esc((DB.get('sales', p.saleId) || {}).invoiceNo || '') : (p.isAdvance ? '<span class="pill pill-info">Advance</span>' : '—')}</td>
          <td>${esc(p.mode || '')}</td><td class="t-right t-ok">${fmtMoney(p.amount)}</td>
          <td class="t-right">${fmtKg(p.kgCovered)}</td><td class="tiny">${esc(p.note || '')}</td>
          <td><button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-dpay="${p.id}" title="Delete">🗑️</button></td>
        </tr>`).join('') : emptyRow(8, 'Koi payment record nahi', '💤')}</tbody>
        <tfoot><tr><td colspan="4">TOTAL</td><td class="t-right">${fmtMoney(acc.paid)}</td><td class="t-right">${fmtKg(acc.kgPaid)}</td><td colspan="2"></td></tr></tfoot>
      </table></div>`;
      $$('[data-dpay]', el2).forEach(b => b.onclick = async () => {
        const p = DB.get('payments', b.dataset.dpay);
        const yes = await confirmDialog('Payment ' + fmtMoney(p.amount) + ' (' + fmtDate(p.date) + ') delete karni hai?', { danger: true, yes: 'Delete' });
        if (!yes) return;
        DB.remove('payments', p.id);
        DB.audit('payment-delete', 'Payment ' + fmtMoney(p.amount) + ' delete — ' + c.name);
        toast('Payment delete ho gayi', 'warn');
        closeModal(w); openCustomerProfile(id);
      });
    }
  }
  paintTab('sales');
  $$('[data-cpt]', w).forEach(b => b.onclick = () => {
    $$('[data-cpt]', w).forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    paintTab(b.dataset.cpt);
  });
  $('#cpEdit', w).onclick = async () => { closeModal(w); await customerForm(id); openCustomerProfile(id); };
  $('#cpNew', w).onclick = () => { closeModal(w); app.go('newsales?customer=' + id); };
  $('#cpPay', w).onclick = () => { closeModal(w); openPaymentForm(id); };
  $('#cpStatement', w).onclick = () => printCustomerStatement(id);
}

/* ============================================================
   LEDGER TABLE (shared) + Statement print
   ============================================================ */
function ledgerTableHTML(acc, opts) {
  const o = opts || {};
  const rows = acc.ledger;
  if (!rows.length) return '<div class="empty"><div class="empty-ico">📒</div><div>Abhi koi transaction nahi</div></div>';
  return `<div class="tbl-wrap"><table class="tbl" style="min-width:${o.compact ? 760 : 900}px">
    <thead><tr>
      <th>Date</th><th>Ref</th><th>Details</th>
      <th class="t-right">KG +</th><th class="t-right">KG −</th><th class="t-right">Balance KG</th>
      <th class="t-right">Amount</th><th class="t-right">Balance (Rs)</th>
    </tr></thead>
    <tbody>
      <tr><td colspan="8" class="tiny muted" style="background:var(--surface-2)">
        Opening balance: <b>${fmtMoney(0)}</b> </td></tr>
      ${rows.map(r => `<tr>
        <td class="t-nowrap">${fmtDate(r.date)}</td>
        <td class="tiny">${esc(r.ref || '—')}</td>
        <td>${r.type === 'sale'
      ? '<span class="pill pill-brand">Wash Received</span> <span class="tiny">' + esc(r.desc) + '</span>'
      : '<span class="pill pill-ok">Payment</span> <span class="tiny">' + esc(r.desc || r.kind) + '</span>'}
          ${r.type === 'sale' && r.deliveryDate ? '<div class="tiny muted">Delivered: ' + fmtDate(r.deliveryDate) + '</div>' : ''}</td>
        <td class="t-right">${r.kgAdd ? fmtKg(r.kgAdd) : '—'}</td>
        <td class="t-right">${r.kgCut ? fmtKg(r.kgCut) : '—'}</td>
        <td class="t-right t-strong ${r.kgBal > 0 ? 't-warn' : 't-ok'}">${fmtKg(r.kgBal)}</td>
        <td class="t-right ${r.amount >= 0 ? '' : 't-ok'}">${r.amount >= 0 ? fmtMoney(r.amount) : '− ' + fmtMoney(Math.abs(r.amount))}</td>
        <td class="t-right t-strong ${r.amtBal > 0.009 ? 't-bad' : 't-ok'}">${fmtMoney(r.amtBal)}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr>
      <td colspan="6">TOTAL · ${rows.length} transactions</td>
      <td class="t-right">${fmtMoney(acc.amount)} billed</td>
      <td class="t-right ${acc.balance > 0.009 ? 't-bad' : 't-ok'}">${fmtMoney(acc.balance)}</td>
    </tr></tfoot>
  </table></div>`;
}

function printCustomerStatement(customerId, range) {
  const c = DB.get('customers', customerId);
  if (!c) return;
  const acc = Biz.customerAccount(customerId);
  const shop = DB.settings();
  const rows = acc.ledger.filter(r => !range || range.match(r.date));
  const body = `
    ${printHeader(shop, 'ACCOUNT STATEMENT')}
    <div class="pr-title">ACCOUNT STATEMENT${range ? ' — ' + esc(range.label()) : ' — FULL LEDGER'}</div>
    <div class="pr-meta">
      <div><div class="pr-cust">${esc(c.name)}</div>${esc(c.phone || '')}<br>${esc(c.address || '')}</div>
      <div style="text-align:right">Statement Date: <b>${fmtDate(todayISO())}</b><br>Rate: <b>${(acc.rateMix && acc.rateMix.length ? acc.rateMix.map(m => fmtMoney(m.rate)).join(' + ') : fmtMoney(Biz.rate()))} / KG</b><br>
        Total Received: <b>${fmtKg(acc.kgTotal)}</b></div>
    </div>
    <table class="pr-tbl">
      <thead><tr><th style="width:62px">Date</th><th style="width:70px">Ref</th><th>Details</th>
        <th class="r" style="width:56px">KG +</th><th class="r" style="width:56px">KG −</th><th class="r" style="width:62px">Bal KG</th>
        <th class="r" style="width:70px">Amount</th><th class="r" style="width:74px">Balance</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td>${fmtDate(r.date)}</td><td>${esc(r.ref || '')}</td>
          <td>${r.type === 'sale' ? 'Wash: ' + esc(r.desc) : 'Payment received ' + esc(r.desc || '')}</td>
          <td class="r">${r.kgAdd ? fmtNum(r.kgAdd, 1) : ''}</td>
          <td class="r">${r.kgCut ? fmtNum(r.kgCut, 1) : ''}</td>
          <td class="r"><b>${fmtNum(r.kgBal, 1)}</b></td>
          <td class="r">${r.amount >= 0 ? fmtNum(r.amount) : '(' + fmtNum(Math.abs(r.amount)) + ')'}</td>
          <td class="r"><b>${fmtNum(r.amtBal)}</b></td></tr>`).join('')}
      </tbody>
    </table>
    <table class="pr-tot">
      <tr><td>Total KG Received (all time)</td><td class="r"><b>${fmtKg(acc.kgTotal)}</b></td></tr>
      <tr><td>Total Billed</td><td class="r"><b>${fmtMoney(acc.amount)}</b></td></tr>
      <tr><td>Total Received (payments)</td><td class="r"><b>${fmtMoney(acc.paid)}</b></td></tr>
      ${acc.advance > 0 ? `<tr><td>Advance / extra received</td><td class="r">${fmtMoney(acc.advance)}</td></tr>` : ''}
      <tr class="grand"><td>BALANCE DUE (${fmtKg(acc.kgBalance)})</td><td class="r">${fmtMoney(acc.balance)}</td></tr>
    </table>
    <div class="words">Amount in words: <b>${esc(amountInWords(acc.balance))}</b></div>
    <div class="pr-foot"><div class="small">${esc(shop.invoiceTerms || '')}</div><div class="sign">Authorised Signature</div></div>`;
  printHTML('Statement ' + c.name, body, { size: 'a4' });
}

/* WhatsApp share helper */
function whatsappShare(phone, text) {
  const p = String(phone || '').replace(/[^0-9]/g, '');
  const url = 'https://wa.me/' + (p.startsWith('92') ? p : '92' + p.replace(/^0/, '')) + '?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}
