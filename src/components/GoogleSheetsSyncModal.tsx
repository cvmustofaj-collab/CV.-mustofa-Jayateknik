import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Plus,
  Link2,
  AlertTriangle,
  Unlink,
  Loader2,
} from 'lucide-react';
import { WorkOrder, InventoryItem, Customer, WorkshopSettings } from '../types/rewinding';
import {
  SHEET_TABS,
  createWorkshopSpreadsheet,
  extractSpreadsheetId,
  inspectSpreadsheetMetadata,
  syncTabsToGoogleSheet,
  SheetsAuthExpiredError,
} from '../services/googleSheetsService';
import { useToast } from '../context/ToastContext';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WorkshopSettings;
  orders: WorkOrder[];
  inventory: InventoryItem[];
  customers: Customer[];
  sheetsAccessToken: string | null;
  onConnectSheetsAuth: () => Promise<string>;
  onClearSheetsToken: () => void;
  onSaveSheetsSettings: (nextSettings: WorkshopSettings) => Promise<void>;
  lastSyncedAt: string | null;
  onUpdateLastSyncedAt: (time: string) => void;
}

type PendingConfirmation =
  | {
      type: 'create_and_sync';
      title: string;
    }
  | {
      type: 'link_and_sync';
      spreadsheetId: string;
      spreadsheetTitle: string;
      spreadsheetUrl: string;
      enableAutoSync: boolean;
    }
  | {
      type: 'manual_full_sync';
      spreadsheetId: string;
      spreadsheetTitle: string;
    }
  | {
      type: 'toggle_autosync';
      nextAutoSync: boolean;
    }
  | {
      type: 'disconnect';
    }
  | null;

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  orders,
  inventory,
  customers,
  sheetsAccessToken,
  onConnectSheetsAuth,
  onClearSheetsToken,
  onSaveSheetsSettings,
  lastSyncedAt,
  onUpdateLastSyncedAt,
}) => {
  const toast = useToast();
  const [newSheetTitle, setNewSheetTitle] = useState(
    'CV. Mustofa Jaya Teknik — Database Workshop & SPK'
  );
  const [existingInput, setExistingInput] = useState(settings.googleSpreadsheetId || '');
  const [isBusy, setIsBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation>(null);

  if (!isOpen) return null;

  const isLinked = Boolean(settings.googleSpreadsheetId);
  const isAutoSyncOn = Boolean(settings.googleSheetsAutoSync && settings.googleSpreadsheetId);

  const ensureToken = async (): Promise<string> => {
    if (sheetsAccessToken) return sheetsAccessToken;
    return await onConnectSheetsAuth();
  };

  const handleRequestCreate = async () => {
    try {
      await ensureToken();
      setPendingConfirm({
        type: 'create_and_sync',
        title: newSheetTitle.trim() || 'CV. Mustofa Jaya Teknik — Database Workshop & SPK',
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menghubungkan akun Google.',
        'Autentikasi Gagal'
      );
    }
  };

  const handleRequestLink = async () => {
    const cleanId = extractSpreadsheetId(existingInput);
    if (!cleanId) {
      toast.warning('Masukkan URL atau ID Google Spreadsheet yang valid terlebih dahulu.');
      return;
    }

    setIsBusy(true);
    try {
      const token = await ensureToken();
      const meta = await inspectSpreadsheetMetadata(token, cleanId);
      setPendingConfirm({
        type: 'link_and_sync',
        spreadsheetId: meta.spreadsheetId,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: meta.spreadsheetUrl,
        enableAutoSync: true,
      });
    } catch (err) {
      if (err instanceof SheetsAuthExpiredError) {
        onClearSheetsToken();
      }
      toast.error(
        err instanceof Error ? err.message : 'Gagal memeriksa Google Spreadsheet tersebut.',
        'Gagal Membaca Spreadsheet'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmOperation = async () => {
    if (!pendingConfirm) return;
    setIsBusy(true);
    try {
      if (pendingConfirm.type === 'disconnect') {
        await onSaveSheetsSettings({
          ...settings,
          googleSpreadsheetId: '',
          googleSpreadsheetTitle: '',
          googleSpreadsheetUrl: '',
          googleSheetsAutoSync: false,
        });
        toast.info('Koneksi spreadsheet diputuskan. Data Firestore tetap tersimpan aman.');
        setPendingConfirm(null);
        return;
      }

      if (pendingConfirm.type === 'toggle_autosync') {
        const token = pendingConfirm.nextAutoSync ? await ensureToken() : sheetsAccessToken;
        if (pendingConfirm.nextAutoSync && token && settings.googleSpreadsheetId) {
          const summary = await syncTabsToGoogleSheet(
            token,
            settings.googleSpreadsheetId,
            ['spk', 'qc', 'inventory', 'customers'],
            { orders, inventory, customers }
          );
          onUpdateLastSyncedAt(summary.syncedAt);
        }
        await onSaveSheetsSettings({
          ...settings,
          googleSheetsAutoSync: pendingConfirm.nextAutoSync,
        });
        toast.success(
          pendingConfirm.nextAutoSync
            ? 'Sinkronisasi otomatis ke Google Sheets diaktifkan.'
            : 'Sinkronisasi otomatis ke Google Sheets dijeda.'
        );
        setPendingConfirm(null);
        return;
      }

      const token = await ensureToken();

      if (pendingConfirm.type === 'create_and_sync') {
        const created = await createWorkshopSpreadsheet(token, pendingConfirm.title);
        const summary = await syncTabsToGoogleSheet(
          token,
          created.spreadsheetId,
          ['spk', 'qc', 'inventory', 'customers'],
          { orders, inventory, customers }
        );
        await onSaveSheetsSettings({
          ...settings,
          googleSpreadsheetId: created.spreadsheetId,
          googleSpreadsheetTitle: created.title,
          googleSpreadsheetUrl: created.spreadsheetUrl,
          googleSheetsAutoSync: true,
        });
        setExistingInput(created.spreadsheetId);
        onUpdateLastSyncedAt(summary.syncedAt);
        toast.success(
          `Spreadsheet "${created.title}" berhasil dibuat dan 4 sheet disinkronkan otomatis!`,
          'Google Sheets Aktif'
        );
      } else if (pendingConfirm.type === 'link_and_sync') {
        const summary = await syncTabsToGoogleSheet(
          token,
          pendingConfirm.spreadsheetId,
          ['spk', 'qc', 'inventory', 'customers'],
          { orders, inventory, customers }
        );
        await onSaveSheetsSettings({
          ...settings,
          googleSpreadsheetId: pendingConfirm.spreadsheetId,
          googleSpreadsheetTitle: pendingConfirm.spreadsheetTitle,
          googleSpreadsheetUrl: pendingConfirm.spreadsheetUrl,
          googleSheetsAutoSync: pendingConfirm.enableAutoSync,
        });
        onUpdateLastSyncedAt(summary.syncedAt);
        toast.success(
          `Berhasil terhubung & sinkron ke "${pendingConfirm.spreadsheetTitle}".`,
          'Sinkronisasi Selesai'
        );
      } else if (pendingConfirm.type === 'manual_full_sync') {
        const summary = await syncTabsToGoogleSheet(
          token,
          pendingConfirm.spreadsheetId,
          ['spk', 'qc', 'inventory', 'customers'],
          { orders, inventory, customers }
        );
        onUpdateLastSyncedAt(summary.syncedAt);
        toast.success(
          `Seluruh 4 sheet (${orders.length} SPK, ${inventory.length} stok, ${customers.length} pelanggan) diperbarui ke Google Sheets.`,
          'Sinkronisasi Berhasil'
        );
      }

      setPendingConfirm(null);
    } catch (err) {
      if (err instanceof SheetsAuthExpiredError) {
        onClearSheetsToken();
      }
      toast.error(
        err instanceof Error ? err.message : 'Operasi Google Sheets gagal.',
        'Sinkronisasi Gagal'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Sinkronisasi Otomatis Google Sheets
              </h2>
              <p className="text-[11px] text-slate-400">
                SPK &amp; Pengerjaan · QC &amp; Pengujian · Inventaris · Pelanggan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
            aria-label="Tutup modal Google Sheets"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Session Token Status */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">
                {sheetsAccessToken
                  ? 'Sesi Akses Google Sheets Aktif'
                  : 'Izin Akses Google Sheets Perlu Dihubungkan'}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {sheetsAccessToken
                  ? 'Token akses Google Sheets aktif di memori sesi ini untuk auto-sync langsung saat Anda menginput data.'
                  : 'Klik tombol di samping untuk memberikan izin akses Google Sheets pada sesi browser saat ini.'}
              </p>
            </div>

            {!sheetsAccessToken ? (
              <button
                type="button"
                onClick={async () => {
                  setIsBusy(true);
                  try {
                    await onConnectSheetsAuth();
                    toast.success('Sesi Google Sheets terhubung!', 'Siap Sinkron');
                  } catch {
                    toast.error('Gagal menghubungkan sesi Google Sheets.');
                  } finally {
                    setIsBusy(false);
                  }
                }}
                disabled={isBusy}
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold text-xs shadow-xs transition-colors shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>Terhubung</span>
              </span>
            )}
          </div>

          {/* Connected Spreadsheet Status Card */}
          {isLinked && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-emerald-800">
                    Spreadsheet Terhubung {lastSyncedAt ? `· Sinkron terakhir ${lastSyncedAt}` : ''}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {settings.googleSpreadsheetTitle || 'Google Spreadsheet Workshop'}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                    ID: {settings.googleSpreadsheetId}
                  </div>
                </div>

                {settings.googleSpreadsheetUrl && (
                  <a
                    href={settings.googleSpreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-semibold text-xs transition-colors shrink-0 self-start"
                  >
                    <span>Buka Google Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* 4 Synced Tabs Coverage */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white border border-emerald-200/80 rounded-lg p-2">
                  <div className="font-mono font-bold text-slate-800">{SHEET_TABS.SPK}</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">{orders.length} baris</div>
                </div>
                <div className="bg-white border border-emerald-200/80 rounded-lg p-2">
                  <div className="font-mono font-bold text-slate-800">{SHEET_TABS.QC}</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">{orders.length} baris</div>
                </div>
                <div className="bg-white border border-emerald-200/80 rounded-lg p-2">
                  <div className="font-mono font-bold text-slate-800">{SHEET_TABS.INVENTORY}</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">{inventory.length} baris</div>
                </div>
                <div className="bg-white border border-emerald-200/80 rounded-lg p-2">
                  <div className="font-mono font-bold text-slate-800">{SHEET_TABS.CUSTOMERS}</div>
                  <div className="text-[11px] text-slate-500 tabular-nums">{customers.length} baris</div>
                </div>
              </div>

              {/* Controls: Auto-Sync toggle, Manual Full Sync, Disconnect */}
              <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPendingConfirm({
                      type: 'toggle_autosync',
                      nextAutoSync: !isAutoSyncOn,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                    isAutoSyncOn
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  {isAutoSyncOn ? 'Auto-Sync Saat Input: AKTIF' : 'Auto-Sync Saat Input: NONAKTIF'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      setPendingConfirm({
                        type: 'manual_full_sync',
                        spreadsheetId: settings.googleSpreadsheetId!,
                        spreadsheetTitle:
                          settings.googleSpreadsheetTitle || 'Google Spreadsheet Workshop',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sinkronkan Semua Sekarang</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setPendingConfirm({ type: 'disconnect' })}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold text-xs transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Putuskan</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Option A: Create New Spreadsheet */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Opsi 1: Buat Spreadsheet Baru Otomatis di Google Drive Anda</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Membuat file spreadsheet baru lengkap dengan 4 tab terformat ({SHEET_TABS.SPK},{' '}
              {SHEET_TABS.QC}, {SHEET_TABS.INVENTORY}, {SHEET_TABS.CUSTOMERS}) dan langsung mengisi seluruh data saat ini.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                placeholder="Judul Google Spreadsheet baru..."
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleRequestCreate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0"
              >
                Buat &amp; Aktifkan Auto-Sync
              </button>
            </div>
          </div>

          {/* Option B: Link Existing Spreadsheet */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-sky-600" />
              <span>Opsi 2: Hubungkan ke Google Spreadsheet yang Sudah Ada</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tempelkan URL Google Sheets atau Spreadsheet ID Anda. Tab yang belum ada akan dibuatkan otomatis.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={existingInput}
                onChange={(e) => setExistingInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0.../edit"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleRequestLink}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shrink-0"
              >
                Periksa &amp; Hubungkan
              </button>
            </div>
          </div>

          {/* Explicit Confirmation Dialog Banner before Mutating/Overwriting Google Sheets */}
          {pendingConfirm && (
            <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-950 text-xs">
                    {pendingConfirm.type === 'create_and_sync' &&
                      `Buat Spreadsheet "${pendingConfirm.title}" dan tulis seluruh data awal?`}
                    {pendingConfirm.type === 'link_and_sync' &&
                      `Perbarui & sinkronkan spreadsheet "${pendingConfirm.spreadsheetTitle}"?`}
                    {pendingConfirm.type === 'manual_full_sync' &&
                      `Timpa & perbarui seluruh data pada "${pendingConfirm.spreadsheetTitle}"?`}
                    {pendingConfirm.type === 'toggle_autosync' &&
                      (pendingConfirm.nextAutoSync
                        ? 'Aktifkan Sinkronisasi Otomatis setiap kali data diinput?'
                        : 'Jeda Sinkronisasi Otomatis Google Sheets?')}
                    {pendingConfirm.type === 'disconnect' &&
                      'Putuskan tautan Google Spreadsheet dari aplikasi ini?'}
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {pendingConfirm.type === 'disconnect'
                      ? 'File spreadsheet Anda di Google Drive tidak akan dihapus, hanya tautan sinkronisasi di aplikasi ini yang dilepas.'
                      : pendingConfirm.type === 'toggle_autosync' && !pendingConfirm.nextAutoSync
                        ? 'Perubahan data selanjutnya hanya akan tersimpan ke Firestore hingga Anda mengaktifkan kembali Auto-Sync.'
                        : `Operasi ini akan menulis/memperbarui 4 tab sheet (${SHEET_TABS.SPK}: ${orders.length} baris, ${SHEET_TABS.QC}: ${orders.length} baris, ${SHEET_TABS.INVENTORY}: ${inventory.length} baris, ${SHEET_TABS.CUSTOMERS}: ${customers.length} baris) di Google Sheets Anda.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setPendingConfirm(null)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleConfirmOperation}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-bold"
                >
                  {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Konfirmasi &amp; Jalankan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
