import React, { useMemo, useState, useEffect, useRef } from 'react';
import { WorkOrder, InventoryItem, OrderStatus, WorkshopSettings } from '../types/rewinding';
import { formatRupiah, formatIndoDate, getOrderFinancialSummary } from '../utils/rewindingMath';
import { useToast } from '../context/ToastContext';
import { 
  Zap, 
  Wrench, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  Activity, 
  Calculator, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCheck,
  Wallet,
  CircleDollarSign,
  Clock3,
  Layers,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Sparkles,
  Calendar,
  Target,
  Timer,
  Gauge,
  Package,
  ShoppingCart,
  BellRing,
  UserCheck,
  CalendarClock,
  X,
  SlidersHorizontal,
  Receipt,
  Landmark
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';

interface DashboardOverviewProps {
  orders: WorkOrder[];
  inventory: InventoryItem[];
  isAdmin?: boolean;
  monthlySpkTarget?: number;
  perTechMonthlyTarget?: number;
  onSaveTargetSettings?: (settings: WorkshopSettings) => Promise<void> | void;
  onSelectOrder: (order: WorkOrder) => void;
  onNavigateTab: (tab: 'orders' | 'calculator' | 'qc' | 'inventory') => void;
  onOpenNewOrder: () => void;
}

interface MonthlyDataPoint {
  monthKey: string;
  month: string;
  fullMonth: string;
  revenue: number;
  units: number;
  paidAmount: number;
  growthRatePercent: number;
  cumulativeRevenue: number;
  seasonalNote: string;
  ticketSizeAvg: number;
  orders: { spkNumber: string; brand: string; powerHp: number; grandTotal: number }[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  orders,
  inventory,
  isAdmin = false,
  monthlySpkTarget = 6,
  perTechMonthlyTarget = 2,
  onSaveTargetSettings,
  onSelectOrder,
  onNavigateTab,
  onOpenNewOrder,
}) => {
  const toast = useToast();
  const hasNotifiedDeadlinesRef = useRef(false);

  const [showStatusBreakdown, setShowStatusBreakdown] = useState(false);
  const [showInvoicedTaxDetails, setShowInvoicedTaxDetails] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [forecastMonths, setForecastMonths] = useState<1 | 2 | 3>(2);
  const [deadlineThresholdDays, setDeadlineThresholdDays] = useState<1 | 3 | 5 | 7>(5);
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState<string>('all');
  const [isDeadlineBannerDismissed, setIsDeadlineBannerDismissed] = useState(false);
  const [selectedPerfMonth, setSelectedPerfMonth] = useState<string>('all');
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [draftTeamTarget, setDraftTeamTarget] = useState<number>(monthlySpkTarget);
  const [draftPerTechTarget, setDraftPerTechTarget] = useState<number>(perTechMonthlyTarget);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [profitStatusFilter, setProfitStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [profitSortBy, setProfitSortBy] = useState<'profit_desc' | 'margin_desc' | 'margin_asc' | 'revenue_desc'>('profit_desc');
  const [customCopperPricePerKg, setCustomCopperPricePerKg] = useState<number | null>(null);

  useEffect(() => {
    setDraftTeamTarget(monthlySpkTarget);
    setDraftPerTechTarget(perTechMonthlyTarget);
  }, [monthlySpkTarget, perTechMonthlyTarget]);

  // Metric counts
  const totalActive = orders.filter(
    (o) => o.status !== 'Diserahkan / Faktur'
  ).length;

  const inRewindingOrOven = orders.filter(
    (o) => o.status === 'Proses Rewinding' || o.status === 'Varnish & Oven'
  ).length;

  const readyForPickup = orders.filter(
    (o) => o.status === 'Selesai & Siap Diambil' || o.status === 'QC & Pengetesan'
  ).length;

  const urgentOrders = orders.filter(
    (o) => (o.priority === 'Urgent / Lembur' || o.priority === 'Penting') && o.status !== 'Diserahkan / Faktur'
  );

  const lowStockItems = inventory.filter((item) => item.currentStock <= item.minStockAlert);

  const totalRevenue = orders.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // --- REVENUE STATUS METRICS: TOTAL PAID VS TOTAL PENDING BY ORDER STATUS ---
  const revenueMetrics = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;

    const statusBreakdown: Record<OrderStatus, { count: number; totalInvoiced: number; paid: number; pending: number }> = {
      'Diterima': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'Bongkar & Inspeksi': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'Proses Rewinding': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'Varnish & Oven': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'Assembling': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'QC & Pengetesan': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'Selesai & Siap Diambil': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
      'Diserahkan / Faktur': { count: 0, totalInvoiced: 0, paid: 0, pending: 0 },
    };

    orders.forEach((o) => {
      const paid = o.paymentStatus === 'Lunas' ? o.grandTotal : o.downPayment;
      const pending = o.balanceDue;

      totalPaid += paid;
      totalPending += pending;

      if (statusBreakdown[o.status]) {
        statusBreakdown[o.status].count += 1;
        statusBreakdown[o.status].totalInvoiced += o.grandTotal;
        statusBreakdown[o.status].paid += paid;
        statusBreakdown[o.status].pending += pending;
      }
    });

    const totalContract = totalPaid + totalPending;
    const paidPercent = totalContract > 0 ? (totalPaid / totalContract) * 100 : 0;
    const pendingPercent = totalContract > 0 ? (totalPending / totalContract) * 100 : 0;

    // Categorized by completed vs active pipeline
    const completedPaid = statusBreakdown['Selesai & Siap Diambil'].paid + statusBreakdown['Diserahkan / Faktur'].paid;
    const completedPending = statusBreakdown['Selesai & Siap Diambil'].pending + statusBreakdown['Diserahkan / Faktur'].pending;
    
    const inProgressPaid = totalPaid - completedPaid;
    const inProgressPending = totalPending - completedPending;

    return {
      totalPaid,
      totalPending,
      totalContract,
      paidPercent: Number(paidPercent.toFixed(1)),
      pendingPercent: Number(pendingPercent.toFixed(1)),
      completedPaid,
      completedPending,
      inProgressPaid,
      inProgressPending,
      statusBreakdown,
    };
  }, [orders]);

  // --- ACCUMULATED PPN & PPH FINANCIAL SUMMARY FOR 'Diserahkan / Faktur' SPKs ---
  const invoicedTaxMetrics = useMemo(() => {
    const invoicedOrders = orders.filter((o) => o.status === 'Diserahkan / Faktur');

    let totalDpp = 0;
    let totalPpn = 0;
    let totalPph = 0;
    let totalBruto = 0;
    let totalNetPayable = 0;
    let totalBalanceDue = 0;
    let withFakturPajakCount = 0;
    let withPpnCount = 0;
    let withPphCount = 0;

    const rows = invoicedOrders
      .map((order) => {
        const fin = getOrderFinancialSummary(order);
        totalDpp += fin.dpp;
        totalPpn += fin.taxPpnAmount;
        totalPph += fin.taxPphAmount;
        totalBruto += fin.grandTotal;
        totalNetPayable += fin.netPayableTotal;
        totalBalanceDue += fin.balanceDue;

        if (fin.fakturPajakNumber) withFakturPajakCount += 1;
        if (fin.taxPpnAmount > 0) withPpnCount += 1;
        if (fin.taxPphAmount > 0) withPphCount += 1;

        return {
          order,
          fin,
        };
      })
      .sort((a, b) => (b.fin.invoiceDate || '').localeCompare(a.fin.invoiceDate || ''));

    const effectivePpnRate = totalDpp > 0 ? Number(((totalPpn / totalDpp) * 100).toFixed(2)) : 0;
    const effectivePphRate = totalDpp > 0 ? Number(((totalPph / totalDpp) * 100).toFixed(2)) : 0;
    const netTaxRemittanceEstimate = totalPpn - totalPph;

    return {
      count: invoicedOrders.length,
      totalDpp,
      totalPpn,
      totalPph,
      totalBruto,
      totalNetPayable,
      totalBalanceDue,
      withFakturPajakCount,
      withPpnCount,
      withPphCount,
      effectivePpnRate,
      effectivePphRate,
      netTaxRemittanceEstimate,
      rows,
    };
  }, [orders]);

  // Helper to determine whether an order is 'Pending' or 'In Progress'
  const isPendingStatus = (status: string): boolean => {
    const s = (status || '').toLowerCase().trim();
    return s === 'pending' || s === 'diterima' || s.includes('pending') || s.includes('antrean');
  };

  const isInProgressStatus = (status: string): boolean => {
    const s = (status || '').toLowerCase().trim();
    return (
      s === 'in progress' ||
      s.includes('progress') ||
      status === 'Bongkar & Inspeksi' ||
      status === 'Proses Rewinding' ||
      status === 'Varnish & Oven' ||
      status === 'Assembling' ||
      status === 'QC & Pengetesan'
    );
  };

  // --- PROJECTED REVENUE FOR THE CURRENT MONTH ---
  // Calculated by summing the total cost of all orders with a status of 'In Progress' or 'Pending'
  const projectedRevenueData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);

    const qualifyingOrders = orders.filter((o) => {
      // Must match 'In Progress' or 'Pending'
      const matchStatus = isPendingStatus(o.status) || isInProgressStatus(o.status);
      if (!matchStatus) return false;

      // Filter for current month: check targetCompletionDate or entryDate
      const orderDate = o.targetCompletionDate || o.entryDate || '';
      if (!orderDate) return true;
      const orderMonth = orderDate.slice(0, 7);
      return orderMonth === currentMonthKey || orderMonth <= currentMonthKey;
    });

    const totalProjected = qualifyingOrders.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

    const pendingOrders = qualifyingOrders.filter((o) => isPendingStatus(o.status));
    const inProgressOrders = qualifyingOrders.filter((o) => isInProgressStatus(o.status));

    const pendingAmount = pendingOrders.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
    const inProgressAmount = inProgressOrders.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

    return {
      currentMonthLabel,
      currentMonthKey,
      totalProjected,
      qualifyingCount: qualifyingOrders.length,
      pendingCount: pendingOrders.length,
      pendingAmount,
      inProgressCount: inProgressOrders.length,
      inProgressAmount,
      orders: qualifyingOrders,
    };
  }, [orders]);

  // Status counts for pipeline
  const statusPipeline = [
    { label: 'Diterima', count: orders.filter((o) => o.status === 'Diterima').length },
    { label: 'Bongkar & Inspeksi', count: orders.filter((o) => o.status === 'Bongkar & Inspeksi').length },
    { label: 'Rewinding', count: orders.filter((o) => o.status === 'Proses Rewinding').length },
    { label: 'Oven & Varnish', count: orders.filter((o) => o.status === 'Varnish & Oven').length },
    { label: 'QC & Test', count: orders.filter((o) => o.status === 'QC & Pengetesan').length },
    { label: 'Siap Diambil', count: orders.filter((o) => o.status === 'Selesai & Siap Diambil').length },
  ];

  // --- RECHARTS MONTHLY REVENUE & GROWTH TREND OVER LAST 6 MONTHS ---
  const monthlyRevenueData = useMemo(() => {
    // Standard baseline months for 2026 (last 6 months)
    const monthsBaseline: { key: string; short: string; full: string }[] = [
      { key: '2026-06', short: 'Jun \'26', full: 'Juni 2026' },
      { key: '2026-07', short: 'Jul \'26', full: 'Juli 2026' },
      { key: '2026-08', short: 'Ags \'26', full: 'Agustus 2026' },
      { key: '2026-09', short: 'Sep \'26', full: 'September 2026' },
      { key: '2026-10', short: 'Okt \'26', full: 'Oktober 2026' },
      { key: '2026-11', short: 'Nov \'26', full: 'November 2026' },
    ];

    const map = new Map<string, {
      monthKey: string;
      month: string;
      fullMonth: string;
      revenue: number;
      units: number;
      paidAmount: number;
      orders: { spkNumber: string; brand: string; powerHp: number; grandTotal: number }[];
    }>();

    monthsBaseline.forEach((m) => {
      map.set(m.key, {
        monthKey: m.key,
        month: m.short,
        fullMonth: m.full,
        revenue: 0,
        units: 0,
        paidAmount: 0,
        orders: [],
      });
    });

    // Completed orders: either 'Selesai & Siap Diambil' or 'Diserahkan / Faktur'
    const completedOrders = orders.filter(
      (o) => o.status === 'Selesai & Siap Diambil' || o.status === 'Diserahkan / Faktur'
    );

    completedOrders.forEach((o) => {
      const dateStr = o.actualCompletionDate || o.targetCompletionDate || o.entryDate;
      const monthKey = dateStr.slice(0, 7); // 'YYYY-MM'

      if (!map.has(monthKey)) {
        const dateObj = new Date(dateStr);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const fullMonthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const mIdx = isNaN(dateObj.getTime()) ? 0 : dateObj.getMonth();
        const yStr = isNaN(dateObj.getTime()) ? '' : String(dateObj.getFullYear()).slice(2);
        const yFull = isNaN(dateObj.getTime()) ? '' : String(dateObj.getFullYear());

        map.set(monthKey, {
          monthKey,
          month: `${monthNames[mIdx]} '${yStr}`,
          fullMonth: `${fullMonthNames[mIdx]} ${yFull}`,
          revenue: 0,
          units: 0,
          paidAmount: 0,
          orders: [],
        });
      }

      const point = map.get(monthKey)!;
      point.revenue += o.grandTotal;
      point.paidAmount += o.paymentStatus === 'Lunas' ? o.grandTotal : o.downPayment;
      point.units += 1;
      point.orders.push({
        spkNumber: o.spkNumber,
        brand: o.brand,
        powerHp: o.powerHp,
        grandTotal: o.grandTotal,
      });
    });

    // Sort chronologically
    const sorted = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Seasonal industrial workshop context mapping
    const seasonalNotesMap: Record<string, string> = {
      '2026-06': 'Awal Semester / Periode Maintenance Rutin PDAM & Semen',
      '2026-07': 'Overhaul Pertengahan Tahun Trafo Distribusi & Pompa Booster',
      '2026-08': 'Peningkatan Utilisasi Motor Blower Pabrik Tekstil & Manufaktur',
      '2026-09': 'Musim Panen Sawit / Overhaul Generator Alternator Genset',
      '2026-10': 'Peak Season / Beban Puncak Overhaul Semen & Motor Slip Ring',
      '2026-11': 'Musim Penghujan / Peningkatan Servis Pompa Submersible Celup',
    };

    let runningCumulative = 0;
    return sorted.map((pt, idx, arr): MonthlyDataPoint => {
      const prev = idx > 0 ? arr[idx - 1] : null;
      let growthRatePercent = 0;
      if (prev && prev.revenue > 0) {
        growthRatePercent = Number((((pt.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1));
      }

      runningCumulative += pt.revenue;
      const seasonalNote = seasonalNotesMap[pt.monthKey] || (pt.revenue >= 15000000 ? 'Periode Utilisasi Tinggi' : 'Periode Pemeliharaan Normal');
      const ticketSizeAvg = pt.units > 0 ? Math.round(pt.revenue / pt.units) : 0;

      return {
        ...pt,
        growthRatePercent,
        cumulativeRevenue: runningCumulative,
        seasonalNote,
        ticketSizeAvg,
      };
    });
  }, [orders]);

  // Aggregate statistics for completed invoices
  const totalCompletedRevenue = useMemo(() => {
    return monthlyRevenueData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [monthlyRevenueData]);

  const totalCompletedUnits = useMemo(() => {
    return monthlyRevenueData.reduce((acc, curr) => acc + curr.units, 0);
  }, [monthlyRevenueData]);

  const peakMonth = useMemo(() => {
    if (monthlyRevenueData.length === 0) return null;
    return [...monthlyRevenueData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [monthlyRevenueData]);

  const averageMonthlyRevenue = useMemo(() => {
    const activeMonths = monthlyRevenueData.filter((m) => m.revenue > 0).length || 1;
    return totalCompletedRevenue / activeMonths;
  }, [monthlyRevenueData, totalCompletedRevenue]);

  // Average MoM growth rate calculation
  const averageMoMGrowth = useMemo(() => {
    const monthsWithGrowth = monthlyRevenueData.slice(1).filter((m) => m.growthRatePercent !== 0);
    if (monthsWithGrowth.length === 0) return 0;
    const sum = monthsWithGrowth.reduce((acc, curr) => acc + curr.growthRatePercent, 0);
    return Number((sum / monthsWithGrowth.length).toFixed(1));
  }, [monthlyRevenueData]);

  // --- AVERAGE TURNAROUND TIME OVER THE LAST 30 DAYS FOR COMPLETED ORDERS ---
  const turnaroundMetrics = useMemo(() => {
    const now = new Date();
    // 30 days window from current time
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Completed orders: status 'Selesai & Siap Diambil' or 'Diserahkan / Faktur'
    const completedOrders = orders.filter((o) => {
      const isCompleted = o.status === 'Selesai & Siap Diambil' || o.status === 'Diserahkan / Faktur';
      if (!isCompleted) return false;

      const completionStr = o.actualCompletionDate || o.targetCompletionDate || o.entryDate;
      if (!completionStr) return false;

      const compDate = new Date(completionStr);
      if (isNaN(compDate.getTime())) return false;

      // Check if completion date is within the last 30 days
      return compDate >= thirtyDaysAgo && compDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    });

    // Fallback: If no completed order in strict 30-day window, use most recent completed orders
    const effectiveOrders = completedOrders.length > 0 ? completedOrders : orders.filter(
      (o) => o.status === 'Selesai & Siap Diambil' || o.status === 'Diserahkan / Faktur'
    );

    if (effectiveOrders.length === 0) {
      return {
        averageDays: 0,
        completedCount: 0,
        fastestDays: 0,
        longestDays: 0,
        onTimeRatePercent: 100,
        ordersList: [],
      };
    }

    let totalDays = 0;
    let fastest = Infinity;
    let longest = 0;
    let onTimeCount = 0;

    const list = effectiveOrders.map((o) => {
      const entry = new Date(o.entryDate);
      const completionStr = o.actualCompletionDate || o.targetCompletionDate || o.entryDate;
      const completion = new Date(completionStr);

      let diffDays = Math.round((completion.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
      if (isNaN(diffDays) || diffDays < 1) diffDays = 1;

      totalDays += diffDays;
      if (diffDays < fastest) fastest = diffDays;
      if (diffDays > longest) longest = diffDays;

      let onTime = true;
      if (o.targetCompletionDate) {
        const target = new Date(o.targetCompletionDate);
        onTime = completion.getTime() <= target.getTime();
      }
      if (onTime) onTimeCount += 1;

      return {
        id: o.id,
        spkNumber: o.spkNumber,
        customerCompany: o.customerCompany,
        machineName: `${o.brand} (${o.powerHp} HP)`,
        entryDate: o.entryDate,
        completionDate: completionStr,
        turnaroundDays: diffDays,
        onTime,
      };
    });

    const averageDays = Number((totalDays / effectiveOrders.length).toFixed(1));
    const onTimeRatePercent = Math.round((onTimeCount / effectiveOrders.length) * 100);

    return {
      averageDays,
      completedCount: effectiveOrders.length,
      fastestDays: fastest === Infinity ? 0 : fastest,
      longestDays: longest,
      onTimeRatePercent,
      ordersList: list.sort((a, b) => b.completionDate.localeCompare(a.completionDate)),
    };
  }, [orders]);

  // --- COPPER WIRE USAGE ANALYSIS & FUTURE STOCK ESTIMATION ---
  const copperAnalytics = useMemo(() => {
    const copperInventory = inventory.filter((item) => item.category === 'Kawat Tembaga');
    const preRewindStatuses: OrderStatus[] = ['Diterima', 'Bongkar & Inspeksi', 'Proses Rewinding'];

    let totalCopperKg = 0;
    let activeWipCopperKg = 0;
    let consumedCopperKg = 0;

    const monthMap = new Map<
      string,
      { monthKey: string; month: string; fullMonth: string; totalKg: number; spkCount: number }
    >();

    const wireMap = new Map<
      number,
      {
        wireSizeMm: number;
        totalKg: number;
        orderCount: number;
        pendingDemandKg: number;
        insulationClasses: Set<string>;
      }
    >();

    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthFullNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    orders.forEach((o) => {
      const kg = Number(o.windingData?.copperWeightKg || 0);
      const wireMm = Number(o.windingData?.wireSizeMm || 0);
      if (kg <= 0 && wireMm <= 0) return;

      totalCopperKg += kg;
      const isPendingRewind = preRewindStatuses.includes(o.status);
      if (isPendingRewind) {
        activeWipCopperKg += kg;
      } else {
        consumedCopperKg += kg;
      }

      // Monthly bucket based on entryDate (when order entered workshop)
      const dateStr = o.entryDate || o.actualCompletionDate || o.targetCompletionDate || '';
      if (dateStr.length >= 7) {
        const monthKey = dateStr.slice(0, 7);
        if (!monthMap.has(monthKey)) {
          const d = new Date(dateStr);
          const mIdx = isNaN(d.getTime()) ? 0 : d.getMonth();
          const yShort = isNaN(d.getTime()) ? '' : String(d.getFullYear()).slice(2);
          const yFull = isNaN(d.getTime()) ? '' : String(d.getFullYear());
          monthMap.set(monthKey, {
            monthKey,
            month: `${monthShortNames[mIdx]} '${yShort}`,
            fullMonth: `${monthFullNames[mIdx]} ${yFull}`,
            totalKg: 0,
            spkCount: 0,
          });
        }
        const mBucket = monthMap.get(monthKey)!;
        mBucket.totalKg = Number((mBucket.totalKg + kg).toFixed(1));
        mBucket.spkCount += 1;
      }

      // Wire diameter grouping
      if (wireMm > 0) {
        const normalizedMm = Number(wireMm.toFixed(2));
        if (!wireMap.has(normalizedMm)) {
          wireMap.set(normalizedMm, {
            wireSizeMm: normalizedMm,
            totalKg: 0,
            orderCount: 0,
            pendingDemandKg: 0,
            insulationClasses: new Set<string>(),
          });
        }
        const wBucket = wireMap.get(normalizedMm)!;
        wBucket.totalKg = Number((wBucket.totalKg + kg).toFixed(1));
        wBucket.orderCount += 1;
        if (isPendingRewind) {
          wBucket.pendingDemandKg = Number((wBucket.pendingDemandKg + kg).toFixed(1));
        }
        if (o.windingData?.insulationClass) {
          wBucket.insulationClasses.add(o.windingData.insulationClass);
        }
      }
    });

    const monthlyUsage = Array.from(monthMap.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((m) => ({
        ...m,
        avgKgPerUnit: m.spkCount > 0 ? Number((m.totalKg / m.spkCount).toFixed(1)) : 0,
      }));

    const distinctMonthsCount = Math.max(1, monthlyUsage.length);
    const avgMonthlyKg = Number((totalCopperKg / distinctMonthsCount).toFixed(1));
    const avgKgPerSpk = orders.length > 0 ? Number((totalCopperKg / orders.length).toFixed(1)) : 0;

    // Default copper unit price fallback from inventory average
    const avgCopperUnitCost =
      copperInventory.length > 0
        ? Math.round(copperInventory.reduce((acc, i) => acc + i.unitCost, 0) / copperInventory.length)
        : 162000;

    const wireSizes = Array.from(wireMap.values())
      .map((w) => {
        const sizeFixed = w.wireSizeMm.toFixed(2);
        const sizeCodeDigits = sizeFixed.replace('.', '');
        const matchedInv = copperInventory.find(
          (inv) =>
            inv.name.includes(sizeFixed) ||
            inv.name.includes(String(w.wireSizeMm)) ||
            inv.code.includes(sizeCodeDigits)
        );

        const monthlyBurnKg = Number((w.totalKg / distinctMonthsCount).toFixed(1));
        const dailyBurnKg = monthlyBurnKg / 30;
        const currentStockKg = matchedInv ? matchedInv.currentStock : null;
        const minStockAlertKg = matchedInv ? matchedInv.minStockAlert : Math.max(10, Math.ceil(monthlyBurnKg * 0.5));
        const unitCost = matchedInv ? matchedInv.unitCost : avgCopperUnitCost;

        const targetBufferKg = monthlyBurnKg * forecastMonths + minStockAlertKg + w.pendingDemandKg;
        const recommendedRestockKg =
          currentStockKg !== null
            ? Math.max(0, Math.ceil(targetBufferKg - currentStockKg))
            : Math.ceil(targetBufferKg);

        const effectiveAvailableKg = currentStockKg !== null ? Math.max(0, currentStockKg - w.pendingDemandKg) : 0;
        const daysOfSupply =
          currentStockKg === null
            ? 0
            : dailyBurnKg > 0
              ? Math.round(effectiveAvailableKg / dailyBurnKg)
              : 999;

        let stockHealth: 'kritis' | 'waspada' | 'aman' | 'untracked' = 'untracked';
        if (currentStockKg !== null) {
          if (currentStockKg <= minStockAlertKg || daysOfSupply <= 14) {
            stockHealth = 'kritis';
          } else if (daysOfSupply <= 35 || recommendedRestockKg > 0) {
            stockHealth = 'waspada';
          } else {
            stockHealth = 'aman';
          }
        }

        return {
          wireSizeMm: w.wireSizeMm,
          label: `Ø ${sizeFixed} mm`,
          totalKg: w.totalKg,
          orderCount: w.orderCount,
          avgPerOrderKg: Number((w.totalKg / w.orderCount).toFixed(1)),
          monthlyBurnKg,
          pendingDemandKg: w.pendingDemandKg,
          inventoryItem: matchedInv || null,
          currentStockKg,
          minStockAlertKg,
          daysOfSupply,
          recommendedRestockKg,
          estimatedRestockCost: recommendedRestockKg * unitCost,
          unitCost,
          stockHealth,
        };
      })
      .sort((a, b) => b.totalKg - a.totalKg);

    const topWireSize = wireSizes.length > 0 ? wireSizes[0] : null;
    const totalRecommendedRestockKg = wireSizes.reduce((acc, w) => acc + w.recommendedRestockKg, 0);
    const totalEstimatedRestockCost = wireSizes.reduce((acc, w) => acc + w.estimatedRestockCost, 0);
    const criticalWireCount = wireSizes.filter((w) => w.stockHealth === 'kritis' || w.stockHealth === 'untracked').length;
    const totalCurrentCopperStockKg = Number(
      copperInventory.reduce((acc, item) => acc + item.currentStock, 0).toFixed(1)
    );

    return {
      totalCopperKg: Number(totalCopperKg.toFixed(1)),
      activeWipCopperKg: Number(activeWipCopperKg.toFixed(1)),
      consumedCopperKg: Number(consumedCopperKg.toFixed(1)),
      distinctMonthsCount,
      avgMonthlyKg,
      avgKgPerSpk,
      monthlyUsage,
      wireSizes,
      topWireSize,
      totalRecommendedRestockKg,
      totalEstimatedRestockCost,
      criticalWireCount,
      totalCurrentCopperStockKg,
    };
  }, [orders, inventory, forecastMonths]);

  // --- AUTOMATIC DEADLINE REMINDER SYSTEM FOR APPROACHING TARGET DATES ---
  const deadlineReminders = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const priorityRank: Record<WorkOrder['priority'], number> = {
      'Urgent / Lembur': 0,
      'Penting': 1,
      'Biasa': 2,
    };

    const parseLocalDate = (dateStr: string): number | null => {
      if (!dateStr) return null;
      const parts = dateStr.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    };

    const activeUnfinished = orders.filter(
      (o) => o.status !== 'Selesai & Siap Diambil' && o.status !== 'Diserahkan / Faktur'
    );

    const evaluated = activeUnfinished
      .map((order) => {
        const targetMs = parseLocalDate(order.targetCompletionDate);
        if (targetMs === null) return null;
        const daysRemaining = Math.round((targetMs - todayMidnight) / (1000 * 60 * 60 * 24));

        let urgencyLevel: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' = 'normal';
        let urgencyLabel = `H-${daysRemaining}`;
        if (daysRemaining < 0) {
          urgencyLevel = 'overdue';
          urgencyLabel = `Lewat ${Math.abs(daysRemaining)} Hari`;
        } else if (daysRemaining === 0) {
          urgencyLevel = 'today';
          urgencyLabel = 'Jatuh Tempo Hari Ini';
        } else if (daysRemaining === 1) {
          urgencyLevel = 'tomorrow';
          urgencyLabel = 'Besok (H-1)';
        } else if (daysRemaining <= deadlineThresholdDays) {
          urgencyLevel = 'soon';
          urgencyLabel = `${daysRemaining} Hari Lagi (H-${daysRemaining})`;
        }

        return {
          order,
          daysRemaining,
          urgencyLevel,
          urgencyLabel,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
        return priorityRank[a.order.priority] - priorityRank[b.order.priority];
      });

    const approachingItems = evaluated.filter((item) => item.daysRemaining <= deadlineThresholdDays);
    const criticalItems = evaluated.filter((item) => item.daysRemaining <= 1);
    const overdueCount = evaluated.filter((item) => item.daysRemaining < 0).length;
    const dueTodayCount = evaluated.filter((item) => item.daysRemaining === 0).length;
    const dueTomorrowCount = evaluated.filter((item) => item.daysRemaining === 1).length;

    const technicianNames = Array.from(
      new Set(
        approachingItems
          .map((item) => item.order.technicianName)
          .filter(Boolean)
      )
    );

    const filteredByTech =
      selectedTechnicianFilter === 'all'
        ? approachingItems
        : approachingItems.filter((item) =>
            item.order.technicianName.toLowerCase().includes(selectedTechnicianFilter.toLowerCase())
          );

    return {
      approachingItems,
      filteredItems: filteredByTech,
      criticalItems,
      overdueCount,
      dueTodayCount,
      dueTomorrowCount,
      technicianNames,
    };
  }, [orders, deadlineThresholdDays, selectedTechnicianFilter]);

  // Automatic warning toast once on dashboard load if critical deadlines (overdue / H-0 / H-1) exist
  useEffect(() => {
    if (hasNotifiedDeadlinesRef.current) return;
    if (deadlineReminders.criticalItems.length > 0) {
      hasNotifiedDeadlinesRef.current = true;
      const parts: string[] = [];
      if (deadlineReminders.overdueCount > 0) {
        parts.push(`${deadlineReminders.overdueCount} SPK lewat tenggat`);
      }
      if (deadlineReminders.dueTodayCount > 0) {
        parts.push(`${deadlineReminders.dueTodayCount} SPK jatuh tempo hari ini`);
      }
      if (deadlineReminders.dueTomorrowCount > 0) {
        parts.push(`${deadlineReminders.dueTomorrowCount} SPK jatuh tempo besok`);
      }
      toast.warning(
        `${parts.join(', ')}. Harap segera prioritaskan pengerjaan teknisi.`,
        'Pengingat Tenggat Waktu SPK',
        5500
      );
    }
  }, [deadlineReminders, toast]);

  // --- MONTHLY TECHNICIAN PERFORMANCE SUMMARY (COMPLETED SPKs PER TECHNICIAN PER MONTH) ---
  const technicianPerformance = useMemo(() => {
    const completedStatuses: OrderStatus[] = ['Selesai & Siap Diambil', 'Diserahkan / Faktur'];
    const completedOrders = orders.filter((o) => completedStatuses.includes(o.status));

    const monthKeySet = new Set<string>();
    const monthLabelMap = new Map<string, { short: string; full: string }>();

    const formatMonthMeta = (ym: string) => {
      const [yStr, mStr] = ym.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      if (!y || !m) return { short: ym, full: ym };
      const d = new Date(y, m - 1, 1);
      const short = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(d);
      const full = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
      return { short, full };
    };

    completedOrders.forEach((o) => {
      const rawDate = o.actualCompletionDate || o.targetCompletionDate || o.entryDate || '';
      const ym = rawDate.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) {
        monthKeySet.add(ym);
        if (!monthLabelMap.has(ym)) {
          monthLabelMap.set(ym, formatMonthMeta(ym));
        }
      }
    });

    // Sorted chronological ascending for matrix columns (latest 6 months if many)
    const months = Array.from(monthKeySet)
      .sort((a, b) => a.localeCompare(b))
      .slice(-6)
      .map((key) => ({
        key,
        short: monthLabelMap.get(key)?.short || key,
        full: monthLabelMap.get(key)?.full || key,
      }));

    interface TechPerfAccumulator {
      technicianName: string;
      monthlyCounts: Record<string, number>;
      monthlyRevenue: Record<string, number>;
      totalCompleted: number;
      activeCount: number;
      totalHp: number;
      totalCopperKg: number;
      totalRevenue: number;
      selectedMonthCount: number;
      selectedMonthHp: number;
      selectedMonthRevenue: number;
      latestCompletedDate: string;
    }

    const techMap = new Map<string, TechPerfAccumulator>();

    const ensureTech = (name: string): TechPerfAccumulator => {
      const cleanName = (name || 'Belum Ditugaskan').trim() || 'Belum Ditugaskan';
      if (!techMap.has(cleanName)) {
        techMap.set(cleanName, {
          technicianName: cleanName,
          monthlyCounts: {},
          monthlyRevenue: {},
          totalCompleted: 0,
          activeCount: 0,
          totalHp: 0,
          totalCopperKg: 0,
          totalRevenue: 0,
          selectedMonthCount: 0,
          selectedMonthHp: 0,
          selectedMonthRevenue: 0,
          latestCompletedDate: '',
        });
      }
      return techMap.get(cleanName)!;
    };

    orders.forEach((o) => {
      const acc = ensureTech(o.technicianName);
      const isCompleted = completedStatuses.includes(o.status);

      if (!isCompleted) {
        acc.activeCount += 1;
        return;
      }

      const rawDate = o.actualCompletionDate || o.targetCompletionDate || o.entryDate || '';
      const ym = rawDate.slice(0, 7);

      acc.totalCompleted += 1;
      acc.totalHp += o.powerHp || 0;
      acc.totalCopperKg += o.windingData?.copperWeightKg || 0;
      acc.totalRevenue += o.grandTotal || 0;

      if (/^\d{4}-\d{2}$/.test(ym)) {
        acc.monthlyCounts[ym] = (acc.monthlyCounts[ym] || 0) + 1;
        acc.monthlyRevenue[ym] = (acc.monthlyRevenue[ym] || 0) + (o.grandTotal || 0);
      }

      if (rawDate && (!acc.latestCompletedDate || rawDate > acc.latestCompletedDate)) {
        acc.latestCompletedDate = rawDate;
      }

      if (selectedPerfMonth === 'all' || ym === selectedPerfMonth) {
        acc.selectedMonthCount += 1;
        acc.selectedMonthHp += o.powerHp || 0;
        acc.selectedMonthRevenue += o.grandTotal || 0;
      }
    });

    const rows = Array.from(techMap.values()).sort((a, b) => {
      if (b.selectedMonthCount !== a.selectedMonthCount) {
        return b.selectedMonthCount - a.selectedMonthCount;
      }
      if (b.totalCompleted !== a.totalCompleted) {
        return b.totalCompleted - a.totalCompleted;
      }
      return b.activeCount - a.activeCount;
    });

    const totalCompletedInFilter = rows.reduce((sum, r) => sum + r.selectedMonthCount, 0);
    const totalHpInFilter = rows.reduce((sum, r) => sum + r.selectedMonthHp, 0);
    const maxCountInFilter = Math.max(1, ...rows.map((r) => r.selectedMonthCount));
    const topPerformer = rows.find((r) => r.selectedMonthCount > 0) || null;

    // Monthly chart comparison against monthlySpkTarget
    const monthlyTeamSeries = months.map((m) => {
      const completed = rows.reduce((sum, r) => sum + (r.monthlyCounts[m.key] || 0), 0);
      const achievementPercent = monthlySpkTarget > 0 ? Math.round((completed / monthlySpkTarget) * 100) : 0;
      return {
        monthKey: m.key,
        month: m.short,
        fullMonth: m.full,
        completed,
        target: monthlySpkTarget,
        gap: completed - monthlySpkTarget,
        achievementPercent,
        isTargetMet: completed >= monthlySpkTarget,
      };
    });

    const latestMonthKey = months.length > 0 ? months[months.length - 1].key : '';
    const focusedMonthKey = selectedPerfMonth === 'all' ? latestMonthKey : selectedPerfMonth;
    const focusedMonthSeries = monthlyTeamSeries.find((s) => s.monthKey === focusedMonthKey) || null;
    const monthsCountBasis = Math.max(1, months.length);
    const activePeriodTarget =
      selectedPerfMonth === 'all' ? monthlySpkTarget * monthsCountBasis : monthlySpkTarget;
    const activePeriodAchievementPercent =
      activePeriodTarget > 0 ? Math.round((totalCompletedInFilter / activePeriodTarget) * 100) : 0;
    const activePerTechTarget =
      selectedPerfMonth === 'all' ? perTechMonthlyTarget * monthsCountBasis : perTechMonthlyTarget;

    return {
      months,
      rows,
      totalCompletedAll: completedOrders.length,
      totalCompletedInFilter,
      totalHpInFilter,
      maxCountInFilter,
      topPerformer,
      monthlyTeamSeries,
      focusedMonthSeries,
      activePeriodTarget,
      activePeriodAchievementPercent,
      activePerTechTarget,
      monthsHitTargetCount: monthlyTeamSeries.filter((s) => s.isTargetMet).length,
    };
  }, [orders, selectedPerfMonth, monthlySpkTarget, perTechMonthlyTarget]);

  // --- PER-SPK PROFITABILITY ANALYSIS (ESTIMATED SERVICE PRICE VS COPPER MATERIAL USAGE) ---
  const spkProfitability = useMemo(() => {
    const completedStatuses: OrderStatus[] = ['Selesai & Siap Diambil', 'Diserahkan / Faktur'];
    const copperInventory = inventory.filter((item) => item.category === 'Kawat Tembaga');
    const avgInventoryCopperUnitCost =
      copperInventory.length > 0
        ? Math.round(copperInventory.reduce((acc, item) => acc + item.unitCost, 0) / copperInventory.length)
        : 162000;

    const filteredOrders = orders.filter((o) => {
      const isCompleted = completedStatuses.includes(o.status);
      if (profitStatusFilter === 'completed') return isCompleted;
      if (profitStatusFilter === 'active') return !isCompleted;
      return true;
    });

    const rows = filteredOrders.map((order) => {
      const estimatedServicePrice = Number(order.grandTotal || 0);
      const copperWeightKg = Number(order.windingData?.copperWeightKg || 0);
      const wireSizeMm = Number(order.windingData?.wireSizeMm || 0);

      const sizeFixed = wireSizeMm > 0 ? wireSizeMm.toFixed(2) : '';
      const sizeCodeDigits = sizeFixed.replace('.', '');
      const matchedCopperInv =
        wireSizeMm > 0
          ? copperInventory.find(
              (inv) =>
                inv.name.includes(sizeFixed) ||
                inv.name.includes(String(wireSizeMm)) ||
                inv.code.includes(sizeCodeDigits)
            )
          : undefined;

      const effectiveCopperUnitCost =
        customCopperPricePerKg !== null && customCopperPricePerKg > 0
          ? customCopperPricePerKg
          : matchedCopperInv
            ? matchedCopperInv.unitCost
            : avgInventoryCopperUnitCost;

      const copperMaterialCost = Math.round(copperWeightKg * effectiveCopperUnitCost);
      const profitAmount = estimatedServicePrice - copperMaterialCost;
      const marginPercent =
        estimatedServicePrice > 0
          ? Number(((profitAmount / estimatedServicePrice) * 100).toFixed(1))
          : 0;
      const copperSharePercent =
        estimatedServicePrice > 0
          ? Number(((copperMaterialCost / estimatedServicePrice) * 100).toFixed(1))
          : 0;
      const profitPerKg = copperWeightKg > 0 ? Math.round(profitAmount / copperWeightKg) : 0;

      // Billed copper item reference if present on SPK service items
      const billedCopperTotal = (order.serviceItems || [])
        .filter((item) => {
          const desc = (item.description || '').toLowerCase();
          return desc.includes('kawat') || desc.includes('tembaga');
        })
        .reduce((sum, item) => sum + (item.total || 0), 0);

      const shortSpkLabel = order.spkNumber.replace('SPK-MJT-2026-', '#').replace('SPK-MJT-', '#');

      return {
        order,
        shortSpkLabel,
        estimatedServicePrice,
        copperWeightKg,
        wireSizeMm,
        copperUnitCost: effectiveCopperUnitCost,
        copperSourceLabel:
          customCopperPricePerKg !== null && customCopperPricePerKg > 0
            ? 'Simulasi Harga'
            : matchedCopperInv
              ? matchedCopperInv.code
              : 'Rata-rata Gudang',
        copperMaterialCost,
        profitAmount,
        marginPercent,
        copperSharePercent,
        profitPerKg,
        billedCopperTotal,
        isCompleted: completedStatuses.includes(order.status),
      };
    });

    const sortedRows = [...rows].sort((a, b) => {
      if (profitSortBy === 'profit_desc') return b.profitAmount - a.profitAmount;
      if (profitSortBy === 'margin_desc') return b.marginPercent - a.marginPercent;
      if (profitSortBy === 'margin_asc') return a.marginPercent - b.marginPercent;
      return b.estimatedServicePrice - a.estimatedServicePrice;
    });

    const totalEstimatedRevenue = sortedRows.reduce((acc, r) => acc + r.estimatedServicePrice, 0);
    const totalCopperMaterialCost = sortedRows.reduce((acc, r) => acc + r.copperMaterialCost, 0);
    const totalProfit = totalEstimatedRevenue - totalCopperMaterialCost;
    const totalCopperKg = Number(
      sortedRows.reduce((acc, r) => acc + r.copperWeightKg, 0).toFixed(1)
    );
    const overallMarginPercent =
      totalEstimatedRevenue > 0
        ? Number(((totalProfit / totalEstimatedRevenue) * 100).toFixed(1))
        : 0;
    const avgProfitPerSpk =
      sortedRows.length > 0 ? Math.round(totalProfit / sortedRows.length) : 0;
    const lowMarginCount = sortedRows.filter((r) => r.marginPercent < 45).length;

    const mostProfitable =
      rows.length > 0
        ? [...rows].sort((a, b) => b.profitAmount - a.profitAmount)[0]
        : null;
    const highestMargin =
      rows.length > 0
        ? [...rows].sort((a, b) => b.marginPercent - a.marginPercent)[0]
        : null;

    const chartData = sortedRows.slice(0, 10).map((r) => ({
      shortSpk: r.shortSpkLabel,
      spkNumber: r.order.spkNumber,
      customerCompany: r.order.customerCompany,
      machineLabel: `${r.order.brand} (${r.order.powerHp} HP)`,
      estimatedServicePrice: r.estimatedServicePrice,
      copperMaterialCost: r.copperMaterialCost,
      profitAmount: Math.max(0, r.profitAmount),
      rawProfitAmount: r.profitAmount,
      marginPercent: r.marginPercent,
      copperWeightKg: r.copperWeightKg,
      copperUnitCost: r.copperUnitCost,
    }));

    return {
      rows: sortedRows,
      chartData,
      avgInventoryCopperUnitCost,
      totalEstimatedRevenue,
      totalCopperMaterialCost,
      totalProfit,
      totalCopperKg,
      overallMarginPercent,
      avgProfitPerSpk,
      lowMarginCount,
      mostProfitable,
      highestMargin,
    };
  }, [orders, inventory, profitStatusFilter, profitSortBy, customCopperPricePerKg]);

  const handleSaveTargetForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTeam = Math.max(1, Math.min(500, Math.round(Number(draftTeamTarget) || 1)));
    const cleanTech = Math.max(1, Math.min(200, Math.round(Number(draftPerTechTarget) || 1)));
    setIsSavingTarget(true);
    try {
      await onSaveTargetSettings?.({
        monthlySpkTarget: cleanTeam,
        perTechMonthlyTarget: cleanTech,
      });
      setIsEditingTarget(false);
    } finally {
      setIsSavingTarget(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workshop Banner / Quick Headline */}
      <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-1">
            <Zap className="w-4 h-4" />
            <span>Pusat Operasional Bengkel Rewinding</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Monitoring Pengerjaan Motor & Trafo
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Presisi isolasi Class H 200°C, pengetesan Megger 1000V DC & running test vibrasi seimbang.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigateTab('calculator')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Kalkulator Kawat</span>
          </button>
          <button
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Terima Unit Baru (SPK)</span>
          </button>
        </div>
      </div>

      {/* Automatic Critical Deadline Reminder Banner */}
      {deadlineReminders.criticalItems.length > 0 && !isDeadlineBannerDismissed && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                  Pengingat Otomatis Tenggat Waktu SPK
                </span>
                <span className="text-[11px] font-bold text-rose-700 font-mono">
                  {deadlineReminders.overdueCount > 0 ? `${deadlineReminders.overdueCount} Terlambat · ` : ''}
                  {deadlineReminders.dueTodayCount} Jatuh Tempo Hari Ini · {deadlineReminders.dueTomorrowCount} Besok
                </span>
              </div>
              <p className="text-xs text-amber-900">
                Unit berikut wajib diprioritaskan teknisi hari ini agar pengiriman ke pelanggan tepat waktu:
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {deadlineReminders.criticalItems.map(({ order, urgencyLabel, daysRemaining }) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      daysRemaining <= 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                        : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-300'
                    }`}
                  >
                    <span className="font-mono font-bold">{order.spkNumber}</span>
                    <span>({order.technicianName})</span>
                    <span className="opacity-90">· {urgencyLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDeadlineBannerDismissed(true)}
            className="self-end lg:self-center p-1.5 text-amber-700 hover:text-amber-950 hover:bg-amber-200/60 rounded-lg transition-colors shrink-0"
            title="Sembunyikan banner peringatan sesi ini"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Active Units */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2 font-medium">
            <span>Unit Aktif di Bengkel</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {totalActive}
            </span>
            <span className="text-xs text-slate-500 font-medium">unit mesin</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Dalam pengerjaan</span>
            <span className="font-semibold text-slate-700 tabular-nums">{inRewindingOrOven} unit</span>
          </div>
        </div>

        {/* Rewinding & Oven */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2 font-medium">
            <span>Proses Gulung & Oven</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600 tabular-nums">
              {inRewindingOrOven}
            </span>
            <span className="text-xs text-slate-500 font-medium">sedang berjalan</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Oven Class H 135°C</span>
            <span className="font-semibold text-amber-700">Aktif</span>
          </div>
        </div>

        {/* Projected Revenue Card (Current Month) */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2 font-medium">
            <span className="font-semibold text-blue-900 flex items-center gap-1.5">
              <span>Projected Revenue</span>
            </span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-blue-700 tabular-nums">
              {formatRupiah(projectedRevenueData.totalProjected)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="truncate">{projectedRevenueData.currentMonthLabel}</span>
            <span className="font-semibold text-blue-800 tabular-nums shrink-0">
              {projectedRevenueData.qualifyingCount} unit (WIP/Pending)
            </span>
          </div>
        </div>

        {/* Total Paid Revenue Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2 font-medium">
            <span>Total Paid Revenue</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">
              {formatRupiah(revenueMetrics.totalPaid)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Kas Masuk Terbayar</span>
            <span className="font-semibold text-emerald-700 tabular-nums">{revenueMetrics.paidPercent}%</span>
          </div>
        </div>

        {/* Total Pending Revenue Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2 font-medium">
            <span>Total Pending Revenue</span>
            <Clock3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-amber-600 tabular-nums">
              {formatRupiah(revenueMetrics.totalPending)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Belum Lunas / WIP</span>
            <span className="font-semibold text-amber-700 tabular-nums">{revenueMetrics.pendingPercent}%</span>
          </div>
        </div>
      </div>

      {/* AUTOMATIC DEADLINE REMINDER & TECHNICIAN PRIORITY QUEUE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Antrean Pengingat Tenggat Waktu SPK & Prioritas Teknisi
              </h2>
              <span className="text-xs font-mono font-bold text-rose-700">
                ({deadlineReminders.filteredItems.length} unit)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deteksi otomatis SPK aktif yang belum selesai dan mendekati tanggal target penyelesaian
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Technician Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedTechnicianFilter}
                onChange={(e) => setSelectedTechnicianFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
                aria-label="Filter Teknisi"
              >
                <option value="all">Semua Teknisi</option>
                {['Mustofa', 'Agus', 'Slamet', 'Joko'].map((tech) => (
                  <option key={tech} value={tech}>
                    Teknisi: {tech}
                  </option>
                ))}
              </select>
            </div>

            {/* Horizon Selector */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
              {([1, 3, 5, 7] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDeadlineThresholdDays(days)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    deadlineThresholdDays === days
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ≤ {days} Hr
                </button>
              ))}
            </div>
          </div>
        </div>

        {deadlineReminders.filteredItems.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-800">
              Tidak ada SPK yang mendekati tenggat waktu dalam {deadlineThresholdDays} hari ke depan
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedTechnicianFilter !== 'all'
                ? `Belum ada jadwal mendesak untuk teknisi "${selectedTechnicianFilter}".`
                : 'Semua target pengerjaan bengkel dalam kondisi aman terkendali.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {deadlineReminders.filteredItems.map(({ order, daysRemaining, urgencyLevel, urgencyLabel }) => {
              const isCritical = urgencyLevel === 'overdue' || urgencyLevel === 'today';
              const isTomorrow = urgencyLevel === 'tomorrow';

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isCritical
                      ? 'bg-rose-50/40 hover:bg-rose-50/80'
                      : isTomorrow
                        ? 'bg-amber-50/30 hover:bg-amber-50/70'
                        : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Left Urgency Indicator */}
                    <div
                      className={`w-1.5 self-stretch rounded-full shrink-0 ${
                        isCritical
                          ? 'bg-rose-600'
                          : isTomorrow
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                      }`}
                    />

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                            isCritical
                              ? 'bg-rose-600 text-white'
                              : isTomorrow
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-sky-100 text-sky-900'
                          }`}
                        >
                          {urgencyLabel}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {order.spkNumber}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-slate-700 truncate">
                          {order.customerCompany}
                        </span>
                        {order.priority !== 'Biasa' && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] font-bold text-rose-700">
                              {order.priority}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-slate-900">
                        {order.brand} {order.powerHp} HP ({order.powerKw} kW) — {order.machineType}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          Tahap Saat Ini: <strong className="text-slate-900">{order.status}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>PIC Teknisi: <strong className="text-slate-900">{order.technicianName}</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 pl-4 md:pl-0">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Target Selesai
                      </div>
                      <div className={`text-xs font-mono font-bold tabular-nums ${isCritical ? 'text-rose-700' : 'text-slate-800'}`}>
                        {formatIndoDate(order.targetCompletionDate)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <span>Buka SPK</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEDICATED REVENUE SUMMARY CARD: TOTAL PAID VS TOTAL PENDING BY ORDER STATUSES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Ringkasan Realisasi & Proyeksi Pendapatan
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis perbandingan kas masuk terbayar, piutang tertunda, dan estimasi pendapatan terproyeksi bulan ini
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Nilai Kontrak SPK</span>
              <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatRupiah(revenueMetrics.totalContract)}
              </span>
            </div>
            <button
              onClick={() => setShowStatusBreakdown(!showStatusBreakdown)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <span>Detail Tahapan</span>
              {showStatusBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tri-Primary Panels: Total Paid, Total Pending, and Projected Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Panel 1: Total Paid Revenue */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Total Paid Revenue (Terbayar)</span>
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded font-mono tabular-nums">
                {revenueMetrics.paidPercent}% Realisasi
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">
                {formatRupiah(revenueMetrics.totalPaid)}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Total pembayaran lunas dan uang muka (DP) yang telah diterima bengkel
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-500 block">Unit Selesai & Diserahkan</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRupiah(revenueMetrics.completedPaid)}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-500 block">Uang Muka (DP) Unit Aktif</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRupiah(revenueMetrics.inProgressPaid)}
                </span>
              </div>
            </div>
          </div>

          {/* Panel 2: Total Pending Revenue */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Total Pending Revenue (Tertunda)</span>
              </span>
              <span className="text-xs font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded font-mono tabular-nums">
                {revenueMetrics.pendingPercent}% Belum Masuk
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 tabular-nums">
                {formatRupiah(revenueMetrics.totalPending)}
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Sisa tagihan siap ditagihkan dan nilai pekerjaan yang sedang berjalan (WIP)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                <span className="text-[10px] text-slate-500 block">Piutang Unit Siap Diambil</span>
                <span className="font-mono font-bold text-rose-600 tabular-nums">
                  {formatRupiah(revenueMetrics.completedPending)}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                <span className="text-[10px] text-slate-500 block">Sisa Kontrak Unit Berjalan</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRupiah(revenueMetrics.inProgressPending)}
                </span>
              </div>
            </div>
          </div>

          {/* Panel 3: Projected Revenue for Current Month */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3 md:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Projected Revenue ({projectedRevenueData.currentMonthLabel})</span>
              </span>
              <span className="text-xs font-semibold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded font-mono tabular-nums">
                {projectedRevenueData.qualifyingCount} SPK Aktif
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-700 tabular-nums">
                {formatRupiah(projectedRevenueData.totalProjected)}
              </div>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Total estimasi biaya pesanan berstatus 'In Progress' dan 'Pending' bulan ini
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-500 block">In Progress ({projectedRevenueData.inProgressCount} unit)</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRupiah(projectedRevenueData.inProgressAmount)}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                <span className="text-[10px] text-slate-500 block">Pending / Antrean ({projectedRevenueData.pendingCount} unit)</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRupiah(projectedRevenueData.pendingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Proportional Realization Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
              <span>Terbayar: <strong className="text-slate-900">{formatRupiah(revenueMetrics.totalPaid)}</strong> ({revenueMetrics.paidPercent}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
              <span>Tertunda: <strong className="text-slate-900">{formatRupiah(revenueMetrics.totalPending)}</strong> ({revenueMetrics.pendingPercent}%)</span>
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${revenueMetrics.paidPercent}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Terbayar: ${revenueMetrics.paidPercent}%`}
            ></div>
            <div
              style={{ width: `${revenueMetrics.pendingPercent}%` }}
              className="bg-amber-500 h-full transition-all duration-300"
              title={`Tertunda: ${revenueMetrics.pendingPercent}%`}
            ></div>
          </div>
        </div>

        {/* Expandable Breakdown by Order Status */}
        {showStatusBreakdown && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Rincian Nilai Kontrak, Terbayar, dan Tertunda per Status SPK</span>
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold"
              >
                Buka Semua SPK →
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Status SPK</th>
                    <th className="py-2 px-2 text-center w-16">Unit</th>
                    <th className="py-2 px-3 text-right">Total Kontrak</th>
                    <th className="py-2 px-3 text-right">Terbayar (Paid)</th>
                    <th className="py-2 px-3 text-right">Tertunda (Pending)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {(Object.keys(revenueMetrics.statusBreakdown) as OrderStatus[]).map((st) => {
                      const row = revenueMetrics.statusBreakdown[st];
                      if (row.count === 0 && row.totalInvoiced === 0) return null;

                      const isPending = isPendingStatus(st);
                      const isInProgress = isInProgressStatus(st);

                      return (
                        <tr key={st} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-sans font-medium text-slate-900 flex items-center">
                            <span>{st}</span>
                            {isPending && (
                              <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                Pending
                              </span>
                            )}
                            {isInProgress && (
                              <span className="ml-2 text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                In Progress
                              </span>
                            )}
                            {!isPending && !isInProgress && (
                              <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-sans text-slate-700 tabular-nums">
                            {row.count} unit
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                            {formatRupiah(row.totalInvoiced)}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-semibold tabular-nums">
                            {formatRupiah(row.paid)}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-700 font-semibold tabular-nums">
                            {formatRupiah(row.pending)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-blue-50/60 border-t border-blue-200/80 font-sans text-[11px] font-semibold text-blue-950">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <span>Projected Revenue Bulan Ini ({projectedRevenueData.currentMonthLabel}):</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 text-xs tabular-nums">
                        {formatRupiah(projectedRevenueData.totalProjected)}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-right text-[10px] text-blue-800 font-normal">
                        Total {projectedRevenueData.qualifyingCount} unit (In Progress + Pending)
                      </td>
                    </tr>
                  </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ACCUMULATED PPN & PPH FINANCIAL SUMMARY FOR 'Diserahkan / Faktur' ORDERS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Ringkasan Keuangan Pajak (PPN &amp; PPh) — SPK Diserahkan / Faktur
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 tabular-nums">
                {invoicedTaxMetrics.count} SPK Difakturkan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Akumulasi Dasar Pengenaan Pajak (DPP), PPN Keluaran, Potongan PPh, dan Tagihan Net dari seluruh SPK berstatus{' '}
              <strong className="text-slate-700">&apos;Diserahkan / Faktur&apos;</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                Seri Faktur Pajak Terisi
              </span>
              <span className="text-xs font-bold font-mono text-slate-800 tabular-nums">
                {invoicedTaxMetrics.withFakturPajakCount} / {invoicedTaxMetrics.count} SPK
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowInvoicedTaxDetails((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <span>Rincian Faktur</span>
              {showInvoicedTaxDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {invoicedTaxMetrics.count === 0 ? (
          <div className="py-7 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            <Receipt className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-800">
              Belum ada SPK berstatus &apos;Diserahkan / Faktur&apos;
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Akumulasi total PPN dan PPh akan tampil otomatis saat ada SPK yang sudah diserahkan &amp; difakturkan.
            </p>
          </div>
        ) : (
          <>
            {/* 4-Card Tax & Invoice Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {/* Total PPN Akumulasi */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>Total PPN Terakumulasi</span>
                  </span>
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 tabular-nums">
                    Eff. {invoicedTaxMetrics.effectivePpnRate}%
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-700 tabular-nums">
                  {formatRupiah(invoicedTaxMetrics.totalPpn)}
                </div>
                <div className="text-[11px] text-indigo-900/80 flex items-center justify-between border-t border-indigo-200/60 pt-2">
                  <span>SPK Kena PPN</span>
                  <span className="font-mono font-bold tabular-nums">
                    {invoicedTaxMetrics.withPpnCount} dari {invoicedTaxMetrics.count} SPK
                  </span>
                </div>
              </div>

              {/* Total PPh Akumulasi */}
              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Total PPh Terakumulasi</span>
                  </span>
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 tabular-nums">
                    Eff. {invoicedTaxMetrics.effectivePphRate}%
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-rose-700 tabular-nums">
                  {formatRupiah(invoicedTaxMetrics.totalPph)}
                </div>
                <div className="text-[11px] text-rose-900/80 flex items-center justify-between border-t border-rose-200/60 pt-2">
                  <span>SPK Potong PPh</span>
                  <span className="font-mono font-bold tabular-nums">
                    {invoicedTaxMetrics.withPphCount} dari {invoicedTaxMetrics.count} SPK
                  </span>
                </div>
              </div>

              {/* Total DPP & Bruto Faktur */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Total DPP (Dasar Pajak)</span>
                  </span>
                  <span className="font-mono font-semibold text-[11px] text-slate-500">
                    Sebelum Pajak
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
                  {formatRupiah(invoicedTaxMetrics.totalDpp)}
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <span>Bruto (DPP + PPN)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {formatRupiah(invoicedTaxMetrics.totalBruto)}
                  </span>
                </div>
              </div>

              {/* Total Tagihan Net Diterima */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CircleDollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Total Tagihan Net</span>
                  </span>
                  <span className="font-mono font-semibold text-[11px] text-emerald-700">
                    Bruto - PPh
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 tabular-nums">
                  {formatRupiah(invoicedTaxMetrics.totalNetPayable)}
                </div>
                <div className="text-[11px] text-emerald-900/80 flex items-center justify-between border-t border-emerald-200/60 pt-2">
                  <span>Sisa Piutang Faktur</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      invoicedTaxMetrics.totalBalanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(invoicedTaxMetrics.totalBalanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                <span>
                  PPN Keluaran:{' '}
                  <strong className="font-mono text-indigo-700">
                    {formatRupiah(invoicedTaxMetrics.totalPpn)}
                  </strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  PPh Dipotong Pelanggan:{' '}
                  <strong className="font-mono text-rose-700">
                    {formatRupiah(invoicedTaxMetrics.totalPph)}
                  </strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Selisih Pajak (PPN - PPh):{' '}
                  <strong className="font-mono text-slate-900">
                    {formatRupiah(invoicedTaxMetrics.netTaxRemittanceEstimate)}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 shrink-0 text-left sm:text-right"
              >
                Kelola Invois &amp; Faktur Pajak →
              </button>
            </div>

            {/* Expandable Per-SPK Tax Breakdown */}
            {showInvoicedTaxDetails && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Rincian Pajak per SPK Berstatus &apos;Diserahkan / Faktur&apos;</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Klik baris untuk membuka detail invois &amp; faktur pajak SPK
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="py-2 px-3">SPK &amp; Pelanggan</th>
                        <th className="py-2 px-3">Invois &amp; Faktur Pajak</th>
                        <th className="py-2 px-3 text-right">DPP</th>
                        <th className="py-2 px-3 text-right">PPN</th>
                        <th className="py-2 px-3 text-right">PPh</th>
                        <th className="py-2 px-3 text-right">Tagihan Net</th>
                        <th className="py-2 px-3 text-center">Status Bayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {invoicedTaxMetrics.rows.map(({ order, fin }) => (
                        <tr
                          key={order.id}
                          onClick={() => onSelectOrder(order)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-slate-900">{order.spkNumber}</div>
                            <div className="text-slate-600 font-medium truncate max-w-[190px]">
                              {order.customerCompany}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="font-semibold text-slate-800">{fin.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-500">
                              FP: {fin.fakturPajakNumber || 'Belum diisi'} · {formatIndoDate(fin.invoiceDate)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 tabular-nums">
                            {formatRupiah(fin.dpp)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <div className="font-semibold text-indigo-700">
                              {formatRupiah(fin.taxPpnAmount)}
                            </div>
                            <div className="text-[10px] text-slate-400">({fin.taxPpnPercent}%)</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <div className="font-semibold text-rose-700">
                              {fin.taxPphAmount > 0 ? `-${formatRupiah(fin.taxPphAmount)}` : formatRupiah(0)}
                            </div>
                            <div className="text-[10px] text-slate-400">({fin.taxPphPercent}%)</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatRupiah(fin.netPayableTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-semibold text-[10px] ${
                                order.paymentStatus === 'Lunas'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.paymentStatus === 'DP / Sebagian'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-mono font-bold text-[11px] text-slate-900">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 font-sans">
                          Total Akumulasi ({invoicedTaxMetrics.count} SPK Diserahkan / Faktur)
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {formatRupiah(invoicedTaxMetrics.totalDpp)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-indigo-700 tabular-nums">
                          {formatRupiah(invoicedTaxMetrics.totalPpn)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-700 tabular-nums">
                          -{formatRupiah(invoicedTaxMetrics.totalPph)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 tabular-nums">
                          {formatRupiah(invoicedTaxMetrics.totalNetPayable)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans text-[10px] text-slate-500 font-normal">
                          Sisa: {formatRupiah(invoicedTaxMetrics.totalBalanceDue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Visual Workflow Pipeline */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Alur Tahapan Pekerjaan (Live Pipeline)
            </h2>
            <p className="text-xs text-slate-500">
              Distribusi unit mesin di bengkel CV. Mustofa Jaya Teknik
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Buka Papan SPK</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusPipeline.map((stage, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-mono text-[11px] text-slate-400">0{idx + 1}</span>
                <span className="font-semibold text-slate-800 text-sm tabular-nums">
                  {stage.count} unit
                </span>
              </div>
              <span className="text-xs font-medium text-slate-700 line-clamp-1">
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* WIDGET: AVERAGE TURNAROUND TIME OVER THE LAST 30 DAYS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Average Turnaround Time (Waktu Siklus Pengerjaan)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Rata-rata durasi pengerjaan pesanan selesai dari unit tiba di bengkel hingga selesai uji QC dan penyerahan faktur
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200/80 rounded-lg text-xs font-semibold text-indigo-900">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>30 Hari Terakhir</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({turnaroundMetrics.completedCount} unit selesai)
            </span>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Main Average TAT Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-xl border border-indigo-200/90 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                Rata-rata Turnaround
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-indigo-700 tabular-nums">
                  {turnaroundMetrics.averageDays}
                </span>
                <span className="text-sm font-bold text-indigo-900">Hari</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-indigo-200/70 text-[11px] text-indigo-900 flex items-center justify-between">
              <span>Target Standar Bengkel:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono text-[10px]">
                ≤ 10 Hari (Optimal)
              </span>
            </div>
          </div>

          {/* Sub Metric 1: On-Time Delivery */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
              <span>Ketepatan Waktu (On-Time)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {turnaroundMetrics.onTimeRatePercent}%
              </span>
              <span className="text-xs text-slate-500">sesuai target</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 flex items-center justify-between">
              <span>Tepat Waktu SPK:</span>
              <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                {turnaroundMetrics.completedCount} / {turnaroundMetrics.completedCount} Unit
              </span>
            </div>
          </div>

          {/* Sub Metric 2: Fastest Turnaround */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
              <span>Pengerjaan Tercepat</span>
              <Gauge className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
                {turnaroundMetrics.fastestDays}
              </span>
              <span className="text-xs text-slate-500">Hari</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 flex items-center justify-between">
              <span>Unit Presisi:</span>
              <span className="font-semibold text-slate-700">Motor 15–20 HP</span>
            </div>
          </div>

          {/* Sub Metric 3: Longest Overhaul */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
              <span>Pengerjaan Terlama</span>
              <Clock className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {turnaroundMetrics.longestDays}
              </span>
              <span className="text-xs text-slate-500">Hari</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 flex items-center justify-between">
              <span>Overhaul Berat:</span>
              <span className="font-semibold text-slate-700">Slip Ring 55 kW</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown of Completed Orders in Last 30 Days */}
        {turnaroundMetrics.ordersList.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Daftar Pesanan Selesai (Completed Orders 30 Hari Terakhir):</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Klik kartu pesanan untuk melihat detail teknis & riwayat inspeksi
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {turnaroundMetrics.ordersList.map((item) => {
                const fullOrder = orders.find((o) => o.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => fullOrder && onSelectOrder(fullOrder)}
                    className="p-3 bg-slate-50 hover:bg-slate-100/90 rounded-lg border border-slate-200 text-xs transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:border-indigo-200"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {item.spkNumber}
                        </span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded text-[11px] tabular-nums">
                          {item.turnaroundDays} Hari
                        </span>
                      </div>
                      <div className="text-slate-800 font-medium truncate">
                        {item.machineName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.customerCompany}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/70 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Masuk: <strong className="text-slate-700">{formatIndoDate(item.entryDate)}</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Selesai: {formatIndoDate(item.completionDate)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RECHARTS REVENUE TREND & SEASONAL PERFORMANCE (LAST 6 MONTHS) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
        {/* Chart Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              {chartType === 'line' ? (
                <LineChartIcon className="w-4 h-4 text-amber-600" />
              ) : (
                <BarChart3 className="w-4 h-4 text-amber-600" />
              )}
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Tren Pertumbuhan Pendapatan 6 Bulan Terakhir & Siklus Musiman
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi tren realisasi omset faktur selesai serta fluktuasi musiman overhaul industri CV. Mustofa Jaya Teknik
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View switcher: Line vs Bar */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  chartType === 'line'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Grafik Garis Tren (MoM)</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  chartType === 'bar'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                <span>Grafik Batang (Volume)</span>
              </button>
            </div>

            {/* Quick Metrics Badge */}
            <div className="hidden sm:flex items-center gap-3 text-xs pl-3 border-l border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total 6 Bulan</span>
                <span className="font-bold text-slate-900 font-mono tabular-nums">
                  {formatRupiah(totalCompletedRevenue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Rata-rata MoM</span>
                <span className={`font-bold font-mono tabular-nums flex items-center gap-0.5 ${averageMoMGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {averageMoMGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {averageMoMGrowth >= 0 ? `+${averageMoMGrowth}%` : `${averageMoMGrowth}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-72 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart
                data={monthlyRevenueData}
                margin={{ top: 16, right: 24, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={(value: number) => {
                    if (value === 0) return '0';
                    return `${(value / 1000000).toFixed(0)} Jt`;
                  }}
                />
                <ReferenceLine
                  y={averageMonthlyRevenue}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Rata-rata: ${(averageMonthlyRevenue / 1000000).toFixed(1)} Jt`,
                    fill: '#64748B',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyDataPoint;
                      const hasGrowth = data.growthRatePercent !== 0;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[240px] space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{data.fullMonth}</span>
                            </span>
                            <span className="text-slate-300 font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                              {data.units} unit selesai
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-slate-400">Realisasi Faktur:</span>
                              <span className="font-bold font-mono text-sm text-white tabular-nums">
                                {formatRupiah(data.revenue)}
                              </span>
                            </div>

                            <div className="flex justify-between items-baseline text-[11px]">
                              <span className="text-slate-400">Pertumbuhan MoM:</span>
                              {hasGrowth ? (
                                <span className={`font-mono font-bold tabular-nums flex items-center gap-0.5 ${data.growthRatePercent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {data.growthRatePercent > 0 ? `+${data.growthRatePercent}%` : `${data.growthRatePercent}%`}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono">Bulan Dasar</span>
                              )}
                            </div>

                            <div className="flex justify-between items-baseline text-[11px]">
                              <span className="text-slate-400">Kas Masuk:</span>
                              <span className="font-mono text-emerald-400 tabular-nums">
                                {formatRupiah(data.paidAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Seasonal Context Note */}
                          <div className="pt-1.5 border-t border-slate-800/80">
                            <span className="text-[10px] text-amber-300/90 font-medium block flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Siklus Musiman:</span>
                            </span>
                            <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                              {data.seasonalNote}
                            </p>
                          </div>

                          {data.orders.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                              <span className="font-medium text-slate-300 block">Daftar Unit Selesai:</span>
                              {data.orders.map((item, i) => (
                                <div key={i} className="flex justify-between text-slate-300 truncate">
                                  <span>{item.spkNumber} · {item.brand} ({item.powerHp} HP)</span>
                                  <span className="font-mono text-slate-400 ml-2">{formatRupiah(item.grandTotal)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#D97706"
                  strokeWidth={3}
                  dot={{ fill: '#D97706', r: 5, strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 7, stroke: '#B45309', strokeWidth: 2, fill: '#F59E0B' }}
                  name="Realisasi Faktur Selesai"
                />
              </LineChart>
            ) : (
              <BarChart
                data={monthlyRevenueData}
                margin={{ top: 16, right: 24, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={(value: number) => {
                    if (value === 0) return '0';
                    return `${(value / 1000000).toFixed(0)} Jt`;
                  }}
                />
                <ReferenceLine
                  y={averageMonthlyRevenue}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyDataPoint;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[220px] space-y-1.5">
                          <div className="font-bold text-amber-400 text-xs border-b border-slate-800 pb-1 flex items-center justify-between">
                            <span>{data.fullMonth}</span>
                            <span className="text-slate-300 font-mono">{data.units} unit</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-0.5">
                            <span className="text-slate-400">Total Faktur:</span>
                            <span className="font-bold font-mono text-sm text-white tabular-nums">
                              {formatRupiah(data.revenue)}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline text-[11px]">
                            <span className="text-slate-400">Kas Masuk:</span>
                            <span className="font-mono text-emerald-400 tabular-nums">
                              {formatRupiah(data.paidAmount)}
                            </span>
                          </div>
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-300">
                            <span className="text-amber-300 font-medium">{data.seasonalNote}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Nilai Faktur Selesai"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {monthlyRevenueData.map((entry, index) => {
                    const isPeak = peakMonth && entry.monthKey === peakMonth.monthKey && entry.revenue > 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPeak ? '#D97706' : '#F59E0B'}
                        className="transition-colors hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Seasonal Performance Intelligence Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Card 1: Seasonal Pattern Analysis */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Analisis Siklus Musiman Bengkel</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              Beban puncak bengkel terjadi pada <strong>Q3–Q4 (Ags–Okt)</strong> saat pabrik semen & kelapa sawit melakukan major shutdown maintenance, diikuti lonjakan pompa celup PDAM pada awal musim hujan (Nov).
            </p>
          </div>

          {/* Card 2: Peak Month Record */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-slate-700">Bulan Puncak (Peak Month)</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                Rekor Omset
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(peakMonth?.revenue || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>{peakMonth?.fullMonth || '-'}</span>
              <span className="font-semibold text-slate-700 font-mono">{peakMonth?.units || 0} unit motor</span>
            </div>
          </div>

          {/* Card 3: Ticket Size & MoM Momentum */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-slate-700">Rata-rata Kontrak per Unit</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                Presisi Class H
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
              {formatRupiah(totalCompletedUnits > 0 ? Math.round(totalCompletedRevenue / totalCompletedUnits) : 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>Pertumbuhan MoM:</span>
              <span className={`font-mono font-bold tabular-nums ${averageMoMGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {averageMoMGrowth >= 0 ? `+${averageMoMGrowth}%` : `${averageMoMGrowth}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Chart Legend & Explanation */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
              <span>Kurva Pertumbuhan Omset Faktur</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <span className="w-3 border-t-2 border-dashed border-slate-400 inline-block"></span>
              <span>Garis Rata-rata ({formatRupiah(averageMonthlyRevenue)})</span>
            </span>
          </div>

          <div className="text-slate-400">
            *Dihitung otomatis berdasarkan tanggal penyelesaian faktur SPK lulus uji Megger & Hi-Pot
          </div>
        </div>
      </div>

      {/* COPPER WIRE USAGE ANALYSIS & FUTURE STOCK ESTIMATION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Analisis Penggunaan Kawat Tembaga & Estimasi Stok Masa Depan
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kalkulasi konsumsi kawat email Class H (kg) dari riwayat SPK dibandingkan dengan stok gudang aktual untuk proyeksi restok
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
              {([1, 2, 3] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForecastMonths(m)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    forecastMonths === m
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Target {m} Bln
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <span>Kelola Gudang</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Total Pemakaian Riwayat SPK
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
              {copperAnalytics.totalCopperKg} <span className="text-sm font-semibold text-slate-500">kg</span>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
              <span>Rata-rata per SPK:</span>
              <span className="font-mono font-bold text-slate-700 tabular-nums">{copperAnalytics.avgKgPerSpk} kg</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Laju Konsumsi Bulanan (Burn Rate)
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-700 tabular-nums">
              {copperAnalytics.avgMonthlyKg} <span className="text-sm font-semibold text-amber-600">kg/bln</span>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
              <span>Kebutuhan Antrean WIP:</span>
              <span className="font-mono font-bold text-amber-700 tabular-nums">{copperAnalytics.activeWipCopperKg} kg</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Ukuran Paling Banyak Terpakai
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
              {copperAnalytics.topWireSize ? copperAnalytics.topWireSize.label : '-'}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
              <span>{copperAnalytics.topWireSize ? `${copperAnalytics.topWireSize.orderCount} SPK` : '0 SPK'}</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                {copperAnalytics.topWireSize ? `${copperAnalytics.topWireSize.totalKg} kg` : '0 kg'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 mb-1">
              <span>Estimasi Restok ({forecastMonths} Bln)</span>
              <ShoppingCart className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-800 tabular-nums">
              {copperAnalytics.totalRecommendedRestockKg} <span className="text-sm font-semibold">kg</span>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-amber-200/70 flex items-center justify-between text-[11px] text-amber-900">
              <span>Est. Anggaran:</span>
              <span className="font-mono font-bold tabular-nums">
                {formatRupiah(copperAnalytics.totalEstimatedRestockCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Chart & Diameter Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Monthly Copper Usage BarChart */}
          <div className="lg:col-span-5 bg-slate-50/60 rounded-xl border border-slate-200/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Konsumsi Kawat Bulanan (kg)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total berat tembaga per bulan berdasarkan tanggal masuk SPK
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums">
                Stok Gudang: {copperAnalytics.totalCurrentCopperStockKg} kg
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={copperAnalytics.monthlyUsage}
                  margin={{ top: 10, right: 10, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickFormatter={(v) => `${v} kg`}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as {
                        fullMonth: string;
                        totalKg: number;
                        spkCount: number;
                        avgKgPerUnit: number;
                      };
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2.5 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
                          <div className="font-bold text-amber-400">{pt.fullMonth}</div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Pemakaian Kawat:</span>
                            <span className="font-mono font-bold tabular-nums">{pt.totalKg} kg</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Volume SPK:</span>
                            <span className="font-mono font-semibold tabular-nums">{pt.spkCount} unit</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 border-t border-slate-700 pt-1">
                            <span className="text-slate-400">Rata-rata/Unit:</span>
                            <span className="font-mono text-emerald-400 tabular-nums">{pt.avgKgPerUnit} kg</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={copperAnalytics.avgMonthlyKg}
                    stroke="#64748B"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="totalKg" radius={[6, 6, 0, 0]} maxBarSize={38}>
                    {copperAnalytics.monthlyUsage.map((entry, idx) => (
                      <Cell
                        key={`copper-cell-${idx}`}
                        fill={entry.totalKg >= copperAnalytics.avgMonthlyKg ? '#B45309' : '#F59E0B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Wire Diameter Breakdown & Restock Table */}
          <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Rincian Pemakaian & Proyeksi Stok per Diameter Kawat (Ø mm)
              </span>
              {copperAnalytics.criticalWireCount > 0 && (
                <span className="text-[11px] font-semibold text-rose-700">
                  {copperAnalytics.criticalWireCount} ukuran perlu perhatian
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Ukuran Kawat</th>
                    <th className="py-2.5 px-2 text-right">Riwayat SPK</th>
                    <th className="py-2.5 px-2 text-right">Laju/Bln</th>
                    <th className="py-2.5 px-2 text-right">Stok / WIP</th>
                    <th className="py-2.5 px-2 text-right">Ketahanan</th>
                    <th className="py-2.5 px-3 text-right">Saran Beli ({forecastMonths} Bln)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {copperAnalytics.wireSizes.map((row) => (
                    <tr key={row.wireSizeMm} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{row.label}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                          {row.inventoryItem ? row.inventoryItem.name.replace('Kawat Tembaga Email ', '') : 'Belum tercatat di gudang'}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">{row.totalKg} kg</div>
                        <div className="text-[10px] text-slate-500">{row.orderCount} SPK</div>
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700">
                        {row.monthlyBurnKg} kg
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {row.currentStockKg !== null ? (
                          <div>
                            <span
                              className={`font-bold ${
                                row.stockHealth === 'kritis'
                                  ? 'text-rose-600'
                                  : row.stockHealth === 'waspada'
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {row.currentStockKg} kg
                            </span>
                            {row.pendingDemandKg > 0 && (
                              <div className="text-[10px] text-amber-700">
                                WIP: -{row.pendingDemandKg} kg
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Non-stok</span>
                        )}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {row.currentStockKg === null ? (
                          <span className="text-[11px] text-slate-400">-</span>
                        ) : row.daysOfSupply >= 999 ? (
                          <span className="text-emerald-700 font-semibold">&gt;99 hr</span>
                        ) : (
                          <span
                            className={`font-bold ${
                              row.daysOfSupply <= 14
                                ? 'text-rose-600'
                                : row.daysOfSupply <= 35
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                            }`}
                          >
                            ~{row.daysOfSupply} hr
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {row.recommendedRestockKg > 0 ? (
                          <div>
                            <span className="font-bold text-amber-700">+{row.recommendedRestockKg} kg</span>
                            <div className="text-[10px] text-slate-500">
                              {formatRupiah(row.estimatedRestockCost)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Cukup</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>
                Rumus Saran Beli: (Laju Pakai/Bln × {forecastMonths} Bln) + Stok Aman + Kebutuhan WIP − Stok Gudang.
              </span>
              <span className="font-mono text-slate-700 font-semibold tabular-nums">
                Basis: {copperAnalytics.distinctMonthsCount} bulan riwayat SPK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PER-SPK PROFITABILITY ANALYSIS (ESTIMATED SERVICE PRICE VS COPPER MATERIAL COST) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header & Interactive Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Analisis Margin Bengkel</span>
              <span aria-hidden="true">·</span>
              <span>Estimasi Harga Jasa − Modal Kawat Tembaga</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-slate-700 tabular-nums">
                {customCopperPricePerKg !== null && customCopperPricePerKg > 0
                  ? `Simulasi ${formatRupiah(customCopperPricePerKg)}/kg`
                  : `Basis Stok Gudang (~${formatRupiah(spkProfitability.avgInventoryCopperUnitCost)}/kg)`}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Analisis Profitabilitas per SPK
            </h2>
            <p className="text-xs text-slate-500">
              Menghitung selisih bersih antara estimasi nilai jasa SPK dan biaya pemakaian kawat tembaga email Class H per unit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            {/* Status Filter Segmented Controls */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {([
                { key: 'all', label: 'Semua SPK' },
                { key: 'completed', label: 'Selesai' },
                { key: 'active', label: 'Aktif' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setProfitStatusFilter(tab.key)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    profitStatusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <select
              value={profitSortBy}
              onChange={(e) =>
                setProfitSortBy(
                  e.target.value as 'profit_desc' | 'margin_desc' | 'margin_asc' | 'revenue_desc'
                )
              }
              aria-label="Urutkan profitabilitas SPK"
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="profit_desc">Urut: Selisih Profit Tertinggi</option>
              <option value="margin_desc">Urut: Margin % Tertinggi</option>
              <option value="margin_asc">Urut: Margin % Terendah</option>
              <option value="revenue_desc">Urut: Estimasi Jasa Tertinggi</option>
            </select>

            {/* Optional Copper Cost Override Simulator */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Harga Kawat/kg:</span>
              <input
                type="number"
                min={0}
                step={1000}
                placeholder={String(spkProfitability.avgInventoryCopperUnitCost)}
                value={customCopperPricePerKg ?? ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setCustomCopperPricePerKg(val === '' ? null : Math.max(0, Number(val)));
                }}
                aria-label="Simulasi harga modal kawat tembaga per kg"
                className="w-24 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {customCopperPricePerKg !== null && (
                <button
                  type="button"
                  onClick={() => setCustomCopperPricePerKg(null)}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 px-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Summary Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/70 border-b border-slate-200">
          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">Total Estimasi Harga Jasa</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {formatRupiah(spkProfitability.totalEstimatedRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
              {spkProfitability.rows.length} SPK dianalisis
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">Total Biaya Kawat Tembaga</div>
            <div className="text-xl font-extrabold text-amber-700 font-mono tabular-nums mt-0.5">
              {formatRupiah(spkProfitability.totalCopperMaterialCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
              Total pakai {spkProfitability.totalCopperKg} kg tembaga
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Selisih Profitabilitas Bersih</span>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  spkProfitability.overallMarginPercent >= 50
                    ? 'text-emerald-700'
                    : spkProfitability.overallMarginPercent >= 35
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                {spkProfitability.overallMarginPercent}% margin
              </span>
            </div>
            <div
              className={`text-xl font-extrabold font-mono tabular-nums mt-0.5 ${
                spkProfitability.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatRupiah(spkProfitability.totalProfit)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
              Rata-rata {formatRupiah(spkProfitability.avgProfitPerSpk)} / SPK
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">SPK Profit Tertinggi</div>
            <div className="text-base font-bold text-slate-900 mt-0.5 truncate font-mono">
              {spkProfitability.mostProfitable
                ? spkProfitability.mostProfitable.order.spkNumber
                : '-'}
            </div>
            <div className="text-[11px] mt-0.5 flex items-center justify-between gap-2 font-mono tabular-nums">
              <span className="text-emerald-700 font-semibold">
                {spkProfitability.mostProfitable
                  ? `${formatRupiah(spkProfitability.mostProfitable.profitAmount)} (${spkProfitability.mostProfitable.marginPercent}%)`
                  : '-'}
              </span>
              {spkProfitability.lowMarginCount > 0 && (
                <span className="text-rose-600 font-semibold">
                  {spkProfitability.lowMarginCount} margin &lt;45%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Visual Stacked Comparison Chart */}
        {spkProfitability.chartData.length > 0 && (
          <div className="p-5 border-b border-slate-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Visualisasi Komposisi Harga Jasa: Biaya Kawat Tembaga vs Selisih Profit per SPK
                </h3>
                <p className="text-[11px] text-slate-500">
                  Menampilkan hingga 10 SPK teratas sesuai urutan aktif; tinggi batang total mencerminkan estimasi harga jasa SPK.
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
                  <span>Biaya Material Kawat</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  <span>Selisih Profit Jasa</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={spkProfitability.chartData}
                  margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortSpk"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(value: number) => {
                      if (value === 0) return '0';
                      return `${(value / 1000000).toFixed(1)} Jt`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const pt = payload[0].payload as (typeof spkProfitability.chartData)[number];
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[250px] space-y-1.5">
                          <div className="border-b border-slate-700 pb-1.5">
                            <div className="font-mono font-bold text-amber-400">{pt.spkNumber}</div>
                            <div className="text-slate-300 text-[11px] truncate">{pt.customerCompany}</div>
                            <div className="text-slate-400 text-[10px]">{pt.machineLabel}</div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Estimasi Jasa SPK:</span>
                            <span className="font-mono font-bold text-white tabular-nums">
                              {formatRupiah(pt.estimatedServicePrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">
                              Kawat ({pt.copperWeightKg} kg × {formatRupiah(pt.copperUnitCost)}):
                            </span>
                            <span className="font-mono font-semibold text-amber-400 tabular-nums">
                              −{formatRupiah(pt.copperMaterialCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-700">
                            <span className="text-slate-200 font-semibold">Selisih Profit:</span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                pt.rawProfitAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {formatRupiah(pt.rawProfitAmount)} ({pt.marginPercent}%)
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="copperMaterialCost"
                    stackId="spkProfit"
                    fill="#D97706"
                    name="Biaya Material Kawat"
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="profitAmount"
                    stackId="spkProfit"
                    fill="#059669"
                    name="Selisih Profit"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-SPK Profitability Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-5">No. SPK & Unit Mesin</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Estimasi Jasa</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Pemakaian Kawat</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Biaya Kawat</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Selisih Profit</th>
                <th className="py-3 px-5 w-44">Margin Pasca-Kawat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spkProfitability.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada SPK pada filter status yang dipilih.
                  </td>
                </tr>
              ) : (
                spkProfitability.rows.map((row) => {
                  const isHealthyMargin = row.marginPercent >= 55;
                  const isMediumMargin = row.marginPercent >= 45 && row.marginPercent < 55;
                  return (
                    <tr
                      key={row.order.id}
                      onClick={() => onSelectOrder(row.order)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-5">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {row.order.spkNumber}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[230px]">
                          {row.order.customerCompany} · {row.order.brand} ({row.order.powerHp} HP)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[11px] whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            row.isCompleted ? 'text-emerald-700' : 'text-slate-600'
                          }`}
                        >
                          {row.order.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatRupiah(row.estimatedServicePrice)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {row.copperWeightKg} kg
                          {row.wireSizeMm > 0 ? ` · Ø ${row.wireSizeMm.toFixed(2)}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          @{formatRupiah(row.copperUnitCost)}/kg ({row.copperSourceLabel})
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700 tabular-nums whitespace-nowrap">
                        {formatRupiah(row.copperMaterialCost)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div
                          className={`font-extrabold ${
                            row.profitAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatRupiah(row.profitAmount)}
                        </div>
                        {row.copperWeightKg > 0 && (
                          <div className="text-[10px] text-slate-500">
                            {formatRupiah(row.profitPerKg)}/kg kawat
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-5">
                        <div className="flex items-center justify-between gap-2 mb-1 font-mono text-[11px] tabular-nums">
                          <span
                            className={`font-bold ${
                              isHealthyMargin
                                ? 'text-emerald-700'
                                : isMediumMargin
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {row.marginPercent}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Kawat {row.copperSharePercent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isHealthyMargin
                                ? 'bg-emerald-600'
                                : isMediumMargin
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, row.marginPercent))}%`,
                            }}
                          />
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

      {/* Technician Monthly Performance Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Produktivitas Bengkel</span>
              <span aria-hidden="true">·</span>
              <span>SPK Selesai & Diserahkan</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-slate-700 tabular-nums">
                Target: {monthlySpkTarget} SPK/bln ({perTechMonthlyTarget} SPK/teknisi)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Ringkasan Kinerja Teknisi per Bulan & Target Tim
            </h2>
            <p className="text-xs text-slate-500">
              Rekap jumlah SPK yang diselesaikan masing-masing teknisi dan perbandingan capaian tim terhadap target bulanan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsEditingTarget((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  isEditingTarget
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isEditingTarget ? 'Tutup Pengaturan' : 'Atur Target SPK'}</span>
              </button>
            ) : (
              <span className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-lg border border-slate-200">
                Target ditetapkan Administrator
              </span>
            )}

            {/* Interactive Month Filter Controls */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedPerfMonth('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  selectedPerfMonth === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Bulan ({technicianPerformance.totalCompletedAll})
              </button>
              {technicianPerformance.months.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedPerfMonth(m.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    selectedPerfMonth === m.key
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Configuration Panel */}
        {isEditingTarget && (
          <form
            onSubmit={handleSaveTargetForm}
            className="px-5 py-4 bg-amber-50/60 border-b border-amber-200 flex flex-col lg:flex-row lg:items-end justify-between gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Tim Bengkel (SPK / Bulan)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={draftTeamTarget}
                    onChange={(e) => setDraftTeamTarget(Number(e.target.value))}
                    className="w-28 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1">
                    {[4, 6, 8, 10, 12].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDraftTeamTarget(preset)}
                        className={`px-2 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                          draftTeamTarget === preset
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target per Teknisi / PIC (SPK / Bulan)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={draftPerTechTarget}
                  onChange={(e) => setDraftPerTechTarget(Number(e.target.value))}
                  className="w-28 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDraftTeamTarget(monthlySpkTarget);
                  setDraftPerTechTarget(perTechMonthlyTarget);
                  setIsEditingTarget(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingTarget}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {isSavingTarget ? 'Menyimpan...' : 'Simpan Target ke Database'}
              </button>
            </div>
          </form>
        )}

        {/* Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/70 border-b border-slate-200">
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Capaian Tim vs Target</span>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  technicianPerformance.activePeriodAchievementPercent >= 100
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {technicianPerformance.activePeriodAchievementPercent}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {technicianPerformance.totalCompletedInFilter} / {technicianPerformance.activePeriodTarget} SPK
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all ${
                  technicianPerformance.activePeriodAchievementPercent >= 100
                    ? 'bg-emerald-600'
                    : technicianPerformance.activePeriodAchievementPercent >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, technicianPerformance.activePeriodAchievementPercent))}%`,
                }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {technicianPerformance.totalCompletedInFilter >= technicianPerformance.activePeriodTarget
                ? `Melampaui target (+${technicianPerformance.totalCompletedInFilter - technicianPerformance.activePeriodTarget} SPK)`
                : `Kurang ${technicianPerformance.activePeriodTarget - technicianPerformance.totalCompletedInFilter} SPK untuk mencapai target`}
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">Teknisi Paling Produktif</div>
            <div className="text-base font-bold text-slate-900 mt-1 truncate">
              {technicianPerformance.topPerformer
                ? technicianPerformance.topPerformer.technicianName
                : 'Belum ada SPK selesai'}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold font-mono tabular-nums mt-0.5">
              {technicianPerformance.topPerformer
                ? `${technicianPerformance.topPerformer.selectedMonthCount} SPK selesai · ${technicianPerformance.topPerformer.selectedMonthHp} HP`
                : '-'}
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="text-xs text-slate-500">Total Kapasitas & Konsistensi Target</div>
            <div className="text-xl font-extrabold text-amber-700 font-mono tabular-nums mt-0.5">
              {technicianPerformance.totalHpInFilter.toLocaleString('id-ID')} HP
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
              {technicianPerformance.monthsHitTargetCount} dari {technicianPerformance.months.length} bulan mencapai target (≥ {monthlySpkTarget} SPK)
            </div>
          </div>
        </div>

        {/* Visual Team Performance vs Monthly Target Chart */}
        {technicianPerformance.monthlyTeamSeries.length > 0 && (
          <div className="p-5 border-b border-slate-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Perbandingan Visual Kinerja Tim per Bulan vs Target ({monthlySpkTarget} SPK/Bulan)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Batang hijau menandakan bulan mencapai/melampaui target; garis putus-putus menunjukkan batas target bulanan tim.
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  <span>Capai Target</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  <span>Di Bawah Target</span>
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={technicianPerformance.monthlyTeamSeries}
                  margin={{ top: 14, right: 16, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 1, monthlySpkTarget + 2)]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const pt = payload[0].payload as (typeof technicianPerformance.monthlyTeamSeries)[number];
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2.5 rounded-lg shadow-lg border border-slate-700 text-xs space-y-1">
                          <div className="font-bold text-amber-400">{pt.fullMonth}</div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">SPK Diselesaikan:</span>
                            <span className="font-mono font-bold tabular-nums">{pt.completed} SPK</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Target Bulanan:</span>
                            <span className="font-mono tabular-nums">{pt.target} SPK</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700">
                            <span className="text-slate-300">Capaian:</span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                pt.isTargetMet ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {pt.achievementPercent}% ({pt.gap >= 0 ? `+${pt.gap}` : pt.gap} SPK)
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={monthlySpkTarget}
                    stroke="#0F172A"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Target: ${monthlySpkTarget} SPK`,
                      position: 'insideTopRight',
                      fill: '#0F172A',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                  <Bar dataKey="completed" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {technicianPerformance.monthlyTeamSeries.map((entry, idx) => (
                      <Cell
                        key={`tech-target-cell-${idx}`}
                        fill={entry.isTargetMet ? '#059669' : '#F59E0B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Technician Monthly Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-5">Nama Teknisi / Tim PIC</th>
                <th className="py-3 px-4 w-60">
                  Capaian vs Target ({technicianPerformance.activePerTechTarget} SPK)
                </th>
                {technicianPerformance.months.map((m) => (
                  <th key={m.key} className="py-3 px-3 text-center whitespace-nowrap">
                    {m.short}
                  </th>
                ))}
                <th className="py-3 px-4 text-right whitespace-nowrap">Sedang Dikerjakan</th>
                <th className="py-3 px-5 text-right whitespace-nowrap">Total Daya / Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicianPerformance.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + technicianPerformance.months.length}
                    className="py-8 text-center text-slate-400"
                  >
                    Belum ada data SPK teknisi yang tercatat.
                  </td>
                </tr>
              ) : (
                technicianPerformance.rows.map((row) => {
                  const targetPct = Math.round(
                    (row.selectedMonthCount / Math.max(1, technicianPerformance.activePerTechTarget)) * 100
                  );
                  const metPerTechTarget =
                    row.selectedMonthCount >= technicianPerformance.activePerTechTarget;
                  return (
                    <tr key={row.technicianName} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{row.technicianName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Total semua bulan: <span className="font-mono font-semibold text-slate-700 tabular-nums">{row.totalCompleted} SPK</span>
                          {row.latestCompletedDate ? ` · Terakhir ${formatIndoDate(row.latestCompletedDate)}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {row.selectedMonthCount} / {technicianPerformance.activePerTechTarget} SPK
                          </span>
                          <span
                            className={`font-mono text-[11px] font-semibold tabular-nums ${
                              metPerTechTarget ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {targetPct}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              metPerTechTarget
                                ? 'bg-emerald-600'
                                : row.selectedMonthCount > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-200'
                            }`}
                            style={{
                              width: `${row.selectedMonthCount > 0 ? Math.min(100, Math.max(8, targetPct)) : 0}%`,
                            }}
                          />
                        </div>
                      </td>

                      {technicianPerformance.months.map((m) => {
                        const count = row.monthlyCounts[m.key] || 0;
                        const isFocusedMonth = selectedPerfMonth === m.key;
                        const metMonthTarget = count >= perTechMonthlyTarget;
                        return (
                          <td
                            key={m.key}
                            className={`py-3.5 px-3 text-center font-mono tabular-nums ${
                              isFocusedMonth ? 'bg-amber-50/60' : ''
                            }`}
                          >
                            {count > 0 ? (
                              <span
                                className={`font-bold ${
                                  metMonthTarget ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {count}
                              </span>
                            ) : (
                              <span className="text-slate-300">0</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {row.activeCount > 0 ? (
                          <span className="font-semibold text-amber-700">{row.activeCount} unit</span>
                        ) : (
                          <span className="text-slate-400">0 unit</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatRupiah(
                            selectedPerfMonth === 'all' ? row.totalRevenue : row.selectedMonthRevenue
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {Number(row.totalCopperKg.toFixed(1))} kg kawat
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

      {/* Urgent Orders & Low Inventory Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Urgent & Priority Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Prioritas Pengerjaan & Unit Mendesak ({urgentOrders.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <span>Lihat Semua SPK</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {urgentOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada unit dengan status mendesak saat ini. Semua berjalan sesuai jadwal.
                </div>
              ) : (
                urgentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="py-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {order.spkNumber}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          {order.priority}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {order.customerCompany}
                        </span>
                      </div>

                      <div className="text-sm font-medium text-slate-800">
                        {order.brand} {order.powerHp} HP ({order.powerKw} kW) - {order.machineType}
                      </div>

                      <div className="text-xs text-slate-500 line-clamp-1">
                        Kendala: {order.complaint}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                        {order.status}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Target: {formatIndoDate(order.targetCompletionDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Teknisi Standby: Cak Mustofa, Agus, Slamet, Joko</span>
            <span className="font-medium text-slate-700">Standar Isolasi 200°C</span>
          </div>
        </div>

        {/* Right Column (1 Col): Inventory Alert & Quick Tools */}
        <div className="space-y-6">
          {/* Inventory Alert Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Peringatan Stok Bahan</span>
                {lowStockItems.length > 0 && (
                  <span className="text-xs bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                    {lowStockItems.length}
                  </span>
                )}
              </h3>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                Gudang
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                Stok kawat tembaga, vernis, dan bearing dalam kondisi aman.
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-rose-950">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-rose-700">
                        Sisa: <strong className="tabular-nums">{item.currentStock} {item.unit}</strong> (Min: {item.minStockAlert} {item.unit})
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateTab('inventory')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white text-rose-700 border border-rose-200 rounded hover:bg-rose-50 shrink-0"
                    >
                      Beli
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Technical Toolkit Shortcuts */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Standar Uji & Kalkulator</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Akses cepat alat hitung pengganti kawat email, ampere rated, dan formulir hasil uji Megger.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('calculator')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kalkulator Kawat Paralel & FLA</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('qc')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sertifikat Uji Megger & Running Test</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
