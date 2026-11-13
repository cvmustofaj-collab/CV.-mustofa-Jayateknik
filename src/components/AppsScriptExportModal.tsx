import React, { useState } from 'react';
import { X, Copy, Download, FileCode2, CheckCircle2, ExternalLink } from 'lucide-react';
import codeGsContent from '../../apps-script/Code.gs?raw';
import indexHtmlContent from '../../apps-script/Index.html?raw';
import manifestJsonContent from '../../apps-script/appsscript.json?raw';
import { useToast } from '../context/ToastContext';

interface AppsScriptExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GasFileKey = 'Code.gs' | 'Index.html' | 'appsscript.json';

export const AppsScriptExportModal: React.FC<AppsScriptExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [activeFile, setActiveFile] = useState<GasFileKey>('Code.gs');

  if (!isOpen) return null;

  const filesMap: Record<GasFileKey, { content: string; desc: string; mime: string }> = {
    'Code.gs': {
      content: codeGsContent,
      desc: 'Backend server-side Google Apps Script (doGet, Google Sheets CRUD SPK_Orders/Pelanggan/Inventaris, Backup Drive, & Gemini UrlFetchApp)',
      mime: 'text/javascript',
    },
    'Index.html': {
      content: indexHtmlContent,
      desc: 'Antarmuka Web App HtmlService lengkap yang terhubung langsung ke Code.gs melalui google.script.run',
      mime: 'text/html',
    },
    'appsscript.json': {
      content: manifestJsonContent,
      desc: 'File manifes proyek Google Apps Script (TimeZone Asia/Jakarta, Runtime V8, OAuth Scopes & Web App Access)',
      mime: 'application/json',
    },
  };

  const currentFile = filesMap[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    toast.success(`Kode ${activeFile} berhasil disalin ke clipboard!`, 'Berhasil Disalin');
  };

  const handleDownload = (fileName: GasFileKey) => {
    const fileData = filesMap[fileName];
    const blob = new Blob([fileData.content], { type: fileData.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Berkas ${fileName} berhasil diunduh.`, 'Unduh Selesai');
  };

  const handleDownloadAll = () => {
    (['Code.gs', 'Index.html', 'appsscript.json'] as GasFileKey[]).forEach((name, idx) => {
      setTimeout(() => handleDownload(name), idx * 250);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Source Code Google Apps Script (.gs + HtmlService + Google Sheets)
              </h2>
              <p className="text-[11px] text-slate-400">
                Salin atau unduh file di bawah untuk dijalankan langsung di script.google.com
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deployment Steps Guide */}
        <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-200/80 text-xs text-emerald-950 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cara Deploy ke Google Apps Script (5 Menit):</span>
            </div>
            <p className="text-[11px] text-emerald-900">
              1. Buka <strong>script.google.com</strong> (atau dari Google Sheets: <em>Ekstensi → Apps Script</em>) &nbsp;·&nbsp;
              2. Tempelkan isi <strong>Code.gs</strong>, buat file HTML bernama <strong>Index</strong> (tempel <strong>Index.html</strong>), dan aktifkan <em>appsscript.json</em> di Pengaturan &nbsp;·&nbsp;
              3. Klik <strong>Deploy → New deployment → Web app</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Semua (3 File)</span>
            </button>
            <a
              href="https://script.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg transition-colors"
            >
              <span>Buka Apps Script</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* File Tabs & Actions */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['Code.gs', 'Index.html', 'appsscript.json'] as GasFileKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFile(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  activeFile === key
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
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
              <span>Unduh</span>
            </button>
          </div>
        </div>

        {/* File Description & Code Preview */}
        <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-600">
          {currentFile.desc}
        </div>
        <div className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-4 font-mono text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap break-words">{currentFile.content}</pre>
        </div>
      </div>
    </div>
  );
};
