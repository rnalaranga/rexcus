import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Phone, Mail, Edit, Trash2, ArrowLeft, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useSuppliers } from '@/hooks/useData'
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/api'

export const Suppliers: React.FC = () => {
  const navigate = useNavigate()
  const { data: suppliers, loading, refetch } = useSuppliers()
  const [search, setSearch] = useState('')
  
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const initialForm = { name: '', contactName: '', phone: '', email: '', category: 'Raw Materials', address: '', status: 'active' }
  const [formData, setFormData] = useState(initialForm)

  const filteredData = suppliers.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.contactName && item.contactName.toLowerCase().includes(search.toLowerCase()))
  )

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditId(item.id)
      setFormData({
        name: item.name,
        contactName: item.contactName || '',
        phone: item.phone || '',
        email: item.email || '',
        category: item.category || 'Raw Materials',
        address: item.address || '',
        status: item.status || 'active'
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
      id: editId || `SUP-${Date.now().toString().slice(-6)}`,
      ...formData
    }

    try {
      if (editId) {
        await updateSupplier(editId, payload)
      } else {
        await createSupplier(payload)
      }
      refetch()
      setShowForm(false)
      showToast('success', 'Supplier saved successfully')
    } catch (err) {
      console.error(err)
      showToast('error', 'Failed to save supplier')
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
    await deleteSupplier(deleteTarget)
    refetch()
    setShowForm(false)
    setDeleteTarget(null)
    setSubmitting(false)
    showToast('success', 'Supplier deleted')
  }

  const columns: Column<any>[] = [
    {
      header: 'Supplier Name',
      key: 'name',
      render: (val: any, item: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-orange-500/10 text-orange-400">
            <Building2 size={16} />
          </div>
          <div>
            <div className="font-semibold text-primary">{val}</div>
            <div className="text-[10px] text-muted">{item.category}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Contact Person',
      key: 'contactName',
      render: (val: any) => <span className="text-secondary">{val || '-'}</span>
    },
    {
      header: 'Contact Info',
      key: 'phone',
      render: (val: any, item: any) => (
        <div className="text-xs text-secondary space-y-1">
          {val && <div className="flex items-center gap-1"><Phone size={10} className="text-muted"/> {val}</div>}
          {item.email && <div className="flex items-center gap-1"><Mail size={10} className="text-muted"/> {item.email}</div>}
          {!val && !item.email && '-'}
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
          <button onClick={(e) => { e.stopPropagation(); handleOpenForm(item) }} className="p-1 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"><Edit size={14}/></button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }} className="p-1 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
          <button onClick={() => navigate(`/inventory/suppliers/${item.id}`)} className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary transition-colors"><ChevronRight size={15}/></button>
        </div>
      )
    }
  ]

  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setShowForm(false)}>Back</Button>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{editId ? "Edit Supplier" : "Add New Supplier"}</h1>
        </div>

        <GlassCard className="max-w-3xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-secondary mb-1">Company / Supplier Name *</label>
                <input required type="text" className="w-full input-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. ABC Steels Ltd" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-secondary mb-1">Category</label>
                <select className="w-full input-base" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Machining / Outsourcing">Machining / Outsourcing</option>
                  <option value="Consumables">Consumables (Tools, Oils)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-secondary mb-1">Contact Person</label>
                <input type="text" className="w-full input-base" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Name of rep" />
              </div>
              
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-secondary mb-1">Phone Number</label>
                <input type="text" className="w-full input-base" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 077 123 4567" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-secondary mb-1">Email Address</label>
                <input type="email" className="w-full input-base" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="sales@abcsteels.lk" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-secondary mb-1">Status</label>
                <select className="w-full input-base" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-secondary mb-1">Address / Notes</label>
                <textarea className="w-full input-base h-24 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address or special notes..." />
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-theme-subtle flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (editId ? 'Save Changes' : 'Add Supplier')}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-secondary mt-1">Manage your raw material and service suppliers.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenForm()}>Add Supplier</Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." className="w-64" />
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filteredData} keyExtractor={(item: any) => item.id} />
      </GlassCard>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this supplier?
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
