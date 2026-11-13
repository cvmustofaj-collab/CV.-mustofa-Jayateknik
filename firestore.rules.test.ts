/**
 * Payload-First Security Test Suite for CV. Mustofa Jaya Teknik Firestore Rules.
 * Verifies all "Dirty Dozen" attack payloads against the rules specification.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_TESTS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Unauthenticated Read of WorkOrder',
    collectionPath: 'workOrders/WO-2026-001',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isSignedIn() required on allow get',
  },
  {
    id: 2,
    name: 'Unverified Email Write Blocked',
    collectionPath: 'workOrders/WO-999',
    operation: 'create',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: false },
    payload: { id: 'WO-999', ownerId: 'tech1' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() requires email_verified == true',
  },
  {
    id: 3,
    name: 'Admin Email Spoofing with Unverified Email',
    collectionPath: 'workOrders/WO-2026-001',
    operation: 'get',
    auth: { uid: 'attacker1', email: 'cvmustofaj@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isBootstrappedAdmin() checks email_verified == true',
  },
  {
    id: 4,
    name: 'Privilege Escalation on User Profile Create',
    collectionPath: 'users/attacker1',
    operation: 'create',
    auth: { uid: 'attacker1', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker1',
      displayName: 'Attacker',
      role: 'admin',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "incoming().role in ['operator', 'technician'] || isBootstrappedAdmin()",
  },
  {
    id: 5,
    name: 'Self Role Update Escalation',
    collectionPath: 'users/tech1',
    operation: 'update',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: true },
    payload: { role: 'admin', updatedAt: 'SERVER_TIMESTAMP' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().role == existing().role && affectedKeys().hasOnly([displayName, updatedAt])',
  },
  {
    id: 6,
    name: 'Shadow / Ghost Field Injection in Report',
    collectionPath: 'reports/RPT-GHOST-1',
    operation: 'create',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: true },
    payload: {
      id: 'RPT-GHOST-1',
      ownerId: 'tech1',
      reportType: 'QC_MEGGER_TEST',
      isBypassed: true,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidReport() enforces strict keys().hasOnly(...)',
  },
  {
    id: 7,
    name: 'Cross-Tenant OwnerId Spoofing on Create',
    collectionPath: 'workOrders/WO-SPOOF-1',
    operation: 'create',
    auth: { uid: 'attacker1', email: 'attacker@example.com', email_verified: true },
    payload: { id: 'WO-SPOOF-1', ownerId: 'victim_uid' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().ownerId == request.auth.uid',
  },
  {
    id: 8,
    name: 'PII Cross-Tenant Read on Customers & Private User Info',
    collectionPath: 'customers/CUST-001',
    operation: 'get',
    auth: { uid: 'otherUser', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isOwner(existing().ownerId) || isAdmin()',
  },
  {
    id: 9,
    name: 'Client-Forged Timestamp on Report Creation',
    collectionPath: 'reports/RPT-TIME-1',
    operation: 'create',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: true },
    payload: {
      id: 'RPT-TIME-1',
      ownerId: 'tech1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time',
  },
  {
    id: 10,
    name: 'ID Poisoning with Invalid Characters',
    collectionPath: 'inventory/invalid$id!999',
    operation: 'create',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: true },
    payload: { id: 'invalid$id!999', ownerId: 'tech1' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId() regex ^[a-zA-Z0-9_\\-]+$ rejects special characters',
  },
  {
    id: 11,
    name: 'Immutable Report Update / Terminal WorkOrder Bypass',
    collectionPath: 'reports/RPT-1',
    operation: 'update',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: true },
    payload: { amountRp: 0 },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'allow update: if false on /reports; terminal status lock on /workOrders',
  },
  {
    id: 12,
    name: 'Unbounded Array or Invalid Element Type in serviceItems',
    collectionPath: 'workOrders/WO-ARR-1',
    operation: 'create',
    auth: { uid: 'tech1', email: 'tech@example.com', email_verified: true },
    payload: { id: 'WO-ARR-1', ownerId: 'tech1', serviceItems: ['malicious-string'] },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'data.serviceItems.size() <= 50 && (size() == 0 || data.serviceItems[0] is map)',
  },
];
