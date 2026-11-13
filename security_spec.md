# Security Specification & Payload-First TDD (`CV. Mustofa Jaya Teknik`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false`).
2. **Identity & Ownership Integrity**: Every `workOrders`, `customers`, `inventory`, and `reports` document MUST carry `ownerId == request.auth.uid` on creation, and `ownerId` and `createdAt` are strictly immutable on update.
3. **Verified Email Enforcement**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
4. **Bootstrapped Admin & Role Escalation Prevention**: Only verified email `cvmustofaj@gmail.com` or an existing `/admins/{uid}` document passes `isAdmin()`. Users cannot self-assign `role: 'admin'` on `/users/{userId}` creation or modify `role` on update unless they are already an admin.
5. **PII Isolation**: User email is isolated in `/users/{userId}/private/{infoId}` and restricted to `isOwner(userId) || isAdmin()`. Customer and WorkOrder records containing phone/address PII are strictly restricted to `isOwner(existing().ownerId) || isAdmin()`, with zero blanket `isSignedIn()` reads.
6. **Zero Query Trust & Cost Optimization**: Every `allow list` rule evaluates `existing().ownerId == request.auth.uid || isBootstrappedAdmin()` (zero `get()`/`exists()` reads inside `allow list`).
7. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
8. **Terminal State Locking**: A `workOrders` document with `status == 'Diserahkan / Faktur'` cannot be modified by non-admins. Automatic `/reports/{reportId}` records are immutable (`allow update: if false`).
9. **Path Variable & Payload Size Hardening**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`size() <= 128`), all strings enforce bounded `.size()`, and all arrays (`serviceItems <= 50`, `statusAuditLog <= 100`) are bounded with element type checks.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)

1. **Unauthenticated Read/Write**: Read `/workOrders/WO-2026-001` with `auth: null`.
2. **Unverified Email Write**: Create `/workOrders/WO-999` with `email_verified: false`.
3. **Admin Email Spoofing**: Read `/workOrders/WO-2026-001` with `{ email: 'cvmustofaj@gmail.com', email_verified: false }`.
4. **Privilege Escalation on Signup**: User `u1` creates `/users/u1` with `{ uid: 'u1', displayName: 'Attacker', role: 'admin', ... }`.
5. **Self-Role Update Escalation**: User `u1` updates `/users/u1` changing `role` from `'operator'` to `'admin'`.
6. **Shadow / Ghost Field Injection**: User `u1` creates `/reports/RPT-1` including extra field `isBypassed: true`.
7. **Cross-Tenant Identity Spoofing**: User `u1` creates `/workOrders/WO-2` with `ownerId: 'u2'`.
8. **PII Blanket Read / Cross-Tenant Get**: User `u2` reads `/customers/CUST-001` or `/users/u1/private/info` owned by `u1`.
9. **Client-Spoofed Timestamp**: User `u1` creates `/reports/RPT-2` with client-forged `createdAt: Timestamp.fromDate(new Date('2020-01-01'))` instead of `serverTimestamp()`.
10. **ID Poisoning / Oversized String**: User `u1` creates `/inventory/invalid$id!123` or sends a 2,000-character `complaint` string in `/workOrders/WO-3`.
11. **Terminal State Bypass & Report Tampering**: Non-admin `u1` updates `/workOrders/WO-DONE` (where `existing().status == 'Diserahkan / Faktur'`) or updates `/reports/RPT-1`.
12. **Unbounded Array / Invalid Element Poisoning**: User `u1` creates `/workOrders/WO-4` with `serviceItems: ["not-a-map"]` or 51 items.
