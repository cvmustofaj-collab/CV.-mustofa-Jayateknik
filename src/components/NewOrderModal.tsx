import React, { useState } from 'react';
import { WorkOrder, Customer, MachineType, OrderStatus } from '../types/rewinding';
import {
  calculateThreePhaseFLA,
  hpToKw,
  computeWorkOrderFinancials,
  formatRupiah,
  getDefaultInvoiceNumber,
} from '../utils/rewindingMath';
import { X, CheckCircle } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  existingOrdersCount: number;
  onSaveNewOrder: (newOrder: WorkOrder) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  customers,
  existingOrdersCount,
  onSaveNewOrder,
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const nextNumberStr = String(existingOrdersCount + 301).padStart(4, '0');
  const generatedSpkNumber = `SPK-MJT-${currentYear}-${nextNumberStr}`;
  const defaultInvoiceNumber = getDefaultInvoiceNumber(generatedSpkNumber);

  // Form states
  const [spkNumber] = useState(generatedSpkNumber);
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber);
  const [fakturPajakNumber, setFakturPajakNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  const [machineType, setMachineType] = useState<MachineType>('Motor 3 Fasa Induksi');
  const [brand, setBrand] = useState('TECO');
  const [modelOrType, setModelOrType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [powerHp, setPowerHp] = useState<number>(15);
  const [powerKw, setPowerKw] = useState<number>(11);
  const [rpm, setRpm] = useState<number>(1450);
  const [voltage, setVoltage] = useState('380 / 660 V');
  const [frameSize, setFrameSize] = useState('160M');
  const [complaint, setComplaint] = useState('Stator terbakar, short inter-turn fasa U-V, bau hangus.');
  const [technicianName, setTechnicianName] = useState('Cak Mustofa & Agus');
  const [priority, setPriority] = useState<'Biasa' | 'Penting' | 'Urgent / Lembur'>('Biasa');

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 5);
  const defaultTargetDate = nextWeek.toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState(todayStr);
  const [targetDate, setTargetDate] = useState(defaultTargetDate);

  // Financial & Tax initial estimates
  const [estimatedTotal, setEstimatedTotal] = useState<number>(3500000);
  const [taxPpnPercent, setTaxPpnPercent] = useState<number>(0);
  const [taxPphPercent, setTaxPphPercent] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(1000000);

  const financialPreview = computeWorkOrderFinancials({
    subtotal: estimatedTotal,
    discount: 0,
    taxPpnPercent,
    taxPphPercent,
    downPayment,
  });

  // When HP changes, sync kW and estimated rated current
  const handleHpChange = (val: number) => {
    setPowerHp(val);
    const kw = hpToKw(val);
    setPowerKw(kw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let custName = newCustomerName;
    let custComp = newCustomerCompany;
    let custPhone = newCustomerPhone;
    let custAddr = newCustomerAddress;

    if (!isNewCustomer) {
      const found = customers.find((c) => c.id === selectedCustomerId);
      if (found) {
        custName = found.name;
        custComp = found.company;
        custPhone = found.phone;
        custAddr = found.address;
      }
    }

    const calculatedAmpere = calculateThreePhaseFLA(powerKw, 380, 0.85, 0.88);
    const fin = computeWorkOrderFinancials({
      subtotal: estimatedTotal,
      discount: 0,
      taxPpnPercent,
      taxPphPercent,
      downPayment,
    });

    const newOrder: WorkOrder = {
      id: `WO-${Date.now()}`,
      spkNumber,
      invoiceNumber: invoiceNumber.trim() || defaultInvoiceNumber,
      invoiceDate: entryDate,
      fakturPajakNumber: fakturPajakNumber.trim(),
      entryDate,
      targetCompletionDate: targetDate,
      customerId: isNewCustomer ? `CUST-${Date.now()}` : selectedCustomerId,
      customerName: custName || 'Pelanggan Walk-In',
      customerCompany: custComp || 'Umum',
      customerPhone: custPhone || '-',
      customerAddress: custAddr || '-',
      machineType,
      brand: brand || 'Standard Motor',
      modelOrType: modelOrType || '-',
      serialNumber: serialNumber || `SN-${Math.floor(10000 + Math.random() * 90000)}`,
      powerHp,
      powerKw,
      rpm,
      voltage,
      frequencyHz: 50,
      currentAmpereRated: calculatedAmpere,
      frameSize: frameSize || 'Standard',
      cosPhi: 0.85,
      ipRating: 'IP 55',
      complaint,
      inspection: {
        visualCondition: 'Stator terbakar, bearing kocak ringan.',
        meggerInitialBodyMOhm: 0.2,
        bearingFrontCondition: 'Wajib Ganti',
        bearingRearCondition: 'Kocak / Aus',
        rotorCondition: 'Rotor alur normal.',
        shaftRunoutMm: 0.02,
      },
      windingData: {
        slotsCount: 36,
        polesCount: 4,
        pitchCoil: '1 - 8',
        wireSizeMm: 1.15,
        turnsPerSlot: 28,
        parallelWires: 2,
        windingType: 'Lap Winding',
        insulationClass: 'Class H (180°C - 200°C)',
        insulationMaterial: 'Nomex 410 + Selongsong Silikon',
        copperWeightKg: Number((powerKw * 1.1).toFixed(1)),
        bakingVarnishType: 'Royal Diamond Class H Baking Varnish',
        bakingDurationHours: 6,
        bakingTempC: 130,
        connectionType: 'Star (Y)',
      },
      qcReport: {
        testedAt: '',
        testedBy: '',
        meggerPhasePhaseMOhm: { uv: 0, vw: 0, wu: 0 },
        meggerPhaseBodyMOhm: { uBody: 0, vBody: 0, wBody: 0 },
        windingResistanceOhm: { u: 0, v: 0, w: 0 },
        resistanceBalancePercent: 0,
        noLoadTest: {
          voltageRS: 380,
          voltageST: 380,
          voltageTR: 380,
          currentR: 0,
          currentS: 0,
          currentT: 0,
          currentBalanceStatus: 'PASS',
          rpmMeasured: 0,
          bearingVibrationMmS: 0,
          bearingTempC: 0,
          noiseDb: 0,
        },
        summaryVerdict: 'PERLU RE-CHECK',
        notes: 'Unit baru masuk workshop. Siap dibongkar dan diinspeksi.',
      },
      status: 'Diterima' as OrderStatus,
      priority,
      technicianName,
      serviceItems: [
        {
          id: '1',
          description: `Jasa Rewinding Stator ${machineType} ${powerHp} HP (${powerKw} kW)`,
          quantity: 1,
          unit: 'unit',
          unitPrice: Math.round(estimatedTotal * 0.45),
          total: Math.round(estimatedTotal * 0.45),
        },
        {
          id: '2',
          description: `Kawat Tembaga Helenic 200°C Class H`,
          quantity: Number((powerKw * 1.1).toFixed(1)),
          unit: 'kg',
          unitPrice: 190000,
          total: Math.round(Number((powerKw * 1.1).toFixed(1)) * 190000),
        },
        {
          id: '3',
          description: `Isolasi Nomex 410 + Varnish Oven 130°C`,
          quantity: 1,
          unit: 'lot',
          unitPrice: 350000,
          total: 350000,
        },
        {
          id: '4',
          description: `Penggantian Bearing SKF High Speed C3`,
          quantity: 2,
          unit: 'pcs',
          unitPrice: 195000,
          total: 390000,
        },
      ],
      laborCost: Math.round(estimatedTotal * 0.45),
      partsCost: estimatedTotal,
      discount: 0,
      taxPpnPercent: fin.taxPpnPercent,
      taxPpnAmount: fin.taxPpnAmount,
      taxPphPercent: fin.taxPphPercent,
      taxPphAmount: fin.taxPphAmount,
      grandTotal: fin.grandTotal,
      netPayableTotal: fin.netPayableTotal,
      downPayment,
      balanceDue: fin.balanceDue,
      paymentStatus: fin.paymentStatus,
      warrantyMonths: 6,
      warrantyNotes: 'Garansi 6 bulan untuk gulungan kawat tembaga.',
    };

    onSaveNewOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
              SPK
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Buat Surat Perintah Kerja (SPK) Baru
              </h3>
              <p className="text-xs text-slate-400">
                Pencatatan unit masuk bengkel & estimasi pengerjaan rewinding
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Top Bar: SPK Number & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Nomor SPK Otomatis</label>
              <input
                type="text"
                readOnly
                value={spkNumber}
                className="w-full bg-white border border-amber-300 rounded p-1.5 font-mono font-bold text-amber-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Tanggal Masuk</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Prioritas Pengerjaan</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 font-semibold text-slate-800"
              >
                <option value="Biasa">Biasa (Standar 5-7 Hari)</option>
                <option value="Penting">Penting (3-4 Hari)</option>
                <option value="Urgent / Lembur">Urgent / Lembur (1-2 Hari)</option>
              </select>
            </div>
          </div>

          {/* Section: Pelanggan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Data Pelanggan</span>
              <button
                type="button"
                onClick={() => setIsNewCustomer(!isNewCustomer)}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold"
              >
                {isNewCustomer ? '← Pilih dari database pelanggan' : '+ Pelanggan Baru / Walk-in'}
              </button>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[11px] text-slate-500">Perusahaan / Pabrik</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. Sumber Makmur"
                    value={newCustomerCompany}
                    onChange={(e) => setNewCustomerCompany(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Nama Kontak</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bpk. Gunawan"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">No. Telp / WA</label>
                  <input
                    type="text"
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Alamat</label>
                  <input
                    type="text"
                    placeholder="Kota / Daerah"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-[11px] text-slate-500 mb-1 block">Pilih Pelanggan Terdaftar</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} — {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section: Spesifikasi Mesin */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 text-xs">Spesifikasi Unit Mesin Masuk</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="col-span-2">
                <label className="text-[11px] text-slate-500">Jenis Unit</label>
                <select
                  value={machineType}
                  onChange={(e) => setMachineType(e.target.value as MachineType)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                >
                  <option value="Motor 3 Fasa Induksi">Motor 3 Fasa Induksi</option>
                  <option value="Motor 1 Fasa">Motor 1 Fasa</option>
                  <option value="Generator / Alternator Genset">Generator / Alternator Genset</option>
                  <option value="Transformator (Trafo)">Transformator (Trafo)</option>
                  <option value="Pompa Submersible / Celup">Pompa Submersible / Celup</option>
                  <option value="Armature / DC Motor">Armature / DC Motor</option>
                  <option value="Rotor Slip Ring">Rotor Slip Ring</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Merek Mesin</label>
                <input
                  type="text"
                  required
                  placeholder="TECO, Siemens, ABB, WEG..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Tipe / Model</label>
                <input
                  type="text"
                  placeholder="e.g. 1LE1001 / AESV"
                  value={modelOrType}
                  onChange={(e) => setModelOrType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Daya (HP)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={powerHp}
                  onChange={(e) => handleHpChange(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Daya (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={powerKw}
                  onChange={(e) => setPowerKw(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Kecepatan RPM</label>
                <input
                  type="number"
                  value={rpm}
                  onChange={(e) => setRpm(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Voltase Operasi</label>
                <input
                  type="text"
                  value={voltage}
                  onChange={(e) => setVoltage(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Frame Size</label>
                <input
                  type="text"
                  placeholder="e.g. 132M, 160L"
                  value={frameSize}
                  onChange={(e) => setFrameSize(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">Nomor Seri (Serial No)</label>
                <input
                  type="text"
                  placeholder="Serial Number nameplate"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] text-slate-500">Teknisi PIC</label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section: Keluhan & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600">Keluhan Kerusakan / Kondisi Awal</label>
              <textarea
                rows={2}
                required
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Deskripsi kerusakan saat diterima..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Target Tanggal Selesai</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium mt-1"
              />
            </div>
          </div>

          {/* Section: Invois, Faktur PPN/PPh & DP */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-900 text-xs">
              Invois, Faktur Pajak PPN/PPh &amp; Estimasi Keuangan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">No. Invois</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-bold text-slate-900 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">No. Faktur Pajak (Opsional)</label>
                <input
                  type="text"
                  value={fakturPajakNumber}
                  onChange={(e) => setFakturPajakNumber(e.target.value)}
                  placeholder="010.004-26.xxxxxxxx"
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono text-slate-900 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Estimasi DPP Jasa &amp; Material (Rp)</label>
                <input
                  type="number"
                  required
                  value={estimatedTotal}
                  onChange={(e) => setEstimatedTotal(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-bold text-slate-900 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">PPN (%)</label>
                <select
                  value={taxPpnPercent}
                  onChange={(e) => setTaxPpnPercent(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-semibold text-slate-800 mt-1"
                >
                  <option value={0}>0% (Non-PPN)</option>
                  <option value={11}>11% (PPN Umum)</option>
                  <option value={12}>12% (PPN)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Potongan PPh (%)</label>
                <select
                  value={taxPphPercent}
                  onChange={(e) => setTaxPphPercent(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-semibold text-slate-800 mt-1"
                >
                  <option value={0}>0% (Non-PPh)</option>
                  <option value={2}>2% (PPh Ps. 23 Jasa)</option>
                  <option value={1.5}>1.5% (PPh Ps. 22)</option>
                  <option value={4}>4% (PPh Final)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Uang Muka / DP Awal (Rp)</label>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-bold text-emerald-700 mt-1"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-sky-700">
                PPN: +{formatRupiah(financialPreview.taxPpnAmount)}
              </span>
              <span className="text-amber-700">
                PPh: -{formatRupiah(financialPreview.taxPphAmount)}
              </span>
              <span className="font-bold text-slate-900">
                Net Tagihan: {formatRupiah(financialPreview.netPayableTotal)}
              </span>
              <span className="font-bold text-rose-700">
                Sisa: {formatRupiah(financialPreview.balanceDue)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Simpan & Terbitkan SPK</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
