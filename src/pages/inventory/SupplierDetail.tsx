import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, Plus, Trash2,
  TrendingUp, TrendingDown, DollarSign, FileText, Package,
  Calendar, ChevronDown, CreditCard, Truck, Edit, ShieldCheck,
  Globe, Users, User, ExternalLink, CheckCircle2, AlertCircle, Building,
  Printer, Download, Search, Filter, X, RefreshCw
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useSupplierLedger } from '@/hooks/useData'
import { fetchSupplierById, updateSupplier, createSupplierLedgerEntry, deleteSupplierLedgerEntry } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

const TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Purchase / Invoice', icon: '📦', debitSide: 'debit', badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { value: 'payment', label: 'Payment Made', icon: '💳', debitSide: 'credit', badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { value: 'return', label: 'Return / Credit Note', icon: '↩️', debitSide: 'credit', badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { value: 'advance', label: 'Advance Payment', icon: '⬆️', debitSide: 'credit', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'adjustment', label: 'Manual Adjustment', icon: '✏️', debitSide: 'debit', badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
]

export const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<any>(null)
  const [loadingSupplier, setLoadingSupplier] = useState(true)
  const { data: ledger, loading: loadingLedger, refetch } = useSupplierLedger(id || '')
  
  // Modals state
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  
  const [submittingLedger, setSubmittingLedger] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Filter state for ledger
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // New Transaction Form state
  const [entryForm, setEntryForm] = useState({
    type: 'purchase',
    date: new Date().toISOString().slice(0, 10),
    referenceNo: '',
    description: '',
    amount: '',
    paymentMethod: 'Bank Transfer'
  })

  // Quick Payment Modal form state
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    paymentMethod: 'Bank Transfer',
    referenceNo: '',
    description: '',
    bankAccount: ''
  })

  // Edit Supplier Form state
  const initialSupplierForm = {
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
    contactName: '',
    designation: '',
    phone: '',
    phone2: '',
    email: '',
    contacts: [] as { id: number; name: string; designation: string; phone: string; email: string }[],
    paymentTerms: 'Net 30 Days',
    creditDays: 30,
    creditLimit: 0,
    requiresAdvance: false,
    bankName: '',
    bankBranch: '',
    bankAccountNo: '',
    bankAccountName: '',
    notes: ''
  }

  const [formData, setFormData] = useState(initialSupplierForm)

  const loadSupplierData = () => {
    if (!id) return
    setLoadingSupplier(true)
    fetchSupplierById(id)
      .then(d => {
        setSupplier(d)
        setLoadingSupplier(false)
      })
      .catch(() => setLoadingSupplier(false))
  }

  useEffect(() => {
    loadSupplierData()
  }, [id])

  // Open Edit Supplier Modal
  const handleOpenEdit = () => {
    if (!supplier) return
    let parsedContacts: any[] = []
    try {
      if (Array.isArray(supplier.contacts)) {
        parsedContacts = supplier.contacts
      } else if (typeof supplier.contacts === 'string' && supplier.contacts.startsWith('[')) {
        parsedContacts = JSON.parse(supplier.contacts)
      }
    } catch (e) {
      parsedContacts = []
    }

    setFormData({
      name: supplier.name || '',
      prefix: supplier.prefix || '',
      category: supplier.category || 'Raw Materials',
      brNumber: supplier.brNumber || '',
      vat: supplier.vat || '',
      svat: supplier.svat || '',
      address: supplier.address || '',
      website: supplier.website || '',
      currency: supplier.currency || 'LKR',
      status: supplier.status || 'active',
      openingBalance: Number(supplier.openingBalance ?? supplier.balance) || 0,
      contactName: supplier.contactName || supplier.contactPerson || '',
      designation: supplier.designation || '',
      phone: supplier.phone || '',
      phone2: supplier.phone2 || '',
      email: supplier.email || '',
      contacts: parsedContacts,
      paymentTerms: supplier.paymentTerms || 'Net 30 Days',
      creditDays: Number(supplier.creditDays) || 30,
      creditLimit: Number(supplier.creditLimit) || 0,
      requiresAdvance: !!supplier.requiresAdvance,
      bankName: supplier.bankName || '',
      bankBranch: supplier.bankBranch || '',
      bankAccountNo: supplier.bankAccountNo || '',
      bankAccountName: supplier.bankAccountName || '',
      notes: supplier.notes || ''
    })
    setShowEditModal(true)
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSavingSupplier(true)
    try {
      await updateSupplier(id, formData)
      showToast('success', 'Supplier details updated successfully')
      setShowEditModal(false)
      loadSupplierData()
    } catch (err: any) {
      console.error(err)
      showToast('error', 'Failed to update supplier: ' + err.message)
    } finally {
      setSavingSupplier(false)
    }
  }

  // Calculations for financial stats
  const openingBalance = Number(supplier?.openingBalance || supplier?.balance || 0)
  const totalDebit = ledger.reduce((s: number, r: any) => s + Number(r.debit || 0), 0)
  const totalCredit = ledger.reduce((s: number, r: any) => s + Number(r.credit || 0), 0)
  const outstandingBalance = (totalDebit - totalCredit) + openingBalance

  // Open Payment Modal
  const handleOpenPayment = () => {
    setPaymentForm({
      date: new Date().toISOString().slice(0, 10),
      amount: outstandingBalance > 0 ? String(outstandingBalance) : '',
      paymentMethod: 'Bank Transfer',
      referenceNo: '',
      description: `Payment to ${supplier?.name || 'Supplier'}`,
      bankAccount: supplier?.bankName ? `${supplier.bankName} - ${supplier.bankAccountNo}` : ''
    })
    setShowPaymentModal(true)
  }

  // Submit quick payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !paymentForm.amount) return
    setSubmittingLedger(true)
    const amount = Number(paymentForm.amount)
    const payload = {
      supplierId: id,
      type: 'payment',
      date: paymentForm.date.replace('T', ' ') + (paymentForm.date.length === 10 ? ' 00:00:00' : ''),
      referenceNo: paymentForm.referenceNo || `PMT-${Date.now().toString().slice(-6)}`,
      description: paymentForm.description || `Payment made via ${paymentForm.paymentMethod}`,
      debit: 0,
      credit: amount,
      amount: amount,
      paymentMethod: paymentForm.paymentMethod
    }
    try {
      await createSupplierLedgerEntry(payload)
      showToast('success', 'Payment recorded successfully')
      setShowPaymentModal(false)
      refetch()
      loadSupplierData()
    } catch (err: any) {
      showToast('error', 'Failed to record payment: ' + err.message)
    } finally {
      setSubmittingLedger(false)
    }
  }

  // Save new transaction entry (Invoice / Debit / Credit)
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !entryForm.amount) return
    setSubmittingLedger(true)
    const txType = TRANSACTION_TYPES.find(t => t.value === entryForm.type)!
    const amount = Number(entryForm.amount)
    const payload: any = {
      supplierId: id,
      type: entryForm.type,
      date: entryForm.date.replace('T', ' ') + (entryForm.date.length === 10 ? ' 00:00:00' : ''),
      referenceNo: entryForm.referenceNo || `REF-${Date.now().toString().slice(-6)}`,
      description: entryForm.description,
      debit: txType.debitSide === 'debit' ? amount : 0,
      credit: txType.debitSide === 'credit' ? amount : 0,
      amount: amount,
      paymentMethod: entryForm.paymentMethod
    }
    try {
      await createSupplierLedgerEntry(payload)
      showToast('success', 'Transaction entry saved')
      setShowAddEntry(false)
      setEntryForm({
        type: 'purchase',
        date: new Date().toISOString().slice(0, 10),
        referenceNo: '',
        description: '',
        amount: '',
        paymentMethod: 'Bank Transfer'
      })
      refetch()
      loadSupplierData()
    } catch (err: any) {
      showToast('error', 'Failed to save entry: ' + err.message)
    } finally {
      setSubmittingLedger(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSupplierLedgerEntry(deleteTarget)
      showToast('success', 'Ledger entry deleted')
      refetch()
      loadSupplierData()
    } catch (err: any) {
      showToast('error', 'Failed to delete entry: ' + err.message)
    } finally {
      setDeleteTarget(null)
    }
  }

  // Compute chronologically sorted ledger with running balance
  const processedLedger = useMemo(() => {
    // Sort chronological: oldest first
    const sorted = [...ledger].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let currentBalance = openingBalance
    return sorted.map((row: any) => {
      const debit = Number(row.debit || 0)
      const credit = Number(row.credit || 0)
      currentBalance += (debit - credit)
      return {
        ...row,
        runningBalance: currentBalance
      }
    })
  }, [ledger, openingBalance])

  // Filtered rows for display (reverse order: newest first)
  const filteredLedger = useMemo(() => {
    return [...processedLedger].reverse().filter((row: any) => {
      if (typeFilter !== 'all' && row.type !== typeFilter) return false
      if (startDate && String(row.date).slice(0, 10) < startDate) return false
      if (endDate && String(row.date).slice(0, 10) > endDate) return false
      if (ledgerSearch) {
        const s = ledgerSearch.toLowerCase()
        const matchRef = (row.referenceNo || row.reference || '').toLowerCase().includes(s)
        const matchDesc = (row.description || row.notes || '').toLowerCase().includes(s)
        if (!matchRef && !matchDesc) return false
      }
      return true
    })
  }, [processedLedger, typeFilter, startDate, endDate, ledgerSearch])

  // Export CSV
  const handleExportCSV = () => {
    if (processedLedger.length === 0) return
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Payment Method', 'Debit (Purchase)', 'Credit (Payment)', 'Running Balance']
    const rows = processedLedger.map((r: any) => [
      String(r.date).slice(0, 10),
      r.type,
      `"${r.referenceNo || ''}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.paymentMethod || '',
      r.debit || 0,
      r.credit || 0,
      r.runningBalance || 0
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Supplier_Ledger_${supplier?.name || id}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loadingSupplier) {
    return <div className="flex items-center justify-center h-64 text-muted">Loading supplier profile...</div>
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted">Supplier not found.</p>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/inventory/suppliers')}>Back to Suppliers</Button>
      </div>
    )
  }

  // Parse additional contacts
  let additionalContacts: any[] = []
  try {
    if (Array.isArray(supplier.contacts)) {
      additionalContacts = supplier.contacts
    } else if (typeof supplier.contacts === 'string' && supplier.contacts.startsWith('[')) {
      additionalContacts = JSON.parse(supplier.contacts)
    }
  } catch (e) {
    additionalContacts = []
  }

  const creditLimit = Number(supplier.creditLimit || 0)
  const creditUsagePct = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, outstandingBalance) / creditLimit) * 100)) : 0

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/inventory/suppliers')}>Suppliers</Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary tracking-tight">{supplier.name}</h1>
                {supplier.prefix && (
                  <span className="text-xs bg-surface2 px-2 py-0.5 rounded text-muted font-mono font-bold">
                    {supplier.prefix}
                  </span>
                )}
                <Badge variant={supplier.status === 'active' ? 'success' : 'default'}>
                  {(supplier.status || 'active').toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                <span>{supplier.category || 'Raw Materials'}</span>
                <span>•</span>
                <span>Currency: <strong className="text-primary">{supplier.currency || 'LKR'}</strong></span>
                {supplier.id && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-muted">{supplier.id}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {supplier.vat ? (
            <Badge variant="info" className="text-xs font-mono flex items-center gap-1.5 py-1 px-2.5">
              <ShieldCheck size={13} /> VAT: {supplier.vat}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted italic">Non-VAT</Badge>
          )}

          {supplier.svat && (
            <Badge variant="outline" className="text-xs font-mono text-purple-400 border-purple-500/30 py-1 px-2">
              SVAT: {supplier.svat}
            </Badge>
          )}

          {supplier.brNumber && (
            <Badge variant="outline" className="text-xs font-mono text-secondary border-theme-subtle py-1 px-2">
              BR: {supplier.brNumber}
            </Badge>
          )}

          <div className="h-6 w-px bg-theme-subtle mx-1" />

          <Button variant="ghost" size="sm" icon={Edit} onClick={handleOpenEdit}>
            Edit Profile
          </Button>

          <Button variant="ghost" size="sm" icon={Printer} onClick={() => setShowPrintModal(true)}>
            Print Statement
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            icon={CreditCard} 
            onClick={handleOpenPayment}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
          >
            Record Payment
          </Button>

          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddEntry(true)}>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Financial KPI Row - Outstanding & Ledger Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Outstanding Balance Card (Prominent) */}
        <GlassCard className={`p-5 flex flex-col justify-between border-2 transition-all ${
          outstandingBalance > 0 
            ? 'border-red-500/40 bg-red-500/5' 
            : outstandingBalance < 0 
              ? 'border-emerald-500/40 bg-emerald-500/5' 
              : 'border-theme-subtle'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={15} className={outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-500'} />
                Outstanding Balance
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                outstandingBalance > 0 
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                  : outstandingBalance < 0 
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                    : 'bg-surface2 text-muted'
              }`}>
                {outstandingBalance > 0 ? 'Payable' : outstandingBalance < 0 ? 'Credit / Advance' : 'Settled'}
              </span>
            </div>

            <div className={`text-2xl font-black font-mono tracking-tight ${
              outstandingBalance > 0 ? 'text-red-500' : outstandingBalance < 0 ? 'text-emerald-500' : 'text-muted'
            }`}>
              {formatCurrency(Math.abs(outstandingBalance), true)}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-theme-subtle/50 text-[11px] text-muted space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <strong className={outstandingBalance > 0 ? 'text-red-400' : outstandingBalance < 0 ? 'text-emerald-400' : 'text-secondary'}>
                {outstandingBalance > 0 ? 'We owe this supplier' : outstandingBalance < 0 ? 'Advance / Excess paid' : 'Zero balance'}
              </strong>
            </div>
            {openingBalance !== 0 && (
              <div className="flex justify-between text-[10px]">
                <span>Opening Balance:</span>
                <span className="font-mono">{formatCurrency(openingBalance, true)}</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Total Purchases / Billed */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-red-400" /> Total Purchases
            </span>
            <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-mono">Billed</span>
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{formatCurrency(totalDebit, true)}</div>
          <div className="mt-3 pt-2.5 border-t border-theme-subtle/50 text-[11px] text-muted flex justify-between items-center">
            <span>Invoices / Bills:</span>
            <span className="font-semibold text-primary">{ledger.filter((r: any) => r.type === 'purchase').length}</span>
          </div>
        </GlassCard>

        {/* Total Paid / Settled */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-400" /> Total Paid
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">Settled</span>
          </div>
          <div className="text-2xl font-bold text-primary font-mono">{formatCurrency(totalCredit, true)}</div>
          <div className="mt-3 pt-2.5 border-t border-theme-subtle/50 text-[11px] text-muted flex justify-between items-center">
            <span>Payment Records:</span>
            <span className="font-semibold text-emerald-500">{ledger.filter((r: any) => r.type === 'payment').length}</span>
          </div>
        </GlassCard>

        {/* Credit Limit & Terms */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted font-bold uppercase tracking-wider">Credit Terms</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 font-mono text-muted">{supplier.paymentTerms || 'Net 30 Days'}</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {supplier.creditDays ? `${supplier.creditDays} Days Credit` : 'Immediate'}
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              Limit: {creditLimit > 0 ? formatCurrency(creditLimit, true) : 'No Limit Set'}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-theme-subtle/50">
            {creditLimit > 0 ? (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted font-medium">
                  <span>Limit Utilized</span>
                  <span className={creditUsagePct > 80 ? 'text-red-500 font-bold' : 'text-primary'}>{creditUsagePct}%</span>
                </div>
                <div className="w-full bg-surface2 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${creditUsagePct > 85 ? 'bg-red-500' : creditUsagePct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${creditUsagePct}%` }}
                  />
                </div>
              </div>
            ) : supplier.requiresAdvance ? (
              <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                ⚠️ Advance payment required
              </span>
            ) : (
              <span className="text-[10px] text-muted">Standard supplier account</span>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Supplier Profile Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Contacts Section */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-blue-500" />
              Contact Representatives
            </h2>
            <span className="text-[11px] text-muted">
              {1 + additionalContacts.length} Contact{1 + additionalContacts.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Primary Representative */}
          <div className="bg-surface2/60 p-3.5 rounded-lg border border-theme-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-rex-600 dark:text-rex-400">Primary Contact</span>
              {supplier.designation && <span className="text-[11px] text-muted">{supplier.designation}</span>}
            </div>
            <div className="font-semibold text-primary text-sm flex items-center gap-1.5">
              <User size={13} className="text-muted" />
              {supplier.contactName || supplier.contactPerson || 'Not Specified'}
            </div>
            <div className="space-y-1 text-xs text-secondary pt-1">
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={11} className="text-muted shrink-0" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.phone2 && (
                <div className="flex items-center gap-2">
                  <Phone size={11} className="text-muted shrink-0" />
                  <span>{supplier.phone2} (Office)</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail size={11} className="text-muted shrink-0" />
                  <a href={`mailto:${supplier.email}`} className="hover:underline text-blue-400">{supplier.email}</a>
                </div>
              )}
            </div>
          </div>

          {/* Additional Contacts */}
          {additionalContacts.length > 0 && (
            <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Additional Personnel</div>
              {additionalContacts.map((c: any, idx: number) => (
                <div key={c.id || idx} className="p-2.5 bg-surface/80 rounded-lg border border-theme-subtle text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{c.name}</span>
                    <span className="text-[10px] text-muted">{c.designation || 'Representative'}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2 text-secondary text-[11px]">
                      <Phone size={10} className="text-muted shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-secondary text-[11px]">
                      <Mail size={10} className="text-muted shrink-0" />
                      <a href={`mailto:${c.email}`} className="hover:underline text-blue-400">{c.email}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {additionalContacts.length === 0 && (
            <div className="text-[11px] text-muted italic text-center py-2">
              No additional contact persons listed. Click "Edit Profile" to add.
            </div>
          )}
        </GlassCard>

        {/* Card 2: Banking & Settlement Details */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={14} className="text-emerald-500" />
              Banking & Settlement Details
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono">{supplier.currency || 'LKR'}</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-theme-subtle/50">
              <span className="text-muted font-medium">Bank Name</span>
              <span className="font-semibold text-primary">{supplier.bankName || '—'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-theme-subtle/50">
              <span className="text-muted font-medium">Branch</span>
              <span className="font-semibold text-secondary">{supplier.bankBranch || '—'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-theme-subtle/50">
              <span className="text-muted font-medium">Account Number</span>
              <span className="font-mono font-bold text-primary tracking-wider">{supplier.bankAccountNo || '—'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-theme-subtle/50">
              <span className="text-muted font-medium">Beneficiary / Payee</span>
              <span className="font-medium text-secondary">{supplier.bankAccountName || supplier.name || '—'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-theme-subtle/50">
              <span className="text-muted font-medium">Payment Terms</span>
              <span className="font-medium text-primary">{supplier.paymentTerms || 'Net 30 Days'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted font-medium">Advance Requirement</span>
              {supplier.requiresAdvance ? (
                <span className="text-amber-500 font-bold flex items-center gap-1">Required</span>
              ) : (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">Not Required</span>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Card 3: Business Information & Notes */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Building size={14} className="text-amber-500" />
              Company Details & Notes
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {supplier.address && (
              <div className="flex items-start gap-2 text-secondary">
                <MapPin size={13} className="text-muted shrink-0 mt-0.5" />
                <span className="leading-relaxed">{supplier.address}</span>
              </div>
            )}

            {supplier.website && (
              <div className="flex items-center gap-2 text-secondary">
                <Globe size={13} className="text-muted shrink-0" />
                <a 
                  href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  {supplier.website} <ExternalLink size={10} />
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-subtle/50">
              <div className="p-2 bg-surface2/40 rounded">
                <div className="text-[10px] text-muted font-medium uppercase">VAT Reg. No</div>
                <div className="font-mono text-xs font-semibold text-primary">{supplier.vat || 'Non-VAT'}</div>
              </div>
              <div className="p-2 bg-surface2/40 rounded">
                <div className="text-[10px] text-muted font-medium uppercase">SVAT / TIN</div>
                <div className="font-mono text-xs font-semibold text-primary">{supplier.svat || '—'}</div>
              </div>
              <div className="p-2 bg-surface2/40 rounded col-span-2">
                <div className="text-[10px] text-muted font-medium uppercase">Business Registration (BR)</div>
                <div className="font-mono text-xs font-semibold text-primary">{supplier.brNumber || '—'}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-theme-subtle/50">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText size={11} /> Notes & Capabilities
              </div>
              <div className="text-xs text-secondary leading-relaxed bg-surface2/30 p-2.5 rounded italic">
                {supplier.notes || 'No special remarks recorded for this supplier.'}
              </div>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* Supplier Transaction Ledger & Statement Section */}
      <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
        
        {/* Ledger Header & Search/Filter Toolbar */}
        <div className="p-4 border-b border-theme-subtle space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-orange-500" />
                Supplier Statement of Account & Ledger
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Complete audit trail of invoices, payments, advances, and running balance
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon={Download} onClick={handleExportCSV}>
                Export CSV
              </Button>
              <Button variant="ghost" size="sm" icon={Printer} onClick={() => setShowPrintModal(true)}>
                Print Statement
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                icon={CreditCard} 
                onClick={handleOpenPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Record Payment
              </Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddEntry(true)}>
                Add Entry
              </Button>
            </div>
          </div>

          {/* Interactive Filters */}
          <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-theme-subtle/50">
            {/* Search */}
            <div className="relative w-64">
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input 
                type="text" 
                value={ledgerSearch} 
                onChange={e => setLedgerSearch(e.target.value)} 
                placeholder="Search reference, invoice #, notes..." 
                className="w-full pl-8 pr-3 py-1.5 text-xs input-base" 
              />
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1 bg-surface2/50 p-1 rounded-lg border border-theme-subtle">
              <button 
                onClick={() => setTypeFilter('all')} 
                className={`px-2 py-1 text-xs rounded transition-colors ${typeFilter === 'all' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-primary'}`}
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter('purchase')} 
                className={`px-2 py-1 text-xs rounded transition-colors ${typeFilter === 'purchase' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-primary'}`}
              >
                📦 Invoices
              </button>
              <button 
                onClick={() => setTypeFilter('payment')} 
                className={`px-2 py-1 text-xs rounded transition-colors ${typeFilter === 'payment' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-primary'}`}
              >
                💳 Payments
              </button>
              <button 
                onClick={() => setTypeFilter('return')} 
                className={`px-2 py-1 text-xs rounded transition-colors ${typeFilter === 'return' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-primary'}`}
              >
                ↩️ Returns
              </button>
              <button 
                onClick={() => setTypeFilter('advance')} 
                className={`px-2 py-1 text-xs rounded transition-colors ${typeFilter === 'advance' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-primary'}`}
              >
                ⬆️ Advances
              </button>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="input-base text-xs py-1 px-2" 
                title="Start Date"
              />
              <span className="text-muted text-xs">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="input-base text-xs py-1 px-2" 
                title="End Date"
              />
            </div>

            {(ledgerSearch || typeFilter !== 'all' || startDate || endDate) && (
              <button 
                onClick={() => { setLedgerSearch(''); setTypeFilter('all'); setStartDate(''); setEndDate(''); }} 
                className="text-xs text-muted hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-surface2"
              >
                <X size={12} /> Clear Filters
              </button>
            )}

            <span className="text-xs text-muted ml-auto">
              Showing {filteredLedger.length} of {ledger.length} entries
            </span>
          </div>
        </div>

        {/* Statement Table */}
        {loadingLedger ? (
          <div className="p-12 text-center text-muted text-sm">Loading ledger statements...</div>
        ) : filteredLedger.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={36} className="mx-auto text-muted mb-3 opacity-30" />
            <p className="text-sm text-muted font-medium">No ledger transactions found.</p>
            <p className="text-xs text-muted mt-1">
              Use "Record Payment" or "Add Entry" to record supplier invoices and settlements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-theme-subtle bg-surface2/40">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted">Reference / Invoice #</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted">Description / Particulars</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted">Method</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted">Debit (Purchase)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted">Credit (Payment)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted">Running Balance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row: any) => {
                  const txMeta = TRANSACTION_TYPES.find(t => t.value === row.type)
                  const running = Number(row.runningBalance || 0)
                  return (
                    <tr key={row.id} className="border-b border-theme-subtle hover:bg-surface2/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-secondary font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-muted" />
                          {String(row.date).slice(0, 10)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${txMeta?.badgeColor || 'bg-surface2 text-muted border-theme-subtle'}`}>
                          <span>{txMeta?.icon}</span>{txMeta?.label || row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-primary">
                        {row.referenceNo || row.reference || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary max-w-xs truncate">
                        {row.description || row.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {row.paymentMethod || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {Number(row.debit) > 0 ? (
                          <span className="text-red-500 font-semibold">{formatCurrency(row.debit, true)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {Number(row.credit) > 0 ? (
                          <span className="text-emerald-500 font-semibold">{formatCurrency(row.credit, true)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap">
                        <span className={`font-bold ${running > 0 ? 'text-red-500' : running < 0 ? 'text-emerald-500' : 'text-muted'}`}>
                          {formatCurrency(Math.abs(running), true)}
                        </span>
                        <span className={`text-[9px] font-semibold ml-1.5 px-1 py-0.2 rounded ${
                          running > 0 ? 'bg-red-500/10 text-red-500' : running < 0 ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted'
                        }`}>
                          {running > 0 ? 'DR' : running < 0 ? 'CR' : 'NIL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(row.id)}
                          className="p-1 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Table Footer - Financial Totals */}
              <tfoot>
                <tr className="border-t-2 border-theme-subtle bg-surface2/60 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-xs text-muted uppercase tracking-wider">
                    Total Statement Summary {openingBalance !== 0 && `(Includes Opening: ${formatCurrency(openingBalance, true)})`}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-red-500">
                    {formatCurrency(totalDebit, true)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-emerald-500">
                    {formatCurrency(totalCredit, true)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-black whitespace-nowrap">
                    <span className={outstandingBalance > 0 ? 'text-red-500' : outstandingBalance < 0 ? 'text-emerald-500' : 'text-secondary'}>
                      {formatCurrency(Math.abs(outstandingBalance), true)}
                    </span>
                    <span className="text-[9px] font-normal ml-1.5">
                      {outstandingBalance > 0 ? 'DR (Payable)' : outstandingBalance < 0 ? 'CR (Advance)' : ''}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Record Payment Modal */}
      <Modal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        title={`Record Payment to ${supplier?.name || 'Supplier'}`}
        size="md"
      >
        <form onSubmit={handleSavePayment} className="space-y-4 p-2">
          <div className="bg-surface2/60 p-3 rounded-lg border border-theme-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Current Outstanding</span>
              <span className={`text-lg font-mono font-bold ${outstandingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {formatCurrency(Math.abs(outstandingBalance), true)} {outstandingBalance > 0 ? '(Payable)' : '(Credit)'}
              </span>
            </div>
            {supplier.bankAccountNo && (
              <div className="text-right text-xs">
                <span className="text-[10px] text-muted block">Bank Account</span>
                <span className="font-mono font-semibold text-primary">{supplier.bankAccountNo}</span>
                <span className="text-[10px] text-muted block">{supplier.bankName}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Payment Date *</label>
              <input 
                required 
                type="date" 
                value={paymentForm.date} 
                onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} 
                className="w-full input-base text-xs" 
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Amount Paid (LKR) *</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                min="0.01" 
                value={paymentForm.amount} 
                onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} 
                className="w-full input-base text-xs font-mono font-bold text-emerald-500 text-lg" 
                placeholder="0.00" 
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Payment Method</label>
              <select 
                value={paymentForm.paymentMethod} 
                onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} 
                className="w-full input-base text-xs"
              >
                <option value="Bank Transfer">Bank Transfer (SLIPS / CEFT)</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Online / Card">Online / Card</option>
                <option value="Direct Debit">Direct Debit</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Reference / Cheque #</label>
              <input 
                type="text" 
                value={paymentForm.referenceNo} 
                onChange={e => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })} 
                className="w-full input-base text-xs font-mono" 
                placeholder="e.g. CHQ 100234 / TRF 8901" 
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Paid From / Bank Details</label>
              <input 
                type="text" 
                value={paymentForm.bankAccount} 
                onChange={e => setPaymentForm({ ...paymentForm, bankAccount: e.target.value })} 
                className="w-full input-base text-xs" 
                placeholder="Our bank account / source" 
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Description / Remarks</label>
              <input 
                type="text" 
                value={paymentForm.description} 
                onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} 
                className="w-full input-base text-xs" 
                placeholder="e.g. Settlement for INV-2024-001" 
              />
            </div>
          </div>

          <div className="pt-3 border-t border-theme-subtle flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submittingLedger} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submittingLedger ? 'Saving Payment...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add New Transaction Entry Modal */}
      <Modal
        isOpen={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        title="New Transaction Entry (Invoice, Payment, Adjustment)"
        size="md"
      >
        <form onSubmit={handleAddEntry} className="space-y-4 p-2">
          {/* Transaction type pills */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">Transaction Type</label>
            <div className="flex flex-wrap gap-2">
              {TRANSACTION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEntryForm({ ...entryForm, type: t.value })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    entryForm.type === t.value 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-surface border-theme-subtle text-secondary hover:border-primary'
                  }`}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Date *</label>
              <input
                required
                type="date"
                className="w-full input-base text-xs"
                value={entryForm.date}
                onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Reference / Invoice #</label>
              <input
                type="text"
                className="w-full input-base font-mono text-xs"
                value={entryForm.referenceNo}
                onChange={e => setEntryForm({ ...entryForm, referenceNo: e.target.value })}
                placeholder="e.g. INV-2024-001"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Amount (LKR) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                className="w-full input-base font-mono text-base font-bold"
                value={entryForm.amount}
                onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Method / Terms</label>
              <select
                value={entryForm.paymentMethod}
                onChange={e => setEntryForm({ ...entryForm, paymentMethod: e.target.value })}
                className="w-full input-base text-xs"
              >
                <option value="Invoice">Invoice / Bill</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Credit Note">Credit Note</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">Description / Notes</label>
              <input
                type="text"
                className="w-full input-base text-xs"
                value={entryForm.description}
                onChange={e => setEntryForm({ ...entryForm, description: e.target.value })}
                placeholder="e.g. Steel coil consignment invoice, QC return credit..."
              />
            </div>
          </div>

          <div className="pt-3 border-t border-theme-subtle flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowAddEntry(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submittingLedger}>
              {submittingLedger ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Statement Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Supplier Statement of Account"
        size="xl"
      >
        <div className="p-4 space-y-4">
          <div className="flex justify-end gap-2 pb-3 border-b border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setShowPrintModal(false)}>Close</Button>
            <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>Print / Save as PDF</Button>
          </div>

          {/* Printable Statement Document */}
          <div id="supplier-statement-print" className="bg-white text-slate-900 p-8 rounded-lg shadow-sm border border-slate-200 space-y-6 font-sans">
            
            {/* Letterhead */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">REX INDUSTRIES (PVT) LTD</h1>
                <p className="text-xs text-slate-600 mt-0.5">Precision Engineering & Industrial Manufacturing</p>
                <p className="text-xs text-slate-600">No. 123 Industrial Zone, Colombo, Sri Lanka</p>
                <p className="text-xs text-slate-600">Tel: +94 11 234 5678 | Email: finance@rexindustries.lk</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Statement of Account</span>
                <span className="text-lg font-mono font-bold text-slate-900 block mt-1">SUPPLIER LEDGER</span>
                <span className="text-xs text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            {/* Supplier Meta & Financial Box */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier Entity</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{supplier.name}</h3>
                {supplier.address && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{supplier.address}</p>}
                <div className="mt-2 space-y-0.5 text-xs text-slate-700">
                  {supplier.vat && <p><span className="font-semibold">VAT No:</span> {supplier.vat}</p>}
                  {supplier.svat && <p><span className="font-semibold">SVAT No:</span> {supplier.svat}</p>}
                  {supplier.brNumber && <p><span className="font-semibold">BR No:</span> {supplier.brNumber}</p>}
                  {supplier.phone && <p><span className="font-semibold">Phone:</span> {supplier.phone}</p>}
                </div>
              </div>

              <div className="space-y-2 text-right">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Closing Outstanding Balance</span>
                  <span className={`text-2xl font-black font-mono block ${outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(Math.abs(outstandingBalance), true)} {outstandingBalance > 0 ? 'DR' : 'CR'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {outstandingBalance > 0 ? '(Payable by Rex Industries)' : '(Advance / Credit Balance)'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                  <p><span className="text-slate-500">Total Invoiced:</span> <strong className="font-mono">{formatCurrency(totalDebit, true)}</strong></p>
                  <p><span className="text-slate-500">Total Paid:</span> <strong className="font-mono">{formatCurrency(totalCredit, true)}</strong></p>
                  {openingBalance !== 0 && (
                    <p><span className="text-slate-500">Opening Balance:</span> <strong className="font-mono">{formatCurrency(openingBalance, true)}</strong></p>
                  )}
                </div>
              </div>
            </div>

            {/* Statement Table */}
            <div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100">
                    <th className="py-2.5 px-3 text-left font-bold text-slate-700">Date</th>
                    <th className="py-2.5 px-3 text-left font-bold text-slate-700">Type</th>
                    <th className="py-2.5 px-3 text-left font-bold text-slate-700">Reference #</th>
                    <th className="py-2.5 px-3 text-left font-bold text-slate-700">Description</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-700">Debit (Invoice)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-700">Credit (Payment)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-700">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {openingBalance !== 0 && (
                    <tr className="border-b border-slate-200 italic bg-slate-50">
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">Opening Balance</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">Initial account balance</td>
                      <td className="py-2 px-3 text-right font-mono">{openingBalance > 0 ? formatCurrency(openingBalance, true) : '—'}</td>
                      <td className="py-2 px-3 text-right font-mono">{openingBalance < 0 ? formatCurrency(Math.abs(openingBalance), true) : '—'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(Math.abs(openingBalance), true)} {openingBalance > 0 ? 'DR' : 'CR'}</td>
                    </tr>
                  )}
                  {processedLedger.map((row: any) => {
                    const running = Number(row.runningBalance || 0)
                    return (
                      <tr key={row.id} className="border-b border-slate-200">
                        <td className="py-2 px-3 font-mono">{String(row.date).slice(0, 10)}</td>
                        <td className="py-2 px-3 uppercase text-[10px] font-semibold">{row.type}</td>
                        <td className="py-2 px-3 font-mono font-bold">{row.referenceNo || '—'}</td>
                        <td className="py-2 px-3 max-w-xs truncate">{row.description || '—'}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-red-600">
                          {Number(row.debit) > 0 ? formatCurrency(row.debit, true) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                          {Number(row.credit) > 0 ? formatCurrency(row.credit, true) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {formatCurrency(Math.abs(running), true)} {running > 0 ? 'DR' : running < 0 ? 'CR' : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                    <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider text-slate-800">Totals</td>
                    <td className="py-2.5 px-3 text-right font-mono text-red-600">{formatCurrency(totalDebit, true)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(totalCredit, true)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {formatCurrency(Math.abs(outstandingBalance), true)} {outstandingBalance > 0 ? 'DR' : 'CR'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer Sign-off */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-600">
              <div>
                <p>Prepared by: Accounts Department</p>
                <div className="mt-8 border-b border-slate-400 w-48" />
                <p className="text-[10px] text-slate-500 mt-1">Authorized Signature</p>
              </div>
              <div className="text-right">
                <p>Supplier Acknowledgment</p>
                <div className="mt-8 border-b border-slate-400 w-48 ml-auto" />
                <p className="text-[10px] text-slate-500 mt-1">Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Supplier Account"
        size="lg"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-6 p-2 max-h-[82vh] overflow-y-auto pr-2 custom-scrollbar">
          
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
                  onChange={e => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })} 
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
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. ABC Steel Mills (Pvt) Ltd" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Category</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, brNumber: e.target.value })} 
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
                  onChange={e => setFormData({ ...formData, vat: e.target.value })} 
                  className="w-full input-base text-xs font-mono border-rex-200 dark:border-rex-900/50" 
                  placeholder="e.g. 102345678-7000" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT / TIN Number</label>
                <input 
                  value={formData.svat} 
                  onChange={e => setFormData({ ...formData, svat: e.target.value })} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="e.g. SVAT 001234" 
                />
              </div>

              <div className="space-y-1 col-span-6">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Address / Factory Location</label>
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })} 
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
                  onChange={e => setFormData({ ...formData, website: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="https://abcsteels.lk" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Currency</label>
                <select 
                  className="w-full input-base text-xs" 
                  value={formData.currency} 
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, contactName: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Mr. Samantha Perera" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Designation / Role</label>
                <input 
                  value={formData.designation} 
                  onChange={e => setFormData({ ...formData, designation: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Senior Sales Manager / Director" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Primary Phone / Mobile</label>
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. 077 123 4567" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Secondary Phone / Office</label>
                <input 
                  value={formData.phone2} 
                  onChange={e => setFormData({ ...formData, phone2: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. 011 234 5678" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="samantha@abcsteel.lk" 
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Contact Persons */}
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
                          setFormData({ ...formData, contacts: newContacts })
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
                          setFormData({ ...formData, contacts: newContacts })
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
                          setFormData({ ...formData, contacts: newContacts })
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
                          setFormData({ ...formData, contacts: newContacts })
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
                      setFormData({ ...formData, contacts: newContacts })
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
                  No additional contacts added yet.
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
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, creditDays: Number(e.target.value) })} 
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
                  onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })} 
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
                  onChange={e => setFormData({ ...formData, openingBalance: Number(e.target.value) })} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="0.00" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Bank Name</label>
                <input 
                  value={formData.bankName} 
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Commercial Bank of Ceylon" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Branch</label>
                <input 
                  value={formData.bankBranch} 
                  onChange={e => setFormData({ ...formData, bankBranch: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="e.g. Colombo Main / Wattala" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Number</label>
                <input 
                  value={formData.bankAccountNo} 
                  onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })} 
                  className="w-full input-base text-xs font-mono" 
                  placeholder="e.g. 10002345678" 
                />
              </div>

              <div className="space-y-1 col-span-6 sm:col-span-4">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Account Name / Payee</label>
                <input 
                  value={formData.bankAccountName} 
                  onChange={e => setFormData({ ...formData, bankAccountName: e.target.value })} 
                  className="w-full input-base text-xs" 
                  placeholder="Name as registered with bank" 
                />
              </div>

              <div className="col-span-6 flex items-center mt-2">
                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded bg-surface2/50 border border-theme-subtle w-full">
                  <input 
                    type="checkbox" 
                    checked={formData.requiresAdvance} 
                    onChange={e => setFormData({ ...formData, requiresAdvance: e.target.checked })} 
                    className="w-4 h-4 rounded text-rex-600 focus:ring-rex-500" 
                  />
                  <div>
                    <span className="text-xs font-bold text-primary block">Requires Advance Payment</span>
                    <span className="text-[10px] text-muted block">Supplier requires payment before dispatching orders</span>
                  </div>
                </label>
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
              onChange={e => setFormData({ ...formData, notes: e.target.value })} 
              rows={2} 
              className="w-full input-base text-xs resize-none" 
              placeholder="e.g. Special discounts, minimum order quantity (MOQ), materials supplied, lead times..." 
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-theme-subtle flex justify-end gap-3 sticky bottom-0 bg-surface/90 backdrop-blur py-2">
            <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={savingSupplier}>
              {savingSupplier ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this ledger entry? This will adjust the running balance and outstanding totals accordingly.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
