import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JournalView } from './components/JournalView';
import { PayrollView } from './components/PayrollView';
import { ReportsView } from './components/ReportsView';
import { AccountsView } from './components/AccountsView';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { D1SqlModal } from './components/D1SqlModal';
import { JournalEntry } from './types/accounting';
import { initAuth, logoutGoogle, auth } from './services/driveSync';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'payroll' | 'reports' | 'accounts' | 'd1'>('dashboard');
  const [googleUser, setGoogleUser] = useState<User | null>(auth?.currentUser || null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isD1ModalOpen, setIsD1ModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [reversingTarget, setReversingTarget] = useState<JournalEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = initAuth(
      user => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNewJournal = () => {
    setActiveTab('journal');
    setIsJournalModalOpen(true);
  };

  const handleReverseEntry = (entry: JournalEntry) => {
    setActiveTab('journal');
    setReversingTarget(entry);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        googleUser={googleUser}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onLogoutGoogle={async () => {
          await logoutGoogle();
          setGoogleUser(null);
        }}
        onOpenD1Modal={() => setIsD1ModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6" key={refreshKey}>
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={tab => setActiveTab(tab)}
            onNewJournal={handleNewJournal}
            onReverseEntry={handleReverseEntry}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            isModalOpen={isJournalModalOpen}
            setIsModalOpen={setIsJournalModalOpen}
            reversingTarget={reversingTarget}
            setReversingTarget={setReversingTarget}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollView
            onEntryPosted={handleRefresh}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}

        {activeTab === 'accounts' && (
          <AccountsView />
        )}

        {activeTab === 'd1' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-2">Cloudflare D1 Serverless SQLite Console</h2>
              <p className="text-sm text-slate-400 mb-4">
                View D1 relational DDL schema and live SQL dumps of all bakeshop journal entries, employees, and accounts.
              </p>
              <button
                onClick={() => setIsD1ModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                Launch D1 SQL Terminal & Dump Inspector
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Cloud & Data Modals */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />

      <D1SqlModal
        isOpen={isD1ModalOpen}
        onClose={() => setIsD1ModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Z-Books</strong> — Philippine SME Manufacturing & Retail Accounting System
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            TIN: 000-000-000-0000 | Indangan & Sasa Outlets | Cloudflare D1 Zero-Cost Stack
          </div>
        </div>
      </footer>
    </div>
  );
}
