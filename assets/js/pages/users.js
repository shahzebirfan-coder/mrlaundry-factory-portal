/* ============================================================
   USERS — staff logins, roles & permissions + audit log
   ============================================================ */

let UserUI = { tab: 'list' };

function renderUsers() {
  UI.renderLayout('users', `<div id="usrBody"></div>`);
  usersPaint();
}

const PERM_GROUPS = [
  { g: 'Operations', ids: ['dashboard', 'newsales', 'sales', 'delivery'] },
  { g: 'Clients & Money', ids: ['customers', 'ledger'] },
  { g: 'Business', ids: ['products', 'expenses', 'purchases', 'vendorlist', 'employees', 'drawings', 'branches'] },
  { g: 'Admin', ids: ['reports', 'users', 'settings'] }
];

function usersPaint() {
  const el = $('#usrBody');
  if (!el) return;
  const users = DB.all('users').sort((a, b) => String(a.role).localeCompare(String(b.role)));
  const me = DB.currentUser();
  const log = DB.all('auditLog').slice(0, 200);

  el.innerHTML = `
    <div class="tabs" id="uTabs">
      <button class="tab ${UserUI.tab === 'list' ? 'on' : ''}" data-ut="list">🔐 Users (${users.length})</button>
      <button class="tab ${UserUI.tab === 'log' ? 'on' : ''}" data-ut="log">📜 Activity Log (${DB.all('auditLog').length})</button>
    </div>
    <div id="uPane"></div>`;

  $$('[data-ut]', el).forEach(b => b.onclick = () => { UserUI.tab = b.dataset.ut; usersPaint(); });
  const pane = $('#uPane');

  if (UserUI.tab === 'list') {
    pane.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>🔐 Staff Accounts</h3><div class="sp"></div>
          <button class="btn btn-primary btn-sm" id="uNew">➕ New User</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:880px">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Permissions</th><th class="t-center">Status</th>
              <th>Created</th><th class="t-center">Actions</th></tr></thead>
            <tbody>${users.map(u => `<tr>
              <td class="t-strong">${esc(u.name)} ${me && me.id === u.id ? '<span class="pill pill-info">You</span>' : ''}</td>
              <td class="mono">${esc(u.username)}</td>
              <td><span class="tag">${esc(titleCase(u.role))}</span></td>
              <td class="tiny">${DB.isOwner(u) ? 'Sab pages (full access)' : (u.permissions || []).map(p => esc(friendlyPage(p))).join(', ') || '—'}</td>
              <td class="t-center">${u.active === false ? '<span class="pill pill-muted">Inactive</span>' : '<span class="pill pill-ok">Active</span>'}</td>
              <td class="tiny t-nowrap">${fmtDate(u.createdAt)}</td>
              <td class="t-center t-nowrap">
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-uedit="${u.id}" title="Edit">✏️</button>
                ${me && me.id === u.id ? '' : `<button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-udel="${u.id}" title="Delete">🗑️</button>`}
              </td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="card"><div class="card-body">
        <div class="grid g3">
          <div class="note-box info tiny"><b>👑 Owner</b><br>Sab kuch — settings, users, reports, cloud, backup.</div>
          <div class="note-box tiny"><b>🧑‍💼 Manager</b><br>Operations + business pages, lekin users/settings nahi. Permissions custom set kar sakte hain.</div>
          <div class="note-box tiny"><b>🧾 Cashier</b><br>Sirf New Sales, Sales, Customers, Ledger — daily entry ke liye.</div>
        </div>
      </div></div>`;
    $('#uNew').onclick = () => userForm();
    $$('[data-uedit]', pane).forEach(b => b.onclick = () => userForm(b.dataset.uedit));
    $$('[data-udel]', pane).forEach(b => b.onclick = async () => {
      const u = DB.get('users', b.dataset.udel);
      const yes = await confirmDialog('“' + u.name + '” ka account delete karein?', { danger: true, yes: 'Delete' });
      if (!yes) return;
      DB.remove('users', u.id);
      DB.audit('user-delete', 'User delete: ' + u.name);
      toast('User delete ho gaya', 'warn');
      usersPaint();
    });
  } else {
    pane.innerHTML = `
      <div class="card">
        <div class="card-head"><h3>📜 Activity Log (latest 200)</h3><div class="sp"></div>
          <button class="btn btn-ghost btn-sm" id="logCsv">⬇️ CSV</button>
          <button class="btn btn-ghost btn-sm" id="logClear">🗑️ Clear</button></div>
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:760px">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th><th>Ref</th></tr></thead>
            <tbody>${log.length ? log.map(l => `<tr>
              <td class="tiny t-nowrap">${new Date(l.at).toLocaleString()}</td>
              <td class="tiny">${esc(l.userName || '')}</td>
              <td><span class="tag">${esc(l.action || '')}</span></td>
              <td class="tiny">${esc(l.detail || '')}</td>
              <td class="tiny">${esc(l.ref || '')}</td>
            </tr>`).join('') : emptyRow(5, 'Koi activity nahi', '📜')}</tbody>
          </table>
        </div>
      </div>`;
    $('#logCsv').onclick = () => exportCSV('activity-log.csv', ['When', 'User', 'Action', 'Detail', 'Ref'],
      log.map(l => [new Date(l.at).toLocaleString(), l.userName, l.action, l.detail, l.ref]));
    $('#logClear').onclick = async () => {
      const yes = await confirmDialog('Poora activity log clear karein?', { danger: true, yes: 'Clear log' });
      if (!yes) return;
      DB._data.auditLog = [];
      DB.save();
      usersPaint();
    };
  }
}

function friendlyPage(id) { const n = NAV.find(x => x.id === id); return n ? n.label : id; }

function userForm(id) {
  const u = id ? DB.get('users', id) : null;
  const isOwnerUser = u && DB.isOwner(u);
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Full Name <b class="req">*</b></span><input class="inp" id="ufName" value="${esc(u ? u.name : '')}"/></label>
      <label class="fld"><span>Role</span>
        <select class="inp" id="ufRole" ${isOwnerUser ? 'disabled' : ''}>
          <option value="cashier" ${u && u.role === 'cashier' ? 'selected' : ''}>Cashier</option>
          <option value="manager" ${u && u.role === 'manager' ? 'selected' : ''}>Manager</option>
          <option value="owner" ${!u || (u && u.role === 'owner') ? 'selected' : ''}>Owner (full access)</option>
        </select></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Username <b class="req">*</b></span><input class="inp" id="ufUser" value="${esc(u ? u.username : '')}" autocomplete="off"/></label>
      <label class="fld"><span>Password <b class="req">*</b></span><input class="inp" id="ufPass" value="${esc(u ? u.password : '')}" autocomplete="new-password"/></label>
      <label class="fld"><span>Phone</span><input class="inp" id="ufPhone" value="${esc(u ? u.phone : '')}"/></label>
    </div>
    <label class="fld"><span>Status</span>
      <select class="inp" id="ufActive"><option value="1" ${!u || u.active !== false ? 'selected' : ''}>Active</option>
        <option value="0" ${u && u.active === false ? 'selected' : ''}>Inactive</option></select></label>
    <div class="fld"><span>Permissions (Owner ke liye zaroori nahi)</span>
      ${PERM_GROUPS.map(gr => `<div class="note-box tiny mb6">
        <b>${gr.g}</b><div class="row" style="gap:12px;margin-top:6px">
          ${gr.ids.map(pid => `<label class="row tiny" style="gap:5px;font-weight:700">
            <input type="checkbox" data-perm="${pid}" ${u && (u.permissions || []).indexOf(pid) >= 0 ? 'checked' : ''}/> ${esc(friendlyPage(pid))}</label>`).join('')}
        </div></div>`).join('')}
    </div>`;

  const w = openModal({
    title: u ? '✏️ Edit User' : '➕ New User', size: 'lg', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="ufSave">💾 Save</button>`
  });
  $('#ufSave', w).onclick = () => {
    const name = $('#ufName', w).value.trim();
    const username = $('#ufUser', w).value.trim().toLowerCase();
    const pass = $('#ufPass', w).value;
    if (!name || !username || !pass) return toast('Name, username aur password zaroori hain', 'error');
    const dup = DB.all('users').find(x => x.username.toLowerCase() === username && (!u || x.id !== u.id));
    if (dup) return toast('Yeh username pehle se maujood hai', 'error');
    const perms = $$('[data-perm]', w).filter(c => c.checked).map(c => c.dataset.perm);
    const rec = {
      id: u ? u.id : uid('u'), name, username, password: pass,
      role: u ? (u.role === 'owner' ? 'owner' : $('#ufRole', w).value) : $('#ufRole', w).value,
      phone: $('#ufPhone', w).value, active: $('#ufActive', w).value === '1',
      permissions: perms, createdAt: u ? u.createdAt : new Date().toISOString()
    };
    DB.upsert('users', rec);
    DB.audit(u ? 'user-edit' : 'user', (u ? 'User edit: ' : 'Naya user: ') + name + ' (' + rec.role + ')');
    toast('✔ User save ho gaya', 'success');
    closeModal(w);
    usersPaint();
  };
}
