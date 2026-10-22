import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { 
  CheckSquare, Search, Check, X, FileText, Eye, Clock, ShieldCheck, 
  History, Filter, User, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useCustomers, useQuotations, useLeads } from '@/hooks/useData'
import { approveCreditLimit, approveQuotation, rejectQuotation, fetchApprovalLogs } from '@/lib/api'
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

  const [activeTab, setActiveTab] = useState<'quotations' | 'credit' | 'history'>('quotations')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  // Approval History state & filters
  const [approvalLogs, setApprovalLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [historyModuleFilter, setHistoryModuleFilter] = useState<string>('all')
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('all')
  const [historySearch, setHistorySearch] = useState('')
  const [selectedLogDetail, setSelectedLogDetail] = useState<any | null>(null)

  // Rejection dialog state
  const [rejectDialog, setRejectDialog] = useState<{ id: string; title: string; type?: 'quote' | 'credit' } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Quotation Preview state
  const [previewQuote, setPreviewQuote] = useState<{ quote: any; lead: any } | null>(null)

  // Fetch approval logs
  const loadApprovalLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const logs = await fetchApprovalLogs()
      setApprovalLogs(logs)
    } catch (e: any) {
      console.error('Error fetching approval logs:', e)
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    loadApprovalLogs()
  }, [loadApprovalLogs])

  // --- Quotation Approvals (Pending) ---
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

  // --- Credit Limit Approvals (Pending) ---
  const pendingCredits = useMemo(() => {
    return customers.filter((c: any) => {
      const isPending = c.creditLimitStatus === 'pending'
      if (!isPending) return false
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (c.name || '').toLowerCase().includes(term) || (c.company || '').toLowerCase().includes(term)
    })
  }, [customers, search])

  // --- Filtered Approval History Logs ---
  const filteredHistory = useMemo(() => {
    return approvalLogs.filter(log => {
      if (historyModuleFilter !== 'all' && log.module !== historyModuleFilter) return false
      if (historyActionFilter !== 'all' && log.action !== historyActionFilter) return false
      if (!historySearch.trim()) return true
      const term = historySearch.toLowerCase()
      return (
        (log.recordNo || '').toLowerCase().includes(term) ||
        (log.entityName || '').toLowerCase().includes(term) ||
        (log.actionBy || '').toLowerCase().includes(term) ||
        (log.notes || '').toLowerCase().includes(term)
      )
    })
  }, [approvalLogs, historyModuleFilter, historyActionFilter, historySearch])

  // Summary Metrics
  const metrics = useMemo(() => {
    const quotesTotal = pendingQuotations.reduce((sum, q) => {
      let parsed: any = {}
      try { parsed = JSON.parse(q.data || '{}') } catch (e) {}
      return sum + (Number(q.totalAmount || parsed.custTotals?.total || 0))
    }, 0)

    const creditTotal = pendingCredits.reduce((sum, c) => sum + (Number(c.pendingCreditLimit || 0)), 0)
    const approvedTotal = approvalLogs.filter(l => l.action === 'Approved').length
    const rejectedTotal = approvalLogs.filter(l => l.action === 'Rejected').length

    return {
      pendingQuotesCount: pendingQuotations.length,
      pendingQuotesTotal: quotesTotal,
      pendingCreditsCount: pendingCredits.length,
      pendingCreditsTotal: creditTotal,
      approvedCount: approvedTotal,
      rejectedCount: rejectedTotal,
      totalHistoryCount: approvalLogs.length
    }
  }, [pendingQuotations, pendingCredits, approvalLogs])

  // Actions: Quotations
  const handleApproveQuotation = async (q: any) => {
    setProcessing(q.id)
    try {
      await approveQuotation(q.id, user?.name || 'Authorized Manager')
      toast(`Quotation ${q.id} approved successfully!`, 'success')
      await refetchQuotations()
      await loadApprovalLogs()
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
      if (rejectDialog.type === 'credit') {
        await approveCreditLimit(rejectDialog.id, 'rejected', user?.name || 'Authorized Approver', rejectionReason)
        toast(`Credit limit request rejected with notes.`, 'info')
        await refetchCustomers()
      } else {
        await rejectQuotation(rejectDialog.id, rejectionReason)
        toast(`Quotation rejected with notes.`, 'info')
        await refetchQuotations()
      }
      setRejectDialog(null)
      setRejectionReason('')
      await loadApprovalLogs()
    } catch (e: any) {
      toast(e.message || 'Failed to reject request', 'error')
    } finally {
      setProcessing(null)
    }
  }

  // Actions: Credit Limits
  const handleApproveCredit = async (id: string) => {
    setProcessing(id)
    try {
      await approveCreditLimit(id, 'approved', user?.name || 'Finance Manager')
      toast('Customer credit limit approved!', 'success')
      await refetchCustomers()
      await loadApprovalLogs()
    } catch (e: any) {
      toast(e.message || 'Failed to approve credit limit', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleOpenQuotationPreviewFromLog = (log: any) => {
    const q = quotations.find((quote: any) => quote.id === log.recordId || quote.docNo === log.recordNo)
    if (q) {
      const lead = leads.find((l: any) => l.id === q.leadId)
      const cust = customers.find((c: any) => c.id === q.leadId || (lead as any)?.customerId === c.id)
      setPreviewQuote({ quote: q, lead: lead || cust })
    } else {
      setSelectedLogDetail(log)
    }
  }

  const canApproveQuotations = can('approvals.quotations')
  const canApproveCredit = can('approvals.credit_limit')

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Top Header */}
      <div className="shrink-0 p-5 pb-3 border-b border-theme-subtle w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-primary flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-500" />
              Central Approvals Hub
            </h1>
            <p className="text-xs text-secondary mt-0.5">
              Review and authorize pending commercial quotations, customer credit limits, and audit historical decisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'history' ? (
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={loadApprovalLogs}
                disabled={loadingLogs}
                className="h-8 text-xs rounded-none border border-theme-subtle text-secondary hover:text-primary font-medium"
              >
                Refresh Log
              </Button>
            ) : (
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={13} />
                <input
                  type="text"
                  placeholder="Search pending requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 text-xs bg-theme-base border border-theme-subtle rounded-none focus:outline-none focus:border-rex-500 transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Executive KPI Metric Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 w-full">
          <GlassCard className="p-3 flex items-center justify-between rounded-none w-full">
            <div>
              <span className="text-xs text-muted font-medium">Pending Quotations</span>
              <div className="text-lg font-mono font-medium text-amber-500 mt-0.5">
                {metrics.pendingQuotesCount}
              </div>
              <span className="text-xs text-muted font-mono">
                Val: {formatCurrency(metrics.pendingQuotesTotal)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
              <FileText size={15} />
            </div>
          </GlassCard>

          <GlassCard className="p-3 flex items-center justify-between rounded-none w-full">
            <div>
              <span className="text-xs text-muted font-medium">Pending Credit Requests</span>
              <div className="text-lg font-mono font-medium text-blue-500 mt-0.5">
                {metrics.pendingCreditsCount}
              </div>
              <span className="text-xs text-muted font-mono">
                Req: {formatCurrency(metrics.pendingCreditsTotal)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
              <CheckSquare size={15} />
            </div>
          </GlassCard>

          <GlassCard className="p-3 flex items-center justify-between rounded-none w-full">
            <div>
              <span className="text-xs text-muted font-medium">Total Approved</span>
              <div className="text-lg font-mono font-medium text-emerald-500 mt-0.5">
                {metrics.approvedCount}
              </div>
              <span className="text-xs text-muted">Decisions Authorized</span>
            </div>
            <div className="w-8 h-8 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </GlassCard>

          <GlassCard className="p-3 flex items-center justify-between rounded-none w-full">
            <div>
              <span className="text-xs text-muted font-medium">Total Rejected / Returned</span>
              <div className="text-lg font-mono font-medium text-rose-500 mt-0.5">
                {metrics.rejectedCount}
              </div>
              <span className="text-xs text-muted">Returned with Notes</span>
            </div>
            <div className="w-8 h-8 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
              <XCircle size={15} />
            </div>
          </GlassCard>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto w-full">
          <button
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none text-xs transition-all ${
              activeTab === 'quotations' 
                ? 'bg-surface text-primary border border-theme shadow-xs font-semibold' 
                : 'text-secondary hover:text-primary hover:bg-surface2/50 border border-transparent font-medium'
            }`}
          >
            <FileText size={14} />
            Quotation Approvals
            {pendingQuotations.length > 0 && (
              <span className="px-2 py-0.5 rounded-none text-xs font-mono font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                {pendingQuotations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('credit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none text-xs transition-all ${
              activeTab === 'credit' 
                ? 'bg-surface text-primary border border-theme shadow-xs font-semibold' 
                : 'text-secondary hover:text-primary hover:bg-surface2/50 border border-transparent font-medium'
            }`}
          >
            <CheckSquare size={14} />
            Credit Limit Requests
            {pendingCredits.length > 0 && (
              <span className="px-2 py-0.5 rounded-none text-xs font-mono font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-medium">
                {pendingCredits.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none text-xs transition-all ${
              activeTab === 'history' 
                ? 'bg-surface text-primary border border-theme shadow-xs font-semibold' 
                : 'text-secondary hover:text-primary hover:bg-surface2/50 border border-transparent font-medium'
            }`}
          >
            <History size={14} />
            Approval History Log
            <span className="px-2 py-0.5 rounded-none text-xs font-mono font-medium bg-surface2 text-secondary border border-theme-subtle font-medium">
              {metrics.totalHistoryCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="flex-1 overflow-y-auto p-5 w-full">
        {/* --- TAB 1: QUOTATIONS PENDING APPROVAL --- */}
        {activeTab === 'quotations' && (
          <GlassCard className="w-full rounded-none">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Commercial Quotations Awaiting Approval
                </h2>
                <p className="text-xs text-muted font-medium mt-0.5">
                  Quotations must be authorized before sales executives can dispatch them to clients.
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
                    <div key={q.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-theme-hover/20 transition-colors">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-primary">{quoNo}</span>
                          <span className="text-xs bg-surface2 text-secondary px-2 py-0.5 rounded-none border border-theme-subtle font-mono font-medium">
                            v{q.version || 1}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-none border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            {q.status || 'Pending Approval'}
                          </span>
                          <span className="text-xs text-muted flex items-center gap-1 font-mono">
                            <Clock size={11} /> {formatDate(q.date)}
                          </span>
                        </div>

                        <p className="text-xs text-secondary">
                          Client: <span className="font-semibold text-primary">{clientName}</span>
                          {parsed.attention ? ` · Attn: ${parsed.attention}` : ''}
                        </p>

                        {parsed.subject && (
                          <p className="text-xs text-muted truncate max-w-2xl">
                            {parsed.subject}
                          </p>
                        )}

                        <p className="text-xs text-muted font-medium">
                          {items.length} line item(s) · Terms: {parsed.terms ? 'Specified' : 'Standard'}
                        </p>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted font-medium">Total Quote Value</p>
                          <p className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(total)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewQuote({ quote: q, lead: lead || cust })}
                            className="text-xs flex items-center gap-1.5 border border-theme-subtle rounded-none hover:bg-surface2 font-medium"
                          >
                            <Eye size={13} /> Preview
                          </Button>

                          {canApproveQuotations ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRejectDialog({ id: q.id, title: `Reject Quotation ${quoNo}`, type: 'quote' })}
                                disabled={processing === q.id}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none border border-red-500/20 font-medium"
                                title="Reject Quotation"
                              >
                                <X size={14} /> Reject
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApproveQuotation(q)}
                                disabled={processing === q.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 rounded-none"
                              >
                                <Check size={14} /> Approve
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted font-medium italic">Approval requires Manager role</span>
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
          <GlassCard className="w-full rounded-none">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  Customer Credit Limit & Terms Requests
                </h2>
                <p className="text-xs text-muted font-medium mt-0.5">
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
                  <div key={customer.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-theme-hover/20 transition-colors">
                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        {customer.name} {customer.company ? `(${customer.company})` : ''}
                      </h3>
                      <p className="text-xs text-secondary mt-0.5">
                        {customer.segment?.toUpperCase()}
                        <span className="mx-2">•</span>
                        Current Limit: <span className="font-medium font-mono">{formatCurrency(customer.creditLimit || 0)}</span>
                        <span className="mx-2">•</span>
                        Advance Required: {customer.requiresAdvance ? 'Yes' : 'No'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      {Number(customer.pendingCreditLimit) > 0 && Number(customer.pendingCreditLimit) !== Number(customer.creditLimit) && (
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted font-medium">Requested Limit</p>
                          <p className="text-sm font-semibold text-amber-500 font-mono">{formatCurrency(customer.pendingCreditLimit || 0)}</p>
                        </div>
                      )}

                      {customer.pendingRequiresAdvance !== null && Boolean(customer.pendingRequiresAdvance) !== Boolean(customer.requiresAdvance) && (
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted font-medium">Advance Policy</p>
                          <p className="text-xs font-semibold text-amber-500">{customer.pendingRequiresAdvance ? 'Advance Req.' : 'Waiver'}</p>
                        </div>
                      )}

                      {customer.pendingCreditDays !== null && customer.pendingCreditDays !== customer.creditDays && (
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted font-medium">Requested Period</p>
                          <p className="text-xs font-semibold text-amber-500 font-mono">{customer.pendingCreditDays} Days</p>
                        </div>
                      )}

                      {canApproveCredit ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRejectDialog({ id: customer.id, title: `Reject Credit Limit for ${customer.company || customer.name}`, type: 'credit' })}
                            disabled={processing === customer.id}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none border border-red-500/20 font-medium"
                            title="Reject Request"
                          >
                            <X size={14} /> Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveCredit(customer.id)}
                            disabled={processing === customer.id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-none"
                          >
                            <Check size={14} className="mr-1" /> Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted font-medium italic">Approval requires Finance / Manager role</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* --- TAB 3: APPROVAL HISTORY LOG --- */}
        {activeTab === 'history' && (
          <GlassCard className="w-full rounded-none">
            {/* Header with Search and Module/Decision Filters */}
            <div className="p-4 border-b border-theme-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface2/30">
              <div>
                <h2 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  Authorizations & Decision Audit Log
                </h2>
                <p className="text-xs text-muted font-medium mt-0.5">
                  Chronological trail of commercial quotation authorizations, credit limit grants, and rejected requests.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search in History */}
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={12} />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-theme-base border border-theme-subtle rounded-none focus:outline-none focus:border-rex-500"
                  />
                </div>

                {/* Module Filter */}
                <select
                  value={historyModuleFilter}
                  onChange={(e) => setHistoryModuleFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-theme-base border border-theme-subtle text-primary rounded-none focus:outline-none focus:border-rex-500 cursor-pointer"
                >
                  <option value="all">All Modules</option>
                  <option value="Quotation">Quotations</option>
                  <option value="Credit Limit">Credit Limits</option>
                </select>

                {/* Decision Filter */}
                <select
                  value={historyActionFilter}
                  onChange={(e) => setHistoryActionFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-theme-base border border-theme-subtle text-primary rounded-none focus:outline-none focus:border-rex-500 cursor-pointer"
                >
                  <option value="all">All Decisions</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* History Table - Full Width */}
            <div className="overflow-x-auto min-h-[300px] w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface2/50 border-b border-theme-subtle text-xs font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-3 py-3">Module</th>
                    <th className="px-4 py-3">Reference #</th>
                    <th className="px-4 py-3">Client / Entity</th>
                    <th className="px-4 py-3 text-right">Amount / Value</th>
                    <th className="px-3 py-3 text-center">Decision</th>
                    <th className="px-4 py-3">Authorized By</th>
                    <th className="px-4 py-3">Remarks / Notes</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle/40">
                  {filteredHistory.map((log: any) => {
                    const isApproved = log.action === 'Approved'
                    return (
                      <tr key={log.id} className="hover:bg-theme-hover/20 transition-colors">
                        {/* Timestamp */}
                        <td className="px-4 py-3 whitespace-nowrap text-muted font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className="text-muted shrink-0" />
                            <span>{formatDate(log.actionDate || log.createdAt)}</span>
                          </div>
                        </td>

                        {/* Module */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-none border bg-surface2 text-secondary border-theme-subtle">
                            {log.module}
                          </span>
                        </td>

                        {/* Reference Record No */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-primary">
                          {log.recordNo || log.recordId}
                        </td>

                        {/* Entity / Customer */}
                        <td className="px-4 py-3 text-secondary max-w-[220px] truncate" title={log.entityName}>
                          {log.entityName || '-'}
                        </td>

                        {/* Consideration Amount */}
                        <td className="px-4 py-3 text-right font-mono font-medium text-primary whitespace-nowrap">
                          {Number(log.amount) > 0 ? formatCurrency(log.amount) : '-'}
                        </td>

                        {/* Decision */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {isApproved ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-none border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 inline-flex items-center gap-1.5">
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-none border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 inline-flex items-center gap-1.5">
                              <XCircle size={11} /> Rejected
                            </span>
                          )}
                        </td>

                        {/* Authorized By */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-secondary text-xs">
                            <User size={11} className="text-muted shrink-0" />
                            <span>{log.actionBy || 'Authorized Manager'}</span>
                          </div>
                        </td>

                        {/* Notes / Remarks */}
                        <td className="px-4 py-3 max-w-[280px] truncate text-muted text-xs" title={log.notes}>
                          {log.notes || '-'}
                        </td>

                        {/* Action: View Document / Details */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {log.module === 'Quotation' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenQuotationPreviewFromLog(log)}
                              className="h-7 text-xs px-2.5 rounded-none border border-theme-subtle text-primary hover:bg-surface2 font-medium"
                              title="Preview Quotation"
                            >
                              <Eye size={11} className="mr-1" /> View
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLogDetail(log)}
                              className="h-7 text-xs px-2.5 rounded-none border border-theme-subtle text-secondary hover:text-primary hover:bg-surface2 font-medium"
                              title="View Log Details"
                            >
                              Details
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-muted">
                        <History size={36} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No approval logs match your filters.</p>
                        <p className="text-xs text-muted mt-0.5">Authorizations and rejections will be recorded here automatically.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
              Please enter the reason for rejecting this {rejectDialog.type === 'credit' ? 'credit limit request' : 'quotation'}. This justification will be logged permanently in the audit trail.
            </p>

            <div>
              <label className="block text-xs font-medium text-primary mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Margin below threshold, advance deposit required, credit policy limitation..."
                rows={4}
                className="w-full text-xs p-3 bg-theme-base border border-theme-subtle rounded-none focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button variant="ghost" size="sm" onClick={() => setRejectDialog(null)} className="rounded-none font-medium">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRejectQuotation}
                disabled={!rejectionReason.trim() || processing === rejectDialog.id}
                className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-none"
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
            <div className="bg-white text-black p-4 rounded-none overflow-y-auto max-h-[70vh] border shadow-inner">
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
                <Button variant="ghost" size="sm" onClick={() => setPreviewQuote(null)} className="rounded-none font-medium">
                  Close
                </Button>
                {canApproveQuotations && previewQuote.quote.status === 'Pending Approval' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      const q = previewQuote.quote
                      setPreviewQuote(null)
                      await handleApproveQuotation(q)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-none"
                  >
                    <Check size={14} className="mr-1" /> Approve Quotation
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* --- AUDIT LOG DETAIL MODAL --- */}
      {selectedLogDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLogDetail(null)}
          title={`Audit Log Record: ${selectedLogDetail.recordNo || selectedLogDetail.recordId}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-none space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Module / Request:</span>
                <span className="font-semibold text-primary">{selectedLogDetail.module}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Reference #:</span>
                <span className="font-mono font-semibold text-primary">{selectedLogDetail.recordNo || selectedLogDetail.recordId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Client / Entity:</span>
                <span className="text-primary">{selectedLogDetail.entityName || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Decision:</span>
                <span className={`font-semibold px-2.5 py-0.5 rounded-none border text-xs ${
                  selectedLogDetail.action === 'Approved'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                }`}>
                  {selectedLogDetail.action}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Authorized By:</span>
                <span className="text-primary">{selectedLogDetail.actionBy}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Timestamp:</span>
                <span className="font-mono text-muted">{formatDate(selectedLogDetail.actionDate || selectedLogDetail.createdAt)}</span>
              </div>
              {Number(selectedLogDetail.amount) > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-theme-subtle/50">
                  <span className="text-muted">Consideration Amount:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedLogDetail.amount)}
                  </span>
                </div>
              )}
            </div>

            {selectedLogDetail.notes && (
              <div className="p-3 bg-surface border border-theme-subtle rounded-none">
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">
                  Managerial Remarks / Justification
                </label>
                <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">
                  {selectedLogDetail.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-theme-subtle">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLogDetail(null)} className="rounded-none font-medium">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
