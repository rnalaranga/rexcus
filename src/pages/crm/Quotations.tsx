import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Download, Filter } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useQuotations } from '@/hooks/useData'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteQuotation } from '@/lib/api'

type TypeFilter = 'all' | 'main' | 'job' | 'supply'

export const Quotations: React.FC = () => {
  const navigate = useNavigate()
  const { data: quotations, loading, refetch } = useQuotations()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading quotations...</div>

  const filtered = quotations.filter(q => {
    const matchSearch = [q.id, q.leadName, q.leadCompany].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchType = typeFilter === 'all' || q.type === typeFilter
    return matchSearch && matchType
  })

  const columns: Column<any>[] = [
    {
      key: 'id', header: 'Quotation', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug font-mono">{row.id}</p>
            <p className="text-[10px] text-muted truncate mt-0.5">{formatDate(row.date)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'leadName', header: 'Customer / Lead', sortable: true,
      render: (val: any, row: any) => (
        <div>
          <p className="text-sm font-semibold text-primary truncate">{val || 'Unknown'}</p>
          <p className="text-[10px] text-muted truncate">{row.leadCompany || ''}</p>
        </div>
      )
    },
    { key: 'type', header: 'Type', width: '80px', render: (v: any) => <Badge value={String(v || '').toUpperCase()} size="sm" /> },
    { key: 'version', header: 'Rev', width: '50px', render: (v: any) => <span className="text-xs text-muted font-mono">v{v}</span> },
    {
      key: 'totalAmount', header: 'Amount', align: 'right', sortable: true,
      render: (v: any) => <span className="text-sm font-bold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v))}</span>
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (_, row) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/crm/quotations/new/${row.leadId}?quoteId=${row.id}`)}>Open</Button>
          <Button variant="ghost" size="sm" onClick={async () => {
            if (confirm('Delete this quotation?')) { await deleteQuotation(row.id); refetch() }
          }} className="text-red-500 hover:bg-red-500/10">Delete</Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Quotations</h1>
          <p className="text-xs text-muted mt-0.5">{quotations.length} total &middot; {quotations.filter(q => q.type === 'main').length} main quotes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/crm/leads')}>New Quote</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by quote no, customer, company..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Type:</span>
        {(['all', 'main', 'job', 'supply'] as TypeFilter[]).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-2.5 py-1 text-xs border transition-colors ${typeFilter === t ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/crm/quotations/new/${row.leadId}?quoteId=${row.id}`)}
          emptyMessage="No quotations match your filters."
        />
      </GlassCard>
    </div>
  )
}
