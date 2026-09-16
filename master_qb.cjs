const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// 1. Imports
if (!content.includes('import { useMachiningOperations }')) {
  content = content.replace("import { useLeads, useInventory } from '@/hooks/useData'", "import { useLeads, useInventory, useMachiningOperations } from '@/hooks/useData'");
}

// 2. Remove EXCEL_PROCESSES
const excelBlockRegex = /const EXCEL_PROCESSES = \[\s*[\s\S]*?return init\n\}/;
content = content.replace(excelBlockRegex, "");

// 3. procState initialization
content = content.replace(
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate: number }>>(initProcState)",
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate?: number; hrRate?: number; setTimeRate?: number }>>({})"
);

// 4. dynamic processes logic
const leadBlock = "const lead = leads.find(l => l.id === leadId)";
if (!content.includes('rawOperations')) {
  content = content.replace(leadBlock, `const lead = leads.find(l => l.id === leadId)
  
  const { data: rawOperations } = useMachiningOperations()
  const EXCEL_PROCESSES = React.useMemo(() => {
    const groups: Record<string, any[]> = {}
    if (rawOperations) {
      rawOperations.forEach((op: any) => {
        if (!groups[op.groupName]) groups[op.groupName] = []
        groups[op.groupName].push(op)
      })
    }
    return Object.keys(groups).map(k => ({ group: k, items: groups[k] }))
  }, [rawOperations])

  React.useEffect(() => {
    setProcState(prev => {
      if (Object.keys(prev).length > 0) return prev;
      const init: any = {}
      EXCEL_PROCESSES.forEach(g => g.items.forEach(i => {
        init[i.name] = { estHr: '', setTime: '', quoHr: '', hrRate: i.hrRate, setTimeRate: i.setTimeRate, rate: i.hrRate }
      }))
      return init
    })
  }, [EXCEL_PROCESSES])
`);
}

// 5. totalMachiningCost
content = content.replace(
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + Number(p.quoHr) * Number(p.rate), 0)",
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + (Number(p.quoHr)||0) * (Number(p.hrRate || p.rate)||0) + (Number(p.setTime)||0) * (Number(p.setTimeRate)||0), 0)"
);

// 6. Header
content = content.replace(
  '<th className="px-3 py-2.5 w-28">Hr Rate</th>',
  '<th className="px-3 py-2.5 w-48">Rates</th>'
);

// 7. Table logic
content = content.replace(
  /const itemRate = Number\(item\.rate\)\n\s*const quoHr = Number\(procState\[item\.name\]\?\.quoHr \|\| 0\)/g,
  `const quoHr = Number(procState[item.name]?.quoHr || 0)
                                const hrRate = Number(procState[item.name]?.hrRate || item.hrRate || item.rate || 0)
                                const setTime = Number(procState[item.name]?.setTime || 0)
                                const setTimeRate = Number(procState[item.name]?.setTimeRate || item.setTimeRate || 0)`
);

// 8. Table cells (WIDE COLUMN AND PIPE)
content = content.replace(
  /<td className="px-4 py-2 text-right font-mono text-secondary">\{itemRate\}<\/td>\n\s*<td className="px-4 py-2 text-right font-mono font-bold text-primary">\{formatCurrency\(quoHr \* itemRate\)\}<\/td>/g,
  `<td className="px-4 py-2 text-right font-mono text-secondary text-[10px] whitespace-nowrap">
                                  <div className="flex gap-2 justify-end">
                                    <span className="text-amber-600 font-bold">{formatCurrency(hrRate)}/hr</span>
                                    <span className="text-muted/40">|</span>
                                    <span className="text-blue-600 font-bold">{formatCurrency(setTimeRate)}/set</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-primary">{formatCurrency((quoHr * hrRate) + (setTime * setTimeRate))}</td>`
);

// 9. Manual Preview fixes
content = content.replace(
  /const subTotal = Number\(st\.quoHr \|\| 0\) \* st\.rate/g,
  "const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0))"
);
content = content.replace(
  /<td className="px-3 py-1\.5 text-xs text-muted font-mono border-l border-theme-subtle\/30">Rs\. \{st\.rate\.toLocaleString\(\)\}<\/td>/g,
  '<td className="px-3 py-1.5 text-[10px] font-mono border-l border-theme-subtle/30 whitespace-nowrap"><span className="text-amber-600 font-bold">Rs. {Number(st.hrRate || st.rate || 0).toLocaleString()}/hr</span> <span className="text-muted/40">|</span> <span className="text-blue-600 font-bold">Rs. {Number(st.setTimeRate || 0).toLocaleString()}/set</span></td>'
);

// 10. Snapshot fix
content = content.replace(
  /if \(snap\.procState\) setProcState\(snap\.procState\)\n\s*else setProcState\(initProcState\(\)\)/,
  "if (snap.procState) setProcState(snap.procState)"
);

// 11. AI Generate Logic
const startIdx = content.indexOf("const autoGenerateCustomerQuote = () => {");
if (startIdx !== -1) {
    const endIdx = content.indexOf("const handleSave = async", startIdx);
    if (endIdx !== -1) {
        content = content.slice(0, startIdx) + content.slice(endIdx);
    }
}
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

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');