import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createCustomer } from '@/lib/api'
import { toMySQLDate } from '@/lib/utils'
import { useCustomers } from '@/hooks/useData'
import { Building2, Briefcase, User, Users, Plus, Trash2, MapPin, Search, Tags, CheckCircle2, CreditCard } from 'lucide-react'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (customer: any) => void
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false)
  const { data: customers } = useCustomers()
  const [formData, setFormData] = useState({
    prefix: '', name: '', company: '', email: '', phone: '', phone2: '', industry: '', segment: 'sme', address: '', vat: '', svat: '', brNumber: '', rating: 0, isCreditCustomer: null as boolean | null, creditLimit: 0, creditDays: 30, defaultPaymentMode: 'Cash', paymentTerms: '', deliveryTerms: '', financeContactName: '', financeContactEmail: '', financeContactPhone: '', bankName: '', bankBranch: '', bankAccountNo: '', requiresAdvance: false, accountManager: 'System Admin', currency: 'LKR', isForeign: false, contacts: [] as any[]
  })

  const trimmedCompany = (formData.company || '').trim().toUpperCase()
  const duplicateCompany = Boolean(
    trimmedCompany && (customers || []).some((c: any) => 
      c.company && c.company.trim().toUpperCase() === trimmedCompany
    )
  )

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmedCompany) {
      alert('Company Name is required.')
      return
    }

    if (!formData.address?.trim()) {
      alert('Customer Address is required.')
      return
    }

    if (!formData.name?.trim()) {
      alert('Primary Contact Person Name is required.')
      return
    }

    if (!formData.phone?.trim()) {
      alert('Primary Contact Phone Number is required.')
      return
    }

    if (formData.isCreditCustomer === null || formData.isCreditCustomer === undefined) {
      alert('Please specify whether this customer is a Credit Customer or Cash Customer.')
      return
    }

    if (duplicateCompany) {
      alert(`Customer company "${trimmedCompany}" already exists! Duplicate company names are not allowed.`)
      return
    }

    setSubmitting(true)
    const cleanedContacts = (formData.contacts || []).filter((c: any) => 
      c.name?.trim() || c.designation?.trim() || c.phone?.trim() || c.email?.trim()
    )

    const isCredit = Boolean(formData.isCreditCustomer)
    const finalCreditDays = isCredit ? (Number(formData.creditDays) || 30) : 0
    const finalCreditLimit = isCredit ? (Number(formData.creditLimit) || 0) : 0
    const finalPaymentTerms = formData.paymentTerms?.trim() || (isCredit ? `${finalCreditDays} Days Credit` : 'Cash')
    const finalPaymentMode = formData.defaultPaymentMode || (isCredit ? 'Credit' : 'Cash')

    const newCustomer = {
      id: 'CUST-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      ...formData,
      company: trimmedCompany,
      isCreditCustomer: isCredit ? 1 : 0,
      creditDays: finalCreditDays,
      creditLimit: finalCreditLimit,
      paymentTerms: finalPaymentTerms,
      defaultPaymentMode: finalPaymentMode,
      requiresAdvance: isCredit ? 0 : (formData.requiresAdvance ? 1 : 0),
      contacts: cleanedContacts,
      status: 'active',
      lifetimeValue: 0,
      totalRevenue: 0,
      openDeals: 0,
      lastOrder: toMySQLDate(new Date()),
      joinDate: toMySQLDate(new Date()),
      avatar: formData.name.substring(0, 2).toUpperCase()
    }
    
    try {
      await createCustomer(newCustomer)
      if (onSuccess) onSuccess(newCustomer)
      onClose()
      setFormData({ prefix: '', name: '', company: '', email: '', phone: '', phone2: '', industry: '', segment: 'sme', address: '', vat: '', svat: '', brNumber: '', rating: 0, isCreditCustomer: null, creditLimit: 0, creditDays: 30, defaultPaymentMode: 'Cash', paymentTerms: '', deliveryTerms: '', financeContactName: '', financeContactEmail: '', financeContactPhone: '', bankName: '', bankBranch: '', bankAccountNo: '', requiresAdvance: false, accountManager: 'System Admin', currency: 'LKR', isForeign: false, contacts: [] as any[] })
    } catch (err: any) {
      alert('Failed to create customer: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Customer Account" size="lg">
      <form onSubmit={handleCreateCustomer} className="space-y-6">
          {/* Section: Company Details */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Building2 size={14} className="text-rex-500" />
              Company / Entity Details
            </h3>
            <div className="grid grid-cols-6 gap-4">
                <div className="space-y-1.5 col-span-6 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Prefix</label>
                  <input value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} className="w-full input-base" placeholder="ACM" maxLength={5} />
                </div>
                <div className="space-y-1.5 col-span-6 sm:col-span-3">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Company Name <span className="text-rose-500 font-bold">*</span> (BLOCK CAPITALS)
                  </label>
                  <input 
                    required 
                    value={formData.company} 
                    onChange={e => setFormData({...formData, company: e.target.value.toUpperCase()})} 
                    className={`w-full input-base uppercase font-semibold ${duplicateCompany ? 'border-rose-500 bg-rose-500/5' : ''}`} 
                    placeholder="E.G. ACME CORPORATION" 
                  />
                  {duplicateCompany && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1">
                      ⚠️ Company name &quot;{trimmedCompany}&quot; already exists! Duplicate company names are not allowed.
                    </p>
                  )}
                </div>
              <div className="space-y-1.5 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Business Reg. No</label>
                <input value={formData.brNumber} onChange={e => setFormData({...formData, brNumber: e.target.value})} className="w-full input-base" placeholder="PV 000000" />
              </div>
              <div className="space-y-1.5 col-span-6">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                  Customer Address <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea 
                  required 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  rows={2} 
                  className="w-full input-base resize-none" 
                  placeholder="123 Industrial Ave..." 
                />
              </div>
              <div className="space-y-1.5 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="Optional" />
              </div>
              <div className="space-y-1.5 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT Number</label>
                <input value={formData.svat} onChange={e => setFormData({...formData, svat: e.target.value})} className="w-full input-base" placeholder="Optional" />
              </div>
              <div className="col-span-3 mt-1">
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
                    <div className="text-[10px] text-secondary mt-0.5">Customer orders must be paid upfront.</div>
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
                    <div className="text-[10px] text-secondary mt-0.5">Customer is based outside local region.</div>
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.isForeign} onChange={e => setFormData({...formData, isForeign: e.target.checked})} />
                </label>
              </div>
            </div>
          </div>

          {/* Section: Credit Policy & Payment Terms (Mandatory Selection) */}
          <div className="p-4 rounded-xl border border-theme bg-surface/40 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest pb-2 border-b border-theme-subtle flex items-center gap-2">
              <CreditCard size={15} className="text-rex-500" />
              Customer Credit Policy & Payment Terms <span className="text-rose-500 font-bold">*</span>
            </h3>

            <div>
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-2">
                Is this customer a Credit Customer? <span className="text-rose-500 font-bold">*</span> (Must Select)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label 
                  className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.isCreditCustomer === false 
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm' 
                      : 'border-theme-subtle bg-surface/50 hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="creditStatus"
                    className="hidden"
                    checked={formData.isCreditCustomer === false}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      isCreditCustomer: false,
                      creditLimit: 0,
                      creditDays: 0,
                      requiresAdvance: true,
                      defaultPaymentMode: 'Cash',
                      paymentTerms: 'Cash'
                    }))}
                  />
                  <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                    formData.isCreditCustomer === false ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-secondary/40'
                  }`}>
                    {formData.isCreditCustomer === false && <CheckCircle2 size={12} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">Cash / Non-Credit Customer</div>
                    <div className="text-[10px] text-secondary mt-0.5">
                      Immediate cash, bank transfer, or advance payment. No credit period.
                    </div>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.isCreditCustomer === true 
                      ? 'border-rex-500 bg-rex-500/10 shadow-sm' 
                      : 'border-theme-subtle bg-surface/50 hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="creditStatus"
                    className="hidden"
                    checked={formData.isCreditCustomer === true}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      isCreditCustomer: true,
                      creditDays: prev.creditDays > 0 ? prev.creditDays : 30,
                      creditLimit: prev.creditLimit > 0 ? prev.creditLimit : 100000,
                      requiresAdvance: false,
                      defaultPaymentMode: 'Credit',
                      paymentTerms: `${prev.creditDays > 0 ? prev.creditDays : 30} Days Credit`
                    }))}
                  />
                  <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                    formData.isCreditCustomer === true ? 'border-rex-500 bg-rex-500 text-white' : 'border-secondary/40'
                  }`}>
                    {formData.isCreditCustomer === true && <CheckCircle2 size={12} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">Credit Customer</div>
                    <div className="text-[10px] text-secondary mt-0.5">
                      Credit period & limit approved. Auto-links to invoices & orders.
                    </div>
                  </div>
                </label>
              </div>
              {formData.isCreditCustomer === null && (
                <p className="text-[11px] font-bold text-rose-500 mt-2 flex items-center gap-1">
                  ⚠️ Please select whether this is a Cash Customer or Credit Customer (Required).
                </p>
              )}
            </div>

            {/* Credit Customer Fields */}
            {formData.isCreditCustomer === true && (
              <div className="p-3.5 rounded-lg bg-surface2 border border-theme-subtle grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Credit Period (Days) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input 
                    type="number" 
                    min={1} 
                    max={365} 
                    required 
                    value={formData.creditDays || 30} 
                    onChange={e => {
                      const days = Number(e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        creditDays: days,
                        paymentTerms: `${days} Days Credit`
                      }));
                    }} 
                    className="w-full input-base font-semibold" 
                    placeholder="30" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Credit Limit / Amount (LKR) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input 
                    type="number" 
                    min={0} 
                    step="1000" 
                    required 
                    value={formData.creditLimit} 
                    onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })} 
                    className="w-full input-base font-semibold" 
                    placeholder="500000" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Default Mode of Payment <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select 
                    value={formData.defaultPaymentMode} 
                    onChange={e => setFormData({ ...formData, defaultPaymentMode: e.target.value })} 
                    className="w-full input-base font-medium"
                  >
                    <option value="Credit">Credit</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
            )}

            {/* Cash Customer Fields */}
            {formData.isCreditCustomer === false && (
              <div className="p-3.5 rounded-lg bg-surface2 border border-theme-subtle grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Default Mode of Payment <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select 
                    value={formData.defaultPaymentMode} 
                    onChange={e => setFormData({ ...formData, defaultPaymentMode: e.target.value })} 
                    className="w-full input-base font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Default Payment Terms
                  </label>
                  <input 
                    type="text" 
                    value={formData.paymentTerms || 'Cash'} 
                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} 
                    className="w-full input-base" 
                    placeholder="Cash" 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Primary Contact */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <User size={14} className="text-rex-500" />
              Primary Contact Person
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Full Name <span className="text-rose-500 font-bold">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="John Doe" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" placeholder="john@acme.com" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                  Primary Phone <span className="text-rose-500 font-bold">*</span>
                </label>
                <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
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

          
          {/* Section: Additional Contacts */}
          <div className="col-span-full">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-purple-500" />
                Additional Contacts
              </h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setFormData(f => ({
                  ...f, 
                  contacts: [
                    ...(f.contacts || []), 
                    { id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: '', designation: '', phone: '', email: '' }
                  ] 
                }))} 
                icon={Plus}
              >
                Add Contact
              </Button>
            </div>
            
            <div className="space-y-3">
              {(formData.contacts || []).map((c: any, i: number) => (
                <div key={c.id || i} className="flex items-start gap-2 bg-surface2 p-3 rounded-lg border border-theme-subtle/50 relative">
                  <div className="grid grid-cols-4 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Name</label>
                      <input 
                        value={c.name || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            contacts: (prev.contacts || []).map((item, idx) => idx === i ? { ...item, name: val } : item)
                          }));
                        }} 
                        className="w-full text-xs input-base py-1.5 px-2" 
                        placeholder="John Doe" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Designation</label>
                      <input 
                        value={c.designation || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            contacts: (prev.contacts || []).map((item, idx) => idx === i ? { ...item, designation: val } : item)
                          }));
                        }} 
                        className="w-full text-xs input-base py-1.5 px-2" 
                        placeholder="Manager / Director" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Phone</label>
                      <input 
                        value={c.phone || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            contacts: (prev.contacts || []).map((item, idx) => idx === i ? { ...item, phone: val } : item)
                          }));
                        }} 
                        className="w-full text-xs input-base py-1.5 px-2" 
                        placeholder="+94 7X XXX XXXX" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Email</label>
                      <input 
                        value={c.email || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            contacts: (prev.contacts || []).map((item, idx) => idx === i ? { ...item, email: val } : item)
                          }));
                        }} 
                        className="w-full text-xs input-base py-1.5 px-2" 
                        placeholder="john@example.com" 
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        contacts: (prev.contacts || []).filter((_, idx) => idx !== i)
                      }));
                    }} 
                    className="text-red-500 hover:bg-red-500/10 p-1.5 rounded mt-5"
                    title="Remove Contact"
                  >
                    <Trash2 size={14} />
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
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Customer Account'}
            </Button>
          </div>
      </form>
    </Modal>
  )
}
