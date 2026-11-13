/**
 * ============================================================================
 * CV. MUSTOFA JAYA TEKNIK — SISTEM MANAJEMEN REWINDING & OVERHAUL
 * Google Apps Script Backend (Code.gs)
 * Database: Google Sheets (SPK_Orders, Pelanggan, Inventaris)
 * ============================================================================
 */

var SHEET_NAMES = {
  ORDERS: 'SPK_Orders',
  CUSTOMERS: 'Pelanggan',
  INVENTORY: 'Inventaris',
};

/**
 * Entry point Web App Google Apps Script
 */
function doGet(e) {
  ensureDatabaseInitialized();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('CV. Mustofa Jaya Teknik - Manajemen Rewinding')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper include file HTML/CSS/JS terpisah bila diperlukan
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Menu kustom otomatis di Google Sheets (jika Apps Script bound ke Spreadsheet)
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚙️ Mustofa Jaya Teknik')
      .addItem('Inisialisasi / Reset Struktur Sheet', 'setupSpreadsheetDatabase')
      .addItem('Backup Database JSON ke Google Drive', 'exportBackupToDrive')
      .addToUi();
  } catch (err) {
    // Abaikan jika dijalankan sebagai standalone web app
  }
}

/**
 * Mendapatkan Spreadsheet aktif atau membuat Spreadsheet baru otomatis jika standalone
 */
function getWorkshopSpreadsheet() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = null;
  }

  if (ss) return ss;

  var props = PropertiesService.getScriptProperties();
  var storedId = props.getProperty('WORKSHOP_SPREADSHEET_ID');
  if (storedId) {
    try {
      return SpreadsheetApp.openById(storedId);
    } catch (e) {
      // Buat baru jika file lama terhapus
    }
  }

  var newSs = SpreadsheetApp.create('Database Bengkel - CV. Mustofa Jaya Teknik');
  props.setProperty('WORKSHOP_SPREADSHEET_ID', newSs.getId());
  return newSs;
}

/**
 * Pastikan 3 tab Sheet database tersedia
 */
function ensureDatabaseInitialized() {
  var ss = getWorkshopSpreadsheet();
  var ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  var custSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  var invSheet = ss.getSheetByName(SHEET_NAMES.INVENTORY);

  if (!ordersSheet || !custSheet || !invSheet) {
    setupSpreadsheetDatabase();
  }
}

/**
 * Inisialisasi header, pemformatan, dan data contoh awal pada Google Sheets
 */
function setupSpreadsheetDatabase() {
  var ss = getWorkshopSpreadsheet();

  // 1. Setup SPK_Orders
  var orderHeaders = [
    'ID', 'No. SPK', 'Tgl Masuk', 'Target Selesai', 'Pelanggan',
    'Mesin / Brand', 'Daya (HP)', 'Status', 'Prioritas', 'Teknisi PIC',
    'Grand Total (Rp)', 'Status Bayar', 'Kawat (mm)', 'Berat Tembaga (kg)', 'RAW_JSON'
  ];
  var orderSheet = getOrCreateSheet(ss, SHEET_NAMES.ORDERS, orderHeaders);
  if (orderSheet.getLastRow() <= 1) {
    var seedOrders = getInitialOrdersSeed();
    writeOrdersRows(orderSheet, seedOrders);
  }

  // 2. Setup Pelanggan
  var custHeaders = [
    'ID', 'Nama Kontak', 'Perusahaan', 'Telepon / WA', 'Email',
    'Kota', 'Alamat', 'Total Order', 'RAW_JSON'
  ];
  var custSheet = getOrCreateSheet(ss, SHEET_NAMES.CUSTOMERS, custHeaders);
  if (custSheet.getLastRow() <= 1) {
    var seedCustomers = getInitialCustomersSeed();
    writeCustomerRows(custSheet, seedCustomers);
  }

  // 3. Setup Inventaris
  var invHeaders = [
    'ID', 'Kode', 'Nama Material', 'Kategori', 'Spesifikasi',
    'Stok Saat Ini', 'Satuan', 'Batas Min', 'Harga Beli', 'Harga Jual', 'Supplier', 'Update Terakhir', 'RAW_JSON'
  ];
  var invSheet = getOrCreateSheet(ss, SHEET_NAMES.INVENTORY, invHeaders);
  if (invSheet.getLastRow() <= 1) {
    var seedInv = getInitialInventorySeed();
    writeInventoryRows(invSheet, seedInv);
  }

  return {
    success: true,
    spreadsheetUrl: ss.getUrl(),
    spreadsheetId: ss.getId(),
  };
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#0F172A')
      .setFontColor('#FBBF24')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Sembunyikan kolom RAW_JSON paling kanan agar tampilan Sheet rapi
    sheet.hideColumns(headers.length);
  }
  return sheet;
}

/**
 * API: Ambil seluruh data bengkel untuk frontend Web App
 */
function getAllWorkshopData() {
  ensureDatabaseInitialized();
  var ss = getWorkshopSpreadsheet();

  var orders = readJsonColumn(ss.getSheetByName(SHEET_NAMES.ORDERS), 15);
  var customers = readJsonColumn(ss.getSheetByName(SHEET_NAMES.CUSTOMERS), 9);
  var inventory = readJsonColumn(ss.getSheetByName(SHEET_NAMES.INVENTORY), 13);

  return {
    orders: orders,
    customers: customers,
    inventory: inventory,
    spreadsheetUrl: ss.getUrl(),
  };
}

function readJsonColumn(sheet, jsonColIndex) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var numRows = sheet.getLastRow() - 1;
  var values = sheet.getRange(2, jsonColIndex, numRows, 1).getValues();
  var list = [];
  for (var i = 0; i < values.length; i++) {
    var raw = values[i][0];
    if (raw) {
      try {
        list.push(JSON.parse(raw));
      } catch (e) {
        // Lewati baris rusak
      }
    }
  }
  return list;
}

/**
 * API: Simpan seluruh array WorkOrder ke Google Sheet SPK_Orders
 */
function saveWorkOrders(ordersArray) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ensureDatabaseInitialized();
    var ss = getWorkshopSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    clearDataRows(sheet, 15);
    writeOrdersRows(sheet, ordersArray || []);
    return { success: true, count: (ordersArray || []).length };
  } finally {
    lock.releaseLock();
  }
}

function writeOrdersRows(sheet, orders) {
  if (!orders || orders.length === 0) return;
  var rows = orders.map(function (o) {
    return [
      o.id || '',
      o.spkNumber || '',
      o.entryDate || '',
      o.targetCompletionDate || '',
      o.customerCompany || o.customerName || '',
      (o.brand || '') + ' - ' + (o.machineType || ''),
      o.powerHp || 0,
      o.status || 'Diterima',
      o.priority || 'Biasa',
      o.technicianName || '',
      o.grandTotal || 0,
      o.paymentStatus || 'Belum Bayar',
      o.windingData ? o.windingData.wireSizeMm : 0,
      o.windingData ? o.windingData.copperWeightKg : 0,
      JSON.stringify(o)
    ];
  });
  sheet.getRange(2, 1, rows.length, 15).setValues(rows);
}

/**
 * API: Simpan seluruh array Customer ke Google Sheet Pelanggan
 */
function saveCustomers(customersArray) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ensureDatabaseInitialized();
    var ss = getWorkshopSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
    clearDataRows(sheet, 9);
    writeCustomerRows(sheet, customersArray || []);
    return { success: true, count: (customersArray || []).length };
  } finally {
    lock.releaseLock();
  }
}

function writeCustomerRows(sheet, customers) {
  if (!customers || customers.length === 0) return;
  var rows = customers.map(function (c) {
    return [
      c.id || '',
      c.name || '',
      c.company || '',
      c.phone || '',
      c.email || '',
      c.city || '',
      c.address || '',
      c.totalOrdersCount || 0,
      JSON.stringify(c)
    ];
  });
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
}

/**
 * API: Simpan seluruh array InventoryItem ke Google Sheet Inventaris
 */
function saveInventory(inventoryArray) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ensureDatabaseInitialized();
    var ss = getWorkshopSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.INVENTORY);
    clearDataRows(sheet, 13);
    writeInventoryRows(sheet, inventoryArray || []);
    return { success: true, count: (inventoryArray || []).length };
  } finally {
    lock.releaseLock();
  }
}

function writeInventoryRows(sheet, items) {
  if (!items || items.length === 0) return;
  var rows = items.map(function (item) {
    return [
      item.id || '',
      item.code || '',
      item.name || '',
      item.category || '',
      item.spec || '',
      item.currentStock || 0,
      item.unit || '',
      item.minStockAlert || 0,
      item.unitCost || 0,
      item.sellingPrice || 0,
      item.supplier || '',
      item.lastUpdated || '',
      JSON.stringify(item)
    ];
  });
  sheet.getRange(2, 1, rows.length, 13).setValues(rows);
}

function clearDataRows(sheet, numCols) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
  }
}

/**
 * API: Reset database Google Sheets ke data contoh bawaan
 */
function resetWorkshopDatabase() {
  var orders = getInitialOrdersSeed();
  var customers = getInitialCustomersSeed();
  var inventory = getInitialInventorySeed();
  saveWorkOrders(orders);
  saveCustomers(customers);
  saveInventory(inventory);
  return { orders: orders, customers: customers, inventory: inventory };
}

/**
 * API: Simpan file JSON Backup langsung ke Google Drive pemilik bengkel
 */
function exportBackupToDrive() {
  var data = getAllWorkshopData();
  var payload = {
    app: 'CV. MUSTOFA JAYA TEKNIK - REWINDING MANAGEMENT (GAS)',
    exportedAt: new Date().toISOString(),
    workOrders: data.orders,
    customers: data.customers,
    inventory: data.inventory,
  };
  var dateTag = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd_HHmm');
  var fileName = 'Backup_MJT_' + dateTag + '.json';
  var file = DriveApp.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  return {
    success: true,
    fileName: fileName,
    fileUrl: file.getUrl(),
  };
}

/**
 * API: Konsultasi Teknis Rewinding via Gemini API langsung dari Apps Script (UrlFetchApp)
 * Catatan: Simpan GEMINI_API_KEY di Project Settings -> Script Properties
 */
function askGeminiTechnical(promptText) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return {
      error: 'GEMINI_API_KEY belum diatur di Script Properties Google Apps Script.',
    };
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
  var body = {
    contents: [
      {
        parts: [
          {
            text: 'Anda adalah asisten teknik ahli bengkel rewinding motor listrik CV. Mustofa Jaya Teknik (Standar Class H 200C & IEEE 43). Jawab ringkas dan teknis: ' + promptText
          }
        ]
      }
    ]
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  var json = JSON.parse(res.getContentText());
  if (json.error) {
    return { error: json.error.message || 'Gagal memanggil Gemini API' };
  }
  var text = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts
    ? json.candidates[0].content.parts[0].text
    : '';
  return { answer: text };
}

/**
 * ============================================================================
 * DATA CONTOH BAWAAN (INITIAL SEED DATA)
 * ============================================================================
 */
function getInitialCustomersSeed() {
  return [
    {
      id: 'CUST-001',
      name: 'Bpk. Hendro Wijaya',
      company: 'PDAM Surya Sembada',
      phone: '0812-3456-7890',
      email: 'maintenance@pdamsurya.co.id',
      address: 'Jl. Prof. Dr. Moestopo No. 2, Surabaya',
      city: 'Surabaya',
      notes: 'Pelanggan prioritas pompa distribusi air bersih 24 jam',
      totalOrdersCount: 4,
      joinedDate: '2025-03-10'
    },
    {
      id: 'CUST-002',
      name: 'Ibu Ratna Sari',
      company: 'PT. Indo Semen Perkasa',
      phone: '0813-9988-7766',
      email: 'procurement@indosemen.co.id',
      address: 'Kawasan Industri Gresik Kav. 14',
      city: 'Gresik',
      notes: 'Faktur wajib melampirkan Sertifikat Uji Megger & PPN 11%',
      totalOrdersCount: 3,
      joinedDate: '2025-05-18'
    },
    {
      id: 'CUST-003',
      name: 'Bpk. Darmawan',
      company: 'PT. Tekstil Mitra Kencana',
      phone: '0815-4433-2211',
      email: 'teknik@tekstilmitra.com',
      address: 'Jl. Rungkut Industri III No. 45',
      city: 'Surabaya',
      notes: 'Banyak memakai motor blower 15 HP dan 20 HP',
      totalOrdersCount: 2,
      joinedDate: '2025-09-01'
    }
  ];
}

function getInitialInventorySeed() {
  return [
    {
      id: 'INV-001',
      code: 'KWT-085-H',
      name: 'Kawat Tembaga Email Supreme Ø 0.85 mm',
      category: 'Kawat Tembaga',
      spec: 'Grade 200°C Class H Dual Coat',
      currentStock: 48.0,
      unit: 'kg',
      minStockAlert: 20,
      unitCost: 162000,
      sellingPrice: 192000,
      supplier: 'PT. Supreme Cable Tbk',
      lastUpdated: '2026-11-08'
    },
    {
      id: 'INV-002',
      code: 'KWT-105-H',
      name: 'Kawat Tembaga Email Helenic Ø 1.05 mm',
      category: 'Kawat Tembaga',
      spec: 'Grade 200°C Class H Dual Coat',
      currentStock: 52.0,
      unit: 'kg',
      minStockAlert: 20,
      unitCost: 160000,
      sellingPrice: 190000,
      supplier: 'PT. Tembaga Nusantara',
      lastUpdated: '2026-11-09'
    },
    {
      id: 'INV-003',
      code: 'KWT-115-H',
      name: 'Kawat Tembaga Email Supreme Ø 1.15 mm',
      category: 'Kawat Tembaga',
      spec: 'Grade 200°C Class H Dual Coat',
      currentStock: 8.5,
      unit: 'kg',
      minStockAlert: 15,
      unitCost: 160000,
      sellingPrice: 190000,
      supplier: 'PT. Supreme Cable Tbk',
      lastUpdated: '2026-11-10'
    },
    {
      id: 'INV-004',
      code: 'KWT-125-H',
      name: 'Kawat Tembaga Email Essex Ø 1.25 mm',
      category: 'Kawat Tembaga',
      spec: 'Grade 200°C Class H Heavy Build',
      currentStock: 29.0,
      unit: 'kg',
      minStockAlert: 15,
      unitCost: 165000,
      sellingPrice: 195000,
      supplier: 'PT. Tembaga Nusantara',
      lastUpdated: '2026-11-09'
    },
    {
      id: 'INV-005',
      code: 'ISO-NMX-025',
      name: 'Kertas Isolasi Nomex 410 (0.25mm)',
      category: 'Isolasi & Vernis',
      spec: 'DuPont Nomex Tahan 220°C',
      currentStock: 14,
      unit: 'meter',
      minStockAlert: 10,
      unitCost: 85000,
      sellingPrice: 115000,
      supplier: 'CV. Isolasi Jaya',
      lastUpdated: '2026-11-05'
    },
    {
      id: 'INV-006',
      code: 'BRG-6309-SKF',
      name: 'Bearing SKF 6309-2Z/C3',
      category: 'Bearing',
      spec: 'High Speed Deep Groove C3 Clearance',
      currentStock: 6,
      unit: 'pcs',
      minStockAlert: 4,
      unitCost: 310000,
      sellingPrice: 410000,
      supplier: 'PT. SKF Industrial',
      lastUpdated: '2026-11-07'
    }
  ];
}

function getInitialOrdersSeed() {
  var today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  var tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), 'Asia/Jakarta', 'yyyy-MM-dd');
  var in3Days = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), 'Asia/Jakarta', 'yyyy-MM-dd');
  return [
    {
      id: 'WO-001',
      spkNumber: 'SPK-MJT-2026-0301',
      entryDate: '2026-11-04',
      targetCompletionDate: today,
      customerId: 'CUST-001',
      customerName: 'Bpk. Hendro Wijaya',
      customerCompany: 'PDAM Surya Sembada',
      customerPhone: '0812-3456-7890',
      customerAddress: 'Jl. Prof. Dr. Moestopo No. 2, Surabaya',
      machineType: 'Motor 3 Fasa Induksi',
      brand: 'Siemens',
      modelOrType: '1LE1001-2BB23',
      serialNumber: 'SN-SM-88412',
      powerHp: 45,
      powerKw: 33.5,
      rpm: 1475,
      voltage: '380 / 660 V',
      frequencyHz: 50,
      currentAmpereRated: 61.5,
      frameSize: '200L',
      cosPhi: 0.86,
      ipRating: 'IP 55',
      complaint: 'Stator terbakar fasa U-V akibat beban pompa macet & proteksi overload gagal trip.',
      inspection: {
        visualCondition: 'Kumparan fasa U-V gosong, bearing DE aus',
        meggerInitialBodyMOhm: 0.2,
        bearingFrontCondition: 'Wajib Ganti',
        bearingRearCondition: 'Bagus',
        rotorCondition: 'Rotor balance baik, as tidak bengkok',
        shaftRunoutMm: 0.02
      },
      windingData: {
        slotsCount: 48,
        polesCount: 4,
        pitchCoil: '1 - 11',
        wireSizeMm: 1.15,
        wireSizeAlternative: '2x Ø 1.15 mm paralel',
        turnsPerSlot: 18,
        parallelWires: 2,
        windingType: 'Double Layer',
        insulationClass: 'Class H (180°C - 200°C)',
        insulationMaterial: 'Nomex 410 0.25mm + Selongsong Fiberglass Silikon',
        copperWeightKg: 28.5,
        bakingVarnishType: 'Varnish Bakar Class H Dolph ER-41',
        bakingDurationHours: 6,
        bakingTempC: 135,
        connectionType: 'Delta (Δ)'
      },
      qcReport: {
        testedAt: today,
        testedBy: 'Cak Mustofa',
        meggerPhasePhaseMOhm: { uv: 1850, vw: 1920, wu: 1890 },
        meggerPhaseBodyMOhm: { uBody: 1750, vBody: 1800, wBody: 1780 },
        windingResistanceOhm: { u: 0.34, v: 0.34, w: 0.35 },
        resistanceBalancePercent: 1.4,
        noLoadTest: {
          voltageRS: 382, voltageST: 380, voltageTR: 381,
          currentR: 18.2, currentS: 18.4, currentT: 18.1,
          currentBalanceStatus: 'PASS',
          rpmMeasured: 1492,
          bearingVibrationMmS: 1.1,
          bearingTempC: 44,
          noiseDb: 68
        },
        summaryVerdict: 'LAYAK OPERASI (LULUS QC)',
        notes: 'Isolasi sangat baik di atas 1000 MOhm, arus tanpa beban seimbang.'
      },
      status: 'QC & Pengetesan',
      priority: 'Urgent / Lembur',
      technicianName: 'Mustofa & Agus',
      serviceItems: [
        { id: '1', description: 'Jasa Rewinding Stator Siemens 45 HP Class H', quantity: 1, unit: 'unit', unitPrice: 8500000, total: 8500000 },
        { id: '2', description: 'Kawat Tembaga Email Ø 1.15 mm Class H', quantity: 28.5, unit: 'kg', unitPrice: 190000, total: 5415000 },
        { id: '3', description: 'Bearing SKF 6312-2Z/C3', quantity: 1, unit: 'pcs', unitPrice: 685000, total: 685000 }
      ],
      laborCost: 8500000,
      partsCost: 6100000,
      discount: 0,
      taxPpnPercent: 0,
      grandTotal: 14600000,
      downPayment: 7000000,
      balanceDue: 7600000,
      paymentStatus: 'DP / Sebagian',
      warrantyMonths: 6,
      warrantyNotes: 'Garansi gulungan stator 6 bulan (tidak mencakup over-voltage PLN atau pompa macet).'
    },
    {
      id: 'WO-002',
      spkNumber: 'SPK-MJT-2026-0302',
      entryDate: '2026-11-06',
      targetCompletionDate: tomorrow,
      customerId: 'CUST-003',
      customerName: 'Bpk. Darmawan',
      customerCompany: 'PT. Tekstil Mitra Kencana',
      customerPhone: '0815-4433-2211',
      customerAddress: 'Jl. Rungkut Industri III No. 45, Surabaya',
      machineType: 'Motor 3 Fasa Induksi',
      brand: 'TECO',
      modelOrType: 'AEEB-160M',
      serialNumber: 'TC-992104',
      powerHp: 15,
      powerKw: 11,
      rpm: 2920,
      voltage: '380 V',
      frequencyHz: 50,
      currentAmpereRated: 21.8,
      frameSize: '160M',
      cosPhi: 0.87,
      ipRating: 'IP 54',
      complaint: 'Putaran blower bergetar dan MCB trip saat start Delta.',
      inspection: {
        visualCondition: 'Lapisan vernis retak & lembab, fasa W short ke bodi',
        meggerInitialBodyMOhm: 0.1,
        bearingFrontCondition: 'Bagus',
        bearingRearCondition: 'Kocak / Aus',
        rotorCondition: 'Normal',
        shaftRunoutMm: 0.01
      },
      windingData: {
        slotsCount: 36,
        polesCount: 2,
        pitchCoil: '1 - 15',
        wireSizeMm: 1.05,
        wireSizeAlternative: '2x Ø 1.05 mm',
        turnsPerSlot: 24,
        parallelWires: 2,
        windingType: 'Concentric',
        insulationClass: 'Class H (180°C - 200°C)',
        insulationMaterial: 'Nomex 410 + Tali Pengikat Polyester',
        copperWeightKg: 8.2,
        bakingVarnishType: 'Varnish Bakar Class H',
        bakingDurationHours: 5,
        bakingTempC: 130,
        connectionType: 'Delta (Δ)'
      },
      qcReport: {
        testedAt: '-',
        testedBy: '-',
        meggerPhasePhaseMOhm: { uv: 0, vw: 0, wu: 0 },
        meggerPhaseBodyMOhm: { uBody: 0, vBody: 0, wBody: 0 },
        windingResistanceOhm: { u: 0, v: 0, w: 0 },
        resistanceBalancePercent: 0,
        noLoadTest: {
          voltageRS: 380, voltageST: 380, voltageTR: 380,
          currentR: 0, currentS: 0, currentT: 0,
          currentBalanceStatus: 'PASS',
          rpmMeasured: 0,
          bearingVibrationMmS: 0,
          bearingTempC: 0,
          noiseDb: 0
        },
        summaryVerdict: 'PERLU RE-CHECK',
        notes: 'Sedang dalam tahap penggulungan kumparan.'
      },
      status: 'Proses Rewinding',
      priority: 'Penting',
      technicianName: 'Slamet',
      serviceItems: [
        { id: '1', description: 'Rewinding Motor Blower TECO 15 HP 2-Pole', quantity: 1, unit: 'unit', unitPrice: 3800000, total: 3800000 },
        { id: '2', description: 'Kawat Tembaga Email Ø 1.05 mm Class H', quantity: 8.2, unit: 'kg', unitPrice: 190000, total: 1558000 }
      ],
      laborCost: 3800000,
      partsCost: 1558000,
      discount: 0,
      taxPpnPercent: 0,
      grandTotal: 5358000,
      downPayment: 2500000,
      balanceDue: 2858000,
      paymentStatus: 'DP / Sebagian',
      warrantyMonths: 6,
      warrantyNotes: 'Garansi 6 bulan pemakaian normal.'
    },
    {
      id: 'WO-003',
      spkNumber: 'SPK-MJT-2026-0303',
      entryDate: '2026-11-05',
      targetCompletionDate: in3Days,
      customerId: 'CUST-002',
      customerName: 'Ibu Ratna Sari',
      customerCompany: 'PT. Indo Semen Perkasa',
      customerPhone: '0813-9988-7766',
      customerAddress: 'Kawasan Industri Gresik Kav. 14',
      machineType: 'Motor 3 Fasa Induksi',
      brand: 'ABB',
      modelOrType: 'M3BP 225SMB',
      serialNumber: 'ABB-771290',
      powerHp: 60,
      powerKw: 45,
      rpm: 1480,
      voltage: '380 / 660 V',
      frequencyHz: 50,
      currentAmpereRated: 81.0,
      frameSize: '225M',
      cosPhi: 0.86,
      ipRating: 'IP 55',
      complaint: 'Overhaul tahunan + re-varnish dan penggantian gulungan fasa T terkelupas.',
      inspection: {
        visualCondition: 'Debu semen menumpuk tebal pada kisi pendingin, isolasi rapuh',
        meggerInitialBodyMOhm: 1.5,
        bearingFrontCondition: 'Wajib Ganti',
        bearingRearCondition: 'Wajib Ganti',
        rotorCondition: 'Normal',
        shaftRunoutMm: 0.02
      },
      windingData: {
        slotsCount: 48,
        polesCount: 4,
        pitchCoil: '1 - 11',
        wireSizeMm: 1.25,
        wireSizeAlternative: '3x Ø 1.25 mm',
        turnsPerSlot: 16,
        parallelWires: 3,
        windingType: 'Double Layer',
        insulationClass: 'Class H (180°C - 200°C)',
        insulationMaterial: 'Nomex 410 + Epoxy Resin Anti-Abrasi Debu Semen',
        copperWeightKg: 36.0,
        bakingVarnishType: 'Varnish Bakar Class H Heavy Duty',
        bakingDurationHours: 8,
        bakingTempC: 140,
        connectionType: 'Delta (Δ)'
      },
      qcReport: {
        testedAt: '2026-11-08',
        testedBy: 'Mustofa',
        meggerPhasePhaseMOhm: { uv: 2100, vw: 2150, wu: 2080 },
        meggerPhaseBodyMOhm: { uBody: 2050, vBody: 2100, wBody: 2090 },
        windingResistanceOhm: { u: 0.21, v: 0.21, w: 0.21 },
        resistanceBalancePercent: 0.8,
        noLoadTest: {
          voltageRS: 380, voltageST: 381, voltageTR: 379,
          currentR: 22.5, currentS: 22.6, currentT: 22.4,
          currentBalanceStatus: 'PASS',
          rpmMeasured: 1495,
          bearingVibrationMmS: 0.9,
          bearingTempC: 42,
          noiseDb: 66
        },
        summaryVerdict: 'LAYAK OPERASI (LULUS QC)',
        notes: 'Siap finishing cat & packing kirim ke Gresik.'
      },
      status: 'Varnish & Oven',
      priority: 'Biasa',
      technicianName: 'Mustofa',
      serviceItems: [
        { id: '1', description: 'Rewinding & Overhaul ABB 60 HP Epoxy Anti-Debu', quantity: 1, unit: 'unit', unitPrice: 12500000, total: 12500000 },
        { id: '2', description: 'Kawat Tembaga Email Essex Ø 1.25 mm Class H', quantity: 36, unit: 'kg', unitPrice: 195000, total: 7020000 }
      ],
      laborCost: 12500000,
      partsCost: 7020000,
      discount: 0,
      taxPpnPercent: 11,
      grandTotal: 19520000,
      downPayment: 19520000,
      balanceDue: 0,
      paymentStatus: 'Lunas',
      warrantyMonths: 6,
      warrantyNotes: 'Garansi 6 bulan lengkap dengan sertifikat QC.'
    }
  ];
}
