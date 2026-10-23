import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Hash, Save, RefreshCw, CheckCircle2, User, FileText, 
  Layers, SlidersHorizontal, Check, Edit2, ShieldAlert, Sparkles, Building2
} from 'lucide-react';
import { fetchDocumentSequences, updateDocumentSequence, updateUserPrefix } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface SequenceRecord {
  id: string;
  name: string;
  prefix: string;
  next_number: number;
  padding: number;
  include_user_prefix: boolean | number;
  include_customer_prefix: boolean | number;
}

export const SerialNumberManager: React.FC = () => {
  const { toast } = useDialog();
  const { user: currentUser } = useAuth();

  const [sequences, setSequences] = useState<SequenceRecord[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [userPrefixes, setUserPrefixes] = useState<Record<string, string>>({});
  const [savingUserPrefixId, setSavingUserPrefixId] = useState<string | number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seqData, usersRes] = await Promise.all([
        fetchDocumentSequences(),
        fetch(`${API_BASE}/users`).then(r => r.json()).catch(() => [])
      ]);

      const seqList = Array.isArray(seqData) ? seqData : [];
      setSequences(seqList);

      const uList = Array.isArray(usersRes) ? usersRes : [];
      setUsers(uList);
      
      const pfxMap: Record<string, string> = {};
      uList.forEach((u: any) => {
        pfxMap[u.id] = u.prefix || '';
      });
      setUserPrefixes(pfxMap);
    } catch (err: any) {
      toast('Failed to load sequence configurations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSequenceFieldChange = (id: string, field: keyof SequenceRecord, value: any) => {
    setSequences(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, [field]: value };
    }));
  };

  const handleSaveSequence = async (seq: SequenceRecord) => {
    setSavingId(seq.id);
    try {
      const res = await updateDocumentSequence(seq.id, {
        prefix: seq.prefix,
        next_number: Number(seq.next_number),
        padding: Number(seq.padding),
        include_user_prefix: Boolean(seq.include_user_prefix),
        include_customer_prefix: Boolean(seq.include_customer_prefix)
      });
      if (res.success) {
        toast(`Updated sequence for ${seq.name}`, 'success');
      } else {
        toast(res.error || 'Failed to update sequence', 'error');
      }
    } catch (e: any) {
      toast(e.message || 'Error updating sequence', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      await Promise.all(
        sequences.map(seq =>
          updateDocumentSequence(seq.id, {
            prefix: seq.prefix,
            next_number: Number(seq.next_number),
            padding: Number(seq.padding),
            include_user_prefix: Boolean(seq.include_user_prefix),
            include_customer_prefix: Boolean(seq.include_customer_prefix)
          })
        )
      );
      toast('All document sequence rules saved successfully', 'success');
      await loadData();
    } catch (e: any) {
      toast('Failed to save some sequence settings', 'error');
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveUserPrefix = async (userId: string | number) => {
    setSavingUserPrefixId(userId);
    try {
      const pfx = (userPrefixes[userId] || '').trim().toUpperCase();
      const res = await updateUserPrefix(userId, pfx);
      if (res.success) {
        toast('User prefix updated', 'success');
      } else {
        toast(res.error || 'Failed to update prefix', 'error');
      }
    } catch (e: any) {
      toast(e.message || 'Error saving user prefix', 'error');
    } finally {
      setSavingUserPrefixId(null);
    }
  };

  const getPreview = (seq: SequenceRecord) => {
    const parts: string[] = [];
    const basePfx = (seq.prefix || '').trim().replace(/[-_]+$/, '');
    if (basePfx) parts.push(basePfx);

    if (seq.include_user_prefix) {
      const sampleUserPfx = currentUser?.prefix || 'RN';
      parts.push(sampleUserPfx);
    }

    if (seq.include_customer_prefix) {
      parts.push('CUS');
    }

    const paddedNum = String(seq.next_number || 1001).padStart(Number(seq.padding) || 4, '0');
    parts.push(paddedNum);

    return parts.join('-');
  };

  return (
    <GlassCard className="p-6 border border-theme-subtle rounded-2xl shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-subtle pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rex-500/10 text-rex-600 dark:text-rex-400 flex items-center justify-center font-bold">
            <Hash size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-primary">
                Document Serial Number & Prefix Management
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                Unified Quotation Counter Active
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Control starting sequence numbers, custom prefixes, padding digits, and user/customer code prepends across all ERP documents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs border border-theme-subtle rounded-xl"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            disabled={savingAll || loading}
            className="text-xs font-bold rounded-xl shadow-md shadow-rex-500/20 px-4"
          >
            {savingAll ? (
              <>
                <RefreshCw size={13} className="animate-spin mr-1.5" /> Saving...
              </>
            ) : (
              <>
                <Save size={13} className="mr-1.5" /> Save All Sequences
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="p-3.5 rounded-xl bg-rex-500/10 border border-rex-500/20 text-xs text-secondary flex items-start gap-3">
        <Sparkles size={16} className="text-rex-600 dark:text-rex-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-primary">Unified Quotation Numbering Rules:</span>
          <p className="text-[11px] text-muted leading-relaxed">
            Normal Engineering Quotations and Product/Finished Goods Quotations share this exact same continuous sequence starting from <strong className="font-mono text-rex-600 dark:text-rex-400">2206</strong>. Both builders automatically query this engine so no duplicate quote numbers can ever be issued.
          </p>
        </div>
      </div>

      {/* Sequences Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-theme-subtle bg-surface2/30 text-muted uppercase text-[10px] font-bold tracking-wider">
              <th className="py-3 px-3">Document Type</th>
              <th className="py-3 px-3">Base Prefix</th>
              <th className="py-3 px-3">Next Number</th>
              <th className="py-3 px-3">Digits (Padding)</th>
              <th className="py-3 px-3 text-center">User Prefix</th>
              <th className="py-3 px-3 text-center">Customer Prefix</th>
              <th className="py-3 px-3">Generated Preview</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-subtle">
            {sequences.map(seq => {
              const isQuotation = seq.id === 'quotation';
              const isSaving = savingId === seq.id;
              const preview = getPreview(seq);

              return (
                <tr key={seq.id} className={`hover:bg-surface2/20 transition-colors ${isQuotation ? 'bg-rex-500/5' : ''}`}>
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-primary flex items-center gap-1.5">
                      <FileText size={14} className={isQuotation ? 'text-rex-600' : 'text-muted'} />
                      {seq.name}
                    </div>
                    <span className="text-[10px] font-mono text-muted">{seq.id}</span>
                  </td>

                  {/* Prefix */}
                  <td className="py-3.5 px-3">
                    <input
                      type="text"
                      value={seq.prefix || ''}
                      onChange={e => handleSequenceFieldChange(seq.id, 'prefix', e.target.value)}
                      placeholder={isQuotation ? '(None / e.g. QUO)' : 'e.g. SO-'}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-rex-500"
                    />
                  </td>

                  {/* Next Number */}
                  <td className="py-3.5 px-3">
                    <input
                      type="number"
                      min="1"
                      value={seq.next_number}
                      onChange={e => handleSequenceFieldChange(seq.id, 'next_number', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono font-bold text-xs focus:outline-none focus:border-rex-500"
                    />
                  </td>

                  {/* Padding */}
                  <td className="py-3.5 px-3">
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={seq.padding}
                      onChange={e => handleSequenceFieldChange(seq.id, 'padding', Math.max(1, parseInt(e.target.value) || 4))}
                      className="w-16 px-2.5 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono text-xs focus:outline-none focus:border-rex-500"
                    />
                  </td>

                  {/* Include User Prefix Toggle */}
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(seq.include_user_prefix)}
                      onChange={e => handleSequenceFieldChange(seq.id, 'include_user_prefix', e.target.checked)}
                      className="w-4 h-4 rounded text-rex-600 focus:ring-rex-500 border-theme-subtle cursor-pointer"
                    />
                  </td>

                  {/* Include Customer Prefix Toggle */}
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(seq.include_customer_prefix)}
                      onChange={e => handleSequenceFieldChange(seq.id, 'include_customer_prefix', e.target.checked)}
                      className="w-4 h-4 rounded text-rex-600 focus:ring-rex-500 border-theme-subtle cursor-pointer"
                    />
                  </td>

                  {/* Dynamic Preview Badge */}
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-xs bg-surface2 px-2.5 py-1 rounded-lg border border-theme-subtle text-primary inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {preview}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveSequence(seq)}
                      disabled={isSaving}
                      className="text-xs border border-theme-subtle hover:border-rex-500"
                    >
                      {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- SUB-SECTION: USER PREFIX MANAGEMENT --- */}
      <div className="pt-4 border-t border-theme-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={16} className="text-rex-600 dark:text-rex-400" />
            <div>
              <h3 className="text-xs font-bold text-primary">User Identification Prefixes</h3>
              <p className="text-[11px] text-muted">
                Each user can have a unique 2-4 letter prefix (e.g. <span className="font-mono font-bold text-primary">RN</span>, <span className="font-mono font-bold text-primary">SP</span>). When 'User Prefix' is enabled in Quotation rules, the creator's prefix is automatically prepended to the quote number.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {users.map(u => {
            const isMe = currentUser?.id === u.id;
            const currentVal = userPrefixes[u.id] || '';
            const isSavingUser = savingUserPrefixId === u.id;

            return (
              <div
                key={u.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  isMe ? 'bg-rex-500/10 border-rex-500/30' : 'bg-surface2/30 border-theme-subtle'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-primary truncate">{u.name}</span>
                    {isMe && (
                      <span className="text-[8px] uppercase tracking-wider font-bold bg-rex-500/20 text-rex-600 px-1 py-0.2 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted font-mono truncate block">@{u.username}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="text"
                    maxLength={6}
                    value={currentVal}
                    onChange={e => setUserPrefixes(p => ({ ...p, [u.id]: e.target.value.toUpperCase() }))}
                    placeholder="PREFIX"
                    className="w-16 px-2 py-1 text-center font-mono font-bold uppercase rounded-lg border border-theme-subtle bg-surface text-primary text-xs focus:outline-none focus:border-rex-500"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveUserPrefix(u.id)}
                    disabled={isSavingUser}
                    className="h-7 w-7 p-0 border border-theme-subtle hover:border-rex-500"
                    title="Save Prefix"
                  >
                    {isSavingUser ? <RefreshCw size={11} className="animate-spin" /> : <Check size={12} />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
};
