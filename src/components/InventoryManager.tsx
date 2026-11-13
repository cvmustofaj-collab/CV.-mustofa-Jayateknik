import React, { useState } from 'react';
import { InventoryItem } from '../types/rewinding';
import { formatRupiah } from '../utils/rewindingMath';
import { 
  Warehouse, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  X,
  Edit2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onUpdateInventory: (updatedList: InventoryItem[]) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onUpdateInventory,
}) => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stockAdjustmentModalItem, setStockAdjustmentModalItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(5);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryItem['category']>('Kawat Tembaga');
  const [newItemSpec, setNewItemSpec] = useState('');
  const [newItemStock, setNewItemStock] = useState<number>(20);
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemMinAlert, setNewItemMinAlert] = useState<number>(10);
  const [newItemUnitCost, setNewItemUnitCost] = useState<number>(160000);
  const [newItemSellingPrice, setNewItemSellingPrice] = useState<number>(190000);
  const [newItemSupplier, setNewItemSupplier] = useState('');

  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStockAlert).length;

  const filteredItems = inventory.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.spec.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase());

    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleAdjustStock = (isAddition: boolean) => {
    if (!stockAdjustmentModalItem) return;
    const diff = isAddition ? adjustAmount : -adjustAmount;
    const itemTarget = stockAdjustmentModalItem;
    const updated = inventory.map((i) => {
      if (i.id === stockAdjustmentModalItem.id) {
        const newStock = Math.max(0, Number((i.currentStock + diff).toFixed(2)));
        return { ...i, currentStock: newStock, lastUpdated: new Date().toISOString().split('T')[0] };
      }
      return i;
    });
    onUpdateInventory(updated);
    toast.success(
      `Stok ${itemTarget.name} berhasil ${isAddition ? 'ditambah' : 'dikurangi'} ${adjustAmount} ${itemTarget.unit}.`,
      'Stok Diperbarui'
    );
    setStockAdjustmentModalItem(null);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = {
      id: `INV-${Date.now()}`,
      code: newItemCode || `KOD-${Math.floor(100 + Math.random() * 900)}`,
      name: newItemName,
      category: newItemCategory,
      spec: newItemSpec || 'Standar Bengkel Class H',
      currentStock: newItemStock,
      unit: newItemUnit,
      minStockAlert: newItemMinAlert,
      unitCost: newItemUnitCost,
      sellingPrice: newItemSellingPrice,
      supplier: newItemSupplier || 'Distributor Lokal',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    onUpdateInventory([item, ...inventory]);
    toast.success(`Material "${item.name}" berhasil ditambahkan ke inventaris!`, 'Item Baru Ditambahkan');
    setIsAddModalOpen(false);
    // Reset form
    setNewItemName('');
    setNewItemCode('');
    setNewItemSpec('');
  };

  const handleDeleteItem = (id: string) => {
    const itemToDelete = inventory.find((i) => i.id === id);
    if (confirm(`Yakin ingin menghapus "${itemToDelete?.name || 'item ini'}" dari inventaris?`)) {
      onUpdateInventory(inventory.filter((i) => i.id !== id));
      toast.info(`Item "${itemToDelete?.name || 'Material'}" telah dihapus dari inventaris.`, 'Item Dihapus');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-amber-500" />
            <span>Inventaris Kawat Email, Isolasi & Sparepart</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manajemen stok material rewinding: Kawat tembaga murni 200°C Class H, Nomex 410, Vernis Bakar, dan Bearing SKF
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Stok Baru</span>
        </button>
      </div>

      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Ada <strong>{lowStockCount} material</strong> yang stoknya sudah mencapai batas minimum. Harap lakukan pemesanan ulang (PO) kawat atau part.
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearch('');
            }}
            className="text-xs font-bold underline text-rose-700 shrink-0"
          >
            Lihat Stok Kritis
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode kawat (cth: 1.15), nama bahan, bearing, atau supplier..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'Semua Kategori' },
            { id: 'Kawat Tembaga', label: 'Kawat Tembaga' },
            { id: 'Isolasi & Vernis', label: 'Isolasi & Vernis' },
            { id: 'Bearing', label: 'Bearing' },
            { id: 'Aksesoris & Part', label: 'Aksesoris & Part' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Kode & Nama Material</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Spesifikasi Teknis</th>
                <th className="py-2.5 px-3 text-right">Sisa Stok</th>
                <th className="py-2.5 px-3 text-right">Harga Jual / Satuan</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isLow = item.currentStock <= item.minStockAlert;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono text-[11px] text-slate-500">{item.code}</div>
                      <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                    </td>

                    <td className="py-3 px-3 align-top">
                      <span className="text-xs text-slate-600">{item.category}</span>
                    </td>

                    <td className="py-3 px-3 align-top">
                      <div className="text-xs text-slate-700">{item.spec}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Update: {item.lastUpdated}</div>
                    </td>

                    <td className="py-3 px-3 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {item.currentStock} {item.unit}
                        </span>
                        {isLow && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                            LOW
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Min: {item.minStockAlert} {item.unit}
                      </div>
                    </td>

                    <td className="py-3 px-3 align-top text-right">
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatRupiah(item.sellingPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        Modal: {formatRupiah(item.unitCost)}
                      </div>
                    </td>

                    <td className="py-3 px-3 align-top">
                      <div className="text-xs text-slate-700">{item.supplier}</div>
                    </td>

                    <td className="py-3 px-3 align-top text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setStockAdjustmentModalItem(item);
                            setAdjustAmount(item.unit === 'pcs' || item.unit === 'kaleng' ? 2 : 5);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px] transition-colors"
                        >
                          Ubah Stok
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {stockAdjustmentModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Sesuaikan Stok Material</h3>
              <button
                onClick={() => setStockAdjustmentModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="font-bold text-slate-900">{stockAdjustmentModalItem.name}</div>
              <div className="text-slate-500 mt-0.5">
                Stok saat ini: <strong className="text-slate-900 font-mono">{stockAdjustmentModalItem.currentStock} {stockAdjustmentModalItem.unit}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Jumlah Penyesuaian ({stockAdjustmentModalItem.unit}):</label>
              <input
                type="number"
                step="0.5"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-900 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleAdjustStock(false)}
                className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg border border-rose-200 transition-colors"
              >
                - Kurangi Stok (Pakai)
              </button>
              <button
                onClick={() => handleAdjustStock(true)}
                className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 transition-colors"
              >
                + Tambah Stok (Beli)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Tambah Material Baru ke Inventaris</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-5 space-y-3 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold">Kode Barang</label>
                  <input
                    type="text"
                    placeholder="Contoh: KWT-115-H"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold">Kategori</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                  >
                    <option value="Kawat Tembaga">Kawat Tembaga</option>
                    <option value="Isolasi & Vernis">Isolasi & Vernis</option>
                    <option value="Bearing">Bearing</option>
                    <option value="Aksesoris & Part">Aksesoris & Part</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold">Nama Material</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kawat Tembaga Helenic Ø 1.15 mm"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold">Spesifikasi Teknis</label>
                <input
                  type="text"
                  placeholder="Grade 200°C Class H / Deep groove clearance C3"
                  value={newItemSpec}
                  onChange={(e) => setNewItemSpec(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold">Stok Awal</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold">Satuan</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="kg, pcs, roll, liter"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold">Batas Alert Min</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newItemMinAlert}
                    onChange={(e) => setNewItemMinAlert(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold">Harga Beli / Modal (Rp)</label>
                  <input
                    type="number"
                    value={newItemUnitCost}
                    onChange={(e) => setNewItemUnitCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold">Harga Jual ke Klien (Rp)</label>
                  <input
                    type="number"
                    value={newItemSellingPrice}
                    onChange={(e) => setNewItemSellingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold">Supplier / Toko</label>
                <input
                  type="text"
                  placeholder="Nama distributor atau toko langganan"
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Simpan ke Gudang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
