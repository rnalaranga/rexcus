import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, Filter, FileCheck, Trash2, ExternalLink } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { InvoicePreview } from "@/pages/finance/InvoiceBuilder";
import { useInvoices, useLeads, useCustomers } from '@/hooks/useData'
import { useTaxProfiles } from '@/hooks/useFinance'
import { updateInvoice, deleteInvoice } from '@/lib/api'
import { formatCurrency, relativeTime } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'

export const Invoices: React.FC = () => {
  const navigate = useNavigate()
  const { data: invoices, loading, refetch } = useInvoices()
  const { data: leads } = useLeads()
  const { data: customers } = useCustomers()
  const { data: taxProfiles } = useTaxProfiles()
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
          <Button variant="primary" icon={Plus} onClick={() => navigate('/finance/invoices/new')}>Create Invoice</Button>
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
        <Modal isOpen={true} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.id}`} size="2xl" className="rounded-2xl">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left side: Invoice Preview */}
            <div className="flex-1 bg-[#525659] p-4 lg:p-8 max-h-[85vh] overflow-y-auto flex justify-center border-r border-theme-subtle">
              <div className="shadow-2xl">
              <InvoicePreview 
                template="government"
                docNo={viewInvoice.id}
                date={viewInvoice.date}
                dueDate={viewInvoice.dueDate}
                deliveryDate={viewInvoice.deliveryDate || viewInvoice.date}
                placeOfSupply={viewInvoice.placeOfSupply || ''}
                quotationNo={viewInvoice.quotationNo || viewInvoice.quotationId || ''}
                dispatchNo={viewInvoice.dispatchNo || ''}
                orderNo={viewInvoice.orderNo || ''}
                poNo={viewInvoice.poNo || ''}
                customer={customers?.find((c: any) => c.id === viewInvoice.customerId) || leads?.find((l: any) => l.id === viewInvoice.customerId || l.id === viewInvoice.leadId) || { name: 'Unknown Customer', company: 'Unknown Company' }}
                customerVat={viewInvoice.customerVat || ''}
                items={viewInvoice.items ? JSON.parse(viewInvoice.items).map((i: any) => ({ description: i.desc || i.description, qty: Number(i.qty), unitPrice: Number(i.price || i.unitPrice) })) : []}
                subtotal={Number(viewInvoice.subtotal)}
                taxAmount={Number(viewInvoice.taxAmount || viewInvoice.tax || 0)}
                total={Number(viewInvoice.total)}
                notes={viewInvoice.notes || ''}
                company={settings}
                getTaxRate={() => 0}
                taxRates={[]}
                taxType={viewInvoice.taxType}
                taxProfile={taxProfiles?.find((p: any) => p.id === viewInvoice.taxProfileId)}
                taxBreakdown={viewInvoice.taxBreakdown ? (typeof viewInvoice.taxBreakdown === 'string' ? JSON.parse(viewInvoice.taxBreakdown) : viewInvoice.taxBreakdown) : null}
              />
              </div>
            </div>
            
            {/* Right side: Sidebar (Payments & Actions) */}
            <div className="w-full lg:w-80 flex flex-col bg-surface">
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Payment History</h4>
                  {viewInvoice.status !== 'paid' && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 px-2 rounded-md" onClick={() => setShowPaymentModal(true)}>
                      + Record
                    </Button>
                  )}
                </div>
                
                {viewInvoice.payments && JSON.parse(viewInvoice.payments).length > 0 ? (
                  <div className="space-y-2">
                    {JSON.parse(viewInvoice.payments).map((p: any, i: number) => (
                      <div key={i} className="bg-surface2 p-3 rounded-xl border border-theme-subtle">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold">{new Date(p.date).toLocaleDateString()}</p>
                          <span className="font-mono font-bold text-emerald-600 text-xs">{formatCurrency(p.amount)}</span>
                        </div>
                        <p className="text-[10px] text-muted uppercase">{p.method} {p.reference ? `- Ref: ${p.reference}` : ''}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-surface2/50 rounded-xl border border-dashed border-theme-subtle text-center">
                    <p className="text-[11px] text-muted italic">No payments recorded</p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-5 border-t border-theme-subtle bg-surface2/30">
                <p className="text-[10px] font-bold text-muted uppercase mb-3">Change Status</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['draft', 'sent', 'paid', 'overdue'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(viewInvoice.id, s)}
                      className={`text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg border transition-colors ${
                        viewInvoice.status === s 
                          ? 'bg-primary text-surface border-primary' 
                          : 'bg-surface text-muted border-theme-subtle hover:bg-surface2'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" className="h-9 text-xs border border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={() => {
                      const content = document.getElementById('invoice-preview');
                      if (!content) return;
                      const win = window.open('', '_blank');
                      if (!win) return;
                      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${viewInvoice.id}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;display:flex;justify-content:center}@page{size:A4;margin:0}@media print{body{margin:0;width:210mm;height:297mm}}</style></head><body>${content.innerHTML}</body></html>`);
                      win.document.close(); win.focus(); win.print();
                  }}>
                    Print / PDF
                  </Button>
                  <Button variant="ghost" className="h-9 text-xs border border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(viewInvoice.id)}>
                    Delete
                  </Button>
                </div>
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
