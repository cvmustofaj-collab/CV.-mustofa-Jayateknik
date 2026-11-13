import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
  UserPlus,
  CheckCircle2,
  Ban,
  Trash2,
  Save,
  Eye,
  Lock,
  Unlock,
  Mail,
  Building2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { AccountInvite, AccountStatus, AppUserAccount, UserRole } from '../types/rewinding';
import { ADMIN_EMAIL, firestoreService } from '../services/firestoreService';
import { useToast } from '../context/ToastContext';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  userAccount: AppUserAccount | null;
  isActualAdmin: boolean;
  isBootstrappedAdmin: boolean;
  effectiveRole: UserRole;
  previewAsUser: boolean;
  onTogglePreviewAsUser: (val: boolean) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  operator: 'User · Operator',
  technician: 'User · Teknisi',
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: 'bg-amber-100 text-amber-900 border-amber-300',
  operator: 'bg-sky-100 text-sky-900 border-sky-300',
  technician: 'bg-indigo-100 text-indigo-900 border-indigo-300',
};

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  userAccount,
  isActualAdmin,
  isBootstrappedAdmin,
  effectiveRole,
  previewAsUser,
  onTogglePreviewAsUser,
}) => {
  const toast = useToast();

  const [activeModalTab, setActiveModalTab] = useState<'profile' | 'directory'>(
    isActualAdmin ? 'directory' : 'profile'
  );

  // Own profile form
  const [ownDisplayName, setOwnDisplayName] = useState(
    userAccount?.displayName || user.displayName || ''
  );
  const [ownDepartment, setOwnDepartment] = useState(userAccount?.department || '');
  const [isSavingOwn, setIsSavingOwn] = useState(false);

  // Admin directory state
  const [registeredUsers, setRegisteredUsers] = useState<AppUserAccount[]>([]);
  const [invites, setInvites] = useState<AccountInvite[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Draft edits per registered user UID
  const [draftEdits, setDraftEdits] = useState<
    Record<string, { displayName: string; role: UserRole; status: AccountStatus; department: string }>
  >({});

  // New Account / Invite form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [newDepartment, setNewDepartment] = useState('Teknisi & Operator Bengkel');
  const [newStatus, setNewStatus] = useState<AccountStatus>('active');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  useEffect(() => {
    setOwnDisplayName(userAccount?.displayName || user.displayName || '');
    setOwnDepartment(userAccount?.department || '');
  }, [userAccount, user.displayName]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveModalTab(isActualAdmin ? 'directory' : 'profile');
  }, [isOpen, isActualAdmin]);

  const loadDirectory = async () => {
    if (!isActualAdmin) return;
    setIsLoadingDirectory(true);
    try {
      const result = await firestoreService.listAllUserAccountsForAdmin();
      setRegisteredUsers(result.users);
      setInvites(result.invites);
      const nextDrafts: Record<
        string,
        { displayName: string; role: UserRole; status: AccountStatus; department: string }
      > = {};
      result.users.forEach((acc) => {
        nextDrafts[acc.uid] = {
          displayName: acc.displayName,
          role: acc.role,
          status: acc.status,
          department: acc.department || '',
        };
      });
      setDraftEdits(nextDrafts);
    } catch {
      toast.error(
        'Gagal memuat daftar akun dari database Firestore.',
        'Gagal Memuat Akun'
      );
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  useEffect(() => {
    if (isOpen && isActualAdmin) {
      void loadDirectory();
    }
  }, [isOpen, isActualAdmin]);

  if (!isOpen) return null;

  const handleSaveOwnProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownDisplayName.trim()) {
      toast.warning('Nama tampilan tidak boleh kosong.', 'Validasi');
      return;
    }
    setIsSavingOwn(true);
    try {
      await firestoreService.updateOwnUserProfile(user.uid, {
        displayName: ownDisplayName.trim(),
        department: ownDepartment.trim(),
      });
      toast.success('Profil akun Anda berhasil diperbarui.', 'Profil Disimpan');
    } catch {
      toast.error('Gagal menyimpan pembaruan profil.', 'Gagal Simpan');
    } finally {
      setIsSavingOwn(false);
    }
  };

  const handleSaveUserRow = async (target: AppUserAccount) => {
    const draft = draftEdits[target.uid];
    if (!draft) return;
    if (!draft.displayName.trim()) {
      toast.warning('Nama pengguna tidak boleh kosong.', 'Validasi');
      return;
    }

    setSavingUid(target.uid);
    try {
      await firestoreService.updateUserAccountByAdmin(user, target, {
        displayName: draft.displayName.trim(),
        role: draft.role,
        status: draft.status,
        department: draft.department.trim(),
      });
      toast.success(
        `Akun ${draft.displayName} diperbarui menjadi ${ROLE_LABELS[draft.role]} (${draft.status === 'active' ? 'Aktif' : 'Nonaktif'}).`,
        'Akun Diperbarui'
      );
      await loadDirectory();
    } catch {
      toast.error('Gagal memperbarui hak akses akun.', 'Gagal Update');
    } finally {
      setSavingUid(null);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanName = newName.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.warning('Masukkan alamat email Google yang valid.', 'Email Tidak Valid');
      return;
    }
    if (!cleanName) {
      toast.warning('Masukkan nama lengkap pemilik akun.', 'Nama Wajib Diisi');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      await firestoreService.saveAccountInvite(user.uid, {
        email: cleanEmail,
        displayName: cleanName,
        role: newRole,
        department: newDepartment.trim() || 'Operasional Workshop',
        status: newStatus,
      });
      toast.success(
        `Akun ${ROLE_LABELS[newRole]} untuk ${cleanEmail} berhasil ditambahkan.`,
        'Akun Terdaftar'
      );
      setNewEmail('');
      setNewName('');
      setNewRole('operator');
      setNewStatus('active');
      await loadDirectory();
    } catch {
      toast.error('Gagal mendaftarkan akun baru ke database.', 'Gagal Tambah Akun');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleDeleteInvite = async (invite: AccountInvite) => {
    setDeletingInviteId(invite.id);
    try {
      await firestoreService.deleteAccountInvite(invite.id);
      toast.info(`Undangan akun ${invite.email} dihapus.`, 'Undangan Dihapus');
      await loadDirectory();
    } catch {
      toast.error('Gagal menghapus data praregistrasi akun.', 'Gagal Hapus');
    } finally {
      setDeletingInviteId(null);
    }
  };

  const filteredUsers = registeredUsers.filter((acc) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      acc.displayName.toLowerCase().includes(q) ||
      (acc.email || '').toLowerCase().includes(q) ||
      (acc.department || '').toLowerCase().includes(q) ||
      ROLE_LABELS[acc.role].toLowerCase().includes(q)
    );
  });

  const adminCount = registeredUsers.filter((u) => u.role === 'admin').length;
  const standardUserCount = registeredUsers.filter((u) => u.role !== 'admin').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                effectiveRole === 'admin'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-sky-500 text-white'
              }`}
            >
              {effectiveRole === 'admin' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex flex-wrap items-center gap-2">
                <span>Manajemen Akun Administrator &amp; User</span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${ROLE_BADGE_CLASS[effectiveRole]}`}
                >
                  {ROLE_LABELS[effectiveRole]}
                </span>
                {previewAsUser && isActualAdmin && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/40">
                    Mode Pratinjau User
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Pengaturan peran akses (Administrator / User Operator &amp; Teknisi) CV. Mustofa Jaya Teknik
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1 pt-2">
            {isActualAdmin && (
              <button
                type="button"
                onClick={() => setActiveModalTab('directory')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeModalTab === 'directory'
                    ? 'border-amber-500 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Daftar Akun Admin &amp; User ({registeredUsers.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveModalTab('profile')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
                activeModalTab === 'profile'
                  ? 'border-amber-500 text-slate-900 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Profil &amp; Hak Akses Saya</span>
            </button>
          </div>

          {isActualAdmin && (
            <button
              type="button"
              onClick={() => onTogglePreviewAsUser(!previewAsUser)}
              className={`my-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                previewAsUser
                  ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Uji tampilan dan pembatasan hak akses untuk akun User biasa"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {previewAsUser ? 'Kembali ke Mode Administrator' : 'Simulasi Tampilan User'}
              </span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeModalTab === 'directory' && isActualAdmin ? (
            <>
              {/* Admin KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">Total Akun Login</div>
                  <div className="text-2xl font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
                    {registeredUsers.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[11px] font-medium text-amber-800">Akun Administrator</div>
                  <div className="text-2xl font-extrabold font-mono text-amber-700 mt-0.5 tabular-nums">
                    {adminCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200">
                  <div className="text-[11px] font-medium text-sky-800">Akun User (Operator/Teknisi)</div>
                  <div className="text-2xl font-extrabold font-mono text-sky-700 mt-0.5 tabular-nums">
                    {standardUserCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[11px] font-medium text-emerald-800">Praregistrasi Email</div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-0.5 tabular-nums">
                    {invites.length}
                  </div>
                </div>
              </div>

              {/* Add / Pre-register Account Form */}
              <form
                onSubmit={handleCreateInvite}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Tambah / Daftarkan Akun Baru (Administrator atau User)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Pengguna login memakai akun Google yang didaftarkan di bawah
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="cth: Agus Riyanto"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Email Akun Google
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="cth: teknisi@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tipe Akun / Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="operator">User · Operator Workshop</option>
                      <option value="technician">User · Teknisi Rewinding</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Divisi / Bagian
                    </label>
                    <input
                      type="text"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      placeholder="Teknisi / Admin"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSubmittingInvite}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      {isSubmittingInvite ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Simpan Akun</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Registered Users Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Daftar Akun Terdaftar di Database Firestore
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ubah role antara Administrator / User atau nonaktifkan akun sewaktu-waktu
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari nama, email, role..."
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-52"
                    />
                    <button
                      type="button"
                      onClick={() => void loadDirectory()}
                      disabled={isLoadingDirectory}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Segarkan daftar akun"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingDirectory ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {!isBootstrappedAdmin && registeredUsers.length <= 1 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    Catatan: Query daftar seluruh akun dikelola penuh oleh akun pemilik utama ({ADMIN_EMAIL}).
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Nama &amp; Email Akun</th>
                        <th className="py-2.5 px-3">Divisi / Bagian</th>
                        <th className="py-2.5 px-3">Role / Hak Akses</th>
                        <th className="py-2.5 px-3">Status Akun</th>
                        <th className="py-2.5 px-3 text-right">Simpan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingDirectory ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-amber-500" />
                            Memuat daftar akun...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            Tidak ada akun yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((acc) => {
                          const draft = draftEdits[acc.uid] || {
                            displayName: acc.displayName,
                            role: acc.role,
                            status: acc.status,
                            department: acc.department || '',
                          };
                          const isPrimaryOwner = acc.email === ADMIN_EMAIL;

                          return (
                            <tr key={acc.uid} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={draft.displayName}
                                    onChange={(e) =>
                                      setDraftEdits((prev) => ({
                                        ...prev,
                                        [acc.uid]: { ...draft, displayName: e.target.value },
                                      }))
                                    }
                                    className="font-bold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                  {isPrimaryOwner && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                      Pemilik Utama
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  <span>{acc.email || `UID: ${acc.uid}`}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={draft.department}
                                  onChange={(e) =>
                                    setDraftEdits((prev) => ({
                                      ...prev,
                                      [acc.uid]: { ...draft, department: e.target.value },
                                    }))
                                  }
                                  placeholder="Bagian..."
                                  className="text-xs bg-white border border-slate-200 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={draft.role}
                                  disabled={isPrimaryOwner || (!isBootstrappedAdmin && acc.role === 'admin')}
                                  onChange={(e) =>
                                    setDraftEdits((prev) => ({
                                      ...prev,
                                      [acc.uid]: { ...draft, role: e.target.value as UserRole },
                                    }))
                                  }
                                  className={`px-2 py-1 text-xs font-semibold rounded-lg border focus:outline-none ${
                                    draft.role === 'admin'
                                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                                      : 'bg-sky-50 border-sky-200 text-sky-900'
                                  } disabled:opacity-70`}
                                >
                                  <option value="operator">User · Operator</option>
                                  <option value="technician">User · Teknisi</option>
                                  {(isBootstrappedAdmin || acc.role === 'admin') && (
                                    <option value="admin">Administrator</option>
                                  )}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  disabled={isPrimaryOwner}
                                  onClick={() =>
                                    setDraftEdits((prev) => ({
                                      ...prev,
                                      [acc.uid]: {
                                        ...draft,
                                        status: draft.status === 'active' ? 'suspended' : 'active',
                                      },
                                    }))
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-60 ${
                                    draft.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}
                                >
                                  {draft.status === 'active' ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Aktif</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-3.5 h-3.5" />
                                      <span>Nonaktif</span>
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  disabled={savingUid === acc.uid}
                                  onClick={() => void handleSaveUserRow(acc)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[11px] font-bold rounded-lg transition-colors"
                                >
                                  {savingUid === acc.uid ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5 text-amber-400" />
                                  )}
                                  <span>Simpan</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pre-registered Invites List */}
              {invites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Daftar Praregistrasi / Undangan Akun ({invites.length})
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[680px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Nama &amp; Email</th>
                          <th className="py-2 px-3">Role Ditugaskan</th>
                          <th className="py-2 px-3">Divisi</th>
                          <th className="py-2 px-3">Status Aktivasi</th>
                          <th className="py-2 px-3 text-right">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {invites.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">{inv.displayName}</div>
                              <div className="font-mono text-slate-500">{inv.email}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded font-bold border text-[10px] ${ROLE_BADGE_CLASS[inv.role]}`}
                              >
                                {ROLE_LABELS[inv.role]}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-700">{inv.department || '-'}</td>
                            <td className="py-2 px-3">
                              {inv.claimedUid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Sudah Login Google</span>
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold">
                                  Menunggu Login Pertama
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                disabled={deletingInviteId === inv.id}
                                onClick={() => void handleDeleteInvite(inv)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus undangan akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* TAB: MY PROFILE & PERMISSIONS MATRIX */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Profile Card & Editor */}
                <form
                  onSubmit={handleSaveOwnProfile}
                  className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Identitas Akun Aktif
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${ROLE_BADGE_CLASS[effectiveRole]}`}
                    >
                      {ROLE_LABELS[effectiveRole]}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Email Terhubung
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{user.email}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Tampilan
                      </label>
                      <input
                        type="text"
                        value={ownDisplayName}
                        onChange={(e) => setOwnDisplayName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Divisi / Jabatan
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={ownDepartment}
                          onChange={(e) => setOwnDepartment(e.target.value)}
                          placeholder="cth: Teknisi Gulung / Admin Keuangan"
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingOwn}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {isSavingOwn ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Simpan Perubahan Profil</span>
                  </button>
                </form>

                {/* Role Permissions Matrix */}
                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Matriks Hak Akses (Administrator vs User)
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {[
                      { label: 'Buat SPK Baru, Input QC & Kalkulator Kawat', admin: true, user: true },
                      { label: 'Kelola Data Pelanggan & Stok Gudang', admin: true, user: true },
                      { label: 'Cetak SPK, Sertifikat QC & Faktur Invois', admin: true, user: true },
                      { label: 'Ubah / Buka Kunci SPK Status "Diserahkan / Faktur"', admin: true, user: false },
                      { label: 'Hapus SPK & Pengaturan Target Bulanan', admin: true, user: false },
                      { label: 'Restore Backup JSON & Reset Database', admin: true, user: false },
                      { label: 'Manajemen Akun Administrator & User', admin: true, user: false },
                    ].map((row) => (
                      <div key={row.label} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-700 font-medium">{row.label}</span>
                        <div className="flex items-center gap-2 shrink-0 text-[10px] font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              row.admin
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Unlock className="w-3 h-3" />
                            Admin
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              row.user
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-rose-50 text-rose-500'
                            }`}
                          >
                            {row.user ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                            User
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
