import React, { useState } from 'react';
import { db } from '../services/db';
import { Database, Copy, Check, Download, Terminal, Layers } from 'lucide-react';

interface D1SqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const D1SqlModal: React.FC<D1SqlModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'DUMP' | 'SCHEMA'>('DUMP');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlDump = db.exportD1SqlDump();
  const schemaSql = `-- ========================================================
-- CLOUDFLARE D1 RELATIONAL SCHEMA (Z-BOOKS)
-- Dialect: SQLite 3 / Strict Foreign Keys / Auto-Increment Triggers
-- ========================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cost_centers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  manager TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  account_code TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK(account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'OPEX')) NOT NULL,
  normal_balance TEXT CHECK(normal_balance IN ('DEBIT', 'CREDIT')) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entry_number TEXT UNIQUE NOT NULL,
  entry_date TEXT NOT NULL,
  reference_doc TEXT,
  description TEXT NOT NULL,
  status TEXT CHECK(status IN ('DRAFT', 'POSTED', 'VOID')) DEFAULT 'DRAFT',
  cost_center_code TEXT REFERENCES cost_centers(code),
  payee_vendor TEXT,
  total_amount REAL DEFAULT 0.00,
  is_reversing INTEGER DEFAULT 0,
  reversed_entry_id TEXT REFERENCES journal_entries(id),
  created_by TEXT NOT NULL,
  posted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT REFERENCES chart_of_accounts(account_code),
  debit_amount REAL DEFAULT 0.00 CHECK (debit_amount >= 0),
  credit_amount REAL DEFAULT 0.00 CHECK (credit_amount >= 0),
  memo TEXT,
  line_order INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  employee_id_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  station_role TEXT NOT NULL,
  cost_center_code TEXT REFERENCES cost_centers(code),
  employment_status TEXT CHECK(employment_status IN ('REGULAR', 'PROBATIONARY', 'CONTRACTUAL')) DEFAULT 'REGULAR',
  daily_rate REAL NOT NULL,
  monthly_basic_rate REAL NOT NULL,
  tin TEXT,
  sss_number TEXT,
  philhealth_number TEXT,
  pagibig_number TEXT,
  bank_account_number TEXT,
  hire_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  run_number TEXT UNIQUE NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  payout_date TEXT NOT NULL,
  cycle TEXT CHECK(cycle IN ('FIRST_HALF', 'SECOND_HALF', 'MONTHLY')) DEFAULT 'SECOND_HALF',
  status TEXT CHECK(status IN ('DRAFT', 'COMPUTED', 'DISBURSED', 'CANCELLED')) DEFAULT 'DRAFT',
  total_gross REAL DEFAULT 0.00,
  total_ee_deductions REAL DEFAULT 0.00,
  total_er_contributions REAL DEFAULT 0.00,
  total_net REAL DEFAULT 0.00,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

  const currentContent = activeTab === 'DUMP' ? sqlDump : schemaSql;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const filename = activeTab === 'DUMP' ? 'zbooks_d1_dump.sql' : 'schema.sql';
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-6 text-white shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Cloudflare D1 SQL Schema & Live Dump</h3>
              <p className="text-xs text-slate-400">
                Serverless distributed SQLite database statements for local CLI or Cloudflare deployment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-base cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('DUMP')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'DUMP' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live D1 State Dump (INSERT Statements)
            </button>
            <button
              onClick={() => setActiveTab('SCHEMA')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'SCHEMA' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              DDL Schema (schema.sql)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy SQL'}
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .sql
            </button>
          </div>
        </div>

        {/* CLI Instructions Ribbon */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg text-[11px] text-slate-400 flex items-center gap-2 mb-3 font-mono">
          <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Execute in terminal: <code className="text-amber-300">npx wrangler d1 execute zbooks-db --file=./schema.sql</code></span>
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 border border-slate-800">
          <pre className="whitespace-pre-wrap select-all">{currentContent}</pre>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Lines: {currentContent.split('\n').length} | Zero Cloud Costs (Cloudflare Free Tier)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
