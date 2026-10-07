const fs = require('fs');
const file = 'api/src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `
            if (tax1Amt > 0) {
              let tax1AccId = prof.tax1_accountId;
              if (!tax1AccId) {
                const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
                tax1AccId = defTax[0]?.id;
              }
              if (tax1AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, tax1AccId, 0, tax1Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax1Amt, tax1AccId]);
              }
            }
            if (tax2Amt > 0) {
              let tax2AccId = prof.tax2_accountId;
              if (!tax2AccId) {
                const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR name LIKE "%VAT%" OR code = "2200" LIMIT 1') as any;
                tax2AccId = defTax[0]?.id;
              }
              if (tax2AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '4', jeId, tax2AccId, 0, tax2Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax2Amt, tax2AccId]);
              }
            }
          }
        } else if (Number(data.taxAmount) > 0) {
          // Fallback: generic tax payable
          const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
          if (taxAcc[0]) {
            lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAcc[0].id, 0, Number(data.taxAmount), null, null]);
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [Number(data.taxAmount), taxAcc[0].id]);
          }
        }
`;

const replaceWith = `
            let getOrCreateTaxAcc = async () => {
              const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
              if (defTax[0]) return defTax[0].id;
              const newId = 'ACC-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*10);
              await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "2200", "Tax Payable", "Liability", "Tax", 0, NOW())', [newId]);
              return newId;
            };

            if (tax1Amt > 0) {
              let tax1AccId = prof.tax1_accountId;
              if (!tax1AccId) tax1AccId = await getOrCreateTaxAcc();
              if (tax1AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, tax1AccId, 0, tax1Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax1Amt, tax1AccId]);
              }
            }
            if (tax2Amt > 0) {
              let tax2AccId = prof.tax2_accountId;
              if (!tax2AccId) tax2AccId = await getOrCreateTaxAcc();
              if (tax2AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '4', jeId, tax2AccId, 0, tax2Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax2Amt, tax2AccId]);
              }
            }
          }
        } else if (Number(data.taxAmount) > 0) {
          // Fallback: generic tax payable
          let getOrCreateTaxAcc = async () => {
              const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
              if (defTax[0]) return defTax[0].id;
              const newId = 'ACC-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*10);
              await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "2200", "Tax Payable", "Liability", "Tax", 0, NOW())', [newId]);
              return newId;
          };
          const taxAccId = await getOrCreateTaxAcc();
          if (taxAccId) {
            lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAccId, 0, Number(data.taxAmount), null, null]);
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [Number(data.taxAmount), taxAccId]);
          }
        }
`;

if (code.includes('if (tax1Amt > 0) {')) {
  const c1 = code.split('if (tax1Amt > 0) {');
  const c2 = c1[1].split('await db.query(\'INSERT INTO journal_lines');
  code = c1[0] + replaceWith + '        await db.query(\'INSERT INTO journal_lines' + c2[1];
  fs.writeFileSync(file, code);
  console.log("Patched successfully");
} else {
  console.log("Could not find patch location");
}
