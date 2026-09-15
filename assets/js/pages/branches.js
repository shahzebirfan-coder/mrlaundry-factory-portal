/* ============================================================
   BRANCHES — factory / shop / unit
   ============================================================ */

function renderBranches() {
  UI.renderLayout('branches', `<div id="brBody"></div>`);
  branchesPaint();
}

function branchesPaint() {
  const el = $('#brBody');
  if (!el) return;
  const rows = DB.all('branches').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const stats = rows.map(b => {
    const sales = Biz.sales().filter(s => s.branchId === b.id);
    const exp = DB.all('expenses').filter(e => e.branchId === b.id);
    return {
      b, count: sales.length,
      kg: round1(sales.reduce((a, s) => a + Biz.saleKg(s), 0)),
      income: round2(sales.reduce((a, s) => a + Biz.saleAmount(s), 0)),
      inFactory: round1(sales.reduce((a, s) => a + Biz.pendingKg(s), 0)),
      expenses: round2(exp.reduce((a, e) => a + num(e.amount), 0))
    };
  });

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '🏢', label: 'Total Branches', value: fmtNum(rows.length), tone: 'info' })}
      ${UI.statCard({ icon: '✅', label: 'Active', value: fmtNum(rows.filter(b => b.isActive !== false).length), tone: 'good' })}
      ${UI.statCard({ icon: '⚖️', label: 'Total KG (all branches)', value: fmtKg(round1(stats.reduce((a, s) => a + s.kg, 0))), tone: 'purple' })}
      ${UI.statCard({ icon: '💰', label: 'Total Income', value: fmtMoney(round2(stats.reduce((a, s) => a + s.income, 0))), tone: 'good' })}
    </div>

    <div class="grid g3">
      ${stats.length ? stats.map(s => `
        <div class="card">
          <div class="card-head">
            <span class="cat-dot" style="background:${esc(s.b.color || '#4f7cff')}"></span>
            <h3>${esc(s.b.name)}</h3><div class="sp"></div>
            <span class="pill ${s.b.isActive === false ? 'pill-muted' : 'pill-ok'}">${s.b.isActive === false ? 'Inactive' : 'Active'}</span>
          </div>
          <div class="card-body">
            <div class="tiny muted mb10">${esc(titleCase(s.b.type || 'factory'))} · ${esc(s.b.phone || 'no phone')}<br>${esc(s.b.address || '')}</div>
            <div class="kv"><span>Entries</span><b>${fmtNum(s.count)}</b></div>
            <div class="kv"><span>Total KG received</span><b>${fmtKg(s.kg)}</b></div>
            <div class="kv"><span>In factory now</span><b class="t-warn">${fmtKg(s.inFactory)}</b></div>
            <div class="kv"><span>Income (billed)</span><b class="t-ok">${fmtMoney(s.income)}</b></div>
            <div class="kv"><span>Expenses</span><b class="t-bad">${fmtMoney(s.expenses)}</b></div>
            <div class="row mt10" style="gap:8px">
              <button class="btn btn-ghost btn-sm" data-bedit="${s.b.id}">✏️ Edit</button>
              <button class="btn btn-ghost btn-sm" data-bsales="${s.b.id}">🧾 Sales</button>
              <button class="btn btn-ghost btn-sm" data-bdel="${s.b.id}">🗑️</button>
            </div>
          </div>
        </div>`).join('') : `<div class="card"><div class="card-body"><div class="empty"><div class="empty-ico">🏢</div><div>Koi branch nahi</div></div></div></div>`}
    </div>

    <div class="card mt14"><div class="card-body row" style="justify-content:space-between">
      <div class="small dim">Factory ke sath shop ya doosri unit barh rahi ho to nayi branch add karein — sales aur expenses branch-wise track honge.</div>
      <button class="btn btn-primary btn-sm" id="bNew">➕ New Branch</button>
    </div></div>`;

  $('#bNew').onclick = () => branchForm();
  $$('[data-bedit]', el).forEach(b => b.onclick = () => branchForm(b.dataset.bedit));
  $$('[data-bsales]', el).forEach(b => b.onclick = () => { SalesUI.branch = b.dataset.bsales; app.go('sales'); });
  $$('[data-bdel]', el).forEach(b => b.onclick = async () => {
    const br = DB.get('branches', b.dataset.bdel);
    const used = Biz.sales().filter(s => s.branchId === br.id).length + DB.all('expenses').filter(e => e.branchId === br.id).length;
    if (used) return toast('Yeh branch ' + used + ' records mein use ho rahi hai — delete nahi ho sakti. Inactive kar dein.', 'error', 4500);
    const yes = await confirmDialog('Branch “' + br.name + '” delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('branches', br.id);
    branchesPaint();
  });
}

function branchForm(id) {
  const b = id ? DB.get('branches', id) : null;
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Branch Name <b class="req">*</b></span><input class="inp" id="bfName" value="${esc(b ? b.name : '')}" placeholder="e.g. Main Factory"/></label>
      <label class="fld"><span>Type</span>
        <select class="inp" id="bfType">${['factory', 'shop', 'unit', 'warehouse', 'office'].map(t => `<option ${b && b.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    </div>
    <div class="grid g2">
      <label class="fld"><span>Phone</span><input class="inp" id="bfPhone" value="${esc(b ? b.phone : '')}"/></label>
      <label class="fld"><span>Colour</span><input type="color" class="inp" id="bfColor" value="${esc(b && b.color ? b.color : '#4f7cff')}" style="height:42px;padding:4px"/></label>
    </div>
    <label class="fld"><span>Address</span><input class="inp" id="bfAddr" value="${esc(b ? b.address : '')}"/></label>
    <label class="fld"><span>Status</span>
      <select class="inp" id="bfActive"><option value="1" ${!b || b.isActive !== false ? 'selected' : ''}>Active</option>
        <option value="0" ${b && b.isActive === false ? 'selected' : ''}>Inactive</option></select></label>`;
  const w = openModal({
    title: b ? '✏️ Edit Branch' : '➕ New Branch', size: 'sm', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="bfSave">💾 Save</button>`
  });
  $('#bfSave', w).onclick = () => {
    const name = $('#bfName', w).value.trim();
    if (!name) return toast('Branch ka naam likhein', 'error');
    const rec = {
      id: b ? b.id : uid('br'), name, type: $('#bfType', w).value, phone: $('#bfPhone', w).value,
      color: $('#bfColor', w).value, address: $('#bfAddr', w).value,
      isActive: $('#bfActive', w).value === '1', createdAt: b ? b.createdAt : new Date().toISOString()
    };
    DB.upsert('branches', rec);
    DB.audit(b ? 'branch-edit' : 'branch', (b ? 'Branch edit: ' : 'Nayi branch: ') + name);
    toast('✔ Branch save ho gayi', 'success');
    closeModal(w);
    branchesPaint();
  };
}
