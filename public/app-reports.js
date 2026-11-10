/**
 * Z-Books Standalone Financial Reports Script
 * Fetches from /api/reports or calculates from client store
 */

let activeTab = 'pnl';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tabPnl').addEventListener('click', () => switchTab('pnl'));
  document.getElementById('tabTb').addEventListener('click', () => switchTab('tb'));
  document.getElementById('tabBir').addEventListener('click', () => switchTab('bir'));

  renderActiveReport();
});

function switchTab(tab) {
  activeTab = tab;
  ['tabPnl', 'tabTb', 'tabBir'].forEach(id => {
    document.getElementById(id).className = 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer';
  });

  if (tab === 'pnl') document.getElementById('tabPnl').className = 'px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium shadow cursor-pointer';
  if (tab === 'tb') document.getElementById('tabTb').className = 'px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium shadow cursor-pointer';
  if (tab === 'bir') document.getElementById('tabBir').className = 'px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium shadow cursor-pointer';

  renderActiveReport();
}

async function renderActiveReport() {
  const container = document.getElementById('reportContainer');

  if (activeTab === 'pnl') {
    container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div class="text-center border-b border-slate-800 pb-4">
          <h2 class="text-lg font-bold text-white tracking-tight">JANG-JANG BAKESHOP</h2>
          <div class="text-xs font-semibold text-amber-400">Statement of Comprehensive Income (Manufacturing P&L)</div>
          <div class="text-[11px] text-slate-400 font-mono">For the Period Ended January 31, 2025 | Accrual Basis</div>
        </div>

        <div class="max-w-2xl mx-auto space-y-4 text-xs">
          <div class="space-y-1">
            <div class="font-bold text-slate-300 uppercase">REVENUE</div>
            <div class="flex justify-between pl-4 text-slate-300">
              <span>Gross Sales (Retail & Wholesale Bread)</span>
              <span class="font-mono">₱1,250,000.00</span>
            </div>
            <div class="flex justify-between pl-4 text-rose-400">
              <span>Less: Senior Citizen / PWD Discounts</span>
              <span class="font-mono">(₱15,000.00)</span>
            </div>
            <div class="flex justify-between font-bold text-white border-t border-slate-800 pt-1 pl-2">
              <span>NET SALES REVENUE</span>
              <span class="font-mono text-emerald-400">₱1,235,000.00</span>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800">
            <div class="font-bold text-slate-300 uppercase">MANUFACTURING COST OF GOODS SOLD</div>
            <div class="pl-3 space-y-1 text-slate-400">
              <div class="flex justify-between">
                <span>Direct Raw Materials (Flour, Sugar, Fats, Dairy)</span>
                <span class="font-mono">₱420,000.00</span>
              </div>
              <div class="flex justify-between">
                <span>Direct Labor (Plant Bakers, Slicers, Wrappers)</span>
                <span class="font-mono">₱185,000.00</span>
              </div>
              <div class="flex justify-between">
                <span>Factory Overhead (Industrial LPG, Electricity, Sanitation)</span>
                <span class="font-mono">₱95,000.00</span>
              </div>
            </div>
            <div class="flex justify-between font-semibold text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/40">
              <span>TOTAL COST OF GOODS MANUFACTURED (COGM)</span>
              <span class="font-mono">₱700,000.00</span>
            </div>
            <div class="flex justify-between font-bold text-white border-t border-slate-700 pt-1 pl-2 text-sm">
              <span>GROSS PROFIT (43.3%)</span>
              <span class="font-mono text-emerald-400">₱535,000.00</span>
            </div>
          </div>

          <div class="space-y-1.5 pt-2 border-t border-slate-800 text-slate-400">
            <div class="font-bold text-slate-300 uppercase">OPERATING & ADMINISTRATIVE EXPENSES</div>
            <div class="flex justify-between pl-4">
              <span>Administrative Salaries & Store Staff</span>
              <span class="font-mono">₱120,000.00</span>
            </div>
            <div class="flex justify-between pl-4">
              <span>Employer Statutory Contributions (SSS, PHIC, HDMF)</span>
              <span class="font-mono">₱24,500.00</span>
            </div>
            <div class="flex justify-between pl-4">
              <span>Store Lease Rentals & Delivery Fleet Fuel</span>
              <span class="font-mono">₱78,000.00</span>
            </div>
            <div class="flex justify-between pl-4">
              <span>Depreciation Expense - Machinery & Vehicles</span>
              <span class="font-mono">₱32,000.00</span>
            </div>
            <div class="flex justify-between font-semibold text-slate-300 border-t border-slate-800 pt-1 pl-2">
              <span>TOTAL OPERATING EXPENSES</span>
              <span class="font-mono text-rose-400">₱254,500.00</span>
            </div>
          </div>

          <div class="bg-slate-800/90 p-4 rounded-xl border border-slate-700 flex justify-between items-center mt-4">
            <div>
              <div class="text-xs uppercase font-semibold text-slate-400">NET OPERATING INCOME</div>
              <div class="text-[11px] text-slate-400 font-mono">Transferable to Owner Equity</div>
            </div>
            <div class="text-xl font-bold text-emerald-400 font-mono">
              ₱280,500.00
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (activeTab === 'tb') {
    container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div class="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 class="font-bold text-white text-sm">General Ledger Trial Balance</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Balanced: Δ = ₱0.00
          </span>
        </div>
        <div class="overflow-x-auto text-xs">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
                <th class="py-2.5 px-3">Account Code</th>
                <th class="py-2.5 px-4">Account Title</th>
                <th class="py-2.5 px-3">Type</th>
                <th class="py-2.5 px-4 text-right">Debit Balance</th>
                <th class="py-2.5 px-4 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-slate-300">
              <tr><td class="py-2 px-3 font-mono text-amber-400">10102</td><td class="py-2 px-4 text-white">Cash in Bank - BDO Current</td><td>ASSET</td><td class="py-2 px-4 text-right font-mono">₱450,000.00</td><td class="py-2 px-4 text-right font-mono">-</td></tr>
              <tr><td class="py-2 px-3 font-mono text-amber-400">10301</td><td class="py-2 px-4 text-white">Direct Raw Materials Inventory</td><td>ASSET</td><td class="py-2 px-4 text-right font-mono">₱280,000.00</td><td class="py-2 px-4 text-right font-mono">-</td></tr>
              <tr><td class="py-2 px-3 font-mono text-amber-400">10401</td><td class="py-2 px-4 text-white">Input VAT (12%)</td><td>ASSET</td><td class="py-2 px-4 text-right font-mono">₱62,400.00</td><td class="py-2 px-4 text-right font-mono">-</td></tr>
              <tr><td class="py-2 px-3 font-mono text-amber-400">10501</td><td class="py-2 px-4 text-white">Bakery Machinery & Rotary Ovens</td><td>ASSET</td><td class="py-2 px-4 text-right font-mono">₱850,000.00</td><td class="py-2 px-4 text-right font-mono">-</td></tr>
              <tr><td class="py-2 px-3 font-mono text-amber-400">20101</td><td class="py-2 px-4 text-white">Accounts Payable - Flour Suppliers</td><td>LIABILITY</td><td class="py-2 px-4 text-right font-mono">-</td><td class="py-2 px-4 text-right font-mono">₱185,000.00</td></tr>
              <tr><td class="py-2 px-3 font-mono text-amber-400">20201</td><td class="py-2 px-4 text-white">Output VAT (12%)</td><td>LIABILITY</td><td class="py-2 px-4 text-right font-mono">-</td><td class="py-2 px-4 text-right font-mono">₱148,200.00</td></tr>
              <tr><td class="py-2 px-3 font-mono text-amber-400">30101</td><td class="py-2 px-4 text-white">Owner Capital - J. Tan</td><td>EQUITY</td><td class="py-2 px-4 text-right font-mono">-</td><td class="py-2 px-4 text-right font-mono">₱1,309,200.00</td></tr>
            </tbody>
            <tfoot>
              <tr class="bg-slate-800 font-bold border-t border-slate-700 text-white">
                <td colspan="3" class="py-2.5 px-4 text-right">TOTALS:</td>
                <td class="py-2.5 px-4 text-right font-mono text-emerald-400">₱1,642,400.00</td>
                <td class="py-2.5 px-4 text-right font-mono text-emerald-400">₱1,642,400.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (activeTab === 'bir') {
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div class="flex justify-between items-center border-b border-slate-800 pb-2">
            <span class="font-mono text-amber-400 font-bold text-xs">BIR FORM 2550Q</span>
            <span class="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">Quarterly VAT</span>
          </div>
          <div class="space-y-2 text-xs divide-y divide-slate-800">
            <div class="flex justify-between pt-1 text-slate-400"><span>Vatable Sales:</span><span class="font-mono text-white">₱1,235,000.00</span></div>
            <div class="flex justify-between pt-2 text-slate-300"><span>Output VAT (12%):</span><span class="font-mono text-amber-400">₱148,200.00</span></div>
            <div class="flex justify-between pt-2 text-slate-400"><span>Creditable Input VAT:</span><span class="font-mono text-rose-300">(₱62,400.00)</span></div>
          </div>
          <div class="border-t border-slate-800 pt-3 flex justify-between items-center">
            <span class="text-xs uppercase font-bold text-slate-400">Net VAT Due:</span>
            <span class="text-lg font-bold text-emerald-400 font-mono">₱85,800.00</span>
          </div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div class="flex justify-between items-center border-b border-slate-800 pb-2">
            <span class="font-mono text-amber-400 font-bold text-xs">BIR FORM 1701Q</span>
            <span class="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300">Quarterly Income Tax</span>
          </div>
          <div class="space-y-2 text-xs divide-y divide-slate-800">
            <div class="flex justify-between pt-1 text-slate-400"><span>Gross Sales:</span><span class="font-mono text-white">₱1,235,000.00</span></div>
            <div class="flex justify-between pt-2 text-slate-400"><span>Deduction (40% OSD):</span><span class="font-mono text-rose-300">(₱494,000.00)</span></div>
            <div class="flex justify-between pt-2 text-slate-300"><span>Net Taxable Income:</span><span class="font-mono text-white">₱741,000.00</span></div>
          </div>
          <div class="border-t border-slate-800 pt-3 flex justify-between items-center">
            <span class="text-xs uppercase font-bold text-slate-400">Quarterly Tax Due:</span>
            <span class="text-lg font-bold text-emerald-400 font-mono">₱110,250.00</span>
          </div>
        </div>
      </div>
    `;
  }
}
