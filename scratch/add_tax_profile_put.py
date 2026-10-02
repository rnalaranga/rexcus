import sys

# 1. Add PUT route to server.ts
with open('api/src/server.ts', 'r') as f:
    content = f.read()

find_del = "app.delete('/api/finance/tax-profiles/:id', async (req, res) => {"
new_put = """app.put('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE tax_profiles SET ? WHERE id = ?', [data, id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

""" + find_del

content = content.replace(find_del, new_put)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Added PUT /api/finance/tax-profiles/:id to server.ts")

# 2. Add updateTaxProfile to api.ts
with open('src/lib/api.ts', 'r') as f:
    content = f.read()

find_create = "export const createTaxProfile = (data: any) => fetchJSON('/api/finance/tax-profiles', { method: 'POST', body: JSON.stringify(data) });"
new_update = find_create + "\nexport const updateTaxProfile = (id: string, data: any) => fetchJSON(`/api/finance/tax-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) });"
content = content.replace(find_create, new_update)

with open('src/lib/api.ts', 'w') as f:
    f.write(content)
print("Added updateTaxProfile to api.ts")
