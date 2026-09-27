/* ============================================================
   CLOUD SYNC — Firebase Realtime Database (REST) — v3 (DATA LOSS FIX)
   ------------------------------------------------------------
   ⚠️ v2 ke do masle jo ab theek hue hain:
      1) "Shop ID baar baar remove ho jati hai"
         → autoPickShop() har startup par shop id badal deta tha
           (agar aap ki likhi id cloud par maujood na ho aur wahan
           sirf aik doosra dataset ho). AB: Shop ID LOCK hoti hai —
           jab tak aap khud na badlein, kabhi khud-ba-khud nahi badalti.
      2) "Invoice save karta hoon, sync karta hoon, baad mein gayab"
         → sync poora dataset REPLACE karta tha (last-writer-wins).
           Kisi doosre device ka purana data push ho jaye to naye
           invoices ud jate the. AB: har cheez RECORD-WISE MERGE hoti
           hai (per record updatedAt/deletedAt dekha jata hai):
             • push  = cloud ka purana data + is device ka naya data → PUT
             • pull  = cloud ka data is device ke data ke sath MERGE
             • kuch bhi delete/overwrite nahi hota (jab tak aap khud
               "replace" wala button na dabayein)
           🔒 Iske sath auto-backup snapshots bhi hain (DataBackup)
              — sab se bura case ho to bhi purana data wapis aa jata hai.

   Device config (URL + Shop ID + ON/OFF) sirf IS DEVICE par save hoti
   hai (localStorage: mlfCloudCfg) — cloud par kabhi nahi jati.
   ============================================================ */

const CLOUD_CFG_KEY = 'mlfCloudCfg';
const CLOUD_CFG_KEY2 = 'mlfCloudCfg2';                        // backup copy (belt & braces)
const CLOUD_DEFAULT_URL = 'https://mrlaundryfactory-default-rtdb.firebaseio.com';
const CLOUD_DEFAULT_SHOP = 'main';
const CLOUD_POLL_MS = 25000;                                  // har 25 sec check
const CLOUD_DEVICE_KEYS = ['cloudEnabled', 'firebaseConfig', 'shopId'];   // device-level → cloud par kabhi nahi
const CLOUD_TABLES = ['users', 'branches', 'customers', 'products', 'sales', 'payments',
  'expenses', 'purchases', 'vendors', 'vendorRequests', 'employees', 'salaries',
  'drawings', 'deliveries', 'auditLog'];
const CLOUD_TOMB_DAYS = 180;                                  // purane tombstones saaf kar dein

const Cloud = {
  /* is device ka config (cloud par nahi jata) */
  cfg: { url: '', shopId: CLOUD_DEFAULT_SHOP, enabled: true, shopLocked: false },

  /* runtime */
  enabled: false, url: '', shopId: '', ready: false,
  _pushTimer: null, _pollTimer: null,
  _applying: false, _busy: false,
  _lastPushedAt: '', _lastPulledAt: '', _lastError: '', _lastErrorAt: '',
  _pendingPush: false, _didInitialPull: false, _pulling: null, _bound: false, _forceNextPush: false,
  _shops: [], _lastMerge: null, _lastMergeAt: '',

  /* ============================================================
     CONFIG — is device par mehfooz (cloud par NAHI)
     ============================================================ */
  parseConfig(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return { url: t.replace(/\/+$/, '') };
    try {
      const j = JSON.parse(t);
      const u = j.databaseURL || j.databaseUrl || j.url;
      if (u) return { url: String(u).replace(/\/+$/, '') };
    } catch (e) { /* ignore */ }
    const m = t.match(/databaseURL\s*:\s*["']([^"']+)["']/i);
    if (m) return { url: m[1].replace(/\/+$/, '') };
    return null;
  },

  /** shop id saaf karein: sirf A-Z a-z 0-9 _ - . (dash bacha rehta hai: factory-main) */
  cleanShopId(v) {
    return String(v == null ? '' : v).trim().replace(/[^A-Za-z0-9_.\-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  },

  /** config load — alag key se; pehli dafa purane (settings wale) config ko migrate karta hai */
  loadCfg() {
    let c = null;
    try { c = JSON.parse(SafeStore.get(CLOUD_CFG_KEY) || 'null'); } catch (e) { c = null; }
    if (!c || typeof c !== 'object' || !c.url) {                 // primary corrupt/khali → backup copy
      try {
        const b = JSON.parse(SafeStore.get(CLOUD_CFG_KEY2) || 'null');
        if (b && typeof b === 'object' && b.url) c = b;
      } catch (e) { /* ignore */ }
    }
    const s = (DB.settings && DB.settings()) || {};
    const legacy = this.parseConfig(s.firebaseConfig);
    if (!c || typeof c !== 'object') c = {};
    if (!c.url) c.url = (legacy && legacy.url) || CLOUD_DEFAULT_URL;
    if (!c.shopId) c.shopId = this.cleanShopId(s.shopId) || CLOUD_DEFAULT_SHOP;
    if (c.enabled === undefined || c.enabled === null) c.enabled = (s.cloudEnabled === undefined ? true : !!s.cloudEnabled);
    this.setCfg(c, { quiet: true, noLock: true });                // stored shopLocked hi lagu rahega
    return this.cfg;
  },

  /**
   * config save (hamesha is device par; mirror sirf UI ke liye)
   *  patch.shopId dene ka matlab: user ne khud shop id likhi/select ki →
   *  Shop ID LOCK ho jati hai (phir kabhi khud nahi badalti).
   */
  setCfg(patch, opts) {
    const o = opts || {};
    const prev = this.cfg || {};
    const merged = Object.assign({}, prev, patch || {});
    const parsed = this.parseConfig(merged.url);
    let shop = this.cleanShopId(merged.shopId);
    if (!shop) shop = this.cleanShopId(prev.shopId) || CLOUD_DEFAULT_SHOP;
    let locked = (merged.shopLocked === undefined) ? !!prev.shopLocked : !!merged.shopLocked;
    if (!o.noLock && patch && patch.shopId !== undefined && this.cleanShopId(patch.shopId)) locked = true;
    this.cfg = {
      url: parsed ? parsed.url : '',
      shopId: shop,
      enabled: !!merged.enabled,
      shopLocked: locked,
      savedAt: new Date().toISOString()
    };
    const json = JSON.stringify(this.cfg);
    SafeStore.set(CLOUD_CFG_KEY, json);
    SafeStore.set(CLOUD_CFG_KEY2, json);                          // do jagah — aik khali ho to doosri se aa jaye
    if (DB.setCloudMirror) DB.setCloudMirror(this.cfg);            // settings mein sirf dikhane ke liye
    if (!o.quiet) this.refresh();
    return this.cfg;
  },

  cfgSaved() { return !!(this.cfg && this.cfg.url); },

  /** user ne Settings se shop id set ki */
  setShopId(id, opts) {
    const clean = this.cleanShopId(id);
    if (!clean) { toast('Shop ID khali nahi ho sakti', 'error'); return false; }
    this.setCfg({ shopId: clean, shopLocked: true }, opts || {});
    return true;
  },
  unlockShop() { this.setCfg({ shopLocked: false }, { quiet: true }); toast('Shop ID unlock — agli dafa khud-detect kar sakti hai', 'info'); return true; },

  /* URL se config: index.html?cloud=<db-url>&shop=<shop-id>
     Isse naye system par sirf link kholna kaafi hota hai — data khud sync ho jata hai. */
  applyUrlCfg() {
    try {
      const qp = new URLSearchParams(location.search || '');
      const qUrl = qp.get('cloud') || qp.get('firebase') || qp.get('db');
      const qShop = qp.get('shop') || qp.get('shopId');
      if (qUrl) this.setCfg({ url: qUrl, shopId: qShop || this.cfg.shopId, enabled: true, shopLocked: !!(qShop || this.cfg.shopLocked) }, { quiet: true, noLock: true });
      else if (qShop) this.setCfg({ shopId: qShop, shopLocked: true }, { quiet: true, noLock: true });
    } catch (e) { /* ignore */ }
  },

  /* ============================================================
     INIT / STARTUP
     ============================================================ */
  refresh() {
    this.enabled = !!this.cfg.enabled;
    this.url = this.cfg.url;
    this.shopId = this.cfg.shopId;
    this.ready = !!(this.enabled && this.url);
    this.updateDot();
    if (this.ready) { this.startPolling(); this.bindAutoSync(); this.refreshShopsSoon(); }
    else this.stopPolling();
    return this.ready;
  },

  /** boot par — config load + pehla sync (promise return karta hai) */
  init() {
    this.loadCfg();
    this.applyUrlCfg();     // ?cloud=URL&shop=ID — ek link se naya device set ho jata hai
    this.refresh();
    DataBackup.daily();     // roz ka safety snapshot (agar aaj nahi hua)
    if (!this.ready) { this._didInitialPull = true; return null; }
    if (!this._pulling) {
      this._pulling = this.firstSync().catch(e => { this._lastError = e.message; this.updateDot(); });
    }
    return this._pulling;
  },

  async firstSync() {
    await this.autoPickShop();                 // sirf tab jab Shop ID lock na ho
    await this.pull({ silent: true, startup: true });
    this._didInitialPull = true;
    if (this._pendingPush && !this.localIsEmpty()) { this._pendingPush = false; await this.push(true); }
    this.startPolling();
    this.updateDot();
    return true;
  },

  /** datasets ki list background mein refresh (Settings UI ke liye) */
  refreshShopsSoon() {
    if (!this.url) return;
    const now = Date.now();
    if (this._shopsAt && now - this._shopsAt < 60000) return;
    this._shopsAt = now;
    setTimeout(() => { this.listShops().catch(() => {}); }, 1200);
  },

  /** database mein jitne shop ids (datasets) hain */
  async listShops() {
    if (!this.url) return [];
    try {
      const o = await this._fetchJSON(this.url + '/factories.json?shallow=true');
      this._shops = o ? Object.keys(o) : [];
    } catch (e) { this._shops = []; }
    return this._shops;
  },

  /**
   * Naya system: agar aap ki shop id cloud par nahi hai aur wahan kisi
   * doosre dataset mein data hai → wohi pick kar lein.
   * 🔒 Agar Shop ID LOCK hai (user ne khud set ki) → kabhi change nahi.
   */
  async autoPickShop() {
    try {
      const shops = await this.listShops();                   // settings UI ki list bhi bhar jati hai
      if (this.cfg.shopLocked) return this.shopId;            // ⬅️ yehi "shop id baar baar remove" ka fix
      if (!shops.length) return null;
      if (shops.indexOf(this.shopId) >= 0) return this.shopId;
      /* is shop par khud ka data hai? to usse chhedein nahi */
      const mine = await this._fetchJSON(this.path('data')).catch(() => null);
      if (mine && this._hasData(mine)) return this.shopId;
      let pick = null;
      if (shops.length === 1) pick = shops[0];
      else {                                                  // ek se ziyada → sab se naya data wala
        let best = 0;
        for (const s of shops) {
          try {
            const m = await this._fetchJSON(this.url + '/factories/' + encodeURIComponent(s) + '/meta.json');
            const t = m && m.updatedAt ? (Date.parse(m.updatedAt) || 0) : 0;
            if (t > best) { best = t; pick = s; }
          } catch (e) { /* ignore */ }
        }
      }
      if (pick) {
        this.setCfg({ shopId: pick }, { quiet: true, noLock: true });
        this.refresh();
        if (!SafeStore.get('mlfShopAutoPickShown')) {
          SafeStore.set('mlfShopAutoPickShown', pick);
          toast('Cloud par data "' + pick + '" ke andar mila — usi se sync ho raha hai', 'info', 5000);
        }
        return pick;
      }
      return null;
    } catch (e) { return null; }
  },

  /** login hone par foran sync */
  onLogin() { if (this.ready) this.pull({ silent: true }); },

  /** window focus / online hone par sync */
  bindAutoSync() {
    if (this._bound) return;
    this._bound = true;
    const kick = () => { if (this.ready && !document.hidden) this.tick(); };
    window.addEventListener('focus', kick);
    window.addEventListener('online', () => { kick(); if (this._pendingPush) this.push(true); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    window.addEventListener('storage', e => {                       // doosre tab mein shop id badli gayi?
      if (e && e.key === CLOUD_CFG_KEY && e.newValue) { try { this.loadCfg(); this.refresh(); } catch (err) { /* ignore */ } }
    });
  },

  /* ============================================================
     NETWORK HELPERS
     ============================================================ */
  path(suffix) { return this.url + '/factories/' + encodeURIComponent(this.shopId || CLOUD_DEFAULT_SHOP) + '/' + suffix + '.json'; },

  async _fetchJSON(url, opts) {
    const r = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
    if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' (rules / permission)' : ''));
    const txt = await r.text();
    if (!txt || txt === 'null') return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  },

  _deep(o) { try { return JSON.parse(JSON.stringify(o || {})); } catch (e) { return {}; } },

  /** is device ka data (device-level config strip karke) — push ke liye tayyar */
  _payloadFrom(data) {
    const p = this._deep(data || DB._data);
    p.settings = p.settings || {};
    CLOUD_DEVICE_KEYS.forEach(k => { delete p.settings[k]; });
    return p;
  },

  _hasData(d) {
    if (!d) return false;
    return CLOUD_TABLES.some(t => (d[t] || []).some(r => r && !r._deleted && !r._purged));
  },

  localIsEmpty() {
    const d = DB._data || {};
    const n = ['sales', 'payments', 'expenses', 'purchases', 'employees', 'salaries', 'drawings', 'deliveries']
      .reduce((a, t) => a + ((d[t] || []).filter(r => r && !r._deleted).length), 0);
    return n === 0 && (d.customers || []).filter(r => r && !r._deleted).length === 0;
  },

  /* ============================================================
     🧠 MERGE — asli fix: kuch bhi delete nahi hota
     ------------------------------------------------------------
     Har record ka apna stamp hota hai:
        updatedAt (aakhri tabdeeli) · deletedAt (delete hua to)
     Dono taraf se naya wala jeetta hai. Jo record sirf aik taraf
     hai wo doosri taraf pahunch jata hai — is liye kisi device ka
     naya invoice kabhi zaya nahi hota.
     ============================================================ */
  _stamp(r) {
    if (!r) return 0;
    return Date.parse(r.deletedAt || r.updatedAt || r.createdAt || r.at || r.date || 0) || 0;
  },

  _mergeTable(localArr, remoteArr, stats, tbl) {
    const map = new Map();
    const keyOf = r => (r && r.id != null) ? String(r.id) : ('~~' + JSON.stringify(r));
    (localArr || []).forEach(r => { if (r) map.set(keyOf(r), r); });
    (remoteArr || []).forEach(r => {
      if (!r) return;
      const k = keyOf(r);
      const cur = map.get(k);
      if (!cur) { map.set(k, r); stats.added++; stats.tables[tbl] = (stats.tables[tbl] || 0) + 1; return; }
      const sc = this._stamp(cur), sr = this._stamp(r);
      if (sr > sc) {
        map.set(k, r);
        if (r._deleted || r._purged) { stats.removed++; }
        else { stats.updated++; stats.tables[tbl] = (stats.tables[tbl] || 0) + 1; }
      } else if (sr === sc && (r._deleted || r._purged) && !(cur._deleted || cur._purged)) {
        map.set(k, r); stats.removed++;          // delete hamesha jeetta hai (tombstone)
      }
    });
    return Array.from(map.values());
  },

  /**
   * merge(local, incoming) → { data, stats }
   *  • local base rehta hai (barabar ho to local jeetta hai)
   *  • incoming ke naye/updated records mil jate hain
   */
  merge(localData, incomingData) {
    const L = this._deep(localData), R = this._deep(incomingData);
    const stats = { added: 0, updated: 0, removed: 0, tables: {} };
    const out = {};
    Object.keys(L).forEach(k => { out[k] = L[k]; });             // baaki keys (counters etc.)
    CLOUD_TABLES.forEach(t => { out[t] = this._mergeTable(L[t], R[t], stats, t); });

    /* hard-delete tombstones (agar kabhi use hon) */
    const lt = L._tomb || {}, rt = R._tomb || {};
    const tomb = {};
    const cut = Date.now() - CLOUD_TOMB_DAYS * 864e5;
    [lt, rt].forEach(src => {
      Object.keys(src || {}).forEach(t => {
        tomb[t] = tomb[t] || {};
        Object.keys(src[t] || {}).forEach(id => {
          const at = src[t][id];
          if ((Date.parse(at) || 0) < cut) return;
          if (!tomb[t][id] || (Date.parse(at) || 0) > (Date.parse(tomb[t][id]) || 0)) tomb[t][id] = at;
        });
      });
    });
    Object.keys(tomb).forEach(t => {
      if (!Object.keys(tomb[t]).length) { delete tomb[t]; return; }
      (out[t] || []).forEach(r => {                             // hard-delete hua record wapis na aaye
        const at = tomb[t][r && r.id];
        if (at && (Date.parse(at) || 0) >= this._stamp(r)) { r._deleted = true; r.deletedAt = at; }
      });
    });
    if (Object.keys(tomb).length) out._tomb = tomb;

    /* invoice counter kabhi peeche nahi jata */
    const lc = L._counters || {}, rc = R._counters || {}, cc = {};
    Object.keys(Object.assign({}, lc, rc)).forEach(k => { cc[k] = Math.max(num(lc[k]), num(rc[k])); });
    if (Object.keys(cc).length) out._counters = cc;

    /* settings — device keys kabhi nahi; khali value se bhara hua wipe nahi hota */
    const newerRemote = (Date.parse(R._updatedAt || 0) || 0) > (Date.parse(L._updatedAt || 0) || 0);
    const ls = L.settings || {}, rs = R.settings || {};
    const sOut = {};
    Object.keys(ls).forEach(k => { if (CLOUD_DEVICE_KEYS.indexOf(k) < 0) sOut[k] = ls[k]; });
    Object.keys(rs).forEach(k => {
      if (CLOUD_DEVICE_KEYS.indexOf(k) >= 0) return;
      const rv = rs[k], lv = sOut[k];
      if (lv === undefined || lv === null || lv === '') { if (rv !== undefined && rv !== null && rv !== '') sOut[k] = rv; return; }
      if (rv === undefined || rv === null || rv === '') return;
      if (newerRemote) sOut[k] = rv;
    });
    out.settings = sOut;

    /* audit log bemisal na barhe */
    if (Array.isArray(out.auditLog) && out.auditLog.length > 800) {
      out.auditLog = out.auditLog.slice().sort((a, b) => String((b && b.at) || '').localeCompare(String((a && a.at) || ''))).slice(0, 800);
    }
    const lT = Date.parse(L._updatedAt || 0) || 0, rT = Date.parse(R._updatedAt || 0) || 0;
    out._updatedAt = new Date(Math.max(lT, rT) || Date.now()).toISOString();
    return { data: out, stats };
  },

  /** merge stats ko insani zubaan mein */
  _mergeText(s) {
    if (!s) return 'koi tabdeeli nahi';
    const bits = [];
    if (s.added) bits.push(s.added + ' naya');
    if (s.updated) bits.push(s.updated + ' update');
    if (s.removed) bits.push(s.removed + ' delete');
    return bits.length ? bits.join(' · ') : 'koi tabdeeli nahi';
  },

  /* ============================================================
     APPLY — data ko device par lagana (config + login mehfooz)
     ============================================================ */
  _applyData(data, opts) {
    const o = opts || {};
    this._applying = true;
    try {
      const keepCfg = Object.assign({}, this.cfg);          // ⚠️ config mehfooz
      const keepUser = DB.currentUser();
      if (o.snapshot) DataBackup.snapshot(o.snapshot);
      const remote = this._deep(data);
      remote.settings = Object.assign({}, remote.settings || {});
      CLOUD_DEVICE_KEYS.forEach(k => { delete remote.settings[k]; });
      DB._data = remote;
      DB._migrate();                                        // tables/defaults
      DB.setCloudMirror(keepCfg);                           // config wapis
      if (keepUser) {                                       // login session barqarar
        const still = (DB._data.users || []).find(u => u && u.id === keepUser.id);
        if (!still) DB._data.users.push(keepUser);
      }
      DB.save();                                            // (_applying → push nahi hoga)
      if (o.updatedAt) DB._data._updatedAt = o.updatedAt;
    } finally {
      this._applying = false;
    }
    this._lastPulledAt = new Date().toISOString();
    this._lastError = '';
    this._pendingPush = false;
    SafeStore.set('mlfLastCloudPull', this._lastPulledAt);
  },

  /* purane naam se bhi chalta rahe (kuch jagah call hota hai) */
  applyRemote(remote) {
    const m = this.merge(DB._data, remote);
    this._applyData(m.data, { snapshot: 'pre-cloud-merge' });
    return m;
  },

  /* ============================================================
     PUSH — merge karke bhejna (kabhi kisi ka naya data nahi udta)
     ============================================================ */
  pushDebounced() {
    if (!this.ready || this._applying) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(true), 1500);
  },

  async push(silent) {
    if (!this.ready || this._busy) return false;
    if (!this._didInitialPull) { this._pendingPush = true; return false; }
    /* SAFETY: khali naya device apna khali data cloud par na bheje */
    if (this.localIsEmpty() && !this._forceNextPush) { this._pendingPush = false; this.updateDot(); return false; }
    this._forceNextPush = false;
    this._busy = true;
    const stamp = new Date().toISOString();
    try {
      const local = this._payloadFrom(DB._data);
      let merged = null;
      /* 1) pehle cloud ka data uthao — us ke naye records bach jayenge */
      let remote = null;
      try { remote = await this._fetchJSON(this.path('data')); } catch (e) { remote = null; }
      if (remote && typeof remote === 'object' && Object.keys(remote).length) {
        merged = this.merge(local, remote);
        if (merged.stats.added || merged.stats.updated || merged.stats.removed) {
          this._applyData(merged.data, { snapshot: 'pre-cloud-merge' });   // cloud ka naya data yahan bhi aa gaya
        }
      }
      /* 2) ab merged data bhej dein */
      const payload = this._payloadFrom(DB._data);
      payload._updatedAt = stamp;
      payload._updatedBy = (DB.currentUser() || {}).name || 'device';
      await this._fetchJSON(this.path('data'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await this._fetchJSON(this.path('meta'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedAt: stamp, by: payload._updatedBy, shopId: this.shopId, app: 'Mr Laundry Factory Portal' })
      });
      this._lastPushedAt = stamp;
      this._lastError = '';
      this._pendingPush = false;
      this._lastMerge = merged ? merged.stats : null;
      this._lastMergeAt = stamp;
      DB._data._updatedAt = stamp;
      DB._data._updatedBy = payload._updatedBy;
      SafeStore.set('mlfLastCloudPush', stamp);
      SafeStore.set('mlfShopIdUsed', this.shopId);
      if (!silent) toast('Cloud par save ho gaya ✔' + (merged && (merged.stats.added || merged.stats.updated || merged.stats.removed)
        ? ' (cloud ka data milaya: ' + this._mergeText(merged.stats) + ')' : ''), 'success', 4000);
      return true;
    } catch (e) {
      this._lastError = e.message; this._lastErrorAt = new Date().toISOString();
      this._pendingPush = true;                                   // offline → auto retry
      if (!silent) toast('Cloud push fail: ' + e.message + ' — internet / Firebase rules check karein', 'error', 6000);
      return false;
    } finally {
      this._busy = false;
      this.updateDot();
    }
  },

  /* ============================================================
     PULL — cloud se data (MERGE — kuch bhi delete nahi hota)
     ============================================================ */
  async pull(opts) {
    const o = opts || {};
    if (!this.ready) { if (!o.silent) toast('Pehle Cloud Sync ON karein (Settings → Cloud Sync)', 'warn'); return false; }
    if (this._busy) return false;
    this._busy = true;
    this.updateDot();
    try {
      const remote = await this._fetchJSON(this.path('data'));
      this._busy = false;
      if (!remote || !Object.keys(remote).length) {
        this._lastError = ''; this.updateDot();
        if (!o.silent) toast('Cloud khali hai — "⬆️ Cloud par bhejein" dabayein taake yeh data upload ho jaye', 'info', 5000);
        return false;
      }
      const rTime = Date.parse(remote._updatedAt || 0) || 0;
      const lTime = Date.parse(DB._data._updatedAt || 0) || 0;

      /* (A) KHATARNAK mode — sirf tab jab user khud kahe */
      if (o.overwrite) {
        if (o.ask) {
          const yes = await confirmDialog(
            'Cloud ka data (' + new Date(rTime || Date.now()).toLocaleString() + ') IS DEVICE KE DATA KI JAGAH lag jayega.\n' +
            'Is device ka mojooda data pehle snapshot mein mehfooz ho jayega.\n\nAage barhein?',
            { title: '⚠️ Local data cloud se replace karein', yes: 'Haan, replace karein' });
          if (!yes) { this.updateDot(); return false; }
        }
        this._applyData(this._payloadFrom(remote), { snapshot: 'pre-cloud-overwrite' });
        DataBackup.snapshot('after-cloud-overwrite');
        toast('Cloud ka data le liya (local replace) ✔ — purani copy Settings → Backup se mil jayegi', 'warn', 6000);
        if (DB.currentUser()) app.go(app.current || 'dashboard');
        this.updateDot();
        return true;
      }

      /* (B) SAFE mode (default) — merge: kuch bhi delete nahi hota */
      if (!o.force && rTime <= lTime && !o.silent) { this._lastError = ''; this.updateDot(); toast('Is device ka data already latest hai ✔', 'success'); return false; }
      const m = this.merge(DB._data, this._payloadFrom(remote));
      const s = m.stats;
      this._lastMerge = s; this._lastMergeAt = new Date().toISOString();
      if (s.added || s.updated || s.removed) {
        this._applyData(m.data, { snapshot: 'pre-cloud-merge', updatedAt: new Date(Math.max(Date.parse(m.data._updatedAt || 0) || 0, Date.now())).toISOString() });
        toast('Cloud se milaya ✔ ' + this._mergeText(s) + ' — kuch bhi delete nahi hua', 'success', 4000);
        if (!o.silent && DB.currentUser()) app.go(app.current || 'dashboard');
      } else {
        this._lastPulledAt = new Date().toISOString();
        this._lastError = ''; this._pendingPush = false;
        SafeStore.set('mlfLastCloudPull', this._lastPulledAt);
        if (!o.silent) toast('Sab kuch already sync hai ✔ (koi tabdeeli nahi)', 'success');
      }
      this.updateDot();
      return true;
    } catch (e) {
      this._busy = false;
      this._lastError = e.message; this._lastErrorAt = new Date().toISOString();
      this.updateDot();
      if (!o.silent) toast('Cloud pull fail: ' + e.message + ' — Firebase rules check karein', 'error', 6000);
      return false;
    }
  },

  /* ============================================================
     POLLING + retry
     ============================================================ */
  startPolling() {
    if (this._pollTimer) return;
    this._pollTimer = setInterval(() => this.tick(), CLOUD_POLL_MS);
  },
  stopPolling() { clearInterval(this._pollTimer); this._pollTimer = null; },

  async tick() {
    if (!this.ready || this._busy || document.hidden) return;
    if (this._pendingPush) { await this.push(true); return; }      // offline changes bhej dein
    try {
      const meta = await this._fetchJSON(this.path('meta'));
      const rTime = meta && meta.updatedAt ? (Date.parse(meta.updatedAt) || 0) : 0;
      const lTime = Date.parse(DB._data._updatedAt || 0) || 0;
      if (!meta) { await this.pull({ silent: true }); return; }
      if (rTime > lTime + 4000) {
        toast('Doosre device se naya data aaya — milaya ja raha hai…', 'info');
        await this.pull({ silent: true });
      } else if (this._lastError) { this._lastError = ''; this.updateDot(); }
    } catch (e) {
      this._lastError = e.message; this.updateDot();
    }
  },

  /* ============================================================
     TEST / ENABLE / MANUAL
     ============================================================ */
  async test() {
    if (!this.cfg.url) { toast('databaseURL khali hai', 'error'); return false; }
    this.refresh();
    try {
      await this._fetchJSON(this.path('meta'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: new Date().toISOString(), by: 'setup-test', shopId: this.shopId })
      });
      this._lastError = '';
      this.setCfg({ shopLocked: true }, { quiet: true });          // connection kaam kar gaya → shop id pakki
      const shops = await this.listShops();
      toast('Connection OK ✔ Firebase chal rahi hai · Shop: ' + this.shopId + (shops.length ? ' · datasets: ' + shops.join(', ') : ''), 'success', 5000);
      this.updateDot();
      return true;
    } catch (e) {
      this._lastError = e.message; this._lastErrorAt = new Date().toISOString();
      toast('Connect nahi hua: ' + e.message + ' — URL ya Firebase rules check karein', 'error', 7000);
      this.updateDot();
      return false;
    }
  },

  /** Settings → Save & Connect */
  async saveAndConnect(url, shopId, enabled) {
    this.setCfg({ url: url, shopId: shopId, enabled: enabled !== false, shopLocked: true });
    this.refresh();
    if (!this.ready) { toast('Config save ho gaya (cloud OFF)', 'warn'); return false; }
    const ok = await this.test();
    if (ok) { this._didInitialPull = true; await this.pull({ silent: true, startup: true }); }
    return ok;
  },

  setEnabled(on) {
    this.setCfg({ enabled: !!on });
    this.refresh();
    if (on) { this._didInitialPull = true; this.pull({ silent: true }); this.push(true); }
    toast(on ? 'Cloud Sync ON ✔ (Shop ID: ' + this.shopId + ')' : 'Cloud Sync OFF — ab sirf local storage', on ? 'success' : 'warn');
  },

  async forcePush() { this._didInitialPull = true; this._forceNextPush = true; return this.push(false); },
  async forcePull() { return this.pull({ ask: true, force: true }); },
  async forcePullOverwrite() { return this.pull({ ask: true, force: true, overwrite: true }); },

  /**
   * 🔀 Doosre dataset (purani shop id) se data MILA lein — kuch delete nahi hota.
   * Gum-shuda invoices wapis lane ka safe tareeqa.
   */
  async mergeFromShop(other) {
    other = this.cleanShopId(other);
    if (!this.ready) { toast('Pehle cloud ON karein', 'warn'); return false; }
    if (!other || other === this.shopId) { toast('Yeh wahi dataset hai jo abhi chal raha hai', 'warn'); return false; }
    try {
      const d = await this._fetchJSON(this.url + '/factories/' + encodeURIComponent(other) + '/data.json');
      if (!d || !Object.keys(d).length) { toast('"' + other + '" mein kuch data nahi mila', 'warn', 5000); return false; }
      const m = this.merge(DB._data, this._payloadFrom(d));
      DataBackup.snapshot('pre-other-dataset');
      this._applyData(m.data, { snapshot: 'pre-other-dataset' });
      this._pendingPush = true;                       // ab yeh sab is shop par bhi chala jayega
      toast('"' + other + '" ka data mila liya ✔ ' + this._mergeText(m.stats) + ' — ab "⬆️ Cloud par bhejein" dabayein', 'success', 7000);
      this.updateDot();
      return true;
    } catch (e) {
      toast('Milaya nahi ja saka: ' + e.message, 'error', 6000);
      return false;
    }
  },

  /** Sync Report ke liye: cloud par kya rakha hai */
  async cloudSummary() {
    if (!this.ready) return { ok: false, reason: 'Cloud ON nahi' };
    try {
      const d = await this._fetchJSON(this.path('data'));
      if (!d) return { ok: true, empty: true, shopId: this.shopId };
      const counts = {};
      CLOUD_TABLES.forEach(t => { counts[t] = (d[t] || []).filter(r => r && !r._deleted).length; });
      return { ok: true, empty: !this._hasData(d), shopId: this.shopId, updatedAt: d._updatedAt || '', by: d._updatedBy || '', counts };
    } catch (e) { return { ok: false, reason: e.message }; }
  },

  /* ============================================================
     STATUS
     ============================================================ */
  statusShort() {
    if (!this.cfg.enabled) return 'OFF';
    if (!this.cfg.url) return 'no URL';
    if (this._busy) return 'syncing…';
    if (this._lastError) return 'error';
    if (this._pendingPush) return 'pending…';
    const last = this._lastPulledAt || this._lastPushedAt;
    return last ? 'ON · ' + new Date(last).toLocaleTimeString() : 'ON';
  },

  statusLabel() {
    if (!this.cfg.enabled) return 'Cloud sync: OFF (data sirf is device par)';
    if (!this.cfg.url) return 'Cloud sync: ON — lekin databaseURL khali ⚠️';
    if (this._busy) return 'Cloud: sync ho raha hai…';
    if (this._lastError) return 'Cloud: ERROR — ' + this._lastError;
    if (this._lastPulledAt || this._lastPushedAt) {
      return 'Cloud: ' + this.shopId + ' · last sync ' + new Date(this._lastPulledAt || this._lastPushedAt).toLocaleTimeString();
    }
    return 'Cloud: ' + this.shopId + (this.cfg.shopLocked ? ' 🔒' : '') + ' · connected';
  },

  dotColor() {
    if (!this.cfg.enabled || !this.cfg.url) return '#94a3b8';
    if (this._lastError) return '#dc2626';
    if (this._busy || this._pendingPush) return '#f59e0b';
    return '#16a34a';
  },

  updateDot() {
    const d = document.getElementById('cloudDot');
    if (d) { d.textContent = this.statusLabel(); d.style.color = this.dotColor(); }
    const chip = document.getElementById('cloudChip');
    if (chip) {
      chip.textContent = '☁️ ' + this.statusShort();
      chip.style.color = this.dotColor();
      chip.title = this.statusLabel() + ' · Shop: ' + this.shopId + (this.cfg.shopLocked ? ' 🔒' : '') + ' — click: abhi sync karein';
    }
  },

  async syncNow() {
    if (!this.ready) { toast('Cloud ON nahi hai — Settings → Cloud Sync', 'warn'); return; }
    toast('Sync ho raha hai…', 'info', 1500);
    await this.pull({ silent: true, force: true });
    if (this._pendingPush) await this.push(true);
    this.updateDot();
  }
};

/* ============================================================
   🛟 DATA BACKUP — safety snapshots (localStorage)
   ------------------------------------------------------------
   Har cloud sync se pehle + roz aik dafa data ka snapshot banta
   hai. Kuch ghalat ho jaye (ya ghalti se delete) to Settings →
   Backup se foran wapis laaya ja sakta hai. Purane snapshot khud
   saaf hote jaate hain (6 tak rakhe jate hain).
   ============================================================ */
const SNAP_KEY = 'mlfSnaps';
const SNAP_MAX = 6;

const DataBackup = {
  _read() { try { const a = JSON.parse(SafeStore.get(SNAP_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
  _write(list) {
    let arr = list.slice();
    for (let i = 0; i < 4; i++) {
      const json = JSON.stringify(arr);
      if (SafeStore.set(SNAP_KEY, json)) return true;
      if (arr.length > 1) { arr = arr.slice(1); continue; }        // jagah nahi → purana hata dein
      /* aakhri koshish: audit log chhota kar dein */
      try {
        arr = arr.map(s => {
          const c = JSON.parse(JSON.stringify(s));
          if (c.data && Array.isArray(c.data.auditLog)) c.data.auditLog = c.data.auditLog.slice(-40);
          return c;
        });
      } catch (e) { return false; }
    }
    return false;
  },

  counts(d) {
    d = d || DB._data || {};
    return {
      sales: (d.sales || []).filter(r => r && !r._deleted).length,
      customers: (d.customers || []).filter(r => r && !r._deleted).length,
      payments: (d.payments || []).filter(r => r && !r._deleted).length,
      expenses: (d.expenses || []).filter(r => r && !r._deleted).length
    };
  },

  /** snapshot banao (reason: 'roz' | 'pre-cloud-merge' | …) */
  snapshot(reason, opts) {
    const o = opts || {};
    try {
      const list = this._read();
      const data = JSON.parse(JSON.stringify(DB._data || {}));
      CLOUD_DEVICE_KEYS.forEach(k => { if (data.settings) delete data.settings[k]; });   // config snapshot mein na jaye
      const snap = {
        at: new Date().toISOString(), reason: reason || 'manual',
        by: (DB.currentUser() || {}).name || 'device',
        shopId: (typeof Cloud !== 'undefined' && Cloud.shopId) || '',
        counts: this.counts(data), data
      };
      list.push(snap);
      while (list.length > SNAP_MAX) list.shift();
      const ok = this._write(list);
      if (!ok && !o.quiet) toast('Snapshot nahi ban saka (storage bhari hui hai) — Settings → Backup se export kar lein', 'warn', 5000);
      return ok;
    } catch (e) { return false; }
  },

  /** roz aik dafa (startup par) */
  daily() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (SafeStore.get('mlfSnapDay') === today) return false;
      if ((DB._data && (CLOUD_TABLES || []).some(t => (DB._data[t] || []).length))) {
        this.snapshot('roz');
        SafeStore.set('mlfSnapDay', today);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  },

  list() {
    return this._read().map((s, i) => ({
      i, at: s.at, reason: s.reason, by: s.by, shopId: s.shopId, counts: s.counts || this.counts(s.data)
    })).reverse();                                             // naya pehle
  },
  get(i) { const l = this._read(); return l[i] || null; },
  raw() { return this._read(); },

  /** snapshot wapis lagayein (mojooda data pehle mehfooz ho jata hai) */
  restore(i) {
    const s = this.get(i);
    if (!s || !s.data) { toast('Snapshot nahi mila', 'error'); return false; }
    this.snapshot('pre-restore');
    const keepCfg = Object.assign({}, Cloud.cfg);
    const keepUser = DB.currentUser();
    Cloud._applying = true;
    try {
      DB._data = JSON.parse(JSON.stringify(s.data));
      DB._migrate();
      DB.setCloudMirror(keepCfg);
      if (keepUser && !(DB._data.users || []).some(u => u && u.id === keepUser.id)) DB._data.users.push(keepUser);
      DB.save();
    } finally { Cloud._applying = false; }
    Cloud._pendingPush = true;
    toast('Snapshot wapis aa gaya ✔ (' + new Date(s.at).toLocaleString() + ' ka data) — cloud par bhi bhej dein', 'success', 6000);
    return true;
  },

  download(i) {
    const s = this.get(i);
    if (!s) return false;
    const blob = new Blob([JSON.stringify(s.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mlf-backup-' + String(s.at).replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  },
  clear() { SafeStore.del(SNAP_KEY); }
};
