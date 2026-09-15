/* ============================================================
   REPORTS — Profit/Loss, KG, customer, expense, delivery
   Period: Today / Month / Custom / All  ·  Print + CSV export
   ============================================================ */

let RepUI = { tab: 'pl', customerId: '' };

function renderReports() {
  UI.renderLayout('reports', `<div id="repBody"></div>`);
  reportsPaint();
}

function reportsPaint() {
  const el = $('#repBody');
  if (!el) return;
  const m = Biz.metrics(Period);
  const tabs = [
    ['pl', '🧮 Profit &amp; Loss'],
    ['kg', '⚖️ KG / Category'],
    ['cust', '👥 Customer-wise'],
    ['exp', '💸 Expenses'],
    ['del', '🚚 Delivery & Pending'],
    ['pay', '💵 Collections']
  ];
  el.innerHTML = `
    ${Period.bar()}
    <div class="tabs" id="repTabs">
      ${tabs.map(t => `<button class="tab ${RepUI.tab === t[0] ? 'on' : ''}" data-rtab="${t[0]}">${t[1]}</button>`).join('')}
    </div>
    <div id="repPane"></div>`;

  Period.bind(el, reportsPaint);
  $$('[data-rtab]', el).forEach(b => b.onclick = () => { RepUI.tab = b.dataset.rtab; reportsPaint(); });

  const pane = $('#repPane');
  const sumCards = `
    <div class="stats">
      ${UI.statCard({ icon: '⚖️', label: 'Received KG', value: fmtKg(m.receivedKg), foot: m.newEntries + ' entries', tone: 'info' })}
      ${UI.statCard({ icon: '📦', label: 'Delivered KG', value: fmtKg(m.deliveredKg), foot: m.deliveredCount + ' orders', tone: 'good' })}
      ${UI.statCard({ icon: '💰', label: 'Income', value: fmtMoney(m.income), tone: 'good' })}
      ${UI.statCard({ icon: '💸', label: 'Total Expenses', value: fmtMoney(m.totalExpenses), tone: 'bad' })}
      ${UI.statCard({ icon: m.profit >= 0 ? '📈' : '📉', label: 'Profit / Loss', value: fmtMoney(m.profit), tone: m.profit >= 0 ? 'good' : 'bad' })}
      ${UI.statCard({ icon: '💵', label: 'Collected', value: fmtMoney(m.collected), tone: 'purple' })}
    </div>`;

  if (RepUI.tab === 'pl') {
    const series = Biz.dailySeries(Period);
    pane.innerHTML = `${sumCards}
      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>🧮 Profit &amp; Loss — ${esc(Period.label())}</h3><div class="sp"></div>
            <button class="btn btn-ghost btn-sm" id="plPrint">🖨️ Print</button>
            <button class="btn btn-ghost btn-sm" id="plCsv">⬇️ CSV</button></div>
          <div class="card-body">
            <div class="kv"><span>Wash Income (billed KG × rate)</span><b class="t-ok">${fmtMoney(m.income)}</b></div>
            <div class="kv"><span>Avg rate realised</span><b>${fmtMoney(m.avgRate)} / kg</b></div>
            <div class="kv"><span>− Factory Expenses</span><b class="t-bad">${fmtMoney(m.expenses)}</b></div>
            <div class="kv"><span>− Purchases</span><b class="t-bad">${fmtMoney(m.purchases)}</b></div>
            <div class="kv"><span>− Salaries</span><b class="t-bad">${fmtMoney(m.salaries)}</b></div>
            <div class="kv total"><span>Net ${m.profit >= 0 ? 'Profit' : 'Loss'}</span><b class="${m.profit >= 0 ? 't-ok' : 't-bad'}">${fmtMoney(m.profit)}</b></div>
            <div class="kv"><span>Profit per KG</span><b>${fmtMoney(m.receivedKg ? round2(m.profit / m.receivedKg) : 0)}</b></div>
            <div class="kv"><span>Owner Drawings (cash out, not expense)</span><b>${fmtMoney(m.drawings)}</b></div>
            <div class="kv"><span>Cash in hand (period movement)</span><b class="${m.cashInHand >= 0 ? 't-ok' : 't-bad'}">${fmtMoney(m.cashInHand)}</b></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>📈 Last 6 months</h3></div>
          <div class="card-body">${UI.barChart(Biz.monthlySeries(6), { height: 150 })}
            <div class="divider"></div>
            ${UI.progressRows(Biz.monthlySeries(6).slice().reverse().map(r => ({
      label: r.label, value: r.kg, color: '#4f7cff', note: fmtKg(r.kg) + ' · ' + fmtMoneyShort(r.profit)
    })))}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>📅 Daily Breakdown — ${esc(Period.label())}</h3></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:640px">
            <thead><tr><th>Date</th><th class="t-right">KG Received</th><th class="t-right">Income</th>
              <th class="t-right">Expenses</th><th class="t-right">Net</th></tr></thead>
            <tbody>${series.length ? series.map(d => `<tr>
              <td class="t-nowrap">${fmtDate(d.date)}</td>
              <td class="t-right">${fmtKg(d.kg)}</td>
              <td class="t-right t-ok">${fmtMoney(d.income)}</td>
              <td class="t-right t-bad">${fmtMoney(d.expenses)}</td>
              <td class="t-right ${d.income - d.expenses >= 0 ? 't-ok' : 't-bad'}">${fmtMoney(round2(d.income - d.expenses))}</td>
            </tr>`).join('') : emptyRow(5, 'Is period mein koi activity nahi', '📭')}</tbody>
            ${series.length ? `<tfoot><tr><td>TOTAL</td><td class="t-right">${fmtKg(series.reduce((a, d) => a + d.kg, 0))}</td>
              <td class="t-right">${fmtMoney(round2(series.reduce((a, d) => a + d.income, 0)))}</td>
              <td class="t-right">${fmtMoney(round2(series.reduce((a, d) => a + d.expenses, 0)))}</td>
              <td class="t-right">${fmtMoney(round2(series.reduce((a, d) => a + d.income - d.expenses, 0)))}</td></tr></tfoot>` : ''}
          </table>
        </div>
      </div>`;
    $('#plPrint').onclick = () => printMonthReport();
    $('#plCsv').onclick = () => exportCSV('profit-loss-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
      ['Date', 'KG', 'Income', 'Expenses', 'Net'], series.map(d => [d.date, d.kg, d.income, d.expenses, round2(d.income - d.expenses)]));
  }

  if (RepUI.tab === 'kg') {
    const sales = Biz.salesIn(Period);
    const byProduct = {};
    sales.forEach(s => (s.lines || []).forEach(l => {
      const key = ((Biz.product(l.productId) || {}).name || l.productName || 'Item') + ' [' + (l.category || '-') + ']';
      byProduct[key] = byProduct[key] || { kg: 0, pcs: 0, amount: 0, count: 0 };
      byProduct[key].kg = round1(byProduct[key].kg + num(l.qtyKg));
      byProduct[key].pcs += num(l.pcs);
      byProduct[key].amount = round2(byProduct[key].amount + num(l.qtyKg) * Biz.saleRate(s));
      byProduct[key].count++;
    }));
    const keys = Object.keys(byProduct).sort((a, b) => byProduct[b].kg - byProduct[a].kg);
    pane.innerHTML = `${sumCards}
      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>⚖️ Item-wise KG Report</h3><div class="sp"></div>
            <button class="btn btn-ghost btn-sm" id="kgCsv">⬇️ CSV</button></div>
          <div class="tbl-wrap">
            <table class="tbl" style="min-width:640px">
              <thead><tr><th>Item</th><th class="t-right">KG</th><th class="t-right">Pieces</th><th class="t-center">Times</th><th class="t-right">Amount</th></tr></thead>
              <tbody>${keys.length ? keys.map(k => `<tr><td class="t-strong">${esc(k)}</td><td class="t-right">${fmtKg(byProduct[k].kg)}</td>
                <td class="t-right">${fmtNum(byProduct[k].pcs)}</td><td class="t-center">${fmtNum(byProduct[k].count)}</td>
                <td class="t-right">${fmtMoney(byProduct[k].amount)}</td></tr>`).join('') : emptyRow(5, 'Koi data nahi', '📭')}</tbody>
              <tfoot><tr><td>TOTAL</td><td class="t-right">${fmtKg(m.receivedKg)}</td><td class="t-right">${fmtNum(m.receivedPcs)}</td>
                <td></td><td class="t-right">${fmtMoney(m.income)}</td></tr></tfoot>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>🏷️ Category Split</h3></div>
          <div class="card-body">${UI.catDonut(m.catKg)}</div>
        </div>
      </div>`;
    $('#kgCsv').onclick = () => exportCSV('kg-report-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
      ['Item', 'KG', 'Pieces', 'Times', 'Amount'], keys.map(k => [k, byProduct[k].kg, byProduct[k].pcs, byProduct[k].count, byProduct[k].amount]));
  }

  if (RepUI.tab === 'cust') {
    const rows = DB.all('customers').map(c => {
      const a = Biz.customerAccount(c.id);
      const period = Biz.salesIn(Period).filter(s => s.customerId === c.id);
      return {
        c, a, pKg: round1(period.reduce((x, s) => x + Biz.saleKg(s), 0)),
        pAmt: round2(period.reduce((x, s) => x + Biz.saleAmount(s), 0)),
        pPaid: round2(Biz.paymentsIn(Period).filter(p => p.customerId === c.id).reduce((x, p) => x + num(p.amount), 0))
      };
    }).sort((a, b) => b.pKg - a.pKg);
    const withActivity = rows.filter(r => r.pKg > 0 || r.pPaid > 0 || r.a.balance > 0);
    pane.innerHTML = `${sumCards}
      <div class="card">
        <div class="card-head"><h3>👥 Customer-wise Report — ${esc(Period.label())}</h3><div class="sp"></div>
          <button class="btn btn-ghost btn-sm" id="cuCsv">⬇️ CSV</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:960px">
            <thead><tr><th>Customer</th><th class="t-right">KG (period)</th><th class="t-right">Billed (period)</th><th class="t-right">Paid (period)</th>
              <th class="t-right">Total KG</th><th class="t-right">Total Billed</th><th class="t-right">Total Paid</th>
              <th class="t-right">Balance</th><th class="t-right">Bal KG</th><th class="t-center">Actions</th></tr></thead>
            <tbody>${withActivity.length ? withActivity.map(r => `<tr>
              <td class="t-strong">${esc(r.c.name)}</td>
              <td class="t-right">${fmtKg(r.pKg)}</td>
              <td class="t-right">${fmtMoney(r.pAmt)}</td>
              <td class="t-right t-ok">${fmtMoney(r.pPaid)}</td>
              <td class="t-right">${fmtKg(r.a.kgTotal)}</td>
              <td class="t-right">${fmtMoney(r.a.amount)}</td>
              <td class="t-right">${fmtMoney(r.a.paid)}</td>
              <td class="t-right ${r.a.balance > 0.009 ? 't-bad' : 't-ok'}"><b>${fmtMoney(r.a.balance)}</b></td>
              <td class="t-right">${fmtKg(r.a.kgBalance)}</td>
              <td class="t-center"><button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-rled="${r.c.id}">📒</button></td>
            </tr>`).join('') : emptyRow(10, 'Koi activity nahi', '📭')}</tbody>
          </table>
        </div>
      </div>`;
    $('#cuCsv').onclick = () => exportCSV('customer-report-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
      ['Customer', 'KG (period)', 'Billed (period)', 'Paid (period)', 'Total KG', 'Total Billed', 'Total Paid', 'Balance', 'Balance KG'],
      withActivity.map(r => [r.c.name, r.pKg, r.pAmt, r.pPaid, r.a.kgTotal, r.a.amount, r.a.paid, r.a.balance, r.a.kgBalance]));
    $$('[data-rled]', pane).forEach(b => b.onclick = () => app.go('ledger?customer=' + b.dataset.rled));
  }

  if (RepUI.tab === 'exp') {
    const exps = Biz.expensesIn(Period).concat(
      Biz.salariesIn(Period).map(s => ({ date: s.date, category: 'Salary — ' + s.employeeName, amount: s.amount, paidTo: s.employeeName, mode: s.mode, note: s.note, _t: 'salary' })),
      Biz.purchasesIn(Period).map(p => ({ date: p.date, category: 'Purchase — ' + (p.category || ''), amount: p.amount, paidTo: p.vendorName, mode: p.mode, note: p.details, _t: 'purchase' })
      )).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const total = round2(exps.reduce((a, e) => a + num(e.amount), 0));
    pane.innerHTML = `${sumCards}
      <div class="card">
        <div class="card-head"><h3>💸 Combined Expense Report (Expenses + Salary + Purchases)</h3><div class="sp"></div>
          <button class="btn btn-ghost btn-sm" id="exCsv">⬇️ CSV</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:760px">
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Paid To</th><th>Mode</th><th>Note</th><th class="t-right">Amount</th></tr></thead>
            <tbody>${exps.length ? exps.map(e => `<tr>
              <td class="t-nowrap">${fmtDate(e.date)}</td>
              <td><span class="tag">${e._t ? titleCase(e._t) : 'Expense'}</span></td>
              <td>${esc(e.category || '')}</td><td class="tiny">${esc(e.paidTo || '—')}</td>
              <td class="tiny">${esc(e.mode || '')}</td><td class="tiny">${esc(e.note || '')}</td>
              <td class="t-right t-bad">${fmtMoney(e.amount)}</td></tr>`).join('') : emptyRow(7, 'Koi kharcha nahi', '💤')}</tbody>
            <tfoot><tr><td colspan="6">TOTAL</td><td class="t-right">${fmtMoney(total)}</td></tr></tfoot>
          </table>
        </div>
      </div>`;
    $('#exCsv').onclick = () => exportCSV('expense-report-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
      ['Date', 'Type', 'Category', 'Paid To', 'Mode', 'Note', 'Amount'],
      exps.map(e => [e.date, e._t || 'expense', e.category, e.paidTo, e.mode, e.note, e.amount]));
  }

  if (RepUI.tab === 'del') {
    const pend = Biz.pendingWithAge();
    const del = Biz.deliveredIn(Period);
    pane.innerHTML = `${sumCards}
      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>🚚 Deliveries in ${esc(Period.shortLabel())}</h3><div class="sp"></div>
            <button class="btn btn-ghost btn-sm" id="dlCsv">⬇️ CSV</button></div>
          <div class="tbl-wrap">
            <table class="tbl" style="min-width:620px">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Received</th><th>Delivered</th><th class="t-right">KG</th><th class="t-center">Days</th></tr></thead>
              <tbody>${del.length ? del.map(s => `<tr>
                <td class="t-strong">${esc(s.invoiceNo)}</td><td>${esc(Biz.customerName(s.customerId))}</td>
                <td class="t-nowrap">${fmtDate(s.entryDate)}</td><td class="t-nowrap">${fmtDate(s.deliveryDate)}</td>
                <td class="t-right">${fmtKg(s.deliveredKg || s.kgTotal)}</td>
                <td class="t-center">${daysBetween(s.entryDate, s.deliveryDate)}</td></tr>`).join('') : emptyRow(6, 'Is period mein koi delivery nahi', '📭')}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>🏭 Currently Pending (${pend.length})</h3></div>
          <div class="tbl-wrap">
            <table class="tbl" style="min-width:420px">
              <thead><tr><th>Invoice</th><th>Customer</th><th class="t-right">Pending KG</th><th class="t-center">Age</th></tr></thead>
              <tbody>${pend.length ? pend.map(s => `<tr><td class="t-strong">${esc(s.invoiceNo)}</td><td class="tiny">${esc(Biz.customerName(s.customerId))}</td>
                <td class="t-right">${fmtKg(Biz.pendingKg(s))}</td>
                <td class="t-center"><span class="pill ${s.ageDays > 7 ? 'pill-due' : 'pill-muted'}">${s.ageDays}d</span></td></tr>`).join('')
        : emptyRow(4, 'Factory khali hai 🎉', '🎉')}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    $('#dlCsv').onclick = () => exportCSV('deliveries-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
      ['Invoice', 'Customer', 'Received', 'Delivered', 'KG', 'Days'],
      del.map(s => [s.invoiceNo, Biz.customerName(s.customerId), s.entryDate, s.deliveryDate, s.deliveredKg || s.kgTotal, daysBetween(s.entryDate, s.deliveryDate)]));
  }

  if (RepUI.tab === 'pay') {
    const pays = Biz.paymentsIn(Period).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const total = round2(pays.reduce((a, p) => a + num(p.amount), 0));
    const byMode = {};
    pays.forEach(p => { byMode[p.mode || 'Cash'] = round2((byMode[p.mode || 'Cash'] || 0) + num(p.amount)); });
    pane.innerHTML = `${sumCards}
      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>💵 Collection Report — ${esc(Period.label())}</h3><div class="sp"></div>
            <button class="btn btn-ghost btn-sm" id="pyCsv">⬇️ CSV</button></div>
          <div class="tbl-wrap">
            <table class="tbl" style="min-width:720px">
              <thead><tr><th>Date</th><th>Voucher</th><th>Customer</th><th>Against</th><th>Mode</th>
                <th class="t-right">Amount</th><th class="t-right">KG Covered</th><th>Note</th></tr></thead>
              <tbody>${pays.length ? pays.map(p => `<tr>
                <td class="t-nowrap">${fmtDate(p.date)}</td><td class="tiny">${esc(p.no || '')}</td>
                <td>${esc(Biz.customerName(p.customerId))}</td>
                <td class="tiny">${p.saleId ? esc((DB.get('sales', p.saleId) || {}).invoiceNo || '') : (p.isAdvance ? '<span class="pill pill-info">Advance</span>' : '—')}</td>
                <td class="tiny">${esc(p.mode || '')}</td>
                <td class="t-right t-ok"><b>${fmtMoney(p.amount)}</b></td>
                <td class="t-right">${fmtKg(p.kgCovered)}</td>
                <td class="tiny">${esc(p.note || '')}</td></tr>`).join('') : emptyRow(8, 'Is period mein koi payment nahi', '💤')}</tbody>
              <tfoot><tr><td colspan="5">TOTAL</td><td class="t-right">${fmtMoney(total)}</td>
                <td class="t-right">${fmtKg(round1(pays.reduce((a, p) => a + num(p.kgCovered), 0)))}</td><td></td></tr></tfoot>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>🏦 Mode-wise Collection</h3></div>
          <div class="card-body">${Object.keys(byMode).length ? UI.progressRows(Object.keys(byMode).sort((a, b) => byMode[b] - byMode[a]).map(k => ({
      label: k, value: byMode[k], color: '#16a34a', note: fmtMoney(byMode[k])
    }))) : '<div class="empty"><div class="empty-ico">💵</div><div>Koi collection nahi</div></div>'}
          <div class="divider"></div>
          <div class="kv"><span>Total Collected</span><b class="t-ok">${fmtMoney(total)}</b></div>
          <div class="kv"><span>Equivalent KG (rate ${fmtMoney(Biz.rate())})</span><b>${fmtKg(round1(total / Biz.rate()))}</b></div>
          </div>
        </div>
      </div>`;
    $('#pyCsv').onclick = () => exportCSV('collections-' + Period.shortLabel().replace(/\s/g, '') + '.csv',
      ['Date', 'Voucher', 'Customer', 'Against Invoice', 'Mode', 'Amount', 'KG Covered', 'Note'],
      pays.map(p => [p.date, p.no, Biz.customerName(p.customerId), p.saleId ? (DB.get('sales', p.saleId) || {}).invoiceNo : 'Advance', p.mode, p.amount, p.kgCovered, p.note]));
  }
}
