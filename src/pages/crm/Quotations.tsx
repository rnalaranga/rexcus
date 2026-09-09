import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, FileDown } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useQuotations } from '@/hooks/useData'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteQuotation } from '@/lib/api'

export const Quotations: React.FC = () => {
  const navigate = useNavigate()
  const { data: quotations, loading, refetch } = useQuotations()
  const [search, setSearch] = useState('')

  const filtered = quotations.filter(q => 
    q.id?.toLowerCase().includes(search.toLowerCase()) || 
    q.leadName?.toLowerCase().includes(search.toLowerCase()) ||
    q.leadCompany?.toLowerCase().includes(search.toLowerCase())
  )

  const columns: any[] = [
    { header: 'Quote No', key: 'id', sortable: true, render: (val: any) => <span className="font-mono font-bold text-primary">{val}</span> },
    { header: 'Date', key: 'date', sortable: true, render: (val: any) => formatDate(val) },
    { header: 'Customer / Lead', key: 'leadName', sortable: true, render: (val: any, row: any) => (
      <div>
        <div className="font-bold">{val || 'Unknown'}</div>
        <div className="text-xs text-muted">{row.leadCompany || ''}</div>
      </div>
    )},
    { header: 'Type', key: 'type', sortable: true, render: (val: any) => (
      <Badge variant={val === 'main' ? 'primary' : val === 'job' ? 'warning' : 'success'}>
        {val?.toUpperCase()}
      </Badge>
    )},
    { header: 'Rev', key: 'version', sortable: true, render: (val: any) => `v${val}` },
    { header: 'Amount', key: 'totalAmount', sortable: true, render: (val: any) => <span className="font-bold">{formatCurrency(val)}</span> },
    { header: 'Actions', key: 'actions', render: (_: any, row: any) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/crm/quotations/new/${row.leadId}?quoteId=${row.id}`)}>Open</Button>
        <Button variant="ghost" size="sm" onClick={async () => {
          if (confirm('Are you sure you want to delete this quotation?')) {
            await deleteQuotation(row.id)
            refetch()
          }
        }} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">Delete</Button>
      </div>
    )}
  ]

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <FileText className="text-primary" />
            Quotations
          </h1>
          <p className="text-secondary text-sm">Manage and track all generated quotations.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              placeholder="Search quotes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface/50 border border-theme-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/crm/leads')}>New Quote</Button>
        </div>
      </div>

      <GlassCard className="p-1">
        <DataTable columns={columns} data={filtered} keyExtractor={(row: any) => row.id} />
      </GlassCard>
    </div>
  )
}








