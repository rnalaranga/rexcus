const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

if (!content.includes('import { useMachiningOperations }')) {
  content = content.replace("import { useLeads, useInventory } from '@/hooks/useData'", "import { useLeads, useInventory, useMachiningOperations } from '@/hooks/useData'");
}

const excelBlockRegex = /const EXCEL_PROCESSES = \[\s*[\s\S]*?return init\n\}/;
content = content.replace(excelBlockRegex, "");

content = content.replace(
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate: number }>>(initProcState)",
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate?: number; hrRate?: number; setTimeRate?: number }>>({})"
);

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

content = content.replace(
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + Number(p.quoHr) * Number(p.rate), 0)",
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + (Number(p.quoHr)||0) * (Number(p.hrRate || p.rate)||0) + (Number(p.setTime)||0) * (Number(p.setTimeRate)||0), 0)"
);

content = content.replace(
  '<th className="px-4 py-2 text-right">Rate (Rs.)</th>',
  '<th className="px-4 py-2 text-right">Rates (Rs.)</th>'
);

content = content.replace(
  /const itemRate = Number\(item\.rate\)\n\s*const quoHr = Number\(procState\[item\.name\]\?\.quoHr \|\| 0\)/g,
  `const quoHr = Number(procState[item.name]?.quoHr || 0)
                                const hrRate = Number(procState[item.name]?.hrRate || item.hrRate || item.rate || 0)
                                const setTime = Number(procState[item.name]?.setTime || 0)
                                const setTimeRate = Number(procState[item.name]?.setTimeRate || item.setTimeRate || 0)`
);

content = content.replace(
  /<td className="px-4 py-2 text-right font-mono text-secondary">\{itemRate\}<\/td>\n\s*<td className="px-4 py-2 text-right font-mono font-bold text-primary">\{formatCurrency\(quoHr \* itemRate\)\}<\/td>/g,
  `<td className="px-4 py-2 text-right font-mono text-secondary text-[10px] leading-tight">
                                  <div className="text-amber-600">{formatCurrency(hrRate)}/hr</div>
                                  <div className="text-blue-600">{formatCurrency(setTimeRate)}/set</div>
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-primary">{formatCurrency((quoHr * hrRate) + (setTime * setTimeRate))}</td>`
);

content = content.replace(
  /if \(snap\.procState\) setProcState\(snap\.procState\)\n\s*else setProcState\(initProcState\(\)\)/,
  "if (snap.procState) setProcState(snap.procState)"
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');