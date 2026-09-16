const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// 1. Add state for attachments
const stateAnchor = "const [jobItems, setJobItems] = useState<{ id: number; text: string }[]>([{ id: Date.now(), text: '' }])";
const stateCode = `const [attachments, setAttachments] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
         if (ev.target?.result) {
            setAttachments(prev => [...prev, { id: Date.now() + Math.random(), name: file.name, dataUrl: ev.target.result, type: file.type }]);
         }
      }
      reader.readAsDataURL(file);
    });
  }
`;
if (content.includes(stateAnchor) && !content.includes('const [attachments')) {
    content = content.replace(stateAnchor, stateCode + "\n  " + stateAnchor);
}

// 2. Add attachments to snapshot
const snapAnchor = "jobQty, jobItems, attention, subject";
if (content.includes(snapAnchor) && !content.includes('attachments, jobQty')) {
    content = content.replace(snapAnchor, "jobQty, jobItems, attention, subject, attachments");
}

// 3. Restore attachments from snapshot
const restoreAnchor = "setJobItems(snap.jobItems || [])";
if (content.includes(restoreAnchor) && !content.includes('setAttachments(snap.attachments')) {
    content = content.replace(restoreAnchor, restoreAnchor + "\n    setAttachments(snap.attachments || [])");
}

// 4. Add attachments UI under Job Items (before auto mats)
const uiAnchor = "{/* Job Items */}";
const uiCode = `{/* Attachments */}
            <div className="pt-5 border-t border-theme-subtle">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-black text-secondary uppercase tracking-widest">Drawings & Photos</label>
                <label className="text-xs bg-surface hover:bg-surface2 px-3 py-1.5 rounded-lg font-bold border border-theme-subtle cursor-pointer text-primary">
                  + Add File
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {attachments.map(att => (
                    <div key={att.id} className="relative w-20 h-20 shrink-0 border border-theme-subtle rounded-lg overflow-hidden group">
                      {att.type.includes('image') ? <img src={att.dataUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-surface2 flex items-center justify-center text-[10px] font-bold text-muted p-2 text-center break-words">{att.name}</div>}
                      <button type="button" onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            `;
if (content.includes(uiAnchor) && !content.includes('Drawings & Photos')) {
    content = content.replace(uiAnchor, uiCode + uiAnchor);
}

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');
console.log('QuotationBuilder Updated');