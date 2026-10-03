import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# ADD STATES
state_block = """  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)"""
new_state_block = """  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)
  const [grnDialog, setGrnDialog] = useState<{ group?: any, latestMain?: any, items?: string, receivedAt?: string, notes?: string } | null>(null)
  const [printGrnData, setPrintGrnData] = useState<{ grn: any, group: any } | null>(null)
  const [viewBomDialog, setViewBomDialog] = useState<any>(null)
  const [quoteGrns, setQuoteGrns] = useState<Record<string, any[]>>({})"""
content = content.replace(state_block, new_state_block)

# ADD API FUNCTIONS IMPORT
import_api = "deleteQuotation, updateQuotationStatus, createWorkOrder, createInvoice }"
new_import_api = "deleteQuotation, updateQuotationStatus, createWorkOrder, createInvoice, fetchCustomerGRNs, createCustomerGRN }"
content = content.replace(import_api, new_import_api)

# ADD GRN COMPONENT IMPORTS
import_comp = "import { QuotationPrintView } from '@/components/QuotationPrintView'\n"
new_import_comp = "import { QuotationPrintView } from '@/components/QuotationPrintView'\nimport { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView'\n"
content = content.replace(import_comp, new_import_comp)

# ADD PACKAGE ICON
content = content.replace("Factory, Printer", "Factory, Printer, Package")

# ADD GRN BUTTONS TO EXPANDED ROW
target_buttons = """                      <Button variant="primary" size="sm" onClick={() => setWoDialog({ type: 'confirm', group, latestMain })} className="h-6 text-[10px]">Create Work Order</Button>"""
new_target_buttons = """                      <Button variant="primary" size="sm" onClick={() => setWoDialog({ type: 'confirm', group, latestMain })} className="h-6 text-[10px]">Create Work Order</Button>
                      {latestMain.status === 'Approved' && (
                        <Button variant="primary" size="sm" onClick={() => {
                          const items = (typeof latestMain.data === 'string' ? JSON.parse(latestMain.data) : latestMain.data)?.jobItems?.map((i: any) => `${i.desc} (Qty: ${i.qty})`).join('\\n') || '';
                          setGrnDialog({ group, latestMain, items, receivedAt: new Date().toISOString().split('T')[0], notes: '' });
                        }} className="bg-emerald-600 hover:bg-emerald-700 h-6 text-[10px]">Receive Sample (GRN)</Button>
                      )}"""
content = content.replace(target_buttons, new_target_buttons)

# ADD VIEW COSTING BUTTON TO BOM ROW
pattern = re.compile(r'(<div className="flex items-center gap-3">\s*<div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">\s*<Briefcase size=\{14\} />\s*</div>\s*<div>\s*<p className="text-xs font-bold text-secondary">\{bom\.title \|\| `BOM Part \$\{idx \+ 1\}`\}</p>\s*<span className="text-\[10px\] font-bold text-amber-600 font-mono">\{formatCurrency\(bom\.bomTotal \|\| 0\)\}</span>\s*</div>\s*</div>\s*</div>)')
match = pattern.search(content)
if match:
    better_new_block = """                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                 <Briefcase size={14} />
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-secondary">{bom.title || `BOM Part ${idx + 1}`}</p>
                                 <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(bom.bomTotal || 0)}</span>
                               </div>
                             </div>
                             <Button variant="ghost" size="sm" onClick={() => setViewBomDialog(bom)} className="text-[11px] h-7 bg-surface border border-theme-subtle/50 shadow-sm hover:bg-primary/10 hover:text-primary transition-colors">View Costing</Button>
                           </div>"""
    content = content[:match.start()] + better_new_block + content[match.end():]

# ADD GRN MODALS AT THE END
grn_modals = """      <Modal isOpen={!!grnDialog} onClose={() => setGrnDialog(null)} title="Receive Customer Sample (GRN)" size="md">
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
"""

content = re.sub(r'(</div>\s*\)\s*})', grn_modals + r'\1', content)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)