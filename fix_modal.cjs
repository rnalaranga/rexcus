const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// 1. Add states
content = content.replace(
  "const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)",
  "const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)\n  const [showMarginModal, setShowMarginModal] = useState(false)\n  const [marginInput, setMarginInput] = useState('35')"
);

// 2. Replace autoGenerateCustomerQuote and add handleOpenMarginModal
const autoGenRegex = /const autoGenerateCustomerQuote = \(\) => \{[\s\S]*?showToast\('success', `✨ Auto-generated Customer Quote with \$\{margin\}% margin!`\);\n\s*\};/;

const newLogic = `const autoGenerateCustomerQuote = () => {
    const margin = Number(marginInput);
    if (isNaN(margin) || margin < 0) {
      showToast('error', 'Invalid margin percentage!');
      return;
    }
    
    const cost = totalMaterialCost + totalMachiningCost;
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
    setShowMarginModal(false);
    showToast('success', \`✨ Auto-generated Customer Quote with \${margin}% margin!\`);
  };

  const handleOpenMarginModal = () => {
    if (jobItems.length === 0 || (!jobItems[0].text && jobItems.length === 1)) {
      showToast('error', 'Please fill out Job Scope / Descriptions first!');
      return;
    }
    if ((totalMaterialCost + totalMachiningCost) === 0) {
       showToast('error', 'Please complete the Job Costing (Material/Machining) first to generate a price!');
       return;
    }
    setShowMarginModal(true);
  };`;

content = content.replace(autoGenRegex, newLogic);

// 3. Update the button onClick handler
content = content.replace(
  "onClick={autoGenerateCustomerQuote}",
  "onClick={handleOpenMarginModal}"
);

// 4. Add the Modal component at the end
const modalMarkup = `
      <Modal isOpen={showMarginModal} onClose={() => setShowMarginModal(false)} title="✨ AI Quote Generation" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-xs text-secondary leading-relaxed bg-blue-500/10 text-blue-600 p-3 rounded-xl border border-blue-500/20">
            The system will calculate the target price using your Job Costing and append the exact materials and processes used to the customer quote description.
          </p>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1.5">Desired Profit Margin (%)</label>
            <input 
              type="number" 
              className="w-full input-base font-bold text-lg" 
              value={marginInput} 
              onChange={e => setMarginInput(e.target.value)} 
              placeholder="e.g. 35"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-theme-subtle">
            <Button variant="ghost" onClick={() => setShowMarginModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={autoGenerateCustomerQuote} className="bg-gradient-to-r from-purple-500 to-indigo-500 border-0">Generate Quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default QuotationBuilder
`;

content = content.replace(
  /    <\/div>\n  \)\n\}\n$/,
  modalMarkup
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');