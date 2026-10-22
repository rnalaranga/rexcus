async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/production/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test WO',
        customerId: 'CUST-001',
        priority: 'Medium',
        operations: [{ operationName: 'Milling', plannedHours: 2 }]
      })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch(e) {
    console.error(e);
  }
}
run();