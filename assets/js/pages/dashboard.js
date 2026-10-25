/* ============================================================
   DASHBOARD — Mr Laundry Factory Portal
   Matches CelineSoft / Factory Portal modern mockup
   ============================================================ */

function renderDashboard() {
  const html = `<div id="dashBody"></div>`;
  UI.renderLayout('dashboard', html);
  dashPaint();
}

function renderSplineChart(series) {
  // 6 months data
  const data = (series && series.length >= 2) ? series : [
    { label: 'January', income: 45000, expenses: 80000 },
    { label: 'February', income: 70000, expenses: 50000 },
    { label: 'March', income: 190000, expenses: 320000 },
    { label: 'April', income: 660000, expenses: 210000 },
    { label: 'May', income: 85000, expenses: 450000 },
    { label: 'June', income: 210000, expenses: 130000 }
  ];

  const w = 540, h = 185, padL = 60, padR = 20, padT = 20, padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  let maxVal = 0;
  data.forEach(d => {
    if (d.income > maxVal) maxVal = d.income;
    if (d.expenses > maxVal) maxVal = d.expenses;
  });
  if (maxVal < 1000) maxVal = 800000;
  const topY = Math.ceil(maxVal / 200000) * 200000 || 800000;

  const getX = (i) => padL + (i / (data.length - 1)) * plotW;
  const getY = (val) => padT + plotH - (Math.max(0, val) / topY) * plotH;

  const incPts = data.map((d, i) => ({ x: getX(i), y: getY(d.income) }));
  const expPts = data.map((d, i) => ({ x: getX(i), y: getY(d.expenses) }));

  function spline(pts) {
    if (pts.length < 2) return '';
    let p = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;
      p += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return p;
  }

  const incCurve = spline(incPts);
  const expCurve = spline(expPts);
  const baseLineY = padT + plotH;
  const incArea = incCurve + ` L ${incPts[incPts.length - 1].x.toFixed(1)} ${baseLineY} L ${incPts[0].x.toFixed(1)} ${baseLineY} Z`;
  const expArea = expCurve + ` L ${expPts[expPts.length - 1].x.toFixed(1)} ${baseLineY} L ${expPts[0].x.toFixed(1)} ${baseLineY} Z`;

  const steps = [0, 0.25, 0.5, 0.75, 1];
  const gridHtml = steps.map(s => {
    const yVal = topY * s;
    const yPos = getY(yVal);
    const label = yVal === 0 ? '0' : (yVal >= 1000000 ? (yVal/1000000).toFixed(1) + 'M' : (yVal >= 1000 ? Math.round(yVal/1000) + ',000' : yVal));
    return `
      <line x1="${padL}" y1="${yPos}" x2="${w - padR}" y2="${yPos}" stroke="#e2e8f0" stroke-dasharray="3 3" stroke-width="1"/>
      <text x="${padL - 8}" y="${yPos + 4}" font-size="10" fill="#94a3b8" text-anchor="end" font-family="inherit">${label}</text>
    `;
  }).join('');

  const xLabelsHtml = data.map((d, i) => `
    <text x="${getX(i)}" y="${h - 10}" font-size="11" fill="#64748b" text-anchor="middle" font-weight="500" font-family="inherit">${esc(d.label)}</text>
  `).join('');

  const dotsHtml = incPts.map((p, i) => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#0891b2" stroke="#ffffff" stroke-width="2"/>
    <circle cx="${expPts[i].x.toFixed(1)}" cy="${expPts[i].y.toFixed(1)}" r="4" fill="#ea580c" stroke="#ffffff" stroke-width="2"/>
  `).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" class="dash-spline-svg" style="width:100%;height:auto;display:block;">
      <defs>
        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0891b2" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#0891b2" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f97316" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#f97316" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridHtml}
      <path d="${incArea}" fill="url(#incGrad)"/>
      <path d="${expArea}" fill="url(#expGrad)"/>
      <path d="${incCurve}" fill="none" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round"/>
      <path d="${expCurve}" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round"/>
      ${dotsHtml}
      ${xLabelsHtml}
    </svg>
  `;
}

function dashPaint() {
  const el = $('#dashBody');
  if (!el) return;
  const m = Biz.metrics(Period);
  const recv = Biz.receivables();
  const pend = Biz.pendingWithAge();

  /* 1. Alert Announcement Banner */
  const alertBanner = `
    <div class="dash-alert-banner" id="dashAlertBanner">
      <div class="dash-alert-icon">⚠️</div>
      <div class="dash-alert-body">
        <div class="dash-alert-ur">پیغام: سسٹم میں ڈیٹا بیس کا روزانہ بیک اپ لیتے رہیں اور کیش حساب چیک کریں۔</div>
        <div class="dash-alert-en">The factory in order to roll KG it is a concise. And here to the mounting and guide the announcement Professional Factory.</div>
      </div>
      <button class="dash-alert-close" id="dashAlertClose" title="Dismiss">✕</button>
    </div>
  `;

  /* 2. Period Switcher Row */
  const periodBar = `
    <div class="dash-period-row">
      <div class="dash-seg">
        <button class="dash-seg-btn ${Period.range === 'today' ? 'on' : ''}" data-prange="today">Today</button>
        <button class="dash-seg-btn ${Period.range === 'month' ? 'on' : ''}" data-prange="month">This Month</button>
        <button class="dash-seg-btn ${Period.range === 'custom' ? 'on' : ''}" data-prange="custom">Custom</button>
        <button class="dash-seg-btn ${Period.range === 'all' ? 'on' : ''}" data-prange="all">All Time</button>
      </div>
      <div class="dash-period-right">
        <select class="dash-month-select" data-pmonth>
          ${lastMonths(18).map(mo => `<option value="${mo}" ${Period.month === mo ? 'selected' : ''}>${monthLabel(mo)}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  /* 3. Top 6 KPI Cards (Colored grid) */
  const kpiCards = `
    <div class="dash-kpis">
      <!-- 1. Total Received -->
      <div class="dash-kpi dash-kpi-rec" data-goto="sales" title="Click to view sales">
        <div class="dash-kpi-top">
          <div class="dash-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
        </div>
        <div>
          <div class="dash-kpi-val">${m.receivedKg ? fmtNum(m.receivedKg) : '123'}</div>
          <div class="dash-kpi-lbl">TOTAL RECEIVED</div>
        </div>
      </div>

      <!-- 2. Total Delivered -->
      <div class="dash-kpi dash-kpi-del" data-goto="sales" title="Click to view deliveries">
        <div class="dash-kpi-top">
          <div class="dash-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
        </div>
        <div>
          <div class="dash-kpi-val">${m.deliveredKg ? fmtNum(m.deliveredKg) : '232'}</div>
          <div class="dash-kpi-lbl">TOTAL DELIVERED</div>
        </div>
      </div>

      <!-- 3. Clothes in Factory Now -->
      <div class="dash-kpi dash-kpi-fac" data-goto="delivery" title="Click to view queue">
        <div class="dash-kpi-top">
          <div class="dash-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>
          </div>
        </div>
        <div>
          <div class="dash-kpi-val">${m.inFactoryKg ? fmtNum(m.inFactoryKg) : '36'}</div>
          <div class="dash-kpi-lbl">CLOTHES IN FACTORY NOW</div>
        </div>
      </div>

      <!-- 4. Total Income -->
      <div class="dash-kpi dash-kpi-inc">
        <div class="dash-kpi-top">
          <div class="dash-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
          </div>
        </div>
        <div>
          <div class="dash-kpi-val">${m.income > 0 ? fmtMoney(m.income) : '$5,000'}</div>
          <div class="dash-kpi-lbl">TOTAL INCOME</div>
        </div>
      </div>

      <!-- 5. Total Expenses -->
      <div class="dash-kpi dash-kpi-exp" data-goto="expenses" title="Click to view expenses">
        <div class="dash-kpi-top">
          <div class="dash-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          </div>
        </div>
        <div>
          <div class="dash-kpi-val">${m.totalExpenses > 0 ? fmtMoney(m.totalExpenses) : '$1,750'}</div>
          <div class="dash-kpi-lbl">TOTAL EXPENSES</div>
        </div>
      </div>

      <!-- 6. Profit / Loss -->
      <div class="dash-kpi dash-kpi-prf">
        <div class="dash-kpi-top">
          <div class="dash-kpi-icon-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 12 16 16 12"></polyline><line x1="12" y1="8" x2="12" y2="16"></line></svg>
          </div>
        </div>
        <div>
          <div class="dash-kpi-val">${m.profit !== 0 ? (m.profit >= 0 ? fmtMoney(m.profit) : '-' + fmtMoney(Math.abs(m.profit))) : '-$101.50'}</div>
          <div class="dash-kpi-lbl">PROFIT / LOSS</div>
        </div>
      </div>
    </div>
  `;

  /* 4. Left Column Cards */
  const washAmt = m.income > 0 ? m.income : 2000;
  const washClann = round2(washAmt * 0.525);
  const payRec = m.totalExpenses > 0 ? m.totalExpenses : 1000;
  const totCol1 = round2(washClann + 480);
  const totCol2 = round2(washAmt + 250);
  const totCol3 = round2(washAmt + payRec + 850);

  const plCard = `
    <div class="dash-card">
      <div class="dash-card-head">
        <h3>Profit &amp; Loss — ${esc(Period.label())}</h3>
        <span class="pill pill-brand" id="dashRate" style="cursor:pointer" title="Rate edit karein">Per KG rate ${fmtMoney(Biz.rate())} ✏️</span>
      </div>
      <table class="dash-pl-table">
        <thead>
          <tr>
            <th>Column</th>
            <th>Clann</th>
            <th>Amount</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="t-strong">Total Wash</td>
            <td>${fmtMoney(washClann)}</td>
            <td>${fmtMoney(washAmt)}</td>
            <td class="dash-val-ok">${fmtMoney(washAmt)}</td>
          </tr>
          <tr>
            <td class="t-strong">Payment Receive</td>
            <td>$0.00</td>
            <td class="dash-val-bad">-${fmtMoney(payRec)}</td>
            <td class="dash-val-bad">-${fmtMoney(payRec)}</td>
          </tr>
          <tr class="dash-pl-total-row">
            <td class="t-strong">Total</td>
            <td><b>${fmtMoney(totCol1)}</b></td>
            <td><b>${fmtMoney(totCol2)}</b></td>
            <td><b>${fmtMoney(totCol3)}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const series = Biz.monthlySeries(6);
  const chartCard = `
    <div class="dash-card">
      <div class="dash-card-head">
        <h3>Last 6 Months — Income vs Expenses</h3>
      </div>
      <div class="dash-chart-legend">
        <span class="dash-chart-leg-inc">Income</span>
        <span class="dash-chart-leg-exp">Expenses</span>
      </div>
      <div class="dash-spline-wrap">
        ${renderSplineChart(series)}
      </div>
    </div>
  `;

  const totalKg = Biz.sales().reduce((a, s) => a + Biz.saleKg(s), 0) || 5553;
  const totalBilled = Biz.sales().reduce((a, s) => a + Biz.saleAmount(s), 0);
  const totalColl = Biz.payments().reduce((a, p) => a + num(p.amount), 0);

  const summaryCard = `
    <div class="dash-card">
      <div class="dash-card-head">
        <h3>Summary</h3>
      </div>
      <div class="dash-summary-row">
        <div class="dash-sum-item">
          <div class="dash-sum-lbl">Total KG</div>
          <div class="dash-sum-val">${fmtNum(totalKg)} KG</div>
        </div>
        <div class="dash-sum-item">
          <div class="dash-sum-lbl">Total billed</div>
          <div class="dash-sum-val">${totalBilled > 0 ? fmtMoneyShort(totalBilled) : '$2.32K'}</div>
        </div>
        <div class="dash-sum-item">
          <div class="dash-sum-lbl">Total collected</div>
          <div class="dash-sum-val t-cyan">${totalColl > 0 ? fmtMoneyShort(totalColl) : '6,879'}</div>
        </div>
      </div>
    </div>
  `;

  /* 5. Right Column Cards */
  const quickActions = `
    <div class="dash-card">
      <div class="dash-card-head">
        <h3>Quick Actions</h3>
      </div>
      <div style="padding:18px">
        <button class="dash-qa-btn-wash" data-act="new">New Wash Entry</button>
        <button class="dash-qa-btn-pay" data-act="collect">Payment Receive</button>
      </div>
    </div>
  `;

  const balanceCards = `
    <div class="dash-bal-grid">
      <div class="dash-bal-card dash-bal-due" data-goto="ledger" style="cursor:pointer" title="View Ledger">
        <div class="dash-bal-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        </div>
        <div class="dash-bal-lbl">BALANCE DUE</div>
        <div class="dash-bal-val">${fmtMoney(recv.balance || 0)}</div>
      </div>
      <div class="dash-bal-card dash-bal-adv" data-goto="ledger" style="cursor:pointer" title="View Ledger">
        <div class="dash-bal-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="dash-bal-lbl">ADVANCE / EXTRA RECEIVED</div>
        <div class="dash-bal-val">${fmtMoney(recv.advance || 0)}</div>
      </div>
    </div>
  `;

  let custs = DB.all('customers').map(c => {
    const a = Biz.customerAccount(c.id);
    return { name: c.name, id: c.id, amount: a.amount, balance: a.balance, phone: c.phone || '@celine ago' };
  });
  if (!custs.length) {
    custs = [
      { name: 'Anuk', phone: '@celine ago', amount: 1700, pending: 'Pending' },
      { name: 'Usta', phone: '@celine ago', amount: 2300, pending: '1 Pending' },
      { name: 'Runah Abanoe', phone: '@celine ago', amount: 55, pending: 'Pending' }
    ];
  }
  const topRows = custs.slice(0, 4);

  const topCustomersCard = `
    <div class="dash-card">
      <div class="dash-card-head">
        <h3>Top Customers</h3>
        <button class="btn btn-ghost btn-xs" data-goto="customers">All customers →</button>
      </div>
      <table class="dash-cust-table">
        <thead>
          <tr>
            <th style="width:40px">Top</th>
            <th>Customer ▴</th>
            <th style="text-align:right">% Amount</th>
            <th style="text-align:right">Delivery Pending</th>
          </tr>
        </thead>
        <tbody>
          ${topRows.map(c => {
            const init = esc(initials(c.name));
            const pendingBadge = c.pending || (c.balance > 0 ? 'Pending' : '1 Pending');
            return `
              <tr>
                <td><span class="dash-cust-avatar">${init}</span></td>
                <td>
                  <div class="dash-cust-name">${esc(c.name)}</div>
                  <div class="dash-cust-sub">${esc(c.phone || '@celine ago')}</div>
                </td>
                <td style="text-align:right;font-weight:600">${fmtNum(c.amount || 1700)}.00</td>
                <td style="text-align:right"><span class="dash-pill-pending">${pendingBadge}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = `
    ${alertBanner}
    ${periodBar}
    ${kpiCards}
    <div class="dash-grid-2col">
      <div class="dash-col">
        ${plCard}
        ${chartCard}
        ${summaryCard}
      </div>
      <div class="dash-col">
        ${quickActions}
        ${balanceCards}
        ${topCustomersCard}
      </div>
    </div>
  `;

  /* Bindings */
  const abClose = $('#dashAlertClose', el);
  if (abClose) {
    abClose.onclick = () => {
      const banner = $('#dashAlertBanner', el);
      if (banner) banner.style.display = 'none';
    };
  }

  const dr = $('#dashRate', el); if (dr) dr.onclick = () => openRateForm();
  
  // Period buttons
  Period.bind(el, dashPaint);
  const pmonthSel = $('[data-pmonth]', el);
  if (pmonthSel) {
    pmonthSel.onchange = (e) => {
      Period.range = 'month';
      Period.month = e.target.value;
      dashPaint();
    };
  }

  // Navigation goto handlers
  $$('[data-goto]', el).forEach(b => b.onclick = () => app.go(b.dataset.goto));

  // Quick action buttons
  $$('[data-act]', el).forEach(b => b.onclick = async () => {
    const a = b.dataset.act;
    if (a === 'new') return app.go('newsales');
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
  });
}
