/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WorkOrder, Customer, InventoryItem, OrderStatus, WorkshopReport, WorkshopSettings } from './types/rewinding';
import { storageService } from './services/storageService';
import { firestoreService } from './services/firestoreService';
import { COMPANY_PROFILE, INITIAL_WORK_ORDERS, INITIAL_CUSTOMERS, INITIAL_INVENTORY } from './data/initialData';
import { Header, AppTab } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { OrderList } from './components/OrderList';
import { RewindingCalculator } from './components/RewindingCalculator';
import { QCTestingDashboard } from './components/QCTestingDashboard';
import { InventoryManager } from './components/InventoryManager';
import { CustomerManager } from './components/CustomerManager';
import { ReportsDatabaseView } from './components/ReportsDatabaseView';
import { AILabStudio } from './components/AILabStudio';
import { LiveVoiceAssistant } from './components/LiveVoiceAssistant';
import { OrderDetailModal } from './components/OrderDetailModal';
import { NewOrderModal } from './components/NewOrderModal';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { AppsScriptExportModal } from './components/AppsScriptExportModal';
import { SqlDatabaseModal } from './components/SqlDatabaseModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import {
  syncTabsToGoogleSheet,
  SheetsAuthExpiredError,
  SyncTabKey,
} from './services/googleSheetsService';
import { useToast } from './context/ToastContext';
import { useFirebase } from './context/FirebaseContext';
import { Database, ShieldCheck, LogIn, Loader2, User as UserIcon, Ban, Eye } from 'lucide-react';

export default function App() {
  const toast = useToast();
  const {
    user,
    userAccount,
    authReady,
    dbReady,
    isAdmin,
    isActualAdmin,
    isBootstrappedAdmin,
    effectiveRole,
    isSuspended,
    previewAsUser,
    setPreviewAsUser,
    authError,
    sheetsAccessToken,
    signInWithGoogle,
    connectGoogleSheets,
    clearSheetsToken,
    signOutUser,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [lastSheetsSyncedAt, setLastSheetsSyncedAt] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Core state synced in real time from Firestore
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [reports, setReports] = useState<WorkshopReport[]>([]);
  const [workshopSettings, setWorkshopSettings] = useState<WorkshopSettings>({
    monthlySpkTarget: 6,
    perTechMonthlyTarget: 2,
    googleSpreadsheetId: '',
    googleSpreadsheetTitle: '',
    googleSpreadsheetUrl: '',
    googleSheetsAutoSync: false,
  });

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    order: WorkOrder | null;
    docType: 'spk' | 'qc' | 'invoice';
  }>({
    isOpen: false,
    order: null,
    docType: 'spk',
  });

  const actorName = userAccount?.displayName || user?.displayName || user?.email || 'Operator Workshop';

  // Subscribe to Firestore real-time collections ONLY when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !dbReady || !user) return;

    const unsubscribe = firestoreService.subscribeWorkshopData(user, {
      onOrders: (liveOrders) => {
        setOrders(liveOrders);
        storageService.saveWorkOrders(liveOrders);
      },
      onCustomers: (liveCustomers) => {
        setCustomers(liveCustomers);
        storageService.saveCustomers(liveCustomers);
      },
      onInventory: (liveInventory) => {
        setInventory(liveInventory);
        storageService.saveInventory(liveInventory);
      },
      onReports: (liveReports) => {
        setReports(liveReports);
      },
      onSettings: (liveSettings) => {
        setWorkshopSettings(liveSettings);
      },
      onError: (err) => {
        console.error('Firestore subscription error:', err);
        toast.error('Gagal menyinkronkan data dari database Firestore.', 'Sinkronisasi Terkendala');
      },
    });

    return () => {
      unsubscribe();
    };
  }, [authReady, dbReady, user]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      toast.success('Berhasil terhubung ke database Cloud Firestore.', 'Login Berhasil');
    } catch {
      toast.error('Login Google gagal atau dibatalkan.', 'Gagal Masuk');
    } finally {
      setIsSigningIn(false);
    }
  };

  const triggerAutoSheetsSync = async (
    tabs: SyncTabKey[],
    snapshot: { orders: WorkOrder[]; inventory: InventoryItem[]; customers: Customer[] }
  ) => {
    if (!workshopSettings.googleSheetsAutoSync || !workshopSettings.googleSpreadsheetId) {
      return;
    }

    if (!sheetsAccessToken) {
      toast.warning(
        'Auto-Sync Google Sheets aktif. Klik tombol "Google Sheets" lalu "Sign in with Google" untuk mengaktifkan sinkronisasi sesi ini.',
        'Perlu Aktivasi Sesi Sheets'
      );
      return;
    }

    try {
      const summary = await syncTabsToGoogleSheet(
        sheetsAccessToken,
        workshopSettings.googleSpreadsheetId,
        tabs,
        snapshot
      );
      setLastSheetsSyncedAt(summary.syncedAt);
      toast.success(
        `Tab ${summary.syncedTabs.join(', ')} otomatis tersinkron ke Google Sheets.`,
        'Auto-Sync Google Sheets'
      );
    } catch (err) {
      if (err instanceof SheetsAuthExpiredError) {
        clearSheetsToken();
        toast.warning(
          'Sesi token Google Sheets habis. Klik "Google Sheets" untuk menghubungkan ulang.',
          'Sesi Sheets Kedaluwarsa'
        );
      } else {
        toast.error(
          err instanceof Error ? err.message : 'Gagal menyinkronkan data ke Google Sheets.',
          'Sync Sheets Terkendala'
        );
      }
    }
  };

  const handleSaveWorkshopSettings = async (nextSettings: WorkshopSettings) => {
    if (!user) return;
    const mergedSettings: WorkshopSettings = {
      ...workshopSettings,
      ...nextSettings,
    };
    await firestoreService.saveWorkshopSettings(user.uid, mergedSettings, actorName);
    setWorkshopSettings(mergedSettings);
  };

  const handleSaveTargetSettings = async (settings: WorkshopSettings) => {
    if (!user) return;
    if (!isAdmin) {
      toast.warning(
        'Hanya akun Administrator yang dapat mengubah target SPK bulanan.',
        'Akses Dibatasi'
      );
      return;
    }
    try {
      await handleSaveWorkshopSettings(settings);
      toast.success(
        `Target bulanan diperbarui: ${settings.monthlySpkTarget} SPK/bulan (${settings.perTechMonthlyTarget} SPK/teknisi).`,
        'Target Bulanan Disimpan'
      );
    } catch {
      toast.error('Gagal menyimpan pengaturan target bulanan ke database.', 'Gagal Simpan');
    }
  };

  // Update order + auto-generate QC / Status / Billing reports into Firestore + Auto-Sync Sheets
  const handleSaveOrder = async (updatedOrder: WorkOrder) => {
    if (!user) return;
    const prevOrder = orders.find((o) => o.id === updatedOrder.id);

    if (prevOrder && prevOrder.status === 'Diserahkan / Faktur' && !isAdmin) {
      toast.warning(
        `SPK ${updatedOrder.spkNumber} berstatus final "Diserahkan / Faktur" dan hanya dapat diubah oleh Admin.`,
        'SPK Terkunci'
      );
      return;
    }

    try {
      await firestoreService.updateWorkOrderWithAutoReports(user.uid, prevOrder, updatedOrder, actorName);
      setSelectedOrder(updatedOrder);
      toast.success(
        `Data & laporan SPK ${updatedOrder.spkNumber} otomatis masuk ke database.`,
        'Tersimpan ke Database'
      );
      const nextOrders = orders.some((o) => o.id === updatedOrder.id)
        ? orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
        : [updatedOrder, ...orders];
      void triggerAutoSheetsSync(['spk', 'qc'], {
        orders: nextOrders,
        inventory,
        customers,
      });
    } catch {
      toast.error(`Gagal menyimpan perubahan SPK ${updatedOrder.spkNumber} ke database.`, 'Gagal Simpan');
    }
  };

  // Create new order + auto-generate SPK_CREATED report into Firestore + Auto-Sync Sheets
  const handleSaveNewOrder = async (newOrder: WorkOrder) => {
    if (!user) return;
    try {
      await firestoreService.createWorkOrderWithReport(user.uid, newOrder, actorName);
      toast.success(
        `SPK ${newOrder.spkNumber} & laporan masuk otomatis tercatat di database!`,
        'SPK Masuk Database'
      );
      const nextOrders = [newOrder, ...orders];
      void triggerAutoSheetsSync(['spk', 'qc'], {
        orders: nextOrders,
        inventory,
        customers,
      });
    } catch {
      toast.error('Gagal menyimpan SPK baru ke database Firestore.', 'Gagal Simpan');
    }
  };

  // Quick update order status + auto-generate STATUS_AUDIT + Auto-Sync Sheets
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.status === 'Diserahkan / Faktur' && !isAdmin) {
      toast.warning(
        `SPK ${targetOrder.spkNumber} sudah berstatus final "Diserahkan / Faktur".`,
        'SPK Terkunci'
      );
      return;
    }

    try {
      await firestoreService.quickUpdateStatusWithReport(user.uid, targetOrder, newStatus, actorName);
      toast.success(
        `Status ${targetOrder.spkNumber} menjadi "${newStatus}" & laporan status tersimpan otomatis.`,
        'Status & Laporan Diperbarui'
      );
      const todayStr = new Date().toISOString().split('T')[0];
      const nextActualDate =
        newStatus === 'Selesai & Siap Diambil' || newStatus === 'Diserahkan / Faktur'
          ? todayStr
          : targetOrder.actualCompletionDate || '';
      const nextOrders = orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              actualCompletionDate: nextActualDate,
              lastStatusUpdatedBy: actorName,
            }
          : o
      );
      void triggerAutoSheetsSync(['spk', 'qc'], {
        orders: nextOrders,
        inventory,
        customers,
      });
    } catch {
      toast.error('Gagal memperbarui status SPK ke database.', 'Gagal Update');
    }
  };

  // Delete order + Auto-Sync Sheets (Admin Only)
  const handleDeleteOrder = async (orderId: string) => {
    if (!user) return;
    if (!isAdmin) {
      toast.warning(
        'Hanya akun Administrator yang memiliki izin menghapus data SPK.',
        'Akses Dibatasi'
      );
      return;
    }
    const targetOrder = orders.find((o) => o.id === orderId);
    try {
      await firestoreService.deleteWorkOrderInDb(orderId);
      toast.info(`SPK ${targetOrder?.spkNumber || ''} telah dihapus dari database.`, 'SPK Dihapus');
      const nextOrders = orders.filter((o) => o.id !== orderId);
      void triggerAutoSheetsSync(['spk', 'qc'], {
        orders: nextOrders,
        inventory,
        customers,
      });
    } catch {
      toast.error('Gagal menghapus SPK dari database.', 'Gagal Hapus');
    }
  };

  // Update inventory + auto-generate INVENTORY_ADJUSTMENT reports + Auto-Sync Sheets
  const handleUpdateInventory = async (updatedInventory: InventoryItem[]) => {
    if (!user) return;
    try {
      await firestoreService.syncInventoryChangesWithReports(user.uid, inventory, updatedInventory, actorName);
      toast.success('Stok & laporan mutasi inventaris otomatis tersimpan ke database.', 'Database Diperbarui');
      void triggerAutoSheetsSync(['inventory'], {
        orders,
        inventory: updatedInventory,
        customers,
      });
    } catch {
      toast.error('Gagal menyimpan pembaruan inventaris ke database.', 'Gagal Simpan');
    }
  };

  // Update customers + auto-generate CUSTOMER_ADDED reports + Auto-Sync Sheets
  const handleUpdateCustomers = async (updatedCustomers: Customer[]) => {
    if (!user) return;
    try {
      await firestoreService.syncCustomerChangesWithReports(user.uid, customers, updatedCustomers, actorName);
      toast.success('Data pelanggan otomatis tersimpan ke database.', 'Pelanggan Disimpan');
      void triggerAutoSheetsSync(['customers'], {
        orders,
        inventory,
        customers: updatedCustomers,
      });
    } catch {
      toast.error('Gagal menyimpan data pelanggan ke database.', 'Gagal Simpan');
    }
  };

  // Trigger print document modal
  const handlePrintDocument = (order: WorkOrder, docType: 'spk' | 'qc' | 'invoice') => {
    setPrintModalState({
      isOpen: true,
      order,
      docType,
    });
  };

  // Auto-log print/PDF action into Firestore reports
  const handleLogPrintReport = async (order: WorkOrder, docType: 'spk' | 'qc' | 'invoice') => {
    if (!user) return;
    try {
      await firestoreService.logDocumentPrintReport(user.uid, order, docType, actorName);
      toast.success('Arsip cetak dokumen otomatis tercatat di Laporan DB.', 'Laporan Cetak Tersimpan');
    } catch {
      // Non-blocking for print dialog
    }
  };

  // Export JSON backup
  const handleExportData = () => {
    const backup = {
      app: 'CV. MUSTOFA JAYA TEKNIK - REWINDING MANAGEMENT',
      exportedAt: new Date().toISOString(),
      workOrders: orders,
      customers,
      inventory,
      reports,
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_cv_mustofa_jaya_teknik_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Berkas cadangan data bengkel (JSON) berhasil diunduh.', 'Backup Berhasil');
  };

  // Import JSON backup into Firestore (Admin Only)
  const handleImportData = () => {
    if (!user) return;
    if (!isAdmin) {
      toast.warning(
        'Hanya akun Administrator yang diizinkan melakukan Restore Backup JSON.',
        'Akses Dibatasi'
      );
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            if (
              Array.isArray(parsed.workOrders) &&
              Array.isArray(parsed.customers) &&
              Array.isArray(parsed.inventory)
            ) {
              await firestoreService.restoreBackupToFirestore(user.uid, parsed, actorName);
              toast.success('Data bengkel berhasil dipulihkan ke database Firestore.', 'Restore Selesai');
              void triggerAutoSheetsSync(['spk', 'qc', 'inventory', 'customers'], {
                orders: parsed.workOrders,
                inventory: parsed.inventory,
                customers: parsed.customers,
              });
            } else {
              toast.error('Format berkas JSON cadangan tidak valid atau rusak.', 'Gagal Restore');
            }
          } catch {
            toast.error('Gagal memulihkan berkas JSON ke database.', 'Gagal Restore');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Reset to default seed in Firestore (Admin Only)
  const handleResetData = async () => {
    if (!user) return;
    if (!isAdmin) {
      toast.warning(
        'Hanya akun Administrator yang diizinkan mereset data database.',
        'Akses Dibatasi'
      );
      return;
    }
    try {
      await firestoreService.restoreBackupToFirestore(
        user.uid,
        {
          workOrders: INITIAL_WORK_ORDERS,
          customers: INITIAL_CUSTOMERS,
          inventory: INITIAL_INVENTORY,
        },
        actorName
      );
      toast.warning('Seluruh data contoh bawaan telah dipulihkan ke database.', 'Reset Data');
      void triggerAutoSheetsSync(['spk', 'qc', 'inventory', 'customers'], {
        orders: INITIAL_WORK_ORDERS,
        inventory: INITIAL_INVENTORY,
        customers: INITIAL_CUSTOMERS,
      });
    } catch {
      toast.error('Gagal mereset data database.', 'Gagal Reset');
    }
  };

  const handleOpenOrderDetail = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // Loading state while auth initializes
  if (!authReady || (user && !dbReady)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <div className="text-sm font-semibold">Menghubungkan ke Database Cloud Firestore...</div>
          <div className="text-xs text-slate-400">CV. Mustofa Jaya Teknik · Rewinding & Overhaul</div>
        </div>
      </div>
    );
  }

  // Google Sign-In Gate required for Firestore security & automatic cloud persistence
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center font-extrabold text-slate-950 text-xl shrink-0">
              MJT
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                {COMPANY_PROFILE.name}
              </h1>
              <p className="text-xs text-slate-400">
                Sistem Manajemen Rewinding &amp; Laporan Database Otomatis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Akun Administrator</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Kelola akun User &amp; Role, ubah SPK faktur final, hapus SPK, target bulanan, dan restore database.
              </p>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-sky-400">
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Akun User (Operator / Teknisi)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Input SPK baru, update progres bengkel, pengujian QC Megger, kalkulator kawat, stok, &amp; pelanggan.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Database className="w-4 h-4" />
              <span>Semua Laporan Masuk ke Database Otomatis</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Masuk dengan akun Google Anda. Sistem otomatis mengenali apakah akun Anda terdaftar sebagai Administrator atau User Bengkel.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200">
              {authError}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition-colors"
          >
            {isSigningIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{isSigningIn ? 'Menghubungkan...' : 'Masuk dengan Google (Admin / User)'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Suspended User Account Gate
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-800/70 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <Ban className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-extrabold text-white">Akun Dinonaktifkan</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Akun Google <span className="font-mono text-amber-300">{user.email}</span> saat ini berstatus <strong>Nonaktif</strong> oleh Administrator {COMPANY_PROFILE.name}.
            </p>
            <p className="text-[11px] text-slate-400">
              Silakan hubungi Administrator bengkel untuk mengaktifkan kembali akses akun Anda.
            </p>
          </div>
          <button
            onClick={signOutUser}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            Keluar &amp; Ganti Akun Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reportsCount={reports.length}
        userName={actorName}
        userRole={effectiveRole}
        isAdmin={isAdmin}
        isActualAdmin={isActualAdmin}
        previewAsUser={previewAsUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onSignOut={signOutUser}
        onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
        onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
        onOpenAppsScript={() => setIsGasModalOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
        sheetsAutoSync={Boolean(
          workshopSettings.googleSheetsAutoSync && workshopSettings.googleSpreadsheetId
        )}
        sheetsNeedsReconnect={Boolean(
          workshopSettings.googleSheetsAutoSync &&
            workshopSettings.googleSpreadsheetId &&
            !sheetsAccessToken
        )}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      {previewAsUser && isActualAdmin && (
        <div className="bg-purple-700 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-center gap-3 no-print">
          <div className="flex items-center gap-1.5 font-medium">
            <Eye className="w-3.5 h-3.5" />
            <span>
              Anda sedang berada di <strong>Mode Pratinjau User (Operator)</strong> — fitur hapus SPK, edit faktur final, target SPK, &amp; restore dinonaktifkan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPreviewAsUser(false)}
            className="px-2.5 py-1 bg-white text-purple-900 font-bold rounded-md text-[11px] hover:bg-purple-100 transition-colors"
          >
            Kembali ke Administrator
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            orders={orders}
            inventory={inventory}
            isAdmin={isAdmin}
            monthlySpkTarget={workshopSettings.monthlySpkTarget}
            perTechMonthlyTarget={workshopSettings.perTechMonthlyTarget}
            onSaveTargetSettings={handleSaveTargetSettings}
            onSelectOrder={handleOpenOrderDetail}
            onNavigateTab={setActiveTab}
            onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
          />
        )}

        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            isAdmin={isAdmin}
            onSelectOrder={handleOpenOrderDetail}
            onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
            onUpdateStatus={handleUpdateStatus}
            onDeleteOrder={handleDeleteOrder}
            onPrintDocument={handlePrintDocument}
          />
        )}

        {activeTab === 'calculator' && <RewindingCalculator />}

        {activeTab === 'qc' && (
          <QCTestingDashboard
            orders={orders}
            onSelectOrder={handleOpenOrderDetail}
            onPrintQC={(order) => handlePrintDocument(order, 'qc')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            inventory={inventory}
            onUpdateInventory={handleUpdateInventory}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager
            customers={customers}
            orders={orders}
            onUpdateCustomers={handleUpdateCustomers}
            onSelectOrder={handleOpenOrderDetail}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsDatabaseView
            reports={reports}
            orders={orders}
            onSelectOrder={handleOpenOrderDetail}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
          />
        )}

        {activeTab === 'ai-studio' && <AILabStudio />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-medium text-slate-700">
            {COMPANY_PROFILE.name} · {COMPANY_PROFILE.tagline}
          </div>
          <div className="text-[11px] text-slate-400">
            Workshop: {COMPANY_PROFILE.phone} · Standar Isolasi Class H (200°C) & IEEE 43
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* Detail / Edit Order Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailModalOpen}
          isAdmin={isAdmin}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          onSaveOrder={handleSaveOrder}
          onPrintDocument={handlePrintDocument}
        />
      )}

      {/* New Order (SPK) Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        customers={customers}
        existingOrdersCount={orders.length}
        onSaveNewOrder={handleSaveNewOrder}
      />

      {/* Live Voice Assistant Modal */}
      <LiveVoiceAssistant
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
      />

      {/* Google Apps Script Exporter Modal */}
      <AppsScriptExportModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
      />

      {/* Relational SQL Schema & Dump Modal */}
      <SqlDatabaseModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        orders={orders}
        customers={customers}
        inventory={inventory}
        reports={reports}
        settings={workshopSettings}
      />

      {/* Google Sheets Auto-Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        settings={workshopSettings}
        orders={orders}
        inventory={inventory}
        customers={customers}
        sheetsAccessToken={sheetsAccessToken}
        onConnectSheetsAuth={connectGoogleSheets}
        onClearSheetsToken={clearSheetsToken}
        onSaveSheetsSettings={handleSaveWorkshopSettings}
        lastSyncedAt={lastSheetsSyncedAt}
        onUpdateLastSyncedAt={setLastSheetsSyncedAt}
      />

      {/* Account Management Modal (Administrator & User) */}
      <AccountManagementModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
        userAccount={userAccount}
        isActualAdmin={isActualAdmin}
        isBootstrappedAdmin={isBootstrappedAdmin}
        effectiveRole={effectiveRole}
        previewAsUser={previewAsUser}
        onTogglePreviewAsUser={(val) => {
          setPreviewAsUser(val);
          toast.info(
            val
              ? 'Beralih ke Mode Pratinjau User (Operator).'
              : 'Kembali ke Mode Administrator penuh.',
            'Mode Tampilan Diubah'
          );
        }}
      />

      {/* Print Preview & Printer Trigger Modal */}
      {printModalState.order && (
        <PrintDocumentModal
          order={printModalState.order}
          initialDocType={printModalState.docType}
          isOpen={printModalState.isOpen}
          onLogPrintReport={handleLogPrintReport}
          onClose={() =>
            setPrintModalState({
              isOpen: false,
              order: null,
              docType: 'spk',
            })
          }
        />
      )}
    </div>
  );
}
