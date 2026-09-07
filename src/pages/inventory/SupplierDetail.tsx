import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, Plus, Trash2,
  TrendingUp, TrendingDown, DollarSign, FileText, Package,
  Calendar, ChevronDown, CreditCard, Truck
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useSupplierLedger } from '@/hooks/useData'
import { fetchSupplierById, createSupplierLedgerEntry, deleteSupplierLedgerEntry } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Purchase / Invoice', icon: '📦', debitSide: 'debit' },
  { value: 'payment', label: 'Payment Made', icon: '💳', debitSide: 'credit' },
  { value: 'return', label: 'Return / Credit Note', icon: '↩️', debitSide: 'credit' },
  { value: 'advance', label: 'Advance Payment', icon: '⬆️', debitSide: 'credit' },
  { value: 'adjustment', label: 'Manual Adjustment', icon: '✏️', debitSide: 'debit' },
]

export const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<any>(null)
  const [loadingSupplier, setLoadingSupplier] = useState(true)
  const { data: ledger, loading: loadingLedger, refetch } = useSupplierLedger(id || '')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [entryForm, setEntryForm] = useState({
    type: 'purchase',
    date: new Date().toISOString().slice(0, 10),
    referenceNo: '',
    description: '',
    amount: ''
  })

  useEffect(() => {
    if (!id) return
    setLoadingSupplier(true)
    fetchSupplierById(id)
      .then(d => { setSupplier(d); setLoadingSupplier(false); })
      .catch(() => setLoadingSupplier(false))
  }, [id])

  // Compute summary stats
  const totalDebit   = ledger.reduce((s: number, r: any) => s + Number(r.debit  || 0), 0)
  const totalCredit  = ledger.reduce((s: number, r: any) => s + Number(r.credit || 0), 0)
  const balance      = totalDebit - totalCredit   // positive = we owe supplier

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSubmitting(true)
    const txType = TRANSACTION_TYPES.find(t => t.value === entryForm.type)!
    const amount = Number(entryForm.amount)
    const payload: any = {
      supplierId: id,
      type: entryForm.type,
      date: entryForm.date.replace('T', ' ') + (entryForm.date.length === 10 ? ' 00:00:00' : ''),
      referenceNo: entryForm.referenceNo,
      description: entryForm.description,
      debit: txType.debitSide === 'debit' ? amount : 0,
      credit: txType.debitSide === 'credit' ? amount : 0,
    }
    await createSupplierLedgerEntry(payload)
    setSubmitting(false)
    setShowAddEntry(false)
    setEntryForm({ type: 'purchase', date: new Date().toISOString().slice(0, 10), referenceNo: '', description: '', amount: '' })
    refetch()
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  
  const handleDelete = async (entryId: string) => {
    setDeleteTarget(entryId)
  }
  
  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteSupplierLedgerEntry(deleteTarget)
    refetch()
    setDeleteTarget(null)
  }

  if (loadingSupplier) return (
    <div className="flex items-center justify-center h-64 text-muted">Loading supplier...</div>
  )

  if (!supplier) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-muted">Supplier not found.</p>
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/inventory/suppliers')}>Back</Button>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/inventory/suppliers')}>Suppliers</Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">{supplier.name}</h1>
              <p className="text-xs text-muted">{supplier.category}</p>
            </div>
          </div>
          <Badge variant={supplier.status === 'active' ? 'success' : 'default'}>{(supplier.status || 'active').toUpperCase()}</Badge>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowAddEntry(true)}>Add Transaction</Button>
      </div>

      {/* Supplier Info + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Supplier card */}
        <GlassCard className="p-5 lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Contact Details</h2>
          {supplier.contactName && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <span className="text-muted text-xs w-4">👤</span> {supplier.contactName}
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Phone size={12} className="text-muted shrink-0"/> {supplier.phone}
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Mail size={12} className="text-muted shrink-0"/> {supplier.email}
            </div>
          )}
          {supplier.address && (
            <div className="flex items-start gap-2 text-sm text-secondary">
              <MapPin size={12} className="text-muted shrink-0 mt-0.5"/> {supplier.address}
            </div>
          )}
        </GlassCard>

        {/* Stats cards */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-muted font-semibold uppercase tracking-wider mb-2">
            <TrendingUp size={14} className="text-red-400"/> Total Purchases
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{formatCurrency(totalDebit, true)}</div>
          <div className="text-[10px] text-muted mt-1">{ledger.filter((r: any) => r.type === 'purchase').length} invoices</div>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-muted font-semibold uppercase tracking-wider mb-2">
            <CreditCard size={14} className="text-emerald-400"/> Total Paid
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{formatCurrency(totalCredit, true)}</div>
          <div className="text-[10px] text-muted mt-1">{ledger.filter((r: any) => r.type === 'payment').length} payments</div>
        </GlassCard>

        <GlassCard className={`p-5 flex flex-col justify-between border-2 ${balance > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
          <div className="flex items-center gap-2 text-xs text-muted font-semibold uppercase tracking-wider mb-2">
            <DollarSign size={14} className={balance > 0 ? 'text-red-400' : 'text-emerald-400'}/> Outstanding Balance
          </div>
          <div className={`text-2xl font-bold font-mono ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {formatCurrency(Math.abs(balance), true)}
          </div>
          <div className="text-[10px] text-muted mt-1">{balance > 0 ? 'We owe this supplier' : balance < 0 ? 'Supplier owes us (credit)' : 'Fully settled'}</div>
        </GlassCard>
      </div>

      {/* Add Entry Form (inline card) */}
      {showAddEntry && (
        <GlassCard className="p-6 border-2 border-primary/20 animate-fade-in">
          <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
            <Plus size={16}/> New Transaction Entry
          </h2>
          <form onSubmit={handleAddEntry} className="space-y-4">
            {/* Transaction type pills */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-2">Transaction Type</label>
              <div className="flex flex-wrap gap-2">
                {TRANSACTION_TYPES.map(t => (
                  <button
                    key={t.value} type="button"
                    onClick={() => setEntryForm({...entryForm, type: t.value})}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${entryForm.type === t.value ? 'bg-primary text-white border-primary' : 'bg-surface border-theme-subtle text-secondary hover:border-primary'}`}
                  >
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Date *</label>
                <input required type="date" className="w-full input-base"
                  value={entryForm.date}
                  onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Reference / Invoice No</label>
                <input type="text" className="w-full input-base font-mono"
                  value={entryForm.referenceNo}
                  onChange={e => setEntryForm({...entryForm, referenceNo: e.target.value})}
                  placeholder="e.g. INV-2024-001" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Amount (Rs) *</label>
                <input required type="number" step="0.01" className="w-full input-base font-mono text-lg"
                  value={entryForm.amount}
                  onChange={e => setEntryForm({...entryForm, amount: e.target.value})}
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Description / Note</label>
                <input type="text" className="w-full input-base"
                  value={entryForm.description}
                  onChange={e => setEntryForm({...entryForm, description: e.target.value})}
                  placeholder="Optional note..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setShowAddEntry(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Ledger Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-subtle flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <FileText size={15}/> Transaction Ledger
          </h2>
          <span className="text-xs text-muted">{ledger.length} entries</span>
        </div>

        {loadingLedger ? (
          <div className="p-12 text-center text-muted text-sm">Loading ledger...</div>
        ) : ledger.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={32} className="mx-auto text-muted mb-3 opacity-30"/>
            <p className="text-sm text-muted">No transactions yet.</p>
            <p className="text-xs text-muted mt-1">Add the first entry using "Add Transaction" above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-theme-subtle bg-surface2/40">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Reference</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Description</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted">Debit (Purchase)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted">Credit (Payment)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted">Running Balance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let running = 0
                  return [...ledger].reverse().map((row: any, idx: number) => {
                    running += Number(row.debit || 0) - Number(row.credit || 0)
                    const txMeta = TRANSACTION_TYPES.find(t => t.value === row.type)
                    return (
                      <tr key={row.id} className="border-b border-theme-subtle hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-secondary font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-muted"/>
                            {String(row.date).slice(0, 10)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
                            <span>{txMeta?.icon}</span>{txMeta?.label || row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted font-mono">{row.referenceNo || '—'}</td>
                        <td className="px-4 py-3 text-xs text-secondary max-w-xs truncate">{row.description || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {Number(row.debit) > 0
                            ? <span className="text-red-500 font-semibold">{formatCurrency(row.debit, true)}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {Number(row.credit) > 0
                            ? <span className="text-emerald-500 font-semibold">{formatCurrency(row.credit, true)}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${running > 0 ? 'text-red-500' : running < 0 ? 'text-emerald-500' : 'text-muted'}`}>
                          {formatCurrency(Math.abs(running), true)}
                          <span className="text-[9px] font-normal ml-1">{running > 0 ? 'DR' : running < 0 ? 'CR' : ''}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"
                          ><Trash2 size={13}/></button>
                        </td>
                      </tr>
                    )
                  }).reverse()
                })()}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-theme-subtle bg-surface2/50 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Totals</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-red-500">{formatCurrency(totalDebit, true)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-emerald-500">{formatCurrency(totalCredit, true)}</td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-black ${balance > 0 ? 'text-red-500' : balance < 0 ? 'text-emerald-500' : 'text-secondary'}`}>
                    {formatCurrency(Math.abs(balance), true)}
                    <span className="text-[9px] font-normal ml-1">{balance > 0 ? 'DR' : balance < 0 ? 'CR' : ''}</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this entry?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
