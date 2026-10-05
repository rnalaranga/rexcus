import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createCustomer } from '@/lib/api'
import { toMySQLDate } from '@/lib/utils'
import { Building2, Briefcase, User, MapPin, Search, Tags, CheckCircle2 } from 'lucide-react'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (customer: any) => void
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    prefix: '', name: '', company: '', email: '', phone: '', phone2: '', industry: '', segment: 'sme', address: '', vat: '', svat: '', brNumber: '', rating: 0, creditLimit: 0, creditDays: 30, paymentTerms: '', deliveryTerms: '', financeContactName: '', financeContactEmail: '', financeContactPhone: '', bankName: '', bankBranch: '', bankAccountNo: '', requiresAdvance: true, accountManager: 'System Admin', currency: 'LKR', isForeign: false
  })

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
    
    try {
      await createCustomer(newCustomer)
      if (onSuccess) onSuccess(newCustomer)
      onClose()
      setFormData({ prefix: '', name: '', company: '', email: '', phone: '', phone2: '', industry: '', segment: 'sme', address: '', vat: '', svat: '', brNumber: '', rating: 0, creditLimit: 0, creditDays: 30, paymentTerms: '', deliveryTerms: '', financeContactName: '', financeContactEmail: '', financeContactPhone: '', bankName: '', bankBranch: '', bankAccountNo: '', requiresAdvance: true, accountManager: 'System Admin', currency: 'LKR', isForeign: false })
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
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company Name</label>
                <input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full input-base" placeholder="Acme Corp" />
              </div>
              <div className="space-y-1.5 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Business Reg. No</label>
                <input value={formData.brNumber} onChange={e => setFormData({...formData, brNumber: e.target.value})} className="w-full input-base" placeholder="PV 000000" />
              </div>
              <div className="space-y-1.5 col-span-6">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className="w-full input-base resize-none" placeholder="123 Industrial Ave..." />
              </div>
              <div className="space-y-1.5 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="Optional" />
              </div>
              <div className="space-y-1.5 col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT / TIN Number</label>
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
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Customer Account'}
            </Button>
          </div>
      </form>
    </Modal>
  )
}
