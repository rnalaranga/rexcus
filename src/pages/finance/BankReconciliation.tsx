import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, RefreshCw, CheckCircle2, Link2, Unlink, Wand2, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAccounts } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';

interface StatementLine {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;   // Withdrawal / Money Out
  credit: number;  // Deposit / Money In
  matchedLineId?: string;
}

interface LedgerLine {
  id: string;
  entryId: string;
  date: string;
  reference: string;
  entryDescription: string;
  lineDescription: string;
  debit: number;   // Bank Debit = Money In
  credit: number;  // Bank Credit = Money Out
  isReconciled: boolean;
  statementDate?: string;
  statementDesc?: string;
  statementRef?: string;
  statementAmount?: number;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

export const BankReconciliation: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: accounts } = useAccounts();

  const bankAccounts = useMemo(
    () =>
      (accounts || []).filter((a: any) => {
        const type = String(a.type || '').toLowerCase();
        const sub = String(a.subtype || '').toLowerCase();
        const name = String(a.name || '').toLowerCase();
        return type === 'asset' && (sub.includes('bank') || sub.includes('cash') || name.includes('bank'));
      }),
    [accounts]
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [selectedStmtId, setSelectedStmtId] = useState<string | null>(null);
  const [pendingPairs, setPendingPairs] = useState<Record<string, StatementLine>>({});
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedAccountId && bankAccounts.length > 0) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  const loadLedger = async () => {
    if (!selectedAccountId) return;
    setLoadingLedger(true);
    setStatusMsg(null);
    try {
      const q = new URLSearchParams({ accountId: selectedAccountId });
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/ledger?${q.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load bank ledger');
      setAccountInfo(json.account || null);
      setLedgerLines(Array.isArray(json.lines) ? json.lines : []);
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Failed to load bank ledger' });
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [selectedAccountId, startDate, endDate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (rawLines.length < 2) {
        setStatusMsg({ type: 'err', text: 'CSV file is empty or missing data rows.' });
        return;
      }

      const headers = parseCsvLine(rawLines[0]).map(h => h.toLowerCase());
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('particular') || h.includes('narration'));
      const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('cheque') || h.includes('chq'));
      const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdraw') || h.includes('dr'));
      const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('cr'));
      const amtIdx = headers.findIndex(h => h === 'amount' || h.includes('amt'));

      const parsed: StatementLine[] = [];
      for (let i = 1; i < rawLines.length; i++) {
        const cols = parseCsvLine(rawLines[i]);
        if (cols.length < 2) continue;

        let debit = debitIdx >= 0 ? parseAmount(cols[debitIdx]) : 0;
        let credit = creditIdx >= 0 ? parseAmount(cols[creditIdx]) : 0;

        if (debit === 0 && credit === 0 && amtIdx >= 0) {
          const rawAmt = String(cols[amtIdx] || '').replace(/[^0-9.-]/g, '');
          const num = parseFloat(rawAmt);
          if (!isNaN(num)) {
            if (num < 0) debit = Math.abs(num);
            else credit = num;
          }
        }

        if (debit === 0 && credit === 0) continue;

        parsed.push({
          id: `STMT-${i}-${Date.now()}`,
          date: dateIdx >= 0 ? cols[dateIdx] : '',
          description: descIdx >= 0 ? cols[descIdx] : (cols[1] || 'Bank Statement Line'),
          reference: refIdx >= 0 ? cols[refIdx] : '',
          debit,
          credit,
        });
      }

      setStatementLines(parsed);
      setPendingPairs({});
      setSelectedStmtId(null);
      setStatusMsg({ type: 'ok', text: `Loaded ${parsed.length} statement lines from ${file.name}` });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAutoMatch = () => {
    if (statementLines.length === 0) return;
    const nextPairs: Record<string, StatementLine> = { ...pendingPairs };
    const usedStmtIds = new Set(Object.values(nextPairs).map(s => s.id));

    const updatedStmts = statementLines.map(stmt => {
      if (stmt.matchedLineId || usedStmtIds.has(stmt.id)) return stmt;

      // Bank Statement Credit (deposit) matches GL Bank Debit; Bank Statement Debit (withdrawal) matches GL Bank Credit
      const match = ledgerLines.find(gl => {
        if (gl.isReconciled || nextPairs[gl.id]) return false;
        const amtMatch =
          (stmt.credit > 0 && Math.abs(gl.debit - stmt.credit) < 0.01) ||
          (stmt.debit > 0 && Math.abs(gl.credit - stmt.debit) < 0.01);
        if (!amtMatch) return false;

        // If reference matches, strong match
        if (stmt.reference && gl.reference && gl.reference.toLowerCase().includes(stmt.reference.toLowerCase())) {
          return true;
        }
        // Otherwise match by date proximity (within 7 days) or exact date string
        if (stmt.date && gl.date) {
          const d1 = new Date(stmt.date).getTime();
          const d2 = new Date(String(gl.date).slice(0, 10)).getTime();
          if (!isNaN(d1) && !isNaN(d2)) {
            return Math.abs(d1 - d2) <= 7 * 86400000;
          }
        }
        return true;
      });

      if (match) {
        nextPairs[match.id] = stmt;
        usedStmtIds.add(stmt.id);
        return { ...stmt, matchedLineId: match.id };
      }
      return stmt;
    });

    setStatementLines(updatedStmts);
    setPendingPairs(nextPairs);
    const count = Object.keys(nextPairs).length;
    setStatusMsg({ type: 'ok', text: `Auto-matched ${count} transaction(s). Review and click "Save Matches".` });
  };

  const handlePairWithLedger = (glLine: LedgerLine) => {
    if (glLine.isReconciled || !selectedStmtId) return;
    const stmt = statementLines.find(s => s.id === selectedStmtId);
    if (!stmt) return;

    setPendingPairs(prev => ({ ...prev, [glLine.id]: stmt }));
    setStatementLines(prev => prev.map(s => (s.id === stmt.id ? { ...s, matchedLineId: glLine.id } : s)));
    setSelectedStmtId(null);
  };

  const handleUnpairPending = (glLineId: string) => {
    const stmt = pendingPairs[glLineId];
    setPendingPairs(prev => {
      const copy = { ...prev };
      delete copy[glLineId];
      return copy;
    });
    if (stmt) {
      setStatementLines(prev => prev.map(s => (s.id === stmt.id ? { ...s, matchedLineId: undefined } : s)));
    }
  };

  const handleSaveMatches = async () => {
    const entries = Object.entries(pendingPairs);
    if (entries.length === 0) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const matches = entries.map(([journalLineId, stmt]) => ({
        journalLineId,
        statementDate: stmt.date,
        statementDesc: stmt.description,
        statementRef: stmt.reference,
        statementAmount: stmt.credit > 0 ? stmt.credit : -stmt.debit,
      }));
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, matches }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save matches');
      setPendingPairs({});
      await loadLedger();
      setStatusMsg({ type: 'ok', text: `Saved ${matches.length} reconciled match(es) to database.` });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Failed to save matches' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnreconcile = async (journalLineId: string) => {
    try {
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/match/${encodeURIComponent(journalLineId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to unmatch');
      await loadLedger();
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    }
  };

  const reconciledCount = ledgerLines.filter(l => l.isReconciled).length;
  const unreconciledCount = ledgerLines.length - reconciledCount;
  const pendingCount = Object.keys(pendingPairs).length;
  const bookBalance = Number(accountInfo?.balance || 0);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Bank Reconciliation</h1>
            <p className="text-[11px] text-muted mt-0.5">Match CSV bank statements against system GL bank ledger lines</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadLedger} disabled={loadingLedger}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" icon={UploadCloud} onClick={() => fileInputRef.current?.click()} className="border border-theme-subtle">
            Import CSV Statement
          </Button>
          {statementLines.length > 0 && (
            <Button variant="ghost" size="sm" icon={Wand2} onClick={handleAutoMatch} className="border border-blue-500/30 text-blue-500">
              Auto-Match
            </Button>
          )}
          {pendingCount > 0 && (
            <Button variant="primary" size="sm" icon={Check} onClick={handleSaveMatches} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Save {pendingCount} Match{pendingCount > 1 ? 'es' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Filters & KPI Strip */}
      <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-muted font-bold mb-1">Bank Account</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-lg px-3 py-1.5 text-xs font-medium text-primary"
            >
              {bankAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-muted font-bold mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary" />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-muted font-bold mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-surface border border-theme-subtle">
            <span className="text-[10px] text-muted uppercase block">GL Book Balance</span>
            <span className="font-mono font-bold text-primary">{formatCurrency(bookBalance)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block">Reconciled</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{reconciledCount} lines</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase block">Unreconciled</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{unreconciledCount} lines</span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`mx-5 mt-3 px-4 py-2 rounded-lg text-xs font-medium border ${statusMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Main Split View */}
      <div className="flex-1 overflow-hidden p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Bank Statement Lines */}
        <GlassCard className="p-0 flex flex-col overflow-hidden border-t-2 border-t-blue-500">
          <div className="p-3.5 bg-surface/40 border-b border-theme-subtle flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-primary">Bank Statement Lines ({statementLines.length})</h3>
              <p className="text-[10px] text-muted">Click an unmatched row, then click the matching GL row on the right</p>
            </div>
            <Button variant="ghost" size="sm" icon={UploadCloud} onClick={() => fileInputRef.current?.click()}>
              Upload CSV
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-theme-subtle/50">
            {statementLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                <UploadCloud size={28} className="text-blue-500 opacity-70" />
                <p className="text-xs text-muted max-w-xs">
                  Upload a bank statement CSV (columns: Date, Description, Reference, Debit/Credit or Amount) to match against system GL lines.
                </p>
              </div>
            ) : (
              statementLines.map(stmt => {
                const isSelected = selectedStmtId === stmt.id;
                const isMatched = Boolean(stmt.matchedLineId);
                return (
                  <div
                    key={stmt.id}
                    onClick={() => !isMatched && setSelectedStmtId(isSelected ? null : stmt.id)}
                    className={`px-4 py-2.5 text-xs flex items-center justify-between gap-3 transition-colors ${
                      isMatched
                        ? 'bg-emerald-500/10 opacity-75'
                        : isSelected
                        ? 'bg-blue-500/15 ring-1 ring-inset ring-blue-500 cursor-pointer'
                        : 'hover:bg-surface2 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted">{stmt.date || '-'}</span>
                        {stmt.reference && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-primary">{stmt.reference}</span>}
                        {isMatched && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Paired</span>}
                      </div>
                      <p className="font-medium text-primary truncate mt-0.5">{stmt.description}</p>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      {stmt.credit > 0 && <span className="text-emerald-600 font-bold">+{formatCurrency(stmt.credit)}</span>}
                      {stmt.debit > 0 && <span className="text-rose-500 font-bold">-{formatCurrency(stmt.debit)}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* Right: System GL Journal Lines */}
        <GlassCard className="p-0 flex flex-col overflow-hidden border-t-2 border-t-emerald-500">
          <div className="p-3.5 bg-surface/40 border-b border-theme-subtle flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-primary">System GL Bank Ledger ({ledgerLines.length})</h3>
              <p className="text-[10px] text-muted">
                {selectedStmtId ? 'Select a GL line below to pair with the selected statement row' : 'Showing all GL postings for the selected bank account'}
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-theme-subtle/50">
            {loadingLedger ? (
              <div className="p-8 text-center text-xs text-muted">Loading bank ledger...</div>
            ) : ledgerLines.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">No GL transactions found for this bank account.</div>
            ) : (
              ledgerLines.map(gl => {
                const pendingStmt = pendingPairs[gl.id];
                const isRealised = /\(realis?ed\b/i.test(gl.entryDescription || '');
                return (
                  <div
                    key={gl.id}
                    onClick={() => selectedStmtId && !gl.isReconciled && handlePairWithLedger(gl)}
                    className={`px-4 py-2.5 text-xs flex items-center justify-between gap-3 transition-colors ${
                      gl.isReconciled
                        ? 'bg-emerald-500/5'
                        : pendingStmt
                        ? 'bg-blue-500/10'
                        : selectedStmtId
                        ? 'hover:bg-blue-500/10 cursor-pointer'
                        : 'hover:bg-surface2'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted">{String(gl.date).slice(0, 10)}</span>
                        <span className="font-mono text-[10px] font-bold text-primary">{gl.reference || gl.entryId}</span>
                        {isRealised && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30">
                            (Realised)
                          </span>
                        )}
                        {gl.isReconciled && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Reconciled
                          </span>
                        )}
                        {pendingStmt && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 border border-blue-500/30 flex items-center gap-1">
                            <Link2 size={10} /> Pending Save
                          </span>
                        )}
                      </div>
                      <p className="text-muted truncate mt-0.5">{gl.entryDescription || gl.lineDescription}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono">
                        {gl.debit > 0 && <span className="text-emerald-600 font-bold">+{formatCurrency(gl.debit)}</span>}
                        {gl.credit > 0 && <span className="text-rose-500 font-bold">-{formatCurrency(gl.credit)}</span>}
                      </div>
                      {pendingStmt && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleUnpairPending(gl.id); }}
                          className="p-1 text-muted hover:text-red-500"
                          title="Unpair"
                        >
                          <Unlink size={13} />
                        </button>
                      )}
                      {gl.isReconciled && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleUnreconcile(gl.id); }}
                          className="p-1 text-muted hover:text-red-500"
                          title="Remove reconciliation"
                        >
                          <Unlink size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
