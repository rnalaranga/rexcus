import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

find_post = """    // Auto-create customer
    const custId = data.id.replace('LEAD', 'CUST');
    const custData = {
      id: custId,
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      vat: data.vat,
      svat: data.svat,
      status: 'active',
      joinDate: new Date()
    };
    await db.query('INSERT IGNORE INTO customers SET ?', custData);
    
    res.json({ success: true, id: data.id, customerId: custId });"""

rep_post = """    res.json({ success: true, id: data.id });"""

content = content.replace(find_post, rep_post)

find_put = """    // Auto-update customer
    const custId = id.replace('LEAD', 'CUST');
    const custData = {
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      vat: data.vat,
      svat: data.svat
    };
    await db.query('UPDATE customers SET ? WHERE id = ?', [custData, custId]);
    res.json({ success: true, id });"""

rep_put = """    res.json({ success: true, id });"""

content = content.replace(find_put, rep_put)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Removed backend auto-customer creation")
