import React, { useState, useEffect } from 'react';
import { 
  Plus, Printer, Search, RefreshCw, Eye, X, FileText, Calendar, 
  ArrowRightLeft, AlertCircle, CheckCircle2, ChevronRight, FileSpreadsheet 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { useAccounts, useTaxProfiles } from '@/hooks/useFinance';
import { fetchCreditDebitNotes, createCreditDebitNote } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useSettings } from '@/contexts/SettingsContext';

export const CreditDebitNotesTab: React.FC = () => {
  const { settings } = useSettings();
  const { data: accounts } = useAccounts();
  const { data: taxProfiles = [] } = useTaxProfiles();
  const { showError, toast } = useDialog();

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'credit_note' | 'debit_note'>('ALL');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | 'customer' | 'supplier'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrintNote, setActivePrintNote] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [noteType, setNoteType] = useState<'credit_note' | 'debit_note'>('credit_note');
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Sales Return / Defective Goods');
  const [relatedDocType, setRelatedDocType] = useState('Invoice');
  const [relatedDocNo, setRelatedDocNo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [subtotal, setSubtotal] = useState<string>('');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxProfileId, setTaxProfileId] = useState('tp_opt2_sscl_absorbed_vat_sep');
  const [remarks, setRemarks] = useState('');

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetchCreditDebitNotes();
      setNotes(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const openNewNoteModal = (type: 'credit_note' | 'debit_note') => {
    setNoteType(type);
    setDate(new Date().toISOString().slice(0, 10));
    setPartyType(type === 'credit_note' ? 'customer' : 'supplier');
    setPartyId('');
    setPartyName('');
    setReason(type === 'credit_note' ? 'Customer Price Adjustment / Sales Return' : 'Purchase Return to Vendor / Defect');
    setRelatedDocType(type === 'credit_note' ? 'Invoice' : 'Supplier Bill');
    setRelatedDocNo('');
    setSubtotal('');
    setTaxEnabled(false);
    setRemarks('');

    // Pre-select GL account
    if (type === 'credit_note') {
      const salesRet = accounts.find(a => a.type === 'Revenue' || a.code === '4000');
      setAccountId(salesRet ? salesRet.id : '');
    } else {
      const purRet = accounts.find(a => a.type === 'Expense' || a.code === '5000');
      setAccountId(purRet ? purRet.id : '');
    }

    setIsModalOpen(true);
  };

  // Tax calculation for note
  const selectedTaxProfile = taxProfiles.find(t => t.id === taxProfileId);
  const numSubtotal = Number(subtotal) || 0;
  let taxAmount = 0;
  let taxBreakdownObj: any = null;

  if (taxEnabled && selectedTaxProfile) {
    const t2Rate = Number(selectedTaxProfile.tax2_rate) || 18;
    taxAmount = Math.round((numSubtotal * (t2Rate / 100)) * 100) / 100;
    taxBreakdownObj = {
      profileName: selectedTaxProfile.name,
      taxName: selectedTaxProfile.tax2_name || 'VAT',
      rate: t2Rate,
      amount: taxAmount
    };
  }
  const totalAmount = numSubtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numSubtotal <= 0) {
      return showError('Please enter a valid amount greater than 0', 'Validation Error');
    }
    if (!partyName.trim()) {
      return showError('Please select or specify the party name', 'Validation Error');
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        type: noteType,
        partyType,
        partyId: partyId || null,
        partyName: partyName.trim(),
        date,
        reason: reason.trim(),
        relatedDocType,
        relatedDocNo: relatedDocNo.trim() || null,
        accountId: accountId || null,
        subtotal: numSubtotal,
        taxAmount,
        totalAmount,
        taxProfileId: taxEnabled ? taxProfileId : null,
        taxBreakdown: taxEnabled && taxBreakdownObj ? JSON.stringify(taxBreakdownObj) : null,
        notes: remarks.trim() || null
      };

      const res = await createCreditDebitNote(payload);
      toast(`${noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'} ${res.noteNo} created successfully!`, 'success');
      setIsModalOpen(false);
      if (res.note) {
        setActivePrintNote(res.note);
      }
      loadNotes();
    } catch (err: any) {
      showError(err.message || 'Failed to create Note', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    if (partyTypeFilter !== 'ALL' && n.partyType !== partyTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (n.noteNo && n.noteNo.toLowerCase().includes(q)) ||
                    (n.partyName && n.partyName.toLowerCase().includes(q)) ||
                    (n.reason && n.reason.toLowerCase().includes(q)) ||
                    (n.relatedDocNo && n.relatedDocNo.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleExportNotesExcel = () => {
    if (filteredNotes.length === 0) {
      toast('No credit/debit notes to export.', 'info');
      return;
    }

    const rows: any[] = [];
    rows.push({
      'Note No': 'Note No',
      'Type': 'Type',
      'Date': 'Date',
      'Party Type': 'Party Type',
      'Party Name': 'Party Name',
      'Related Document': 'Related Document',
      'Reason': 'Reason',
      'Subtotal (LKR)': 'Subtotal (LKR)',
      'Tax Amount (LKR)': 'Tax Amount (LKR)',
      'Total Amount (LKR)': 'Total Amount (LKR)',
      'Status': 'Status',
      'Notes': 'Notes'
    });

    let totalSubtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;

    filteredNotes.forEach(n => {
      const sub = Number(n.subtotal || 0);
      const tax = Number(n.taxAmount || 0);
      const tot = Number(n.totalAmount || 0);
      totalSubtotal += sub;
      totalTax += tax;
      grandTotal += tot;

      rows.push({
        'Note No': n.noteNo || '',
        'Type': n.type === 'credit_note' ? 'Credit Note (CN)' : 'Debit Note (DN)',
        'Date': String(n.date || '').split('T')[0],
        'Party Type': n.partyType ? (n.partyType === 'customer' ? 'Customer' : 'Supplier') : '',
        'Party Name': n.partyName || '',
        'Related Document': n.relatedDocNo ? `${n.relatedDocType || 'Doc'}: ${n.relatedDocNo}` : '-',
        'Reason': n.reason || '',
        'Subtotal (LKR)': sub,
        'Tax Amount (LKR)': tax,
        'Total Amount (LKR)': tot,
        'Status': n.status || 'Active',
        'Notes': n.notes || ''
      });
    });

    // Summary row
    rows.push({
      'Note No': 'TOTALS',
      'Type': '',
      'Date': '',
      'Party Type': '',
      'Party Name': '',
      'Related Document': '',
      'Reason': '',
      'Subtotal (LKR)': totalSubtotal,
      'Tax Amount (LKR)': totalTax,
      'Total Amount (LKR)': grandTotal,
      'Status': '',
      'Notes': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    const sheetName = typeFilter === 'credit_note' ? 'Credit Notes' : typeFilter === 'debit_note' ? 'Debit Notes' : 'Credit & Debit Notes';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Credit_Debit_Notes_${typeFilter}_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-theme-subtle">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={14} className="text-muted" />
          <input
            type="text"
            placeholder="Search notes by #, party, reason, reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-primary placeholder:text-muted outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted hover:text-primary">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-surface2/60 p-0.5 rounded border border-theme-subtle text-xs">
            {(['ALL', 'credit_note', 'debit_note'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {t === 'ALL' ? 'All Notes' : t === 'credit_note' ? 'Credit Notes' : 'Debit Notes'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportNotesExcel}
            icon={FileSpreadsheet}
            className="text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 font-bold"
          >
            Export Excel
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadNotes}
            disabled={loading}
            icon={RefreshCw}
            className="text-xs text-secondary"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewNoteModal('credit_note')}
            icon={Plus}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
          >
            + Credit Note (CN)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewNoteModal('debit_note')}
            icon={Plus}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            + Debit Note (DN)
          </Button>
        </div>
      </div>

      {/* Notes Table */}
      <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface2/60 border-b border-theme-subtle text-muted uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3">Note #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Party (Customer / Supplier)</th>
                <th className="p-3">Reason / Ref Doc</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">Tax</th>
                <th className="p-3 text-right">Total (LKR)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle font-medium">
              {filteredNotes.map((n: any) => {
                const isCN = n.type === 'credit_note';
                return (
                  <tr key={n.id} className="hover:bg-surface2/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">
                      {n.noteNo || n.id}
                    </td>
                    <td className="p-3 text-secondary font-mono text-[11px]">
                      {n.date ? n.date.slice(0, 10) : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCN
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}>
                        {isCN ? 'Credit Note' : 'Debit Note'}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-primary text-xs">{n.partyName}</p>
                      <span className="text-[10px] text-muted capitalize">{n.partyType}</span>
                    </td>
                    <td className="p-3">
                      <p className="text-xs text-primary truncate max-w-xs">{n.reason || '-'}</p>
                      {n.relatedDocNo && (
                        <p className="text-[10px] text-muted font-mono">Ref: {n.relatedDocType || 'Doc'} #{n.relatedDocNo}</p>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-secondary">
                      {formatCurrency(Number(n.subtotal || n.totalAmount || 0), true)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted text-[11px]">
                      {Number(n.taxAmount || 0) > 0 ? formatCurrency(Number(n.taxAmount), true) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-sm text-primary">
                      {formatCurrency(Number(n.totalAmount || 0), true)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setActivePrintNote(n)}
                        className="p-1.5 hover:bg-surface2 rounded text-secondary hover:text-primary transition-colors"
                        title="Print / View Note"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredNotes.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted text-xs">
                    {loading ? 'Loading credit/debit notes...' : 'No credit or debit notes found. Click "+ Credit Note" or "+ Debit Note" to issue one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* MODAL: Issue Credit or Debit Note */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Issue ${noteType === 'credit_note' ? 'Credit Note (CN)' : 'Debit Note (DN)'}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Note Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-mono font-bold focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Party Classification *</label>
              <select
                value={partyType}
                onChange={e => {
                  const pt = e.target.value as any;
                  setPartyType(pt);
                  setPartyId('');
                  setPartyName('');
                }}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
              >
                <option value="customer">Customer (Sales Adjustments / Returns)</option>
                <option value="supplier">Vendor / Supplier (Purchase Adjustments / Returns)</option>
              </select>
            </div>
          </div>

          {/* Autocomplete for Party */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">
              Select {partyType === 'customer' ? 'Customer' : 'Supplier'} *
            </label>
            {partyType === 'customer' ? (
              <CustomerAutocomplete
                value={partyId}
                onChange={(cId, cust) => {
                  setPartyId(cId);
                  setPartyName(cust?.company || cust?.name || cId);
                }}
                placeholder="Search customer by name, company..."
                required
              />
            ) : (
              <SupplierAutocomplete
                value={partyId}
                onChange={(sId, supp) => {
                  setPartyId(sId);
                  setPartyName(supp?.company || supp?.name || sId);
                }}
                placeholder="Search vendor / supplier by company or contact..."
                required
              />
            )}
          </div>

          {/* Reference Document */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Related Doc Type</label>
              <select
                value={relatedDocType}
                onChange={e => setRelatedDocType(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
              >
                <option value="Invoice">Sales Invoice</option>
                <option value="Supplier Bill">Supplier Bill / Purchase Invoice</option>
                <option value="Sales Order">Sales Order</option>
                <option value="Purchase Order">Purchase Order</option>
                <option value="GRN">Goods Receipt Note (GRN)</option>
                <option value="Direct Adjustment">Direct Ledger Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Related Doc # (Optional)</label>
              <input
                type="text"
                placeholder="e.g. INV-0492 or BILL-012"
                value={relatedDocNo}
                onChange={e => setRelatedDocNo(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-mono focus:border-primary"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">Reason for Adjustment *</label>
            <input
              type="text"
              required
              placeholder="e.g. Return of 5 units damaged shafts; or 5% negotiated price rebate"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded text-xs font-semibold focus:border-primary"
            />
          </div>

          {/* Amount & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Subtotal Amount (LKR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={subtotal}
                onChange={e => setSubtotal(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-mono font-bold text-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Adjustment Account (GL) *
              </label>
              <AccountAutocomplete
                value={accountId}
                onChange={setAccountId}
                typeFilter={['Revenue', 'Expense', 'Asset', 'Liability']}
                placeholder="Search account code or name..."
                required
              />
            </div>
          </div>

          {/* Taxes */}
          <div className="p-3 bg-surface2/50 border border-theme-subtle rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={e => setTaxEnabled(e.target.checked)}
                  className="rounded text-primary h-3.5 w-3.5"
                />
                <span>Include Tax (VAT / SSCL)</span>
              </label>
              {taxEnabled && (
                <span className="text-[11px] font-mono text-amber-500 font-bold">
                  + {formatCurrency(taxAmount, true)} Tax
                </span>
              )}
            </div>

            {taxEnabled && (
              <select
                value={taxProfileId}
                onChange={e => setTaxProfileId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-2 py-1 rounded text-xs font-medium focus:border-primary"
              >
                {taxProfiles.map(tp => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name} ({tp.tax2_rate || 18}% VAT)
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-theme-subtle text-xs font-bold">
              <span>Total Note Value:</span>
              <span className="font-mono text-sm text-primary">{formatCurrency(totalAmount, true)}</span>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">Additional Notes</label>
            <textarea
              rows={2}
              placeholder="Internal remarks or approval details..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs resize-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : `Issue ${noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PRINT VIEW MODAL */}
      <Modal
        isOpen={!!activePrintNote}
        onClose={() => setActivePrintNote(null)}
        title={`Print Note - ${activePrintNote?.noteNo || ''}`}
        size="lg"
      >
        {activePrintNote && (
          <div className="space-y-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #credit-debit-note-print-area, #credit-debit-note-print-area * { visibility: visible; }
                #credit-debit-note-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div id="credit-debit-note-print-area" className="bg-white text-slate-900 p-6 rounded-lg border border-slate-300 shadow-sm font-sans">
              <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                    {settings?.companyName || 'REX GROUP / REX WIRELESS (PVT) LTD'}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Industrial Zone, Colombo, Sri Lanka | Finance & Accounts Dept
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-slate-900 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider inline-block">
                    {activePrintNote.type === 'credit_note' ? 'CREDIT NOTE' : 'DEBIT NOTE'}
                  </div>
                  <p className="text-sm font-mono font-bold mt-1 text-slate-900">
                    {activePrintNote.noteNo || activePrintNote.id}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Date: {activePrintNote.date ? activePrintNote.date.slice(0, 10) : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">Issued To:</span>
                  <span className="font-bold text-sm text-slate-900 block mt-0.5">{activePrintNote.partyName}</span>
                  <span className="text-slate-600 text-[11px] capitalize">Classification: {activePrintNote.partyType}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">Reference Document:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {activePrintNote.relatedDocType || 'General'} {activePrintNote.relatedDocNo ? `#${activePrintNote.relatedDocNo}` : ''}
                  </span>
                </div>
              </div>

              <div className="py-4 border-b border-slate-200">
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold mb-1">Reason & Particulars:</span>
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                  {activePrintNote.reason || 'Financial adjustment note.'}
                </p>
              </div>

              <div className="py-4 border-b border-slate-200 space-y-1.5 text-xs text-right">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(Number(activePrintNote.subtotal || activePrintNote.totalAmount || 0), true)}
                  </span>
                </div>
                {Number(activePrintNote.taxAmount || 0) > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Tax (VAT):</span>
                    <span className="font-mono font-bold text-slate-900">
                      +{formatCurrency(Number(activePrintNote.taxAmount), true)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-slate-300 text-slate-900">
                  <span>Total Adjusted Value:</span>
                  <span className="font-mono text-base">
                    {formatCurrency(Number(activePrintNote.totalAmount || 0), true)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Prepared By</div>
                  <span className="text-[10px] text-slate-500 uppercase">Accounts Officer</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Authorized Signature</div>
                  <span className="text-[10px] text-slate-500 uppercase">Director / Finance Controller</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActivePrintNote(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>
                Print Note
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
