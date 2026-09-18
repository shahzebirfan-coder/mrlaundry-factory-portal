/* ============================================================
   DELIVERY QUEUE — factory mein maujood kapre
   ============================================================ */

function renderDelivery() {
  UI.renderLayout('delivery', `<div id="dvBody"></div>`);
  deliveryPaint();
}

function deliveryPaint() {
  const el = $('#dvBody');
  if (!el) return;
  const pend = Biz.pendingWithAge();
  const totalKg = round1(pend.reduce((a, s) => a + Biz.pendingKg(s), 0));
  const old = pend.filter(s => s.ageDays > 7);

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '🏭', label: 'Open Orders', value: fmtNum(pend.length), tone: 'info' })}
      ${UI.statCard({ icon: '⚖️', label: 'Clothes in Factory', value: fmtKg(totalKg), tone: 'warn', foot: pend.length + ' orders' })}
      ${UI.statCard({ icon: '⏰', label: '7 din se ziyada purane', value: fmtNum(old.length), tone: old.length ? 'bad' : 'good', foot: old.length ? 'Priority delivery' : 'Sab time par' })}
      ${UI.statCard({ icon: '✅', label: 'Delivered Today', value: fmtKg(round1(Biz.deliveredIn({ match: d => d === todayISO() }).reduce((a, s) => a + num(s.deliveredKg || s.kgTotal), 0))), tone: 'good' })}
    </div>

    <div class="card">
      <div class="card-head">
        <h3>🚚 Delivery Queue — factory mein jo kapre hain</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" id="dvExport">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" id="dvNew">➕ New Entry</button>
      </div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:980px">
          <thead><tr>
            <th>Invoice</th><th>Customer</th><th>Received</th><th class="t-center">Age</th>
            <th class="t-right">Received KG</th><th class="t-right">Pending KG</th>
            <th>Items</th><th class="t-center">Action</th>
          </tr></thead>
          <tbody>
            ${pend.length ? pend.map(s => {
    const pk = Biz.pendingKg(s);
    return `<tr>
                <td class="t-strong t-nowrap row-click" data-view="${s.id}" style="cursor:pointer">${esc(s.invoiceNo)}</td>
                <td>${esc(Biz.customerName(s.customerId))}<div class="tiny muted">${esc((DB.get('customers', s.customerId) || {}).phone || '')}</div></td>
                <td class="t-nowrap">${fmtDate(s.entryDate)}${s.expectedDelivery ? '<div class="tiny muted">exp: ' + fmtDate(s.expectedDelivery) + '</div>' : ''}</td>
                <td class="t-center"><span class="pill ${s.ageDays > 7 ? 'pill-due' : (s.ageDays > 3 ? 'pill-warn' : 'pill-muted')}">${s.ageDays} din</span></td>
                <td class="t-right">${fmtKg(s.kgTotal)}</td>
                <td class="t-right t-strong t-warn">${fmtKg(pk)}</td>
                <td class="tiny">${esc(Biz.saleItemsSummary(s))}</td>
                <td class="t-center t-nowrap">
                  <button class="btn btn-success btn-xs" data-deliver="${s.id}">✔ Deliver</button>
                  <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-slip="${s.id}" title="Sale slip">🖨️</button>
                  <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pay="${s.id}" title="Payment">💵</button>
                </td>
              </tr>`;
  }).join('') : emptyRow(8, 'Factory khali hai — koi delivery pending nahi 🎉', '🎉')}
          </tbody>
          ${pend.length ? `<tfoot><tr><td colspan="4">TOTAL</td><td class="t-right">${fmtKg(round1(pend.reduce((a, s) => a + num(s.kgTotal), 0)))}</td>
            <td class="t-right">${fmtKg(totalKg)}</td><td colspan="2"></td></tr></tfoot>` : ''}
        </table>
      </div>
    </div>`;

  $$('[data-deliver]', el).forEach(b => b.onclick = () => openDeliveryForm(b.dataset.deliver));
  $$('[data-slip]', el).forEach(b => b.onclick = () => printSaleSlip(b.dataset.slip));
  $$('[data-pay]', el).forEach(b => b.onclick = () => {
    const s = DB.get('sales', b.dataset.pay);
    openPaymentForm(s.customerId, { saleId: s.id });
  });
  $$('.row-click', el).forEach(t => t.onclick = () => openSaleDetail(t.dataset.view));
  $('#dvNew').onclick = () => app.go('newsales');
  $('#dvExport').onclick = () => exportCSV('delivery-queue-' + todayISO() + '.csv',
    ['Invoice', 'Customer', 'Received', 'Age Days', 'Received KG', 'Pending KG', 'Items'],
    pend.map(s => [s.invoiceNo, Biz.customerName(s.customerId), s.entryDate, s.ageDays, s.kgTotal, Biz.pendingKg(s),
    Biz.saleItemsSummary(s)]));
}
