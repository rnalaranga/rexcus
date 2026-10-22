import React, { useState, useMemo } from 'react'
import { CheckSquare, Search, Check, X, FileText, Eye, Clock, ShieldCheck } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useCustomers, useQuotations, useLeads } from '@/hooks/useData'
import { approveCreditLimit, approveQuotation, rejectQuotation } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useDialog } from '@/components/ui/DialogProvider'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { useSettings } from '@/contexts/SettingsContext'

export default function Approvals() {
  const { user, can } = useAuth()
  const { toast } = useDialog()
  const { settings } = useSettings()

  const { data: customers = [], refetch: refetchCustomers } = useCustomers()
  const { data: quotations = [], refetch: refetchQuotations } = useQuotations()
  const { data: leads = [] } = useLeads()

  const [activeTab, setActiveTab] = useState<'quotations' | 'credit'>('quotations')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  // Rejection dialog state
  const [rejectDialog, setRejectDialog] = useState<{ id: string; title: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Quotation Preview state
  const [previewQuote, setPreviewQuote] = useState<{ quote: any; lead: any } | null>(null)

  // --- Quotation Approvals ---
  const pendingQuotations = useMemo(() => {
    return quotations.filter((q: any) => {
      const isPending = q.status === 'Pending Approval' || (q.status === 'Draft' && Number(q.totalAmount) > 0)
      if (!isPending) return false
      if (!search.trim()) return true
      const term = search.toLowerCase()
      let parsed: any = {}
      try { parsed = JSON.parse(q.data || '{}') } catch (e) {}
      const quoNo = (parsed.quotationNo || q.docNo || q.id || '').toLowerCase()
      const client = (parsed.customerCompany || parsed.customerName || q.leadId || '').toLowerCase()
      return quoNo.includes(term) || client.includes(term)
    })
  }, [quotations, search])

  // --- Credit Limit Approvals ---
  const pendingCredits = useMemo(() => {
    return customers.filter((c: any) => {
      const isPending = c.creditLimitStatus === 'pending'
      if (!isPending) return false
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (c.name || '').toLowerCase().includes(term) || (c.company || '').toLowerCase().includes(term)
    })
  }, [customers, search])

  // Actions: Quotations
  const handleApproveQuotation = async (q: any) => {
    setProcessing(q.id)
    try {
      await approveQuotation(q.id, user?.name || 'Authorized Manager')
      toast(`Quotation ${q.id} approved successfully!`, 'success')
      await refetchQuotations()
    } catch (e: any) {
      toast(e.message || 'Failed to approve quotation', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleConfirmRejectQuotation = async () => {
    if (!rejectDialog) return
    setProcessing(rejectDialog.id)
    try {
      await rejectQuotation(rejectDialog.id, rejectionReason)
      toast(`Quotation rejected with notes.`, 'info')
      setRejectDialog(null)
      setRejectionReason('')
      await refetchQuotations()
    } catch (e: any) {
      toast(e.message || 'Failed to reject quotation', 'error')
    } finally {
      setProcessing(null)
    }
  }

  // Actions: Credit Limits
  const handleApproveCredit = async (id: string) => {
    setProcessing(id)
    try {
      await approveCreditLimit(id, 'approved')
      toast('Customer credit limit approved!', 'success')
      await refetchCustomers()
    } catch (e: any) {
      toast(e.message || 'Failed to approve credit limit', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectCredit = async (id: string) => {
    setProcessing(id)
    try {
      await approveCreditLimit(id, 'rejected')
      toast('Customer credit limit request rejected.', 'info')
      await refetchCustomers()
    } catch (e: any) {
      toast(e.message || 'Failed to reject credit limit', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const canApproveQuotations = can('approvals.quotations')
  const canApproveCredit = can('approvals.credit_limit')

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="shrink-0 p-5 pb-3 border-b border-theme-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <ShieldCheck size={26} className="text-emerald-500" />
              Central Approvals Hub
            </h1>
            <p className="text-xs text-secondary mt-1">
              Review and authorize pending commercial quotations, customer credit limits, and operational requests.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
            <input
              type="text"
              placeholder="Search pending requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-theme-base border border-theme-subtle rounded-lg focus:outline-none focus:border-rex-500 transition-colors"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'quotations' ? 'bg-surface text-primary border border-theme shadow-xs font-bold' : 'text-secondary hover:text-primary hover:bg-surface2/50 border border-transparent font-medium'
            }`}
          >
            <FileText size={16} />
            Quotation Approvals
            {pendingQuotations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface2 text-primary border border-theme-subtle font-bold">
                {pendingQuotations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('credit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'credit' ? 'bg-surface text-primary border border-theme shadow-xs font-bold' : 'text-secondary hover:text-primary hover:bg-surface2/50 border border-transparent font-medium'
            }`}
          >
            <CheckSquare size={16} />
            Credit Limit Requests
            {pendingCredits.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface2 text-primary border border-theme-subtle font-bold">
                {pendingCredits.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* --- TAB 1: QUOTATIONS PENDING APPROVAL --- */}
        {activeTab === 'quotations' && (
          <GlassCard className="max-w-5xl">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Commercial Quotations Awaiting Approval
                </h2>
                <p className="text-[11px] text-muted mt-0.5">
                  Quotations must be approved before sales executives can dispatch them to clients.
                </p>
              </div>
              <Badge value={`${pendingQuotations.length} Pending`} variant="warning" size="sm" />
            </div>

            {pendingQuotations.length === 0 ? (
              <div className="p-12 text-center text-muted">
                <CheckSquare size={36} className="mx-auto mb-3 opacity-20 text-emerald-500" />
                <p className="text-sm font-medium">All caught up! No quotations pending approval.</p>
                <p className="text-xs text-muted mt-1">Quotations submitted by sales will appear here automatically.</p>
              </div>
            ) : (
              <div className="divide-y divide-theme-subtle">
                {pendingQuotations.map((q: any) => {
                  let parsed: any = {}
                  try { parsed = JSON.parse(q.data || '{}') } catch (e) {}
                  const quoNo = parsed.quotationNo || q.docNo || q.id
                  const lead = leads.find((l: any) => l.id === q.leadId)
                  const cust = customers.find((c: any) => c.id === q.leadId || (lead as any)?.customerId === c.id)
                  const clientName = parsed.customerCompany || cust?.company || parsed.customerName || cust?.name || lead?.name || 'Walk-in Customer'
                  const items = parsed.custItems || parsed.items || []
                  const total = Number(q.totalAmount || parsed.custTotals?.total || 0)

                  return (
                    <div key={q.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-theme-hover/30 transition-colors">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-primary">{quoNo}</span>
                          <span className="text-[10px] bg-rex-500/20 text-rex-700 dark:text-rex-300 px-2 py-0.5 rounded font-bold">
                            v{q.version || 1}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            q.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                          }`}>
                            {q.status || 'Draft'}
                          </span>
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock size={12} /> {formatDate(q.date)}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-primary">
                          Client: <span className="text-rex-500 font-bold">{clientName}</span>
                          {parsed.attention ? ` · Attn: ${parsed.attention}` : ''}
                        </p>

                        {parsed.subject && (
                          <p className="text-xs text-muted truncate max-w-xl">
                            {parsed.subject}
                          </p>
                        )}

                        <p className="text-[11px] text-muted">
                          {items.length} line item(s) · Terms: {parsed.terms ? 'Specified' : 'Standard'}
                        </p>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Total Quote Value</p>
                          <p className="text-base font-black text-emerald-500">{formatCurrency(total)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewQuote({ quote: q, lead: lead || cust })}
                            className="text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20"
                          >
                            <Eye size={14} /> Preview
                          </Button>

                          {canApproveQuotations ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRejectDialog({ id: q.id, title: `Reject Quotation ${quoNo}` })}
                                disabled={processing === q.id}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                title="Reject Quotation"
                              >
                                <X size={16} />
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApproveQuotation(q)}
                                disabled={processing === q.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
                              >
                                <Check size={16} /> Approve
                              </Button>
                            </>
                          ) : (
                            <span className="text-[11px] text-muted italic">Approval requires Manager role</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        )}

        {/* --- TAB 2: CREDIT LIMIT REQUESTS --- */}
        {activeTab === 'credit' && (
          <GlassCard className="max-w-5xl">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  Customer Credit Limit & Terms Requests
                </h2>
                <p className="text-[11px] text-muted mt-0.5">
                  Approve or reject customer requests for credit extensions, payment periods, and advance waivers.
                </p>
              </div>
              <Badge value={`${pendingCredits.length} Pending`} variant="warning" size="sm" />
            </div>

            {pendingCredits.length === 0 ? (
              <div className="p-12 text-center text-muted">
                <CheckSquare size={36} className="mx-auto mb-3 opacity-20 text-blue-500" />
                <p className="text-sm font-medium">No pending credit limit requests at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-theme-subtle">
                {pendingCredits.map((customer: any) => (
                  <div key={customer.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-theme-hover/30 transition-colors">
                    <div>
                      <h3 className="text-sm font-bold text-primary">
                        {customer.name} {customer.company ? `(${customer.company})` : ''}
                      </h3>
                      <p className="text-xs text-secondary mt-0.5">
                        {customer.segment?.toUpperCase()}
                        <span className="mx-2">•</span>
                        Current Limit: <span className="font-semibold">{formatCurrency(customer.creditLimit || 0)}</span>
                        <span className="mx-2">•</span>
                        Advance Required: {customer.requiresAdvance ? 'Yes' : 'No'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      {Number(customer.pendingCreditLimit) > 0 && Number(customer.pendingCreditLimit) !== Number(customer.creditLimit) && (
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Requested Limit</p>
                          <p className="text-base font-bold text-amber-500">{formatCurrency(customer.pendingCreditLimit || 0)}</p>
                        </div>
                      )}

                      {customer.pendingRequiresAdvance !== null && Boolean(customer.pendingRequiresAdvance) !== Boolean(customer.requiresAdvance) && (
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Advance Policy</p>
                          <p className="text-xs font-bold text-amber-500">{customer.pendingRequiresAdvance ? 'Advance Req.' : 'Waiver'}</p>
                        </div>
                      )}

                      {customer.pendingCreditDays !== null && customer.pendingCreditDays !== customer.creditDays && (
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Requested Period</p>
                          <p className="text-xs font-bold text-amber-500">{customer.pendingCreditDays} Days</p>
                        </div>
                      )}

                      {canApproveCredit ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRejectCredit(customer.id)}
                            disabled={processing === customer.id}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Reject Request"
                          >
                            <X size={16} />
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveCredit(customer.id)}
                            disabled={processing === customer.id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                          >
                            <Check size={16} className="mr-1" /> Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted italic">Approval requires Finance / Manager role</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* --- REJECTION REASON MODAL --- */}
      {rejectDialog && (
        <Modal
          isOpen={true}
          onClose={() => setRejectDialog(null)}
          title={rejectDialog.title}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-secondary">
              Please enter the reason for rejecting this quotation. The sales team will be notified with this feedback to amend the quote.
            </p>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Margin below 15%, special payment terms not allowed without 50% deposit, review material pricing..."
                rows={4}
                className="w-full text-xs p-3 bg-theme-base border border-theme-subtle rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button variant="ghost" size="sm" onClick={() => setRejectDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRejectQuotation}
                disabled={!rejectionReason.trim() || processing === rejectDialog.id}
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- QUOTATION PREVIEW MODAL --- */}
      {previewQuote && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewQuote(null)}
          title={`Quotation Preview: ${previewQuote.quote.id}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="bg-white text-black p-4 rounded-lg overflow-y-auto max-h-[70vh] border shadow-inner">
              <QuotationPrintView
                data={{
                  ...previewQuote.quote,
                  ...(typeof previewQuote.quote.data === 'string' ? JSON.parse(previewQuote.quote.data || '{}') : previewQuote.quote.data)
                }}
                type={previewQuote.quote.type || 'main'}
                lead={previewQuote.lead}
                settings={settings}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-theme-subtle">
              <p className="text-xs text-muted">
                Review line items and terms before granting managerial approval.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreviewQuote(null)}>
                  Close
                </Button>
                {canApproveQuotations && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      const q = previewQuote.quote
                      setPreviewQuote(null)
                      await handleApproveQuotation(q)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    <Check size={16} className="mr-1" /> Approve Quotation
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

