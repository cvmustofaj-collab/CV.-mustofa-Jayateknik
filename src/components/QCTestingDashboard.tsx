import React from 'react';
import { WorkOrder } from '../types/rewinding';
import { formatIndoDate, evaluateInsulationResistance } from '../utils/rewindingMath';
import { 
  ShieldCheck, 
  Activity, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Thermometer, 
  Gauge, 
  FileCheck2,
  Eye
} from 'lucide-react';

interface QCTestingDashboardProps {
  orders: WorkOrder[];
  onSelectOrder: (order: WorkOrder) => void;
  onPrintQC: (order: WorkOrder) => void;
}

export const QCTestingDashboard: React.FC<QCTestingDashboardProps> = ({
  orders,
  onSelectOrder,
  onPrintQC,
}) => {
  // Orders ready for testing or tested
  const testingOrders = orders.filter(
    (o) =>
      o.status === 'QC & Pengetesan' ||
      o.status === 'Selesai & Siap Diambil' ||
      o.status === 'Diserahkan / Faktur' ||
      o.status === 'Varnish & Oven'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Divisi Quality Control & Kalibrasi Pengetesan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pengujian Megger 1000V DC & Running Test Beban Kosong
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Standar uji IEEE 43-2000 (Tahanan Isolasi) & ISO 10816 (Vibrasi & Keseimbangan Dinamis Bearing).
          </p>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-xs text-slate-300">
          <div className="font-semibold text-white">Standar Kelulusan CV. MJT:</div>
          <div className="text-[11px] text-slate-400 mt-0.5 space-y-0.5">
            <div>• Megger Phase-Body: &gt; 100 MΩ (Pasca Oven)</div>
            <div>• Unbalance Arus Fasa: &lt; 2%</div>
            <div>• Vibrasi Bearing: &lt; 2.3 mm/s (Kelas II ISO)</div>
          </div>
        </div>
      </div>

      {/* QC Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testingOrders.map((order) => {
          const meggerVal = order.qcReport.meggerPhaseBodyMOhm.uBody || 0;
          const evalRes = evaluateInsulationResistance(meggerVal);
          const isPassed = order.qcReport.summaryVerdict === 'LAYAK OPERASI (LULUS QC)';

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {order.spkNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isPassed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {order.qcReport.summaryVerdict}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">
                  {order.brand} {order.powerHp} HP ({order.powerKw} kW)
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  {order.customerCompany} · {order.machineType}
                </div>

                {/* Key QC Indicators */}
                <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs mb-3">
                  {/* Megger Value */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tahanan Isolasi:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {meggerVal > 0 ? `${meggerVal} MΩ` : 'Belum Diuji'}
                    </span>
                  </div>

                  {/* No-Load Currents */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Arus No-Load (R-S-T):</span>
                    <span className="font-mono font-semibold text-slate-800 text-[11px] tabular-nums">
                      {order.qcReport.noLoadTest.currentR || '-'}A /{' '}
                      {order.qcReport.noLoadTest.currentS || '-'}A /{' '}
                      {order.qcReport.noLoadTest.currentT || '-'}A
                    </span>
                  </div>

                  {/* Vibration & Temp */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-slate-400" />
                      Vibrasi: <strong>{order.qcReport.noLoadTest.bearingVibrationMmS || '-'} mm/s</strong>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-slate-400" />
                      Suhu: <strong>{order.qcReport.noLoadTest.bearingTempC || '-'} °C</strong>
                    </span>
                  </div>
                </div>

                {order.qcReport.notes && (
                  <p className="text-[11px] text-slate-500 italic mb-3 line-clamp-2">
                    "{order.qcReport.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectOrder(order)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Input Hasil Uji</span>
                </button>

                <button
                  onClick={() => onPrintQC(order)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Cetak Sertifikat QC</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
