/* ============================================================
   CLOUD SYNC — Firebase Realtime Database (REST) — v2 (PAKKA)
   ------------------------------------------------------------
   ⚠️ PURANA MASLA (fix ho gaya):
      Database URL / Shop ID pehle BUSINESS DATA ke andar
      (settings.firebaseConfig) save hote the — jo cloud se sync
      hota hai. Is liye jab kisi doosre system se data pull hota
      tha to us ke khali config ne aap ka config mita diya →
      "Firebase baar baar remove ho jata hai".

   ✅ AB KA TAREeqA:
      • URL + Shop ID + ON/OFF sirf IS DEVICE par save hote hain
        (localStorage key: mlfCloudCfg) — cloud par nahi jate.
      • Cloud par sirf business data jata hai (sales, customers…).
      • Pull ke baad config wapis apne aap lag jati hai (kabhi
        delete nahi hoti).
      • Naye system par portal kholte hi data khud aa jata hai —
        default URL + auto shop-detect ki madad se.
      • Push sirf pehla pull hone ke BAAD hota hai, taake naye
        device ka khali/demo data cloud ka asli data na mita de.
   ============================================================ */

const CLOUD_CFG_KEY = 'mlfCloudCfg';
const CLOUD_DEFAULT_URL = 'https://mrlaundryfactory-default-rtdb.firebaseio.com';
const CLOUD_DEFAULT_SHOP = 'main';
const CLOUD_POLL_MS = 25000;                       // har 25 sec check
const CLOUD_DEVICE_KEYS = ['cloudEnabled', 'firebaseConfig', 'shopId'];   // device-level → cloud par kabhi nahi

const Cloud = {
  /* is device ka config (cloud par nahi jata) */
  cfg: { url: '', shopId: CLOUD_DEFAULT_SHOP, enabled: true },

  /* runtime */
  enabled: false, url: '', shopId: '', ready: false,
  _pushTimer: null, _pollTimer: null,
  _applying: false, _busy: false,
  _lastPushedAt: '', _lastPulledAt: '', _lastError: '', _lastErrorAt: '',
  _pendingPush: false, _didInitialPull: false, _pulling: null, _bound: false, _forceNextPush: false,
  _shops: [],

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

  /** config load — alag key se; pehli dafa purane (settings wale) config ko migrate karta hai */
  loadCfg() {
    let c = null;
    try { c = JSON.parse(SafeStore.get(CLOUD_CFG_KEY) || 'null'); } catch (e) { c = null; }
    const s = (DB.settings && DB.settings()) || {};
    const legacy = this.parseConfig(s.firebaseConfig);
    if (!c || typeof c !== 'object') c = {};
    if (!c.url) c.url = (legacy && legacy.url) || CLOUD_DEFAULT_URL;
    if (!c.shopId) c.shopId = String(s.shopId || '').trim() || CLOUD_DEFAULT_SHOP;
    if (c.enabled === undefined || c.enabled === null) c.enabled = (s.cloudEnabled === undefined ? true : !!s.cloudEnabled);
    this.setCfg(c, { quiet: true });
    return this.cfg;
  },

  /** config save (hamesha is device par; mirror sirf UI ke liye) */
  setCfg(patch, opts) {
    const o = opts || {};
    const merged = Object.assign({}, this.cfg, patch || {});
    const parsed = this.parseConfig(merged.url);
    this.cfg = {
      url: parsed ? parsed.url : '',
      shopId: String(merged.shopId || CLOUD_DEFAULT_SHOP).replace(/[^a-zA-Z0-9_-]/g, '') || CLOUD_DEFAULT_SHOP,
      enabled: !!merged.enabled,
      savedAt: new Date().toISOString()
    };
    SafeStore.set(CLOUD_CFG_KEY, JSON.stringify(this.cfg));
    if (DB.setCloudMirror) DB.setCloudMirror(this.cfg);   // settings mein sirf dikhane ke liye
    if (!o.quiet) this.refresh();
    return this.cfg;
  },

  cfgSaved() { return !!(this.cfg && this.cfg.url); },

  /* URL se config: index.html?cloud=<db-url>&shop=<shop-id>
     Isse naye system par sirf link kholna kaafi hota hai — data khud sync ho jata hai. */
  applyUrlCfg() {
    try {
      const qp = new URLSearchParams(location.search || '');
      const qUrl = qp.get('cloud') || qp.get('firebase') || qp.get('db');
      const qShop = qp.get('shop') || qp.get('shopId');
      if (qUrl) this.setCfg({ url: qUrl, shopId: qShop || this.cfg.shopId, enabled: true }, { quiet: true });
      else if (qShop) this.setCfg({ shopId: qShop }, { quiet: true });
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
    if (this.ready) { this.startPolling(); this.bindAutoSync(); }
    else this.stopPolling();
    return this.ready;
  },

  /** boot par — config load + pehla sync (promise return karta hai) */
  init() {
    this.loadCfg();
    this.applyUrlCfg();     // ?cloud=URL&shop=ID — ek link se naya device set ho jata hai
    this.refresh();
    if (!this.ready) { this._didInitialPull = true; return null; }
    if (!this._pulling) {
      this._pulling = this.firstSync().catch(e => { this._lastError = e.message; this.updateDot(); });
    }
    return this._pulling;
  },

  async firstSync() {
    await this.autoPickShop();                 // galat shop id ho to sahi wali khud pakar le.
    await this.pull({ silent: true, startup: true });
    this._didInitialPull = true;
    if (this._pendingPush && !this.localIsEmpty()) { this._pendingPush = false; await this.push(true); }
    this.startPolling();
    this.updateDot();
    return true;
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

  /** naya system: agar default shop khali hai aur sirf ek hi shop mein data hai → wohi le lein */
  async autoPickShop() {
    try {
      const shops = await this.listShops();
      if (!shops.length) return null;
      if (shops.indexOf(this.shopId) >= 0) return this.shopId;
      if (shops.length === 1) {
        const pick = shops[0];
        this.setCfg({ shopId: pick }, { quiet: true });
        this.refresh();
        if (!SafeStore.get('mlfShopAutoPickShown')) {
          SafeStore.set('mlfShopAutoPickShown', pick);
          toast('Cloud par data "' + pick + '" ke andar mila — usi se sync ho raha hai', 'info', 5000);
        }
        return pick;
      }
      return null;   // ek se ziyada → Settings → Cloud Sync se choose karein
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
  },

  /* ============================================================
     NETWORK HELPERS
     ============================================================ */
  path(suffix) { return this.url + '/factories/' + (this.shopId || 'main') + '/' + suffix + '.json'; },

  async _fetchJSON(url, opts) {
    const r = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
    if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 401 || r.status === 403 ? ' (rules / permission)' : ''));
    const txt = await r.text();
    if (!txt || txt === 'null') return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  },

  /* ============================================================
     PUSH — is device ka data cloud par
     ============================================================ */
  pushDebounced() {
    if (!this.ready || this._applying) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(true), 1500);
  },

  async push(silent) {
    if (!this.ready || this._busy) return false;
    if (!this._didInitialPull) { this._pendingPush = true; return false; }
    /* SAFETY: khali naya device apna khali data cloud par na bheje (cloud ka asli data bach jaye) */
    if (this.localIsEmpty() && !this._forceNextPush) { this._pendingPush = false; this.updateDot(); return false; }
    this._forceNextPush = false;   // pehle pull — naye device ka khali data cloud na mita de
    this._busy = true;
    const stamp = new Date().toISOString();
    try {
      const payload = JSON.parse(JSON.stringify(DB._data));
      /* device-level config hamesha strip: cloud par sirf business data */
      payload.settings = payload.settings || {};
      CLOUD_DEVICE_KEYS.forEach(k => { delete payload.settings[k]; });
      payload._updatedAt = stamp;
      payload._updatedBy = (DB.currentUser() || {}).name || 'device';
      await this._fetchJSON(this.path('data'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await this._fetchJSON(this.path('meta'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedAt: stamp, by: payload._updatedBy, app: 'Mr Laundry Factory Portal' })
      });
      this._lastPushedAt = stamp;
      this._lastError = '';
      this._pendingPush = false;
      DB._data._updatedAt = stamp;
      SafeStore.set('mlfLastCloudPush', stamp);
      if (!silent) toast('Cloud par save ho gaya ✔', 'success');
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
     PULL — cloud se data (config kabhi overwrite nahi hoti)
     ============================================================ */
  localIsEmpty() {
    const d = DB._data || {};
    const n = ['sales', 'payments', 'expenses', 'purchases', 'employees', 'salaries', 'drawings', 'deliveries']
      .reduce((a, t) => a + ((d[t] || []).length), 0);
    return n === 0 && (d.customers || []).length === 0;
  },

  applyRemote(remote) {
    this._applying = true;
    const keepCfg = Object.assign({}, this.cfg);        // ⚠️ config mehfooz
    const keepUser = DB.currentUser();
    remote.settings = Object.assign({}, remote.settings || {});
    DB._data = remote;
    DB._migrate();                                     // tables/defaults
    DB.setCloudMirror(keepCfg);                        // config wapis
    if (keepUser) {                                    // login session barqarar
      const still = (DB._data.users || []).find(u => u && u.id === keepUser.id);
      if (!still) DB._data.users.push(keepUser);
    }
    DB.save();                                         // (_applying = true → push nahi hoga)
    this._applying = false;
    this._lastPulledAt = new Date().toISOString();
    this._lastError = '';
    this._pendingPush = false;
    SafeStore.set('mlfLastCloudPull', this._lastPulledAt);
  },

  async pull(opts) {
    const o = opts || {};
    if (!this.ready) { if (!o.silent) toast('Pehle Cloud Sync ON karein (Settings → Cloud Sync)', 'warn'); return false; }
    if (this._busy) return false;
    this._busy = true;
    this.updateDot();
    try {
      const remote = await this._fetchJSON(this.path('data'));
      this._busy = false;
      if (!remote) {
        this._lastError = ''; this.updateDot();
        if (!o.silent) toast('Cloud khali hai — "Cloud par bhejein" dabayein taake yeh data upload ho jaye', 'info', 5000);
        return false;
      }
      const rTime = Date.parse(remote._updatedAt || 0) || 0;
      const lTime = Date.parse(DB._data._updatedAt || 0) || 0;
      const fresh = this.localIsEmpty();
      if (!fresh && rTime <= lTime && !o.force) {
        this._lastError = ''; this.updateDot();
        if (!o.silent) toast('Is device ka data already latest hai ✔', 'success');
        return false;
      }
      if (o.ask) {
        const yes = await confirmDialog(
          'Cloud par data hai (' + new Date(rTime || Date.now()).toLocaleString() + ').\nCloud ka data le lein? Is device ke local changes overwrite ho jayenge.',
          { title: 'Cloud se data laayein', yes: 'Haan, cloud ka data le lo' });
        if (!yes) { this.updateDot(); return false; }
      }
      this.applyRemote(remote);
      toast('Cloud se data sync ho gaya ✔ (' + fmtKg(Biz.sales().length ? Biz.sales().length : 0) + ' bills)', 'success', 3000);
      if (DB.currentUser()) app.go(app.current || 'dashboard');
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
        toast('Doosre device se naya data aaya — sync ho raha hai…', 'info');
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
        body: JSON.stringify({ ping: new Date().toISOString(), by: 'setup-test' })
      });
      this._lastError = '';
      const shops = await this.listShops();
      toast('Connection OK ✔ Firebase chal rahi hai' + (shops.length ? ' · Shops: ' + shops.join(', ') : ''), 'success', 5000);
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
    this.setCfg({ url: url, shopId: shopId, enabled: enabled !== false });
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
    toast(on ? 'Cloud Sync ON ✔ (config is device par mehfooz hai)' : 'Cloud Sync OFF — ab sirf local storage', on ? 'success' : 'warn');
  },

  async forcePush() { this._didInitialPull = true; this._forceNextPush = true; return this.push(false); },
  async forcePull() { return this.pull({ ask: true, force: true }); },

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
    return 'Cloud: ' + this.shopId + ' · connected';
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
      chip.title = this.statusLabel() + ' — click: abhi sync karein';
    }
  },

  async syncNow() {
    if (!this.ready) { toast('Cloud ON nahi hai — Settings → Cloud Sync', 'warn'); return; }
    toast('Sync ho raha hai…', 'info', 1500);
    await this.pull({ silent: true });
    if (this._pendingPush) await this.push(true);
    this.updateDot();
  }
};
