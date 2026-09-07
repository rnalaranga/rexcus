import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rex-erp-secret-key-super-secure';

// -- AUTH --
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    
    // Check if user exists
    const [existing]: any = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const id = `USR-${Date.now()}`;
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const userRole = role || 'user';
    
    await db.query('INSERT INTO users SET ?', {
      id, name, username, password_hash, role: userRole, created_at
    });
    
    res.json({ success: true, user: { id, name, username, role: userRole } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [users]: any = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, name: user.name, username: user.username, role: user.role } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- SETTINGS --
app.get('/api/settings', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT id, val FROM settings');
    const settingsObj = rows.reduce((acc: any, row: any) => ({ ...acc, [row.id]: row.val }), {});
    res.json(settingsObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updates = req.body;
    for (const [id, val] of Object.entries(updates)) {
      await db.query('INSERT INTO settings (id, val) VALUES (?, ?) ON DUPLICATE KEY UPDATE val=?', [id, val, val]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- USER MANAGEMENT --
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    const [existing]: any = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = `USR-${Date.now()}`;
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO users SET ?', { id, name, username, password_hash, role: role || 'user', created_at });
    res.json({ success: true, user: { id, name, username, role: role || 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, role } = req.body;
    await db.query('UPDATE users SET name=?, role=? WHERE id=?', [name, role, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash=? WHERE id=?', [password_hash, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- CUSTOMERS --
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers ORDER BY joinDate DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO customers SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE customers SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- LEADS --
app.get('/api/leads', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads ORDER BY lastActivity DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO leads SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE leads SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM leads WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE deals SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM deals WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- DEALS --
app.get('/api/deals', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM deals ORDER BY expectedClose ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/deals', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO deals SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- QUOTATIONS --
app.get('/api/quotations/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const [rows] = await db.query('SELECT * FROM quotations WHERE leadId = ? ORDER BY type ASC, version DESC', [leadId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const data = req.body;
    const qType = data.type || 'customer';
    // Version per leadId+type
    const [rows]: any = await db.query(
      'SELECT MAX(version) as maxVer FROM quotations WHERE leadId = ? AND type = ?',
      [data.leadId, qType]
    );
    const nextVersion = (rows[0].maxVer || 0) + 1;
    
    const newQuotation = {
      id: `QT-${Date.now().toString().slice(-6)}`,
      leadId: data.leadId,
      version: nextVersion,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      data: JSON.stringify(data.data),
      totalAmount: data.totalAmount,
      customAmount: data.customAmount || null,
      type: qType
    };
    
    await db.query('INSERT INTO quotations SET ?', newQuotation);
    res.json({ success: true, quotation: newQuotation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/quotations/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query(
      'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, type=? WHERE id=?',
      [JSON.stringify(data.data), data.totalAmount, data.customAmount || null, data.type || 'customer', id]
    );
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quotations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- INVENTORY --
app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const data = req.body;
    const item = {
      ...data,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO inventory SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE inventory SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// -- STOCK LEDGER --
app.get('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM stock_ledger WHERE inventoryId = ? ORDER BY date DESC, createdAt DESC', [id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Get latest balance
    const [rows]: any = await db.query('SELECT balance FROM stock_ledger WHERE inventoryId = ? ORDER BY date DESC, createdAt DESC LIMIT 1', [id]);
    const currentBalance = rows.length > 0 ? Number(rows[0].balance) : 0;
    
    // Calculate new balance
    const newBalance = currentBalance + (data.type === 'OUT' ? -Number(data.qty) : Number(data.qty));
    
    const entry = {
      inventoryId: id,
      date: data.date,
      type: data.type,
      qty: data.qty,
      balance: newBalance,
      reference: data.reference || '',
      notes: data.notes || '',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    await db.query('INSERT INTO stock_ledger SET ?', entry);
    
    // Also update inventory quantity
    await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newBalance, id]);
    
    res.json({ success: true, entry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// -- SUPPLIERS --
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suppliers ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const data = req.body;
    const item = {
      ...data,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO suppliers SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE suppliers SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- FOLLOWUPS --
app.get('/api/followups', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM followups ORDER BY dueDate ASC, dueTime ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/followups/related/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const [rows] = await db.query('SELECT * FROM followups WHERE relatedType = ? AND relatedId = ? ORDER BY dueDate DESC', [type, id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/followups', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO followups SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/followups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE followups SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/followups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM followups WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- INVOICES --
app.get('/api/invoices', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM invoices ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO invoices SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE invoices SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = req.body;
    
    // Get existing invoice
    const [rows]: any = await db.query('SELECT payments, paidAmount, total FROM invoices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = rows[0];
    const existingPayments = invoice.payments ? JSON.parse(invoice.payments) : [];
    
    // Add new payment
    const newPayment = {
      id: `PAY-${Date.now()}`,
      date: payment.date || new Date().toISOString(),
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference
    };
    
    existingPayments.push(newPayment);
    const newPaidAmount = Number(invoice.paidAmount || 0) + Number(payment.amount);
    const newStatus = newPaidAmount >= Number(invoice.total) ? 'paid' : 'sent';
    
    await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
      JSON.stringify(existingPayments),
      newPaidAmount,
      newStatus,
      id
    ]);
    
    res.json({ success: true, payment: newPayment, newStatus, newPaidAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- SUPPLIER DETAIL (single) --
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]) as any[];
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -- SUPPLIER LEDGER --
app.get('/api/supplier-ledger/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const [rows] = await db.query('SELECT * FROM supplier_ledger WHERE supplierId = ? ORDER BY date DESC', [supplierId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/supplier-ledger', async (req, res) => {
  try {
    const data = req.body;
    const item = {
      ...data,
      id: `SL-${Date.now().toString().slice(-8)}`,
      date: data.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO supplier_ledger SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/supplier-ledger/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM supplier_ledger WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
