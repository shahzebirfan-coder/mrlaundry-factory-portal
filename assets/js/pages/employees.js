/* ============================================================
   EMPLOYEES & SALARY — factory staff
   ============================================================ */

function renderEmployees() {
  UI.renderLayout('employees', `<div id="empBody"></div>`);
  employeesPaint();
}

function employeesPaint() {
  const el = $('#empBody');
  if (!el) return;
  const emps = DB.all('employees').sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const salaries = DB.all('salaries');
  const mk = monthKey(todayISO());
  const paidThisMonth = round2(salaries.filter(s => monthKey(s.date) === mk).reduce((a, s) => a + num(s.amount), 0));
  const monthlyPayroll = round2(emps.filter(e => e.active !== false).reduce((a, e) => a + num(e.salary), 0));
  const paidIds = salaries.filter(s => s.month === mk).map(s => s.employeeId);

  el.innerHTML = `
    <div class="stats">
      ${UI.statCard({ icon: '👷', label: 'Active Employees', value: fmtNum(emps.filter(e => e.active !== false).length), tone: 'info' })}
      ${UI.statCard({ icon: '💼', label: 'Monthly Payroll', value: fmtMoney(monthlyPayroll), tone: 'purple' })}
      ${UI.statCard({ icon: '✅', label: 'Salary Paid — ' + monthLabel(mk), value: fmtMoney(paidThisMonth), foot: salaries.filter(s => s.month === mk).length + ' employees', tone: 'good' })}
      ${UI.statCard({ icon: '⏳', label: 'Pending — ' + monthLabel(mk), value: fmtNum(emps.filter(e => e.active !== false && paidIds.indexOf(e.id) < 0).length), foot: 'salary baqi', tone: 'warn' })}
    </div>

    <div class="card">
      <div class="card-head"><h3>👷 Employees</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" id="emExport">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" id="emNew">➕ New Employee</button></div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:860px">
          <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th class="t-right">Monthly Salary</th><th>Joined</th>
            <th class="t-center">Is mahine</th><th class="t-center">Status</th><th class="t-center">Actions</th></tr></thead>
          <tbody>${emps.length ? emps.map(e => {
    const paid = salaries.filter(s => s.employeeId === e.id);
    const totalPaid = round2(paid.reduce((a, s) => a + num(s.amount), 0));
    const isPaid = paidIds.indexOf(e.id) >= 0;
    return `<tr>
              <td class="t-strong">${esc(e.name)}<div class="tiny muted">${esc(e.code || '')} · total paid ${fmtMoney(totalPaid)}</div></td>
              <td>${esc(e.role || '')}</td>
              <td class="tiny">${esc(e.phone || '—')}</td>
              <td class="t-right"><b>${fmtMoney(e.salary)}</b></td>
              <td class="t-nowrap tiny">${e.joinDate ? fmtDate(e.joinDate) : '—'}</td>
              <td class="t-center">${isPaid ? '<span class="pill pill-ok">Paid ✔</span>' : '<span class="pill pill-warn">Pending</span>'}</td>
              <td class="t-center">${e.active === false ? '<span class="pill pill-muted">Inactive</span>' : '<span class="pill pill-info">Active</span>'}</td>
              <td class="t-center t-nowrap">
                <button class="btn btn-success btn-xs" data-sal="${e.id}">💵 Salary</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-eedit="${e.id}">✏️</button>
                <button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-edel="${e.id}">🗑️</button>
              </td>
            </tr>`;
  }).join('') : emptyRow(8, 'Koi employee nahi — “New Employee” se add karein', '👷')}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>💵 Salary Payment History</h3><div class="sp"></div>
        <button class="btn btn-ghost btn-sm" id="salExport">⬇️ CSV</button></div>
      <div class="tbl-wrap">
        <table class="tbl" style="min-width:820px">
          <thead><tr><th>Date</th><th>Employee</th><th>Month</th><th class="t-right">Salary</th><th class="t-right">Bonus</th>
            <th class="t-right">Deduction</th><th class="t-right">Paid</th><th>Mode</th><th>Note</th><th class="t-center">Actions</th></tr></thead>
          <tbody>${salaries.length ? salaries.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map(s => `<tr>
            <td class="t-nowrap">${fmtDate(s.date)}</td>
            <td class="t-strong">${esc(Biz.employeeName(s.employeeId))}</td>
            <td class="tiny">${monthLabel(s.month)}</td>
            <td class="t-right">${fmtMoney(s.salary)}</td>
            <td class="t-right t-ok">${s.bonus ? '+' + fmtMoney(s.bonus) : '—'}</td>
            <td class="t-right t-bad">${s.deduction ? '−' + fmtMoney(s.deduction) : '—'}</td>
            <td class="t-right"><b>${fmtMoney(s.amount)}</b></td>
            <td class="tiny">${esc(s.mode || '')}</td>
            <td class="tiny">${esc(s.note || '')}</td>
            <td class="t-center"><button class="icon-btn" style="width:28px;height:28px;font-size:11px" data-saldel="${s.id}">🗑️</button></td>
          </tr>`).join('') : emptyRow(10, 'Abhi koi salary pay nahi hui', '💤')}</tbody>
        </table>
      </div>
    </div>`;

  $('#emNew').onclick = () => employeeForm();
  $('#emExport').onclick = () => exportCSV('employees.csv', ['Code', 'Name', 'Role', 'Phone', 'Salary', 'Join Date', 'Active'],
    emps.map(e => [e.code, e.name, e.role, e.phone, e.salary, e.joinDate, e.active !== false]));
  $('#salExport').onclick = () => exportCSV('salary-payments.csv',
    ['Date', 'Employee', 'Month', 'Salary', 'Bonus', 'Deduction', 'Paid', 'Mode', 'Note'],
    salaries.map(s => [s.date, Biz.employeeName(s.employeeId), s.month, s.salary, s.bonus, s.deduction, s.amount, s.mode, s.note]));
  $$('[data-sal]', el).forEach(b => b.onclick = () => salaryForm(b.dataset.sal));
  $$('[data-eedit]', el).forEach(b => b.onclick = () => employeeForm(b.dataset.eedit));
  $$('[data-edel]', el).forEach(b => b.onclick = async () => {
    const e = DB.get('employees', b.dataset.edel);
    const yes = await confirmDialog('“' + e.name + '” delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('employees', e.id);
    DB.audit('employee-delete', 'Employee delete: ' + e.name);
    employeesPaint();
  });
  $$('[data-saldel]', el).forEach(b => b.onclick = async () => {
    const s = DB.get('salaries', b.dataset.saldel);
    const yes = await confirmDialog('Salary payment ' + fmtMoney(s.amount) + ' delete karein?', { danger: true, yes: 'Delete' });
    if (!yes) return;
    DB.remove('salaries', s.id);
    toast('Salary record delete ho gaya', 'warn');
    employeesPaint();
  });
}

function employeeForm(id) {
  const e = id ? DB.get('employees', id) : null;
  const body = `
    <div class="grid g2">
      <label class="fld"><span>Name <b class="req">*</b></span><input class="inp" id="efName" value="${esc(e ? e.name : '')}"/></label>
      <label class="fld"><span>Role / Kaam</span><input class="inp" id="efRole" value="${esc(e ? e.role : '')}" placeholder="Washing / Ironing / Packing / Driver"/></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Monthly Salary (Rs)</span><input type="number" step="1" class="inp" id="efSalary" value="${e ? e.salary : ''}"/></label>
      <label class="fld"><span>Phone</span><input class="inp" id="efPhone" value="${esc(e ? e.phone : '')}"/></label>
      <label class="fld"><span>Join Date</span><input type="date" class="inp" id="efJoin" value="${esc(e ? e.joinDate : todayISO())}"/></label>
    </div>
    <label class="fld"><span>Status</span>
      <select class="inp" id="efActive"><option value="1" ${!e || e.active !== false ? 'selected' : ''}>Active</option>
        <option value="0" ${e && e.active === false ? 'selected' : ''}>Inactive</option></select></label>
    <label class="fld"><span>Note</span><textarea class="inp" id="efNote">${esc(e ? e.note : '')}</textarea></label>`;
  const w = openModal({
    title: e ? '✏️ Edit Employee' : '➕ New Employee', size: 'sm', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="efSave">💾 Save</button>`
  });
  $('#efSave', w).onclick = () => {
    const name = $('#efName', w).value.trim();
    if (!name) return toast('Naam likhein', 'error');
    const rec = {
      id: e ? e.id : uid('emp'), code: e ? e.code : DB.nextNumber('employee'),
      name, role: $('#efRole', w).value, salary: round2($('#efSalary', w).value), phone: $('#efPhone', w).value,
      joinDate: $('#efJoin', w).value, active: $('#efActive', w).value === '1', note: $('#efNote', w).value,
      createdAt: e ? e.createdAt : new Date().toISOString()
    };
    DB.upsert('employees', rec);
    DB.audit(e ? 'employee-edit' : 'employee', (e ? 'Employee edit: ' : 'Naya employee: ') + name);
    toast('✔ Employee save ho gaya', 'success');
    closeModal(w);
    employeesPaint();
  };
}

function salaryForm(employeeId) {
  const e = DB.get('employees', employeeId);
  if (!e) return;
  const mk = monthKey(todayISO());
  const body = `
    <div class="note-box info tiny mb10"><b>${esc(e.name)}</b> · ${esc(e.role || '')} · Monthly salary <b>${fmtMoney(e.salary)}</b></div>
    <div class="grid g2">
      <label class="fld"><span>Payment Date</span><input type="date" class="inp" id="sfDate" value="${todayISO()}"/></label>
      <label class="fld"><span>Month</span>
        <select class="inp" id="sfMonth">${lastMonths(12).map(m => `<option value="${m}" ${m === mk ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}</select></label>
    </div>
    <div class="grid g3">
      <label class="fld"><span>Basic Salary</span><input type="number" step="1" class="inp" id="sfSalary" value="${num(e.salary)}"/></label>
      <label class="fld"><span>Bonus</span><input type="number" step="1" class="inp" id="sfBonus" value="0"/></label>
      <label class="fld"><span>Deduction / Advance</span><input type="number" step="1" class="inp" id="sfDed" value="0"/></label>
    </div>
    <div class="kv total"><span>Net Payable</span><b id="sfNet">${fmtMoney(e.salary)}</b></div>
    <div class="grid g2 mt10">
      <label class="fld"><span>Mode</span><select class="inp" id="sfMode">${['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa'].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="fld"><span>Note</span><input class="inp" id="sfNote" placeholder="optional"/></label>
    </div>`;
  const w = openModal({
    title: '💵 Pay Salary — ' + e.name, size: 'sm', body,
    footer: `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-success" id="sfSave">💾 Save Salary Payment</button>`
  });
  const net = () => round2(num($('#sfSalary', w).value) + num($('#sfBonus', w).value) - num($('#sfDed', w).value));
  ['sfSalary', 'sfBonus', 'sfDed'].forEach(id => { $('#' + id, w).oninput = () => { $('#sfNet', w).textContent = fmtMoney(net()); }; });
  $('#sfSave', w).onclick = () => {
    const amt = net();
    if (amt <= 0) return toast('Amount theek karein', 'error');
    const rec = {
      id: uid('sal'), no: DB.nextNumber('salary'), employeeId: e.id, employeeName: e.name,
      date: $('#sfDate', w).value || todayISO(), month: $('#sfMonth', w).value,
      salary: round2($('#sfSalary', w).value), bonus: round2($('#sfBonus', w).value), deduction: round2($('#sfDed', w).value),
      amount: amt, mode: $('#sfMode', w).value, note: $('#sfNote', w).value,
      createdBy: (DB.currentUser() || {}).name || '', createdAt: new Date().toISOString()
    };
    DB.upsert('salaries', rec);
    DB.audit('salary', 'Salary paid: ' + e.name + ' ' + fmtMoney(amt) + ' (' + monthLabel(rec.month) + ')', { ref: rec.no });
    toast('✔ Salary pay ho gayi — ' + fmtMoney(amt), 'success');
    closeModal(w);
    employeesPaint();
  };
}
