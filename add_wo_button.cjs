const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

// Add imports
if (!content.includes('createWorkOrder')) {
  content = content.replace("updateQuotationStatus } from '@/lib/api'", "updateQuotationStatus, createWorkOrder } from '@/lib/api'");
}
if (!content.includes('Factory')) {
  content = content.replace("Trash2 } from 'lucide-react'", "Trash2, Factory } from 'lucide-react'");
}

// Add function
const woFunc = `
  const handleCreateWO = async (group: any, latestMain: any) => {
    if(!confirm('Create a Work Order from this approved quotation?')) return;
    try {
      const data = JSON.parse(latestMain.data || '{}');
      const procState = data.procState || {};
      const operations = Object.keys(procState).map(k => ({
        operationName: k,
        plannedHours: Number(procState[k].estHr) || Number(procState[k].quoHr) || 0
      }));
      
      const woData = {
        title: \`WO: \${group.quoNo} - \${group.leadName || 'Customer'}\`,
        customerId: group.leadId,
        priority: 'Medium',
        operations
      };
      
      await createWorkOrder(woData);
      alert('Work Order successfully created! Check Production module.');
    } catch(e) {
      alert('Failed to create Work Order');
    }
  }
`;
content = content.replace("const handleStatusChange = async", woFunc + "\n  const handleStatusChange = async");

// Add button
const woButton = `
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
`;
content = content.replace(/<\/div>\s*<\/div>\s*\)\}/, woButton);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');