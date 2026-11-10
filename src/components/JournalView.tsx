import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Printer,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { db } from '../services/db';
import { JournalEntry, JournalEntryLine, CostCenterCode } from '../types/accounting';

interface JournalViewProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  reversingTarget: JournalEntry | null;
  setReversingTarget: (entry: JournalEntry | null) => void;
  onRefresh: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  isModalOpen,
  setIsModalOpen,
  reversingTarget,
  setReversingTarget,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('ALL');
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  // New Journal Voucher Form State
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [referenceDoc, setReferenceDoc] = useState('');
  const [description, setDescription] = useState('');
  const [costCenter, setCostCenter] = useState<CostCenterCode>('IND-PLANT');
  const [payeeVendor, setPayeeVendor] = useState('');
  const [lines, setLines] = useState<Array<{ account_code: string; debit_amount: string; credit_amount: string; memo: string }>>([
    { account_code: '10301', debit_amount: '50000', credit_amount: '0', memo: 'Flour & sugar raw materials purchase' },
    { account_code: '10401', debit_amount: '6000', credit_amount: '0', memo: '12% Input VAT on ingredients' },
    { account_code: '20101', debit_amount: '0', credit_amount: '56000', memo: 'Trade payable to San Miguel Mills' }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Reversal Modal State
  const [reversalReason, setReversalReason] = useState('Correction of accounting period error');

  const accounts = db.getAccounts();
  const costCenters = db.getCostCenters();
  const allEntries = db.getJournalEntries();

  // Filter entries
  const filteredEntries = allEntries.filter(entry => {
    if (statusFilter !== 'ALL' && entry.status !== statusFilter) return false;
    if (costCenterFilter !== 'ALL' && entry.cost_center_code !== costCenterFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNum = entry.entry_number.toLowerCase().includes(q);
      const matchDesc = entry.description.toLowerCase().includes(q);
      const matchRef = (entry.reference_doc || '').toLowerCase().includes(q);
      const matchPayee = (entry.payee_vendor || '').toLowerCase().includes(q);
      if (!matchNum && !matchDesc && !matchRef && !matchPayee) return false;
    }
    return true;
  });

  // Calculate live debits and credits
  const sumDebits = lines.reduce((acc, l) => acc + (parseFloat(l.debit_amount) || 0), 0);
  const sumCredits = lines.reduce((acc, l) => acc + (parseFloat(l.credit_amount) || 0), 0);
  const roundedDebits = Math.round(sumDebits * 100) / 100;
  const roundedCredits = Math.round(sumCredits * 100) / 100;
  const discrepancy = Math.round(Math.abs(roundedDebits - roundedCredits) * 100) / 100;
  const isBalanced = discrepancy < 0.001 && roundedDebits > 0;

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      { account_code: '10102', debit_amount: '0', credit_amount: '0', memo: '' }
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) {
      alert("A double-entry journal voucher must contain at least 2 lines (debit and credit).");
      return;
    }
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: string) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      return { ...line, [field]: value };
    }));
  };

  const handleSubmit = (status: 'DRAFT' | 'POSTED') => {
    setFormError(null);
    if (!entryDate || !description.trim()) {
      setFormError("Please provide an entry date and description.");
      return;
    }

    if (status === 'POSTED' && !isBalanced) {
      setFormError(`Cannot post unbalanced entry! Total Debits (₱${roundedDebits.toLocaleString()}) does not match Total Credits (₱${roundedCredits.toLocaleString()}). Discrepancy: ₱${discrepancy.toFixed(2)}`);
      return;
    }

    try {
      const entryLines: JournalEntryLine[] = lines.map((l, idx) => ({
        id: crypto.randomUUID(),
        account_code: l.account_code,
        account_name: accounts.find(a => a.account_code === l.account_code)?.account_name,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        memo: l.memo || description,
        line_order: idx + 1
      }));

      db.saveJournalEntry({
        entry_date: entryDate,
        reference_doc: referenceDoc,
        description: description,
        status: status,
        cost_center_code: costCenter,
        payee_vendor: payeeVendor,
        created_by: 'CPA / Chief Bookkeeper',
        lines: entryLines
      });

      setIsModalOpen(false);
      setDescription('');
      setReferenceDoc('');
      setPayeeVendor('');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save journal voucher.');
    }
  };

  const handleExecuteReversal = () => {
    if (!reversingTarget) return;
    try {
      db.reverseJournalEntry(reversingTarget.id, reversalReason);
      setReversingTarget(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const fmt = (num: number) => `₱${(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Module Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            General Journal & Double-Entry Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Immutable PRISMER Double-Entry Journal Engine with live debit/credit balancing & reversing entry support
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-emerald-950 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal Voucher</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by JE number, description, invoice #, payee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="POSTED">POSTED (Immutable)</option>
            <option value="DRAFT">DRAFT</option>
            <option value="VOID">VOID</option>
          </select>

          <select
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Cost Centers</option>
            {costCenters.map(cc => (
              <option key={cc.code} value={cc.code}>{cc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Journal Vouchers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Entry Number</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Ref Doc / Invoice</th>
                <th className="py-3 px-3">Description & Payee</th>
                <th className="py-3 px-3">Cost Center</th>
                <th className="py-3 px-3 text-right">Debit = Credit</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEntries.map(entry => {
                const isExpanded = !!expandedEntries[entry.id];
                return (
                  <React.Fragment key={entry.id}>
                    <tr className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="p-1 rounded text-slate-500 hover:text-slate-300 transition"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-emerald-400 whitespace-nowrap">
                        {entry.entry_number}
                        {entry.is_reversing && (
                          <span className="ml-1.5 text-[9px] uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            REV
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-mono whitespace-nowrap">{entry.entry_date}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {entry.reference_doc || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        <div className="font-medium text-slate-100">{entry.description}</div>
                        {entry.payee_vendor && (
                          <div className="text-[11px] text-slate-400 mt-0.5">Payee: {entry.payee_vendor}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {entry.cost_center_code}
                      </td>
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
                            onClick={() => setReversingTarget(entry)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition text-[11px]"
                            title="Generate Reversing Adjusting Entry"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Collapsible Line Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-950/60">
                        <td colSpan={9} className="p-4 pl-12 border-b border-slate-800">
                          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Journal Voucher Atomic Debits & Credits ({entry.lines.length} lines)</span>
                              <span className="font-mono text-emerald-400">Created by: {entry.created_by}</span>
                            </div>
                            <table className="w-full text-left text-xs">
                              <thead className="text-slate-400 text-[10px] uppercase border-b border-slate-800/80">
                                <tr>
                                  <th className="py-1 px-2">Account Code</th>
                                  <th className="py-1 px-2">Account Title</th>
                                  <th className="py-1 px-2">Memo / Line Narration</th>
                                  <th className="py-1 px-2 text-right">Debit (₱)</th>
                                  <th className="py-1 px-2 text-right">Credit (₱)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/40">
                                {entry.lines.map((line, idx) => {
                                  const acc = accounts.find(a => a.account_code === line.account_code);
                                  return (
                                    <tr key={line.id || idx}>
                                      <td className="py-2 px-2 font-mono text-emerald-400 font-semibold">{line.account_code}</td>
                                      <td className="py-2 px-2 text-slate-200">{acc?.account_name || line.account_name}</td>
                                      <td className="py-2 px-2 text-slate-400 italic">{line.memo || '-'}</td>
                                      <td className="py-2 px-2 text-right font-mono font-medium text-white">
                                        {line.debit_amount > 0 ? fmt(line.debit_amount) : '-'}
                                      </td>
                                      <td className="py-2 px-2 text-right font-mono font-medium text-slate-300">
                                        {line.credit_amount > 0 ? fmt(line.credit_amount) : '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW JOURNAL ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Record New Journal Voucher (PRISMER Engine)
                </h3>
                <p className="text-xs text-slate-400">Strict PFRS Double-Entry validation enforced</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Header Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Entry Date *</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Reference Doc (PO / SI / OR)</label>
                <input
                  type="text"
                  placeholder="e.g. SI-9921, Check #104"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Cost Center</label>
                <select
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value as CostCenterCode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {costCenters.map(cc => (
                    <option key={cc.code} value={cc.code}>{cc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Payee / Vendor / Client</label>
                <input
                  type="text"
                  placeholder="e.g. San Miguel Mills"
                  value={payeeVendor}
                  onChange={(e) => setPayeeVendor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium text-xs mb-1">General Description / Narration *</label>
              <input
                type="text"
                placeholder="e.g. Purchase of 100 sacks Hard Wheat Flour and payment of 12% Input VAT"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Dynamic Lines Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Journal Voucher Lines (Atomic Debits & Credits)</span>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 w-1/3">Account Code & Title</th>
                      <th className="py-2 px-3 w-1/3">Memo / Specific Narration</th>
                      <th className="py-2 px-3 text-right">Debit (₱)</th>
                      <th className="py-2 px-3 text-right">Credit (₱)</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3">
                          <select
                            value={line.account_code}
                            onChange={(e) => updateLine(idx, 'account_code', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                          >
                            {accounts.map(acc => (
                              <option key={acc.account_code} value={acc.account_code}>
                                {acc.account_code} - {acc.account_name} ({acc.account_type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Line memo"
                            value={line.memo}
                            onChange={(e) => updateLine(idx, 'memo', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.debit_amount}
                            onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)}
                            className="w-28 text-right bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.credit_amount}
                            onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)}
                            className="w-28 text-right bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PRISMER Double-Entry Balancing Engine Live Status Box */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isBalanced
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                {isBalanced ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>{isBalanced ? 'BALANCED: Double-Entry Verified' : 'UNBALANCED ENTRY'}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40">
                      PRISMER Rule Δ = {discrepancy.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mt-0.5">
                    {isBalanced
                      ? 'Total Debits equal Total Credits. Entry is certified ready for posting to the General Ledger.'
                      : `Difference of ₱${discrepancy.toFixed(2)} detected. Debits and Credits must be identical to post.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Total Debits</div>
                  <div className="font-bold text-base text-white">{fmt(roundedDebits)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase">Total Credits</div>
                  <div className="font-bold text-base text-white">{fmt(roundedCredits)}</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/30 font-semibold text-xs transition"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={!isBalanced}
                onClick={() => handleSubmit('POSTED')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  isBalanced
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Post to General Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVERSAL CONFIRMATION MODAL */}
      {reversingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                Generate Reversing Adjusting Entry
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              In accordance with Philippine Financial Reporting Standards (PFRS for SMEs), posted journal entries are immutable. This action will create and immediately post a linked reversing voucher with swapped debits and credits:
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
              <div>Target Entry: <strong className="text-emerald-400">{reversingTarget.entry_number}</strong></div>
              <div>Amount: <strong className="text-white">{fmt(reversingTarget.total_amount)}</strong></div>
              <div>Description: <span className="text-slate-400">{reversingTarget.description}</span></div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1 font-medium">Reason for Reversal / Correction</label>
              <input
                type="text"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReversingTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReversal}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm & Post Reversal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
