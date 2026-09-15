/* ============================================================
   DASHBOARD — Main KPI Cards + Period switcher
   Total Received · Total Delivered · Clothes in Factory ·
   Total Income · Total Expenses · Profit / Loss
   ============================================================ */

function renderDashboard() {
  const html = `<div id="dashBody"></div>`;
  UI.renderLayout('dashboard', html);
  dashPaint();
}

function dashPaint() {
  const el = $('#dashBody');
  if (!el) return;
  const m = Biz.metrics(Period);
  const recv = Biz.receivables();
  const profitTone = m.profit >= 0 ? 'good' : 'bad';
  const pend = Biz.pendingWithAge();

  /* -------- KPI cards -------- */
  const cards = `
    <div class="stats">
      ${UI.statCard({
    icon: '⚖️', label: 'Total Received — ' + Period.shortLabel(), value: fmtKg(m.receivedKg),
    foot: m.newEntries + ' entries · ' + fmtNum(m.receivedPcs) + ' pcs', tone: 'info',
    clickable: true, attrs: 'data-goto="sales"'
  })}
      ${UI.statCard({
    icon: '📦', label: 'Total Delivered — ' + Period.shortLabel(), value: fmtKg(m.deliveredKg),
    foot: m.deliveredCount + ' orders delivered', tone: 'good',
    clickable: true, attrs: 'data-goto="sales"'
  })}
      ${UI.statCard({
    icon: '🏭', label: 'Clothes in Factory Now', value: fmtKg(m.inFactoryKg),
    foot: m.inFactoryCount + ' open orders · ' + fmtNum(m.inFactoryPcs) + ' pcs', tone: m.inFactoryKg > 0 ? 'warn' : 'good',
    clickable: true, attrs: 'data-goto="delivery"'
  })}
      ${UI.statCard({
    icon: '💰', label: 'Total Income — ' + Period.shortLabel(), value: fmtMoney(m.income),
    foot: 'Avg rate ' + fmtMoney(m.avgRate) + '/kg', tone: 'good'
  })}
      ${UI.statCard({
    icon: '💸', label: 'Total Expenses — ' + Period.shortLabel(), value: fmtMoney(m.totalExpenses),
    foot: 'Kharchay ' + fmtMoney(m.expenses) + ' · Purch ' + fmtMoney(m.purchases) + ' · Sal ' + fmtMoney(m.salaries),
    tone: 'bad', clickable: true, attrs: 'data-goto="expenses"'
  })}
      ${UI.statCard({
    icon: m.profit >= 0 ? '📈' : '📉', label: 'Profit / Loss — ' + Period.shortLabel(), value: fmtMoney(m.profit),
    foot: 'Income − Expenses' + (m.drawings > 0 ? ' · Drawings ' + fmtMoney(m.drawings) : ''), tone: profitTone
  })}
    </div>`;

  /* -------- P&L + collection summary -------- */
  const plCard = `
    <div class="card">
      <div class="card-head"><h3>🧮 Profit &amp; Loss — ${esc(Period.label())}</h3><div class="sp"></div>
        <span class="pill pill-brand" id="dashRate" style="cursor:pointer" title="Rate edit karein">Per KG rate ${fmtMoney(Biz.rate())} ✏️</span></div>
      <div class="card-body">
        <div class="kv"><span>Wash Income (billed)</span><b class="t-ok">${fmtMoney(m.income)}</b></div>
        <div class="kv"><span>− Factory Expenses</span><b class="t-bad">${fmtMoney(m.expenses)}</b></div>
        <div class="kv"><span>− Purchases from Vendors</span><b class="t-bad">${fmtMoney(m.purchases)}</b></div>
        <div class="kv"><span>− Staff Salaries</span><b class="t-bad">${fmtMoney(m.salaries)}</b></div>
        <div class="kv total"><span>${m.profit >= 0 ? '= Net Profit ✅' : '= Net Loss ⚠️'}</span>
          <b class="${m.profit >= 0 ? 't-ok' : 't-bad'}">${fmtMoney(m.profit)}</b></div>
        <div class="divider"></div>
        <div class="kv"><span>Cash Received (collections)</span><b>${fmtMoney(m.collected)}</b></div>
        <div class="kv"><span>Cash Out (expenses + salary + purchase + drawings)</span>
          <b class="t-bad">${fmtMoney(round2(m.totalExpenses + m.drawings))}</b></div>
        <div class="kv"><span>Owner Drawings (personal nikaal — expense nahi)</span><b>${fmtMoney(m.drawings)}</b></div>
        <div class="kv"><span>Net cash movement</span><b class="${m.collected - m.totalExpenses - m.drawings >= 0 ? 't-ok' : 't-bad'}">
          ${fmtMoney(round2(m.collected - m.totalExpenses - m.drawings))}</b></div>
      </div>
    </div>`;

  /* -------- receivables / advance -------- */
  const recvCard = `
    <div class="card">
      <div class="card-head"><h3>📒 Receivables &amp; Advance</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" data-goto="ledger">Payment Ledger →</button></div>
      <div class="card-body">
        <div class="grid g2" style="gap:10px">
          <div class="note-box bad" style="text-align:center">
            <div class="tiny" style="font-weight:800;text-transform:uppercase;letter-spacing:.4px">Balance Due (all customers)</div>
            <div class="big" style="margin-top:4px">${fmtMoney(recv.balance)}</div>
            <div class="tiny">≈ ${fmtKg(recv.kgBalance)} wash ka hisaab</div>
          </div>
          <div class="note-box ok" style="text-align:center">
            <div class="tiny" style="font-weight:800;text-transform:uppercase;letter-spacing:.4px">Advance / Extra Received</div>
            <div class="big" style="margin-top:4px">${fmtMoney(recv.advance)}</div>
            <div class="tiny">aage ke bill mein adjust hoga</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="kv"><span>Total KG received (all time)</span><b>${fmtKg(Biz.sales().reduce((a, s) => a + Biz.saleKg(s), 0))}</b></div>
        <div class="kv"><span>Total billed (all time)</span><b>${fmtMoney(Biz.sales().reduce((a, s) => a + Biz.saleAmount(s), 0))}</b></div>
        <div class="kv"><span>Total collected (all time)</span><b>${fmtMoney(Biz.payments().reduce((a, p) => a + num(p.amount), 0))}</b></div>
      </div>
    </div>`;

  /* -------- category split + chart -------- */
  const catCard = `
    <div class="card">
      <div class="card-head"><h3>🏷️ Category-wise KG — ${esc(Period.shortLabel())}</h3></div>
      <div class="card-body">${UI.catDonut(m.catKg)}</div>
    </div>`;

  const chartCard = `
    <div class="card">
      <div class="card-head"><h3>📈 Last 6 Months — Income vs Expenses</h3></div>
      <div class="card-body">
        ${UI.barChart(Biz.monthlySeries(6))}
        <div class="divider"></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:520px">
            <thead><tr><th>Month</th><th class="t-right">KG Received</th><th class="t-right">Income</th><th class="t-right">Expenses</th><th class="t-right">Profit</th></tr></thead>
            <tbody>${Biz.monthlySeries(6).reverse().map(r => `<tr>
              <td class="t-strong">${esc(r.label)}</td>
              <td class="t-right">${fmtKg(r.kg)}</td>
              <td class="t-right t-ok">${fmtMoney(r.income)}</td>
              <td class="t-right t-bad">${fmtMoney(r.expenses)}</td>
              <td class="t-right ${r.profit >= 0 ? 't-ok' : 't-bad'}">${fmtMoney(r.profit)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  /* -------- pending deliveries -------- */
  const pendRows = pend.slice(0, 7);
  const pendCard = `
    <div class="card">
      <div class="card-head"><h3>🚚 Delivery Pending (factory mein)</h3><div class="sp"></div>
        <span class="pill ${pend.length ? 'pill-warn' : 'pill-ok'}">${pend.length} orders · ${fmtKg(m.inFactoryKg)}</span>
        <button class="btn btn-ghost btn-sm" data-goto="delivery">Sab dekhein</button></div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:560px">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Received</th><th class="t-right">KG</th><th class="t-center">Age</th><th></th></tr></thead>
          <tbody>${pendRows.length ? pendRows.map(s => `<tr>
            <td class="t-strong">${esc(s.invoiceNo)}</td>
            <td>${esc(Biz.customerName(s.customerId))}</td>
            <td class="t-muted tiny">${fmtDate(s.entryDate)}</td>
            <td class="t-right t-strong">${fmtKg(s.kgTotal)}</td>
            <td class="t-center"><span class="pill ${s.ageDays > 7 ? 'pill-due' : (s.ageDays > 3 ? 'pill-warn' : 'pill-muted')}">${s.ageDays} din</span></td>
            <td><button class="btn btn-success btn-xs" data-deliver="${s.id}">✔ Deliver</button></td>
          </tr>`).join('') : emptyRow(6, 'Koi delivery pending nahi — sab clear hai ✔', '🎉')}</tbody>
        </table>
      </div>
    </div>`;

  /* -------- top customers -------- */
  const custs = DB.all('customers').map(c => {
    const a = Biz.customerAccount(c.id);
    return { name: c.name, id: c.id, kg: a.kgTotal, balance: a.balance, amount: a.amount, kgMonth: 0 };
  });
  custs.forEach(c => {
    const mo = Biz.salesIn({ match: d => String(d).slice(0, 7) === monthKey(todayISO()) }).filter(s => s.customerId === c.id);
    c.kgMonth = round1(mo.reduce((a, s) => a + Biz.saleKg(s), 0));
  });
  const top = custs.filter(c => c.kgMonth > 0).sort((a, b) => b.kgMonth - a.kgMonth).slice(0, 6);
  const topCard = `
    <div class="card">
      <div class="card-head"><h3>🏆 Top Customers — is mahine</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" data-goto="customers">All customers</button></div>
      <div class="card-body">
        ${top.length ? UI.progressRows(top.map(c => ({
    label: c.name, value: c.kgMonth, note: fmtKg(c.kgMonth) + (c.balance > 0 ? ' · due ' + fmtMoneyShort(c.balance) : ''),
    color: '#4f7cff'
  }))) : '<div class="empty"><div class="empty-ico">👥</div><div>Is mahine abhi koi entry nahi hui</div></div>'}
      </div>
    </div>`;

  /* -------- quick actions -------- */
  const quick = `
    <div class="card">
      <div class="card-head"><h3>⚡ Quick Actions</h3></div>
      <div class="card-body">
        <div class="qgrid">
          <button class="qa qa-brand" data-act="new"><span>➕</span><b>New Wash Entry</b><i>Daily clients se kapre receive karein</i></button>
          <button class="qa qa-ok" data-act="collect"><span>💵</span><b>Payment Receive</b><i>Amount ya KG ke hisaab se</i></button>
          <button class="qa qa-warn" data-act="expense"><span>💸</span><b>Expense Add</b><i>Fuel, chemicals, salary…</i></button>
          <button class="qa qa-info" data-act="customer"><span>👤</span><b>New Customer</b><i>Naya vendor / client</i></button>
          <button class="qa qa-purple" data-act="deliver"><span>🚚</span><b>Mark Delivered</b><i>Factory se maal bhejna</i></button>
          <button class="qa qa-dark" data-act="report"><span>🖨️</span><b>Month Report</b><i>Print / PDF</i></button>
        </div>
      </div>
    </div>`;

  el.innerHTML = `
    ${Period.bar()}
    ${cards}
    <div class="grid g-2-1">
      <div>${plCard}${chartCard}${pendCard}</div>
      <div>${quick}${recvCard}${catCard}${topCard}</div>
    </div>`;

  const dr = $('#dashRate', el); if (dr) dr.onclick = () => openRateForm();
  Period.bind(el, dashPaint);
  $$('[data-goto]', el).forEach(b => b.onclick = () => app.go(b.dataset.goto));
  $$('[data-deliver]', el).forEach(b => b.onclick = () => openDeliveryForm(b.dataset.deliver));

  /* quick action handlers */
  $$('[data-act]', el).forEach(b => b.onclick = async () => {
    const a = b.dataset.act;
    if (a === 'new') return app.go('newsales');
    if (a === 'expense') return openExpenseForm();
    if (a === 'customer') return customerForm();
    if (a === 'collect') {
      const w = openModal({
        title: '💵 Payment Receive', size: 'sm',
        body: `<label class="fld"><span>Customer</span>${UI.customerPicker('qaCust')}</label>
               <div id="qaCustInfo" class="note-box info tiny mb10">Customer select karein — uska balance yahan aayega.</div>
               <div class="row" style="justify-content:flex-end"><button class="btn btn-primary btn-block" id="qaGo">Continue →</button></div>`
      });
      UI.bindCustomerPicker('qaCust', cid => {
        const a2 = Biz.customerAccount(cid);
        $('#qaCustInfo', w).innerHTML = `<b>${esc(Biz.customerName(cid))}</b> — Balance Due: <b class="t-bad">${fmtMoney(a2.balance)}</b> (${fmtKg(a2.kgBalance)})${a2.advance > 0 ? ' · Advance: <b class="t-ok">' + fmtMoney(a2.advance) + '</b>' : ''}`;
      });
      $('#qaGo', w).onclick = () => {
        const cid = $('#qaCust', w).value;
        if (!cid) return toast('Customer select karein', 'error');
        closeModal(w);
        openPaymentForm(cid);
      };
      return;
    }
    if (a === 'deliver') {
      if (!pend.length) return toast('Koi delivery pending nahi hai', 'info');
      openDeliveryForm(pend[0].id);
      return;
    }
    if (a === 'report') return printMonthReport();
  });
}

/* Monthly management report print */
function printMonthReport() {
  const m = Biz.metrics(Period);
  const sales = Biz.salesIn(Period);
  const exp = Biz.expensesIn(Period).concat(Biz.salariesIn(Period), Biz.purchasesIn(Period));
  const s = DB.settings();
  const body = `
    ${printHeader(s, 'MONTHLY REPORT')}
    <div class="pr-title">BUSINESS REPORT — ${esc(Period.label())}</div>
    <div class="pr-meta">
      <div>Printed: <b>${fmtDateLong(todayISO())}</b><br>By: <b>${esc((DB.currentUser() || {}).name || '')}</b></div>
      <div style="text-align:right">Rate: <b>${fmtMoney(Biz.rate())}/kg</b><br>Entries: <b>${m.newEntries}</b></div>
    </div>
    <table class="pr-tbl">
      <tr><th colspan="2">SUMMARY</th></tr>
      <tr><td>Total Received</td><td class="r"><b>${fmtKg(m.receivedKg)}</b> (${fmtNum(m.receivedPcs)} pcs)</td></tr>
      <tr><td>Total Delivered</td><td class="r"><b>${fmtKg(m.deliveredKg)}</b> (${fmtNum(m.deliveredPcs)} pcs)</td></tr>
      <tr><td>Clothes in Factory (now)</td><td class="r"><b>${fmtKg(m.inFactoryKg)}</b></td></tr>
      <tr><td>Total Income (billed)</td><td class="r"><b>${fmtMoney(m.income)}</b></td></tr>
      <tr><td>Cash Collected</td><td class="r"><b>${fmtMoney(m.collected)}</b></td></tr>
      <tr><td>Expenses (general)</td><td class="r"><b>${fmtMoney(m.expenses)}</b></td></tr>
      <tr><td>Purchases</td><td class="r"><b>${fmtMoney(m.purchases)}</b></td></tr>
      <tr><td>Salaries</td><td class="r"><b>${fmtMoney(m.salaries)}</b></td></tr>
      <tr><td>Owner Drawings</td><td class="r"><b>${fmtMoney(m.drawings)}</b></td></tr>
      <tr><td><b>Net Profit / Loss</b></td><td class="r"><b>${fmtMoney(m.profit)}</b></td></tr>
    </table>
    <div style="margin-top:10px"></div>
    <table class="pr-tbl">
      <tr><th>Category</th><th class="r">KG Received</th><th class="r">Share</th></tr>
      ${Biz.catKeys().map(k => `<tr><td>${esc(Biz.catLabel(k))}</td><td class="r">${fmtKg(m.catKg[k] || 0)}</td>
        <td class="r">${m.receivedKg ? Math.round((m.catKg[k] || 0) / m.receivedKg * 100) : 0}%</td></tr>`).join('')}
    </table>
    <div style="margin-top:10px"></div>
    <table class="pr-tbl">
      <tr><th>#</th><th>Invoice</th><th>Customer</th><th class="c">Received</th><th class="c">Delivered</th><th class="r">KG</th><th class="r">Amount</th></tr>
      ${sales.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.invoiceNo)}</td><td>${esc(Biz.customerName(x.customerId))}</td>
        <td class="c">${fmtDate(x.entryDate)}</td><td class="c">${x.deliveryDate ? fmtDate(x.deliveryDate) : '—'}</td>
        <td class="r">${fmtKg(x.kgTotal)}</td><td class="r">${fmtNum(Biz.saleAmount(x))}</td></tr>`).join('')}
      <tr><td colspan="5"><b>TOTAL</b></td><td class="r"><b>${fmtKg(m.receivedKg)}</b></td><td class="r"><b>${fmtNum(m.income)}</b></td></tr>
    </table>
    <div class="pr-foot"><div class="small">${esc(s.invoiceTerms || '')}</div><div class="sign">Authorised Signature</div></div>`;
  printHTML('Report ' + Period.label(), body, { size: 'a4' });
}
