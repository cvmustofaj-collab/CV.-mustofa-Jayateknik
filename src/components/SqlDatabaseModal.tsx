import React, { useMemo, useState } from 'react';
import { X, Copy, Download, Database, CheckCircle2, Table2 } from 'lucide-react';
import {
  WorkOrder,
  Customer,
  InventoryItem,
  WorkshopReport,
  WorkshopSettings,
} from '../types/rewinding';
import {
  generateSqlSchema,
  generateSqlData,
  generateFullSqlDump,
  SqlDialect,
} from '../utils/sqlExport';
import { useToast } from '../context/ToastContext';

interface SqlDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: WorkOrder[];
  customers: Customer[];
  inventory: InventoryItem[];
  reports: WorkshopReport[];
  settings: WorkshopSettings;
}

type SqlFileKey = 'schema.sql' | 'data_live.sql' | 'full_backup.sql';

const TABLE_SUMMARY = [
  'workshop_settings',
  'customers',
  'inventory_items',
  'work_orders',
  'work_order_inspections',
  'work_order_windings',
  'work_order_qc_reports',
  'work_order_service_items',
  'work_order_status_audit_logs',
  'workshop_reports',
];

export const SqlDatabaseModal: React.FC<SqlDatabaseModalProps> = ({
  isOpen,
  onClose,
  orders,
  customers,
  inventory,
  reports,
  settings,
}) => {
  const toast = useToast();
  const [dialect, setDialect] = useState<SqlDialect>('postgresql');
  const [activeFile, setActiveFile] = useState<SqlFileKey>('schema.sql');

  const payload = useMemo(
    () => ({ orders, customers, inventory, reports, settings }),
    [orders, customers, inventory, reports, settings]
  );

  const filesMap = useMemo(() => {
    const schemaSql = generateSqlSchema(dialect);
    const dataSql = generateSqlData(payload, dialect);
    const fullSql = generateFullSqlDump(payload, dialect);

    return {
      'schema.sql': {
        content: schemaSql,
        desc: `Skema DDL lengkap 10 tabel relasional + 4 View analitik (${dialect === 'postgresql' ? 'PostgreSQL' : 'MySQL / MariaDB'})`,
      },
      'data_live.sql': {
        content: dataSql,
        desc: `Skrip INSERT/UPSERT seluruh data aktif bengkel (${orders.length} SPK, ${customers.length} pelanggan, ${inventory.length} stok, ${reports.length} laporan)`,
      },
      'full_backup.sql': {
        content: fullSql,
        desc: 'Berkas SQL gabungan (Skema DDL + Seluruh Data Live) siap impor langsung ke database SQL',
      },
    } as Record<SqlFileKey, { content: string; desc: string }>;
  }, [dialect, payload, orders.length, customers.length, inventory.length, reports.length]);

  if (!isOpen) return null;

  const currentFile = filesMap[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    toast.success(`Skrip ${activeFile} (${dialect}) berhasil disalin!`, 'SQL Disalin');
  };

  const handleDownload = (fileName: SqlFileKey) => {
    const fileData = filesMap[fileName];
    const blob = new Blob([fileData.content], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = dialect === 'postgresql' ? 'pg' : 'mysql';
    a.download = `cv_mjt_${prefix}_${fileName}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Berkas SQL ${fileName} berhasil diunduh.`, 'Unduh SQL Selesai');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Database Relasional SQL (database/schema.sql &amp; Export Data Live)
              </h2>
              <p className="text-[11px] text-slate-400">
                10 tabel ternormalisasi + 4 SQL View analitik dari seluruh entitas source code bengkel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
            aria-label="Tutup modal SQL"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Quick Export Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Struktur Tabel &amp; View Siap Impor (psql / MySQL / DBeaver / phpMyAdmin)</span>
            </div>
            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
              <Table2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {TABLE_SUMMARY.map((tbl, idx) => (
                <React.Fragment key={tbl}>
                  <span>{tbl}</span>
                  {idx < TABLE_SUMMARY.length - 1 && (
                    <span className="text-slate-300" aria-hidden="true">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Dialect Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {([
                { key: 'postgresql', label: 'PostgreSQL' },
                { key: 'mysql', label: 'MySQL / MariaDB' },
              ] as const).map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDialect(d.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    dialect === d.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleDownload('full_backup.sql')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Full SQL (.sql)</span>
            </button>
          </div>
        </div>

        {/* File Tabs & Actions */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['schema.sql', 'data_live.sql', 'full_backup.sql'] as SqlFileKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFile(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  activeFile === key
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin {activeFile}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload(activeFile)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh {activeFile}</span>
            </button>
          </div>
        </div>

        {/* File Description */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2">
          <span>{currentFile.desc}</span>
          <span className="font-mono text-slate-500 shrink-0 tabular-nums">
            {currentFile.content.split('\n').length} baris SQL
          </span>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4">
          <pre className="text-[11px] sm:text-xs font-mono text-slate-200 leading-relaxed whitespace-pre">
            <code>{currentFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
