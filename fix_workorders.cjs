const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add 'drawings' to TrackTab
content = content.replace("type TrackTab = 'overview' | 'stores' | 'operations'", "type TrackTab = 'overview' | 'stores' | 'operations' | 'drawings'");

// 2. Add custom error modal state
const stateAnchor = "const [submitting, setSubmitting] = useState(false)";
if (!content.includes('errorModal')) {
    content = content.replace(stateAnchor, stateAnchor + "\n  const [errorModal, setErrorModal] = useState<string | null>(null);");
}

// 3. Add attachments to newWO state
const newWOAnchor = "title: '', customerId: '', priority: 'Normal', deadline: '', notes: '', sourceQuoteId: '', jobQty: 1, docNo: '', subject: ''";
if (!content.includes('attachments: []')) {
    content = content.replace(newWOAnchor, newWOAnchor + ", attachments: []");
}

// 4. Reset attachments in resetForm
const resetAnchor = "title:'', customerId:'', priority:'Normal', deadline:'', notes:'', sourceQuoteId:'', jobQty:1, docNo:'', subject:''";
if (!content.includes("attachments:[]")) {
    content = content.replace(resetAnchor, resetAnchor + ", attachments:[]");
}

// 5. handleApplyQuotation mapping
const applyQuotationAnchor = "jobQty: q.snapshot?.jobQty || 1,";
if (!content.includes("attachments: q.snapshot?.attachments")) {
    content = content.replace(applyQuotationAnchor, applyQuotationAnchor + "\n      attachments: q.snapshot?.attachments || [],");
}

// 6. handleSaveWO duplicate check logic
const handleSaveAnchor = "await fetch(API + '/production/work-orders'";
const newHandleSave = `const res = await fetch(API + '/production/work-orders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...newWO, operations, bom: bomRows, totalEstimatedCost: grandTotal }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'DUPLICATE') {
           setErrorModal(data.message);
        } else {
           setErrorModal(data.error || 'Failed to create work order');
        }
        return;
      }
      setShowModal(false); resetForm(); fetchData();`;
const oldHandleSave = `await fetch(API + '/production/work-orders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...newWO, operations, bom: bomRows, totalEstimatedCost: grandTotal }) })
      setShowModal(false); resetForm(); fetchData()`;
if (content.includes(oldHandleSave)) {
    content = content.replace(oldHandleSave, newHandleSave);
}

// 7. Add Delete Work Order function
if (!content.includes('handleDeleteWO')) {
    const deleteFunc = `
  const handleDeleteWO = async (id: string) => {
    if (confirm('Are you sure you want to delete this work order?')) {
      await fetch(API + '/production/work-orders/' + id, { method: 'DELETE' });
      fetchData();
    }
  };
`;
    content = content.replace("const handleSaveWO = async (e: React.FormEvent) => {", deleteFunc + "\n  const handleSaveWO = async (e: React.FormEvent) => {");
}

// 8. Add Delete button in columns
const actionsAnchor = "<Settings size={14} className=\"mr-1.5\"/> Track</Button> ) }";
if (!content.includes('Trash2 size={14}')) {
    content = content.replace(actionsAnchor, "<Settings size={14} className=\"mr-1.5\"/> Track</Button><Button variant=\"ghost\" size=\"sm\" onClick={() => handleDeleteWO(row.id)} className=\"text-red-500 hover:bg-red-500/10 ml-2\"><Trash2 size={14}/></Button></div> ) }");
}

// 9. Add icon import if missing
if (!content.includes('Image as ImageIcon')) {
    content = content.replace("Archive } from 'lucide-react'", "Archive, Image as ImageIcon } from 'lucide-react'");
}

// 10. Add Drawings tab to UI
const tabButtonsAnchor = "{id:'operations' as TrackTab, label:'Operations', icon:<ListChecks size={13}/>}]).map(t => (";
const newTabButtons = "{id:'operations' as TrackTab, label:'Operations', icon:<ListChecks size={13}/>},{id:'drawings' as TrackTab, label:'Drawings/Photos', icon:<ImageIcon size={13}/>}]).map(t => (";
if (content.includes(tabButtonsAnchor)) {
    content = content.replace(tabButtonsAnchor, newTabButtons);
}

// 11. Add Drawings tab content
const operationsTabEnd = "</div>\n              )}";
const drawingsTabCode = `
              {trackTab === 'drawings' && (
                <div className="p-8 space-y-6">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2"><ImageIcon size={15} className="text-rex-500"/> Reference Drawings & Photos</h3>
                  {trackWO.attachments && trackWO.attachments !== 'null' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {JSON.parse(trackWO.attachments).map((att: any, i: number) => (
                        <div key={i} className="border border-theme-subtle rounded-xl overflow-hidden bg-surface group">
                          {att.type?.includes('image') ? (
                            <img src={att.dataUrl} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-48 bg-surface2 flex items-center justify-center p-4 text-center break-words text-xs font-bold text-muted">{att.name}</div>
                          )}
                          <div className="p-3 bg-surface border-t border-theme-subtle">
                            <p className="text-xs font-semibold text-primary truncate">{att.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 border border-dashed border-theme-subtle rounded-xl">
                      <ImageIcon size={32} className="text-muted mx-auto mb-3 opacity-30"/>
                      <p className="text-sm font-semibold text-muted">No drawings or photos attached.</p>
                      <p className="text-xs text-muted mt-1">Attachments from the quotation would appear here.</p>
                    </div>
                  )}
                </div>
              )}`;
if (content.includes(operationsTabEnd) && !content.includes("trackTab === 'drawings'")) {
    // Add right after Operations tab ends (we have multiple of those strings, but we need the one inside `<div className="flex-1 overflow-y-auto">`)
    // Actually simpler: Just append before `</div>\n          </div>\n        )}\n      </Modal>`
    const modalEnd = "</div>\n          </div>\n        )}\n      </Modal>";
    content = content.replace(modalEnd, drawingsTabCode + "\n            " + modalEnd);
}

// 12. Add Error Modal at the end
const endAnchor = "    </div>\n  )\n}";
const errorModalCode = `
      <Modal isOpen={!!errorModal} onClose={() => setErrorModal(null)} title="Notice" size="sm">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <p className="text-sm font-bold text-primary mb-2">{errorModal}</p>
          <Button variant="primary" onClick={() => setErrorModal(null)} className="mt-4 w-full">Understood</Button>
        </div>
      </Modal>
`;
if (content.includes(endAnchor) && !content.includes('!!errorModal')) {
    content = content.replace(endAnchor, errorModalCode + endAnchor);
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('WorkOrders Updated');