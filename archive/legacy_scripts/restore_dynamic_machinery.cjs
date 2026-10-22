const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// 1. Add import
if (!content.includes('useMachiningOperations')) {
  content = content.replace(
    "import { useLeads, useInventory } from '@/hooks/useData'",
    "import { useLeads, useInventory, useMachiningOperations } from '@/hooks/useData'"
  );
}

// 2. Remove static EXCEL_PROCESSES block
const excelBlockRegex = /const EXCEL_PROCESSES = \[\s*[\s\S]*?return init\n\}/;
content = content.replace(excelBlockRegex, "");

// 3. procState initialization
content = content.replace(
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate: number }>>(initProcState)",
  "const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate?: number; hrRate?: number; setTimeRate?: number }>>({})"
);

// 4. Inject dynamic EXCEL_PROCESSES and useEffect inside the component (find const lead =)
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

// 5. Replace calculation inside Map
const mapSubTotal = "const subTotal = (Number(st.quoHr || 0) + Number(st.setTime || 0)) * st.rate";
content = content.replace(
  mapSubTotal,
  `const hrRate = Number(st.hrRate || proc.hrRate || proc.rate || 0)
                            const setTimeRate = Number(st.setTimeRate || proc.setTimeRate || 0)
                            const subTotal = (Number(st.quoHr || 0) * hrRate) + (Number(st.setTime || 0) * setTimeRate)`
);

// 6. Replace totalMachiningCost
content = content.replace(
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + (Number(p.quoHr) + Number(p.setTime)) * Number(p.rate), 0)",
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0)"
);

// 7. Update columns in rendering
content = content.replace(
  '<th className="px-3 py-2.5 w-32">Hr Rate</th>',
  '<th className="px-3 py-2.5 w-48">Rates</th>'
);
content = content.replace(
  '<td className="px-3 py-1.5 text-xs text-muted font-mono border-l border-theme-subtle/30">Rs. {st.rate.toLocaleString()}</td>',
  `<td className="px-3 py-1.5 text-[10px] text-muted font-mono border-l border-theme-subtle/30 whitespace-nowrap">
                                  <div className="flex gap-2 justify-end">
                                    <span className="text-amber-600 font-bold">Rs. {hrRate.toLocaleString()}/hr</span>
                                    <span className="text-muted/40">|</span>
                                    <span className="text-blue-600 font-bold">Rs. {setTimeRate.toLocaleString()}/set</span>
                                  </div>
                                </td>`
);

// 8. Snapshot fix (removing initProcState fallback)
content = content.replace(
  "if (snap.procState) setProcState(snap.procState)\n      else setProcState(initProcState())",
  "if (snap.procState) setProcState(snap.procState)"
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');