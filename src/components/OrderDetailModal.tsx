import React, { useState, useEffect } from 'react';
import { WorkOrder, OrderStatus, InsulationClass, ConnectionType, ServiceItem } from '../types/rewinding';
import {
  formatRupiah,
  evaluateInsulationResistance,
  computeWorkOrderFinancials,
  getDefaultInvoiceNumber,
} from '../utils/rewindingMath';
import { 
  X, 
  Save, 
  Printer, 
  FileCheck2, 
  Receipt, 
  Cpu, 
  Wrench, 
  Activity, 
  DollarSign, 
  Plus, 
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';

interface OrderDetailModalProps {
  order: WorkOrder;
  isOpen: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onSaveOrder: (updatedOrder: WorkOrder) => void;
  onPrintDocument: (order: WorkOrder, docType: 'spk' | 'qc' | 'invoice') => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  isAdmin = false,
  onClose,
  onSaveOrder,
  onPrintDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'winding' | 'qc' | 'billing'>('info');
  const [formData, setFormData] = useState<WorkOrder>({ ...order });
  const isLockedForUser = order.status === 'Diserahkan / Faktur' && !isAdmin;

  useEffect(() => {
    setFormData({
      ...order,
      invoiceNumber: order.invoiceNumber || getDefaultInvoiceNumber(order.spkNumber),
      invoiceDate:
        order.invoiceDate || order.actualCompletionDate || order.targetCompletionDate || order.entryDate,
      fakturPajakNumber: order.fakturPajakNumber || '',
      taxPphPercent: order.taxPphPercent ?? 0,
    });
  }, [order]);

  if (!isOpen) return null;

  // Handler for nested field changes
  const updateNestedField = (section: keyof WorkOrder, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  // Add line item
  const handleAddServiceItem = () => {
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      description: 'Item Pekerjaan Baru',
      quantity: 1,
      unit: 'lot',
      unitPrice: 0,
      total: 0,
    };
    const updatedItems = [...formData.serviceItems, newItem];
    recalculateTotals(
      updatedItems,
      formData.discount,
      formData.downPayment,
      formData.taxPpnPercent,
      formData.taxPphPercent ?? 0
    );
  };

  const handleUpdateItem = (index: number, field: keyof ServiceItem, value: any) => {
    const updated = [...formData.serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(value) : updated[index].quantity;
      const price = field === 'unitPrice' ? Number(value) : updated[index].unitPrice;
      updated[index].total = qty * price;
    }
    recalculateTotals(
      updated,
      formData.discount,
      formData.downPayment,
      formData.taxPpnPercent,
      formData.taxPphPercent ?? 0
    );
  };

  const handleDeleteItem = (index: number) => {
    const updated = formData.serviceItems.filter((_, i) => i !== index);
    recalculateTotals(
      updated,
      formData.discount,
      formData.downPayment,
      formData.taxPpnPercent,
      formData.taxPphPercent ?? 0
    );
  };

  const recalculateTotals = (
    items: ServiceItem[],
    discountVal: number,
    dpVal: number,
    ppnPercentVal: number = formData.taxPpnPercent,
    pphPercentVal: number = formData.taxPphPercent ?? 0
  ) => {
    const subtotal = items.reduce((acc, curr) => acc + curr.total, 0);
    const calc = computeWorkOrderFinancials({
      subtotal,
      discount: discountVal,
      taxPpnPercent: ppnPercentVal,
      taxPphPercent: pphPercentVal,
      downPayment: dpVal,
    });

    setFormData((prev) => ({
      ...prev,
      serviceItems: items,
      partsCost: subtotal,
      discount: discountVal,
      taxPpnPercent: calc.taxPpnPercent,
      taxPpnAmount: calc.taxPpnAmount,
      taxPphPercent: calc.taxPphPercent,
      taxPphAmount: calc.taxPphAmount,
      grandTotal: calc.grandTotal,
      netPayableTotal: calc.netPayableTotal,
      downPayment: dpVal,
      balanceDue: calc.balanceDue,
      paymentStatus: calc.paymentStatus,
    }));
  };

  const handleSave = () => {
    onSaveOrder(formData);
    onClose();
  };

  const meggerEvalU = evaluateInsulationResistance(formData.qcReport.meggerPhaseBodyMOhm.uBody);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
              {formData.spkNumber}
            </span>
            <span className="text-sm sm:text-base font-bold text-white">
              {formData.brand} {formData.powerHp} HP ({formData.powerKw} kW) - {formData.customerCompany}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintDocument(formData, 'spk')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>SPK</span>
            </button>
            <button
              onClick={() => onPrintDocument(formData, 'qc')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sertifikat QC</span>
            </button>
            <button
              onClick={() => onPrintDocument(formData, 'invoice')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Faktur</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 gap-4 overflow-x-auto">
          {[
            { id: 'info', label: '1. Spesifikasi Mesin & SPK', icon: Wrench },
            { id: 'winding', label: '2. Data Gulungan Kawat', icon: Cpu },
            { id: 'qc', label: '3. Hasil Uji QC & Megger', icon: Activity },
            { id: 'billing', label: '4. Invois, Faktur PPN/PPh & Garansi', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-700 bg-amber-50/50 px-2'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {isLockedForUser && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>SPK Final Terkunci:</strong> SPK berstatus &quot;Diserahkan / Faktur&quot; hanya dapat diubah oleh akun <strong>Administrator</strong>. Akun User tetap dapat mencetak SPK, Sertifikat QC, dan Faktur.
              </span>
            </div>
          )}
          {/* TAB 1: INFO MESIN & SPK */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Status Pengerjaan</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="Diterima">Diterima</option>
                    <option value="Bongkar & Inspeksi">Bongkar & Inspeksi</option>
                    <option value="Proses Rewinding">Proses Rewinding</option>
                    <option value="Varnish & Oven">Varnish & Oven</option>
                    <option value="Assembling">Assembling</option>
                    <option value="QC & Pengetesan">QC & Pengetesan</option>
                    <option value="Selesai & Siap Diambil">Selesai & Siap Diambil</option>
                    <option value="Diserahkan / Faktur">Diserahkan / Faktur</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Tingkat Prioritas</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Urgent / Lembur">Urgent / Lembur (Fast Track)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Teknisi Penanggung Jawab (PIC)</label>
                  <input
                    type="text"
                    value={formData.technicianName}
                    onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              {/* Customer info group */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Data Pelanggan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Nama Perusahaan / Pabrik</label>
                    <input
                      type="text"
                      value={formData.customerCompany}
                      onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Nama Kontak Person</label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">No. Telp / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Target Tanggal Selesai</label>
                    <input
                      type="date"
                      value={formData.targetCompletionDate}
                      onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Machine Specs Group */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Spesifikasi Nameplate Mesin</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Merek Mesin</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Daya (HP)</label>
                    <input
                      type="number"
                      value={formData.powerHp}
                      onChange={(e) => setFormData({ ...formData, powerHp: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Daya (kW)</label>
                    <input
                      type="number"
                      value={formData.powerKw}
                      onChange={(e) => setFormData({ ...formData, powerKw: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Kecepatan (RPM)</label>
                    <input
                      type="number"
                      value={formData.rpm}
                      onChange={(e) => setFormData({ ...formData, rpm: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Voltase</label>
                    <input
                      type="text"
                      value={formData.voltage}
                      onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Ampere Rated</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.currentAmpereRated}
                      onChange={(e) => setFormData({ ...formData, currentAmpereRated: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-500">Frame Size</label>
                    <input
                      type="text"
                      value={formData.frameSize}
                      onChange={(e) => setFormData({ ...formData, frameSize: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Nomor Seri (Serial No)</label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Keluhan Pelanggan / Kerusakan Awal</label>
                    <input
                      type="text"
                      value={formData.complaint}
                      onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Inspection */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Hasil Inspeksi Awal (Bongkar Unit)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Kondisi Bearing Depan</label>
                    <select
                      value={formData.inspection.bearingFrontCondition}
                      onChange={(e) => updateNestedField('inspection', 'bearingFrontCondition', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    >
                      <option value="Bagus">Bagus</option>
                      <option value="Kocak / Aus">Kocak / Aus</option>
                      <option value="Pecah / Macet">Pecah / Macet</option>
                      <option value="Wajib Ganti">Wajib Ganti</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Kondisi Bearing Belakang</label>
                    <select
                      value={formData.inspection.bearingRearCondition}
                      onChange={(e) => updateNestedField('inspection', 'bearingRearCondition', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    >
                      <option value="Bagus">Bagus</option>
                      <option value="Kocak / Aus">Kocak / Aus</option>
                      <option value="Pecah / Macet">Pecah / Macet</option>
                      <option value="Wajib Ganti">Wajib Ganti</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Tahanan Isolasi Awal (Megger MΩ)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.inspection.meggerInitialBodyMOhm}
                      onChange={(e) => updateNestedField('inspection', 'meggerInitialBodyMOhm', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Keolengan Poros / Shaft Runout (mm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.inspection.shaftRunoutMm}
                      onChange={(e) => updateNestedField('inspection', 'shaftRunoutMm', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA GULUNGAN KAWAT */}
          {activeTab === 'winding' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span>
                    <strong>Spesifikasi Teknis Gulungan Kawat:</strong> Data panduan tukang gulung kawat untuk menjamin torsi, efisiensi, dan daya tahan panas.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Jumlah Slot Stator</label>
                  <input
                    type="number"
                    value={formData.windingData.slotsCount}
                    onChange={(e) => updateNestedField('windingData', 'slotsCount', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Jumlah Pole (Kutub)</label>
                  <select
                    value={formData.windingData.polesCount}
                    onChange={(e) => updateNestedField('windingData', 'polesCount', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value={2}>2 Pole (~3000 RPM)</option>
                    <option value={4}>4 Pole (~1500 RPM)</option>
                    <option value={6}>6 Pole (~1000 RPM)</option>
                    <option value={8}>8 Pole (~750 RPM)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Pitch Langkah Coil (Alur)</label>
                  <input
                    type="text"
                    value={formData.windingData.pitchCoil}
                    onChange={(e) => updateNestedField('windingData', 'pitchCoil', e.target.value)}
                    placeholder="Contoh: 1 - 8, 1 - 10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Diameter Kawat (Ø mm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.windingData.wireSizeMm}
                    onChange={(e) => updateNestedField('windingData', 'wireSizeMm', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-amber-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Jumlah Lilitan / Slot (Turns)</label>
                  <input
                    type="number"
                    value={formData.windingData.turnsPerSlot}
                    onChange={(e) => updateNestedField('windingData', 'turnsPerSlot', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Jumlah Kawat Sejajar (Paralel)</label>
                  <input
                    type="number"
                    value={formData.windingData.parallelWires}
                    onChange={(e) => updateNestedField('windingData', 'parallelWires', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Berat Kawat Tembaga (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.windingData.copperWeightKg}
                    onChange={(e) => updateNestedField('windingData', 'copperWeightKg', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Jenis Sambungan</label>
                  <select
                    value={formData.windingData.connectionType}
                    onChange={(e) => updateNestedField('windingData', 'connectionType', e.target.value as ConnectionType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="Star (Y)">Star (Y)</option>
                    <option value="Delta (Δ)">Delta (Δ)</option>
                    <option value="Star-Delta (Y-Δ)">Star-Delta (Y-Δ)</option>
                    <option value="Series">Series</option>
                    <option value="Parallel">Parallel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Kelas Isolasi (Insulation Class)</label>
                  <select
                    value={formData.windingData.insulationClass}
                    onChange={(e) => updateNestedField('windingData', 'insulationClass', e.target.value as InsulationClass)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-amber-700"
                  >
                    <option value="Class H (180°C - 200°C)">Class H (180°C - 200°C) - Standar CV. MJT</option>
                    <option value="Class F (155°C)">Class F (155°C)</option>
                    <option value="Class B (130°C)">Class B (130°C)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Tipe Gulungan</label>
                  <select
                    value={formData.windingData.windingType}
                    onChange={(e) => updateNestedField('windingData', 'windingType', e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="Lap Winding">Lap Winding</option>
                    <option value="Double Layer">Double Layer</option>
                    <option value="Concentric">Concentric</option>
                    <option value="Wave Winding">Wave Winding</option>
                    <option value="Single Layer">Single Layer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Lama Oven (Jam)</label>
                  <input
                    type="number"
                    value={formData.windingData.bakingDurationHours}
                    onChange={(e) => updateNestedField('windingData', 'bakingDurationHours', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Suhu Oven (°C)</label>
                  <input
                    type="number"
                    value={formData.windingData.bakingTempC}
                    onChange={(e) => updateNestedField('windingData', 'bakingTempC', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Material Kertas & Isolasi Slot</label>
                  <input
                    type="text"
                    value={formData.windingData.insulationMaterial}
                    onChange={(e) => updateNestedField('windingData', 'insulationMaterial', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">Tipe Vernis Bakar (Varnish)</label>
                  <input
                    type="text"
                    value={formData.windingData.bakingVarnishType}
                    onChange={(e) => updateNestedField('windingData', 'bakingVarnishType', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HASIL UJI QC & MEGGER */}
          {activeTab === 'qc' && (
            <div className="space-y-4">
              {/* Verdict header banner */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Status Kelayakan QC</div>
                  <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                    {formData.qcReport.summaryVerdict === 'LAYAK OPERASI (LULUS QC)' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{formData.qcReport.summaryVerdict}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={formData.qcReport.summaryVerdict}
                    onChange={(e) => updateNestedField('qcReport', 'summaryVerdict', e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 font-medium"
                  >
                    <option value="LAYAK OPERASI (LULUS QC)">LAYAK OPERASI (LULUS QC)</option>
                    <option value="PERLU RE-CHECK">PERLU RE-CHECK</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </div>
              </div>

              {/* Insulation Resistance (Megger Test) Group */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>1. Uji Tahanan Isolasi (Megger Test 1000V DC)</span>
                    <span className="text-[10px] font-normal text-slate-500">Standar IEEE 43-2000</span>
                  </h4>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${meggerEvalU.badgeClass}`}>
                    {meggerEvalU.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phase to Body */}
                  <div className="space-y-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 text-[11px]">Tahanan Fasa ke Bodi (MΩ)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">U - Bodi</label>
                        <input
                          type="number"
                          value={formData.qcReport.meggerPhaseBodyMOhm.uBody}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              qcReport: {
                                ...prev.qcReport,
                                meggerPhaseBodyMOhm: { ...prev.qcReport.meggerPhaseBodyMOhm, uBody: val },
                              },
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">V - Bodi</label>
                        <input
                          type="number"
                          value={formData.qcReport.meggerPhaseBodyMOhm.vBody}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              qcReport: {
                                ...prev.qcReport,
                                meggerPhaseBodyMOhm: { ...prev.qcReport.meggerPhaseBodyMOhm, vBody: val },
                              },
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">W - Bodi</label>
                        <input
                          type="number"
                          value={formData.qcReport.meggerPhaseBodyMOhm.wBody}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              qcReport: {
                                ...prev.qcReport,
                                meggerPhaseBodyMOhm: { ...prev.qcReport.meggerPhaseBodyMOhm, wBody: val },
                              },
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase to Phase */}
                  <div className="space-y-2 p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 text-[11px]">Tahanan Antar Fasa (MΩ)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">U - V</label>
                        <input
                          type="number"
                          value={formData.qcReport.meggerPhasePhaseMOhm.uv}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              qcReport: {
                                ...prev.qcReport,
                                meggerPhasePhaseMOhm: { ...prev.qcReport.meggerPhasePhaseMOhm, uv: val },
                              },
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">V - W</label>
                        <input
                          type="number"
                          value={formData.qcReport.meggerPhasePhaseMOhm.vw}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              qcReport: {
                                ...prev.qcReport,
                                meggerPhasePhaseMOhm: { ...prev.qcReport.meggerPhasePhaseMOhm, vw: val },
                              },
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">W - U</label>
                        <input
                          type="number"
                          value={formData.qcReport.meggerPhasePhaseMOhm.wu}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              qcReport: {
                                ...prev.qcReport,
                                meggerPhasePhaseMOhm: { ...prev.qcReport.meggerPhasePhaseMOhm, wu: val },
                              },
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Test Group */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  2. Running Test Tanpa Beban (No-Load Test)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Ampere R (A)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.qcReport.noLoadTest.currentR}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          qcReport: {
                            ...prev.qcReport,
                            noLoadTest: { ...prev.qcReport.noLoadTest, currentR: val },
                          },
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Ampere S (A)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.qcReport.noLoadTest.currentS}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          qcReport: {
                            ...prev.qcReport,
                            noLoadTest: { ...prev.qcReport.noLoadTest, currentS: val },
                          },
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Ampere T (A)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.qcReport.noLoadTest.currentT}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          qcReport: {
                            ...prev.qcReport,
                            noLoadTest: { ...prev.qcReport.noLoadTest, currentT: val },
                          },
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">RPM Terukur</label>
                    <input
                      type="number"
                      value={formData.qcReport.noLoadTest.rpmMeasured}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          qcReport: {
                            ...prev.qcReport,
                            noLoadTest: { ...prev.qcReport.noLoadTest, rpmMeasured: val },
                          },
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Vibrasi (mm/s)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.qcReport.noLoadTest.bearingVibrationMmS}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          qcReport: {
                            ...prev.qcReport,
                            noLoadTest: { ...prev.qcReport.noLoadTest, bearingVibrationMmS: val },
                          },
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Suhu Bearing (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.qcReport.noLoadTest.bearingTempC}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          qcReport: {
                            ...prev.qcReport,
                            noLoadTest: { ...prev.qcReport.noLoadTest, bearingTempC: val },
                          },
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* QC Notes */}
              <div>
                <label className="text-slate-600 font-semibold text-xs">Catatan & Rekomendasi Teknisi Penguji</label>
                <textarea
                  rows={2}
                  value={formData.qcReport.notes}
                  onChange={(e) => updateNestedField('qcReport', 'notes', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium mt-1"
                />
              </div>
            </div>
          )}

          {/* TAB 4: INVOIS, FAKTUR PPN/PPh & GARANSI */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              {/* Identitas Invois & Faktur Pajak */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Identitas Invois &amp; Faktur Pajak (Keuangan)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Otomatis masuk Laporan Keuangan &amp; Google Sheets
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Nomor Invois</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber || ''}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      placeholder={getDefaultInvoiceNumber(formData.spkNumber)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Tanggal Invois / Faktur</label>
                    <input
                      type="date"
                      value={formData.invoiceDate || ''}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">No. Faktur Pajak (e-Faktur PPN)</label>
                    <input
                      type="text"
                      value={formData.fakturPajakNumber || ''}
                      onChange={(e) => setFormData({ ...formData, fakturPajakNumber: e.target.value })}
                      placeholder="Contoh: 010.004-26.00001234 (opsional)"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-900 mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs">Rincian Jasa &amp; Material Perbaikan</h4>
                <button
                  type="button"
                  onClick={handleAddServiceItem}
                  className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Item</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Deskripsi Pekerjaan / Part</th>
                      <th className="py-2.5 px-2 w-20">Jumlah</th>
                      <th className="py-2.5 px-2 w-20">Satuan</th>
                      <th className="py-2.5 px-3 w-32">Harga Satuan</th>
                      <th className="py-2.5 px-3 w-32 text-right">Total</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.serviceItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1 font-medium text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatRupiah(item.total)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial & Tax Calculation Summary */}
              {(() => {
                const subtotalCalc = formData.serviceItems.reduce((s, it) => s + (Number(it.total) || 0), 0);
                const dppCalc = Math.max(0, subtotalCalc - Number(formData.discount || 0));
                const ppnAmtCalc =
                  typeof formData.taxPpnAmount === 'number'
                    ? formData.taxPpnAmount
                    : Math.round(dppCalc * ((formData.taxPpnPercent || 0) / 100));
                const pphAmtCalc =
                  typeof formData.taxPphAmount === 'number'
                    ? formData.taxPphAmount
                    : Math.round(dppCalc * ((formData.taxPphPercent || 0) / 100));
                const netPayableCalc =
                  typeof formData.netPayableTotal === 'number' && formData.netPayableTotal > 0
                    ? formData.netPayableTotal
                    : Math.max(0, formData.grandTotal - pphAmtCalc);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-slate-600 font-semibold text-xs">Masa Garansi Servis (Bulan)</label>
                        <input
                          type="number"
                          value={formData.warrantyMonths}
                          onChange={(e) => setFormData({ ...formData, warrantyMonths: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-semibold text-xs">Ketentuan Garansi</label>
                        <input
                          type="text"
                          value={formData.warrantyNotes}
                          onChange={(e) => setFormData({ ...formData, warrantyNotes: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium mt-1"
                        />
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                        <div className="font-bold text-slate-800">Rumus Pajak Keuangan Workshop:</div>
                        <div>• DPP = Subtotal − Diskon ({formatRupiah(dppCalc)})</div>
                        <div>• PPN dihitung dari DPP ({formData.taxPpnPercent || 0}% × DPP)</div>
                        <div>• Potongan PPh 23 Jasa dihitung dari DPP ({formData.taxPphPercent || 0}% × DPP)</div>
                        <div>• Tagihan Net = Total Bruto (DPP + PPN) − Potongan PPh</div>
                      </div>
                    </div>

                    <div className="space-y-2 border-l border-slate-200 pl-4">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Subtotal Jasa &amp; Material</span>
                        <span className="font-mono tabular-nums">{formatRupiah(subtotalCalc)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Diskon / Potongan</span>
                        <input
                          type="number"
                          value={formData.discount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            recalculateTotals(
                              formData.serviceItems,
                              val,
                              formData.downPayment,
                              formData.taxPpnPercent,
                              formData.taxPphPercent ?? 0
                            );
                          }}
                          className="w-32 text-right bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                        />
                      </div>
                      <div className="flex justify-between items-center text-slate-700 font-semibold border-t border-slate-200 pt-1.5">
                        <span>Dasar Pengenaan Pajak (DPP)</span>
                        <span className="font-mono tabular-nums">{formatRupiah(dppCalc)}</span>
                      </div>

                      {/* PPN Selector + Amount */}
                      <div className="flex justify-between items-center gap-2 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>PPN</span>
                          <select
                            value={formData.taxPpnPercent}
                            onChange={(e) => {
                              const nextPpn = Number(e.target.value);
                              recalculateTotals(
                                formData.serviceItems,
                                formData.discount,
                                formData.downPayment,
                                nextPpn,
                                formData.taxPphPercent ?? 0
                              );
                            }}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                          >
                            <option value={0}>0% (Non-PPN)</option>
                            <option value={11}>11% (PPN Umum)</option>
                            <option value={12}>12% (PPN)</option>
                          </select>
                        </div>
                        <span className="font-mono tabular-nums text-sky-700 font-semibold">
                          + {formatRupiah(ppnAmtCalc)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-bold text-xs text-slate-800 border-t border-slate-200 pt-1.5">
                        <span>Total Faktur Bruto (DPP + PPN)</span>
                        <span className="font-mono tabular-nums">{formatRupiah(formData.grandTotal)}</span>
                      </div>

                      {/* PPh Selector + Amount */}
                      <div className="flex justify-between items-center gap-2 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>Potongan PPh</span>
                          <select
                            value={formData.taxPphPercent ?? 0}
                            onChange={(e) => {
                              const nextPph = Number(e.target.value);
                              recalculateTotals(
                                formData.serviceItems,
                                formData.discount,
                                formData.downPayment,
                                formData.taxPpnPercent,
                                nextPph
                              );
                            }}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                          >
                            <option value={0}>0% (Non-PPh)</option>
                            <option value={2}>2% (PPh Ps. 23 Jasa)</option>
                            <option value={1.5}>1.5% (PPh Ps. 22)</option>
                            <option value={4}>4% (PPh Final)</option>
                          </select>
                        </div>
                        <span className="font-mono tabular-nums text-amber-700 font-semibold">
                          - {formatRupiah(pphAmtCalc)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-extrabold text-sm text-slate-900 border-t-2 border-slate-300 pt-2">
                        <span>Total Tagihan Net (Keuangan)</span>
                        <span className="font-mono text-emerald-700 tabular-nums">
                          {formatRupiah(netPayableCalc)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-600">
                        <span>Uang Muka (DP) / Bayar Masuk</span>
                        <input
                          type="number"
                          value={formData.downPayment}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            recalculateTotals(
                              formData.serviceItems,
                              formData.discount,
                              val,
                              formData.taxPpnPercent,
                              formData.taxPphPercent ?? 0
                            );
                          }}
                          className="w-32 text-right bg-white border border-slate-200 rounded p-1 font-mono text-xs font-semibold text-emerald-700"
                        />
                      </div>
                      <div className="flex justify-between items-center font-semibold text-xs text-rose-700 border-t border-slate-200 pt-1">
                        <span>Sisa Piutang / Pembayaran</span>
                        <span className="font-mono tabular-nums">{formatRupiah(formData.balanceDue)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 text-[11px]">
                        <span className="text-slate-500">Status Pembayaran</span>
                        <span className="font-bold text-slate-900">{formData.paymentStatus}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintDocument(formData, 'spk')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak SPK</span>
            </button>
            <button
              onClick={() => onPrintDocument(formData, 'qc')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Cetak QC</span>
            </button>
            <button
              onClick={() => onPrintDocument(formData, 'invoice')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Cetak Faktur</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isLockedForUser}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-colors"
            >
              {isLockedForUser ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isLockedForUser ? 'Terkunci (Khusus Admin)' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
