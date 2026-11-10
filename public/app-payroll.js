/**
 * Z-Books Standalone Payroll Engine Client Script
 * Implements 2025/2026 SSS, PhilHealth, HDMF, TRAIN WTax & Plant Punctuality
 */

const EMPLOYEES = [
  { id: 'emp-001', name: 'Rogelio Santos', role: 'Baker', cc: 'IND-PLANT', daily_rate: 650, monthly: 16900 },
  { id: 'emp-002', name: 'Danilo Mendoza', role: 'Slicer', cc: 'IND-PLANT', daily_rate: 550, monthly: 14300 },
  { id: 'emp-003', name: 'Elena Bautista', role: 'Wrapper', cc: 'IND-PLANT', daily_rate: 550, monthly: 14300 },
  { id: 'emp-004', name: 'Carlos Alcantara', role: 'Delivery Driver', cc: 'LOG-DELIV', daily_rate: 600, monthly: 15600 },
  { id: 'emp-005', name: 'Maria Villanueva', role: 'Store Supervisor', cc: 'SAS-BRANCH', daily_rate: 700, monthly: 18200 },
  { id: 'emp-006', name: 'Jasmine Tan', role: 'Accountant', cc: 'ADM-HQ', daily_rate: 950, monthly: 24700 }
];

let timekeeping = {
  'emp-001': { days: 13, ot: 8, tardy: 0 },
  'emp-002': { days: 13, ot: 5, tardy: 18 },
  'emp-003': { days: 13, ot: 2, tardy: 0 },
  'emp-004': { days: 13, ot: 4, tardy: 0 },
  'emp-005': { days: 13, ot: 0, tardy: 0 },
  'emp-006': { days: 13, ot: 0, tardy: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
  renderPayroll();

  document.getElementById('postPayrollGlBtn').addEventListener('click', handlePostPayrollToGl);
});

function computeItem(emp, tk) {
  const daily = emp.daily_rate;
  const basic = Math.round(tk.days * daily * 100) / 100;
  const hourly = daily / 8;
  const ot = Math.round(tk.ot * (hourly * 1.25) * 100) / 100;

  // Plant Grace Period Rule
  let tardyDed = 0;
  if (tk.tardy > 5) {
    const minRate = hourly / 60;
    tardyDed = Math.round(tk.tardy * minRate * 100) / 100;
  }

  const isDirect = ['Baker', 'Slicer', 'Wrapper'].includes(emp.role);
  const bonus = (tk.tardy === 0 && tk.days >= 13) ? (isDirect ? 1000 : 750) : 0;
  const gross = Math.max(0, Math.round((basic + ot + bonus - tardyDed) * 100) / 100);

  // SSS Semi-Monthly (4.5% EE / 9.5% ER)
  const msc = Math.min(20000, Math.max(5000, Math.round(emp.monthly / 500) * 500));
  const sssEe = Math.round(((msc * 0.045) / 2) * 100) / 100;
  const sssEr = Math.round(((msc * 0.095) / 2) * 100) / 100;

  // PhilHealth (5% split evenly)
  const phicMonthly = Math.round(Math.min(100000, Math.max(10000, emp.monthly)) * 0.05 * 100) / 100;
  const phicEe = Math.round(((phicMonthly / 2) / 2) * 100) / 100;
  const phicEr = phicEe;

  // Pag-IBIG HDMF (₱200 cap/month, ₱100 semi-monthly)
  const hdmfEe = Math.min(100, Math.round(((emp.monthly * 0.02) / 2) * 100) / 100);
  const hdmfEr = hdmfEe;

  const totalStatEe = sssEe + phicEe + hdmfEe;
  const taxableComp = Math.max(0, gross - totalStatEe);

  // TRAIN Law Semi-Monthly WTax Table
  let wtax = 0;
  if (taxableComp > 10417 && taxableComp <= 16667) {
    wtax = Math.round((taxableComp - 10417) * 0.15 * 100) / 100;
  } else if (taxableComp > 16667 && taxableComp <= 33333) {
    wtax = Math.round((937.50 + (taxableComp - 16667) * 0.20) * 100) / 100;
  }

  const totalDed = Math.round((totalStatEe + wtax) * 100) / 100;
  const net = Math.round((gross - totalDed) * 100) / 100;

  return {
    emp,
    basic,
    ot,
    bonus,
    tardyDed,
    gross,
    sssEe,
    sssEr,
    phicEe,
    phicEr,
    hdmfEe,
    hdmfEr,
    wtax,
    totalDed,
    net,
    erTotal: sssEr + phicEr + hdmfEr
  };
}

function renderPayroll() {
  const tbody = document.getElementById('payrollTbody');
  tbody.innerHTML = '';

  let totalGross = 0;
  let totalDeductions = 0;
  let totalEmployer = 0;
  let totalNet = 0;

  EMPLOYEES.forEach(emp => {
    const tk = timekeeping[emp.id] || { days: 13, ot: 0, tardy: 0 };
    const item = computeItem(emp, tk);

    totalGross += item.gross;
    totalDeductions += item.totalDed;
    totalEmployer += item.erTotal;
    totalNet += item.net;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40';

    tr.innerHTML = `
      <td class="py-2.5 px-3">
        <div class="font-medium text-white">${emp.name}</div>
        <div class="text-[10px] text-slate-400 font-mono">${emp.cc}</div>
      </td>
      <td class="py-2.5 px-2">
        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">${emp.role}</span>
      </td>
      <td class="py-2.5 px-2 text-right font-mono text-slate-300">₱${emp.daily_rate}</td>
      <td class="py-2.5 px-2 text-center">
        <input type="number" min="0" max="16" step="0.5" value="${tk.days}" data-empid="${emp.id}" data-field="days" class="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center text-white text-xs font-mono focus:outline-none focus:border-amber-500">
      </td>
      <td class="py-2.5 px-2 text-center">
        <input type="number" min="0" max="40" value="${tk.ot}" data-empid="${emp.id}" data-field="ot" class="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center text-white text-xs font-mono focus:outline-none focus:border-amber-500">
      </td>
      <td class="py-2.5 px-2 text-center">
        <input type="number" min="0" max="300" value="${tk.tardy}" data-empid="${emp.id}" data-field="tardy" class="w-14 bg-slate-800 border rounded px-1.5 py-1 text-center text-xs font-mono focus:outline-none ${tk.tardy > 5 ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-white'}">
      </td>
      <td class="py-2.5 px-3 text-right font-mono font-medium text-white">
        ₱${item.gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </td>
      <td class="py-2.5 px-2 text-right font-mono text-rose-400">₱${item.sssEe.toFixed(2)}</td>
      <td class="py-2.5 px-2 text-right font-mono text-rose-400">₱${item.phicEe.toFixed(2)}</td>
      <td class="py-2.5 px-2 text-right font-mono text-rose-400">₱${item.hdmfEe.toFixed(2)}</td>
      <td class="py-2.5 px-2 text-right font-mono text-rose-400">₱${item.wtax.toFixed(2)}</td>
      <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
        ₱${item.net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach input listeners
  tbody.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', e => {
      const empId = e.target.dataset.empid;
      const field = e.target.dataset.field;
      timekeeping[empId][field] = parseFloat(e.target.value) || 0;
      renderPayroll();
    });
  });

  // Update KPI displays
  document.getElementById('kpiGross').textContent = `₱${totalGross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  document.getElementById('kpiDeductions').textContent = `₱${totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  document.getElementById('kpiEmployer').textContent = `₱${totalEmployer.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  document.getElementById('kpiNet').textContent = `₱${totalNet.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

async function handlePostPayrollToGl() {
  const payout = document.getElementById('payoutDate').value;
  const start = document.getElementById('payrollStart').value;
  const end = document.getElementById('payrollEnd').value;
  const runNumber = `PR-${end.replace(/-/g, '').slice(0, 6)}-01`;

  let directLabor = 0;
  let adminSalaries = 0;
  let sssEr = 0;
  let phicEr = 0;
  let hdmfEr = 0;
  let sssEe = 0;
  let phicEe = 0;
  let hdmfEe = 0;
  let wtax = 0;
  let net = 0;

  EMPLOYEES.forEach(emp => {
    const item = computeItem(emp, timekeeping[emp.id]);
    if (['Baker', 'Slicer', 'Wrapper'].includes(emp.role)) {
      directLabor += item.gross;
    } else {
      adminSalaries += item.gross;
    }
    sssEr += item.sssEr;
    phicEr += item.phicEr;
    hdmfEr += item.hdmfEr;
    sssEe += item.sssEe;
    phicEe += item.phicEe;
    hdmfEe += item.hdmfEe;
    wtax += item.wtax;
    net += item.net;
  });

  const compoundLines = [
    { account_code: '50201', debit_amount: Math.round(directLabor * 100) / 100, credit_amount: 0, memo: `Direct Labor (${runNumber})` },
    { account_code: '60101', debit_amount: Math.round(adminSalaries * 100) / 100, credit_amount: 0, memo: `Admin & Store Staff (${runNumber})` },
    { account_code: '60102', debit_amount: Math.round(sssEr * 100) / 100, credit_amount: 0, memo: `Employer SSS Share` },
    { account_code: '60103', debit_amount: Math.round(phicEr * 100) / 100, credit_amount: 0, memo: `Employer PhilHealth Share` },
    { account_code: '60104', debit_amount: Math.round(hdmfEr * 100) / 100, credit_amount: 0, memo: `Employer Pag-IBIG Share` },
    { account_code: '20203', debit_amount: 0, credit_amount: Math.round((sssEe + sssEr) * 100) / 100, memo: `Due to SSS` },
    { account_code: '20204', debit_amount: 0, credit_amount: Math.round((phicEe + phicEr) * 100) / 100, memo: `Due to PhilHealth` },
    { account_code: '20205', debit_amount: 0, credit_amount: Math.round((hdmfEe + hdmfEr) * 100) / 100, memo: `Due to Pag-IBIG` },
    { account_code: '20202', debit_amount: 0, credit_amount: Math.round(wtax * 100) / 100, memo: `Withholding Tax Payable` },
    { account_code: '10102', debit_amount: 0, credit_amount: Math.round(net * 100) / 100, memo: `BDO Bank Payroll Net Transfer` }
  ].filter(l => l.debit_amount > 0 || l.credit_amount > 0);

  // Equalize any rounding discrepancy
  const deb = Math.round(compoundLines.reduce((s, l) => s + l.debit_amount, 0) * 100) / 100;
  const crd = Math.round(compoundLines.reduce((s, l) => s + l.credit_amount, 0) * 100) / 100;
  const delta = Math.round((deb - crd) * 100) / 100;
  if (Math.abs(delta) > 0 && Math.abs(delta) <= 0.05) {
    const cash = compoundLines.find(l => l.account_code === '10102');
    if (cash) cash.credit_amount = Math.round((cash.credit_amount + delta) * 100) / 100;
  }

  const payload = {
    entry_date: payout,
    reference_doc: runNumber,
    description: `Semi-Monthly Plant & Branch Payroll Disbursement (${start} to ${end})`,
    cost_center_code: 'IND-PLANT',
    payee_vendor: 'BDO Online Payroll',
    status: 'POSTED',
    lines: compoundLines
  };

  try {
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert(`Success! Payroll Run ${runNumber} posted to General Ledger.`);
    } else {
      throw new Error(await res.text());
    }
  } catch (err) {
    console.warn("Direct /api/ledger failed, storing locally:", err);
    saveLocalEntry(payload);
    alert(`Success! Payroll Run ${runNumber} posted to General Ledger (Local Storage).`);
  }
}

function saveLocalEntry(entry) {
  const key = 'zbooks_sme_state_v1';
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    state = {};
  }
  if (!state.journalEntries) state.journalEntries = [];

  const dateStr = entry.entry_date || new Date().toISOString().slice(0, 10);
  const entryNumber = `JE-${dateStr.replace(/-/g, '').slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newEntry = {
    ...entry,
    id: 'je-' + Date.now(),
    entry_number: entryNumber,
    created_at: new Date().toISOString(),
    total_amount: entry.lines.reduce((s, l) => s + l.debit_amount, 0),
    lines: entry.lines.map((l, i) => ({ ...l, id: 'line-' + Date.now() + '-' + i, line_order: i + 1 }))
  };

  state.journalEntries.unshift(newEntry);
  localStorage.setItem(key, JSON.stringify(state));
}
