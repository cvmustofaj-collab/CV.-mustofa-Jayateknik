import { WorkOrder, InventoryItem, Customer } from '../types/rewinding';

export const SHEET_TABS = {
  SPK: 'SPK_Pengerjaan',
  QC: 'QC_Pengujian',
  INVENTORY: 'Inventaris',
  CUSTOMERS: 'Pelanggan',
} as const;

export type SyncTabKey = 'spk' | 'qc' | 'inventory' | 'customers';

export class SheetsAuthExpiredError extends Error {
  constructor(message = 'Sesi izin Google Sheets telah kedaluwarsa. Silakan hubungkan ulang.') {
    super(message);
    this.name = 'SheetsAuthExpiredError';
  }
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  existingTabs: string[];
}

export interface SyncResultSummary {
  spreadsheetId: string;
  syncedTabs: string[];
  rowCounts: Record<string, number>;
  syncedAt: string;
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export function extractSpreadsheetId(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed.replace(/[^a-zA-Z0-9-_]/g, '');
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    throw new SheetsAuthExpiredError();
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(`Google Sheets API Error: ${detail}`);
  }

  return (await res.json()) as T;
}

export async function inspectSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('ID atau URL Google Spreadsheet tidak valid.');
  }

  const data = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
    sheets?: { properties?: { title?: string } }[];
  }>(
    `${SHEETS_API_BASE}/${encodeURIComponent(cleanId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    accessToken
  );

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet Bengkel',
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    existingTabs: (data.sheets || [])
      .map((s) => s.properties?.title || '')
      .filter(Boolean),
  };
}

export async function createWorkshopSpreadsheet(
  accessToken: string,
  title = 'CV. Mustofa Jaya Teknik — Database Workshop & SPK'
): Promise<SpreadsheetMetadata> {
  const created = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
    sheets?: { properties?: { title?: string; sheetId?: number } }[];
  }>(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title,
        locale: 'id_ID',
        timeZone: 'Asia/Jakarta',
      },
      sheets: [
        { properties: { title: SHEET_TABS.SPK, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.QC, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.INVENTORY, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.CUSTOMERS, gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  // Format header row bold with dark navy fill for readability
  const sheetIds = (created.sheets || [])
    .map((s) => s.properties?.sheetId)
    .filter((id): id is number => typeof id === 'number');

  if (sheetIds.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${created.spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: sheetIds.map((sheetId) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        })),
      }),
    });
  }

  return {
    spreadsheetId: created.spreadsheetId,
    title: created.properties?.title || title,
    spreadsheetUrl:
      created.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
    existingTabs: [SHEET_TABS.SPK, SHEET_TABS.QC, SHEET_TABS.INVENTORY, SHEET_TABS.CUSTOMERS],
  };
}

async function ensureTabsExist(
  accessToken: string,
  spreadsheetId: string,
  requiredTabNames: string[]
): Promise<void> {
  const meta = await inspectSpreadsheetMetadata(accessToken, spreadsheetId);
  const existingSet = new Set(meta.existingTabs);
  const missingTabs = requiredTabNames.filter((t) => !existingSet.has(t));

  if (missingTabs.length === 0) return;

  await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requests: missingTabs.map((title) => ({
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      })),
    }),
  });
}

function buildSpkSheetRows(orders: WorkOrder[]): (string | number)[][] {
  const header = [
    'ID',
    'No. SPK',
    'No. Invois',
    'Tgl Invois',
    'No. Faktur Pajak',
    'Tgl Masuk',
    'Target Selesai',
    'Tgl Selesai Aktual',
    'Nama PIC Pelanggan',
    'Perusahaan',
    'Telepon',
    'Tipe Mesin',
    'Merek',
    'Model / Seri',
    'Daya (HP)',
    'Daya (kW)',
    'RPM',
    'Tegangan',
    'Status Pengerjaan',
    'Prioritas',
    'Teknisi PIC',
    'Diameter Kawat (mm)',
    'Berat Kawat (kg)',
    'Kelas Isolasi',
    'Biaya Jasa (Rp)',
    'Biaya Material (Rp)',
    'Diskon (Rp)',
    'DPP (Rp)',
    'PPN (%)',
    'Nilai PPN (Rp)',
    'Total Bruto (Rp)',
    'PPh (%)',
    'Potongan PPh (Rp)',
    'Total Tagihan Net (Rp)',
    'DP (Rp)',
    'Sisa Tagihan (Rp)',
    'Status Bayar',
    'Update Terakhir',
  ];

  const rows = orders.map((o) => {
    const subtotal =
      o.serviceItems && o.serviceItems.length > 0
        ? o.serviceItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0)
        : Number(o.partsCost || 0) || Number(o.grandTotal || 0);
    const dpp = Math.max(0, subtotal - Number(o.discount || 0));
    const ppnPct = Number(o.taxPpnPercent || 0);
    const ppnAmt =
      typeof o.taxPpnAmount === 'number' ? o.taxPpnAmount : Math.round(dpp * (ppnPct / 100));
    const pphPct = Number(o.taxPphPercent || 0);
    const pphAmt =
      typeof o.taxPphAmount === 'number' ? o.taxPphAmount : Math.round(dpp * (pphPct / 100));
    const netTotal =
      typeof o.netPayableTotal === 'number' && o.netPayableTotal > 0
        ? o.netPayableTotal
        : Math.max(0, Number(o.grandTotal || dpp + ppnAmt) - pphAmt);

    return [
      o.id,
      o.spkNumber,
      o.invoiceNumber || `INV-MJT/${(o.spkNumber || '').replace('SPK-MJT-', '')}`,
      o.invoiceDate || o.actualCompletionDate || o.entryDate,
      o.fakturPajakNumber || '-',
      o.entryDate,
      o.targetCompletionDate,
      o.actualCompletionDate || '',
      o.customerName,
      o.customerCompany,
      o.customerPhone,
      o.machineType,
      o.brand,
      `${o.modelOrType || '-'} / ${o.serialNumber || '-'}`,
      o.powerHp,
      o.powerKw,
      o.rpm,
      o.voltage,
      o.status,
      o.priority,
      o.technicianName,
      o.windingData?.wireSizeMm || 0,
      o.windingData?.copperWeightKg || 0,
      o.windingData?.insulationClass || '',
      o.laborCost,
      o.partsCost,
      o.discount,
      dpp,
      ppnPct,
      ppnAmt,
      o.grandTotal,
      pphPct,
      pphAmt,
      netTotal,
      o.downPayment,
      o.balanceDue,
      o.paymentStatus,
      o.lastStatusUpdated
        ? `${o.lastStatusUpdated} (${o.lastStatusUpdatedBy || o.technicianName})`
        : '',
    ];
  });

  return [header, ...rows];
}

function buildQcSheetRows(orders: WorkOrder[]): (string | number)[][] {
  const header = [
    'No. SPK',
    'Perusahaan',
    'Mesin & Daya',
    'Status SPK',
    'Tanggal Uji QC',
    'Diujikan Oleh',
    'Megger U-V (MΩ)',
    'Megger V-W (MΩ)',
    'Megger W-U (MΩ)',
    'Megger U-Body (MΩ)',
    'Megger V-Body (MΩ)',
    'Megger W-Body (MΩ)',
    'Ohm Fasa U',
    'Ohm Fasa V',
    'Ohm Fasa W',
    'Imbalance (%)',
    'Tegangan R-S / S-T / T-R',
    'Arus R (A)',
    'Arus S (A)',
    'Arus T (A)',
    'Status Arus',
    'RPM Terukur',
    'Vibrasi (mm/s)',
    'Suhu Bearing (°C)',
    'Kebisingan (dB)',
    'Vonis Akhir QC',
    'Catatan QC',
  ];

  const rows = orders.map((o) => {
    const qc = o.qcReport;
    const nl = qc.noLoadTest;
    return [
      o.spkNumber,
      o.customerCompany,
      `${o.brand} (${o.powerHp} HP / ${o.powerKw} kW)`,
      o.status,
      qc.testedAt || '-',
      qc.testedBy || '-',
      qc.meggerPhasePhaseMOhm?.uv || 0,
      qc.meggerPhasePhaseMOhm?.vw || 0,
      qc.meggerPhasePhaseMOhm?.wu || 0,
      qc.meggerPhaseBodyMOhm?.uBody || 0,
      qc.meggerPhaseBodyMOhm?.vBody || 0,
      qc.meggerPhaseBodyMOhm?.wBody || 0,
      qc.windingResistanceOhm?.u || 0,
      qc.windingResistanceOhm?.v || 0,
      qc.windingResistanceOhm?.w || 0,
      qc.resistanceBalancePercent || 0,
      `${nl?.voltageRS || 0} / ${nl?.voltageST || 0} / ${nl?.voltageTR || 0}`,
      nl?.currentR || 0,
      nl?.currentS || 0,
      nl?.currentT || 0,
      nl?.currentBalanceStatus || 'PASS',
      nl?.rpmMeasured || 0,
      nl?.bearingVibrationMmS || 0,
      nl?.bearingTempC || 0,
      nl?.noiseDb || 0,
      qc.summaryVerdict,
      qc.notes || '',
    ];
  });

  return [header, ...rows];
}

function buildInventorySheetRows(inventory: InventoryItem[]): (string | number)[][] {
  const header = [
    'ID',
    'Kode Barang',
    'Nama Material / Part',
    'Kategori',
    'Spesifikasi',
    'Stok Aktual',
    'Satuan',
    'Batas Min Alert',
    'Status Stok',
    'Harga Beli / Modal (Rp)',
    'Harga Jual (Rp)',
    'Supplier',
    'Terakhir Diperbarui',
  ];

  const rows = inventory.map((item) => [
    item.id,
    item.code,
    item.name,
    item.category,
    item.spec,
    item.currentStock,
    item.unit,
    item.minStockAlert,
    item.currentStock <= item.minStockAlert ? 'STOK KRITIS' : 'AMAN',
    item.unitCost,
    item.sellingPrice,
    item.supplier,
    item.lastUpdated,
  ]);

  return [header, ...rows];
}

function buildCustomersSheetRows(customers: Customer[]): (string | number)[][] {
  const header = [
    'ID Pelanggan',
    'Nama PIC',
    'Perusahaan / Instansi',
    'No. Telepon',
    'Email',
    'Kota',
    'Alamat',
    'Total SPK',
    'Tanggal Bergabung',
    'Catatan',
  ];

  const rows = customers.map((c) => [
    c.id,
    c.name,
    c.company,
    c.phone,
    c.email || '',
    c.city || '',
    c.address || '',
    c.totalOrdersCount,
    c.joinedDate,
    c.notes || '',
  ]);

  return [header, ...rows];
}

export async function syncTabsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  tabs: SyncTabKey[],
  data: {
    orders: WorkOrder[];
    inventory: InventoryItem[];
    customers: Customer[];
  }
): Promise<SyncResultSummary> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('Spreadsheet ID belum dikonfigurasi.');
  }

  const tabNameByKey: Record<SyncTabKey, string> = {
    spk: SHEET_TABS.SPK,
    qc: SHEET_TABS.QC,
    inventory: SHEET_TABS.INVENTORY,
    customers: SHEET_TABS.CUSTOMERS,
  };

  const uniqueTabs = Array.from(new Set(tabs));
  const targetSheetNames = uniqueTabs.map((k) => tabNameByKey[k]);

  await ensureTabsExist(accessToken, cleanId, targetSheetNames);

  const valuesPayload: { range: string; values: (string | number)[][] }[] = [];
  const rowCounts: Record<string, number> = {};

  for (const key of uniqueTabs) {
    if (key === 'spk') {
      const matrix = buildSpkSheetRows(data.orders);
      valuesPayload.push({ range: `'${SHEET_TABS.SPK}'!A1`, values: matrix });
      rowCounts[SHEET_TABS.SPK] = data.orders.length;
    } else if (key === 'qc') {
      const matrix = buildQcSheetRows(data.orders);
      valuesPayload.push({ range: `'${SHEET_TABS.QC}'!A1`, values: matrix });
      rowCounts[SHEET_TABS.QC] = data.orders.length;
    } else if (key === 'inventory') {
      const matrix = buildInventorySheetRows(data.inventory);
      valuesPayload.push({ range: `'${SHEET_TABS.INVENTORY}'!A1`, values: matrix });
      rowCounts[SHEET_TABS.INVENTORY] = data.inventory.length;
    } else if (key === 'customers') {
      const matrix = buildCustomersSheetRows(data.customers);
      valuesPayload.push({ range: `'${SHEET_TABS.CUSTOMERS}'!A1`, values: matrix });
      rowCounts[SHEET_TABS.CUSTOMERS] = data.customers.length;
    }
  }

  // Clear stale trailing rows in target tabs before writing updated rows
  await sheetsFetch(`${SHEETS_API_BASE}/${cleanId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      ranges: targetSheetNames.map((name) => `'${name}'!A1:AZ2000`),
    }),
  });

  await sheetsFetch(`${SHEETS_API_BASE}/${cleanId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valuesPayload,
    }),
  });

  return {
    spreadsheetId: cleanId,
    syncedTabs: targetSheetNames,
    rowCounts,
    syncedAt: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
