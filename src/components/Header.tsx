import React from 'react';
import { Plus, Download, Upload, RotateCcw, FileCode2, Database, FileSpreadsheet, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { UserRole } from '../types/rewinding';

export type AppTab =
  | 'dashboard'
  | 'orders'
  | 'calculator'
  | 'qc'
  | 'inventory'
  | 'customers'
  | 'reports'
  | 'ai-studio';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  reportsCount?: number;
  userName?: string | null;
  userRole?: UserRole;
  isAdmin?: boolean;
  isActualAdmin?: boolean;
  previewAsUser?: boolean;
  onOpenAccountModal?: () => void;
  onSignOut?: () => void;
  onOpenNewOrder: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenAppsScript?: () => void;
  onOpenSqlModal?: () => void;
  onOpenGoogleSheets?: () => void;
  sheetsAutoSync?: boolean;
  sheetsNeedsReconnect?: boolean;
  onExportData: () => void;
  onImportData: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  reportsCount = 0,
  userName,
  userRole = 'operator',
  isAdmin = false,
  isActualAdmin = false,
  previewAsUser = false,
  onOpenAccountModal,
  onSignOut,
  onOpenNewOrder,
  onOpenVoiceAssistant,
  onOpenAppsScript,
  onOpenSqlModal,
  onOpenGoogleSheets,
  sheetsAutoSync = false,
  sheetsNeedsReconnect = false,
  onExportData,
  onImportData,
  onResetData,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-base shadow-sm">
              MJT
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                CV. Mustofa Jaya Teknik
              </span>
              <span className="text-[11px] text-slate-400 -mt-0.5 whitespace-nowrap">
                Rewinding & Overhaul Spesialis
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Single-line whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              SPK & Pengerjaan
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'calculator'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Kalkulator Kawat
            </button>
            <button
              onClick={() => setActiveTab('qc')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'qc'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              QC & Pengujian
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'inventory'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Inventaris
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'customers'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Pelanggan
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'reports'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-emerald-300/90 hover:text-emerald-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Laporan DB ({reportsCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-studio')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'ai-studio'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-amber-300/80 hover:text-amber-300 hover:bg-slate-800/60'
              }`}
            >
              <span>AI Studio Lab</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Data Utility */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenVoiceAssistant && (
              <button
                onClick={onOpenVoiceAssistant}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-2.5 py-2 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
                title="Bicara dengan Asisten Suara Gemini Live"
              >
                <span>Live Voice</span>
              </button>
            )}

            {/* Quick Utility Menu */}
            <div className="hidden sm:flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
              {onOpenAppsScript && (
                <button
                  onClick={onOpenAppsScript}
                  title="Lihat & Unduh Source Code Google Apps Script (.gs + HtmlService)"
                  className="px-2 py-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-md transition-colors text-xs font-semibold flex items-center gap-1"
                >
                  <FileCode2 className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">Apps Script</span>
                </button>
              )}
              {onOpenSqlModal && (
                <button
                  onClick={onOpenSqlModal}
                  title="Lihat & Unduh Database Relasional SQL (database/schema.sql & Export Data)"
                  className="px-2 py-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-md transition-colors text-xs font-semibold flex items-center gap-1"
                >
                  <Database className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">SQL DB</span>
                </button>
              )}
              {onOpenGoogleSheets && (
                <button
                  onClick={onOpenGoogleSheets}
                  title={
                    sheetsNeedsReconnect
                      ? 'Google Sheets Auto-Sync butuh aktivasi sesi login'
                      : sheetsAutoSync
                        ? 'Google Sheets Auto-Sync Aktif'
                        : 'Hubungkan Sinkronisasi Otomatis Google Sheets'
                  }
                  className={`px-2 py-1.5 rounded-md transition-colors text-xs font-semibold flex items-center gap-1.5 ${
                    sheetsNeedsReconnect
                      ? 'text-amber-300 hover:text-amber-200 hover:bg-slate-800'
                      : sheetsAutoSync
                        ? 'text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30'
                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">Google Sheets</span>
                  {sheetsAutoSync && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sheetsNeedsReconnect ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                </button>
              )}
              <button
                onClick={onExportData}
                title="Cadangkan Data (Export JSON)"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden xl:inline text-xs">Backup</span>
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={onImportData}
                    title="Pulihkan Data (Import JSON - Khusus Administrator)"
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden xl:inline text-xs">Restore</span>
                  </button>
                  <button
                    onClick={onResetData}
                    title="Reset ke Data Bawaan (Khusus Administrator)"
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors text-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
              {onOpenAccountModal && (
                <button
                  onClick={onOpenAccountModal}
                  title={
                    isActualAdmin
                      ? 'Kelola Akun Administrator & User'
                      : 'Lihat Profil Akun & Hak Akses'
                  }
                  className={`px-2 py-1.5 rounded-md transition-colors text-xs font-bold flex items-center gap-1.5 border ${
                    userRole === 'admin'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                      : previewAsUser
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/35 hover:bg-purple-500/25'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/35 hover:bg-sky-500/25'
                  }`}
                >
                  {userRole === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="hidden xl:inline max-w-[96px] truncate">
                    {userRole === 'admin'
                      ? 'Admin'
                      : userRole === 'technician'
                        ? 'Teknisi'
                        : 'User'}
                  </span>
                </button>
              )}
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title={`Keluar (${userName || 'Akun Google'})`}
                  className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md transition-colors text-xs flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={onOpenNewOrder}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>SPK Baru</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-800 gap-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'orders' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            SPK
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'calculator' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            Kalkulator
          </button>
          <button
            onClick={() => setActiveTab('qc')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'qc' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            QC Uji
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'inventory' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            Inventaris
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'customers' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            Pelanggan
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'reports' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-emerald-300'
            }`}
          >
            Laporan DB ({reportsCount})
          </button>
          <button
            onClick={() => setActiveTab('ai-studio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'ai-studio' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-amber-300'
            }`}
          >
            AI Studio
          </button>
          {onOpenGoogleSheets && (
            <button
              onClick={onOpenGoogleSheets}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 flex items-center gap-1 ${
                sheetsAutoSync
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sheets</span>
            </button>
          )}
          {onOpenAccountModal && (
            <button
              onClick={onOpenAccountModal}
              className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 flex items-center gap-1 ${
                userRole === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}
            >
              {userRole === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <UserIcon className="w-3.5 h-3.5" />
              )}
              <span>{userRole === 'admin' ? 'Akun Admin' : 'Akun User'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
