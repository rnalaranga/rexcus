const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

// Add imports
content = content.replace(
  "import { GlassCard } from '@/components/ui/GlassCard'",
  "import { GlassCard } from '@/components/ui/GlassCard'\nimport { Modal } from '@/components/ui/Modal'\nimport { QuotationPrintView } from '@/components/QuotationPrintView'\nimport { useSettings } from '@/contexts/SettingsContext'"
);

// Add ts-ignore and html2pdf for printing
if (!content.includes('html2pdf.js')) {
  content = content.replace(
    "import { formatCurrency, formatDate } from '@/lib/utils'",
    "import { formatCurrency, formatDate } from '@/lib/utils'\n// @ts-ignore\nimport html2pdf from 'html2pdf.js'"
  );
}

// Add state to component
content = content.replace(
  "const [search, setSearch] = useState('')",
  "const [search, setSearch] = useState('')\n  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)\n  const { settings } = useSettings()"
);

// Change View buttons
// Main:
content = content.replace(
  /onClick=\{\(\) => navigate\(\`\/crm\/quotations\/new\/\$\{group.leadId\}\?quoteId=\$\{latestMain\?\.id \|\| displayQ\.id\}&preview=true\`\)\}/g,
  "onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, address: '' } })}"
);

// Job:
content = content.replace(
  /onClick=\{\(\) => navigate\(\`\/crm\/quotations\/new\/\$\{group.leadId\}\?quoteId=\$\{latestJob\.id\}&preview=true\`\)\}/g,
  "onClick={() => setPreviewData({ quotation: latestJob, type: 'job', lead: { name: group.leadName, company: group.leadCompany, address: '' } })}"
);

// Customer:
content = content.replace(
  /onClick=\{\(\) => navigate\(\`\/crm\/quotations\/new\/\$\{group.leadId\}\?quoteId=\$\{latestCust\.id\}&preview=true\`\)\}/g,
  "onClick={() => setPreviewData({ quotation: latestCust, type: 'customer', lead: { name: group.leadName, company: group.leadCompany, address: '' } })}"
);

// Inject Modal at end of file
const modalStr = `      </div>

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
                  filename: \`Quotation.pdf\`,
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
    </div>
  )
}
`;
content = content.replace(/      <\/div>\r?\n    <\/div>\r?\n  \)\r?\n\}/, modalStr);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');