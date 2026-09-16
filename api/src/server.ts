import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.get('/api/quotations', async (req, res) => {
    try {
      const [rows] = await db.query('SELECT q.*, l.name as leadName, l.company as leadCompany FROM quotations q LEFT JOIN leads l ON q.leadId = l.id ORDER BY q.date DESC');
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

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


app.get('/api/inventory/ledger/wo/:woId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT l.*, i.name as materialName, i.uom as unit FROM stock_ledger l JOIN inventory i ON l.inventoryId = i.id WHERE l.reference = ? ORDER BY l.createdAt DESC',
      [req.params.woId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      if (!data.id) {
        data.id = 'FOL-' + Date.now().toString().slice(-6);
        data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
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


// ==========================================
// FINANCE & ACCOUNTING MODULE
// ==========================================

// Chart of Accounts
app.get('/api/finance/accounts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM chart_of_accounts ORDER BY code ASC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/accounts', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO chart_of_accounts SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/finance/accounts/:id', async (req, res) => {
  try {
    const data = req.body;
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE chart_of_accounts SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Taxes
app.get('/api/finance/taxes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_rates');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/taxes', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO tax_rates SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Journal Entries
app.get('/api/finance/journals', async (req, res) => {
  try {
    const [entries] = await db.query('SELECT * FROM journal_entries ORDER BY date DESC');
    const [lines] = await db.query('SELECT * FROM journal_lines');
    
    // Group lines by entry
    const result = entries.map(entry => {
      entry.lines = lines.filter(l => l.entryId === entry.id);
      return entry;
    });
    res.json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/journals', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id, date, reference, description, totalAmount, lines, createdBy } = req.body;
    
    const entryData = {
      id, date, reference, description, totalAmount, createdBy, status: 'posted',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    await conn.query('INSERT INTO journal_entries SET ?', entryData);
    
    for (const line of lines) {
      await conn.query('INSERT INTO journal_lines SET ?', {
        id: line.id,
        entryId: id,
        accountId: line.accountId, partyType: line.partyType || null, partyId: line.partyId || null, costCenterId: line.costCenterId || null,
        description: line.description || '',
        debit: line.debit || 0,
        credit: line.credit || 0
      });
      
      // Update account balances
      const balanceChange = Number(line.debit || 0) - Number(line.credit || 0);
      
      // Note: In real accounting, Assets/Expenses increase with Debit. Liabilities/Equity/Revenue increase with Credit.
      // For simplicity in this ledger, we just track the raw balance change, or we adjust based on type.
      // Let's adjust based on account type.
      const [accRows] = await conn.query('SELECT type, balance FROM chart_of_accounts WHERE id = ?', [line.accountId]);
      if (accRows.length > 0) {
        const type = accRows[0].type.toLowerCase();
        let isDebitNormal = type.includes('asset') || type.includes('expense');
        // If it's a normal debit account, balance = balance + debit - credit
        // If it's a normal credit account, balance = balance + credit - debit
        let newBalance = Number(accRows[0].balance);
        if (isDebitNormal) {
          newBalance += balanceChange;
        } else {
          newBalance -= balanceChange;
        }
        await conn.query('UPDATE chart_of_accounts SET balance = ? WHERE id = ?', [newBalance, line.accountId]);
      }
    }
    
    await conn.commit();
    res.json({ success: true });
  } catch (error) { 
    await conn.rollback();
    res.status(500).json({ error: error.message }); 
  } finally {
    conn.release();
  }
});



// ==========================================
// FINANCIAL REPORTS (GL, P&L, BS, Trial Balance)
// ==========================================
app.get('/api/finance/reports/trial-balance', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts ORDER BY code ASC');
    const [lines] = await db.query('SELECT accountId, SUM(debit) as totalDebit, SUM(credit) as totalCredit FROM journal_lines GROUP BY accountId');
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    const result = accounts.map(acc => {
      const line = lines.find(l => l.accountId === acc.id) || { totalDebit: 0, totalCredit: 0 };
      const debit = Number(line.totalDebit);
      const credit = Number(line.totalCredit);
      let netDebit = 0;
      let netCredit = 0;
      
      // Calculate net balance for TB
      if (debit > credit) { netDebit = debit - credit; totalDebit += netDebit; }
      else if (credit > debit) { netCredit = credit - debit; totalCredit += netCredit; }
      
      return { ...acc, debit: netDebit, credit: netCredit };
    });
    
    res.json({ accounts: result.filter(a => a.debit > 0 || a.credit > 0), totalDebit, totalCredit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/finance/reports/pnl', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts WHERE type IN ("Revenue", "Expense") ORDER BY code ASC');
    let totalRevenue = 0;
    let totalExpense = 0;
    
    accounts.forEach(acc => {
      if (acc.type === 'Revenue') totalRevenue += Number(acc.balance);
      if (acc.type === 'Expense') totalExpense += Number(acc.balance);
    });
    
    res.json({
      revenue: accounts.filter(a => a.type === 'Revenue'),
      expenses: accounts.filter(a => a.type === 'Expense'),
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/finance/reports/balance-sheet', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts WHERE type IN ("Asset", "Liability", "Equity", "Revenue", "Expense") ORDER BY code ASC');
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    let netProfit = 0;
    
    accounts.forEach(acc => {
      if (acc.type === 'Revenue') netProfit += Number(acc.balance);
      if (acc.type === 'Expense') netProfit -= Number(acc.balance);
      
      if (acc.type === 'Asset') totalAssets += Number(acc.balance);
      if (acc.type === 'Liability') totalLiabilities += Number(acc.balance);
      if (acc.type === 'Equity') totalEquity += Number(acc.balance);
    });
    
    // In BS, Retained Earnings (Net Profit) is added to Equity
    totalEquity += netProfit;
    
    res.json({
      assets: accounts.filter(a => a.type === 'Asset'),
      liabilities: accounts.filter(a => a.type === 'Liability'),
      equity: accounts.filter(a => a.type === 'Equity'),
      totalAssets,
      totalLiabilities,
      totalEquity,
      netProfit,
      isBalanced: totalAssets === (totalLiabilities + totalEquity)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});



// ==========================================
// FINANCE DASHBOARD METRICS
// ==========================================
app.get('/api/finance/dashboard', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts');
    
    let totalCash = 0;
    let totalAR = 0;
    let totalAP = 0;
    let revenue = 0;
    let expenses = 0;
    
    accounts.forEach(acc => {
      const type = acc.type.toLowerCase();
      const subtype = acc.subtype ? acc.subtype.toLowerCase() : '';
      const bal = Number(acc.balance);
      
      if (subtype.includes('bank') || subtype.includes('cash')) totalCash += bal;
      if (subtype.includes('receivable')) totalAR += bal;
      if (subtype.includes('payable') && !subtype.includes('tax')) totalAP += bal;
      if (type === 'revenue') revenue += bal;
      if (type === 'expense') expenses += bal;
    });
    
    const [bills] = await db.query('SELECT SUM(amount) as pendingAP FROM supplier_bills WHERE status = "unpaid"');
    const [invoices] = await db.query('SELECT SUM(total) as pendingAR FROM invoices WHERE status = "unpaid"');

    res.json({
      cash: totalCash,
      ar: totalAR || Number(invoices[0]?.pendingAR || 0),
      ap: totalAP || Number(bills[0]?.pendingAP || 0),
      profit: revenue - expenses,
      revenue,
      expenses
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});



// ==========================================
// ENTERPRISE ACCOUNTING API
// ==========================================
app.get('/api/finance/cost-centers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cost_centers');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/reports/aged', async (req, res) => {
  try {
    // Basic aged logic grouping by party
    const [lines] = await db.query('SELECT jl.*, je.date FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id WHERE jl.partyId IS NOT NULL');
    // In a real system, we cross-reference this against payments to find 'unpaid' portions
    // Here we return the raw tagged lines for the frontend to aggregate
    res.json(lines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ==========================================
// TAX REPORT & CUSTOM REPORT BUILDER
// ==========================================
app.get('/api/finance/reports/tax', async (req, res) => {
  try {
    // Basic tax report logic: Get all tax accounts and their balances
    const [taxAccounts] = await db.query('SELECT * FROM chart_of_accounts WHERE isTaxAccount = true');
    // Also get journal lines hitting tax accounts for detailed breakdown
    const [taxLines] = await db.query('SELECT jl.*, je.date, je.reference FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id JOIN chart_of_accounts ca ON jl.accountId = ca.id WHERE ca.isTaxAccount = true ORDER BY je.date DESC');
    
    let totalTaxPayable = 0;
    taxAccounts.forEach(acc => {
      totalTaxPayable += Number(acc.balance);
    });

    res.json({ taxAccounts, taxLines, totalTaxPayable });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/reports/custom', async (req, res) => {
  try {
    const { startDate, endDate, accountTypes, costCenterId } = req.body;
    let query = 'SELECT jl.*, je.date, je.reference, ca.name as accountName, ca.code as accountCode, ca.type as accountType, cc.name as costCenterName FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id JOIN chart_of_accounts ca ON jl.accountId = ca.id LEFT JOIN cost_centers cc ON jl.costCenterId = cc.id WHERE 1=1';
    const params = [];
    
    if (startDate) { query += ' AND je.date >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND je.date <= ?'; params.push(endDate); }
    if (accountTypes && accountTypes.length > 0) {
      query += ' AND ca.type IN (?)';
      params.push(accountTypes);
    }
    if (costCenterId) { query += ' AND jl.costCenterId = ?'; params.push(costCenterId); }
    
    query += ' ORDER BY je.date DESC';
    const [lines] = await db.query(query, params);
    res.json(lines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



app.get('/api/finance/reports/aging', async (req, res) => {
  try {
    const type = req.query.type; // 'ar' or 'ap'
    let query = '';
    
    if (type === 'ar') {
      query = `
      SELECT 
        jl.partyId,
        p.name as partyName,
        SUM(jl.debit - jl.credit) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) <= 30 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 31 AND 60 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 61 AND 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) > 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90plus'
      FROM journal_lines jl
      JOIN journal_entries je ON jl.entryId = je.id
      JOIN chart_of_accounts ca ON jl.accountId = ca.id
      JOIN customers p ON jl.partyId = p.id 
      WHERE jl.partyType = 'Customer' AND ca.name LIKE '%Receivable%' 
      GROUP BY jl.partyId, p.name 
      HAVING balance > 0
      `;
    } else {
      query = `
      SELECT 
        jl.partyId,
        p.name as partyName,
        SUM(jl.credit - jl.debit) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) <= 30 THEN (jl.credit - jl.debit) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 31 AND 60 THEN (jl.credit - jl.debit) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 61 AND 90 THEN (jl.credit - jl.debit) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) > 90 THEN (jl.credit - jl.debit) ELSE 0 END) as 'bucket90plus'
      FROM journal_lines jl
      JOIN journal_entries je ON jl.entryId = je.id
      JOIN chart_of_accounts ca ON jl.accountId = ca.id
      JOIN suppliers p ON jl.partyId = p.id 
      WHERE jl.partyType = 'Supplier' AND ca.name LIKE '%Payable%' 
      GROUP BY jl.partyId, p.name 
      HAVING balance > 0
      `;
    }
    
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



app.post('/api/finance/cost-centers', async (req, res) => {
  try {
    const { id, code, name, department, isActive } = req.body;
    await db.query(
      'INSERT INTO cost_centers (id, code, name, department, isActive) VALUES (?, ?, ?, ?, ?)',
      [id, code, name, department, isActive]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ==========================================
// PRODUCTION - MACHINERY
// ==========================================
app.get('/api/production/machineries', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machineries ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.put('/api/production/machineries/:id', async (req, res) => {
  try {
    const { status, lastMaintenance } = req.body;
    await db.query(
      'UPDATE machineries SET status = ?, lastMaintenance = ? WHERE id = ?',
      [status, lastMaintenance, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/machineries', async (req, res) => {
  try {
    const { id, name, type, model, status, hourlyCost } = req.body;
    await db.query(
      'INSERT INTO machineries (id, name, type, model, status, hourlyCost, lastMaintenance) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, name, type, model, status, hourlyCost]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});




// ==========================
// SKILLS API
// ==========================
app.get('/api/hr/skills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM skills ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/skills', async (req, res) => {
  try {
    const { id, name, category, description } = req.body;
    await db.query(
      'INSERT INTO skills (id, name, category, description) VALUES (?, ?, ?, ?)',
      [id, name, category, description]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/skills/:id', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    await db.query(
      'UPDATE skills SET name=?, category=?, description=? WHERE id=?',
      [name, category, description, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hr/skills/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee_skills WHERE skillId = ?', [req.params.id]);
    await db.query('DELETE FROM skills WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees/:id/skills', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { skillIds } = req.body;
    
    await db.query('DELETE FROM employee_skills WHERE employeeId = ?', [employeeId]);
    if (skillIds && skillIds.length > 0) {
      const values = skillIds.map(sId => [employeeId, sId]);
      await db.query('INSERT INTO employee_skills (employeeId, skillId) VALUES ?', [values]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// HUMAN RESOURCES (HR) API
// ==========================
app.get('/api/hr/employees', async (req, res) => {
  try {
    const [employees] = await db.query('SELECT * FROM employees ORDER BY createdAt DESC');
    const [machineAssignments] = await db.query('SELECT employeeId, machineId FROM employee_machines');
    const [skillAssignments] = await db.query('SELECT employeeId, skillId FROM employee_skills');
    
    const enriched = employees.map(emp => ({
      ...emp,
      machineIds: machineAssignments.filter(a => a.employeeId === emp.id).map(a => a.machineId),
      skillIds: skillAssignments.filter(a => a.employeeId === emp.id).map(a => a.skillId)
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees', async (req, res) => {
  try {
    const { id, name, role, phone, email, status, skills } = req.body;
    await db.query(
      'INSERT INTO employees (id, name, role, phone, email, status, skills) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, role, phone, email, status, JSON.stringify(skills || [])]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/employees/:id', async (req, res) => {
  try {
    const { name, role, phone, email, status, skills } = req.body;
    await db.query(
      'UPDATE employees SET name=?, role=?, phone=?, email=?, status=?, skills=? WHERE id=?',
      [name, role, phone, email, status, JSON.stringify(skills || []), req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hr/employees/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee_machines WHERE employeeId = ?', [req.params.id]);
    await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees/:id/machines', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { machineIds } = req.body; // Array of machine IDs
    
    await db.query('DELETE FROM employee_machines WHERE employeeId = ?', [employeeId]);
    
    if (machineIds && machineIds.length > 0) {
      const values = machineIds.map(mId => [employeeId, mId]);
      await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES ?', [values]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// PRODUCTION / WORK ORDERS API
// ==========================
app.get('/api/production/work-orders', async (req, res) => {
  try {
    const [wos] = await db.query('SELECT * FROM work_orders ORDER BY createdAt DESC');
    const [ops] = await db.query('SELECT * FROM work_order_operations ORDER BY stepNumber ASC');
    const [qcs] = await db.query('SELECT * FROM qc_inspections');
    
    const enriched = wos.map(wo => ({
      ...wo,
      operations: ops.filter(o => o.workOrderId === wo.id).map(o => ({
        ...o,
        qc: qcs.filter(q => q.operationId === o.id)
      }))
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/work-orders', async (req, res) => {
  try {
    const { title, customerId, priority, deadline, operations, bom, sourceQuoteId, notes, attachments } = req.body;

    // Duplicate check
    if (sourceQuoteId) {
      const [existing] = await db.query('SELECT id FROM work_orders WHERE quoteId = ? LIMIT 1', [sourceQuoteId]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'DUPLICATE', existingId: existing[0].id, message: 'A Work Order already exists for this quotation.' });
      }
    }

    const woId = 'WO-' + Date.now().toString().slice(-5);

    await db.query(
      'INSERT INTO work_orders (id, title, customerId, quoteId, priority, plannedStartDate, deadline, bom, notes, attachments) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
      [woId, title, customerId || null, sourceQuoteId || null, priority || 'Normal', deadline || null, bom ? JSON.stringify(bom) : null, notes || null, attachments ? JSON.stringify(attachments) : null]
    );

    if (operations && operations.length > 0) {
      const opValues = operations.map((op, i) => [
        'OP-' + Date.now().toString().slice(-4) + '-' + i,
        woId, i + 1, op.operationName, op.machineId || null, op.employeeId || null, op.plannedHours || 0
      ]);
      await db.query(
        'INSERT INTO work_order_operations (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours) VALUES ?',
        [opValues]
      );
    }

    res.json({ success: true, id: woId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM work_order_operations WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM work_orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/production/work-orders/:id/attachments', async (req, res) => {
  try {
    const { attachments } = req.body;
    await db.query('UPDATE work_orders SET attachments = ? WHERE id = ?', [JSON.stringify(attachments), req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/production/operations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const opId = req.params.id;
    
    if (status === 'In Progress') {
      await db.query('UPDATE work_order_operations SET status=?, startTime=NOW() WHERE id=?', [status, opId]);
    } else if (status === 'Completed' || status === 'QC Pending') {
      // Calculate actual hours if startTime exists
      await db.query('UPDATE work_order_operations SET status=?, endTime=NOW(), actualHours=TIMESTAMPDIFF(MINUTE, startTime, NOW())/60.0 WHERE id=?', [status, opId]);
    } else {
      await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [status, opId]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/operations/:id/qc', async (req, res) => {
  try {
    const { inspectedBy, status, defectReason, notes } = req.body;
    const qcId = 'QC-' + Date.now().toString().slice(-4);
    const opId = req.params.id;
    
    await db.query(
      'INSERT INTO qc_inspections (id, operationId, inspectedBy, status, defectReason, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [qcId, opId, inspectedBy, status, defectReason, notes]
    );
    
    // Update operation status based on QC
    const nextOpStatus = status === 'Pass' ? 'Completed' : 'Rework Required';
    await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [nextOpStatus, opId]);
    
    if (status === 'Fail') {
       // Log Rework
       await db.query('INSERT INTO rework_logs (id, qcId, status) VALUES (?, ?, ?)', ['RWK-' + Date.now().toString().slice(-4), qcId, 'Pending']);
    }
    
    res.json({ success: true, qcId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});



