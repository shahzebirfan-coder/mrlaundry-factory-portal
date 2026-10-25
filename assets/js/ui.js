/* ============================================================
   MR LAUNDRY FACTORY PORTAL — UI SHELL
   Sidebar, topbar, layout, theme, quick actions, global search
   ============================================================ */

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>', sub: 'Live business summary' },
  { id: 'newsales', label: 'New Sales', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>', sub: 'Per-KG wash slip banana' },
  { id: 'sales', label: 'Order Invoices', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>', sub: 'Saari entries, delivery & billing', badge: 'inFactory' },
  { id: 'delivery', label: 'Delivery Queue', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>', sub: 'Factory mein jo kapre hain' },
  { id: 'customers', label: 'Customers', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>', sub: 'Vendor / client accounts' },
  { id: 'ledger', label: 'Payment Ledger', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>', sub: 'Payment, kg balance, statement' },
  { id: 'products', label: 'Products', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>', sub: 'Wash items list' },
  { id: 'expenses', label: 'Expenses', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>', sub: 'Factory ke rozmarra kharchay' },
  { id: 'purchases', label: 'Purchases', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>', sub: 'Bahir se kharida gaya maal' },
  { id: 'vendorlist', label: 'Vendors', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>', sub: 'Vendors aur unki requirements' },
  { id: 'employees', label: 'Employees', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>', sub: 'Factory staff aur salary payments' },
  { id: 'drawings', label: 'Owner', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>', sub: 'Owner ka nikaal / personal use' },
  { id: 'logout', label: 'Logout', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>', sub: 'Portal se nikalna' },

  { sec: 'More' },
  { id: 'reports', label: 'Reports', icon: '📈', sub: 'Business analysis aur exports' },
  { id: 'branches', label: 'Branches', icon: '🏢', sub: 'Factory aur shop branches' },
  { id: 'users', label: 'Users', icon: '🔐', sub: 'Staff logins aur permissions' },
  { id: 'settings', label: 'Settings', icon: '⚙️', sub: 'Shop profile, rate, cloud, backup' }
];

const PAGE_TITLES = {
  dashboard: ['Dashboard', 'Aapke factory ka poora business — aik nazar mein'],
  newsales: ['New Sales — Wash Entry', 'Daily clients se aane wale kapre — items aur KG ke saath record karein'],
  sales: ['Order Invoices / Sales', 'Har entry ka status, delivery date aur billing'],
  delivery: ['Delivery Queue', 'Factory mein maujood kapre — age ke sath'],
  customers: ['Customers', 'Clients / vendor accounts'],
  ledger: ['Payment Ledger', 'Payment, kg ka hisaab aur running statement'],
  products: ['Products', 'Wash items list'],
  expenses: ['Expenses', 'Factory ke rozmarra kharchay'],
  purchases: ['Purchases from Vendors', 'Bahir se kharida gaya maal'],
  vendorlist: ['Vendors', 'Vendors aur unki requirements'],
  employees: ['Employees & Salary', 'Factory staff aur salary payments'],
  drawings: ['Owner Drawings', 'Owner ka nikaal / personal use'],
  branches: ['Branches', 'Factory aur shop branches'],
  reports: ['Reports', 'Business analysis aur exports'],
  users: ['Users', 'Staff logins aur permissions'],
  settings: ['Settings', 'Shop profile, rate, printers, cloud & backup']
};

const UI = {
  sidebarOpen: false,
  theme() { return SafeStore.get('mlfTheme') || 'light'; },
  setTheme(t) {
    SafeStore.set('mlfTheme', t);
    document.documentElement.dataset.theme = t;
    const b = $('#themeBtn'); if (b) b.innerHTML = t === 'dark' ? '☀️' : '🌙';
  },
  toggleTheme() { this.setTheme(this.theme() === 'dark' ? 'light' : 'dark'); },

  /* ---------------- LAYOUT ---------------- */
  renderLayout(page, contentHtml, opts) {
    const o = opts || {};
    const s = DB.settings();
    const u = DB.currentUser();
    const t = PAGE_TITLES[page] || [page, ''];
    const logo = s.logoImage || 'assets/img/logo.jpeg';

    const items = NAV.map(n => {
      if (n.sec) return '<div class="nav-sec">' + n.sec + '</div>';
      if (n.id !== 'logout' && !DB.can(n.id) && !o.forceAll) return '';
      let badge = '';
      if (n.badge === 'inFactory') {
        const c = Biz.inFactory().length;
        if (c) badge = '<span class="nav-badge">' + c + '</span>';
      }
      if (n.id === 'ledger') {
        const r = Biz.receivables();
        if (r.balance > 0) badge = '<span class="nav-badge warn">' + fmtMoneyShort(r.balance).replace('Rs. ', '') + '</span>';
      }
      return `<a class="nav-item ${page === n.id ? 'on' : ''}" href="#${n.id}" data-page="${n.id}" title="${esc(n.sub || '')}">
        <span class="nav-ico">${n.icon}</span><span class="nav-lbl">${esc(n.label)}</span>${badge}
      </a>`;
    }).join('');

    $('#app').innerHTML = `
      <div class="shell">
        <aside class="sidebar ${this.sidebarOpen ? 'open' : ''}" id="sidebar">
          <div class="brand">
            <div class="brand-logo-wrap">
              <img src="assets/img/celinesoft-logo-clean.png" alt="CelineSoft" class="brand-logo-img"/>
            </div>
          </div>
          <nav class="nav" id="mainNav">${items}</nav>
          <div class="side-foot">
            <div class="sf-user">
              <div class="avatar">${esc(initials(u ? u.name : '?'))}</div>
              <div class="sf-txt"><b>${esc(u ? u.name : 'Guest')}</b><span>${esc(u ? titleCase(u.role) : '')}</span></div>
            </div>
            <button class="btn btn-ghost btn-sm btn-block" id="logoutBtn" style="color:#94a3b8;border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.05)">🚪 Logout</button>
          </div>
        </aside>
        <div class="side-overlay" id="sideOverlay"></div>

        <main class="main">
          <header class="topbar">
            <button class="icon-btn menu-btn" id="menuBtn" title="Menu">☰</button>
            <div class="tb-title">
              <h1>${esc(s.shopName || 'Mr Laundry Factory')} - FACTORY PORTAL</h1>
              <p>${esc(o.subtitle !== undefined ? o.subtitle : (t[1] || 'Aapke factory ka poora business — aik nazar mein'))}</p>
            </div>
            <div class="tb-actions">
              <div class="gs-wrap">
                <input class="inp inp-sm gs" id="globalSearch" placeholder="🔍 Search" autocomplete="off"/>
                <div class="gs-drop" id="gsDrop"></div>
              </div>
              <button class="icon-btn" id="themeBtn" title="Theme">${this.theme() === 'dark' ? '☀️' : '🌙'}</button>
              <button class="btn btn-teal btn-sm" id="quickNew">＋ New Sale</button>
              <button class="icon-btn" id="moreBtn" title="More">⋯</button>
            </div>
          </header>
          <section class="page" id="pageBody">${contentHtml}</section>
          <footer class="foot">${esc(s.shopName || 'Mr Laundry Factory')} · Factory Portal · <span id="cloudDot">${Cloud.statusLabel()}</span></footer>
        </main>
      </div>`;

    this.bindLayout(page);
    return true;
  },

  bindLayout(page) {
    const self = this;
    $$('.nav-item').forEach(a => a.onclick = async e => {
      e.preventDefault();
      self.sidebarOpen = false;
      const sb = $('#sidebar'); if (sb) sb.classList.remove('open');
      if (a.dataset.page === 'logout') {
        const yes = await confirmDialog('Logout karna hai?', { title: 'Logout', yes: 'Yes, logout' });
        if (yes) { DB.logout(); app.go('login'); }
        return;
      }
      app.go(a.dataset.page);
    });
    const mb = $('#menuBtn'); if (mb) mb.onclick = () => { this.sidebarOpen = !this.sidebarOpen; $('#sidebar').classList.toggle('open', this.sidebarOpen); $('#sideOverlay').classList.toggle('show', this.sidebarOpen); };
    const so = $('#sideOverlay'); if (so) so.onclick = () => { this.sidebarOpen = false; $('#sidebar').classList.remove('open'); so.classList.remove('show'); };
    const lb = $('#logoutBtn'); if (lb) lb.onclick = async () => {
      const yes = await confirmDialog('Logout karna hai?', { title: 'Logout', yes: 'Yes, logout' });
      if (yes) { DB.logout(); app.go('login'); }
    };
    const tb = $('#themeBtn'); if (tb) tb.onclick = () => this.toggleTheme();
    const cc = $('#cloudChip');
    if (cc) {
      cc.onclick = async () => {
        if (!Cloud.ready) { app.go('settings'); setTimeout(() => { const b = document.querySelector('[data-st="cloud"]'); if (b) b.click(); }, 250); return; }
        await Cloud.syncNow();
        this.bindLayout(page);
      };
      Cloud.updateDot();
    }
    const qn = $('#quickNew'); if (qn) {
      if (!DB.can('newsales')) qn.style.display = 'none';
      else qn.onclick = () => app.go('newsales');
    }
    const mb2 = $('#moreBtn'); if (mb2) mb2.onclick = () => this.quickMenu();
    this.bindSearch(page);
  },

  bindSearch(page) {
    const inp = $('#globalSearch'), drop = $('#gsDrop');
    if (!inp) return;
    const run = () => {
      const q = inp.value.trim().toLowerCase();
      if (q.length < 2) { drop.classList.remove('show'); return; }
      const custs = DB.all('customers').filter(c => (c.name || '').toLowerCase().includes(q) || String(c.phone || '').includes(q) || String(c.code || '').toLowerCase().includes(q)).slice(0, 6);
      const sales = DB.all('sales').filter(s => String(s.invoiceNo || '').toLowerCase().includes(q)).slice(0, 5);
      let html = '';
      if (custs.length) html += '<div class="gs-sec">Customers</div>' + custs.map(c =>
        `<div class="gs-item" data-cust="${c.id}"><span>👤</span><div><b>${esc(c.name)}</b><i>${esc(c.phone || '')} · Bal ${fmtMoney(Biz.customerAccount(c.id).balance)}</i></div></div>`).join('');
      if (sales.length) html += '<div class="gs-sec">Invoices</div>' + sales.map(s =>
        `<div class="gs-item" data-sale="${s.id}"><span>🧾</span><div><b>${esc(s.invoiceNo)}</b><i>${esc(Biz.customerName(s.customerId))} · ${fmtKg(s.kgTotal)} · ${fmtDate(s.entryDate)}</i></div></div>`).join('');
      if (!html) html = '<div class="gs-empty">Kuch nahi mila</div>';
      drop.innerHTML = html;
      drop.classList.add('show');
      $$('.gs-item', drop).forEach(it => it.onclick = () => {
        drop.classList.remove('show'); inp.value = '';
        if (it.dataset.cust) openCustomerProfile(it.dataset.cust);
        else app.go('sales?sale=' + it.dataset.sale);
      });
    };
    inp.oninput = debounce(run, 220);
    inp.onblur = () => setTimeout(() => drop.classList.remove('show'), 220);
    inp.onfocus = run;
  },

  quickMenu() {
    const rows = [
      ['➕ New Sale (Wash Entry)', 'newsales'],
      ['🧾 All Invoices / Sales', 'sales'],
      ['🚚 Delivery Queue', 'delivery'],
      ['📒 Payment Ledger', 'ledger'],
      ['👥 Customers', 'customers'],
      ['🧺 Products', 'products'],
      ['💸 Expenses', 'expenses'],
      ['🛒 Purchases', 'purchases'],
      ['🏬 Vendors', 'vendorlist'],
      ['👷 Employees', 'employees'],
      ['🏧 Owner Drawings', 'drawings'],
      ['🏢 Branches', 'branches'],
      ['📈 Reports', 'reports'],
      ['🔐 Users', 'users'],
      ['⚙️ Settings', 'settings']
    ].filter(r => DB.can(r[1]));
    const w = openModal({
      title: 'Quick Navigation',
      size: 'sm',
      body: '<div class="quick-menu">' + rows.map(r => `<button class="qm-item" data-go="${r[1]}">${r[0]}</button>`).join('') + '</div>'
    });
    $$('[data-go]', w).forEach(b => b.onclick = () => { closeModal(w); app.go(b.dataset.go); });
  },

  setPageTitle(title, sub) {
    const t = $('#pageBody');
    const h = document.querySelector('.tb-title h1');
    const p = document.querySelector('.tb-title p');
    if (h && title) h.textContent = title;
    if (p && sub !== undefined) p.textContent = sub;
  },

  /* ---------------- SHARED WIDGETS ---------------- */
  statCard(o) {
    return `<div class="stat ${o.tone || ''} ${o.clickable ? 'stat-click' : ''}" ${o.attrs || ''}>
      <div class="stat-top"><span class="stat-ic">${o.icon || '•'}</span>
        <span class="stat-lbl">${esc(o.label)}</span></div>
      <div class="stat-val">${o.value}</div>
      ${o.foot ? '<div class="stat-foot">' + o.foot + '</div>' : ''}
    </div>`;
  },

  /** simple inline SVG bar chart: [{label, a, b}] */
  barChart(series, opts) {
    const o = opts || {};
    const max = Math.max(1, ...series.map(s => Math.max(num(s.income), num(s.expenses))));
    const w = 100 / series.length;
    const bars = series.map((s, i) => {
      const ih = Math.max(1.5, (num(s.income) / max) * 100);
      const eh = Math.max(1.5, (num(s.expenses) / max) * 100);
      const x = i * w;
      return `<g>
        <rect x="${x + w * 0.10}%" y="${100 - ih}%" width="${w * 0.34}%" height="${ih}%" rx="1.4" fill="url(#gInc)" class="bar-tip" data-tip="${esc(s.label)} · Income ${fmtMoney(s.income)}"/>
        <rect x="${x + w * 0.53}%" y="${100 - eh}%" width="${w * 0.34}%" height="${eh}%" rx="1.4" fill="url(#gExp)" class="bar-tip" data-tip="${esc(s.label)} · Expense ${fmtMoney(s.expenses)}"/>
        <text x="${x + w / 2}%" y="99%" text-anchor="middle" font-size="3.1" fill="currentColor" opacity=".7">${esc(s.label.split(' ')[0])}</text>
      </g>`;
    }).join('');
    return `<div class="chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="bar-chart" style="height:${o.height || 170}px">
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4f7cff"/><stop offset="100%" stop-color="#7c5cff"/></linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#ef4444"/></linearGradient>
        </defs>
        ${bars}
      </svg>
      <div class="chart-legend"><span><i class="dot inc"></i> Income</span><span><i class="dot exp"></i> Expenses</span></div>
    </div>`;
  },

  /** horizontal progress rows: [{label, value, max, color, note}] */
  progressRows(rows) {
    const max = Math.max(1, ...rows.map(r => num(r.value)));
    return rows.map(r => `<div class="prow">
      <div class="prow-top"><span>${esc(r.label)}</span><b>${r.note || (fmtKg(r.value))}</b></div>
      <div class="pbar"><i style="width:${Math.max(2, (num(r.value) / max) * 100)}%;background:${r.color || '#4f7cff'}"></i></div>
    </div>`).join('');
  },

  /** donut of category kg */
  catDonut(catKg) {
    const cats = Biz.categories();
    const entries = cats.map(c => ({ key: c.key, label: c.label, color: c.color, v: num(catKg[c.key]) }));
    const total = entries.reduce((a, e) => a + e.v, 0);
    let acc = 0, stops = [];
    if (total <= 0) stops.push('#e5e9f2 0 100%');
    else entries.forEach(e => {
      const pct = (e.v / total) * 100;
      stops.push(e.color + ' ' + acc.toFixed(2) + '% ' + (acc + pct).toFixed(2) + '%');
      acc += pct;
    });
    return `<div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops.join(',')})">
        <div class="donut-hole"><b>${fmtNum(total, total % 1 ? 1 : 0)}</b><span>KG</span></div>
      </div>
      <div class="donut-legend">
        ${entries.map(e => `<div class="dl-row"><i style="background:${e.color}"></i>
          <span class="dl-lbl">${esc(e.label)}</span>
          <b>${fmtKg(e.v)}</b>
          <em>${total ? Math.round((e.v / total) * 100) : 0}%</em></div>`).join('')}
      </div>
    </div>`;
  },

  statusPill(status) {
    if (status === 'delivered') return '<span class="pill pill-ok">✔ Delivered</span>';
    if (status === 'cancelled') return '<span class="pill pill-muted">Cancelled</span>';
    return '<span class="pill pill-warn">⏳ In Factory</span>';
  },
  payPill(sale) {
    const due = num(sale._due);
    if (due <= 0.009) return '<span class="pill pill-ok">Paid</span>';
    if (num(sale._applied) > 0) return '<span class="pill pill-warn">Partial</span>';
    return '<span class="pill pill-due">Unpaid</span>';
  },

  /** Customer select options with add-new button */
  customerPicker(id, selectedId, opts) {
    const o = opts || {};
    const list = DB.all('customers').filter(c => c.active !== false).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return `<div class="picker">
      <select class="inp" id="${id}">
        <option value="">— Select customer —</option>
        ${list.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${esc(c.name)}${c.code ? ' (' + esc(c.code) + ')' : ''}</option>`).join('')}
      </select>
      ${o.addBtn === false ? '' : `<button class="btn btn-ghost btn-sm" id="${id}_add" title="Naya customer">➕</button>`}
    </div>`;
  },

  bindCustomerPicker(id, onPick, afterAdd) {
    const sel = $('#' + id), add = $('#' + id + '_add');
    if (sel && onPick) sel.onchange = e => onPick(e.target.value);
    if (add) add.onclick = async () => {
      const nc = await customerForm(null);
      if (nc && nc.id) {
        UI.refreshCustomerSelect(id, nc.id);
        onPick && onPick(nc.id);
      }
    };
  },
  refreshCustomerSelect(id, selected) {
    const sel = $('#' + id);
    if (!sel) return;
    const list = DB.all('customers').filter(c => c.active !== false).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    sel.innerHTML = '<option value="">— Select customer —</option>' + list.map(c =>
      `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}${c.code ? ' (' + esc(c.code) + ')' : ''}</option>`).join('');
  }
};
