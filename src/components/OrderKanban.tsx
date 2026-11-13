import React from 'react';
import { WorkOrder, OrderStatus } from '../types/rewinding';
import { formatIndoDate } from '../utils/rewindingMath';
import { Clock, Eye, Printer } from 'lucide-react';

interface OrderKanbanProps {
  orders: WorkOrder[];
  onSelectOrder: (order: WorkOrder) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onPrintDocument: (order: WorkOrder, docType: 'spk' | 'qc' | 'invoice') => void;
}

const KANBAN_STAGES: { status: OrderStatus; label: string; headerClass: string }[] = [
  { status: 'Diterima', label: '1. Diterima', headerClass: 'border-slate-300 text-slate-700' },
  { status: 'Bongkar & Inspeksi', label: '2. Inspeksi', headerClass: 'border-blue-400 text-blue-700' },
  { status: 'Proses Rewinding', label: '3. Gulung Kawat', headerClass: 'border-amber-400 text-amber-700' },
  { status: 'Varnish & Oven', label: '4. Oven 135°C', headerClass: 'border-orange-400 text-orange-700' },
  { status: 'QC & Pengetesan', label: '5. QC & Megger', headerClass: 'border-indigo-400 text-indigo-700' },
  { status: 'Selesai & Siap Diambil', label: '6. Siap Diambil', headerClass: 'border-emerald-400 text-emerald-700' },
  { status: 'Diserahkan / Faktur', label: '7. Selesai / Arsip', headerClass: 'border-teal-400 text-teal-700' },
];

export const OrderKanban: React.FC<OrderKanbanProps> = ({
  orders,
  onSelectOrder,
  onUpdateStatus,
  onPrintDocument,
}) => {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1280px]">
        {KANBAN_STAGES.map((stage) => {
          const stageOrders = orders.filter((o) => o.status === stage.status);

          return (
            <div
              key={stage.status}
              className="flex-1 bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex flex-col min-w-[210px] max-w-[260px]"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between pb-2 mb-3 border-b-2 font-bold text-xs ${stage.headerClass}`}
              >
                <span>{stage.label}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-700 shadow-2xs tabular-nums">
                  {stageOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
                {stageOrders.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-slate-400 italic">
                    Kosong
                  </div>
                ) : (
                  stageOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:border-amber-400 transition-all shadow-2xs text-left group"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-900">
                          {order.spkNumber}
                        </span>
                        {order.priority === 'Urgent / Lembur' && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            URGENT
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {order.brand} {order.powerHp} HP
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2">
                        {order.customerCompany || order.customerName}
                      </div>

                      <div className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 mb-2 space-y-0.5 text-slate-600">
                        <div>
                          Kawat: <strong className="text-slate-800">Ø {order.windingData.wireSizeMm} mm</strong> ({order.windingData.slotsCount} slot)
                        </div>
                        <div>
                          Teknisi: <strong className="text-slate-800">{order.technicianName}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatIndoDate(order.targetCompletionDate)}
                        </span>
                        <span className="font-semibold text-slate-600">
                          {order.windingData.insulationClass.split(' ')[0]}
                        </span>
                      </div>

                      {/* Action buttons on card */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSelectOrder(order)}
                            title="Buka Detail SPK"
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintDocument(order, 'spk')}
                            title="Cetak SPK"
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Move status forward selector */}
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                          className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                        >
                          <option value="Diterima">Diterima</option>
                          <option value="Bongkar & Inspeksi">Inspeksi</option>
                          <option value="Proses Rewinding">Gulung</option>
                          <option value="Varnish & Oven">Oven</option>
                          <option value="QC & Pengetesan">QC Test</option>
                          <option value="Selesai & Siap Diambil">Siap Diambil</option>
                          <option value="Diserahkan / Faktur">Selesai/Faktur</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
