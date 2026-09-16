const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/CustomerDetail.tsx', 'utf8');

if (!content.includes('FileText')) {
  content = content.replace("ArrowLeft,", "ArrowLeft, FileText, ArrowRight,");
}

if (!content.includes('const { data: quotations }')) {
  content = content.replace(
    "const { data: customers",
    "const { data: quotations } = useQuotations()\n  const { data: customers"
  );
}

const tabContent = `
      {activeTab === 'quotations' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-rex-500" />
              Customer Quotations
            </h2>
            <Button variant="primary" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${id}\`)}>Create Quotation</Button>
          </div>
          <div className="divide-y divide-theme-subtle">
            {quotations.filter(q => q.leadId === id).length === 0 ? (
               <div className="p-8 text-center text-muted text-sm">No quotations found for this customer.</div>
            ) : (
               quotations.filter(q => q.leadId === id).map(q => {
                 let quoNo = q.id;
                 try { const d = JSON.parse(q.data); if(d.quotationNo) quoNo = d.quotationNo; } catch(e) {}
                 return (
                   <div key={q.id} className="p-4 hover:bg-surface2/30 transition-colors flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-lg bg-rex-500/10 text-rex-600 flex items-center justify-center">
                         <FileText size={18} />
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-primary">{quoNo}</h4>
                         <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                           <span>{formatDate(q.date)}</span>
                           <Badge value={q.type || 'Main'} size="sm" />
                           <span className="font-mono text-[10px]">v{q.version}</span>
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-6">
                       <div className="text-right">
                         <p className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">Amount</p>
                         <p className="text-sm font-black text-primary font-mono">{formatCurrency(Number(q.totalAmount))}</p>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${id}?quoteId=\${q.id}\`)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                         Open <ArrowRight size={14} className="ml-1" />
                       </Button>
                     </div>
                   </div>
                 );
               })
            )}
          </div>
        </GlassCard>
      )}

      {/* Edit Customer Modal */}
`;

content = content.replace(/\{\/\* Edit Customer Modal \*\/\}/, tabContent);

fs.writeFileSync('src/pages/crm/CustomerDetail.tsx', content, 'utf8');