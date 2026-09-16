const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

const regex = /const autoGenerateCustomerQuote = \(\) => \{[\s\S]*?showToast\('success', `✨ Auto-generated Customer Quote with \$\{margin\}% margin!`\);\n\s*\};/;
const regex2 = /const autoGenerateCustomerQuote = \(\) => \{[\s\S]*?showToast\('success', `\? Auto-generated Customer Quote with \$\{margin\}% margin!`\);\n\s*\};/;
const regex3 = /const autoGenerateCustomerQuote = \(\) => \{[\s\S]*?const marginStr = window\.prompt[\s\S]*?setCustItems\(newCustItems\);\n\s*showToast\('success'.*?\);\n\s*\};/;

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

if (regex3.test(content)) {
  content = content.replace(regex3, newLogic);
} else {
  console.log("REGEX FAILED TO MATCH WINDOW.PROMPT LOGIC!");
}

// Update the button onClick handler
content = content.replace(
  "onClick={autoGenerateCustomerQuote} className=\"bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-md\">✨ AI Generate from Job Cost</Button>",
  "onClick={handleOpenMarginModal} className=\"bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-md\">✨ AI Generate from Job Cost</Button>"
);
content = content.replace(
  "onClick={autoGenerateCustomerQuote} className=\"bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-md\">? AI Generate from Job Cost</Button>",
  "onClick={handleOpenMarginModal} className=\"bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-md\">✨ AI Generate from Job Cost</Button>"
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');