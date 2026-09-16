const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add inventory state
if (!content.includes('const [inventory, setInventory]')) {
  content = content.replace(
    "const [quotations, setQuotations] = useState<any[]>([])",
    "const [quotations, setQuotations] = useState<any[]>([])\n    const [inventory, setInventory] = useState<any[]>([])"
  );
}

// 2. Fetch inventory
content = content.replace(
  "fetch(API + '/quotations').then(r => r.json())",
  "fetch(API + '/quotations').then(r => r.json()),\n          fetch(API + '/inventory').then(r => r.json())"
);
content = content.replace(
  "setQuotations(Array.isArray(quoRes) ? quoRes : [])",
  "setQuotations(Array.isArray(quoRes) ? quoRes : [])\n        setInventory(Array.isArray(arguments[0][4]) ? arguments[0][4] : (await fetch(API + '/inventory').then(r=>r.json())))" // HACK
);

// Actually, I'll just do a cleaner replace for fetchData:
const oldFetchData = /const fetchData = async \(\) => \{[\s\S]*?finally \{ setLoading\(false\) \}\s*\}/;

const newFetchData = `const fetchData = async () => {
      setLoading(true)
      try {
        const [woRes, empRes, machRes, quoRes, invRes] = await Promise.all([
          fetch(API + '/production/work-orders').then(r => r.json()),
          fetch(API + '/hr/employees').then(r => r.json()),
          fetch(API + '/production/machineries').then(r => r.json()),
          fetch(API + '/quotations').then(r => r.json()),
          fetch(API + '/inventory').then(r => r.json())
        ])
        setWorkOrders(Array.isArray(woRes) ? woRes : [])
        setEmployees(Array.isArray(empRes) ? empRes : [])
        setMachineries(Array.isArray(machRes) ? machRes : [])
        setQuotations(Array.isArray(quoRes) ? quoRes : [])
        setInventory(Array.isArray(invRes) ? invRes : [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }`;
    
content = content.replace(oldFetchData, newFetchData);

// 3. Dispatch function
const dispatchFunc = `
    const handleDispatch = async (bomItem: any, woId: string) => {
      const invItem = inventory.find(i => i.name.toLowerCase() === bomItem.material.toLowerCase());
      if (!invItem) {
        alert('Material not found in inventory! Cannot automatically dispatch.');
        return;
      }
      if(invItem.quantity < bomItem.qty) {
        if(!confirm(\`Stock is low (\${invItem.quantity}). Dispatch anyway?\`)) return;
      }
      
      try {
        await fetch(API + '/inventory/' + invItem.id + '/ledger', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
             date: new Date().toISOString().split('T')[0],
             type: 'OUT',
             qty: bomItem.qty,
             reference: woId,
             notes: 'Dispatched for Work Order ' + woId
          })
        });
        alert('Dispatched successfully from stock!');
        fetchData();
      } catch(e) {
        alert('Failed to dispatch');
      }
    }
`;

content = content.replace("const handleLogQC", dispatchFunc + "\n    const handleLogQC");

// 4. Update the button
content = content.replace(
  /<button className="text-\[10px\] bg-rex-600 hover:bg-rex-500 text-white px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors">[\s\S]*?Dispatch[\s\S]*?<\/button>/g,
  `<button onClick={() => handleDispatch(b, trackWO.id)} className="text-[10px] bg-rex-600 hover:bg-rex-500 text-white px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors">
     Dispatch
   </button>`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');