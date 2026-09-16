const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

if (!content.includes('const [accId, setAccId]')) {
  content = content.replace(
    "const [trackWO, setTrackWO] = useState<any>(null)",
    "const [trackWO, setTrackWO] = useState<any>(null)\n    const [accId, setAccId] = useState('')\n    const [accQty, setAccQty] = useState(1)"
  );
}

const dispatchAccFunc = `
    const handleDispatchAccessory = async () => {
      if (!accId || accQty <= 0) return;
      const invItem = inventory.find(i => i.id === accId);
      if (!invItem) return;
      
      if(invItem.quantity < accQty) {
        if(!confirm(\`Stock is low (\${invItem.quantity}). Dispatch anyway?\`)) return;
      }
      
      try {
        await fetch(API + '/inventory/' + invItem.id + '/ledger', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
             date: new Date().toISOString().split('T')[0],
             type: 'OUT',
             qty: accQty,
             reference: trackWO.id,
             notes: 'Accessory Dispatched for Work Order ' + trackWO.id
          })
        });
        alert('Accessory dispatched successfully!');
        setAccId('');
        setAccQty(1);
        fetchData();
      } catch(e) {
        alert('Failed to dispatch accessory');
      }
    }
`;
if (!content.includes('handleDispatchAccessory')) {
  content = content.replace("const handleDispatch = async", dispatchAccFunc + "\n    const handleDispatch = async");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');