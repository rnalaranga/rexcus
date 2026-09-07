import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Building2, User, Calendar, Briefcase, Edit2, Star, Download, Search, Receipt, Bell } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useCustomers, useDeals, useFollowups } from '@/hooks/useData'
import { updateCustomer } from '@/lib/api'
import { formatCurrency, formatDate, relativeTime } from '@/lib/utils'

// Mock Ledger Data
const mockLedger = [
  { id: 'TRX-001', date: '2026-08-15', ref: 'INV-4401', desc: 'Order #4401 Invoice', debit: 450000, credit: 0, balance: 450000 },
  { id: 'TRX-002', date: '2026-08-20', ref: 'PAY-892', desc: 'Bank Transfer Payment', debit: 0, credit: 450000, balance: 0 },
  { id: 'TRX-003', date: '2026-09-01', ref: 'INV-4520', desc: 'Order #4520 Invoice', debit: 125000, credit: 0, balance: 125000 },
]

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  
  const { data: customers, loading: cl, refetch } = useCustomers()
  const { data: deals, loading: dl } = useDeals()
  const { data: allFollowups } = useFollowups()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>(null)
  
  // Ledger View State
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview')

  if (cl || dl) return <div className="p-8 text-center text-muted animate-pulse">Loading profile...</div>

  const customer = customers.find(c => c.id === id)

  if (!customer) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-muted text-sm">Customer not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm/customers')} className="mt-3">← Back</Button>
      </div>
    </div>
  )

  const handleEditOpen = () => {
    setFormData({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      industry: customer.industry,
      segment: customer.segment,
      address: customer.address,
      status: customer.status,
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await updateCustomer(customer.id, formData)
    await refetch()
    setSubmitting(false)
    setIsEditOpen(false)
  }

  const customerDeals = deals.filter(d => d.customerId === customer.id)
  const wonDeals      = customerDeals.filter(d => d.stage === 'closed_won')
  const openDealsArr  = customerDeals.filter(d => !d.stage.includes('closed'))

  const infoRows = [
    { icon: Mail,      label: 'Email',           value: customer.email },
    { icon: Phone,     label: 'Phone',           value: customer.phone },
    { icon: MapPin,    label: 'Address',         value: customer.address },
    { icon: Building2, label: 'Industry',        value: customer.industry },
    { icon: User,      label: 'Account Manager', value: customer.accountManager },
    { icon: Calendar,  label: 'Customer Since',  value: formatDate(customer.joinDate) },
    { icon: Calendar,  label: 'Last Order',      value: relativeTime(customer.lastOrder) },
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
        </div>
        <Button variant="ghost" size="sm" icon={Edit2} onClick={handleEditOpen}>Edit</Button>
        <Button variant="primary" size="sm" icon={Briefcase} onClick={() => navigate('/crm/deals')}>New Deal</Button>
      </div>

      {/* Profile card */}
      <GlassCard variant="red" className="p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 flex-shrink-0 bg-rex-700 border border-rex-600/60 flex items-center justify-center shadow-glow-red-sm">
            <span className="text-xl font-bold text-white">{customer.avatar}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-primary">{customer.name}</h1>
                  {customer.status === 'vip' && <Star size={14} className="text-rex-500 fill-rex-500" />}
                </div>
                <p className="text-sm text-secondary">{customer.company}</p>
                <p className="text-xs text-muted mt-0.5 font-mono">{customer.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge value={customer.segment} size="md" />
                <Badge value={customer.status}  size="md" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-rex-500/20">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest">Lifetime Value</p>
                <p className="text-lg font-bold text-rex-600 dark:text-rex-300 mt-0.5">{formatCurrency(customer.lifetimeValue, true)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest">Total Revenue</p>
                <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(customer.totalRevenue, true)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest">Open Deals</p>
                <p className="text-lg font-bold text-primary mt-0.5">{customer.openDeals}</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact Info */}
          <GlassCard className="col-span-1 p-5">
            <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Contact Information</h2>
            <div className="space-y-3">
              {infoRows.map(row => {
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
                      <p className="text-[10px] text-muted mt-0.5">{f.type.toUpperCase()} · {f.assignedTo || 'Unassigned'} · Due {String(f.dueDate).slice(0, 10)} {f.dueTime}</p>
                    </div>
                    <Badge variant={f.status === 'done' ? 'success' : f.status === 'overdue' ? 'error' : 'info'} size="sm">
                      {f.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
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
                      <p className="text-[10px] text-muted mt-0.5">{deal.product} · {deal.owner}</p>
                    </div>
                    <Badge value={deal.stage.replace('closed_', '')} size="sm" />
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(deal.value, true)}</p>
                      <p className="text-[10px] text-muted">{deal.probability}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Receipt size={14} className="text-rex-500" />
              Customer Ledger
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div><span className="text-muted uppercase tracking-widest text-[9px] mr-2">Total Debit</span> <span className="font-semibold text-primary">{formatCurrency(575000, true)}</span></div>
              <div><span className="text-muted uppercase tracking-widest text-[9px] mr-2">Total Credit</span> <span className="font-semibold text-primary">{formatCurrency(450000, true)}</span></div>
              <div><span className="text-muted uppercase tracking-widest text-[9px] mr-2">Outstanding</span> <span className="font-bold text-rex-600 dark:text-rex-400">{formatCurrency(125000, true)}</span></div>
            </div>
          </div>
          <div className="overflow-x-auto">
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
                {mockLedger.map((trx, i) => (
                  <tr key={trx.id} className="border-b border-theme-subtle/50 hover:bg-surface2/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">{trx.date}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted">{trx.ref}</td>
                    <td className="px-4 py-3 text-xs text-primary">{trx.desc}</td>
                    <td className="px-4 py-3 text-xs text-right text-rex-600 dark:text-rex-400 font-semibold">{trx.debit > 0 ? trx.debit.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-xs text-right text-emerald-600 dark:text-emerald-400 font-semibold">{trx.credit > 0 ? trx.credit.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-xs text-right text-primary font-bold">{trx.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Physical Address</label>
                  <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full input-base" />
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
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" />
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
    </div>
  )
}
