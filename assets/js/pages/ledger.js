/* ============================================================
   PAYMENT LEDGER
   ------------------------------------------------------------
   • Customer-wise running ledger (KG + amount, dono ka balance)
   • Payment receive: AMOUNT ya KG se — FIFO allocation
   • Half / partial payment → baqi KG next bill mein continue
   • Weekly / Custom-date consolidated invoice print
   ============================================================ */

const LedgerUI = { customerId: '' };

function renderLedger(param) {
  const p = param || {};
  if (p.customer) LedgerUI.customerId = p.customer;
  if (!LedgerUI.customerId) {
    const firstDue = DB.all('customers').map(c => ({ c, a: Biz.customerAccount(c.id) })).sort((x, y) => y.a.balance - x.a.balance)[0];
    LedgerUI.customerId = firstDue ? firstDue.c.id : (DB.all('customers')[0] || {}).id || '';
  }
  UI.renderLayout('ledger', `<div id="ledBody"></div>`);
  ledgerPaint();
}

function ledgerPaint() {
  const el = $('#ledBody');
  if (!el) return;
  const custs = DB.all('customers').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const cid = LedgerUI.customerId && DB.get('customers', LedgerUI.customerId) ? LedgerUI.customerId : (custs[0] || {}).id || '';
  LedgerUI.customerId = cid;
  const acc = cid ? Biz.customerAccount(cid) : null;
  const recv = Biz.receivables();

  /* ---- all-customer receivable summary ---- */
  const dueList = custs.map(c => ({ c, a: Biz.customerAccount(c.id) })).filter(x => x.a.balance > 0.009 || x.a.advance > 0)
    .sort((x, y) => y.a.balance - x.a.balance);

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '📒', label: 'Total Receivable', value: fmtMoney(recv.balance), foot: fmtKg(recv.kgBalance) + ' ka hisaab', tone: recv.balance > 0 ? 'bad' : 'good' })}
      ${UI.statCard({ icon: '✅', label: 'Advance Held', value: fmtMoney(recv.advance), foot: 'Customers ke paas jama', tone: 'info' })}
      ${UI.statCard({ icon: '👥', label: 'Customers with Due', value: fmtNum(dueList.filter(x => x.a.balance > 0.009).length), tone: 'warn' })}
      ${UI.statCard({ icon: '💰', label: 'Received — ' + Period.shortLabel(), value: fmtMoney(round2(Biz.paymentsIn(Period).reduce((a, p) => a + num(p.amount), 0))),
    foot: Biz.paymentsIn(Period).length + ' payments', tone: 'good' })}
    </div>

    ${Period.bar()}

    <div class="card">
      <div class="card-head">
        <h3>📒 Payment Ledger</h3><div class="sp"></div>
        <select class="inp inp-sm" id="ldCust" style="width:240px">
          <option value="">— Customer select karein —</option>
          ${custs.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}${Biz.customerAccount(c.id).balance > 0.009 ? ' · due ' + fmtNum(Biz.customerAccount(c.id).balance) : ''}</option>`).join('')}
        </select>
        ${cid ? `<button class="btn btn-ghost btn-sm" id="ldExport">⬇️ CSV</button>
        <button class="btn btn-ghost btn-sm" id="ldWeek">🗓️ Weekly Invoice</button>
        <button class="btn btn-ghost btn-sm" id="ldStmt">🖨️ Statement</button>
        <button class="btn btn-ghost btn-sm" id="ldWa">💬 WhatsApp</button>
        <button class="btn btn-success btn-sm" id="ldPay">💵 Receive Payment</button>` : ''}
      </div>
      ${cid && acc ? `
      <div class="card-body tight">
        <div class="grid g4" style="gap:10px">
          <div class="note-box info tiny"><b>Total Received (wash)</b><div class="big">${fmtKg(acc.kgTotal)}</div>
            <span class="tiny">${acc.count} entries · ${fmtNum(acc.piecesTotal)} pcs</span></div>
          <div class="note-box tiny"><b>Total Billed</b><div class="big">${fmtMoney(acc.amount)}</div>
            <span class="tiny">Rate ${fmtMoney(acc.kgTotal ? round2(acc.amount / acc.kgTotal) : Biz.rate())}/kg</span></div>
          <div class="note-box ok tiny"><b>Total Paid</b><div class="big">${fmtMoney(acc.paid)}</div>
            <span class="tiny">= ${fmtKg(acc.kgPaid)} ka payment${acc.advance > 0 ? ' · advance ' + fmtMoney(acc.advance) : ''}</span></div>
          <div class="note-box ${acc.balance > 0.009 ? 'bad' : 'ok'} tiny"><b>Balance Due (${fmtKg(acc.kgBalance)})</b>
            <div class="big">${fmtMoney(acc.balance)}</div>
            <span class="tiny">${fmtKg(acc.kgTotal)} − ${fmtKg(acc.kgPaid)} = ${fmtKg(acc.kgBalance)}</span></div>
        </div>
        ${acc.kgBalance > 0 ? `<div class="note-box warn tiny mt10">
          🔎 <b>Note:</b> ${esc(Biz.customerName(cid))} ne kul <b>${fmtKg(acc.kgTotal)}</b> wash karwaya hai,
          jis mein se <b>${fmtKg(acc.kgPaid)}</b> ka payment aa chuka hai. Baqi <b>${fmtKg(acc.kgBalance)}</b>
          (${fmtMoney(acc.balance)}) ka balance due hai — yeh next bill mein continue hoga.</div>` : ''}
      </div>
      <div class="tbl-wrap">${ledgerTableHTML(acc)}</div>` : '<div class="empty"><div class="empty-ico">👥</div><div>Ledger dekhne ke liye customer select karein</div></div>'}
    </div>

    <div class="card">
      <div class="card-head"><h3>📊 Customer-wise Balance (Receivable Report)</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" id="recvExport">⬇️ CSV</button>
        <button class="btn btn-ghost btn-sm" id="recvPrint">🖨️ Print</button></div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:760px">
          <thead><tr><th>Customer</th><th class="t-right">Total KG</th><th class="t-right">Billed</th><th class="t-right">Paid</th>
            <th class="t-right">Balance</th><th class="t-right">Balance KG</th><th class="t-right">Advance</th><th class="t-center">Actions</th></tr></thead>
          <tbody>${dueList.length ? dueList.map(x => `<tr>
            <td class="t-strong">${esc(x.c.name)}<div class="tiny muted">${esc(x.c.phone || '')}</div></td>
            <td class="t-right">${fmtKg(x.a.kgTotal)}</td>
            <td class="t-right">${fmtMoney(x.a.amount)}</td>
            <td class="t-right t-ok">${fmtMoney(x.a.paid)}</td>
            <td class="t-right ${x.a.balance > 0.009 ? 't-bad' : 't-ok'}"><b>${fmtMoney(x.a.balance)}</b></td>
            <td class="t-right">${fmtKg(x.a.kgBalance)}</td>
            <td class="t-right">${x.a.advance > 0 ? fmtMoney(x.a.advance) : '—'}</td>
            <td class="t-center"><button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pay="${x.c.id}" title="Receive payment">💵</button></td>
          </tr>`).join('') : emptyRow(8, 'Sab customers clear hain — koi balance due nahi 🎉', '🎉')}</tbody>
          <tfoot><tr><td>TOTAL</td>
            <td class="t-right">${fmtKg(round1(dueList.reduce((a, x) => a + x.a.kgTotal, 0)))}</td>
            <td class="t-right">${fmtMoney(round2(dueList.reduce((a, x) => a + x.a.amount, 0)))}</td>
            <td class="t-right">${fmtMoney(round2(dueList.reduce((a, x) => a + x.a.paid, 0)))}</td>
            <td class="t-right">${fmtMoney(round2(dueList.reduce((a, x) => a + x.a.balance, 0)))}</td>
            <td class="t-right">${fmtKg(round1(dueList.reduce((a, x) => a + x.a.kgBalance, 0)))}</td>
            <td class="t-right">${fmtMoney(round2(dueList.reduce((a, x) => a + x.a.advance, 0)))}</td><td></td></tr></tfoot>
        </table>
      </div>
    </div>`;

  Period.bind(el, ledgerPaint);
  const sel = $('#ldCust'); if (sel) sel.onchange = e => { LedgerUI.customerId = e.target.value; ledgerPaint(); };
  const pe = $('#ldPay'); if (pe) pe.onclick = () => openPaymentForm(cid);
  const ex = $('#ldExport'); if (ex) ex.onclick = () => exportCSV('ledger-' + DB.get('customers', cid).name.replace(/\s+/g, '-') + '.csv',
    ['Date', 'Type', 'Ref', 'Details', 'KG +', 'KG -', 'Balance KG', 'Amount', 'Balance'],
    acc.ledger.map(r => [r.date, r.type, r.ref, r.desc, r.kgAdd, r.kgCut, r.kgBal, r.amount, r.amtBal]));
  const wk = $('#ldWeek'); if (wk) wk.onclick = () => openWeeklyInvoice(cid);
  const stm = $('#ldStmt'); if (stm) stm.onclick = () => printCustomerStatement(cid);
  const wa = $('#ldWa'); if (wa) wa.onclick = () => {
    const c = DB.get('customers', cid);
    whatsappShare(c.phone, 'Assalam-o-Alaikum ' + c.name + ',\nAap ke account ka hisaab:\n' +
      'Total Wash: ' + fmtKg(acc.kgTotal) + '\nTotal Amount: ' + fmtMoney(acc.amount) +
      '\nReceived: ' + fmtMoney(acc.paid) + '\nBalance Due: ' + fmtMoney(acc.balance) + ' (' + fmtKg(acc.kgBalance) + ')' +
      '\n\nShukriya — ' + DB.settings().shopName);
    toast('WhatsApp khul raha hai…', 'info');
  };
  $$('[data-pay]', el).forEach(b => b.onclick = () => openPaymentForm(b.dataset.pay));
  $('#recvExport').onclick = () => exportCSV('receivables-' + todayISO() + '.csv',
    ['Customer', 'Phone', 'Total KG', 'Billed', 'Paid', 'Balance', 'Balance KG', 'Advance'],
    dueList.map(x => [x.c.name, x.c.phone, x.a.kgTotal, x.a.amount, x.a.paid, x.a.balance, x.a.kgBalance, x.a.advance]));
  $('#recvPrint').onclick = () => {
    const body = `${printHeader(DB.settings(), 'RECEIVABLE REPORT')}
      <div class="pr-title">CUSTOMER-WISE BALANCE REPORT — ${esc(fmtDateLong(todayISO()))}</div>
      <table class="pr-tbl"><thead><tr><th>#</th><th>Customer</th><th class="r">Total KG</th><th class="r">Billed</th>
        <th class="r">Paid</th><th class="r">Balance</th><th class="r">Bal KG</th></tr></thead>
      <tbody>${dueList.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.c.name)}</td><td class="r">${fmtNum(x.a.kgTotal, 1)}</td>
        <td class="r">${fmtNum(x.a.amount)}</td><td class="r">${fmtNum(x.a.paid)}</td><td class="r"><b>${fmtNum(x.a.balance)}</b></td>
        <td class="r">${fmtNum(x.a.kgBalance, 1)}</td></tr>`).join('')}
      <tr><td colspan="5"><b>TOTAL</b></td><td class="r"><b>${fmtNum(round2(dueList.reduce((a, x) => a + x.a.balance, 0)))}</b></td>
        <td class="r"><b>${fmtNum(round1(dueList.reduce((a, x) => a + x.a.kgBalance, 0)), 1)}</b></td></tr></tbody></table>
      <div class="pr-foot"><div class="small">${esc(DB.settings().shopName)}</div><div class="sign">Authorised Signature</div></div>`;
    printHTML('Receivables', body, { size: 'a4' });
  };
}

/* ============================================================
   PAYMENT FORM — Amount ya KG se (FIFO allocation)
   ============================================================ */
function openPaymentForm(customerId, opts) {
  const o = opts || {};
  const cid = customerId || LedgerUI.customerId;
  if (!cid) { toast('Pehle customer select karein', 'error'); return; }
  const c = DB.get('customers', cid);
  let acc = Biz.customerAccount(cid);
  let mode = 'amount'; // amount | kg
  const dueList = Biz.dueSales(cid);
  const mix = acc.rateMix || [];
  // default rate = sab se purane pending bill ka rate (FIFO mein pehle wahi lagta hai)
  const defRate = dueList.length ? (num(dueList[0].rate) || Biz.rate()) : Biz.rate();

  const body = `
    <div class="note-box info tiny mb10">
      <b>${esc(c.name)}</b> · ${mix.length
        ? 'Bills ka rate: ' + mix.map(m => '<b>' + fmtMoney(m.rate) + '</b>').join(' + ') + ' /kg'
        : 'Rate <b>' + fmtMoney(Biz.rate()) + '/kg</b>'}<br>
      Total received: <b>${fmtKg(acc.kgTotal)}</b> (${fmtMoney(acc.amount)}) ·
      Paid: <b>${fmtMoney(acc.paid)}</b> (${fmtKg(acc.kgPaid)}) ·
      <b class="${acc.balance > 0.009 ? 't-bad' : 't-ok'}">Balance: ${fmtMoney(acc.balance)} (${fmtKg(acc.kgBalance)})</b>
      ${acc.advance > 0 ? ' · Advance: <b>' + fmtMoney(acc.advance) + '</b>' : ''}
      ${mix.length > 1 ? '<div style="margin-top:4px">⚠️ Pending bills <b>2 alag rate</b> par hain (' +
          mix.map(m => fmtMoney(m.rate) + ' × ' + fmtKg(m.kg)).join(' · ') + ') — neeche <b>rate</b> khud check kar lein.</div>' : ''}
    </div>

    <div class="grid g3" style="align-items:end">
      <label class="fld mb0"><span>Payment Date</span><input type="date" class="inp" id="pfDate" value="${todayISO()}"/></label>
      <label class="fld mb0"><span>Mode</span><select class="inp" id="pfMode">
        ${['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="fld mb0"><span>Ref / Cheque No.</span><input class="inp" id="pfRef" placeholder="optional"/></label>
    </div>

    <div class="row mt14" style="gap:8px">
      <button class="seg-btn on" id="pmAmount" data-pm="amount">💵 Amount se</button>
      <button class="seg-btn" id="pmKg" data-pm="kg">⚖️ KG se (kitne KG delivered)</button>
    </div>

    <div class="tiny muted" style="margin-top:-6px">Purani payment record kar rahe hain? <b>Date</b> bhi asli (purani) rakhein.</div>

    <div class="grid g3 mt10" style="gap:10px;align-items:end">
      <label class="fld mb0"><span id="pfAmtLbl">Amount Received (Rs) <b class="req">*</b></span>
        <input type="number" step="1" class="inp" id="pfAmount" placeholder="0"/></label>
      <label class="fld mb0"><span>Kis rate par? (Rs / kg) <b class="req">*</b></span>
        <input type="number" step="1" min="1" class="inp t-right" id="pfRate" value="${num(defRate)}"/></label>
      <label class="fld mb0"><span id="pfKgLbl">Equivalent KG (auto)</span>
        <input type="number" step="0.1" class="inp" id="pfKg" placeholder="0.0"/></label>
    </div>
    <div class="row" style="gap:8px;margin-top:-6px">
      <button class="btn btn-ghost btn-xs" data-quick="balance">Poora balance (${fmtMoney(acc.balance)})</button>
      <button class="btn btn-ghost btn-xs" data-quick="half">Aadha (50%)</button>
      <button class="btn btn-ghost btn-xs" data-quick="kg">Baaki KG (${fmtKg(acc.kgBalance)})</button>
    </div>
    <div class="tiny muted" id="pfRateHint" style="margin-top:6px"></div>
    ${mix.length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px" id="pfRateChips">
      <span class="tiny muted" style="align-self:center">Pending bill ka rate:</span>
      ${mix.map(m => `<button class="btn btn-ghost btn-xs" data-prate="${num(m.rate)}">Rs. ${num(m.rate)} · ${fmtKg(m.kg)} baqi${m.count > 1 ? ' (' + m.count + ' bill)' : ''}</button>`).join('')}
    </div>` : ''}

    <label class="fld mt10"><span>Note</span>
      <textarea class="inp" id="pfNote" placeholder="e.g. Half payment received — baqi agle bill mein">${o.note || ''}</textarea></label>

    <div class="card card-flat"><div class="card-head"><h3>🔎 Allocation Preview (FIFO — pehle purane bill)</h3></div>
      <div class="tbl-wrap"><table class="tbl" style="min-width:560px">
        <thead><tr><th>Invoice</th><th>Date</th><th class="t-right">Bill</th><th class="t-right">Pending</th>
          <th class="t-right">Ye payment lagegi</th><th class="t-right">Baqi rahega</th></tr></thead>
        <tbody id="pfPreview"></tbody>
      </table></div>
      <div class="card-body tiny dim" id="pfPreviewNote"></div>
    </div>`;

  const w = openModal({
    title: '💵 Receive Payment — ' + c.name, size: 'lg', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-ghost" id="pfSavePrint">💾 Save + Print Receipt</button>
             <button class="btn btn-success" id="pfSave">💾 Save Payment</button>`
  });

  const amtEl = $('#pfAmount', w), kgEl = $('#pfKg', w), rateEl = $('#pfRate', w);
  const payRate = () => num(rateEl && rateEl.value) || Biz.rate();
  let lastEdit = 'amount';   // rate badalne par wahi field sync hoti hai jo user ne bhara tha

  const rateHint = () => {
    const el = $('#pfRateHint', w); if (!el) return;
    const r = round2(payRate());
    if (!dueList.length) { el.innerHTML = 'Is customer ka koi pending bill nahi — yeh payment <b>advance</b> banegi.'; return; }
    const old = dueList[0];
    const oldRate = round2(num(old.rate) || Biz.rate());
    const same = dueList.filter(s => round2(num(s.rate) || Biz.rate()) === r).length;
    el.innerHTML = (r === oldRate
      ? '✓ Sahi rate — sab se purana pending bill <b>' + esc(old.invoiceNo) + '</b> (' + fmtDate(old.entryDate) + ') isi rate par hai.'
      : '⚠️ Sab se purana pending bill <b>' + esc(old.invoiceNo) + '</b> (' + fmtDate(old.entryDate) + ') ka rate <b>' + fmtMoney(oldRate) + '/kg</b> hai — payment usi rate se convert honi chahiye.')
      + (same ? ' · Is rate par <b>' + same + '</b> bill pending.' : '');
  };

  function preview() {
    const amount = round2(num(amtEl.value));
    const due = Biz.dueSales(cid);
    let left = amount, kgTaken = 0;
    const rows = due.map(s => {
      const take = round2(Math.min(left, s._due));
      left = round2(left - take);
      kgTaken = round1(kgTaken + round1(take / (num(s.rate) || payRate())));
      return `<tr>
        <td class="t-strong">${esc(s.invoiceNo)}</td><td class="tiny">${fmtDate(s.entryDate)}</td>
        <td class="t-right">${fmtMoney(s._amount)}</td>
        <td class="t-right t-bad">${fmtMoney(s._due)}<div class="tiny muted">${fmtKg(s._kgDue)}</div></td>
        <td class="t-right ${take > 0 ? 't-ok' : 't-muted'}">${take > 0 ? fmtMoney(take) + '<div class="tiny">' + fmtKg(round1(take / (num(s.rate) || payRate()))) + '</div>' : '—'}</td>
        <td class="t-right">${fmtMoney(round2(s._due - take))}<div class="tiny muted">${fmtKg(round1((s._due - take) / (num(s.rate) || payRate())))}</div></td>
      </tr>`;
    }).join('');
    $('#pfPreview', w).innerHTML = rows || emptyRow(6, 'Koi pending bill nahi — yeh advance ho jayega', '✅');
    const balAfter = round2(Math.max(0, acc.balance - amount));
    const advAfter = round2(Math.max(0, amount - acc.balance));
    const kgAfter = round1(Math.max(0, acc.kgBalance - kgTaken));
    $('#pfPreviewNote', w).innerHTML = amount > 0
      ? `Is payment se <b>${fmtKg(kgTaken)}</b> cover hogi (har bill apne rate par) · ` +
      `Baqi: <b class="${balAfter > 0 ? 't-bad' : 't-ok'}">${fmtMoney(balAfter)} (${fmtKg(kgAfter)})</b>` +
      (advAfter > 0 ? ` · <b>Advance ${fmtMoney(advAfter)}</b> (next bill mein adjust hoga)` : '') +
      ` · Total paid ho jayega: <b>${fmtMoney(round2(acc.paid + amount))}</b>`
      : 'Amount ya KG likhein — allocation yahan show hoga.';
  }

  function setMode(m) {
    mode = m;
    $('#pmAmount', w).classList.toggle('on', m === 'amount');
    $('#pmKg', w).classList.toggle('on', m === 'kg');
    if (m === 'kg') {
      lastEdit = 'kg';
      amtEl.value = round2(num(kgEl.value) * payRate()) || '';
      $('#pfKgLbl', w).innerHTML = 'Kitne KG ka payment? <b class="req">*</b>';
      $('#pfAmtLbl', w).textContent = 'Equivalent Amount (auto)';
    } else {
      lastEdit = 'amount';
      kgEl.value = round1(num(amtEl.value) / payRate()) || '';
      $('#pfAmtLbl', w).innerHTML = 'Amount Received (Rs) <b class="req">*</b>';
      $('#pfKgLbl', w).textContent = 'Equivalent KG (auto)';
    }
    preview();
  }
  $$('[data-pm]', w).forEach(b => b.onclick = () => setMode(b.dataset.pm));
  amtEl.oninput = () => { lastEdit = 'amount'; kgEl.value = round1(num(amtEl.value) / payRate()) || ''; preview(); };
  kgEl.oninput = () => { lastEdit = 'kg'; amtEl.value = round2(num(kgEl.value) * payRate()) || ''; preview(); };
  const applyRate = () => {
    if (lastEdit === 'kg') amtEl.value = round2(num(kgEl.value) * payRate()) || '';
    else kgEl.value = round1(num(amtEl.value) / payRate()) || '';
    rateHint(); preview();
  };
  if (rateEl) rateEl.oninput = applyRate;
  $$('[data-prate]', w).forEach(b => b.onclick = () => { if (rateEl) rateEl.value = num(b.dataset.prate); applyRate(); });
  $$('[data-quick]', w).forEach(b => b.onclick = () => {
    const q = b.dataset.quick;
    // poora balance / baaki KG — exact values (mix rate ho to bhi theek, kyunki FIFO se aate hain)
    if (q === 'balance') { amtEl.value = round2(acc.balance); kgEl.value = round1(acc.kgBalance); }
    if (q === 'half') { amtEl.value = round2(acc.balance / 2); kgEl.value = round1(acc.kgBalance / 2); }
    if (q === 'kg') { kgEl.value = round1(acc.kgBalance); amtEl.value = round2(acc.balance); }
    preview();
  });
  rateHint();

  // if opened from a specific sale, pre-fill that sale's due
  if (o.saleId) {
    const s = DB.get('sales', o.saleId);
    const row = acc.saleRows.find(x => x.id === o.saleId);
    if (row && row._due > 0) {
      amtEl.value = row._due;
      if (rateEl) rateEl.value = num(s.rate) || Biz.rate();
      kgEl.value = round1(row._due / (num(s.rate) || payRate()));
      rateHint();
    }
  }
  preview();

  const save = (printAfter) => {
    const amount = round2(num(amtEl.value));
    const kg = round1(num(kgEl.value));
    if (amount <= 0 && kg <= 0) return toast('Amount ya KG enter karein', 'error');
    const res = Biz.collectPayment({
      customerId: cid,
      amount: mode === 'kg' ? 0 : amount,
      kg: mode === 'kg' ? kg : null,
      rate: payRate(),
      date: $('#pfDate', w).value || todayISO(),
      mode: $('#pfMode', w).value,
      ref: $('#pfRef', w).value,
      note: $('#pfNote', w).value
    });
    if (!res.ok) return toast(res.msg, 'error');
    const shownKg = mode === 'kg' ? kg : (res.totalKg || round1(amount / payRate()));
    toast('✔ ' + fmtMoney(res.totalAmount) + ' (' + fmtKg(shownKg) + ') receive ho gaya · Balance ' + fmtMoney(res.balance), 'success', 4200);
    closeModal(w);
    if (printAfter) printPaymentReceipt(res.records[0] ? res.records[0].id : null, res);
    refreshCurrent();
  };
  $('#pfSave', w).onclick = () => save(false);
  $('#pfSavePrint', w).onclick = () => save(true);
}

/* ============================================================
   PAYMENT RECEIPT PRINT
   ============================================================ */
function printPaymentReceipt(paymentId, res) {
  const shop = DB.settings();
  const p = paymentId ? DB.get('payments', paymentId) : null;
  const cid = p ? p.customerId : (res && res.records[0] ? res.records[0].customerId : '');
  const acc = Biz.customerAccount(cid);
  const payRateShown = num(p && p.rate) || num(res && res.records[0] && res.records[0].rate) || Biz.rate();
  const paper = printSizeFor('receipt');
  const body = `
    ${printSlipHeader(shop, 'PAYMENT RECEIPT')}
    <div class="pr-title">PAYMENT RECEIPT</div>
    <div class="pr-meta">
      <div><b>${esc(Biz.customerName(cid))}</b><br>${esc((DB.get('customers', cid) || {}).phone || '')}</div>
      <div style="text-align:right">Receipt No: <b>${esc(p ? (p.no || '') : '')}</b><br>Date: <b>${fmtDate(p ? p.date : todayISO())}</b><br>
        Mode: <b>${esc(p ? p.mode : '')}</b></div>
    </div>
    <table class="pr-tot">
      <tr><td>Amount Received</td><td class="r"><b>${fmtMoney(p ? p.amount : (res ? res.totalAmount : 0))}</b></td></tr>
      <tr><td>Equivalent Wash KG @ ${fmtMoney(payRateShown)}/kg</td><td class="r"><b>${fmtKg(res ? res.totalKg : (p ? p.kgCovered : 0))}</b></td></tr>
      <tr><td>Total Wash Received (all time)</td><td class="r">${fmtKg(acc.kgTotal)}</td></tr>
      <tr><td>Total Paid (all time)</td><td class="r">${fmtMoney(acc.paid)} = ${fmtKg(acc.kgPaid)}</td></tr>
      <tr class="grand"><td>BALANCE DUE (${fmtKg(acc.kgBalance)})</td><td class="r">${fmtMoney(acc.balance)}</td></tr>
      ${acc.advance > 0 ? `<tr><td>Advance / extra received</td><td class="r">${fmtMoney(acc.advance)}</td></tr>` : ''}
    </table>
    ${res && res.appliedTo && res.appliedTo.length ? `
      <table class="pr-tbl" style="margin-top:10px"><thead><tr><th>Invoice</th><th class="r">Pehle due</th><th class="r">Ye payment</th><th class="r">Baqi</th></tr></thead>
      <tbody>${res.appliedTo.map(a => `<tr><td>${esc(a.saleNo)}</td>
        <td class="r">${fmtMoney(a.prevDueAmt)} <span class="small">(${fmtKg(a.prevDueKg)})</span></td>
        <td class="r">${fmtMoney(a.amount)} <span class="small">(${fmtKg(a.kg)})</span></td>
        <td class="r">${fmtMoney(round2(a.prevDueAmt - a.amount))}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="words">Amount in words: <b>${esc(amountInWords(p ? p.amount : (res ? res.totalAmount : 0)))}</b></div>
    <div class="pr-foot"><div class="small">Shukriya! Baqi balance ka hisaab agle bill mein continue hoga.</div>
      <div class="sign">Received By</div></div>`;
  printHTML('Receipt', body, { size: paper });
}

/* ============================================================
   WEEKLY / CUSTOM-DATE CONSOLIDATED INVOICE
   ============================================================ */
function openWeeklyInvoice(customerId) {
  const c = DB.get('customers', customerId);
  const defFrom = addDays(todayISO(), -6);
  const body = `
    <div class="note-box info tiny mb10">Ek hafte (ya kisi bhi date range) ki saari wash entries ka consolidated bill — KG, rate, total aur balance ke sath.</div>
    <div class="grid g3">
      <label class="fld"><span>From</span><input type="date" class="inp" id="wkFrom" value="${defFrom}"/></label>
      <label class="fld"><span>To</span><input type="date" class="inp" id="wkTo" value="${todayISO()}"/></label>
      <label class="fld"><span>Rate / KG</span><input type="number" class="inp" id="wkRate" value="${Biz.rate()}"/></label>
    </div>
    <label class="row small" style="gap:8px"><input type="checkbox" id="wkPrev" checked/> Purana balance bhi include karein</label>
    <label class="row small mt6" style="gap:8px"><input type="checkbox" id="wkPays" checked/> Is arse ki payments bhi show karein</label>
    <div id="wkPreview" class="mt14"></div>`;

  const w = openModal({
    title: '🗓️ Weekly / Range Invoice — ' + c.name, size: 'lg', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-ghost" id="wkThermal">🧾 Thermal</button>
             <button class="btn btn-primary" id="wkPrint">🖨️ Print Invoice</button>`
  });

  function compute() {
    const from = $('#wkFrom', w).value, to = $('#wkTo', w).value, rate = num($('#wkRate', w).value) || Biz.rate();
    const sales = Biz.sales().filter(s => s.customerId === customerId && s.entryDate >= from && s.entryDate <= to)
      .sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate)));
    const pays = Biz.payments().filter(p => p.customerId === customerId && p.date >= from && p.date <= to);
    const kg = round1(sales.reduce((a, s) => a + Biz.saleKg(s), 0));
    const amount = round2(kg * rate);
    const acc = Biz.customerAccount(customerId);
    const paid = round2(pays.reduce((a, p) => a + num(p.amount), 0));
    return { from, to, rate, sales, pays, kg, amount, acc, paid };
  }

  function paint() {
    const v = compute();
    $('#wkPreview', w).innerHTML = `
      <div class="kv"><span>Entries in range</span><b>${v.sales.length}</b></div>
      <div class="kv"><span>Total KG</span><b>${fmtKg(v.kg)}</b></div>
      <div class="kv"><span>Rate</span><b>${fmtMoney(v.rate)} / kg</b></div>
      <div class="kv total"><span>Range Amount</span><b>${fmtMoney(v.amount)}</b></div>
      <div class="kv"><span>Purana balance (is range se pehle)</span><b>${fmtMoney(round2(v.acc.balance - (v.acc.saleRows.filter(s => s.entryDate >= v.from && s.entryDate <= v.to).reduce((a, s) => a + s._due, 0))))}</b></div>
      <div class="kv"><span>Is range mein received</span><b class="t-ok">${fmtMoney(v.paid)}</b></div>
      <div class="kv"><span>Account balance (live)</span><b class="${v.acc.balance > 0.009 ? 't-bad' : 't-ok'}">${fmtMoney(v.acc.balance)} (${fmtKg(v.acc.kgBalance)})</b></div>
      <div class="tbl-wrap mt10"><table class="tbl" style="min-width:520px">
        <thead><tr><th>Invoice</th><th>Date</th><th class="t-right">KG</th><th class="t-right">Amount</th></tr></thead>
        <tbody>${v.sales.length ? v.sales.map(s => `<tr><td>${esc(s.invoiceNo)}</td><td>${fmtDate(s.entryDate)}</td>
          <td class="t-right">${fmtKg(s.kgTotal)}</td><td class="t-right">${fmtMoney(round2(Biz.saleKg(s) * v.rate))}</td></tr>`).join('')
        : emptyRow(4, 'Is range mein koi entry nahi', '📭')}</tbody>
      </table></div>`;
  }
  ['wkFrom', 'wkTo', 'wkRate'].forEach(id => { const e = $('#' + id, w); if (e) e.onchange = paint; });
  paint();

  const doPrint = (size) => {
    const v = compute();
    const shop = DB.settings();
    const prevBal = round2(v.acc.balance - v.acc.saleRows.filter(s => s.entryDate >= v.from && s.entryDate <= v.to).reduce((a, s) => a + s._due, 0));
    const prevKg = round1(v.acc.kgBalance - v.acc.saleRows.filter(s => s.entryDate >= v.from && s.entryDate <= v.to).reduce((a, s) => a + s._kgDue, 0));
    const includePrev = $('#wkPrev', w).checked;
    const includePays = $('#wkPays', w).checked;
    const totalPayable = round2(v.amount + (includePrev ? prevBal : 0));
    const netDue = round2(v.acc.balance);
    const bodyHtml = `
      ${printHeader(shop, 'WEEKLY INVOICE')}
      <div class="pr-title">CONSOLIDATED WASH INVOICE (PER KG)</div>
      <div class="pr-meta">
        <div><b>Bill To:</b><br>${esc(c.name)}<br>${esc(c.phone || '')}<br>${esc(c.address || '')}</div>
        <div style="text-align:right">Period: <b>${fmtDate(v.from)} → ${fmtDate(v.to)}</b><br>
          Invoice Date: <b>${fmtDate(todayISO())}</b><br>Rate: <b>${fmtMoney(v.rate)} / KG</b></div>
      </div>
      <table class="pr-tbl">
        <thead><tr><th style="width:26px">#</th><th>Invoice No</th><th class="c">Invoice Date</th><th class="c">Delivery Date</th>
          <th>Items</th><th class="r">KG</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${v.sales.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.invoiceNo)}</td>
          <td class="c">${fmtDate(s.entryDate)}</td><td class="c">${s.deliveryDate ? fmtDate(s.deliveryDate) : '—'}</td>
          <td class="small">${esc(Biz.saleItemsSummary(s))}</td>
          <td class="r">${fmtNum(s.kgTotal, 1)}</td><td class="r">${fmtNum(v.rate)}</td>
          <td class="r">${fmtNum(round2(Biz.saleKg(s) * v.rate))}</td></tr>`).join('')}</tbody>
      </table>
      <table class="pr-tot">
        <tr><td>Total Weight (is period)</td><td class="r"><b>${fmtKg(v.kg)}</b></td></tr>
        <tr><td>Wash Charges @ ${fmtMoney(v.rate)}/KG</td><td class="r"><b>${fmtMoney(v.amount)}</b></td></tr>
        ${includePrev && prevBal > 0.009 ? `<tr><td>Previous Balance (${fmtKg(prevKg)})</td><td class="r">${fmtMoney(prevBal)}</td></tr>` : ''}
        <tr class="grand"><td>TOTAL PAYABLE</td><td class="r">${fmtMoney(totalPayable)}</td></tr>
      </table>
      ${includePays ? `<table class="pr-tbl" style="margin-top:10px"><thead><tr><th>Payments received (is period)</th><th class="c">Date</th><th class="r">Amount</th><th class="r">KG covered</th></tr></thead>
        <tbody>${v.pays.length ? v.pays.map(p => `<tr><td>${esc(p.no || '')}</td><td class="c">${fmtDate(p.date)}</td>
          <td class="r">${fmtNum(p.amount)}</td><td class="r">${fmtNum(p.kgCovered, 1)}</td></tr>`).join('')
        : '<tr><td colspan="4" class="c">Koi payment nahi aayi</td></tr>'}
        <tr><td><b>Total Received</b></td><td></td><td class="r"><b>${fmtNum(v.paid)}</b></td><td class="r"><b>${fmtNum(round1(v.paid / v.rate), 1)}</b></td></tr></tbody></table>` : ''}
      <table class="pr-tot">
        <tr><td>Total KG Received (all time)</td><td class="r">${fmtKg(v.acc.kgTotal)}</td></tr>
        <tr><td>Total Paid till date</td><td class="r">${fmtMoney(v.acc.paid)} = ${fmtKg(v.acc.kgPaid)}</td></tr>
        <tr class="grand"><td>NET BALANCE DUE — ${fmtKg(v.acc.kgBalance)} ka hisaab</td><td class="r">${fmtMoney(netDue)}</td></tr>
      </table>
      <div class="words">Amount in words: <b>${esc(amountInWords(netDue > 0 ? netDue : totalPayable))}</b></div>
      <div class="pr-foot"><div class="small">${esc(shop.invoiceTerms || '')}</div><div class="sign">Authorised Signature</div></div>`;
    printHTML('Weekly Invoice ' + c.name, bodyHtml, { size: size || 'a4' });
  };
  $('#wkPrint', w).onclick = () => doPrint('a4');
  $('#wkThermal', w).onclick = () => doPrint('thermal');
}
