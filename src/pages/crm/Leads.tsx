import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Plus, Filter, X, Package, LayoutGrid, List, User, Phone, FileText, Bell, Trash2,
  Flame, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowUpDown, ChevronDown, 
  Building2, Mail, ExternalLink, RefreshCw, Trophy, Zap, SlidersHorizontal, Search,
  Briefcase, ArrowRight, Eye, Check, Calendar, Layers, Sparkles, Edit3, MessageSquare, PhoneCall, Camera,
  FileEdit, Printer
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useLeads, useFollowups, useCustomers, useQuotations } from '@/hooks/useData'
import { useSettings } from '@/contexts/SettingsContext'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { printElement } from '@/lib/printElement'
import { exportToPdf } from '@/lib/exportToPdf'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import { useDialog } from '@/components/ui/DialogProvider'
import { createLead, updateLead, deleteLead, fetchQuotations, deleteQuotation, createInvoice, createCustomer, createCustomerGRN, fetchAllCustomerGRNs, updateCustomerGRN } from '@/lib/api'
import { formatCurrency, relativeTime, toMySQLDate } from '@/lib/utils'
import { PageHelpButton } from '@/components/help/PageHelpButton'
import { SamplePhotoUploadSection } from '@/components/crm/SamplePhotoUploadSection'
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal'

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
const STAGE_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}

type ViewMode = 'kanban' | 'list'
type PresetFilter = 'active' | 'hot' | 'stale' | 'won' | 'lost' | 'all'
type CardDensity = 'detailed' | 'compact'

export const Leads: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: leads, loading, refetch } = useLeads()
  const { data: allFollowups } = useFollowups()
  const { data: allQuotations = [] } = useQuotations()
  const [view, setView]     = useState<ViewMode>('kanban')
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '')

  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('id')
    if (s !== null && s !== undefined) {
      setSearch(s)
    }
  }, [searchParams])
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('active')
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedOwner, setSelectedOwner] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date_desc')
  const [displayLimit, setDisplayLimit] = useState<number>(20)
  const [showAllLeads, setShowAllLeads] = useState<boolean>(false)
  const [cardDensity, setCardDensity] = useState<CardDensity>('compact')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leadGrns, setLeadGrns] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // 360° Command Center Drawer State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l: any) => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId])
  const { settings } = useSettings()
  const [updatingStage, setUpdatingStage] = useState(false)
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{ photos: any[], title?: string } | null>(null)
  const [previewQuoteData, setPreviewQuoteData] = useState<{ quotation: any, type: string, lead: any } | null>(null)

  const handleQuickStageChange = async (leadId: string, newStage: string) => {
    const current = leads.find((l: any) => l.id === leadId);
    if (!current || current.stage === newStage) return;
    setUpdatingStage(true);
    try {
      await updateLead(leadId, { ...current, stage: newStage, lastActivity: toMySQLDate(new Date()) });
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleQuickConvertToCustomer = async (leadId: string) => {
    if (confirm('Are you sure you want to convert this lead to a Customer? It will be marked as Won.')) {
      setSubmitting(true);
      try {
        const res = await fetch('http://localhost:3000/api/leads/' + leadId + '/convert', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('Successfully converted to Customer! ID: ' + data.customerId);
          refetch();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (e) {
        alert('Network error');
      } finally {
        setSubmitting(false);
      }
    }
  };
  
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

  // Fast memoized map of quotation numbers per lead & customer
  const leadQuotesMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    (allQuotations || []).forEach((q: any) => {
      let parsed: any = {};
      try {
        parsed = typeof q.data === 'string' ? JSON.parse(q.data) : (q.data || {});
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch(e) {}
        }
      } catch (e) {}

      const quoNo = q.quotationNo || parsed.quotationNo || q.docNo || parsed.docNo || q.id;
      const quoteObj = {
        id: q.id,
        raw: q,
        data: q.data,
        quotationNo: quoNo,
        status: q.status || parsed.status || 'Draft',
        type: q.type || parsed.type || 'custom',
        isProduct: q.type === 'product' || q.type === 'product_draft' || parsed.isProductQuotation,
        total: Number(q.totalAmount || parsed.custTotals?.withSSCL || parsed.total || 0),
        leadId: q.leadId || parsed.leadId,
        customerId: q.customerId || parsed.customerId,
        company: q.leadCompany || parsed.company,
        date: q.date || q.createdAt
      };

      const keys = [
        q.leadId, 
        parsed.leadId, 
        q.customerId, 
        parsed.customerId,
        q.leadCompany ? String(q.leadCompany).trim().toLowerCase() : null,
        parsed.company ? String(parsed.company).trim().toLowerCase() : null,
        q.leadId ? String(q.leadId).replace(/^LEAD-0*/i, '') : null
      ].filter(Boolean);

      keys.forEach((key: any) => {
        const kStr = String(key);
        if (!map[kStr]) map[kStr] = [];
        if (!map[kStr].some(existing => String(existing.id) === String(quoteObj.id))) {
          map[kStr].push(quoteObj);
        }
      });
    });
    return map;
  }, [allQuotations]);

  const getLeadQuotes = React.useCallback((lead: any) => {
    if (!lead) return [];
    const directQuotes = leadQuotesMap[String(lead.id)] || [];
    const customerQuotes = lead.customerId ? (leadQuotesMap[String(lead.customerId)] || []) : [];
    const companyQuotes = lead.company ? (leadQuotesMap[String(lead.company).trim().toLowerCase()] || []) : [];
    const numId = String(lead.id).replace(/^LEAD-0*/i, '');
    const numQuotes = numId ? (leadQuotesMap[numId] || []) : [];
    
    const combined = [...directQuotes];
    [...customerQuotes, ...companyQuotes, ...numQuotes].forEach(q => {
      if (!combined.some(c => String(c.id) === String(q.id))) {
        combined.push(q);
      }
    });
    return combined;
  }, [leadQuotesMap]);

    useEffect(() => {
    fetchAllCustomerGRNs().then(setLeadGrns).catch(() => {});
  }, []);

  // Dedicated Collect Sample Modal State
  const [sampleModalLead, setSampleModalLead] = useState<any | null>(null);
  const [sampleModalData, setSampleModalData] = useState<any>({
    quoteId: '',
    quoNo: '',
    items: [{ description: '', qty: 1, unit: 'Nos' }],
    receivedAt: new Date().toISOString().slice(0, 10),
    receivedBy: 'System Admin',
    notes: '',
    photos: []
  });
  const [leadQuotesForSample, setLeadQuotesForSample] = useState<any[]>([]);
  const [collectingSample, setCollectingSample] = useState(false);

  const openCollectSampleModal = async (lead: any) => {
    setSampleModalLead(lead);
    setSampleModalData({
      quoteId: '',
      quoNo: '',
      items: [{ description: '', qty: 1, unit: 'Nos' }],
      receivedAt: new Date().toISOString().slice(0, 10),
      receivedBy: 'System Admin',
      notes: '',
      photos: []
    });
    try {
      const quotes = await fetchQuotations(lead.id);
      const qList = Array.isArray(quotes) ? quotes : [];
      setLeadQuotesForSample(qList);
      if (qList.length === 1) {
        setSampleModalData((prev: any) => ({
          ...prev,
          quoteId: qList[0].id,
          quoNo: qList[0].docNo || qList[0].id
        }));
      }
    } catch (e) {
      setLeadQuotesForSample([]);
    }
  };

  const handleSaveSampleFromLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleModalLead) return;
    setCollectingSample(true);
    try {
      const res = await createCustomerGRN({
        leadId: sampleModalLead.id,
        customerCompany: sampleModalLead.company,
        customerName: sampleModalLead.name,
        customerPhone: sampleModalLead.phone || '',
        quoteId: sampleModalData.quoteId || '',
        quoNo: sampleModalData.quoNo || '',
        items: JSON.stringify(sampleModalData.items),
        receivedAt: sampleModalData.receivedAt,
        receivedBy: sampleModalData.receivedBy,
        notes: sampleModalData.notes,
        photos: JSON.stringify(sampleModalData.photos || []),
        status: 'In Stock'
      });
      if (res && res.success) {
        const updatedGrns = await fetchAllCustomerGRNs();
        setLeadGrns(updatedGrns);
        setSampleModalLead(null);
      } else {
        alert('Failed to save sample: ' + (res?.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setCollectingSample(false);
    }
  };

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

  const getDaysSinceActivity = (dateStr?: string) => {
    if (!dateStr) return 999
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 999
    const diffTime = Date.now() - d.getTime()
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
  }

  const metrics = useMemo(() => {
    const list = leads || []
    const activeLeads = list.filter((l: any) => !['won', 'lost'].includes(l.stage))
    const activeValue = activeLeads.reduce((s: number, l: any) => s + Number(l.value || 0), 0)

    const hotLeads = activeLeads.filter((l: any) => (l.priority === 'high' || l.priority === 'urgent'))
    const hotValue = hotLeads.reduce((s: number, l: any) => s + Number(l.value || 0), 0)

    const staleLeads = activeLeads.filter((l: any) => getDaysSinceActivity(l.lastActivity) >= 7)

    const wonLeads = list.filter((l: any) => l.stage === 'won')
    const wonValue = wonLeads.reduce((s: number, l: any) => s + Number(l.value || 0), 0)

    const lostLeads = list.filter((l: any) => l.stage === 'lost')
    const conversionRate = list.length > 0 ? Math.round((wonLeads.length / list.length) * 100) : 0
    const avgDealSize = activeLeads.length > 0 ? Math.round(activeValue / activeLeads.length) : 0

    return {
      activeCount: activeLeads.length,
      activeValue,
      hotCount: hotLeads.length,
      hotValue,
      staleCount: staleLeads.length,
      wonCount: wonLeads.length,
      wonValue,
      lostCount: lostLeads.length,
      conversionRate,
      avgDealSize,
      totalCount: list.length
    }
  }, [leads])

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>()
    ;(leads || []).forEach((l: any) => {
      if (l.assignedTo && typeof l.assignedTo === 'string' && l.assignedTo.trim()) {
        owners.add(l.assignedTo.trim())
      }
    })
    return Array.from(owners)
  }, [leads])

  const filtered = useMemo(() => {
    let result = [...(leads || [])]

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l: any) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.id && l.id.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q))
      )
    }

    // 2. Preset Filter
    if (presetFilter === 'active') {
      result = result.filter((l: any) => !['won', 'lost'].includes(l.stage))
    } else if (presetFilter === 'hot') {
      result = result.filter((l: any) => (l.priority === 'high' || l.priority === 'urgent') && !['won', 'lost'].includes(l.stage))
    } else if (presetFilter === 'stale') {
      result = result.filter((l: any) => getDaysSinceActivity(l.lastActivity) >= 7 && !['won', 'lost'].includes(l.stage))
    } else if (presetFilter === 'won') {
      result = result.filter((l: any) => l.stage === 'won')
    } else if (presetFilter === 'lost') {
      result = result.filter((l: any) => l.stage === 'lost')
    }

    // 3. Stage Filter
    if (selectedStage !== 'all') {
      result = result.filter((l: any) => l.stage === selectedStage)
    }

    // 4. Priority Filter
    if (selectedPriority !== 'all') {
      result = result.filter((l: any) => (l.priority || '').toLowerCase() === selectedPriority.toLowerCase())
    }

    // 5. Owner Filter
    if (selectedOwner !== 'all') {
      result = result.filter((l: any) => l.assignedTo === selectedOwner)
    }

    // 6. Sorting
    result.sort((a: any, b: any) => {
      if (sortBy === 'value_desc') return Number(b.value || 0) - Number(a.value || 0)
      if (sortBy === 'value_asc') return Number(a.value || 0) - Number(b.value || 0)
      if (sortBy === 'prob_desc') return Number(b.probability || 0) - Number(a.probability || 0)
      if (sortBy === 'activity_asc') {
        return new Date(a.lastActivity || 0).getTime() - new Date(b.lastActivity || 0).getTime()
      }
      // date_desc (default): newest first
      const dateA = new Date(a.lastActivity || a.createdAt || 0).getTime();
      const dateB = new Date(b.lastActivity || b.createdAt || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    })

    return result
  }, [leads, search, presetFilter, selectedStage, selectedPriority, selectedOwner, sortBy])

  const displayedStages = useMemo(() => {
    if (selectedStage !== 'all') {
      return [selectedStage as any]
    }
    if (presetFilter === 'active' || presetFilter === 'hot' || presetFilter === 'stale') {
      return ['new', 'contacted', 'qualified', 'proposal', 'negotiation'] as const
    }
    if (presetFilter === 'won') {
      return ['won'] as const
    }
    if (presetFilter === 'lost') {
      return ['lost'] as const
    }
    return STAGES
  }, [presetFilter, selectedStage])

  // Visible leads (Default latest 20, expand with See More)
  const visibleLeads = useMemo(() => {
    if (showAllLeads) return filtered;
    return filtered.slice(0, displayLimit);
  }, [filtered, showAllLeads, displayLimit]);

  const hasActiveFilters = search.trim() !== '' || selectedStage !== 'all' || selectedPriority !== 'all' || selectedOwner !== 'all' || presetFilter !== 'active' || sortBy !== 'date_desc' || showAllLeads

  const resetFilters = () => {
    setSearch('')
    setPresetFilter('active')
    setSelectedStage('all')
    setSelectedPriority('all')
    setSelectedOwner('all')
    setSortBy('date_desc')
    setDisplayLimit(20)
    setShowAllLeads(false)
  }

  const columns: Column<any>[] = [
    {
      key: 'name', 
      header: 'Company & Contact', 
      sortable: true,
      render: (_, row) => (
        <div className="py-1 min-w-[190px]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-primary hover:text-rex-600 transition-colors">
              {row.company || 'Unnamed Company'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary">
            <span className="flex items-center gap-1">
              <User size={11} className="text-muted" /> {row.name || 'No contact'}
            </span>
            <span className="text-[10px] font-mono text-muted bg-surface2 px-1 rounded-none border border-theme-subtle">
              {row.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (_, row) => (
        <div className="space-y-0.5 min-w-[150px] text-xs">
          {row.phone ? (
            <a 
              href={`tel:${row.phone}`} 
              onClick={e => e.stopPropagation()} 
              className="flex items-center gap-1.5 text-primary hover:text-rex-600 font-mono"
            >
              <Phone size={11} className="text-muted" /> {row.phone}
            </a>
          ) : (
            <span className="text-muted text-[11px] italic">No phone</span>
          )}
          {row.email && (
            <a 
              href={`mailto:${row.email}`} 
              onClick={e => e.stopPropagation()} 
              className="flex items-center gap-1.5 text-[11px] text-muted hover:text-primary truncate max-w-[160px]"
            >
              <Mail size={11} className="text-muted shrink-0" /> <span className="truncate">{row.email}</span>
            </a>
          )}
        </div>
      )
    },
    {
      key: 'quotation',
      header: 'Quotation #',
      render: (_, row) => {
        const quotes = getLeadQuotes(row);
        if (!quotes || quotes.length === 0) {
          return (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="italic text-[11px]">—</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/crm/quotations/new/${row.id}`);
                }}
                className="text-[10px] text-rex-600 dark:text-rex-400 hover:underline font-semibold cursor-pointer"
                title="Create Quotation for this Lead"
              >
                + Quote
              </button>
            </div>
          );
        }

        return (
          <div className="flex flex-wrap gap-1.5 max-w-[240px]" onClick={e => e.stopPropagation()}>
            {quotes.map((q: any) => {
              const statusColor = 
                q.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                q.status === 'Sent' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                q.status === 'Rejected' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';

              const editUrl = q.isProduct
                ? `/crm/product-quotations/new/${row.id}?quoteId=${q.id}`
                : `/crm/quotations/new/${row.id}?quoteId=${q.id}`;

              return (
                <div key={q.id} className="inline-flex items-stretch border border-theme-subtle bg-surface shadow-2xs overflow-hidden">
                  {/* Quote Number -> Opens in Builder (Edit) */}
                  <button
                    type="button"
                    onClick={() => navigate(editUrl)}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold hover:underline hover:opacity-90 cursor-pointer ${statusColor}`}
                    title={`Edit ${q.quotationNo} in Builder (${q.status}) • Value: ${formatCurrency(q.total)}`}
                  >
                    <FileEdit size={10} className="shrink-0 text-amber-500" />
                    <span>{q.quotationNo}</span>
                  </button>
                  {/* View Document Preview Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewQuoteData({
                      quotation: q.raw || q,
                      type: q.isProduct ? 'product' : 'main',
                      lead: row
                    })}
                    className="px-1.5 py-0.5 bg-surface hover:bg-surface2 text-muted hover:text-primary border-l border-theme-subtle transition-colors cursor-pointer flex items-center justify-center"
                    title={`View ${q.quotationNo} Document`}
                  >
                    <Eye size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      key: 'stage',
      header: 'Stage & Priority',
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1 min-w-[110px]">
          <Badge value={row.stage} />
          <div className="flex items-center gap-1">
            <Badge value={row.priority} size="sm" />
            {row.source && (
              <span className="text-[9px] uppercase tracking-wider text-muted font-medium">
                {row.source.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Deal Value & Probability',
      sortable: true,
      align: 'right',
      render: (_, row) => (
        <div className="space-y-1 text-right min-w-[130px]">
          <span className="font-mono font-bold text-xs text-primary block">
            {formatCurrency(Number(row.value || 0))}
          </span>
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-16 h-1.5 bg-surface2 rounded-none overflow-hidden border border-theme-subtle">
              <div 
                className="h-full bg-rex-500 rounded-none" 
                style={{ width: `${row.probability || 10}%` }} 
              />
            </div>
            <span className="text-[10px] font-mono text-muted">{row.probability || 10}%</span>
          </div>
        </div>
      )
    },
    {
      key: 'activity',
      header: 'Activity & Health',
      sortable: true,
      render: (_, row) => {
        const days = getDaysSinceActivity(row.lastActivity)
        const isStale = days >= 7 && !['won', 'lost'].includes(row.stage)

        return (
          <div className="space-y-0.5 min-w-[120px]">
            <span className="text-xs text-secondary block">
              {relativeTime(row.lastActivity)}
            </span>
            {isStale ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-none border border-amber-500/20">
                <AlertTriangle size={10} /> {days}d inactive
              </span>
            ) : (
              <span className="text-[10px] text-muted font-mono">
                {row.assignedTo ? row.assignedTo.split(' ')[0] : 'Unassigned'}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openCollectSampleModal(row)}
            className="px-2 py-1 text-xs font-semibold rounded-none bg-surface hover:bg-surface2 text-primary border border-theme-subtle hover:border-rex-500 hover:text-rex-600 transition-colors flex items-center gap-1"
            title="Collect Customer Sample (GRN)"
          >
            <Package size={12} className="text-rex-600 dark:text-rex-400" /> Sample
          </button>
          {row.stage === 'qualified' && (
            <button
              type="button"
              onClick={() => navigate(`/crm/quotations/new/${row.id}`)}
              className="px-2 py-1 text-xs font-bold rounded-none bg-rex-600 hover:bg-rex-700 text-white transition-colors flex items-center gap-1"
              title="Create Quotation"
            >
              <FileText size={12} /> Quote
            </button>
          )}
        </div>
      )
    }
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

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading leads...</div>

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary tracking-tight">Lead Pipeline & CRM Command</h1>
            <span className="text-xs font-mono font-bold bg-rex-500/10 text-rex-600 dark:text-rex-400 px-2 py-0.5 rounded-none border border-rex-500/20">
              {metrics.totalCount} Leads Total
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Real-time pipeline tracking, stale follow-up detection, sample collections, and quick quotation generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PageHelpButton moduleId="crm-leads" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={loading}
            className="rounded-none border-theme text-xs"
          >
            <RefreshCw size={12} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            icon={Plus} 
            onClick={openCreateModal}
            className="rounded-none text-xs font-bold"
          >
            Add New Lead
          </Button>
        </div>
      </div>

      {/* ── INTERACTIVE 5-METRIC COMMAND RIBBON (CLICK TO FILTER IMMEDIATELY) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <GlassCard 
          onClick={() => { setPresetFilter('active'); setSelectedStage('all'); }}
          className={`p-3 border-theme-subtle rounded-none cursor-pointer transition-all hover:border-theme ${
            presetFilter === 'active' ? 'ring-1 ring-rex-500/50 bg-rex-500/5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Active Pipeline</span>
            <Briefcase size={13} className="text-rex-600 dark:text-rex-400" />
          </div>
          <p className="text-lg font-mono font-bold text-primary mt-1">{metrics.activeCount}</p>
          <span className="text-[11px] font-mono font-bold text-rex-600 dark:text-rex-300 block truncate">
            {formatCurrency(metrics.activeValue)}
          </span>
        </GlassCard>

        <GlassCard 
          onClick={() => { setPresetFilter('hot'); setSelectedStage('all'); }}
          className={`p-3 border-theme-subtle rounded-none cursor-pointer transition-all hover:border-theme ${
            presetFilter === 'hot' ? 'ring-1 ring-amber-500/50 bg-amber-500/5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">🔥 Hot / Urgent</span>
            <Flame size={13} className="text-amber-500 animate-pulse" />
          </div>
          <p className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">{metrics.hotCount}</p>
          <span className="text-[11px] font-mono text-muted block truncate">
            {formatCurrency(metrics.hotValue)}
          </span>
        </GlassCard>

        <GlassCard 
          onClick={() => { setPresetFilter('stale'); setSelectedStage('all'); }}
          className={`p-3 border-theme-subtle rounded-none cursor-pointer transition-all hover:border-theme ${
            presetFilter === 'stale' ? 'ring-1 ring-rose-500/50 bg-rose-500/5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">⚠️ Needs Follow-up</span>
            <AlertTriangle size={13} className={metrics.staleCount > 0 ? "text-rose-500" : "text-muted"} />
          </div>
          <p className={`text-lg font-mono font-bold mt-1 ${metrics.staleCount > 0 ? 'text-rose-500' : 'text-primary'}`}>
            {metrics.staleCount}
          </p>
          <span className="text-[11px] text-muted block truncate">
            &gt; 7 days idle
          </span>
        </GlassCard>

        <GlassCard 
          onClick={() => { setPresetFilter('won'); setSelectedStage('all'); }}
          className={`p-3 border-theme-subtle rounded-none cursor-pointer transition-all hover:border-theme ${
            presetFilter === 'won' ? 'ring-1 ring-emerald-500/50 bg-emerald-500/5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">🏆 Won Deals</span>
            <Trophy size={13} className="text-emerald-500" />
          </div>
          <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.wonCount}</p>
          <span className="text-[11px] font-mono text-muted block truncate">
            {formatCurrency(metrics.wonValue)}
          </span>
        </GlassCard>

        <GlassCard className="p-3 border-theme-subtle rounded-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Conversion & Avg</span>
            <Zap size={13} className="text-blue-500" />
          </div>
          <p className="text-lg font-mono font-bold text-primary mt-1">{metrics.conversionRate}%</p>
          <span className="text-[11px] font-mono text-muted block truncate">
            Avg: {formatCurrency(metrics.avgDealSize)}
          </span>
        </GlassCard>
      </div>

      {/* ── FILTER & WORKSPACE CONTROL BAR ──────────────────────────────────── */}
      <GlassCard className="p-3 space-y-2.5 rounded-none border-theme-subtle">
        {/* Preset Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'active', label: 'Active Pipeline', count: metrics.activeCount },
              { id: 'hot', label: '🔥 Hot Deals', count: metrics.hotCount },
              { id: 'stale', label: '⚠️ Needs Attention', count: metrics.staleCount },
              { id: 'won', label: '🏆 Won', count: metrics.wonCount },
              { id: 'lost', label: 'Lost', count: metrics.lostCount },
              { id: 'all', label: 'All Leads', count: metrics.totalCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setPresetFilter(tab.id as PresetFilter); setSelectedStage('all'); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-none tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  presetFilter === tab.id
                    ? 'border-b-2 border-rex-600 text-rex-600 dark:text-rex-400 font-bold bg-rex-500/10 border-rex-500/30'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-none font-mono ${
                  presetFilter === tab.id ? 'bg-rex-600 text-white font-bold' : 'text-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer underline"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>

        {/* Detailed Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1 border-t border-theme-subtle">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="w-56">
              <SearchBar 
                placeholder="Search company, name, phone, email..." 
                value={search} 
                onChange={setSearch} 
                size="sm" 
                className="rounded-none text-xs" 
              />
            </div>

            {/* Stage Selector */}
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs font-medium focus:border-primary outline-none"
            >
              <option value="all">Stage: All Stages</option>
              {STAGES.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>

            {/* Priority Selector */}
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs font-medium focus:border-primary outline-none"
            >
              <option value="all">Priority: All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Owner Selector */}
            {uniqueOwners.length > 0 && (
              <select
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
                className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs font-medium focus:border-primary outline-none"
              >
                <option value="all">Owner: All Reps</option>
                {uniqueOwners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs font-medium focus:border-primary outline-none"
            >
              <option value="value_desc">Sort: Highest Value</option>
              <option value="value_asc">Sort: Lowest Value</option>
              <option value="activity_asc">Sort: Oldest Idle (Followup)</option>
              <option value="date_desc">Sort: Newest First</option>
              <option value="prob_desc">Sort: Highest Probability</option>
            </select>
          </div>

          {/* View Mode & Density Switch */}
          <div className="flex items-center gap-2 shrink-0">
            {view === 'kanban' && (
              <div className="flex items-center bg-surface border border-theme-subtle p-0.5 rounded-none text-xs">
                <button
                  onClick={() => setCardDensity('compact')}
                  className={`px-2 py-1 text-[11px] rounded-none transition-colors cursor-pointer ${
                    cardDensity === 'compact' ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                  }`}
                  title="Compact Cards (Fits 3x more cards)"
                >
                  Compact
                </button>
                <button
                  onClick={() => setCardDensity('detailed')}
                  className={`px-2 py-1 text-[11px] rounded-none transition-colors cursor-pointer ${
                    cardDensity === 'detailed' ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                  }`}
                  title="Detailed Cards (Full view)"
                >
                  Detailed
                </button>
              </div>
            )}

            {/* Latest 20 vs All Toggle */}
            {filtered.length > 20 && (
              <div className="flex items-center bg-surface border border-theme-subtle p-0.5 rounded-none text-xs">
                <button
                  type="button"
                  onClick={() => { setShowAllLeads(false); setDisplayLimit(20); }}
                  className={`px-2 py-1 text-[11px] rounded-none transition-colors cursor-pointer ${
                    !showAllLeads ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                  }`}
                  title="Show Latest 20 Only"
                >
                  Latest 20
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllLeads(true)}
                  className={`px-2 py-1 text-[11px] rounded-none transition-colors cursor-pointer ${
                    showAllLeads ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                  }`}
                  title={`See All ${filtered.length} Leads`}
                >
                  See All ({filtered.length})
                </button>
              </div>
            )}

            <div className="flex items-center bg-surface border border-theme-subtle p-0.5 rounded-none">
              <button 
                onClick={() => setView('kanban')} 
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  view === 'kanban' ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid size={13} />
              </button>
              <button 
                onClick={() => setView('list')}   
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  view === 'list' ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                }`}
                title="Data Table View"
              >
                <List size={13} />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── MAIN CONTENT (KANBAN OR TABLE) ─────────────────────────────────── */}
      {view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 h-[calc(100vh-270px)] min-h-[450px]">
          {displayedStages.map(stage => {
            const stageLeads = filtered.filter((l: any) => l.stage === stage)
            const stageValue = stageLeads.reduce((s: number, l: any) => s + Number(l.value || 0), 0)
            const visibleStageLeads = showAllLeads ? stageLeads : stageLeads.slice(0, displayLimit)
            const hasMoreInStage = !showAllLeads && stageLeads.length > displayLimit

            return (
              <div 
                key={stage} 
                className="flex-shrink-0 w-64 flex flex-col h-full bg-surface/50 border border-theme-subtle rounded-none"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column header */}
                <div className={`p-2.5 shrink-0 bg-surface2/60 border-b ${stageColorBorder[stage] || 'border-b-theme'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {STAGE_LABELS[stage] || stage}
                    </span>
                    <span className="text-[10px] bg-surface text-primary px-1.5 py-0.5 font-mono font-bold border border-theme-subtle">
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono font-semibold text-muted mt-1">
                    {formatCurrency(stageValue)}
                  </p>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto pb-6 custom-scrollbar">
                  {visibleStageLeads.map((lead: any) => {
                    const days = getDaysSinceActivity(lead.lastActivity)
                    const isStale = days >= 7 && !['won', 'lost'].includes(lead.stage)
                    const quotes = getLeadQuotes(lead)
                    const isSelected = selectedLeadId === lead.id

                    if (cardDensity === 'compact') {
                      return (
                        <div 
                          key={lead.id} 
                          className={`p-2 bg-surface border transition-all cursor-pointer rounded-none group hover:shadow-xs ${
                            isSelected 
                              ? 'border-rex-500 ring-2 ring-rex-500/80 bg-rex-500/5 shadow-sm' 
                              : 'border-theme-subtle hover:border-rex-500/50'
                          }`}
                          onClick={() => setSelectedLeadId(lead.id)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <p className="text-xs font-bold text-primary truncate flex-1 group-hover:text-rex-600 transition-colors" title={lead.company}>
                              {lead.company}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-rex-600 transition-opacity"
                                title="Edit Lead Form"
                              >
                                <Edit3 size={10} />
                              </button>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                lead.priority === 'urgent' ? 'bg-rose-500' :
                                lead.priority === 'high' ? 'bg-amber-500' :
                                lead.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-300'
                              }`} title={`Priority: ${lead.priority}`} />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted truncate max-w-[110px]">{lead.name}</span>
                            <span className="font-mono font-bold text-rex-600 dark:text-rex-300">
                              {formatCurrency(lead.value)}
                            </span>
                          </div>

                          {/* Quotation number tags before click */}
                          {quotes.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1 pt-1 border-t border-theme-subtle/50">
                              {quotes.slice(0, 2).map((q: any) => (
                                <span
                                  key={q.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = q.isProduct
                                      ? `/crm/product-quotations/new/${lead.id}?quoteId=${q.id}`
                                      : `/crm/quotations/new/${lead.id}?quoteId=${q.id}`;
                                    navigate(url);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-none transition-colors"
                                  title={`Quotation ${q.quotationNo} (${q.status}) • Click to open`}
                                >
                                  <FileText size={9} className="text-amber-500 shrink-0" />
                                  <span className="truncate max-w-[90px]">{q.quotationNo}</span>
                                </span>
                              ))}
                              {quotes.length > 2 && (
                                <span className="text-[9px] font-mono text-muted font-bold">+{quotes.length - 2}</span>
                              )}
                            </div>
                          )}

                          {isStale && (
                            <div className="mt-1 pt-1 border-t border-theme-subtle flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {days}d idle
                              </span>
                              <span className="text-muted font-mono">{lead.probability}%</span>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Detailed Card View
                    return (
                      <div 
                        key={lead.id} 
                        className={`p-3 bg-surface border transition-all cursor-pointer rounded-none group ${
                          isSelected 
                            ? 'border-rex-500 ring-2 ring-rex-500/80 bg-rex-500/5 shadow-md' 
                            : 'border-theme-subtle hover:border-rex-500/50'
                        }`}
                        onClick={() => setSelectedLeadId(lead.id)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-bold text-primary leading-snug flex-1 mr-1 group-hover:text-rex-600 transition-colors">{lead.company}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-rex-600 transition-opacity"
                              title="Edit Lead Form"
                            >
                              <Edit3 size={11} />
                            </button>
                            <Badge value={lead.priority} size="sm" />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted mb-1.5 truncate flex items-center gap-1">
                          <User size={10} className="text-muted shrink-0" /> {lead.name}
                        </p>

                        {lead.description && (
                          <p className="text-[10px] text-secondary mb-2 line-clamp-2 italic border-l-2 border-theme-subtle pl-1.5">
                            {lead.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-rex-600 dark:text-rex-300 font-bold font-mono">
                            {formatCurrency(lead.value)}
                          </span>
                          <span className="text-[10px] text-muted font-mono">{lead.probability}%</span>
                        </div>

                        <div className="mt-1.5 h-1 bg-surface2 rounded-none overflow-hidden">
                          <div className="h-full bg-rex-500 rounded-none" style={{ width: `${lead.probability}%` }} />
                        </div>

                        {/* Quotations Ribbon */}
                        {quotes.length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-theme-subtle">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9.5px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                                <FileText size={10} className="text-amber-500" /> Quotation{quotes.length > 1 ? 's' : ''} ({quotes.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {quotes.map((q: any) => {
                                const statusColor = 
                                  q.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20' :
                                  q.status === 'Sent' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20' :
                                  q.status === 'Rejected' ? 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20' :
                                  'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20';

                                return (
                                  <button
                                    key={q.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = q.isProduct
                                        ? `/crm/product-quotations/new/${lead.id}?quoteId=${q.id}`
                                        : `/crm/quotations/new/${lead.id}?quoteId=${q.id}`;
                                      navigate(url);
                                    }}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold border rounded-none transition-all cursor-pointer ${statusColor}`}
                                    title={`Click to open ${q.quotationNo} • Status: ${q.status} • Total: ${formatCurrency(q.total)}`}
                                  >
                                    <span>{q.quotationNo}</span>
                                    <span className="text-[8.5px] opacity-75 uppercase font-sans font-normal">({q.status})</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-theme-subtle">
                          <span className="text-[10px] text-faint truncate max-w-[90px]">{lead.assignedTo?.split(' ')[0] || 'Unassigned'}</span>
                          <div className="flex items-center gap-1.5">
                            {isStale ? (
                              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                                <Clock size={10} /> {days}d
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted">{relativeTime(lead.lastActivity)}</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons on kanban card */}
                        <div className="mt-2 pt-1.5 border-t border-theme-subtle flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openCollectSampleModal(lead); }}
                            className="flex-1 text-[10px] font-semibold py-1 px-1.5 rounded-none bg-surface hover:bg-surface2 text-primary border border-theme-subtle hover:border-rex-500 hover:text-rex-600 transition-colors flex items-center justify-center gap-1"
                            title="Collect Customer Sample (GRN)"
                          >
                            <Package size={11} className="text-rex-600 dark:text-rex-400" /> Sample
                          </button>
                          {quotes.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const primary = quotes[0];
                                const url = primary.isProduct
                                  ? `/crm/product-quotations/new/${lead.id}?quoteId=${primary.id}`
                                  : `/crm/quotations/new/${lead.id}?quoteId=${primary.id}`;
                                navigate(url);
                              }}
                              className="text-[10px] font-bold py-1 px-2 rounded-none bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors flex items-center justify-center gap-1"
                              title={`Open Quotation ${quotes[0].quotationNo}`}
                            >
                              <FileText size={11} className="text-amber-500" /> {quotes[0].quotationNo}
                            </button>
                          ) : (
                            lead.stage === 'qualified' && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${lead.id}`); }}
                                className="text-[10px] font-bold py-1 px-2 rounded-none bg-rex-600 hover:bg-rex-700 text-white transition-colors flex items-center justify-center gap-1"
                                title="Create Quotation"
                              >
                                <FileText size={11} /> Quote
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {hasMoreInStage && (
                    <button
                      type="button"
                      onClick={() => setShowAllLeads(true)}
                      className="w-full py-2 px-2 text-[11px] font-bold text-rex-600 dark:text-rex-400 hover:text-white bg-rex-50 dark:bg-rex-950/40 hover:bg-rex-600 border border-dashed border-rex-300 dark:border-rex-700 rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <span>+{stageLeads.length - displayLimit} more in {STAGE_LABELS[stage] || stage}</span>
                    </button>
                  )}

                  {stageLeads.length === 0 && (
                    <div className="py-10 text-center border border-dashed border-theme-subtle m-1">
                      <p className="text-[11px] text-muted italic">No leads in {STAGE_LABELS[stage] || stage}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <GlassCard className="p-0 border-theme-subtle overflow-hidden rounded-none">
          <div className="px-4 py-2.5 border-b border-theme-subtle flex items-center justify-between bg-surface2/40">
            <span className="text-xs text-muted">
              Showing <span className="text-primary font-bold font-mono">{visibleLeads.length}</span> of <span className="font-mono">{filtered.length}</span> leads
              {!showAllLeads && filtered.length > displayLimit && (
                <span className="ml-1.5 text-[11px] text-rex-600 dark:text-rex-400 font-semibold">
                  (Latest {visibleLeads.length})
                </span>
              )}
            </span>
            {hasActiveFilters && (
              <span className="text-xs text-rex-600 dark:text-rex-400 font-semibold">
                Filters Active
              </span>
            )}
          </div>
          <DataTable 
            columns={columns} 
            data={visibleLeads} 
            keyExtractor={(r: any) => r.id} 
            onRowClick={(r: any) => setSelectedLeadId(r.id)} 
            emptyMessage="No leads found matching your criteria. Try adjusting your filters or search." 
          />
          {!showAllLeads && filtered.length > displayLimit && (
            <div className="p-3 border-t border-theme-subtle bg-surface2/30 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">
                Showing latest <span className="font-bold text-primary">{visibleLeads.length}</span> of <span className="font-bold text-primary">{filtered.length}</span> leads.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayLimit(prev => prev + 20)}
                  className="px-3 py-1.5 text-xs font-semibold bg-surface border border-theme-subtle hover:border-rex-500 hover:text-rex-600 text-primary transition-all cursor-pointer rounded-none"
                >
                  Load Next +20 Leads
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllLeads(true)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white transition-all cursor-pointer rounded-none"
                >
                  See All ({filtered.length})
                </button>
              </div>
            </div>
          )}
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
            <div className="flex gap-2 mb-4 p-1 bg-surface2 rounded-md inline-flex">
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: false})} className={`px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-all ${!formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>Select Existing Customer</button>
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: true, customerId: '', name: '', company: '', email: '', phone: ''})} className={`px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-all ${formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>+ Register New Customer</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!formData.isNewCustomer ? (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Select Customer <span className="text-rex-500">*</span></label>
                  <CustomerAutocomplete
                    value={formData.customerId}
                    customers={customers}
                    onChange={(val, c) => {
                      setFormData((prev: any) => ({
                        ...prev,
                        customerId: val,
                        ...(c ? {
                          name: c.name || '',
                          company: c.company || '',
                          email: c.email || '',
                          phone: c.phone || '',
                          vat: c.vat || '',
                          svat: c.svat || '',
                          address: c.address || '',
                          brNumber: c.brNumber || '',
                          industry: c.industry || ''
                        } : {
                          name: '',
                          company: '',
                          email: '',
                          phone: '',
                          vat: '',
                          svat: '',
                          address: '',
                          brNumber: '',
                          industry: ''
                        })
                      }));
                    }}
                    placeholder="Search existing customer (name, company, phone)..."
                    className="text-xs"
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
                              className="h-6 w-6 flex items-center justify-center text-muted hover:text-red-500 rounded-md transition-colors"
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

      {/* Collect Customer Sample Modal */}
      <Modal 
        isOpen={!!sampleModalLead} 
        onClose={() => setSampleModalLead(null)} 
        title="Collect Customer Sample (GRN)"
        size="md"
      >
        {sampleModalLead && (
          <form onSubmit={handleSaveSampleFromLead} className="p-6 space-y-4">
            {/* Lead Summary Info */}
            <div className="bg-surface2/50 p-3 rounded-lg border border-theme-subtle flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">{sampleModalLead.company}</p>
                <p className="text-[11px] text-muted">{sampleModalLead.name} · {sampleModalLead.id}</p>
              </div>
              <Badge variant="warning" className="text-xs font-mono font-bold">
                {sampleModalLead.stage.toUpperCase()}
              </Badge>
            </div>

            {/* Quotation Link if exists */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Link to Quotation (Optional)
              </label>
              <select
                className="w-full input-base text-xs"
                value={sampleModalData.quoteId}
                onChange={e => {
                  const qId = e.target.value;
                  const found = leadQuotesForSample.find(q => q.id === qId);
                  setSampleModalData({
                    ...sampleModalData,
                    quoteId: found ? found.id : '',
                    quoNo: found ? (found.docNo || found.id) : ''
                  });
                }}
              >
                <option value="">-- Direct Sample (No Quotation Yet) --</option>
                {leadQuotesForSample.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.docNo || q.id} - Total: {formatCurrency(Number(q.totalAmount))} ({q.status || 'Draft'})
                  </option>
                ))}
              </select>
              {leadQuotesForSample.length === 0 && (
                <p className="text-[10px] text-muted mt-1 italic">
                  No quotations created for this lead yet. Sample will be registered directly under {sampleModalLead.company}.
                </p>
              )}
            </div>

            {/* Receipt Date & Received By */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Received Date *</label>
                <input
                  required
                  type="date"
                  className="w-full input-base text-xs"
                  value={sampleModalData.receivedAt}
                  onChange={e => setSampleModalData({...sampleModalData, receivedAt: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Received By *</label>
                <input
                  required
                  type="text"
                  className="w-full input-base text-xs"
                  value={sampleModalData.receivedBy}
                  onChange={e => setSampleModalData({...sampleModalData, receivedBy: e.target.value})}
                  placeholder="Employee name"
                />
              </div>
            </div>

            {/* Item Rows */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-secondary">Sample Items Received *</label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setSampleModalData({
                    ...sampleModalData,
                    items: [...sampleModalData.items, { description: '', qty: 1, unit: 'Nos' }]
                  })}
                  className="h-6 text-[10px]"
                >
                  <Plus size={12} className="mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {sampleModalData.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      required
                      className="flex-1 input-base text-xs py-1.5"
                      placeholder="Item description (e.g. Flange Part, Bracket Sample)"
                      value={it.description}
                      onChange={e => {
                        const updated = [...sampleModalData.items];
                        updated[idx].description = e.target.value;
                        setSampleModalData({...sampleModalData, items: updated});
                      }}
                    />
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-20 input-base text-xs py-1.5 font-mono text-center"
                      placeholder="Qty"
                      value={it.qty}
                      onChange={e => {
                        const updated = [...sampleModalData.items];
                        updated[idx].qty = Number(e.target.value);
                        setSampleModalData({...sampleModalData, items: updated});
                      }}
                    />
                    <input
                      className="w-20 input-base text-xs py-1.5 text-center"
                      placeholder="Unit"
                      value={it.unit}
                      onChange={e => {
                        const updated = [...sampleModalData.items];
                        updated[idx].unit = e.target.value;
                        setSampleModalData({...sampleModalData, items: updated});
                      }}
                    />
                    {sampleModalData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...sampleModalData.items];
                          updated.splice(idx, 1);
                          setSampleModalData({...sampleModalData, items: updated});
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Notes / Sample Condition</label>
              <input
                type="text"
                className="w-full input-base text-xs"
                value={sampleModalData.notes}
                onChange={e => setSampleModalData({...sampleModalData, notes: e.target.value})}
                placeholder="e.g. Received for dimension verification and quotation estimation"
              />
            </div>

            {/* Inspection Photos Upload (Single or Multiple) */}
            <div className="pt-2 border-t border-theme-subtle">
              <SamplePhotoUploadSection
                photos={sampleModalData.photos || []}
                onChange={photos => setSampleModalData({ ...sampleModalData, photos })}
                disabled={collectingSample}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setSampleModalLead(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={collectingSample}>
                {collectingSample ? 'Saving GRN...' : 'Confirm & Collect Sample'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── 360° COMMAND CENTER DRAWER (SPLIT-PANE DOSSIER) ────────────────────── */}
      {selectedLead && (() => {
        const leadQuotes = getLeadQuotes(selectedLead);
        const leadSamples = leadGrns.filter((g: any) => g.leadId === selectedLead.id);
        const daysInStage = getDaysSinceActivity(selectedLead.lastActivity);
        const cleanPhone = (selectedLead.phone || '').replace(/[^0-9]/g, '');
        const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone}` : null;

        return (
          <>
            {/* Mobile backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 md:hidden"
              onClick={() => setSelectedLeadId(null)}
            />

            {/* Split-Pane Drawer */}
            <aside 
              className="fixed top-0 right-0 h-screen w-full sm:w-[480px] md:w-[520px] lg:w-[550px] z-50 bg-surface border-l border-theme-subtle shadow-2xl flex flex-col transition-all duration-200"
              style={{ boxShadow: '-12px 0 35px rgba(0, 0, 0, 0.25)' }}
            >
              {/* Header */}
              <div className="p-4 border-b border-theme-subtle bg-surface2/70 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-rex-600 dark:text-rex-400 bg-rex-500/10 px-2 py-0.5 border border-rex-500/30">
                      {selectedLead.id}
                    </span>
                    <Badge value={selectedLead.priority} size="sm" />
                    {selectedLead.customerId && (
                      <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 border border-theme-subtle">
                        Cust: {selectedLead.customerId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedLead)}
                      className="p-1.5 text-muted hover:text-primary hover:bg-surface transition-colors border border-theme-subtle cursor-pointer"
                      title="Open Full Edit Modal"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(null)}
                      className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors border border-theme-subtle cursor-pointer"
                      title="Close Command Center"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <h2 className="text-base font-bold text-primary leading-snug truncate" title={selectedLead.company}>
                  {selectedLead.company || selectedLead.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted mt-1">
                  <span className="flex items-center gap-1 font-medium text-secondary">
                    <User size={12} className="text-rex-500" /> {selectedLead.name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {relativeTime(selectedLead.lastActivity)}
                  </span>
                </div>

                {/* Industrial Interactive Stage Stepper */}
                <div className="mt-3 pt-3 border-t border-theme-subtle/80">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    <span>Pipeline Stage</span>
                    {updatingStage && <span className="text-rex-500 animate-pulse font-mono">Updating...</span>}
                  </div>
                  <div className="grid grid-cols-6 gap-1 bg-surface p-1 border border-theme-subtle">
                    {STAGES.filter(s => s !== 'lost').map((stg) => {
                      const isCurrent = selectedLead.stage === stg;
                      return (
                        <button
                          key={stg}
                          type="button"
                          disabled={updatingStage}
                          onClick={() => handleQuickStageChange(selectedLead.id, stg)}
                          className={`text-center py-1 text-[9px] font-bold uppercase transition-all rounded-none cursor-pointer ${
                            isCurrent
                              ? 'bg-rex-600 text-white shadow-xs'
                              : 'text-muted hover:text-primary hover:bg-surface2'
                          }`}
                          title={`Move to ${STAGE_LABELS[stg] || stg}`}
                        >
                          {STAGE_LABELS[stg] || stg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-4 border-b border-theme-subtle bg-surface/80 shrink-0 divide-x divide-theme-subtle">
                <div className="p-2.5 text-center">
                  <p className="text-[9.5px] uppercase font-bold text-muted">Est. Value</p>
                  <p className="text-xs font-mono font-bold text-rex-600 dark:text-rex-300 mt-0.5 truncate">
                    {formatCurrency(selectedLead.value)}
                  </p>
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-[9.5px] uppercase font-bold text-muted">Win Prob.</p>
                  <p className="text-xs font-mono font-bold text-primary mt-0.5">
                    {selectedLead.probability || 0}%
                  </p>
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-[9.5px] uppercase font-bold text-muted">Stage Age</p>
                  <p className={`text-xs font-mono font-bold mt-0.5 ${
                    daysInStage >= 7 ? 'text-rose-500' : daysInStage >= 3 ? 'text-amber-500' : 'text-emerald-600'
                  }`}>
                    {daysInStage === 999 ? 'New' : `${daysInStage}d`}
                  </p>
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-[9.5px] uppercase font-bold text-muted">Source</p>
                  <p className="text-[11px] font-bold text-primary mt-0.5 capitalize truncate">
                    {selectedLead.source || 'Direct'}
                  </p>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Contact & Communication Channels */}
                <div className="bg-surface2/40 border border-theme-subtle p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                    <span>Contact & Direct Connect</span>
                    <span className="text-[9px] font-normal text-secondary">Quick Action</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {selectedLead.phone ? (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <a
                          href={`tel:${selectedLead.phone}`}
                          className="flex-1 flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-theme-subtle hover:border-rex-500 text-xs text-primary transition-colors font-mono"
                        >
                          <Phone size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{selectedLead.phone}</span>
                        </a>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                            title="Open WhatsApp Chat"
                          >
                            <MessageSquare size={12} className="text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted italic col-span-2">No phone number recorded</span>
                    )}

                    {selectedLead.email && (
                      <a
                        href={`mailto:${selectedLead.email}`}
                        className="col-span-2 flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-theme-subtle hover:border-rex-500 text-xs text-primary transition-colors truncate"
                      >
                        <Mail size={12} className="text-blue-500 shrink-0" />
                        <span className="truncate font-mono">{selectedLead.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Quotations Dossier */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} className="text-amber-500" />
                      Quotations ({leadQuotes.length})
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/quotations/new/${selectedLead.id}`)}
                        className="px-2 py-0.5 text-[10px] font-bold bg-surface border border-theme-subtle hover:border-amber-500 hover:text-amber-600 text-primary transition-colors flex items-center gap-1 cursor-pointer"
                        title="New Custom Job Costing Quotation"
                      >
                        <Plus size={10} /> Custom
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/product-quotations/new/${selectedLead.id}`)}
                        className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                        title="New Product Catalog Quotation"
                      >
                        <Plus size={10} /> Product
                      </button>
                    </div>
                  </div>

                  {leadQuotes.length === 0 ? (
                    <div className="p-3 bg-surface border border-dashed border-theme-subtle text-center space-y-1.5">
                      <p className="text-xs text-muted">No quotation created for this lead yet.</p>
                      <div className="flex justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/quotations/new/${selectedLead.id}`)}
                          className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors cursor-pointer"
                        >
                          + Create Custom Quote
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {leadQuotes.map((q: any) => {
                        const statusColor = 
                          q.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                          q.status === 'Sent' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                          q.status === 'Rejected' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                          'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';

                        const editUrl = q.isProduct
                          ? `/crm/product-quotations/new/${selectedLead.id}?quoteId=${q.id}`
                          : `/crm/quotations/new/${selectedLead.id}?quoteId=${q.id}`;

                        return (
                          <div 
                            key={q.id}
                            className="p-2.5 bg-surface border border-theme-subtle hover:border-amber-500/50 flex items-center justify-between gap-2 group transition-all"
                          >
                            <div 
                              className="min-w-0 flex-1 cursor-pointer"
                              onClick={() => navigate(editUrl)}
                              title="Click to edit quotation in builder"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-primary group-hover:text-amber-600 hover:underline transition-colors flex items-center gap-1">
                                  <FileEdit size={11} className="text-amber-500" />
                                  {q.quotationNo}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 border uppercase ${statusColor}`}>
                                  {q.status}
                                </span>
                                <span className="text-[9px] font-mono text-muted bg-surface2 px-1 border border-theme-subtle">
                                  {q.isProduct ? 'Product' : 'Custom'}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono font-bold text-rex-600 dark:text-rex-300 mt-1">
                                {formatCurrency(q.total)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* VIEW BUTTON */}
                              <button
                                type="button"
                                onClick={() => setPreviewQuoteData({
                                  quotation: q.raw || q,
                                  type: q.isProduct ? 'product' : 'main',
                                  lead: selectedLead
                                })}
                                className="px-2 py-1 text-xs font-semibold bg-surface hover:bg-surface2 border border-theme-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                                title="View Quotation Document"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>

                              {/* EDIT BUTTON */}
                              <button
                                type="button"
                                onClick={() => navigate(editUrl)}
                                className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Edit Quotation in Builder"
                              >
                                <FileEdit size={12} />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Samples & Customer Inward GRN Dossier */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={13} className="text-rex-500" />
                      Physical Samples (GRN) ({leadSamples.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => openCollectSampleModal(selectedLead)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-surface border border-theme-subtle hover:border-rex-500 hover:text-rex-600 text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} /> Inward Sample
                    </button>
                  </div>

                  {leadSamples.length === 0 ? (
                    <div className="p-3 bg-surface border border-dashed border-theme-subtle text-center">
                      <p className="text-xs text-muted">No physical samples collected yet.</p>
                      <button
                        type="button"
                        onClick={() => openCollectSampleModal(selectedLead)}
                        className="mt-1.5 px-2.5 py-1 text-xs font-semibold bg-surface border border-theme-subtle hover:border-rex-500 text-primary transition-colors cursor-pointer"
                      >
                        + Record Sample Inward
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {leadSamples.map((sample: any) => {
                        let parsedItems: any[] = [];
                        try {
                          parsedItems = typeof sample.items === 'string' ? JSON.parse(sample.items) : (sample.items || []);
                        } catch (e) {
                          parsedItems = [{ description: sample.items || 'Sample Part', qty: 1 }];
                        }

                        let samplePhotos: any[] = [];
                        try {
                          if (typeof sample.photos === 'string' && sample.photos.startsWith('[')) {
                            samplePhotos = JSON.parse(sample.photos);
                          } else if (Array.isArray(sample.photos)) {
                            samplePhotos = sample.photos;
                          }
                        } catch (e) {
                          samplePhotos = [];
                        }

                        return (
                          <div key={sample.id} className="p-2.5 bg-surface border border-theme-subtle text-xs space-y-1">
                            <div className="flex items-center justify-between font-mono font-bold text-[11px] text-primary">
                              <span className="text-rex-600">{sample.id}</span>
                              <span className="text-[10px] text-muted font-normal">
                                {sample.receivedAt ? sample.receivedAt.slice(0, 10) : ''}
                              </span>
                            </div>
                            <div className="space-y-0.5 pt-0.5">
                              {parsedItems.map((it, i) => (
                                <p key={i} className="text-secondary font-medium truncate">
                                • {it.description || 'Part'} {it.qty ? `(Qty: ${it.qty} ${it.unit || ''})` : ''}
                                </p>
                              ))}
                            </div>
                            {sample.notes && (
                              <p className="text-[10px] text-muted italic border-l border-theme-subtle pl-1.5 mt-1">
                                {sample.notes}
                              </p>
                            )}

                            {/* Sample Photos Gallery */}
                            {samplePhotos.length > 0 && (
                              <div className="pt-2 border-t border-theme-subtle/60 mt-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9.5px] font-bold text-muted uppercase flex items-center gap-1">
                                    <Camera size={11} className="text-amber-500" /> Photos ({samplePhotos.length})
                                  </span>
                                  <span 
                                    className="text-[9px] text-rex-600 dark:text-rex-400 font-semibold cursor-pointer hover:underline" 
                                    onClick={() => setActiveViewingPhotos({ photos: samplePhotos, title: `Sample ${sample.id} - ${selectedLead.company || selectedLead.name}` })}
                                  >
                                    View Full
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                                  {samplePhotos.map((p: any, pIdx: number) => (
                                    <button
                                      key={pIdx}
                                      type="button"
                                      onClick={() => setActiveViewingPhotos({ photos: samplePhotos, title: `Sample ${sample.id} - ${selectedLead.company || selectedLead.name}` })}
                                      className="w-12 h-12 shrink-0 rounded border border-theme-subtle hover:border-amber-500 overflow-hidden relative group cursor-pointer"
                                      title={p.name || 'Click to enlarge photo'}
                                    >
                                      <img src={p.url} alt={p.name || 'Sample photo'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Scope & Requirements Notes */}
                {selectedLead.description && (
                  <div className="bg-surface border border-theme-subtle p-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Requirements & Scope
                    </p>
                    <p className="text-xs text-secondary whitespace-pre-wrap leading-relaxed">
                      {selectedLead.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-3 bg-surface2/80 border-t border-theme-subtle flex items-center justify-between gap-2 shrink-0">
                {selectedLead.stage !== 'won' ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickConvertToCustomer(selectedLead.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Trophy size={13} />
                    <span>{submitting ? 'Converting...' : 'Convert to Customer / Won'}</span>
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    <CheckCircle2 size={14} />
                    <span>Converted / Won Customer</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(selectedLead)}
                  className="px-3 py-2 text-xs font-semibold bg-surface border border-theme-subtle hover:border-rex-500 hover:text-rex-600 text-primary transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Full Edit</span>
                </button>
              </div>
            </aside>
          </>
        );
      })()}

      {/* Sample Photos Full Lightbox Viewer */}
      {activeViewingPhotos && (
        <SamplePhotoViewerModal
          isOpen={!!activeViewingPhotos}
          onClose={() => setActiveViewingPhotos(null)}
          photos={activeViewingPhotos.photos}
          title={activeViewingPhotos.title}
        />
      )}

      {/* ── QUOTATION DOCUMENT PREVIEW / VIEW MODAL ── */}
      <Modal 
        isOpen={!!previewQuoteData} 
        onClose={() => setPreviewQuoteData(null)} 
        title={'Quotation Document - ' + (previewQuoteData?.quotation?.quotationNo || previewQuoteData?.quotation?.id || '')} 
        size="xl"
      >
        {previewQuoteData && (
          <div className="bg-white text-black p-5 sm:p-8 max-h-[82vh] overflow-y-auto w-[900px] max-w-full">
            <QuotationPrintView 
              data={((): any => {
                let parsed: any = {};
                try {
                  parsed = typeof previewQuoteData.quotation.data === 'string' 
                    ? JSON.parse(previewQuoteData.quotation.data) 
                    : (previewQuoteData.quotation.data || previewQuoteData.quotation);
                } catch(e) {
                  parsed = previewQuoteData.quotation;
                }
                if (!parsed.vatNo && previewQuoteData.lead?.vat) parsed.vatNo = previewQuoteData.lead.vat;
                if (!parsed.tinNo && previewQuoteData.lead?.svat) parsed.tinNo = previewQuoteData.lead.svat;
                if (!parsed.customerAddress && previewQuoteData.lead?.address) parsed.customerAddress = previewQuoteData.lead.address;
                if (!parsed.customerName && (previewQuoteData.lead?.company || previewQuoteData.lead?.name)) {
                  parsed.customerName = previewQuoteData.lead.company || previewQuoteData.lead.name;
                }
                return parsed;
              })()} 
              type={previewQuoteData.type}
              lead={previewQuoteData.lead}
              settings={settings}
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-4 border-t border-theme-subtle pt-6">
              <Button
                variant="outline"
                size="sm"
                icon={FileEdit}
                onClick={() => {
                  const q = previewQuoteData.quotation;
                  const isProd = previewQuoteData.type === 'product';
                  const leadId = previewQuoteData.lead?.id || q.leadId;
                  const url = isProd
                    ? `/crm/product-quotations/new/${leadId}?quoteId=${q.id}`
                    : `/crm/quotations/new/${leadId}?quoteId=${q.id}`;
                  setPreviewQuoteData(null);
                  navigate(url);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 border-none font-bold text-xs"
              >
                Edit in Quotation Builder
              </Button>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const quoteNo = previewQuoteData?.quotation?.quotationNo || previewQuoteData?.quotation?.id || 'Quote';
                    exportToPdf('print-section', `Quotation_${quoteNo}.pdf`);
                  }} 
                  className="bg-surface border border-theme-subtle hover:bg-surface2 text-xs font-semibold"
                >
                  Export PDF
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => printElement('print-section', previewQuoteData?.quotation?.quotationNo || 'Quotation')}
                  className="text-xs font-bold"
                >
                  Print Quotation
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
