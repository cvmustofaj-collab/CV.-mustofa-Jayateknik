export type MachineType = 
  | 'Motor 3 Fasa Induksi'
  | 'Motor 1 Fasa'
  | 'Generator / Alternator Genset'
  | 'Transformator (Trafo)'
  | 'Pompa Submersible / Celup'
  | 'Armature / DC Motor'
  | 'Rotor Slip Ring';

export type ConnectionType = 'Star (Y)' | 'Delta (Δ)' | 'Star-Delta (Y-Δ)' | 'Series' | 'Parallel';

export type InsulationClass = 'Class B (130°C)' | 'Class F (155°C)' | 'Class H (180°C - 200°C)';

export type OrderStatus = 
  | 'Diterima'
  | 'Bongkar & Inspeksi'
  | 'Proses Rewinding'
  | 'Varnish & Oven'
  | 'Assembling'
  | 'QC & Pengetesan'
  | 'Selesai & Siap Diambil'
  | 'Diserahkan / Faktur';

export type PaymentStatus = 'Lunas' | 'DP / Sebagian' | 'Belum Bayar';

export interface ServiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface WindingData {
  slotsCount: number; // e.g., 36 or 48
  polesCount: number; // e.g., 2, 4, 6, 8
  pitchCoil: string; // e.g., "1 - 8", "1 - 10"
  wireSizeMm: number; // Diameter kawat utama (mm)
  wireSizeAlternative?: string; // e.g. "Ganti 2x 0.85mm paralel"
  turnsPerSlot: number; // Jumlah lilitan per alur/slot
  parallelWires: number; // Jumlah kawat sejajar (1, 2, 3...)
  windingType: 'Lap Winding' | 'Concentric' | 'Wave Winding' | 'Double Layer' | 'Single Layer';
  insulationClass: InsulationClass;
  insulationMaterial: string; // e.g. "Kertas Nomex 410 + Selongsong Silikon"
  copperWeightKg: number; // Berat kawat tembaga terpakai (kg)
  bakingVarnishType: string; // e.g. "Varnish Bakar Class H Royal Diamond"
  bakingDurationHours: number; // Durasi oven (jam)
  bakingTempC: number; // Suhu oven (°C)
  connectionType: ConnectionType;
}

export interface InitialInspection {
  visualCondition: string; // e.g. "Gulungan gosong fasa S dan T, bau terbakar"
  meggerInitialBodyMOhm: number; // Tahanan isolasi awal (MΩ)
  bearingFrontCondition: 'Bagus' | 'Kocak / Aus' | 'Pecah / Macet' | 'Wajib Ganti';
  bearingRearCondition: 'Bagus' | 'Kocak / Aus' | 'Pecah / Macet' | 'Wajib Ganti';
  rotorCondition: string; // e.g. "Poros mulus, alur sepi normal"
  shaftRunoutMm: number; // Keolengan poros (mm)
}

export interface QCTestReport {
  testedAt: string;
  testedBy: string;
  meggerPhasePhaseMOhm: { uv: number; vw: number; wu: number };
  meggerPhaseBodyMOhm: { uBody: number; vBody: number; wBody: number };
  windingResistanceOhm: { u: number; v: number; w: number };
  resistanceBalancePercent: number; // < 2% balance
  noLoadTest: {
    voltageRS: number;
    voltageST: number;
    voltageTR: number;
    currentR: number; // Ampere R
    currentS: number; // Ampere S
    currentT: number; // Ampere T
    currentBalanceStatus: 'PASS' | 'WARNING' | 'FAIL';
    rpmMeasured: number;
    bearingVibrationMmS: number; // Vibrasi (mm/s)
    bearingTempC: number; // Suhu bearing (°C)
    noiseDb: number; // Desibel kebisingan
  };
  summaryVerdict: 'LAYAK OPERASI (LULUS QC)' | 'PERLU RE-CHECK' | 'REJECT';
  notes: string;
}

export interface WorkOrder {
  id: string;
  spkNumber: string; // e.g. "SPK-MJT-2026-0301"
  entryDate: string; // YYYY-MM-DD
  targetCompletionDate: string;
  actualCompletionDate?: string;
  
  // Customer Info
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  customerAddress: string;

  // Machine Specification
  machineType: MachineType;
  brand: string; // Siemens, TECO, ABB, WEG, dll
  modelOrType: string; // Seri tipe mesin
  serialNumber: string;
  powerHp: number; // Daya HP
  powerKw: number; // Daya kW
  rpm: number; // 2900, 1450, 960, dll
  voltage: string; // e.g. "380 / 660 V"
  frequencyHz: number; // 50 Hz
  currentAmpereRated: number; // Ampere nameplate
  frameSize: string; // e.g. "132M", "160L"
  cosPhi: number; // e.g. 0.85
  ipRating: string; // e.g. "IP 55"
  
  // Issue & Inspection
  complaint: string;
  inspection: InitialInspection;
  
  // Rewinding technical specs
  windingData: WindingData;
  
  // Quality Control Test
  qcReport: QCTestReport;
  
  // Workflow & Assignment
  status: OrderStatus;
  priority: 'Biasa' | 'Penting' | 'Urgent / Lembur';
  technicianName: string; // Penanggung Jawab / Tukang Gulung
  
  // Financials & Billing (Invois, Faktur Pajak PPN/PPh, Keuangan)
  invoiceNumber?: string; // e.g. "INV-MJT/2026-0301"
  invoiceDate?: string; // YYYY-MM-DD
  fakturPajakNumber?: string; // e.g. "010.004-26.00001234" atau "-" jika Non-PKP
  serviceItems: ServiceItem[];
  laborCost: number;
  partsCost: number;
  discount: number;
  taxPpnPercent: number; // 0, 11, atau 12
  taxPpnAmount?: number; // Nominal PPN (Rp)
  taxPphPercent?: number; // 0, 2 (PPh 23 Jasa), 1.5, 4, dll
  taxPphAmount?: number; // Nominal Potongan PPh (Rp)
  grandTotal: number; // Total Tagihan Bruto (DPP + PPN)
  netPayableTotal?: number; // Total Tagihan Bersih Setelah Potongan PPh
  downPayment: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  
  // Warranty
  warrantyMonths: number;
  warrantyNotes: string;
  
  // Status Audit Log & Technician Tracking
  statusAuditLog?: StatusAuditEntry[];
  lastStatusUpdated?: string; // Formatted datetime string e.g. "11 Nov 2026, 18:45 WIB"
  lastStatusUpdatedBy?: string; // Technician or PIC who changed the status

  // Additional internal notes
  workshopNotes?: string;
}

export interface StatusAuditEntry {
  id: string;
  timestamp: string; // ISO date-time
  formattedDate: string; // Indonesian formatted date-time
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  updatedBy: string; // Technician name
  notes?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Kawat Tembaga' | 'Isolasi & Vernis' | 'Bearing' | 'Aksesoris & Part';
  spec: string; // e.g. "Grade 200°C Class H", "6208 2Z/C3"
  currentStock: number;
  unit: string; // kg, roll, liter, pcs, meter
  minStockAlert: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  lastUpdated: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  totalOrdersCount: number;
  joinedDate: string;
}

export interface WireGaugeReference {
  diameterMm: number;
  swg: number;
  awg: number;
  crossSectionMm2: number;
  resistanceOhmPerKm: number;
  currentCapacityAmpere: number; // at 4 A/mm²
}

export type WorkshopReportType =
  | 'SPK_CREATED'
  | 'QC_MEGGER_TEST'
  | 'STATUS_AUDIT'
  | 'REVENUE_INVOICE'
  | 'DOCUMENT_EXPORTED'
  | 'INVENTORY_ADJUSTMENT'
  | 'CUSTOMER_ADDED';

export interface WorkshopReport {
  id: string;
  ownerId: string;
  reportType: WorkshopReportType;
  title: string;
  referenceNumber: string;
  orderId: string;
  customerCompany: string;
  technicianOrActor: string;
  summary: string;
  verdictOrStatus: string;
  amountRp: number;
  copperKg: number;
  meggerMOhm: number;
  metrics: Record<string, string | number | boolean>;
  sourceAction: string;
  reportDate: string;
  createdAt?: unknown;
}

export interface WorkshopSettings {
  monthlySpkTarget: number;
  perTechMonthlyTarget: number;
  googleSpreadsheetId?: string;
  googleSpreadsheetTitle?: string;
  googleSpreadsheetUrl?: string;
  googleSheetsAutoSync?: boolean;
  updatedBy?: string;
}

export type UserRole = 'admin' | 'operator' | 'technician';

export type AccountStatus = 'active' | 'suspended';

export interface AppUserAccount {
  uid: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  department?: string;
  email?: string;
  isAdminRecord?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AccountInvite {
  id: string;
  ownerId: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string;
  status: AccountStatus;
  claimedUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}


