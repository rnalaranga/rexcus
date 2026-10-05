import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'r', 'utf-8') as f:
    content = f.read()

target = """app.post('/api/crm/grns', async (req, res) => {
  try {
    const data = req.body;
    const item = {
      ...data,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO customer_grns SET ?', item);"""

replacement = """app.post('/api/crm/grns', async (req, res) => {
  try {
    const data = req.body;
    
    // Auto-generate GRN ID (S-XXXX)
    let grnId = data.id;
    if (!grnId) {
      const [countResult] = await db.query('SELECT COUNT(*) as c FROM customer_grns');
      const nextNum = (countResult[0].c || 0) + 1;
      grnId = 'S-' + nextNum.toString().padStart(4, '0');
    }

    const item = {
      ...data,
      id: grnId,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO customer_grns SET ?', item);"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched successfully")
else:
    print("Target not found")

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'w', 'utf-8') as f:
    f.write(content)