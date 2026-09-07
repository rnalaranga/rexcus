import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, User, Plus, Trash2, KeyRound, Edit2, AlertCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';

type UserRecord = {
  id: string;
  name: string;
  username: string;
  role: string;
  created_at: string;
};

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
    role === 'admin'
      ? 'bg-rex-500/10 text-rex-400 border-rex-500/20'
      : 'bg-surface2 text-muted border-theme-subtle'
  }`}>
    {role === 'admin' ? <Shield size={10} /> : <User size={10} />}
    {role}
  </span>
);

const emptyForm = { name: '', username: '', password: '', role: 'user' };

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<UserRecord | null>(null);
  const [showResetPw, setShowResetPw] = useState<UserRecord | null>(null);
  const [showDelete, setShowDelete] = useState<UserRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPw, setNewPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/api/users`);
      setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password) return showToast('error', 'All fields required');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('success', `User "${form.name}" created`);
      setShowCreate(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/users/${showEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: showEdit.name, role: showEdit.role })
      });
      showToast('success', 'User updated');
      setShowEdit(null);
      fetchUsers();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPw = async () => {
    if (!showResetPw || !newPw) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/users/${showResetPw.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPw })
      });
      showToast('success', 'Password reset successfully');
      setShowResetPw(null);
      setNewPw('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/users/${showDelete.id}`, { method: 'DELETE' });
      showToast('success', `User "${showDelete.name}" deleted`);
      setShowDelete(null);
      fetchUsers();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 text-sm font-medium shadow-lg border flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'error' && <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">User Management</h1>
          <p className="text-sm text-secondary mt-1">Create and manage system user accounts.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
          New User
        </Button>
      </div>

      {/* Users Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-muted">No users found. Create the first one.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-theme-subtle bg-surface/30">
                <th className="text-left px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">User</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Username</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Role</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle">
              {users.map(u => (
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
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowEdit({ ...u })}
                        className="p-1.5 hover:bg-surface2 text-muted hover:text-primary transition-colors"
                        title="Edit"
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
                          onClick={() => setShowDelete(u)}
                          className="p-1.5 hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <Modal isOpen title="Create New User" onClose={() => setShowCreate(false)}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="Saman Perera"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="saman.perera"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
              >
                <option value="user">User — Standard access</option>
                <option value="admin">Admin — Full access</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Initial Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
                placeholder="Set a secure password"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {showEdit && (
        <Modal isOpen title="Edit User" onClose={() => setShowEdit(null)}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={showEdit.name}
                onChange={e => setShowEdit({ ...showEdit, name: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Role</label>
              <select
                value={showEdit.role}
                onChange={e => setShowEdit({ ...showEdit, role: e.target.value })}
                className="w-full bg-surface border border-theme-subtle px-3 py-2.5 text-primary text-sm focus:border-rex-500 outline-none transition-all"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEdit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetPw && (
        <Modal isOpen title={`Reset Password — ${showResetPw.name}`} onClose={() => setShowResetPw(null)}>
          <div className="p-6 space-y-4">
            <p className="text-sm text-secondary">Set a new password for <span className="font-semibold text-primary">@{showResetPw.username}</span>.</p>
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
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowResetPw(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleResetPw} disabled={submitting || !newPw}>
                {submitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDelete && (
        <Modal isOpen title="Delete User" onClose={() => setShowDelete(null)}>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-secondary">
                Delete user <span className="font-bold text-primary">{showDelete.name}</span> (@{showDelete.username})?
                This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDelete(null)}>Cancel</Button>
              <button
                onClick={handleDelete}
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
