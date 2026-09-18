/* ============================================================
   SETTINGS — shop profile, rate, categories, cloud sync, backup
   ============================================================ */

let SetUI = { tab: 'shop' };

function renderSettings() {
  UI.renderLayout('settings', `<div id="setBody"></div>`);
  settingsPaint();
}

function settingsPaint() {
  const el = $('#setBody');
  if (!el) return;
  const s = DB.settings();
  const tabs = [
    ['shop', '🏪 Shop Profile'],
    ['rate', '⚖️ Rate per KG'],
    ['cloud', '☁️ Cloud Sync'],
    ['backup', '💾 Backup &amp; Data'],
    ['about', 'ℹ️ Help']
  ];
  el.innerHTML = `
    <div class="tabs">${tabs.map(t => `<button class="tab ${SetUI.tab === t[0] ? 'on' : ''}" data-st="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div id="setPane"></div>`;
  $$('[data-st]', el).forEach(b => b.onclick = () => { SetUI.tab = b.dataset.st; settingsPaint(); });

  const pane = $('#setPane');

  /* ---------------- SHOP PROFILE ---------------- */
  if (SetUI.tab === 'shop') {
    pane.innerHTML = `
      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>🏪 Shop / Factory Profile</h3><div class="sp"></div>
            <span class="tiny muted">Yeh details invoice aur slip par print hoti hain</span></div>
          <div class="card-body">
            <div class="grid g2">
              <label class="fld"><span>Shop / Factory Name</span><input class="inp" id="stName" value="${esc(s.shopName)}"/></label>
              <label class="fld"><span>Tagline</span><input class="inp" id="stTag" value="${esc(s.tagline || '')}"/></label>
            </div>
            <div class="grid g2">
              <label class="fld"><span>Phone</span><input class="inp" id="stPhone" value="${esc(s.phone || '')}" placeholder="03xx-xxxxxxx"/></label>
              <label class="fld"><span>Email</span><input class="inp" id="stEmail" value="${esc(s.email || '')}"/></label>
            </div>
            <label class="fld"><span>Address</span><input class="inp" id="stAddr" value="${esc(s.address || '')}"/></label>
            <div class="grid g2">
              <label class="fld"><span>NTN (optional)</span><input class="inp" id="stNtn" value="${esc(s.ntn || '')}"/></label>
              <label class="fld"><span>Logo — Screen / A4 (URL ya path)</span><input class="inp" id="stLogo" value="${esc(s.logoImage || '')}" placeholder="assets/img/logo.jpeg"/></label>
              <label class="fld"><span>Logo — Thermal (black-only)</span><input class="inp" id="stLogoThermal" value="${esc(s.logoMonoImage || '')}" placeholder="assets/img/logo-thermal.png"/>
                <div class="fld-hint">Thermal printer sirf kaala print karta hai — yeh mono logo use hota hai. Apna logo daalna ho to is path/URL ko badal dein.</div></label>
            </div>
            <label class="fld"><span>Sale Slip Footer Note</span>
              <textarea class="inp" id="stSlipNote">${esc(s.slipFooterNote || '')}</textarea></label>
            <label class="fld"><span>Invoice Terms</span>
              <textarea class="inp" id="stTerms">${esc(s.invoiceTerms || '')}</textarea></label>
            <button class="btn btn-primary" id="stSaveShop">💾 Save Profile</button>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>🖨️ Thermal Printer Settings</h3><div class="sp"></div>
            <span class="pill pill-info">${esc(s.slipPaper === 'thermal58' ? '58mm' : '80mm')}</span></div>
          <div class="card-body">
            <div class="note-box info tiny mb10">
              Black copper thermal par sirf <b>kaala</b> print hota hai — is liye slip mein gray fills use nahi hote,
              sirf bold text aur solid black bars. Paper bachane ke liye rows compact rakhe gaye hain.
            </div>
            <label class="fld"><span>Paper Size / Printer</span>
              <select class="inp" id="stPaper">
                <option value="thermal80" ${s.slipPaper !== 'thermal58' && s.slipPaper !== 'a5' && s.slipPaper !== 'a4' ? 'selected' : ''}>80mm thermal (3 inch) — recommended</option>
                <option value="thermal58" ${s.slipPaper === 'thermal58' ? 'selected' : ''}>58mm thermal (2 inch)</option>
                <option value="a5" ${s.slipPaper === 'a5' ? 'selected' : ''}>A5 paper</option>
                <option value="a4" ${s.slipPaper === 'a4' ? 'selected' : ''}>A4 paper</option>
              </select></label>
            <div class="grid g2" style="gap:10px">
              <label class="fld"><span>Logo Size (px)</span>
                <input type="number" step="2" min="20" max="64" class="inp" id="stLogoH" value="${num(s.slipLogoHeight) || 40}"/>
                <div class="fld-hint">Chhota = kam paper waste. 36–44 px 80mm ke liye theek hai.</div></label>
              <div class="fld"><span>Print par kya kya ho</span>
                <label class="row tiny" style="gap:6px;font-weight:700"><input type="checkbox" id="stSlipLogo" ${s.slipLogo !== false ? 'checked' : ''}/> Slip par logo</label>
                <label class="row tiny" style="gap:6px;font-weight:700"><input type="checkbox" id="stMonoLogo" ${s.logoMono !== false ? 'checked' : ''}/> Black-only (mono) logo use karein</label>
                <label class="row tiny" style="gap:6px;font-weight:700"><input type="checkbox" id="stSlipPhone" ${s.slipPhone !== false ? 'checked' : ''}/> Phone number</label>
                <label class="row tiny" style="gap:6px;font-weight:700"><input type="checkbox" id="stSlipAddr" ${s.slipAddress !== false ? 'checked' : ''}/> Address</label>
              </div>
            </div>
            <div class="row" style="gap:8px">
              <button class="btn btn-primary" id="stSavePrint">💾 Save Print Settings</button>
              <button class="btn btn-ghost" id="stTestSlip">🧾 Test Print — Sale Slip</button>
              <button class="btn btn-ghost" id="stTestInv">📄 Test Print — Invoice (A4)</button>
            </div>
            <div class="tiny muted mt6">Test print ke liye: browser ke print dialog mein apna thermal printer select karein,
              paper size 80mm (3") rakhein, margins minimum/"None" karein aur "Print backgrounds/graphics" ON rakhein.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>👁️ Live Preview</h3></div>
          <div class="card-body">
            <div class="note-box" style="text-align:center">
              <img src="${esc(s.logoImage || 'assets/img/logo.jpeg')}" style="max-height:70px;border-radius:8px"/>
              <div style="font-weight:800;font-size:16px;margin-top:6px">${esc(s.shopName)}</div>
              <div class="tiny muted">${esc(s.tagline || '')}</div>
              <div class="tiny" style="margin-top:6px">${esc(s.address || '')}<br>${esc(s.phone || '')}</div>
            </div>
            <div class="note-box info tiny mt10">
              Slip par amount nahi hota — sirf KG aur items. Amount wala invoice “Custom Invoice” se banta hai.
            </div>
          </div>
        </div>
      </div>`;
    $('#stSavePrint').onclick = () => {
      DB.saveSettings({
        slipPaper: $('#stPaper', pane).value,
        slipLogoHeight: Math.max(20, Math.min(64, num($('#stLogoH', pane).value) || 40)),
        slipLogo: $('#stSlipLogo', pane).checked,
        logoMono: $('#stMonoLogo', pane).checked,
        slipPhone: $('#stSlipPhone', pane).checked,
        slipAddress: $('#stSlipAddr', pane).checked
      });
      DB.audit('settings', 'Thermal print settings update: ' + $('#stPaper', pane).value);
      toast('Print settings save ho gayi', 'success');
      settingsPaint();
    };
    $('#stTestSlip').onclick = () => {
      DB.saveSettings({
        slipPaper: $('#stPaper', pane).value,
        slipLogoHeight: Math.max(20, Math.min(64, num($('#stLogoH', pane).value) || 40)),
        slipLogo: $('#stSlipLogo', pane).checked,
        logoMono: $('#stMonoLogo', pane).checked,
        slipPhone: $('#stSlipPhone', pane).checked,
        slipAddress: $('#stSlipAddr', pane).checked
      });
      printTestSlip();
    };
    $('#stTestInv').onclick = () => printTestInvoice();

    $('#stSaveShop').onclick = () => {
      DB.saveSettings({
        shopName: $('#stName', pane).value || 'Mr Laundry Factory',
        tagline: $('#stTag', pane).value, phone: $('#stPhone', pane).value, email: $('#stEmail', pane).value,
        address: $('#stAddr', pane).value, ntn: $('#stNtn', pane).value,
        logoImage: $('#stLogo', pane).value, logoColorImage: $('#stLogo', pane).value,
        logoMonoImage: $('#stLogoThermal', pane).value,
        slipFooterNote: $('#stSlipNote', pane).value, invoiceTerms: $('#stTerms', pane).value
      });
      DB.audit('settings', 'Shop profile update hua');
      toast('✔ Profile save ho gaya', 'success');
      settingsPaint();
    };
  }

  /* ---------------- RATE & CATEGORIES ---------------- */
  if (SetUI.tab === 'rate') {
    pane.innerHTML = `
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>⚖️ Per KG Rate</h3></div>
          <div class="card-body">
            <div class="note-box info tiny mb10">Billing <b>total KG × rate</b> par banti hai — sab items aur sab customers ke liye ek hi rate.</div>
            <div class="row" style="gap:8px;align-items:end">
              <label class="fld mb0 flex1"><span>Rate per KG (Rs)</span>
                <input type="number" step="1" class="inp" id="stRate" value="${num(s.ratePerKg)}"/></label>
              <button class="btn btn-primary" id="stSaveRate">💾 Save Rate</button>
            </div>
            <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">
              ${[100, 120, 150, 175, 200, 225, 250, 300, 350, 400].map(v => `<button class="btn btn-ghost btn-xs" data-rqset="${v}">Rs. ${v}</button>`).join('')}
            </div>
            <div class="divider"></div>
            <div class="kv"><span>Example: 10 kg wash</span><b>${fmtMoney(round2(10 * num(s.ratePerKg)))}</b></div>
            <div class="kv"><span>Example: 240 kg wash</span><b>${fmtMoney(round2(240 * num(s.ratePerKg)))}</b></div>
            <div class="kv"><span>Purani entry par purana rate</span><b>Ledger → Receive Payment → “Kis rate par?”</b></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>📂 Expense &amp; Purchase Categories</h3></div>
        <div class="card-body grid g2">
          <label class="fld"><span>Expense Categories (comma se alag karein)</span>
            <textarea class="inp" id="stExpCats">${esc((s.expenseCategories || []).join(', '))}</textarea></label>
          <label class="fld"><span>Purchase Categories</span>
            <textarea class="inp" id="stPurCats">${esc((s.purchaseCategories || []).join(', '))}</textarea></label>
        </div>
        <div class="card-body" style="padding-top:0"><button class="btn btn-primary" id="stSaveCats2">💾 Save Categories List</button></div>
      </div>`;

    $$('[data-rqset]', pane).forEach(b => b.onclick = () => {
      $('#stRate', pane).value = b.dataset.rqset;
      $('#stSaveRate', pane).click();
    });
    $('#stSaveRate').onclick = () => {
      DB.saveSettings({ ratePerKg: num($('#stRate', pane).value) || 200 });
      DB.audit('settings', 'Per KG rate update: ' + $('#stRate', pane).value);
      toast('✔ Rate update ho gaya', 'success');
      settingsPaint();
    };
    $('#stSaveCats2').onclick = () => {
      DB.saveSettings({
        expenseCategories: $('#stExpCats', pane).value.split(',').map(x => x.trim()).filter(Boolean),
        purchaseCategories: $('#stPurCats', pane).value.split(',').map(x => x.trim()).filter(Boolean)
      });
      toast('✔ Category lists save ho gayi', 'success');
    };
  }

  /* ---------------- CLOUD SYNC (v2 — config device par save hoti hai) ---------------- */
  if (SetUI.tab === 'cloud') {
    const cfg = Cloud.cfg;
    const st = Cloud.statusLabel();
    const dot = Cloud.dotColor();
    const shops = Cloud._shops || [];
    pane.innerHTML = `
      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>☁️ Firebase Cloud Sync</h3><div class="sp"></div>
            <span class="pill ${Cloud.ready ? 'pill-ok' : 'pill-muted'}">${Cloud.ready ? (Cloud.cfg.enabled ? 'ON' : 'READY') : 'OFF'}</span></div>
          <div class="card-body">
            <div class="note-box ok tiny mb10">
              🔒 <b>Config ab is device par alag save hoti hai</b> — cloud se data aane par bhi kabhi delete nahi hoti.
              Cloud par sirf aap ka <b>business data</b> jata hai (sales, customers, payments…).
            </div>

            <label class="fld"><span>Firebase databaseURL</span>
              <textarea class="inp" id="stCfg" style="min-height:70px" placeholder="https://mrlaundryfactory-default-rtdb.firebaseio.com">${esc(cfg.url || '')}</textarea>
              <div class="fld-hint">Sirf URL chalega, ya console ka poora config snippet paste kar dein (hum databaseURL khud nikal lete hain).</div></label>

            <label class="fld"><span>Shop ID (is data-set ka naam)</span>
              <input class="inp" id="stShopId" value="${esc(cfg.shopId || 'main')}" placeholder="main"/>
              <div class="fld-hint">Har device par <b>yehi Shop ID</b> honi chahiye taake sab ek hi data dekhein. Do alag kaam (factory / shop) ke liye Shop ID alag rakhein.</div></label>

            ${shops.length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">
              <span class="tiny muted" style="align-self:center">Is database mein maujood data-sets:</span>
              ${shops.map(k => `<button class="btn ${k === cfg.shopId ? 'btn-primary' : 'btn-ghost'} btn-xs" data-shopset="${esc(k)}">${esc(k)}</button>`).join('')}
            </div>` : `<div class="tiny muted" style="margin-top:4px">Data-sets dekhne ke liye <b>Test Connection</b> dabayein.</div>`}

            <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
              <button class="btn btn-primary" id="stSaveCfg">💾 Save &amp; Connect</button>
              <button class="btn btn-ghost" id="stTest">🔌 Test Connection</button>
            </div>
            <div class="divider"></div>
            <label class="row" style="gap:8px;font-weight:800"><input type="checkbox" id="stCloudOn" ${cfg.enabled ? 'checked' : ''}/> Cloud Sync ON (auto sync)</label>
            <div class="row mt10" style="gap:8px;flex-wrap:wrap">
              <button class="btn btn-success btn-sm" id="stPush">⬆️ Cloud par bhejein (is device ka data)</button>
              <button class="btn btn-warn btn-sm" id="stPull">⬇️ Cloud se laayein (dusre device ka data)</button>
            </div>
            <div class="tiny muted mt10">Status: <b style="color:${dot}">${esc(st)}</b></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>📡 Sync Report (diagnostics)</h3></div>
          <div class="card-body">
            <div class="kv"><span>Device par config saved</span><b class="${Cloud.cfgSaved() ? 't-ok' : 't-bad'}">${Cloud.cfgSaved() ? '✔ Haan' : '— Nahi'}</b></div>
            <div class="kv"><span>URL</span><b class="tiny">${esc(Cloud.url || '—')}</b></div>
            <div class="kv"><span>Shop ID</span><b>${esc(Cloud.shopId || '—')}</b></div>
            <div class="kv"><span>Cloud sync</span><b>${Cloud.cfg.enabled ? 'ON' : 'OFF'}</b></div>
            <div class="kv"><span>Last push (yahan se gaya)</span><b class="tiny">${Cloud._lastPushedAt ? new Date(Cloud._lastPushedAt).toLocaleString() : '—'}</b></div>
            <div class="kv"><span>Last pull (yahan aaya)</span><b class="tiny">${Cloud._lastPulledAt ? new Date(Cloud._lastPulledAt).toLocaleString() : '—'}</b></div>
            <div class="kv"><span>Pending changes</span><b>${Cloud._pendingPush ? '<span class="t-warn">Bhejna baqi — auto retry chal raha hai</span>' : 'Kuch nahi ✔'}</b></div>
            ${Cloud._lastError ? `<div class="note-box bad tiny mt10">⚠️ <b>Last error:</b> ${esc(Cloud._lastError)}
              ${Cloud._lastErrorAt ? '<br><span class="tiny muted">' + new Date(Cloud._lastErrorAt).toLocaleString() + '</span>' : ''}
              <br>Ziyada tar yeh Firebase <b>rules</b> ki wajah se hota hai — neeche wale rules dobara Publish kar dein.</div>` : ''}
            <div class="note-box info tiny mt10">
              <b>Naye computer par kya karna hai?</b><br>
              1) Yahi portal link kholein → 2) apne username/password se login karein → bas!
              Data khud aa jayega. (Config default URL se khud lag jati hai; sirf Shop ID wahi honi chahiye.)
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>🔧 Firebase Rules (ek dafa set karein)</h3></div>
        <div class="card-body small" style="line-height:1.9">
          Firebase Console → <b>Realtime Database → Rules</b> → yeh paste karke <b>Publish</b> karein:
          <pre class="codesnip">{
  "rules": {
    "factories": {
      "$shop": { ".read": true, ".write": true }
    }
  }
}</pre>
          <span class="t-warn">⚠️</span> Agar rules <i>test mode</i> ke 30 din pooray hone ki wajah se band ho gaye hon to sync chup-chaap ruk jata hai —
          usi liye upar <b>diagnostics</b> mein error nazar aa jata hai. Rules Publish karne ke baad <b>Test Connection</b> daba dein.<br>
          <b>Security behtar karni ho</b> (public link par bhi data band) to Firebase Authentication laga kar yeh rules use karein:
          <pre class="codesnip">{
  "rules": {
    "factories": {
      "$shop": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}</pre>
        </div>
      </div>`;

    $$('[data-shopset]', pane).forEach(b => b.onclick = async () => {
      Cloud.setCfg({ shopId: b.dataset.shopset });
      settingsPaint();
      toast('Shop ID "' + b.dataset.shopset + '" set — ab pull kar rahe hain…', 'info');
      Cloud._didInitialPull = true;
      await Cloud.pull({ silent: false, force: true, ask: false });
    });
    $('#stSaveCfg').onclick = async () => {
      await Cloud.saveAndConnect($('#stCfg', pane).value, $('#stShopId', pane).value || CLOUD_DEFAULT_SHOP, true);
      settingsPaint();
    };
    $('#stTest').onclick = async () => {
      Cloud.setCfg({ url: $('#stCfg', pane).value, shopId: $('#stShopId', pane).value || CLOUD_DEFAULT_SHOP }, { quiet: true });
      Cloud.refresh();
      await Cloud.test();
      settingsPaint();
    };
    $('#stCloudOn').onchange = e => { Cloud.setEnabled(e.target.checked); settingsPaint(); };
    $('#stPush').onclick = () => Cloud.forcePush();
    $('#stPull').onclick = () => Cloud.forcePull();
  }

  /* ---------------- BACKUP & DATA ---------------- */
  if (SetUI.tab === 'backup') {
    const counts = {
      sales: Biz.sales().length, payments: Biz.payments().length, customers: DB.all('customers').length,
      products: DB.all('products').length, expenses: DB.all('expenses').length,
      purchases: DB.all('purchases').length, vendors: DB.all('vendors').length,
      employees: DB.all('employees').length, salaries: DB.all('salaries').length, drawings: DB.all('drawings').length
    };
    pane.innerHTML = `
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>💾 Backup &amp; Restore</h3></div>
          <div class="card-body">
            <div class="note-box warn tiny mb10">Hafte mein ek dafa backup zaroor lein — file apne phone/Google Drive par rakhein.</div>
            <div class="row" style="gap:8px">
              <button class="btn btn-primary" id="bkDown">⬇️ Backup Download (JSON)</button>
              <button class="btn btn-ghost" id="bkExcelAll">📊 Saara Data (CSV bundle)</button>
            </div>
            <div class="divider"></div>
            <label class="fld"><span>Backup file restore karein (.json)</span>
              <input type="file" class="inp" id="bkFile" accept=".json,application/json"/></label>
            <button class="btn btn-warn" id="bkRestore">♻️ Restore Backup</button>
            <div class="divider"></div>
            <div class="tiny muted">Last save: ${DB._data._updatedAt ? new Date(DB._data._updatedAt).toLocaleString() : '—'}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>📊 Data Summary</h3></div>
          <div class="card-body">
            ${Object.keys(counts).map(k => `<div class="kv"><span>${esc(titleCase(k))}</span><b>${fmtNum(counts[k])}</b></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>🧪 Demo Data (testing ke liye)</h3></div>
        <div class="card-body row" style="gap:10px">
          <button class="btn btn-ghost" id="dmLoad">🧪 Demo Data Load Karein</button>
          <button class="btn btn-ghost" id="dmClear">🧹 Sirf Transactions Clear Karein</button>
          <div class="small dim">Demo se aap dashboard, ledger, delivery — sab flow test kar sakte hain. Baad mein transactions clear kar dein (customers/products reh jayenge).</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>⚠️ Danger Zone</h3></div>
        <div class="card-body row" style="gap:10px;justify-content:space-between">
          <div class="small"><b class="t-bad">Poora data reset</b><br>Sab kuch (customers, products, sales, settings) delete ho kar fresh portal ban jayega.</div>
          <button class="btn btn-danger" id="dzReset">🗑️ Reset Everything</button>
        </div>
      </div>`;

    $('#bkDown').onclick = () => {
      downloadFile('mr-laundry-factory-backup-' + todayISO() + '.json', DB.backupJSON(), 'application/json');
      toast('Backup download ho gaya', 'success');
    };
    $('#bkExcelAll').onclick = () => {
      const s1 = toCSV(['Invoice', 'Customer', 'Invoice Date', 'Delivery Date', 'Items', 'KG', 'Rate', 'Amount', 'Status'],
        Biz.sales().map(s => [s.invoiceNo, Biz.customerName(s.customerId), s.entryDate, s.deliveryDate || '', Biz.saleItemsSummary(s), s.kgTotal, Biz.saleRate(s), Biz.saleAmount(s), s.status]));
      const s2 = toCSV(['Date', 'Voucher', 'Customer', 'Amount', 'KG Covered', 'Mode', 'Note'],
        Biz.payments().map(p => [p.date, p.no, Biz.customerName(p.customerId), p.amount, p.kgCovered, p.mode, p.note]));
      const s3 = toCSV(['Customer', 'Phone', 'Total KG', 'Billed', 'Paid', 'Balance', 'Balance KG'],
        DB.all('customers').map(c => { const a = Biz.customerAccount(c.id); return [c.name, c.phone, a.kgTotal, a.amount, a.paid, a.balance, a.kgBalance]; }));
      downloadFile('mr-laundry-factory-data-' + todayISO() + '.csv', '\uFEFF' + s1 + '\r\n\r\n' + s2 + '\r\n\r\n' + s3, 'text/csv;charset=utf-8');
      toast('CSV bundle download ho gaya', 'success');
    };
    $('#bkRestore').onclick = () => {
      const f = $('#bkFile', pane).files[0];
      if (!f) return toast('Pehle file select karein', 'error');
      const r = new FileReader();
      r.onload = async () => {
        const yes = await confirmDialog('Restore karne se maujooda data replace ho jayega. Continue?', { danger: true, yes: 'Restore karein' });
        if (!yes) return;
        try {
          DB.restoreJSON(r.result);
          toast('✔ Backup restore ho gaya', 'success');
          setTimeout(() => location.reload(), 900);
        } catch (e) { toast('Restore fail: ' + e.message, 'error', 5000); }
      };
      r.readAsText(f);
    };
    $('#dmLoad').onclick = async () => {
      const yes = await confirmDialog('Demo data load karein? (maujooda records ke sath add hoga)', { yes: 'Load karein' });
      if (!yes) return;
      Biz.loadDemo();
      toast('✔ Demo data load ho gaya', 'success');
      app.go('dashboard');
    };
    $('#dmClear').onclick = async () => {
      const yes = await confirmDialog('Saara transaction data (sales, payments, expenses, purchases, salaries, drawings) clear karein?', { danger: true, yes: 'Clear karein' });
      if (!yes) return;
      Biz.clearTransactions();
      toast('Transactions clear ho gaye', 'warn');
      app.go('dashboard');
    };
    $('#dzReset').onclick = async () => {
      const yes = await confirmDialog('POORA data delete ho jayega (backup liya hai?). Yeh undo nahi ho sakta.', { danger: true, yes: 'Sab kuch reset karein' });
      if (!yes) return;
      DB.resetAll();
      toast('Portal reset ho gaya', 'warn');
      setTimeout(() => location.reload(), 700);
    };
  }

  /* ---------------- HELP ---------------- */
  if (SetUI.tab === 'about') {
    const r = Biz.receivables();
    pane.innerHTML = `
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>ℹ️ Portal kaise use karein (roz ka kaam)</h3></div>
          <div class="card-body small" style="line-height:2">
            <b>1. New Sales</b> — daily client se kapre aaye → customer select → category tab (A/B/C) → KG + items → <b>Save + Print Slip</b>.
            Slip par amount nahi hoti. ✅<br>
            <b>2. Delivery Queue</b> — jab maal wapis jaye → <b>Deliver</b> dabayein → <b>delivery date</b> khud set ho jati hai.<br>
            <b>3. Payment Ledger</b> — paisa aaye → <b>Receive Payment</b> → amount likhein <i>ya</i> KG likhein (partial bhi chalega) →
            system khud batata hai kitne KG ka payment hua aur kitna baqi.<br>
            <b>4. Custom Invoice</b> — Sales tab → kisi entry par 🖨️ → <b>Custom Invoice</b> → KG, rate, discount, received →
            print A4/A5/thermal. Purana balance aur remaining KG bhi invoice par aata hai.<br>
            <b>5. Weekly Invoice</b> — Ledger → <b>Weekly Invoice</b> → date range → poore hafte ka consolidated bill.<br>
            <b>6. Expenses / Purchases / Salary / Drawings</b> — rozana kharchay record karein, dashboard aur P&amp;L khud update ho jayega.<br>
            <b>7. Reports</b> — Profit &amp; Loss, KG report, customer report, collections — print ya CSV.
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>❓ Common sawal</h3></div>
          <div class="card-body small" style="line-height:1.9">
            <b>Slip par amount kyun nahi?</b> Aap ki requirement ke mutabiq — roz ka slip sirf KG/items ka record hai.<br><br>
            <b>Half payment kaise hoga?</b> Ledger → Receive Payment → KG mode → e.g. 180 likhein. System 240 me se 180 KG cut kar dega aur
            <b>60 KG balance</b> show karega — next invoice par wohi balance continue hoga.<br><br>
            <b>Rate change karna hai?</b> Settings → Rate &amp; Categories. Purane bill purane rate par hi rahenge (har sale mein rate save hota hai).<br><br>
            <b>Data safe hai?</b> Har save browser mein + (agar ON ho) aap ke Firebase par. Backup Settings → Backup se JSON file.<br><br>
            <b>Current receivable:</b> ${fmtMoney(r.balance)} (${fmtKg(r.kgBalance)})
          </div>
        </div>
      </div>`;
  }
}
