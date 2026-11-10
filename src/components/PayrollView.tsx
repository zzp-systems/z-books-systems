import React, { useState, useMemo } from 'react';
import { db } from '../services/db';
import { Employee, TimekeepingRecord, PayrollComputedItem, PayrollRun } from '../types/accounting';
import { computeEmployeePayrollItem, generatePayrollJournalLines } from '../services/statutoryEngine';
import {
  Users,
  Calculator,
  CheckCircle2,
  Printer,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';

interface PayrollViewProps {
  onEntryPosted?: () => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({ onEntryPosted }) => {
  const employees = db.getEmployees();
  const [periodStart, setPeriodStart] = useState('2025-01-16');
  const [periodEnd, setPeriodEnd] = useState('2025-01-31');
  const [payoutDate, setPayoutDate] = useState('2025-01-31');
  const [cycle] = useState<'SECOND_HALF'>('SECOND_HALF');

  // Timekeeping records state initialized with realistic bakeshop values
  const [timekeeping, setTimekeeping] = useState<Record<string, TimekeepingRecord>>(() => {
    const init: Record<string, TimekeepingRecord> = {};
    employees.forEach((emp, idx) => {
      // Default to 13 days in a 15-day semi-monthly period (allowing for 2 rest days)
      init[emp.id] = {
        employee_id: emp.id,
        days_worked: 13,
        ot_hours: idx === 0 ? 8 : (idx === 1 ? 5 : 2),
        tardy_minutes: idx === 1 ? 18 : 0, // Employee 2 has tardiness
        undertime_minutes: 0,
        awol_days: 0
      };
    });
    return init;
  });

  const [activePayslipItem, setActivePayslipItem] = useState<PayrollComputedItem | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'RUNNER' | 'HISTORY'>('RUNNER');

  const updateTimekeeping = (empId: string, field: keyof TimekeepingRecord, value: number) => {
    setTimekeeping(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: Math.max(0, value)
      }
    }));
  };

  // Real-time computed payroll items
  const computedItems: PayrollComputedItem[] = useMemo(() => {
    return employees.map(emp => {
      const tk = timekeeping[emp.id] || {
        employee_id: emp.id,
        days_worked: 13,
        ot_hours: 0,
        tardy_minutes: 0,
        undertime_minutes: 0,
        awol_days: 0
      };
      return computeEmployeePayrollItem(emp, tk, cycle);
    });
  }, [employees, timekeeping, cycle]);

  // Aggregate totals
  const totals = useMemo(() => {
    let gross = 0;
    let eeDeductions = 0;
    let erContributions = 0;
    let net = 0;
    let sssEe = 0;
    let phicEe = 0;
    let hdmfEe = 0;
    let wtax = 0;
    let bonus = 0;

    for (const item of computedItems) {
      gross += item.gross_pay;
      eeDeductions += item.total_deductions;
      erContributions += item.total_statutory_er;
      net += item.net_pay;
      sssEe += item.sss_ee;
      phicEe += item.philhealth_ee;
      hdmfEe += item.pagibig_ee;
      wtax += item.withholding_tax;
      bonus += item.perfect_attendance_bonus;
    }

    return {
      gross: Math.round(gross * 100) / 100,
      eeDeductions: Math.round(eeDeductions * 100) / 100,
      erContributions: Math.round(erContributions * 100) / 100,
      net: Math.round(net * 100) / 100,
      sssEe: Math.round(sssEe * 100) / 100,
      phicEe: Math.round(phicEe * 100) / 100,
      hdmfEe: Math.round(hdmfEe * 100) / 100,
      wtax: Math.round(wtax * 100) / 100,
      bonus: Math.round(bonus * 100) / 100
    };
  }, [computedItems]);

  const handlePostToGeneralLedger = () => {
    try {
      const runNumber = `PR-${periodEnd.replace(/-/g, '').slice(0, 6)}-01`;

      // 1. Generate balanced compound journal lines
      const compoundLines = generatePayrollJournalLines(computedItems, runNumber);

      // 2. Post Journal Entry to GL
      const postResult = db.saveJournalEntry({
        entry_date: payoutDate,
        reference_doc: runNumber,
        description: `Semi-Monthly Plant & Admin Payroll Disbursement (${periodStart} to ${periodEnd})`,
        status: 'POSTED',
        cost_center_code: 'IND-PLANT',
        payee_vendor: 'BDO Payroll Direct Deposit',
        created_by: 'Z-Books Payroll Engine',
        lines: compoundLines
      });

      // 3. Save Payroll Run record
      const payrollRun: PayrollRun = {
        id: crypto.randomUUID(),
        run_number: runNumber,
        period_start: periodStart,
        period_end: periodEnd,
        payout_date: payoutDate,
        cycle,
        status: 'DISBURSED',
        total_gross: totals.gross,
        total_ee_deductions: totals.eeDeductions,
        total_er_contributions: totals.erContributions,
        total_net: totals.net,
        journal_entry_id: postResult.entry.id,
        items: computedItems,
        created_at: new Date().toISOString()
      };

      db.savePayrollRun(payrollRun);

      setSuccessBanner(`Success! Payroll Run ${runNumber} disbursed and posted to General Ledger under Entry ${postResult.entry.entry_number}. Compound entries balanced.`);
      if (onEntryPosted) onEntryPosted();

      setTimeout(() => setSuccessBanner(null), 8000);
    } catch (err: unknown) {
      alert(`Error posting payroll: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const payrollHistory = db.getPayrollRuns();

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              TRAIN Law & 2025/2026 Mandates
            </span>
            <span className="text-xs text-slate-400">PFRS for SMEs Direct Labor Allocation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Plant & Admin Payroll Management
          </h2>
          <p className="text-sm text-slate-400">
            Automated SSS (14%), PhilHealth (5%), HDMF, and Plant Attendance Rule Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex text-xs font-medium">
            <button
              onClick={() => setActiveTab('RUNNER')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'RUNNER' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Payroll Runner
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'HISTORY' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Disbursement History ({payrollHistory.length})
            </button>
          </div>
        </div>
      </div>

      {successBanner && (
        <div className="bg-emerald-950/80 border border-emerald-600/60 p-4 rounded-xl text-emerald-200 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">{successBanner}</span>
          </div>
        </div>
      )}

      {activeTab === 'RUNNER' ? (
        <>
          {/* Period Parameters Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Period Start</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={periodStart}
                    onChange={e => setPeriodStart(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Period End</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={e => setPeriodEnd(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payout / GL Posting Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={payoutDate}
                    onChange={e => setPayoutDate(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handlePostToGeneralLedger}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Disburse & Post to GL
                </button>
              </div>
            </div>

            {/* Attendance Rule Alert Ribbon */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  <strong className="text-slate-200">Plant Punctuality Policy:</strong> 5-minute grace period. Beyond 5 minutes, exact per-minute deduction applies. ₱1,000 perfect attendance bonus for zero infractions.
                </span>
              </div>
              <div className="text-slate-400 font-mono">
                Statutory: SSS 14% (4.5% EE / 9.5% ER) | PHIC 5% (2.5% EE / 2.5% ER) | HDMF ₱200 cap
              </div>
            </div>
          </div>

          {/* Aggregate Summary KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-400">Total Gross Pay</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono-num">
                ₱{totals.gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Includes ₱{totals.bonus.toLocaleString()} bonuses
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-400">Total EE Deductions</div>
              <div className="text-2xl font-bold text-rose-400 mt-1 font-mono-num">
                ₱{totals.eeDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                WTax: ₱{totals.wtax.toLocaleString()} | SSS: ₱{totals.sssEe.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-400">Employer Contributions</div>
              <div className="text-2xl font-bold text-amber-400 mt-1 font-mono-num">
                ₱{totals.erContributions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Company liability & statutory share
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-400">Total Net Disbursement</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono-num">
                ₱{totals.net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> BDO Current Acct Debit
              </div>
            </div>
          </div>

          {/* Interactive Timekeeping & Payroll Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Plant & Branch Staff Timekeeping & Statutory Worksheet
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust days worked, overtime, and tardiness to observe real-time statutory deductions and net wages.
                </p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
                {employees.length} Active Employees
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-700">
                    <th className="py-3 px-4">Employee / Station</th>
                    <th className="py-3 px-2 text-right">Daily Rate</th>
                    <th className="py-3 px-2 text-center w-20">Days</th>
                    <th className="py-3 px-2 text-center w-16">OT (Hrs)</th>
                    <th className="py-3 px-2 text-center w-20">Tardy (Min)</th>
                    <th className="py-3 px-2 text-right">Gross Pay</th>
                    <th className="py-3 px-2 text-right text-rose-400">SSS EE</th>
                    <th className="py-3 px-2 text-right text-rose-400">PHIC EE</th>
                    <th className="py-3 px-2 text-right text-rose-400">HDMF EE</th>
                    <th className="py-3 px-2 text-right text-rose-400">WTax</th>
                    <th className="py-3 px-4 text-right text-emerald-400 font-bold">Net Pay</th>
                    <th className="py-3 px-4 text-center">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {computedItems.map(item => {
                    const emp = employees.find(e => e.id === item.employee_id)!;
                    const tk = timekeeping[item.employee_id];
                    const isPlantLabor = ['Baker', 'Slicer', 'Wrapper', 'Oven Master', 'QA Inspector'].includes(item.station_role);

                    return (
                      <tr key={item.employee_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{item.employee_name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              isPlantLabor ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                            }`}>
                              {item.station_role}
                            </span>
                            <span>{item.cost_center_code}</span>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-right font-mono-num text-slate-300">
                          ₱{item.daily_rate.toLocaleString()}
                        </td>

                        {/* Interactive Days Input */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="16"
                            step="0.5"
                            value={tk?.days_worked ?? 13}
                            onChange={e => updateTimekeeping(item.employee_id, 'days_worked', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-white focus:outline-none focus:border-amber-500 font-mono-num"
                          />
                        </td>

                        {/* Interactive OT Input */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="40"
                            step="1"
                            value={tk?.ot_hours ?? 0}
                            onChange={e => updateTimekeeping(item.employee_id, 'ot_hours', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center text-white focus:outline-none focus:border-amber-500 font-mono-num"
                          />
                        </td>

                        {/* Interactive Tardiness Input */}
                        <td className="py-3 px-2 text-center">
                          <div className="relative inline-block">
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={tk?.tardy_minutes ?? 0}
                              onChange={e => updateTimekeeping(item.employee_id, 'tardy_minutes', parseFloat(e.target.value) || 0)}
                              className={`w-16 bg-slate-800 border rounded px-1.5 py-1 text-center font-mono-num focus:outline-none ${
                                (tk?.tardy_minutes || 0) > 5
                                  ? 'border-rose-500 text-rose-300'
                                  : (tk?.tardy_minutes || 0) > 0
                                  ? 'border-amber-500 text-amber-300'
                                  : 'border-slate-700 text-white'
                              }`}
                            />
                            {(tk?.tardy_minutes || 0) > 5 && (
                              <span className="block text-[9px] text-rose-400 mt-0.5">
                                -₱{item.tardiness_deduction.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-2 text-right font-mono-num text-white font-medium">
                          ₱{item.gross_pay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          {item.perfect_attendance_bonus > 0 && (
                            <span className="block text-[10px] text-emerald-400">+₱{item.perfect_attendance_bonus} bns</span>
                          )}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-num text-rose-400">
                          ₱{item.sss_ee.toFixed(2)}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-num text-rose-400">
                          ₱{item.philhealth_ee.toFixed(2)}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-num text-rose-400">
                          ₱{item.pagibig_ee.toFixed(2)}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-num text-rose-400">
                          ₱{item.withholding_tax.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono-num text-emerald-400 font-bold text-sm">
                          ₱{item.net_pay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setActivePayslipItem(item)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer"
                            title="Generate Printable Payslip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Historical Payroll Runs View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-semibold text-white text-sm">Disbursed Payroll Batches</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical statutory runs with linked General Ledger journal entry vouchers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
                  <th className="py-3 px-4">Run #</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Payout Date</th>
                  <th className="py-3 px-4 text-right">Total Gross</th>
                  <th className="py-3 px-4 text-right text-rose-400">Total Deductions</th>
                  <th className="py-3 px-4 text-right text-emerald-400">Net Disbursed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">GL Voucher ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {payrollHistory.map(run => (
                  <tr key={run.id} className="hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono font-medium text-amber-400">{run.run_number}</td>
                    <td className="py-3 px-4">{run.period_start} to {run.period_end}</td>
                    <td className="py-3 px-4">{run.payout_date}</td>
                    <td className="py-3 px-4 text-right font-mono-num font-medium text-white">
                      ₱{run.total_gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-rose-400">
                      ₱{run.total_ee_deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-emerald-400 font-bold">
                      ₱{run.total_net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {run.journal_entry_id ? run.journal_entry_id.slice(0, 12) + '...' : 'Direct GL Entry'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {activePayslipItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-300">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">JANG-JANG BAKESHOP</h3>
                  <p className="text-xs text-slate-500">VAT TIN: 000-000-000-0000 | Indangan, Davao City</p>
                  <p className="text-xs font-semibold text-amber-700 mt-1 uppercase tracking-wide">
                    Confidential Employee Payslip
                  </p>
                </div>
                <button
                  onClick={() => setActivePayslipItem(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div><strong>Employee:</strong> {activePayslipItem.employee_name}</div>
                <div><strong>ID:</strong> {activePayslipItem.employee_id_number}</div>
                <div><strong>Role:</strong> {activePayslipItem.station_role}</div>
                <div><strong>Cost Center:</strong> {activePayslipItem.cost_center_code}</div>
                <div><strong>Period:</strong> {periodStart} to {periodEnd}</div>
                <div><strong>Payout:</strong> {payoutDate}</div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">EARNINGS</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Basic Pay ({activePayslipItem.days_worked} days @ ₱{activePayslipItem.daily_rate}):</span>
                    <span className="font-mono">₱{activePayslipItem.basic_pay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overtime ({activePayslipItem.ot_hours} hrs):</span>
                    <span className="font-mono">₱{activePayslipItem.overtime_pay.toFixed(2)}</span>
                  </div>
                  {activePayslipItem.perfect_attendance_bonus > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Perfect Attendance Bonus:</span>
                      <span className="font-mono">₱{activePayslipItem.perfect_attendance_bonus.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t text-slate-900">
                    <span>Gross Earnings:</span>
                    <span className="font-mono">₱{activePayslipItem.gross_pay.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">DEDUCTIONS</h4>
                <div className="space-y-1">
                  {activePayslipItem.tardiness_deduction > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Tardiness ({activePayslipItem.tardy_minutes} min):</span>
                      <span className="font-mono">₱{activePayslipItem.tardiness_deduction.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>SSS EE Share:</span>
                    <span className="font-mono">₱{activePayslipItem.sss_ee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PhilHealth EE:</span>
                    <span className="font-mono">₱{activePayslipItem.philhealth_ee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pag-IBIG HDMF:</span>
                    <span className="font-mono">₱{activePayslipItem.pagibig_ee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TRAIN Withholding Tax:</span>
                    <span className="font-mono">₱{activePayslipItem.withholding_tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t text-rose-800">
                    <span>Total Deductions:</span>
                    <span className="font-mono">₱{activePayslipItem.total_deductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay Callout */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 my-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold text-emerald-800">NET TAKE-HOME PAY</div>
                <div className="text-xs text-emerald-600">Disbursed via BDO Payroll Transfer</div>
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                ₱{activePayslipItem.net_pay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Employer Contribution Transparency Section */}
            <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
              <span className="font-semibold text-slate-700">Employer Statutory Remittance (Company-Paid): </span>
              SSS ER: ₱{activePayslipItem.sss_er.toFixed(2)} | PHIC ER: ₱{activePayslipItem.philhealth_er.toFixed(2)} | HDMF ER: ₱{activePayslipItem.pagibig_er.toFixed(2)}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Official Payslip
              </button>
              <button
                onClick={() => setActivePayslipItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
