/**
 * Z-Books Standalone Journal Client Script
 * Connects to /api/ledger with live PRISMER balance validation
 */

const ACCOUNTS = [
  { code: '10101', name: 'Petty Cash Fund' },
  { code: '10102', name: 'Cash in Bank - BDO Current Account' },
  { code: '10103', name: 'Cash in Bank - BPI Operating Account' },
  { code: '10201', name: 'Accounts Receivable - Trade Wholesale' },
  { code: '10301', name: 'Direct Raw Materials Inventory' },
  { code: '10302', name: 'Packaging Supplies Inventory' },
  { code: '10401', name: 'Input VAT (12%)' },
  { code: '10501', name: 'Bakery Machinery & Rotary Ovens' },
  { code: '10503', name: 'Delivery Vans & Logistics Vehicles' },
  { code: '20101', name: 'Accounts Payable - Flour Suppliers' },
  { code: '20102', name: 'Accrued Operating Expenses' },
  { code: '20201', name: 'Output VAT (12%)' },
  { code: '20202', name: 'Withholding Tax - Compensation (1601-C)' },
  { code: '20203', name: 'Due to SSS (Employee & Employer)' },
  { code: '20204', name: 'Due to PhilHealth (PHIC Premiums)' },
  { code: '20205', name: 'Due to Pag-IBIG (HDMF Premiums)' },
  { code: '40101', name: 'Sales Revenue - Retail Bakery Stores' },
  { code: '40102', name: 'Sales Revenue - Wholesale Bread Distribution' },
  { code: '50101', name: 'Raw Materials Consumed - Flour, Sugar, Fats' },
  { code: '50102', name: 'Packaging Supplies Consumed' },
  { code: '50201', name: 'Direct Labor - Bakers & Dough Handlers' },
  { code: '50202', name: 'Direct Labor - Slicers & Wrappers' },
  { code: '50301', name: 'Factory Overhead - Industrial LPG Fuel' },
  { code: '50302', name: 'Factory Overhead - 3-Phase Electricity' },
  { code: '60101', name: 'Salaries & Wages - Administrative Staff' },
  { code: '60102', name: 'Employer Statutory Share - SSS' },
  { code: '60103', name: 'Employer Statutory Share - PhilHealth' },
  { code: '60104', name: 'Employer Statutory Share - Pag-IBIG' },
  { code: '60201', name: 'Rent Expense - Bakery Outlets' },
  { code: '60202', name: 'Fuel & Oil - Delivery Logistics' }
];

let lines = [
  { account_code: '10301', debit: 50000, credit: 0, memo: '25 sacks First Class Bread Flour' },
  { account_code: '10401', debit: 6000, credit: 0, memo: '12% Input VAT on flour purchase' },
  { account_code: '20101', debit: 0, credit: 56000, memo: 'Payable to Universal Robina Corp' }
];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('entryDate').value = new Date().toISOString().slice(0, 10);
  renderLines();
  loadEntries();

  document.getElementById('addLineBtn').addEventListener('click', () => {
    lines.push({ account_code: '10102', debit: 0, credit: 0, memo: '' });
    renderLines();
  });

  document.getElementById('voucherForm').addEventListener('submit', handleFormSubmit);
});

function renderLines() {
  const tbody = document.getElementById('linesTbody');
  tbody.innerHTML = '';

  let sumDebits = 0;
  let sumCredits = 0;

  lines.forEach((l, idx) => {
    sumDebits += parseFloat(l.debit) || 0;
    sumCredits += parseFloat(l.credit) || 0;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40';

    tr.innerHTML = `
      <td class="py-2 px-3">
        <select class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-500" data-idx="${idx}" data-field="account_code">
          ${ACCOUNTS.map(a => `<option value="${a.code}" ${a.code === l.account_code ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
        </select>
      </td>
      <td class="py-2 px-3">
        <input type="text" value="${l.memo || ''}" placeholder="Line memo..." class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500" data-idx="${idx}" data-field="memo">
      </td>
      <td class="py-2 px-3 text-right">
        <input type="number" step="0.01" min="0" value="${l.debit || ''}" placeholder="0.00" class="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-white font-mono text-xs focus:outline-none focus:border-amber-500" data-idx="${idx}" data-field="debit">
      </td>
      <td class="py-2 px-3 text-right">
        <input type="number" step="0.01" min="0" value="${l.credit || ''}" placeholder="0.00" class="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-white font-mono text-xs focus:outline-none focus:border-amber-500" data-idx="${idx}" data-field="credit">
      </td>
      <td class="py-2 px-2 text-center">
        <button type="button" class="text-slate-500 hover:text-rose-400 p-1" data-remove="${idx}">✕</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach change listeners
  tbody.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      lines[idx][field] = e.target.value;
      updateTotals();
    });
  });

  tbody.querySelectorAll('[data-remove]').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.remove);
      if (lines.length > 2) {
        lines.splice(idx, 1);
        renderLines();
      } else {
        alert("A double-entry voucher must contain at least 2 lines (Debit and Credit).");
      }
    });
  });

  updateTotals();
}

function updateTotals() {
  let sumDebits = 0;
  let sumCredits = 0;

  lines.forEach(l => {
    sumDebits += parseFloat(l.debit) || 0;
    sumCredits += parseFloat(l.credit) || 0;
  });

  sumDebits = Math.round(sumDebits * 100) / 100;
  sumCredits = Math.round(sumCredits * 100) / 100;
  const delta = Math.round(Math.abs(sumDebits - sumCredits) * 100) / 100;
  const isBalanced = delta < 0.01 && sumDebits > 0;

  document.getElementById('sumDebitsDisplay').textContent = `₱${sumDebits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  document.getElementById('sumCreditsDisplay').textContent = `₱${sumCredits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const badge = document.getElementById('balanceBadge');
  const postBtn = document.getElementById('postBtn');

  if (isBalanced) {
    badge.className = 'px-3 py-1 rounded-full text-xs font-semibold font-mono bg-emerald-950 text-emerald-400 border border-emerald-800';
    badge.textContent = 'Balanced (Δ = ₱0.00)';
    postBtn.disabled = false;
  } else {
    badge.className = 'px-3 py-1 rounded-full text-xs font-semibold font-mono bg-rose-950 text-rose-400 border border-rose-800';
    badge.textContent = `Imbalance: Δ = ₱${delta.toFixed(2)}`;
    postBtn.disabled = true;
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const entryData = {
    entry_date: document.getElementById('entryDate').value,
    reference_doc: document.getElementById('referenceDoc').value,
    cost_center_code: document.getElementById('costCenter').value,
    payee_vendor: document.getElementById('payeeVendor').value,
    description: document.getElementById('description').value,
    status: 'POSTED',
    lines: lines.map(l => ({
      account_code: l.account_code,
      debit_amount: parseFloat(l.debit) || 0,
      credit_amount: parseFloat(l.credit) || 0,
      memo: l.memo || ''
    }))
  };

  try {
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData)
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Success! Entry posted to General Ledger: ${data.entry?.entry_number || 'Posted'}`);
      // Reset form
      document.getElementById('referenceDoc').value = '';
      document.getElementById('description').value = '';
      loadEntries();
    } else {
      const err = await res.json();
      alert(`Validation error (${res.status}): ${err.error || 'Failed to post'}`);
    }
  } catch (err) {
    console.warn("API /api/ledger offline or preview mode, recording locally:", err);
    // Local fallback
    saveLocalEntry(entryData);
    alert(`Journal entry saved and balanced!`);
    loadEntries();
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

async function loadEntries() {
  const container = document.getElementById('journalEntriesContainer');
  let entries = [];

  try {
    const res = await fetch('/api/ledger');
    if (res.ok) {
      const data = await res.json();
      entries = data.entries || [];
    }
  } catch {
    const key = 'zbooks_sme_state_v1';
    try {
      const state = JSON.parse(localStorage.getItem(key));
      entries = state?.journalEntries || [];
    } catch {
      entries = [];
    }
  }

  if (entries.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">No entries loaded yet.</div>`;
    return;
  }

  container.innerHTML = entries.slice(0, 8).map(e => `
    <div class="bg-slate-800/60 border border-slate-700/80 rounded-lg p-3 text-xs space-y-2">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold text-amber-400">${e.entry_number}</span>
          <span class="text-slate-400 font-mono">${e.entry_date}</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-700 text-slate-300">${e.cost_center_code}</span>
        </div>
        <div class="font-mono font-bold text-white">₱${(e.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="text-slate-200">${e.description}</div>
      <div class="text-[11px] text-slate-400 border-t border-slate-700/60 pt-1 flex justify-between">
        <span>Ref: ${e.reference_doc || 'None'}</span>
        <span>${e.lines ? e.lines.length : 0} balanced lines</span>
      </div>
    </div>
  `).join('');
}
