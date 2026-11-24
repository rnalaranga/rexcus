import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UploadCloud, RefreshCw, CheckCircle2, Link2, Unlink,
  Sparkles, Check, AlertTriangle, FileText, PlusCircle, FileSpreadsheet
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useAccounts } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportToExcel';

interface StatementLine {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  matchedLineId?: string;
  aiReason?: string;
}

interface LedgerLine {
  id: string;
  entryId: string;
  date: string;
  reference: string;
  entryDescription: string;
  lineDescription: string;
  debit: number;
  credit: number;
  isReconciled: boolean;
  statementDate?: string;
  statementDesc?: string;
  statementRef?: string;
  statementAmount?: number;
}

interface AiSuggestion {
  statementId: string;
  category: string;
  suggestedAccountId: string;
  suggestedAccountName: string;
  reason: string;
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

type RecTab = 'reconcile' | 'unmatched' | 'reports';

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

  const offsetAccounts = useMemo(
    () =>
      (accounts || []).filter((a: any) => {
        const sub = String(a.subtype || '').toLowerCase();
        return !sub.includes('bank');
      }),
    [accounts]
  );

  const [activeTab, setActiveTab] = useState<RecTab>('reconcile');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statementClosingBalance, setStatementClosingBalance] = useState<string>('');

  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [selectedStmtId, setSelectedStmtId] = useState<string | null>(null);
  const [pendingPairs, setPendingPairs] = useState<Record<string, StatementLine>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AiSuggestion>>({});
  const [aiRunning, setAiRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Adjustment modal for unmatched statement lines
  const [adjustStmt, setAdjustStmt] = useState<StatementLine | null>(null);
  const [adjustOffsetAccId, setAdjustOffsetAccId] = useState<string>('');
  const [adjustPosting, setAdjustPosting] = useState(false);

  // Reconciled reports history
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(25);

  useEffect(() => {
    if (!selectedAccountId && bankAccounts.length > 0) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  const loadLedger = async () => {
    if (!selectedAccountId) return;
    setLoadingLedger(true);
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

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const q = selectedAccountId ? `?accountId=${encodeURIComponent(selectedAccountId)}` : '';
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/reports${q}`);
      const json = await res.json();
      setReports(Array.isArray(json) ? json : []);
    } catch (e) {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadLedger();
    loadReports();
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
      setAiSuggestions({});
      setSelectedStmtId(null);
      setActiveTab('reconcile');
      setStatusMsg({ type: 'ok', text: `Loaded ${parsed.length} statement lines from ${file.name}. Click "AI Smart Match" to reconcile automatically.` });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAiMatch = async () => {
    const unmatchedStmts = statementLines.filter(s => !s.matchedLineId);
    const unreconciledGl = ledgerLines.filter(g => !g.isReconciled && !pendingPairs[g.id]);
    if (unmatchedStmts.length === 0) {
      setStatusMsg({ type: 'ok', text: 'All statement lines are already matched!' });
      return;
    }

    setAiRunning(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/ai-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          statementLines: unmatchedStmts,
          ledgerLines: unreconciledGl
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI reconciliation failed');

      const nextPairs: Record<string, StatementLine> = { ...pendingPairs };
      const stmtMap = new Map(statementLines.map(s => [s.id, s]));
      const glSet = new Set(unreconciledGl.map(g => g.id));
      const matchedStmtSet = new Set<string>();

      for (const m of (json.matches || [])) {
        const stmt = stmtMap.get(m.statementId);
        if (stmt && glSet.has(m.journalLineId) && !nextPairs[m.journalLineId] && !matchedStmtSet.has(m.statementId)) {
          nextPairs[m.journalLineId] = { ...stmt, aiReason: m.reason || 'AI Matched' };
          matchedStmtSet.add(m.statementId);
        }
      }

      const suggMap: Record<string, AiSuggestion> = { ...aiSuggestions };
      for (const s of (json.unmatchedSuggestions || [])) {
        suggMap[s.statementId] = s;
      }

      setStatementLines(prev =>
        prev.map(s => {
          const matchedEntry = Object.entries(nextPairs).find(([, val]) => val.id === s.id);
          return matchedEntry ? { ...s, matchedLineId: matchedEntry[0], aiReason: matchedEntry[1].aiReason } : s;
        })
      );
      setPendingPairs(nextPairs);
      setAiSuggestions(suggMap);

      const matchedCount = matchedStmtSet.size;
      const suggCount = (json.unmatchedSuggestions || []).length;
      setStatusMsg({
        type: 'ok',
        text: `AI (${json.usedAiProvider}) matched ${matchedCount} transaction(s) and classified ${suggCount} unmatched item(s). Review and click "Save Matches".`
      });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'AI Match failed' });
    } finally {
      setAiRunning(false);
    }
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

  const openAdjustModal = (stmt: StatementLine) => {
    const sugg = aiSuggestions[stmt.id];
    setAdjustStmt(stmt);
    setAdjustOffsetAccId(sugg?.suggestedAccountId || offsetAccounts[0]?.id || '');
  };

  const handlePostAdjustment = async () => {
    if (!adjustStmt || !adjustOffsetAccId) return;
    setAdjustPosting(true);
    try {
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/post-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          offsetAccountId: adjustOffsetAccId,
          date: adjustStmt.date,
          description: adjustStmt.description,
          reference: adjustStmt.reference,
          debit: adjustStmt.debit,
          credit: adjustStmt.credit
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to post adjustment');

      setStatementLines(prev =>
        prev.map(s => (s.id === adjustStmt.id ? { ...s, matchedLineId: json.journalLineId } : s))
      );
      setAdjustStmt(null);
      await loadLedger();
      setStatusMsg({ type: 'ok', text: `Posted GL adjustment (${json.journalEntryId}) and marked reconciled!` });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Failed to post adjustment' });
    } finally {
      setAdjustPosting(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedAccountId) return;
    const stmtBal = parseFloat(statementClosingBalance || '0') || 0;
    const bookBal = Number(accountInfo?.balance || 0);
    try {
      const res = await fetch(`${API_BASE}/finance/bank-reconciliation/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          accountCode: accountInfo?.code || '',
          accountName: accountInfo?.name || '',
          startDate: startDate || null,
          endDate: endDate || null,
          bookBalance: bookBal,
          statementClosingBalance: stmtBal,
          reconciledCount,
          unmatchedStatementCount: unmatchedStatementLines.length,
          unmatchedGlCount: unreconciledGlLines.length,
          difference: stmtBal - bookBal
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save report');
      await loadReports();
      setActiveTab('reports');
      setStatusMsg({ type: 'ok', text: `Reconciliation Report (${json.id}) saved to Reconciled Reports list.` });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Failed to save report' });
    }
  };

  const reconciledCount = ledgerLines.filter(l => l.isReconciled).length;
  const unreconciledGlLines = ledgerLines.filter(l => !l.isReconciled);
  const unmatchedStatementLines = statementLines.filter(s => !s.matchedLineId);
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
            <h1 className="text-lg font-black text-primary tracking-tight">AI Bank Reconciliation</h1>
            <p className="text-[11px] text-muted mt-0.5">AI matching, unmatched GL adjustments & reconciled reports</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => { loadLedger(); loadReports(); }} disabled={loadingLedger}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" icon={UploadCloud} onClick={() => fileInputRef.current?.click()} className="border border-theme-subtle">
            Import CSV Statement
          </Button>
          {statementLines.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={handleAiMatch}
              disabled={aiRunning}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {aiRunning ? 'AI Matching...' : 'AI Smart Match'}
            </Button>
          )}
          {pendingCount > 0 && (
            <Button variant="primary" size="sm" icon={Check} onClick={handleSaveMatches} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Save {pendingCount} Match{pendingCount > 1 ? 'es' : ''}
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={FileText} onClick={handleSaveReport} className="border border-blue-500/30 text-blue-500">
            Save Report
          </Button>
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
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-muted font-bold mb-1">Statement Closing Bal</label>
            <input
              type="number"
              value={statementClosingBalance}
              onChange={e => setStatementClosingBalance(e.target.value)}
              placeholder="Optional"
              className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary w-32 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-surface border border-theme-subtle">
            <span className="text-[10px] text-muted uppercase block">GL Book Balance</span>
            <span className="font-mono font-bold text-primary">{formatCurrency(bookBalance)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block">Reconciled</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{reconciledCount} lines</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase block">Unmatched Stmt / GL</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {unmatchedStatementLines.length} / {unreconciledGlLines.length}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="px-5 pt-2.5 border-b border-theme-subtle bg-surface/20 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('reconcile')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'reconcile' ? 'border-blue-500 text-blue-500' : 'border-transparent text-muted hover:text-primary'}`}
        >
          1. Reconcile Workspace
        </button>
        <button
          onClick={() => setActiveTab('unmatched')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'unmatched' ? 'border-amber-500 text-amber-500' : 'border-transparent text-muted hover:text-primary'}`}
        >
          <AlertTriangle size={13} />
          2. Unmatched & Adjustments ({unmatchedStatementLines.length + unreconciledGlLines.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'reports' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-muted hover:text-primary'}`}
        >
          <FileText size={13} />
          3. Reconciled Reports ({reports.length})
        </button>
      </div>

      {statusMsg && (
        <div className={`mx-5 mt-3 px-4 py-2 rounded-lg text-xs font-medium border ${statusMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* TAB 1: RECONCILE WORKSPACE */}
      {activeTab === 'reconcile' && (
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
                    Upload a bank statement CSV (Date, Description, Reference, Debit/Credit or Amount) and run <strong>AI Smart Match</strong>.
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted">{stmt.date || '-'}</span>
                          {stmt.reference && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-primary">{stmt.reference}</span>}
                          {isMatched && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Paired</span>}
                          {stmt.aiReason && <span className="text-[9.5px] text-purple-500 font-medium">{stmt.aiReason}</span>}
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
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleUnpairPending(gl.id); }} className="p-1 text-muted hover:text-red-500" title="Unpair">
                            <Unlink size={13} />
                          </button>
                        )}
                        {gl.isReconciled && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleUnreconcile(gl.id); }} className="p-1 text-muted hover:text-red-500" title="Remove reconciliation">
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
      )}

      {/* TAB 2: UNMATCHED & ADJUSTMENTS */}
      {activeTab === 'unmatched' && (
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Unmatched Bank Statement Lines -> Post to GL */}
          <GlassCard className="p-0 flex flex-col overflow-hidden border-t-2 border-t-amber-500">
            <div className="p-4 bg-surface/40 border-b border-theme-subtle">
              <h3 className="font-bold text-sm text-primary">On Bank Statement, Not in System GL ({unmatchedStatementLines.length})</h3>
              <p className="text-[11px] text-muted mt-0.5">
                Bank charges, interest, standing orders, or direct deposits — post them to GL in one click.
              </p>
            </div>
            <div className="divide-y divide-theme-subtle/50">
              {unmatchedStatementLines.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">No unmatched bank statement lines.</div>
              ) : (
                unmatchedStatementLines.map(stmt => {
                  const sugg = aiSuggestions[stmt.id];
                  return (
                    <div key={stmt.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted">{stmt.date || '-'}</span>
                          {sugg && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-500 border border-purple-500/20">
                              AI: {sugg.category}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-primary mt-0.5">{stmt.description}</p>
                        {sugg && <p className="text-[10px] text-muted mt-0.5">Suggested: {sugg.suggestedAccountName}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="font-mono font-bold text-right">
                          {stmt.credit > 0 && <span className="text-emerald-600">+{formatCurrency(stmt.credit)}</span>}
                          {stmt.debit > 0 && <span className="text-rose-500">-{formatCurrency(stmt.debit)}</span>}
                        </div>
                        <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => openAdjustModal(stmt)} className="bg-amber-600 hover:bg-amber-700 text-white text-[11px]">
                          Post to GL
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

          {/* Unmatched System GL Lines -> Timing Differences */}
          <GlassCard className="p-0 flex flex-col overflow-hidden border-t-2 border-t-slate-500">
            <div className="p-4 bg-surface/40 border-b border-theme-subtle">
              <h3 className="font-bold text-sm text-primary">In System GL, Not on Bank Statement ({unreconciledGlLines.length})</h3>
              <p className="text-[11px] text-muted mt-0.5">
                Timing differences (Unpresented Cheques / Deposits in Transit) — they stay open until cleared on the next statement.
              </p>
            </div>
            <div className="divide-y divide-theme-subtle/50">
              {unreconciledGlLines.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">All GL lines for this account are reconciled!</div>
              ) : (
                unreconciledGlLines.map(gl => (
                  <div key={gl.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted">{String(gl.date).slice(0, 10)}</span>
                        <span className="font-mono text-[10px] font-bold text-primary">{gl.reference || gl.entryId}</span>
                      </div>
                      <p className="text-muted truncate mt-0.5">{gl.entryDescription || gl.lineDescription}</p>
                    </div>
                    <div className="font-mono font-bold shrink-0">
                      {gl.debit > 0 && <span className="text-emerald-600">+{formatCurrency(gl.debit)}</span>}
                      {gl.credit > 0 && <span className="text-rose-500">-{formatCurrency(gl.credit)}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 3: RECONCILED REPORTS LIST */}
      {activeTab === 'reports' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">Saved Reconciliation Reports ({reports.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              icon={FileSpreadsheet}
              disabled={reports.length === 0}
              onClick={() =>
                exportToExcel({
                  fileName: 'Bank_Reconciliation_Reports',
                  reportTitle: 'REX INDUSTRIES — BANK RECONCILIATION REPORTS',
                  columns: [
                    { header: 'Report ID', key: 'id', width: 16 },
                    { header: 'Account', key: 'account', width: 28 },
                    { header: 'Period', key: 'period', width: 24 },
                    { header: 'Book Balance', key: 'bookBalance', width: 18 },
                    { header: 'Statement Balance', key: 'statementClosingBalance', width: 18 },
                    { header: 'Difference', key: 'difference', width: 16 },
                    { header: 'Reconciled Lines', key: 'reconciledCount', width: 16 },
                    { header: 'Status', key: 'status', width: 14 }
                  ],
                  rows: reports.map(r => ({
                    id: r.id,
                    account: `${r.accountCode || ''} ${r.accountName || r.accountId}`,
                    period: `${r.startDate || 'Start'} to ${r.endDate || 'Current'}`,
                    bookBalance: Number(r.bookBalance || 0),
                    statementClosingBalance: Number(r.statementClosingBalance || 0),
                    difference: Number(r.difference || 0),
                    reconciledCount: Number(r.reconciledCount || 0),
                    status: r.status
                  }))
                })
              }
              className="border border-theme-subtle text-emerald-600"
            >
              Export Excel
            </Button>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            {loadingReports ? (
              <div className="p-8 text-center text-xs text-muted">Loading reconciliation reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted">
                No reconciliation reports saved yet. Reconcile a statement and click <strong>Save Report</strong>.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface2/60 border-b border-theme-subtle text-[10px] uppercase text-muted font-bold">
                        <th className="py-3 px-4">Report #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Bank Account</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4 text-right">Book Balance</th>
                        <th className="py-3 px-4 text-right">Statement Bal</th>
                        <th className="py-3 px-4 text-right">Difference</th>
                        <th className="py-3 px-4 text-center">Reconciled</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle/50">
                      {reports.slice((reportsPage - 1) * reportsPageSize, reportsPage * reportsPageSize).map((r: any) => (
                        <tr key={r.id} className="hover:bg-surface2/30">
                          <td className="py-3 px-4 font-mono font-bold text-primary">{r.id}</td>
                          <td className="py-3 px-4 font-mono text-muted">{String(r.createdAt || '').slice(0, 10)}</td>
                          <td className="py-3 px-4 font-semibold text-primary">{r.accountCode} - {r.accountName}</td>
                          <td className="py-3 px-4 font-mono text-muted">{r.startDate || 'Start'} → {r.endDate || 'Current'}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(r.bookBalance)}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(r.statementClosingBalance)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">{formatCurrency(r.difference)}</td>
                          <td className="py-3 px-4 text-center font-mono">{r.reconciledCount}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'Reconciled' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={reportsPage}
                  totalItems={reports.length}
                  pageSize={reportsPageSize}
                  onPageChange={setReportsPage}
                  onPageSizeChange={setReportsPageSize}
                  itemLabel="reports"
                />
              </>
            )}
          </GlassCard>
        </div>
      )}

      {/* Post Unmatched Statement Item to GL Modal */}
      {adjustStmt && (
        <Modal isOpen={!!adjustStmt} onClose={() => setAdjustStmt(null)} title="Post Unmatched Bank Item to GL">
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-surface2/50 border border-theme-subtle space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Date:</span>
                <span className="font-mono font-bold">{adjustStmt.date || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Description:</span>
                <span className="font-semibold text-primary">{adjustStmt.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Amount:</span>
                <span className="font-mono font-bold text-primary">
                  {adjustStmt.credit > 0 ? `+${formatCurrency(adjustStmt.credit)} (Deposit)` : `-${formatCurrency(adjustStmt.debit)} (Withdrawal)`}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-muted mb-1">Offset Chart of Account</label>
              <select
                value={adjustOffsetAccId}
                onChange={e => setAdjustOffsetAccId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary"
              >
                {offsetAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setAdjustStmt(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handlePostAdjustment} disabled={adjustPosting || !adjustOffsetAccId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {adjustPosting ? 'Posting...' : 'Post to GL & Reconcile'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
