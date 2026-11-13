import React, { useState, useEffect } from 'react';
import { WorkOrder } from '../types/rewinding';
import { COMPANY_PROFILE } from '../data/initialData';
import { formatRupiah, formatIndoDate, getOrderFinancialSummary } from '../utils/rewindingMath';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface PrintDocumentModalProps {
  order: WorkOrder;
  initialDocType?: 'spk' | 'qc' | 'invoice';
  isOpen: boolean;
  onClose: () => void;
  onLogPrintReport?: (order: WorkOrder, docType: 'spk' | 'qc' | 'invoice') => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  order,
  initialDocType = 'spk',
  isOpen,
  onClose,
  onLogPrintReport,
}) => {
  const [docType, setDocType] = useState<'spk' | 'qc' | 'invoice'>(initialDocType);

  useEffect(() => {
    setDocType(initialDocType);
  }, [initialDocType, order.id]);

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    onLogPrintReport?.(order, docType);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Pilih Format Cetak:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setDocType('spk')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  docType === 'spk' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                1. SPK Workshop
              </button>
              <button
                onClick={() => setDocType('qc')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  docType === 'qc' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                2. Sertifikat QC & Megger
              </button>
              <button
                onClick={() => setDocType('invoice')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  docType === 'invoice' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                3. Faktur / Invoice
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (A4 Standard) */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-white flex-1 text-slate-900 print:p-0 print:overflow-visible">
          {/* KOP SURAT RESMI */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 bg-slate-900 text-amber-400 font-extrabold text-xl flex items-center justify-center rounded-lg border-2 border-amber-500 shrink-0">
                  MJT
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                    {COMPANY_PROFILE.name}
                  </h1>
                  <p className="text-xs font-semibold text-amber-700">
                    {COMPANY_PROFILE.tagline}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {COMPANY_PROFILE.address} · Telp: {COMPANY_PROFILE.phone}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Email: {COMPANY_PROFILE.email} · NPWP: {COMPANY_PROFILE.npwp}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 px-3 py-1 rounded">
                  {order.spkNumber}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Tanggal: {formatIndoDate(order.entryDate)}
                </div>
              </div>
            </div>
          </div>

          {/* DOKUMEN 1: SPK WORKSHOP */}
          {docType === 'spk' && (
            <div className="space-y-4 text-xs">
              <div className="text-center py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-sm text-slate-900">
                SURAT PERINTAH KERJA (SPK) REWINDING & OVERHAUL
              </div>

              {/* Data Pelanggan & Info Mesin */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded p-2.5 space-y-1">
                  <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1 mb-1">
                    DATA PELANGGAN
                  </span>
                  <div>Perusahaan: <strong>{order.customerCompany || '-'}</strong></div>
                  <div>Kontak: <strong>{order.customerName}</strong></div>
                  <div>No Telp: <strong>{order.customerPhone}</strong></div>
                  <div>Alamat: {order.customerAddress}</div>
                </div>

                <div className="border border-slate-200 rounded p-2.5 space-y-1">
                  <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1 mb-1">
                    TIM & TARGET PENGERJAAN
                  </span>
                  <div>Teknisi PIC: <strong>{order.technicianName}</strong></div>
                  <div>Prioritas: <strong>{order.priority}</strong></div>
                  <div>Target Selesai: <strong>{formatIndoDate(order.targetCompletionDate)}</strong></div>
                  <div>Status Terkini: <strong>{order.status}</strong></div>
                </div>
              </div>

              {/* Nameplate Mesin */}
              <div className="border border-slate-200 rounded p-2.5">
                <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1 mb-2">
                  SPESIFIKASI NAMEPLATE MESIN
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
                  <div>Merek: <strong>{order.brand}</strong></div>
                  <div>Jenis: <strong>{order.machineType}</strong></div>
                  <div>Daya: <strong>{order.powerHp} HP / {order.powerKw} kW</strong></div>
                  <div>RPM: <strong>{order.rpm} RPM</strong></div>
                  <div>Tegangan: <strong>{order.voltage}</strong></div>
                  <div>Ampere Rated: <strong>{order.currentAmpereRated} A</strong></div>
                  <div>Frame: <strong>{order.frameSize}</strong></div>
                  <div>Serial No: <strong>{order.serialNumber}</strong></div>
                  <div className="col-span-4">Keluhan: <span className="italic text-slate-700">{order.complaint}</span></div>
                </div>
              </div>

              {/* Data Gulungan Teknis Khusus Tukang Gulung */}
              <div className="border-2 border-amber-500/80 rounded-lg p-3 bg-amber-50/20">
                <div className="flex items-center justify-between border-b border-amber-300 pb-1 mb-2">
                  <span className="font-bold text-amber-950 text-xs">
                    PETUNJUK TEKNIS GULUNGAN STATOR (WINDING DATA SHEET)
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Standar Isolasi Class H (200°C)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Jumlah Slot Stator:</span>
                    <strong className="font-mono text-sm">{order.windingData.slotsCount} Slot</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Jumlah Pole (Kutub):</span>
                    <strong className="font-mono text-sm">{order.windingData.polesCount} Pole</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Pitch Langkah Coil:</span>
                    <strong className="font-mono text-sm">{order.windingData.pitchCoil}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Sambungan Motor:</span>
                    <strong className="font-mono text-sm">{order.windingData.connectionType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Diameter Kawat (Ø mm):</span>
                    <strong className="font-mono text-sm text-amber-900">Ø {order.windingData.wireSizeMm} mm</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lilitan per Slot (Turns):</span>
                    <strong className="font-mono text-sm">{order.windingData.turnsPerSlot} Turns</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Kawat Paralel:</span>
                    <strong className="font-mono text-sm">{order.windingData.parallelWires} Sejajar</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Berat Kawat Tembaga:</span>
                    <strong className="font-mono text-sm">{order.windingData.copperWeightKg} kg</strong>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] grid grid-cols-2 gap-2 text-slate-700">
                  <div>Isolasi Slot: <strong>{order.windingData.insulationMaterial}</strong></div>
                  <div>Proses Oven: <strong>{order.windingData.bakingVarnishType} ({order.windingData.bakingDurationHours} Jam @ 135°C)</strong></div>
                </div>
              </div>

              {/* Checksheet Pengerjaan Bengkel */}
              <div className="border border-slate-200 rounded p-2.5">
                <span className="font-bold text-slate-900 block border-b border-slate-200 pb-1 mb-2">
                  CHECKSHEET QUALITY CONTROL & TAHAPAN BENGKEL
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Bongkar & Catat Data Asli</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Bersihkan Alur Slot Stator</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Pasang Kertas Nomex 410</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Gulung & Masukkan Kawat</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Ikat Kepala Coil & Jumper</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Varnish & Oven 135°C</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Ganti Bearing SKF Baru</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Running Test & Megger 1000V</span>
                  </label>
                </div>
              </div>

              {/* Kolom Tanda Tangan */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                <div>
                  <p className="text-slate-500">Pemberi Kerja / Pelanggan,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( {order.customerName} )
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Teknisi Pelaksana,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( {order.technicianName} )
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Kepala Bengkel CV. MJT,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( Cak Mustofa )
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DOKUMEN 2: SERTIFIKAT QC & HASIL UJI PENGETESAN */}
          {docType === 'qc' && (
            <div className="space-y-4 text-xs">
              <div className="text-center py-1.5 bg-slate-900 text-white rounded font-bold uppercase tracking-wider text-sm">
                SERTIFIKAT HASIL UJI PENGETESAN MOTOR LISTRIK (QC TEST REPORT)
              </div>
              <div className="text-center text-[11px] text-slate-500 -mt-2">
                Nomor Sertifikat: QC-MJT/{order.spkNumber.replace('SPK-MJT-', '')} · Standar Uji IEEE 43-2000 & ISO 10816-1
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded p-3 text-xs">
                <div>
                  <div>Unit Mesin: <strong>{order.brand} {order.powerHp} HP ({order.powerKw} kW)</strong></div>
                  <div>Tipe/Frame: <strong>{order.machineType} / {order.frameSize}</strong></div>
                  <div>Nomor Seri: <strong>{order.serialNumber}</strong></div>
                </div>
                <div>
                  <div>Pemilik: <strong>{order.customerCompany} ({order.customerName})</strong></div>
                  <div>Tanggal Pengujian: <strong>{order.qcReport.testedAt || formatIndoDate(order.entryDate)}</strong></div>
                  <div>Inspector QC: <strong>{order.qcReport.testedBy || 'Cak Mustofa (Senior Inspector)'}</strong></div>
                </div>
              </div>

              {/* Bagian 1: Uji Tahanan Isolasi Megger */}
              <div className="border border-slate-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-900">
                    1. UJI TAHANAN ISOLASI (INSULATION RESISTANCE MEGGER TEST 1000V DC)
                  </span>
                  <span className="text-[10px] text-slate-500">Standar Minimal: &gt; 5 MΩ (Baru: &gt; 100 MΩ)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-600 font-semibold block mb-1">Tahanan Antar Fasa ke Bodi Ground:</span>
                    <table className="w-full text-left text-xs border border-slate-200">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-1.5">Titik Ukur</th>
                          <th className="p-1.5">Nilai Terukur</th>
                          <th className="p-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        <tr>
                          <td className="p-1.5">Fasa U - Bodi</td>
                          <td className="p-1.5 font-bold">{order.qcReport.meggerPhaseBodyMOhm.uBody} MΩ</td>
                          <td className="p-1.5 text-emerald-700 font-semibold">LULUS (PASS)</td>
                        </tr>
                        <tr>
                          <td className="p-1.5">Fasa V - Bodi</td>
                          <td className="p-1.5 font-bold">{order.qcReport.meggerPhaseBodyMOhm.vBody} MΩ</td>
                          <td className="p-1.5 text-emerald-700 font-semibold">LULUS (PASS)</td>
                        </tr>
                        <tr>
                          <td className="p-1.5">Fasa W - Bodi</td>
                          <td className="p-1.5 font-bold">{order.qcReport.meggerPhaseBodyMOhm.wBody} MΩ</td>
                          <td className="p-1.5 text-emerald-700 font-semibold">LULUS (PASS)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <span className="text-slate-600 font-semibold block mb-1">Tahanan Isolasi Antar Fasa:</span>
                    <table className="w-full text-left text-xs border border-slate-200">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-1.5">Titik Ukur</th>
                          <th className="p-1.5">Nilai Terukur</th>
                          <th className="p-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        <tr>
                          <td className="p-1.5">Fasa U - V</td>
                          <td className="p-1.5 font-bold">{order.qcReport.meggerPhasePhaseMOhm.uv} MΩ</td>
                          <td className="p-1.5 text-emerald-700 font-semibold">LULUS (PASS)</td>
                        </tr>
                        <tr>
                          <td className="p-1.5">Fasa V - W</td>
                          <td className="p-1.5 font-bold">{order.qcReport.meggerPhasePhaseMOhm.vw} MΩ</td>
                          <td className="p-1.5 text-emerald-700 font-semibold">LULUS (PASS)</td>
                        </tr>
                        <tr>
                          <td className="p-1.5">Fasa W - U</td>
                          <td className="p-1.5 font-bold">{order.qcReport.meggerPhasePhaseMOhm.wu} MΩ</td>
                          <td className="p-1.5 text-emerald-700 font-semibold">LULUS (PASS)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Running Test Tanpa Beban */}
              <div className="border border-slate-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="font-bold text-slate-900">
                    2. HASIL PENGUJIAN RUNNING TEST BEBAN KOSONG (NO-LOAD RUNNING TEST 30 MENIT)
                  </span>
                  <span className="text-[10px] text-slate-500">Tegangan Nominal: 380V / 50Hz</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Arus Fasa R</span>
                    <strong className="text-sm font-mono text-slate-900">{order.qcReport.noLoadTest.currentR} A</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Arus Fasa S</span>
                    <strong className="text-sm font-mono text-slate-900">{order.qcReport.noLoadTest.currentS} A</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Arus Fasa T</span>
                    <strong className="text-sm font-mono text-slate-900">{order.qcReport.noLoadTest.currentT} A</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Putaran RPM</span>
                    <strong className="text-sm font-mono text-slate-900">{order.qcReport.noLoadTest.rpmMeasured} RPM</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Vibrasi Bearing</span>
                    <strong className="text-sm font-mono text-slate-900">{order.qcReport.noLoadTest.bearingVibrationMmS} mm/s</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Suhu Bearing</span>
                    <strong className="text-sm font-mono text-slate-900">{order.qcReport.noLoadTest.bearingTempC} °C</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 pt-1">
                  Keseimbangan arus fasa R-S-T berada dalam batas deviasi sangat baik (&lt; 2%). Tingkat getaran berada pada Kelas II Standar ISO 10816-1 (Kondisi Sangat Baik).
                </div>
              </div>

              {/* Kesimpulan Kelayakan */}
              <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-lg text-emerald-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                    KESIMPULAN HASIL PENGETESAN:
                  </span>
                  <div className="text-base font-extrabold text-emerald-900 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>DINYATAKAN LULUS UJI & LAYAK OPERASI</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    {order.qcReport.notes || 'Seluruh parameter kelistrikan, isolasi gulungan, dan mekanis bearing memenuhi standar operasional industri.'}
                  </div>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                <div>
                  <p className="text-slate-500">Teknisi Penguji / QC Inspector,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( {order.qcReport.testedBy || 'Cak Mustofa'} )
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Workshop Manager CV. MJT,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( Mustofa Jaya, S.T. )
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DOKUMEN 3: INVOICE / FAKTUR PENAGIHAN RESMI */}
          {docType === 'invoice' && (() => {
            const fin = getOrderFinancialSummary(order);
            return (
            <div className="space-y-4 text-xs">
              <div className="text-center py-1.5 bg-slate-900 text-white rounded font-bold uppercase tracking-wider text-sm">
                FAKTUR PENAGIHAN JASA REWINDING &amp; SUKU CADANG
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded p-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">KEPADA YTH:</span>
                  <div className="font-bold text-sm text-slate-900">{order.customerCompany}</div>
                  <div>U.p.: <strong>{order.customerName}</strong></div>
                  <div>No Telp: {order.customerPhone}</div>
                  <div>Alamat: {order.customerAddress}</div>
                </div>

                <div className="text-right space-y-1">
                  <div>No. Invois: <strong className="font-mono text-slate-900">{fin.invoiceNumber}</strong></div>
                  {fin.fakturPajakNumber && (
                    <div>No. Faktur Pajak: <strong className="font-mono text-slate-900">{fin.fakturPajakNumber}</strong></div>
                  )}
                  <div>No. SPK: <strong className="font-mono">{order.spkNumber}</strong></div>
                  <div>Tanggal Faktur: <strong>{formatIndoDate(fin.invoiceDate)}</strong></div>
                  <div>Status Pembayaran: <strong className="text-emerald-700">{order.paymentStatus}</strong></div>
                </div>
              </div>

              {/* Mesin Yang Dikerjakan */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                Unit Perbaikan: <strong>{order.brand} {order.powerHp} HP ({order.powerKw} kW) - {order.machineType}</strong> (Serial: {order.serialNumber})
              </div>

              {/* Rincian Tagihan */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">Uraian Jasa & Material</th>
                      <th className="p-2.5 w-16 text-center">Qty</th>
                      <th className="p-2.5 w-20 text-center">Satuan</th>
                      <th className="p-2.5 w-32 text-right">Harga Satuan</th>
                      <th className="p-2.5 w-36 text-right">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {order.serviceItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-sans font-medium text-slate-900">{item.description}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-center font-sans">{item.unit}</td>
                        <td className="p-2 text-right tabular-nums">{formatRupiah(item.unitPrice)}</td>
                        <td className="p-2 text-right font-bold tabular-nums">{formatRupiah(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total & Bank Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5 text-slate-700 text-[11px]">
                  <span className="font-bold text-slate-900 block text-xs">INFORMASI PEMBAYARAN:</span>
                  <div>{COMPANY_PROFILE.bankInfo}</div>
                  <div className="pt-1 text-slate-600">
                    *Mohon konfirmasi transfer ke WA: {COMPANY_PROFILE.phone}
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-amber-900">
                    <strong>JAMINAN GARANSI:</strong> Masa garansi berlaku selama <strong>{order.warrantyMonths} Bulan</strong> terhitung sejak unit diserahterimakan.
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Subtotal Jasa &amp; Material</span>
                    <span className="font-mono tabular-nums">{formatRupiah(fin.subtotal)}</span>
                  </div>
                  {fin.discount > 0 && (
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Potongan / Diskon</span>
                      <span className="font-mono tabular-nums text-rose-600">- {formatRupiah(fin.discount)}</span>
                    </div>
                  )}
                  {(fin.taxPpnPercent > 0 || fin.taxPphPercent > 0) && (
                    <div className="flex justify-between py-1 text-slate-700 font-semibold border-t border-slate-200">
                      <span>Dasar Pengenaan Pajak (DPP)</span>
                      <span className="font-mono tabular-nums">{formatRupiah(fin.dpp)}</span>
                    </div>
                  )}
                  {fin.taxPpnPercent > 0 && (
                    <div className="flex justify-between py-1 text-sky-700">
                      <span>PPN ({fin.taxPpnPercent}%)</span>
                      <span className="font-mono tabular-nums">+ {formatRupiah(fin.taxPpnAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-t-2 border-slate-900 text-xs font-bold text-slate-900">
                    <span>{fin.taxPphPercent > 0 ? 'TOTAL FAKTUR BRUTO' : 'TOTAL TAGIHAN'}</span>
                    <span className="font-mono text-slate-900 tabular-nums">{formatRupiah(fin.grandTotal)}</span>
                  </div>
                  {fin.taxPphPercent > 0 && (
                    <>
                      <div className="flex justify-between py-1 text-amber-700">
                        <span>Potongan PPh ({fin.taxPphPercent}% dr DPP)</span>
                        <span className="font-mono tabular-nums">- {formatRupiah(fin.taxPphAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-t border-slate-300 text-sm font-extrabold text-slate-900">
                        <span>TOTAL TAGIHAN NET</span>
                        <span className="font-mono text-emerald-700 tabular-nums">{formatRupiah(fin.netPayableTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Uang Muka (DP) Masuk</span>
                    <span className="font-mono tabular-nums text-emerald-700">{formatRupiah(fin.downPayment)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-xs border-t border-slate-200 text-rose-700">
                    <span>SISA PEMBAYARAN</span>
                    <span className="font-mono tabular-nums">{formatRupiah(fin.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                <div>
                  <p className="text-slate-500">Tanda Terima Pelanggan,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( {order.customerName} )
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Hormat Kami, CV. Mustofa Jaya Teknik,</p>
                  <div className="h-16"></div>
                  <p className="font-bold border-t border-slate-300 pt-1">
                    ( Bagian Keuangan &amp; Kasir )
                  </p>
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
