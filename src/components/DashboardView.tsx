import React from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Factory,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  PlusCircle,
  FileCheck2,
  RotateCcw,
  Building,
  Truck,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { db } from '../services/db';
import { JournalEntry } from '../types/accounting';

interface DashboardViewProps {
  onNavigate: (tab: 'dashboard' | 'journal' | 'payroll' | 'reports' | 'accounts' | 'd1') => void;
  onNewJournal: () => void;
  onReverseEntry: (entry: JournalEntry) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onNewJournal,
  onReverseEntry
}) => {
  const pnl = db.getIncomeStatement();
  const bs = db.getBalanceSheet();
  const vat = db.getBir2550Q();
  const costCenters = db.getCostCenterBreakdown();
  const recentEntries = db.getJournalEntries().slice(0, 6);

  // Formatting helpers
  const fmt = (num: number) => `₱${(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalCash = (bs.assetRows.find(r => r.account_code === '10102')?.debit_balance || 0) +
                    (bs.assetRows.find(r => r.account_code === '10103')?.debit_balance || 0) +
                    (bs.assetRows.find(r => r.account_code === '10101')?.debit_balance || 0);

  const tradeAR = bs.assetRows.find(r => r.account_code === '10201')?.debit_balance || 0;
  const tradeAP = bs.liabilityRows.find(r => r.account_code === '20101')?.credit_balance || 0;

  return (
    <div className="space-y-6">
      {/* Enterprise Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/60 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              PFRS for SMEs & BIR VAT Compliant System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Jang-Jang Bakeshop Manufacturing & Retail
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Zero-cost double-entry bookkeeping, plant cost accounting (COGM/COGS), 2025/2026 Philippine statutory payroll, and BIR Form 2550Q / 1701Q / 1601-C tax compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onNewJournal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-emerald-950"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Journal Voucher</span>
            </button>
            <button
              onClick={() => onNavigate('payroll')}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition"
            >
              <Factory className="w-4 h-4 text-amber-400" />
              <span>Run Plant Payroll</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition"
            >
              <FileCheck2 className="w-4 h-4 text-blue-400" />
              <span>BIR Tax Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Cash in Banks */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cash & Cash Eq.</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono-num text-white">{fmt(totalCash)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">BDO Current + BPI POS</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Petty Cash:</span>
            <span className="font-mono text-slate-300">₱14,560.00</span>
          </div>
        </div>

        {/* Trade AR */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Trade Receivables</span>
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono-num text-white">{fmt(tradeAR)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Wholesale Supermarkets</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Terms:</span>
            <span className="text-emerald-400 font-medium">15–30 Days Current</span>
          </div>
        </div>

        {/* Trade AP */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Accounts Payable</span>
            <ArrowDownRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono-num text-white">{fmt(tradeAP)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Flour & Sugar Millers</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">San Miguel Mills:</span>
            <span className="text-amber-300 font-mono">Current 30d</span>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Gross Profit (COGM)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono-num text-emerald-400">{fmt(pnl.grossProfit)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Margin: <strong className="text-emerald-300">{pnl.grossMarginPct}%</strong></p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Net Sales:</span>
            <span className="font-mono text-slate-300">{fmt(pnl.netSales)}</span>
          </div>
        </div>

        {/* Net Operating Income */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Net Operating Income</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono-num text-teal-300">{fmt(pnl.netOperatingIncome)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Net Margin: <strong className="text-teal-200">{pnl.netProfitMarginPct}%</strong></p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">PFRS Basis:</span>
            <span className="text-slate-300">Accrual Verified</span>
          </div>
        </div>

        {/* BIR Form 2550Q Net VAT */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>BIR 2550Q VAT Due</span>
            <Receipt className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono-num text-purple-300">{fmt(vat.net_vat_payable)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {vat.net_vat_payable > 0 ? 'Payable this Quarter' : `Excess Input: ${fmt(vat.excess_input_tax)}`}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Output VAT:</span>
            <span className="font-mono text-slate-300">{fmt(vat.output_vat_12)}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Manufacturing COGS & Cost Center Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost of Goods Manufactured (COGM) Engine Analysis */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Factory className="w-5 h-5 text-emerald-400" />
                Manufacturing Cost Accounting (COGM / COGS)
              </h2>
              <p className="text-xs text-slate-400">Direct Materials, Direct Baking Labor, and Factory Overhead absorption</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>View Full P&L</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Direct Materials */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">1. Direct Materials</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">50100</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-white mt-1">
                {fmt(pnl.directMaterials.total)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Flour, Sugar, Fats:</span>
                  <span className="font-mono text-slate-300">{fmt(pnl.directMaterials.rawMaterials)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packaging Bags:</span>
                  <span className="font-mono text-slate-300">{fmt(pnl.directMaterials.packagingConsumed)}</span>
                </div>
              </div>
            </div>

            {/* Direct Labor */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">2. Direct Labor</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">50200</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-white mt-1">
                {fmt(pnl.directLabor.total)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Bakers & Dough Crew:</span>
                  <span className="font-mono text-slate-300">{fmt(pnl.directLabor.bakers)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slicers & Packaging:</span>
                  <span className="font-mono text-slate-300">{fmt(pnl.directLabor.slicersPackaging)}</span>
                </div>
              </div>
            </div>

            {/* Factory Overhead */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">3. Factory Overhead</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">50300</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-white mt-1">
                {fmt(pnl.factoryOverhead.total)}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>LPG Oven Gas:</span>
                  <span className="font-mono text-slate-300">{fmt(pnl.factoryOverhead.lpgFuel)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plant 3-Phase Power:</span>
                  <span className="font-mono text-slate-300">{fmt(pnl.factoryOverhead.plantElectricity)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equation Ribbon */}
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>COGM Equation: <strong>Direct Materials</strong> + <strong>Direct Labor</strong> + <strong>Factory Overhead</strong> =</span>
            </div>
            <div className="font-mono font-bold text-sm text-emerald-400">
              Total COGM: {fmt(pnl.cogm)}
            </div>
          </div>
        </div>

        {/* Cost Centers Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" />
                Cost Centers
              </h2>
              <p className="text-xs text-slate-400">Plant & Retail Outlets</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">4 Centers</span>
          </div>

          <div className="space-y-3">
            {costCenters.map(cc => {
              const maxDebits = Math.max(...costCenters.map(c => c.debits || 1), 1);
              const pct = Math.round(((cc.debits || 0) / maxDebits) * 100);
              return (
                <div key={cc.code} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cc.name}</span>
                    <span className="font-mono font-bold text-emerald-400">{fmt(cc.debits)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-slate-500">{cc.code}</span>
                    <span>{cc.entriesCount} transactions posted</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent General Journal Vouchers */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              Recent Journal Entries & Audit Trail
            </h2>
            <p className="text-xs text-slate-400">PFRS for SMEs Double-Entry verified ledger postings</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('journal')}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition"
            >
              View Full Journal ({db.getJournalEntries().length})
            </button>
            <button
              onClick={onNewJournal}
              className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
            >
              + New Voucher
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Entry Number</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Ref Doc</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Cost Center</th>
                <th className="py-2.5 px-3 text-right">Debit = Credit</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono font-medium text-emerald-400 whitespace-nowrap">
                    {entry.entry_number}
                    {entry.is_reversing && (
                      <span className="ml-1 text-[9px] uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        REV
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap font-mono">{entry.entry_date}</td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">{entry.reference_doc || '-'}</td>
                  <td className="py-3 px-3 text-slate-200 max-w-xs truncate" title={entry.description}>
                    {entry.description}
                  </td>
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">{entry.cost_center_code}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                    {fmt(entry.total_amount)}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                      entry.status === 'POSTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : entry.status === 'DRAFT'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {entry.status === 'POSTED' && !entry.is_reversing && (
                      <button
                        onClick={() => onReverseEntry(entry)}
                        title="Generate Reversing Adjusting Entry"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
