/* ============================================================
   CLOUD SYNC — optional Firebase Realtime Database (REST API)
   ------------------------------------------------------------
   Settings → Cloud Sync mein apna Firebase databaseURL paste
   karein. Uske baad portal:
     • har save par data cloud par push karta hai (2s debounce)
     • app open hone par cloud se latest data pull karta hai
     • har 60 second baad check karta hai ke kisi doosre device ne
       kuch naya likha hai ya nahi
   Cloud OFF ho to portal sirf localStorage par chalta hai —
   bilkul theek chalta hai, kuch miss nahi hoga.
   ============================================================ */

const Cloud = {
  enabled: false,
  url: '',
  shopId: '',
  ready: false,
  _pushTimer: null,
  _pollTimer: null,
  _applying: false,
  _lastPushedAt: '',
  _busy: false,

  parseConfig(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    // 1) plain URL
    if (/^https?:\/\//i.test(t)) return { url: t.replace(/\/+$/, '') };
    // 2) JSON snippet from Firebase console
    try {
      const j = JSON.parse(t);
      const u = j.databaseURL || j.databaseUrl || j.url;
      if (u) return { url: String(u).replace(/\/+$/, '') };
    } catch (e) { /* ignore */ }
    // 3) js snippet with databaseURL: "..."
    const m = t.match(/databaseURL\s*:\s*["']([^"']+)["']/i);
    if (m) return { url: m[1].replace(/\/+$/, '') };
    return null;
  },

  init() {
    const s = DB.settings();
    this.enabled = !!s.cloudEnabled;
    this.shopId = (s.shopId || 'main').replace(/[^a-zA-Z0-9_-]/g, '');
    const c = this.parseConfig(s.firebaseConfig);
    this.url = c ? c.url : '';
    this.ready = !!(this.enabled && this.url);
    if (this.ready) {
      this.pull({ silent: true });
      this.startPolling();
    }
    this.updateDot();
  },

  statusLabel() {
    if (!this.enabled) return 'Cloud sync: OFF (local storage)';
    if (!this.url) return 'Cloud sync: ON — lekin databaseURL missing ⚠️';
    if (this._busy) return 'Cloud: syncing…';
    return 'Cloud: ON · ' + (this._lastPushedAt ? 'last sync ' + new Date(this._lastPushedAt).toLocaleTimeString() : 'connected');
  },
  updateDot() {
    const d = $('#cloudDot'); if (d) d.textContent = this.statusLabel();
  },

  path(suffix) { return this.url + '/factories/' + (this.shopId || 'main') + '/' + suffix + '.json'; },

  async _fetchJSON(url, opts) {
    const r = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    if (!txt || txt === 'null') return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  },

  /* ---------- PUSH ---------- */
  pushDebounced() {
    if (!this.ready || this._applying) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(), 2000);
  },

  async push(silent) {
    if (!this.ready || this._busy) return;
    this._busy = true;
    const stamp = new Date().toISOString();
    try {
      const payload = JSON.parse(JSON.stringify(DB._data));
      payload._updatedAt = stamp;
      payload._updatedBy = (DB.currentUser() || {}).name || 'device';
      await this._fetchJSON(this.path('data'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await this._fetchJSON(this.path('meta'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedAt: stamp, by: payload._updatedBy, app: 'Mr Laundry Factory Portal' })
      });
      this._lastPushedAt = stamp;
      DB._data._updatedAt = stamp;
      SafeStore.set('mlfLastCloudPush', stamp);
      if (!silent) toast('Cloud par save ho gaya ✔', 'success');
    } catch (e) {
      if (!silent) toast('Cloud push fail: ' + e.message + ' — internet / rules check karein', 'error', 5000);
    } finally {
      this._busy = false;
      this.updateDot();
    }
  },

  /* ---------- PULL ---------- */
  async pull(opts) {
    const o = opts || {};
    if (!this.ready) { if (!o.silent) toast('Pehle Cloud Sync on karein (Settings)', 'warn'); return false; }
    this._busy = true;
    this.updateDot();
    try {
      const remote = await this._fetchJSON(this.path('data'));
      this._busy = false;
      this.updateDot();
      if (!remote) {
        if (!o.silent) toast('Cloud khali hai — pehle push ho jaye ga', 'info');
        return false;
      }
      const rTime = Date.parse(remote._updatedAt || 0) || 0;
      const lTime = Date.parse(DB._data._updatedAt || 0) || 0;
      if (rTime <= lTime && !o.force) {
        if (!o.silent) toast('Local data already latest hai ✔', 'success');
        return false;
      }
      if (o.ask) {
        const yes = await confirmDialog(
          'Cloud par naya data hai (' + new Date(rTime).toLocaleString() + ').\nCloud ka data le lein? Local changes overwrite ho jayenge.',
          { title: 'Cloud Data Milega', yes: 'Haan, cloud se le lo' });
        if (!yes) return false;
      }
      this._applying = true;
      DB._data = remote;
      DB._migrate();
      DB.save();
      this._applying = false;
      toast('Cloud se data sync ho gaya ✔', 'success');
      app.go(app.current || 'dashboard');
      return true;
    } catch (e) {
      this._busy = false;
      this.updateDot();
      if (!o.silent) toast('Cloud pull fail: ' + e.message, 'error', 5000);
      return false;
    }
  },

  startPolling() {
    clearInterval(this._pollTimer);
    this._pollTimer = setInterval(async () => {
      if (!this.ready || this._busy || document.hidden) return;
      try {
        const meta = await this._fetchJSON(this.path('meta'));
        if (!meta || !meta.updatedAt) return;
        const rTime = Date.parse(meta.updatedAt) || 0;
        const lTime = Date.parse(DB._data._updatedAt || 0) || 0;
        if (rTime > lTime + 4000) {
          toast('Doosre device se naya data aaya — sync ho raha hai…', 'info');
          await this.pull({ silent: true });
        }
      } catch (e) { /* offline — ignore */ }
    }, 60000);
  },

  stopPolling() { clearInterval(this._pollTimer); },

  async test() {
    const c = this.parseConfig(DB.settings().firebaseConfig);
    if (!c) { toast('databaseURL sahi nahi lag raha. Format: https://xxxx-default-rtdb.firebaseio.com', 'error', 5000); return false; }
    this.url = c.url;
    this.shopId = (DB.settings().shopId || 'main').replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      await this._fetchJSON(this.path('data'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: new Date().toISOString(), by: 'setup-test' })
      });
      toast('Connection OK ✔ Cloud ready hai', 'success');
      return true;
    } catch (e) {
      toast('Connect nahi hua: ' + e.message + ' — rules ya URL check karein', 'error', 6000);
      return false;
    }
  },

  setEnabled(on) {
    DB.saveSettings({ cloudEnabled: !!on });
    this.init();
    if (on) this.push(true);
    toast(on ? 'Cloud sync ON' : 'Cloud sync OFF — ab sirf local storage', on ? 'success' : 'warn');
  }
};
