import React, { useState, useMemo } from 'react';
import { db } from '../services/db';
import { Account, AccountType } from '../types/accounting';
import { Search, Plus, Filter, BookOpen, Check, Layers, AlertCircle } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(() => db.getAccounts());

  // Form state
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('ASSET');
  const [normalBalance, setNormalBalance] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [category, setCategory] = useState('Current Assets');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch =
        acc.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || acc.account_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [accounts, searchTerm, typeFilter]);

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accountCode.trim() || !accountName.trim()) {
      setErrorMsg('Account code and account name are required.');
      return;
    }

    if (accounts.some(a => a.account_code === accountCode.trim())) {
      setErrorMsg(`Account code ${accountCode} already exists in the Chart of Accounts.`);
      return;
    }

    const newAcc: Account = {
      account_code: accountCode.trim(),
      account_name: accountName.trim(),
      account_type: accountType,
      normal_balance: normalBalance,
      category: category.trim(),
      description: description.trim(),
      is_active: true
    };

    db.addAccount(newAcc);
    setAccounts(db.getAccounts());
    setShowAddModal(false);
    // Reset form
    setAccountCode('');
    setAccountName('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
              PFRS Standard COA
            </span>
            <span className="text-xs text-slate-400">COA-2015 Revised Structure</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Chart of Accounts & General Ledger Mapping
          </h2>
          <p className="text-sm text-slate-400">
            Standard 5-digit accounts configured for Philippine food manufacturing, VAT compliance, and multi-branch retail.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 shadow transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Account
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by account code, name, or financial category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'OPEX'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                typeFilter === t
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
                <th className="py-3 px-4 w-24">Code</th>
                <th className="py-3 px-4">Account Title</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3">Financial Category</th>
                <th className="py-3 px-3 text-center">Normal Bal</th>
                <th className="py-3 px-4">Accounting Function</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching accounts found for query.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(acc => {
                  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (acc.account_type === 'ASSET') badgeColor = 'bg-blue-950 text-blue-300 border-blue-800/60';
                  if (acc.account_type === 'LIABILITY') badgeColor = 'bg-purple-950 text-purple-300 border-purple-800/60';
                  if (acc.account_type === 'EQUITY') badgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-800/60';
                  if (acc.account_type === 'REVENUE') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800/60';
                  if (acc.account_type === 'COGS') badgeColor = 'bg-amber-950 text-amber-300 border-amber-800/60';
                  if (acc.account_type === 'OPEX') badgeColor = 'bg-rose-950 text-rose-300 border-rose-800/60';

                  return (
                    <tr key={acc.account_code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{acc.account_code}</td>
                      <td className="py-3 px-4 font-medium text-white">{acc.account_name}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${badgeColor}`}>
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{acc.category}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          acc.normal_balance === 'DEBIT' ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {acc.normal_balance}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                        {acc.description || 'Standard general ledger line'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Create Chart of Accounts Title</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 bg-rose-950/80 border border-rose-600 p-3 rounded-lg text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Account Code (5-Digit)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10601"
                    value={accountCode}
                    onChange={e => setAccountCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={e => {
                      const t = e.target.value as AccountType;
                      setAccountType(t);
                      if (['ASSET', 'COGS', 'OPEX'].includes(t)) {
                        setNormalBalance('DEBIT');
                      } else {
                        setNormalBalance('CREDIT');
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="COGS">COGS (Manufacturing Cost)</option>
                    <option value="OPEX">OPEX (Operating Expense)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Account Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spiral Mixer Machinery - Indangan"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Normal Balance</label>
                  <select
                    value={normalBalance}
                    onChange={e => setNormalBalance(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Financial Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Property, Plant & Equipment"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Description / Memo</label>
                <textarea
                  rows={2}
                  placeholder="Explanation of purpose and tax deductibility..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium shadow cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
