import React, { useState } from 'react';
import { WorkOrder, OrderStatus } from '../types/rewinding';
import { formatRupiah, formatIndoDate, getOrderFinancialSummary } from '../utils/rewindingMath';
import { OrderKanban } from './OrderKanban';
import { 
  Search, 
  Plus, 
  Printer, 
  Eye, 
  Trash2, 
  LayoutList, 
  Kanban,
  FileCheck2,
  Receipt
} from 'lucide-react';

interface OrderListProps {
  orders: WorkOrder[];
  isAdmin?: boolean;
  onSelectOrder: (order: WorkOrder) => void;
  onOpenNewOrder: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onPrintDocument: (order: WorkOrder, docType: 'spk' | 'qc' | 'invoice') => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  isAdmin = false,
  onSelectOrder,
  onOpenNewOrder,
  onUpdateStatus,
  onDeleteOrder,
  onPrintDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter orders (termasuk pencarian No. Invois & Faktur Pajak)
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    const fin = getOrderFinancialSummary(order);
    const matchSearch =
      order.spkNumber.toLowerCase().includes(query) ||
      fin.invoiceNumber.toLowerCase().includes(query) ||
      fin.fakturPajakNumber.toLowerCase().includes(query) ||
      order.customerCompany.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.brand.toLowerCase().includes(query) ||
      order.machineType.toLowerCase().includes(query) ||
      order.technicianName.toLowerCase().includes(query);

    const matchStatus =
      selectedStatus === 'all' || order.status === selectedStatus;

    return matchSearch && matchStatus;
  });

  const financeTotals = filteredOrders.reduce(
    (acc, order) => {
      const fin = getOrderFinancialSummary(order);
      acc.dpp += fin.dpp;
      acc.ppn += fin.taxPpnAmount;
      acc.pph += fin.taxPphAmount;
      acc.net += fin.netPayableTotal;
      acc.balance += fin.balanceDue;
      return acc;
    },
    { dpp: 0, ppn: 0, pph: 0, net: 0, balance: 0 }
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Diterima':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Bongkar & Inspeksi':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Proses Rewinding':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Varnish & Oven':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Assembling':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'QC & Pengetesan':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Selesai & Siap Diambil':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Diserahkan / Faktur':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Surat Perintah Kerja (SPK) & Pengerjaan
          </h1>
          <p className="text-xs text-slate-500">
            Daftar lengkap perbaikan, data gulungan kawat teknis, dan riwayat pengetesan unit
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Papan Alur</span>
            </button>
          </div>

          <button
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat SPK Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No SPK, No Invois, Faktur Pajak, Pelanggan, Mesin, atau Teknisi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter Segmented tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'Diterima', label: 'Diterima' },
            { id: 'Bongkar & Inspeksi', label: 'Inspeksi' },
            { id: 'Proses Rewinding', label: 'Rewinding' },
            { id: 'Varnish & Oven', label: 'Oven' },
            { id: 'QC & Pengetesan', label: 'QC Test' },
            { id: 'Selesai & Siap Diambil', label: 'Siap Diambil' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ringkasan Invois, PPN, PPh & Keuangan */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total DPP ({filteredOrders.length} SPK)</div>
          <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            {formatRupiah(financeTotals.dpp)}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total PPN Keluaran</div>
          <div className="text-sm font-bold text-sky-700 font-mono tabular-nums mt-0.5">
            {formatRupiah(financeTotals.ppn)}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total Potongan PPh</div>
          <div className="text-sm font-bold text-amber-700 font-mono tabular-nums mt-0.5">
            {formatRupiah(financeTotals.pph)}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total Tagihan Net</div>
          <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
            {formatRupiah(financeTotals.net)}
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="text-[11px] font-medium text-slate-500">Sisa Piutang Usaha</div>
          <div className="text-sm font-bold text-rose-700 font-mono tabular-nums mt-0.5">
            {formatRupiah(financeTotals.balance)}
          </div>
        </div>
      </div>

      {/* Content View: Table or Kanban */}
      {viewMode === 'kanban' ? (
        <OrderKanban
          orders={filteredOrders}
          onSelectOrder={onSelectOrder}
          onUpdateStatus={onUpdateStatus}
          onPrintDocument={onPrintDocument}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">No SPK &amp; Tgl</th>
                  <th className="py-3 px-3.5">Pelanggan / Pabrik</th>
                  <th className="py-3 px-3.5">Spesifikasi Mesin</th>
                  <th className="py-3 px-3.5">Data Gulungan</th>
                  <th className="py-3 px-3.5">Status Pengerjaan</th>
                  <th className="py-3 px-3.5">Invois &amp; Faktur Pajak</th>
                  <th className="py-3 px-3.5 text-right">PPN / PPh Keuangan</th>
                  <th className="py-3 px-3.5 text-center">Dokumen &amp; Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Tidak ada data SPK yang sesuai dengan pencarian atau filter status.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const fin = getOrderFinancialSummary(order);
                    return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* SPK Number & Date */}
                      <td className="py-3 px-3.5 align-top">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="font-mono font-bold text-slate-900 hover:text-amber-600 text-xs block text-left"
                        >
                          {order.spkNumber}
                        </button>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Masuk: {formatIndoDate(order.entryDate)}
                        </div>
                        {order.priority === 'Urgent / Lembur' && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            URGENT
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {order.customerCompany || order.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {order.customerName} · {order.customerPhone}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Teknisi: <span className="font-medium text-slate-700">{order.technicianName}</span>
                        </div>
                      </td>

                      {/* Machine Spec */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {order.brand} {order.powerHp} HP ({order.powerKw} kW)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {order.machineType} · {order.rpm} RPM · {order.voltage}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                          Kerusakan: {order.complaint}
                        </div>
                      </td>

                      {/* Winding Technical Data */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-mono text-slate-800 text-[11px]">
                          Ø <strong>{order.windingData.wireSizeMm} mm</strong> · {order.windingData.turnsPerSlot} lilitan
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {order.windingData.slotsCount} Slot · Pitch {order.windingData.pitchCoil}
                        </div>
                        <div className="text-[10px] text-amber-700 font-medium">
                          {order.windingData.insulationClass.split(' ')[0]} · {order.windingData.copperWeightKg} kg kawat
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 align-top">
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className={`text-xs font-semibold px-2 py-1 rounded-md border outline-none cursor-pointer ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          <option value="Diterima">Diterima</option>
                          <option value="Bongkar & Inspeksi">Bongkar &amp; Inspeksi</option>
                          <option value="Proses Rewinding">Proses Rewinding</option>
                          <option value="Varnish & Oven">Varnish &amp; Oven</option>
                          <option value="Assembling">Assembling</option>
                          <option value="QC & Pengetesan">QC &amp; Pengetesan</option>
                          <option value="Selesai & Siap Diambil">Selesai &amp; Siap Diambil</option>
                          <option value="Diserahkan / Faktur">Diserahkan / Faktur</option>
                        </select>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Target: {formatIndoDate(order.targetCompletionDate)}
                        </div>
                      </td>

                      {/* Kolom Invois & Faktur Pajak */}
                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onPrintDocument(order, 'invoice')}
                          title="Klik untuk membuka/cetak Faktur Invois"
                          className="font-mono font-bold text-slate-900 hover:text-emerald-700 text-[11px] block text-left"
                        >
                          {fin.invoiceNumber}
                        </button>
                        <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                          FP: {fin.fakturPajakNumber || 'Non-PKP / Belum Ada'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tgl: {formatIndoDate(fin.invoiceDate)}
                        </div>
                      </td>

                      {/* Kolom PPN / PPh & Keuangan */}
                      <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono tabular-nums">
                          {formatRupiah(fin.netPayableTotal)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono tabular-nums space-y-0.5">
                          {fin.taxPpnPercent > 0 ? (
                            <div className="text-sky-700">
                              PPN {fin.taxPpnPercent}%: +{formatRupiah(fin.taxPpnAmount)}
                            </div>
                          ) : (
                            <div className="text-slate-400">PPN 0%</div>
                          )}
                          {fin.taxPphPercent > 0 && (
                            <div className="text-amber-700">
                              PPh {fin.taxPphPercent}%: -{formatRupiah(fin.taxPphAmount)}
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <span
                            className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              order.paymentStatus === 'Lunas'
                                ? 'bg-emerald-50 text-emerald-700'
                                : order.paymentStatus === 'DP / Sebagian'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                        {fin.balanceDue > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5 font-mono tabular-nums">
                            Sisa: {formatRupiah(fin.balanceDue)}
                          </div>
                        )}
                      </td>

                      {/* Action & Documents */}
                      <td className="py-3 px-3.5 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectOrder(order)}
                            title="Buka Lembar Pengerjaan Lengkap"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print SPK */}
                          <button
                            onClick={() => onPrintDocument(order, 'spk')}
                            title="Cetak SPK Workshop"
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Print QC Certificate */}
                          <button
                            onClick={() => onPrintDocument(order, 'qc')}
                            title="Cetak Sertifikat QC & Pengujian Megger"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <FileCheck2 className="w-4 h-4" />
                          </button>

                          {/* Print Invoice */}
                          <button
                            onClick={() => onPrintDocument(order, 'invoice')}
                            title="Cetak Kwitansi / Faktur Penagihan"
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            confirmDeleteId === order.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteOrder(order.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded"
                                >
                                  Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold rounded"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(order.id)}
                                title="Hapus SPK (Khusus Administrator)"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
