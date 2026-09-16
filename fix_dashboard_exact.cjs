const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

// Find the index of app.get('/api/finance/dashboard'
const startIdx = content.indexOf("app.get('/api/finance/dashboard', async (req, res) => {");
if (startIdx === -1) {
  console.log("Could not find start index");
  process.exit(1);
}

// Find the next route to determine end
const endIdx = content.indexOf("app.get('/api/finance/cost-centers',", startIdx);
if (endIdx === -1) {
  console.log("Could not find end index");
  process.exit(1);
}

// Extract everything before and after
const before = content.slice(0, startIdx);
const after = content.slice(endIdx);

const newDashboard = `app.get('/api/finance/dashboard', async (req, res) => {
    try {
      const [accounts] = await db.query(\`
        SELECT a.id, a.code, a.name, a.type, 
               COALESCE(SUM(l.debit), 0) as totalDebit, 
               COALESCE(SUM(l.credit), 0) as totalCredit
        FROM chart_of_accounts a
        LEFT JOIN journal_lines l ON a.id = l.accountId
        GROUP BY a.id
      \`);
      
      let totalCash = 0;
      let totalAR = 0;
      let totalAP = 0;
      let revenue = 0;
      let expenses = 0;
      
      (accounts as any[]).forEach((acc: any) => {
        const type = acc.type.toLowerCase();
        const name = acc.name.toLowerCase();
        
        let bal = 0;
        if (type === 'asset' || type === 'expense') {
           bal = acc.totalDebit - acc.totalCredit;
        } else {
           bal = acc.totalCredit - acc.totalDebit;
        }
        
        if (name.includes('bank') || name.includes('cash')) totalCash += bal;
        if (name.includes('receivable')) totalAR += bal;
        if (name.includes('payable') && !name.includes('tax')) totalAP += bal;
        if (type === 'revenue') revenue += bal;
        if (type === 'expense') expenses += bal;
      });
      
      const [bills] = await db.query('SELECT SUM(amount) as pendingAP FROM supplier_bills WHERE status = "unpaid"');
      const [invoices] = await db.query('SELECT SUM(amount) as pendingAR FROM invoices WHERE status = "unpaid"');
  
      res.json({
        cash: totalCash,
        ar: totalAR || Number((invoices as any[])[0]?.pendingAR || 0),
        ap: totalAP || Number((bills as any[])[0]?.pendingAP || 0),
        profit: revenue - expenses,
        revenue,
        expenses
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // COST CENTERS
  // ==========================================
  `;

fs.writeFileSync('api/src/server.ts', before + newDashboard + after, 'utf8');