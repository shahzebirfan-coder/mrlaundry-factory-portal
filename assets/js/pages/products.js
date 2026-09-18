/* ============================================================
   PRODUCTS — wash items (New Sales mein yeh list click hoti hai)
   ============================================================ */

const ProdUI = { cat: 'all', q: '', showInactive: false };

function renderProducts() {
  UI.renderLayout('products', `<div id="prodBody"></div>`);
  productsPaint();
}

/** 🧩 Types editor — kisi bhi item ke types yahan se manage karein */
function productTypesForm(pid) {
  const p = DB.get('products', pid);
  if (!p) return;
  const body = `
    <div class="note-box info tiny mb10">
      <b>${esc(p.name)}</b> ke types — jaise <i>Junior Shoes, Sports Shoes, Man Shoes, CH Shoes</i>.<br>
      New Sales ke <b>Step 03</b> mein yeh types KG ke sath dikhte hain (aur cashier wahin se naye type bhi add kar sakta hai).
    </div>
    <label class="fld"><span>Types (comma se alag, ya har type nayi line mein)</span>
      <textarea class="inp" id="ptList" style="min-height:110px" placeholder="Junior Shoes, Sports Shoes, Man Shoes, CH Shoes">${esc(((p.types) || []).join(', '))}</textarea></label>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      ${['Junior', 'Sports', 'Man', 'CH', 'Kids', 'Ladies', 'Gents'].map(t => `<button class="btn btn-ghost btn-xs" data-ptquick="${t}">+ ${t}</button>`).join('')}
    </div>
    <div class="fld-hint">Buttons se naam add ho jata hai — phir apne hisaab se badal sakte hain.</div>`;
  const w = openModal({
    title: '🧩 Types — ' + p.name, size: 'sm', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
             <button class="btn btn-primary" id="ptSave">💾 Save Types</button>`
  });
  const ta = $('#ptList', w);
  $$('[data-ptquick]', w).forEach(b => b.onclick = () => {
    const cur = ta.value.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
    if (cur.indexOf(b.dataset.ptquick) < 0) cur.push(b.dataset.ptquick);
    ta.value = cur.join(', ');
    ta.focus();
  });
  $('#ptSave', w).onclick = () => {
    const out = [];
    ta.value.split(/[,\n]/).map(x => x.trim()).filter(Boolean).forEach(x => { if (out.indexOf(x) < 0) out.push(x); });
    DB.upsert('products', Object.assign({}, p, { types: out }));
    DB.audit('product', 'Types update: ' + p.name + ' → ' + out.join(', '));
    toast('✔ ' + p.name + ' ke types save ho gaye (' + out.length + ')', 'success');
    closeModal(w);
    productsPaint();
  };
}

function productsPaint() {
  const el = $('#prodBody');
  if (!el) return;
  let rows = DB.all('products').filter(p => ProdUI.showInactive || p.active !== false);
  const q = ProdUI.q.trim().toLowerCase();
  if (q) rows = rows.filter(p => (p.name || '').toLowerCase().includes(q));
  rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const sales = Biz.sales();
  const usage = {};
  sales.forEach(s => (s.lines || []).forEach(l => {
    usage[l.productId] = usage[l.productId] || { kg: 0, count: 0 };
    usage[l.productId].kg = round1(usage[l.productId].kg + num(l.qtyKg));
    usage[l.productId].count++;
  }));

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '🧺', label: 'Total Products', value: fmtNum(rows.length), tone: 'info' })}
      ${UI.statCard({ icon: '⚖️', label: 'Rate / KG (sab items)', value: fmtMoney(Biz.rate()), tone: 'purple', foot: 'Settings se change karein' })}
      ${UI.statCard({ icon: '✅', label: 'Active Items', value: fmtNum(rows.filter(p => p.active !== false).length), tone: 'good' })}
    </div>

    <div class="card">
      <div class="card-head">
        <h3>🧺 Product List — New Sales mein yahi items click hote hain</h3><div class="sp"></div>
        <button class="btn btn-warn btn-sm" id="pRateBtn" title="Per KG rate edit karein">⚖️ Rate: ${fmtMoney(Biz.rate())}/kg ✏️ Edit</button>
        <input class="inp inp-sm" id="pSearch" placeholder="🔍 Item ka naam" value="${esc(ProdUI.q)}" style="width:190px"/>
        <label class="row small dim" style="gap:6px;font-weight:700"><input type="checkbox" id="pInact" ${ProdUI.showInactive ? 'checked' : ''}/> Inactive bhi</label>
        <button class="btn btn-ghost btn-sm" id="pExport">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" id="pNew">➕ New Product</button>
      </div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:820px">
          <thead><tr>
            <th>Item Name</th><th>Types (Step 03)</th><th class="t-right">Rate</th>
            <th class="t-right">Wash KG (all time)</th><th class="t-center">Times Used</th><th class="t-center">Status</th>
            <th class="t-center">Actions</th>
          </tr></thead>
          <tbody>${rows.length ? rows.map(p => `<tr>
            <td class="t-strong">${esc(p.name)}${p.note ? '<div class="tiny muted">' + esc(p.note) + '</div>' : ''}</td>
            <td class="tiny">${(p.types && p.types.length)
      ? p.types.map(t => `<span class="tag" style="margin:1px 2px">${esc(t)}</span>`).join('')
      : '<span class="muted">—</span>'}
              <button class="icon-btn" style="width:24px;height:24px;font-size:10px;vertical-align:middle" data-ptypes="${p.id}" title="Types edit karein">🧩</button></td>
            <td class="t-right">${fmtMoney(Biz.rate())}</td>
            <td class="t-right">${fmtKg((usage[p.id] || {}).kg || 0)}</td>
            <td class="t-center">${fmtNum((usage[p.id] || {}).count || 0)}</td>
            <td class="t-center">${p.active === false ? '<span class="pill pill-muted">Inactive</span>' : '<span class="pill pill-ok">Active</span>'}</td>
            <td class="t-center t-nowrap">
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pedit="${p.id}" title="Edit">✏️</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-ptoggle="${p.id}" title="Active/Inactive">${p.active === false ? '✅' : '🚫'}</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pdel="${p.id}" title="Delete">🗑️</button>
            </td>
          </tr>`).join('') : emptyRow(7, 'Koi product nahi — “New Product” se add karein', '🧺')}</tbody>
        </table>
      </div>
    </div>

    <div class="card"><div class="card-body">
      <div class="note-box info tiny">
        <b>Types (Step 03):</b> har item ke chhote types (jaise Shoes → <i>Junior / Sports / Man / CH</i>) yahan se set karein —
        New Sales ke <b>Step 03</b> mein yeh KG ke sath khud nazar aayenge. Cashier wahin naya type bhi add kar sakta hai
        (khud isi list mein save ho jata hai).<br>
        <b>Kaise kaam karta hai:</b> New Sales page par in tamam items ke chips ek hi jagah dikhte hain.
        Cashier item par click karta hai aur KG enter karke “Add to Slip” dabata hai — item invoice mein aa jata hai.
        Billing sab ka <b>ek hi rate</b> (${fmtMoney(Biz.rate())} per KG) hota hai, jo Settings se change karein.
      </div>
    </div></div>`;

  const sq = $('#pSearch'); if (sq) sq.oninput = debounce(e => { ProdUI.q = e.target.value; productsPaint(); }, 250);
  const si = $('#pInact'); if (si) si.onchange = e => { ProdUI.showInactive = e.target.checked; productsPaint(); };
  const rb = $('#pRateBtn'); if (rb) rb.onclick = () => openRateForm();
  $('#pNew').onclick = () => productForm();
  $('#pExport').onclick = () => exportCSV('products.csv', ['Name', 'Types', 'Rate', 'Total KG', 'Times Used', 'Active'],
    rows.map(p => [p.name, (p.types || []).join(' | '), Biz.rate(), (usage[p.id] || {}).kg || 0, (usage[p.id] || {}).count || 0, p.active !== false]));

  $$('[data-pedit]', el).forEach(b => b.onclick = () => productForm(b.dataset.pedit));
  $$('[data-ptypes]', el).forEach(b => b.onclick = () => productTypesForm(b.dataset.ptypes));
  $$('[data-ptoggle]', el).forEach(b => b.onclick = () => {
    const p = DB.get('products', b.dataset.ptoggle);
    DB.upsert('products', Object.assign({}, p, { active: p.active === false }));
    productsPaint();
  });
  $$('[data-pdel]', el).forEach(b => b.onclick = async () => {
    const p = DB.get('products', b.dataset.pdel);
    const yes = await confirmDialog('“' + p.name + '” delete karein? Purane invoices par asar nahi hoga.', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('products', p.id);
    DB.audit('product-delete', 'Product delete: ' + p.name);
    toast('Product delete ho gaya', 'warn');
    productsPaint();
  });
}

/* productForm(existingIdOrProduct) → Promise<product|null> */
function productForm(idOrProd) {
  return new Promise(resolve => {
    const p = (idOrProd && typeof idOrProd === 'object') ? idOrProd : (idOrProd ? DB.get('products', idOrProd) : null);
    const body = `
      <div class="grid g2">
        <label class="fld"><span>Item Name <b class="req">*</b></span>
          <input class="inp" id="prName" value="${esc(p ? p.name : '')}" placeholder="e.g. Wash & Fold / Bedsheet Wash"/></label>
        <label class="fld"><span>Status</span>
          <select class="inp" id="prActive">
            <option value="1" ${!p || p.active !== false ? 'selected' : ''}>Active (New Sales mein dikhega)</option>
            <option value="0" ${p && p.active === false ? 'selected' : ''}>Inactive</option>
          </select></label>
      </div>
      <label class="fld"><span>Types / Breakup (comma se alag — optional)</span>
        <input class="inp" id="prTypes" value="${esc(((p && p.types) || []).join(', '))}" placeholder="Junior Shoes, Sports Shoes, Man Shoes, CH Shoes"/>
        <div class="fld-hint">New Sales ke <b>Step 03</b> mein yeh types KG ke sath dikhte hain. Cashier wahin se bhi naya type add kar sakta hai.</div></label>
      <label class="fld"><span>Note (optional)</span><input class="inp" id="prNote" value="${esc(p ? p.note : '')}" placeholder="e.g. sirf heavy kapron ke liye"/></label>
      <div class="note-box info tiny">Billing rate sab items ke liye ek hi hai — <b>${fmtMoney(Biz.rate())} / KG</b> (Settings → Per KG Rate).</div>`;

    const w = openModal({
      title: p ? '✏️ Edit Product' : '➕ New Product', size: 'sm', body,
      footer: `<button class="btn btn-ghost" data-close="1">Cancel</button>
               <button class="btn btn-primary" id="prSave">💾 ${p ? 'Save' : 'Add Product'}</button>`,
      onMount: m => m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => setTimeout(() => resolve(null), 10)))
    });
    setTimeout(() => { const n = $('#prName', w); if (n) n.focus(); }, 120);

    $('#prSave', w).onclick = () => {
      const name = $('#prName', w).value.trim();
      if (!name) return toast('Item ka naam likhein', 'error');
      const rec = {
        id: p ? p.id : uid('prd'),
        name, category: (p && p.category) || '', inputType: 'kg',
        types: (function (v) {
          const out = [];
          String(v || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean).forEach(x => { if (out.indexOf(x) < 0) out.push(x); });
          return out;
        })($('#prTypes', w).value),
        active: $('#prActive', w).value === '1', note: $('#prNote', w).value,
        createdAt: p ? p.createdAt : new Date().toISOString()
      };
      DB.upsert('products', rec);
      DB.audit(p ? 'product-edit' : 'product', (p ? 'Product edit: ' : 'Naya product: ') + name);
      toast('✔ ' + name + ' ' + (p ? 'update' : 'add') + ' ho gaya', 'success');
      closeModal(w);
      resolve(rec);
      if (app.current === 'products') productsPaint();
    };
  });
}
