import React, { useState, useEffect } from 'react';
import {
  googleSignIn,
  logoutGoogle,
  uploadBackupToDrive,
  listDriveBackups,
  DriveFileItem,
  auth
} from '../services/driveSync';
import { db } from '../services/db';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileJson,
  FileCode,
  LogOut,
  User as UserIcon
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth?.currentUser || null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backups, setBackups] = useState<DriveFileItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged((user: FirebaseUser | null) => {
      setCurrentUser(user);
      if (user) {
        loadBackups();
      } else {
        setBackups([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadBackups = async () => {
    try {
      const files = await listDriveBackups();
      setBackups(files);
    } catch {
      // Ignore background refresh errors
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setStatusMessage(`Successfully authenticated as ${result.user.email}`);
        await loadBackups();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Google Drive authentication was not completed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setBackups([]);
      setStatusMessage('Signed out from Google Drive.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign out error');
    }
  };

  const handleBackupNow = async (format: 'JSON' | 'SQL') => {
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (format === 'JSON') {
        const payload = {
          entity: 'Jang-Jang Bakeshop',
          tin: '000-000-000-0000',
          exported_at: new Date().toISOString(),
          accounts: db.getAccounts(),
          cost_centers: db.getCostCenters(),
          employees: db.getEmployees(),
          journal_entries: db.getJournalEntries(),
          payroll_runs: db.getPayrollRuns()
        };
        const fileName = `ZBooks_Backup_JangJangBakeshop_${timestamp}.json`;
        await uploadBackupToDrive(fileName, JSON.stringify(payload, null, 2), 'application/json');
        setStatusMessage(`Backup successfully uploaded to Google Drive: ${fileName}`);
      } else {
        const sqlDump = db.exportD1SqlDump();
        const fileName = `ZBooks_D1_Dump_${timestamp}.sql`;
        await uploadBackupToDrive(fileName, sqlDump, 'text/plain');
        setStatusMessage(`Cloudflare D1 SQL dump uploaded to Google Drive: ${fileName}`);
      }

      await loadBackups();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload backup to Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 text-white shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Google Drive Automated Cloud Backup</h3>
              <p className="text-xs text-slate-400">
                Securely archive General Ledger vouchers, D1 SQL tables, and payroll runs
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

        {/* Status Alerts */}
        {statusMessage && (
          <div className="mb-4 bg-emerald-950/80 border border-emerald-600/60 p-3 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 bg-rose-950/80 border border-rose-600/60 p-3 rounded-lg text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Section */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 mb-4">
          {currentUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">{currentUser.displayName || 'Authorized User'}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{currentUser.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Connected
                </span>
                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-xs text-slate-300 mb-3">
                Sign in with your Google Workspace or personal Google account to enable 1-click cloud sync of all bookkeeping and payroll archives.
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-md transition-colors cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Authorizing in Popup...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" /> Sign in with Google Drive
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Backup Action Triggers */}
        <div className="space-y-3 mb-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Create Immediate Cloud Backup
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleBackupNow('JSON')}
              disabled={!currentUser || isUploading}
              className="p-3 bg-slate-800 hover:bg-slate-700/80 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-left transition-colors flex items-start gap-3 cursor-pointer"
            >
              <FileJson className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-white">Full State Backup (JSON)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Complete ledger, employees, payroll runs, and COA configuration.
                </div>
              </div>
            </button>

            <button
              onClick={() => handleBackupNow('SQL')}
              disabled={!currentUser || isUploading}
              className="p-3 bg-slate-800 hover:bg-slate-700/80 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-left transition-colors flex items-start gap-3 cursor-pointer"
            >
              <FileCode className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-xs text-white">Cloudflare D1 SQL Dump</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Standard SQL INSERT statements ready for D1 or SQLite CLI import.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Backups List */}
        {currentUser && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Drive Archive History ({backups.length})
              </span>
              <button
                onClick={loadBackups}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-800 rounded-lg p-2 bg-slate-950/40 text-xs">
              {backups.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-[11px]">
                  No backups found yet in your Google Drive. Click one of the buttons above to create your first archive.
                </div>
              ) : (
                backups.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {file.name.endsWith('.sql') ? (
                        <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate text-xs text-white font-mono">{file.name}</span>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:text-amber-300 p-1 text-[11px] flex items-center gap-1 shrink-0 ml-2"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
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
