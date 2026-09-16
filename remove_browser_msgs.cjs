const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

// 1. Add state variable
content = content.replace(
  "const [previewData, setPreviewData] = useState",
  "const [woDialog, setWoDialog] = useState<{type: 'confirm'|'success'|'error', group?: any, latestMain?: any, msg?: string} | null>(null)\n  const [previewData, setPreviewData] = useState"
);

// 2. Replace handleCreateWO
const oldHandleCreateWO = /const handleCreateWO = async \([\s\S]*?alert\('Failed to create Work Order'\);\s*\}\s*\}/;

const newHandleCreateWO = `const handleCreateWO = (group: any, latestMain: any) => {
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
      }));
      
      const woData = {
        title: \`WO: \${woDialog.group.quoNo} - \${woDialog.group.leadName || 'Customer'}\`,
        customerId: woDialog.group.leadId,
        priority: 'Medium',
        operations
      };
      
      await createWorkOrder(woData);
      setWoDialog({ type: 'success', msg: 'Work Order successfully created! Check Production module.' });
    } catch(e) {
      setWoDialog({ type: 'error', msg: 'Failed to create Work Order' });
    }
  }`;

content = content.replace(oldHandleCreateWO, newHandleCreateWO);

// 3. Add Modal markup before final </div>
const modalMarkup = `
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
`;

content = content.replace(/<\/div>\s*\)\s*\}\s*$/, modalMarkup + "\n    </div>\n  )\n}");

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');