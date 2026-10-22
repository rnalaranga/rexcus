const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

const oldFunc = `const operations = Object.keys(procState).map(k => ({
        operationName: k,
        plannedHours: Number(procState[k].estHr) || Number(procState[k].quoHr) || 0
      }));
      
      const woData = {
        title: \`WO: \${woDialog.group.quoNo} - \${woDialog.group.leadName || 'Customer'}\`,
        customerId: woDialog.group.leadId,
        priority: 'Medium',
        operations
      };`;

const newFunc = `const operations = Object.keys(procState).map(k => ({
        operationName: k,
        plannedHours: Number(procState[k].estHr) || Number(procState[k].quoHr) || 0
      }));
      
      const bom: any[] = [];
      const autoMats = data.autoMats || [];
      const manualMats = data.manualMats || [];
      
      autoMats.forEach((m: any) => {
         if (m.material) {
           bom.push({ material: m.material, qty: Number(m.qty) || 1, unit: m.dia ? 'rods' : 'plates', unitCost: Number(m.unitPrice) || 0, notes: \`\${m.length}x\${m.width} \${m.thick}mm\` });
         }
      });
      
      manualMats.forEach((m: any) => {
         if (m.material) {
           bom.push({ material: m.material, qty: Number(m.qty) || 1, unit: 'pcs', unitCost: Number(m.unitPrice) || 0, notes: m.supplier || '' });
         }
      });
      
      const woData = {
        title: \`WO: \${woDialog.group.quoNo} - \${woDialog.group.leadName || 'Customer'}\`,
        customerId: woDialog.group.leadId,
        priority: 'Medium',
        operations,
        bom
      };`;

content = content.replace(oldFunc, newFunc);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');