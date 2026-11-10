import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  FileText,
  Building2,
  Database,
  Cloud,
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'dashboard' | 'journal' | 'payroll' | 'reports' | 'accounts' | 'd1';
  setActiveTab: (tab: 'dashboard' | 'journal' | 'payroll' | 'reports' | 'accounts' | 'd1') => void;
  googleUser: User | null;
  onOpenDriveModal: () => void;
  onLogoutGoogle: () => void;
  onOpenD1Modal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  googleUser,
  onOpenDriveModal,
  onLogoutGoogle,
  onOpenD1Modal
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 no-print">
      {/* Top Utility Ribbon */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Z-Books Enterprise v2.4 (Cloudflare Free-Tier D1)
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-semibold">Entity:</span>
          <span className="text-amber-300 font-mono">Jang-Jang Bakeshop</span>
          <span className="text-slate-600">|</span>
          <span>TIN: <strong className="font-mono text-slate-200">000-000-000-0000</strong> (VAT-Registered)</span>
          <span className="text-slate-600">|</span>
          <span>Standard: <strong className="text-slate-200">PFRS for SMEs / Accrual Basis</strong></span>
        </div>

        <div className="flex items-center gap-3 mt-1 sm:mt-0">
          <button
            onClick={onOpenD1Modal}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs border border-slate-700"
            title="View Cloudflare D1 SQL Schema and Live Dump"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>D1 SQLite Dump</span>
          </button>

          {googleUser ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <button onClick={onOpenDriveModal} className="hover:underline font-mono text-xs">
                Drive: {googleUser.email?.split('@')[0]}
              </button>
              <button
                onClick={onLogoutGoogle}
                title="Disconnect Google Drive"
                className="text-slate-400 hover:text-red-400 ml-1"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 transition text-xs"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">Z-BOOKS</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PH SME
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Accounting & Payroll System</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'journal'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>General Journal</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'payroll'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Statutory Payroll</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'reports'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Financials & BIR Tax</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'accounts'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Chart of Accounts</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
