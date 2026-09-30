const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Dashboard.tsx', 'utf8');

const replacement = `
    const monthlyRevenue = (() => {
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          monthNum: d.getMonth(),
          year: d.getFullYear(),
          revenue: 0,
          target: 2000000
        });
      }

      deals.filter(d => String(d.stage).toLowerCase().includes('won')).forEach(d => {
        const dDate = new Date(d.expectedClose || d.lastUpdated || new Date());
        const m = months.find(x => x.monthNum === dDate.getMonth() && x.year === dDate.getFullYear());
        if (m) {
          m.revenue += Number(d.value || 0);
        }
      });

      return months;
    })();
`;

code = code.replace(/const monthlyRevenue = \[[^\]]*\]/, replacement);

fs.writeFileSync('src/pages/crm/Dashboard.tsx', code);
console.log('done');
