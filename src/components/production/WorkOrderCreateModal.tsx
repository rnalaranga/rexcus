import React, { useState, useEffect } from 'react'
import { 
  Factory, Plus, Trash2, ArrowUp, ArrowDown, Package, Layers, 
  ClipboardList, Calendar, Building, DollarSign, AlertTriangle, 
  CheckCircle2, FileText, ArrowRight, Sparkles
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { createWorkOrder, updateQuotationStatus } from '@/lib/api'
import { useInvoices } from '@/hooks/useData'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import { QuotationAutocomplete } from '@/components/ui/QuotationAutocomplete'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'

interface WorkOrderCreateModalProps {
  isOpen: boolean
  onClose: () => void
  customers: any[]
  machineries: any[]
  employees: any[]
  inventory: any[]
  quotations: any[]
  onSuccess: (woId: string) => void
}

export const WorkOrderCreateModal: React.FC<WorkOrderCreateModalProps> = ({
  isOpen,
  onClose,
  customers,
  machineries,
  employees,
  inventory,
  quotations,
  onSuccess
}) => {
  const { data: allInvoices = [] } = useInvoices()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Work Order Header Form
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    customer: '',
    orderNo: '',
    priority: 'Normal',
    plannedStartDate: new Date().toISOString().slice(0, 10),
    deadline: '',
    jobQty: 1,
    overheadPct: 15,
    sourceQuoteId: '',
    notes: '',
    attachments: [] as any[]
  })

  // BOM Rows
  const [bomRows, setBomRows] = useState<Array<{
    material: string
    qty: number
    unit: string
    unitCost: number
    notes: string
  }>>([
    { material: '', qty: 1, unit: 'pcs', unitCost: 0, notes: '' }
  ])

  // Routing Operation Rows
  const [opRows, setOpRows] = useState<Array<{
    operationName: string
    machineId: string
    employeeId: string
    plannedHours: number
    hourlyLaborRate: number
    hourlyMachineRate: number
    notes: string
  }>>([
    { operationName: 'Facing & Center Drilling', machineId: '', employeeId: '', plannedHours: 1, hourlyLaborRate: 750, hourlyMachineRate: 1200, notes: '' }
  ])

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear()
      const rand = Date.now().toString().slice(-4)
      setFormData({
        title: '',
        customerId: '',
        customer: '',
        orderNo: `WO-${year}-${rand}`,
        priority: 'Normal',
        plannedStartDate: new Date().toISOString().slice(0, 10),
        deadline: '',
        jobQty: 1,
        overheadPct: 15,
        sourceQuoteId: '',
        notes: '',
        attachments: []
      })
      setBomRows([{ material: '', qty: 1, unit: 'pcs', unitCost: 0, notes: '' }])
      setOpRows([
        { operationName: 'Facing & Center Drilling', machineId: '', employeeId: '', plannedHours: 1, hourlyLaborRate: 750, hourlyMachineRate: 1200, notes: '' }
      ])
      setError(null)
    }
  }, [isOpen])

  // Import from Approved Quotation
  const handleSelectQuote = (qId: string) => {
    if (!qId) return
    const quote = quotations.find(q => q.id === qId)
    if (!quote) return

    // Safely parse quote.data (where the quotation builder stores boms, items, etc.)
    const data = typeof quote.data === 'string' 
      ? JSON.parse(quote.data || '{}') 
      : (quote.data || {})

    const extractedBoms: Array<{ material: string; qty: number; unit: string; unitCost: number; notes: string }> = []
    const extractedOps: Array<{ operationName: string; machineId: string; employeeId: string; plannedHours: number; hourlyLaborRate: number; hourlyMachineRate: number; notes: string }> = []

    // 1. Multi-part BOMs in data.boms
    if (Array.isArray(data.boms) && data.boms.length > 0) {
      data.boms.forEach((b: any, bIdx: number) => {
        const partPrefix = b.title ? `${b.title}: ` : (data.boms.length > 1 ? `Part ${bIdx + 1}: ` : '')

        // Auto raw materials (rods, shafts, plates)
        ;(b.autoMats || []).forEach((m: any) => {
          if (m.material) {
            const specNotes = [
              m.length && m.width ? `${m.length}x${m.width}` : m.length ? `L:${m.length}` : '',
              m.thick ? `${m.thick}mm` : m.dia ? `Ø${m.dia}mm` : ''
            ].filter(Boolean).join(' ')
            extractedBoms.push({
              material: m.material,
              qty: Number(m.qty || 1),
              unit: m.dia ? 'rods' : 'plates',
              unitCost: Number(m.unitPrice || 0),
              notes: `${partPrefix}${specNotes}`.trim()
            })
          }
        })

        // Manual items & components
        ;(b.manualMats || []).forEach((m: any) => {
          if (m.material) {
            extractedBoms.push({
              material: m.material,
              qty: Number(m.qty || 1),
              unit: 'pcs',
              unitCost: Number(m.unitPrice || 0),
              notes: `${partPrefix}${m.supplier || ''}`.trim()
            })
          }
        })

        // Machining operations
        if (b.procState && typeof b.procState === 'object') {
          Object.keys(b.procState).forEach(procName => {
            const op = b.procState[procName]
            const hrs = Number(op?.estHr) || Number(op?.quoHr) || 0
            if (hrs > 0) {
              extractedOps.push({
                operationName: `${partPrefix}${procName}`,
                machineId: '',
                employeeId: '',
                plannedHours: hrs,
                hourlyLaborRate: Number(op?.hrRate || 750),
                hourlyMachineRate: Number(op?.machineRate || 1200),
                notes: op?.setTime ? `Setup: ${op.setTime}h` : ''
              })
            }
          })
        }
      })
    }

    // 2. Legacy / Root-level autoMats & manualMats
    if (extractedBoms.length === 0) {
      ;(data.autoMats || quote.autoMats || []).forEach((m: any) => {
        if (m.material) {
          extractedBoms.push({
            material: m.material,
            qty: Number(m.qty || 1),
            unit: m.dia ? 'rods' : 'plates',
            unitCost: Number(m.unitPrice || 0),
            notes: `${m.length || ''}x${m.width || ''} ${m.thick || ''}mm`
          })
        }
      })
      ;(data.manualMats || quote.manualMats || []).forEach((m: any) => {
        if (m.material) {
          extractedBoms.push({
            material: m.material,
            qty: Number(m.qty || 1),
            unit: 'pcs',
            unitCost: Number(m.unitPrice || 0),
            notes: m.supplier || ''
          })
        }
      })
    }

    // 3. Fallback for Product Quotations or Itemized Lines
    const quoteItems: any[] = Array.isArray(data.custItems) 
      ? data.custItems 
      : Array.isArray(data.items) 
      ? data.items 
      : (Array.isArray(quote.items) ? quote.items : [])

    if (extractedBoms.length === 0 && quoteItems.length > 0) {
      quoteItems.forEach((item: any) => {
        const matName = item.name || item.desc || item.description
        if (matName) {
          extractedBoms.push({
            material: matName,
            qty: Number(item.qty || 1),
            unit: item.unit || 'pcs',
            unitCost: Number(item.unitPrice || item.cost || 0) * 0.65,
            notes: item.description || 'Product specification line'
          })
        }
      })
    }

    const firstItem = quoteItems[0] || {}
    const quoNoDisplay = quote.docNo || quote.quotationNo || `AD-${quote.id}`
    const title = quote.subject 
      ? `${quoNoDisplay} - ${quote.subject}` 
      : firstItem.name || firstItem.desc
      ? `WO: ${quoNoDisplay} - ${firstItem.name || firstItem.desc}` 
      : `WO: ${quoNoDisplay} - ${quote.leadName || quote.customerName || 'Customer'}`

    setFormData(prev => ({
      ...prev,
      sourceQuoteId: quote.id,
      title,
      customerId: quote.leadId || quote.customerId || '',
      customer: quote.leadName || quote.customerName || '',
      deadline: quote.validUntil || quote.deliveryDate || '',
      jobQty: Number(data.jobQty || firstItem.qty || 1)
    }))

    if (extractedBoms.length > 0) {
      setBomRows(extractedBoms)
    }

    if (extractedOps.length > 0) {
      setOpRows(extractedOps)
    }
  }

  // BOM helpers
  const addBomRow = () => {
    setBomRows([...bomRows, { material: '', qty: 1, unit: 'pcs', unitCost: 0, notes: '' }])
  }
  const removeBomRow = (index: number) => {
    setBomRows(bomRows.filter((_, i) => i !== index))
  }
  const updateBomRow = (index: number, field: string, value: any) => {
    const updated = [...bomRows]
    ;(updated[index] as any)[field] = value
    setBomRows(updated)
  }

  // Op helpers
  const addOpRow = () => {
    setOpRows([
      ...opRows,
      { operationName: '', machineId: '', employeeId: '', plannedHours: 1, hourlyLaborRate: 750, hourlyMachineRate: 1200, notes: '' }
    ])
  }
  const removeOpRow = (index: number) => {
    setOpRows(opRows.filter((_, i) => i !== index))
  }
  const updateOpRow = (index: number, field: string, value: any) => {
    const updated = [...opRows]
    ;(updated[index] as any)[field] = value
    setOpRows(updated)
  }

  // Financial Estimation
  const estBomTotal = bomRows.reduce((acc, r) => acc + (Number(r.qty || 1) * Number(r.unitCost || 0)), 0)
  const estMachLaborTotal = opRows.reduce((acc, r) => {
    const hrs = Number(r.plannedHours || 0)
    return acc + (hrs * Number(r.hourlyLaborRate || 750)) + (hrs * Number(r.hourlyMachineRate || 1200))
  }, 0)
  const estOverhead = (estMachLaborTotal) * (Number(formData.overheadPct || 15) / 100)
  const totalEstCost = estBomTotal + estMachLaborTotal + estOverhead

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      setError('Please provide a descriptive Work Order title.')
      return
    }

    // Check if customer requires advance deposit
    const selectedCust = customers.find((c: any) => 
      c.id === formData.customerId || 
      (c.company && formData.customer && c.company.toLowerCase() === formData.customer.toLowerCase()) || 
      (c.name && formData.customer && c.name.toLowerCase() === formData.customer.toLowerCase())
    )
    const customerRequiresAdvance = Boolean(selectedCust && (selectedCust.requiresAdvance === true || selectedCust.requiresAdvance === 1))

    if (customerRequiresAdvance) {
      const hasAdvancePaid = (allInvoices || []).some((inv: any) => 
        (inv.isProforma || inv.invoiceType === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-')) &&
        (Number(inv.paidAmount || 0) > 0 || inv.status === 'paid' || inv.status === 'partially_paid') &&
        (
          (formData.sourceQuoteId && inv.quotationId && String(inv.quotationId) === String(formData.sourceQuoteId)) ||
          (formData.customerId && inv.customerId && String(inv.customerId) === String(formData.customerId))
        )
      )
      if (!hasAdvancePaid) {
        setError(`Customer "${selectedCust?.company || selectedCust?.name || 'Client'}" requires advance payment. An advance payment record must be entered under Finance (Receivables) before issuing a Work Order, or obtain Finance Approval.`)
        return
      }
    }

    try {
      setSubmitting(true)
      setError(null)

      const payload = {
        title: formData.title,
        orderNo: formData.orderNo,
        customerId: formData.customerId || null,
        customer: formData.customer || null,
        priority: formData.priority,
        plannedStartDate: formData.plannedStartDate,
        deadline: formData.deadline || null,
        jobQty: Number(formData.jobQty || 1),
        overheadPct: Number(formData.overheadPct || 15),
        estimatedCost: totalEstCost,
        sourceQuoteId: formData.sourceQuoteId || null,
        notes: formData.notes,
        attachments: formData.attachments,
        bom: bomRows.filter(b => b.material.trim()),
        operations: opRows.filter(o => o.operationName.trim())
      }

      const res = await createWorkOrder(payload)
      if (res.success) {
        if (formData.sourceQuoteId) {
          try {
            await updateQuotationStatus(formData.sourceQuoteId, 'In Production')
          } catch (e) {}
        }
        onSuccess(res.id)
        onClose()
      } else {
        setError(res.message || res.error || 'Failed to create work order')
      }
    } catch (err: any) {
      setError(err.message || 'Server error creating work order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Manufacturing Work Order" size="4xl">
      <form onSubmit={handleSubmit} className="space-y-6 p-1 text-xs">
        {error && (
          <div className="p-3 rounded-none bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-2">
            <AlertTriangle size={16}/>
            <span>{error}</span>
          </div>
        )}

        {/* ── IMPORT FROM QUOTATION BANNER ────────────────────────────────────────── */}
        <div className="p-3.5 bg-surface2/40 border border-theme-subtle rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-rex-600 text-white flex items-center justify-center shrink-0">
              <Sparkles size={16}/>
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary">Import from Approved Quotation</h4>
              <p className="text-[11px] text-muted">Auto-populate Customer, BOM specifications, and Machining operations</p>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <QuotationAutocomplete
              value={formData.sourceQuoteId}
              onChange={(quoteId) => handleSelectQuote(quoteId)}
              quotations={quotations}
              placeholder="Search quotation # to import BOM..."
              className="text-xs"
            />
          </div>
        </div>

        {/* ── CORE JOB SPECIFICATIONS ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
            <ClipboardList size={14} className="text-rex-600"/> 1. General Job Specifications
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Work Order Title / Job Scope *
              </label>
              <input 
                type="text" 
                required
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                className="w-full input-base text-xs py-2"
                placeholder="e.g. Precision Turning 40mm EN8 Shaft (Length: 450mm)"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Job / Order Number
              </label>
              <input 
                type="text" 
                value={formData.orderNo} 
                onChange={e => setFormData({ ...formData, orderNo: e.target.value })} 
                className="w-full input-base text-xs py-2 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Customer / Client
              </label>
              <CustomerAutocomplete
                value={formData.customerId}
                onChange={(cId, cust) => {
                  setFormData({
                    ...formData,
                    customerId: cId,
                    customer: cust ? (cust.company ? `${cust.name} (${cust.company})` : cust.name) : formData.customer
                  })
                }}
                customers={customers}
                placeholder="Direct / In-House or search customer..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select 
                value={formData.priority} 
                onChange={e => setFormData({ ...formData, priority: e.target.value })} 
                className="w-full input-base text-xs py-2 font-bold"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent 🔥</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Target Quantity (pcs) *
              </label>
              <input 
                type="number" 
                min="1"
                required
                value={formData.jobQty} 
                onChange={e => setFormData({ ...formData, jobQty: Math.max(1, Number(e.target.value)) })} 
                className="w-full input-base text-xs py-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Delivery Deadline
              </label>
              <input 
                type="date" 
                value={formData.deadline} 
                onChange={e => setFormData({ ...formData, deadline: e.target.value })} 
                className="w-full input-base text-xs py-2"
              />
            </div>
          </div>
        </div>

        {/* ── BILL OF MATERIALS (BOM) REQUIREMENTS ─────────────────────────────────── */}
        <div className="space-y-3 pt-3 border-t border-theme-subtle">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <Package size={14} className="text-rex-600"/> 2. Bill of Materials (BOM) Requirements
            </h4>
            <Button variant="outline" size="sm" type="button" onClick={addBomRow} className="text-[11px] h-auto py-1 px-2.5 rounded-none text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 font-bold">
              <Plus size={12} className="mr-1"/> Add Material
            </Button>
          </div>

          <div className="space-y-2">
            {bomRows.map((bom, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-surface2/30 rounded-none border border-theme-subtle">
                <div className="flex-1">
                  <ProductAutocomplete
                    value={bom.material}
                    onChange={(val, inv) => {
                      updateBomRow(idx, 'material', inv ? inv.name : val);
                      if (inv) {
                        if (inv.uom) updateBomRow(idx, 'unit', inv.uom);
                        if (inv.unitCost) updateBomRow(idx, 'unitCost', Number(inv.unitCost));
                      }
                    }}
                    products={inventory}
                    placeholder="Search material / Bar stock specification..."
                    className="text-xs py-1"
                  />
                </div>
                <div className="w-20">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={bom.qty} 
                    onChange={e => updateBomRow(idx, 'qty', Number(e.target.value))} 
                    placeholder="Qty"
                    className="w-full input-base text-xs py-1.5 font-mono"
                  />
                </div>
                <div className="w-20">
                  <input 
                    type="text" 
                    value={bom.unit} 
                    onChange={e => updateBomRow(idx, 'unit', e.target.value)} 
                    placeholder="Unit (ft, pcs)"
                    className="w-full input-base text-xs py-1.5"
                  />
                </div>
                <div className="w-28">
                  <input 
                    type="number" 
                    step="0.01" 
                    value={bom.unitCost} 
                    onChange={e => updateBomRow(idx, 'unitCost', Number(e.target.value))} 
                    placeholder="Cost (LKR)"
                    className="w-full input-base text-xs py-1.5 font-mono"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeBomRow(idx)}
                  disabled={bomRows.length === 1}
                  className="p-1.5 text-muted hover:text-rose-500 disabled:opacity-20 transition-colors"
                >
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>

          <div className="text-right text-[11px] text-muted">
            Est. Material Total: <strong className="font-mono text-primary">{formatCurrency(estBomTotal)}</strong>
          </div>
        </div>

        {/* ── OPERATIONS & ROUTING BUILDER ─────────────────────────────────────────── */}
        <div className="space-y-3 pt-3 border-t border-theme-subtle">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-rex-600"/> 3. Shop Floor Routing & Operations
            </h4>
            <Button variant="outline" size="sm" type="button" onClick={addOpRow} className="text-[11px] h-auto py-1 px-2.5 rounded-none text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 font-bold">
              <Plus size={12} className="mr-1"/> Add Process Step
            </Button>
          </div>

          <div className="space-y-2">
            {opRows.map((op, idx) => (
              <div key={idx} className="p-2.5 bg-surface2/30 rounded-none border border-theme-subtle space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-none bg-rex-600/10 text-rex-600 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={op.operationName} 
                      onChange={e => updateOpRow(idx, 'operationName', e.target.value)} 
                      placeholder="Operation process (e.g. Rough Turning, CNC Milling, Keyway Cutting...)"
                      className="w-full input-base text-xs py-1.5 font-semibold"
                    />
                  </div>
                  <div className="w-32">
                    <input 
                      type="number" 
                      step="0.25" 
                      value={op.plannedHours} 
                      onChange={e => updateOpRow(idx, 'plannedHours', Number(e.target.value))} 
                      placeholder="Hours"
                      className="w-full input-base text-xs py-1.5 font-mono"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeOpRow(idx)}
                    disabled={opRows.length === 1}
                    className="p-1.5 text-muted hover:text-rose-500 disabled:opacity-20 transition-colors"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pl-8">
                  <select 
                    value={op.machineId} 
                    onChange={e => {
                      const mac = machineries.find(m => m.id === e.target.value)
                      updateOpRow(idx, 'machineId', e.target.value)
                      if (mac) updateOpRow(idx, 'hourlyMachineRate', Number(mac.hourlyCost || 1200))
                    }}
                    className="input-base text-[11px] py-1"
                  >
                    <option value="">-- Auto-Assign Machine --</option>
                    {machineries.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type || 'Machine'}) - {formatCurrency(m.hourlyCost || 1200)}/hr
                      </option>
                    ))}
                  </select>

                  <select 
                    value={op.employeeId} 
                    onChange={e => {
                      const emp = employees.find(emp => emp.id === e.target.value)
                      updateOpRow(idx, 'employeeId', e.target.value)
                      if (emp) updateOpRow(idx, 'hourlyLaborRate', Number(emp.hourlyRate || 750))
                    }}
                    className="input-base text-[11px] py-1"
                  >
                    <option value="">-- Auto-Assign Operator --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role || 'Operator'}) - {formatCurrency(emp.hourlyRate || 750)}/hr
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="text-right text-[11px] text-muted">
            Est. Machining & Labor Total: <strong className="font-mono text-primary">{formatCurrency(estMachLaborTotal)}</strong>
          </div>
        </div>

        {/* ── NOTES & TOTAL ESTIMATE ──────────────────────────────────────────────── */}
        <div className="space-y-3 pt-3 border-t border-theme-subtle">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Engineering Notes & Special Tolerances
            </label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })} 
              className="w-full input-base text-xs p-2 h-16 resize-none"
              placeholder="e.g. Surface finish Ra 0.8 required. Pack in anti-rust oil paper..."
            />
          </div>

          {/* Cost Estimate Summary Card */}
          <div className="p-4 bg-surface2/60 rounded-none border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold block">Estimated Production Cost (Budget)</span>
              <span className="text-base font-black text-emerald-500">
                {formatCurrency(totalEstCost)}
              </span>
            </div>
            <div className="text-right text-xs text-secondary">
              BOM: {formatCurrency(estBomTotal)} | Operations: {formatCurrency(estMachLaborTotal)} | Overhead ({formData.overheadPct}%): {formatCurrency(estOverhead)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
          <Button variant="ghost" type="button" onClick={onClose} className="rounded-none">Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting} className="bg-rex-600 hover:bg-rex-700 px-6 font-bold shadow-sm rounded-none">
            {submitting ? 'Creating Work Order...' : 'Create & Release Work Order'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
