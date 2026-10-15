import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, User, Plus, Trash2, KeyRound, Edit2, AlertCircle, 
  Search, Copy, Lock, Check, Layers, Users, CheckCheck, X
} from 'lucide-react';
import { PERMISSION_MODULES, ALL_PERMISSION_IDS } from '@/config/permissions';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';

export type RoleRecord = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type UserRecord = {
  id: string;
  name: string;
  username: string;
  prefix?: string;
  role: string;
  roleName?: string;
  created_at: string;
};

const getRoleBadgeStyle = (roleId: string) => {
  switch (roleId) {
    case 'admin':
      return 'bg-rex-500/10 text-rex-400 border-rex-500/20';
    case 'manager':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'sales':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'finance':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'production':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'inventory':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-surface2 text-muted border-theme-subtle';
  }
};

const RoleBadge = ({ roleId, label }: { roleId: string; label?: string }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(roleId)}`}>
    {roleId === 'admin' ? <Shield size={10} /> : <User size={10} />}
    {label || roleId}
  </span>
);

const emptyUserForm = { name: '', username: '', password: '', role: 'user', prefix: '' };
const emptyRoleForm = { id: '', name: '', description: '', permissions: [] as string[] };

export const UserManagement = ({ initialTab }: { initialTab?: 'users' | 'roles' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Tab State
  const defaultTab = initialTab || (location.pathname.includes('/roles') ? 'roles' : 'users');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>(defaultTab);

  useEffect(() => {
    if (location.pathname.includes('/roles')) {
      setActiveTab('roles');
    } else if (location.pathname.includes('/users')) {
      setActiveTab('users');
    }
  }, [location.pathname]);

  const switchTab = (tab: 'users' | 'roles') => {
    setActiveTab(tab);
    if (tab === 'roles') {
      navigate('/admin/roles');
    } else {
      navigate('/admin/users');
    }
  };

  // User Management State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // User Modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<UserRecord | null>(null);
  const [showResetPw, setShowResetPw] = useState<UserRecord | null>(null);
  const [showDeleteUser, setShowDeleteUser] = useState<UserRecord | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [newPw, setNewPw] = useState('');

  // Role Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState<{ id: string; name: string; description: string; permissions: string[]; isSystem?: boolean; isEdit?: boolean }>(emptyRoleForm);
  const [showDeleteRole, setShowDeleteRole] = useState<RoleRecord | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/api/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API}/api/roles`);
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to fetch roles:', e);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // ---------------- USER CRUD HANDLERS ----------------
  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.password) {
      return showToast('error', 'All fields are required');
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', `User "${userForm.name}" created successfully`);
      setShowCreateUser(false);
      setUserForm(emptyUserForm);
      fetchUsers();
      fetchRoles();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!showEditUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/users/${showEditUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: showEditUser.name, role: showEditUser.role, prefix: showEditUser.prefix })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', 'User updated successfully');
      setShowEditUser(null);
      fetchUsers();
      fetchRoles();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPw = async () => {
    if (!showResetPw || !newPw) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/users/${showResetPw.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', 'Password reset successfully');
      setShowResetPw(null);
      setNewPw('');
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/users/${showDeleteUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', `User "${showDeleteUser.name}" deleted`);
      setShowDeleteUser(null);
      fetchUsers();
      fetchRoles();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- ROLE CRUD HANDLERS ----------------
  const openNewRoleModal = () => {
    setRoleForm({
      id: '',
      name: '',
      description: '',
      permissions: [],
      isEdit: false
    });
    setPermissionSearch('');
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role: RoleRecord) => {
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
      isSystem: role.isSystem,
      isEdit: true
    });
    setPermissionSearch('');
    setShowRoleModal(true);
  };

  const openDuplicateRoleModal = (role: RoleRecord) => {
    setRoleForm({
      id: '',
      name: `${role.name} (Copy)`,
      description: `Copy of ${role.name}. ${role.description || ''}`,
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
      isSystem: false,
      isEdit: false
    });
    setPermissionSearch('');
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      return showToast('error', 'Role name is required');
    }
    setSubmitting(true);
    try {
      const endpoint = roleForm.isEdit ? `${API}/api/roles/${roleForm.id}` : `${API}/api/roles`;
      const method = roleForm.isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roleForm.id,
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissions: roleForm.permissions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('success', roleForm.isEdit ? `Role "${roleForm.name}" updated` : `Role "${roleForm.name}" created`);
      setShowRoleModal(false);
      fetchRoles();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!showDeleteRole) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/roles/${showDeleteRole.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('success', `Role "${showDeleteRole.name}" deleted`);
      setShowDeleteRole(null);
      fetchRoles();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle individual permission
  const togglePermission = (permId: string) => {
    setRoleForm(prev => {
      const exists = prev.permissions.includes(permId);
      const updated = exists 
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: updated };
    });
  };

  // Toggle all permissions in a specific module
  const toggleModulePermissions = (modulePermIds: string[]) => {
    setRoleForm(prev => {
      const allSelected = modulePermIds.every(id => prev.permissions.includes(id));
      let updated: string[];
      if (allSelected) {
        updated = prev.permissions.filter(id => !modulePermIds.includes(id));
      } else {
        const set = new Set([...prev.permissions, ...modulePermIds]);
        updated = Array.from(set);
      }
      return { ...prev, permissions: updated };
    });
  };

  // Global select/deselect all
  const selectAllPermissions = () => {
    setRoleForm(prev => ({ ...prev, permissions: [...ALL_PERMISSION_IDS] }));
  };

  const deselectAllPermissions = () => {
    setRoleForm(prev => ({ ...prev, permissions: [] }));
  };

  // Filtered permission modules for modal search
  const filteredModules = useMemo(() => {
    if (!permissionSearch.trim()) return PERMISSION_MODULES;
    const q = permissionSearch.toLowerCase();
    return PERMISSION_MODULES.map(m => {
      const matchModule = m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
      const filteredPerms = m.permissions.filter(p => 
        matchModule || 
        p.id.toLowerCase().includes(q) || 
        p.label.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
      return { ...m, permissions: filteredPerms };
    }).filter(m => m.permissions.length > 0);
  }, [permissionSearch]);

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 text-sm font-medium shadow-2xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Access Control & Users</h1>
          <p className="text-sm text-secondary mt-1">
            Manage system user logins and configure granular roles with permission matrices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'users' ? (
            <Button variant="primary" icon={Plus} onClick={() => { setUserForm(emptyUserForm); setShowCreateUser(true); }}>
              New User
            </Button>
          ) : (
            <Button variant="primary" icon={Plus} onClick={openNewRoleModal}>
              Create New Role
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-theme-subtle">
        <button
          onClick={() => switchTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-rex-500 text-rex-500 bg-rex-500/5'
              : 'border-transparent text-muted hover:text-primary hover:border-theme'
          }`}
        >
          <Users size={14} />
          System Users
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-surface2 text-secondary">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => switchTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-rex-500 text-rex-500 bg-rex-500/5'
              : 'border-transparent text-muted hover:text-primary hover:border-theme'
          }`}
        >
          <Shield size={14} />
          Roles & Permissions Matrix
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-surface2 text-secondary">
            {roles.length}
          </span>
        </button>
      </div>

      {/* ======================= TAB: USERS ======================= */}
      {activeTab === 'users' && (
        <GlassCard className="p-0 overflow-hidden">
          {loadingUsers ? (
            <div className="p-12 text-center text-muted">Loading user accounts...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted">No users found. Create the first one above.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-theme-subtle bg-surface/30">
                  <th className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">User</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Username</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Role</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Prefix</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Created</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-muted uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle">
                {users.map(u => {
                  const roleObj = roles.find(r => r.id === u.role);
                  return (
                    <tr key={u.id} className="hover:bg-surface/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rex-700/20 border border-rex-700/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-rex-400">
                              {u.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-primary text-sm">{u.name}</p>
                            {u.id === currentUser?.id && (
                              <span className="text-[9px] text-rex-500 font-bold uppercase tracking-wider">You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm text-secondary">@{u.username}</td>
                      <td className="px-5 py-3.5">
                        <RoleBadge roleId={u.role} label={roleObj?.name || u.roleName || u.role} />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted">
                        {u.prefix ? <span className="px-2 py-0.5 bg-surface2 border border-theme-subtle text-primary font-bold">{u.prefix}</span> : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted">
                        {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowEditUser({ ...u })}
                            className="p-1.5 hover:bg-surface2 text-muted hover:text-primary transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => { setShowResetPw(u); setNewPw(''); }}
                            className="p-1.5 hover:bg-surface2 text-muted hover:text-amber-400 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound size={13} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => setShowDeleteUser(u)}
                              className="p-1.5 hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </GlassCard>
      )}

      {/* ======================= TAB: ROLES & PERMISSIONS ======================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">System & Custom User Roles</h2>
              <p className="text-xs text-secondary mt-0.5">
                Every role defines which features, buttons, and modules a user can access or modify.
              </p>
            </div>
            <div className="text-xs text-muted">
              Total Permissions Available: <span className="font-bold text-primary">{ALL_PERMISSION_IDS.length}</span> across {PERMISSION_MODULES.length} modules
            </div>
          </div>

          {loadingRoles ? (
            <div className="p-12 text-center text-muted">Loading roles & permissions matrix...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map(r => {
                const permCount = Array.isArray(r.permissions) ? r.permissions.length : 0;
                const percent = Math.round((permCount / ALL_PERMISSION_IDS.length) * 100);

                return (
                  <GlassCard key={r.id} className="p-5 flex flex-col justify-between hover:border-theme transition-all relative group">
                    <div>
                      {/* Top Role Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 flex items-center justify-center border font-bold text-xs ${getRoleBadgeStyle(r.id)}`}>
                            {r.isSystem ? <Shield size={14} /> : <Layers size={14} />}
                          </span>
                          <div>
                            <h3 className="font-bold text-primary text-sm tracking-tight">{r.name}</h3>
                            <span className="font-mono text-[10px] text-muted">ID: {r.id}</span>
                          </div>
                        </div>

                        {r.isSystem ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-surface2 border border-theme-subtle text-muted" title="System default role">
                            <Lock size={9} /> System
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rex-500/10 border border-rex-500/20 text-rex-400">
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-secondary min-h-[36px] line-clamp-2 mt-2 leading-relaxed">
                        {r.description || 'No description provided.'}
                      </p>

                      {/* Permission Coverage Meter */}
                      <div className="mt-4 pt-3 border-t border-theme-subtle/60">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted text-[11px] font-medium">Access Rights</span>
                          <span className="font-bold text-primary text-[11px]">
                            {permCount} / {ALL_PERMISSION_IDS.length} <span className="text-muted font-normal">({percent}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-surface2 h-1.5 overflow-hidden">
                          <div 
                            className="bg-rex-500 h-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Assigned Users Badge */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                        <Users size={12} />
                        <span>
                          <strong className="text-primary">{r.userCount ?? 0}</strong> user(s) currently assigned
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-5 pt-3 border-t border-theme-subtle flex items-center justify-between gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={Edit2}
                        onClick={() => openEditRoleModal(r)}
                        className="text-xs flex-1 justify-center"
                      >
                        Edit Permissions
                      </Button>

                      <button
                        onClick={() => openDuplicateRoleModal(r)}
                        className="p-2 border border-theme-subtle hover:border-theme bg-surface2 hover:bg-surface text-muted hover:text-primary transition-colors"
                        title="Duplicate Role"
                      >
                        <Copy size={13} />
                      </button>

                      {!r.isSystem && (
                        <button
                          onClick={() => setShowDeleteRole(r)}
                          className="p-2 border border-theme-subtle hover:border-red-500/30 bg-surface2 hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
                          title="Delete Role"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= MODAL: CREATE / EDIT ROLE WITH FULL PERMISSION CHECKBOXES ======================= */}
      {showRoleModal && (
        <Modal 
          isOpen 
          size="2xl"
          className="max-w-6xl w-full"
          title={roleForm.isEdit ? `Configure Role: ${roleForm.name}` : 'Create New User Role'} 
          onClose={() => setShowRoleModal(false)}
        >
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Role Metadata Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-theme-subtle">
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                  Role Name <span className="text-rex-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                  placeholder="e.g. Workshop Supervisor"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                  placeholder="Responsibilities and access scope"
                />
              </div>
            </div>

            {/* Permission Matrix Controls Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface/50 p-3 border border-theme-subtle">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-muted" />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={e => setPermissionSearch(e.target.value)}
                  placeholder="Filter permissions by keyword (e.g. invoice, create, approval)..."
                  className="w-full bg-surface2 border border-theme-subtle pl-9 pr-3 py-1.5 text-xs text-primary placeholder-muted focus:border-rex-500 outline-none"
                />
                {permissionSearch && (
                  <button 
                    onClick={() => setPermissionSearch('')} 
                    className="absolute right-2.5 top-2 text-muted hover:text-primary"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-xs font-bold px-2.5 py-1 bg-surface2 border border-theme-subtle text-primary">
                  {roleForm.permissions.length} / {ALL_PERMISSION_IDS.length} Selected
                </span>
                <button
                  type="button"
                  onClick={selectAllPermissions}
                  className="px-2.5 py-1 text-xs font-semibold bg-surface hover:bg-surface2 text-primary border border-theme-subtle hover:border-rex-500 transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck size={13} className="text-rex-400" />
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllPermissions}
                  className="px-2.5 py-1 text-xs font-semibold bg-surface hover:bg-surface2 text-muted hover:text-red-400 border border-theme-subtle transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Permissions Grouped by Module */}
            <div className="space-y-4">
              {filteredModules.map(module => {
                const modulePermIds = module.permissions.map(p => p.id);
                const selectedInModule = modulePermIds.filter(id => roleForm.permissions.includes(id));
                const allModuleSelected = selectedInModule.length === modulePermIds.length;
                const someModuleSelected = selectedInModule.length > 0 && !allModuleSelected;

                return (
                  <div key={module.id} className="border border-theme-subtle bg-surface/20">
                    {/* Module Header with Toggle */}
                    <div className="px-4 py-3 bg-surface/40 border-b border-theme-subtle flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allModuleSelected}
                            ref={el => { if (el) el.indeterminate = someModuleSelected; }}
                            onChange={() => toggleModulePermissions(modulePermIds)}
                            className="w-4 h-4 text-rex-500 rounded border-theme bg-surface focus:ring-rex-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-primary text-xs uppercase tracking-wide">
                              {module.name}
                            </span>
                            <p className="text-[11px] text-muted leading-tight">{module.description}</p>
                          </div>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold border ${module.badgeColor || 'border-theme-subtle bg-surface2 text-muted'}`}>
                          {selectedInModule.length} of {modulePermIds.length} Granted
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(modulePermIds)}
                          className="text-[11px] text-rex-400 hover:text-rex-300 font-semibold underline underline-offset-2 ml-1"
                        >
                          {allModuleSelected ? 'Deselect Module' : 'Select All'}
                        </button>
                      </div>
                    </div>

                    {/* Granular Permission Options (Tick Boxes) */}
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {module.permissions.map(perm => {
                        const isChecked = roleForm.permissions.includes(perm.id);

                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-2.5 border transition-all cursor-pointer select-none ${
                              isChecked
                                ? 'bg-rex-500/5 border-rex-500/30 text-primary'
                                : 'bg-surface/30 border-theme-subtle/70 text-secondary hover:border-theme hover:bg-surface/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 w-4 h-4 text-rex-500 rounded border-theme bg-surface focus:ring-rex-500 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs font-semibold ${isChecked ? 'text-primary' : 'text-secondary'}`}>
                                  {perm.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5 leading-snug">
                                {perm.description}
                              </p>
                              <span className="inline-block mt-1 font-mono text-[9px] text-muted/70 bg-surface2/60 px-1.5 py-0.2 border border-theme-subtle">
                                {perm.id}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredModules.length === 0 && (
                <div className="p-8 text-center text-muted border border-theme-subtle">
                  No permissions match &quot;{permissionSearch}&quot;.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-theme-subtle">
              <span className="text-xs text-muted">
                <strong className="text-primary">{roleForm.permissions.length}</strong> permissions will be enabled for this role.
              </span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setShowRoleModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveRole} disabled={submitting}>
                  {submitting ? 'Saving...' : (roleForm.isEdit ? 'Save Changes' : 'Create Role')}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================= MODAL: DELETE ROLE CONFIRMATION ======================= */}
      {showDeleteRole && (
        <Modal isOpen title="Delete Custom Role" onClose={() => setShowDeleteRole(null)}>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-secondary">
                <p>Are you sure you want to delete the role <span className="font-bold text-primary">&quot;{showDeleteRole.name}&quot;</span>?</p>
                {(showDeleteRole.userCount ?? 0) > 0 && (
                  <p className="mt-2 text-red-400 font-semibold text-xs">
                    Warning: There are {showDeleteRole.userCount} user(s) currently assigned to this role. You must reassign them before deleting this role.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowDeleteRole(null)}>
                Cancel
              </Button>
              <button
                onClick={handleDeleteRole}
                disabled={submitting || (showDeleteRole.userCount ?? 0) > 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Role'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================= MODAL: CREATE USER ======================= */}
      {showCreateUser && (
        <Modal isOpen title="Create New System User" onClose={() => setShowCreateUser(false)}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={userForm.name}
                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="e.g. Kamal Perera"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">User Prefix (Max 5 chars)</label>
              <input
                type="text"
                value={userForm.prefix}
                onChange={e => setUserForm({ ...userForm, prefix: e.target.value.toUpperCase() })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all uppercase"
                placeholder="e.g. KP"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={userForm.username}
                onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="e.g. kamal.perera"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Assigned Role</label>
              <select
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isSystem ? '(System Default)' : '(Custom)'} — {r.permissions.length} permissions
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Initial Password</label>
              <input
                type="password"
                value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="Set a secure password"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setShowCreateUser(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateUser} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================= MODAL: EDIT USER ======================= */}
      {showEditUser && (
        <Modal isOpen title={`Edit User — ${showEditUser.name}`} onClose={() => setShowEditUser(null)}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={showEditUser.name}
                onChange={e => setShowEditUser({ ...showEditUser, name: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">User Prefix</label>
              <input
                type="text"
                value={showEditUser.prefix || ''}
                onChange={e => setShowEditUser({ ...showEditUser, prefix: e.target.value.toUpperCase() })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all uppercase"
                placeholder="e.g. KP"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Assigned Role</label>
              <select
                value={showEditUser.role}
                onChange={e => setShowEditUser({ ...showEditUser, role: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isSystem ? '(System Default)' : '(Custom)'} — {r.permissions.length} permissions
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setShowEditUser(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditUser} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================= MODAL: RESET PASSWORD ======================= */}
      {showResetPw && (
        <Modal isOpen title={`Reset Password — ${showResetPw.name}`} onClose={() => setShowResetPw(null)}>
          <div className="p-6 space-y-4">
            <p className="text-sm text-secondary">
              Set a new password for <span className="font-semibold text-primary">@{showResetPw.username}</span>.
            </p>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="Enter new password"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setShowResetPw(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleResetPw} disabled={submitting || !newPw}>
                {submitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================= MODAL: DELETE USER ======================= */}
      {showDeleteUser && (
        <Modal isOpen title="Delete User" onClose={() => setShowDeleteUser(null)}>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-secondary">
                Delete user <span className="font-bold text-primary">{showDeleteUser.name}</span> (@{showDeleteUser.username})?
                This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowDeleteUser(null)}>Cancel</Button>
              <button
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default UserManagement;
