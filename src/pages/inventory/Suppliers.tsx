import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Plus, Building2, Phone, Mail, Edit, Trash2, ArrowLeft, ChevronRight, Download, 
  Users, User, CreditCard, FileText, CheckCircle2, Globe, ShieldCheck, DollarSign, TrendingUp
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useSuppliers } from '@/hooks/useData'
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export const Suppliers: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: suppliers, loading, refetch } = useSuppliers()
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const s = searchParams.get('search')
    if (s !== null && s !== undefined) {
      setSearch(s)
    }
  }, [searchParams])

  const initialForm = {
    name: '',
    prefix: '',
    category: 'Raw Materials',
    brNumber: '',
    vat: '',
    svat: '',
    address: '',
    website: '',
    currency: 'LKR',
    status: 'active',
    openingBalance: 0,
    // Primary Contact
    contactName: '',
    designation: '',
    phone: '',
    phone2: '',
    email: '',
    // Additional Contacts
    contacts: [] as { id: number; name: string; designation: string; phone: string; email: string }[],
    // Terms & Payment
    paymentTerms: 'Net 30 Days',
    creditDays: 30,
    creditLimit: 0,
    requiresAdvance: false,
    // Bank details
    bankName: '',
    bankBranch: '',
    bankAccountNo: '',
    bankAccountName: '',
    // ISO 8.4 Approved Vendor List (AVL)
    isoCertified: false,
    isoStandard: 'ISO 9001:2015',
    auditStatus: 'Approved',
    qualityRating: 95,
    deliveryRating: 92,
    // Notes
    notes: ''
  }

  const [formData, setFormData] = useState(initialForm)

  const filteredData = suppliers.filter((item: any) => {
    const s = search.toLowerCase()
    return (
      (item.name && item.name.toLowerCase().includes(s)) ||
      (item.contactName && item.contactName.toLowerCase().includes(s)) ||
      (item.contactPerson && item.contactPerson.toLowerCase().includes(s)) ||
      (item.vat && item.vat.toLowerCase().includes(s)) ||
      (item.svat && item.svat.toLowerCase().includes(s)) ||
      (item.brNumber && item.brNumber.toLowerCase().includes(s)) ||
      (item.category && item.category.toLowerCase().includes(s)) ||
      (item.phone && item.phone.toLowerCase().includes(s))
    )
  })

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditId(item.id)
      let parsedContacts: any[] = []
      try {
        if (typeof item.contacts === 'string') {
          parsedContacts = JSON.parse(item.contacts)
        } else if (Array.isArray(item.contacts)) {
          parsedContacts = item.contacts
        }
      } catch (e) {
        parsedContacts = []
      }

      setFormData({
        name: item.name || '',
        prefix: item.prefix || '',
        category: item.category || 'Raw Materials',
        brNumber: item.brNumber || '',
        vat: item.vat || '',
        svat: item.svat || '',
        address: item.address || '',
        website: item.website || '',
        currency: item.currency || 'LKR',
        status: item.status || 'active',
        openingBalance: Number(item.openingBalance ?? item.balance) || 0,
        contactName: item.contactName || item.contactPerson || '',
        designation: item.designation || '',
        phone: item.phone || '',
        phone2: item.phone2 || '',
        email: item.email || '',
        contacts: parsedContacts,
        paymentTerms: item.paymentTerms || 'Net 30 Days',
        creditDays: Number(item.creditDays) || 30,
        creditLimit: Number(item.creditLimit) || 0,
        requiresAdvance: !!item.requiresAdvance,
        bankName: item.bankName || '',
        bankBranch: item.bankBranch || '',
        bankAccountNo: item.bankAccountNo || '',
        bankAccountName: item.bankAccountName || '',
        isoCertified: Boolean(item.isoCertified),
        isoStandard: item.isoStandard || 'ISO 9001:2015',
        auditStatus: item.auditStatus || 'Approved',
        qualityRating: item.qualityRating !== undefined ? Number(item.qualityRating) : 95,
        deliveryRating: item.deliveryRating !== undefined ? Number(item.deliveryRating) : 92,
        notes: item.notes || ''
      })
    } else {
      setEditId(null)
      setFormData(initialForm)
    }
    setShowForm(true)
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const showToast = (type: 'success'|'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      id: editId || undefined,
      ...formData
    }

    try {
      if (editId) {
        await updateSupplier(editId, payload)
        showToast('success', 'Supplier updated successfully')
      } else {
        await createSupplier(payload)
        showToast('success', 'Supplier registered successfully')
      }
      refetch()
      setShowForm(false)
    } catch (err: any) {
      console.error(err)
      showToast('error', 'Failed to save supplier: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteSupplier(deleteTarget)
      refetch()
      setShowForm(false)
      setDeleteTarget(null)
      showToast('success', 'Supplier deleted')
    } catch (err: any) {
      showToast('error', 'Failed to delete supplier: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<any>[] = [
    {
      header: 'Supplier Entity',
      key: 'name',
      render: (val: any, item: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-orange-500/10 text-orange-400">
            <Building2 size={16} />
          </div>
          <div>
            <div className="font-semibold text-primary flex items-center gap-2">
              {val}
              {item.prefix && (
                <span className="text-[10px] bg-surface2 px-1.5 py-0.5 rounded text-muted font-mono">
                  {item.prefix}
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
              <span>{item.category || 'Raw Materials'}</span>
              {item.brNumber && <span>· BR: {item.brNumber}</span>}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Tax Info (VAT / SVAT)',
      key: 'vat',
      render: (val: any, item: any) => (
        <div className="space-y-1">
          {val ? (
            <Badge variant="info" className="text-[10px] font-mono flex items-center gap-1">
              <ShieldCheck size={10} /> VAT: {val}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted italic">Non-VAT</span>
          )}
          {item.svat && (
            <div>
              <Badge variant="outline" className="text-[10px] font-mono text-purple-500 border-purple-500/30">
                SVAT: {item.svat}
              </Badge>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Primary Contact',
      key: 'contactName',
      render: (val: any, item: any) => {
        const contactPerson = val || item.contactPerson
        let contactCount = 0
        try {
          if (Array.isArray(item.contacts)) contactCount = item.contacts.length
          else if (typeof item.contacts === 'string' && item.contacts.startsWith('[')) {
            contactCount = JSON.parse(item.contacts).length
          }
        } catch(e) {}

        return (
          <div>
            <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
              {contactPerson || '-'}
              {contactCount > 0 && (
                <span 
                  className="text-[9px] bg-blue-500/10 text-blue-500 font-bold px-1.5 py-0.5 rounded border border-blue-500/20" 
                  title={`${contactCount} additional contact persons`}
                >
                  +{contactCount}
                </span>
              )}
            </div>
            {item.designation && <div className="text-[10px] text-muted">{item.designation}</div>}
          </div>
        )
      }
    },
    {
      header: 'Contact Details',
      key: 'phone',
      render: (val: any, item: any) => (
        <div className="text-xs text-secondary space-y-1">
          {val && <div className="flex items-center gap-1"><Phone size={10} className="text-muted"/> {val}</div>}
          {item.phone2 && <div className="flex items-center gap-1"><Phone size={10} className="text-muted"/> {item.phone2}</div>}
          {item.email && <div className="flex items-center gap-1"><Mail size={10} className="text-muted"/> {item.email}</div>}
          {!val && !item.phone2 && !item.email && '-'}
        </div>
      )
    },
    {
      header: 'Terms & Bank',
      key: 'paymentTerms',
      render: (val: any, item: any) => (
        <div className="text-xs space-y-0.5">
          <div className="text-primary font-medium">{val || 'Net 30 Days'}</div>
          {item.bankName && (
            <div className="text-[10px] text-muted flex items-center gap-1">
              <CreditCard size={10} /> {item.bankName} {item.bankBranch ? `(${item.bankBranch})` : ''}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Outstanding Balance',
      key: 'outstandingBalance',
      render: (val: any, item: any) => {
        const bal = Number(val !== undefined ? val : (item.balance || 0))
        return (
          <div className="space-y-0.5">
            <div className={`font-mono text-xs font-bold ${bal > 0 ? 'text-red-500' : bal < 0 ? 'text-emerald-500' : 'text-muted'}`}>
              {formatCurrency(Math.abs(bal), true)}
            </div>
            <div className="text-[10px]">
              {bal > 0 ? (
                <span className="text-red-400 font-medium">Payable</span>
              ) : bal < 0 ? (
                <span className="text-emerald-400 font-medium">Credit</span>
              ) : (
                <span className="text-muted">Settled</span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      header: 'AVL & ISO Rating (ISO 8.4)',
      key: 'isoCertified',
      render: (_val: any, item: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.isoCertified ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1">
                <ShieldCheck size={11} /> {item.isoStandard || 'ISO 9001:2015'}
              </span>
            ) : (
              <span className="text-[10px] text-muted bg-surface2 px-1.5 py-0.5 border border-theme-subtle">
                Non-ISO
              </span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              item.auditStatus === 'Approved' ? 'text-emerald-500 bg-emerald-500/10' :
              item.auditStatus === 'Conditional' ? 'text-amber-500 bg-amber-500/10' :
              item.auditStatus === 'Disqualified' ? 'text-rose-500 bg-rose-500/10' :
              'text-muted bg-surface2'
            }`}>
              {item.auditStatus || 'Approved'}
            </span>
          </div>
          <div className="text-[10px] text-muted flex items-center gap-2">
            <span>Quality: <strong className="text-emerald-500">{item.qualityRating ?? 95}%</strong></span>
            <span>·</span>
            <span>OTD: <strong className="text-blue-500">{item.deliveryRating ?? 92}%</strong></span>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (val: any) => (
        <Badge variant={val === 'active' ? 'success' : 'default'}>{(val || 'active').toUpperCase()}</Badge>
      )
    },
    {
      header: '',
      key: 'id',
      render: (_: any, item: any) => (
        <div className="flex justify-end items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); handleOpenForm(item) }} className="p-1 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors" title="Edit"><Edit size={14}/></button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }} className="p-1 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14}/></button>
          <button onClick={() => navigate(`/inventory/suppliers/${item.id}`)} className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary transition-colors" title="View Profile"><ChevronRight size={15}/></button>
        </div>
      )
    }
  ]

  const totalPayable = suppliers.reduce((s: number, r: any) => s + (Number(r.outstandingBalance || 0) > 0 ? Number(r.outstandingBalance) : 0), 0)
  const totalPurchases = suppliers.reduce((s: number, r: any) => s + Number(r.totalPurchases || 0), 0)
  const totalPaid = suppliers.reduce((s: number, r: any) => s + Number(r.totalPaid || 0), 0)

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Suppliers & Payables</h1>
          <p className="text-xs text-muted mt-0.5">{suppliers.length} total registered suppliers · Ledger and outstanding tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenForm()}>Add Supplier</Button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Suppliers</div>
            <div className="text-xl font-bold text-primary mt-1">{suppliers.length}</div>
            <div className="text-[10px] text-muted mt-0.5">{suppliers.filter((s: any) => s.status === 'active').length} Active Accounts</div>
          </div>
          <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400">
            <Building2 size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between border border-red-500/20 bg-red-500/5">
          <div>
            <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Total Payables</div>
            <div className="text-xl font-bold font-mono text-red-500 mt-1">{formatCurrency(totalPayable, true)}</div>
            <div className="text-[10px] text-muted mt-0.5">Outstanding owed to suppliers</div>
          </div>
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
            <DollarSign size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Billed</div>
            <div className="text-xl font-bold font-mono text-primary mt-1">{formatCurrency(totalPurchases, true)}</div>
            <div className="text-[10px] text-muted mt-0.5">Purchases & Invoices</div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <TrendingUp size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Settled</div>
            <div className="text-xl font-bold font-mono text-emerald-500 mt-1">{formatCurrency(totalPaid, true)}</div>
            <div className="text-[10px] text-muted mt-0.5">Payments made</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CreditCard size={20} />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, contact, VAT, BR, category..." className="w-80" />
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        <DataTable columns={columns} data={filteredData} keyExtractor={(item: any) => item.id} onRowClick={(item) => navigate(`/inventory/suppliers/${item.id}`)} />
      </GlassCard>

      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Supplier Registration Modal */}
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title={editId ? "Edit Supplier Details" : "Register New Supplier Account"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6 p-2 max-h-[82vh] overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Section 1: Company / Entity Information */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Building2 size={14} className="text-rex-600 dark:text-rex-400" />
              Company / Entity Details
            </h3>
            
            <div className="grid grid-cols-6 gap-3.5">
              <div className="space-y-1 col-span-6 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Prefix</label>
                <input 
                  value={formData.prefix} 
                  onChange={e => setFormData({...formData, prefix: e.target.value.toUpperCase()})} 
                  className="w-full input-base text-xs" 
                  placeholder="ABC" 
                  maxLength={5} 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                  Company / Supplier Name <span className="text-red-500">*</span>
                </label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. ABC Steel Mills (Pvt) Ltd" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Category</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Raw Materials">Raw Materials (Metals, Steel, Bars)</option>
                  <option value="Machining / Outsourcing">Machining / Heat Treatment / Outsourcing</option>
                  <option value="Consumables">Consumables (Tools, Inserts, Oils)</option>
                  <option value="Fasteners & Hardware">Fasteners, Bolts, Bearings</option>
                  <option value="Electrical & Automation">Electrical & Automation</option>
                  <option value="Packaging">Packaging Materials</option>
                  <option value="Services & Logistics">Services & Logistics</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Business Reg. (BR No)</label>
                <input 
                  value={formData.brNumber} 
                  onChange={e => setFormData({...formData, brNumber: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="PV 123456" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider text-rex-600 dark:text-rex-400">
                  VAT Registration Number
                </label>
                <input 
                  value={formData.vat} 
                  onChange={e => setFormData({...formData, vat: e.target.value})} 
                  className="w-full input-base text-xs font-mono border-rex-200 dark:border-rex-900/50" 
                  placeholder="e.g. 102345678-7000" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT / TIN Number</label>
                <input 
                  value={formData.svat} 
                  onChange={e => setFormData({...formData, svat: e.target.value})} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="e.g. SVAT 001234" 
                />
              </div>

              <div className="space-y-1 col-span-6">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Address / Factory Location</label>
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  rows={2} 
                  className="w-full input-base text-xs resize-none" 
                  placeholder="Full street address, industrial zone, city..." 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Website URL</label>
                <input 
                  type="text"
                  value={formData.website} 
                  onChange={e => setFormData({...formData, website: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="https://abcsteels.lk" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Currency</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.currency} 
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="LKR">LKR - Sri Lankan Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                </select>
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Supplier Status</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">Active Supplier</option>
                  <option value="inactive">Inactive / On Hold</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Primary Contact Representative */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <User size={14} className="text-blue-500" />
              Primary Contact Representative
            </h3>
            
            <div className="grid grid-cols-6 gap-3.5">
              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input 
                  required 
                  value={formData.contactName} 
                  onChange={e => setFormData({...formData, contactName: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Mr. Samantha Perera" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Designation / Role</label>
                <input 
                  value={formData.designation} 
                  onChange={e => setFormData({...formData, designation: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Senior Sales Manager / Director" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Primary Phone / Mobile</label>
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. 077 123 4567" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Secondary Phone / Office</label>
                <input 
                  value={formData.phone2} 
                  onChange={e => setFormData({...formData, phone2: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. 011 234 5678" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="samantha@abcsteel.lk" 
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Contact Persons (Multiple) */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-purple-500" />
                Additional Contact Persons ({formData.contacts.length})
              </h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setFormData(f => ({
                  ...f, 
                  contacts: [...(f.contacts || []), { id: Date.now(), name: '', designation: '', phone: '', email: '' }] 
                }))} 
                icon={Plus}
                className="text-xs h-7"
              >
                Add Contact Person
              </Button>
            </div>

            <div className="space-y-2.5">
              {(formData.contacts || []).map((c: any, i: number) => (
                <div key={c.id || i} className="flex items-start gap-2 bg-surface2/60 p-3 rounded-lg border border-theme-subtle">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 flex-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Full Name *</label>
                      <input 
                        required
                        value={c.name} 
                        onChange={e => {
                          const newContacts = [...formData.contacts]
                          newContacts[i].name = e.target.value
                          setFormData({...formData, contacts: newContacts})
                        }} 
                        className="w-full text-xs input-base py-1 px-2" 
                        placeholder="e.g. Jane Smith" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Designation / Department</label>
                      <input 
                        value={c.designation} 
                        onChange={e => {
                          const newContacts = [...formData.contacts]
                          newContacts[i].designation = e.target.value
                          setFormData({...formData, contacts: newContacts})
                        }} 
                        className="w-full text-xs input-base py-1 px-2" 
                        placeholder="e.g. Accounts / Dispatch / QA" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Phone / Mobile</label>
                      <input 
                        value={c.phone} 
                        onChange={e => {
                          const newContacts = [...formData.contacts]
                          newContacts[i].phone = e.target.value
                          setFormData({...formData, contacts: newContacts})
                        }} 
                        className="w-full text-xs input-base py-1 px-2" 
                        placeholder="07X XXX XXXX" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email"
                        value={c.email} 
                        onChange={e => {
                          const newContacts = [...formData.contacts]
                          newContacts[i].email = e.target.value
                          setFormData({...formData, contacts: newContacts})
                        }} 
                        className="w-full text-xs input-base py-1 px-2" 
                        placeholder="rep@abc.lk" 
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const newContacts = [...formData.contacts]
                      newContacts.splice(i, 1)
                      setFormData({...formData, contacts: newContacts})
                    }} 
                    className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-500/10 mt-4 transition-colors"
                    title="Remove Contact"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {(!formData.contacts || formData.contacts.length === 0) && (
                <div className="text-center py-4 border border-dashed border-theme-subtle rounded-lg text-xs text-muted">
                  No additional contacts added yet. Click <span className="font-semibold text-primary">"+ Add Contact Person"</span> to add accounts, logistics, or technical representatives.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Payment Terms & Banking Details */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <CreditCard size={14} className="text-emerald-500" />
              Payment Terms & Bank Account Details
            </h3>

            <div className="grid grid-cols-6 gap-3.5">
              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Payment Terms</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.paymentTerms} 
                  onChange={e => setFormData({...formData, paymentTerms: e.target.value})}
                >
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                  <option value="Advance Payment">100% Advance Payment</option>
                  <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                  <option value="Immediate / On Invoice">Immediate / On Invoice</option>
                </select>
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Credit Period (Days)</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.creditDays} 
                  onChange={e => setFormData({...formData, creditDays: Number(e.target.value)})} 
                  className="w-full input-base text-xs" 
                  placeholder="30" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Credit Limit (LKR)</label>
                <input 
                  type="number" 
                  min="0"
                  step="1000"
                  value={formData.creditLimit} 
                  onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="0.00" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Opening Balance (LKR)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.openingBalance} 
                  onChange={e => setFormData({...formData, openingBalance: Number(e.target.value)})} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="0.00" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Bank Name</label>
                <input 
                  value={formData.bankName} 
                  onChange={e => setFormData({...formData, bankName: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Commercial Bank of Ceylon" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Branch</label>
                <input 
                  value={formData.bankBranch} 
                  onChange={e => setFormData({...formData, bankBranch: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Colombo Main / Wattala" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Number</label>
                <input 
                  value={formData.bankAccountNo} 
                  onChange={e => setFormData({...formData, bankAccountNo: e.target.value})} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="e.g. 10002345678" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Name / Payee</label>
                <input 
                  value={formData.bankAccountName} 
                  onChange={e => setFormData({...formData, bankAccountName: e.target.value})} 
                  className="w-full input-base text-xs" 
                  placeholder="Name as registered with bank" 
                />
              </div>

              <div className="col-span-6 sm:col-span-3 flex items-center mt-4">
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded bg-surface2/50 border border-theme-subtle w-full">
                  <input 
                    type="checkbox" 
                    checked={formData.requiresAdvance} 
                    onChange={e => setFormData({...formData, requiresAdvance: e.target.checked})} 
                    className="w-4 h-4 rounded text-rex-600 focus:ring-rex-500" 
                  />
                  <div>
                    <span className="text-xs font-bold text-primary block">Requires Advance Payment</span>
                    <span className="text-[10px] text-muted block">Supplier requires payment before dispatching PO orders</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4.5: ISO 8.4 Approved Vendor List (AVL) Evaluation */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-500" />
              ISO 8.4 Approved Vendor List (AVL) & Quality Rating
            </h3>

            <div className="grid grid-cols-6 gap-3.5">
              <div className="col-span-6 sm:col-span-2 flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded bg-surface2/50 border border-theme-subtle w-full">
                  <input 
                    type="checkbox" 
                    checked={formData.isoCertified} 
                    onChange={e => setFormData({...formData, isoCertified: e.target.checked})} 
                    className="w-4 h-4 rounded text-rex-600 focus:ring-rex-500" 
                  />
                  <div>
                    <span className="text-xs font-bold text-primary block">ISO Certified Supplier</span>
                    <span className="text-[10px] text-muted block">Supplier holds active QMS certification</span>
                  </div>
                </label>
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">ISO Standard Spec</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.isoStandard} 
                  onChange={e => setFormData({...formData, isoStandard: e.target.value})}
                >
                  <option value="ISO 9001:2015">ISO 9001:2015 (Quality)</option>
                  <option value="IATF 16949">IATF 16949 (Automotive)</option>
                  <option value="AS9100D">AS9100D (Aerospace)</option>
                  <option value="ISO 14001">ISO 14001 (Environmental)</option>
                  <option value="ISO 45001">ISO 45001 (Health & Safety)</option>
                  <option value="Non-Certified">Non-Certified</option>
                </select>
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Audit / AVL Status</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.auditStatus} 
                  onChange={e => setFormData({...formData, auditStatus: e.target.value})}
                >
                  <option value="Approved">Approved (AVL Full Status)</option>
                  <option value="Conditional">Conditional (Trial / Monitored)</option>
                  <option value="Pending">Pending Audit</option>
                  <option value="Disqualified">Disqualified (Hold)</option>
                </select>
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Quality Acceptance Score (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={formData.qualityRating} 
                  onChange={e => setFormData({...formData, qualityRating: Number(e.target.value)})} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="95" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">On-Time Delivery (OTD) Score (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={formData.deliveryRating} 
                  onChange={e => setFormData({...formData, deliveryRating: Number(e.target.value)})} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="92" 
                />
              </div>
            </div>
          </div>

          {/* Section 5: Notes & Remarks */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <FileText size={14} className="text-amber-500" />
              Notes & Capabilities
            </h3>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              rows={2} 
              className="w-full input-base text-xs resize-none" 
              placeholder="e.g. Special discounts, minimum order quantity (MOQ), materials supplied, lead times..." 
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-theme-subtle flex justify-end gap-3 sticky bottom-0 bg-surface/90 backdrop-blur py-2">
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (editId ? 'Save Changes' : 'Register Supplier')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this supplier? This action cannot be undone.
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
