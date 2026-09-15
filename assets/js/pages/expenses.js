/* ============================================================
   EXPENSES — factory ke kharchay (salary, fuel, chemicals…)
   ============================================================ */

function renderExpenses() {
  UI.renderLayout('expenses', `<div id="expBody"></div>`);
  expensesPaint();
}

function expensesPaint() {
  const el = $('#expBody');
  if (!el) return;
  const rows = Biz.expensesIn(Period).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = round2(rows.reduce((a, e) => a + num(e.amount), 0));
  const byCat = {};
  rows.forEach(e => { byCat[e.category] = round2((byCat[e.category] || 0) + num(e.amount)); });
  const catRows = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);

  el.innerHTML = `
    ${Period.bar()}
    <div class="stats">
      ${UI.statCard({ icon: '💸', label: 'Expenses — ' + Period.shortLabel(), value: fmtMoney(total), foot: rows.length + ' entries', tone: 'bad' })}
      ${UI.statCard({ icon: '📅', label: 'Aaj ka kharcha', value: fmtMoney(round2(Biz.expensesIn({ match: d => d === todayISO() }).reduce((a, e) => a + num(e.amount), 0))), tone: 'warn' })}
      ${UI.statCard({ icon: '📈', label: 'Is mahine ka', value: fmtMoney(round2(Biz.expensesIn({ match: d => String(d).slice(0, 7) === monthKey(todayISO()) }).reduce((a, e) => a + num(e.amount), 0))), tone: 'info' })}
      ${UI.statCard({ icon: '🏷️', label: 'Sab se bara kharcha', value: catRows.length ? esc(catRows[0]) : '—', foot: catRows.length ? fmtMoney(byCat[catRows[0]]) : '', tone: 'purple' })}
    </div>

    <div class="grid g-2-1">
      <div class="card">
        <div class="card-head"><h3>💸 Expense Records</h3><div class="sp"></div>
          <button class="btn btn-ghost btn-sm" id="eExport">⬇️ CSV</button>
          <button class="btn btn-primary btn-sm" id="eNew">➕ Add Expense</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:780px">
            <thead><tr><th>Date</th><th>Voucher</th><th>Category</th><th>Paid To</th><th>Mode</th>
              <th>Note</th><th class="t-right">Amount</th><th class="t-center">Actions</th></tr></thead>
            <tbody>${rows.length ? rows.map(e => `<tr>
              <td class="t-nowrap">${fmtDate(e.date)}</td>
              <td class="tiny">${esc(e.no || '')}</td>
              <td><span class="tag">${esc(e.category || '')}</span></td>
              <td class="tiny">${esc(e.paidTo || '—')}</td>
              <td class="tiny">${esc(e.mode || '')}</td>
              <td class="tiny">${esc(e.note || '')}</td>
              <td class="t-right t-bad"><b>${fmtMoney(e.amount)}</b></td>
              <td class="t-center t-nowrap">
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-eedit="${e.id}">✏️</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-edel="${e.id}">🗑️</button></td>
            </tr>`).join('') : emptyRow(8, 'Is period mein koi kharcha nahi', '💤')}</tbody>
            ${rows.length ? `<tfoot><tr><td colspan="6">TOTAL</td><td class="t-right">${fmtMoney(total)}</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-head"><h3>📊 Category-wise (${esc(Period.shortLabel())})</h3></div>
          <div class="card-body">
            ${catRows.length ? UI.progressRows(catRows.map(c => ({
    label: c, value: byCat[c], color: '#ef4444',
    note: fmtMoney(byCat[c]) + ' · ' + Math.round(byCat[c] / (total || 1) * 100) + '%'
  }))) : '<div class="empty"><div class="empty-ico">📊</div><div>Koi data nahi</div></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>⚡ Quick Add</h3></div>
          <div class="card-body">
            <div class="quick-menu">
              ${(DB.settings().expenseCategories || []).slice(0, 8).map(c => `<button class="qm-item" data-quick="${esc(c)}">➕ ${esc(c)}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  Period.bind(el, expensesPaint);
  $('#eNew').onclick = () => openExpenseForm();
  $('#eExport').onclick = () => exportCSV('expenses-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
    ['Date', 'Voucher', 'Category', 'Paid To', 'Mode', 'Note', 'Amount'],
    rows.map(e => [e.date, e.no, e.category, e.paidTo, e.mode, e.note, e.amount]));
  $$('[data-quick]', el).forEach(b => b.onclick = () => openExpenseForm(null, b.dataset.quick));
  $$('[data-eedit]', el).forEach(b => b.onclick = () => openExpenseForm(b.dataset.eedit));
  $$('[data-edel]', el).forEach(b => b.onclick = async () => {
    const e = DB.get('expenses', b.dataset.edel);
    const yes = await confirmDialog('Expense ' + fmtMoney(e.amount) + ' (' + e.category + ') delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('expenses', e.id);
    DB.audit('expense-delete', 'Expense delete: ' + e.category + ' ' + fmtMoney(e.amount));
    toast('Expense delete ho gaya', 'warn');
    expensesPaint();
  });
}

function openExpenseForm(id, defaultCat) {
  const e = id ? DB.get('expenses', id) : null;
  const cats = DB.settings().expenseCategories || [];
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Date <b class="req">*</b></span><input type="date" class="inp" id="exDate" value="${esc(e ? e.date : todayISO())}"/></label>
      <label class="fld"><span>Category <b class="req">*</b></span>
        <select class="inp" id="exCat">${cats.map(c => `<option ${((e ? e.category : defaultCat) === c) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Amount (Rs) <b class="req">*</b></span><input type="number" step="1" class="inp" id="exAmt" value="${e ? e.amount : ''}" placeholder="0"/></label>
      <label class="fld"><span>Paid To</span><input class="inp" id="exPaidTo" value="${esc(e ? e.paidTo : '')}" placeholder="Kisko diya"/></label>
      <label class="fld"><span>Mode</span>
        <select class="inp" id="exMode">${['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Credit'].map(m => `<option ${e && e.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    </div>
    <label class="fld"><span>Branch</span>
      <select class="inp" id="exBranch">${DB.all('branches').map(b => `<option value="${b.id}" ${e && e.branchId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
    <label class="fld"><span>Note / Details</span><textarea class="inp" id="exNote">${esc(e ? e.note : '')}</textarea></label>`;

  const w = openModal({
    title: e ? '✏️ Edit Expense' : '💸 Add Expense', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-primary" id="exSave">💾 ${e ? 'Save Changes' : 'Add Expense'}</button>`
  });
  setTimeout(() => { const a = $('#exAmt', w); if (a) a.focus(); }, 120);
  $('#exSave', w).onclick = () => {
    const amt = round2($('#exAmt', w).value);
    if (amt <= 0) return toast('Amount likhein', 'error');
    const rec = {
      id: e ? e.id : uid('exp'),
      no: e ? e.no : DB.nextNumber('expense'),
      date: $('#exDate', w).value || todayISO(),
      category: $('#exCat', w).value,
      amount: amt,
      paidTo: $('#exPaidTo', w).value,
      mode: $('#exMode', w).value,
      branchId: $('#exBranch', w).value,
      note: $('#exNote', w).value,
      createdBy: (DB.currentUser() || {}).name || '',
      createdAt: e ? e.createdAt : new Date().toISOString()
    };
    DB.upsert('expenses', rec);
    DB.audit(e ? 'expense-edit' : 'expense', (e ? 'Expense edit: ' : 'Expense: ') + rec.category + ' ' + fmtMoney(amt) + ' (' + rec.date + ')', { ref: rec.no });
    toast('✔ Expense save ho gaya — ' + fmtMoney(amt), 'success');
    closeModal(w);
    refreshCurrent();
  };
}
