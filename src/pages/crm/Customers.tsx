import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Download, Filter, Users, Star, UserCheck, UserX, Building2, User, Trash2, CheckCircle2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { CustomerModal } from '@/components/crm/CustomerModal'
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

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => refetch()} 
      />
    </div>
  )
}
