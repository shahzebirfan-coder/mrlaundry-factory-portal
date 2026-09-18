/* ============================================================
   MR LAUNDRY FACTORY PORTAL — APP ROUTER + BOOT
   ============================================================ */

const app = {
  current: '',

  go(page) {
    const user = DB.currentUser();
    if (page !== 'login' && !user) { this.current = 'login'; return renderLogin(); }

    // "page?key=value" support
    let param = null;
    if (page && page.indexOf('?') >= 0) {
      const parts = page.split('?');
      page = parts[0];
      param = {};
      new URLSearchParams(parts[1]).forEach((v, k) => param[k] = v);
    }

    if (page !== 'login' && !DB.can(page)) {
      toast('Aap ko is page ki permission nahi hai', 'error');
      const allowed = NAV.filter(n => n.id && DB.can(n.id)).map(n => n.id);
      page = allowed.indexOf('dashboard') >= 0 ? 'dashboard' : (allowed[0] || 'login');
    }

    this.current = page;
    try { location.hash = page; } catch (e) {}
    UI.sidebarOpen = false;

    switch (page) {
      case 'login': return renderLogin();
      case 'dashboard': return renderDashboard();
      case 'newsales': return renderNewSales(param);
      case 'sales': return renderSales(param);
      case 'delivery': return renderDelivery();
      case 'customers': return renderCustomers(param);
      case 'ledger': return renderLedger(param);
      case 'products': return renderProducts();
      case 'expenses': return renderExpenses();
      case 'purchases': return renderPurchases();
      case 'vendorlist': return renderVendors();
      case 'employees': return renderEmployees();
      case 'drawings': return renderDrawings();
      case 'branches': return renderBranches();
      case 'reports': return renderReports();
      case 'users': return renderUsers();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  }
};

/* ---------- BOOT ---------- */
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.theme = UI.theme();
  DB.load();
  const boot = Cloud.init();              // config + pehla sync (background)
  const hash = (location.hash || '').replace('#', '');
  const start = (hash && hash !== 'login') ? hash : null;
  const u = DB.currentUser();
  if (u) app.go(start && DB.can(start) ? start : 'dashboard');
  else renderLogin();
  /* naye system par: cloud se data aane ke baad screen khud refresh */
  if (boot && boot.then) boot.then(() => { if (DB.currentUser()) app.go(app.current || 'dashboard'); else renderLogin(); }).catch(() => {});
});

window.addEventListener('hashchange', () => {
  const h = (location.hash || '').replace('#', '');
  if (h && h !== app.current && DB.currentUser()) app.go(h);
});

/* keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); if (DB.can('newsales')) app.go('newsales'); }
  if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); if (DB.can('dashboard')) app.go('dashboard'); }
  if (e.key === 'Escape') { if (app.current === 'newsales') app.go('sales'); }
});
