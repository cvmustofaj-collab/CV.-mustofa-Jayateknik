import { WireGaugeReference, WorkOrder } from '../types/rewinding';

export function getDefaultInvoiceNumber(spkNumber: string): string {
  return `INV-MJT/${(spkNumber || '').replace('SPK-MJT-', '')}`;
}

export function computeWorkOrderFinancials(params: {
  subtotal: number;
  discount: number;
  taxPpnPercent: number;
  taxPphPercent: number;
  downPayment: number;
}) {
  const subtotal = Math.max(0, Number(params.subtotal) || 0);
  const discount = Math.max(0, Number(params.discount) || 0);
  const dpp = Math.max(0, subtotal - discount);
  const ppnPercent = Math.max(0, Math.min(100, Number(params.taxPpnPercent) || 0));
  const pphPercent = Math.max(0, Math.min(100, Number(params.taxPphPercent) || 0));
  const taxPpnAmount = Math.round(dpp * (ppnPercent / 100));
  const grandTotal = dpp + taxPpnAmount;
  const taxPphAmount = Math.round(dpp * (pphPercent / 100));
  const netPayableTotal = Math.max(0, grandTotal - taxPphAmount);
  const downPayment = Math.max(0, Number(params.downPayment) || 0);
  const balanceDue = Math.max(0, netPayableTotal - downPayment);
  let paymentStatus: 'Lunas' | 'DP / Sebagian' | 'Belum Bayar' = 'Belum Bayar';
  if (downPayment >= netPayableTotal && netPayableTotal > 0) paymentStatus = 'Lunas';
  else if (downPayment > 0) paymentStatus = 'DP / Sebagian';

  return {
    dpp,
    taxPpnPercent: ppnPercent,
    taxPpnAmount,
    grandTotal,
    taxPphPercent: pphPercent,
    taxPphAmount,
    netPayableTotal,
    balanceDue,
    paymentStatus,
  };
}

export function getOrderFinancialSummary(order: WorkOrder) {
  const itemsSubtotal =
    order.serviceItems && order.serviceItems.length > 0
      ? order.serviceItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
      : 0;
  const subtotal =
    itemsSubtotal > 0
      ? itemsSubtotal
      : Number(order.partsCost || 0) || Number(order.grandTotal || 0);
  const discount = Math.max(0, Number(order.discount || 0));
  const dpp = Math.max(0, subtotal - discount);
  const taxPpnPercent = Math.max(0, Number(order.taxPpnPercent || 0));
  const taxPpnAmount =
    typeof order.taxPpnAmount === 'number'
      ? order.taxPpnAmount
      : Math.round(dpp * (taxPpnPercent / 100));
  const taxPphPercent = Math.max(0, Number(order.taxPphPercent || 0));
  const taxPphAmount =
    typeof order.taxPphAmount === 'number'
      ? order.taxPphAmount
      : Math.round(dpp * (taxPphPercent / 100));
  const grandTotal =
    typeof order.grandTotal === 'number' && order.grandTotal >= 0
      ? order.grandTotal
      : dpp + taxPpnAmount;
  const netPayableTotal =
    typeof order.netPayableTotal === 'number' && order.netPayableTotal > 0
      ? order.netPayableTotal
      : Math.max(0, grandTotal - taxPphAmount);
  const downPayment = Math.max(0, Number(order.downPayment || 0));
  const balanceDue =
    typeof order.balanceDue === 'number'
      ? order.balanceDue
      : Math.max(0, netPayableTotal - downPayment);
  const invoiceNumber = order.invoiceNumber?.trim() || getDefaultInvoiceNumber(order.spkNumber);
  const fakturPajakNumber = order.fakturPajakNumber?.trim() || '';
  const invoiceDate =
    order.invoiceDate?.trim() ||
    order.actualCompletionDate ||
    order.targetCompletionDate ||
    order.entryDate;

  return {
    invoiceNumber,
    fakturPajakNumber,
    invoiceDate,
    subtotal,
    discount,
    dpp,
    taxPpnPercent,
    taxPpnAmount,
    taxPphPercent,
    taxPphAmount,
    grandTotal,
    netPayableTotal,
    downPayment,
    balanceDue,
  };
}

// Standard Copper Magnet Wire Reference Table (Class H 200°C)
export const WIRE_GAUGE_TABLE: WireGaugeReference[] = [
  { diameterMm: 0.35, swg: 28, awg: 27, crossSectionMm2: 0.096, resistanceOhmPerKm: 179.0, currentCapacityAmpere: 0.38 },
  { diameterMm: 0.40, swg: 27, awg: 26, crossSectionMm2: 0.126, resistanceOhmPerKm: 137.0, currentCapacityAmpere: 0.50 },
  { diameterMm: 0.45, swg: 26, awg: 25, crossSectionMm2: 0.159, resistanceOhmPerKm: 108.0, currentCapacityAmpere: 0.64 },
  { diameterMm: 0.50, swg: 25, awg: 24, crossSectionMm2: 0.196, resistanceOhmPerKm: 87.7, currentCapacityAmpere: 0.78 },
  { diameterMm: 0.55, swg: 24, awg: 23, crossSectionMm2: 0.238, resistanceOhmPerKm: 72.5, currentCapacityAmpere: 0.95 },
  { diameterMm: 0.60, swg: 23, awg: 22, crossSectionMm2: 0.283, resistanceOhmPerKm: 60.9, currentCapacityAmpere: 1.13 },
  { diameterMm: 0.65, swg: 23, awg: 22, crossSectionMm2: 0.332, resistanceOhmPerKm: 51.9, currentCapacityAmpere: 1.33 },
  { diameterMm: 0.70, swg: 22, awg: 21, crossSectionMm2: 0.385, resistanceOhmPerKm: 44.7, currentCapacityAmpere: 1.54 },
  { diameterMm: 0.75, swg: 21, awg: 21, crossSectionMm2: 0.442, resistanceOhmPerKm: 39.0, currentCapacityAmpere: 1.77 },
  { diameterMm: 0.80, swg: 21, awg: 20, crossSectionMm2: 0.503, resistanceOhmPerKm: 34.3, currentCapacityAmpere: 2.01 },
  { diameterMm: 0.85, swg: 20, awg: 20, crossSectionMm2: 0.567, resistanceOhmPerKm: 30.4, currentCapacityAmpere: 2.27 },
  { diameterMm: 0.90, swg: 20, awg: 19, crossSectionMm2: 0.636, resistanceOhmPerKm: 27.1, currentCapacityAmpere: 2.54 },
  { diameterMm: 0.95, swg: 19, awg: 19, crossSectionMm2: 0.709, resistanceOhmPerKm: 24.3, currentCapacityAmpere: 2.84 },
  { diameterMm: 1.00, swg: 19, awg: 18, crossSectionMm2: 0.785, resistanceOhmPerKm: 22.0, currentCapacityAmpere: 3.14 },
  { diameterMm: 1.05, swg: 18, awg: 18, crossSectionMm2: 0.866, resistanceOhmPerKm: 19.9, currentCapacityAmpere: 3.46 },
  { diameterMm: 1.10, swg: 18, awg: 17, crossSectionMm2: 0.950, resistanceOhmPerKm: 18.1, currentCapacityAmpere: 3.80 },
  { diameterMm: 1.15, swg: 17, awg: 17, crossSectionMm2: 1.039, resistanceOhmPerKm: 16.6, currentCapacityAmpere: 4.16 },
  { diameterMm: 1.20, swg: 17, awg: 16, crossSectionMm2: 1.131, resistanceOhmPerKm: 15.2, currentCapacityAmpere: 4.52 },
  { diameterMm: 1.25, swg: 16, awg: 16, crossSectionMm2: 1.227, resistanceOhmPerKm: 14.0, currentCapacityAmpere: 4.91 },
  { diameterMm: 1.30, swg: 16, awg: 16, crossSectionMm2: 1.327, resistanceOhmPerKm: 13.0, currentCapacityAmpere: 5.31 },
  { diameterMm: 1.40, swg: 15, awg: 15, crossSectionMm2: 1.539, resistanceOhmPerKm: 11.2, currentCapacityAmpere: 6.16 },
  { diameterMm: 1.50, swg: 14, awg: 14, crossSectionMm2: 1.767, resistanceOhmPerKm: 9.75, currentCapacityAmpere: 7.07 },
  { diameterMm: 1.60, swg: 14, awg: 14, crossSectionMm2: 2.011, resistanceOhmPerKm: 8.57, currentCapacityAmpere: 8.04 },
  { diameterMm: 1.70, swg: 13, awg: 13, crossSectionMm2: 2.270, resistanceOhmPerKm: 7.59, currentCapacityAmpere: 9.08 },
  { diameterMm: 1.80, swg: 13, awg: 13, crossSectionMm2: 2.545, resistanceOhmPerKm: 6.77, currentCapacityAmpere: 10.18 },
  { diameterMm: 1.90, swg: 12, awg: 12, crossSectionMm2: 2.835, resistanceOhmPerKm: 6.08, currentCapacityAmpere: 11.34 },
  { diameterMm: 2.00, swg: 12, awg: 12, crossSectionMm2: 3.142, resistanceOhmPerKm: 5.49, currentCapacityAmpere: 12.57 },
  { diameterMm: 2.10, swg: 11, awg: 11, crossSectionMm2: 3.464, resistanceOhmPerKm: 4.98, currentCapacityAmpere: 13.86 },
  { diameterMm: 2.20, swg: 11, awg: 11, crossSectionMm2: 3.801, resistanceOhmPerKm: 4.54, currentCapacityAmpere: 15.20 },
];

/**
 * Format number to Indonesian Rupiah currency format
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date string to Indonesian formatted date
 */
export function formatIndoDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Convert Horsepower (HP) to Kilowatt (kW)
 */
export function hpToKw(hp: number): number {
  return Number((hp * 0.7457).toFixed(2));
}

/**
 * Convert Kilowatt (kW) to Horsepower (HP)
 */
export function kwToHp(kw: number): number {
  return Number((kw / 0.7457).toFixed(2));
}

/**
 * Calculate 3-Phase Full Load Amperes (FLA)
 * Formula: I = (P_kW * 1000) / (sqrt(3) * V * cosPhi * efficiency)
 */
export function calculateThreePhaseFLA(
  powerKw: number,
  voltage: number = 380,
  cosPhi: number = 0.85,
  efficiency: number = 0.88
): number {
  if (!powerKw || powerKw <= 0) return 0;
  const denominator = Math.sqrt(3) * voltage * cosPhi * efficiency;
  const current = (powerKw * 1000) / denominator;
  return Number(current.toFixed(2));
}

/**
 * Estimate No-Load Amperes (typically 30% - 38% of FLA for induction motors)
 */
export function estimateNoLoadCurrent(flaAmpere: number): { min: number; max: number; avg: number } {
  const min = Number((flaAmpere * 0.28).toFixed(2));
  const max = Number((flaAmpere * 0.38).toFixed(2));
  const avg = Number(((min + max) / 2).toFixed(2));
  return { min, max, avg };
}

/**
 * Calculate synchronous RPM and pole count
 * RPM = (120 * frequency) / poles
 */
export function calculateSyncRpm(poles: number, frequencyHz: number = 50): number {
  if (poles <= 0) return 0;
  return (120 * frequencyHz) / poles;
}

/**
 * Calculate equivalent parallel wires for a given single wire diameter.
 * E.g., if required single wire is 1.20mm, what is diameter if rewound with 2 parallel wires?
 */
export function calculateParallelEquivalent(
  originalDiameterMm: number,
  originalParallelCount: number = 1,
  targetParallelCount: number = 2
): {
  singleAreaMm2: number;
  totalAreaMm2: number;
  requiredDiameterMm: number;
  closestStandardWire?: WireGaugeReference;
} {
  const singleArea = (Math.PI * Math.pow(originalDiameterMm, 2)) / 4;
  const totalArea = singleArea * originalParallelCount;
  const newSingleArea = totalArea / targetParallelCount;
  const requiredDiameter = Math.sqrt((4 * newSingleArea) / Math.PI);

  // Find closest standard wire in gauge table
  let closest: WireGaugeReference = WIRE_GAUGE_TABLE[0];
  let minDiff = 999;
  for (const wire of WIRE_GAUGE_TABLE) {
    const diff = Math.abs(wire.diameterMm - requiredDiameter);
    if (diff < minDiff) {
      minDiff = diff;
      closest = wire;
    }
  }

  return {
    singleAreaMm2: Number(singleArea.toFixed(4)),
    totalAreaMm2: Number(totalArea.toFixed(4)),
    requiredDiameterMm: Number(requiredDiameter.toFixed(3)),
    closestStandardWire: closest,
  };
}

/**
 * Estimate Copper Wire Weight (kg) for 3-Phase Induction Stator Rewinding
 * Parameters:
 * - slotsCount (e.g. 36)
 * - turnsPerSlot (e.g. 30)
 * - wireDiameterMm (e.g. 1.05)
 * - parallelCount (e.g. 2)
 * - coreLengthMm (e.g. 150 mm)
 * - statorInnerDiaMm (e.g. 120 mm)
 */
export function estimateStatorCopperWeight(
  slotsCount: number,
  turnsPerSlot: number,
  wireDiameterMm: number,
  parallelCount: number,
  polesCount: number,
  coreLengthMm: number = 150,
  statorInnerDiaMm: number = 130
): {
  copperWeightKg: number;
  totalConductors: number;
  meanTurnLengthMeter: number;
} {
  // Pole pitch in mm (circumference / poles)
  const polePitchMm = (Math.PI * statorInnerDiaMm) / Math.max(polesCount, 2);
  // Average length of single turn: 2 * coreLength + 2.5 * end turn overhang
  const meanTurnLengthMm = 2 * coreLengthMm + 2.4 * polePitchMm;
  const meanTurnLengthMeter = meanTurnLengthMm / 1000;

  // Single wire cross section in cm²
  const wireRadiusCm = wireDiameterMm / 20; // mm to cm
  const wireAreaCm2 = Math.PI * Math.pow(wireRadiusCm, 2);

  // Total length of wire in cm
  // For double layer or full stator coils:
  const totalTurnsAllSlots = (slotsCount * turnsPerSlot) / 2; // Each coil side shares slot
  const totalLengthCm = totalTurnsAllSlots * (meanTurnLengthMm / 10) * parallelCount;

  // Volume in cm³
  const volumeCm3 = totalLengthCm * wireAreaCm2;
  // Copper density = 8.89 g/cm³ = 0.00889 kg/cm³
  const weightKg = volumeCm3 * 0.00889 * 1.08; // 8% allowance for leads and jumpers

  return {
    copperWeightKg: Number(weightKg.toFixed(2)),
    totalConductors: slotsCount * turnsPerSlot * parallelCount,
    meanTurnLengthMeter: Number(meanTurnLengthMeter.toFixed(2)),
  };
}

/**
 * Check Megger Tahanan Isolasi (MΩ) standard condition based on IEEE 43
 */
export function evaluateInsulationResistance(meggerMOhm: number): {
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DANGEROUS';
  label: string;
  badgeClass: string;
} {
  if (meggerMOhm >= 100) {
    return {
      status: 'EXCELLENT',
      label: 'Sangat Baik (>100 MΩ)',
      badgeClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    };
  } else if (meggerMOhm >= 20) {
    return {
      status: 'GOOD',
      label: 'Baik / Memenuhi Standar (20-100 MΩ)',
      badgeClass: 'text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400',
    };
  } else if (meggerMOhm >= 5) {
    return {
      status: 'FAIR',
      label: 'Batas Minimal (5-20 MΩ) - Wajib Pantau',
      badgeClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    };
  } else {
    return {
      status: 'DANGEROUS',
      label: 'Kritis / Bocor Ke Bodi (< 5 MΩ)',
      badgeClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
    };
  }
}
