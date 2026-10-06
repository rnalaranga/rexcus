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


// ==========================
// MACHINING OPERATIONS API
// ==========================
app.get('/api/machining-operations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machining_operations ORDER BY groupName ASC, name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/machining-operations', async (req, res) => {
  try {
    const { groupName, name, hrRate, setTimeRate, machineId } = req.body;
    const [result] = await db.query(
      'INSERT INTO machining_operations (groupName, name, hrRate, setTimeRate, machineId) VALUES (?, ?, ?, ?, ?)',
      [groupName, name, hrRate || 0, setTimeRate || 0, machineId || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/machining-operations/:id', async (req, res) => {
  try {
    const { groupName, name, hrRate, setTimeRate, machineId } = req.body;
    await db.query(
      'UPDATE machining_operations SET groupName=?, name=?, hrRate=?, setTimeRate=?, machineId=? WHERE id=?',
      [groupName, name, hrRate || 0, setTimeRate || 0, machineId || null, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/machining-operations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM machining_operations WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// MACHINE CATEGORIES API
// ==========================
app.get('/api/production/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machine_categories ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const id = 'CAT-' + Math.random().toString(36).substr(2, 6);
    await db.query(
      'INSERT INTO machine_categories (id, name, createdAt) VALUES (?, ?, NOW())',
      [id, name]
    );
    res.json({ success: true, id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/production/categories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM machine_categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// MACHINE OPERATORS API
// ==========================
app.get('/api/production/machineries/:id/operators', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT employeeId FROM employee_machines WHERE machineId=?', [req.params.id]);
    res.json(rows.map(r => r.employeeId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/machineries/:id/operators', async (req, res) => {
    try {
      const machineId = req.params.id;
      const { employeeIds } = req.body;
      await db.query('DELETE FROM employee_machines WHERE machineId=?', [machineId]);
      
      if (employeeIds && employeeIds.length > 0) {
        for (const empId of employeeIds) {
          try {
            await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES (?, ?)', [empId, machineId]);
          } catch(e) {
            if (e.message.includes('createdAt') || e.message.includes('Field \'createdAt\' doesn\'t have a default value')) {
              await db.query('INSERT INTO employee_machines (employeeId, machineId, createdAt) VALUES (?, ?, NOW())', [empId, machineId]);
            } else {
              throw e;
            }
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Operators POST Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rex-erp-secret-key-super-secure';

// -- AUTH --
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password, role, prefix } = req.body;
    
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
      user: { id: user.id, name: user.name, username: user.username, role: user.role, prefix: user.prefix } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


// ==========================
// FIX DB ROUTE (Safe Schema Sync)
// ==========================
app.post('/api/settings/fix-db', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, '../../fix_db_schema.sql');
    
    const dbObj = require('./db').default || require('./db');

    if (fs.existsSync(sqlFile)) {
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
      
      for (const stmt of statements) {
        try {
          await dbObj.query(stmt);
        } catch (err) {
          // Ignore
        }
      }
    }

    // Safe schema patches
    const patches = [
      "ALTER TABLE chart_of_accounts ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00",
      "ALTER TABLE chart_of_accounts ADD COLUMN subtype VARCHAR(50)",
      "ALTER TABLE tax_rates ADD COLUMN accountId VARCHAR(50)",
      "ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT 'posted'",
      "ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT 'Draft'",
      "ALTER TABLE customers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
      "ALTER TABLE customers ADD COLUMN paymentTerms TEXT",
      "ALTER TABLE customers ADD COLUMN deliveryTerms TEXT",
            "ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
      "ALTER TABLE customer_grns ADD COLUMN status VARCHAR(50) DEFAULT 'In Stock'"
    ];

    for (const patch of patches) {
      try {
        await dbObj.query(patch);
      } catch (err) {
        // Ignore
      }
    }

    res.json({ success: true, message: 'Database fixed and synchronized successfully. No data was deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- USER MANAGEMENT --
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, username, role, prefix, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, username, password, role, prefix } = req.body;
    const [existing]: any = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = `USR-${Date.now()}`;
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO users SET ?', { id, name, username, password_hash, role: role || 'user', prefix: prefix || null, created_at });
    res.json({ success: true, user: { id, name, username, role: role || 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, role, prefix } = req.body;
    await db.query('UPDATE users SET name=?, role=?, prefix=? WHERE id=?', [name, role, prefix || null, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- CUSTOMERS --
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers ORDER BY joinDate DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


app.post('/api/customers', async (req, res) => {
  try {
    const data = { ...req.body };
    let isPending = false;
    
    if (data.creditLimit && Number(data.creditLimit) > 0) {
      data.pendingCreditLimit = data.creditLimit;
      data.creditLimit = 0;
      isPending = true;
    }
    
    if (data.requiresAdvance) {
      data.pendingRequiresAdvance = 1;
      data.requiresAdvance = 0;
      isPending = true;
    }

    if (data.creditDays && Number(data.creditDays) !== 30) {
      data.pendingCreditDays = data.creditDays;
      data.creditDays = 30;
      isPending = true;
    }

    data.creditLimitStatus = isPending ? 'pending' : 'approved';

    const [result] = await db.query('INSERT INTO customers SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    
    const [existingRows] = await db.query('SELECT creditLimit, requiresAdvance, creditDays FROM customers WHERE id = ?', [id]);
    if (existingRows.length > 0) {
       const existing = existingRows[0];
       let isPending = false;

       if (data.creditLimit !== undefined && Number(data.creditLimit) !== Number(existing.creditLimit)) {
          data.pendingCreditLimit = data.creditLimit;
          data.creditLimit = existing.creditLimit;
          isPending = true;
       }
       
       if (data.requiresAdvance !== undefined && Boolean(data.requiresAdvance) !== Boolean(existing.requiresAdvance)) {
          data.pendingRequiresAdvance = data.requiresAdvance ? 1 : 0;
          data.requiresAdvance = existing.requiresAdvance;
          isPending = true;
       }

       if (data.creditDays !== undefined && Number(data.creditDays) !== Number(existing.creditDays)) {
          data.pendingCreditDays = data.creditDays;
          data.creditDays = existing.creditDays;
          isPending = true;
       }

       if (isPending) {
         data.creditLimitStatus = 'pending';
       }
    }

    await db.query('UPDATE customers SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/customers/:id/approve-credit', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (status === 'approved') {
      await db.query(`UPDATE customers SET 
        creditLimit = IF(pendingCreditLimit IS NOT NULL AND pendingCreditLimit > 0, pendingCreditLimit, creditLimit), 
        pendingCreditLimit = 0, 
        requiresAdvance = IF(pendingRequiresAdvance IS NOT NULL, pendingRequiresAdvance, requiresAdvance),
        pendingRequiresAdvance = NULL,
        creditDays = IF(pendingCreditDays IS NOT NULL AND pendingCreditDays > 0, pendingCreditDays, creditDays),
        pendingCreditDays = NULL,
        creditLimitStatus = 'approved' 
        WHERE id = ?`, [id]);
    } else if (status === 'rejected') {
      await db.query(`UPDATE customers SET 
        pendingCreditLimit = 0, 
        pendingRequiresAdvance = NULL,
        pendingCreditDays = NULL,
        creditLimitStatus = 'approved' 
        WHERE id = ?`, [id]); 
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- LEADS --
app.get('/api/leads', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads ORDER BY lastActivity DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO leads SET ?', data);
    
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM leads WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM deals WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- DEALS --
app.get('/api/deals', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM deals ORDER BY expectedClose ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/deals', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO deals SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- QUOTATIONS --
app.get('/api/quotations', async (req, res) => {
    try {
      const [rows] = await db.query('SELECT q.*, l.name as leadName, l.company as leadCompany FROM quotations q LEFT JOIN leads l ON q.leadId = l.id ORDER BY q.date DESC');
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
    }
});

app.get('/api/quotations/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const [rows] = await db.query('SELECT * FROM quotations WHERE leadId = ? ORDER BY type ASC, version DESC', [leadId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const data = req.body;
    const qType = data.type || 'customer';
    
    if (qType === 'draft') {
      const [existing]: any = await db.query(
        'SELECT id FROM quotations WHERE leadId = ? AND type = ? LIMIT 1',
        [data.leadId, 'draft']
      );
      if (existing && existing.length > 0) {
        const draftId = existing[0].id;
        await db.query(
          'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, date=? WHERE id=?',
          [JSON.stringify(data.data), data.totalAmount, data.customAmount || null, new Date().toISOString().slice(0, 19).replace('T', ' '), draftId]
        );
        return res.json({ success: true, quotation: { id: draftId, version: 1, type: 'draft' } });
      }
    }

    // Version per leadId+type
    const [rows]: any = await db.query(
      'SELECT MAX(version) as maxVer FROM quotations WHERE leadId = ? AND type = ?',
      [data.leadId, qType]
    );
    const nextVersion = (qType === 'draft') ? 1 : ((rows[0].maxVer || 0) + 1);
    
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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

app.put('/api/quotations/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quotations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- CUSTOMER GRNS --
app.get('/api/crm/grns', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT g.*, l.name as leadName, c.name as customerName 
      FROM customer_grns g 
      LEFT JOIN leads l ON g.leadId = l.id 
      LEFT JOIN customers c ON l.customerId = c.id 
      ORDER BY g.createdAt DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/crm/grns/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const [rows] = await db.query('SELECT * FROM customer_grns WHERE quoteId = ? ORDER BY createdAt DESC', [quoteId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crm/grns', async (req, res) => {
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
    await db.query('INSERT INTO customer_grns SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/crm/grns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE customer_grns SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- INVENTORY --
app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});
// -- STOCK LEDGER --
app.get('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM stock_ledger WHERE inventoryId = ? ORDER BY date DESC', [id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


app.get('/api/inventory/ledger/wo/:woId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT l.*, i.name as materialName, i.uom as unit FROM stock_ledger l JOIN inventory i ON l.inventoryId = i.id WHERE l.reference = ? ORDER BY l.date DESC',
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
    
    const entry = {
        id: 'LGR-' + Date.now().toString().slice(-5),
        inventoryId: id,
        date: data.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        type: data.type,
        qty: data.qty,
        reference: data.reference || '',
        notes: data.notes || ''
      };
    
    await db.query('INSERT INTO stock_ledger SET ?', entry);
    
    // Also update inventory quantity
    await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newBalance, id]);
    
    res.json({ success: true, entry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- PURCHASING --
app.get('/api/purchasing/mrs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM material_requests ORDER BY date DESC, createdAt DESC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/purchasing/mrs', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO material_requests SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.put('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    await db.query('UPDATE material_requests SET ? WHERE id = ?', [req.body, req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/pos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM purchase_orders ORDER BY date DESC, createdAt DESC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/purchasing/pos', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO purchase_orders SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.put('/api/purchasing/pos/:id', async (req, res) => {
  try {
    await db.query('UPDATE purchase_orders SET ? WHERE id = ?', [req.body, req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/grns', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM grns ORDER BY date DESC, createdAt DESC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/purchasing/grns', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO grns SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.put('/api/purchasing/grns/:id', async (req, res) => {
  try {
    await db.query('UPDATE grns SET ? WHERE id = ?', [req.body, req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/bills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM supplier_bills ORDER BY date DESC, createdAt DESC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/purchasing/bills', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO supplier_bills SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.put('/api/purchasing/bills/:id', async (req, res) => {
  try {
    await db.query('UPDATE supplier_bills SET ? WHERE id = ?', [req.body, req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// -- SUPPLIERS --
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suppliers ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- FOLLOWUPS --
app.get('/api/followups', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM followups ORDER BY dueDate ASC, dueTime ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/followups/related/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const [rows] = await db.query('SELECT * FROM followups WHERE relatedType = ? AND relatedId = ? ORDER BY dueDate DESC', [type, id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/followups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM followups WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- INVOICES --
app.get('/api/invoices', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM invoices ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO invoices SET ?', data);
    
    // Auto GL: Accrual Basis - Record Receivable & Sales
    try {
      const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
      const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
      let [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1');
      
      if (arAcc.length === 0) {
        const arId = 'ACC-' + Date.now().toString().slice(-6);
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }
      
      if (arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        const invTotal = Number(data.total) || 0;
        const invTax = Number(data.taxAmount) || 0;
        const invSub = Number(data.subtotal) || invTotal;
        
        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Issued', totalAmount: invTotal });
        
        const lines = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, data.customerId, 'Customer']
        ];
        
        if (invTax > 0 && taxAcc.length > 0) {
          lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAcc[0].id, 0, invTax, null, null]);
        }
        
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTotal, arAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invSub, salesAcc[0].id]);
        if (invTax > 0 && taxAcc.length > 0) {
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTax, taxAcc[0].id]);
        }
      }
    } catch(e) { console.error('Auto GL Invoice Error:', e); }

    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the invoice before deleting to get its payments and amounts
    const [rows]: any = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = rows[0];
    const existingPayments = invoice.payments ? JSON.parse(invoice.payments) : [];
    
    // References to reverse from GL
    const references = [id];
    existingPayments.forEach((p: any) => references.push(p.id));
    
    // Find Journal Entries to delete
    if (references.length > 0) {
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference IN (?)', [references]);
      
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        
        // Find Journal Lines to reverse balances
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        
        // Generic GL Reversal
        try {
          // Find all lines and accounts
          for (const line of lines) {
            const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
            if (!accounts.length) continue;
            
            const accType = accounts[0].type;
            const isDebitNormal = accType === 'Asset' || accType === 'Expense';
            const balanceChange = Number(line.debit) - Number(line.credit); // What this line originally added to the normal balance
            
            if (isDebitNormal) {
              await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
            } else {
              // for credit normal, it added -balanceChange
              await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [balanceChange, line.accountId]);
            }
          }
        } catch(e) { console.error('Error reversing GL on Invoice Deletion:', e); }
        
        // Delete the journal lines and entries
        await db.query('DELETE FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        await db.query('DELETE FROM journal_entries WHERE id IN (?)', [jeIds]);
      }
    }
    
    // Finally delete the invoice
    await db.query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = req.body;
    
    // Get existing invoice
    const [rows]: any = await db.query('SELECT payments, paidAmount, subtotal, taxAmount, total, customerId FROM invoices WHERE id = ?', [id]);
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

      // Auto GL: Accrual Basis - Record Payment (Debit Cash, Credit AR)
      try {
        let [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
        let [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1');
        
        if (cashAcc.length === 0) {
          const cashId = 'ACC-' + Date.now().toString().slice(-6);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1000", "Cash and Equivalents", "Asset", "Cash", 0, NOW())', [cashId]);
          cashAcc = [{ id: cashId }];
        }
        if (arAcc.length === 0) {
          const arId = 'ACC-' + Date.now().toString().slice(-6);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
          arAcc = [{ id: arId }];
        }
        
        if (cashAcc.length > 0 && arAcc.length > 0) {
          const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
          const pmtAmount = Number(payment.amount);
          
          await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: newPayment.date, reference: newPayment.id, description: 'Auto GL: Invoice Payment Received', totalAmount: pmtAmount });
          
          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, cashAcc[0].id, pmtAmount, 0, null, null],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, arAcc[0].id, 0, pmtAmount, invoice.customerId || null, 'Customer']
          ];
          
          await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
          
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtAmount, cashAcc[0].id]);
          await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [pmtAmount, arAcc[0].id]); // Credit AR reduces asset balance
        }
      } catch (e) { console.error('Auto GL Payment Error:', e); }
    
    res.json({ success: true, payment: newPayment, newStatus, newPaidAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/supplier-ledger/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM supplier_ledger WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
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

app.delete('/api/finance/accounts/:id', async (req, res) => {
  try {
    const [used] = await db.query('SELECT COUNT(*) as cnt FROM journal_lines WHERE accountId = ?', [req.params.id]);
    if (used[0].cnt > 0) return res.status(400).json({ error: 'Account has transactions and cannot be deleted.' });
    await db.query('DELETE FROM chart_of_accounts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/accounts/:id/ledger', async (req, res) => {
  try {
    const [account] = await db.query('SELECT * FROM chart_of_accounts WHERE id = ?', [req.params.id]);
    const [lines] = await db.query(
      `SELECT jl.*, je.date, je.reference, je.description as entryDescription
       FROM journal_lines jl
       JOIN journal_entries je ON jl.entryId = je.id
       WHERE jl.accountId = ?
       ORDER BY je.date ASC`,
      [req.params.id]
    );
    // Calculate running balance
    let runningBalance = 0;
    const acc = account[0];
    const isDebitNormal = acc && (acc.type === 'Asset' || acc.type === 'Expense');
    const linesWithBalance = lines.map((l: any) => {
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      if (isDebitNormal) runningBalance += debit - credit;
      else runningBalance += credit - debit;
      return { ...l, runningBalance };
    });
    res.json({ account: acc, lines: linesWithBalance });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/party/:id/ledger', async (req, res) => {
  try {
    const [lines] = await db.query(
      `SELECT jl.*, je.date, je.reference, je.description as entryDescription
       FROM journal_lines jl
       JOIN journal_entries je ON jl.entryId = je.id
       WHERE jl.partyId = ?
       ORDER BY je.date ASC`,
      [req.params.id]
    );
    let runningBalance = 0;
    const linesWithBalance = lines.map((l: any) => {
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      runningBalance += debit - credit;
      return { ...l, runningBalance };
    });
    res.json({ lines: linesWithBalance, balance: runningBalance });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Taxes
app.get('/api/finance/taxes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_rates');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/tax-profiles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_profiles');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/tax-profiles', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO tax_profiles SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE tax_profiles SET ? WHERE id = ?', [data, id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM tax_profiles WHERE id = ?', [id]);
    res.json({ success: true });
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

app.delete('/api/finance/taxes/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Journal Entries
app.delete('/api/finance/journals/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const entryId = req.params.id;
    // Get all lines to revert balances
    const [lines] = await conn.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId = ?', [entryId]);
    
    // Begin Transaction
    await conn.beginTransaction();
    
    // Revert balances
    for (const line of lines) {
      const [accRows] = await conn.query('SELECT type, balance FROM chart_of_accounts WHERE id = ?', [line.accountId]);
      if (accRows.length > 0) {
        const type = accRows[0].type.toLowerCase();
        let isDebitNormal = type.includes('asset') || type.includes('expense');
        let currentBalance = Number(accRows[0].balance);
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        
        // Revert the change that was applied
        const balanceChange = debit - credit;
        if (isDebitNormal) {
          currentBalance -= balanceChange;
        } else {
          currentBalance += balanceChange; // wait, for credit normal: originally balance += (credit-debit) = -balanceChange. Revert: balance -= -balanceChange = +balanceChange
        }
        
        await conn.query('UPDATE chart_of_accounts SET balance = ? WHERE id = ?', [currentBalance, line.accountId]);
      }
    }
    
    // Delete lines and entry
    await conn.query('DELETE FROM journal_lines WHERE entryId = ?', [entryId]);
    await conn.query('DELETE FROM journal_entries WHERE id = ?', [entryId]);
    
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

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

app.get('/api/finance/reports/expenses', async (req, res) => { try { const [lines] = await db.query('SELECT jl.*, je.date, je.reference, ca.name as accountName, ca.code as accountCode FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id JOIN chart_of_accounts ca ON jl.accountId = ca.id WHERE ca.type = \'Expense\' ORDER BY je.date DESC'); let total = 0; lines.forEach(l => total += Number(l.debit) - Number(l.credit)); res.json({ lines, total }); } catch(e){ res.status(500).json({error:e.message}); } });

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
      const name = acc.name ? acc.name.toLowerCase() : '';
      const bal = Number(acc.balance);
      
      if (subtype.includes('bank') || subtype.includes('cash') || name.includes('bank') || name.includes('cash')) totalCash += bal;
      if (subtype.includes('receivable') || name.includes('receivable')) totalAR += bal;
      if ((subtype.includes('payable') || name.includes('payable')) && !subtype.includes('tax') && !name.includes('tax')) totalAP += bal;
      if (type === 'revenue') revenue += bal;
      if (type === 'expense') expenses += bal;
    });
    
    const [bills] = await db.query('SELECT SUM(amount) as pendingAP FROM supplier_bills WHERE status = "unpaid"');
    const [invoices] = await db.query('SELECT SUM(total - IFNULL(paidAmount, 0)) as pendingAR FROM invoices WHERE status != "paid" AND status != "draft"');

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
        i.customerId as partyId,
        COALESCE(p.name, p.company, l.name, l.company, 'Unknown') as partyName,
        SUM(i.total - COALESCE(i.paidAmount, 0)) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) <= 30 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 31 AND 60 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 61 AND 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) > 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90plus'
      FROM invoices i
      LEFT JOIN customers p ON i.customerId = p.id 
      LEFT JOIN leads l ON i.customerId = l.id
      WHERE i.status != 'paid' AND i.status != 'draft'
      GROUP BY i.customerId, partyName 
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
      const [machineries] = await db.query('SELECT * FROM machineries ORDER BY createdAt DESC');
      let empMachines = [];
      try {
        const [rows] = await db.query('SELECT em.machineId, em.employeeId, e.name FROM employee_machines em JOIN employees e ON em.employeeId = e.id');
        empMachines = rows;
      } catch(e) {
        console.error("Error fetching employee_machines:", e);
      }
      
      const enriched = machineries.map(m => ({
        ...m,
        operators: empMachines.filter(em => em.machineId === m.id).map(em => em.name)
      }));
      
      res.json(enriched);
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
    const [empRows]: any = await db.query('SELECT id, name FROM employees');
    
    // Resolve customer names from leads table
    let leadMap: Record<string, string> = {};
    try {
      const [leads]: any = await db.query('SELECT id, name, company FROM leads');
      leads.forEach((l: any) => { leadMap[l.id] = l.name || l.company || l.id; });
    } catch(e) {}

    const enriched = (wos as any[]).map((wo: any) => ({
      ...wo,
      customerName: leadMap[wo.customerId] || wo.customerId || null,
      operations: (ops as any[]).filter((o: any) => o.workOrderId === wo.id).map((o: any) => ({
        ...o,
        employeeName: empRows.find((e: any) => e.id === o.employeeId)?.name || null,
        qc: (qcs as any[]).filter((q: any) => q.operationId === o.id)
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

app.put('/api/production/operations/:id/assign', async (req, res) => {
  try {
    const { employeeId, machineId, scheduledStart, scheduledEnd, isLocked } = req.body;
    
    const toMysqlDt = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };

    let query = 'UPDATE work_order_operations SET employeeId=?, machineId=?';
    let params = [employeeId || null, machineId || null];
    
    if (scheduledStart !== undefined) {
      query += ', scheduledStart=?, scheduledEnd=?';
      params.push(toMysqlDt(scheduledStart), toMysqlDt(scheduledEnd));
    }
    
    if (isLocked !== undefined) {
      query += ', isLocked=?';
      params.push(isLocked ? 1 : 0);
    }
    
    query += ' WHERE id=?';
    params.push(req.params.id);
    
    await db.query(query, params);
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


  // SYSTEM STATS ROUTE
  // ==========================
  app.get('/api/system/stats', (req, res) => {
    const os = require('os');
    const { exec } = require('child_process');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    // Rough approximation for cross-platform CPU usage
    const cpuPercent = cpus.length > 0 ? (loadAvg[0] / cpus.length) * 100 : 0;

    const isWin = os.platform() === 'win32';
    const cmd = isWin ? 'wmic logicaldisk get size,freespace,caption' : 'df -k /';

    exec(cmd, (error, stdout) => {
      let storagePercent = 0;
      let totalStorage = 0;
      let usedStorage = 0;

      if (!error && stdout) {
        if (isWin) {
          const lines = stdout.trim().split('\n').slice(1);
          for (let line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const free = parseInt(parts[1]) || 0;
              const total = parseInt(parts[2]) || 0;
              if (total > 0) {
                totalStorage = total;
                usedStorage = total - free;
                storagePercent = (usedStorage / totalStorage) * 100;
              }
              break;
            }
          }
        } else {
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            if (parts.length >= 5) {
              totalStorage = parseInt(parts[1]) * 1024 || 0;
              usedStorage = parseInt(parts[2]) * 1024 || 0;
              storagePercent = parseFloat(parts[4].replace('%', '')) || 0;
            }
          }
        }
      }

      res.json({
        ram: { total: totalMem, used: usedMem, percent: memPercent },
        cpu: { percent: Math.min(cpuPercent, 100) },
        storage: { total: totalStorage, used: usedStorage, percent: storagePercent },
        network: { 
           ping: Math.floor(Math.random() * 20 + 10), // 10-30 ms mock
           download: (Math.random() * 50 + 50).toFixed(1), // 50-100 Mbps mock
           upload: (Math.random() * 20 + 10).toFixed(1) // 10-30 Mbps mock
        }
      });
    });
  });

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});





app.get('/api/currencies', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM currencies');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/currencies/sync', async (req, res) => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/LKR');
    const data = await response.json();
    if (data && data.rates) {
      const [existing] = await db.query('SELECT code FROM currencies');
      const existingCodes = existing.map(c => c.code);
      if (!existingCodes.includes('LKR')) {
        await db.query('INSERT INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES (?, ?, ?, ?, ?)', ['LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1]);
      }
      for (const code of existingCodes) {
        if (data.rates[code] && code !== 'LKR') {
          await db.query('UPDATE currencies SET exchangeRate = ?, lastUpdated = NOW() WHERE code = ?', [1 / data.rates[code], code]);
        }
      }
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to fetch rates' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/currencies', async (req, res) => {
  try {
    await db.query('INSERT INTO currencies SET ?', req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/currencies/:code', async (req, res) => {
  try {
    await db.query('DELETE FROM currencies WHERE code = ?', [req.params.code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-sync currencies daily
setInterval(async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/LKR');
    const data = await response.json();
    if (data && data.rates) {
      const [existing] = await db.query('SELECT code FROM currencies');
      for (const row of existing) {
        const code = row.code;
        if (data.rates[code] && code !== 'LKR') {
          await db.query('UPDATE currencies SET exchangeRate = ?, lastUpdated = NOW() WHERE code = ?', [1 / data.rates[code], code]);
        }
      }
      console.log('Auto-synced currencies successfully.');
    }
  } catch (err) { console.error('Failed to auto-sync currencies:', err); }
}, 24 * 60 * 60 * 1000);
