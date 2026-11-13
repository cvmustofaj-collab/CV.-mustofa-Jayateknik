import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  WorkOrder,
  Customer,
  InventoryItem,
  OrderStatus,
  WorkshopReport,
  WorkshopReportType,
  StatusAuditEntry,
  WorkshopSettings,
  AppUserAccount,
  AccountInvite,
  UserRole,
  AccountStatus,
} from '../types/rewinding';
import { INITIAL_WORK_ORDERS, INITIAL_CUSTOMERS, INITIAL_INVENTORY } from '../data/initialData';

export const ADMIN_EMAIL = 'cvmustofaj@gmail.com';

const clampStr = (val: unknown, maxLen: number, fallback = ''): string => {
  const s = typeof val === 'string' ? val : val == null ? fallback : String(val);
  return s.slice(0, maxLen);
};

const clampNonEmptyStr = (val: unknown, maxLen: number, fallback: string): string => {
  const s = clampStr(val, maxLen, fallback).trim();
  return s.length > 0 ? s : fallback;
};

const clampNum = (val: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export const sanitizeDocId = (rawId: string, prefix: string): string => {
  const cleaned = (rawId || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${prefix}-${Date.now()}`;
};

export const isBootstrappedAdminEmail = (user: User | null): boolean =>
  Boolean(user && user.emailVerified && user.email === ADMIN_EMAIL);

const formatAuditDateTime = (date: Date): string =>
  date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) +
  ', ' +
  date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }) +
  ' WIB';

export const normalizeCustomerPayload = (cust: Customer, ownerId: string) => ({
  id: sanitizeDocId(cust.id, 'CUST'),
  ownerId: sanitizeDocId(ownerId, 'USR'),
  name: clampNonEmptyStr(cust.name, 120, 'Pelanggan'),
  company: clampNonEmptyStr(cust.company, 200, cust.name || 'Umum'),
  phone: clampNonEmptyStr(cust.phone, 40, '-'),
  email: clampStr(cust.email, 150, '-'),
  address: clampStr(cust.address, 400, '-'),
  city: clampStr(cust.city, 100, 'Surabaya'),
  notes: clampStr(cust.notes, 1000, ''),
  totalOrdersCount: Math.round(clampNum(cust.totalOrdersCount, 0, 100000)),
  joinedDate: clampStr(cust.joinedDate, 32, new Date().toISOString().split('T')[0]),
});

export const normalizeInventoryPayload = (item: InventoryItem, ownerId: string) => ({
  id: sanitizeDocId(item.id, 'INV'),
  ownerId: sanitizeDocId(ownerId, 'USR'),
  code: clampNonEmptyStr(item.code, 64, 'KOD-001'),
  name: clampNonEmptyStr(item.name, 200, 'Material Bengkel'),
  category: item.category,
  spec: clampStr(item.spec, 300, ''),
  currentStock: clampNum(item.currentStock, 0),
  unit: clampNonEmptyStr(item.unit, 32, 'pcs'),
  minStockAlert: clampNum(item.minStockAlert, 0),
  unitCost: clampNum(item.unitCost, 0),
  sellingPrice: clampNum(item.sellingPrice, 0),
  supplier: clampStr(item.supplier, 200, '-'),
  lastUpdated: clampStr(item.lastUpdated, 32, new Date().toISOString().split('T')[0]),
});

export const normalizeWorkOrderPayload = (order: WorkOrder, ownerId: string) => {
  const wd = order.windingData;
  const insp = order.inspection;
  const qc = order.qcReport;
  const nl = qc.noLoadTest;

  return {
    id: sanitizeDocId(order.id, 'WO'),
    ownerId: sanitizeDocId(ownerId, 'USR'),
    spkNumber: clampNonEmptyStr(order.spkNumber, 64, `SPK-MJT-${Date.now()}`),
    entryDate: clampNonEmptyStr(order.entryDate, 32, new Date().toISOString().split('T')[0]),
    targetCompletionDate: clampNonEmptyStr(
      order.targetCompletionDate,
      32,
      new Date().toISOString().split('T')[0]
    ),
    actualCompletionDate: clampStr(order.actualCompletionDate, 32, ''),
    customerId: clampStr(order.customerId, 128, ''),
    customerName: clampNonEmptyStr(order.customerName, 120, 'Pelanggan'),
    customerCompany: clampNonEmptyStr(order.customerCompany, 200, order.customerName || 'Umum'),
    customerPhone: clampStr(order.customerPhone, 40, '-'),
    customerAddress: clampStr(order.customerAddress, 400, '-'),
    machineType: order.machineType,
    brand: clampNonEmptyStr(order.brand, 120, 'Standard Motor'),
    modelOrType: clampStr(order.modelOrType, 120, '-'),
    serialNumber: clampStr(order.serialNumber, 120, '-'),
    powerHp: clampNum(order.powerHp, 0),
    powerKw: clampNum(order.powerKw, 0),
    rpm: clampNum(order.rpm, 0),
    voltage: clampStr(order.voltage, 64, '380V'),
    frequencyHz: clampNum(order.frequencyHz, 0),
    currentAmpereRated: clampNum(order.currentAmpereRated, 0),
    frameSize: clampStr(order.frameSize, 64, '-'),
    cosPhi: clampNum(order.cosPhi, 0, 1.5),
    ipRating: clampStr(order.ipRating, 32, 'IP 55'),
    complaint: clampStr(order.complaint, 1000, ''),
    inspection: {
      visualCondition: clampStr(insp.visualCondition, 500, ''),
      meggerInitialBodyMOhm: clampNum(insp.meggerInitialBodyMOhm, 0),
      bearingFrontCondition: insp.bearingFrontCondition,
      bearingRearCondition: insp.bearingRearCondition,
      rotorCondition: clampStr(insp.rotorCondition, 300, ''),
      shaftRunoutMm: clampNum(insp.shaftRunoutMm, 0),
    },
    windingData: {
      slotsCount: clampNum(wd.slotsCount, 0),
      polesCount: clampNum(wd.polesCount, 0),
      pitchCoil: clampStr(wd.pitchCoil, 64, ''),
      wireSizeMm: clampNum(wd.wireSizeMm, 0),
      wireSizeAlternative: clampStr(wd.wireSizeAlternative, 200, ''),
      turnsPerSlot: clampNum(wd.turnsPerSlot, 0),
      parallelWires: clampNum(wd.parallelWires, 0),
      windingType: wd.windingType,
      insulationClass: wd.insulationClass,
      insulationMaterial: clampStr(wd.insulationMaterial, 250, ''),
      copperWeightKg: clampNum(wd.copperWeightKg, 0),
      bakingVarnishType: clampStr(wd.bakingVarnishType, 200, ''),
      bakingDurationHours: clampNum(wd.bakingDurationHours, 0),
      bakingTempC: clampNum(wd.bakingTempC, 0),
      connectionType: wd.connectionType,
    },
    qcReport: {
      testedAt: clampStr(qc.testedAt, 64, ''),
      testedBy: clampStr(qc.testedBy, 120, ''),
      meggerPhasePhaseMOhm: {
        uv: clampNum(qc.meggerPhasePhaseMOhm?.uv, 0),
        vw: clampNum(qc.meggerPhasePhaseMOhm?.vw, 0),
        wu: clampNum(qc.meggerPhasePhaseMOhm?.wu, 0),
      },
      meggerPhaseBodyMOhm: {
        uBody: clampNum(qc.meggerPhaseBodyMOhm?.uBody, 0),
        vBody: clampNum(qc.meggerPhaseBodyMOhm?.vBody, 0),
        wBody: clampNum(qc.meggerPhaseBodyMOhm?.wBody, 0),
      },
      windingResistanceOhm: {
        u: clampNum(qc.windingResistanceOhm?.u, 0),
        v: clampNum(qc.windingResistanceOhm?.v, 0),
        w: clampNum(qc.windingResistanceOhm?.w, 0),
      },
      resistanceBalancePercent: clampNum(qc.resistanceBalancePercent, -1000, 1000),
      noLoadTest: {
        voltageRS: clampNum(nl?.voltageRS, 0),
        voltageST: clampNum(nl?.voltageST, 0),
        voltageTR: clampNum(nl?.voltageTR, 0),
        currentR: clampNum(nl?.currentR, 0),
        currentS: clampNum(nl?.currentS, 0),
        currentT: clampNum(nl?.currentT, 0),
        currentBalanceStatus: nl?.currentBalanceStatus || 'PASS',
        rpmMeasured: clampNum(nl?.rpmMeasured, 0),
        bearingVibrationMmS: clampNum(nl?.bearingVibrationMmS, 0),
        bearingTempC: clampNum(nl?.bearingTempC, 0),
        noiseDb: clampNum(nl?.noiseDb, 0),
      },
      summaryVerdict: qc.summaryVerdict,
      notes: clampStr(qc.notes, 1000, ''),
    },
    status: order.status,
    priority: order.priority,
    technicianName: clampNonEmptyStr(order.technicianName, 120, 'Teknisi Workshop'),
    invoiceNumber: clampStr(
      order.invoiceNumber || `INV-MJT/${clampNonEmptyStr(order.spkNumber, 64, '').replace('SPK-MJT-', '')}`,
      64,
      ''
    ),
    invoiceDate: clampStr(
      order.invoiceDate || order.actualCompletionDate || order.entryDate,
      32,
      ''
    ),
    fakturPajakNumber: clampStr(order.fakturPajakNumber, 64, ''),
    serviceItems: (order.serviceItems || []).slice(0, 50).map((item) => ({
      id: clampStr(item.id, 64, String(Date.now())),
      description: clampStr(item.description, 250, 'Item'),
      quantity: clampNum(item.quantity, 0),
      unit: clampStr(item.unit, 32, 'lot'),
      unitPrice: clampNum(item.unitPrice, 0),
      total: clampNum(item.total, 0),
    })),
    laborCost: clampNum(order.laborCost, 0),
    partsCost: clampNum(order.partsCost, 0),
    discount: clampNum(order.discount, 0),
    taxPpnPercent: clampNum(order.taxPpnPercent, 0, 100),
    taxPpnAmount: clampNum(
      order.taxPpnAmount ??
        Math.round(
          Math.max(0, clampNum(order.partsCost, 0) - clampNum(order.discount, 0)) *
            (clampNum(order.taxPpnPercent, 0, 100) / 100)
        ),
      0
    ),
    taxPphPercent: clampNum(order.taxPphPercent ?? 0, 0, 100),
    taxPphAmount: clampNum(
      order.taxPphAmount ??
        Math.round(
          Math.max(0, clampNum(order.partsCost, 0) - clampNum(order.discount, 0)) *
            (clampNum(order.taxPphPercent ?? 0, 0, 100) / 100)
        ),
      0
    ),
    grandTotal: clampNum(order.grandTotal, 0),
    netPayableTotal: clampNum(
      order.netPayableTotal ??
        Math.max(
          0,
          clampNum(order.grandTotal, 0) -
            clampNum(
              order.taxPphAmount ??
                Math.round(
                  Math.max(0, clampNum(order.partsCost, 0) - clampNum(order.discount, 0)) *
                    (clampNum(order.taxPphPercent ?? 0, 0, 100) / 100)
                ),
              0
            )
        ),
      0
    ),
    downPayment: clampNum(order.downPayment, 0),
    balanceDue: clampNum(order.balanceDue, 0),
    paymentStatus: order.paymentStatus,
    warrantyMonths: clampNum(order.warrantyMonths, 0, 120),
    warrantyNotes: clampStr(order.warrantyNotes, 1000, ''),
    statusAuditLog: (order.statusAuditLog || []).slice(0, 100).map((entry) => ({
      id: clampStr(entry.id, 64, String(Date.now())),
      timestamp: clampStr(entry.timestamp, 64, new Date().toISOString()),
      formattedDate: clampStr(entry.formattedDate, 80, ''),
      previousStatus: entry.previousStatus || order.status,
      newStatus: entry.newStatus,
      updatedBy: clampStr(entry.updatedBy, 120, 'Teknisi'),
      notes: clampStr(entry.notes, 300, ''),
    })),
    lastStatusUpdated: clampStr(order.lastStatusUpdated, 80, ''),
    lastStatusUpdatedBy: clampStr(order.lastStatusUpdatedBy, 120, ''),
    workshopNotes: clampStr(order.workshopNotes, 2000, ''),
  };
};

export interface CreateReportInput {
  id?: string;
  reportType: WorkshopReportType;
  title: string;
  referenceNumber: string;
  orderId?: string;
  customerCompany?: string;
  technicianOrActor: string;
  summary: string;
  verdictOrStatus: string;
  amountRp?: number;
  copperKg?: number;
  meggerMOhm?: number;
  metrics?: Record<string, string | number | boolean>;
  sourceAction: string;
  reportDate?: string;
}

const buildReportDoc = (uid: string, input: CreateReportInput) => {
  const reportId = sanitizeDocId(
    input.id || `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    'RPT'
  );
  const safeMetrics: Record<string, string | number | boolean> = {};
  if (input.metrics) {
    Object.entries(input.metrics)
      .slice(0, 25)
      .forEach(([k, v]) => {
        if (typeof v === 'string') safeMetrics[k.slice(0, 50)] = v.slice(0, 200);
        else if (typeof v === 'number' && Number.isFinite(v)) safeMetrics[k.slice(0, 50)] = v;
        else if (typeof v === 'boolean') safeMetrics[k.slice(0, 50)] = v;
      });
  }

  return {
    id: reportId,
    ownerId: sanitizeDocId(uid, 'USR'),
    reportType: input.reportType,
    title: clampNonEmptyStr(input.title, 200, 'Laporan Workshop'),
    referenceNumber: clampNonEmptyStr(input.referenceNumber, 100, reportId),
    orderId: clampStr(input.orderId, 128, ''),
    customerCompany: clampStr(input.customerCompany, 200, '-'),
    technicianOrActor: clampNonEmptyStr(input.technicianOrActor, 120, 'Operator Workshop'),
    summary: clampNonEmptyStr(input.summary, 1000, '-'),
    verdictOrStatus: clampNonEmptyStr(input.verdictOrStatus, 100, 'Tercatat'),
    amountRp: clampNum(input.amountRp, 0),
    copperKg: clampNum(input.copperKg, 0),
    meggerMOhm: clampNum(input.meggerMOhm, 0),
    metrics: safeMetrics,
    sourceAction: clampNonEmptyStr(input.sourceAction, 100, 'auto_sync'),
    reportDate: clampNonEmptyStr(input.reportDate, 32, new Date().toISOString().split('T')[0]),
    createdAt: serverTimestamp(),
  };
};

export const firestoreService = {
  async ensureUserBootstrap(user: User): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const isAdminUser = isBootstrappedAdminEmail(user);
    const userEmailLower = (user.email || '').trim().toLowerCase();

    // Check if an Administrator pre-registered an invite for this verified email
    let matchedInvite: AccountInvite | null = null;
    if (user.emailVerified && userEmailLower) {
      try {
        const invQuery = query(
          collection(db, 'accountInvites'),
          where('email', '==', userEmailLower),
          limit(1)
        );
        const invSnap = await getDocs(invQuery);
        if (!invSnap.empty) {
          matchedInvite = invSnap.docs[0].data() as AccountInvite;
        }
      } catch {
        // Non-blocking if no matching invite or rules restrict
      }
    }

    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const invitedRole: UserRole =
          matchedInvite && (matchedInvite.role === 'operator' || matchedInvite.role === 'technician')
            ? matchedInvite.role
            : 'operator';
        const initialRole: UserRole = isAdminUser ? 'admin' : invitedRole;
        const initialStatus: AccountStatus =
          isAdminUser ? 'active' : matchedInvite?.status === 'suspended' ? 'suspended' : 'active';
        const initialDisplayName = clampNonEmptyStr(
          matchedInvite?.displayName || user.displayName,
          120,
          isAdminUser ? 'Administrator MJT' : 'Operator MJT'
        );
        const initialDepartment = clampStr(
          matchedInvite?.department || (isAdminUser ? 'Pemilik & Administrator Bengkel' : 'Operasional Workshop'),
          100,
          ''
        );

        await setDoc(userRef, {
          uid: user.uid,
          displayName: initialDisplayName,
          role: initialRole,
          status: initialStatus,
          department: initialDepartment,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }

    try {
      const privSnap = await getDoc(privateRef);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid: user.uid,
          email: clampNonEmptyStr(user.email, 254, 'unknown@example.com'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/private/info`);
    }

    if (matchedInvite && !matchedInvite.claimedUid && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'accountInvites', sanitizeDocId(matchedInvite.id, 'INV')), {
          claimedUid: user.uid,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking
      }
    }

    if (isAdminUser) {
      const adminRef = doc(db, 'admins', user.uid);
      try {
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid: user.uid,
            grantedBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `admins/${user.uid}`);
      }
    }
  },

  subscribeUserAccount(
    user: User,
    callback: (account: AppUserAccount | null) => void
  ): Unsubscribe {
    let profileData: Partial<AppUserAccount> | null = null;
    let hasAdminDoc = false;

    const emit = () => {
      if (!profileData && !isBootstrappedAdminEmail(user)) {
        callback(null);
        return;
      }
      const isBootstrapAdmin = isBootstrappedAdminEmail(user);
      const effectiveRole: UserRole =
        isBootstrapAdmin || hasAdminDoc
          ? 'admin'
          : (profileData?.role as UserRole) || 'operator';

      callback({
        uid: user.uid,
        displayName:
          profileData?.displayName ||
          user.displayName ||
          (effectiveRole === 'admin' ? 'Administrator' : 'User Bengkel'),
        role: effectiveRole,
        status: isBootstrapAdmin
          ? 'active'
          : ((profileData?.status as AccountStatus) || 'active'),
        department:
          profileData?.department ||
          (effectiveRole === 'admin' ? 'Administrator Sistem' : 'Operasional Workshop'),
        email: user.email || '',
        isAdminRecord: isBootstrapAdmin || hasAdminDoc,
        createdAt: profileData?.createdAt,
        updatedAt: profileData?.updatedAt,
      });
    };

    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        profileData = snap.exists() ? (snap.data() as Partial<AppUserAccount>) : null;
        emit();
      },
      () => {
        emit();
      }
    );

    const unsubAdmin = onSnapshot(
      doc(db, 'admins', user.uid),
      (snap) => {
        hasAdminDoc = snap.exists();
        emit();
      },
      () => {
        hasAdminDoc = false;
        emit();
      }
    );

    return () => {
      unsubUser();
      unsubAdmin();
    };
  },

  async listAllUserAccountsForAdmin(): Promise<{
    users: AppUserAccount[];
    invites: AccountInvite[];
  }> {
    try {
      const [usersSnap, adminsSnap, invitesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'admins')).catch(() => null),
        getDocs(collection(db, 'accountInvites')).catch(() => null),
      ]);

      const adminUidSet = new Set<string>();
      if (adminsSnap) {
        adminsSnap.docs.forEach((d) => adminUidSet.add(d.id));
      }

      const users = await Promise.all(
        usersSnap.docs.map(async (uDoc) => {
          const data = uDoc.data() as Partial<AppUserAccount>;
          let email = '';
          try {
            const privSnap = await getDoc(doc(db, 'users', uDoc.id, 'private', 'info'));
            if (privSnap.exists()) {
              email = String((privSnap.data() as { email?: string }).email || '');
            }
          } catch {
            // Skip unreadable PII
          }
          const isAdminRecord = adminUidSet.has(uDoc.id) || email === ADMIN_EMAIL;
          return {
            uid: data.uid || uDoc.id,
            displayName: data.displayName || 'User Workshop',
            role: isAdminRecord ? 'admin' : ((data.role as UserRole) || 'operator'),
            status: (data.status as AccountStatus) || 'active',
            department: data.department || '',
            email,
            isAdminRecord,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } satisfies AppUserAccount;
        })
      );

      users.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      const invites: AccountInvite[] = invitesSnap
        ? invitesSnap.docs
            .map((d) => d.data() as AccountInvite)
            .sort((a, b) => a.email.localeCompare(b.email))
        : [];

      return { users, invites };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  },

  async updateOwnUserProfile(
    uid: string,
    updates: { displayName: string; department: string }
  ): Promise<void> {
    const safeUid = sanitizeDocId(uid, 'USR');
    try {
      await updateDoc(doc(db, 'users', safeUid), {
        displayName: clampNonEmptyStr(updates.displayName, 120, 'User MJT'),
        department: clampStr(updates.department, 100, ''),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}`);
    }
  },

  async updateUserAccountByAdmin(
    adminUser: User,
    targetAccount: AppUserAccount,
    updates: { displayName: string; role: UserRole; status: AccountStatus; department: string }
  ): Promise<void> {
    const targetUid = sanitizeDocId(targetAccount.uid, 'USR');
    const isTargetPrimaryAdmin = targetAccount.email === ADMIN_EMAIL;
    const finalRole: UserRole = isTargetPrimaryAdmin ? 'admin' : updates.role;
    const finalStatus: AccountStatus = isTargetPrimaryAdmin ? 'active' : updates.status;

    try {
      await updateDoc(doc(db, 'users', targetUid), {
        displayName: clampNonEmptyStr(updates.displayName, 120, targetAccount.displayName || 'User MJT'),
        role: finalRole,
        status: finalStatus,
        department: clampStr(updates.department, 100, ''),
        updatedAt: serverTimestamp(),
      });

      if (isBootstrappedAdminEmail(adminUser) && !isTargetPrimaryAdmin) {
        const adminRef = doc(db, 'admins', targetUid);
        if (finalRole === 'admin') {
          const existingAdmin = await getDoc(adminRef);
          if (!existingAdmin.exists()) {
            await setDoc(adminRef, {
              uid: targetUid,
              grantedBy: adminUser.uid,
              createdAt: serverTimestamp(),
            });
          }
        } else {
          const existingAdmin = await getDoc(adminRef);
          if (existingAdmin.exists()) {
            await deleteDoc(adminRef);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUid}`);
    }
  },

  async saveAccountInvite(
    adminUid: string,
    input: {
      id?: string;
      email: string;
      displayName: string;
      role: UserRole;
      department: string;
      status: AccountStatus;
      claimedUid?: string;
    }
  ): Promise<AccountInvite> {
    const safeId = sanitizeDocId(input.id || `ACCI-${Date.now()}`, 'ACCI');
    const normalizedEmail = clampNonEmptyStr(input.email.trim().toLowerCase(), 254, 'user@example.com');
    const payload = {
      id: safeId,
      ownerId: sanitizeDocId(adminUid, 'USR'),
      email: normalizedEmail,
      displayName: clampNonEmptyStr(input.displayName, 120, 'Operator Workshop'),
      role: input.role,
      department: clampStr(input.department, 100, 'Operasional Workshop'),
      status: input.status,
      claimedUid: clampStr(input.claimedUid || '', 128, ''),
    };

    try {
      const ref = doc(db, 'accountInvites', safeId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          email: payload.email,
          displayName: payload.displayName,
          role: payload.role,
          department: payload.department,
          status: payload.status,
          claimedUid: payload.claimedUid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return payload;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accountInvites/${safeId}`);
    }
  },

  async deleteAccountInvite(inviteId: string): Promise<void> {
    const safeId = sanitizeDocId(inviteId, 'ACCI');
    try {
      await deleteDoc(doc(db, 'accountInvites', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accountInvites/${safeId}`);
    }
  },

  async seedInitialWorkshopDataIfEmpty(user: User): Promise<boolean> {
    const uid = user.uid;
    const isAdminUser = isBootstrappedAdminEmail(user);

    try {
      const woQuery = isAdminUser
        ? query(collection(db, 'workOrders'), limit(1))
        : query(collection(db, 'workOrders'), where('ownerId', '==', uid), limit(1));
      const existingWo = await getDocs(woQuery);
      if (!existingWo.empty) {
        return false;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'workOrders');
    }

    try {
      const batch = writeBatch(db);
      const actor = clampNonEmptyStr(user.displayName, 120, 'Cak Mustofa');

      for (const cust of INITIAL_CUSTOMERS) {
        const payload = normalizeCustomerPayload(cust, uid);
        batch.set(doc(db, 'customers', payload.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const item of INITIAL_INVENTORY) {
        const payload = normalizeInventoryPayload(item, uid);
        batch.set(doc(db, 'inventory', payload.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const wo of INITIAL_WORK_ORDERS) {
        const payload = normalizeWorkOrderPayload(wo, uid);
        batch.set(doc(db, 'workOrders', payload.id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Auto-seed initial QC / Revenue reports for already-tested or completed SPKs
        const meggerMin = Math.min(
          payload.qcReport.meggerPhaseBodyMOhm.uBody || 0,
          payload.qcReport.meggerPhaseBodyMOhm.vBody || 0,
          payload.qcReport.meggerPhaseBodyMOhm.wBody || 0
        );
        if (meggerMin > 0) {
          const qcReportId = sanitizeDocId(`RPT-QC-${payload.id}`, 'RPT');
          batch.set(
            doc(db, 'reports', qcReportId),
            buildReportDoc(uid, {
              id: qcReportId,
              reportType: 'QC_MEGGER_TEST',
              title: `Laporan QC & Megger ${payload.brand} ${payload.powerHp} HP`,
              referenceNumber: payload.spkNumber,
              orderId: payload.id,
              customerCompany: payload.customerCompany,
              technicianOrActor: payload.qcReport.testedBy || actor,
              summary: `Megger U/V/W-Bodi min ${meggerMin} MΩ · Vibrasi ${payload.qcReport.noLoadTest.bearingVibrationMmS} mm/s · ${payload.qcReport.summaryVerdict}`,
              verdictOrStatus: payload.qcReport.summaryVerdict,
              amountRp: payload.grandTotal,
              copperKg: payload.windingData.copperWeightKg,
              meggerMOhm: meggerMin,
              metrics: {
                meggerUBody: payload.qcReport.meggerPhaseBodyMOhm.uBody,
                meggerVBody: payload.qcReport.meggerPhaseBodyMOhm.vBody,
                meggerWBody: payload.qcReport.meggerPhaseBodyMOhm.wBody,
                currentR: payload.qcReport.noLoadTest.currentR,
                currentS: payload.qcReport.noLoadTest.currentS,
                currentT: payload.qcReport.noLoadTest.currentT,
                vibrationMmS: payload.qcReport.noLoadTest.bearingVibrationMmS,
              },
              sourceAction: 'seed_initial_qc',
              reportDate: payload.actualCompletionDate || payload.entryDate,
            })
          );
        }

        if (
          payload.status === 'Selesai & Siap Diambil' ||
          payload.status === 'Diserahkan / Faktur'
        ) {
          const revReportId = sanitizeDocId(`RPT-REV-${payload.id}`, 'RPT');
          const invNo =
            payload.invoiceNumber || `INV-MJT/${payload.spkNumber.replace('SPK-MJT-', '')}`;
          const netAmount = payload.netPayableTotal ?? payload.grandTotal;
          batch.set(
            doc(db, 'reports', revReportId),
            buildReportDoc(uid, {
              id: revReportId,
              reportType: 'REVENUE_INVOICE',
              title: `Laporan Faktur & Pendapatan ${invNo}`,
              referenceNumber: invNo,
              orderId: payload.id,
              customerCompany: payload.customerCompany,
              technicianOrActor: payload.technicianName,
              summary: `${payload.brand} ${payload.powerHp} HP · Status Bayar: ${payload.paymentStatus} · Net Tagihan Rp ${netAmount.toLocaleString('id-ID')}`,
              verdictOrStatus: payload.paymentStatus,
              amountRp: netAmount,
              copperKg: payload.windingData.copperWeightKg,
              meggerMOhm: meggerMin,
              metrics: {
                invoiceNumber: invNo,
                fakturPajakNumber: payload.fakturPajakNumber || '-',
                ppnPercent: payload.taxPpnPercent,
                ppnAmount: payload.taxPpnAmount,
                pphPercent: payload.taxPphPercent,
                pphAmount: payload.taxPphAmount,
                netPayableTotal: netAmount,
                downPayment: payload.downPayment,
                balanceDue: payload.balanceDue,
                wireSizeMm: payload.windingData.wireSizeMm,
                powerKw: payload.powerKw,
              },
              sourceAction: 'seed_initial_revenue',
              reportDate: payload.actualCompletionDate || payload.entryDate,
            })
          );
        }
      }

      await batch.commit();
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workOrders/seed');
    }
  },

  subscribeWorkshopData(
    user: User,
    callbacks: {
      onOrders: (orders: WorkOrder[]) => void;
      onCustomers: (customers: Customer[]) => void;
      onInventory: (items: InventoryItem[]) => void;
      onReports: (reports: WorkshopReport[]) => void;
      onSettings?: (settings: WorkshopSettings) => void;
      onError?: (err: Error) => void;
    }
  ): Unsubscribe {
    const uid = user.uid;
    const isAdminUser = isBootstrappedAdminEmail(user);

    const woQuery = isAdminUser
      ? query(collection(db, 'workOrders'))
      : query(collection(db, 'workOrders'), where('ownerId', '==', uid));
    const custQuery = isAdminUser
      ? query(collection(db, 'customers'))
      : query(collection(db, 'customers'), where('ownerId', '==', uid));
    const invQuery = isAdminUser
      ? query(collection(db, 'inventory'))
      : query(collection(db, 'inventory'), where('ownerId', '==', uid));
    const rptQuery = isAdminUser
      ? query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(250))
      : query(collection(db, 'reports'), where('ownerId', '==', uid), limit(250));

    const unsubWo = onSnapshot(
      woQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as WorkOrder)
          .sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
        callbacks.onOrders(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'workOrders');
        } catch (wrapped) {
          callbacks.onError?.(wrapped as Error);
        }
      }
    );

    const unsubCust = onSnapshot(
      custQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Customer)
          .sort((a, b) => a.company.localeCompare(b.company));
        callbacks.onCustomers(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'customers');
        } catch (wrapped) {
          callbacks.onError?.(wrapped as Error);
        }
      }
    );

    const unsubInv = onSnapshot(
      invQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as InventoryItem)
          .sort((a, b) => a.code.localeCompare(b.code));
        callbacks.onInventory(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'inventory');
        } catch (wrapped) {
          callbacks.onError?.(wrapped as Error);
        }
      }
    );

    const getMillis = (ts: unknown): number => {
      if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as any).toMillis === 'function') {
        return (ts as any).toMillis();
      }
      return 0;
    };

    const unsubRpt = onSnapshot(
      rptQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as WorkshopReport)
          .sort((a, b) => {
            const diff = getMillis(b.createdAt) - getMillis(a.createdAt);
            if (diff !== 0) return diff;
            return (b.reportDate || '').localeCompare(a.reportDate || '');
          });
        callbacks.onReports(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'reports');
        } catch (wrapped) {
          callbacks.onError?.(wrapped as Error);
        }
      }
    );

    const settingsRef = doc(db, 'workshopSettings', uid);
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<WorkshopSettings>;
          callbacks.onSettings?.({
            monthlySpkTarget: Math.round(clampNum(data.monthlySpkTarget, 1, 500)) || 6,
            perTechMonthlyTarget: Math.round(clampNum(data.perTechMonthlyTarget, 1, 200)) || 2,
            googleSpreadsheetId: typeof data.googleSpreadsheetId === 'string' ? data.googleSpreadsheetId : '',
            googleSpreadsheetTitle: typeof data.googleSpreadsheetTitle === 'string' ? data.googleSpreadsheetTitle : '',
            googleSpreadsheetUrl: typeof data.googleSpreadsheetUrl === 'string' ? data.googleSpreadsheetUrl : '',
            googleSheetsAutoSync: Boolean(data.googleSheetsAutoSync),
            updatedBy: data.updatedBy,
          });
        } else {
          callbacks.onSettings?.({
            monthlySpkTarget: 6,
            perTechMonthlyTarget: 2,
            googleSpreadsheetId: '',
            googleSpreadsheetTitle: '',
            googleSpreadsheetUrl: '',
            googleSheetsAutoSync: false,
          });
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `workshopSettings/${uid}`);
        } catch (wrapped) {
          callbacks.onError?.(wrapped as Error);
        }
      }
    );

    return () => {
      unsubWo();
      unsubCust();
      unsubInv();
      unsubRpt();
      unsubSettings();
    };
  },

  async logAutomaticReport(uid: string, input: CreateReportInput): Promise<void> {
    const docData = buildReportDoc(uid, input);
    const path = `reports/${docData.id}`;
    try {
      await setDoc(doc(db, 'reports', docData.id), docData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async createWorkOrderWithReport(uid: string, newOrder: WorkOrder, actorName: string): Promise<void> {
    const payload = normalizeWorkOrderPayload(newOrder, uid);
    const now = new Date();
    const initialAudit: StatusAuditEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: now.toISOString(),
      formattedDate: formatAuditDateTime(now),
      newStatus: payload.status,
      updatedBy: clampNonEmptyStr(actorName, 120, payload.technicianName),
      notes: 'SPK baru dibuat & otomatis tersimpan ke database',
    };

    const enrichedPayload = {
      ...payload,
      statusAuditLog: payload.statusAuditLog.length > 0 ? payload.statusAuditLog : [initialAudit],
      lastStatusUpdated: payload.lastStatusUpdated || initialAudit.formattedDate,
      lastStatusUpdatedBy: payload.lastStatusUpdatedBy || initialAudit.updatedBy,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'workOrders', enrichedPayload.id), {
        ...enrichedPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const rpt = buildReportDoc(uid, {
        reportType: 'SPK_CREATED',
        title: `Laporan SPK Baru Masuk · ${enrichedPayload.brand} ${enrichedPayload.powerHp} HP`,
        referenceNumber: enrichedPayload.spkNumber,
        orderId: enrichedPayload.id,
        customerCompany: enrichedPayload.customerCompany,
        technicianOrActor: enrichedPayload.technicianName,
        summary: `Mesin ${enrichedPayload.machineType} (${enrichedPayload.powerKw} kW) · Keluhan: ${enrichedPayload.complaint}`,
        verdictOrStatus: enrichedPayload.status,
        amountRp: enrichedPayload.grandTotal,
        copperKg: enrichedPayload.windingData.copperWeightKg,
        meggerMOhm: enrichedPayload.inspection.meggerInitialBodyMOhm,
        metrics: {
          powerHp: enrichedPayload.powerHp,
          powerKw: enrichedPayload.powerKw,
          priority: enrichedPayload.priority,
          targetCompletionDate: enrichedPayload.targetCompletionDate,
        },
        sourceAction: 'auto_create_spk',
        reportDate: enrichedPayload.entryDate,
      });
      batch.set(doc(db, 'reports', rpt.id), rpt);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `workOrders/${enrichedPayload.id}`);
    }
  },

  async updateWorkOrderWithAutoReports(
    uid: string,
    prevOrder: WorkOrder | undefined,
    updatedOrder: WorkOrder,
    actorName: string
  ): Promise<void> {
    const ownerId = (prevOrder as (WorkOrder & { ownerId?: string }) | undefined)?.ownerId || uid;
    const payload = normalizeWorkOrderPayload(updatedOrder, ownerId);
    const now = new Date();
    const formattedNow = formatAuditDateTime(now);

    const statusChanged = prevOrder ? prevOrder.status !== payload.status : false;
    let nextAuditLog = payload.statusAuditLog;
    let nextLastUpdated = payload.lastStatusUpdated;
    let nextLastBy = payload.lastStatusUpdatedBy;

    if (statusChanged && prevOrder) {
      const entry: Required<StatusAuditEntry> = {
        id: `AUD-${Date.now()}`,
        timestamp: now.toISOString(),
        formattedDate: formattedNow,
        previousStatus: prevOrder.status,
        newStatus: payload.status,
        updatedBy: clampNonEmptyStr(actorName, 120, payload.technicianName),
        notes: `Perubahan status SPK dari ${prevOrder.status} ke ${payload.status}`,
      };
      nextAuditLog = [entry, ...payload.statusAuditLog].slice(0, 100);
      nextLastUpdated = formattedNow;
      nextLastBy = entry.updatedBy;
    }

    const { id: _id, ownerId: _ownerId, ...mutableFields } = {
      ...payload,
      statusAuditLog: nextAuditLog,
      lastStatusUpdated: nextLastUpdated,
      lastStatusUpdatedBy: nextLastBy,
    };

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'workOrders', payload.id), {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });

      const qcChanged =
        !prevOrder ||
        JSON.stringify(prevOrder.qcReport) !== JSON.stringify(updatedOrder.qcReport);
      const billingChanged =
        !prevOrder ||
        prevOrder.grandTotal !== updatedOrder.grandTotal ||
        prevOrder.downPayment !== updatedOrder.downPayment ||
        prevOrder.paymentStatus !== updatedOrder.paymentStatus ||
        prevOrder.taxPpnPercent !== updatedOrder.taxPpnPercent ||
        (prevOrder.taxPphPercent ?? 0) !== (updatedOrder.taxPphPercent ?? 0) ||
        (prevOrder.invoiceNumber ?? '') !== (updatedOrder.invoiceNumber ?? '') ||
        (prevOrder.fakturPajakNumber ?? '') !== (updatedOrder.fakturPajakNumber ?? '') ||
        (statusChanged &&
          (payload.status === 'Selesai & Siap Diambil' ||
            payload.status === 'Diserahkan / Faktur'));

      if (statusChanged && prevOrder) {
        const statusRpt = buildReportDoc(uid, {
          reportType: 'STATUS_AUDIT',
          title: `Laporan Progres Status ${payload.spkNumber}`,
          referenceNumber: payload.spkNumber,
          orderId: payload.id,
          customerCompany: payload.customerCompany,
          technicianOrActor: nextLastBy || actorName,
          summary: `Status berpindah dari "${prevOrder.status}" menjadi "${payload.status}".`,
          verdictOrStatus: payload.status,
          amountRp: payload.grandTotal,
          copperKg: payload.windingData.copperWeightKg,
          meggerMOhm: payload.qcReport.meggerPhaseBodyMOhm.uBody,
          metrics: {
            previousStatus: prevOrder.status,
            newStatus: payload.status,
          },
          sourceAction: 'auto_status_audit',
        });
        batch.set(doc(db, 'reports', statusRpt.id), statusRpt);
      }

      if (qcChanged && (payload.qcReport.meggerPhaseBodyMOhm.uBody > 0 || payload.qcReport.testedBy)) {
        const minMegger = Math.min(
          payload.qcReport.meggerPhaseBodyMOhm.uBody || 0,
          payload.qcReport.meggerPhaseBodyMOhm.vBody || 0,
          payload.qcReport.meggerPhaseBodyMOhm.wBody || 0
        );
        const qcRpt = buildReportDoc(uid, {
          reportType: 'QC_MEGGER_TEST',
          title: `Laporan Hasil Uji QC & Megger · ${payload.spkNumber}`,
          referenceNumber: `QC-MJT/${payload.spkNumber.replace('SPK-MJT-', '')}`,
          orderId: payload.id,
          customerCompany: payload.customerCompany,
          technicianOrActor: payload.qcReport.testedBy || actorName,
          summary: `Isolasi U/V/W-Bodi min ${minMegger} MΩ · Arus R/S/T: ${payload.qcReport.noLoadTest.currentR}/${payload.qcReport.noLoadTest.currentS}/${payload.qcReport.noLoadTest.currentT} A · Vibrasi ${payload.qcReport.noLoadTest.bearingVibrationMmS} mm/s`,
          verdictOrStatus: payload.qcReport.summaryVerdict,
          amountRp: payload.grandTotal,
          copperKg: payload.windingData.copperWeightKg,
          meggerMOhm: minMegger,
          metrics: {
            meggerUBody: payload.qcReport.meggerPhaseBodyMOhm.uBody,
            meggerVBody: payload.qcReport.meggerPhaseBodyMOhm.vBody,
            meggerWBody: payload.qcReport.meggerPhaseBodyMOhm.wBody,
            vibrationMmS: payload.qcReport.noLoadTest.bearingVibrationMmS,
            bearingTempC: payload.qcReport.noLoadTest.bearingTempC,
          },
          sourceAction: 'auto_qc_report',
        });
        batch.set(doc(db, 'reports', qcRpt.id), qcRpt);
      }

      if (billingChanged) {
        const invNo =
          payload.invoiceNumber || `INV-MJT/${payload.spkNumber.replace('SPK-MJT-', '')}`;
        const taxNote =
          payload.taxPpnPercent > 0 || payload.taxPphPercent > 0
            ? ` · PPN ${payload.taxPpnPercent}% (Rp ${payload.taxPpnAmount.toLocaleString('id-ID')}) · PPh ${payload.taxPphPercent}% (Rp ${payload.taxPphAmount.toLocaleString('id-ID')}) · Net Rp ${payload.netPayableTotal.toLocaleString('id-ID')}`
            : '';
        const revRpt = buildReportDoc(uid, {
          reportType: 'REVENUE_INVOICE',
          title: `Laporan Keuangan & Faktur · ${invNo}`,
          referenceNumber: invNo,
          orderId: payload.id,
          customerCompany: payload.customerCompany,
          technicianOrActor: actorName,
          summary: `Total Bruto Rp ${payload.grandTotal.toLocaleString('id-ID')}${taxNote} · DP Rp ${payload.downPayment.toLocaleString('id-ID')} · Sisa Rp ${payload.balanceDue.toLocaleString('id-ID')} (${payload.paymentStatus})`,
          verdictOrStatus: payload.paymentStatus,
          amountRp: payload.netPayableTotal,
          copperKg: payload.windingData.copperWeightKg,
          meggerMOhm: payload.qcReport.meggerPhaseBodyMOhm.uBody,
          metrics: {
            invoiceNumber: invNo,
            fakturPajakNumber: payload.fakturPajakNumber || '-',
            ppnPercent: payload.taxPpnPercent,
            ppnAmount: payload.taxPpnAmount,
            pphPercent: payload.taxPphPercent,
            pphAmount: payload.taxPphAmount,
            netPayableTotal: payload.netPayableTotal,
            downPayment: payload.downPayment,
            balanceDue: payload.balanceDue,
            discount: payload.discount,
          },
          sourceAction: 'auto_billing_report',
        });
        batch.set(doc(db, 'reports', revRpt.id), revRpt);
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workOrders/${payload.id}`);
    }
  },

  async quickUpdateStatusWithReport(
    uid: string,
    targetOrder: WorkOrder,
    newStatus: OrderStatus,
    actorName: string
  ): Promise<void> {
    const ownerId = (targetOrder as WorkOrder & { ownerId?: string }).ownerId || uid;
    const now = new Date();
    const formattedNow = formatAuditDateTime(now);
    const actualDate =
      newStatus === 'Selesai & Siap Diambil' || newStatus === 'Diserahkan / Faktur'
        ? now.toISOString().split('T')[0]
        : targetOrder.actualCompletionDate || '';

    const auditEntry: StatusAuditEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: now.toISOString(),
      formattedDate: formattedNow,
      previousStatus: targetOrder.status,
      newStatus,
      updatedBy: clampNonEmptyStr(actorName, 120, targetOrder.technicianName || 'Teknisi'),
      notes: `Pembaruan status cepat ke ${newStatus}`,
    };

    const nextLog = [auditEntry, ...(targetOrder.statusAuditLog || [])].slice(0, 100);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'workOrders', sanitizeDocId(targetOrder.id, 'WO')), {
        status: newStatus,
        actualCompletionDate: clampStr(actualDate, 32, ''),
        statusAuditLog: nextLog,
        lastStatusUpdated: clampStr(formattedNow, 80, ''),
        lastStatusUpdatedBy: clampStr(auditEntry.updatedBy, 120, ''),
        updatedAt: serverTimestamp(),
      });

      const statusRpt = buildReportDoc(uid, {
        reportType: 'STATUS_AUDIT',
        title: `Laporan Progres Status ${targetOrder.spkNumber}`,
        referenceNumber: targetOrder.spkNumber,
        orderId: targetOrder.id,
        customerCompany: targetOrder.customerCompany,
        technicianOrActor: auditEntry.updatedBy,
        summary: `Status berpindah dari "${targetOrder.status}" menjadi "${newStatus}".`,
        verdictOrStatus: newStatus,
        amountRp: targetOrder.grandTotal,
        copperKg: targetOrder.windingData.copperWeightKg,
        meggerMOhm: targetOrder.qcReport.meggerPhaseBodyMOhm.uBody || 0,
        metrics: {
          previousStatus: targetOrder.status,
          newStatus,
        },
        sourceAction: 'auto_quick_status',
      });
      batch.set(doc(db, 'reports', statusRpt.id), statusRpt);

      if (newStatus === 'Selesai & Siap Diambil' || newStatus === 'Diserahkan / Faktur') {
        const invNo =
          targetOrder.invoiceNumber || `INV-MJT/${targetOrder.spkNumber.replace('SPK-MJT-', '')}`;
        const netAmount = targetOrder.netPayableTotal ?? targetOrder.grandTotal;
        const revRpt = buildReportDoc(uid, {
          reportType: 'REVENUE_INVOICE',
          title: `Laporan Penyelesaian & Pendapatan ${invNo}`,
          referenceNumber: invNo,
          orderId: targetOrder.id,
          customerCompany: targetOrder.customerCompany,
          technicianOrActor: auditEntry.updatedBy,
          summary: `Unit selesai (${newStatus}) · Tagihan Net Rp ${netAmount.toLocaleString('id-ID')} · Kawat ${targetOrder.windingData.copperWeightKg} kg`,
          verdictOrStatus: targetOrder.paymentStatus,
          amountRp: netAmount,
          copperKg: targetOrder.windingData.copperWeightKg,
          meggerMOhm: targetOrder.qcReport.meggerPhaseBodyMOhm.uBody || 0,
          metrics: {
            invoiceNumber: invNo,
            fakturPajakNumber: targetOrder.fakturPajakNumber || '-',
            ppnPercent: targetOrder.taxPpnPercent ?? 0,
            ppnAmount: targetOrder.taxPpnAmount ?? 0,
            pphPercent: targetOrder.taxPphPercent ?? 0,
            pphAmount: targetOrder.taxPphAmount ?? 0,
            netPayableTotal: netAmount,
            downPayment: targetOrder.downPayment,
            balanceDue: targetOrder.balanceDue,
            status: newStatus,
          },
          sourceAction: 'auto_completion_revenue',
        });
        batch.set(doc(db, 'reports', revRpt.id), revRpt);
      }

      // Ensure ownerId is unused cleanly
      void ownerId;
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workOrders/${targetOrder.id}`);
    }
  },

  async deleteWorkOrderInDb(orderId: string): Promise<void> {
    const safeId = sanitizeDocId(orderId, 'WO');
    try {
      await deleteDoc(doc(db, 'workOrders', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workOrders/${safeId}`);
    }
  },

  async logDocumentPrintReport(
    uid: string,
    order: WorkOrder,
    docType: 'spk' | 'qc' | 'invoice',
    actorName: string
  ): Promise<void> {
    const labelMap = {
      spk: 'SPK Workshop',
      qc: 'Sertifikat QC & Megger',
      invoice: 'Faktur / Invoice Resmi',
    };
    const invNo =
      order.invoiceNumber || `INV-MJT/${order.spkNumber.replace('SPK-MJT-', '')}`;
    const netAmount = order.netPayableTotal ?? order.grandTotal;
    const refMap = {
      spk: order.spkNumber,
      qc: `QC-MJT/${order.spkNumber.replace('SPK-MJT-', '')}`,
      invoice: invNo,
    };

    await this.logAutomaticReport(uid, {
      reportType: 'DOCUMENT_EXPORTED',
      title: `Arsip Cetak / PDF ${labelMap[docType]} · ${order.spkNumber}`,
      referenceNumber: refMap[docType],
      orderId: order.id,
      customerCompany: order.customerCompany,
      technicianOrActor: actorName,
      summary: `Dokumen ${labelMap[docType]} untuk ${order.brand} ${order.powerHp} HP dicetak / diekspor ke PDF.`,
      verdictOrStatus: 'Tercetak / PDF',
      amountRp: docType === 'invoice' ? netAmount : 0,
      copperKg: order.windingData.copperWeightKg,
      meggerMOhm: docType === 'qc' ? order.qcReport.meggerPhaseBodyMOhm.uBody || 0 : 0,
      metrics: {
        docType,
        spkNumber: order.spkNumber,
        invoiceNumber: invNo,
        fakturPajakNumber: order.fakturPajakNumber || '-',
      },
      sourceAction: 'auto_print_pdf',
    });
  },

  async syncInventoryChangesWithReports(
    uid: string,
    prevList: InventoryItem[],
    nextList: InventoryItem[],
    actorName: string
  ): Promise<void> {
    const prevMap = new Map(prevList.map((item) => [item.id, item]));
    const nextMap = new Map(nextList.map((item) => [item.id, item]));

    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const nextItem of nextList) {
        const prevItem = prevMap.get(nextItem.id);
        const ownerId = (prevItem as (InventoryItem & { ownerId?: string }) | undefined)?.ownerId || uid;
        const payload = normalizeInventoryPayload(nextItem, ownerId);

        if (!prevItem) {
          hasChanges = true;
          batch.set(doc(db, 'inventory', payload.id), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          const rpt = buildReportDoc(uid, {
            reportType: 'INVENTORY_ADJUSTMENT',
            title: `Material Baru Ditambahkan · ${payload.name}`,
            referenceNumber: payload.code,
            customerCompany: payload.supplier || 'Gudang Workshop',
            technicianOrActor: actorName,
            summary: `Stok awal ${payload.currentStock} ${payload.unit} (${payload.category}) · Min Alert: ${payload.minStockAlert} ${payload.unit}`,
            verdictOrStatus: 'Item Baru',
            copperKg: payload.category === 'Kawat Tembaga' ? payload.currentStock : 0,
            metrics: {
              stockAfter: payload.currentStock,
              unitCost: payload.unitCost,
            },
            sourceAction: 'auto_inventory_create',
          });
          batch.set(doc(db, 'reports', rpt.id), rpt);
        } else if (JSON.stringify(prevItem) !== JSON.stringify(nextItem)) {
          hasChanges = true;
          const { id: _id, ownerId: _ownerId, ...mutable } = payload;
          batch.update(doc(db, 'inventory', payload.id), {
            ...mutable,
            updatedAt: serverTimestamp(),
          });
          const diff = Number((payload.currentStock - prevItem.currentStock).toFixed(2));
          const rpt = buildReportDoc(uid, {
            reportType: 'INVENTORY_ADJUSTMENT',
            title: `Laporan Mutasi Stok · ${payload.name}`,
            referenceNumber: payload.code,
            customerCompany: payload.supplier || 'Gudang Workshop',
            technicianOrActor: actorName,
            summary: `Stok berubah ${diff >= 0 ? `+${diff}` : diff} ${payload.unit} (dari ${prevItem.currentStock} menjadi ${payload.currentStock} ${payload.unit}).`,
            verdictOrStatus:
              payload.currentStock <= payload.minStockAlert ? 'Stok Kritis' : 'Stok Aman',
            copperKg: payload.category === 'Kawat Tembaga' ? payload.currentStock : 0,
            metrics: {
              stockBefore: prevItem.currentStock,
              stockAfter: payload.currentStock,
              delta: diff,
            },
            sourceAction: 'auto_inventory_adjust',
          });
          batch.set(doc(db, 'reports', rpt.id), rpt);
        }
      }

      for (const prevItem of prevList) {
        if (!nextMap.has(prevItem.id)) {
          hasChanges = true;
          batch.delete(doc(db, 'inventory', sanitizeDocId(prevItem.id, 'INV')));
          const rpt = buildReportDoc(uid, {
            reportType: 'INVENTORY_ADJUSTMENT',
            title: `Material Dihapus · ${prevItem.name}`,
            referenceNumber: prevItem.code,
            customerCompany: prevItem.supplier || 'Gudang Workshop',
            technicianOrActor: actorName,
            summary: `Item ${prevItem.name} (${prevItem.code}) dihapus dari inventaris bengkel.`,
            verdictOrStatus: 'Dihapus',
            sourceAction: 'auto_inventory_delete',
          });
          batch.set(doc(db, 'reports', rpt.id), rpt);
        }
      }

      if (hasChanges) {
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory');
    }
  },

  async syncCustomerChangesWithReports(
    uid: string,
    prevList: Customer[],
    nextList: Customer[],
    actorName: string
  ): Promise<void> {
    const prevMap = new Map(prevList.map((c) => [c.id, c]));
    const nextMap = new Map(nextList.map((c) => [c.id, c]));

    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const nextCust of nextList) {
        const prevCust = prevMap.get(nextCust.id);
        const ownerId = (prevCust as (Customer & { ownerId?: string }) | undefined)?.ownerId || uid;
        const payload = normalizeCustomerPayload(nextCust, ownerId);

        if (!prevCust) {
          hasChanges = true;
          batch.set(doc(db, 'customers', payload.id), {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          const rpt = buildReportDoc(uid, {
            reportType: 'CUSTOMER_ADDED',
            title: `Laporan Pelanggan Baru · ${payload.company}`,
            referenceNumber: payload.id,
            customerCompany: payload.company,
            technicianOrActor: actorName,
            summary: `PIC: ${payload.name} · Telp: ${payload.phone} · Kota: ${payload.city}`,
            verdictOrStatus: 'Terdaftar',
            metrics: {
              city: payload.city,
            },
            sourceAction: 'auto_customer_create',
          });
          batch.set(doc(db, 'reports', rpt.id), rpt);
        } else if (JSON.stringify(prevCust) !== JSON.stringify(nextCust)) {
          hasChanges = true;
          const { id: _id, ownerId: _ownerId, ...mutable } = payload;
          batch.update(doc(db, 'customers', payload.id), {
            ...mutable,
            updatedAt: serverTimestamp(),
          });
        }
      }

      for (const prevCust of prevList) {
        if (!nextMap.has(prevCust.id)) {
          hasChanges = true;
          batch.delete(doc(db, 'customers', sanitizeDocId(prevCust.id, 'CUST')));
        }
      }

      if (hasChanges) {
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    }
  },

  async restoreBackupToFirestore(
    uid: string,
    parsed: { workOrders: WorkOrder[]; customers: Customer[]; inventory: InventoryItem[] },
    actorName: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const c of parsed.customers) {
        const p = normalizeCustomerPayload(c, uid);
        batch.set(doc(db, 'customers', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const i of parsed.inventory) {
        const p = normalizeInventoryPayload(i, uid);
        batch.set(doc(db, 'inventory', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const wo of parsed.workOrders) {
        const p = normalizeWorkOrderPayload(wo, uid);
        batch.set(doc(db, 'workOrders', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      const rpt = buildReportDoc(uid, {
        reportType: 'SPK_CREATED',
        title: 'Restore Backup Database JSON ke Firestore',
        referenceNumber: `RST-${Date.now()}`,
        customerCompany: 'CV. Mustofa Jaya Teknik',
        technicianOrActor: actorName,
        summary: `Memulihkan ${parsed.workOrders.length} SPK, ${parsed.customers.length} pelanggan, dan ${parsed.inventory.length} item stok.`,
        verdictOrStatus: 'Berhasil',
        sourceAction: 'auto_restore_backup',
      });
      batch.set(doc(db, 'reports', rpt.id), rpt);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'restoreBackup');
    }
  },

  async saveWorkshopSettings(
    uid: string,
    settings: WorkshopSettings,
    actorName: string
  ): Promise<void> {
    const safeId = sanitizeDocId(uid, 'USR');
    const settingsRef = doc(db, 'workshopSettings', safeId);
    const monthlySpkTarget = Math.round(clampNum(settings.monthlySpkTarget, 1, 500));
    const perTechMonthlyTarget = Math.round(clampNum(settings.perTechMonthlyTarget, 1, 200));
    const googleSpreadsheetId = clampStr(settings.googleSpreadsheetId, 200, '');
    const googleSpreadsheetTitle = clampStr(settings.googleSpreadsheetTitle, 200, '');
    const googleSpreadsheetUrl = clampStr(settings.googleSpreadsheetUrl, 500, '');
    const googleSheetsAutoSync = Boolean(settings.googleSheetsAutoSync);
    const updatedBy = clampNonEmptyStr(actorName, 120, 'Operator Workshop');

    try {
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        await updateDoc(settingsRef, {
          monthlySpkTarget,
          perTechMonthlyTarget,
          googleSpreadsheetId,
          googleSpreadsheetTitle,
          googleSpreadsheetUrl,
          googleSheetsAutoSync,
          updatedBy,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(settingsRef, {
          id: safeId,
          ownerId: safeId,
          monthlySpkTarget,
          perTechMonthlyTarget,
          googleSpreadsheetId,
          googleSpreadsheetTitle,
          googleSpreadsheetUrl,
          googleSheetsAutoSync,
          updatedBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workshopSettings/${safeId}`);
    }
  },
};
