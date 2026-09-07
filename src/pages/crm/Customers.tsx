import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Download, Filter, Users, Star, UserCheck, UserX, Building2, User } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useCustomers } from '@/hooks/useData'
import { createCustomer } from '@/lib/api'
import { formatCurrency, relativeTime, toMySQLDate } from '@/lib/utils'

type StatusFilter  = 'all' | 'active' | 'vip' | 'prospect' | 'inactive'
type SegmentFilter = 'all' | 'enterprise' | 'sme' | 'retail'

export const Customers: React.FC = () => {
  const navigate = useNavigate()
  const { data: customers, loading, refetch } = useCustomers()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all')
  const [isModalOpen, setIsModalOpen]     = useState(false)
  const [submitting, setSubmitting]       = useState(false)

  const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: '', industry: '', segment: 'sme', address: ''
  })

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading customers...</div>

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const newCustomer = {
      id: 'CUST-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      ...formData,
      status: 'active',
      lifetimeValue: 0,
      totalRevenue: 0,
      openDeals: 0,
      lastOrder: toMySQLDate(new Date()),
      joinDate: toMySQLDate(new Date()),
      accountManager: 'System Admin',
      avatar: formData.name.substring(0, 2).toUpperCase()
    }
    
    await createCustomer(newCustomer)
    await refetch()
    setSubmitting(false)
    setIsModalOpen(false)
    setFormData({ name: '', company: '', email: '', phone: '', industry: '', segment: 'sme', address: '' })
  }

  const filtered = customers.filter(c => {
    const matchSearch  = [c.name, c.company, c.email, c.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
    const matchStatus  = statusFilter  === 'all' || c.status  === statusFilter
    const matchSegment = segmentFilter === 'all' || c.segment === segmentFilter
    return matchSearch && matchStatus && matchSegment
  })

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Customer', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{row.avatar}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5">{row.company}</p>
          </div>
        </div>
      ),
    },
    { key: 'id',       header: 'ID',       width: '90px',  render: v => <span className="text-[10px] text-muted font-mono">{String(v)}</span> },
    { key: 'email',    header: 'Contact',  width: '180px', render: (_, row) => <div className="text-xs text-secondary truncate">{row.email}<br/><span className="text-[10px] text-muted">{row.phone}</span></div> },
    { key: 'status',   header: 'Status',   width: '90px',  render: v => <Badge value={String(v)} size="sm" /> },
    { key: 'segment',  header: 'Segment',  width: '90px',  render: v => <Badge value={String(v)} size="sm" /> },
    { key: 'lifetimeValue', header: 'LTV', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true)}</span> },
    { key: 'lastOrder', header: 'Last Order', sortable: true, render: v => <span className="text-xs text-muted">{relativeTime(String(v))}</span> },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Customers</h1>
          <p className="text-xs text-muted mt-0.5">{customers.length} total customers · {customers.filter(c => c.status === 'vip').length} VIPs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download}>Export</Button>
          <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setIsModalOpen(true)}>Add Customer</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by name, company, email or ID..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Status:</span>
        {(['all', 'active', 'vip', 'prospect', 'inactive'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 text-xs border transition-colors ${statusFilter === s ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Users size={12} /> Segment:</span>
        {(['all', 'enterprise', 'sme', 'retail'] as SegmentFilter[]).map(s => (
          <button key={s} onClick={() => setSegmentFilter(s)} className={`px-2.5 py-1 text-xs border transition-colors ${segmentFilter === s ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <DataTable 
          columns={columns} 
          data={filtered} 
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/crm/customers/${row.id}`)}
          emptyMessage="No customers match your search filters."
        />
      </GlassCard>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Customer Account" size="lg">
        <form onSubmit={handleCreateCustomer} className="space-y-6">
          
          {/* Section: Company Details */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Building2 size={14} className="text-rex-500" />
              Company Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company Name <span className="text-rex-500">*</span></label>
                <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full input-base" placeholder="e.g. Acme Corporation" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Industry</label>
                <input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full input-base" placeholder="e.g. Manufacturing" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Segment</label>
                <select value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value})} className="w-full input-base">
                  <option value="sme">SME (Small/Medium Enterprise)</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="retail">Retail</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Physical Address</label>
                <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full input-base" placeholder="123 Main St, City" />
              </div>
            </div>
          </div>

          {/* Section: Primary Contact */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <User size={14} className="text-rex-500" />
              Primary Contact Person
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="John Doe" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" placeholder="john@acme.com" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Customer Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
