const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const badPart = `app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
}
});

} catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});`;

const goodPart = `app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

code = code.replace(badPart, goodPart);
fs.writeFileSync('api/src/server.ts', code);
console.log('done');
