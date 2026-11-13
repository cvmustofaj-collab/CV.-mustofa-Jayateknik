import {
  WorkOrder,
  Customer,
  InventoryItem,
  WorkshopReport,
  WorkshopSettings,
} from '../types/rewinding';

export type SqlDialect = 'postgresql' | 'mysql';

export interface SqlExportPayload {
  orders: WorkOrder[];
  customers: Customer[];
  inventory: InventoryItem[];
  reports: WorkshopReport[];
  settings: WorkshopSettings;
}

const sqlStr = (val: unknown): string => {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\r?\n/g, '\\n');
  return `'${s}'`;
};

const sqlStrOrEmpty = (val: unknown): string => {
  if (val === null || val === undefined) return "''";
  return sqlStr(val);
};

const sqlDateOrNull = (val: unknown): string => {
  if (!val || typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(val.trim())) {
    return 'NULL';
  }
  return sqlStr(val.trim().slice(0, 10));
};

const sqlNum = (val: unknown, fallback = 0): string => {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? String(n) : String(fallback);
};

const sqlInt = (val: unknown, fallback = 0): string => {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? String(Math.round(n)) : String(fallback);
};

const sqlJson = (val: unknown, dialect: SqlDialect): string => {
  const raw = JSON.stringify(val ?? {});
  const escaped = raw.replace(/\\/g, '\\\\').replace(/'/g, "''");
  return dialect === 'postgresql' ? `'${escaped}'::jsonb` : `'${escaped}'`;
};

export function generateSqlSchema(dialect: SqlDialect = 'postgresql'): string {
  const isPg = dialect === 'postgresql';
  const dtTimestamp = isPg ? 'TIMESTAMPTZ NOT NULL DEFAULT NOW()' : 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
  const dtJson = isPg ? 'JSONB NOT NULL' : 'JSON NOT NULL';
  const dtNum = isPg ? 'NUMERIC(14, 2)' : 'DECIMAL(14, 2)';
  const dtFloat = isPg ? 'DOUBLE PRECISION' : 'DOUBLE';
  const headerComment = isPg
    ? '-- Dialect: PostgreSQL 15+ (Kompatibel Cloud SQL / Supabase / Neon)'
    : '-- Dialect: MySQL 8.0+ / MariaDB 10.6+ (InnoDB UTF8MB4)';

  const mysqlFooter = isPg ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

  const viewProfitability = isPg
    ? `CREATE OR REPLACE VIEW v_spk_profitability AS
SELECT
  wo.id AS work_order_id,
  wo.spk_number,
  wo.customer_company,
  wo.brand,
  wo.power_hp,
  wo.status,
  wo.entry_date,
  wo.grand_total AS estimasi_harga_jasa,
  COALESCE(wd.copper_weight_kg, 0) AS copper_weight_kg,
  COALESCE(wd.wire_size_mm, 0) AS wire_size_mm,
  COALESCE(
    (SELECT AVG(inv.unit_cost) FROM inventory_items inv WHERE inv.category = 'Kawat Tembaga'),
    162000
  ) AS avg_copper_unit_cost,
  ROUND(
    COALESCE(wd.copper_weight_kg, 0) * COALESCE(
      (SELECT inv.unit_cost FROM inventory_items inv
       WHERE inv.category = 'Kawat Tembaga'
         AND inv.name LIKE '%' || TO_CHAR(COALESCE(wd.wire_size_mm, 0), 'FM990.00') || '%'
       LIMIT 1),
      (SELECT AVG(inv.unit_cost) FROM inventory_items inv WHERE inv.category = 'Kawat Tembaga'),
      162000
    ), 0
  ) AS biaya_material_kawat,
  (wo.grand_total - ROUND(
    COALESCE(wd.copper_weight_kg, 0) * COALESCE(
      (SELECT inv.unit_cost FROM inventory_items inv
       WHERE inv.category = 'Kawat Tembaga'
         AND inv.name LIKE '%' || TO_CHAR(COALESCE(wd.wire_size_mm, 0), 'FM990.00') || '%'
       LIMIT 1),
      (SELECT AVG(inv.unit_cost) FROM inventory_items inv WHERE inv.category = 'Kawat Tembaga'),
      162000
    ), 0
  )) AS selisih_profit
FROM work_orders wo
LEFT JOIN work_order_windings wd ON wd.work_order_id = wo.id;`
    : `CREATE OR REPLACE VIEW v_spk_profitability AS
SELECT
  wo.id AS work_order_id,
  wo.spk_number,
  wo.customer_company,
  wo.brand,
  wo.power_hp,
  wo.status,
  wo.entry_date,
  wo.grand_total AS estimasi_harga_jasa,
  COALESCE(wd.copper_weight_kg, 0) AS copper_weight_kg,
  COALESCE(wd.wire_size_mm, 0) AS wire_size_mm,
  ROUND(
    COALESCE(wd.copper_weight_kg, 0) * COALESCE(
      (SELECT inv.unit_cost FROM inventory_items inv
       WHERE inv.category = 'Kawat Tembaga'
         AND inv.name LIKE CONCAT('%', FORMAT(COALESCE(wd.wire_size_mm, 0), 2), '%')
       LIMIT 1),
      (SELECT AVG(inv.unit_cost) FROM inventory_items inv WHERE inv.category = 'Kawat Tembaga'),
      162000
    ), 0
  ) AS biaya_material_kawat,
  (wo.grand_total - ROUND(
    COALESCE(wd.copper_weight_kg, 0) * COALESCE(
      (SELECT inv.unit_cost FROM inventory_items inv
       WHERE inv.category = 'Kawat Tembaga'
         AND inv.name LIKE CONCAT('%', FORMAT(COALESCE(wd.wire_size_mm, 0), 2), '%')
       LIMIT 1),
      (SELECT AVG(inv.unit_cost) FROM inventory_items inv WHERE inv.category = 'Kawat Tembaga'),
      162000
    ), 0
  )) AS selisih_profit
FROM work_orders wo
LEFT JOIN work_order_windings wd ON wd.work_order_id = wo.id;`;

  const viewTechPerf = isPg
    ? `CREATE OR REPLACE VIEW v_technician_monthly_performance AS
SELECT
  technician_name,
  TO_CHAR(COALESCE(actual_completion_date, target_completion_date, entry_date), 'YYYY-MM') AS bulan,
  COUNT(*) AS jumlah_spk_selesai,
  SUM(power_hp) AS total_hp,
  SUM(grand_total) AS total_nilai_jasa
FROM work_orders
WHERE status IN ('Selesai & Siap Diambil', 'Diserahkan / Faktur')
GROUP BY technician_name, TO_CHAR(COALESCE(actual_completion_date, target_completion_date, entry_date), 'YYYY-MM');`
    : `CREATE OR REPLACE VIEW v_technician_monthly_performance AS
SELECT
  technician_name,
  DATE_FORMAT(COALESCE(actual_completion_date, target_completion_date, entry_date), '%Y-%m') AS bulan,
  COUNT(*) AS jumlah_spk_selesai,
  SUM(power_hp) AS total_hp,
  SUM(grand_total) AS total_nilai_jasa
FROM work_orders
WHERE status IN ('Selesai & Siap Diambil', 'Diserahkan / Faktur')
GROUP BY technician_name, DATE_FORMAT(COALESCE(actual_completion_date, target_completion_date, entry_date), '%Y-%m');`;

  const viewCopperUsage = isPg
    ? `CREATE OR REPLACE VIEW v_copper_wire_usage AS
SELECT
  wd.wire_size_mm,
  COUNT(*) AS jumlah_spk,
  ROUND(SUM(wd.copper_weight_kg)::numeric, 2) AS total_kg_terpakai,
  ROUND(AVG(wd.copper_weight_kg)::numeric, 2) AS rata_rata_kg_per_spk
FROM work_order_windings wd
WHERE wd.copper_weight_kg > 0
GROUP BY wd.wire_size_mm
ORDER BY total_kg_terpakai DESC;`
    : `CREATE OR REPLACE VIEW v_copper_wire_usage AS
SELECT
  wd.wire_size_mm,
  COUNT(*) AS jumlah_spk,
  ROUND(SUM(wd.copper_weight_kg), 2) AS total_kg_terpakai,
  ROUND(AVG(wd.copper_weight_kg), 2) AS rata_rata_kg_per_spk
FROM work_order_windings wd
WHERE wd.copper_weight_kg > 0
GROUP BY wd.wire_size_mm
ORDER BY total_kg_terpakai DESC;`;

  const viewDeadlines = isPg
    ? `CREATE OR REPLACE VIEW v_pending_deadlines AS
SELECT
  id,
  spk_number,
  customer_company,
  technician_name,
  priority,
  status,
  target_completion_date,
  (target_completion_date - CURRENT_DATE) AS sisa_hari
FROM work_orders
WHERE status NOT IN ('Selesai & Siap Diambil', 'Diserahkan / Faktur')
ORDER BY target_completion_date ASC;`
    : `CREATE OR REPLACE VIEW v_pending_deadlines AS
SELECT
  id,
  spk_number,
  customer_company,
  technician_name,
  priority,
  status,
  target_completion_date,
  DATEDIFF(target_completion_date, CURDATE()) AS sisa_hari
FROM work_orders
WHERE status NOT IN ('Selesai & Siap Diambil', 'Diserahkan / Faktur')
ORDER BY target_completion_date ASC;`;

  return `-- ============================================================================
-- CV. MUSTOFA JAYA TEKNIK — Skema Database Relasional SQL
-- Spesialis Rewinding & Overhaul Motor Listrik, Trafo & Generator
${headerComment}
-- ============================================================================

-- 1. Pengaturan Target Operasional Workshop
CREATE TABLE IF NOT EXISTS workshop_settings (
  id VARCHAR(128) PRIMARY KEY,
  monthly_spk_target INTEGER NOT NULL DEFAULT 6 CHECK (monthly_spk_target BETWEEN 1 AND 500),
  per_tech_monthly_target INTEGER NOT NULL DEFAULT 2 CHECK (per_tech_monthly_target BETWEEN 1 AND 200),
  updated_by VARCHAR(120) NOT NULL DEFAULT '',
  updated_at ${dtTimestamp}
)${mysqlFooter};

-- 2. Data Pelanggan & Perusahaan Mitra
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  company VARCHAR(200) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(150) NOT NULL DEFAULT '',
  address VARCHAR(400) NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL DEFAULT 'Surabaya',
  notes TEXT NOT NULL,
  total_orders_count INTEGER NOT NULL DEFAULT 0 CHECK (total_orders_count >= 0),
  joined_date DATE NOT NULL,
  created_at ${dtTimestamp}
)${mysqlFooter};

-- 3. Inventaris Material Bengkel (Kawat Tembaga, Isolasi, Vernis, Bearing)
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(128) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(64) NOT NULL,
  spec VARCHAR(300) NOT NULL DEFAULT '',
  current_stock ${dtFloat} NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  unit VARCHAR(32) NOT NULL,
  min_stock_alert ${dtFloat} NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
  unit_cost ${dtNum} NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  selling_price ${dtNum} NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  supplier VARCHAR(200) NOT NULL DEFAULT '',
  last_updated DATE NOT NULL,
  created_at ${dtTimestamp}
)${mysqlFooter};

-- 4. Surat Perintah Kerja (SPK) Utama & Informasi Penagihan
CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(128) PRIMARY KEY,
  spk_number VARCHAR(64) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  target_completion_date DATE NOT NULL,
  actual_completion_date DATE NULL,
  customer_id VARCHAR(128) NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_company VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL DEFAULT '-',
  customer_address VARCHAR(400) NOT NULL DEFAULT '-',
  machine_type VARCHAR(80) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  model_or_type VARCHAR(120) NOT NULL DEFAULT '-',
  serial_number VARCHAR(120) NOT NULL DEFAULT '-',
  power_hp ${dtFloat} NOT NULL DEFAULT 0,
  power_kw ${dtFloat} NOT NULL DEFAULT 0,
  rpm INTEGER NOT NULL DEFAULT 0,
  voltage VARCHAR(64) NOT NULL DEFAULT '380V',
  frequency_hz INTEGER NOT NULL DEFAULT 50,
  current_ampere_rated ${dtFloat} NOT NULL DEFAULT 0,
  frame_size VARCHAR(64) NOT NULL DEFAULT '-',
  cos_phi ${dtFloat} NOT NULL DEFAULT 0.85,
  ip_rating VARCHAR(32) NOT NULL DEFAULT 'IP 55',
  complaint TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  priority VARCHAR(32) NOT NULL,
  technician_name VARCHAR(120) NOT NULL,
  invoice_number VARCHAR(64) NOT NULL DEFAULT '',
  invoice_date DATE NULL,
  faktur_pajak_number VARCHAR(64) NOT NULL DEFAULT '',
  labor_cost ${dtNum} NOT NULL DEFAULT 0,
  parts_cost ${dtNum} NOT NULL DEFAULT 0,
  discount ${dtNum} NOT NULL DEFAULT 0,
  tax_ppn_percent ${dtFloat} NOT NULL DEFAULT 0,
  tax_ppn_amount ${dtNum} NOT NULL DEFAULT 0,
  tax_pph_percent ${dtFloat} NOT NULL DEFAULT 0,
  tax_pph_amount ${dtNum} NOT NULL DEFAULT 0,
  grand_total ${dtNum} NOT NULL DEFAULT 0,
  net_payable_total ${dtNum} NOT NULL DEFAULT 0,
  down_payment ${dtNum} NOT NULL DEFAULT 0,
  balance_due ${dtNum} NOT NULL DEFAULT 0,
  payment_status VARCHAR(32) NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 6,
  warranty_notes TEXT NOT NULL,
  last_status_updated VARCHAR(80) NOT NULL DEFAULT '',
  last_status_updated_by VARCHAR(120) NOT NULL DEFAULT '',
  workshop_notes TEXT NOT NULL,
  created_at ${dtTimestamp},
  CONSTRAINT fk_wo_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
)${mysqlFooter};

-- 5. Hasil Inspeksi Awal Unit Masuk (1:1 dengan SPK)
CREATE TABLE IF NOT EXISTS work_order_inspections (
  work_order_id VARCHAR(128) PRIMARY KEY,
  visual_condition VARCHAR(500) NOT NULL DEFAULT '',
  megger_initial_body_mohm ${dtFloat} NOT NULL DEFAULT 0,
  bearing_front_condition VARCHAR(32) NOT NULL,
  bearing_rear_condition VARCHAR(32) NOT NULL,
  rotor_condition VARCHAR(300) NOT NULL DEFAULT '',
  shaft_runout_mm ${dtFloat} NOT NULL DEFAULT 0,
  CONSTRAINT fk_insp_wo FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
)${mysqlFooter};

-- 6. Data Teknis Gulungan & Kawat Tembaga (1:1 dengan SPK)
CREATE TABLE IF NOT EXISTS work_order_windings (
  work_order_id VARCHAR(128) PRIMARY KEY,
  slots_count INTEGER NOT NULL DEFAULT 36,
  poles_count INTEGER NOT NULL DEFAULT 4,
  pitch_coil VARCHAR(64) NOT NULL DEFAULT '',
  wire_size_mm ${dtFloat} NOT NULL DEFAULT 0,
  wire_size_alternative VARCHAR(200) NOT NULL DEFAULT '',
  turns_per_slot INTEGER NOT NULL DEFAULT 0,
  parallel_wires INTEGER NOT NULL DEFAULT 1,
  winding_type VARCHAR(48) NOT NULL,
  insulation_class VARCHAR(48) NOT NULL,
  insulation_material VARCHAR(250) NOT NULL DEFAULT '',
  copper_weight_kg ${dtFloat} NOT NULL DEFAULT 0,
  baking_varnish_type VARCHAR(200) NOT NULL DEFAULT '',
  baking_duration_hours ${dtFloat} NOT NULL DEFAULT 0,
  baking_temp_c ${dtFloat} NOT NULL DEFAULT 0,
  connection_type VARCHAR(32) NOT NULL,
  CONSTRAINT fk_wind_wo FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
)${mysqlFooter};

-- 7. Laporan Uji Quality Control (Megger, Resistance & Running Test)
CREATE TABLE IF NOT EXISTS work_order_qc_reports (
  work_order_id VARCHAR(128) PRIMARY KEY,
  tested_at VARCHAR(64) NOT NULL DEFAULT '',
  tested_by VARCHAR(120) NOT NULL DEFAULT '',
  megger_uv_mohm ${dtFloat} NOT NULL DEFAULT 0,
  megger_vw_mohm ${dtFloat} NOT NULL DEFAULT 0,
  megger_wu_mohm ${dtFloat} NOT NULL DEFAULT 0,
  megger_u_body_mohm ${dtFloat} NOT NULL DEFAULT 0,
  megger_v_body_mohm ${dtFloat} NOT NULL DEFAULT 0,
  megger_w_body_mohm ${dtFloat} NOT NULL DEFAULT 0,
  resistance_u_ohm ${dtFloat} NOT NULL DEFAULT 0,
  resistance_v_ohm ${dtFloat} NOT NULL DEFAULT 0,
  resistance_w_ohm ${dtFloat} NOT NULL DEFAULT 0,
  resistance_balance_percent ${dtFloat} NOT NULL DEFAULT 0,
  voltage_rs ${dtFloat} NOT NULL DEFAULT 0,
  voltage_st ${dtFloat} NOT NULL DEFAULT 0,
  voltage_tr ${dtFloat} NOT NULL DEFAULT 0,
  current_r ${dtFloat} NOT NULL DEFAULT 0,
  current_s ${dtFloat} NOT NULL DEFAULT 0,
  current_t ${dtFloat} NOT NULL DEFAULT 0,
  current_balance_status VARCHAR(16) NOT NULL DEFAULT 'PASS',
  rpm_measured INTEGER NOT NULL DEFAULT 0,
  bearing_vibration_mms ${dtFloat} NOT NULL DEFAULT 0,
  bearing_temp_c ${dtFloat} NOT NULL DEFAULT 0,
  noise_db ${dtFloat} NOT NULL DEFAULT 0,
  summary_verdict VARCHAR(48) NOT NULL,
  notes TEXT NOT NULL,
  CONSTRAINT fk_qc_wo FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
)${mysqlFooter};

-- 8. Rincian Item Jasa & Suku Cadang Faktur SPK (1:N dengan SPK)
CREATE TABLE IF NOT EXISTS work_order_service_items (
  id VARCHAR(128) PRIMARY KEY,
  work_order_id VARCHAR(128) NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 1,
  description VARCHAR(250) NOT NULL,
  quantity ${dtFloat} NOT NULL DEFAULT 1,
  unit VARCHAR(32) NOT NULL DEFAULT 'lot',
  unit_price ${dtNum} NOT NULL DEFAULT 0,
  total ${dtNum} NOT NULL DEFAULT 0,
  CONSTRAINT fk_srv_wo FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
)${mysqlFooter};

-- 9. Log Audit Perubahan Status SPK oleh Teknisi (1:N dengan SPK)
CREATE TABLE IF NOT EXISTS work_order_status_audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  work_order_id VARCHAR(128) NOT NULL,
  event_timestamp VARCHAR(64) NOT NULL,
  formatted_date VARCHAR(80) NOT NULL DEFAULT '',
  previous_status VARCHAR(64) NOT NULL DEFAULT '',
  new_status VARCHAR(64) NOT NULL,
  updated_by VARCHAR(120) NOT NULL,
  notes VARCHAR(300) NOT NULL DEFAULT '',
  CONSTRAINT fk_audit_wo FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
)${mysqlFooter};

-- 10. Tabel Laporan Operasional Otomatis (SPK, QC, Status, Faktur, Stok, Cetak)
CREATE TABLE IF NOT EXISTS workshop_reports (
  id VARCHAR(128) PRIMARY KEY,
  report_type VARCHAR(48) NOT NULL,
  title VARCHAR(200) NOT NULL,
  reference_number VARCHAR(64) NOT NULL,
  order_id VARCHAR(128) NULL,
  customer_company VARCHAR(200) NOT NULL DEFAULT '',
  technician_or_actor VARCHAR(120) NOT NULL,
  summary VARCHAR(1000) NOT NULL,
  verdict_or_status VARCHAR(120) NOT NULL,
  amount_rp ${dtNum} NOT NULL DEFAULT 0,
  copper_kg ${dtFloat} NOT NULL DEFAULT 0,
  megger_mohm ${dtFloat} NOT NULL DEFAULT 0,
  metrics_json ${dtJson},
  source_action VARCHAR(120) NOT NULL,
  report_date VARCHAR(32) NOT NULL,
  created_at ${dtTimestamp},
  CONSTRAINT fk_rpt_wo FOREIGN KEY (order_id) REFERENCES work_orders(id) ON DELETE SET NULL
)${mysqlFooter};

-- Indeks Performa Query
CREATE INDEX idx_wo_status ON work_orders(status);
CREATE INDEX idx_wo_entry_date ON work_orders(entry_date);
CREATE INDEX idx_wo_target_date ON work_orders(target_completion_date);
CREATE INDEX idx_wo_technician ON work_orders(technician_name);
CREATE INDEX idx_inv_category ON inventory_items(category);
CREATE INDEX idx_srv_wo_id ON work_order_service_items(work_order_id);
CREATE INDEX idx_audit_wo_id ON work_order_status_audit_logs(work_order_id);
CREATE INDEX idx_rpt_type_date ON workshop_reports(report_type, report_date);

-- ============================================================================
-- VIEW ANALITIK DASHBOARD (Profitabilitas, Kawat Tembaga, Kinerja & Deadline)
-- ============================================================================
${viewProfitability}

${viewCopperUsage}

${viewTechPerf}

${viewDeadlines}
`;
}

export function generateSqlData(
  payload: SqlExportPayload,
  dialect: SqlDialect = 'postgresql'
): string {
  const isPg = dialect === 'postgresql';
  const lines: string[] = [];

  lines.push('-- ============================================================================');
  lines.push('-- CV. MUSTOFA JAYA TEKNIK — Export Data SQL (Live Workshop State)');
  lines.push(`-- Diekspor pada: ${new Date().toISOString()} · Dialect: ${dialect.toUpperCase()}`);
  lines.push('-- ============================================================================');
  lines.push('');

  if (isPg) {
    lines.push('BEGIN;');
  } else {
    lines.push('SET FOREIGN_KEY_CHECKS = 0;');
    lines.push('START TRANSACTION;');
  }
  lines.push('');

  // 1. Workshop Settings
  lines.push('-- 1. Pengaturan Target Bulanan');
  lines.push(
    `INSERT INTO workshop_settings (id, monthly_spk_target, per_tech_monthly_target, updated_by) VALUES ('default', ${sqlInt(
      payload.settings.monthlySpkTarget,
      6
    )}, ${sqlInt(payload.settings.perTechMonthlyTarget, 2)}, ${sqlStrOrEmpty(
      payload.settings.updatedBy || 'Operator Workshop'
    )})` +
      (isPg
        ? ' ON CONFLICT (id) DO UPDATE SET monthly_spk_target = EXCLUDED.monthly_spk_target, per_tech_monthly_target = EXCLUDED.per_tech_monthly_target, updated_by = EXCLUDED.updated_by;'
        : ' ON DUPLICATE KEY UPDATE monthly_spk_target = VALUES(monthly_spk_target), per_tech_monthly_target = VALUES(per_tech_monthly_target), updated_by = VALUES(updated_by);')
  );
  lines.push('');

  // 2. Customers
  lines.push(`-- 2. Data Pelanggan (${payload.customers.length} baris)`);
  for (const c of payload.customers) {
    lines.push(
      `INSERT INTO customers (id, name, company, phone, email, address, city, notes, total_orders_count, joined_date) VALUES (${sqlStr(
        c.id
      )}, ${sqlStr(c.name)}, ${sqlStr(c.company)}, ${sqlStr(c.phone)}, ${sqlStrOrEmpty(
        c.email
      )}, ${sqlStrOrEmpty(c.address)}, ${sqlStrOrEmpty(c.city || 'Surabaya')}, ${sqlStrOrEmpty(
        c.notes
      )}, ${sqlInt(c.totalOrdersCount, 0)}, ${sqlDateOrNull(c.joinedDate) === 'NULL' ? "'2026-01-01'" : sqlDateOrNull(c.joinedDate)})` +
        (isPg
          ? ' ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company, phone = EXCLUDED.phone, total_orders_count = EXCLUDED.total_orders_count;'
          : ' ON DUPLICATE KEY UPDATE name = VALUES(name), company = VALUES(company), phone = VALUES(phone), total_orders_count = VALUES(total_orders_count);')
    );
  }
  lines.push('');

  // 3. Inventory Items
  lines.push(`-- 3. Inventaris Bengkel (${payload.inventory.length} baris)`);
  for (const inv of payload.inventory) {
    lines.push(
      `INSERT INTO inventory_items (id, code, name, category, spec, current_stock, unit, min_stock_alert, unit_cost, selling_price, supplier, last_updated) VALUES (${sqlStr(
        inv.id
      )}, ${sqlStr(inv.code)}, ${sqlStr(inv.name)}, ${sqlStr(inv.category)}, ${sqlStrOrEmpty(
        inv.spec
      )}, ${sqlNum(inv.currentStock)}, ${sqlStr(inv.unit)}, ${sqlNum(
        inv.minStockAlert
      )}, ${sqlNum(inv.unitCost)}, ${sqlNum(inv.sellingPrice)}, ${sqlStrOrEmpty(
        inv.supplier
      )}, ${sqlDateOrNull(inv.lastUpdated) === 'NULL' ? "'2026-11-01'" : sqlDateOrNull(inv.lastUpdated)})` +
        (isPg
          ? ' ON CONFLICT (id) DO UPDATE SET current_stock = EXCLUDED.current_stock, unit_cost = EXCLUDED.unit_cost, selling_price = EXCLUDED.selling_price, last_updated = EXCLUDED.last_updated;'
          : ' ON DUPLICATE KEY UPDATE current_stock = VALUES(current_stock), unit_cost = VALUES(unit_cost), selling_price = VALUES(selling_price), last_updated = VALUES(last_updated);')
    );
  }
  lines.push('');

  const knownCustomerIds = new Set(payload.customers.map((c) => c.id));
  const knownOrderIds = new Set(payload.orders.map((o) => o.id));

  // 4. Work Orders & Normalized Sub-Tables
  lines.push(`-- 4. Surat Perintah Kerja / Work Orders (${payload.orders.length} SPK)`);
  for (const wo of payload.orders) {
    const custFk = wo.customerId && knownCustomerIds.has(wo.customerId) ? sqlStr(wo.customerId) : 'NULL';
    const dppVal = Math.max(0, Number(wo.partsCost || wo.grandTotal || 0) - Number(wo.discount || 0));
    const ppnAmt =
      typeof wo.taxPpnAmount === 'number'
        ? wo.taxPpnAmount
        : Math.round(dppVal * (Number(wo.taxPpnPercent || 0) / 100));
    const pphPct = Number(wo.taxPphPercent || 0);
    const pphAmt =
      typeof wo.taxPphAmount === 'number' ? wo.taxPphAmount : Math.round(dppVal * (pphPct / 100));
    const netPay =
      typeof wo.netPayableTotal === 'number' && wo.netPayableTotal > 0
        ? wo.netPayableTotal
        : Math.max(0, Number(wo.grandTotal || 0) - pphAmt);
    const invNo = wo.invoiceNumber || `INV-MJT/${(wo.spkNumber || '').replace('SPK-MJT-', '')}`;

    lines.push(
      `INSERT INTO work_orders (id, spk_number, entry_date, target_completion_date, actual_completion_date, customer_id, customer_name, customer_company, customer_phone, customer_address, machine_type, brand, model_or_type, serial_number, power_hp, power_kw, rpm, voltage, frequency_hz, current_ampere_rated, frame_size, cos_phi, ip_rating, complaint, status, priority, technician_name, invoice_number, invoice_date, faktur_pajak_number, labor_cost, parts_cost, discount, tax_ppn_percent, tax_ppn_amount, tax_pph_percent, tax_pph_amount, grand_total, net_payable_total, down_payment, balance_due, payment_status, warranty_months, warranty_notes, last_status_updated, last_status_updated_by, workshop_notes) VALUES (${sqlStr(
        wo.id
      )}, ${sqlStr(wo.spkNumber)}, ${sqlDateOrNull(wo.entryDate)}, ${sqlDateOrNull(
        wo.targetCompletionDate
      )}, ${sqlDateOrNull(wo.actualCompletionDate)}, ${custFk}, ${sqlStr(
        wo.customerName
      )}, ${sqlStr(wo.customerCompany)}, ${sqlStrOrEmpty(wo.customerPhone)}, ${sqlStrOrEmpty(
        wo.customerAddress
      )}, ${sqlStr(wo.machineType)}, ${sqlStr(wo.brand)}, ${sqlStrOrEmpty(
        wo.modelOrType
      )}, ${sqlStrOrEmpty(wo.serialNumber)}, ${sqlNum(wo.powerHp)}, ${sqlNum(
        wo.powerKw
      )}, ${sqlInt(wo.rpm)}, ${sqlStrOrEmpty(wo.voltage)}, ${sqlInt(
        wo.frequencyHz,
        50
      )}, ${sqlNum(wo.currentAmpereRated)}, ${sqlStrOrEmpty(wo.frameSize)}, ${sqlNum(
        wo.cosPhi,
        0.85
      )}, ${sqlStrOrEmpty(wo.ipRating || 'IP 55')}, ${sqlStrOrEmpty(
        wo.complaint
      )}, ${sqlStr(wo.status)}, ${sqlStr(wo.priority)}, ${sqlStr(
        wo.technicianName
      )}, ${sqlStrOrEmpty(invNo)}, ${sqlDateOrNull(
        wo.invoiceDate || wo.actualCompletionDate || wo.entryDate
      )}, ${sqlStrOrEmpty(wo.fakturPajakNumber)}, ${sqlNum(wo.laborCost)}, ${sqlNum(
        wo.partsCost
      )}, ${sqlNum(wo.discount)}, ${sqlNum(wo.taxPpnPercent)}, ${sqlNum(ppnAmt)}, ${sqlNum(
        pphPct
      )}, ${sqlNum(pphAmt)}, ${sqlNum(wo.grandTotal)}, ${sqlNum(netPay)}, ${sqlNum(
        wo.downPayment
      )}, ${sqlNum(wo.balanceDue)}, ${sqlStr(wo.paymentStatus)}, ${sqlInt(
        wo.warrantyMonths,
        6
      )}, ${sqlStrOrEmpty(wo.warrantyNotes)}, ${sqlStrOrEmpty(
        wo.lastStatusUpdated
      )}, ${sqlStrOrEmpty(wo.lastStatusUpdatedBy)}, ${sqlStrOrEmpty(wo.workshopNotes)})` +
        (isPg
          ? ' ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, invoice_number = EXCLUDED.invoice_number, faktur_pajak_number = EXCLUDED.faktur_pajak_number, tax_ppn_percent = EXCLUDED.tax_ppn_percent, tax_pph_percent = EXCLUDED.tax_pph_percent, grand_total = EXCLUDED.grand_total, net_payable_total = EXCLUDED.net_payable_total, balance_due = EXCLUDED.balance_due, payment_status = EXCLUDED.payment_status;'
          : ' ON DUPLICATE KEY UPDATE status = VALUES(status), invoice_number = VALUES(invoice_number), faktur_pajak_number = VALUES(faktur_pajak_number), tax_ppn_percent = VALUES(tax_ppn_percent), tax_pph_percent = VALUES(tax_pph_percent), grand_total = VALUES(grand_total), net_payable_total = VALUES(net_payable_total), balance_due = VALUES(balance_due), payment_status = VALUES(payment_status);')
    );

    // Inspection
    const insp = wo.inspection;
    lines.push(
      `INSERT INTO work_order_inspections (work_order_id, visual_condition, megger_initial_body_mohm, bearing_front_condition, bearing_rear_condition, rotor_condition, shaft_runout_mm) VALUES (${sqlStr(
        wo.id
      )}, ${sqlStrOrEmpty(insp.visualCondition)}, ${sqlNum(
        insp.meggerInitialBodyMOhm
      )}, ${sqlStr(insp.bearingFrontCondition)}, ${sqlStr(
        insp.bearingRearCondition
      )}, ${sqlStrOrEmpty(insp.rotorCondition)}, ${sqlNum(insp.shaftRunoutMm)})` +
        (isPg
          ? ' ON CONFLICT (work_order_id) DO UPDATE SET visual_condition = EXCLUDED.visual_condition, megger_initial_body_mohm = EXCLUDED.megger_initial_body_mohm;'
          : ' ON DUPLICATE KEY UPDATE visual_condition = VALUES(visual_condition), megger_initial_body_mohm = VALUES(megger_initial_body_mohm);')
    );

    // Winding Data
    const wd = wo.windingData;
    lines.push(
      `INSERT INTO work_order_windings (work_order_id, slots_count, poles_count, pitch_coil, wire_size_mm, wire_size_alternative, turns_per_slot, parallel_wires, winding_type, insulation_class, insulation_material, copper_weight_kg, baking_varnish_type, baking_duration_hours, baking_temp_c, connection_type) VALUES (${sqlStr(
        wo.id
      )}, ${sqlInt(wd.slotsCount)}, ${sqlInt(wd.polesCount)}, ${sqlStrOrEmpty(
        wd.pitchCoil
      )}, ${sqlNum(wd.wireSizeMm)}, ${sqlStrOrEmpty(wd.wireSizeAlternative)}, ${sqlInt(
        wd.turnsPerSlot
      )}, ${sqlInt(wd.parallelWires, 1)}, ${sqlStr(wd.windingType)}, ${sqlStr(
        wd.insulationClass
      )}, ${sqlStrOrEmpty(wd.insulationMaterial)}, ${sqlNum(wd.copperWeightKg)}, ${sqlStrOrEmpty(
        wd.bakingVarnishType
      )}, ${sqlNum(wd.bakingDurationHours)}, ${sqlNum(wd.bakingTempC)}, ${sqlStr(
        wd.connectionType
      )})` +
        (isPg
          ? ' ON CONFLICT (work_order_id) DO UPDATE SET wire_size_mm = EXCLUDED.wire_size_mm, copper_weight_kg = EXCLUDED.copper_weight_kg;'
          : ' ON DUPLICATE KEY UPDATE wire_size_mm = VALUES(wire_size_mm), copper_weight_kg = VALUES(copper_weight_kg);')
    );

    // QC Report
    const qc = wo.qcReport;
    const nl = qc.noLoadTest;
    lines.push(
      `INSERT INTO work_order_qc_reports (work_order_id, tested_at, tested_by, megger_uv_mohm, megger_vw_mohm, megger_wu_mohm, megger_u_body_mohm, megger_v_body_mohm, megger_w_body_mohm, resistance_u_ohm, resistance_v_ohm, resistance_w_ohm, resistance_balance_percent, voltage_rs, voltage_st, voltage_tr, current_r, current_s, current_t, current_balance_status, rpm_measured, bearing_vibration_mms, bearing_temp_c, noise_db, summary_verdict, notes) VALUES (${sqlStr(
        wo.id
      )}, ${sqlStrOrEmpty(qc.testedAt)}, ${sqlStrOrEmpty(qc.testedBy)}, ${sqlNum(
        qc.meggerPhasePhaseMOhm?.uv
      )}, ${sqlNum(qc.meggerPhasePhaseMOhm?.vw)}, ${sqlNum(
        qc.meggerPhasePhaseMOhm?.wu
      )}, ${sqlNum(qc.meggerPhaseBodyMOhm?.uBody)}, ${sqlNum(
        qc.meggerPhaseBodyMOhm?.vBody
      )}, ${sqlNum(qc.meggerPhaseBodyMOhm?.wBody)}, ${sqlNum(
        qc.windingResistanceOhm?.u
      )}, ${sqlNum(qc.windingResistanceOhm?.v)}, ${sqlNum(
        qc.windingResistanceOhm?.w
      )}, ${sqlNum(qc.resistanceBalancePercent)}, ${sqlNum(nl?.voltageRS)}, ${sqlNum(
        nl?.voltageST
      )}, ${sqlNum(nl?.voltageTR)}, ${sqlNum(nl?.currentR)}, ${sqlNum(
        nl?.currentS
      )}, ${sqlNum(nl?.currentT)}, ${sqlStr(
        nl?.currentBalanceStatus || 'PASS'
      )}, ${sqlInt(nl?.rpmMeasured)}, ${sqlNum(nl?.bearingVibrationMmS)}, ${sqlNum(
        nl?.bearingTempC
      )}, ${sqlNum(nl?.noiseDb)}, ${sqlStr(qc.summaryVerdict)}, ${sqlStrOrEmpty(qc.notes)})` +
        (isPg
          ? ' ON CONFLICT (work_order_id) DO UPDATE SET summary_verdict = EXCLUDED.summary_verdict, tested_at = EXCLUDED.tested_at;'
          : ' ON DUPLICATE KEY UPDATE summary_verdict = VALUES(summary_verdict), tested_at = VALUES(tested_at);')
    );

    // Service Items
    (wo.serviceItems || []).forEach((item, idx) => {
      const itemId = `${wo.id}__SRV_${item.id || idx + 1}`;
      lines.push(
        `INSERT INTO work_order_service_items (id, work_order_id, item_order, description, quantity, unit, unit_price, total) VALUES (${sqlStr(
          itemId
        )}, ${sqlStr(wo.id)}, ${idx + 1}, ${sqlStr(item.description)}, ${sqlNum(
          item.quantity
        )}, ${sqlStr(item.unit)}, ${sqlNum(item.unitPrice)}, ${sqlNum(item.total)})` +
          (isPg
            ? ' ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total;'
            : ' ON DUPLICATE KEY UPDATE total = VALUES(total);')
      );
    });

    // Status Audit Logs
    (wo.statusAuditLog || []).forEach((entry, idx) => {
      const logId = `${wo.id}__AUD_${entry.id || idx + 1}`;
      lines.push(
        `INSERT INTO work_order_status_audit_logs (id, work_order_id, event_timestamp, formatted_date, previous_status, new_status, updated_by, notes) VALUES (${sqlStr(
          logId
        )}, ${sqlStr(wo.id)}, ${sqlStrOrEmpty(entry.timestamp)}, ${sqlStrOrEmpty(
          entry.formattedDate
        )}, ${sqlStrOrEmpty(entry.previousStatus)}, ${sqlStr(entry.newStatus)}, ${sqlStr(
          entry.updatedBy
        )}, ${sqlStrOrEmpty(entry.notes)})` +
          (isPg ? ' ON CONFLICT (id) DO NOTHING;' : ' ON DUPLICATE KEY UPDATE new_status = VALUES(new_status);')
      );
    });
  }
  lines.push('');

  // 5. Workshop Reports
  if (payload.reports.length > 0) {
    lines.push(`-- 5. Laporan Operasional Otomatis (${payload.reports.length} baris)`);
    for (const rpt of payload.reports) {
      const orderFk = rpt.orderId && knownOrderIds.has(rpt.orderId) ? sqlStr(rpt.orderId) : 'NULL';
      lines.push(
        `INSERT INTO workshop_reports (id, report_type, title, reference_number, order_id, customer_company, technician_or_actor, summary, verdict_or_status, amount_rp, copper_kg, megger_mohm, metrics_json, source_action, report_date) VALUES (${sqlStr(
          rpt.id
        )}, ${sqlStr(rpt.reportType)}, ${sqlStr(rpt.title)}, ${sqlStr(
          rpt.referenceNumber
        )}, ${orderFk}, ${sqlStrOrEmpty(rpt.customerCompany)}, ${sqlStr(
          rpt.technicianOrActor
        )}, ${sqlStrOrEmpty(rpt.summary)}, ${sqlStrOrEmpty(
          rpt.verdictOrStatus
        )}, ${sqlNum(rpt.amountRp)}, ${sqlNum(rpt.copperKg)}, ${sqlNum(
          rpt.meggerMOhm
        )}, ${sqlJson(rpt.metrics || {}, dialect)}, ${sqlStrOrEmpty(
          rpt.sourceAction
        )}, ${sqlStrOrEmpty(rpt.reportDate)})` +
          (isPg
            ? ' ON CONFLICT (id) DO NOTHING;'
            : ' ON DUPLICATE KEY UPDATE verdict_or_status = VALUES(verdict_or_status);')
      );
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  if (!isPg) {
    lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  }
  lines.push('');

  return lines.join('\n');
}

export function generateFullSqlDump(
  payload: SqlExportPayload,
  dialect: SqlDialect = 'postgresql'
): string {
  return `${generateSqlSchema(dialect)}\n${generateSqlData(payload, dialect)}`;
}
