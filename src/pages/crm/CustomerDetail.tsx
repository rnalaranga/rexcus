import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, ArrowRight, Phone, Mail, MapPin, Building2, User, Users, Trash2, Plus, Calendar, Briefcase, Edit2, Star, Download, Search, Receipt, Bell, CheckCircle2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useCustomers, useDeals, useFollowups, useLeads, useQuotations } from '@/hooks/useData'
import { updateCustomer, fetchAllCustomerGRNs } from '@/lib/api'
import { formatCurrency, formatDate, relativeTime } from '@/lib/utils'
import { useAccounts } from '@/hooks/useFinance'
import { useDialog } from '@/components/ui/DialogProvider'
import { useAuth } from '@/contexts/AuthContext'

// Using real ledger API now

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { user } = useAuth()
  
  const { data: quotations } = useQuotations()
  const { data: customers, loading: cl, refetch } = useCustomers()
  const { data: deals, loading: dl } = useDeals()
  const { data: allFollowups } = useFollowups()
  const { data: leads } = useLeads()
  const { data: accounts } = useAccounts()
  const { showError, toast } = useDialog()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/users`)
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : [])).catch(console.error);
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies`)
      .then(res => res.json())
      .then(data => setCurrencies(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);
  
  // Ledger View State
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'quotations' | 'samples'>('overview')
  const [grns, setGrns] = useState<any[]>([])
  
  React.useEffect(() => {
    const cust = customers?.find(c => c.id === id);
    fetchAllCustomerGRNs().then(data => {
      setGrns(data.filter((g: any) => {
        // filter logic: grn leadId might belong to this customer
        const lead = leads?.find((l: any) => l.id === g.leadId);
        return lead?.customerId === id || g.customerId === id || g.customerName === cust?.name;
      }))
    }).catch(console.error)
  }, [id, leads, customers])
  
  const [ledgerData, setLedgerData] = useState<{ lines: any[], balance: number }>({ lines: [], balance: 0 })
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustType, setAdjustType] = useState<'adjust' | 'opening'>('adjust')

  React.useEffect(() => {
    if (activeTab === 'ledger' && id) {
      setLedgerLoading(true);
      import('@/lib/api').then(({ fetchPartyLedger }) => {
        fetchPartyLedger(id).then(data => {
          setLedgerData(data || { lines: [], balance: 0 });
          setLedgerLoading(false);
        }).catch(() => setLedgerLoading(false));
      });
    }
  }, [activeTab, id]);

  if (cl || dl) return <div className="p-8 text-center text-muted animate-pulse">Loading profile...</div>

  const customer = customers.find(c => c.id === id)

  if (!customer) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-muted text-sm">Customer not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm/customers')} className="mt-3">â† Back</Button>
      </div>
    </div>
  )
  const handleUpdateRating = async (rating: number) => {
    try {
      await fetch(`http://localhost:3000/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/customers/${id}/approve-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast(`Customer changes ${status} successfully`, 'success');
        refetch();
      } else {
        showError(`Failed to ${status} changes`);
      }
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleEditOpen = () => {
    setFormData({
      prefix: customer.prefix || '',
        name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      phone2: customer.phone2 || '',
      industry: customer.industry,
      segment: customer.segment,
      address: customer.address,
      status: customer.status,
      vat: customer.vat || '',
      svat: customer.svat || '',
      brNumber: customer.brNumber || '',
      rating: customer.rating || 0,
      creditLimit: customer.creditLimit || 0,
      creditDays: customer.creditDays || 30,
      financeContactName: customer.financeContactName || '',
      financeContactEmail: customer.financeContactEmail || '',
      financeContactPhone: customer.financeContactPhone || '',
      bankName: customer.bankName || '',
      bankBranch: customer.bankBranch || '',
      bankAccountNo: customer.bankAccountNo || '',
      requiresAdvance: !!customer.requiresAdvance,
      isForeign: !!customer.isForeign,
      accountManager: customer.accountManager || 'System Admin'
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await updateCustomer(customer.id, { ...formData, contacts: JSON.stringify(formData.contacts) })
    await refetch()
    setSubmitting(false)
    setIsEditOpen(false)
  }

  const customerDeals = deals.filter(d => d.customerId === customer.id)
  const customerLeads = leads ? leads.filter((l: any) => l.company?.trim().toLowerCase() === customer?.company?.trim().toLowerCase() || (customer?.email && l.email === customer?.email)) : []
  const wonDeals      = customerDeals.filter(d => d.stage === 'closed_won')
  const openDealsArr  = customerDeals.filter(d => !d.stage.includes('closed'))

  const contactRows = [
    { icon: Mail,      label: 'Email',           value: customer.email },
    { icon: Phone,     label: 'Primary Phone',   value: customer.phone },
    { icon: Phone,     label: 'Secondary Phone', value: customer.phone2 || 'Not Set' },
    { icon: MapPin,    label: 'Address',         value: customer.address || 'Not Set' },
    { icon: Building2, label: 'Industry',        value: customer.industry || 'Not Set' },
    { icon: User, Users, Trash2, Plus,      label: 'Account Manager', value: customer.accountManager || 'System Admin' },
    { icon: Calendar,  label: 'Customer Since',  value: formatDate(customer.joinDate) },
    { icon: Calendar,  label: 'Last Order',      value: relativeTime(customer.lastOrder) },
  ]

  const financeRows = [
    { icon: Building2, label: 'BR Number',       value: customer.brNumber || 'Not Set' },
    { icon: Building2, label: 'VAT Number',      value: customer.vat || 'Not Set' },
    { icon: Building2, label: 'SVAT Number',     value: customer.svat || 'Not Set' },
    { icon: Building2, label: 'Currency',        value: customer.currency || 'LKR' },
    { icon: Building2, label: 'Credit Limit',    value: customer.creditLimit ? formatCurrency(customer.creditLimit, false, customer.currency) : 'Not Set' },
    { icon: Building2, label: 'Payment Terms',   value: customer.creditDays ? `${customer.creditDays} Days` : 'Not Set' },
    { icon: User, Users, Trash2, Plus,      label: 'Billing Contact', value: customer.financeContactName ? `${customer.financeContactName} ${customer.financeContactPhone ? `(${customer.financeContactPhone})` : ''}` : 'Not Set' },
    { icon: Mail,      label: 'Billing Email',   value: customer.financeContactEmail || 'Not Set' },
    { icon: Building2, label: 'Bank Details',    value: customer.bankAccountNo ? `${customer.bankAccountNo} - ${customer.bankName} ${customer.bankBranch}` : 'Not Set' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/crm/customers')}>Back</Button>
        <div className="flex-1 flex gap-2 border-b border-theme-subtle">
           <button 
             onClick={() => setActiveTab('overview')}
             className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'overview' ? 'border-rex-600 text-primary' : 'border-transparent text-muted hover:text-secondary'}`}
           >
             Overview
           </button>
                        <button 
               onClick={() => setActiveTab('ledger')}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'ledger' ? 'border-rex-600 text-primary' : 'border-transparent text-muted hover:text-secondary'}`}
             >
               Ledger & Financials
             </button>
             <button 
               onClick={() => setActiveTab('quotations')}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'quotations' ? 'border-rex-600 text-primary' : 'border-transparent text-muted hover:text-secondary'}`}
             >
               Quotations
             </button>
             <button 
               onClick={() => setActiveTab('samples')}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'samples' ? 'border-rex-600 text-primary' : 'border-transparent text-muted hover:text-secondary'}`}
             >
               Customer Samples
             </button>
        </div>
        <Button variant="ghost" size="sm" icon={Edit2} onClick={handleEditOpen}>Edit</Button>
        <Button variant="primary" size="sm" icon={Briefcase} onClick={() => navigate('/crm/deals')}>New Deal</Button>
      </div>

      {customer.creditLimitStatus === 'pending' && user?.role === 'admin' && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg animate-pulse-slow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-500">Pending Approvals Required</h3>
              <p className="text-xs text-secondary mt-1">
                {Number(customer.pendingCreditLimit) > 0 && Number(customer.pendingCreditLimit) !== Number(customer.creditLimit) && <span>Requested Limit: {formatCurrency(customer.pendingCreditLimit, false, customer.currency)} &nbsp;&bull;&nbsp; </span>}
                {customer.pendingCreditDays !== null && customer.pendingCreditDays !== customer.creditDays && <span>Requested Period: {customer.pendingCreditDays} Days &nbsp;&bull;&nbsp; </span>}
                {customer.pendingRequiresAdvance !== null && Boolean(customer.pendingRequiresAdvance) !== Boolean(customer.requiresAdvance) && <span>Requested Advance: {customer.pendingRequiresAdvance ? 'Required' : 'Not Required'}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={() => handleApprove('rejected')}>Reject</Button>
              <Button variant="primary" size="sm" onClick={() => handleApprove('approved')}>Approve Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile card */}
      <GlassCard variant="red" className="p-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="w-16 h-16 flex-shrink-0 bg-rex-700 border border-rex-600/60 flex items-center justify-center shadow-glow-red-sm">
              <span className="text-xl font-bold text-white">{customer.avatar}</span>
            </div>
            {customer.isForeign ? (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-surface"></span>
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-primary">{customer.company}</h1>
                  {customer.status === 'vip' && <Star size={14} className="text-rex-500 fill-rex-500" />}
                </div>
                <p className="text-sm text-secondary">{customer.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-muted font-mono">{customer.id}</p>
                  <div className="w-px h-3 bg-theme-subtle"></div>
                  <div className="flex items-center gap-1 cursor-pointer group" title="Click to update rating">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        size={12} 
                        onClick={() => handleUpdateRating(star)} 
                        className={`transition-colors ${star <= (customer.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-theme-subtle group-hover:text-amber-500/50'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={customer.segment} size="md" />
                <Badge value={customer.status}  size="md" />
                {customer.requiresAdvance ? <Badge value="Advance Required" variant="warning" size="md" /> : null}
                {customer.creditLimitStatus === 'pending' ? <Badge value={`Limit Pending: ${customer.pendingCreditLimit}`} variant="error" size="md" /> : null}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-rex-500/20">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest">Lifetime Value</p>
                <p className="text-lg font-bold text-rex-600 dark:text-rex-300 mt-0.5">{formatCurrency(customer.lifetimeValue, true, customer.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest">Total Revenue</p>
                <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(customer.totalRevenue, true, customer.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest">Open Deals</p>
                <p className="text-lg font-bold text-primary mt-0.5">{customer.openDeals}</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact Info */}
          <GlassCard className="col-span-1 p-5">
            <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Contact Information</h2>
            <div className="space-y-3">
              {contactRows.map(row => {
                const Icon = row.icon
                return (
                  <div key={row.label} className="flex items-start gap-3">
                    <Icon size={13} className="text-muted mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted uppercase tracking-wider">{row.label}</p>
                      <p className="text-xs text-secondary mt-0.5 break-words">{row.value}</p>
                    </div>
                  </div>
                )
              })}

            </div>

            {customer.contacts && customer.contacts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-theme-subtle">
                <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Additional Contacts</h2>
                <div className="space-y-3">
                  {customer.contacts.map((c: any, i: number) => (
                    <div key={i} className="bg-surface2 p-2.5 rounded border border-theme-subtle/50">
                      <p className="text-xs font-semibold text-primary">{c.name} {c.designation ? <span className="text-[10px] font-normal text-muted">- {c.designation}</span> : ''}</p>
                      {c.phone && <p className="text-[10px] text-secondary mt-1 flex items-center gap-1.5"><Phone size={10} /> {c.phone}</p>}
                      {c.email && <p className="text-[10px] text-secondary mt-0.5 flex items-center gap-1.5"><Mail size={10} /> {c.email}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>


          <GlassCard className="col-span-1 lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                <Bell size={13} className="text-amber-500"/>
                Recent Activities
              </h2>
              <button
                type="button"
                onClick={() => navigate('/crm/followups')}
                className="text-[10px] text-rex-500 hover:underline"
              >
                Manage Activities
              </button>
            </div>
            <div className="space-y-2">
              {allFollowups.filter((f: any) => f.relatedType === 'customer' && f.relatedId === customer.id).length === 0 ? (
                <p className="text-[10px] text-muted italic text-center py-8">No activities logged for this customer.</p>
              ) : (
                allFollowups.filter((f: any) => f.relatedType === 'customer' && f.relatedId === customer.id).slice(0, 4).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 glass hover:bg-surface2/50 rounded-lg cursor-pointer transition-colors" onClick={() => navigate('/crm/followups')}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-primary truncate">{f.subject}</p>
                      <p className="text-[10px] text-muted mt-0.5">{f.type.toUpperCase()} Â· {f.assignedTo || 'Unassigned'} Â· Due {String(f.dueDate).slice(0, 10)} {f.dueTime}</p>
                    </div>
                    <Badge variant={f.status === 'done' ? 'success' : f.status === 'overdue' ? 'error' : 'info'} size="sm">
                      {f.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          
          {/* Leads & Inquiries */}
          <GlassCard className="col-span-1 lg:col-span-3 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest">Leads & Quotations ({customerLeads.length})</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/crm/leads')} className="text-[10px] text-rex-500 hover:underline">View All</Button>
            </div>
            {customerLeads.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No leads or inquiries yet</p>
            ) : (
              <div className="space-y-2">
                {customerLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-4 px-4 py-3 glass hover:bg-rex-500/4 transition-colors cursor-pointer" onClick={() => navigate('/crm/quotations/new/' + lead.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{lead.name}</p>
                      <p className="text-[10px] text-muted mt-0.5">{lead.source} â€¢ {lead.priority}</p>
                    </div>
                    <Badge value={lead.stage} size="sm" />
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(lead.value, true, customer.currency)}</p>
                      <p className="text-[10px] text-muted">{lead.probability}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Deals */}

          <GlassCard className="col-span-1 lg:col-span-3 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest">Deals ({customerDeals.length})</h2>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-emerald-600 dark:text-emerald-400">{wonDeals.length} won</span>
                <span className="text-muted">{openDealsArr.length} open</span>
              </div>
            </div>
            {customerDeals.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No deals yet</p>
            ) : (
              <div className="space-y-2">
                {customerDeals.map(deal => (
                  <div key={deal.id} className="flex items-center gap-4 px-4 py-3 glass hover:bg-rex-500/4 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{deal.title}</p>
                      <p className="text-[10px] text-muted mt-0.5">{deal.product} Â· {deal.owner}</p>
                    </div>
                    <Badge value={deal.stage.replace('closed_', '')} size="sm" />
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(deal.value, true, customer.currency)}</p>
                      <p className="text-[10px] text-muted">{deal.probability}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
      
      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <GlassCard className="col-span-1 p-5">
            <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Financial Details</h2>
            <div className="space-y-3">
              {financeRows.map(row => {
                const Icon = row.icon
                return (
                  <div key={row.label} className="flex items-start gap-3">
                    <Icon size={13} className="text-muted mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted uppercase tracking-wider">{row.label}</p>
                      <p className="text-xs text-secondary mt-0.5 break-words">{row.value}</p>
                    </div>
                  </div>
                )
              })}

            </div>

            {customer.contacts && customer.contacts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-theme-subtle">
                <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Additional Contacts</h2>
                <div className="space-y-3">
                  {customer.contacts.map((c: any, i: number) => (
                    <div key={i} className="bg-surface2 p-2.5 rounded border border-theme-subtle/50">
                      <p className="text-xs font-semibold text-primary">{c.name} {c.designation ? <span className="text-[10px] font-normal text-muted">- {c.designation}</span> : ''}</p>
                      {c.phone && <p className="text-[10px] text-secondary mt-1 flex items-center gap-1.5"><Phone size={10} /> {c.phone}</p>}
                      {c.email && <p className="text-[10px] text-secondary mt-0.5 flex items-center gap-1.5"><Mail size={10} /> {c.email}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          <div className="col-span-1 lg:col-span-3">
            <GlassCard className="p-0 overflow-hidden h-full">
              <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Receipt size={14} className="text-rex-500" />
                  Customer Ledger
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <Button variant="ghost" size="sm" onClick={() => { setAdjustType('opening'); setShowAdjustModal(true); }}>Opening Balance</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAdjustType('adjust'); setShowAdjustModal(true); }}>Adjust Balance</Button>
                  <Button variant="primary" size="sm" onClick={() => setShowPaymentModal(true)}>Record Payment</Button>
                  <div className="ml-4 pl-4 border-l border-theme-subtle"><span className="text-muted uppercase tracking-widest text-[9px] mr-2">Outstanding</span> <span className="font-bold text-rex-600 dark:text-rex-400">{formatCurrency(ledgerData.balance || 0, true, customer.currency)}</span></div>
                </div>
              </div>
              <div className="overflow-x-auto">
            {ledgerLoading ? (
              <div className="p-8 text-center text-muted">Loading ledger...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/50">
                    <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Debit (Rs)</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Credit (Rs)</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Balance (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.lines.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted">No transactions found</td></tr>
                  ) : ledgerData.lines.map((trx) => (
                    <tr key={trx.id} className="border-b border-theme-subtle/50 hover:bg-surface2/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">{formatDate(trx.date)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted">{trx.reference || '-'}</td>
                      <td className="px-4 py-3 text-xs text-primary">{trx.description || trx.entryDescription}</td>
                      <td className="px-4 py-3 text-xs text-right text-rex-600 dark:text-rex-400 font-semibold">{Number(trx.debit) > 0 ? Number(trx.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="px-4 py-3 text-xs text-right text-emerald-600 dark:text-emerald-400 font-semibold">{Number(trx.credit) > 0 ? Number(trx.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="px-4 py-3 text-xs text-right text-primary font-bold">{Number(trx.runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
          </div>
        </div>
      )}

      
      {activeTab === 'quotations' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-rex-500" />
              Customer Quotations
            </h2>
            <Button variant="primary" size="sm" onClick={() => navigate(`/crm/quotations/new/${id}`)}>Create Quotation</Button>
          </div>
          <div className="divide-y divide-theme-subtle">
            {quotations.filter((q: any) => q.leadId === id).length === 0 ? (
               <div className="p-8 text-center text-muted text-sm">No quotations found for this customer.</div>
            ) : (
               quotations.filter((q: any) => q.leadId === id).map((q: any) => {
                 let quoNo = q.id;
                 try { const d = JSON.parse(q.data); if(d.quotationNo) quoNo = d.quotationNo; } catch(e) {}
                 return (
                   <div key={q.id} className="p-4 hover:bg-surface2/30 transition-colors flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-lg bg-rex-500/10 text-rex-600 flex items-center justify-center">
                         <FileText size={18} />
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-primary">{quoNo}</h4>
                         <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                           <span>{formatDate(q.date)}</span>
                           <Badge value={q.type || 'Main'} size="sm" />
                           <span className="font-mono text-[10px]">v{q.version}</span>
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-6">
                       <div className="text-right">
                         <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">Amount</p>
                         <p className="text-sm font-black text-primary font-mono">{formatCurrency(Number(q.totalAmount), false, customer.currency)}</p>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => navigate(`/crm/quotations/new/${id}?quoteId=${q.id}`)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                         Open <ArrowRight size={14} className="ml-1" />
                       </Button>
                     </div>
                   </div>
                 );
               })
            )}
          </div>
        </GlassCard>
      )}

      {activeTab === 'samples' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-emerald-500" />
              Customer Samples (GRNs)
            </h2>
          </div>
          <div className="divide-y divide-theme-subtle">
            {grns.length === 0 ? (
               <div className="p-8 text-center text-muted text-sm">No samples found for this customer.</div>
            ) : (
               grns.map((g: any) => {
                 return (
                   <div key={g.id} className="p-4 hover:bg-surface2/30 transition-colors flex flex-col gap-2 group">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                           <FileText size={18} />
                         </div>
                         <div>
                           <h4 className="text-sm font-bold text-primary">{g.id}</h4>
                           <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                             <span>{new Date(g.createdAt).toLocaleString()}</span>
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">Received By</p>
                         <p className="text-sm font-semibold text-primary">{g.receivedBy}</p>
                       </div>
                     </div>
                     <div className="pl-14">
                       <div className="text-sm text-secondary bg-surface2/50 p-2 rounded border border-theme-subtle space-y-1">
                           {(() => {
                              try {
                                const parsed = JSON.parse(g.items);
                                if (Array.isArray(parsed)) return parsed.map((item: any, i: number) => <div key={i}>• {item.description} (Qty: {item.qty})</div>);
                                return g.items;
                              } catch(e) { return g.items; }
                           })()}
                         </div>
                       {g.notes && <p className="text-xs text-muted mt-1 italic">{g.notes}</p>}
                     </div>
                   </div>
                 );
               })
            )}
          </div>
        </GlassCard>
      )}

      {/* Edit Customer Modal */}

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Customer Account" size="lg">
        {formData && (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <Building2 size={14} className="text-rex-500" />
                Company Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company Name <span className="text-rex-500">*</span></label>
                  <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Customer Prefix</label>
                  <input value={formData.prefix || ''} onChange={e => setFormData({...formData, prefix: e.target.value})} className="w-full input-base" placeholder="e.g. ACM" maxLength={5} />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Customer Rating</label>
                  <select value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} className="w-full input-base">
                    <option value={0}>Unrated</option>
                    <option value={1}>⭐ (1) Poor</option>
                    <option value={2}>⭐⭐ (2) Fair</option>
                    <option value={3}>⭐⭐⭐ (3) Good</option>
                    <option value={4}>⭐⭐⭐⭐ (4) Very Good</option>
                    <option value={5}>⭐⭐⭐⭐⭐ (5) Excellent</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Industry</label>
                  <input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Segment</label>
                  <select value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value})} className="w-full input-base">
                    <option value="enterprise">Enterprise</option>
                    <option value="sme">SME (Small/Medium Enterprise)</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full input-base">
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Manager</label>
                  <select value={formData.accountManager} onChange={e => setFormData({...formData, accountManager: e.target.value})} className="w-full input-base">
                    <option value="System Admin">System Admin</option>
                    {users.map(u => (
                       <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Currency</label>
                  <select value={formData.currency || 'LKR'} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full input-base">
                    <option value="LKR">LKR (Base)</option>
                    {currencies.map(c => (
                       <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Physical Address</label>
                  <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full input-base" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <Building2 size={14} className="text-amber-500" />
                Tax & Financials
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">BR Number</label>
                  <input value={formData.brNumber} onChange={e => setFormData({...formData, brNumber: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                  <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT Number</label>
                  <input value={formData.svat} onChange={e => setFormData({...formData, svat: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Credit Limit (Rs)</label>
                  <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Payment Period (Days)</label>
                  <input type="number" value={formData.creditDays} onChange={e => setFormData({...formData, creditDays: Number(e.target.value)})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Default Payment Terms</label>
                  <textarea value={formData.paymentTerms || ''} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} placeholder="e.g. 50% Advance" className="w-full input-base resize-y min-h-[40px]" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Default Delivery Terms</label>
                  <textarea value={formData.deliveryTerms || ''} onChange={e => setFormData({...formData, deliveryTerms: e.target.value})} placeholder="e.g. Ex-Works" className="w-full input-base resize-y min-h-[40px]" />
                </div>
                <div className="col-span-3 mt-2">
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      formData.requiresAdvance 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-theme-subtle bg-surface/50 hover:bg-surface'
                    }`}
                  >
                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded border ${
                      formData.requiresAdvance ? 'bg-amber-500 border-amber-500 text-white' : 'border-secondary/30'
                    }`}>
                      {formData.requiresAdvance && <CheckCircle2 size={14} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-primary">Requires Advance Payment</div>
                      <div className="text-[10px] text-secondary mt-0.5">Customer orders must be paid upfront before processing. Changes require admin approval.</div>
                    </div>
                    <input type="checkbox" className="hidden" checked={formData.requiresAdvance} onChange={e => setFormData({...formData, requiresAdvance: e.target.checked})} />
                  </label>
                </div>
                <div className="col-span-3 mt-1">
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      formData.isForeign 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-theme-subtle bg-surface/50 hover:bg-surface'
                    }`}
                  >
                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded border ${
                      formData.isForeign ? 'bg-blue-500 border-blue-500 text-white' : 'border-secondary/30'
                    }`}>
                      {formData.isForeign && <CheckCircle2 size={14} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-primary">Foreign Customer</div>
                      <div className="text-[10px] text-secondary mt-0.5">Customer is based outside the local region. A blue indicator will be shown.</div>
                    </div>
                    <input type="checkbox" className="hidden" checked={formData.isForeign} onChange={e => setFormData({...formData, isForeign: e.target.checked})} />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <User size={14} className="text-rex-500" />
                Primary Contact Person
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Full Name <span className="text-rex-500">*</span></label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Primary Phone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Secondary Phone</label>
                  <input type="tel" value={formData.phone2} onChange={e => setFormData({...formData, phone2: e.target.value})} className="w-full input-base" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <User size={14} className="text-blue-500" />
                Finance / Billing Contact
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Contact Name</label>
                  <input value={formData.financeContactName} onChange={e => setFormData({...formData, financeContactName: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                  <input type="email" value={formData.financeContactEmail} onChange={e => setFormData({...formData, financeContactEmail: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number</label>
                  <input value={formData.financeContactPhone} onChange={e => setFormData({...formData, financeContactPhone: e.target.value})} className="w-full input-base" />
                </div>
              </div>
            </div>


            {/* Section: Additional Contacts */}
            <div className="col-span-full mt-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} className="text-purple-500" />
                  Additional Contacts
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData((f: any) => ({...f, contacts: [...(f.contacts || []), { id: Date.now(), name: '', designation: '', phone: '', email: '' }] }))} icon={Plus}>Add Contact</Button>
              </div>
              
              <div className="space-y-3">
                {(formData.contacts || []).map((c: any, i: number) => (
                  <div key={c.id || i} className="flex items-start gap-2 bg-surface2 p-3 rounded-lg border border-theme-subtle/50 relative">
                    <div className="grid grid-cols-4 gap-3 flex-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Name</label>
                        <input value={c.name} onChange={e => {
                          const newContacts = [...formData.contacts];
                          newContacts[i].name = e.target.value;
                          setFormData({...formData, contacts: newContacts});
                        }} className="w-full text-xs input-base py-1.5 px-2" placeholder="John Doe" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Designation</label>
                        <input value={c.designation} onChange={e => {
                          const newContacts = [...formData.contacts];
                          newContacts[i].designation = e.target.value;
                          setFormData({...formData, contacts: newContacts});
                        }} className="w-full text-xs input-base py-1.5 px-2" placeholder="Manager" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Phone</label>
                        <input value={c.phone} onChange={e => {
                          const newContacts = [...formData.contacts];
                          newContacts[i].phone = e.target.value;
                          setFormData({...formData, contacts: newContacts});
                        }} className="w-full text-xs input-base py-1.5 px-2" placeholder="+94 7X..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Email</label>
                        <input value={c.email} onChange={e => {
                          const newContacts = [...formData.contacts];
                          newContacts[i].email = e.target.value;
                          setFormData({...formData, contacts: newContacts});
                        }} className="w-full text-xs input-base py-1.5 px-2" placeholder="john@..." />
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      const newContacts = [...formData.contacts];
                      newContacts.splice(i, 1);
                      setFormData({...formData, contacts: newContacts});
                    }} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded mt-5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(!formData.contacts || formData.contacts.length === 0) && (
                  <div className="text-center py-4 border border-dashed border-theme-subtle rounded-lg text-xs text-muted">
                    No additional contacts added yet.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <Building2 size={14} className="text-emerald-500" />
                Bank Account Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Bank Name</label>
                  <input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Branch</label>
                  <input value={formData.bankBranch} onChange={e => setFormData({...formData, bankBranch: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Number</label>
                  <input value={formData.bankAccountNo} onChange={e => setFormData({...formData, bankAccountNo: e.target.value})} className="w-full input-base" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const amount = Number(formData.get('amount'));
          const depositAccountId = formData.get('depositAccountId') as string;
          const arAccountId = formData.get('arAccountId') as string;
          const date = formData.get('date') as string;
          const reference = formData.get('reference') as string;
          
          if (amount <= 0 || !depositAccountId || !arAccountId) return showError('Invalid amount or missing accounts');
          
          try {
            const { createJournal } = await import('@/lib/api');
            const je = {
              id: 'PMT-' + Date.now().toString().slice(-4),
              date,
              reference,
              description: `Payment from ${customer.name}`,
              totalAmount: amount,
              createdBy: 'System',
              lines: [
                { id: crypto.randomUUID(), accountId: depositAccountId, debit: amount, credit: 0, description: 'Payment Received' },
                { id: crypto.randomUUID(), accountId: arAccountId, debit: 0, credit: amount, partyId: customer.id, partyType: 'customer', description: 'Customer Payment' }
              ]
            };
            await createJournal(je);
            toast('Payment recorded successfully', 'success');
            setShowPaymentModal(false);
            setActiveTab('overview'); setTimeout(() => setActiveTab('ledger'), 10);
          } catch(err: any) { showError(err.message, 'Error'); }
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Date</label>
              <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Amount</label>
              <input type="number" step="0.01" name="amount" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Deposit To (Bank/Cash)</label>
              <select name="depositAccountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                <option value="">-- Select Account --</option>
                {accounts.filter(a => a.subtype === 'Bank' || a.subtype === 'Current Asset').map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Customer AR Account</label>
              <select name="arAccountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                <option value="">-- Select AR Account --</option>
                {accounts.filter(a => a.type === 'Asset').map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Reference (Check/Transfer No)</label>
              <input type="text" name="reference" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" type="button" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={adjustType === 'opening' ? "Set Opening Balance" : "Adjust Customer Balance"}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const amount = Number(formData.get('amount'));
          const type = formData.get('type') as string;
          const arAccountId = formData.get('arAccountId') as string;
          const offsetAccountId = formData.get('offsetAccountId') as string;
          const date = formData.get('date') as string;
          const reference = formData.get('reference') as string;
          const description = formData.get('description') as string;
          
          if (amount <= 0 || !arAccountId || !offsetAccountId) return showError('Invalid amount or missing accounts');
          
          try {
            const { createJournal } = await import('@/lib/api');
            const je = {
              id: 'ADJ-' + Date.now().toString().slice(-4),
              date,
              reference,
              description: adjustType === 'opening' ? `Opening Balance: ${description}` : `Balance Adjustment: ${description}`,
              totalAmount: amount,
              createdBy: 'System',
              lines: [
                { id: crypto.randomUUID(), accountId: arAccountId, debit: type === 'increase' ? amount : 0, credit: type === 'decrease' ? amount : 0, partyId: customer.id, partyType: 'customer', description },
                { id: crypto.randomUUID(), accountId: offsetAccountId, debit: type === 'decrease' ? amount : 0, credit: type === 'increase' ? amount : 0, description }
              ]
            };
            await createJournal(je);
            toast(adjustType === 'opening' ? 'Opening balance recorded successfully' : 'Adjustment recorded successfully', 'success');
            setShowAdjustModal(false);
            setActiveTab('overview'); setTimeout(() => setActiveTab('ledger'), 10);
          } catch(err: any) { showError(err.message, 'Error'); }
        }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">Adjustment Type</label>
                  <select name="type" defaultValue="increase" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                    <option value="increase">Increase Balance (Debit AR)</option>
                    <option value="decrease">Decrease Balance (Credit AR)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">Date</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
               </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Amount</label>
              <input type="number" step="0.01" name="amount" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Customer AR Account (Affected)</label>
              <select name="arAccountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                <option value="">-- Select AR Account --</option>
                {accounts.filter(a => a.type === 'Asset').map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Offset Account (e.g. Sales / Opening Bal Equity)</label>
              <select name="offsetAccountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                <option value="">-- Select Offset Account --</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Description</label>
              <input type="text" name="description" required defaultValue={adjustType === 'opening' ? 'Opening Balance' : ''} placeholder="e.g. Opening Balance" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" type="button" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


