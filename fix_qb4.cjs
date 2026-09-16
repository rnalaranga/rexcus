const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

content = content.replace("import { useLeads, useInventory } from '@/hooks/useData'", "import { useLeads, useInventory, useMachiningOperations } from '@/hooks/useData'");

content = content.replace(
  "const EXCEL_PROCESSES = [\n  { group: 'General',    items: [{ name: 'Parting', rate: 500 }] },\n  { group: 'Milling',    items: [{ name: 'Manual Milling', rate: 2500 }, { name: 'Gear Hobbing', rate: 2500 }] },\n  { group: 'Man Lathe',  items: [{ name: 'Normal', rate: 2500 }, { name: 'Blue 800x3000', rate: 3000 }, { name: 'Japan Heavy', rate: 4000 }, { name: 'Coping Lathe', rate: 5000 }, { name: 'Shaping', rate: 2500 }]},\n  { group: 'CNC Milling', items: [{ name: '3 Axis', rate: 4500 }, { name: '4 Axis', rate: 5000 }, { name: '5 Axis', rate: 7500 }, { name: '3 Axis 1600 Bed', rate: 7000 }]},\n  { group: 'CNC Lathe', items: [{ name: 'Turning', rate: 5500 }, { name: 'Turnmill', rate: 6000 }, { name: 'WEDM', rate: 2500 }, { name: 'EDM', rate: 2500 }, { name: 'Hardening', rate: 1500 }, { name: 'Surface Grinding', rate: 1500 }, { name: 'Cylindricle grinding', rate: 1500 }, { name: 'Knife Grinder', rate: 2500 }]},\n  { group: 'Welding',    items: [{ name: 'Welding TIG', rate: 3000 }, { name: 'Welding MIG', rate: 3000 }, { name: 'Welding ARC', rate: 1500 }]},\n  { group: 'Fabrication', items: [{ name: 'Fabrication / Fitting', rate: 1500 }]}\n]\n\nconst initProcState = () => {\n  const init: any = {}\n  EXCEL_PROCESSES.forEach(g => g.items.forEach(i => { init[i.name] = { estHr: '', setTime: '', quoHr: '', rate: i.rate } }))\n  return init\n}",
  ""
);

// Delete the duplicate autoGenerateCustomerQuote (whichever is the broken one). I will just replace the whole section between showToast and handleSave.
const startIdx = content.indexOf("const autoGenerateCustomerQuote = () => {");
if (startIdx !== -1) {
    const endIdx = content.indexOf("const handleSave = async", startIdx);
    if (endIdx !== -1) {
        content = content.slice(0, startIdx) + content.slice(endIdx);
    }
}

// Add autoGenerateCustomerQuote back right above handleSave
content = content.replace("const handleSave = async (overrideType", `
  const autoGenerateCustomerQuote = () => {
    if (jobItems.length === 0 || (!jobItems[0].text && jobItems.length === 1)) {
      showToast('error', 'Please fill out Job Scope / Descriptions first!');
      return;
    }
    
    const marginStr = window.prompt("✨ AI Generation\\n\\nEnter desired Profit Margin % (e.g. 35):", "35");
    if (!marginStr) return;
    const margin = Number(marginStr);
    
    const cost = totalMaterialCost + totalMachiningCost;
    if (cost === 0) {
       showToast('error', 'Please complete the Job Costing (Material/Machining) first to generate a price!');
       return;
    }

    const targetTotal = cost * (1 + (margin / 100));

    const matNames = [
      ...autoMats.map(m => m.material).filter(Boolean),
      ...manualMats.map(m => m.material).filter(Boolean)
    ];
    const uniqueMats = [...new Set(matNames)];

    const activeProcs = Object.keys(procState).filter(k => {
      const p = procState[k];
      return (Number(p.quoHr) || 0) > 0 || (Number(p.setTime) || 0) > 0;
    });

    let extraDesc = "";
    if (uniqueMats.length > 0) {
      extraDesc += \`\\n\\nMaterials used: \${uniqueMats.join(', ')}\`;
    }
    if (activeProcs.length > 0) {
      extraDesc += \`\\nProcesses included: \${activeProcs.join(', ')}\`;
    }

    const newCustItems = jobItems.map((ji, idx) => {
      const q = idx === 0 ? (Number(jobQty) || 1) : 1;
      const price = idx === 0 ? Math.round(targetTotal / q) : 0;
      return {
        id: Date.now() + idx,
        desc: idx === 0 ? (ji.text + extraDesc) : ji.text,
        qty: q,
        unitPrice: price,
        note: ''
      };
    });

    setCustItems(newCustItems);
    showToast('success', \`✨ Auto-generated Customer Quote with \${margin}% margin!\`);
  };

  const handleSave = async (overrideType`);


content = content.replace(/Number\(st\.rate\)/g, "Number(st.rate || 0)");

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');