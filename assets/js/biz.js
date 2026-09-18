/* ============================================================
   MR LAUNDRY FACTORY PORTAL — BUSINESS LOGIC
   ------------------------------------------------------------
   • Per-KG wash billing engine
   • Ledger + FIFO payment allocation (kg-wise & amount-wise)
   • Dashboard metrics (received / delivered / in factory / income
     / expenses / profit-loss) for today, month, custom range
   • Reports & series helpers
   ============================================================ */

const Biz = {

  /* ---------- basics ---------- */
  rate() { return num(DB.settings().ratePerKg) || 200; },
  categories() { return DB.settings().categories || DEFAULT_CATEGORIES; },
  catLabel(k) { const c = this.categories().find(x => x.key === k); return c ? c.label : (k || '—') + ' Category'; },
  catColor(k) { const c = this.categories().find(x => x.key === k); return c ? c.color : '#64748b'; },
  catKeys() { return this.categories().map(c => c.key); },

  customer(id) { return DB.get('customers', id); },
  customerName(id) { const c = DB.get('customers', id); return c ? c.name : '—'; },
  branchName(id) { const b = DB.get('branches', id); return b ? b.name : '—'; },
  vendorName(id) { const v = DB.get('vendors', id); return v ? v.name : '—'; },
  employeeName(id) { const e = DB.get('employees', id); return e ? e.name : (id || '—'); },
  product(id) { return DB.get('products', id); },

  /** Amount of a sale = kg total × rate (sale-level rate override allowed) */
  saleRate(s) { return num(s && s.rate) || this.rate(); },
  saleAmount(s) {
    if (s && s.amountManual != null && s.amountManual !== '') return round2(s.amountManual);
    return round2(num(s && s.kgTotal) * this.saleRate(s));
  },
  saleKg(s) { return round1(s && s.kgTotal); },

  /** total KG of one line */
  lineKg(l) { return round1(num(l && l.qtyKg)); },

  /** kitna KG deliver ho chuka hai (partial delivery support) */
  saleDeliveredKg(s) {
    if (!s) return 0;
    const total = num(s.kgTotal);
    if (s.status === 'delivered') return round1(num(s.deliveredKg) || total);
    if (s.status === 'partial') return round1(num(s.deliveredKg));
    return 0;
  },
  pendingKg(s) { return round1(Math.max(0, num(s && s.kgTotal) - this.saleDeliveredKg(s))); },
  pendingPcs(s) { return Math.max(0, num(s && s.piecesTotal) - num(s && s.deliveredPcs)); },

  /** All non-deleted sales */
  sales() { return DB.all('sales').filter(s => s.status !== 'cancelled'); },
  payments() { return DB.all('payments'); },
  expenses() { return DB.all('expenses'); },
  salaries() { return DB.all('salaries'); },
  purchases() { return DB.all('purchases'); },
  drawings() { return DB.all('drawings'); },

  /* ============================================================
     CUSTOMER ACCOUNT — sales, FIFO allocation, ledger rows
     ============================================================ */
  customerAccount(customerId, opt) {
    const o = opt || {};
    const rate = this.rate();
    const sales = this.sales().filter(s => s.customerId === customerId)
      .sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate)) || String(a.invoiceNo).localeCompare(String(b.invoiceNo)));
    const pays = this.payments().filter(p => p.customerId === customerId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    // FIFO: payments pool pehle purane sale par lagta hai
    let pool = pays.reduce((s, p) => s + num(p.amount), 0);
    sales.forEach(s => {
      const amt = this.saleAmount(s);
      s._amount = amt;
      s._applied = round2(Math.min(pool, amt));
      pool = round2(pool - s._applied);
      s._due = round2(amt - s._applied);
      const r = this.saleRate(s);
      s._kgApplied = r ? round1(s._applied / r) : 0;
      s._kgDue = r ? round1(s._due / r) : 0;
    });
    const advance = round2(Math.max(0, pool));

    const stats = {
      customerId,
      sales,
      payments: pays,
      count: sales.length,
      kgTotal: round1(sales.reduce((s, x) => s + this.saleKg(x), 0)),
      kgDelivered: round1(sales.reduce((s, x) => s + this.saleDeliveredKg(x), 0)),
      kgInFactory: round1(sales.reduce((s, x) => s + this.pendingKg(x), 0)),
      piecesTotal: sales.reduce((s, x) => s + num(x.piecesTotal), 0),
      piecesDelivered: sales.reduce((s, x) => s + num(x.deliveredPcs), 0),
      amount: round2(sales.reduce((s, x) => s + x._amount, 0)),
      paid: round2(pays.reduce((s, p) => s + num(p.amount), 0)),
      balance: round2(sales.reduce((s, x) => s + x._due, 0)),
      advance,
      kgPaid: 0, kgBalance: 0, rateMix: [], avgRate: 0
    };
    /* KG accounting RATE-AWARE: har bill apne rate par convert hota hai.
       Purane bill Rs.200/kg par, naye Rs.320/kg par — mix ho to bhi theek. */
    stats.kgPaid = round1(sales.reduce((a, x) => a + num(x._kgApplied), 0));
    stats.kgBalance = round1(sales.reduce((a, x) => a + num(x._kgDue), 0));
    const mixMap = {};
    sales.forEach(x => {
      if (num(x._due) <= 0.009) return;
      const r = round2(this.saleRate(x));
      const k = String(r);
      if (!mixMap[k]) mixMap[k] = { rate: r, kg: 0, amount: 0, count: 0, invoiceNo: x.invoiceNo, date: x.entryDate };
      mixMap[k].kg = round1(mixMap[k].kg + num(x._kgDue));
      mixMap[k].amount = round2(mixMap[k].amount + num(x._due));
      mixMap[k].count++;
    });
    stats.rateMix = Object.keys(mixMap).map(k => mixMap[k]).sort((a, b) => b.rate - a.rate);
    stats.avgRate = stats.kgTotal ? round2(stats.amount / stats.kgTotal) : rate;
    stats.outstandingInvoices = sales.filter(x => x._due > 0.009).length;

    // ---- per-sale view for display (uses cached computed fields) ----
    stats.saleRows = sales.map(s => Object.assign({}, s, {
      _applied: s._applied, _due: s._due, _kgApplied: s._kgApplied, _kgDue: s._kgDue, _amount: s._amount
    }));

    // ---- chronological statement (ledger) ----
    const rows = [];
    let kgBal = 0, amtBal = 0;
    const events = [];
    sales.forEach(s => events.push({ d: s.entryDate, t: 'sale', s }));
    pays.forEach(p => events.push({ d: p.date, t: 'pay', p }));
    events.sort((a, b) => String(a.d).localeCompare(String(b.d)) || (a.t === 'sale' ? -1 : 1));

    events.forEach(e => {
      if (e.t === 'sale') {
        const s = e.s;
        const kg = this.saleKg(s), amt = s._amount, r = this.saleRate(s);
        kgBal = round1(kgBal + kg);
        amtBal = round2(amtBal + amt);
        rows.push({
          date: s.entryDate, type: 'sale', ref: s.invoiceNo, kind: 'Wash Received',
          desc: this.saleLinesText(s), kgAdd: kg, kgCut: 0, amount: amt, rate: r,
          kgBal, amtBal, saleId: s.id, deliveryDate: s.deliveryDate || ''
        });
      } else {
        const p = e.p;
        const amt = num(p.amount), r = num(p.rate) || rate;
        /* KG cut: payment record par jo KG cover hui (FIFO, rate-aware) — purana rate ho to wahi */
        const kgCut = amtBal > 0 ? round1(Math.min(kgBal, num(p.kgCovered) || (amt / r))) : 0;
        kgBal = round1(Math.max(0, kgBal - kgCut));
        amtBal = round2(amtBal - amt);
        rows.push({
          date: p.date, type: 'payment', ref: p.no || p.voucherNo || '', kind: 'Payment Received',
          desc: (p.note || '') + (p.mode ? ' · ' + p.mode : ''), kgAdd: 0, kgCut, amount: -amt, rate: r,
          kgBal, amtBal, paymentId: p.id, allocTo: p.saleId || '', advance: p.isAdvance
        });
      }
    });
    stats.ledger = rows;
    return stats;
  },

  /** line ka poora naam: "SHOES — Junior Shoes" (type ho to) */
  lineName(l) {
    const p = l && l.productId ? this.product(l.productId) : null;
    const n = (p ? p.name : (l && l.productName)) || 'Item';
    return (l && l.type) ? n + ' — ' + l.type : n;
  },
  /** ek item ke types (product par saved) */
  productTypes(productId) {
    const p = this.product(productId);
    return (p && Array.isArray(p.types)) ? p.types.filter(Boolean) : [];
  },
  /** naya type naam item par SAVE karein (agli dafa khud nazar aayega). true = naya tha */
  saveProductType(productId, name) {
    name = String(name || '').trim();
    if (!productId || !name) return false;
    const p = this.product(productId);
    if (!p) return false;
    const list = Array.isArray(p.types) ? p.types.slice() : [];
    if (list.indexOf(name) >= 0) return false;
    list.push(name);
    DB.upsert('products', Object.assign({}, p, { types: list }), { silent: true });
    DB.save();
    return true;
  },

  saleLinesText(s) {
    return (s.lines || []).map(l => this.lineName(l) + ' ' + fmtKg(l.qtyKg)).join(' • ');
  },
  saleLinesShort(s) {
    const byCat = {};
    (s.lines || []).forEach(l => { const k = l.category || '-'; byCat[k] = round1((byCat[k] || 0) + num(l.qtyKg)); });
    return Object.keys(byCat).sort().map(k => k + ': ' + fmtKg(byCat[k])).join(' · ') || '—';
  },
  saleItemsSummary(s) {
    const names = [];
    (s.lines || []).forEach(l => {
      const n = this.lineName(l);
      if (names.indexOf(n) < 0) names.push(n);
    });
    return names.join(', ') || '—';
  },
  saleCatKg(s, catKey) {
    return round1((s.lines || []).filter(l => l.category === catKey).reduce((a, l) => a + num(l.qtyKg), 0));
  },

  /* ============================================================
     PAYMENT / COLLECTION
     ============================================================ */
  /** Due sales (oldest first) with computed dues */
  dueSales(customerId) {
    return this.customerAccount(customerId).saleRows.filter(s => s._due > 0.009);
  },

  /**
   * Receive payment. Amount FIFO distribute hota hai:
   *  • ya amount diya jaye  → kg khud calculate hoga (amount / rate)
   *  • ya kg diya jaye      → amount = kg × rate, aur woh kg us sale
   *                            se cut hote hain (partial).
   * Return: {records:[...], appliedTo:[{saleNo,kg,amount}], advance, balance}
   */
  collectPayment(opts) {
    const o = opts || {};
    const cid = o.customerId;
    const rate = num(o.rate) || this.rate();
    const date = o.date || todayISO();
    let amount = round2(o.amount);
    let kg = o.kg != null && o.kg !== '' ? round1(o.kg) : null;
    if (kg != null && !amount) amount = round2(kg * rate);
    if (!cid || amount <= 0) return { ok: false, msg: 'Customer aur amount zaroori hai' };

    const due = this.dueSales(cid);
    const appliedTo = [];
    let left = amount;
    const records = [];
    let seq = 0;

    due.forEach(s => {
      if (left <= 0.009) return;
      const take = round2(Math.min(left, s._due));
      left = round2(left - take);
      const r = num(s.rate) || rate;
      const takeKg = round1(take / r);
      appliedTo.push({ saleId: s.id, saleNo: s.invoiceNo, kg: takeKg, amount: take, rate: r, prevDueKg: s._kgDue, prevDueAmt: s._due });
      records.push({
        id: uid('pay'), no: DB.nextNumber('payment'), customerId: cid, saleId: s.id,
        date, amount: take, kgCovered: takeKg, rate: r, mode: o.mode || 'Cash',
        note: o.note || '', ref: o.ref || '', isAdvance: false, batchId: o.batchId || '',
        createdAt: new Date().toISOString()
      });
    });

    // extra amount → advance (poora kg cover ho gaya, bacha hua paisa aage ke bill mein)
    if (left > 0.009) {
      records.push({
        id: uid('pay'), no: DB.nextNumber('payment'), customerId: cid, saleId: null,
        date, amount: left, kgCovered: round1(left / rate), rate, mode: o.mode || 'Cash',
        note: (o.note ? o.note + ' · ' : '') + 'Advance (aage ke bill mein adjust)',
        ref: o.ref || '', isAdvance: true, batchId: o.batchId || '', createdAt: new Date().toISOString()
      });
    }

    records.forEach(r => DB.upsert('payments', r, { silent: true }));
    DB.save();
    DB.audit('payment', 'Payment ' + fmtMoney(amount) + ' received from ' + this.customerName(cid) +
      (kg != null ? ' (' + fmtKg(kg) + ')' : '') + ' on ' + fmtDate(date), { ref: records.map(r => r.no).join(',') });

    const acc = this.customerAccount(cid);
    return {
      ok: true, records, appliedTo,
      advance: acc.advance, balance: acc.balance,
      totalAmount: amount,
      totalKg: kg != null ? kg : round1(appliedTo.reduce((a, x) => a + num(x.kg), 0) + (Math.max(0, left) / rate))
    };
  },

  /** Payment directly against one sale (custom invoice bill) */
  payAgainstSale(saleId, amount, meta) {
    const m = meta || {};
    const s = DB.get('sales', saleId);
    if (!s) return { ok: false, msg: 'Sale nahi mili' };
    const rate = this.saleRate(s);
    const amt = round2(amount);
    if (amt <= 0) return { ok: false, msg: 'Amount zaroori hai' };
    const rec = {
      id: uid('pay'), no: DB.nextNumber('payment'), customerId: s.customerId, saleId: s.id,
      date: m.date || todayISO(), amount: amt, kgCovered: round1(amt / rate), rate,
      mode: m.mode || 'Cash', note: m.note || ('Bill ' + s.invoiceNo + ' ke against'), ref: m.ref || '',
      isAdvance: false, createdAt: new Date().toISOString()
    };
    DB.upsert('payments', rec);
    DB.audit('payment', 'Bill ' + s.invoiceNo + ' par ' + fmtMoney(amt) + ' receive hua', { ref: rec.no });
    return { ok: true, record: rec };
  },

  /* ============================================================
     SALES / OPERATIONS
     ============================================================ */
  salesIn(range) { return this.sales().filter(s => range.match(s.entryDate)); },
  deliveredIn(range) {
    return this.sales().filter(s => s.deliveryDate && (s.status === 'delivered' || s.status === 'partial') && range.match(s.deliveryDate));
  },
  paymentsIn(range) { return this.payments().filter(p => range.match(p.date)); },
  expensesIn(range) { return this.expenses().filter(e => range.match(e.date)); },
  salariesIn(range) { return this.salaries().filter(e => range.match(e.date)); },
  purchasesIn(range) { return this.purchases().filter(e => range.match(e.date)); },
  drawingsIn(range) { return this.drawings().filter(e => range.match(e.date)); },

  /** Pending = received but not yet delivered (all time, what's in the factory) */
  inFactory() { return this.sales().filter(s => this.pendingKg(s) > 0.05); },
  inFactoryKg() { return round1(this.inFactory().reduce((a, s) => a + this.pendingKg(s), 0)); },
  inFactoryPieces() { return this.inFactory().reduce((a, s) => a + this.pendingPcs(s), 0); },

  /** Receivables across all customers */
  receivables() {
    let bal = 0, adv = 0, kgBal = 0;
    DB.all('customers').forEach(c => {
      const a = this.customerAccount(c.id);
      bal = round2(bal + a.balance); adv = round2(adv + a.advance); kgBal = round1(kgBal + a.kgBalance);
    });
    return { balance: bal, advance: adv, kgBalance: kgBal };
  },

  /* ============================================================
     DASHBOARD METRICS for a period
     ============================================================ */
  metrics(range) {
    const r = range || Period;
    const sales = this.salesIn(r);
    const receivedKg = round1(sales.reduce((a, s) => a + this.saleKg(s), 0));
    const receivedPcs = sales.reduce((a, s) => a + num(s.piecesTotal), 0);
    const delivered = this.deliveredIn(r);
    const deliveredKg = round1(delivered.reduce((a, s) => a + this.saleDeliveredKg(s), 0));
    const deliveredPcs = delivered.reduce((a, s) => a + num(s.deliveredPcs), 0);
    const income = round2(sales.reduce((a, s) => a + this.saleAmount(s), 0));
    const collected = round2(this.paymentsIn(r).reduce((a, p) => a + num(p.amount), 0));
    const expenses = round2(this.expensesIn(r).reduce((a, e) => a + num(e.amount), 0));
    const salaries = round2(this.salariesIn(r).reduce((a, e) => a + num(e.amount), 0));
    const purchases = round2(this.purchasesIn(r).reduce((a, e) => a + num(e.amount), 0));
    const drawings = round2(this.drawingsIn(r).reduce((a, e) => a + num(e.amount), 0));
    const totalExpenses = round2(expenses + salaries + purchases);
    const profit = round2(income - totalExpenses);
    const catKg = {};
    this.catKeys().forEach(k => catKg[k] = 0);
    sales.forEach(s => (s.lines || []).forEach(l => { catKg[l.category || 'A'] = round1((catKg[l.category || 'A'] || 0) + num(l.qtyKg)); }));
    return {
      label: (typeof r.label === 'function') ? r.label() : (r.name || 'Period'), range: r,
      newEntries: sales.length, receivedKg, receivedPcs,
      deliveredCount: delivered.length, deliveredKg, deliveredPcs,
      inFactoryKg: this.inFactoryKg(), inFactoryCount: this.inFactory().length, inFactoryPcs: this.inFactoryPieces(),
      pendingKg: this.inFactoryKg(),
      income, collected, expenses, salaries, purchases, drawings, totalExpenses, profit,
      avgRate: receivedKg > 0 ? round2(income / receivedKg) : 0,
      catKg,
      cashInHand: round2(collected - expenses - salaries - purchases - drawings)
    };
  },

  /** Monthly series for last n months — income / expense / kg */
  monthlySeries(n) {
    const out = [];
    const d = new Date(); d.setDate(1);
    for (let i = (n || 6) - 1; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const ym = isoDay(dt).slice(0, 7);
      const rg = { match: dd => String(dd || '').slice(0, 7) === ym };
      const m = this.metrics(rg);
      out.push({ ym, label: monthLabel(ym), income: m.income, expenses: m.totalExpenses, profit: m.profit, kg: m.receivedKg });
    }
    return out;
  },

  /** Daily series inside a period (for sparkline) */
  dailySeries(range) {
    const r = range || Period;
    const from = r.range === 'today' ? todayISO() : (r.range === 'custom' ? (r.from || todayISO()) : monthStart(r.month));
    const to = r.range === 'today' ? todayISO() : (r.range === 'custom' ? (r.to || todayISO()) : (r.month === monthKey(todayISO()) ? todayISO() : monthEnd(r.month)));
    const days = [];
    let cur = from;
    let guard = 0;
    while (cur <= to && guard++ < 400) {
      const rg = { match: dd => String(dd || '').slice(0, 10) === cur };
      days.push({
        date: cur, kg: round1(this.salesIn(rg).reduce((a, s) => a + this.saleKg(s), 0)),
        income: round2(this.salesIn(rg).reduce((a, s) => a + this.saleAmount(s), 0)),
        expenses: round2(this.expensesIn(rg).concat(this.salariesIn(rg), this.purchasesIn(rg)).reduce((a, e) => a + num(e.amount), 0))
      });
      cur = addDays(cur, 1);
    }
    return days;
  },

  /* ============================================================
     DEMO DATA (Settings → Demo data) — testing ke liye
     ============================================================ */
  loadDemo() {
    const now = new Date().toISOString();
    const names = [
      ['Al-Habib Hotel', '0300-1112233'], ['Karachi Guest House', '0301-4455667'],
      ['Sindh Restaurant', '0333-9988776'], ['Bismillah Catering', '0345-6677889'],
      ['Sea View Apartments', '0322-3344556'], ['Green Valley Hostel', '0311-2233445'],
      ['Zamzam Dry Cleaner', '0308-5566778'], ['City Salon & Spa', '0313-7788990']
    ];
    const custIds = names.map((n, i) => {
      const id = uid('cus');
      DB.upsert('customers', { id, code: 'CUS-' + String(i + 1).padStart(4, '0'), name: n[0], phone: n[1], address: 'Karachi', type: 'Vendor', openingBalance: 0, creditLimit: 0, active: true, createdAt: now }, { silent: true });
      return id;
    });
    const prods = DB.all('products');
    const cats = ['A', 'B', 'C'];
    let inv = DB._data._counters.invoice;
    for (let d = 45; d >= 0; d--) {
      const date = addDays(todayISO(), -d);
      const dayCount = Math.floor(Math.random() * 3);
      for (let k = 0; k < dayCount; k++) {
        const cid = custIds[Math.floor(Math.random() * custIds.length)];
        const lines = [];
        const nLines = 1 + Math.floor(Math.random() * 2);
        for (let l = 0; l < nLines; l++) {
          const cat = cats[Math.floor(Math.random() * 3)];
          const pool = prods.filter(p => p.category === cat);
          const p = pool[Math.floor(Math.random() * pool.length)] || prods[0];
          lines.push({ id: uid('ln'), productId: p.id, category: cat, qtyKg: round1(2 + Math.random() * 25), pcs: 0, note: '' });
        }
        inv++;
        const kg = round1(lines.reduce((a, l) => a + num(l.qtyKg), 0));
        const rate = num(DB.settings().ratePerKg) || 200;
        const delivered = d > 3;
        DB.upsert('sales', {
          id: uid('sal'), invoiceNo: 'INV-' + String(inv).padStart(4, '0'), branchId: (DB.all('branches')[0] || {}).id,
          customerId: cid, entryDate: date, deliveryDate: delivered ? addDays(date, 1 + Math.floor(Math.random() * 3)) : '',
          status: delivered ? 'delivered' : 'open', lines, kgTotal: kg,
          piecesTotal: 0, rate, amount: round2(kg * rate),
          paymentMode: Math.random() > 0.5 ? 'Cash' : 'Credit', amountPaidAtEntry: 0, note: '',
          createdBy: 'Demo', createdAt: new Date().toISOString()
        }, { silent: true });
      }
      if (Math.random() > 0.75) {
        DB.upsert('expenses', { id: uid('exp'), no: DB.nextNumber('expense'), date, branchId: (DB.all('branches')[0] || {}).id, category: ['Fuel', 'Chemicals & Detergent', 'Electricity', 'Transport', 'Maintenance & Repair'][Math.floor(Math.random() * 5)], amount: round2(500 + Math.random() * 6000), paidTo: 'Local vendor', mode: 'Cash', note: 'Demo expense', createdAt: new Date().toISOString() }, { silent: true });
      }
    }
    DB._data._counters.invoice = Math.max(inv, num(DB._data._counters.invoice));
    // payments — 70% customers se collection
    custIds.forEach(cid => {
      const acc = this.customerAccount(cid);
      const target = round2(acc.amount * (0.45 + Math.random() * 0.5));
      if (target > 0) {
        this.collectPayment({ customerId: cid, amount: target, date: addDays(todayISO(), -Math.floor(Math.random() * 10)), mode: 'Cash', note: 'Demo payment' });
      }
    });
    DB.upsert('employees', { id: uid('emp'), code: 'EMP-0001', name: 'Rashid (Washing Master)', role: 'Washing', salary: 45000, phone: '0300-0000000', joinDate: addDays(todayISO(), -200), active: true, createdAt: now }, { silent: true });
    DB.upsert('employees', { id: uid('emp'), code: 'EMP-0002', name: 'Imran (Iron Man)', role: 'Ironing', salary: 35000, phone: '0300-0000001', joinDate: addDays(todayISO(), -120), active: true, createdAt: now }, { silent: true });
    DB.save();
    DB.audit('demo', 'Demo data load kiya gaya');
  },

  clearTransactions() {
    ['sales', 'payments', 'expenses', 'purchases', 'salaries', 'drawings', 'auditLog'].forEach(t => DB._data[t] = []);
    DB._data._counters.invoice = 1000;
    DB.save();
    DB.audit('reset', 'Saara transaction data clear kiya gaya (customers/products safe hain)');
  },

  /* ============================================================
     PENDING DELIVERY AGEING
     ============================================================ */
  pendingWithAge() {
    const t = todayISO();
    return this.inFactory().map(s => Object.assign({}, s, {
      ageDays: s.entryDate ? daysBetween(s.entryDate, t) : 0
    })).sort((a, b) => b.ageDays - a.ageDays);
  }
};
