import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Download, Filter, Users, Star, UserCheck, UserX, Building2, User, Trash2, CheckCircle2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useCustomers } from '@/hooks/useData'
import { createCustomer, deleteCustomer } from '@/lib/api'
import { formatCurrency, relativeTime, toMySQLDate } from '@/lib/utils'

type StatusFilter  = 'all' | 'active' | 'vip' | 'prospect' | 'inactive'
type SegmentFilter = 'all' | 'enterprise' | 'sme' | 'retail'

export const Customers: React.FC = () => {
  const navigate = useNavigate()
  const { data: customers, loading, refetch } = useCustomers()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [isModalOpen, setIsModalOpen]     = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: '', phone2: '', industry: '', segment: 'sme', address: '', vat: '', svat: '', brNumber: '', rating: 0, creditLimit: 0, creditDays: 30, financeContactName: '', financeContactEmail: '', financeContactPhone: '', bankName: '', bankBranch: '', bankAccountNo: '', requiresAdvance: true, accountManager: 'System Admin', currency: 'LKR', isForeign: false
  })

  const [users, setUsers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/users`)
      .then(res => res.json())
      .then(setUsers).catch(console.error);
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies`)
      .then(res => res.json())
      .then(setCurrencies).catch(console.error);
  }, []);

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading customers...</div>

  
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this customer?')) {
      setDeleting(id);
      try {
        await deleteCustomer(id);
        refetch();
      } catch (err) {
        alert('Failed to delete customer.');
      }
      setDeleting(null);
    }
  }

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
      avatar: formData.name.substring(0, 2).toUpperCase()
    }
    
    await createCustomer(newCustomer)
    await refetch()
    setSubmitting(false)
    setIsModalOpen(false)
    setFormData({ name: '', company: '', email: '', phone: '', phone2: '', industry: '', segment: 'sme', address: '', vat: '', svat: '', brNumber: '', rating: 0, creditLimit: 0, creditDays: 30, financeContactName: '', financeContactEmail: '', financeContactPhone: '', bankName: '', bankBranch: '', bankAccountNo: '', requiresAdvance: true, accountManager: 'System Admin', currency: 'LKR', isForeign: false })
  }

  const filtered = customers.filter(c => {
    const matchSearch  = [c.name, c.company, c.email, c.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
    const matchStatus  = statusFilter  === 'all' || c.status  === statusFilter
    const matchSegment = segmentFilter === 'all' || c.segment === segmentFilter
    const matchManager = managerFilter === 'all' || c.accountManager === managerFilter
    return matchSearch && matchStatus && matchSegment && matchManager
  })

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Customer', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{row.avatar}</span>
            </div>
            {row.isForeign ? (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-surface"></span>
              </span>
            ) : null}
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
    { key: 'lifetimeValue', header: 'LTV', align: 'right', sortable: true, render: (v, row) => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true, row.currency)}</span> },
    
    { key: 'lastOrder', header: 'Last Order', sortable: true, render: v => <span className="text-xs text-muted">{relativeTime(String(v))}</span> },
    { key: 'actions', header: '', align: 'right', render: (_, row) => (
      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10 px-2 h-6" onClick={(e) => handleDelete(e, row.id)}>
        {deleting === row.id ? '...' : <Trash2 size={13} />}
      </Button>
    )},

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
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="bg-surface border border-theme-subtle px-2 py-1 text-xs text-secondary rounded outline-none focus:border-rex-500">
          <option value="all">All Users</option>
          <option value="System Admin">System Admin</option>
          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
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
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full input-base">
                  <option value="LKR">LKR (Base)</option>
                  {currencies.map(c => (
                     <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Physical Address</label>
                <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full input-base" placeholder="123 Main St, City" />
              </div>
            </div>
          </div>

          {/* Section: Tax & Financials */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Building2 size={14} className="text-amber-500" />
              Tax & Financials
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">BR Number</label>
                <input value={formData.brNumber} onChange={e => setFormData({...formData, brNumber: e.target.value})} className="w-full input-base" placeholder="Business Registration No" />
              </div>
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="VAT Registration No" />
              </div>
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT Number</label>
                <input value={formData.svat} onChange={e => setFormData({...formData, svat: e.target.value})} className="w-full input-base" placeholder="SVAT Registration No" />
              </div>
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Credit Limit (Rs)</label>
                <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} className="w-full input-base" placeholder="e.g. 500000" />
              </div>
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Payment Period (Days)</label>
                <input type="number" value={formData.creditDays} onChange={e => setFormData({...formData, creditDays: Number(e.target.value)})} className="w-full input-base" placeholder="30" />
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
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" placeholder="john@acme.com" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Primary Phone</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Secondary Phone</label>
                <input value={formData.phone2} onChange={e => setFormData({...formData, phone2: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
              </div>
            </div>
          </div>

          {/* Section: Finance Contact */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <User size={14} className="text-blue-500" />
              Finance / Billing Contact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Contact Name</label>
                <input value={formData.financeContactName} onChange={e => setFormData({...formData, financeContactName: e.target.value})} className="w-full input-base" placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.financeContactEmail} onChange={e => setFormData({...formData, financeContactEmail: e.target.value})} className="w-full input-base" placeholder="finance@acme.com" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number</label>
                <input value={formData.financeContactPhone} onChange={e => setFormData({...formData, financeContactPhone: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
              </div>
            </div>
          </div>

          {/* Section: Bank Details */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Building2 size={14} className="text-emerald-500" />
              Bank Account Details
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Bank Name</label>
                <input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full input-base" placeholder="Commercial Bank" />
              </div>
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Branch</label>
                <input value={formData.bankBranch} onChange={e => setFormData({...formData, bankBranch: e.target.value})} className="w-full input-base" placeholder="City Branch" />
              </div>
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Number</label>
                <input value={formData.bankAccountNo} onChange={e => setFormData({...formData, bankAccountNo: e.target.value})} className="w-full input-base" placeholder="000111222333" />
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
