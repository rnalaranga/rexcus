const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// 1. Add useMachiningOperations import
content = content.replace(
  "import { useLeads, useInventory, useSettings } from '@/hooks/useData'",
  "import { useLeads, useInventory, useSettings, useMachiningOperations } from '@/hooks/useData'"
);

// 2. Remove initProcState function and EXCEL_PROCESSES
content = content.replace(
  /const EXCEL_PROCESSES = \[[\s\S]*?return init\n  }/,
  ""
);

// 3. Fix procState initialization
content = content.replace(
  /const \[procState, setProcState\] = useState<Record<string, \{ estHr: string; setTime: string; quoHr: string; rate: number \}>>\(initProcState\)/,
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; hrRate?: number; setTimeRate?: number; rate?: number }>>({})"
);

// 4. Add dynamicProcesses logic inside component
content = content.replace(
  "const lead = leads.find(l => l.id === leadId)",
  `const lead = leads.find(l => l.id === leadId)

  const { data: rawOperations } = useMachiningOperations()
  const dynamicProcesses = React.useMemo(() => {
    const groups: Record<string, any[]> = {}
    if (rawOperations) {
      rawOperations.forEach((op: any) => {
        if (!groups[op.groupName]) groups[op.groupName] = []
        groups[op.groupName].push(op)
      })
    }
    return Object.keys(groups).map(k => ({ group: k, items: groups[k] }))
  }, [rawOperations])

  // Initialize procState when dynamicProcesses load
  React.useEffect(() => {
    setProcState(prev => {
      if (Object.keys(prev).length > 0) return prev;
      const init: any = {}
      dynamicProcesses.forEach(g => g.items.forEach(i => {
        init[i.name] = { estHr: '', setTime: '', quoHr: '', hrRate: i.hrRate, setTimeRate: i.setTimeRate }
      }))
      return init
    })
  }, [dynamicProcesses])
`
);

// 5. Update machining cost calculation
content = content.replace(
  /const totalMachiningCost = Object.values\(procState\).reduce\(\(s, p\) => s \+ Number\(p.quoHr\) \* Number\(p.rate\), 0\)/,
  "const totalMachiningCost = Object.values(procState).reduce((acc: number, curr: any) => acc + (Number(curr.quoHr) || 0) * (Number(curr.hrRate || curr.rate) || 0) + (Number(curr.setTime) || 0) * (Number(curr.setTimeRate) || 0), 0)"
);

// 6. Update rendering map from EXCEL_PROCESSES to dynamicProcesses
content = content.replace(
  /\{EXCEL_PROCESSES.map\(\(group, gIdx\) => \(/g,
  "{dynamicProcesses.map((group, gIdx) => ("
);

// 7. Update table headers for Rates
content = content.replace(
  /<th className="px-4 py-2 text-right">Rate \(Rs\.\)<\/th>/,
  '<th className="px-4 py-2 text-right">Rates (Rs.)</th>'
);

// 8. Update table row calculation
content = content.replace(
  /const itemRate = Number\(item.rate\)/g,
  "const hrRate = Number(procState[item.name]?.hrRate || item.rate || 0)\n                                const setTimeRate = Number(procState[item.name]?.setTimeRate || 0)\n                                const sub = (quoHr * hrRate) + (setTime * setTimeRate)"
);

content = content.replace(
  /quoHr \* itemRate/g,
  "sub"
);

content = content.replace(
  /<td className="px-4 py-2 text-right font-mono text-secondary">\{itemRate\}<\/td>/g,
  '<td className="px-4 py-2 text-right font-mono text-secondary text-[10px]"><div className="text-amber-600">{hrRate}/hr</div><div className="text-blue-600">{setTimeRate}/set</div></td>'
);

// 9. Fix restoreSnapshot to set procState correctly
content = content.replace(
  /if \(snap.procState\) setProcState\(snap.procState\)\n    else setProcState\(initProcState\(\)\)/,
  "if (snap.procState) setProcState(snap.procState)"
);

// 10. Re-add showToast and autoGenerateCustomerQuote correctly
content = content.replace(
  "  const showToast = useCallback((type: 'success' | 'error', msg: string) => {",
  `  const autoGenerateCustomerQuote = () => {
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

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {`
);

// 11. Add AI button to the Customer section UI
content = content.replace(
  /<Button variant="ghost" size="sm" icon=\{Plus\} onClick=\{addCustItem\}>Add Item<\/Button>/,
  `<Button variant="ghost" size="sm" icon={Plus} onClick={addCustItem}>Add Item</Button>
                  <Button variant="primary" size="sm" onClick={autoGenerateCustomerQuote} className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-md">✨ AI Generate from Job Cost</Button>`
);


fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');
console.log("Successfully rebuilt QuotationBuilder.tsx");