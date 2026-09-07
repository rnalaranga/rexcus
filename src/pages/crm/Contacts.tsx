import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Phone, Mail, Building2, Bell } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useCustomers } from '@/hooks/useData'

export const Contacts: React.FC = () => {
  const navigate = useNavigate()
  const { data: customers, loading } = useCustomers()
  const [search, setSearch] = useState('')
  const [view, setView]     = useState<'grid' | 'list'>('grid')

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading contacts...</div>

  // Map customers to contacts using correct DB field names
  const contacts = customers.map(c => ({
    id: c.id,
    name: c.name || '—',
    company: c.company || c.companyName || '—',
    email: c.email || '—',
    phone: c.phone || '—',
    avatar: c.avatar || (c.name || '?').substring(0, 2).toUpperCase(),
    status: c.status || 'active',
    role: 'Primary Contact',
    accountManager: c.accountManager || '—',
    industry: c.industry || '—',
    segment: c.segment || '—',
  }))

  const filtered = contacts.filter(c =>
    [c.name, c.company, c.email, c.phone].some(v =>
      v && v.toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Contact Directory</h1>
          <p className="text-xs text-muted mt-1">{contacts.length} contacts across all accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-theme-subtle rounded overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-3 py-1.5 text-xs transition-colors ${view === 'grid' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}`}>Grid</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs transition-colors ${view === 'list' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}`}>List</button>
          </div>
          <SearchBar placeholder="Search contacts..." value={search} onChange={setSearch} className="w-52" />
          <Button variant="primary" size="sm" icon={UserPlus} onClick={() => navigate('/crm/customers')}>Add Contact</Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <GlassCard className="py-16 text-center">
          <p className="text-sm text-muted">No contacts found.</p>
        </GlassCard>
      )}

      {view === 'grid' ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filtered.map(contact => (
            <GlassCard key={contact.id} className="p-4 cursor-pointer hover:shadow-card transition-shadow" onClick={() => navigate(`/crm/customers/${contact.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-rex-700 border border-rex-600/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{contact.avatar}</span>
                </div>
                <Badge variant={contact.status === 'vip' ? 'vip' : contact.status === 'active' ? 'success' : 'default'} size="sm">
                  {contact.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-primary mb-0.5">{contact.name}</p>
              <p className="text-[10px] text-muted mb-3">{contact.role}</p>

              <div className="flex items-center gap-2 mb-2">
                <Building2 size={11} className="text-muted flex-shrink-0" />
                <p className="text-xs text-secondary truncate">{contact.company}</p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-theme-subtle">
                {contact.email !== '—' && (
                  <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 group">
                    <Mail size={11} className="text-muted group-hover:text-rex-500 flex-shrink-0 transition-colors" />
                    <span className="text-[10px] text-muted group-hover:text-rex-600 dark:group-hover:text-rex-400 truncate transition-colors">{contact.email}</span>
                  </a>
                )}
                {contact.phone !== '—' && (
                  <div className="flex items-center gap-2">
                    <Phone size={11} className="text-muted flex-shrink-0" />
                    <span className="text-[10px] text-muted">{contact.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-theme-subtle flex items-center justify-between">
                <span className="text-[9px] text-faint">{contact.industry}</span>
                <button
                  onClick={e => { e.stopPropagation(); navigate('/crm/followups') }}
                  className="flex items-center gap-1 text-[9px] text-muted hover:text-amber-500 transition-colors"
                ><Bell size={9}/> Follow-up</button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden p-0">
          {/* List header */}
          <div className="grid grid-cols-12 px-5 py-2.5 border-b border-theme-subtle bg-surface2/40 text-[10px] font-semibold uppercase tracking-widest text-muted">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Company</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>
          {filtered.map((contact, i) => (
            <div
              key={contact.id}
              onClick={() => navigate(`/crm/customers/${contact.id}`)}
              className={`grid grid-cols-12 items-center gap-4 px-5 py-3.5 cursor-pointer table-row-hover transition-colors ${i < filtered.length - 1 ? 'border-b border-theme-subtle' : ''}`}
            >
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-rex-700 border border-rex-600/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white">{contact.avatar}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary truncate">{contact.name}</p>
                  <p className="text-[10px] text-muted">{contact.role}</p>
                </div>
              </div>
              <div className="col-span-3 min-w-0">
                <p className="text-xs text-secondary truncate">{contact.company}</p>
                <p className="text-[10px] text-muted truncate">{contact.industry}</p>
              </div>
              <div className="col-span-3 min-w-0">
                <p className="text-xs text-secondary truncate">{contact.email}</p>
                <p className="text-[10px] text-muted">{contact.phone}</p>
              </div>
              <div className="col-span-2">
                <Badge variant={contact.status === 'vip' ? 'vip' : contact.status === 'active' ? 'success' : 'default'} size="sm">
                  {contact.status.toUpperCase()}
                </Badge>
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={e => { e.stopPropagation(); navigate('/crm/followups') }}
                  className="p-1.5 hover:bg-amber-500/10 rounded text-muted hover:text-amber-500 transition-colors"
                ><Bell size={13}/></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted">No contacts found.</div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
