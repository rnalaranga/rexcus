import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FileEdit, Plus, Download, Filter, Briefcase, User, Search, ArrowRight, Trash2, Factory, Package, Printer } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/DialogProvider'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView'
import { useSettings } from '@/contexts/SettingsContext'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useQuotations, useLeads } from '@/hooks/useData'
import { formatCurrency, formatDate } from '@/lib/utils'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { deleteQuotation, updateQuotationStatus, createWorkOrder, createInvoice, fetchCustomerGRNs, createCustomerGRN } from '@/lib/api'
import { Banknote } from 'lucide-react'


export const Quotations: React.FC = () => {
  const { toast, showConfirm } = useDialog();


  
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

  
  const handlePaymentRequest = async (group: any, latestMain: any) => {
    const percentStr = prompt('Enter advance payment percentage (e.g., 50 for 50%):', '50');
    if (!percentStr) return;
    const percent = parseFloat(percentStr);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      toast('Invalid percentage', 'error');
      return;
    }
    
    const total = Number(latestMain.totalAmount || 0);
    const advanceAmount = (total * percent) / 100;
    
    try {
      const payload = {
        id: `INV-${Date.now().toString().slice(-6)}`,
        quotationId: latestMain.id,
        leadId: group.leadId || 'WALK-IN',
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
        items: JSON.stringify([{ desc: `Advance Payment (${percent}%) for Quotation ${group.quoNo}`, qty: 1, unitPrice: advanceAmount }]),
        subtotal: advanceAmount,
        tax: 0,
        total: advanceAmount,
        status: 'draft',
        notes: `Advance payment request based on approved quotation ${group.quoNo}`
      };
      await createInvoice(payload);
      toast('Advance payment invoice generated successfully in Finance module!', 'success');
      navigate('/finance/invoices');
    } catch (e) {
      toast('Failed to generate payment request.', 'error');
      console.error(e);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateQuotationStatus(id, status)
      
      refetch()
    } catch(e) {
      toast('Failed to update status', 'error')
    }
  }

  const navigate = useNavigate()
  const { data: quotations, loading, refetch } = useQuotations()
  const { data: leads = [] } = useLeads()
  const [search, setSearch] = useState('')
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [woDialog, setWoDialog] = useState<{type: 'confirm'|'success'|'error', group?: any, latestMain?: any, msg?: string} | null>(null)
  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)
  const [grnDialog, setGrnDialog] = useState<{ group?: any, latestMain?: any, items?: string, receivedAt?: string, notes?: string } | null>(null)
  const [printGrnData, setPrintGrnData] = useState<{ grn: any, group: any } | null>(null)
  const [viewBomDialog, setViewBomDialog] = useState<any>(null)
  const [quoteGrns, setQuoteGrns] = useState<Record<string, any[]>>({})
  const { settings } = useSettings()

  const groupedQuotations = useMemo(() => {
    const groups: Record<string, { quoNo: string, leadName: string, leadCompany: string, leadId: string, main: any[], job: any[], customer: any[], latestDate: string }> = {}
    
    quotations.forEach(q => {
       let parsed: any = {}
       try { parsed = JSON.parse(q.data || '{}') } catch(e){}
       const quoNo = parsed.quotationNo || q.id
       
       if (!groups[quoNo]) {
         groups[quoNo] = { quoNo, leadName: q.leadName || parsed.customerName || 'Walk-in Customer', leadCompany: q.leadCompany, leadId: q.leadId, main: [], job: [], customer: [], latestDate: q.date }
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
          {selectedQuotes.length > 1 && (
            <Button variant="primary" size="sm" icon={FileText} onClick={() => {
               const selectedGroups = groupedQuotations.filter(g => selectedQuotes.includes(g.quoNo));
               const leadIds = new Set(selectedGroups.map(g => g.leadId));
               if (leadIds.size > 1) {
                  toast('You can only combine quotations for the SAME customer/lead.', 'error');
                  return;
               }
               const leadId = selectedGroups[0].leadId;
               const query = selectedGroups.map(g => `combine=${encodeURIComponent(g.quoNo)}`).join('&');
               navigate(`/crm/quotations/new/${leadId}?${query}`);
            }} className="bg-purple-600 hover:bg-purple-500 border-none text-white shadow-lg shadow-purple-500/20">
              Make Final Quote ({selectedQuotes.length})
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/crm/quotations/new')}>New Quote</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by quote no, customer, company..." value={search} onChange={setSearch} className="w-80" />
      </GlassCard>

      <div className="grid grid-cols-1 gap-4">
        {groupedQuotations.some((g: any) => g.main[0]?.type === 'draft') && (
           <div className="mb-4">
             <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <FileEdit size={16} /> Active Drafts
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedQuotations.filter((g: any) => g.main[0]?.type === 'draft').map((g: any) => {
                   const snap = g.main[0]?.data ? (typeof g.main[0].data === 'string' ? JSON.parse(g.main[0].data) : g.main[0].data) : null
                   return (
                     <div key={g.main[0].id} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 hover:border-orange-500/40 transition-colors relative group">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                           <div className="flex items-center gap-2">
                             <span className="text-xs text-muted font-mono">{String(g.main[0].date).slice(0, 16).replace('T', ' ')}</span>
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 if (await showConfirm('Are you sure you want to delete this draft?', 'Delete Draft', { confirmLabel: 'Delete' })) {
                                   await deleteQuotation(g.main[0].id);
                                   refetch();
                                 }
                               }} 
                               className="text-red-500/70 hover:text-red-500 transition-colors p-0.5"
                               title="Delete Draft"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </div>
                        <h4 className="font-bold text-sm text-primary truncate">{g.leadName || snap?.customerName || 'Unknown Customer'}</h4>
                        {snap?.subject && <p className="text-xs text-muted truncate mt-1">{snap.subject}</p>}
                        
                        <div className="mt-4 flex gap-2">
                           <button onClick={() => navigate(`/crm/quotation-builder/${g.leadId || 'WALK-IN'}?quoteId=${g.main[0].id}`)} className="flex-1 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
                             Resume Draft
                           </button>
                        </div>
                     </div>
                   )
                })}
             </div>
           </div>
        )}
        
        {filtered.length === 0 && (
           <div className="p-8 text-center text-muted">No quotations match your search.</div>
        )}
        
        {filtered.map(group => {
          const latestMain = group.main[0]
          // Hide drafts from the main list, as they are shown in the Active Drafts section above
          if (latestMain?.type === 'draft' && !group.job.length && !group.customer.length && group.main.length === 1) return null;
          
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
                    <input type="checkbox" className="w-5 h-5 cursor-pointer accent-rex-500"
                      checked={selectedQuotes.includes(group.quoNo)}
                      onChange={(e) => {
                         if (e.target.checked) setSelectedQuotes(p => [...p, group.quoNo]);
                         else setSelectedQuotes(p => p.filter(x => x !== group.quoNo));
                      }}
                    />
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
                              <>
                              <Button 
                                variant="primary" 
                                size="sm" 
                                icon={Banknote} 
                                className="ml-4 h-6 text-[9px] px-2 bg-blue-600 hover:bg-blue-500 text-white border-none"
                                onClick={() => handlePaymentRequest(group, latestMain)}
                              >
                                Request Advance
                              </Button>
                              <Button 
                                variant="primary" 
                                size="sm" 
                                icon={Factory} 
                                className="ml-2 h-6 text-[9px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                                onClick={() => handleCreateWO(group, latestMain)}
                              >
                                Create WO
                              </Button>
                              </>
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

                       if (await showConfirm(`Delete entire quotation group ${group.quoNo}?`, 'Delete Quotation Group', { confirmLabel: 'Delete' })) {
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
              <div className="p-3 bg-surface/30 flex flex-col divide-y divide-theme-subtle">
                {/* New BOMs display */}
                {latestMain && (() => {
                   let boms = [];
                   try { 
                     const parsed = typeof latestMain.data === 'string' ? JSON.parse(latestMain.data) : latestMain.data;
                     boms = parsed.boms || [];
                   } catch(e) {}
                   if (boms.length > 0) {
                     return boms.map((bom: any, idx: number) => {
                       return (
                         <div key={bom.id} className="px-4 py-2 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                               <Briefcase size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-secondary">{bom.title || `BOM Part ${idx + 1}`}</p>
                               <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(bom.bomTotal || 0)}</span>
                             </div>
                           </div>
                           <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewBomDialog(bom); }} className="text-[11px] h-7 bg-surface border border-theme-subtle/50 shadow-sm hover:bg-primary/10 hover:text-primary transition-colors">View Costing</Button>
                         </div>
                       )
                     })
                   }
                   return null;
                })()}

                {/* Legacy Job Costing Branch */}
                {latestJob && (!latestMain || (() => { try { return !(JSON.parse(latestMain.data || '{}').boms?.length > 0) } catch(e){return true} })()) && (
                  <div className="px-4 py-2 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-secondary">Internal BOM (Job Costing)</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted font-mono">v{latestJob.version}</span>
                          <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(Number(latestJob.totalAmount))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewData({ quotation: latestJob, type: 'job', lead: { name: group.leadName, company: group.leadCompany, address: '' } }); }} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${group.leadId}?quoteId=${latestJob.id}`); }} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Legacy Customer Quote Branch */}
                {latestCust && (
                  <div className="px-4 py-2 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-secondary">Customer Quotation</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted font-mono">v{latestCust.version}</span>
                          <span className="text-[10px] font-bold text-blue-600 font-mono">{formatCurrency(Number(latestCust.totalAmount))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewData({ quotation: latestCust, type: 'customer', lead: { name: group.leadName, company: group.leadCompany, address: '' } }); }} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${group.leadId}?quoteId=${latestCust.id}`); }} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
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
      <Modal isOpen={!!viewBomDialog} onClose={() => setViewBomDialog(null)} title={viewBomDialog?.title ? `Costing Details: ${viewBomDialog.title}` : "View Costing Details"} size="xl">
        {viewBomDialog && (
          <div className="bg-surface text-primary p-0 flex flex-col h-full rounded-b-xl overflow-hidden">
             {/* Header Summary Bar */}
             <div className="px-6 py-5 bg-gradient-to-r from-surface2 via-surface2/50 to-transparent border-b border-theme-subtle flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                   <Briefcase size={20} />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-secondary">{viewBomDialog.title || 'Internal BOM Costing'}</p>
                   <p className="text-[11px] text-muted font-medium mt-0.5">Full Materials & Machining Breakdown</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Total Estimated Cost</p>
                 <p className="font-mono font-black text-primary text-2xl leading-none">{formatCurrency(viewBomDialog.bomTotal || 0)}</p>
               </div>
             </div>

             <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                 {/* Auto Materials */}
                 {viewBomDialog.autoMats?.length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Package size={14} className="text-blue-500" />
                       <h4 className="text-[12px] font-bold text-secondary uppercase tracking-widest">Plate / Rod Materials</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted font-bold">
                         <tr><th className="px-4 py-2.5">Material</th><th className="px-4 py-2.5">Dimensions</th><th className="px-4 py-2.5 text-right w-24">Qty</th><th className="px-4 py-2.5 text-right w-32">Total Cost</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-[11px]">
                         {viewBomDialog.autoMats.map((m: any, i: number) => (
                           <tr key={i} className="hover:bg-surface/50 transition-colors">
                             <td className="px-4 py-2 font-semibold text-secondary">{m.material}</td>
                             <td className="px-4 py-2 font-mono text-muted">{m.width ? `${m.width} x ${m.length}` : `Ø${m.dia} x ${m.length}`}</td>
                             <td className="px-4 py-2 text-right font-medium">{m.qty}</td>
                             <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(Number(m.platePrice || 0) + Number(m.shaftPrice || 0))}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}

                 {/* Manual Materials */}
                 {viewBomDialog.manualMats?.length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Package size={14} className="text-amber-500" />
                       <h4 className="text-[12px] font-bold text-secondary uppercase tracking-widest">Manual Materials</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted font-bold">
                         <tr><th className="px-4 py-2.5">Material</th><th className="px-4 py-2.5 text-right w-32">Unit Price</th><th className="px-4 py-2.5 text-right w-24">Qty</th><th className="px-4 py-2.5 text-right w-32">Total Cost</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-[11px]">
                         {viewBomDialog.manualMats.map((m: any, i: number) => (
                           <tr key={i} className="hover:bg-surface/50 transition-colors">
                             <td className="px-4 py-2 font-semibold text-secondary">{m.material}</td>
                             <td className="px-4 py-2 text-right font-mono text-muted">{formatCurrency(m.unitPrice || 0)}</td>
                             <td className="px-4 py-2 text-right font-medium">{m.qty}</td>
                             <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(Number(m.unitPrice || 0)*Number(m.qty || 0))}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}

                 {/* Machining */}
                 {viewBomDialog.procState && Object.keys(viewBomDialog.procState).length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Factory size={14} className="text-red-500" />
                       <h4 className="text-[12px] font-bold text-secondary uppercase tracking-widest">Machining Operations</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted font-bold">
                         <tr><th className="px-4 py-2.5">Process / Operation</th><th className="px-4 py-2.5 text-right w-24">Est. Hrs</th><th className="px-4 py-2.5 text-right w-24">Set Time</th><th className="px-4 py-2.5 text-right w-24 text-primary">Quo. Hrs</th><th className="px-4 py-2.5 text-right w-32">Sub Total</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-[11px]">
                         {Object.keys(viewBomDialog.procState).map((k: string) => {
                            const st = viewBomDialog.procState[k];
                            const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0));
                            if (subTotal === 0 && !st.estHr && !st.quoHr && !st.setTime) return null;
                            return (
                              <tr key={k} className="hover:bg-surface/50 transition-colors">
                                <td className="px-4 py-2 font-bold text-red-500/90">{k}</td>
                                <td className="px-4 py-2 text-right font-mono text-muted">{st.estHr || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-muted">{st.setTime || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-primary font-bold">{st.quoHr || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(subTotal)}</td>
                              </tr>
                            )
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
             </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!grnDialog} onClose={() => setGrnDialog(null)} title="Receive Customer Sample (GRN)" size="md">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Items Received (Details/Qty)</label>
              <textarea 
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary" 
                rows={4}
                value={grnDialog?.items || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, items: e.target.value } : null)}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Received Date</label>
              <input 
                type="date"
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary"
                value={grnDialog?.receivedAt || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, receivedAt: e.target.value } : null)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Notes / Condition</label>
              <input 
                type="text"
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary"
                value={grnDialog?.notes || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, notes: e.target.value } : null)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setGrnDialog(null)}>Cancel</Button>
              <Button variant="primary" onClick={async () => {
                if (grnDialog?.latestMain) {
                   await createCustomerGRN({
                     quoteId: grnDialog.latestMain.id,
                     quoNo: grnDialog.group.quoNo,
                     leadId: grnDialog.group.leadId,
                     items: grnDialog.items,
                     receivedAt: grnDialog.receivedAt,
                     receivedBy: 'System', // from auth
                     notes: grnDialog.notes
                   });
                   setGrnDialog(null);
                }
              }}>Confirm Receipt</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!printGrnData} onClose={() => setPrintGrnData(null)} title="Print Customer GRN" size="xl">
        {printGrnData && (
          <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
            <CustomerGRNPrintView 
               grn={printGrnData.grn} 
               group={printGrnData.group}
               settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('grn-print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.5,
                  filename: `GRN-${printGrnData.grn.id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
              <Button variant="primary" onClick={() => {
                const content = document.getElementById('grn-print-section');
                if (content) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`<html><head><title>Print</title><script src="https://cdn.tailwindcss.com"></script></head><body>${content.outerHTML}</body></html>`);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 500);
                  }
                }
              }}>Print</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
