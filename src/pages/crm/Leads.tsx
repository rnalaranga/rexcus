import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter, X, Package, LayoutGrid, List, User, Phone, FileText, Bell, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useLeads, useFollowups, useCustomers } from '@/hooks/useData'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useDialog } from '@/components/ui/DialogProvider'
import { createLead, updateLead, deleteLead, fetchQuotations, deleteQuotation, createInvoice, createCustomer, createCustomerGRN, fetchAllCustomerGRNs, updateCustomerGRN } from '@/lib/api'
import { formatCurrency, relativeTime, toMySQLDate } from '@/lib/utils'

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
const STAGE_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}

type ViewMode = 'kanban' | 'list'

export const Leads: React.FC = () => {
  const navigate = useNavigate()
  const { data: leads, loading, refetch } = useLeads()
  const { data: allFollowups } = useFollowups()
  const [view, setView]     = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leadGrns, setLeadGrns] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Custom Confirmation Modal State
  const { data: customers } = useCustomers()
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'lead' | 'quotation', id: string | number } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  const [formData, setFormData] = useState<any>({
    name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: '', description: '', customerId: '', isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: '', includeGRN: false, grnItems: '', grnReceivedBy: '', grnList: [] as any[]
  })

  const [leadQuotations, setLeadQuotations] = React.useState<any[]>([])
  React.useEffect(() => {
    if (editId) {
      fetchQuotations(editId).then(setLeadQuotations).catch(console.error)
    } else {
      setLeadQuotations([])
    }
  }, [editId])

    useEffect(() => {
    fetchAllCustomerGRNs().then(setLeadGrns).catch(() => {});
  }, []);
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading leads...</div>

  const openCreateModal = () => {
    setEditId(null)
        setFormData({ name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: '', description: '', customerId: '', isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: '', grnList: [] as any[] })
    setIsModalOpen(true)
  }

  const openEditModal = (lead: any) => {
    setEditId(lead.id)
          setFormData({
        name: lead.name, company: lead.company, email: lead.email, phone: lead.phone, source: lead.source, vat: lead.vat || '', svat: lead.svat || '', description: lead.description || '', customerId: lead.customerId || '', priority: lead.priority, value: String(lead.value), stage: lead.stage, isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: '',
        grnList: leadGrns.filter((g: any) => g.leadId === lead.id).map((g: any) => ({ id: g.id, items: (typeof g.items === 'string' ? (() => { try { return JSON.parse(g.items) } catch(e) { return [{description: g.items||'', qty: 1}] } })() : (Array.isArray(g.items) ? g.items : [{description: g.items||'', qty: 1}])), receivedBy: g.receivedBy || '', notes: g.notes || '' }))
      })
    setIsModalOpen(true)
  }

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    let currentLeadId = editId;

    if (editId) {
      // Update existing lead
      const updatedLead = {
        ...formData,
        value: Number(formData.value) || 0,
        lastActivity: toMySQLDate(new Date())
      }
      const keysToRemove = ['includeGRN', 'grnItems', 'grnReceivedBy', 'grnList', 'isNewCustomer', 'address', 'brNumber', 'financeContactName', 'financeContactPhone', 'industry'];
        keysToRemove.forEach(k => delete (updatedLead as any)[k]);
        await updateLead(editId, updatedLead)
      } else {
      // Create new lead
      const newLead = {
        id: 'LEAD-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        ...formData,
        value: Number(formData.value) || 0,
        probability: 10,
        assignedTo: 'System Admin',
        lastActivity: toMySQLDate(new Date())
      }
      currentLeadId = newLead.id;
      if (formData.isNewCustomer) {
          const custId = 'CUST-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          try {
             const { createCustomer } = await import('@/lib/api');
             await createCustomer({
                id: custId,
                name: formData.name,
                company: formData.company,
                email: formData.email,
                phone: formData.phone,
                address: formData.address || '',
                brNumber: formData.brNumber || '',
                financeContactName: formData.financeContactName || '',
                financeContactPhone: formData.financeContactPhone || '',
                industry: formData.industry || '',
                status: 'active', segment: 'sme', lifetimeValue: 0, totalRevenue: 0, openDeals: 0, 
                lastOrder: new Date().toISOString().slice(0, 19).replace('T', ' '), joinDate: new Date().toISOString().slice(0, 19).replace('T', ' '), 
                avatar: (formData.name || '').substring(0,2).toUpperCase(),
                vat: formData.vat, svat: formData.svat, creditLimit: 0, creditDays: 30, rating: 0, requiresAdvance: true, currency: 'LKR', isForeign: false
             });
             newLead.customerId = custId;
          } catch(e) {}
        }

        const keysToRemove = ['includeGRN', 'grnItems', 'grnReceivedBy', 'grnList', 'isNewCustomer', 'address', 'brNumber', 'financeContactName', 'financeContactPhone', 'industry'];
        keysToRemove.forEach(k => delete (newLead as any)[k]);
        await createLead(newLead)
      }

    
      if (formData.grnList && formData.grnList.length > 0 && currentLeadId) {
        for (const g of formData.grnList) {
          if (g.id) {
            await updateCustomerGRN(g.id, { items: typeof g.items === 'string' ? g.items : JSON.stringify(g.items), receivedBy: g.receivedBy, notes: g.notes });
          } else {
            await createCustomerGRN({
              id: 'GRN-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
              quoteId: '', quoNo: '', leadId: currentLeadId,
              items: typeof g.items === 'string' ? g.items : JSON.stringify(g.items), receivedBy: g.receivedBy, notes: g.notes
            });
          }
        }
      }
      
      fetchAllCustomerGRNs().then(setLeadGrns).catch(() => {});
      
      await refetch()
    setSubmitting(false)
    setIsModalOpen(false)
  }

  const handleConvertToCustomer = async () => {
    if (!editId) return;
    if (confirm('Are you sure you want to convert this lead to a Customer? It will be marked as Won.')) {
      setSubmitting(true);
      try {
        const res = await fetch('http://localhost:3000/api/leads/' + editId + '/convert', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('Successfully converted to Customer! ID: ' + data.customerId);
          setIsModalOpen(false);
          refetch();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (e) {
        alert('Network error');
      }
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return
    setDeleteTarget({ type: 'lead', id: editId })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    
    if (deleteTarget.type === 'lead') {
      const res = await deleteLead(deleteTarget.id as string)
      if (res.error) {
        alert("Cannot delete this lead because it has associated quotations, deals, or follow-ups. In an ERP system, you cannot delete records that have financial or transaction history. Please mark it as 'Lost' instead.");
      } else {
        await refetch()
        setIsModalOpen(false)
      }
    } else if (deleteTarget.type === 'quotation') {
      await deleteQuotation(String(deleteTarget.id))
      const fresh = await fetchQuotations(editId!)
      setLeadQuotations(fresh)
    }
    
    setSubmitting(false)
    setDeleteTarget(null)
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stage === targetStage) return
    
    // Optimistic UI update could go here, but since it's local, simple refetch is fine
    // We just do the API call in background and refetch
    await updateLead(leadId, { ...lead, stage: targetStage, lastActivity: toMySQLDate(new Date()) })
    await refetch()
  }

  const filtered = leads.filter(l =>
    [l.name, l.company, l.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Lead', sortable: true,
      render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-primary">{row.company}</p>
          <p className="text-[10px] text-muted">{row.name}</p>
        </div>
      ),
    },
    { key: 'id',       header: 'ID',       width: '100px', render: v => <span className="text-[10px] text-muted font-mono">{String(v)}</span> },
    { key: 'stage',    header: 'Stage',    width: '120px', render: v => <Badge value={String(v)} /> },
    { key: 'priority', header: 'Priority', width: '90px',  render: v => <Badge value={String(v)} /> },
    { key: 'source',   header: 'Source',   render: v => <span className="text-xs text-muted">{String(v).replace(/_/g, ' ')}</span> },
    {
      key: 'value', header: 'Value', sortable: true, align: 'right', width: '120px',
      render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v))}</span>,
    },
    {
      key: 'probability', header: 'Prob.', align: 'center', width: '70px',
      render: v => (
        <span className={`text-xs font-medium ${Number(v) >= 70 ? 'text-emerald-600 dark:text-emerald-400' : Number(v) >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
          {String(v)}%
        </span>
      ),
    },
    { key: 'assignedTo',   header: 'Owner',    render: v => <span className="text-xs text-muted">{String(v).split(' ')[0]}</span> },
    { key: 'lastActivity', header: 'Activity', sortable: true, width: '100px', render: v => <span className="text-xs text-muted">{relativeTime(String(v))}</span> },
  ]

  const stageColorBorder: Record<string, string> = {
    won: 'border-b-2 border-b-emerald-500',
    lost: 'border-b-2 border-b-slate-400 opacity-60',
    negotiation: 'border-b-2 border-b-rex-500',
    new: 'border-b-2 border-b-blue-400',
    contacted: 'border-b-2 border-b-purple-400',
    qualified: 'border-b-2 border-b-cyan-400',
    proposal: 'border-b-2 border-b-amber-400',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Lead Management</h1>
          <p className="text-xs text-muted mt-0.5">
            {leads.filter(l => !['won', 'lost'].includes(l.stage)).length} active leads ·{' '}
            <span className="text-rex-600 dark:text-rex-400 font-medium">{formatCurrency(
              leads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((s, l) => s + Number(l.value), 0), true
            )} pipeline</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-theme">
            <button onClick={() => setView('kanban')} className={`p-2 transition-colors ${view === 'kanban' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setView('list')}   className={`p-2 transition-colors ${view === 'list'   ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}`}>
              <List size={14} />
            </button>
          </div>
          <SearchBar placeholder="Search leads..." value={search} onChange={setSearch} size="sm" className="w-48" />
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>Add Lead</Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-2 h-[calc(100vh-160px)]">
          {STAGES.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage)
            const stageValue = stageLeads.reduce((s, l) => s + Number(l.value), 0)
            return (
              <div 
                key={stage} 
                className="flex-shrink-0 w-56 flex flex-col h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column header */}
                <div className={`glass px-3 py-2.5 mb-2 shrink-0 ${stageColorBorder[stage] || 'border-b-2 border-b-theme'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{STAGE_LABELS[stage]}</span>
                    <span className="text-[10px] bg-surface2 text-muted px-1.5 py-0.5 font-medium">{stageLeads.length}</span>
                  </div>
                  {stageValue > 0 && <p className="text-[9px] text-muted mt-0.5">{formatCurrency(stageValue)}</p>}
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-4 min-h-[200px] custom-scrollbar">
                  {stageLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className="kanban-card p-3 cursor-pointer" 
                      onClick={() => openEditModal(lead)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-xs font-medium text-primary leading-snug flex-1 mr-1">{lead.company}</p>
                        <Badge value={lead.priority} size="sm" />
                      </div>
                      <p className="text-[10px] text-muted mb-1 truncate">{lead.name}</p>
                      {lead.description && <p className="text-[9px] text-secondary mb-2 line-clamp-2 italic border-l-2 border-theme-subtle pl-1">{lead.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-rex-600 dark:text-rex-300 font-semibold">{formatCurrency(lead.value)}</span>
                        <span className="text-[10px] text-muted">{lead.probability}%</span>
                      </div>
                      <div className="mt-1.5 h-0.5 bg-surface2">
                        <div className="h-full bg-rex-500" style={{ width: `${lead.probability}%`, opacity: 0.6 }} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] text-faint">{lead.assignedTo.split(' ')[0]}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/crm/followups') }}
                            className="text-[9px] text-muted hover:text-amber-500 transition-colors flex items-center gap-0.5"
                          ><Bell size={9}/></button>
                          <span className="text-[9px] text-faint">{relativeTime(lead.lastActivity)}</span>
                        </div>
                      </div>
                      {lead.stage === 'qualified' && (
                        <div className="mt-2 pt-2 border-t border-theme-subtle">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full text-[10px] h-6 py-0 flex items-center justify-center gap-1"
                            onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${lead.id}`); }}
                          >
                            <FileText size={10} /> Create Quote
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="py-6 text-center"><p className="text-[10px] text-faint">No leads</p></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-3 border-b border-theme-subtle flex items-center justify-between">
            <span className="text-xs text-muted">Showing <span className="text-primary font-medium">{filtered.length}</span> leads</span>
            <button className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"><Filter size={11} /> Filters</button>
          </div>
          <DataTable columns={columns} data={filtered} keyExtractor={r => r.id} onRowClick={openEditModal} emptyMessage="No leads found." />
        </GlassCard>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Lead" : "Create New Lead"} size="lg">
        <form onSubmit={handleSaveLead} className="space-y-6">
          
          {/* Section: Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <User size={14} className="text-rex-500" />
              Lead Information
            </h3>
            
            {/* Customer Selection / Creation Toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-surface2 rounded-lg inline-flex">
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: false})} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${!formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>Select Existing Customer</button>
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: true, customerId: '', name: '', company: '', email: '', phone: ''})} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>+ Register New Customer</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!formData.isNewCustomer ? (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Select Customer <span className="text-rex-500">*</span></label>
<SearchableSelect
                    options={customers.map((c: any) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
                    value={formData.customerId}
                    onChange={(val) => {
                      setFormData({...formData, customerId: val});
                      if (val) {
                        const c = customers.find((x: any) => x.id === val);
                        if (c) {
                          setFormData((prev: any) => ({
                              ...prev,
                              customerId: val,
                              name: c.name || '',
                              company: c.company || '',
                              email: c.email || '',
                              phone: c.phone || '',
                              vat: c.vat || '',
                              svat: c.svat || '',
                              address: c.address || '',
                              brNumber: c.brNumber || '',
                              industry: c.industry || ''
                            }));
                        }
                      }
                    }}
                    placeholder="Search existing customer..."
                  />
                  {formData.customerId && (() => {
                     const sc = customers.find((x:any) => x.id === formData.customerId);
                     if (sc && sc.contacts && sc.contacts.length > 0) {
                        return (
                           <div className="mt-3 bg-surface p-2 rounded border border-theme-subtle">
                             <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Attention / Contact Person</label>
                             <select className="w-full input-base text-xs" onChange={e => {
                                 if (!e.target.value) {
                                     setFormData((f: any) => ({...f, name: sc.name, email: sc.email, phone: sc.phone}));
                                 } else {
                                     const contact = sc.contacts.find((x:any) => x.id.toString() === e.target.value);
                                     if (contact) setFormData((f: any) => ({...f, name: contact.name, email: contact.email, phone: contact.phone}));
                                 }
                             }}>
                                <option value="">{sc.name} (Primary)</option>
                                {sc.contacts.map((c: any, i: number) => (
                                   <option key={i} value={c.id}>{c.name} {c.designation ? `- ${c.designation}` : ''}</option>
                                ))}
                             </select>
                           </div>
                        );
                     }
                     return null;
                  })()}
                </div>
              ) : (
                <>
                  <div className="col-span-2"><div className="h-px bg-theme-subtle my-2" /><p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">New Customer Details</p></div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Customer Name <span className="text-rex-500">*</span></label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company / Business Name <span className="text-rex-500">*</span></label>
                    <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full input-base" placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Full Address</label>
                    <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full input-base" placeholder="123 Main St, City" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Business Registration No.</label>
                    <input value={formData.brNumber} onChange={e => setFormData({...formData, brNumber: e.target.value})} className="w-full input-base" placeholder="e.g. PV00123" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Industry</label>
                    <input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full input-base" placeholder="e.g. Manufacturing" />
                  </div>
                </>
              )}

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Estimated Value (Rs.) <span className="text-rex-500">*</span></label>
                <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full input-base" placeholder="100000" />
              </div>
            </div>
          </div>

          {/* Section: Contact & Priority */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Phone size={14} className="text-rex-500" />
              Contact Details & Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" placeholder="jane@example.com" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number <span className="text-rex-500">*</span></label>
                <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
              </div>
              
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="VAT Number" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT Number</label>
                <input value={formData.svat} onChange={e => setFormData({...formData, svat: e.target.value})} className="w-full input-base" placeholder="SVAT Number" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Description / Notes</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full input-base resize-none" placeholder="Requirements, context, etc..." />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Priority</label>
                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full input-base">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Stage</label>
                <select value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})} className="w-full input-base">
                  {STAGES.map(s => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          
            {/* Section: Customer Samples */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Package size={14} className="text-rex-500" /> Customer Samples
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, grnList: [...(formData.grnList || []), { items: [{description: '', qty: 1}], receivedBy: '', notes: '' }]})} className="h-6 text-[10px]"><Plus size={12}/> Add Sample</Button>
              </div>
              
              <div className="space-y-3">
                {formData.grnList?.map((g: any, i: number) => (
                  <div key={i} className="p-3 bg-surface2 rounded-lg border border-theme-subtle grid grid-cols-2 gap-3 relative group">
                    <button type="button" onClick={() => {
                        const newList = [...formData.grnList];
                        newList.splice(i, 1);
                        setFormData({...formData, grnList: newList});
                    }} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                    
                    <div className="space-y-1.5 col-span-2">
                      <div className="flex justify-between items-center mb-1">
                         <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Sample Items <span className="text-rex-500">*</span></label>
                         <Button type="button" variant="ghost" size="sm" onClick={() => {
                            const l = [...formData.grnList];
                            if (!Array.isArray(l[i].items)) l[i].items = typeof l[i].items === 'string' ? (() => { try { return JSON.parse(l[i].items) } catch(e) { return [{description: l[i].items||'', qty: 1}] } })() : (Array.isArray(l[i].items) ? l[i].items : [{description: l[i].items||'', qty: 1}]);
                            l[i].items.push({description: '', qty: 1});
                            setFormData({...formData, grnList: l});
                         }} className="h-5 text-[9px] py-0 px-1"><Plus size={10} className="mr-1"/> Add Item</Button>
                      </div>
                      <div className="space-y-1.5">
                         {(Array.isArray(g.items) ? g.items : (typeof g.items === 'string' ? (() => { try { return JSON.parse(g.items) } catch(e) { return [{description: g.items||'', qty: 1}] } })() : [{description: g.items||'', qty: 1}])).map((item: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center">
                               <input className="input-base text-xs flex-1 py-1 h-7" placeholder="Item description" value={item.description} onChange={e => {
                                  const l = [...formData.grnList];
                                  if (!Array.isArray(l[i].items)) l[i].items = typeof l[i].items === 'string' ? (() => { try { return JSON.parse(l[i].items) } catch(e) { return [{description: l[i].items||'', qty: 1}] } })() : (Array.isArray(l[i].items) ? l[i].items : [{description: l[i].items||'', qty: 1}]);
                                  l[i].items[idx].description = e.target.value;
                                  setFormData({...formData, grnList: l});
                               }} />
                               <input type="number" className="input-base text-xs w-16 py-1 h-7" placeholder="Qty" value={item.qty} onChange={e => {
                                  const l = [...formData.grnList];
                                  if (!Array.isArray(l[i].items)) l[i].items = typeof l[i].items === 'string' ? (() => { try { return JSON.parse(l[i].items) } catch(e) { return [{description: l[i].items||'', qty: 1}] } })() : (Array.isArray(l[i].items) ? l[i].items : [{description: l[i].items||'', qty: 1}]);
                                  l[i].items[idx].qty = Number(e.target.value);
                                  setFormData({...formData, grnList: l});
                               }} />
                               <button type="button" onClick={() => {
                                  const l = [...formData.grnList];
                                  if (!Array.isArray(l[i].items)) l[i].items = typeof l[i].items === 'string' ? (() => { try { return JSON.parse(l[i].items) } catch(e) { return [{description: l[i].items||'', qty: 1}] } })() : (Array.isArray(l[i].items) ? l[i].items : [{description: l[i].items||'', qty: 1}]);
                                  l[i].items.splice(idx, 1);
                                  setFormData({...formData, grnList: l});
                               }} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                            </div>
                         ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Received By <span className="text-rex-500">*</span></label>
                      <input type="text" required placeholder="Name of employee" value={g.receivedBy} onChange={e => {
                        const l = [...formData.grnList]; l[i].receivedBy = e.target.value; setFormData({...formData, grnList: l});
                      }} className="w-full input-base text-xs py-1.5 h-8" />
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Notes</label>
                      <input type="text" placeholder="Optional notes" value={g.notes} onChange={e => {
                        const l = [...formData.grnList]; l[i].notes = e.target.value; setFormData({...formData, grnList: l});
                      }} className="w-full input-base text-xs py-1.5 h-8" />
                    </div>
                  </div>
                ))}
                {(!formData.grnList || formData.grnList.length === 0) && (
                  <p className="text-xs text-muted text-center py-2 bg-surface rounded border border-dashed border-theme-subtle">No samples added yet.</p>
                )}
              </div>
            </div>

          {/* Section: Linked Follow-ups (Only visible in edit mode) */}
          {editId && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Bell size={14} className="text-amber-500" />
                  Linked Activities
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/crm/followups')}
                  className="text-[10px] text-rex-500 hover:underline"
                >
                  Manage Activities
                </button>
              </div>
              <div className="space-y-2">
                {allFollowups.filter((f: any) => f.relatedType === 'lead' && f.relatedId === editId).length === 0 ? (
                  <p className="text-[10px] text-muted italic">No follow-ups linked to this lead.</p>
                ) : (
                  allFollowups.filter((f: any) => f.relatedType === 'lead' && f.relatedId === editId).slice(0, 3).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-surface2 rounded border border-theme-subtle">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-secondary truncate">{f.subject}</p>
                        <p className="text-[9px] text-muted">{f.status.toUpperCase()} · Due: {String(f.dueDate).slice(0, 10)} {f.dueTime}</p>
                      </div>
                      <Badge variant={f.status === 'done' ? 'success' : f.status === 'overdue' ? 'error' : 'info'} size="sm">
                        {f.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Section: Saved Quotations */}
          {editId && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" />
                  Saved Quotations
                </h3>
                <button
                  type="button"
                  onClick={() => navigate(`/crm/quotations/new/${editId}`)}
                  className="text-[10px] text-rex-500 hover:underline"
                >
                  + New Quotation
                </button>
              </div>
              <div className="space-y-2">
                {leadQuotations.length === 0 ? (
                  <p className="text-[10px] text-muted italic">No quotations saved for this lead.</p>
                ) : (
                  (() => {
                    const seenTypes = new Set<string>()
                    return leadQuotations.map((q: any) => {
                      const isLatest = !seenTypes.has(q.type)
                      if (isLatest) seenTypes.add(q.type)

                      return (
                        <div key={q.id} className={`flex items-center justify-between p-2.5 rounded border ${isLatest ? 'bg-rex-500/5 border-rex-500/20' : 'bg-surface2 border-theme-subtle'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-[11px] font-bold ${isLatest ? 'text-primary' : 'text-secondary'}`}>
                                {q.id} · <span className="font-mono text-[10px] text-muted">v{q.version || '?'}</span>
                              </p>
                              <span className={`text-[9px] px-1.5 py-0.5 border rounded font-bold uppercase ${q.type === 'job' ? 'bg-amber-100 border-amber-200 text-amber-700' : q.type === 'customer' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-rex-500/10 border-rex-500/20 text-rex-600'}`}>
                                {q.type === 'job' ? 'Job Quote' : q.type === 'customer' ? 'Customer Quote' : 'Main Quote'}
                              </span>
                              {isLatest && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold uppercase animate-pulse">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-muted mt-1">
                              <span>{new Date(q.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              <span>•</span>
                              <span>{relativeTime(q.date)}</span>
                              <span>•</span>
                              <span className="font-semibold">{formatCurrency(Number(q.totalAmount))}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {q.type === 'customer' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 py-0 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                                onClick={async () => {
                                  try {
                                    const payload = {
                                      id: `INV-${Date.now().toString().slice(-6)}`,
                                      quotationId: q.id,
                                      leadId: editId,
                                      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                                      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
                                      items: '[]',
                                      subtotal: Number(q.totalAmount),
                                      tax: 0,
                                      total: Number(q.totalAmount),
                                      status: 'draft',
                                      notes: 'Generated from Quotation'
                                    }
                                    await createInvoice(payload);
                                    navigate('/finance/invoices');
                                  } catch (e) {
                                    console.error('Failed to create invoice', e);
                                  }
                                }}
                              >
                                Invoice
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-6 py-0 px-2"
                              onClick={() => navigate(`/crm/quotations/new/${editId}`)}
                            >
                              View
                            </Button>
                            <button
                              type="button"
                              className="h-6 w-6 flex items-center justify-center text-muted hover:text-red-500 transition-colors"
                              onClick={() => setDeleteTarget({ type: 'quotation', id: q.id })}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-theme-subtle">
            {editId ? (
              <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Lead</Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (editId ? 'Save Changes' : 'Create Lead')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
