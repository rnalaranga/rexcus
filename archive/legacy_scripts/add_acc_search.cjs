const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add state for accSearch, accOpen, and dispatchedItems
if (!content.includes('const [accSearch, setAccSearch]')) {
  content = content.replace(
    "const [accQty, setAccQty] = useState(1)",
    "const [accQty, setAccQty] = useState(1)\n    const [accSearch, setAccSearch] = useState('')\n    const [accOpen, setAccOpen] = useState(false)\n    const [dispatchedHistory, setDispatchedHistory] = useState<any[]>([])"
  );
}

// 2. Fetch dispatched history when opening the modal
const loadHistoryStr = `
    const openTrackModal = async (row: any) => {
      setTrackWO(row);
      setAccId('');
      setAccSearch('');
      setAccQty(1);
      try {
        const history = await fetch(API + '/inventory/ledger/wo/' + row.id).then(r => r.json());
        setDispatchedHistory(Array.isArray(history) ? history : []);
      } catch(e) {}
    }
`;
if (!content.includes('openTrackModal')) {
  content = content.replace("const handleUpdateOpStatus", loadHistoryStr + "\n    const handleUpdateOpStatus");
}

// Replace setTrackWO in the button
content = content.replace(
  /onClick=\{\(\) => setTrackWO\(row\)\}/g,
  "onClick={() => openTrackModal(row)}"
);

// Reload history when dispatched
const reloadHistory = `
        const history = await fetch(API + '/inventory/ledger/wo/' + trackWO.id).then(r => r.json());
        setDispatchedHistory(Array.isArray(history) ? history : []);
`;
content = content.replace(
  "setAccQty(1);\n        fetchData();",
  "setAccQty(1);\n        setAccSearch('');\n        fetchData();\n" + reloadHistory
);
content = content.replace(
  "alert('Dispatched successfully from stock!');\n        fetchData();",
  "alert('Dispatched successfully from stock!');\n        fetchData();\n" + reloadHistory
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');