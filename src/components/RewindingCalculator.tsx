import React, { useState } from 'react';
import { 
  WIRE_GAUGE_TABLE, 
  calculateParallelEquivalent, 
  calculateThreePhaseFLA, 
  estimateNoLoadCurrent, 
  calculateSyncRpm,
  estimateStatorCopperWeight,
  hpToKw,
  kwToHp
} from '../utils/rewindingMath';
import { 
  Calculator, 
  Sliders, 
  Layers, 
  Zap, 
  Table, 
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Copy
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const RewindingCalculator: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'parallel' | 'motor' | 'weight' | 'table' | 'connection'>('parallel');

  // --- TAB 1: Kawat Paralel State ---
  const [origDia, setOrigDia] = useState<number>(1.20);
  const [origParallel, setOrigParallel] = useState<number>(1);
  const [targetParallel, setTargetParallel] = useState<number>(2);

  const parallelCalc = calculateParallelEquivalent(origDia, origParallel, targetParallel);
  const chosenSubstituteDia = parallelCalc.closestStandardWire?.diameterMm || parallelCalc.requiredDiameterMm;
  const newActualTotalArea = ((Math.PI * Math.pow(chosenSubstituteDia, 2)) / 4) * targetParallel;
  const areaDiffPercent = Number((((newActualTotalArea - parallelCalc.totalAreaMm2) / parallelCalc.totalAreaMm2) * 100).toFixed(2));

  // --- TAB 2: Motor FLA State ---
  const [motorHp, setMotorHp] = useState<number>(20);
  const [motorKw, setMotorKw] = useState<number>(15);
  const [motorVolt, setMotorVolt] = useState<number>(380);
  const [motorCosPhi, setMotorCosPhi] = useState<number>(0.85);
  const [motorEff, setMotorEff] = useState<number>(0.89);
  const [motorPoles, setMotorPoles] = useState<number>(4);

  const handleHpInput = (hp: number) => {
    setMotorHp(hp);
    setMotorKw(hpToKw(hp));
  };

  const handleKwInput = (kw: number) => {
    setMotorKw(kw);
    setMotorHp(kwToHp(kw));
  };

  const calculatedFla = calculateThreePhaseFLA(motorKw, motorVolt, motorCosPhi, motorEff);
  const noLoadEst = estimateNoLoadCurrent(calculatedFla);
  const syncRpm = calculateSyncRpm(motorPoles, 50);

  // --- TAB 3: Copper Weight State ---
  const [slotsCount, setSlotsCount] = useState<number>(36);
  const [turnsPerSlot, setTurnsPerSlot] = useState<number>(28);
  const [wireDiaForWeight, setWireDiaForWeight] = useState<number>(1.15);
  const [parallelForWeight, setParallelForWeight] = useState<number>(2);
  const [polesForWeight, setPolesForWeight] = useState<number>(4);
  const [coreLengthMm, setCoreLengthMm] = useState<number>(160);
  const [statorInnerDiaMm, setStatorInnerDiaMm] = useState<number>(140);

  const weightEst = estimateStatorCopperWeight(
    slotsCount,
    turnsPerSlot,
    wireDiaForWeight,
    parallelForWeight,
    polesForWeight,
    coreLengthMm,
    statorInnerDiaMm
  );

  // --- TAB 4: Search Wire Table ---
  const [wireSearch, setWireSearch] = useState<string>('');
  const filteredWireTable = WIRE_GAUGE_TABLE.filter((w) => {
    return (
      w.diameterMm.toString().includes(wireSearch) ||
      w.swg.toString().includes(wireSearch) ||
      w.awg.toString().includes(wireSearch)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-500" />
          <span>Kalkulator & Formula Rewinding Motor Listrik</span>
        </h1>
        <p className="text-xs text-slate-500">
          Alat hitung teknis bengkel CV. Mustofa Jaya Teknik: substitusi kawat email paralel, estimasi arus tanpa beban, berat kawat tembaga, dan standar terminal Star/Delta.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-2xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('parallel')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'parallel'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Substitusi Kawat Paralel</span>
        </button>

        <button
          onClick={() => setActiveTab('motor')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'motor'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Arus Beban (FLA & No-Load)</span>
        </button>

        <button
          onClick={() => setActiveTab('weight')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'weight'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Estimasi Berat Tembaga (kg)</span>
        </button>

        <button
          onClick={() => setActiveTab('connection')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'connection'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Diagram Star & Delta</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'table'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Tabel Standar Kawat (SWG/AWG)</span>
        </button>
      </div>

      {/* TAB 1: SUBSTITUSI KAWAT PARALEL */}
      {activeTab === 'parallel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Input Kawat Asli (Bawaan Mesin)</h3>
              <p className="text-xs text-slate-500">
                Masukkan ukuran diameter kawat tembaga asli dari gulungan lama
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Diameter Kawat Asli (Ø mm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={origDia}
                  onChange={(e) => setOrigDia(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Jumlah Kawat Asli</label>
                <input
                  type="number"
                  value={origParallel}
                  onChange={(e) => setOrigParallel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700">
                Mau Diganti Berapa Kawat Sejajar (Paralel)?
              </label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTargetParallel(num)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      targetParallel === num
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {num} Kawat
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div>
                Luas Penampang Total Asli: <strong className="font-mono text-slate-900 tabular-nums">{parallelCalc.totalAreaMm2} mm²</strong>
              </div>
              <div>
                Rumus Luas Penampang: <code className="font-mono text-amber-700">A = (π / 4) × d² × n</code>
              </div>
            </div>
          </div>

          {/* Results Output */}
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-2xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Hasil Rekomendasi Kawat Pengganti
                </span>
                <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded text-slate-300 font-mono">
                  {targetParallel} Kawat Paralel
                </span>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="text-xs text-slate-400">Diameter Kawat Pengganti Ideal (Eksak):</div>
                <div className="text-3xl font-bold font-mono text-white tabular-nums">
                  Ø {parallelCalc.requiredDiameterMm} mm
                </div>
                <div className="text-xs text-slate-400">
                  per kawat (luas per kawat: {(parallelCalc.totalAreaMm2 / targetParallel).toFixed(4)} mm²)
                </div>
              </div>

              {parallelCalc.closestStandardWire && (
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-2">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Ukuran Standar Pabrik Terdekat di Gudang:</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                      Ø {parallelCalc.closestStandardWire.diameterMm} mm
                    </span>
                    <span className="text-xs text-slate-300">
                      ({parallelCalc.closestStandardWire.swg} SWG / {parallelCalc.closestStandardWire.awg} AWG)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20 text-slate-300">
                    <span>Selisih Luas Penampang:</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        Math.abs(areaDiffPercent) <= 3
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {areaDiffPercent > 0 ? `+${areaDiffPercent}%` : `${areaDiffPercent}%`}
                      {Math.abs(areaDiffPercent) <= 3 ? ' (Sangat Aman)' : ' (Toleransi Wajar)'}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const text = `Hasil Hitung Rewinding CV. Mustofa Jaya Teknik:\nKawat Asli: ${origParallel}x Ø${origDia} mm (Total ${parallelCalc.totalAreaMm2} mm²)\nKawat Pengganti: ${targetParallel}x Ø${chosenSubstituteDia} mm (${parallelCalc.closestStandardWire ? `${parallelCalc.closestStandardWire.swg} SWG` : 'Eksak'})\nSelisih Luas: ${areaDiffPercent > 0 ? `+${areaDiffPercent}%` : `${areaDiffPercent}%`}`;
                  navigator.clipboard.writeText(text);
                  toast.success('Rangkuman perhitungan kawat disalin ke clipboard!', 'Berhasil Disalin');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 shadow-sm transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Salin Rangkuman Perhitungan Kawat</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              *Toleransi selisih penampang kawat standar rewinding industri adalah maksimal ± 3% s/d 5% agar slot fill factor dan arus nominal tetap optimal.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ARUS BEBAN (FLA & NO-LOAD) */}
      {activeTab === 'motor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Parameter Motor Listrik 3-Fasa</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Daya Motor (HP)</label>
                <input
                  type="number"
                  step="0.5"
                  value={motorHp}
                  onChange={(e) => handleHpInput(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Daya Motor (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={motorKw}
                  onChange={(e) => handleKwInput(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tegangan Jala-Jala (V)</label>
                <select
                  value={motorVolt}
                  onChange={(e) => setMotorVolt(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium mt-1"
                >
                  <option value={380}>380 Volt (Standar PLN 3-Phase)</option>
                  <option value={220}>220 Volt</option>
                  <option value={400}>400 Volt</option>
                  <option value={440}>440 Volt</option>
                  <option value={660}>660 Volt</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Jumlah Kutub (Pole)</label>
                <select
                  value={motorPoles}
                  onChange={(e) => setMotorPoles(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium mt-1"
                >
                  <option value={2}>2 Pole (3000 RPM Sync)</option>
                  <option value={4}>4 Pole (1500 RPM Sync)</option>
                  <option value={6}>6 Pole (1000 RPM Sync)</option>
                  <option value={8}>8 Pole (750 RPM Sync)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Faktor Daya (Cos φ)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.7"
                  max="0.95"
                  value={motorCosPhi}
                  onChange={(e) => setMotorCosPhi(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Efisiensi Motor (η)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.7"
                  max="0.98"
                  value={motorEff}
                  onChange={(e) => setMotorEff(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Results Output */}
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Hasil Estimasi Parameter Listrik
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">Arus Beban Penuh (Rated FLA)</span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums">
                  {calculatedFla} A
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">pada tegangan {motorVolt}V</span>
              </div>

              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">Kecepatan Sinkron</span>
                <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {syncRpm} RPM
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">{motorPoles} Pole 50Hz</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                <span>Acuan Arus Beban Kosong (No-Load Current):</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums">
                  {noLoadEst.min} A – {noLoadEst.max} A
                </span>
                <span className="text-xs text-emerald-300">(Rata-rata: {noLoadEst.avg} A)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Saat running test di meja pengujian tanpa beban mekanis, jika arus terukur berada dalam rentang ini dan seimbang pada ketiga fasa R-S-T (&lt;2% unbalance), maka gulungan stator dinyatakan normal!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESTIMASI BERAT TEMBAGA */}
      {activeTab === 'weight' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Dimensi Stator & Data Lilitan</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Jumlah Slot</label>
                <input
                  type="number"
                  value={slotsCount}
                  onChange={(e) => setSlotsCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Jumlah Lilitan / Slot (Turns)</label>
                <input
                  type="number"
                  value={turnsPerSlot}
                  onChange={(e) => setTurnsPerSlot(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Diameter Kawat (Ø mm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={wireDiaForWeight}
                  onChange={(e) => setWireDiaForWeight(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Jumlah Kawat Paralel</label>
                <input
                  type="number"
                  value={parallelForWeight}
                  onChange={(e) => setParallelForWeight(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Panjang Inti Kern (mm)</label>
                <input
                  type="number"
                  value={coreLengthMm}
                  onChange={(e) => setCoreLengthMm(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Diameter Dalam Stator (mm)</label>
                <input
                  type="number"
                  value={statorInnerDiaMm}
                  onChange={(e) => setStatorInnerDiaMm(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium text-slate-900 mt-1"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Estimasi Penggunaan Kawat Tembaga
              </h3>

              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 block mb-1">Perkiraan Berat Kawat Tembaga</span>
                <span className="text-3xl font-bold font-mono text-amber-400 tabular-nums">
                  {weightEst.copperWeightKg} kg
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Massa jenis tembaga ρ = 8.89 g/cm³ (+8% toleransi tekukan & leads)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block">Total Konduktor</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {weightEst.totalConductors} batang
                  </span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block">Panjang Rata-rata 1 Turn</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {weightEst.meanTurnLengthMeter} meter
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              *Gunakan estimasi ini untuk menyiapkan rol kawat tembaga email dari gudang sebelum pemotongan mal coil.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIAGRAM STAR & DELTA */}
      {activeTab === 'connection' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Skema Jumper Terminal Block Star (Bintang) vs Delta (Segitiga)
            </h3>
            <p className="text-xs text-slate-500">
              Panduan pemasangan plat jumper tembaga pada terminal box 6 pin (U1, V1, W1 dan W2, U2, V2)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Star Connection Diagram */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">1. Sambungan Bintang / Star (Y)</h4>
                <span className="text-[11px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded">
                  Tegangan Tinggi (380V / 660V)
                </span>
              </div>

              {/* Visual Terminal block layout */}
              <div className="bg-white p-4 rounded-lg border border-slate-300 flex flex-col items-center justify-center space-y-3">
                {/* Top Row: W2, U2, V2 */}
                <div className="flex items-center gap-6 relative">
                  {/* Jumper horizontal bar */}
                  <div className="absolute top-1/2 left-2 right-2 h-2 bg-amber-400 -translate-y-1/2 rounded z-0 border border-amber-500 shadow-xs"></div>

                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                    W2
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                    U2
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                    V2
                  </div>
                </div>

                <div className="text-[11px] text-amber-700 font-medium">
                  ← Plat jumper menghubungkan pin W2 - U2 - V2 →
                </div>

                {/* Bottom Row: U1, V1, W1 */}
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-slate-300">
                    U1
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-slate-300">
                    V1
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-slate-300">
                    W1
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Input Sumber Listrik 3-Fasa: <strong>R (ke U1) · S (ke V1) · T (ke W1)</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-600">
                Arus jala-jala sama dengan arus fasa (I-Line = I-Phase). Digunakan untuk start motor atau motor dengan tegangan kerja tinggi agar lonjakan arus start lebih rendah.
              </p>
            </div>

            {/* Delta Connection Diagram */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">2. Sambungan Segitiga / Delta (Δ)</h4>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                  Torsi Penuh (220V / 380V)
                </span>
              </div>

              {/* Visual Terminal block layout */}
              <div className="bg-white p-4 rounded-lg border border-slate-300 flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center gap-6">
                  {/* Column 1: W2 to U1 */}
                  <div className="flex flex-col items-center gap-2 relative">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                      W2
                    </div>
                    <div className="w-2 h-6 bg-amber-400 rounded border border-amber-500"></div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                      U1
                    </div>
                  </div>

                  {/* Column 2: U2 to V1 */}
                  <div className="flex flex-col items-center gap-2 relative">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                      U2
                    </div>
                    <div className="w-2 h-6 bg-amber-400 rounded border border-amber-500"></div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                      V1
                    </div>
                  </div>

                  {/* Column 3: V2 to W1 */}
                  <div className="flex flex-col items-center gap-2 relative">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                      V2
                    </div>
                    <div className="w-2 h-6 bg-amber-400 rounded border border-amber-500"></div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center z-10 border-2 border-amber-400">
                      W1
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Input Listrik 3-Fasa: <strong>R (U1) · S (V1) · T (W1)</strong> dengan 3 plat jumper vertikal
                </div>
              </div>

              <p className="text-[11px] text-slate-600">
                Tegangan jala-jala sama dengan tegangan fasa (V-Line = V-Phase). Motor menghasilkan daya dan torsi nominal maksimal sesuai nameplate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TABEL STANDAR KAWAT */}
      {activeTab === 'table' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tabel Referensi Kawat Tembaga Email Class H (200°C)
              </h3>
              <p className="text-xs text-slate-500">
                Ukuran standar diameter metrik (mm), gauge SWG & AWG, luas penampang, dan resistansi per km
              </p>
            </div>

            <input
              type="text"
              placeholder="Cari diameter (cth: 1.15) atau SWG..."
              value={wireSearch}
              onChange={(e) => setWireSearch(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 w-64"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Diameter (mm)</th>
                  <th className="py-2.5 px-3">SWG</th>
                  <th className="py-2.5 px-3">AWG</th>
                  <th className="py-2.5 px-3">Luas Penampang (mm²)</th>
                  <th className="py-2.5 px-3">Resistansi (Ω/km)</th>
                  <th className="py-2.5 px-3 text-right">Kapasitas Arus (~4A/mm²)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredWireTable.map((wire) => (
                  <tr key={wire.diameterMm} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      Ø {wire.diameterMm.toFixed(2)} mm
                    </td>
                    <td className="py-2 px-3 text-slate-700">{wire.swg}</td>
                    <td className="py-2 px-3 text-slate-700">{wire.awg}</td>
                    <td className="py-2 px-3 text-slate-900 tabular-nums">{wire.crossSectionMm2.toFixed(3)} mm²</td>
                    <td className="py-2 px-3 text-slate-600 tabular-nums">{wire.resistanceOhmPerKm.toFixed(1)} Ω</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-700 tabular-nums">
                      {wire.currentCapacityAmpere.toFixed(2)} A
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
