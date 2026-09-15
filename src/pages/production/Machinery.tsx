import React, { useState, useEffect } from 'react'
import { Download, Plus, Filter, Factory, Wrench, Building2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'

export const Machinery: React.FC = () => {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newMachinery, setNewMachinery] = useState({
    name: '', type: 'Lathe', model: '', status: 'Active', hourlyCost: ''
  })
  const [serviceModalItem, setServiceModalItem] = useState<any>(null)
  const [serviceData, setServiceData] = useState({ status: 'Active', lastMaintenance: new Date().toISOString().slice(0, 10) })

  const fetchMachineries = () => {
    setLoading(true)
    fetch('http://localhost:3000/api/production/machineries')
      .then(res => res.json())
      .then(res => { setData(Array.isArray(res) ? res : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchMachineries() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMachinery.name || !newMachinery.model) return
    setSubmitting(true)
    await fetch('http://localhost:3000/api/production/machineries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'MAC-' + Date.now().toString().slice(-4),
        ...newMachinery,
        hourlyCost: Number(newMachinery.hourlyCost || 0)
      })
    })
    setSubmitting(false)
    setShowModal(false)
    setNewMachinery({ name: '', type: 'Lathe', model: '', status: 'Active', hourlyCost: '' })
    fetchMachineries()
  }

  let filteredData = data.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.model.toLowerCase().includes(search.toLowerCase())
  )
  if (filterStatus !== 'All') {
    filteredData = filteredData.filter(r => r.status === filterStatus)
  }

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Machinery / Work Center', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
            <Factory size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5 font-mono">{row.id}</p>
          </div>
        </div>
      )
    },
    { key: 'type', header: 'Type', render: (v: any) => <span className="text-xs text-secondary font-semibold uppercase">{String(v)}</span> },
    { key: 'model', header: 'Model / Serial', render: (v: any) => <span className="text-xs text-secondary">{String(v)}</span> },
    {
      key: 'status', header: 'Status',
      render: (v: any) => <Badge value={String(v).toUpperCase()} variant={v === 'Active' ? 'success' : v === 'Maintenance' ? 'warning' : 'error'} />
    },
    {
      key: 'hourlyCost', header: 'Hourly Rate', align: 'right', sortable: true,
      render: (v: any) => <span className="text-xs font-bold text-rex-600 dark:text-rex-300 font-mono">{formatCurrency(Number(v))}</span>
    },
    {
      key: 'lastMaintenance', header: 'Last Maintained', align: 'right',
      render: (v: any) => <span className="text-xs text-muted">{v ? new Date(v as string).toLocaleDateString() : '-'}</span>
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (_: any, row: any) => (
        <Button variant="ghost" size="sm" className="text-rex-600 hover:bg-rex-500/10" onClick={() => {
          setServiceModalItem(row);
          setServiceData({ 
            status: row.status || 'Active', 
            lastMaintenance: new Date().toISOString().slice(0, 10) 
          });
        }}>
          <Wrench size={13} className="mr-1.5" /> Service
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Machineries</h1>
          <p className="text-xs text-muted mt-0.5">{data.length} total work centers registered</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowModal(true)}>Add Machinery</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by name, type, or model..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Status:</span>
        {['All', 'Active', 'Maintenance', 'Broken'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1 text-xs border transition-colors ${filterStatus === s ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}
          >
            {s}
          </button>
        ))}
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        {loading
          ? <div className="p-10 text-center animate-pulse text-xs text-muted font-medium">Loading equipment...</div>
          : <DataTable columns={columns} data={filteredData} keyExtractor={row => row.id} emptyMessage="No machinery registered yet." />
        }
      </GlassCard>

      {/* ADD MACHINERY MODAL — uses the same Modal component as Customers */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register New Machinery" size="lg">
        <form onSubmit={handleSave} className="space-y-6">

          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Factory size={14} className="text-rex-500" /> Machine Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Machine Name <span className="text-rex-500">*</span></label>
                <input required value={newMachinery.name} onChange={e => setNewMachinery({...newMachinery, name: e.target.value})} className="w-full input-base" placeholder="e.g. Heavy Duty Lathe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Machine Type <span className="text-rex-500">*</span></label>
                <select required value={newMachinery.type} onChange={e => setNewMachinery({...newMachinery, type: e.target.value})} className="w-full input-base">
                  <option value="Lathe">Lathe</option>
                  <option value="Milling">Milling</option>
                  <option value="Press">Hydraulic Press</option>
                  <option value="CNC">CNC Router</option>
                  <option value="Grinding">Grinding</option>
                  <option value="Welding">Welding</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Model / Serial No. <span className="text-rex-500">*</span></label>
                <input required value={newMachinery.model} onChange={e => setNewMachinery({...newMachinery, model: e.target.value})} className="w-full input-base" placeholder="e.g. Mazak QTE-100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Hourly Rate (Rs.)</label>
                <input type="number" value={newMachinery.hourlyCost} onChange={e => setNewMachinery({...newMachinery, hourlyCost: e.target.value})} className="w-full input-base font-mono" placeholder="1500.00" min="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Initial Status</label>
                <select value={newMachinery.status} onChange={e => setNewMachinery({...newMachinery, status: e.target.value})} className="w-full input-base">
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Broken">Broken</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Register Equipment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* SERVICE MACHINERY MODAL */}
      <Modal isOpen={!!serviceModalItem} onClose={() => setServiceModalItem(null)} title="Record Maintenance Service" size="md">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          await fetch(`http://localhost:3000/api/production/machineries/${serviceModalItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceData)
          });
          setSubmitting(false);
          setServiceModalItem(null);
          fetchMachineries();
        }} className="space-y-4 p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Service Date</label>
              <input type="date" required className="w-full input-base" value={serviceData.lastMaintenance} onChange={e => setServiceData({...serviceData, lastMaintenance: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Machine Status After Service</label>
              <select className="w-full input-base" value={serviceData.status} onChange={e => setServiceData({...serviceData, status: e.target.value})}>
                <option value="Active">Active (Ready for Production)</option>
                <option value="Maintenance">Under Maintenance</option>
                <option value="Broken">Broken / Out of Order</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-theme-subtle flex justify-end gap-3 mt-6">
            <Button variant="ghost" type="button" onClick={() => setServiceModalItem(null)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Service Record'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
