const fs = require('fs');
let code = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add quotations state
if (!code.includes('const [quotations, setQuotations]')) {
  code = code.replace(
    'const [machineries, setMachineries] = useState<any[]>([])',
    'const [machineries, setMachineries] = useState<any[]>([])\n  const [quotations, setQuotations] = useState<any[]>([])'
  );
}

// 2. Fetch quotations
if (!code.includes("fetch(`${API}/quotations`)")) {
  code = code.replace(
    "fetch(`${API}/production/machineries`).then(r => r.json())",
    "fetch(`${API}/production/machineries`).then(r => r.json()),\n        fetch(`${API}/quotations`).then(r => r.json())"
  );
  code = code.replace(
    "setMachineries(Array.isArray(machRes) ? machRes : [])",
    "setMachineries(Array.isArray(machRes) ? machRes : [])\n      const qRes = arguments[0][3] || []\n      setQuotations(Array.isArray(qRes) ? qRes : [])"
  );
  // Actually, I'll rewrite the fetchData block safely with regex replacement of the entire function block.
}
