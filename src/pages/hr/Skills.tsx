import React, { useState, useEffect } from 'react'
import { Download, Plus, Filter, Award, Edit, Trash2, Tag } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'

export const Skills: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '', category: 'Machining', description: ''
  })

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/hr/skills`).then(r => r.json())
      setSkills(Array.isArray(res) ? res : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSkills() }, [])

  const handleOpenForm = (skill?: any) => {
    if (skill) {
      setEditId(skill.id)
      setFormData({
        name: skill.name,
        category: skill.category,
        description: skill.description || ''
      })
    } else {
      setEditId(null)
      setFormData({ name: '', category: 'Machining', description: '' })
    }
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      id: editId || 'SK-' + Date.now().toString().slice(-4),
      ...formData
    }

    try {
      await fetch(`${API}/hr/skills${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      setShowModal(false)
      fetchSkills()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill? It will be removed from all assigned employees.')) return
    await fetch(`${API}/hr/skills/${id}`, { method: 'DELETE' })
    fetchSkills()
  }

  let filteredData = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  )
  if (filterCategory !== 'All') {
    filteredData = filteredData.filter(s => s.category === filterCategory)
  }

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Skill Name', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-blue-600 border border-blue-500/40 flex items-center justify-center">
            <Award size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5 font-mono">{row.id}</p>
          </div>
        </div>
      )
    },
    { key: 'category', header: 'Category', render: (v: any) => <span className="text-xs font-semibold text-secondary">{String(v)}</span> },
    { key: 'description', header: 'Description', render: (v: any) => <span className="text-xs text-muted truncate max-w-[200px] block">{v || '-'}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_: any, row: any) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => handleOpenForm(row)} className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"><Edit size={14}/></button>
          <button onClick={() => handleDelete(row.id)} className="p-1.5 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ]

  const uniqueCategories = ['All', ...new Set(skills.map(s => s.category))]

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Skills Master List</h1>
          <p className="text-xs text-muted mt-0.5">{skills.length} total standardized skills defined</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenForm()}>Add Skill</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search skills..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Category:</span>
        {uniqueCategories.map((c: any) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`px-2.5 py-1 text-xs border transition-colors ${filterCategory === c ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}
          >
            {c}
          </button>
        ))}
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        {loading
          ? <div className="p-10 text-center animate-pulse text-xs text-muted font-medium">Loading skills...</div>
          : <DataTable columns={columns} data={filteredData} keyExtractor={row => row.id} emptyMessage="No skills defined yet." />
        }
      </GlassCard>

      {/* CREATE / EDIT SKILL MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Skill" : "Add New Skill"} size="md">
        <form onSubmit={handleSave} className="space-y-6 p-2">
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Tag size={14} className="text-rex-500" /> Skill Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Skill Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. CNC Programming" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Category *</label>
                <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full input-base">
                  <option value="Machining">Machining</option>
                  <option value="Fabrication">Fabrication</option>
                  <option value="Assembly">Assembly</option>
                  <option value="Safety">Safety & Compliance</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Quality">Quality Control</option>
                  <option value="General">General / Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full input-base h-24 resize-none" placeholder="Brief description of what this skill entails..." />
              </div>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Skill'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
