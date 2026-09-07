import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, Filter, FileCheck, Trash2, ExternalLink } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { useInvoices, useLeads } from '@/hooks/useData'
import { updateInvoice, deleteInvoice } from '@/lib/api'
import { formatCurrency, relativeTime } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'

export const Invoices: React.FC = () => {
  const navigate = useNavigate()
  const { data: invoices, loading, refetch } = useInvoices()
  const { data: leads } = useLeads()
  const { settings } = useSettings()
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewInvoice, setViewInvoice] = useState<any>(null)
  
  const [toast, setToast] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'Cash', reference: '' })
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInvoiceData, setNewInvoiceData] = useState({
    leadId: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [{ desc: '', qty: 1, price: 0 }]
  })

  const showToast = (type: 'success'|'error', msg: string) => { 
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateInvoice(id, { status: newStatus })
      refetch()
      showToast('success', `Status updated to ${newStatus}`)
      if (viewInvoice && viewInvoice.id === id) {
        setViewInvoice({ ...viewInvoice, status: newStatus })
      }
    } catch (e) {
      showToast('error', 'Failed to update status')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteInvoice(deleteTarget)
      refetch()
      showToast('success', 'Invoice deleted')
    } catch (e) {
      showToast('error', 'Failed to delete invoice')
    }
    setDeleteTarget(null)
    setSubmitting(false)
  }

  const handleAddPayment = async () => {
    if (!viewInvoice || !paymentData.amount) return
    setSubmitting(true)
    try {
      const { addInvoicePayment } = await import('@/lib/api');
      const res = await addInvoicePayment(viewInvoice.id, paymentData);
      
      const updatedInvoice = { 
        ...viewInvoice, 
        status: res.newStatus, 
        paidAmount: res.newPaidAmount,
        payments: JSON.stringify([...(viewInvoice.payments ? JSON.parse(viewInvoice.payments) : []), res.payment])
      };
      setViewInvoice(updatedInvoice)
      refetch()
      showToast('success', 'Payment recorded successfully')
      setShowPaymentModal(false)
      setPaymentData({ amount: '', method: 'Cash', reference: '' })
    } catch (e) {
      showToast('error', 'Failed to record payment')
    }
    setSubmitting(false)
  }

  const handleCreateManualInvoice = async () => {
    if (!newInvoiceData.leadId) {
      showToast('error', 'Please select a customer')
      return
    }
    setSubmitting(true)
    try {
      const items = newInvoiceData.items.map(i => ({ ...i, amount: i.qty * i.price }))
      const subtotal = items.reduce((sum, i) => sum + i.amount, 0)
      
      const payload = {
        id: `INV-${Date.now().toString().slice(-6)}`,
        quotationId: 'Manual',
        leadId: newInvoiceData.leadId,
        date: newInvoiceData.date + ' 00:00:00',
        dueDate: newInvoiceData.dueDate + ' 00:00:00',
        items: JSON.stringify(items),
        subtotal: subtotal,
        tax: 0,
        total: subtotal,
        status: 'draft',
        notes: ''
      }
      const { createInvoice } = await import('@/lib/api');
      await createInvoice(payload)
      showToast('success', 'Manual invoice created')
      setShowCreateModal(false)
      setNewInvoiceData({
        leadId: '',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        items: [{ desc: '', qty: 1, price: 0 }]
      })
      refetch()
    } catch (e) {
      showToast('error', 'Failed to create invoice')
    }
    setSubmitting(false)
  }

  const filteredInvoices = invoices.filter(inv => {
    const lead = leads.find((l: any) => l.id === inv.leadId)
    const searchMatch = inv.id.toLowerCase().includes(search.toLowerCase()) || 
                       (lead && (lead.name.toLowerCase().includes(search.toLowerCase()) || lead.company.toLowerCase().includes(search.toLowerCase())))
    const statusMatch = statusFilter === 'all' || inv.status === statusFilter
    return searchMatch && statusMatch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="default">Draft</Badge>
      case 'sent': return <Badge variant="info">Sent</Badge>
      case 'paid': return <Badge variant="success">Paid</Badge>
      case 'overdue': return <Badge variant="error">Overdue</Badge>
      default: return <Badge variant="default">{status}</Badge>
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'id', header: 'Invoice #',
      render: (val: any, item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
            <FileText size={16} />
          </div>
          <div>
            <div className="font-bold text-primary cursor-pointer hover:text-blue-500" onClick={() => setViewInvoice(item)}>
              {val}
            </div>
            <div className="text-[10px] text-muted">Quote: {item.quotationId}</div>
          </div>
        </div>
      )
    },
    {
      key: 'leadId', header: 'Customer',
      render: (val: any) => {
        const lead = leads.find((l: any) => l.id === val)
        return lead ? (
          <div>
            <div className="font-semibold text-secondary">{lead.name}</div>
            <div className="text-[10px] text-muted">{lead.company}</div>
          </div>
        ) : <span className="text-muted">Unknown</span>
      }
    },
    {
      key: 'date', header: 'Date',
      render: (val: any) => (
        <div>
          <div className="text-secondary text-xs">{new Date(val).toLocaleDateString()}</div>
          <div className="text-[10px] text-muted">{relativeTime(val)}</div>
        </div>
      )
    },
    {
      key: 'total', header: 'Amount',
      render: (val: any) => <span className="font-mono font-semibold text-primary">{formatCurrency(Number(val))}</span>
    },
    {
      key: 'status', header: 'Status',
      render: (val: any) => getStatusBadge(val)
    },
    {
      key: 'actions', header: '',
      render: (_, item) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setViewInvoice(item)}>
            View
          </Button>
          <button onClick={() => setDeleteTarget(item.id)} className="p-1.5 text-muted hover:text-red-500 rounded transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Invoices</h1>
          <p className="text-sm text-secondary mt-1">Manage billing and payments for your generated quotes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="border border-theme-subtle" icon={Plus} onClick={() => setShowCreateModal(true)}>Blank Invoice</Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/crm/leads')}>From Quote</Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-surface/50 p-2 rounded-lg border border-theme-subtle">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider ${statusFilter === s ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
          >
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." className="w-64" />
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading invoices...</div>
        ) : (
          <DataTable columns={columns} data={filteredInvoices} keyExtractor={item => item.id} />
        )}
      </GlassCard>

      {/* Invoice View Modal */}
      {viewInvoice && (
        <Modal isOpen={true} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.id}`} size="lg">
          <div className="p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {/* Minimal Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">INVOICE</h2>
                <p className="text-sm font-semibold text-blue-600 mt-1">{viewInvoice.id}</p>
                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  {getStatusBadge(viewInvoice.status)}
                </div>
              </div>
              <div className="text-right">
                {settings?.company_logo ? (
                  <img src={settings.company_logo} alt="Company Logo" className="max-h-16 ml-auto mb-2" />
                ) : (
                  <h3 className="font-bold text-lg">Rex Industries</h3>
                )}
                <p className="text-xs text-slate-500 mt-1">123 Industrial Estate<br/>Colombo, Sri Lanka</p>
              </div>
            </div>

            {/* Bill To & Details */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Bill To</p>
                {(() => {
                  const lead = leads.find((l: any) => l.id === viewInvoice.leadId)
                  if (!lead) return <p>Unknown Customer</p>
                  return (
                    <div>
                      <p className="font-bold text-lg">{lead.name}</p>
                      <p className="text-sm text-slate-600">{lead.company}</p>
                      <p className="text-sm text-slate-500 mt-2">{lead.email}</p>
                      <p className="text-sm text-slate-500">{lead.phone}</p>
                    </div>
                  )
                })()}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Invoice Date:</span>
                  <span className="text-sm font-medium">{new Date(viewInvoice.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Due Date:</span>
                  <span className="text-sm font-medium">{new Date(viewInvoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Ref Quotation:</span>
                  <span className="text-sm font-medium">{viewInvoice.quotationId}</span>
                </div>
              </div>
            </div>

            {/* Line Items (if any) */}
            {viewInvoice.items && JSON.parse(viewInvoice.items).length > 0 && JSON.parse(viewInvoice.items)[0].desc !== undefined && (
              <div className="mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Description</th>
                      <th className="pb-3 font-semibold text-right">Qty</th>
                      <th className="pb-3 font-semibold text-right">Price</th>
                      <th className="pb-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {JSON.parse(viewInvoice.items).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                        <td className="py-3 font-medium">{item.desc}</td>
                        <td className="py-3 text-right text-slate-600 dark:text-slate-400">{item.qty}</td>
                        <td className="py-3 text-right font-mono text-slate-600 dark:text-slate-400">{formatCurrency(item.price)}</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(Number(viewInvoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax (0%):</span>
                  <span className="font-mono">{formatCurrency(Number(viewInvoice.tax))}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span>Total:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(Number(viewInvoice.total))}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(Number(viewInvoice.paidAmount || 0))}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span>Balance Due:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(Number(viewInvoice.total) - Number(viewInvoice.paidAmount || 0))}</span>
                </div>
              </div>
            </div>

            {/* Payments List */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Payment History</h4>
                {viewInvoice.status !== 'paid' && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs border border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => setShowPaymentModal(true)}>
                    + Record Payment
                  </Button>
                )}
              </div>
              
              {viewInvoice.payments && JSON.parse(viewInvoice.payments).length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  {JSON.parse(viewInvoice.payments).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{new Date(p.date).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500 uppercase">{p.method} {p.reference ? `- Ref: ${p.reference}` : ''}</p>
                      </div>
                      <span className="font-mono font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No payments recorded yet.</p>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold mr-2">Change Status:</p>
                {['draft', 'sent', 'paid', 'overdue'].map(s => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-3 text-xs uppercase tracking-wider ${viewInvoice.status === s ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    onClick={() => handleUpdateStatus(viewInvoice.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setViewInvoice(null)}>Close</Button>
                <Button variant="primary" icon={FileCheck} onClick={() => showToast('success', 'PDF Downloaded')}>Download PDF</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this invoice?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentModal && viewInvoice && (
        <Modal isOpen={true} onClose={() => setShowPaymentModal(false)} title="Record Payment">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Amount (Rs.)</label>
              <input 
                type="number" 
                value={paymentData.amount}
                onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                placeholder={`Balance: ${Number(viewInvoice.total) - Number(viewInvoice.paidAmount || 0)}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Method</label>
              <select 
                value={paymentData.method}
                onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Reference (Optional)</label>
              <input 
                type="text" 
                value={paymentData.reference}
                onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                placeholder="Txn ID, Cheque No..."
              />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAddPayment} disabled={submitting || !paymentData.amount}>
                {submitting ? 'Saving...' : 'Save Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Manual Invoice Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Create Blank Invoice" size="lg">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Customer</label>
                <select
                  value={newInvoiceData.leadId}
                  onChange={e => setNewInvoiceData({ ...newInvoiceData, leadId: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                >
                  <option value="">Select Customer...</option>
                  {leads.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} - {l.company}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={newInvoiceData.date}
                    onChange={e => setNewInvoiceData({ ...newInvoiceData, date: e.target.value })}
                    className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={newInvoiceData.dueDate}
                    onChange={e => setNewInvoiceData({ ...newInvoiceData, dueDate: e.target.value })}
                    className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wider">Line Items</label>
              <div className="space-y-2">
                {newInvoiceData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.desc}
                      onChange={e => {
                        const newItems = [...newInvoiceData.items]
                        newItems[idx].desc = e.target.value
                        setNewInvoiceData({ ...newInvoiceData, items: newItems })
                      }}
                      className="flex-1 bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => {
                        const newItems = [...newInvoiceData.items]
                        newItems[idx].qty = Number(e.target.value)
                        setNewInvoiceData({ ...newInvoiceData, items: newItems })
                      }}
                      className="w-20 bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.price}
                      onChange={e => {
                        const newItems = [...newInvoiceData.items]
                        newItems[idx].price = Number(e.target.value)
                        setNewInvoiceData({ ...newInvoiceData, items: newItems })
                      }}
                      className="w-32 bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 outline-none text-sm"
                    />
                    <div className="w-32 py-2 px-3 bg-surface/50 border border-transparent text-right font-mono text-sm">
                      {formatCurrency(item.qty * item.price)}
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 px-2" onClick={() => {
                      const newItems = newInvoiceData.items.filter((_, i) => i !== idx)
                      setNewInvoiceData({ ...newInvoiceData, items: newItems.length ? newItems : [{ desc: '', qty: 1, price: 0 }] })
                    }}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => {
                setNewInvoiceData({ ...newInvoiceData, items: [...newInvoiceData.items, { desc: '', qty: 1, price: 0 }] })
              }}>
                + Add Item
              </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-theme-subtle">
              <div className="w-64">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="font-mono text-rex-600">
                    {formatCurrency(newInvoiceData.items.reduce((sum, item) => sum + (item.qty * item.price), 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateManualInvoice} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
