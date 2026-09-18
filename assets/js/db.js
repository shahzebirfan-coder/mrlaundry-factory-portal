/* ============================================================
   MR LAUNDRY FACTORY PORTAL — DATA LAYER
   ------------------------------------------------------------
   Storage  : localStorage (offline-first, always works)
   Cloud    : optional Firebase Realtime Database sync (Settings
              mein apna config paste karein → "Cloud Sync ON")
   ------------------------------------------------------------
   Tables:
     users[]       staff logins + permissions
     branches[]    factory / shop / unit branches
     customers[]   B2B clients (vendors) jin ko per-kg wash dete hain
     products[]    wash items (Wash & Fold, Iron, Dry Clean...) — category wise
     sales[]       wash slips  { invoiceNo, branchId, customerId, entryDate,
                                 deliveryDate(null until delivered), status,
                                 lines:[{productId, category, qtyKg, pcs, note}],
                                 kgTotal, piecesTotal, rate, amount, paymentMode,
                                 amountPaidAtEntry }
     payments[]    ledger payments { customerId, date, amount, kgCovered,
                                     allocated:[{saleId, amount}], saleItems[], note }
     expenses[]    factory expenses
     purchases[]   items bought from outside vendors
     vendors[]     vendors (jin se purchase karte hain)
     employees[]   factory staff + monthly salary
     salaries[]    salary payments
     drawings[]    owner drawings / nikaal
     settings{}    shop profile, rate per kg, category labels, cloud config
     auditLog[]    har action ka record
   ============================================================ */

const DB_KEY = 'mlfFactoryDB';
const SESSION_KEY = 'mlfSession';

const SHOP_DEFAULTS = {
  shopName: 'Mr Laundry Factory',
  tagline: 'Wash · Dry · Iron · Fold (Per KG Basis)',
  phone: '',
  address: '',
  currency: 'Rs.'
};

const DEFAULT_CATEGORIES = [
  { key: 'A', label: 'A Category', color: '#2563eb', desc: 'Premium / Heavy wash' },
  { key: 'B', label: 'B Category', color: '#16a34a', desc: 'Normal wash' },
  { key: 'C', label: 'C Category', color: '#d97706', desc: 'Light / Quick wash' }
];

const DB = {
  _data: null,

  /* ---------------- LOAD / SAVE ---------------- */
  load() {
    let raw = null;
    try { raw = SafeStore.get(DB_KEY); } catch (e) { raw = null; }
    if (raw) {
      try { this._data = JSON.parse(raw); } catch (e) { this._data = null; }
    }
    if (!this._data) this._data = this._seed();
    this._migrate();
    this.save();
    return this._data;
  },

  _seed() {
    const now = new Date().toISOString();
    return {
      users: [
        { id: 'u_owner', name: 'Owner', username: 'owner', password: 'owner123', role: 'owner', active: true, createdAt: now },
        { id: 'u_manager', name: 'Manager', username: 'manager', password: 'manager123', role: 'manager', active: true, permissions: ['dashboard', 'newsales', 'sales', 'customers', 'ledger', 'products', 'expenses', 'purchases', 'vendors', 'employees', 'reports', 'drawings', 'branches'], createdAt: now },
        { id: 'u_cashier', name: 'Cashier', username: 'cashier', password: 'cashier123', role: 'cashier', active: true, permissions: ['dashboard', 'newsales', 'sales', 'customers', 'ledger'], createdAt: now }
      ],
      branches: [
        { id: 'b_factory', name: 'Main Factory', type: 'factory', phone: '', address: '', color: '#4f7cff', isActive: true, createdAt: now }
      ],
      customers: [],
      products: [
        { id: 'p_washfold', name: 'Wash & Fold', category: 'A', inputType: 'kg', unitPrice: 200, active: true, createdAt: now },
        { id: 'p_machinewash', name: 'Machine Wash + Dry', category: 'A', inputType: 'kg', unitPrice: 200, active: true, createdAt: now },
        { id: 'p_irononly', name: 'Iron / Press Only', category: 'B', inputType: 'kg', unitPrice: 200, active: true, createdAt: now },
        { id: 'p_dryclean', name: 'Dry Clean', category: 'B', inputType: 'kg', unitPrice: 200, active: true, createdAt: now },
        { id: 'p_stain', name: 'Stain Removal / Special Treatment', category: 'C', inputType: 'kg', unitPrice: 200, active: true, createdAt: now },
        { id: 'p_shoes', name: 'SHOES', category: 'A', inputType: 'kg', unitPrice: 320, active: true, createdAt: now,
          types: ['Junior Shoes', 'Sports Shoes', 'Man Shoes', 'CH Shoes'] }
      ],
      sales: [], payments: [], expenses: [], purchases: [], vendors: [], vendorRequests: [],
      employees: [], salaries: [], drawings: [], deliveries: [], auditLog: [],
      settings: Object.assign({
        shopName: 'Mr Laundry Factory',
        tagline: 'Wash · Dry · Iron · Fold (Per KG Basis)',
        phone: '', email: '', address: '', ntn: '',
        logoImage: 'assets/img/logo.jpeg',          // app / screen logo
        logoColorImage: 'assets/img/logo.jpeg',     // A4 invoice logo
        logoMonoImage: 'assets/img/logo-thermal.png', // black-only thermal logo
        logoMono: true,
        currency: 'Rs.',
        ratePerKg: 320,
        // ---- Thermal printer (black copper) settings ----
        slipPaper: 'thermal80',   // thermal80 | thermal58 | a5 | a4
        slipLogo: true,
        slipLogoHeight: 40,
        slipPhone: true,
        slipAddress: true,
        categories: DEFAULT_CATEGORIES,
        expenseCategories: ['Salary', 'Fuel', 'Chemicals & Detergent', 'Electricity', 'Water', 'Gas', 'Rent', 'Maintenance & Repair', 'Transport', 'Packaging', 'Utilities', 'Misc'],
        purchaseCategories: ['Detergent', 'Chemicals', 'Bleach', 'Packaging', 'Machine Parts', 'Gas Cylinder', 'Other'],
        slipFooterNote: 'Yeh sale slip hai — amount bill / ledger invoice mein diya jayega.',
        invoiceTerms: 'Payment 7 din mein. Per KG rate ke mutabiq bill hoga. Kharab kapre claim 24 ghante mein report karein.',
        branches: [],
        cloudEnabled: false,
        firebaseConfig: '',
        shopId: ''
      })
    };
  },

  _migrate() {
    const d = this._data;
    const seed = this._seed();
    const tables = ['users', 'branches', 'customers', 'products', 'sales', 'payments',
      'expenses', 'purchases', 'vendors', 'vendorRequests', 'employees', 'salaries', 'drawings',
      'deliveries', 'auditLog'];
    tables.forEach(t => { if (!Array.isArray(d[t])) d[t] = seed[t]; });
    d.settings = Object.assign({}, seed.settings, d.settings || {});
    /* ⚠️ Cloud config (URL / Shop ID / ON-OFF) DEVICE-LEVEL hai — synced
       data se kabhi overwrite na ho (yehi "firebase remove ho gaya" ka fix hai) */
    if (typeof Cloud !== 'undefined' && Cloud.cfg && Cloud.cfg.url) {
      d.settings.cloudEnabled = !!Cloud.cfg.enabled;
      d.settings.firebaseConfig = Cloud.cfg.url;
      d.settings.shopId = Cloud.cfg.shopId;
    }
    // Sirf khali/undefined fields ko default se bharein — user ki edited
    // values (shop name, phone, address) kabhi overwrite na hon.
    Object.keys(SHOP_DEFAULTS).forEach(k => {
      if (d.settings[k] === undefined || d.settings[k] === null || d.settings[k] === '') {
        d.settings[k] = seed.settings[k] || SHOP_DEFAULTS[k];
      }
    });
    if (!Array.isArray(d.settings.categories) || !d.settings.categories.length) d.settings.categories = DEFAULT_CATEGORIES;
    if (!d._counters) d._counters = { invoice: 1000 };
    if (d._counters.invoice == null) d._counters.invoice = 1000;
    // ensure built-in users still exist (passwords editable in Users page)
    (seed.users || []).forEach(su => {
      const exists = d.users.some(u => u && (u.id === su.id || (u.username || '').toLowerCase() === su.username));
      if (!exists) d.users.push(Object.assign({}, su));
    });
    if (!d.branches.length) d.branches = seed.branches;
    // counters repair — invoice number never goes backwards
    const maxInv = (d.sales || []).reduce((m, s) => Math.max(m, num(String(s.invoiceNo || '').replace(/\D/g, ''))), 0);
    if (maxInv >= d._counters.invoice) d._counters.invoice = maxInv;
  },

  save() {
    try {
      this._data._updatedAt = new Date().toISOString();
      SafeStore.set(DB_KEY, JSON.stringify(this._data));
      if (typeof Cloud !== 'undefined' && Cloud.push) Cloud.pushDebounced();
      return true;
    } catch (e) {
      toast('Storage full — Settings se backup lekar purana data clear karein.', 'error', 6000);
      return false;
    }
  },

  /* ---------------- GENERIC TABLE API ---------------- */
  all(tbl, includeDeleted) {
    const rows = (this._data[tbl] || []);
    return includeDeleted ? rows.slice() : rows.filter(r => r && !r._deleted);
  },
  get(tbl, id) { return (this._data[tbl] || []).find(r => r && r.id === id) || null; },
  upsert(tbl, row, opts) {
    const o = opts || {};
    row.updatedAt = new Date().toISOString();
    const arr = this._data[tbl] = this._data[tbl] || [];
    const i = arr.findIndex(r => r && r.id === row.id);
    if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
    else { row.createdAt = row.createdAt || row.updatedAt; arr.push(row); }
    if (!o.silent) this.save();
    return row;
  },
  remove(tbl, id, hard) {
    const arr = this._data[tbl] || [];
    const i = arr.findIndex(r => r && r.id === id);
    if (i < 0) return false;
    if (hard) arr.splice(i, 1);
    else { arr[i]._deleted = true; arr[i].deletedAt = new Date().toISOString(); }
    this.save();
    return true;
  },
  settings() { return this._data.settings; },
  /** cloud config ka mirror (sirf is device par; cloud par push NAHI hota) */
  setCloudMirror(c) {
    if (!this._data) return;
    const s = this._data.settings = this._data.settings || {};
    s.cloudEnabled = !!(c && c.enabled);
    s.firebaseConfig = (c && c.url) || '';
    s.shopId = (c && c.shopId) || '';
    try { SafeStore.set(DB_KEY, JSON.stringify(this._data)); } catch (e) {}
  },
  saveSettings(patch) {
    this._data.settings = Object.assign({}, this._data.settings, patch || {});
    this.save();
    return this._data.settings;
  },
  nextNumber(kind) {
    this._data._counters = this._data._counters || {};
    const c = this._data._counters;
    const prefixMap = { invoice: 'INV', slip: 'SLP', payment: 'RCP', expense: 'EXP', purchase: 'PUR', salary: 'SAL', drawing: 'DRW', customer: 'CUS', vendor: 'VEN', employee: 'EMP', branch: 'BR' };
    c[kind] = num(c[kind]) + 1;
    if (kind === 'invoice') c[kind] = Math.max(c[kind], num(c.invoice));
    const pre = prefixMap[kind] || String(kind).toUpperCase().slice(0, 3);
    return pre + '-' + String(c[kind]).padStart(4, '0');
  },
  countersPreview(kind) {
    const c = (this._data._counters || {})[kind] || 0;
    const prefixMap = { invoice: 'INV', slip: 'SLP', payment: 'RCP' };
    return (prefixMap[kind] || 'GEN') + '-' + String(num(c) + 1).padStart(4, '0');
  },

  /* ---------------- AUTH ---------------- */
  findByUsername(u) {
    const k = String(u || '').trim().toLowerCase();
    return this.all('users').find(x => String(x.username || '').toLowerCase() === k) || null;
  },
  login(username, password) {
    const u = this.findByUsername(username);
    if (!u) return { ok: false, msg: 'User nahi mila' };
    if (u.password !== password) return { ok: false, msg: 'Password ghalat hai' };
    if (u.active === false) return { ok: false, msg: 'Yeh account band hai' };
    SafeStore.set(SESSION_KEY, JSON.stringify({ id: u.id, at: new Date().toISOString() }));
    this.audit('login', u.name + ' login hua');
    return { ok: true, user: u };
  },
  logout() { const u = this.currentUser(); if (u) this.audit('logout', u.name + ' logout hua'); SafeStore.del(SESSION_KEY); },
  currentUser() {
    try {
      const s = JSON.parse(SafeStore.get(SESSION_KEY) || 'null');
      if (!s) return null;
      const u = this.get('users', s.id);
      return (u && u.active !== false) ? u : null;
    } catch (e) { return null; }
  },
  isOwner(u) { u = u || this.currentUser(); return !!u && (u.role === 'owner' || u.role === 'admin'); },
  can(page) {
    const u = this.currentUser();
    if (!u) return false;
    if (this.isOwner(u)) return true;
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    return perms.indexOf(page) >= 0;
  },

  /* ---------------- AUDIT ---------------- */
  audit(action, detail, extra) {
    const u = this.currentUser();
    this._data.auditLog = this._data.auditLog || [];
    this._data.auditLog.unshift({
      id: uid('aud'), action, detail: detail || '', ref: (extra && extra.ref) || '',
      userId: u ? u.id : 'system', userName: u ? u.name : 'System',
      at: new Date().toISOString()
    });
    if (this._data.auditLog.length > 800) this._data.auditLog.length = 800;
    this.save();
  },

  /* ---------------- BACKUP ---------------- */
  backupJSON() {
    return JSON.stringify({ app: 'Mr Laundry Factory Portal', version: 1, exportedAt: new Date().toISOString(), data: this._data }, null, 2);
  },
  restoreJSON(text) {
    const parsed = JSON.parse(text);
    const d = parsed.data || parsed;
    if (!d || !d.settings) throw new Error('Yeh valid Mr Laundry Factory backup nahi hai');
    this._data = d;
    this._migrate();
    this.save();
    return true;
  },
  resetAll() {
    this._data = this._seed();
    this.save();
  }
};
