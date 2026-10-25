/* ============================================================
   LOGIN PAGE — Mr Laundry Factory Portal
   Matches CelineSoft / Factory Portal modern split design
   ============================================================ */

function renderLogin() {
  const s = DB.settings();
  const users = DB.all('users');
  const userCount = users.length;
  const cloudText = typeof Cloud !== 'undefined' ? Cloud.statusLabel() : 'Cloud sync OFF (data stored locally)';

  $('#app').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <!-- Left Panel: Industrial Factory & Brand -->
        <div class="login-left-panel">
          <div class="login-brand-top">
            <div class="login-brand-header-row">
              <div class="login-brand-icon-wrap">
                <img src="assets/img/mr-laundry-logo-clean.png" alt="Mr Laundry Factory" class="login-brand-icon" />
              </div>
              <h2 class="login-brand-name">${esc(s.shopName || 'Mr Laundry Factory')}</h2>
            </div>
            <div class="login-brand-divider"></div>
            <p class="login-brand-tagline">Professional Laundry Management System</p>
          </div>

          <div class="login-brand-bottom">
            <span class="login-designed-by">Designed by</span>
            <div class="celinesoft-brand-row">
              <img src="assets/img/celinesoft-logo-clean.png" alt="CelineSoft" class="celinesoft-icon" />
              <div class="celinesoft-info">
                <h3 class="celinesoft-title">CelineSoft</h3>
                <p class="celinesoft-slogan">Empowering Businesses with Smart Code</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Sign In Form -->
        <div class="login-right-panel">
          <div class="login-form-content">
            <div class="login-form-head">
              <h1 class="login-welcome-title">Welcome Back</h1>
              <p class="login-welcome-sub">Please sign in to your account to continue</p>
            </div>

            <form id="loginForm" onsubmit="return false;" class="login-form-body">
              <div class="login-field-group">
                <label class="login-field-label" for="lgUser">USERNAME</label>
                <input class="login-input-box" id="lgUser" value="owner" placeholder="owner" autocomplete="username" spellcheck="false" required />
              </div>

              <div class="login-field-group">
                <label class="login-field-label" for="lgPass">PASSWORD</label>
                <div class="login-pass-container">
                  <input class="login-input-box login-pass-input" id="lgPass" type="password" value="owner123" placeholder="••••••••" autocomplete="current-password" required />
                  <button type="button" class="login-toggle-eye" id="lgEyeBtn" title="Show password" aria-label="Toggle password visibility">
                    <svg class="eye-icon eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg class="eye-icon eye-closed" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="login-meta-row">
                <label class="login-checkbox-label">
                  <input type="checkbox" id="lgShow" />
                  <span>Show password</span>
                </label>
                <span class="login-users-count">${userCount} user${userCount === 1 ? '' : 's'} registered</span>
              </div>

              <button type="submit" class="login-submit-btn" id="lgBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Sign in to Portal</span>
              </button>

              <div class="login-default-hint">
                <details>
                  <summary>Default login credentials (click to view)</summary>
                  <div class="login-hint-table">
                    <div><span>Owner:</span> <b>owner</b> / <b>owner123</b></div>
                    <div><span>Manager:</span> <b>manager</b> / <b>manager123</b></div>
                    <div><span>Cashier:</span> <b>cashier</b> / <b>cashier123</b></div>
                  </div>
                </details>
              </div>
            </form>
          </div>

          <!-- Bottom Cloud Sync Status -->
          <div class="login-footer-bar">
            <svg class="login-cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
            <span class="login-cloud-text">Cloud: ${cloudText}</span>
          </div>
        </div>
      </div>
    </div>`;

  const user = $('#lgUser'), pass = $('#lgPass');
  const showCb = $('#lgShow'), eyeBtn = $('#lgEyeBtn');
  const eyeOpen = eyeBtn.querySelector('.eye-open');
  const eyeClosed = eyeBtn.querySelector('.eye-closed');

  const setPassVisible = (visible) => {
    pass.type = visible ? 'text' : 'password';
    showCb.checked = visible;
    if (visible) {
      eyeOpen.style.display = 'none';
      eyeClosed.style.display = 'block';
      eyeBtn.title = 'Hide password';
    } else {
      eyeOpen.style.display = 'block';
      eyeClosed.style.display = 'none';
      eyeBtn.title = 'Show password';
    }
  };

  eyeBtn.onclick = () => setPassVisible(pass.type === 'password');
  showCb.onchange = (e) => setPassVisible(e.target.checked);

  const doLogin = () => {
    const r = DB.login(user.value.trim(), pass.value);
    if (!r.ok) { toast(r.msg, 'error'); pass.select(); return; }
    toast('Welcome, ' + r.user.name + '!', 'success');
    app.current = '';
    app.go('dashboard');
    if (typeof Cloud !== 'undefined') Cloud.onLogin();
  };

  $('#lgBtn').onclick = doLogin;
  user.onkeydown = e => { if (e.key === 'Enter') pass.focus(); };
  pass.onkeydown = e => { if (e.key === 'Enter') doLogin(); };

  setTimeout(() => {
    if (user.value) pass.focus();
    else user.focus();
  }, 100);
}
