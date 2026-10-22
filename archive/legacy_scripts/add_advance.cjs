const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

const importRegex = /import \{ deleteQuotation, updateQuotationStatus, createWorkOrder \} from '@\/lib\/api'/;
code = code.replace(importRegex, "import { deleteQuotation, updateQuotationStatus, createWorkOrder, createInvoice } from '@/lib/api'\nimport { Banknote } from 'lucide-react'");

const newHandler = `
  const handlePaymentRequest = async (group: any, latestMain: any) => {
    const percentStr = prompt('Enter advance payment percentage (e.g., 50 for 50%):', '50');
    if (!percentStr) return;
    const percent = parseFloat(percentStr);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      alert('Invalid percentage');
      return;
    }
    
    const total = Number(latestMain.totalAmount || 0);
    const advanceAmount = (total * percent) / 100;
    
    try {
      const payload = {
        id: \`INV-\${Date.now().toString().slice(-6)}\`,
        quotationId: latestMain.id,
        leadId: group.leadId || 'WALK-IN',
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
        items: JSON.stringify([{ desc: \`Advance Payment (\${percent}%) for Quotation \${group.quoNo}\`, qty: 1, unitPrice: advanceAmount }]),
        subtotal: advanceAmount,
        tax: 0,
        total: advanceAmount,
        status: 'draft',
        notes: \`Advance payment request based on approved quotation \${group.quoNo}\`
      };
      await createInvoice(payload);
      alert('Advance payment invoice generated successfully in Finance module!');
      navigate('/finance/invoices');
    } catch (e) {
      alert('Failed to generate payment request.');
      console.error(e);
    }
  };
`;

code = code.replace(/const handleStatusChange = async/, newHandler + '\n  const handleStatusChange = async');

const newButton = `
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
`;

code = code.replace(/\{latestMain && latestMain\.status === 'Approved' && \([\s\S]*?Create WO[\s\S]*?<\/Button>\s*\)\}/, newButton);

fs.writeFileSync('src/pages/crm/Quotations.tsx', code);
console.log('done');
