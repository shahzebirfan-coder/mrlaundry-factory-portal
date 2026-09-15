/* ============================================================
   OWNER DRAWINGS — owner ka nikaal (personal use)
   Yeh expense nahi hai, isliye profit par asar nahi karta —
   sirf cash nikalne ka record hai.
   ============================================================ */

function renderDrawings() {
  UI.renderLayout('drawings', `<div id="drwBody"></div>`);
  drawingsPaint();
}

function drawingsPaint() {
  const el = $('#drwBody');
  if (!el) return;
  const rows = Biz.drawingsIn(Period).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = round2(rows.reduce((a, d) => a + num(d.amount), 0));
  const mk = monthKey(todayISO());
  const monthTotal = round2(DB.all('drawings').filter(d => monthKey(d.date) === mk).reduce((a, d) => a + num(d.amount), 0));
  const allTotal = round2(DB.all('drawings').reduce((a, d) => a + num(d.amount), 0));
  const m = Biz.metrics(Period);
  const byReason = {};
  rows.forEach(d => { byReason[d.reason || 'Other'] = round2((byReason[d.reason || 'Other'] || 0) + num(d.amount)); });

  el.innerHTML = `
    ${Period.bar()}
    <div class="stats">
      ${UI.statCard({ icon: '🏧', label: 'Drawings — ' + Period.shortLabel(), value: fmtMoney(total), foot: rows.length + ' entries', tone: 'bad' })}
      ${UI.statCard({ icon: '📅', label: 'Is mahine', value: fmtMoney(monthTotal), tone: 'warn' })}
      ${UI.statCard({ icon: '💰', label: 'Total (all time)', value: fmtMoney(allTotal), tone: 'purple' })}
      ${UI.statCard({ icon: '📈', label: 'Profit — ' + Period.shortLabel(), value: fmtMoney(m.profit),
    foot: 'Drawings profit se kam nahi hoti', tone: m.profit >= 0 ? 'good' : 'bad' })}
    </div>

    <div class="grid g-2-1">
      <div class="card">
        <div class="card-head"><h3>🏧 Owner Drawings</h3><div class="sp"></div>
          <button class="btn btn-ghost btn-sm" id="drExport">⬇️ CSV</button>
          <button class="btn btn-primary btn-sm" id="drNew">➕ New Drawing</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:720px">
            <thead><tr><th>Date</th><th>Voucher</th><th>Reason / Kis liye</th><th>Method</th><th>Note</th>
              <th class="t-right">Amount</th><th class="t-center">Actions</th></tr></thead>
            <tbody>${rows.length ? rows.map(d => `<tr>
              <td class="t-nowrap">${fmtDate(d.date)}</td>
              <td class="tiny">${esc(d.no || '')}</td>
              <td><span class="tag">${esc(d.reason || 'Other')}</span></td>
              <td class="tiny">${esc(d.method || 'Cash')}</td>
              <td class="tiny">${esc(d.note || '')}</td>
              <td class="t-right t-bad"><b>${fmtMoney(d.amount)}</b></td>
              <td class="t-center t-nowrap">
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-dedit="${d.id}">✏️</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-ddel="${d.id}">🗑️</button></td>
            </tr>`).join('') : emptyRow(7, 'Is period mein koi drawing nahi', '💤')}</tbody>
            ${rows.length ? `<tfoot><tr><td colspan="5">TOTAL</td><td class="t-right">${fmtMoney(total)}</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-head"><h3>📊 Reason-wise</h3></div>
          <div class="card-body">${Object.keys(byReason).length ? UI.progressRows(Object.keys(byReason).sort((a, b) => byReason[b] - byReason[a]).map(r => ({
    label: r, value: byReason[r], color: '#7c5cff', note: fmtMoney(byReason[r])
  }))) : '<div class="empty"><div class="empty-ico">🏧</div><div>Koi data nahi</div></div>'}</div>
        </div>
        <div class="card"><div class="card-body">
          <div class="note-box warn tiny">
            <b>Note:</b> Owner drawings ko <b>expense nahi</b> gina jata — yeh malik ka apna paisa nikalna hai.
            Profit/loss report mein sirf business expenses count hote hain.
          </div>
        </div></div>
      </div>
    </div>`;

  Period.bind(el, drawingsPaint);
  $('#drNew').onclick = () => drawingForm();
  $('#drExport').onclick = () => exportCSV('owner-drawings-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
    ['Date', 'Voucher', 'Reason', 'Method', 'Note', 'Amount'],
    rows.map(d => [d.date, d.no, d.reason, d.method, d.note, d.amount]));
  $$('[data-dedit]', el).forEach(b => b.onclick = () => drawingForm(b.dataset.dedit));
  $$('[data-ddel]', el).forEach(b => b.onclick = async () => {
    const d = DB.get('drawings', b.dataset.ddel);
    const yes = await confirmDialog('Drawing ' + fmtMoney(d.amount) + ' delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('drawings', d.id);
    DB.audit('drawing-delete', 'Drawing delete: ' + fmtMoney(d.amount));
    drawingsPaint();
  });
}

const DRAW_REASONS = ['Personal Use', 'Ghar ka Kharcha', 'Bachon ki Fees', 'Medical', 'Family Function', 'Shop ki Zaroorat', 'Other'];

function drawingForm(id) {
  const d = id ? DB.get('drawings', id) : null;
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Date <b class="req">*</b></span><input type="date" class="inp" id="dfDate" value="${esc(d ? d.date : todayISO())}"/></label>
      <label class="fld"><span>Amount (Rs) <b class="req">*</b></span><input type="number" step="1" class="inp" id="dfAmt" value="${d ? d.amount : ''}"/></label>
    </div>
    <div class="grid g2">
      <label class="fld"><span>Reason</span>
        <select class="inp" id="dfReason">${DRAW_REASONS.map(r => `<option ${d && d.reason === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label class="fld"><span>Method</span>
        <select class="inp" id="dfMethod">${['Cash', 'Bank Transfer', 'Cheque', 'JazzCash', 'EasyPaisa'].map(x => `<option ${d && d.method === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    </div>
    <label class="fld"><span>Note</span><textarea class="inp" id="dfNote">${esc(d ? d.note : '')}</textarea></label>`;
  const w = openModal({
    title: d ? '✏️ Edit Drawing' : '🏧 New Owner Drawing', size: 'sm', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="dfSave">💾 Save</button>`
  });
  $('#dfSave', w).onclick = () => {
    const amt = round2($('#dfAmt', w).value);
    if (amt <= 0) return toast('Amount likhein', 'error');
    const rec = {
      id: d ? d.id : uid('drw'), no: d ? d.no : DB.nextNumber('drawing'),
      date: $('#dfDate', w).value || todayISO(), amount: amt,
      reason: $('#dfReason', w).value, method: $('#dfMethod', w).value, note: $('#dfNote', w).value,
      createdBy: (DB.currentUser() || {}).name || '',
      createdAt: d ? d.createdAt : new Date().toISOString()
    };
    DB.upsert('drawings', rec);
    DB.audit(d ? 'drawing-edit' : 'drawing', (d ? 'Drawing edit: ' : 'Owner drawing: ') + fmtMoney(amt) + ' — ' + rec.reason, { ref: rec.no });
    toast('✔ Drawing save ho gayi', 'success');
    closeModal(w);
    drawingsPaint();
  };
}
