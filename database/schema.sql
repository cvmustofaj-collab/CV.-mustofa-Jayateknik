-- ============================================================================
-- CV. MUSTOFA JAYA TEKNIK — Skema Database Relasional SQL (PostgreSQL)
-- Spesialis Rewinding & Overhaul Motor Listrik, Trafo & Generator
-- Mencakup: Pelanggan, Inventaris, SPK, Inspeksi Awal, Data Winding,
--           Uji QC Megger & Running Test, Item Jasa, Audit Status,
--           Laporan Otomatis & Pengaturan Target Bulanan.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workshop_settings (
  id VARCHAR(128) PRIMARY KEY,
  monthly_spk_target INTEGER NOT NULL DEFAULT 6 CHECK (monthly_spk_target BETWEEN 1 AND 500),
  per_tech_monthly_target INTEGER NOT NULL DEFAULT 2 CHECK (per_tech_monthly_target BETWEEN 1 AND 200),
  updated_by VARCHAR(120) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(128) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(64) NOT NULL,
  spec VARCHAR(300) NOT NULL DEFAULT '',
  current_stock DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  unit VARCHAR(32) NOT NULL,
  min_stock_alert DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  supplier VARCHAR(200) NOT NULL DEFAULT '',
  last_updated DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(128) PRIMARY KEY,
  spk_number VARCHAR(64) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  target_completion_date DATE NOT NULL,
  actual_completion_date DATE NULL,
  customer_id VARCHAR(128) NULL REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_company VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL DEFAULT '-',
  customer_address VARCHAR(400) NOT NULL DEFAULT '-',
  machine_type VARCHAR(80) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  model_or_type VARCHAR(120) NOT NULL DEFAULT '-',
  serial_number VARCHAR(120) NOT NULL DEFAULT '-',
  power_hp DOUBLE PRECISION NOT NULL DEFAULT 0,
  power_kw DOUBLE PRECISION NOT NULL DEFAULT 0,
  rpm INTEGER NOT NULL DEFAULT 0,
  voltage VARCHAR(64) NOT NULL DEFAULT '380V',
  frequency_hz INTEGER NOT NULL DEFAULT 50,
  current_ampere_rated DOUBLE PRECISION NOT NULL DEFAULT 0,
  frame_size VARCHAR(64) NOT NULL DEFAULT '-',
  cos_phi DOUBLE PRECISION NOT NULL DEFAULT 0.85,
  ip_rating VARCHAR(32) NOT NULL DEFAULT 'IP 55',
  complaint TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  priority VARCHAR(32) NOT NULL,
  technician_name VARCHAR(120) NOT NULL,
  invoice_number VARCHAR(64) NOT NULL DEFAULT '',
  invoice_date DATE NULL,
  faktur_pajak_number VARCHAR(64) NOT NULL DEFAULT '',
  labor_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  parts_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_ppn_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_ppn_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_pph_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_pph_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_payable_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(32) NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 6,
  warranty_notes TEXT NOT NULL,
  last_status_updated VARCHAR(80) NOT NULL DEFAULT '',
  last_status_updated_by VARCHAR(120) NOT NULL DEFAULT '',
  workshop_notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_inspections (
  work_order_id VARCHAR(128) PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
  visual_condition VARCHAR(500) NOT NULL DEFAULT '',
  megger_initial_body_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  bearing_front_condition VARCHAR(32) NOT NULL,
  bearing_rear_condition VARCHAR(32) NOT NULL,
  rotor_condition VARCHAR(300) NOT NULL DEFAULT '',
  shaft_runout_mm DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_order_windings (
  work_order_id VARCHAR(128) PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
  slots_count INTEGER NOT NULL DEFAULT 36,
  poles_count INTEGER NOT NULL DEFAULT 4,
  pitch_coil VARCHAR(64) NOT NULL DEFAULT '',
  wire_size_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  wire_size_alternative VARCHAR(200) NOT NULL DEFAULT '',
  turns_per_slot INTEGER NOT NULL DEFAULT 0,
  parallel_wires INTEGER NOT NULL DEFAULT 1,
  winding_type VARCHAR(48) NOT NULL,
  insulation_class VARCHAR(48) NOT NULL,
  insulation_material VARCHAR(250) NOT NULL DEFAULT '',
  copper_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  baking_varnish_type VARCHAR(200) NOT NULL DEFAULT '',
  baking_duration_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  baking_temp_c DOUBLE PRECISION NOT NULL DEFAULT 0,
  connection_type VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS work_order_qc_reports (
  work_order_id VARCHAR(128) PRIMARY KEY REFERENCES work_orders(id) ON DELETE CASCADE,
  tested_at VARCHAR(64) NOT NULL DEFAULT '',
  tested_by VARCHAR(120) NOT NULL DEFAULT '',
  megger_uv_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  megger_vw_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  megger_wu_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  megger_u_body_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  megger_v_body_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  megger_w_body_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  resistance_u_ohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  resistance_v_ohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  resistance_w_ohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  resistance_balance_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  voltage_rs DOUBLE PRECISION NOT NULL DEFAULT 0,
  voltage_st DOUBLE PRECISION NOT NULL DEFAULT 0,
  voltage_tr DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_r DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_s DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_t DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_balance_status VARCHAR(16) NOT NULL DEFAULT 'PASS',
  rpm_measured INTEGER NOT NULL DEFAULT 0,
  bearing_vibration_mms DOUBLE PRECISION NOT NULL DEFAULT 0,
  bearing_temp_c DOUBLE PRECISION NOT NULL DEFAULT 0,
  noise_db DOUBLE PRECISION NOT NULL DEFAULT 0,
  summary_verdict VARCHAR(48) NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_order_service_items (
  id VARCHAR(128) PRIMARY KEY,
  work_order_id VARCHAR(128) NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL DEFAULT 1,
  description VARCHAR(250) NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit VARCHAR(32) NOT NULL DEFAULT 'lot',
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_order_status_audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  work_order_id VARCHAR(128) NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  event_timestamp VARCHAR(64) NOT NULL,
  formatted_date VARCHAR(80) NOT NULL DEFAULT '',
  previous_status VARCHAR(64) NOT NULL DEFAULT '',
  new_status VARCHAR(64) NOT NULL,
  updated_by VARCHAR(120) NOT NULL,
  notes VARCHAR(300) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workshop_reports (
  id VARCHAR(128) PRIMARY KEY,
  report_type VARCHAR(48) NOT NULL,
  title VARCHAR(200) NOT NULL,
  reference_number VARCHAR(64) NOT NULL,
  order_id VARCHAR(128) NULL REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_company VARCHAR(200) NOT NULL DEFAULT '',
  technician_or_actor VARCHAR(120) NOT NULL,
  summary VARCHAR(1000) NOT NULL,
  verdict_or_status VARCHAR(120) NOT NULL,
  amount_rp NUMERIC(14, 2) NOT NULL DEFAULT 0,
  copper_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  megger_mohm DOUBLE PRECISION NOT NULL DEFAULT 0,
  metrics_json JSONB NOT NULL,
  source_action VARCHAR(120) NOT NULL,
  report_date VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_wo_entry_date ON work_orders(entry_date);
CREATE INDEX IF NOT EXISTS idx_wo_target_date ON work_orders(target_completion_date);
CREATE INDEX IF NOT EXISTS idx_wo_technician ON work_orders(technician_name);
CREATE INDEX IF NOT EXISTS idx_inv_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_srv_wo_id ON work_order_service_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_audit_wo_id ON work_order_status_audit_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_rpt_type_date ON workshop_reports(report_type, report_date);

-- ============================================================================
-- VIEW ANALITIK (Profitabilitas per SPK, Kawat Tembaga, Kinerja & Deadline)
-- ============================================================================

CREATE OR REPLACE VIEW v_spk_profitability AS
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
LEFT JOIN work_order_windings wd ON wd.work_order_id = wo.id;

CREATE OR REPLACE VIEW v_copper_wire_usage AS
SELECT
  wd.wire_size_mm,
  COUNT(*) AS jumlah_spk,
  ROUND(SUM(wd.copper_weight_kg)::numeric, 2) AS total_kg_terpakai,
  ROUND(AVG(wd.copper_weight_kg)::numeric, 2) AS rata_rata_kg_per_spk
FROM work_order_windings wd
WHERE wd.copper_weight_kg > 0
GROUP BY wd.wire_size_mm
ORDER BY total_kg_terpakai DESC;

CREATE OR REPLACE VIEW v_technician_monthly_performance AS
SELECT
  technician_name,
  TO_CHAR(COALESCE(actual_completion_date, target_completion_date, entry_date), 'YYYY-MM') AS bulan,
  COUNT(*) AS jumlah_spk_selesai,
  SUM(power_hp) AS total_hp,
  SUM(grand_total) AS total_nilai_jasa
FROM work_orders
WHERE status IN ('Selesai & Siap Diambil', 'Diserahkan / Faktur')
GROUP BY technician_name, TO_CHAR(COALESCE(actual_completion_date, target_completion_date, entry_date), 'YYYY-MM');

CREATE OR REPLACE VIEW v_pending_deadlines AS
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
ORDER BY target_completion_date ASC;
