import React, { useState, useMemo } from 'react';
import { db } from '../services/db';
import {
  FileText,
  DollarSign,
  Scale,
  Building2,
  Printer,
  Download,
  CheckCircle,
  BarChart3,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportTab, setReportTab] = useState<
    'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'GENERAL_LEDGER' | 'BIR_TAX' | 'COST_CENTERS'
  >('INCOME_STATEMENT');

  const [selectedGlAccount, setSelectedGlAccount] = useState('10102'); // Default BDO Current Account
  const [osdMethod, setOsdMethod] = useState<'OSD' | 'ITEMIZED'>('OSD');
  const [taxQuarter, setTaxQuarter] = useState('Q1 2025');

  const accounts = db.getAccounts();
  const trialBalance = useMemo(() => db.getTrialBalance(), []);
  const incomeStatement = useMemo(() => db.getIncomeStatement(), []);
  const balanceSheet = useMemo(() => db.getBalanceSheet(), []);
  const bir2550Q = useMemo(() => db.getBir2550Q(taxQuarter), [taxQuarter]);
  const bir1701Q = useMemo(() => db.getBir1701Q(taxQuarter, osdMethod), [osdMethod, taxQuarter]);
  const bir1601C = useMemo(() => db.getBir1601C('January 2025'), []);
  const costCenters = useMemo(() => db.getCostCenterBreakdown(), []);

  // General Ledger query
  const glData = useMemo(() => {
    try {
      return db.getGeneralLedger(selectedGlAccount);
    } catch {
      return null;
    }
  }, [selectedGlAccount]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = '';
    if (reportTab === 'TRIAL_BALANCE') {
      csv = 'Account Code,Account Name,Category,Normal Balance,Total Debit,Total Credit,Debit Balance,Credit Balance\n';
      trialBalance.rows.forEach(r => {
        csv += `"${r.account_code}","${r.account_name}","${r.category}","${r.normal_balance}",${r.total_debit},${r.total_credit},${r.debit_balance},${r.credit_balance}\n`;
      });
      csv += `Total,,,,"","",${trialBalance.totalDebits},${trialBalance.totalCredits}\n`;
    } else if (reportTab === 'INCOME_STATEMENT') {
      csv = 'P&L Line,Amount (PHP)\n';
      csv += `Gross Sales,${incomeStatement.grossSales}\n`;
      csv += `Less Sales Discounts,${incomeStatement.salesDiscounts}\n`;
      csv += `Net Sales,${incomeStatement.netSales}\n`;
      csv += `Direct Materials Consumed,${incomeStatement.directMaterials.total}\n`;
      csv += `Direct Labor,${incomeStatement.directLabor.total}\n`;
      csv += `Factory Overhead,${incomeStatement.factoryOverhead.total}\n`;
      csv += `Cost of Goods Manufactured (COGM),${incomeStatement.cogm}\n`;
      csv += `Gross Profit,${incomeStatement.grossProfit}\n`;
      csv += `Operating Expenses,${incomeStatement.operatingExpenses.total}\n`;
      csv += `Net Operating Income,${incomeStatement.netOperatingIncome}\n`;
    } else {
      csv = `Z-Books Report Export: ${reportTab}\nGenerated on ${new Date().toISOString()}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `zbooks_${reportTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grouping balance sheet rows for current vs non-current display
  const currentAssetCodes = ['10101', '10102', '10103', '10201', '10202', '10301', '10302', '10303', '10304', '10401'];
  const currentAssets = balanceSheet.assetRows.filter(r => currentAssetCodes.includes(r.account_code));
  const nonCurrentAssets = balanceSheet.assetRows.filter(r => !currentAssetCodes.includes(r.account_code));

  return (
    <div className="space-y-6">
      {/* Navigation & Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80">
          <button
            onClick={() => setReportTab('INCOME_STATEMENT')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'INCOME_STATEMENT' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Manufacturing P&L
          </button>

          <button
            onClick={() => setReportTab('BALANCE_SHEET')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'BALANCE_SHEET' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Balance Sheet
          </button>

          <button
            onClick={() => setReportTab('TRIAL_BALANCE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'TRIAL_BALANCE' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Trial Balance
          </button>

          <button
            onClick={() => setReportTab('GENERAL_LEDGER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'GENERAL_LEDGER' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            General Ledger
          </button>

          <button
            onClick={() => setReportTab('BIR_TAX')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'BIR_TAX' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            BIR Tax Center
          </button>

          <button
            onClick={() => setReportTab('COST_CENTERS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'COST_CENTERS' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Cost Centers
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. INCOME STATEMENT (P&L - MANUFACTURING COGM MODEL) */}
      {/* ---------------------------------------------------- */}
      {reportTab === 'INCOME_STATEMENT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 space-y-6">
          <div className="text-center border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">JANG-JANG BAKESHOP</h2>
            <div className="text-sm font-semibold text-amber-400 mt-0.5">
              Statement of Comprehensive Income (Manufacturing P&L)
            </div>
            <div className="text-xs text-slate-400">
              For the Period Ended January 31, 2025 | Accrual Basis (PFRS for SMEs)
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-4 text-sm font-sans">
            {/* Sales Revenue */}
            <div className="space-y-1.5">
              <div className="font-bold text-slate-300 text-xs tracking-wider uppercase">REVENUE</div>
              <div className="flex justify-between pl-4 text-slate-300">
                <span>Gross Bakery Sales (Retail Stores & Wholesale Distribution)</span>
                <span className="font-mono-num">₱{incomeStatement.grossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              {incomeStatement.salesDiscounts > 0 && (
                <div className="flex justify-between pl-4 text-rose-400">
                  <span>Less: Senior Citizen / PWD Statutory Discounts</span>
                  <span className="font-mono-num">(₱{incomeStatement.salesDiscounts.toLocaleString('en-PH', { minimumFractionDigits: 2 })})</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-white border-t border-slate-800 pt-1.5 pl-2">
                <span>NET SALES REVENUE</span>
                <span className="font-mono-num text-emerald-400">₱{incomeStatement.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Cost of Goods Manufactured (COGM) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="font-bold text-slate-300 text-xs tracking-wider uppercase flex items-center justify-between">
                <span>MANUFACTURING COST OF GOODS SOLD</span>
                <span className="text-[11px] font-normal text-amber-400 font-mono">Absorption Costing</span>
              </div>

              {/* Direct Materials */}
              <div className="pl-3 space-y-1">
                <div className="font-semibold text-slate-400 text-xs">Direct Raw Materials Consumed:</div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Flour sacks, refined sugar, yeast, shortening, dairy</span>
                  <span className="font-mono-num">₱{incomeStatement.directMaterials.rawMaterials.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Bread plastic wrappers, paper bags, bakery boxes</span>
                  <span className="font-mono-num">₱{incomeStatement.directMaterials.packagingConsumed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300 pl-4 border-t border-slate-800/60 pt-0.5">
                  <span>Total Direct Materials</span>
                  <span className="font-mono-num">₱{incomeStatement.directMaterials.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Direct Labor */}
              <div className="pl-3 space-y-1 pt-1">
                <div className="font-semibold text-slate-400 text-xs">Direct Labor:</div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Plant Bakers, Dough Handlers & Oven Masters</span>
                  <span className="font-mono-num">₱{incomeStatement.directLabor.bakers.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Bread Slicers, Wrappers & QA Packagers</span>
                  <span className="font-mono-num">₱{incomeStatement.directLabor.slicersPackaging.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300 pl-4 border-t border-slate-800/60 pt-0.5">
                  <span>Total Direct Labor</span>
                  <span className="font-mono-num">₱{incomeStatement.directLabor.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Factory Overhead */}
              <div className="pl-3 space-y-1 pt-1">
                <div className="font-semibold text-slate-400 text-xs">Factory Overhead:</div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Industrial LPG Fuel (Deck & Rotary Ovens)</span>
                  <span className="font-mono-num">₱{incomeStatement.factoryOverhead.lpgFuel.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Plant 3-Phase Industrial Electricity (Davao Light)</span>
                  <span className="font-mono-num">₱{incomeStatement.factoryOverhead.plantElectricity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Sanitation & Food Grade Chemicals</span>
                  <span className="font-mono-num">₱{incomeStatement.factoryOverhead.plantSanitation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-400 text-xs">
                  <span>Rotary Oven & Spiral Mixer Maintenance</span>
                  <span className="font-mono-num">₱{incomeStatement.factoryOverhead.machineMaintenance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-300 pl-4 border-t border-slate-800/60 pt-0.5">
                  <span>Total Factory Overhead</span>
                  <span className="font-mono-num">₱{incomeStatement.factoryOverhead.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Total COGM */}
              <div className="flex justify-between font-semibold text-amber-300 bg-amber-950/30 p-2.5 rounded border border-amber-800/40 mt-2">
                <span>TOTAL COST OF GOODS MANUFACTURED (COGM)</span>
                <span className="font-mono-num">₱{incomeStatement.cogm.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between font-bold text-white text-base border-t-2 border-slate-700 pt-2 pl-2">
                <span>GROSS MANUFACTURING PROFIT ({incomeStatement.grossMarginPct}%)</span>
                <span className="font-mono-num text-emerald-400">₱{incomeStatement.grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-1.5 pt-3 border-t border-slate-800">
              <div className="font-bold text-slate-300 text-xs tracking-wider uppercase">OPERATING & ADMINISTRATIVE EXPENSES</div>
              <div className="flex justify-between pl-4 text-slate-400 text-xs">
                <span>Administrative Salaries & Store Supervisors</span>
                <span className="font-mono-num">₱{incomeStatement.operatingExpenses.adminSalaries.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-400 text-xs">
                <span>Employer Statutory Contributions (SSS, PHIC, HDMF)</span>
                <span className="font-mono-num">₱{incomeStatement.operatingExpenses.statutoryBenefitsER.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-400 text-xs">
                <span>Delivery Van Fuel & Fleet Logistics</span>
                <span className="font-mono-num">₱{incomeStatement.operatingExpenses.deliveryFuel.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-400 text-xs">
                <span>Retail Outlet Building Lease & Rental</span>
                <span className="font-mono-num">₱{incomeStatement.operatingExpenses.rent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-400 text-xs">
                <span>Store Utilities & Telecom</span>
                <span className="font-mono-num">₱{incomeStatement.operatingExpenses.storeUtilities.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pl-4 text-slate-400 text-xs">
                <span>Bakery Equipment & Vehicle Depreciation</span>
                <span className="font-mono-num">₱{incomeStatement.operatingExpenses.depreciation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-300 border-t border-slate-800 pt-1 pl-2">
                <span>TOTAL OPERATING EXPENSES</span>
                <span className="font-mono-num text-rose-400">₱{incomeStatement.operatingExpenses.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Net Operating Income */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex justify-between items-center mt-6">
              <div>
                <div className="text-xs uppercase font-semibold text-slate-400">NET OPERATING INCOME (EBIT)</div>
                <div className="text-xs text-slate-400">Transferable to Owner's Equity ({incomeStatement.netProfitMarginPct}% Net Margin)</div>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono-num">
                ₱{incomeStatement.netOperatingIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)   */}
      {/* ---------------------------------------------------- */}
      {reportTab === 'BALANCE_SHEET' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 space-y-6">
          <div className="text-center border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">JANG-JANG BAKESHOP</h2>
            <div className="text-sm font-semibold text-amber-400 mt-0.5">
              Statement of Financial Position (Balance Sheet)
            </div>
            <div className="text-xs text-slate-400">
              As of January 31, 2025 | PFRS for SMEs Standard
            </div>
          </div>

          {/* Equilibrium Check Ribbon */}
          <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
            balanceSheet.isBalanced
              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-600/50 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 shrink-0" />
              <span>
                <strong>Fundamental Accounting Equation:</strong> Total Assets = Total Liabilities + Owner's Equity
              </span>
            </div>
            <div className="font-mono font-semibold">
              {balanceSheet.isBalanced ? 'Balanced (Δ = ₱0.00)' : `Discrepancy: ₱${balanceSheet.imbalance.toFixed(2)}`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            {/* ASSETS */}
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                <span className="font-bold text-white uppercase text-xs">ASSETS</span>
                <span className="text-xs text-slate-400 font-mono">Current & Non-Current</span>
              </div>

              {/* Current Assets */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-400 text-xs">Current Assets:</div>
                {currentAssets.map(item => (
                  <div key={item.account_code} className="flex justify-between pl-3 text-xs text-slate-300">
                    <span>{item.account_name}</span>
                    <span className="font-mono-num">
                      {item.normal_balance === 'DEBIT'
                        ? `₱${item.debit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : `(₱${item.credit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })})`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Non-Current Assets */}
              <div className="space-y-1.5 pt-2">
                <div className="font-semibold text-slate-400 text-xs">Property, Plant & Equipment (Net):</div>
                {nonCurrentAssets.map(item => (
                  <div key={item.account_code} className="flex justify-between pl-3 text-xs text-slate-300">
                    <span>{item.account_name}</span>
                    <span className="font-mono-num">
                      {item.normal_balance === 'DEBIT'
                        ? `₱${item.debit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : `(₱${item.credit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })})`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between font-bold text-white text-base">
                <span>TOTAL ASSETS</span>
                <span className="font-mono-num text-emerald-400">₱{balanceSheet.totalAssets.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* LIABILITIES & OWNER'S EQUITY */}
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                <span className="font-bold text-white uppercase text-xs">LIABILITIES & EQUITY</span>
                <span className="text-xs text-slate-400 font-mono">Claims on Assets</span>
              </div>

              {/* Current Liabilities */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-400 text-xs">Current Liabilities & Statutory Payables:</div>
                {balanceSheet.liabilityRows.map(item => (
                  <div key={item.account_code} className="flex justify-between pl-3 text-xs text-slate-300">
                    <span>{item.account_name}</span>
                    <span className="font-mono-num">₱{item.credit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium text-slate-200 pl-2 border-t border-slate-800 pt-1 text-xs">
                  <span>Total Liabilities</span>
                  <span className="font-mono-num">₱{balanceSheet.totalLiabilities.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Owner's Equity */}
              <div className="space-y-1.5 pt-2">
                <div className="font-semibold text-slate-400 text-xs">Owner's Equity:</div>
                {balanceSheet.equityRows.map(item => (
                  <div key={item.account_code} className="flex justify-between pl-3 text-xs text-slate-300">
                    <span>{item.account_name}</span>
                    <span className="font-mono-num">₱{item.credit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between pl-3 text-xs text-emerald-400 font-medium">
                  <span>Current Period Net Operating Income</span>
                  <span className="font-mono-num">₱{balanceSheet.currentPeriodNetIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-200 pl-2 border-t border-slate-800 pt-1 text-xs">
                  <span>Total Owner's Equity</span>
                  <span className="font-mono-num">₱{balanceSheet.totalEquity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between font-bold text-white text-base">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono-num text-emerald-400">₱{balanceSheet.totalLiabilitiesAndEquity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. TRIAL BALANCE                                     */}
      {/* ---------------------------------------------------- */}
      {reportTab === 'TRIAL_BALANCE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">General Ledger Trial Balance</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verification of double-entry mathematical equality across all chart of accounts.
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              trialBalance.isBalanced ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              {trialBalance.isBalanced ? 'Trial Balance in Absolute Equilibrium (Δ = ₱0.00)' : `Imbalance: ₱${trialBalance.discrepancy}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Title</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Normal</th>
                  <th className="py-3 px-4 text-right">Debit Activity</th>
                  <th className="py-3 px-4 text-right">Credit Activity</th>
                  <th className="py-3 px-4 text-right text-emerald-400">Debit Balance</th>
                  <th className="py-3 px-4 text-right text-emerald-400">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {trialBalance.rows.map(row => (
                  <tr key={row.account_code} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-amber-400">{row.account_code}</td>
                    <td className="py-2.5 px-4 font-medium text-white">{row.account_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {row.account_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400">{row.normal_balance}</td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-400">
                      ₱{row.total_debit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-400">
                      ₱{row.total_credit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-white font-medium">
                      {row.debit_balance > 0 ? `₱${row.debit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-white font-medium">
                      {row.credit_balance > 0 ? `₱${row.credit_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/90 font-bold text-white border-t-2 border-slate-700">
                  <td colSpan={6} className="py-3.5 px-4 uppercase text-right tracking-wider text-xs">
                    GRAND TOTALS & EQUILIBRIUM:
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-emerald-400 text-sm">
                    ₱{trialBalance.totalDebits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-emerald-400 text-sm">
                    ₱{trialBalance.totalCredits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. GENERAL LEDGER RUNNING BALANCE                    */}
      {/* ---------------------------------------------------- */}
      {reportTab === 'GENERAL_LEDGER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">General Ledger Account Inquiry</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail with chronological journal line postings and real-time running balance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-400">Select Account:</label>
              <select
                value={selectedGlAccount}
                onChange={e => setSelectedGlAccount(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-mono"
              >
                {accounts.map(acc => (
                  <option key={acc.account_code} value={acc.account_code}>
                    {acc.account_code} - {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {glData && (
            <div>
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80 flex flex-wrap justify-between items-center text-xs mb-4">
                <div>
                  <span className="text-slate-400">Account: </span>
                  <strong className="text-amber-400 font-mono">{glData.account.account_code}</strong> - {glData.account.account_name}
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-400">Normal Balance: </span>
                    <strong className="text-slate-200">{glData.account.normal_balance}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Ending Balance: </span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      ₱{glData.endingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">JE Number</th>
                      <th className="py-2.5 px-3">Ref Doc</th>
                      <th className="py-2.5 px-4">Description / Memo</th>
                      <th className="py-2.5 px-3">Cost Center</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                      <th className="py-2.5 px-3 text-right">Credit</th>
                      <th className="py-2.5 px-4 text-right text-emerald-400">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {glData.records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No posted transactions recorded for this account.
                        </td>
                      </tr>
                    ) : (
                      glData.records.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono text-slate-400">{rec.date}</td>
                          <td className="py-2 px-3 font-mono text-amber-400">{rec.entry_number}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{rec.reference_doc}</td>
                          <td className="py-2 px-4 text-slate-200">{rec.description}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                              {rec.cost_center_code}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num text-slate-300">
                            {rec.debit > 0 ? `₱${rec.debit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num text-slate-300">
                            {rec.credit > 0 ? `₱${rec.credit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2 px-4 text-right font-mono-num font-bold text-emerald-400">
                            ₱{rec.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. BIR TAX CENTER (FORMS 2550Q, 1701Q, 1601-C)       */}
      {/* ---------------------------------------------------- */}
      {reportTab === 'BIR_TAX' && (
        <div className="space-y-6">
          {/* BIR Header */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Bureau of Internal Revenue (BIR)
                </span>
                <span className="text-xs text-slate-400 font-mono">TIN: 000-000-000-0000 (VAT Registered)</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-1">
                Philippine SME Statutory Tax Compliance Center
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated preparation for BIR Form 2550Q (VAT), 1701Q (Quarterly Income Tax), and 1601-C (Compensation WTax).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Quarter:</label>
              <select
                value={taxQuarter}
                onChange={e => setTaxQuarter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="Q1 2025">Q1 2025 (Jan - Mar)</option>
                <option value="Q2 2025">Q2 2025 (Apr - Jun)</option>
                <option value="Q3 2025">Q3 2025 (Jul - Sep)</option>
                <option value="Q4 2025">Q4 2025 (Oct - Dec)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* BIR Form 2550Q Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400">BIR FORM 2550Q</span>
                    <h3 className="text-base font-bold text-white">Quarterly Value-Added Tax</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    12% VAT
                  </span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                  <div className="flex justify-between pt-1 text-slate-400">
                    <span>Total Vatable Sales:</span>
                    <span className="font-mono-num text-white">₱{bir2550Q.total_vatable_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300 font-medium">
                    <span>Output Tax (12%):</span>
                    <span className="font-mono-num text-amber-400">₱{bir2550Q.output_vat_12.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-400">
                    <span>Creditable Input Tax (Materials & Fuel):</span>
                    <span className="font-mono-num text-rose-300">₱{bir2550Q.total_input_vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="text-xs uppercase font-semibold text-slate-400">Net VAT Payable:</div>
                  <div className="text-lg font-black text-emerald-400 font-mono-num">
                    ₱{bir2550Q.net_vat_payable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Due 25 days following the close of taxable quarter.
                </div>
              </div>
            </div>

            {/* BIR Form 1701Q Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400">BIR FORM 1701Q</span>
                    <h3 className="text-base font-bold text-white">Quarterly Income Tax (Sole Prop)</h3>
                  </div>
                  <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700 text-[10px]">
                    <button
                      onClick={() => setOsdMethod('OSD')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${osdMethod === 'OSD' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      40% OSD
                    </button>
                    <button
                      onClick={() => setOsdMethod('ITEMIZED')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${osdMethod === 'ITEMIZED' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Itemized
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                  <div className="flex justify-between pt-1 text-slate-400">
                    <span>Gross Sales:</span>
                    <span className="font-mono-num text-white">₱{bir1701Q.gross_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-400">
                    <span>Cost of Goods Sold:</span>
                    <span className="font-mono-num text-slate-300">₱{bir1701Q.cost_of_sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-400">
                    <span>Deduction ({osdMethod === 'OSD' ? '40% OSD' : 'Itemized OPEX'}):</span>
                    <span className="font-mono-num text-rose-300">
                      ₱{(osdMethod === 'OSD' ? bir1701Q.osd_deduction : bir1701Q.itemized_deduction).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300 font-medium">
                    <span>Net Taxable Income:</span>
                    <span className="font-mono-num text-white">₱{bir1701Q.net_taxable_income.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="text-xs uppercase font-semibold text-slate-400">Quarterly Tax Due:</div>
                  <div className="text-lg font-black text-emerald-400 font-mono-num">
                    ₱{bir1701Q.tax_due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Computed using Philippine Graduated Tax Tables (TRAIN Law).
                </div>
              </div>
            </div>

            {/* BIR Form 1601-C Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-400">BIR FORM 1601-C</span>
                    <h3 className="text-base font-bold text-white">Compensation Withholding Tax</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Monthly
                  </span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                  <div className="flex justify-between pt-1 text-slate-400">
                    <span>Total Compensation Paid:</span>
                    <span className="font-mono-num text-white">₱{bir1601C.total_compensation_paid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-400">
                    <span>Statutory Min Wage Exempt:</span>
                    <span className="font-mono-num text-slate-300">₱{bir1601C.statutory_minimum_wage_exempt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-400">
                    <span>Non-Taxable Statutory Deductions:</span>
                    <span className="font-mono-num text-slate-300">₱{bir1601C.employee_statutory_contributions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300 font-medium">
                    <span>Total Taxable Compensation:</span>
                    <span className="font-mono-num text-white">₱{bir1601C.total_taxable_compensation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="text-xs uppercase font-semibold text-slate-400">Tax Withheld & Due:</div>
                  <div className="text-lg font-black text-emerald-400 font-mono-num">
                    ₱{bir1601C.tax_required_to_be_withheld.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Due on or before the 10th day of the following month.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. COST CENTER ANALYSIS                              */}
      {/* ---------------------------------------------------- */}
      {reportTab === 'COST_CENTERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">Cost Center & Manufacturing Expense Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Absorption costing breakdown allocated across production plants, retail outlets, logistics, and administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {costCenters.map(cc => {
              const totalDebitsAll = costCenters.reduce((s, c) => s + c.debits, 0) || 1;
              const sharePercent = Math.round((cc.debits / totalDebitsAll) * 100);

              return (
                <div key={cc.code} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-400">{cc.code}</span>
                      <h4 className="font-semibold text-white text-sm">{cc.name}</h4>
                    </div>
                    <span className="text-xs bg-slate-700 px-2.5 py-0.5 rounded text-slate-200 font-mono font-semibold">
                      {sharePercent}% of Total
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Posted Debits Volume:</span>
                    <span className="text-white font-bold font-mono-num text-sm">
                      ₱{cc.debits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, sharePercent))}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>{cc.entriesCount} journal entries recorded</span>
                    <span>Cost driver: {cc.code === 'IND-PLANT' ? 'Flour & Oven Labor' : cc.code === 'LOG-DELIV' ? 'Distribution Fleet' : 'Retail POS / Admin'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
