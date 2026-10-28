import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Hash, Save, RefreshCw, CheckCircle2, User, FileText, 
  Layers, SlidersHorizontal, Check, Edit2, ShieldAlert, Sparkles, Building2
} from 'lucide-react';
import { 
  fetchDocumentSequences, 
  updateDocumentSequence, 
  updateUserPrefix, 
  fetchUserQuotationSequences, 
  updateUserQuotationSequence 
} from '@/lib/api';

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
  const [userSeqNumbers, setUserSeqNumbers] = useState<Record<string, number>>({});
  const [savingUserPrefixId, setSavingUserPrefixId] = useState<string | number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seqData, usersRes, userSeqList] = await Promise.all([
        fetchDocumentSequences(),
        fetch(`${API_BASE}/users`).then(r => r.json()).catch(() => []),
        fetchUserQuotationSequences().catch(() => [])
      ]);

      const seqList = Array.isArray(seqData) ? seqData : [];
      setSequences(seqList);

      const uList = Array.isArray(usersRes) ? usersRes : [];
      setUsers(uList);
      
      const pfxMap: Record<string, string> = {};
      const numMap: Record<string, number> = {};

      uList.forEach((u: any) => {
        pfxMap[u.id] = (u.prefix || '').trim().toUpperCase();
      });

      if (Array.isArray(userSeqList)) {
        userSeqList.forEach((s: any) => {
          const num = Number(s.next_number) || 2206;
          if (s.userId) numMap[s.userId] = num;
          if (s.prefix) numMap[s.prefix.toUpperCase()] = num;
        });
      }

      setUserPrefixes(pfxMap);
      setUserSeqNumbers(numMap);
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
      await Promise.all([
        ...sequences.map(seq =>
          updateDocumentSequence(seq.id, {
            prefix: seq.prefix,
            next_number: Number(seq.next_number),
            padding: Number(seq.padding),
            include_user_prefix: Boolean(seq.include_user_prefix),
            include_customer_prefix: Boolean(seq.include_customer_prefix)
          })
        ),
        ...users.map(async u => {
          const pfx = (userPrefixes[u.id] || '').trim().toUpperCase();
          const nextNum = Number(userSeqNumbers[u.id] || (pfx ? userSeqNumbers[pfx] : 2206)) || 2206;
          await updateUserPrefix(u.id, pfx);
          if (pfx) {
            await updateUserQuotationSequence(pfx, nextNum, u.id);
          }
        })
      ]);
      toast('All document sequence rules and user counters saved successfully', 'success');
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
      const nextNum = Number(userSeqNumbers[userId] || (pfx ? userSeqNumbers[pfx] : 2206)) || 2206;

      const res = await updateUserPrefix(userId, pfx);
      if (!res.success) {
        toast(res.error || 'Failed to update user prefix', 'error');
        return;
      }

      if (pfx) {
        await updateUserQuotationSequence(pfx, nextNum, userId);
      }

      toast('User prefix & quotation sequence updated', 'success');
      await loadData();
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
      const cleanUser = sampleUserPfx.trim().toUpperCase().replace(/[-_]+$/, '');
      const pfxWithSq = seq.id === 'quotation'
        ? (cleanUser.endsWith('SQ') ? cleanUser : `${cleanUser}SQ`)
        : cleanUser;
      parts.push(pfxWithSq);
    } else if (seq.id === 'quotation') {
      parts.push('SQ');
    }

    if (seq.include_customer_prefix) {
      parts.push('CUS');
    }

    const paddedNum = String(seq.next_number || 1001).padStart(Number(seq.padding) || 4, '0');
    parts.push(paddedNum);

    return parts.join('-');
  };

  const getUserQuotationPreview = (u: any) => {
    const pfx = (userPrefixes[u.id] || '').trim().toUpperCase();
    const cleanUser = pfx.replace(/[-_]+$/, '');
    const userQuoPfx = cleanUser ? (cleanUser.endsWith('SQ') ? cleanUser : `${cleanUser}SQ`) : 'SQ';
    const num = Number(userSeqNumbers[u.id] || (pfx ? userSeqNumbers[pfx] : 2206)) || 2206;
    const quoSeq = sequences.find(s => s.id === 'quotation');
    const padding = Number(quoSeq?.padding) || 4;
    const paddedNum = String(num).padStart(padding, '0');

    const parts: string[] = [];
    parts.push(userQuoPfx);

    if (quoSeq?.include_customer_prefix) {
      parts.push('CUS');
    }
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
          <span className="font-bold text-primary">Independent Quotation Numbering Series Per User:</span>
          <p className="text-[11px] text-muted leading-relaxed">
            Quotations follow an <strong>independent sequence per user prefix</strong> (e.g. User A issues <code className="font-mono text-rex-600 font-bold">RN-2206, RN-2207...</code> while User B issues <code className="font-mono text-rex-600 font-bold">SP-2206, SP-2207...</code>). You can customize each user's prefix and next quotation sequence number below. All other ERP documents (Work Orders, Invoices, Receipts, GRNs, POs) follow global continuous numbering.
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
                    <div className="space-y-1">
                      <input
                        type="number"
                        min="1"
                        value={seq.next_number}
                        onChange={e => handleSequenceFieldChange(seq.id, 'next_number', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-theme-subtle bg-surface text-primary font-mono font-bold text-xs focus:outline-none focus:border-rex-500"
                      />
                      {isQuotation && Boolean(seq.include_user_prefix) && (
                        <div className="text-[10px] text-rex-600 dark:text-rex-400 font-semibold leading-tight">
                          Per-User Series Active
                        </div>
                      )}
                    </div>
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

      {/* --- SUB-SECTION: USER PREFIX & QUOTATION SEQUENCES --- */}
      <div className="pt-4 border-t border-theme-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User size={16} className="text-rex-600 dark:text-rex-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-primary">User Identification Prefixes & Independent Quotation Counters</h3>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rex-500/15 text-rex-600 border border-rex-500/30">
                  Per-User Quotations Only
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Each sales agent or estimator has their own unique 2-4 letter prefix (e.g. <span className="font-mono font-bold text-primary">RN</span>, <span className="font-mono font-bold text-primary">SP</span>) and their own independent quotation sequence counter (starting at <span className="font-mono font-bold text-primary">2206</span>). Quotes created by RN advance RN's series without affecting SP's series.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {users.map(u => {
            const isMe = currentUser?.id === u.id;
            const currentPrefix = userPrefixes[u.id] || '';
            const currentNum = userSeqNumbers[u.id] || (currentPrefix ? userSeqNumbers[currentPrefix] : 2206) || 2206;
            const isSavingUser = savingUserPrefixId === u.id;
            const userPreview = getUserQuotationPreview(u);

            return (
              <div
                key={u.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  isMe ? 'bg-rex-500/10 border-rex-500/40 shadow-xs' : 'bg-surface2/30 border-theme-subtle'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
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

                  {/* Dynamic Preview Badge */}
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-[11px] bg-surface px-2 py-0.5 rounded-md border border-theme-subtle text-primary inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {userPreview}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-subtle/50">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted block mb-1">
                      User Prefix
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={currentPrefix}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setUserPrefixes(p => ({ ...p, [u.id]: val }));
                      }}
                      placeholder="e.g. RN"
                      className="w-full px-2.5 py-1 text-center font-mono font-bold uppercase rounded-lg border border-theme-subtle bg-surface text-primary text-xs focus:outline-none focus:border-rex-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted block mb-1">
                      Next Quote #
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={currentNum}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setUserSeqNumbers(p => {
                            const updated: Record<string, number> = { ...p, [u.id]: val };
                            if (currentPrefix) updated[currentPrefix] = val;
                            return updated;
                          });
                        }}
                        className="w-full px-2 py-1 text-center font-mono font-bold rounded-lg border border-theme-subtle bg-surface text-primary text-xs focus:outline-none focus:border-rex-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveUserPrefix(u.id)}
                        disabled={isSavingUser}
                        className="h-7 w-7 p-0 shrink-0 border border-theme-subtle hover:border-rex-500"
                        title="Save User Prefix & Quote Sequence"
                      >
                        {isSavingUser ? <RefreshCw size={11} className="animate-spin" /> : <Check size={12} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
};
