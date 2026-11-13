import React, { useState } from 'react';
import { Customer, WorkOrder } from '../types/rewinding';
import { formatRupiah, formatIndoDate } from '../utils/rewindingMath';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  X,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CustomerManagerProps {
  customers: Customer[];
  orders: WorkOrder[];
  onUpdateCustomers: (updated: Customer[]) => void;
  onSelectOrder: (order: WorkOrder) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  orders,
  onUpdateCustomers,
  onSelectOrder,
}) => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
  );

  const customerOrders = selectedCustomer
    ? orders.filter((o) => o.customerId === selectedCustomer.id || o.customerCompany === selectedCustomer.company)
    : [];

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
      id: `CUST-${Date.now()}`,
      name,
      company: company || name,
      phone,
      email: email || '-',
      address,
      city: city || 'Surabaya',
      notes,
      totalOrdersCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };
    const updated = [newCust, ...customers];
    onUpdateCustomers(updated);
    setSelectedCustomer(newCust);
    toast.success(`Pelanggan "${newCust.company || newCust.name}" berhasil didaftarkan!`, 'Pelanggan Baru');
    setIsAddModalOpen(false);

    // Reset
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span>Database Pelanggan Industri & Mitra Bengkel</span>
          </h1>
          <p className="text-xs text-slate-500">
            Riwayat servis mesin, kontak teknis pabrik, dan histori pengerjaan rewinding
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): Customer Directory */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pabrik, nama, telepon..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900"
            />
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              const orderCount = orders.filter((o) => o.customerId === cust.id || o.customerCompany === cust.company).length;

              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`py-3 px-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/70 border-l-2 border-amber-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{cust.company}</div>
                      <div className="text-[11px] text-slate-500">{cust.name}</div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded tabular-nums">
                      {orderCount} unit
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{cust.phone}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 Cols): Detail & Order History */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCustomer ? (
            <>
              {/* Customer Profile Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      <h2 className="text-base font-bold text-slate-900">{selectedCustomer.company}</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Kontak Utama: <strong>{selectedCustomer.name}</strong></p>
                  </div>
                  <span className="text-xs text-slate-400">
                    Bergabung: {formatIndoDate(selectedCustomer.joinedDate)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedCustomer.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedCustomer.city}</span>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <p className="text-xs text-slate-600 italic">
                    Catatan workshop: "{selectedCustomer.notes}"
                  </p>
                )}
              </div>

              {/* Service History of this customer */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Riwayat Servis Mesin ({customerOrders.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Total Transaksi: <strong className="font-mono text-slate-900 tabular-nums">{formatRupiah(customerOrders.reduce((a, b) => a + b.grandTotal, 0))}</strong>
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {customerOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada riwayat SPK untuk pelanggan ini.
                    </div>
                  ) : (
                    customerOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrder(order)}
                        className="py-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {order.spkNumber}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">
                              {formatIndoDate(order.entryDate)}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800">
                            {order.brand} {order.powerHp} HP ({order.powerKw} kW) - {order.machineType}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Kawat Ø {order.windingData.wireSizeMm} mm · {order.windingData.insulationClass.split(' ')[0]}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                            {formatRupiah(order.grandTotal)}
                          </div>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-xl border border-slate-200">
              Pilih salah satu pelanggan di sebelah kiri untuk melihat profil dan riwayat servis mesin.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Tambah Data Pelanggan Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold">Nama Perusahaan / Pabrik</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT. Sumber Tirta Mandiri"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-medium mt-1"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold">Nama Kontak Person (PIC)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Hariyadi (Maintenance)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-medium mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-medium mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold">Kota / Wilayah</label>
                  <input
                    type="text"
                    placeholder="Surabaya / Gresik / Sidoarjo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-medium mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold">Alamat Lengkap</label>
                <input
                  type="text"
                  placeholder="Jl. Industri..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-medium mt-1"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold">Catatan Khusus Pabrik</label>
                <textarea
                  rows={2}
                  placeholder="Cth: Pompa limbah, butuh kawat tahan panas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-medium mt-1"
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
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
