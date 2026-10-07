with open('api/src/server.ts', 'r') as f:
    code = f.read()

get_logic = """
    const [rows] = await db.query('SELECT * FROM customers ORDER BY joinDate DESC') as any[];
    for (const r of rows) {
      if (typeof r.contacts === 'string') {
        try { r.contacts = JSON.parse(r.contacts); } catch(e) { r.contacts = []; }
      }
    }
    res.json(rows);
"""
code = code.replace("const [rows] = await db.query('SELECT * FROM customers ORDER BY joinDate DESC');\n    res.json(rows);", get_logic.strip())

with open('api/src/server.ts', 'w') as f:
    f.write(code)

