/* ============================================================
   PRODUCTS — wash items (New Sales mein yeh list click hoti hai)
   ============================================================ */

const ProdUI = { cat: 'all', q: '', showInactive: false };

function renderProducts() {
  UI.renderLayout('products', `<div id="prodBody"></div>`);
  productsPaint();
}

function productsPaint() {
  const el = $('#prodBody');
  if (!el) return;
  const cats = Biz.categories();
  let rows = DB.all('products').filter(p => ProdUI.showInactive || p.active !== false);
  if (ProdUI.cat !== 'all') rows = rows.filter(p => p.category === ProdUI.cat);
  const q = ProdUI.q.trim().toLowerCase();
  if (q) rows = rows.filter(p => (p.name || '').toLowerCase().includes(q));
  rows.sort((a, b) => String(a.category).localeCompare(String(b.category)) || String(a.name).localeCompare(String(b.name)));

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
      ${cats.map(c => UI.statCard({
    icon: '🏷️', label: esc(c.label), value: fmtNum(rows.filter(p => p.category === c.key).length),
    tone: 'purple', foot: 'Rate ' + fmtMoney(Biz.rate()) + '/kg'
  })).join('')}
    </div>

    <div class="card">
      <div class="card-head">
        <h3>🧺 Product List — New Sales mein yahi items click hote hain</h3><div class="sp"></div>
        <button class="btn btn-warn btn-sm" id="pRateBtn" title="Per KG rate edit karein">⚖️ Rate: ${fmtMoney(Biz.rate())}/kg ✏️ Edit</button>
        <select class="inp inp-sm" id="pCat" style="width:150px">
          <option value="all" ${ProdUI.cat === 'all' ? 'selected' : ''}>All categories</option>
          ${cats.map(c => `<option value="${c.key}" ${ProdUI.cat === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
        </select>
        <input class="inp inp-sm" id="pSearch" placeholder="🔍 Item ka naam" value="${esc(ProdUI.q)}" style="width:190px"/>
        <label class="row small dim" style="gap:6px;font-weight:700"><input type="checkbox" id="pInact" ${ProdUI.showInactive ? 'checked' : ''}/> Inactive bhi</label>
        <button class="btn btn-ghost btn-sm" id="pExport">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" id="pNew">➕ New Product</button>
      </div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:820px">
          <thead><tr>
            <th>Item Name</th><th>Category</th><th class="t-center">Input</th><th class="t-right">Rate</th>
            <th class="t-right">Wash KG (all time)</th><th class="t-center">Times Used</th><th class="t-center">Status</th>
            <th class="t-center">Actions</th>
          </tr></thead>
          <tbody>${rows.length ? rows.map(p => `<tr>
            <td class="t-strong">${esc(p.name)}${p.note ? '<div class="tiny muted">' + esc(p.note) + '</div>' : ''}</td>
            <td><span class="tag" style="background:${Biz.catColor(p.category)}22;color:${Biz.catColor(p.category)}">${esc(p.category)} Category</span></td>
            <td class="t-center tiny">${esc(p.inputType || 'kg') === 'kg' ? '⚖️ KG' : '🔢 Pcs'}</td>
            <td class="t-right">${fmtMoney(Biz.rate())}</td>
            <td class="t-right">${fmtKg((usage[p.id] || {}).kg || 0)}</td>
            <td class="t-center">${fmtNum((usage[p.id] || {}).count || 0)}</td>
            <td class="t-center">${p.active === false ? '<span class="pill pill-muted">Inactive</span>' : '<span class="pill pill-ok">Active</span>'}</td>
            <td class="t-center t-nowrap">
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pedit="${p.id}" title="Edit">✏️</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-ptoggle="${p.id}" title="Active/Inactive">${p.active === false ? '✅' : '🚫'}</button>
              <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-pdel="${p.id}" title="Delete">🗑️</button>
            </td>
          </tr>`).join('') : emptyRow(8, 'Koi product nahi — “New Product” se add karein', '🧺')}</tbody>
        </table>
      </div>
    </div>

    <div class="card"><div class="card-body">
      <div class="note-box info tiny">
        <b>Kaise kaam karta hai:</b> New Sales page par har category (A/B/C) mein in items ke chips dikhte hain.
        Cashier item par click karta hai aur KG enter karke “Add to Slip” dabata hai — item invoice mein aa jata hai.
        Billing sab ka <b>ek hi rate</b> (${fmtMoney(Biz.rate())} per KG) hota hai, jo Settings se change karein.
      </div>
    </div></div>`;

  const sc = $('#pCat'); if (sc) sc.onchange = e => { ProdUI.cat = e.target.value; productsPaint(); };
  const sq = $('#pSearch'); if (sq) sq.oninput = debounce(e => { ProdUI.q = e.target.value; productsPaint(); }, 250);
  const si = $('#pInact'); if (si) si.onchange = e => { ProdUI.showInactive = e.target.checked; productsPaint(); };
  const rb = $('#pRateBtn'); if (rb) rb.onclick = () => openRateForm();
  $('#pNew').onclick = () => productForm();
  $('#pExport').onclick = () => exportCSV('products.csv', ['Name', 'Category', 'Input', 'Rate', 'Total KG', 'Times Used', 'Active'],
    rows.map(p => [p.name, p.category, p.inputType, Biz.rate(), (usage[p.id] || {}).kg || 0, (usage[p.id] || {}).count || 0, p.active !== false]));

  $$('[data-pedit]', el).forEach(b => b.onclick = () => productForm(b.dataset.pedit));
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

/* productForm(existingIdOrProduct, defaultCategory) → Promise<product|null> */
function productForm(idOrProd, defCat) {
  return new Promise(resolve => {
    const p = (idOrProd && typeof idOrProd === 'object') ? idOrProd : (idOrProd ? DB.get('products', idOrProd) : null);
    const cats = Biz.categories();
    const body = `
      <div class="grid g2">
        <label class="fld"><span>Item Name <b class="req">*</b></span>
          <input class="inp" id="prName" value="${esc(p ? p.name : '')}" placeholder="e.g. Wash & Fold / Bedsheet Wash"/></label>
        <label class="fld"><span>Category <b class="req">*</b></span>
          <select class="inp" id="prCat">${cats.map(c => `<option value="${c.key}" ${((p ? p.category : defCat) === c.key) ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
      </div>
      <div class="grid g2">
        <label class="fld"><span>Input Type</span>
          <select class="inp" id="prInput">
            <option value="kg" ${!p || p.inputType !== 'pcs' ? 'selected' : ''}>KG (weight se)</option>
            <option value="pcs" ${p && p.inputType === 'pcs' ? 'selected' : ''}>Pieces</option>
          </select></label>
        <label class="fld"><span>Status</span>
          <select class="inp" id="prActive">
            <option value="1" ${!p || p.active !== false ? 'selected' : ''}>Active (New Sales mein dikhega)</option>
            <option value="0" ${p && p.active === false ? 'selected' : ''}>Inactive</option>
          </select></label>
      </div>
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
        name, category: $('#prCat', w).value, inputType: $('#prInput', w).value,
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
