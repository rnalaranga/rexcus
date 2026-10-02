import re

with open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import_route = '''
app.post('/api/finance/accounts/import', async (req, res) => {
  try {
    const { accounts } = req.body;
    if (!accounts || !Array.isArray(accounts)) return res.status(400).json({ error: 'Invalid data' });
    
    for (const acc of accounts) {
      const data = {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype || null,
        balance: acc.balance || 0,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      
      const [existing] = await db.query('SELECT id FROM chart_of_accounts WHERE code = ?', [data.code]);
      if (existing.length > 0) {
        data.updatedAt = data.createdAt;
        delete data.createdAt;
        await db.query('UPDATE chart_of_accounts SET ? WHERE id = ?', [data, existing[0].id]);
      } else {
        await db.query('INSERT INTO chart_of_accounts SET ?', data);
      }
    }
    res.json({ success: true, count: accounts.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
'''

idx = content.find("app.post('/api/finance/accounts', ")
if idx != -1:
    content = content[:idx] + import_route + '\n' + content[idx:]
    with open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Import route added')
else:
    print('Could not find anchor to inject import route')
