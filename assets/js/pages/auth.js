/* ============================================================
   LOGIN PAGE
   ============================================================ */

function renderLogin() {
  const s = DB.settings();
  const users = DB.all('users');
  $('#app').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <img src="${esc(s.logoImage || 'assets/img/logo.jpeg')}" alt="logo"/>
        <h1>${esc(s.shopName || 'Mr Laundry Factory')}</h1>
        <p class="tag">${esc(s.tagline || 'Factory Portal — Per KG Wash Business')}</p>
        <label class="fld" style="text-align:left">
          <span>Username</span>
          <input class="inp" id="lgUser" placeholder="owner" autocomplete="username"/>
        </label>
        <label class="fld" style="text-align:left">
          <span>Password</span>
          <input class="inp" id="lgPass" type="password" placeholder="••••••••" autocomplete="current-password"/>
        </label>
        <div class="row" style="justify-content:space-between;margin:-4px 0 14px">
          <label class="row tiny dim" style="gap:6px"><input type="checkbox" id="lgShow"/> Show password</label>
          <span class="tiny muted">${users.length} user${users.length === 1 ? '' : 's'} registered</span>
        </div>
        <button class="btn btn-primary btn-lg btn-block" id="lgBtn">🔓 Login to Portal</button>
        <div class="login-hint">
          <b>Default logins:</b><br>
          Owner → <b>owner</b> / <b>owner123</b><br>
          Manager → <b>manager</b> / <b>manager123</b><br>
          Cashier → <b>cashier</b> / <b>cashier123</b><br>
          <span style="opacity:.8">Pehli baar login karke <b>Users</b> tab se passwords zaroor badal dein.</span>
        </div>
        <div class="row" style="justify-content:center;margin-top:14px">
          <span class="tiny muted">Cloud: ${Cloud.statusLabel()}</span>
        </div>
      </div>
    </div>`;

  const user = $('#lgUser'), pass = $('#lgPass');
  const doLogin = () => {
    const r = DB.login(user.value, pass.value);
    if (!r.ok) { toast(r.msg, 'error'); pass.select(); return; }
    toast('Welcome, ' + r.user.name + '!', 'success');
    app.current = '';
    app.go('dashboard');
  };
  $('#lgBtn').onclick = doLogin;
  $('#lgShow').onchange = e => { pass.type = e.target.checked ? 'text' : 'password'; };
  user.onkeydown = e => { if (e.key === 'Enter') pass.focus(); };
  pass.onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  setTimeout(() => user.focus(), 100);
}
