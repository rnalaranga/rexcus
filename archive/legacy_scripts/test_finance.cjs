const endpoints = [
  '/api/finance/accounts',
  '/api/finance/taxes',
  '/api/finance/journals',
  '/api/finance/reports/trial-balance',
  '/api/finance/reports/pnl',
  '/api/finance/reports/balance-sheet',
  '/api/finance/dashboard',
  '/api/finance/cost-centers',
  '/api/finance/reports/aged',
  '/api/finance/reports/tax',
  '/api/finance/reports/aging?type=ar',
  '/api/finance/reports/aging?type=ap'
];

async function run() {
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:3000${ep}`);
      const text = await res.text();
      if (!res.ok || text.includes('error') || text.includes('Unknown column')) {
         console.log(`❌ ERROR on ${ep}: ${res.status} -> ${text.substring(0, 100)}`);
      } else {
         console.log(`✅ OK ${ep}`);
      }
    } catch(e) {
      console.log(`❌ CRASH on ${ep}: ${e.message}`);
    }
  }
}
run();