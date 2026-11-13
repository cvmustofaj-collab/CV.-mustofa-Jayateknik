import React, { useMemo, useState } from 'react';
import { WorkshopReport, WorkshopReportType, WorkOrder } from '../types/rewinding';
import { formatRupiah, formatIndoDate } from '../utils/rewindingMath';
import {
  Database,
  Search,
  Download,
  FileCheck2,
  ClipboardList,
  Receipt,
  Printer,
  Warehouse,
  Users,
  History,
  ExternalLink,
} from 'lucide-react';

interface ReportsDatabaseViewProps {
  reports: WorkshopReport[];
  orders: WorkOrder[];
  onSelectOrder: (order: WorkOrder) => void;
  onOpenSqlModal?: () => void;
}

const REPORT_TYPE_META: Record<
  WorkshopReportType,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SPK_CREATED: {
    label: 'SPK Masuk',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: ClipboardList,
  },
  QC_MEGGER_TEST: {
    label: 'QC & Megger',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: FileCheck2,
  },
  STATUS_AUDIT: {
    label: 'Progres Status',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: History,
  },
  REVENUE_INVOICE: {
    label: 'Faktur & Omzet',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: Receipt,
  },
  DOCUMENT_EXPORTED: {
    label: 'Cetak / PDF',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: Printer,
  },
  INVENTORY_ADJUSTMENT: {
    label: 'Mutasi Stok',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    icon: Warehouse,
  },
  CUSTOMER_ADDED: {
    label: 'Pelanggan Baru',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: Users,
  },
};

export const ReportsDatabaseView: React.FC<ReportsDatabaseViewProps> = ({
  reports,
  orders,
  onSelectOrder,
  onOpenSqlModal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | WorkshopReportType>('ALL');

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: reports.length };
    for (const r of reports) {
      map[r.reportType] = (map[r.reportType] || 0) + 1;
    }
    return map;
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchType = selectedType === 'ALL' || r.reportType === selectedType;
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.customerCompany.toLowerCase().includes(q) ||
        r.technicianOrActor.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [reports, selectedType, search]);

  const totalRevenueReported = useMemo(
    () =>
      reports
        .filter((r) => r.reportType === 'REVENUE_INVOICE')
        .reduce((acc, r) => acc + (r.amountRp || 0), 0),
    [reports]
  );

  const qcPassedCount = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.reportType === 'QC_MEGGER_TEST' &&
          r.verdictOrStatus === 'LAYAK OPERASI (LULUS QC)'
      ).length,
    [reports]
  );

  const handleExportCSV = () => {
    const headers = [
      'ID Laporan',
      'Tanggal',
      'Jenis Laporan',
      'Nomor Referensi',
      'Judul',
      'Pelanggan / Sumber',
      'Teknisi / Operator',
      'Status / Hasil',
      'Nilai (Rp)',
      'Kawat (kg)',
      'Megger (MOhm)',
      'Ringkasan',
    ];
    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = filteredReports.map((r) =>
      [
        r.id,
        r.reportDate,
        REPORT_TYPE_META[r.reportType]?.label || r.reportType,
        r.referenceNumber,
        r.title,
        r.customerCompany,
        r.technicianOrActor,
        r.verdictOrStatus,
        r.amountRp,
        r.copperKg,
        r.meggerMOhm,
        r.summary,
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_database_mjt_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenRelatedOrder = (orderId: string) => {
    if (!orderId) return;
    const found = orders.find((o) => o.id === orderId);
    if (found) {
      onSelectOrder(found);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Database className="w-4 h-4" />
            <span>Arsip Database Laporan Otomatis (Cloud Firestore)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Rekam Otomatis Laporan SPK, QC Megger, Faktur & Mutasi Stok
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Setiap pembuatan SPK, input hasil uji Megger, perubahan status teknisi, pencetakan PDF, dan mutasi stok langsung tercatat permanen di database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
          {onOpenSqlModal && (
            <button
              type="button"
              onClick={onOpenSqlModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>Skema &amp; Ekspor SQL (.sql)</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap Laporan (CSV / Excel)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Total Laporan Masuk</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {reports.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tersimpan otomatis di Firestore</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Laporan QC Lulus Uji</div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1 tabular-nums">
            {qcPassedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sertifikat Megger & No-Load</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Nilai Faktur Terlapor</div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
            {formatRupiah(totalRevenueReported)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Akumulasi log faktur/omzet</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Arsip Cetak & PDF</div>
          <div className="text-2xl font-extrabold text-purple-700 mt-1 tabular-nums">
            {counts['DOCUMENT_EXPORTED'] || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">SPK, QC & Faktur tercetak</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor SPK/Faktur, perusahaan, teknisi, atau ringkasan laporan..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              selectedType === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua ({counts.ALL || 0})
          </button>
          {(Object.keys(REPORT_TYPE_META) as WorkshopReportType[]).map((type) => {
            const meta = REPORT_TYPE_META[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  selectedType === type
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {meta.label} ({counts[type] || 0})
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Tanggal & Jenis</th>
                <th className="py-3 px-4">Referensi & Judul Laporan</th>
                <th className="py-3 px-4">Pelanggan / Mitra</th>
                <th className="py-3 px-4">Teknisi / Aktor</th>
                <th className="py-3 px-4">Hasil / Status</th>
                <th className="py-3 px-4 text-right">Metrik</th>
                <th className="py-3 px-4 text-center">SPK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Belum ada laporan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredReports.map((rpt) => {
                  const meta = REPORT_TYPE_META[rpt.reportType] || REPORT_TYPE_META.SPK_CREATED;
                  const Icon = meta.icon;
                  const relatedOrder = rpt.orderId
                    ? orders.find((o) => o.id === rpt.orderId)
                    : undefined;

                  return (
                    <tr key={rpt.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[11px] font-semibold text-slate-700">
                          {formatIndoDate(rpt.reportDate)}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded border text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-mono text-[11px] font-bold text-slate-500">
                          {rpt.referenceNumber}
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{rpt.title}</div>
                        <div className="text-[11px] text-slate-600 mt-1">{rpt.summary}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {rpt.customerCompany || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-700">{rpt.technicianOrActor}</td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-[11px]">
                          {rpt.verdictOrStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {rpt.amountRp > 0 && (
                          <div className="font-bold text-emerald-700">
                            {formatRupiah(rpt.amountRp)}
                          </div>
                        )}
                        {rpt.meggerMOhm > 0 && (
                          <div className="text-[11px] text-indigo-700">
                            {rpt.meggerMOhm} MΩ
                          </div>
                        )}
                        {rpt.copperKg > 0 && (
                          <div className="text-[11px] text-amber-700">
                            {rpt.copperKg} kg kawat
                          </div>
                        )}
                        {rpt.amountRp === 0 && rpt.meggerMOhm === 0 && rpt.copperKg === 0 && (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {relatedOrder ? (
                          <button
                            onClick={() => handleOpenRelatedOrder(relatedOrder.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold text-[11px] transition-colors"
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
