import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Download, Filter, Briefcase, User, Search, ArrowRight, Trash2, Factory } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Modal } from '@/components/ui/Modal'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { useSettings } from '@/contexts/SettingsContext'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useQuotations } from '@/hooks/useData'
import { formatCurrency, formatDate } from '@/lib/utils'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { deleteQuotation, updateQuotationStatus, createWorkOrder } from '@/lib/api'


export const Quotations: React.FC = () => {

  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      case 'In Production': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700/50';
    }
  }

  
  const handleCreateWO = (group: any, latestMain: any) => {
    setWoDialog({ type: 'confirm', group, latestMain });
  }

  const executeCreateWO = async () => {
    if (!woDialog?.group || !woDialog?.latestMain) return;
    try {
      const data = JSON.parse(woDialog.latestMain.data || '{}');
      const procState = data.procState || {};
      const operations = Object.keys(procState).map(k => ({
        operationName: k,
        plannedHours: Number(procState[k].estHr) || Number(procState[k].quoHr) || 0
      })).filter(op => op.plannedHours > 0);
      
      const bom: any[] = [];
      const autoMats = data.autoMats || [];
      const manualMats = data.manualMats || [];
      
      autoMats.forEach((m: any) => {
         if (m.material) {
           bom.push({ material: m.material, qty: Number(m.qty) || 1, unit: m.dia ? 'rods' : 'plates', unitCost: Number(m.unitPrice) || 0, notes: `${m.length}x${m.width} ${m.thick}mm` });
         }
      });
      
      manualMats.forEach((m: any) => {
         if (m.material) {
           bom.push({ material: m.material, qty: Number(m.qty) || 1, unit: 'pcs', unitCost: Number(m.unitPrice) || 0, notes: m.supplier || '' });
         }
      });
      
      const woData = {
        title: `WO: ${woDialog.group.quoNo} - ${woDialog.group.leadName || 'Customer'}`,
        customerId: woDialog.group.leadId,
        priority: 'Medium',
        operations,
        bom
      };
      
      await createWorkOrder(woData);
      setWoDialog({ type: 'success', msg: 'Work Order successfully created! Check Production module.' });
    } catch(e) {
      setWoDialog({ type: 'error', msg: 'Failed to create Work Order' });
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateQuotationStatus(id, status)
      
      refetch()
    } catch(e) {
      alert('Failed to update status')
    }
  }

  const navigate = useNavigate()
  const { data: quotations, loading, refetch } = useQuotations()
  const [search, setSearch] = useState('')
  const [woDialog, setWoDialog] = useState<{type: 'confirm'|'success'|'error', group?: any, latestMain?: any, msg?: string} | null>(null)
  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)
  const { settings } = useSettings()

  const groupedQuotations = useMemo(() => {
    const groups: Record<string, { quoNo: string, leadName: string, leadCompany: string, leadId: string, main: any[], job: any[], customer: any[], latestDate: string }> = {}
    
    quotations.forEach(q => {
       let parsed: any = {}
       try { parsed = JSON.parse(q.data || '{}') } catch(e){}
       const quoNo = parsed.quotationNo || q.id
       
       if (!groups[quoNo]) {
         groups[quoNo] = { quoNo, leadName: q.leadName, leadCompany: q.leadCompany, leadId: q.leadId, main: [], job: [], customer: [], latestDate: q.date }
       }
       
       if (q.type === 'main') groups[quoNo].main.push(q)
       else if (q.type === 'job') groups[quoNo].job.push(q)
       else if (q.type === 'customer') groups[quoNo].customer.push(q)
       else groups[quoNo].main.push(q)
       
       if (new Date(q.date) > new Date(groups[quoNo].latestDate)) {
         groups[quoNo].latestDate = q.date
       }
    })
    
    // Sort versions descending within each group
    Object.values(groups).forEach(g => {
      g.main.sort((a, b) => b.version - a.version)
      g.job.sort((a, b) => b.version - a.version)
      g.customer.sort((a, b) => b.version - a.version)
    })
    
    // Sort groups by latest date descending
    return Object.values(groups).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime())
  }, [quotations])

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading quotations...</div>

  const filtered = groupedQuotations.filter(g => {
    return [g.quoNo, g.leadName, g.leadCompany].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  })

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Quotations</h1>
          <p className="text-xs text-muted mt-0.5">{groupedQuotations.length} quotation groups &middot; {quotations.length} total versions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/crm/leads')}>New Quote</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by quote no, customer, company..." value={search} onChange={setSearch} className="w-80" />
      </GlassCard>

      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 && (
           <div className="p-8 text-center text-muted">No quotations match your search.</div>
        )}
        
        {filtered.map(group => {
          const latestMain = group.main[0]
          const latestJob = group.job[0]
          const latestCust = group.customer[0]
          
          // Determine parent display info (prefer main, then whatever is available)
          const displayQ = latestMain || latestCust || latestJob
          if (!displayQ) return null;

          return (
            <GlassCard key={group.quoNo} className="overflow-hidden border-l-4 border-l-rex-500 !p-0">
              {/* Header / Main Row */}
              <div className="p-4 bg-gradient-to-r from-surface2 to-surface border-b border-theme-subtle flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-rex-500/10 text-rex-600 dark:text-rex-400 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                                          <h3 className="text-base font-bold text-primary flex items-center gap-2">
                        {group.quoNo}
                        {latestMain && <span className="text-[10px] bg-rex-500/20 text-rex-700 dark:text-rex-300 px-2 py-0.5 rounded-full font-bold">MAIN v{latestMain.version}</span>}
                        {latestMain && (
                            <div className="relative ml-2 group/status cursor-pointer">
                              <select 
                                value={latestMain.status || 'Draft'}
                                onChange={(e) => handleStatusChange(latestMain.id, e.target.value)}
                                className={`appearance-none cursor-pointer text-[10px] uppercase tracking-wider font-black rounded-full px-3 py-1 pr-6 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rex-500/50 transition-all duration-200 ${getStatusColor(latestMain.status || 'Draft')}`}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="In Production">In Production</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                                <svg className={`w-3 h-3 ${getStatusColor(latestMain.status || 'Draft').split(' ')[1]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                              
                              </div>
                            </div>
                          )}
                          {latestMain && latestMain.status === 'Approved' && (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              icon={Factory} 
                              className="ml-4 h-6 text-[9px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                              onClick={() => handleCreateWO(group, latestMain)}
                            >
                              Create WO
                            </Button>
                          )}

                      </h3>
                    <p className="text-xs text-secondary mt-0.5 font-medium">{group.leadName || 'Unknown Customer'} {group.leadCompany ? `(${group.leadCompany})` : ''}</p>
                    <p className="text-[10px] text-muted mt-0.5">Last updated: {formatDate(group.latestDate)}</p>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-6">
                  {latestMain && (
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Main Total</p>
                      <p className="text-lg font-black text-rex-600 dark:text-rex-400 font-mono">{formatCurrency(Number(latestMain.totalAmount))}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, address: '' } })} className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 h-8">
                         View Quote
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/crm/quotations/new/${group.leadId}?quoteId=${displayQ.id}`)} className="bg-surface border border-theme-subtle hover:bg-surface2 h-8">
                         Edit
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => {

                       if (confirm(`Delete entire quotation group ${group.quoNo}?`)) {
                          // Delete all associated ids
                          for (const q of [...group.main, ...group.job, ...group.customer]) {
                             await deleteQuotation(q.id);
                          }
                          refetch();
                       }
                    }} className="text-red-500 hover:bg-red-500/10 h-6 text-[10px]">Delete Group</Button>
                  </div>
                </div>
              </div>

              {/* Sub-Quotes (Job & Customer) */}
              <div className="p-3 bg-surface/30 grid grid-cols-2 divide-x divide-theme-subtle">
                {/* Job Costing Branch */}
                <div className="px-4 py-2 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Briefcase size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary">Internal Job Costing</p>
                      {latestJob ? (
                         <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] text-muted font-mono">v{latestJob.version}</span>
                           <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(Number(latestJob.totalAmount))}</span>
                         </div>
                      ) : (
                         <p className="text-[10px] text-muted/50 italic mt-0.5">Not saved separately</p>
                      )}
                    </div>
                  </div>
                  {latestJob && (<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewData({ quotation: latestJob, type: 'job', lead: { name: group.leadName, company: group.leadCompany, address: '' } })} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/crm/quotations/new/${group.leadId}?quoteId=${latestJob.id}`)} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>)}
                </div>

                {/* Customer Quote Branch */}
                <div className="px-4 py-2 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary">Customer Quotation</p>
                      {latestCust ? (
                         <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] text-muted font-mono">v{latestCust.version}</span>
                           <span className="text-[10px] font-bold text-blue-600 font-mono">{formatCurrency(Number(latestCust.totalAmount))}</span>
                         </div>
                      ) : (
                         <p className="text-[10px] text-muted/50 italic mt-0.5">Not saved separately</p>
                      )}
                    </div>
                  </div>
                  {latestCust && (<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewData({ quotation: latestCust, type: 'customer', lead: { name: group.leadName, company: group.leadCompany, address: '' } })} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/crm/quotations/new/${group.leadId}?quoteId=${latestCust.id}`)} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>)}
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      <Modal isOpen={!!previewData} onClose={() => setPreviewData(null)} title={'Preview - ' + (previewData ? previewData.type.toUpperCase() : '') + ' Quotation'} size="xl">
        {previewData && (
          <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
            <QuotationPrintView 
               data={typeof previewData.quotation.data === 'string' ? JSON.parse(previewData.quotation.data) : previewData.quotation.data} 
               type={previewData.type}
               lead={previewData.lead}
               settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.2,
                  filename: `Quotation.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
              <Button variant="primary" onClick={() => window.print()}>Print Quotation</Button>
            </div>
          </div>
        )}
      </Modal>
    
      <Modal isOpen={!!woDialog} onClose={() => setWoDialog(null)} title={woDialog?.type === 'confirm' ? 'Confirm Action' : woDialog?.type === 'success' ? 'Success' : 'Error'} size="md">
        <div className="p-6">
          {woDialog?.type === 'confirm' && (
            <>
              <p className="text-sm text-secondary mb-6">Are you sure you want to create a Work Order from this approved quotation?</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setWoDialog(null)}>Cancel</Button>
                <Button variant="primary" onClick={executeCreateWO}>Create Work Order</Button>
              </div>
            </>
          )}
          {woDialog?.type === 'success' && (
            <>
              <p className="text-sm text-emerald-500 font-medium mb-6">{woDialog.msg}</p>
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => setWoDialog(null)}>Close</Button>
              </div>
            </>
          )}
          {woDialog?.type === 'error' && (
            <>
              <p className="text-sm text-red-500 font-medium mb-6">{woDialog.msg}</p>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setWoDialog(null)}>Close</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  )
}