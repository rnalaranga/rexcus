import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { resolveBuildId, Browser, detectBrowserPlatform, install } from '@puppeteer/browsers';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import db from './db';

// Multi-path dotenv loader for local & VPS production environments
[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'api/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '.env')
].forEach(p => {
  if (fs.existsSync(p)) dotenv.config({ path: p });
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

function findBinaryRecursively(dir: string, binaryName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findBinaryRecursively(fullPath, binaryName);
        if (found) return found;
      } else if (entry.name === binaryName) {
        return fullPath;
      }
    }
  } catch (e) {}
  return null;
}

let cachedChromePath: string | null = null;

async function getChromeExecutablePath(): Promise<string | null> {
  if (cachedChromePath && fs.existsSync(cachedChromePath)) {
    return cachedChromePath;
  }

  const possiblePaths = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/local/bin/chromium',
    '/usr/local/bin/chrome'
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      cachedChromePath = p;
      return p;
    }
  }

  // Check via which on Unix
  try {
    const whichRes = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null || which google-chrome-stable 2>/dev/null').toString().trim();
    if (whichRes && fs.existsSync(whichRes)) {
      cachedChromePath = whichRes;
      return whichRes;
    }
  } catch (e) {}

  // Check custom chrome-bin directories using recursive pure node search
  const checkDirs = [
    path.resolve(process.cwd(), 'chrome-bin'),
    path.resolve(process.cwd(), 'api/chrome-bin'),
    path.resolve(__dirname, '../chrome-bin'),
    path.resolve(__dirname, '../../chrome-bin'),
    '/var/www/rexnw/api/chrome-bin',
    '/var/www/rexnw/chrome-bin',
    path.join(process.env.HOME || '/root', '.cache/puppeteer')
  ];

  const binName = process.platform === 'win32' ? 'chrome.exe' : 'chrome';
  for (const dir of checkDirs) {
    const found = findBinaryRecursively(dir, binName);
    if (found && fs.existsSync(found)) {
      cachedChromePath = found;
      return found;
    }
  }

  // Auto-install stable Chrome if missing
  try {
    const platform = detectBrowserPlatform();
    if (platform) {
      const installDir = path.resolve(process.cwd(), 'chrome-bin');
      const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable');

      // Clean up half-downloaded or corrupted folder if executable is missing
      if (fs.existsSync(installDir)) {
        const binName = platform.includes('win') ? 'chrome.exe' : 'chrome';
        const existingBin = findBinaryRecursively(installDir, binName);
        if (!existingBin) {
          console.log(`[Rex PDF] Incomplete chrome folder found in ${installDir}. Cleaning up...`);
          try { fs.rmSync(installDir, { recursive: true, force: true }); } catch (e) {}
        } else {
          cachedChromePath = existingBin;
          return existingBin;
        }
      }

      console.log(`[Rex PDF] Auto-installing stable Chrome for platform ${platform} into ${installDir}...`);
      const installed = await install({
        browser: Browser.CHROME,
        buildId,
        cacheDir: installDir,
        platform
      });
      if (installed && installed.executablePath && fs.existsSync(installed.executablePath)) {
        console.log(`[Rex PDF] Chrome installed successfully: ${installed.executablePath}`);
        cachedChromePath = installed.executablePath;
        return installed.executablePath;
      }
    }
  } catch (err: any) {
    console.error('[Rex PDF] Failed auto-installing Chrome:', err.message);
    try {
      const installDir = path.resolve(process.cwd(), 'chrome-bin');
      fs.rmSync(installDir, { recursive: true, force: true });
    } catch(e) {}
  }

  return null;
}

// ==========================
// HIGH-PRECISION VECTOR PDF EXPORT (PUPPETEER CHROMIUM)
// ==========================
app.post('/api/export-pdf', async (req, res) => {
  let browser = null;
  try {
    const { 
      html, 
      styles = [], 
      filename = 'document.pdf', 
      orientation = 'portrait',
      margin = '6mm',
      returnBase64 = false 
    } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const chromePath = await getChromeExecutablePath();
    if (!chromePath) {
      return res.status(500).json({ error: 'Chrome/Chromium executable not found on server' });
    }

    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    const isLandscape = orientation === 'landscape';
    await page.setViewport({ 
      width: isLandscape ? 1123 : 794, 
      height: isLandscape ? 794 : 1123, 
      deviceScaleFactor: 2 
    });
    await page.emulateMediaType('screen');

    const stylesHtml = Array.isArray(styles) 
      ? styles.map((s: any) => (typeof s === 'string' && s.trim().startsWith('<')) ? s : `<style>${s}</style>`).join('\n')
      : (styles ? `<style>${styles}</style>` : '');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 ${orientation};
              margin: ${margin};
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Inter', Arial, Helvetica, sans-serif;
              font-size: 11px;
            }
            .font-mono {
              font-family: 'JetBrains Mono', Courier, monospace !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            img, svg {
              max-width: 100%;
              image-rendering: -webkit-optimize-contrast;
            }
            .avoid-break, tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #print-section,
            #sales-order-print-section,
            #work-order-print-section,
            #gatepass-print-section,
            #grn-print-section,
            #receipt-print-section,
            #invoice-preview,
            .printable-document {
              margin: 0 auto !important;
              width: 100% !important;
              max-width: 794px !important;
              box-sizing: border-box !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            .border { border: 1px solid #000000 !important; }
            .border-b { border-bottom: 1px solid #000000 !important; }
            .border-t { border-top: 1px solid #000000 !important; }
            .border-r { border-right: 1px solid #000000 !important; }
            .border-l { border-left: 1px solid #000000 !important; }
            .border-black { border-color: #000000 !important; }
            .border-black\\/20 { border-color: rgba(0, 0, 0, 0.2) !important; }
            .border-b-2 { border-bottom: 2px solid #000000 !important; }
            .flex { display: flex !important; }
            .flex-col { flex-direction: column !important; }
            .flex-1 { flex: 1 1 0% !important; }
            .items-center { align-items: center !important; }
            .items-start { align-items: flex-start !important; }
            .items-end { align-items: flex-end !important; }
            .justify-center { justify-content: center !important; }
            .justify-between { justify-content: space-between !important; }
            .bg-gray-50, .bg-gray-50\\/50, .bg-gray-50\\/30 { background-color: #f9fafb !important; }
            .bg-gray-100 { background-color: #f3f4f6 !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .font-bold { font-weight: 700 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-medium { font-weight: 500 !important; }
            .font-mono { font-family: 'JetBrains Mono', Courier, monospace !important; }
            .w-\\[30\\%\\] { width: 30% !important; }
            .w-\\[70\\%\\] { width: 70% !important; }
            .w-\\[50\\%\\] { width: 50% !important; }
            .w-\\[32\\%\\] { width: 32% !important; }
            .w-\\[68\\%\\] { width: 68% !important; }
            .w-\\[55\\%\\] { width: 55% !important; }
            .w-\\[45\\%\\] { width: 45% !important; }
            .w-\\[52\\%\\] { width: 52% !important; }
            .w-\\[48\\%\\] { width: 48% !important; }
            .w-full { width: 100% !important; }
          </style>
          ${stylesHtml}
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: ['load', 'networkidle0'], timeout: 20000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: isLandscape,
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: margin,
        bottom: margin,
        left: '8mm',
        right: '8mm'
      }
    });

    await browser.close();
    browser = null;

    if (returnBase64) {
      const base64 = Buffer.from(pdfBuffer).toString('base64');
      return res.json({ success: true, base64: `data:application/pdf;base64,${base64}` });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(Buffer.from(pdfBuffer));

  } catch (err: any) {
    if (browser) {
      try { await browser.close(); } catch(e) {}
    }
    console.error('PDF export error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

app.get('/api/pdf-diagnostics', async (req, res) => {
  const result: any = {
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    dirname: __dirname,
    cachedChromePath,
    env: {
      CHROME_BIN: process.env.CHROME_BIN,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH
    }
  };

  try {
    result.whichChromium = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null || which google-chrome-stable 2>/dev/null').toString().trim();
  } catch (e: any) {
    result.whichChromium = 'none';
  }

  const checkDirs = [
    '/var/www/rexnw/api/chrome-bin',
    '/var/www/rexnw/chrome-bin',
    path.resolve(process.cwd(), 'chrome-bin')
  ];
  result.dirs = checkDirs.map(d => ({
    dir: d,
    exists: fs.existsSync(d),
    content: fs.existsSync(d) ? fs.readdirSync(d) : []
  }));

  try {
    const plat = detectBrowserPlatform();
    result.detectedPlatform = plat;
    const bId = await resolveBuildId(Browser.CHROME, plat, 'stable');
    result.buildId = bId;
    const installDir = '/var/www/rexnw/api/chrome-bin';
    result.tryingInstallTo = installDir;
    if (fs.existsSync(installDir)) {
      const existing = findBinaryRecursively(installDir, plat.includes('win') ? 'chrome.exe' : 'chrome');
      if (!existing) {
        fs.rmSync(installDir, { recursive: true, force: true });
      }
    }
    const installed = await install({
      browser: Browser.CHROME,
      buildId: bId,
      cacheDir: installDir,
      platform: plat
    });
    result.installedResult = installed;
    result.executableExists = installed ? fs.existsSync(installed.executablePath) : false;
    if (installed && installed.executablePath && fs.existsSync(installed.executablePath)) {
      cachedChromePath = installed.executablePath;
    }
  } catch (e: any) {
    result.installError = e.message;
    result.installStack = e.stack;
  }

  res.json(result);
});



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


app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const [users]: any = await db.query('SELECT id, name, username, role, prefix FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];
    
    let permissions: string[] = [];
    let roleName = user.role;
    try {
      const [roleRows]: any = await db.query('SELECT name, permissions FROM roles WHERE id = ?', [user.role]);
      if (roleRows && roleRows.length > 0) {
        roleName = roleRows[0].name || user.role;
        permissions = typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : (roleRows[0].permissions || []);
      } else if (user.role === 'admin') {
        permissions = ['*'];
      }
    } catch(e) {}

    res.json({
      success: true,
      user: { ...user, roleName, permissions }
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
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
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    let permissions: string[] = [];
    let roleName = user.role;
    try {
      const [roleRows]: any = await db.query('SELECT name, permissions FROM roles WHERE id = ?', [user.role]);
      if (roleRows && roleRows.length > 0) {
        roleName = roleRows[0].name || user.role;
        permissions = typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : (roleRows[0].permissions || []);
      } else if (user.role === 'admin') {
        permissions = ['*'];
      }
    } catch(e) {}

    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        username: user.username, 
        role: user.role, 
        roleName,
        permissions,
        prefix: user.prefix 
      } 
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
    if (settingsObj.groq_model && settingsObj.groq_model.includes('8b')) {
      settingsObj.groq_model = 'llama-3.3-70b-versatile';
    }
    res.json(settingsObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


// ==========================
// UNIFIED DATABASE SYNC & REPAIR
// ==========================
async function runDatabaseSync() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    await db.query("ALTER DATABASE rex_erp CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci");
    await db.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  } catch (e) {}
  
  // 1. Multiple candidate paths for fix_db_schema.sql
  const possiblePaths = [
    path.join(__dirname, '../../fix_db_schema.sql'),
    path.join(__dirname, '../fix_db_schema.sql'),
    path.join(__dirname, 'fix_db_schema.sql'),
    path.join(process.cwd(), 'fix_db_schema.sql'),
    path.join(process.cwd(), '../fix_db_schema.sql')
  ];
  const sqlFile = possiblePaths.find(p => fs.existsSync(p));

  if (sqlFile && fs.existsSync(sqlFile)) {
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const statements = sqlContent.split(';');
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      const cleaned = trimmed.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!cleaned) continue;
      try {
        await db.query(cleaned);
      } catch (err) {
        // Ignore if table/column already exists or duplicates
      }
    }
  }

  // 2. Ensure core tables exist as fallback
  const createTables = [
    `CREATE TABLE IF NOT EXISTS customer_grns (
      id VARCHAR(50) PRIMARY KEY,
      quoteId VARCHAR(50) NULL,
      quoNo VARCHAR(100) NULL,
      leadId VARCHAR(50) NULL,
      items TEXT NULL,
      receivedAt DATETIME NULL,
      receivedBy VARCHAR(100) NULL,
      notes TEXT NULL,
      createdAt DATETIME NULL,
      status VARCHAR(50) DEFAULT 'In Stock',
      gatePassId VARCHAR(50) NULL,
      dispatchedAt DATETIME NULL,
      customerName VARCHAR(255) NULL,
      customerCompany VARCHAR(255) NULL
    )`,
    `CREATE TABLE IF NOT EXISTS gate_passes (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(50) DEFAULT 'customer_sample',
      grnId VARCHAR(50) NULL,
      quoteId VARCHAR(50) NULL,
      quoNo VARCHAR(100) NULL,
      leadId VARCHAR(50) NULL,
      customerId VARCHAR(50) NULL,
      customerName VARCHAR(255) NULL,
      customerCompany VARCHAR(255) NULL,
      address TEXT NULL,
      phone VARCHAR(100) NULL,
      email VARCHAR(100) NULL,
      attention VARCHAR(255) NULL,
      carrier VARCHAR(255) NULL,
      vehicleNo VARCHAR(100) NULL,
      reason VARCHAR(255) NULL,
      items TEXT NULL,
      issuedBy VARCHAR(100) NULL,
      issuedDate DATETIME NULL,
      status VARCHAR(50) DEFAULT 'Dispatched',
      notes TEXT NULL,
      createdAt DATETIME NULL,
      updatedAt DATETIME NULL
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_ledger (
      id VARCHAR(50) PRIMARY KEY,
      supplierId VARCHAR(50) NOT NULL,
      date DATETIME NULL,
      type VARCHAR(50) NOT NULL,
      referenceNo VARCHAR(100) NULL,
      description TEXT NULL,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      paymentMethod VARCHAR(50) DEFAULT 'Bank Transfer',
      bankAccountId VARCHAR(100) NULL,
      amount DECIMAL(15,2) DEFAULT 0.00,
      reference VARCHAR(255) NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      debitAccountId VARCHAR(50) DEFAULT NULL,
      creditAccountId VARCHAR(50) DEFAULT NULL,
      debitAccountName VARCHAR(100) DEFAULT NULL,
      creditAccountName VARCHAR(100) DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS material_requests (
      id VARCHAR(50) PRIMARY KEY,
      workOrderNo VARCHAR(100) DEFAULT NULL,
      workOrderNos TEXT DEFAULT NULL,
      poId VARCHAR(50) DEFAULT NULL,
      poIds TEXT DEFAULT NULL,
      date DATETIME,
      requiredDate DATETIME,
      requestedBy VARCHAR(100),
      department VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      items TEXT,
      notes TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id VARCHAR(50) PRIMARY KEY,
      supplierId VARCHAR(50),
      mrId VARCHAR(50) DEFAULT NULL,
      mrIds TEXT DEFAULT NULL,
      taxProfileId VARCHAR(50) DEFAULT NULL,
      taxBreakdown TEXT DEFAULT NULL,
      date DATETIME,
      expectedDate DATETIME,
      status VARCHAR(20) DEFAULT 'draft',
      billedAmount DECIMAL(15,2) DEFAULT 0.00,
      billingStatus VARCHAR(30) DEFAULT 'unbilled',
      billIds TEXT DEFAULT NULL,
      invoiceNos TEXT DEFAULT NULL,
      items TEXT,
      subtotal DECIMAL(15,2),
      tax DECIMAL(15,2),
      totalAmount DECIMAL(15,2),
      notes TEXT,
      shippingCost DECIMAL(15,2) DEFAULT 0,
      shippingMethod VARCHAR(100),
      paymentTerms VARCHAR(100),
      terms TEXT,
      createdAt DATETIME,
      updatedAt DATETIME,
      createdBy VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS grns (
      id VARCHAR(50) PRIMARY KEY,
      poId VARCHAR(50),
      poIds TEXT DEFAULT NULL,
      supplierId VARCHAR(50),
      date DATETIME,
      receivedBy VARCHAR(100),
      vehicleNo VARCHAR(100),
      storageLocation VARCHAR(100),
      items TEXT,
      status VARCHAR(20) DEFAULT 'received',
      notes TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_bills (
      id VARCHAR(50) PRIMARY KEY,
      supplierId VARCHAR(50),
      poId VARCHAR(50),
      grnId VARCHAR(50),
      invoiceNo VARCHAR(100),
      date DATETIME,
      dueDate DATETIME,
      amount DECIMAL(15,2),
      subtotal DECIMAL(15,2) DEFAULT 0.00,
      taxAmount DECIMAL(15,2) DEFAULT 0.00,
      items TEXT DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'unpaid',
      notes TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS tax_profiles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      tax1_name VARCHAR(50) NOT NULL,
      tax1_rate DECIMAL(5,2) NOT NULL,
      tax2_name VARCHAR(50) DEFAULT NULL,
      tax2_rate DECIMAL(5,2) DEFAULT 0.00,
      tax2_compound TINYINT(1) DEFAULT 0,
      tax1_hidden TINYINT(1) DEFAULT 0,
      tax1_show_separately TINYINT(1) DEFAULT 0,
      tax2_show_separately TINYINT(1) DEFAULT 1,
      tax1_accountId VARCHAR(50) DEFAULT NULL,
      tax2_accountId VARCHAR(50) DEFAULT NULL,
      accountId VARCHAR(50) DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS currencies (
      code VARCHAR(3) PRIMARY KEY,
      name VARCHAR(50) DEFAULT NULL,
      symbol VARCHAR(5) DEFAULT NULL,
      exchangeRate DECIMAL(15,4) DEFAULT 1.0000,
      isBase TINYINT(1) DEFAULT 0,
      lastUpdated DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS quotation_templates (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT DEFAULT NULL,
      subject VARCHAR(255) DEFAULT NULL,
      items LONGTEXT DEFAULT NULL,
      terms TEXT DEFAULT NULL,
      validity VARCHAR(100) DEFAULT NULL,
      delivery VARCHAR(100) DEFAULT NULL,
      taxProfileId VARCHAR(50) DEFAULT NULL,
      boms LONGTEXT DEFAULT NULL,
      data LONGTEXT DEFAULT NULL,
      createdAt DATETIME DEFAULT NULL,
      updatedAt DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      isTaxAccount TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT NULL,
      updatedAt DATETIME DEFAULT NULL,
      balance DECIMAL(15,2) DEFAULT 0.00,
      subtype VARCHAR(50) DEFAULT NULL,
      accountNumber VARCHAR(50) DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id VARCHAR(50) PRIMARY KEY,
      date DATETIME NOT NULL,
      reference VARCHAR(100) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      totalAmount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      createdBy VARCHAR(50) DEFAULT NULL,
      createdAt DATETIME DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'posted'
    )`,
    `CREATE TABLE IF NOT EXISTS journal_lines (
      id VARCHAR(50) PRIMARY KEY,
      entryId VARCHAR(50) NOT NULL,
      accountId VARCHAR(50) NOT NULL,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      description TEXT DEFAULT NULL,
      partyId VARCHAR(50) DEFAULT NULL,
      costCenterId VARCHAR(50) DEFAULT NULL,
      partyType VARCHAR(50) DEFAULT NULL,
      INDEX idx_je_entryId (entryId),
      INDEX idx_je_accountId (accountId)
    )`,
    `CREATE TABLE IF NOT EXISTS cost_centers (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100) DEFAULT NULL,
      isActive TINYINT(1) DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(255) DEFAULT NULL,
      permissions TEXT NOT NULL,
      isSystem TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT NULL,
      updatedAt DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS stock_remnants (
      id VARCHAR(50) PRIMARY KEY,
      inventoryId VARCHAR(50) NULL,
      materialName VARCHAR(255) NOT NULL,
      sku VARCHAR(100) NULL,
      profileType VARCHAR(50) DEFAULT 'shaft',
      dimension VARCHAR(100) NULL,
      standardLength DECIMAL(10,2) DEFAULT 12.00,
      length DECIMAL(10,2) NOT NULL,
      unit VARCHAR(20) DEFAULT 'feet',
      location VARCHAR(100) DEFAULT 'Offcut Rack A',
      sourceBarId VARCHAR(100) NULL,
      jobRef VARCHAR(100) NULL,
      status VARCHAR(50) DEFAULT 'available',
      notes TEXT NULL,
      createdAt DATETIME NULL,
      updatedAt DATETIME NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payment_receipts (
      id VARCHAR(50) PRIMARY KEY,
      receiptNo VARCHAR(100) NOT NULL,
      date DATETIME NOT NULL,
      quoteId VARCHAR(50) NULL,
      quotationNo VARCHAR(100) NULL,
      orderId VARCHAR(50) NULL,
      orderNo VARCHAR(100) NULL,
      customerId VARCHAR(50) NULL,
      customerName VARCHAR(255) NULL,
      customerCompany VARCHAR(255) NULL,
      totalQuotedAmount DECIMAL(15,2) DEFAULT 0.00,
      amount DECIMAL(15,2) NOT NULL,
      balanceDue DECIMAL(15,2) DEFAULT 0.00,
      paymentMethod VARCHAR(50) DEFAULT 'Cash',
      accountId VARCHAR(50) NULL,
      accountName VARCHAR(255) NULL,
      reference VARCHAR(100) NULL,
      receivedBy VARCHAR(100) NULL,
      notes TEXT NULL,
      status VARCHAR(50) DEFAULT 'Received',
      journalEntryId VARCHAR(50) NULL,
      createdAt DATETIME NULL,
      updatedAt DATETIME NULL
    )`,
    `CREATE TABLE IF NOT EXISTS approval_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      module VARCHAR(50) NOT NULL,
      recordId VARCHAR(100) NOT NULL,
      recordNo VARCHAR(100),
      entityName VARCHAR(255),
      amount DECIMAL(15,2) DEFAULT 0,
      action VARCHAR(50) NOT NULL,
      actionBy VARCHAR(100) NOT NULL,
      actionDate DATETIME NULL,
      notes TEXT,
      metadata LONGTEXT,
      createdAt DATETIME NULL,
      INDEX idx_record (recordId),
      INDEX idx_module (module)
    )`,
    `CREATE TABLE IF NOT EXISTS document_sequences (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      prefix VARCHAR(20) DEFAULT '',
      next_number INT NOT NULL DEFAULT 1001,
      padding INT NOT NULL DEFAULT 4,
      include_user_prefix TINYINT(1) DEFAULT 0,
      include_customer_prefix TINYINT(1) DEFAULT 0,
      updated_at DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_quotation_sequences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_prefix VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NULL,
      next_number INT NOT NULL DEFAULT 2206,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_prefix (user_prefix)
    )`
  ];

  for (const tbl of createTables) {
    try {
      await db.query(tbl);
    } catch (err) {}
  }

  // Linear Stock Remnants Seeding (8mm Shaft Scenario)
  try {
    const [remRows]: any = await db.query('SELECT COUNT(*) as cnt FROM stock_remnants');
    if (remRows && remRows[0]?.cnt === 0) {
      const [shaftRows]: any = await db.query("SELECT id FROM inventory WHERE name LIKE '%8mm%' OR name LIKE '%Shaft%' LIMIT 1");
      let shaftId = shaftRows.length > 0 ? shaftRows[0].id : 'INV-SHAFT-8MM';
      if (shaftRows.length === 0) {
        await db.query(`
          INSERT INTO inventory (id, name, sku, unitCost, unitPrice, quantity, uom, type, description, location)
          VALUES ('INV-SHAFT-8MM', '8mm Mild Steel Shaft (12 ft)', 'SFT-08MM-12FT', 1200.00, 1850.00, 10, 'bars', 'raw_material', 'Standard 12 feet long 8mm precision ground shafting bar', 'Bar Rack R-1')
        `);
      }
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.query(`
        INSERT INTO stock_remnants (id, inventoryId, materialName, sku, profileType, dimension, standardLength, length, unit, location, sourceBarId, jobRef, status, notes, createdAt, updatedAt)
        VALUES 
        ('REM-001', ?, '8mm Mild Steel Shaft', 'SFT-08MM-12FT', 'shaft', 'Ø 8mm', 12.00, 8.00, 'feet', 'Offcut Rack B-1', 'BAR-01', 'Cut 4ft for Job #101', 'available', 'Remaining 8 ft offcut from previous 4 ft cut', ?, ?),
        ('REM-002', ?, '8mm Mild Steel Shaft', 'SFT-08MM-12FT', 'shaft', 'Ø 8mm', 12.00, 3.00, 'feet', 'Offcut Rack B-2', 'BAR-02', 'Cut 9ft for Job #102', 'available', 'Remaining 3 ft offcut from previous 9 ft cut', ?, ?)
      `, [shaftId, now, now, shaftId, now, now]);
    }
  } catch (e) {
    console.error('Remnant seeding error:', e);
  }

  // 3. Default Roles Seeding
  try {
    const ALL_PERMS = [
      'crm.customers.view', 'crm.customers.create', 'crm.customers.edit', 'crm.customers.delete', 'crm.credit.request',
      'crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.leads.delete', 'crm.leads.manage', 'crm.deals.manage', 'crm.followups.manage',
      'quotations.view', 'quotations.view_all', 'quotations.view_own', 'quotations.create', 'quotations.edit', 'quotations.delete', 'quotations.approve', 'quotations.discount', 'quotations.print',
      'finance.invoices.view', 'finance.invoices.create', 'finance.invoices.edit', 'finance.invoices.delete', 'finance.payments.record',
      'finance.banking.view', 'finance.banking.manage', 'finance.accounting.view', 'finance.journals.create',
      'finance.receivables.view', 'finance.payables.view', 'finance.tax.manage', 'finance.reports.view',
      'production.work_orders.view', 'production.work_orders.create', 'production.work_orders.edit', 'production.work_orders.delete',
      'production.machining.manage', 'production.planning.view', 'production.qc.manage',
      'production.machinery.manage', 'production.operations.manage',
      'inventory.items.view', 'inventory.items.view_details', 'inventory.items.create', 'inventory.items.edit', 'inventory.items.delete',
      'inventory.ledger.manage', 'inventory.stock_ledger.view', 'inventory.customer_grn.manage', 'inventory.gatepass.manage', 'inventory.assets.manage',
      'purchasing.suppliers.view', 'purchasing.suppliers.manage', 'purchasing.mr.manage', 'purchasing.po.manage', 'purchasing.grn.manage', 'purchasing.bills.manage',
      'hr.employees.view', 'hr.employees.create', 'hr.employees.edit', 'hr.employees.delete', 'hr.skills.manage', 'hr.labor_report.view',
      'approvals.quotations', 'approvals.discounts', 'approvals.credit_limit', 'approvals.purchase_orders', 'approvals.material_requests', 'approvals.bills_payments', 'approvals.work_orders',
      'admin.users.manage', 'admin.roles.manage', 'admin.approvals.manage', 'admin.settings.manage', 'admin.database.backup'
    ];

    const defaultRoles = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full unconstrained access to all system functions and configurations',
        permissions: JSON.stringify(['*']),
        isSystem: 1
      },
      {
        id: 'manager',
        name: 'General Manager',
        description: 'Operational management across CRM, Production, Inventory, HR, Finance and Approvals',
        permissions: JSON.stringify(ALL_PERMS.filter(p => !p.startsWith('admin.database'))),
        isSystem: 1
      },
            {
        id: 'sales_head',
        name: 'Head of Sales',
        description: 'Sales leadership, full quotation overview across all reps, quotation approvals, margins, and sales operations',
        permissions: JSON.stringify([
          'crm.customers.view', 'crm.customers.create', 'crm.customers.edit', 'crm.customers.delete', 'crm.credit.request',
          'crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.leads.delete', 'crm.leads.manage',
          'crm.deals.manage', 'crm.followups.manage',
          'quotations.view', 'quotations.view_all', 'quotations.view_own', 'quotations.create', 'quotations.edit', 'quotations.delete', 'quotations.approve', 'quotations.discount', 'quotations.print',
          'approvals.quotations', 'approvals.discounts',
          'finance.invoices.view', 'finance.invoices.create', 'inventory.items.view', 'inventory.items.view_details'
        ]),
        isSystem: 1
      },
{
        id: 'sales',
        name: 'Sales Team (Executive)',
        description: 'Lead generation & inquiry management, customer relations, quotations generation, discounts, and sales invoicing',
        permissions: JSON.stringify([
          'crm.customers.view', 'crm.customers.create', 'crm.customers.edit', 'crm.credit.request',
          'crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.leads.delete', 'crm.leads.manage',
          'crm.deals.manage', 'crm.followups.manage',
          'quotations.view', 'quotations.view_own', 'quotations.create', 'quotations.edit', 'quotations.discount', 'quotations.print',
          'finance.invoices.view', 'inventory.items.view', 'inventory.items.view_details'
        ]),
        isSystem: 1
      },
      {
        id: 'finance',
        name: 'Finance & Accounts Officer',
        description: 'Billing, invoice management, customer payment receipts, banking ledger, payables and tax returns',
        permissions: JSON.stringify([
          'crm.customers.view', 'quotations.view',
          'finance.invoices.view', 'finance.invoices.create', 'finance.invoices.edit', 'finance.payments.record',
          'finance.banking.view', 'finance.banking.manage', 'finance.accounting.view', 'finance.journals.create',
          'finance.receivables.view', 'finance.payables.view', 'finance.tax.manage', 'finance.reports.view',
          'purchasing.bills.manage', 'approvals.bills_payments'
        ]),
        isSystem: 1
      },
      {
        id: 'production',
        name: 'Production Supervisor',
        description: 'Work order job tracking, scheduling, CNC machining operations, machinery and QC inspection',
        permissions: JSON.stringify([
          'production.work_orders.view', 'production.work_orders.create', 'production.work_orders.edit',
          'production.machining.manage', 'production.planning.view', 'production.qc.manage',
          'production.machinery.manage', 'production.operations.manage',
          'inventory.items.view', 'inventory.items.view_details', 'inventory.ledger.manage', 'inventory.gatepass.manage',
          'hr.skills.manage', 'hr.labor_report.view'
        ]),
        isSystem: 1
      },
      {
        id: 'inventory',
        name: 'Inventory & Store Keeper',
        description: 'Stock management, material receipt, stock ledger entries, customer GRN and gate pass issue',
        permissions: JSON.stringify([
          'inventory.items.view', 'inventory.items.view_details', 'inventory.items.create', 'inventory.items.edit',
          'inventory.ledger.manage', 'inventory.stock_ledger.view', 'inventory.customer_grn.manage',
          'inventory.gatepass.manage', 'inventory.assets.manage',
          'purchasing.suppliers.view', 'purchasing.mr.manage', 'purchasing.grn.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'hr',
        name: 'Human Resources Officer',
        description: 'Employee personnel records, technical skill matrices, and factory labor utilization',
        permissions: JSON.stringify([
          'hr.employees.view', 'hr.employees.create', 'hr.employees.edit', 'hr.employees.delete',
          'hr.skills.manage', 'hr.labor_report.view'
        ]),
        isSystem: 1
      },
      {
        id: 'user',
        name: 'Standard User',
        description: 'Basic view-only access across core business modules',
        permissions: JSON.stringify([
          'crm.customers.view', 'quotations.view', 'finance.invoices.view',
          'production.work_orders.view', 'inventory.items.view', 'inventory.items.view_details'
        ]),
        isSystem: 1
      },
      // ── EXCEL PRESET ROLES ──────────────────────────────────────────
      {
        id: 'crm_manager',
        name: 'CRM Manager',
        description: 'Customer relationship leadership, customer registration, pipeline control, and quotation approvals.',
        permissions: JSON.stringify([
          'crm.leads.create','crm.leads.manage','crm.leads.edit','crm.leads.view','crm.customers.create','crm.customers.view',
          'inventory.customer_grn.manage','inventory.customer_grn.create','inventory.customer_grn.edit','inventory.customer_grn.view',
          'quotations.create','quotations.view_all','quotations.edit','quotations.view','approvals.quotations','quotations.approve',
          'production.work_orders.create','inventory.items.view','production.work_orders.edit','production.work_orders.view',
          'production.operations.manage','production.machining.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'sales_engineer',
        name: 'Sales Engineer',
        description: 'Technical sales inquiries, sample receipts, BOM drafting, and customer order processing.',
        permissions: JSON.stringify([
          'crm.leads.create','crm.leads.manage','crm.leads.edit','crm.leads.view','crm.customers.create','crm.customers.view',
          'inventory.customer_grn.manage','inventory.customer_grn.create','inventory.customer_grn.edit','inventory.customer_grn.view',
          'quotations.create','quotations.view_all','quotations.view','production.work_orders.create','inventory.items.view',
          'production.work_orders.view','production.operations.manage','production.work_orders.edit','production.machining.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'tech_sales_officer',
        name: 'Technical Sales Officer',
        description: 'Technical quoting, engineering estimates, customer product drawings, and BOM review.',
        permissions: JSON.stringify([
          'crm.leads.create','crm.leads.manage','crm.leads.edit','crm.leads.view','crm.customers.create','crm.customers.view',
          'inventory.customer_grn.manage','inventory.customer_grn.create','inventory.customer_grn.view',
          'quotations.create','quotations.view_all','quotations.edit','quotations.view','production.work_orders.create',
          'inventory.items.view','production.work_orders.view','production.operations.manage','production.work_orders.edit',
          'production.machining.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'store_keeper',
        name: 'Store Keeper',
        description: 'Warehouse material receipts, tool issues, goods delivery notes, and stock movements.',
        permissions: JSON.stringify([
          'inventory.customer_grn.manage','inventory.customer_grn.create','inventory.customer_grn.view',
          'production.work_orders.edit','production.work_orders.view','inventory.items.view','purchasing.mr.manage',
          'inventory.ledger.manage','inventory.stock_ledger.view','purchasing.grn.manage','inventory.assets.manage',
          'inventory.gatepass.manage','inventory.items.view_details','production.operations.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'store_assistant',
        name: 'Store Assistant',
        description: 'Assisting workshop material requests, stock handling, tool checks, and delivery notes.',
        permissions: JSON.stringify([
          'inventory.customer_grn.manage','inventory.customer_grn.create','inventory.customer_grn.view',
          'production.work_orders.edit','production.work_orders.view','inventory.items.view','purchasing.mr.manage',
          'inventory.ledger.manage','inventory.stock_ledger.view','purchasing.grn.manage','inventory.assets.manage',
          'inventory.gatepass.manage','inventory.items.view_details','production.operations.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'procurement_officer',
        name: 'Procurement Officer',
        description: 'Purchase orders, supplier registration, material requisitions, and vendor goods receipts.',
        permissions: JSON.stringify([
          'production.work_orders.create','production.operations.manage','production.work_orders.edit','production.work_orders.view',
          'inventory.items.view','purchasing.mr.manage','purchasing.grn.manage','inventory.ledger.manage',
          'inventory.stock_ledger.view','inventory.items.create','inventory.items.edit','inventory.items.view_details',
          'purchasing.po.manage','purchasing.suppliers.view','purchasing.suppliers.manage','finance.payables.view'
        ]),
        isSystem: 1
      },
      {
        id: 'chief_designer',
        name: 'Chief Designer',
        description: 'Engineering sign-off, CAD drawing approval, full BOM releases, and CNC program verification.',
        permissions: JSON.stringify([
          'production.work_orders.create','production.operations.manage','production.work_orders.edit','production.work_orders.view',
          'approvals.work_orders','production.machining.manage','inventory.items.view','production.qc.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'assistant_designer',
        name: 'Assistant Designer',
        description: 'Component modeling, CAD revisions, and technical BOM preparation.',
        permissions: JSON.stringify([
          'production.work_orders.create','production.operations.manage','production.work_orders.edit','production.work_orders.view',
          'inventory.items.view'
        ]),
        isSystem: 1
      },
      {
        id: 'cnc_programmer',
        name: 'Programmer (CNC / CAM)',
        description: 'CAM programming, G-code path generation, tool setup, and technical drawing inspection.',
        permissions: JSON.stringify([
          'production.work_orders.view','production.machining.manage','production.operations.manage'
        ]),
        isSystem: 1
      },
      {
        id: 'finance_manager',
        name: 'Finance Manager',
        description: 'Fiscal controllership, tax invoicing authorization, customer credit approval, and ledger entries.',
        permissions: JSON.stringify([
          'quotations.view','quotations.view_all','production.work_orders.view','inventory.items.view',
          'purchasing.suppliers.view','purchasing.suppliers.manage','finance.invoices.create','finance.payments.record',
          'finance.invoices.edit','finance.tax.manage','finance.invoices.view','finance.receivables.view',
          'crm.customers.create','crm.customers.edit','crm.credit.request','crm.customers.view',
          'approvals.credit_limit','finance.payables.view','inventory.gatepass.manage','finance.journals.create',
          'finance.banking.manage','finance.accounting.view','finance.banking.view','finance.reports.view',
          'inventory.stock_ledger.view'
        ]),
        isSystem: 1
      },
      {
        id: 'finance_executive',
        name: 'Finance Executive',
        description: 'Invoicing creation, payment receipts, customer credit tracking, and general ledger journal postings.',
        permissions: JSON.stringify([
          'quotations.view','quotations.view_all','production.work_orders.view','inventory.items.view',
          'purchasing.suppliers.view','purchasing.suppliers.manage','finance.invoices.create','finance.payments.record',
          'finance.invoices.view','finance.receivables.view','finance.invoices.edit','finance.tax.manage',
          'crm.customers.create','crm.customers.edit','crm.credit.request','crm.customers.view',
          'finance.payables.view','inventory.gatepass.manage','finance.journals.create','finance.accounting.view',
          'finance.banking.view','finance.reports.view','inventory.stock_ledger.view'
        ]),
        isSystem: 1
      }
    ];

    for (const r of defaultRoles) {
      await db.query(
        'INSERT INTO roles (id, name, description, permissions, isSystem, createdAt) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), permissions=VALUES(permissions), isSystem=VALUES(isSystem)',
        [r.id, r.name, r.description, r.permissions, r.isSystem]
      );
    }
  } catch (e) {
    console.error('Error seeding roles:', e);
  }

  // 4. Default Chart of Accounts seeding
  try {
    const [coaRows]: any = await db.query('SELECT COUNT(*) as count FROM chart_of_accounts');
    if (coaRows && coaRows[0]?.count === 0) {
      const defaultAccounts = [
        { id: 'acc_1000', code: '1000', name: 'Commercial Bank', type: 'Asset', subtype: 'Bank', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1100', code: '1100', name: 'Cash in Hand', type: 'Asset', subtype: 'Cash', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1500', code: '1500', name: 'Accounts Receivable', type: 'Asset', subtype: 'Current Asset', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1600', code: '1600', name: 'Inventory - Raw Materials', type: 'Asset', subtype: 'Inventory', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1610', code: '1610', name: 'Inventory - Finished Goods', type: 'Asset', subtype: 'Inventory', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1700', code: '1700', name: 'Machinery & Equipment', type: 'Asset', subtype: 'Fixed Asset', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_2000', code: '2000', name: 'Accounts Payable', type: 'Liability', subtype: 'Current Liability', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_2200', code: '2200', name: 'Tax Payable', type: 'Liability', subtype: 'Tax', balance: 0.00, isTaxAccount: 1 },
        { id: 'acc_2300', code: '2300', name: 'Accrued Expenses', type: 'Liability', subtype: 'Current Liability', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_3900', code: '3900', name: 'Retained Earnings / Share Capital', type: 'Equity', subtype: 'Equity', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_3000', code: '3000', name: 'Sales Revenue', type: 'Revenue', subtype: 'Sales', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_3100', code: '3100', name: 'Service Income', type: 'Revenue', subtype: 'Service', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_4000', code: '4000', name: 'Raw Materials', type: 'Expense', subtype: 'Production Material', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_4001', code: '4001', name: 'Electric item', type: 'Expense', subtype: 'Production Material', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_4002', code: '4002', name: 'Sub Contract', type: 'Expense', subtype: 'Production Material', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_5000', code: '5000', name: 'Diesel for Generator', type: 'Expense', subtype: 'Production Overhead', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_5001', code: '5001', name: 'Electricity', type: 'Expense', subtype: 'Production Overhead', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_5002', code: '5002', name: 'Factory Maintenance', type: 'Expense', subtype: 'Production Overhead', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_6000', code: '6000', name: 'Audit & Accounting Fees', type: 'Expense', subtype: 'Administration', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_6001', code: '6001', name: 'Bonus', type: 'Expense', subtype: 'Administration', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_6002', code: '6002', name: 'Salaries & Wages', type: 'Expense', subtype: 'Administration', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_7000', code: '7000', name: 'Advertising', type: 'Expense', subtype: 'Selling & Distribution', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_7001', code: '7001', name: 'Sales Commissions', type: 'Expense', subtype: 'Selling & Distribution', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_8000', code: '8000', name: 'Bank Charges', type: 'Expense', subtype: 'Finance', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_9000', code: '9000', name: 'Exchange Gain or Loss', type: 'Expense', subtype: 'Non Operating', balance: 0.00, isTaxAccount: 0 }
      ];
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      for (const acc of defaultAccounts) {
        await db.query('INSERT IGNORE INTO chart_of_accounts SET ?', { ...acc, createdAt: now });
      }
    }
  } catch (e) {}

  // 5. Default Cost Centers seeding
  try {
    const [ccRows]: any = await db.query('SELECT COUNT(*) as count FROM cost_centers');
    if (ccRows && ccRows[0]?.count === 0) {
      const defaultCCs = [
        { id: 'cc_prod', code: 'PROD', name: 'Production & Workshop', department: 'Manufacturing', isActive: 1 },
        { id: 'cc_admin', code: 'ADMIN', name: 'Administration & HR', department: 'Management', isActive: 1 },
        { id: 'cc_sales', code: 'SALES', name: 'Sales & Marketing', department: 'Commercial', isActive: 1 }
      ];
      for (const cc of defaultCCs) {
        await db.query('INSERT IGNORE INTO cost_centers SET ?', cc);
      }
    }
  } catch (e) {}

  // 6. Default quotation templates seeding
  try {
    const [tplRows]: any = await db.query('SELECT COUNT(*) as count FROM quotation_templates');
    if (tplRows && tplRows[0]?.count === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const seedTemplates = [
        {
          id: 'QTPL-0001',
          name: 'Standard Precision CNC Machining',
          description: 'Standard template for CNC milling, turning and custom metal component fabrication',
          subject: 'Quotation for Precision CNC Machining & Fabrication',
          items: JSON.stringify([
            { desc: 'Precision CNC Machining of Components as per drawing / CAD model', qty: 1, unitPrice: 25000, unit: 'pcs', note: 'Material: MS / SS / Aluminum as specified' },
            { desc: 'Surface Finishing, Deburring & Dimensional Inspection Report', qty: 1, unitPrice: 3500, unit: 'lot', note: 'Certificate of Conformity included' }
          ]),
          terms: '1. Payment: 30 days from delivery.\n2. Delivery: 2-3 weeks from confirmed Purchase Order.\n3. Inspection: Dimensional inspection carried out at REX QC lab.\n4. Taxes: Applicable taxes extra as per prevailing statutory rates.',
          validity: '30 Days',
          delivery: '2-3 Weeks',
          taxProfileId: null,
          boms: '[]',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'QTPL-0002',
          name: 'Sheet Metal & Enclosure Fabrication',
          description: 'Laser cutting, CNC bending, and industrial enclosure manufacturing',
          subject: 'Quotation for Sheet Metal Laser Cutting & Powder Coated Enclosure',
          items: JSON.stringify([
            { desc: 'Custom Heavy-Duty Sheet Metal Enclosure with Hinged Door & Locking mechanism', qty: 1, unitPrice: 48000, unit: 'sets', note: '1.5mm CRCA Sheet with 7-tank pretreatment' },
            { desc: 'Electrostatic Epoxy Polyester Powder Coating (RAL 7035 Grey)', qty: 1, unitPrice: 6500, unit: 'lot', note: 'Dry film thickness 60-80 microns' }
          ]),
          terms: '1. Advance: 50% with confirmed PO, balance 50% upon delivery.\n2. Raw material price escalation: Valid for 14 days due to steel price volatility.\n3. Loading / Unloading at site by client unless specified.',
          validity: '14 Days',
          delivery: '10-15 Working Days',
          taxProfileId: null,
          boms: '[]',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'QTPL-0003',
          name: 'Industrial Machinery Repair & Maintenance',
          description: 'Routine overhauling, on-site service, bushing replacement, and mechanical maintenance',
          subject: 'Quotation for Machinery Overhaul & Preventative Maintenance',
          items: JSON.stringify([
            { desc: 'Technical Labor: Dismantling, Shaft Alignment & Bearing Replacement', qty: 1, unitPrice: 35000, unit: 'service', note: 'REX senior mechanical maintenance crew' },
            { desc: 'Machining of Custom Bronze Bushings & Pin Fabrication', qty: 2, unitPrice: 8500, unit: 'pcs', note: 'Phosphor Bronze SAE 660' }
          ]),
          terms: '1. Payment: 100% on submission of service sign-off report.\n2. Any unforeseen extra replacement parts will be quoted separately before execution.\n3. Work carried out under REX warranty of 90 days.',
          validity: '30 Days',
          delivery: '3-5 Working Days',
          taxProfileId: null,
          boms: '[]',
          createdAt: now,
          updatedAt: now
        }
      ];
      for (const tpl of seedTemplates) {
        await db.query('INSERT INTO quotation_templates SET ?', tpl);
      }
    }
  } catch (e) {}

  // 7. Safe schema patches
  const patches = [
    "ALTER TABLE chart_of_accounts ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE chart_of_accounts ADD COLUMN subtype VARCHAR(50)",
    "ALTER TABLE tax_rates ADD COLUMN accountId VARCHAR(50)",
    "ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT 'posted'",
    "ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT 'Draft'",
    "ALTER TABLE quotations ADD COLUMN docNo VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN issueNo VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN issueDate VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN quotationNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN approvedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN approvedAt DATETIME DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN rejectionReason TEXT DEFAULT NULL",
    "ALTER TABLE customers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE customers ADD COLUMN paymentTerms TEXT",
    "ALTER TABLE customers ADD COLUMN deliveryTerms TEXT",
    "ALTER TABLE customers ADD COLUMN contacts TEXT",
    "ALTER TABLE tax_profiles ADD COLUMN tax1_hidden TINYINT(1) DEFAULT '0'",
    "ALTER TABLE tax_profiles ADD COLUMN tax1_show_separately TINYINT(1) DEFAULT 0",
    "ALTER TABLE tax_profiles ADD COLUMN tax2_show_separately TINYINT(1) DEFAULT 1",
    "ALTER TABLE tax_profiles ADD COLUMN tax1_accountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE tax_profiles ADD COLUMN tax2_accountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN payments TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN total DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN date DATETIME DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN items TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN deliveryDate DATE DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN placeOfSupply VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN quotationNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN dispatchNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN orderNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN poNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerVat VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN taxType VARCHAR(50) DEFAULT 'none'",
    "ALTER TABLE invoices ADD COLUMN invoiceNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN taxBreakdown TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN attention VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN modeOfPayment VARCHAR(100) DEFAULT 'Credit'",
    "ALTER TABLE invoices ADD COLUMN additionalInfo TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN bankDetailId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN bankDetails TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN advanceDeducted DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN receiptIds TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN isProforma TINYINT(1) DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN invoiceType VARCHAR(50) DEFAULT 'tax_invoice'",
    "ALTER TABLE invoices ADD COLUMN orderId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN isTaxInclusive TINYINT(1) DEFAULT 0",
    "ALTER TABLE leads ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN description TEXT DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN address TEXT DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN brNumber VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN financeContactName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN financeContactPhone VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN industry VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN status VARCHAR(50) DEFAULT 'In Stock'",
    "ALTER TABLE customer_grns ADD COLUMN gatePassId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN dispatchedAt DATETIME DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN customerName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN customerCompany VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN photos LONGTEXT DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN type VARCHAR(50) DEFAULT 'customer_sample'",
    "ALTER TABLE gate_passes ADD COLUMN attention VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN carrier VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN reason VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE journal_lines ADD COLUMN partyId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE journal_lines ADD COLUMN partyType VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE journal_lines ADD COLUMN costCenterId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN category VARCHAR(100) DEFAULT 'Raw Materials'",
    "ALTER TABLE suppliers ADD COLUMN brNumber VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN vat VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN svat VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN phone2 VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN website VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN designation VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN contactName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN contacts TEXT DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN paymentTerms VARCHAR(100) DEFAULT 'Net 30 Days'",
    "ALTER TABLE suppliers ADD COLUMN creditDays INT DEFAULT 30",
    "ALTER TABLE suppliers ADD COLUMN creditLimit DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE suppliers ADD COLUMN requiresAdvance TINYINT(1) DEFAULT 0",
    "ALTER TABLE suppliers ADD COLUMN bankName VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN bankBranch VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN bankAccountNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN bankAccountName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN currency VARCHAR(10) DEFAULT 'LKR'",
    "ALTER TABLE suppliers ADD COLUMN status VARCHAR(20) DEFAULT 'active'",
    "ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN openingBalance DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_ledger ADD COLUMN referenceNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN description TEXT DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN debit DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_ledger ADD COLUMN credit DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_ledger ADD COLUMN paymentMethod VARCHAR(50) DEFAULT 'Bank Transfer'",
    "ALTER TABLE supplier_ledger ADD COLUMN bankAccountId VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE supplier_ledger ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "ALTER TABLE supplier_ledger ADD COLUMN debitAccountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN creditAccountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN debitAccountName VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN creditAccountName VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN mrId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN taxBreakdown TEXT DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN poId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN poIds TEXT DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNos TEXT DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN mrIds TEXT DEFAULT NULL",
    "ALTER TABLE grns ADD COLUMN poIds TEXT DEFAULT NULL",
    "ALTER TABLE grns ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE grns ADD COLUMN storageLocation VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN billedAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE purchase_orders ADD COLUMN billingStatus VARCHAR(30) DEFAULT 'unbilled'",
    "ALTER TABLE purchase_orders ADD COLUMN billIds TEXT DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN invoiceNos TEXT DEFAULT NULL",
    "ALTER TABLE supplier_bills ADD COLUMN items TEXT DEFAULT NULL",
    "ALTER TABLE supplier_bills ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_bills ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE quotation_templates ADD COLUMN data LONGTEXT DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN stepNumber INT DEFAULT 1",
    "ALTER TABLE work_order_operations ADD COLUMN machineId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN employeeId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN plannedHours DECIMAL(10,2) DEFAULT 0.00",
    "ALTER TABLE work_order_operations ADD COLUMN scheduledStart DATETIME DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN scheduledEnd DATETIME DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN isLocked TINYINT(1) DEFAULT 0",
    "ALTER TABLE work_orders ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN customer VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN orderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN plannedStartDate DATETIME DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN attachments LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN category VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN boms LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN imageUrl LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN drawingsUrl TEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN minQty INT DEFAULT 0",
    "ALTER TABLE employee_machines ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE skills ADD COLUMN description TEXT DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN inspectedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN status VARCHAR(50) DEFAULT 'Pass'",
    "ALTER TABLE qc_inspections ADD COLUMN defectReason TEXT DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN qcId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'",
    "ALTER TABLE stock_ledger ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE stock_ledger ADD COLUMN unitCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE stock_ledger ADD COLUMN totalCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE stock_ledger ADD COLUMN user VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE stock_ledger ADD COLUMN batchNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE stock_ledger ADD COLUMN location VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN assetDetails LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN subCategory VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN specifications LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN barcode VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN leadTimeDays INT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN preferredSupplier VARCHAR(150) DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN supplierPartNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN maxStock INT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN safetyStock INT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN reorderBatchQty INT DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN jobQty INT DEFAULT 1",
    "ALTER TABLE work_orders ADD COLUMN completedQty INT DEFAULT 0",
    "ALTER TABLE work_orders ADD COLUMN scrapQty INT DEFAULT 0",
    "ALTER TABLE work_orders ADD COLUMN actualStartDate DATETIME DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN completedDate DATETIME DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN actualMaterialCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE work_orders ADD COLUMN actualLaborCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE work_orders ADD COLUMN actualMachineCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE work_orders ADD COLUMN actualReworkCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE work_orders ADD COLUMN actualTotalCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE work_orders ADD COLUMN estimatedCost DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE work_orders ADD COLUMN overheadPct DECIMAL(5,2) DEFAULT 15.00",
    "ALTER TABLE work_order_operations ADD COLUMN hourlyLaborRate DECIMAL(10,2) DEFAULT 0.00",
    "ALTER TABLE work_order_operations ADD COLUMN hourlyMachineRate DECIMAL(10,2) DEFAULT 0.00",
    "ALTER TABLE employees ADD COLUMN hourlyRate DECIMAL(10,2) DEFAULT 750.00",
    "ALTER TABLE machineries ADD COLUMN hourlyCost DECIMAL(10,2) DEFAULT 1200.00",
    "ALTER TABLE qc_inspections ADD COLUMN workOrderId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN sampleQty INT DEFAULT 1",
    "ALTER TABLE qc_inspections ADD COLUMN defectQty INT DEFAULT 0",
    "ALTER TABLE qc_inspections ADD COLUMN severity VARCHAR(50) DEFAULT 'Normal'",
    "ALTER TABLE rework_logs ADD COLUMN workOrderId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN operationId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN defectCategory VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN actionTaken TEXT DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN assignedEmployeeId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN machineId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN resolvedAt DATETIME DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN resolvedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerPhone VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerEmail VARCHAR(150) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN stockStatus VARCHAR(50) DEFAULT 'In Stock'",
    "ALTER TABLE finished_goods_orders ADD COLUMN items LONGTEXT DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN quoteId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN quotationNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN invoiceId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN invoiceNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN gatePassId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN gatePassNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN carrier VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN driverName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN deliveryAddress TEXT DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN paymentTerms VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE finished_goods_orders ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE finished_goods_orders ADD COLUMN taxRate DECIMAL(5,2) DEFAULT 0.00",
    "ALTER TABLE finished_goods_orders ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerPoNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerPoDate VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerPoAttachment LONGTEXT DEFAULT NULL",
    "ALTER TABLE finished_goods_orders MODIFY productId VARCHAR(50) NULL",
    "ALTER TABLE finished_goods_orders MODIFY productName VARCHAR(255) NULL",
    "ALTER TABLE gate_passes ADD COLUMN orderId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN orderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN driverName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN issuedDate DATETIME DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN status VARCHAR(50) DEFAULT 'Dispatched'",
    "ALTER TABLE gate_passes ADD COLUMN items LONGTEXT DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN updatedAt DATETIME DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN quoteId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN quotationNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN orderId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN orderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN customerName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN customerCompany VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN totalQuotedAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE payment_receipts ADD COLUMN amount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE payment_receipts ADD COLUMN balanceDue DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE payment_receipts ADD COLUMN paymentMethod VARCHAR(50) DEFAULT 'Cash'",
    "ALTER TABLE payment_receipts ADD COLUMN accountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN accountName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN reference VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN receivedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN status VARCHAR(50) DEFAULT 'Received'",
    "ALTER TABLE payment_receipts ADD COLUMN journalEntryId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN createdAt DATETIME DEFAULT NULL",
    "ALTER TABLE payment_receipts ADD COLUMN updatedAt DATETIME DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN materialStatus VARCHAR(100) DEFAULT 'Normal'",
    "ALTER TABLE work_orders ADD COLUMN materialAlert TEXT DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN materialStatus VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN materialAlert TEXT DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN materialStatus VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN materialAlert TEXT DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN createdBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN createdByName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN customerPoNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN customerPoDate VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN customerPoAttachment LONGTEXT DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN poReceivedAt DATETIME DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN deletedAt DATETIME DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN deletedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerCompany VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerAddress TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerPhone VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerEmail VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN qcCheckpoints LONGTEXT DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN dispatchedQty INT DEFAULT 0",
    "ALTER TABLE work_orders ADD COLUMN dispatches LONGTEXT DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN dispatchedQty INT DEFAULT 0",
    "ALTER TABLE finished_goods_orders ADD COLUMN dispatches LONGTEXT DEFAULT NULL"
  ];

  for (const patch of patches) {
    try {
      await db.query(patch);
    } catch (err) {}
  }

  // 8. Default seeds if missing
  const defaultSeeds = [
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt1_absorbed', 'Option 1: VAT & SSCL Absorbed (Total Value)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt2_sscl_absorbed_vat_sep', 'Option 2: SSCL Absorbed + VAT Separate', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt3_both_separate', 'Option 3: Both SSCL & VAT Separate (2 Lines)', 'SSCL', 2.50, 'VAT', 18.00, 1, 1, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat_sscl', 'Option 2: SSCL Absorbed + VAT Separate (Standard)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat18', 'VAT Only (18% Separate)', 'VAT', 18, NULL, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT IGNORE INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES ('LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1)",
    `INSERT IGNORE INTO settings (id, val) VALUES ('company_bank_details', '[{"id":"bank_hnb","bankName":"Hatton National Bank","branchName":"Negombo","accountName":"Rex Industries (Pvt) Ltd","accountNumber":"011010078028","swiftCode":"HNBLLKLX","isDefault":true}]')`,
    `INSERT IGNORE INTO settings (id, val) VALUES ('quotation_terms_presets', '[{"id":"tc_std_30d","name":"Standard 30 Days Credit","paymentTerms":"30 days from date of delivery","validity":"30 Days","delivery":"2-3 weeks from confirmed PO","isDefault":true},{"id":"tc_50_adv","name":"50% Advance + Balance on Delivery","paymentTerms":"50% Advance with confirmed PO, balance 50% upon delivery","validity":"14 Days","delivery":"10-15 working days","isDefault":false},{"id":"tc_cod","name":"Immediate Payment on Delivery (COD)","paymentTerms":"100% on delivery against invoice","validity":"30 Days","delivery":"3-5 working days / Ex-stock","isDefault":false},{"id":"tc_milestone","name":"Progressive Milestone Payment","paymentTerms":"30% Advance, 40% on dispatch, 30% after installation & sign-off","validity":"30 Days","delivery":"4-6 weeks from approved drawings","isDefault":false}]')`,
    "INSERT IGNORE INTO settings (id, val) VALUES ('gemini_model', 'gemini-1.5-flash')",
    "INSERT INTO settings (id, val) VALUES ('openai_model', 'gpt-4o-mini') ON DUPLICATE KEY UPDATE val=VALUES(val)",
    "INSERT IGNORE INTO settings (id, val) VALUES ('deepseek_model', 'deepseek-chat')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('ai_provider', 'gemini')",
    "INSERT INTO settings (id, val) VALUES ('groq_model', 'llama-3.3-70b-versatile') ON DUPLICATE KEY UPDATE val=IF(val LIKE '%gpt-oss%', 'llama-3.3-70b-versatile', val)",
    "INSERT IGNORE INTO settings (id, val) VALUES ('ai_enabled', 'true')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('openai_system_instructions', 'You are Rex AI, an advanced intelligent ERP assistant for Rex Industries (Pvt) Ltd, Sri Lanka - an engineering, machining, and fabrication manufacturing company. You assist the team by answering queries in fluent Sinhala, Singlish, or English. You have full read-only access to all modules: Purchasing, Inventory & Stock, Work Orders & Machine Operations, Customers & Invoices, Quotations, and Finance/Accounts. Use the provided tools or execute_custom_erp_query to query real ERP data accurately. Always format currency as LKR (Rs.) and provide concise, helpful answers.')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('default_quote_validity_days', '30')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('default_lead_time_days', '14')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('low_stock_warning_pct', '20')",
    "INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES ('acc_3900', '3900', 'Retained Earnings / Share Capital', 'Equity', 'Equity', 0, NOW())",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('quotation', 'Quotations (Normal & Product)', '', 2206, 4, 1, 1, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('sales_order', 'Sales Orders', 'SO-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('work_order', 'Work Orders', 'WO-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('invoice', 'Tax Invoices', 'INV-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('receipt', 'Payment Receipts', 'REC-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('customer_grn', 'Customer Samples (GRN)', 'CGRN-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('purchase_order', 'Purchase Orders', 'PO-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('purchase_grn', 'Purchase GRN', 'PGRN-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('material_request', 'Material Requests', 'MR-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)",
    "INSERT INTO document_sequences (id, name, prefix, next_number, padding, include_user_prefix, include_customer_prefix, updated_at) VALUES ('gate_pass', 'Gate Passes / Delivery', 'GP-', 1001, 4, 0, 0, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name)"
  ];
  for (const seed of defaultSeeds) {
    try {
      await db.query(seed);
    } catch (err) {}
  }

  // Ensure quotation next_number is at least 2206 as requested
  try {
    await db.query("UPDATE document_sequences SET next_number = 2206 WHERE id = 'quotation' AND next_number < 2206");
  } catch (err) {}

  // Auto-seed user_quotation_sequences for users with prefixes
  try {
    const [uRows]: any = await db.query("SELECT id, prefix FROM users WHERE prefix IS NOT NULL AND prefix != ''");
    for (const u of (uRows || [])) {
      const pfx = (u.prefix || '').trim().toUpperCase();
      if (pfx) {
        await db.query(
          "INSERT IGNORE INTO user_quotation_sequences (user_prefix, user_id, next_number, updated_at) VALUES (?, ?, 2206, NOW())",
          [pfx, u.id]
        );
      }
    }
  } catch (err) {}

  // Auto-migrate groq_model & gemini_model default seeds
  try {
    await db.query("UPDATE settings SET val = 'gemini-1.5-flash' WHERE id = 'gemini_model' AND (val IS NULL OR val = '')");
    await db.query("UPDATE settings SET val = 'llama-3.3-70b-versatile' WHERE id = 'groq_model' AND (val LIKE '%gpt-oss%' OR val IS NULL OR val = '')");
    await db.query("UPDATE settings SET val = 'gpt-4o-mini' WHERE id = 'openai_model' AND (val LIKE '%luna%' OR val IS NULL OR val = '')");
  } catch (err) {}

  // 9. Auto-sync billing status on all POs
  try {
    const [allPos]: any = await db.query('SELECT id FROM purchase_orders');
    if (allPos && allPos.length > 0) {
      await syncPOBillingStatus(allPos.map((p: any) => p.id));
    }
  } catch (e) {}

  return { success: true, message: 'Database fixed and synchronized successfully. All tables and columns are up to date. No data was deleted.' };
}

app.post('/api/settings/fix-db', async (req, res) => {
  try {
    const result = await runDatabaseSync();
    res.json(result);
  } catch (error: any) {
    console.error('Fix DB error:', error);
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

// ==========================
// OUTGOING EMAIL (SMTP) & SENDER SERVICE
// ==========================
async function getEmailTransporter(customConfig?: any) {
  let host = customConfig?.host;
  let port = customConfig?.port;
  let secure = customConfig?.secure;
  let user = customConfig?.user;
  let pass = customConfig?.pass;

  // Retrieve existing settings from DB
  const [rows]: any = await db.query("SELECT id, val FROM settings WHERE id LIKE 'smtp_%'");
  const map = (rows || []).reduce((acc: any, r: any) => ({ ...acc, [r.id]: r.val }), {});

  host = (host || map.smtp_host || process.env.SMTP_HOST || '').trim();
  port = Number(port || map.smtp_port || process.env.SMTP_PORT || 587);
  const secureSetting = secure !== undefined ? secure : (map.smtp_secure === 'true' || port === 465);
  user = (user || map.smtp_user || map.smtp_from_email || process.env.SMTP_USER || '').trim();
  pass = (pass !== undefined && pass !== null ? pass : (map.smtp_pass || process.env.SMTP_PASS || '')).trim();

  if (!host) throw new Error('SMTP Host is not configured. Please enter your SMTP Host in Admin > Settings > Outgoing Email Settings.');
  if (!user) throw new Error('SMTP Username or Sender Email is not configured.');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: Boolean(secureSetting),
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000
  });

  return {
    transporter,
    host,
    port,
    user,
    fromEmail: (map.smtp_from_email || user).trim(),
    fromName: (map.smtp_from_name || 'Rex Industries (Pvt) Ltd').trim(),
    replyTo: (map.smtp_reply_to || map.smtp_from_email || user).trim(),
    bcc: (map.smtp_bcc || '').trim(),
    quoteSubject: map.smtp_quote_subject || 'Quotation #{number} - Rex Industries (Pvt) Ltd',
    quoteBody: map.smtp_quote_body || '',
    invoiceSubject: map.smtp_invoice_subject || 'Tax Invoice #{number} - Rex Industries (Pvt) Ltd',
    invoiceBody: map.smtp_invoice_body || ''
  };
}

// Test SMTP Connection and optionally send a live test message
app.post('/api/email/test', async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromEmail, fromName, toEmail } = req.body;
    if (!toEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email address (toEmail) is required to test email delivery' });
    }

    const emailConfig = await getEmailTransporter({
      host,
      port,
      secure,
      user,
      pass
    });

    // 1. Verify credentials and transport connection
    await emailConfig.transporter.verify();

    // 2. Send test email to verify end-to-end delivery
    const effectiveSender = fromEmail || emailConfig.fromEmail || emailConfig.user;
    const effectiveName = fromName || emailConfig.fromName || 'Rex ERP';
    
    const info = await emailConfig.transporter.sendMail({
      from: `"${effectiveName}" <${effectiveSender}>`,
      to: toEmail.trim(),
      subject: `Rex ERP - SMTP Outgoing Email Test (${new Date().toLocaleTimeString()})`,
      text: `Hello,\n\nThis is a verification email from Rex ERP confirming that your outgoing SMTP email settings and sender email address are working properly.\n\nServer: ${emailConfig.host}:${emailConfig.port}\nSender: ${effectiveSender}\nRecipient: ${toEmail}\nTimestamp: ${new Date().toISOString()}\n\nRex Industries (Pvt) Ltd`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 19px;">Rex ERP - Outgoing Email Test</h2>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Congratulations! Your outgoing email server settings and sender address have been successfully verified. Rex ERP can now send quotations, tax invoices, and official notices directly to your clients.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 18px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>SMTP Server:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${emailConfig.host}:${emailConfig.port}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Sender Address:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">${effectiveSender}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Recipient:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">${toEmail}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Verified At:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 18px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            Rex Industries (Pvt) Ltd ERP System • Automated Delivery Verification
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: `SMTP verified and test email successfully delivered to ${toEmail}!`,
      messageId: info.messageId
    });
  } catch (error: any) {
    console.error('[Email Test Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'SMTP connection failed. Check host, port, username, and password.'
    });
  }
});

// Send Document Email (Quotation, Invoice, etc.) with attachments
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, cc, bcc, subject, text, html, attachments, docType, docNumber } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email address (to) is required' });
    }
    if (!subject) {
      return res.status(400).json({ success: false, error: 'Email subject is required' });
    }

    if (docType === 'quotation' && docNumber) {
      const [qRows]: any = await db.query(
        "SELECT id, status FROM quotations WHERE id = ? OR quotationNo = ? OR docNo = ?",
        [docNumber, docNumber, docNumber]
      );
      if (qRows && qRows.length > 0) {
        const qStatus = qRows[0].status;
        if (qStatus === 'Pending Approval') {
          return res.status(403).json({
            success: false,
            error: `Quotation ${docNumber} has been sent for approval and is currently "Pending Approval". It cannot be emailed to customers until formally approved.`
          });
        }
      }
    }

    const emailConfig = await getEmailTransporter();

    const mailOptions: any = {
      from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || '',
      html: html || (text ? text.replace(/\n/g, '<br/>') : ''),
      replyTo: emailConfig.replyTo
    };

    if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    const finalBcc = [emailConfig.bcc, bcc].filter(Boolean).join(', ');
    if (finalBcc) mailOptions.bcc = finalBcc;

    if (Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att: any) => {
        let contentBuffer = att.content;
        let encoding: string | undefined = att.encoding;

        // If content is a base64 data URI (data:application/pdf;base64,...)
        if (typeof att.content === 'string' && att.content.startsWith('data:')) {
          const parts = att.content.split(';base64,');
          if (parts.length === 2) {
            contentBuffer = Buffer.from(parts[1], 'base64');
            encoding = undefined;
          }
        } else if (typeof att.content === 'string' && att.encoding === 'base64') {
          contentBuffer = Buffer.from(att.content, 'base64');
          encoding = undefined;
        }

        return {
          filename: att.filename || `${docType || 'Document'}-${docNumber || 'file'}.pdf`,
          content: contentBuffer,
          encoding,
          contentType: att.contentType || 'application/pdf'
        };
      });
    }

    const info = await emailConfig.transporter.sendMail(mailOptions);
    console.log(`[Email Sent] ${docType || 'Document'} #${docNumber || ''} sent to ${to} (Message ID: ${info.messageId})`);

    res.json({
      success: true,
      message: `Email sent successfully to ${to}`,
      messageId: info.messageId
    });
  } catch (error: any) {
    console.error('[Email Send Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email. Check SMTP settings in Admin Settings.'
    });
  }
});

// -- USER MANAGEMENT --
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.username, u.role, u.prefix, u.created_at, r.name as roleName
      FROM users u
      LEFT JOIN roles r ON u.role = r.id
      ORDER BY u.created_at DESC
    `);
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

// -- DOCUMENT SEQUENCES & SERIAL NUMBER MANAGEMENT --
app.get('/api/sequences', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM document_sequences ORDER BY id ASC');
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sequences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { prefix, next_number, padding, include_user_prefix, include_customer_prefix } = req.body;
    await db.query(
      `UPDATE document_sequences SET 
        prefix = COALESCE(?, prefix),
        next_number = COALESCE(?, next_number),
        padding = COALESCE(?, padding),
        include_user_prefix = COALESCE(?, include_user_prefix),
        include_customer_prefix = COALESCE(?, include_customer_prefix),
        updated_at = NOW()
       WHERE id = ?`,
      [
        prefix !== undefined ? prefix.trim() : null,
        next_number !== undefined ? Number(next_number) : null,
        padding !== undefined ? Number(padding) : null,
        include_user_prefix !== undefined ? (include_user_prefix ? 1 : 0) : null,
        include_customer_prefix !== undefined ? (include_customer_prefix ? 1 : 0) : null,
        id
      ]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/prefix', async (req, res) => {
  try {
    const { prefix } = req.body;
    await db.query('UPDATE users SET prefix = ? WHERE id = ?', [
      prefix !== undefined && prefix !== null ? prefix.trim().toUpperCase() : null,
      req.params.id
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sequences/user-quotations', async (req, res) => {
  try {
    const [users]: any = await db.query(
      'SELECT id as userId, name, username, prefix FROM users ORDER BY name ASC'
    );
    const [seqs]: any = await db.query('SELECT * FROM user_quotation_sequences');
    const seqMap = new Map();
    seqs.forEach((s: any) => seqMap.set((s.user_prefix || '').toUpperCase(), s));

    const [baseSeq]: any = await db.query("SELECT next_number FROM document_sequences WHERE id = 'quotation' LIMIT 1");
    const defaultNum = Number(baseSeq[0]?.next_number) || 2206;

    const result = users.map((u: any) => {
      const pfx = (u.prefix || '').trim().toUpperCase();
      const userSeq = pfx ? seqMap.get(pfx) : null;
      return {
        userId: u.userId,
        name: u.name,
        username: u.username,
        prefix: pfx,
        next_number: userSeq ? Number(userSeq.next_number) : defaultNum,
        updated_at: userSeq?.updated_at || null
      };
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sequences/user-quotations/:prefix', async (req, res) => {
  try {
    const prefix = req.params.prefix.trim().toUpperCase();
    const { next_number, userId } = req.body;
    const num = Math.max(1, parseInt(next_number, 10) || 2206);
    await db.query(
      `INSERT INTO user_quotation_sequences (user_prefix, user_id, next_number, updated_at) 
       VALUES (?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE next_number = VALUES(next_number), user_id = COALESCE(VALUES(user_id), user_id), updated_at = NOW()`,
      [prefix, userId || null, num]
    );
    res.json({ success: true, prefix, next_number: num });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sequences/next', async (req, res) => {
  try {
    const { type = 'quotation', userPrefix, customerPrefix, reserve = false, userId } = req.body;
    const [rows]: any = await db.query('SELECT * FROM document_sequences WHERE id = ? LIMIT 1', [type]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: `Sequence '${type}' not found` });
    }
    const seq = rows[0];
    const defaultNum = Number(seq.next_number) || 2206;
    const padding = Number(seq.padding) || 4;

    let currentNum = defaultNum;
    const normalizedUserPrefix = (userPrefix || '').trim().toUpperCase();

    // Check if this quotation sequence should use user-specific prefix sequence
    const isUserQuotation = (type === 'quotation' && Boolean(seq.include_user_prefix) && Boolean(normalizedUserPrefix));

    if (isUserQuotation) {
      const [uRows]: any = await db.query(
        'SELECT next_number FROM user_quotation_sequences WHERE user_prefix = ? LIMIT 1',
        [normalizedUserPrefix]
      );
      if (uRows && uRows.length > 0) {
        currentNum = Number(uRows[0].next_number) || defaultNum;
      } else {
        currentNum = defaultNum;
        await db.query(
          'INSERT INTO user_quotation_sequences (user_prefix, user_id, next_number, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE updated_at = NOW()',
          [normalizedUserPrefix, userId || null, defaultNum]
        );
      }
    }

    const paddedNumber = String(currentNum).padStart(padding, '0');
    const paddedNum = paddedNumber;

    const parts: string[] = [];
    if (seq.prefix && seq.prefix.trim()) {
      parts.push(seq.prefix.trim().replace(/[-_]+$/, ''));
    }
    if (seq.include_user_prefix && normalizedUserPrefix) {
      parts.push(normalizedUserPrefix.replace(/[-_]+$/, ''));
    }
    if (seq.include_customer_prefix && customerPrefix && customerPrefix.trim()) {
      parts.push(customerPrefix.trim().toUpperCase().replace(/[-_]+$/, ''));
    }
    // If no prefix added yet, fallback to document prefix or QT
    if (parts.length === 0) {
      if (type === 'quotation') parts.push('QT');
      else if (type === 'product_quotation') parts.push('PQ');
    }
    parts.push(paddedNumber);
    const formattedNumber = parts.join('-');

    if (reserve) {
      if (isUserQuotation) {
        await db.query(
          'UPDATE user_quotation_sequences SET next_number = next_number + 1, updated_at = NOW() WHERE user_prefix = ?',
          [normalizedUserPrefix]
        );
      } else {
        await db.query(
          'UPDATE document_sequences SET next_number = next_number + 1, updated_at = NOW() WHERE id = ?',
          [type]
        );
      }
    }

    res.json({
      success: true,
      type,
      userPrefix: normalizedUserPrefix || null,
      number: currentNum,
      paddedNumber,
      formattedNumber,
      reserved: !!reserve,
      nextNumber: reserve ? currentNum + 1 : currentNum
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- ROLE & ACCESS CONTROL MANAGEMENT --
app.get('/api/roles', async (req, res) => {
  try {
    const [rows]: any = await db.query(`
      SELECT r.id, r.name, r.description, r.permissions, r.isSystem, r.createdAt, r.updatedAt,
             COUNT(u.id) as userCount
      FROM roles r
      LEFT JOIN users u ON u.role = r.id
      GROUP BY r.id, r.name, r.description, r.permissions, r.isSystem, r.createdAt, r.updatedAt
      ORDER BY r.isSystem DESC, r.name ASC
    `);

    const formatted = rows.map((r: any) => {
      let perms: string[] = [];
      try {
        perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []);
      } catch (e) {
        perms = [];
      }
      return {
        ...r,
        permissions: perms,
        userCount: Number(r.userCount || 0),
        isSystem: Boolean(r.isSystem)
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/roles', async (req, res) => {
  try {
    const { id, name, description, permissions } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    let roleId = (id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!roleId) {
      roleId = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 30);
    }
    if (!roleId) {
      roleId = `role_${Date.now()}`;
    }

    const [existing]: any = await db.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Role ID or slug "${roleId}" already exists. Please choose a different name.` });
    }

    const permsJson = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    await db.query(
      'INSERT INTO roles (id, name, description, permissions, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, NOW(), NOW())',
      [roleId, name.trim(), description || '', permsJson]
    );

    res.json({
      success: true,
      role: {
        id: roleId,
        name: name.trim(),
        description: description || '',
        permissions: Array.isArray(permissions) ? permissions : [],
        isSystem: false,
        userCount: 0
      }
    });
  } catch (error: any) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const [existing]: any = await db.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = existing[0];
    const newName = name !== undefined && name.trim() ? name.trim() : role.name;
    const newDesc = description !== undefined ? description : role.description;
    const newPerms = permissions !== undefined ? JSON.stringify(Array.isArray(permissions) ? permissions : []) : role.permissions;

    await db.query(
      'UPDATE roles SET name = ?, description = ?, permissions = ?, updatedAt = NOW() WHERE id = ?',
      [newName, newDesc, newPerms, id]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing]: any = await db.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existing[0].isSystem) {
      return res.status(400).json({ error: 'System default roles cannot be deleted.' });
    }

    const [users]: any = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [id]);
    if (users[0]?.count > 0) {
      return res.status(400).json({
        error: `Cannot delete role "${existing[0].name}". It is currently assigned to ${users[0].count} user(s). Please reassign them before deleting.`
      });
    }

    await db.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- CUSTOMERS --
app.get('/api/customers', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows] = await db.query('SELECT * FROM customers ORDER BY joinDate DESC') as any[];
    for (const r of rows) {
      if (typeof r.contacts === 'string') {
        try {
          let parsed = JSON.parse(r.contacts);
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(e) {}
          }
          r.contacts = Array.isArray(parsed) ? parsed : [];
        } catch(e) {
          r.contacts = [];
        }
      } else if (!Array.isArray(r.contacts)) {
        r.contacts = [];
      }
    }
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows]: any = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    const r = rows[0];
    if (typeof r.contacts === 'string') {
      try {
        let parsed = JSON.parse(r.contacts);
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch(e) {}
        }
        r.contacts = Array.isArray(parsed) ? parsed : [];
      } catch(e) {
        r.contacts = [];
      }
    } else if (!Array.isArray(r.contacts)) {
      r.contacts = [];
    }
    res.json(r);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts !== undefined) {
      if (Array.isArray(data.contacts)) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'object' && data.contacts !== null) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'string') {
        try {
          const parsed = JSON.parse(data.contacts);
          data.contacts = JSON.stringify(parsed);
        } catch(e) {
          data.contacts = '[]';
        }
      } else {
        data.contacts = '[]';
      }
    }
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
    res.json({ success: true, id: data.id, invoice: safeData });
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
    delete data.id;
    if (data.contacts !== undefined) {
      if (Array.isArray(data.contacts)) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'object' && data.contacts !== null) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'string') {
        try {
          const parsed = JSON.parse(data.contacts);
          data.contacts = JSON.stringify(parsed);
        } catch(e) {
          data.contacts = '[]';
        }
      } else {
        data.contacts = '[]';
      }
    }
    
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
    const { status, actionBy, reason } = req.body; // 'approved' or 'rejected'

    const [custRows]: any = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    const cust = custRows[0];
    const entityName = cust?.company || cust?.name || id;
    const requestedAmount = Number(cust?.pendingCreditLimit || 0);
    const approver = actionBy || 'Finance Manager';
    
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

      try {
        await db.query(
          `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, 'Approved', ?, NOW(), ?, NOW())`,
          ['Credit Limit', id, cust?.id || id, entityName, requestedAmount, approver, `Credit limit authorized: Rs. ${requestedAmount.toLocaleString()}`]
        );
      } catch (logErr) {}
    } else if (status === 'rejected') {
      await db.query(`UPDATE customers SET 
        pendingCreditLimit = 0, 
        pendingRequiresAdvance = NULL,
        pendingCreditDays = NULL,
        creditLimitStatus = 'approved' 
        WHERE id = ?`, [id]); 

      try {
        await db.query(
          `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, 'Rejected', ?, NOW(), ?, NOW())`,
          ['Credit Limit', id, cust?.id || id, entityName, requestedAmount, approver, reason || 'Credit limit request rejected']
        );
      } catch (logErr) {}
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- LEADS --
app.get('/api/leads', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        l.*, 
        COALESCE(NULLIF(l.address, ''), c.address, '') as address,
        COALESCE(NULLIF(l.vat, ''), c.vat, '') as vat,
        COALESCE(NULLIF(l.svat, ''), c.svat, '') as svat
      FROM leads l 
      LEFT JOIN customers c ON l.customerId = c.id 
      ORDER BY l.lastActivity DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
      const [rows] = await db.query(`SELECT q.*, 
        COALESCE(c.name, l.name, '') as leadName, 
        COALESCE(c.company, l.company, '') as leadCompany,
        COALESCE(c.address, '') as leadAddress,
        COALESCE(c.vat, l.vat, '') as leadVat,
        COALESCE(c.svat, l.svat, '') as leadSvat
      FROM quotations q 
      LEFT JOIN leads l ON (q.leadId = l.id OR l.id = CONCAT('LEAD-', LPAD(q.leadId, 3, '0')) OR q.leadId = l.customerId OR q.leadId = REPLACE(l.id, 'LEAD-', ''))
      LEFT JOIN customers c ON (q.leadId = c.id OR (l.customerId IS NOT NULL AND l.customerId = c.id))
      ORDER BY q.date DESC`);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
    }
});

app.get('/api/quotations/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const [rows]: any = await db.query(`
      SELECT * FROM quotations 
      WHERE leadId = ? 
         OR leadId = REPLACE(?, 'LEAD-', '') 
         OR leadId = CONCAT('LEAD-', LPAD(?, 3, '0'))
         OR leadId IN (SELECT customerId FROM leads WHERE id = ?)
      ORDER BY type ASC, version DESC
    `, [leadId, leadId, leadId, leadId]);
    if (rows && rows.length > 0) {
      return res.json(rows);
    }

    // Fallback: Check if leadId is actually a quotation id, quoNo, or docNo
    const [byQuote]: any = await db.query(`
      SELECT q.*, 
        COALESCE(c.name, l.name) as leadName, 
        COALESCE(c.company, l.company) as leadCompany,
        COALESCE(c.address, '') as leadAddress,
        COALESCE(c.phone, l.phone, '') as leadPhone,
        COALESCE(c.email, l.email, '') as leadEmail,
        COALESCE(c.vat, l.vat, '') as leadVat,
        COALESCE(c.svat, l.svat, '') as leadSvat,
        c.id as matchedCustomerId
      FROM quotations q 
      LEFT JOIN leads l ON q.leadId = l.id 
      LEFT JOIN customers c ON (q.leadId = c.id OR (l.customerId IS NOT NULL AND l.customerId = c.id))
      WHERE q.id = ? OR q.docNo = ? OR q.quotationNo = ?
      LIMIT 1
    `, [leadId, leadId, leadId]);

    if (byQuote && byQuote.length > 0) {
      return res.json(byQuote[0]);
    }

    res.json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/quotations/single/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query(`
      SELECT q.*, 
        COALESCE(c.name, l.name) as leadName, 
        COALESCE(c.company, l.company) as leadCompany,
        COALESCE(c.address, '') as leadAddress,
        COALESCE(c.phone, l.phone, '') as leadPhone,
        COALESCE(c.email, l.email, '') as leadEmail,
        COALESCE(c.vat, l.vat, '') as leadVat,
        COALESCE(c.svat, l.svat, '') as leadSvat,
        c.id as matchedCustomerId
      FROM quotations q 
      LEFT JOIN leads l ON q.leadId = l.id 
      LEFT JOIN customers c ON (q.leadId = c.id OR (l.customerId IS NOT NULL AND l.customerId = c.id))
      WHERE q.id = ? OR q.docNo = ? OR q.quotationNo = ?
      LIMIT 1
    `, [id, id, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    const qType = data.type || 'customer';
    const qData = data.data ? (typeof data.data === 'string' ? JSON.parse(data.data) : data.data) : {};
    const qNo = data.quotationNo || qData.quotationNo || null;
    const createdBy = data.createdBy || qData.createdBy || (req.user && (req.user.id || req.user.username)) || null;
    const createdByName = data.createdByName || qData.createdByName || (req.user && (req.user.name || req.user.username)) || null;

    // 1. If explicit id is provided and exists in DB, update instead of creating duplicate
    if (data.id) {
      const [existingById]: any = await db.query('SELECT id, version, type, quotationNo FROM quotations WHERE id = ? LIMIT 1', [data.id]);
      if (existingById && existingById.length > 0) {
        await db.query(
          `UPDATE quotations SET 
            data = ?, 
            totalAmount = ?, 
            customAmount = ?, 
            type = COALESCE(?, type), 
            leadId = COALESCE(?, leadId), 
            date = NOW(), 
            docNo = COALESCE(?, docNo), 
            issueNo = COALESCE(?, issueNo), 
            issueDate = COALESCE(?, issueDate),
            quotationNo = COALESCE(?, quotationNo),
            createdBy = COALESCE(createdBy, ?),
            createdByName = COALESCE(createdByName, ?)
          WHERE id = ?`,
          [
            JSON.stringify(data.data),
            data.totalAmount,
            data.customAmount || null,
            data.type || null,
            data.leadId || null,
            data.docNo || null,
            data.issueNo || null,
            data.issueDate || null,
            qNo,
            createdBy,
            createdByName,
            data.id
          ]
        );
        return res.json({
          success: true,
          quotation: {
            id: data.id,
            version: existingById[0].version || 1,
            type: data.type || existingById[0].type,
            quotationNo: qNo || existingById[0].quotationNo
          }
        });
      }
    }

    // 2. Draft handling: update existing draft if matching by id, or exact quotationNo/docNo
    if (qType === 'draft' || qType === 'product_draft') {
      let existingDraft: any = null;
      if (data.id) {
        const [rows]: any = await db.query(
          'SELECT id, version FROM quotations WHERE id = ? LIMIT 1',
          [data.id]
        );
        if (rows && rows.length > 0) existingDraft = rows[0];
      }
      if (!existingDraft && qNo) {
        const [rows]: any = await db.query(
          'SELECT id, version FROM quotations WHERE (quotationNo = ? OR docNo = ?) AND type IN ("draft", "product_draft") LIMIT 1',
          [qNo, qNo]
        );
        if (rows && rows.length > 0) existingDraft = rows[0];
      }
      if (!existingDraft && data.leadId && data.leadId !== 'WALK-IN') {
        const [rows]: any = await db.query(
          'SELECT id, version FROM quotations WHERE leadId = ? AND type = ? ORDER BY date DESC LIMIT 1',
          [data.leadId, qType]
        );
        if (rows && rows.length > 0) existingDraft = rows[0];
      }
      if (existingDraft) {
        const draftId = existingDraft.id;
        await db.query(
          'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, date=NOW(), docNo=?, issueNo=?, issueDate=?, quotationNo=?, createdBy=COALESCE(?, createdBy), createdByName=COALESCE(?, createdByName) WHERE id=?',
          [
            JSON.stringify(data.data),
            data.totalAmount,
            data.customAmount || null,
            data.docNo || null,
            data.issueNo || null,
            data.issueDate || null,
            qNo,
            createdBy,
            createdByName,
            draftId
          ]
        );
        // Clean up any other duplicate drafts matching qNo or for the same customer
        if (qNo) {
          await db.query(
            'DELETE FROM quotations WHERE (quotationNo = ? OR docNo = ?) AND type IN ("draft", "product_draft") AND id != ?',
            [qNo, qNo, draftId]
          );
        }
        if (data.leadId && data.leadId !== 'WALK-IN') {
          await db.query(
            'DELETE FROM quotations WHERE leadId = ? AND type = ? AND id != ?',
            [data.leadId, qType, draftId]
          );
        }
        return res.json({
          success: true,
          quotation: {
            id: draftId,
            version: existingDraft.version || 1,
            type: qType,
            quotationNo: qNo
          }
        });
      }
    }

    // Version per leadId+type
    const [rows]: any = await db.query(
      'SELECT MAX(version) as maxVer FROM quotations WHERE leadId = ? AND type = ?',
      [data.leadId, qType]
    );
    const isDraft = qType === 'draft' || qType === 'product_draft';
    const nextVersion = isDraft ? 1 : ((rows[0]?.maxVer || 0) + 1);
    const prefix = (qType === 'product' || qType === 'product_draft') ? 'PQ' : 'QT';
    
    const newQuotation = {
      id: data.id || `${prefix}-${Date.now().toString().slice(-6)}`,
      leadId: data.leadId,
      version: nextVersion,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      data: JSON.stringify(data.data),
      totalAmount: data.totalAmount,
      customAmount: data.customAmount || null,
      type: qType,
      quotationNo: data.quotationNo || qData.quotationNo || null,
      docNo: data.docNo || qData.docNo || null,
      issueNo: data.issueNo || qData.issueNo || null,
      issueDate: data.issueDate || qData.issueDate || null,
      createdBy: createdBy,
      createdByName: createdByName
    };
    
    await db.query('INSERT INTO quotations SET ?', newQuotation);

    // If new draft was inserted, ensure older duplicate drafts are moved to trash
    if (isDraft) {
      if (newQuotation.quotationNo) {
        await db.query(
          'UPDATE quotations SET deletedAt = NOW(), deletedBy = "System Cleanup" WHERE (quotationNo = ? OR docNo = ?) AND type IN ("draft", "product_draft") AND id != ? AND deletedAt IS NULL',
          [newQuotation.quotationNo, newQuotation.quotationNo, newQuotation.id]
        );
      }
      if (data.leadId && data.leadId !== 'WALK-IN') {
        await db.query(
          'UPDATE quotations SET deletedAt = NOW(), deletedBy = "System Cleanup" WHERE leadId = ? AND type = ? AND id != ? AND deletedAt IS NULL',
          [data.leadId, qType, newQuotation.id]
        );
      }
    }

    // Auto-advance sequence for quotation numbers upon official creation
    if (qType !== 'draft' && qType !== 'product_draft' && newQuotation.quotationNo) {
      try {
        let userPfx = '';
        if (createdBy) {
          const [uRow]: any = await db.query('SELECT prefix FROM users WHERE id = ? OR username = ? LIMIT 1', [createdBy, createdBy]);
          if (uRow && uRow[0]?.prefix) userPfx = uRow[0].prefix.trim().toUpperCase();
        }
        if (!userPfx && qData.userPrefix) {
          userPfx = String(qData.userPrefix).trim().toUpperCase();
        }

        const numMatch = String(newQuotation.quotationNo).match(/(\d+)$/);
        if (numMatch) {
          const usedNum = parseInt(numMatch[1], 10);
          if (userPfx) {
            await db.query(
              `INSERT INTO user_quotation_sequences (user_prefix, user_id, next_number, updated_at) 
               VALUES (?, ?, ?, NOW()) 
               ON DUPLICATE KEY UPDATE next_number = GREATEST(next_number, VALUES(next_number)), updated_at = NOW()`,
              [userPfx, createdBy || null, usedNum + 1]
            );
          } else {
            await db.query(
              "UPDATE document_sequences SET next_number = GREATEST(next_number, ?), updated_at = NOW() WHERE id = 'quotation'",
              [usedNum + 1]
            );
          }
        }
      } catch (seqErr) {
        console.error('Error auto-advancing quotation sequence:', seqErr);
      }
    }

    // Clean up any drafts associated with this finalized quotation
    if (qType !== 'draft' && qType !== 'product_draft') {
      try {
        const cleanupIds = [data.draftId, data.id].filter(Boolean);
        const cleanupNos = [newQuotation.quotationNo, newQuotation.docNo, data.quotationNo, data.docNo].filter(Boolean);
        if (cleanupIds.length > 0) {
          await db.query('DELETE FROM quotations WHERE id IN (?) AND type IN ("draft", "product_draft")', [cleanupIds]);
        }
        if (cleanupNos.length > 0) {
          await db.query('DELETE FROM quotations WHERE (quotationNo IN (?) OR docNo IN (?)) AND type IN ("draft", "product_draft")', [cleanupNos, cleanupNos]);
        }
      } catch (cleanupErr) {
        console.error('Error cleaning up drafts on quotation creation:', cleanupErr);
      }
    }

    res.json({ success: true, quotation: newQuotation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/quotations/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Prevent direct edits if quotation is Approved or locked in workflow without bypassApprovalLock
    if (!data.bypassApprovalLock) {
      const [existing]: any = await db.query('SELECT status FROM quotations WHERE id = ?', [id]);
      if (existing && existing.length > 0) {
        const curStatus = existing[0].status;
        const lockedStatuses = ['Approved', 'Accepted', 'In Production', 'PO Received', 'Pending Edit Approval'];
        if (lockedStatuses.includes(curStatus)) {
          return res.status(403).json({
            error: `Quotation is currently "${curStatus}" and locked against direct edits. Please submit an edit approval request to management before making revisions.`
          });
        }
      }
    }

    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    const qData = data.data ? (typeof data.data === 'string' ? JSON.parse(data.data) : data.data) : {};
    const qNo = data.quotationNo || qData.quotationNo || null;

    await db.query(
      `UPDATE quotations SET 
        data = ?, 
        totalAmount = ?, 
        customAmount = ?, 
        type = COALESCE(?, type), 
        leadId = COALESCE(?, leadId), 
        date = NOW(), 
        docNo = COALESCE(?, docNo), 
        issueNo = COALESCE(?, issueNo), 
        issueDate = COALESCE(?, issueDate),
        quotationNo = COALESCE(?, quotationNo),
        createdBy = COALESCE(createdBy, ?),
        createdByName = COALESCE(createdByName, ?)
      WHERE id = ?`,
      [
        JSON.stringify(data.data), 
        data.totalAmount, 
        data.customAmount || null, 
        data.type || null, 
        data.leadId || null, 
        data.docNo || null, 
        data.issueNo || null, 
        data.issueDate || null,
        qNo,
        data.createdBy || qData.createdBy || null,
        data.createdByName || qData.createdByName || null,
        id
      ]
    );

    // Clean up any drafts associated with this quotation if it is finalized
    if (data.type && data.type !== 'draft' && data.type !== 'product_draft') {
      try {
        const cleanupNos = [qNo, data.docNo].filter(Boolean);
        if (data.draftId) {
          await db.query('UPDATE quotations SET deletedAt = NOW(), deletedBy = "System Cleanup" WHERE id = ? AND type IN ("draft", "product_draft") AND deletedAt IS NULL', [data.draftId]);
        }
        if (cleanupNos.length > 0) {
          await db.query('UPDATE quotations SET deletedAt = NOW(), deletedBy = "System Cleanup" WHERE (quotationNo IN (?) OR docNo IN (?)) AND type IN ("draft", "product_draft") AND id != ? AND deletedAt IS NULL', [cleanupNos, cleanupNos, id]);
        }
      } catch (cleanupErr) {
        console.error('Error cleaning up drafts on update:', cleanupErr);
      }
    }

    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/quotations/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, rejectionReason } = req.body;

    // Approval Gate check: Cannot mark as Sent or In Production without being Approved
    if (status === 'Sent' || status === 'In Production') {
      const [current]: any = await db.query('SELECT status FROM quotations WHERE id = ?', [id]);
      if (current && current.length > 0) {
        const cur = current[0].status;
        if (cur !== 'Approved' && cur !== 'Sent' && cur !== 'In Production') {
          return res.status(400).json({ 
            error: 'Quotation must be Approved before sending to customer or issuing for production.' 
          });
        }
      }
    }

    if (status === 'Approved') {
      await db.query(
        'UPDATE quotations SET status = ?, approvedBy = ?, approvedAt = NOW(), rejectionReason = NULL WHERE id = ?',
        [status, approvedBy || 'Authorized Approver', id]
      );
    } else if (status === 'Rejected') {
      await db.query(
        'UPDATE quotations SET status = ?, rejectionReason = ? WHERE id = ?',
        [status, rejectionReason || null, id]
      );
    } else {
      await db.query('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);
    }
    res.json({ success: true, id, status });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/quotations/:id/submit-approval', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT id, type, status FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const q = rows[0];
    if (q.type === 'draft' || q.type === 'product_draft') {
      return res.status(400).json({ error: 'Quotation drafts cannot be submitted for approval. Please save the quotation first.' });
    }
    await db.query(
      "UPDATE quotations SET status = 'Pending Approval', rejectionReason = NULL WHERE id = ?",
      [id]
    );
    res.json({ success: true, id, status: 'Pending Approval' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotations/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const [rows]: any = await db.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quote = rows[0];

    // Promote type if it was a draft so it becomes a permanent official quotation
    let newType = quote.type;
    if (quote.type === 'draft') newType = 'main';
    else if (quote.type === 'product_draft') newType = 'product';

    await db.query(
      "UPDATE quotations SET status = 'Approved', type = ?, approvedBy = ?, approvedAt = NOW(), rejectionReason = NULL WHERE id = ?",
      [newType, approvedBy || 'Authorized Approver', id]
    );

    // Auto-advance sequence for this quotation number so the next number is properly reserved
    try {
      let parsed: any = {};
      if (quote?.data) {
        try { parsed = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data; } catch (e) {}
      }
      const recordNo = quote.quotationNo || parsed.quotationNo || quote.docNo || quote.id || id;
      const numMatch = String(recordNo).match(/(\d+)$/);
      if (numMatch) {
        const usedNum = parseInt(numMatch[1], 10);
        let userPfx = '';
        const createdBy = quote.createdBy || parsed.createdBy;
        if (createdBy) {
          const [uRow]: any = await db.query('SELECT prefix FROM users WHERE id = ? OR username = ? LIMIT 1', [createdBy, createdBy]);
          if (uRow && uRow[0]?.prefix) userPfx = uRow[0].prefix.trim().toUpperCase();
        }
        if (!userPfx && parsed.userPrefix) {
          userPfx = String(parsed.userPrefix).trim().toUpperCase();
        }
        if (userPfx) {
          await db.query(
            `INSERT INTO user_quotation_sequences (user_prefix, user_id, next_number, updated_at) 
             VALUES (?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE next_number = GREATEST(next_number, VALUES(next_number)), updated_at = NOW()`,
            [userPfx, createdBy || null, usedNum + 1]
          );
        } else {
          await db.query(
            "UPDATE document_sequences SET next_number = GREATEST(next_number, ?), updated_at = NOW() WHERE id = 'quotation'",
            [usedNum + 1]
          );
        }
      }
    } catch (seqErr) {
      console.error('Error auto-advancing quotation sequence on approval:', seqErr);
    }

    // Audit log
    try {
      let parsed: any = {};
      if (quote?.data) {
        try { parsed = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data; } catch (e) {}
      }
      const recordNo = quote.quotationNo || parsed.quotationNo || quote?.docNo || quote?.id || id;
      const entityName = parsed.customerCompany || parsed.customerName || quote?.leadId || 'Customer';
      const amount = Number(quote?.totalAmount || parsed.custTotals?.total || 0);

      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Approved', ?, NOW(), ?, NOW())`,
        ['Quotation', id, recordNo, entityName, amount, approvedBy || 'Authorized Approver', 'Commercial Quotation approved']
      );
    } catch (logErr) {}

    res.json({ success: true, id, status: 'Approved', type: newType });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotations/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, rejectedBy } = req.body;
    await db.query(
      "UPDATE quotations SET status = 'Rejected', rejectionReason = ? WHERE id = ?",
      [reason || 'Rejected by management', id]
    );

    // Audit log
    try {
      const [rows]: any = await db.query('SELECT * FROM quotations WHERE id = ?', [id]);
      const quote = rows[0];
      let parsed: any = {};
      if (quote?.data) {
        try { parsed = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data; } catch (e) {}
      }
      const recordNo = parsed.quotationNo || quote?.docNo || quote?.id || id;
      const entityName = parsed.customerCompany || parsed.customerName || quote?.leadId || 'Customer';
      const amount = Number(quote?.totalAmount || parsed.custTotals?.total || 0);

      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Rejected', ?, NOW(), ?, NOW())`,
        ['Quotation', id, recordNo, entityName, amount, rejectedBy || 'Authorized Approver', reason || 'Rejected by management']
      );
    } catch (logErr) {}

    res.json({ success: true, id, status: 'Rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request Edit Approval for an Approved Quotation
app.post('/api/quotations/:id/request-edit-approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, requestedBy } = req.body;

    const [rows]: any = await db.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quote = rows[0];

    await db.query(
      "UPDATE quotations SET status = 'Pending Edit Approval', rejectionReason = ? WHERE id = ?",
      [reason || 'Quotation edit requested by sales executive', id]
    );

    // Audit log
    try {
      let parsed: any = {};
      if (quote?.data) {
        try { parsed = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data; } catch (e) {}
      }
      const recordNo = quote.quotationNo || parsed.quotationNo || quote.docNo || quote.id || id;
      const entityName = parsed.customerCompany || parsed.customerName || quote.leadId || 'Customer';
      const amount = Number(quote.totalAmount || parsed.custTotals?.total || 0);

      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Edit Requested', ?, NOW(), ?, NOW())`,
        ['Quotation', id, recordNo, entityName, amount, requestedBy || 'Sales Executive', reason || 'Quotation edit approval requested']
      );
    } catch (logErr) {}

    res.json({ success: true, id, status: 'Pending Edit Approval' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Edit Request: Unlocks Quotation by resetting to 'Draft' so it can be edited
app.post('/api/quotations/:id/approve-edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;

    const [rows]: any = await db.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quote = rows[0];

    await db.query(
      "UPDATE quotations SET status = 'Draft', approvedBy = NULL, approvedAt = NULL, rejectionReason = NULL WHERE id = ?",
      [id]
    );

    // Audit log
    try {
      let parsed: any = {};
      if (quote?.data) {
        try { parsed = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data; } catch (e) {}
      }
      const recordNo = quote.quotationNo || parsed.quotationNo || quote.docNo || quote.id || id;
      const entityName = parsed.customerCompany || parsed.customerName || quote.leadId || 'Customer';
      const amount = Number(quote.totalAmount || parsed.custTotals?.total || 0);

      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Edit Approved', ?, NOW(), ?, NOW())`,
        ['Quotation', id, recordNo, entityName, amount, approvedBy || 'Authorized Approver', notes || 'Quotation unlocked for editing by management']
      );
    } catch (logErr) {}

    res.json({ success: true, id, status: 'Draft' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Edit Request: Keeps quotation Approved
app.post('/api/quotations/:id/reject-edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;

    const [rows]: any = await db.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quote = rows[0];

    await db.query(
      "UPDATE quotations SET status = 'Approved', rejectionReason = NULL WHERE id = ?",
      [id]
    );

    // Audit log
    try {
      let parsed: any = {};
      if (quote?.data) {
        try { parsed = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data; } catch (e) {}
      }
      const recordNo = quote.quotationNo || parsed.quotationNo || quote.docNo || quote.id || id;
      const entityName = parsed.customerCompany || parsed.customerName || quote.leadId || 'Customer';
      const amount = Number(quote.totalAmount || parsed.custTotals?.total || 0);

      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Edit Rejected', ?, NOW(), ?, NOW())`,
        ['Quotation', id, recordNo, entityName, amount, rejectedBy || 'Authorized Approver', reason || 'Quotation edit request rejected by management']
      );
    } catch (logErr) {}

    res.json({ success: true, id, status: 'Approved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Customer PO Received for Quotation
app.post('/api/quotations/:id/po-received', async (req, res) => {
  try {
    const { id } = req.params;
    let { customerPoNo, customerPoDate, customerPoAttachment, notes, receivedBy, poStatus } = req.body;

    if (poStatus === 'PO Pending') {
      customerPoNo = customerPoNo?.trim() || 'PO PENDING';
    } else if (poStatus === 'Without PO') {
      customerPoNo = customerPoNo?.trim() || 'WITHOUT PO';
    } else {
      poStatus = customerPoNo ? 'PO Received' : 'PO Received';
    }

    if (!customerPoNo && !poStatus) {
      return res.status(400).json({ error: 'Customer PO Number or PO Status (PO Pending / Without PO) is required' });
    }

    const [rows]: any = await db.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const quote = rows[0];
    let qData: any = {};
    if (quote?.data) {
      try {
        qData = typeof quote.data === 'string' ? JSON.parse(quote.data) : quote.data;
      } catch (e) {}
    }

    qData.customerPoNo = customerPoNo;
    qData.poStatus = poStatus;
    qData.customerPoDate = customerPoDate || new Date().toISOString().slice(0, 10);
    qData.customerPoAttachment = customerPoAttachment || null;
    if (notes) qData.customerPoNotes = notes;

    let newStatus = quote.status;
    if (poStatus === 'PO Pending') {
      newStatus = 'PO Pending';
    } else if (poStatus === 'Without PO') {
      newStatus = 'Without PO';
    } else if (quote.status === 'Approved' || quote.status === 'Sent' || quote.status === 'Draft' || !quote.status) {
      newStatus = 'PO Received';
    }

    await db.query(
      `UPDATE quotations SET 
        customerPoNo = ?,
        customerPoDate = ?,
        customerPoAttachment = ?,
        poReceivedAt = NOW(),
        status = ?,
        data = ?
      WHERE id = ?`,
      [
        customerPoNo,
        customerPoDate || new Date().toISOString().slice(0, 10),
        customerPoAttachment ? String(customerPoAttachment) : null,
        newStatus,
        JSON.stringify(qData),
        id
      ]
    );

    // If a sales order or finished goods order exists for this quotation, sync PO
    const qNo = quote.quotationNo || quote.docNo || id;
    await db.query(
      `UPDATE finished_goods_orders SET 
        customerPoNo = ?, 
        customerPoDate = ?, 
        customerPoAttachment = COALESCE(?, customerPoAttachment),
        updatedAt = NOW() 
      WHERE quoteId = ? OR quotationNo = ?`,
      [customerPoNo, customerPoDate || new Date().toISOString().slice(0, 10), customerPoAttachment || null, id, qNo]
    ).catch(() => {});

    // Log to approval logs
    try {
      const recordNo = qNo;
      const entityName = qData.customerCompany || qData.customerName || quote?.leadId || 'Customer';
      const amount = Number(quote?.totalAmount || qData.custTotals?.total || 0);
      const actionName = poStatus === 'PO Pending' ? 'PO Pending' : poStatus === 'Without PO' ? 'Without PO' : 'PO Received';
      const logNote = notes || (poStatus === 'PO Pending' ? 'Customer PO is Pending' : poStatus === 'Without PO' ? 'Approved Without Customer PO' : `Customer PO #${customerPoNo} recorded`);
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
        ['Quotation', id, recordNo, entityName, amount, actionName, receivedBy || quote.createdByName || 'Sales Team', logNote]
      );
    } catch (e) {}

    res.json({ 
      success: true, 
      id, 
      quotationId: id,
      status: newStatus,
      customerPoNo, 
      poStatus,
      customerPoDate: customerPoDate || new Date().toISOString().slice(0, 10),
      data: qData
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fetch all POs under a Customer
app.get('/api/customers/:id/pos', async (req, res) => {
  try {
    const { id } = req.params;
    const [custRows]: any = await db.query('SELECT id, name, company FROM customers WHERE id = ?', [id]);
    const cust = custRows && custRows[0] ? custRows[0] : null;
    const names = [id];
    if (cust) {
      if (cust.name) names.push(cust.name);
      if (cust.company) names.push(cust.company);
    }

    const [quotePos]: any = await db.query(
      `SELECT id as quoteId, quotationNo, docNo, totalAmount, customerPoNo, customerPoDate, customerPoAttachment, poReceivedAt, status, createdAt
       FROM quotations
       WHERE (leadId = ? OR leadId IN (SELECT id FROM leads WHERE customerId = ?))
         AND customerPoNo IS NOT NULL AND customerPoNo != ''
       ORDER BY COALESCE(poReceivedAt, createdAt) DESC`,
      [id, id]
    ).catch(() => [[]]);

    const [orderPos]: any = await db.query(
      `SELECT id as orderId, orderNo, quotationNo, totalPrice as totalAmount, customerPoNo, customerPoDate, customerPoAttachment, status, createdAt
       FROM finished_goods_orders
       WHERE customerId = ?
         AND customerPoNo IS NOT NULL AND customerPoNo != ''
       ORDER BY createdAt DESC`,
      [id]
    ).catch(() => [[]]);

    res.json({ 
      quotePos: quotePos || [], 
      orderPos: orderPos || [] 
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// -- APPROVAL LOGS AUDIT TRAIL API --
app.get('/api/approval-logs', async (req, res) => {
  try {
    const { module, action, search } = req.query;
    let sql = 'SELECT * FROM approval_logs WHERE 1=1';
    const params: any[] = [];

    if (module && module !== 'all') {
      sql += ' AND module = ?';
      params.push(module);
    }
    if (action && action !== 'all') {
      sql += ' AND action = ?';
      params.push(action);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (recordNo LIKE ? OR entityName LIKE ? OR actionBy LIKE ? OR notes LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY actionDate DESC, id DESC LIMIT 500';

    const [rows]: any = await db.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching approval logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch approval logs' });
  }
});

app.post('/api/approval-logs', async (req, res) => {
  try {
    const { module, recordId, recordNo, entityName, amount, action, actionBy, notes, metadata } = req.body;
    const [result]: any = await db.query(
      `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, NOW())`,
      [
        module || 'General',
        recordId || '',
        recordNo || recordId || '',
        entityName || '',
        Number(amount) || 0,
        action || 'Approved',
        actionBy || 'Authorized Approver',
        notes || '',
        metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error: any) {
    console.error('Error creating approval log:', error);
    res.status(500).json({ error: error.message || 'Failed to record approval log' });
  }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.query as any;
    // Safety check: Prevent deleting Approved or PO Received quotations directly
    const [rows]: any = await db.query('SELECT id, status, quotationNo FROM quotations WHERE id = ?', [id]);
    if (rows && rows.length > 0) {
      const q = rows[0];
      if (q.status === 'Approved' || q.status === 'PO Received') {
        return res.status(400).json({ error: `Cannot delete quotation ${q.quotationNo || id} because it is already '${q.status}'. Please reject or cancel it first.` });
      }
    }
    // Soft delete so it moves to Trash and can be restored at any time directly from the system
    await db.query('UPDATE quotations SET deletedAt = NOW(), deletedBy = ? WHERE id = ?', [user || 'User', id]);
    res.json({ success: true, message: 'Quotation moved to trash' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// Restore soft-deleted quotation from Trash
app.post('/api/quotations/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE quotations SET deletedAt = NULL, deletedBy = NULL WHERE id = ?', [id]);
    res.json({ success: true, message: 'Quotation restored successfully from trash' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to restore quotation' });
  }
});

// Permanent deletion from Trash (Hard Delete)
app.delete('/api/quotations/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quotations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Quotation permanently deleted' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to permanently delete quotation' });
  }
});

// -- QUOTATION TEMPLATES --
app.get('/api/quotation-templates', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM quotation_templates ORDER BY updatedAt DESC, createdAt DESC');
    const parsed = rows.map((r: any) => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []),
      boms: typeof r.boms === 'string' ? JSON.parse(r.boms || '[]') : (r.boms || []),
      data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || null),
    }));
    res.json(parsed);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to fetch quotation templates' });
  }
});

app.get('/api/quotation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM quotation_templates WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const r = rows[0];
    const parsed = {
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []),
      boms: typeof r.boms === 'string' ? JSON.parse(r.boms || '[]') : (r.boms || []),
      data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || null),
    };
    res.json(parsed);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to fetch quotation template' });
  }
});

app.post('/api/quotation-templates', async (req, res) => {
  try {
    const { name, description, subject, items, terms, validity, delivery, taxProfileId, boms, data } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    const id = `QTPL-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newTemplate: any = {
      id,
      name,
      description: description || null,
      subject: subject || null,
      items: JSON.stringify(items || []),
      terms: terms || null,
      validity: validity || null,
      delivery: delivery || null,
      taxProfileId: taxProfileId || null,
      boms: JSON.stringify(boms || []),
      data: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null,
      createdAt: now,
      updatedAt: now
    };
    await db.query('INSERT INTO quotation_templates SET ?', newTemplate);
    res.json({ success: true, template: { ...newTemplate, items: items || [], boms: boms || [], data: data || null } });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to create quotation template' });
  }
});

app.put('/api/quotation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subject, items, terms, validity, delivery, taxProfileId, boms, data } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updateData: any = {
      updatedAt: now
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (items !== undefined) updateData.items = JSON.stringify(items);
    if (terms !== undefined) updateData.terms = terms;
    if (validity !== undefined) updateData.validity = validity;
    if (delivery !== undefined) updateData.delivery = delivery;
    if (taxProfileId !== undefined) updateData.taxProfileId = taxProfileId;
    if (boms !== undefined) updateData.boms = JSON.stringify(boms);
    if (data !== undefined) updateData.data = typeof data === 'string' ? data : JSON.stringify(data);

    await db.query('UPDATE quotation_templates SET ? WHERE id = ?', [updateData, id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to update quotation template' });
  }
});

app.delete('/api/quotation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quotation_templates WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to delete quotation template' });
  }
});

// -- CUSTOMER GRNS --
app.get('/api/crm/grns', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        g.*, 
        COALESCE(g.customerCompany, c.company, l.company, '') as companyName,
        COALESCE(g.customerName, c.name, l.name, '') as personName,
        COALESCE(g.customerName, c.name, l.name, '') as customerName,
        COALESCE(g.customerCompany, c.company, l.company, '') as customerCompany,
        COALESCE(c.phone, l.phone, '') as customerPhone,
        COALESCE(c.email, l.email, '') as customerEmail,
        COALESCE(c.address, '') as customerAddress,
        l.name as leadName, 
        l.company as leadCompany, 
        q.docNo as quotationDocNo,
        q.totalAmount as quotationTotal,
        q.status as quotationStatus,
        q.date as quotationDate,
        COALESCE(g.quoNo, q.docNo, q.id) as displayQuoNo,
        gp.id as gpId,
        gp.issuedDate as gpDate,
        gp.carrier as gpCarrier,
        gp.vehicleNo as gpVehicleNo,
        gp.attention as gpAttention,
        gp.reason as gpReason,
        gp.status as gpStatus
      FROM customer_grns g 
      LEFT JOIN leads l ON g.leadId = l.id 
      LEFT JOIN customers c ON l.customerId = c.id 
      LEFT JOIN quotations q ON g.quoteId = q.id
      LEFT JOIN gate_passes gp ON (g.gatePassId = gp.id OR gp.grnId = g.id)
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
    const data = { ...req.body };
    delete data.isExisting;
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    if (data.photos && typeof data.photos === 'object') data.photos = JSON.stringify(data.photos);
    
    // Auto-generate GRN ID (S-XXXX)
    let grnId = data.id;
    if (!grnId) {
      const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM customer_grns');
      const nextNum = (countResult[0]?.c || 0) + 1;
      grnId = 'S-' + nextNum.toString().padStart(4, '0');
    }

    const item = {
      ...data,
      id: grnId,
      status: data.status || 'In Stock',
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
    const data = { ...req.body };
    delete data.id;
    delete data.isExisting;
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    if (data.photos && typeof data.photos === 'object') data.photos = JSON.stringify(data.photos);
    await db.query('UPDATE customer_grns SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/crm/grns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM customer_grns WHERE id = ?', [id]);
    res.json({ success: true, message: 'Customer sample GRN deleted' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- GATE PASSES --
app.get('/api/gate-passes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT gp.*, 
             g.receivedAt as grnReceivedAt, 
             g.receivedBy as grnReceivedBy,
             q.docNo as quotationDocNo,
             COALESCE(gp.quoNo, q.docNo, q.id) as displayQuoNo
      FROM gate_passes gp
      LEFT JOIN customer_grns g ON gp.grnId = g.id
      LEFT JOIN quotations q ON gp.quoteId = q.id
      ORDER BY gp.createdAt DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gate-passes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM gate_passes WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Gate pass not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gate-passes', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') {
      data.items = JSON.stringify(data.items);
    }
    
    // Auto-generate Gate Pass ID (GP-XXXX)
    let gpId = data.id;
    if (!gpId) {
      const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM gate_passes');
      const nextNum = (countResult[0]?.c || 0) + 1;
      gpId = 'GP-' + nextNum.toString().padStart(4, '0');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const item = {
      ...data,
      id: gpId,
      issuedDate: data.issuedDate || now,
      status: data.status || 'Dispatched',
      createdAt: now
    };

    let validGpCols = new Set<string>();
    try {
      const [gpCols]: any = await db.query('SHOW COLUMNS FROM gate_passes');
      validGpCols = new Set(gpCols.map((c: any) => c.Field));
    } catch (e) {}

    const safeItem: any = {};
    for (const [k, v] of Object.entries(item)) {
      if (validGpCols.size === 0 || validGpCols.has(k)) {
        safeItem[k] = v;
      }
    }

    await db.query('INSERT INTO gate_passes SET ?', safeItem);

    // If linked to a customer GRN, update GRN status to Dispatched and store gatePassId
    if (item.grnId) {
      await db.query(
        'UPDATE customer_grns SET gatePassId = ?, status = ?, dispatchedAt = ? WHERE id = ?',
        [gpId, 'Dispatched', item.issuedDate, item.grnId]
      );
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/gate-passes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    if (data.items && typeof data.items === 'object') {
      data.items = JSON.stringify(data.items);
    }

    let validGpCols = new Set<string>();
    try {
      const [gpCols]: any = await db.query('SHOW COLUMNS FROM gate_passes');
      validGpCols = new Set(gpCols.map((c: any) => c.Field));
    } catch (e) {}

    const safeData: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (validGpCols.size === 0 || validGpCols.has(k)) {
        safeData[k] = v;
      }
    }

    await db.query('UPDATE gate_passes SET ? WHERE id = ?', [safeData, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/gate-passes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE customer_grns SET gatePassId = NULL, status = 'In Stock', dispatchedAt = NULL WHERE gatePassId = ?", [id]);
    await db.query('DELETE FROM gate_passes WHERE id = ?', [id]);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    if (data.suppliers && typeof data.suppliers === 'object') data.suppliers = JSON.stringify(data.suppliers);
    if (data.specifications && typeof data.specifications === 'object') data.specifications = JSON.stringify(data.specifications);
    if (data.boms && typeof data.boms === 'object') data.boms = JSON.stringify(data.boms);
    if (data.assetDetails && typeof data.assetDetails === 'object') data.assetDetails = JSON.stringify(data.assetDetails);
    if (data.spareParts && typeof data.spareParts === 'object') data.spareParts = JSON.stringify(data.spareParts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    if (data.suppliers && typeof data.suppliers === 'object') data.suppliers = JSON.stringify(data.suppliers);
    if (data.specifications && typeof data.specifications === 'object') data.specifications = JSON.stringify(data.specifications);
    if (data.boms && typeof data.boms === 'object') data.boms = JSON.stringify(data.boms);
    if (data.assetDetails && typeof data.assetDetails === 'object') data.assetDetails = JSON.stringify(data.assetDetails);
    if (data.spareParts && typeof data.spareParts === 'object') data.spareParts = JSON.stringify(data.spareParts);
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
// -- STOCK LEDGER & MOVEMENTS --
app.get('/api/inventory/ledger/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.*, COALESCE(i.name, l.notes) as materialName, i.sku, COALESCE(i.uom, 'pcs') as unit, i.type as itemType, i.category as itemCategory
      FROM stock_ledger l 
      LEFT JOIN inventory i ON l.inventoryId = i.id 
      ORDER BY l.date DESC 
      LIMIT 500
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.get('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM stock_ledger WHERE inventoryId = ? ORDER BY date DESC LIMIT 200', [id]);
    res.json(rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/inventory/ledger/wo/:woId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, COALESCE(i.name, l.notes) as materialName, COALESCE(i.uom, 'pcs') as unit 
       FROM stock_ledger l 
       LEFT JOIN inventory i ON l.inventoryId = i.id 
       WHERE l.reference = ? ORDER BY l.date DESC`,
      [req.params.woId]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    
    const [invRows]: any = await db.query('SELECT quantity, unitCost, location, name FROM inventory WHERE id = ?', [id]);
    if (!invRows.length) return res.status(404).json({ error: 'Item not found' });
    
    const currentQty = Number(invRows[0].quantity || 0);
    const qtyVal = Number(data.qty) || 0;
    const unitCost = Number(data.unitCost !== undefined ? data.unitCost : (invRows[0].unitCost || 0));
    const typeUpper = String(data.type || 'IN').toUpperCase();

    let newBalance = currentQty;
    if (typeUpper === 'OUT' || typeUpper === 'SCRAP' || typeUpper === 'DISPATCH') {
      newBalance = currentQty - qtyVal;
    } else if (typeUpper === 'ADJUSTMENT' || typeUpper === 'RECONCILE') {
      newBalance = data.targetBalance !== undefined ? Number(data.targetBalance) : (data.isNegative ? currentQty - qtyVal : currentQty + qtyVal);
    } else if (typeUpper === 'TRANSFER') {
      newBalance = currentQty; // Location change only
    } else {
      newBalance = currentQty + qtyVal;
    }

    const totalCost = Number(data.totalCost || (qtyVal * unitCost));

    const entry = {
      id: 'LGR-' + Date.now().toString().slice(-6),
      inventoryId: id,
      date: data.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
      type: typeUpper,
      qty: qtyVal,
      balance: newBalance,
      unitCost,
      totalCost,
      user: data.user || 'Admin',
      batchNo: data.batchNo || '',
      location: data.location || invRows[0].location || '',
      reference: data.reference || '',
      notes: data.notes || ''
    };
    
    await db.query('INSERT INTO stock_ledger SET ?', entry);
    await db.query('UPDATE inventory SET quantity = ?, location = COALESCE(?, location) WHERE id = ?', [newBalance, data.location || null, id]);
    
    res.json({ success: true, entry, newBalance });
  } catch (error: any) {
    console.error('Stock ledger entry error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/inventory/reconcile', async (req, res) => {
  try {
    const { inventoryId, physicalCount, notes, user, reference } = req.body;
    if (!inventoryId) return res.status(400).json({ error: 'Item ID is required' });

    const [invRows]: any = await db.query('SELECT quantity, unitCost, location, name FROM inventory WHERE id = ?', [inventoryId]);
    if (!invRows.length) return res.status(404).json({ error: 'Item not found' });

    const currentQty = Number(invRows[0].quantity || 0);
    const targetCount = Number(physicalCount || 0);
    const diff = targetCount - currentQty;
    const unitCost = Number(invRows[0].unitCost || 0);

    const entry = {
      id: 'LGR-ADJ-' + Date.now().toString().slice(-6),
      inventoryId,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      qty: Math.abs(diff),
      balance: targetCount,
      unitCost,
      totalCost: Math.abs(diff) * unitCost,
      user: user || 'Store Auditor',
      location: invRows[0].location || '',
      reference: reference || 'Physical Cycle Count Audit',
      notes: notes || `Reconciled from ${currentQty} to ${targetCount} (Variance: ${diff > 0 ? '+' : ''}${diff})`
    };

    await db.query('INSERT INTO stock_ledger SET ?', entry);
    await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [targetCount, inventoryId]);

    res.json({ success: true, entry, targetCount, variance: diff });
  } catch (error: any) {
    console.error('Stock reconciliation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// -- LINEAR STOCK REMNANTS & CUT OPTIMIZER --
app.get('/api/inventory/remnants', async (req, res) => {
  try {
    const { materialName, status } = req.query;
    let query = 'SELECT * FROM stock_remnants WHERE 1=1';
    const params: any[] = [];
    if (materialName) {
      query += ' AND materialName LIKE ?';
      params.push(`%${materialName}%`);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    } else {
      query += " AND status != 'consumed'";
    }
    query += ' ORDER BY length DESC, createdAt DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/remnants', async (req, res) => {
  try {
    const data = { ...req.body };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const id = data.id || `REM-${Date.now().toString().slice(-6)}`;
    const remnant = {
      id,
      inventoryId: data.inventoryId || null,
      materialName: data.materialName || 'Linear Material',
      sku: data.sku || '',
      profileType: data.profileType || 'shaft',
      dimension: data.dimension || '',
      standardLength: Number(data.standardLength) || 12.0,
      length: Number(data.length) || 0,
      unit: data.unit || 'feet',
      location: data.location || 'Offcut Rack A',
      sourceBarId: data.sourceBarId || '',
      jobRef: data.jobRef || '',
      status: data.status || 'available',
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now
    };
    await db.query('INSERT INTO stock_remnants SET ?', remnant);
    res.json({ success: true, remnant });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/remnants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE stock_remnants SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/remnants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM stock_remnants WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/cut-issue', async (req, res) => {
  try {
    const jobRef = (req.body.jobRef || '').trim();
    if (!jobRef) {
      return res.status(400).json({ error: 'Job number / Work Order reference is strictly mandatory to execute Material Issue.' });
    }

    const cutMode = req.body.cutMode || (req.body.sourceType === 'remnant' ? 'from_remnant' : 'from_full_bar');
    const remnantId = req.body.remnantId || req.body.sourceRemnantId;
    const inventoryId = req.body.inventoryId || null;
    const materialName = req.body.materialName || 'Linear Stock Bar';
    const reqLen = Number(req.body.requiredLength !== undefined ? req.body.requiredLength : req.body.cutLength);
    const cutQty = Math.max(1, Number(req.body.cutQty || 1));
    const kerfPerCut = Number(req.body.kerfLoss !== undefined ? req.body.kerfLoss : (req.body.sawKerf || 0));
    const totalCutNeeded = Number(((reqLen * cutQty) + (kerfPerCut * cutQty)).toFixed(3));
    const stdLen = Number(req.body.standardLength) || 12.0;
    const unit = req.body.unit || 'ft';
    const location = req.body.location || 'Offcut Rack A';
    const user = req.body.user || 'Storekeeper';
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (!reqLen || reqLen <= 0) {
      return res.status(400).json({ error: 'Invalid required cut length' });
    }

    if (cutMode === 'from_remnant') {
      if (!remnantId) return res.status(400).json({ error: 'Remnant ID is required' });
      const [remRows]: any = await db.query('SELECT * FROM stock_remnants WHERE id = ?', [remnantId]);
      if (!remRows.length) return res.status(404).json({ error: 'Remnant piece not found in database' });

      const rem = remRows[0];
      const curLen = Number(rem.length);
      if (curLen < totalCutNeeded) {
        return res.status(400).json({ error: `Remnant piece (${curLen} ${unit}) is shorter than required total cut (${totalCutNeeded} ${unit})` });
      }

      const leftover = Number((curLen - totalCutNeeded).toFixed(2));

      if (leftover > 0.05) {
        await db.query(
          'UPDATE stock_remnants SET length = ?, jobRef = ?, notes = ?, updatedAt = ? WHERE id = ?',
          [
            leftover,
            jobRef,
            `${rem.notes || ''} | Issued ${reqLen} ${unit} x ${cutQty} pcs for Job #${jobRef} on ${now.slice(0, 10)}`.trim(),
            now,
            remnantId
          ]
        );
      } else {
        await db.query("UPDATE stock_remnants SET status = 'consumed', length = 0, updatedAt = ? WHERE id = ?", [now, remnantId]);
      }

      // Record Stock Ledger audit
      if (rem.inventoryId) {
        await db.query('INSERT INTO stock_ledger SET ?', {
          id: 'LGR-' + Date.now().toString().slice(-6),
          inventoryId: rem.inventoryId,
          date: now,
          type: 'OUT',
          qty: reqLen * cutQty,
          balance: 0,
          user,
          reference: jobRef,
          notes: `Material Issue: Cut ${reqLen} ${unit} x ${cutQty} pcs for Job #${jobRef} from Remnant #${remnantId} (Initial: ${curLen} ${unit}, Leftover: ${Math.max(0, leftover)} ${unit})`
        });
      }

      return res.json({
        success: true,
        cutMode: 'from_remnant',
        consumedLength: reqLen * cutQty,
        cutLength: reqLen,
        cutQty,
        sourceType: 'remnant',
        unit,
        jobRef,
        leftoverLength: Math.max(0, leftover),
        isRemnantFullyUsed: leftover <= 0.05,
        remnantId,
        message: `Successfully issued ${reqLen} ${unit} (Qty: ${cutQty}) for Job #${jobRef} from Remnant #${remnantId}. Remaining piece: ${Math.max(0, leftover)} ${unit}.`
      });

    } else {
      // Cut from fresh full stock bar
      let invItem: any = null;
      if (inventoryId) {
        const [invRows]: any = await db.query('SELECT * FROM inventory WHERE id = ?', [inventoryId]);
        if (invRows.length) invItem = invRows[0];
      }

      if (invItem) {
        const currentQty = Number(invItem.quantity || 0);
        if (currentQty <= 0) {
          return res.status(400).json({ error: `Out of stock for ${invItem.name}. No full bars available.` });
        }
        await db.query('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', [inventoryId]);
      }

      const leftover = Number((stdLen - totalCutNeeded).toFixed(2));
      let newRemnantId = null;

      if (leftover > 0.05) {
        newRemnantId = `REM-${Date.now().toString().slice(-6)}`;
        await db.query('INSERT INTO stock_remnants SET ?', {
          id: newRemnantId,
          inventoryId: inventoryId || null,
          materialName: materialName || invItem?.name || 'Linear Bar',
          sku: invItem?.sku || '',
          profileType: req.body.profileType || 'shaft',
          dimension: req.body.dimension || invItem?.name?.match(/(\d+\s*mm|Ø\s*\d+|[\d./]+")/i)?.[0] || '',
          standardLength: stdLen,
          length: leftover,
          unit,
          location: location || invItem?.location || 'Offcut Rack A',
          sourceBarId: inventoryId || 'Full Bar',
          jobRef,
          status: 'available',
          notes: `Material Issue: Cut ${reqLen} ${unit} x ${cutQty} pcs from full ${stdLen} ${unit} bar for Job #${jobRef}`,
          createdAt: now,
          updatedAt: now
        });
      }

      // Record Stock Ledger audit
      if (inventoryId) {
        await db.query('INSERT INTO stock_ledger SET ?', {
          id: 'LGR-' + Date.now().toString().slice(-6),
          inventoryId,
          date: now,
          type: 'OUT',
          qty: 1,
          balance: invItem ? invItem.quantity - 1 : 0,
          user,
          reference: jobRef,
          notes: `Material Issue: 1 full bar (${stdLen} ${unit}) deducted -> Cut ${reqLen} ${unit} x ${cutQty} pcs for Job #${jobRef}. New offcut created: ${leftover} ${unit}`
        });
      }

      return res.json({
        success: true,
        cutMode: 'from_full_bar',
        consumedLength: reqLen * cutQty,
        cutLength: reqLen,
        cutQty,
        sourceType: 'full_bar',
        unit,
        jobRef,
        leftoverLength: Math.max(0, leftover),
        newRemnantId,
        message: `Cut 1 full bar of ${stdLen} ${unit} for Job #${jobRef}. Issued ${reqLen} ${unit} (Qty: ${cutQty}). Stored new leftover remnant of ${leftover} ${unit} in ${location}.`
      });
    }
  } catch (error: any) {
    console.error('Cut issue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// -- FINISHED GOODS ORDERS --
app.get('/api/finished-goods-orders', async (req, res) => {
  try {
    const { productId, status } = req.query;
    let query = 'SELECT * FROM finished_goods_orders WHERE 1=1';
    const params: any[] = [];
    if (productId) {
      query += ' AND productId = ?';
      params.push(productId);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY createdAt DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.get('/api/finished-goods-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM finished_goods_orders WHERE id = ? OR orderNo = ? LIMIT 1', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/finished-goods-orders', async (req, res) => {
  try {
    const data = { ...req.body };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const id = data.id || `FGO-${Date.now().toString().slice(-6)}`;
    const orderNo = data.orderNo || `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    
    // Parse items if provided
    let itemsList: any[] = [];
    if (data.items) {
      if (typeof data.items === 'string') {
        try {
          itemsList = JSON.parse(data.items);
        } catch (e) {
          itemsList = [];
        }
      } else if (Array.isArray(data.items)) {
        itemsList = data.items;
      }
    }

    // Calculate subtotal and stock status
    let subtotal = Number(data.subtotal) || 0;
    let stockStatus = 'In Stock';

    if (itemsList.length > 0) {
      if (!subtotal) {
        subtotal = itemsList.reduce((acc, it) => acc + (Number(it.qty || 1) * Number(it.unitPrice || 0)), 0);
      }

      // Check stock availability across items
      for (const item of itemsList) {
        const pId = item.productId || item.inventoryId;
        if (pId) {
          const [inv]: any = await db.query('SELECT quantity, name FROM inventory WHERE id = ?', [pId]);
          if (inv.length > 0) {
            const available = Number(inv[0].quantity || 0);
            const ordered = Number(item.qty || 1);
            if (available < ordered) {
              stockStatus = `Shortage (${inv[0].name}: ${ordered - available} req)`;
              break;
            }
          }
        }
      }
    } else if (data.productId) {
      const [inv]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [data.productId]);
      if (inv.length > 0) {
        const available = Number(inv[0].quantity || 0);
        const ordered = Number(data.qty || 1);
        if (available < ordered) {
          stockStatus = `Shortage (${ordered - available} req)`;
        }
      }
    }

    const taxAmount = Number(data.taxAmount) || 0;
    const totalPrice = Number(data.totalPrice) || (subtotal + taxAmount) || (Number(data.qty || 1) * Number(data.unitPrice || 0));
    
    // Primary product name/id (guaranteed non-null)
    const primaryName = data.productName || (itemsList.length > 0 ? (itemsList[0].description || itemsList[0].productName || 'Order Item') : 'Finished Goods Order');
    const primaryId = data.productId || (itemsList.length > 0 ? (itemsList[0].productId || itemsList[0].inventoryId || 'CUSTOM-ORDER') : 'CUSTOM-ORDER');
    const primarySku = data.productSku || (itemsList.length > 0 ? (itemsList[0].productSku || itemsList[0].sku || '') : '');
    const totalQty = itemsList.length > 0 ? itemsList.reduce((sum, i) => sum + (Number(i.qty) || 1), 0) : (Number(data.qty) || 1);

    const order = {
      id,
      orderNo,
      productId: primaryId,
      productName: primaryName,
      productSku: primarySku,
      customerId: data.customerId || null,
      customerName: data.customerName || 'Customer',
      attention: data.attention || null,
      customerPhone: data.customerPhone || null,
      customerEmail: data.customerEmail || null,
      orderDate: data.orderDate || now.slice(0, 10),
      targetDeliveryDate: data.targetDeliveryDate || null,
      qty: totalQty,
      unitPrice: Number(data.unitPrice) || (totalQty > 0 ? (subtotal / totalQty) : 0),
      subtotal,
      taxAmount,
      taxRate: Number(data.taxRate) || 0,
      taxProfileId: data.taxProfileId || null,
      totalPrice,
      status: data.status || 'Pending',
      stockStatus: data.stockStatus || stockStatus,
      isDispatched: data.isDispatched ? 1 : 0,
      dispatchedAt: data.dispatchedAt || null,
      items: itemsList.length > 0 ? JSON.stringify(itemsList) : (data.items || null),
      quoteId: data.quoteId || null,
      quotationNo: data.quotationNo || null,
      invoiceId: data.invoiceId || null,
      invoiceNo: data.invoiceNo || null,
      gatePassId: data.gatePassId || null,
      gatePassNo: data.gatePassNo || null,
      carrier: data.carrier || null,
      vehicleNo: data.vehicleNo || null,
      driverName: data.driverName || null,
      deliveryAddress: data.deliveryAddress || null,
      paymentTerms: data.paymentTerms || null,
      customerPoNo: data.customerPoNo || null,
      customerPoDate: data.customerPoDate || null,
      customerPoAttachment: data.customerPoAttachment ? (typeof data.customerPoAttachment === 'object' ? JSON.stringify(data.customerPoAttachment) : String(data.customerPoAttachment)) : null,
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now
    };

    // Resilient schema check: verify columns exist or auto-create before INSERT
    let validCols = new Set<string>();
    try {
      const [colRows]: any = await db.query('SHOW COLUMNS FROM finished_goods_orders');
      validCols = new Set(colRows.map((c: any) => c.Field));
      
      const alterQueries = [
        { col: 'attention', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN attention VARCHAR(255) DEFAULT NULL' },
        { col: 'items', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN items LONGTEXT DEFAULT NULL' },
        { col: 'quoteId', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN quoteId VARCHAR(50) DEFAULT NULL' },
        { col: 'quotationNo', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN quotationNo VARCHAR(100) DEFAULT NULL' },
        { col: 'invoiceId', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN invoiceId VARCHAR(50) DEFAULT NULL' },
        { col: 'invoiceNo', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN invoiceNo VARCHAR(100) DEFAULT NULL' },
        { col: 'gatePassId', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN gatePassId VARCHAR(50) DEFAULT NULL' },
        { col: 'gatePassNo', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN gatePassNo VARCHAR(100) DEFAULT NULL' },
        { col: 'carrier', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN carrier VARCHAR(255) DEFAULT NULL' },
        { col: 'vehicleNo', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL' },
        { col: 'driverName', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN driverName VARCHAR(255) DEFAULT NULL' },
        { col: 'deliveryAddress', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN deliveryAddress TEXT DEFAULT NULL' },
        { col: 'paymentTerms', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN paymentTerms VARCHAR(100) DEFAULT NULL' },
        { col: 'subtotal', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00' },
        { col: 'taxAmount', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00' },
        { col: 'taxRate', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN taxRate DECIMAL(5,2) DEFAULT 0.00' },
        { col: 'taxProfileId', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL' },
        { col: 'customerPoNo', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN customerPoNo VARCHAR(100) DEFAULT NULL' },
        { col: 'customerPoDate', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN customerPoDate VARCHAR(50) DEFAULT NULL' },
        { col: 'customerPoAttachment', sql: 'ALTER TABLE finished_goods_orders ADD COLUMN customerPoAttachment LONGTEXT DEFAULT NULL' },
      ];
      for (const q of alterQueries) {
        if (!validCols.has(q.col)) {
          try {
            await db.query(q.sql);
            validCols.add(q.col);
          } catch (e) {}
        }
      }
      try {
        await db.query('ALTER TABLE finished_goods_orders MODIFY productId VARCHAR(50) NULL');
      } catch (e) {}
    } catch (e) {
      // Create table if completely missing
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS finished_goods_orders (
            id VARCHAR(50) PRIMARY KEY,
            orderNo VARCHAR(50) NOT NULL,
            productId VARCHAR(50) DEFAULT 'CUSTOM-ORDER',
            productName VARCHAR(255) DEFAULT 'Order Item',
            productSku VARCHAR(100) DEFAULT NULL,
            customerId VARCHAR(50) DEFAULT NULL,
            customerName VARCHAR(255) NOT NULL,
            attention VARCHAR(255) DEFAULT NULL,
            customerPhone VARCHAR(100) DEFAULT NULL,
            customerEmail VARCHAR(150) DEFAULT NULL,
            orderDate DATE NOT NULL,
            targetDeliveryDate DATE DEFAULT NULL,
            qty DECIMAL(10,2) NOT NULL DEFAULT 1.00,
            unitPrice DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            totalPrice DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            subtotal DECIMAL(15,2) DEFAULT 0.00,
            taxAmount DECIMAL(15,2) DEFAULT 0.00,
            taxRate DECIMAL(5,2) DEFAULT 0.00,
            taxProfileId VARCHAR(50) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            stockStatus VARCHAR(50) DEFAULT 'In Stock',
            isDispatched TINYINT(1) DEFAULT 0,
            dispatchedAt DATETIME DEFAULT NULL,
            items LONGTEXT DEFAULT NULL,
            quoteId VARCHAR(50) DEFAULT NULL,
            quotationNo VARCHAR(100) DEFAULT NULL,
            invoiceId VARCHAR(50) DEFAULT NULL,
            invoiceNo VARCHAR(100) DEFAULT NULL,
            gatePassId VARCHAR(50) DEFAULT NULL,
            gatePassNo VARCHAR(100) DEFAULT NULL,
            carrier VARCHAR(255) DEFAULT NULL,
            vehicleNo VARCHAR(100) DEFAULT NULL,
            driverName VARCHAR(255) DEFAULT NULL,
            deliveryAddress TEXT DEFAULT NULL,
            paymentTerms VARCHAR(100) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            createdAt DATETIME DEFAULT NULL,
            updatedAt DATETIME DEFAULT NULL
          )
        `);
        const [colRows]: any = await db.query('SHOW COLUMNS FROM finished_goods_orders');
        validCols = new Set(colRows.map((c: any) => c.Field));
      } catch (err) {}
    }

    const safeOrder: any = {};
    for (const [k, v] of Object.entries(order)) {
      if (validCols.size === 0 || validCols.has(k)) {
        safeOrder[k] = v;
      }
    }

    const [result]: any = await db.query('INSERT INTO finished_goods_orders SET ?', safeOrder);
    const insertedId = result?.insertId || safeOrder.id;

    if (safeOrder.status === 'Pending Advance Approval') {
      try {
        await db.query(
          `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, 'Advance Waiver Requested', ?, NOW(), ?, NOW())`,
          ['Sales Order', String(insertedId), safeOrder.orderNo, safeOrder.customerName || 'Customer', Number(safeOrder.totalPrice || safeOrder.subtotal || 0), safeOrder.createdBy || 'Sales Executive', safeOrder.notes || 'Sales Order submitted without advance payment proforma']
        );
      } catch (logErr) {}
    }

    res.json({ success: true, order, id: insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Approve Sales Order Advance Waiver
app.post('/api/finished-goods-orders/:id/approve-advance-waiver', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;

    const [orders]: any = await db.query('SELECT * FROM finished_goods_orders WHERE id = ? OR orderNo = ?', [id, id]);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    const updatedNotes = `${order.notes || ''}\n[Advance Waiver Approved by ${approvedBy || 'Admin'} on ${new Date().toISOString().slice(0, 10)}]`.trim();

    await db.query(
      "UPDATE finished_goods_orders SET status = 'Confirmed', notes = ? WHERE id = ? OR orderNo = ?",
      [updatedNotes, order.id, order.orderNo]
    );

    // Audit log
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Advance Waiver Approved', ?, NOW(), ?, NOW())`,
        ['Sales Order', String(order.id), order.orderNo || String(order.id), order.customerName || 'Customer', Number(order.totalPrice || order.subtotal || 0), approvedBy || 'Admin', notes || 'Approved Sales Order creation without advance deposit']
      );
    } catch (logErr) {}

    res.json({ success: true, id: order.id, status: 'Confirmed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Sales Order Advance Waiver
app.post('/api/finished-goods-orders/:id/reject-advance-waiver', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;

    const [orders]: any = await db.query('SELECT * FROM finished_goods_orders WHERE id = ? OR orderNo = ?', [id, id]);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    const updatedNotes = `${order.notes || ''}\n[Advance Waiver Rejected by ${rejectedBy || 'Admin'}: ${reason || 'Advance payment required'}]`.trim();

    await db.query(
      "UPDATE finished_goods_orders SET status = 'Rejected', notes = ? WHERE id = ? OR orderNo = ?",
      [updatedNotes, order.id, order.orderNo]
    );

    // Audit log
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Advance Waiver Rejected', ?, NOW(), ?, NOW())`,
        ['Sales Order', String(order.id), order.orderNo || String(order.id), order.customerName || 'Customer', Number(order.totalPrice || order.subtotal || 0), rejectedBy || 'Admin', reason || 'Sales Order rejected: Advance deposit mandatory']
      );
    } catch (logErr) {}

    res.json({ success: true, id: order.id, status: 'Rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/finished-goods-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') {
      data.items = JSON.stringify(data.items);
    }
    if (data.customerPoAttachment && typeof data.customerPoAttachment === 'object') {
      data.customerPoAttachment = JSON.stringify(data.customerPoAttachment);
    }
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [colRows]: any = await db.query('SHOW COLUMNS FROM finished_goods_orders');
    const validCols = new Set(colRows.map((c: any) => c.Field));
    const safeData: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (validCols.has(k)) {
        safeData[k] = v;
      }
    }

    await db.query('UPDATE finished_goods_orders SET ? WHERE id = ? OR orderNo = ?', [safeData, id, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/finished-goods-orders/:id/dispatch', async (req, res) => {
  try {
    const { id } = req.params;
    const dispatchDetails = req.body || {};
    const [orders]: any = await db.query('SELECT * FROM finished_goods_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];
    const totalOrderQty = Math.max(1, Number(order.qty || 1));
    const prevDispatched = Number(order.dispatchedQty || 0);
    if (order.isDispatched || (prevDispatched >= totalOrderQty)) {
      return res.status(400).json({ error: 'Order is already fully dispatched' });
    }
    const currentDispatchQty = Math.max(1, Math.min(
      totalOrderQty - prevDispatched,
      Number(dispatchDetails.dispatchQty || (totalOrderQty - prevDispatched))
    ));
    const newCumulative = prevDispatched + currentDispatchQty;
    const remainingQty = Math.max(0, totalOrderQty - newCumulative);
    const isFinal = remainingQty === 0;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Auto-generate Gate Pass ID (GP-XXXX)
    const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM gate_passes');
    const nextNum = (countResult[0]?.c || 0) + 1;
    const gpId = 'GP-' + nextNum.toString().padStart(4, '0');

    // Parse items to deduce dispatch stock and prepare gate pass items
    let parsedItems: any[] = [];
    if (order.items) {
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (e) {
        parsedItems = [];
      }
    }

    const gatePassItemsList = parsedItems.length > 0
      ? parsedItems.map(it => ({
          description: it.description || it.productName || order.productName,
          qty: currentDispatchQty,
          unit: it.uom || 'Nos',
          remarks: `Order ${order.orderNo} (Batch: ${newCumulative}/${totalOrderQty})`
        }))
      : [{
          description: order.productName || 'Finished Goods',
          qty: currentDispatchQty,
          unit: 'Nos',
          remarks: `Order ${order.orderNo} (Batch: ${newCumulative}/${totalOrderQty})`
        }];

    // 2. Insert Gate Pass
    const resolvedVehicleNo = (dispatchDetails.vehicleNo && typeof dispatchDetails.vehicleNo === 'string' && dispatchDetails.vehicleNo.trim())
      ? dispatchDetails.vehicleNo.trim()
      : (order.vehicleNo || null);

    const gatePassData: any = {
      id: gpId,
      type: 'goods_delivery',
      orderId: order.id,
      orderNo: order.orderNo,
      quoteId: order.quoteId || null,
      quoNo: order.quotationNo || null,
      customerId: order.customerId || null,
      customerName: order.customerName,
      customerCompany: order.customerName,
      attention: dispatchDetails.attention || order.attention || order.customerName,
      address: dispatchDetails.destination || order.deliveryAddress || null,
      phone: order.customerPhone || null,
      email: order.customerEmail || null,
      carrier: dispatchDetails.carrier || order.carrier || 'REX Transport',
      vehicleNo: resolvedVehicleNo,
      driverName: dispatchDetails.driverName || order.driverName || null,
      reason: dispatchDetails.reason || `Finished Goods Delivery for Order ${order.orderNo}`,
      items: JSON.stringify(gatePassItemsList),
      issuedBy: dispatchDetails.issuedBy || 'Store Keeper',
      issuedDate: now,
      status: 'Dispatched',
      notes: dispatchDetails.notes || order.notes || '',
      createdAt: now
    };

    let validGpCols = new Set<string>();
    try {
      const [gpCols]: any = await db.query('SHOW COLUMNS FROM gate_passes');
      validGpCols = new Set(gpCols.map((c: any) => c.Field));
    } catch (e) {}

    const safeGatePassData: any = {};
    for (const [k, v] of Object.entries(gatePassData)) {
      if (validGpCols.size === 0 || validGpCols.has(k)) {
        safeGatePassData[k] = v;
      }
    }

    await db.query('INSERT INTO gate_passes SET ?', safeGatePassData);

    // 3. Deduct stock for all items
    if (parsedItems.length > 0) {
      for (const it of parsedItems) {
        const prodId = it.productId || it.inventoryId;
        const itQty = Number(it.qty) || 1;
        if (prodId) {
          const [invRows]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [prodId]);
          if (invRows.length > 0) {
            const currentQty = Number(invRows[0].quantity || 0);
            const newQty = currentQty - itQty;
            await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, prodId]);

            const ledgerEntry = {
              id: 'LGR-' + Date.now().toString().slice(-5) + '-' + Math.floor(Math.random() * 1000),
              inventoryId: prodId,
              date: now,
              type: 'OUT',
              qty: itQty,
              reference: `${order.orderNo} / ${gpId}`,
              notes: `Dispatched Order ${order.orderNo} to ${order.customerName} via Gate Pass ${gpId}`
            };
            await db.query('INSERT INTO stock_ledger SET ?', ledgerEntry);
          }
        }
      }
    } else if (order.productId) {
      const dispatchQty = Number(order.qty) || 1;
      const [invRows]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [order.productId]);
      if (invRows.length > 0) {
        const currentQty = Number(invRows[0].quantity || 0);
        const newQty = currentQty - dispatchQty;
        await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, order.productId]);

        const ledgerEntry = {
          id: 'LGR-' + Date.now().toString().slice(-5),
          inventoryId: order.productId,
          date: now,
          type: 'OUT',
          qty: dispatchQty,
          reference: `${order.orderNo} / ${gpId}`,
          notes: `Dispatched Order ${order.orderNo} for ${order.customerName} via Gate Pass ${gpId}`
        };
        await db.query('INSERT INTO stock_ledger SET ?', ledgerEntry);
      }
    }

    // 4. Update Sales Order with Partial / Full Dispatch
    let existingDispatches: any[] = [];
    try {
      existingDispatches = typeof order.dispatches === 'string' ? JSON.parse(order.dispatches || '[]') : (order.dispatches || []);
    } catch (e) {
      existingDispatches = [];
    }

    const dnId = 'DN-' + nextNum.toString().padStart(4, '0');
    const newDispatchRecord = {
      id: dnId,
      dispatchNo: dnId,
      gatePassId: gpId,
      date: now,
      dispatchedQty: currentDispatchQty,
      cumulativeQty: newCumulative,
      remainingQty: remainingQty,
      totalJobQty: totalOrderQty,
      isFinalDispatch: isFinal,
      carrier: dispatchDetails.carrier || order.carrier || 'REX Transport',
      vehicleNo: resolvedVehicleNo,
      driverName: dispatchDetails.driverName || order.driverName || '',
      receivedBy: dispatchDetails.attention || order.attention || '',
      destination: dispatchDetails.destination || order.deliveryAddress || '',
      notes: dispatchDetails.notes || order.notes || '',
      items: gatePassItemsList,
      dispatchedBy: dispatchDetails.issuedBy || 'Store Keeper'
    };
    existingDispatches.push(newDispatchRecord);

    const updateOrder: any = {
      status: isFinal ? 'Dispatched' : 'Partially Dispatched',
      isDispatched: isFinal ? 1 : 0,
      dispatchedQty: newCumulative,
      dispatches: JSON.stringify(existingDispatches),
      dispatchedAt: isFinal ? now : (order.dispatchedAt || now),
      gatePassId: gpId,
      gatePassNo: gpId,
      carrier: dispatchDetails.carrier || order.carrier || 'REX Transport',
      vehicleNo: resolvedVehicleNo,
      driverName: dispatchDetails.driverName || order.driverName || null,
      updatedAt: now
    };

    // Also sync to linked work order if exists
    if (order.orderNo) {
      try {
        const [woRows]: any = await db.query('SELECT id, jobQty, dispatchedQty, dispatches FROM work_orders WHERE orderNo = ?', [order.orderNo]);
        if (woRows.length > 0) {
          const wo = woRows[0];
          let woDispatches: any[] = [];
          try {
            woDispatches = typeof wo.dispatches === 'string' ? JSON.parse(wo.dispatches || '[]') : (wo.dispatches || []);
          } catch (e) {
            woDispatches = [];
          }
          woDispatches.push(newDispatchRecord);
          const woStatus = isFinal ? 'Completed' : 'Partially Dispatched';
          await db.query(
            'UPDATE work_orders SET dispatchedQty = ?, dispatches = ?, status = ?, completedQty = GREATEST(completedQty, ?), updatedAt = NOW() WHERE id = ?',
            [newCumulative, JSON.stringify(woDispatches), woStatus, newCumulative, wo.id]
          );
        }
      } catch (err) {
        console.error('Error syncing dispatch to work order:', err);
      }
    }

    let validFgoCols = new Set<string>();
    try {
      const [fgoCols]: any = await db.query('SHOW COLUMNS FROM finished_goods_orders');
      validFgoCols = new Set(fgoCols.map((c: any) => c.Field));
    } catch (e) {}

    const safeUpdateOrder: any = {};
    for (const [k, v] of Object.entries(updateOrder)) {
      if (validFgoCols.size === 0 || validFgoCols.has(k)) {
        safeUpdateOrder[k] = v;
      }
    }

    await db.query('UPDATE finished_goods_orders SET ? WHERE id = ?', [safeUpdateOrder, id]);

    res.json({
      success: true,
      message: `Order dispatched successfully with Gate Pass ${gpId}!`,
      gatePassId: gpId,
      gatePass: gatePassData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.delete('/api/finished-goods-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM finished_goods_orders WHERE id = ? OR orderNo = ?', [id, id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// -- PURCHASING --

// Helper to sync Material Request fulfillment status across all linked Purchase Orders
async function syncMRFulfillmentStatus(targetMrIds: string[] | string) {
  const ids = Array.from(new Set((Array.isArray(targetMrIds) ? targetMrIds : [targetMrIds]).filter(Boolean)));
  for (const mrId of ids) {
    try {
      // Find all POs that link to this MR
      const [pos]: any = await db.query(
        'SELECT id, items, mrId, mrIds FROM purchase_orders WHERE mrId = ? OR mrIds LIKE ? OR items LIKE ?',
        [mrId, `%${mrId}%`, `%"mrId":"${mrId}"%`]
      );
      
      const [mrRows]: any = await db.query('SELECT id, items, status FROM material_requests WHERE id = ?', [mrId]);
      if (!mrRows || mrRows.length === 0) continue;
      
      const mr = mrRows[0];
      const mrItems = typeof mr.items === 'string' ? JSON.parse(mr.items) : (mr.items || []);
      
      const orderedMap: Record<string, number> = {};
      const linkedPoIdSet = new Set<string>();

      for (const po of pos) {
        let poMrIds: string[] = [];
        if (Array.isArray(po.mrIds)) poMrIds = po.mrIds;
        else if (typeof po.mrIds === 'string') {
          try { poMrIds = JSON.parse(po.mrIds); } catch { poMrIds = [po.mrIds]; }
        }
        if (po.mrId && !poMrIds.includes(po.mrId)) poMrIds.push(po.mrId);

        const isLinkedToThisMr = poMrIds.includes(mrId);
        const pItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
        let poHasItemsForThisMr = false;

        for (const it of pItems) {
          if (it.mrId ? it.mrId === mrId : isLinkedToThisMr) {
            poHasItemsForThisMr = true;
            const key = String(it.inventoryId || it.desc || it.id || '');
            if (key) {
              orderedMap[key] = (orderedMap[key] || 0) + (Number(it.qty) || 0);
            }
          }
        }

        if (isLinkedToThisMr || poHasItemsForThisMr) {
          linkedPoIdSet.add(po.id);
        }
      }

      let totalRequested = 0;
      let totalOrdered = 0;
      let allItemsFulfilled = mrItems.length > 0;

      for (const mrIt of mrItems) {
        const key = String(mrIt.inventoryId || mrIt.desc || mrIt.id || '');
        const reqQty = Number(mrIt.qty) || 0;
        const ordQty = orderedMap[key] || 0;
        totalRequested += reqQty;
        totalOrdered += Math.min(ordQty, reqQty);
        if (ordQty < reqQty) {
          allItemsFulfilled = false;
        }
      }

      let newStatus = mr.status;
      if (linkedPoIdSet.size === 0 || totalOrdered === 0) {
        newStatus = (mr.status === 'ordered' || mr.status === 'partially_ordered') ? 'approved' : mr.status;
      } else if (allItemsFulfilled || (totalRequested > 0 && totalOrdered >= totalRequested)) {
        newStatus = 'ordered';
      } else {
        newStatus = 'partially_ordered';
      }

      const allPoIds = Array.from(linkedPoIdSet);
      await db.query(
        'UPDATE material_requests SET status = ?, poId = ?, poIds = ?, updatedAt = NOW() WHERE id = ?',
        [newStatus, allPoIds[0] || null, JSON.stringify(allPoIds), mrId]
      );
    } catch (err) {
      console.error(`Error syncing MR ${mrId}:`, err);
    }
  }
}

// Helper to sync Purchase Order receipt status across all linked Goods Received Notes (supports multiple GRNs per PO and multiple POs per GRN)
async function syncPOReceiptStatus(targetPoIds: string[] | string) {
  const ids = Array.from(new Set((Array.isArray(targetPoIds) ? targetPoIds : [targetPoIds]).filter(Boolean)));
  for (const poId of ids) {
    try {
      const [poRows]: any = await db.query('SELECT id, items, status FROM purchase_orders WHERE id = ?', [poId]);
      if (!poRows || poRows.length === 0) continue;
      const po = poRows[0];
      const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
      if (!Array.isArray(poItems) || poItems.length === 0) continue;

      // Fetch all GRNs that link to this PO
      const [grnRows]: any = await db.query(
        'SELECT id, items, poId, poIds FROM grns WHERE poId = ? OR poIds LIKE ? OR items LIKE ?',
        [poId, `%${poId}%`, `%"poId":"${poId}"%`]
      );

      const receivedMap: Record<string, number> = {};
      let totalReceivedForThisPO = 0;

      for (const g of grnRows) {
        let gPoIds: string[] = [];
        if (Array.isArray(g.poIds)) gPoIds = g.poIds;
        else if (typeof g.poIds === 'string') {
          try { gPoIds = JSON.parse(g.poIds); } catch { gPoIds = [g.poIds]; }
        }
        if (g.poId && !gPoIds.includes(g.poId)) gPoIds.push(g.poId);

        const isDedicatedToPo = gPoIds.length <= 1 && (g.poId === poId || gPoIds.includes(poId));
        const gItems = typeof g.items === 'string' ? JSON.parse(g.items) : (g.items || []);

        if (Array.isArray(gItems)) {
          for (const gi of gItems) {
            if (gi.poId ? gi.poId === poId : isDedicatedToPo) {
              const key = String(gi.inventoryId || gi.id || gi.desc || '');
              const q = Number(gi.qtyReceived !== undefined ? gi.qtyReceived : (gi.qty || 0));
              receivedMap[key] = (receivedMap[key] || 0) + q;
              totalReceivedForThisPO += q;
            }
          }
        }
      }

      let totalOrdered = 0;
      let allItemsFulfilled = true;

      for (const pi of poItems) {
        const key = String(pi.inventoryId || pi.id || pi.desc || '');
        const ord = Number(pi.qty || 0);
        const rec = receivedMap[key] || 0;
        totalOrdered += ord;
        if (rec < ord) {
          allItemsFulfilled = false;
        }
      }

      let newStatus = po.status;
      if (grnRows.length === 0 || totalReceivedForThisPO === 0) {
        newStatus = (po.status === 'received' || po.status === 'partially_received') ? 'ordered' : po.status;
      } else if (allItemsFulfilled || (totalOrdered > 0 && totalReceivedForThisPO >= totalOrdered)) {
        newStatus = 'received';
      } else {
        newStatus = 'partially_received';
      }

      await db.query('UPDATE purchase_orders SET status = ?, updatedAt = NOW() WHERE id = ?', [newStatus, poId]);
    } catch (err) {
      console.error(`Error syncing PO receipt status for ${poId}:`, err);
    }
  }
}

// Helper to sync Purchase Order billing status across all linked Supplier Bills (supports multiple invoices per PO)
async function syncPOBillingStatus(targetPoIds: string[] | string) {
  const ids = Array.from(new Set((Array.isArray(targetPoIds) ? targetPoIds : [targetPoIds]).filter(Boolean)));
  for (const poId of ids) {
    try {
      const [poRows]: any = await db.query('SELECT id, totalAmount FROM purchase_orders WHERE id = ?', [poId]);
      if (!poRows || poRows.length === 0) continue;
      const poTotal = Number(poRows[0].totalAmount || 0);

      const [bills]: any = await db.query(
        'SELECT id, invoiceNo, amount, status, date FROM supplier_bills WHERE poId = ? ORDER BY date ASC, createdAt ASC',
        [poId]
      );

      let totalBilled = 0;
      const billIds: string[] = [];
      const invoiceNos: string[] = [];

      for (const b of bills) {
        totalBilled += Number(b.amount || 0);
        billIds.push(b.id);
        if (b.invoiceNo && !invoiceNos.includes(b.invoiceNo)) {
          invoiceNos.push(b.invoiceNo);
        }
      }

      let billingStatus = 'unbilled';
      if (bills.length > 0 && totalBilled > 0) {
        if (totalBilled >= (poTotal - 0.01)) {
          billingStatus = 'billed';
        } else {
          billingStatus = 'partially_billed';
        }
      }

      await db.query(
        'UPDATE purchase_orders SET billedAmount = ?, billingStatus = ?, billIds = ?, invoiceNos = ?, updatedAt = NOW() WHERE id = ?',
        [totalBilled, billingStatus, JSON.stringify(billIds), JSON.stringify(invoiceNos), poId]
      );
    } catch (err) {
      console.error(`Failed to sync billing status for PO ${poId}:`, err);
    }
  }
}


// MR ROUTES
app.get('/api/purchasing/mrs', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM material_requests ORDER BY date DESC, createdAt DESC');
    for (const r of rows) {
      if (typeof r.poIds === 'string') {
        try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
      } else if (!r.poIds) {
        r.poIds = r.poId ? [r.poId] : [];
      }
      if (typeof r.workOrderNos === 'string') {
        try { r.workOrderNos = JSON.parse(r.workOrderNos); } catch(e) { r.workOrderNos = [r.workOrderNo].filter(Boolean); }
      } else if (!r.workOrderNos) {
        r.workOrderNos = r.workOrderNo ? [r.workOrderNo] : [];
      }
    }
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM material_requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Material request not found' });
    const r = rows[0];
    if (typeof r.poIds === 'string') {
      try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
    } else if (!r.poIds) {
      r.poIds = r.poId ? [r.poId] : [];
    }
    if (typeof r.workOrderNos === 'string') {
      try { r.workOrderNos = JSON.parse(r.workOrderNos); } catch(e) { r.workOrderNos = [r.workOrderNo].filter(Boolean); }
    } else if (!r.workOrderNos) {
      r.workOrderNos = r.workOrderNo ? [r.workOrderNo] : [];
    }
    res.json(r);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/mrs', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    if (data.poIds && typeof data.poIds === 'object') data.poIds = JSON.stringify(data.poIds);
    if (data.workOrderNos && typeof data.workOrderNos === 'object') {
      if (Array.isArray(data.workOrderNos) && data.workOrderNos.length > 0 && !data.workOrderNo) {
        data.workOrderNo = data.workOrderNos[0];
      }
      data.workOrderNos = JSON.stringify(data.workOrderNos);
    }
    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO material_requests SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    if (data.poIds && typeof data.poIds === 'object') data.poIds = JSON.stringify(data.poIds);
    if (data.workOrderNos && typeof data.workOrderNos === 'object') {
      if (Array.isArray(data.workOrderNos) && data.workOrderNos.length > 0 && !data.workOrderNo) {
        data.workOrderNo = data.workOrderNos[0];
      }
      data.workOrderNos = JSON.stringify(data.workOrderNos);
    }
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE material_requests SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM material_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PO ROUTES
app.get('/api/purchasing/pos', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM purchase_orders ORDER BY date DESC, createdAt DESC');
    for (const r of rows) {
      if (typeof r.mrIds === 'string') {
        try { r.mrIds = JSON.parse(r.mrIds); } catch(e) { r.mrIds = [r.mrId].filter(Boolean); }
      } else if (!r.mrIds) {
        r.mrIds = r.mrId ? [r.mrId] : [];
      }
      if (typeof r.billIds === 'string') {
        try { r.billIds = JSON.parse(r.billIds); } catch(e) { r.billIds = []; }
      } else if (!r.billIds) {
        r.billIds = [];
      }
      if (typeof r.invoiceNos === 'string') {
        try { r.invoiceNos = JSON.parse(r.invoiceNos); } catch(e) { r.invoiceNos = []; }
      } else if (!r.invoiceNos) {
        r.invoiceNos = [];
      }
    }
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/pos/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Purchase order not found' });
    const r = rows[0];
    if (typeof r.mrIds === 'string') {
      try { r.mrIds = JSON.parse(r.mrIds); } catch(e) { r.mrIds = [r.mrId].filter(Boolean); }
    } else if (!r.mrIds) {
      r.mrIds = r.mrId ? [r.mrId] : [];
    }
    res.json(r);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/pos', async (req, res) => {
  try {
    const data = { ...req.body };
    let itemsArray: any[] = [];
    if (Array.isArray(data.items)) {
      itemsArray = data.items;
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'string') {
      try { itemsArray = JSON.parse(data.items); } catch { itemsArray = []; }
    }
    if (data.taxBreakdown && typeof data.taxBreakdown === 'object') data.taxBreakdown = JSON.stringify(data.taxBreakdown);

    // Extract all MR IDs from mrId, mrIds, and item level
    const targetMrIds = new Set<string>();
    if (data.mrId) targetMrIds.add(data.mrId);
    if (Array.isArray(data.mrIds)) data.mrIds.forEach((m: string) => targetMrIds.add(m));
    else if (typeof data.mrIds === 'string') {
      try { JSON.parse(data.mrIds).forEach((m: string) => targetMrIds.add(m)); } catch { targetMrIds.add(data.mrIds); }
    }
    for (const it of itemsArray) {
      if (it.mrId) targetMrIds.add(it.mrId);
    }

    if (targetMrIds.size > 0 && !data.mrId) {
      data.mrId = Array.from(targetMrIds)[0];
    }
    data.mrIds = JSON.stringify(Array.from(targetMrIds));

    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.query('INSERT INTO purchase_orders SET ?', data);

    // Sync all affected Material Requests
    if (targetMrIds.size > 0) {
      await syncMRFulfillmentStatus(Array.from(targetMrIds));
    }

    res.json({ success: true, id: data.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/purchasing/pos/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;

    // Fetch existing PO to detect previously linked MRs
    const [existingRows]: any = await db.query('SELECT mrId, mrIds, items FROM purchase_orders WHERE id = ?', [req.params.id]);
    const prevMrIds = new Set<string>();
    if (existingRows.length > 0) {
      const ex = existingRows[0];
      if (ex.mrId) prevMrIds.add(ex.mrId);
      if (ex.mrIds) {
        try { JSON.parse(ex.mrIds).forEach((m: string) => prevMrIds.add(m)); } catch { prevMrIds.add(ex.mrIds); }
      }
      const exItems = typeof ex.items === 'string' ? JSON.parse(ex.items) : (ex.items || []);
      for (const it of exItems) { if (it.mrId) prevMrIds.add(it.mrId); }
    }

    let itemsArray: any[] = [];
    if (Array.isArray(data.items)) {
      itemsArray = data.items;
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'string') {
      try { itemsArray = JSON.parse(data.items); } catch { itemsArray = []; }
    }
    if (data.taxBreakdown && typeof data.taxBreakdown === 'object') data.taxBreakdown = JSON.stringify(data.taxBreakdown);

    const targetMrIds = new Set<string>(prevMrIds);
    if (data.mrId) targetMrIds.add(data.mrId);
    if (Array.isArray(data.mrIds)) data.mrIds.forEach((m: string) => targetMrIds.add(m));
    else if (typeof data.mrIds === 'string') {
      try { JSON.parse(data.mrIds).forEach((m: string) => targetMrIds.add(m)); } catch { targetMrIds.add(data.mrIds); }
    }
    for (const it of itemsArray) {
      if (it.mrId) targetMrIds.add(it.mrId);
    }

    if (data.mrIds && Array.isArray(data.mrIds)) {
      data.mrIds = JSON.stringify(data.mrIds);
    }

    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE purchase_orders SET ? WHERE id = ?', [data, req.params.id]);

    if (targetMrIds.size > 0) {
      await syncMRFulfillmentStatus(Array.from(targetMrIds));
    }

    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/pos/:id', async (req, res) => {
  try {
    const [poRows]: any = await db.query('SELECT mrId, mrIds, items FROM purchase_orders WHERE id = ?', [req.params.id]);
    const targetMrIds = new Set<string>();
    if (poRows.length > 0) {
      const p = poRows[0];
      if (p.mrId) targetMrIds.add(p.mrId);
      if (p.mrIds) {
        try { JSON.parse(p.mrIds).forEach((m: string) => targetMrIds.add(m)); } catch { targetMrIds.add(p.mrIds); }
      }
      const pItems = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
      for (const it of pItems) { if (it.mrId) targetMrIds.add(it.mrId); }
    }
    
    await db.query('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);

    if (targetMrIds.size > 0) {
      await syncMRFulfillmentStatus(Array.from(targetMrIds));
    }

    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GRN ROUTES
app.get('/api/purchasing/grns', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows]: any = await db.query('SELECT * FROM grns ORDER BY date DESC, createdAt DESC');
    for (const r of rows) {
      if (typeof r.items === 'string') {
        try { r.items = JSON.parse(r.items); } catch(e) { r.items = []; }
      } else if (!Array.isArray(r.items)) {
        r.items = [];
      }
      if (typeof r.poIds === 'string') {
        try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
      } else if (!r.poIds) {
        r.poIds = r.poId ? [r.poId] : [];
      }
    }
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/grns/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows]: any = await db.query('SELECT * FROM grns WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'GRN not found' });
    const r = rows[0];
    if (typeof r.items === 'string') {
      try { r.items = JSON.parse(r.items); } catch(e) { r.items = []; }
    } else if (!Array.isArray(r.items)) {
      r.items = [];
    }
    if (typeof r.poIds === 'string') {
      try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
    } else if (!r.poIds) {
      r.poIds = r.poId ? [r.poId] : [];
    }
    res.json(r);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/grns', async (req, res) => {
  try {
    const data = { ...req.body };
    let itemsArray: any[] = [];
    if (Array.isArray(data.items)) {
      itemsArray = data.items;
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'object' && data.items !== null) {
      itemsArray = [data.items];
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'string') {
      try { itemsArray = JSON.parse(data.items); } catch(e) { itemsArray = []; }
    }

    // Extract all PO IDs (from poId, poIds, and item-level poId)
    const targetPoIds = new Set<string>();
    if (data.poId) targetPoIds.add(data.poId);
    if (Array.isArray(data.poIds)) data.poIds.forEach((p: string) => targetPoIds.add(p));
    else if (typeof data.poIds === 'string') {
      try { JSON.parse(data.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(data.poIds); }
    }
    for (const it of itemsArray) {
      if (it.poId) targetPoIds.add(it.poId);
    }

    if (targetPoIds.size > 0 && !data.poId) {
      data.poId = Array.from(targetPoIds)[0];
    }
    data.poIds = JSON.stringify(Array.from(targetPoIds));

    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (!data.updatedAt) data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.query('INSERT INTO grns SET ?', data);

    // Update inventory stock and record in stock ledger
    for (const item of itemsArray) {
      const invId = item.inventoryId || item.id;
      const qtyRecv = Number(item.qtyReceived !== undefined ? item.qtyReceived : (item.qty || 0));
      if (invId && qtyRecv > 0) {
        try {
          const [invRows]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [invId]);
          if (invRows.length > 0) {
            const currentQty = Number(invRows[0].quantity || 0);
            const newQty = currentQty + qtyRecv;
            await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, invId]);

            const itemPoRef = item.poId || data.poId || 'N/A';
            const ledgerEntry = {
              id: 'LGR-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000),
              inventoryId: invId,
              date: data.date ? (data.date.length === 10 ? data.date + ' 00:00:00' : data.date.replace('T', ' ')) : new Date().toISOString().slice(0, 19).replace('T', ' '),
              type: 'IN',
              qty: qtyRecv,
              reference: data.id,
              notes: `GRN Received (PO: ${itemPoRef})${item.condition ? ` - Condition: ${item.condition}` : ''}`
            };
            await db.query('INSERT INTO stock_ledger SET ?', ledgerEntry);
          }
        } catch (e) {
          console.error('Error updating inventory stock from GRN:', e);
        }
      }
    }

    // Sync all linked POs
    if (targetPoIds.size > 0) {
      await syncPOReceiptStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Failed to create GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/purchasing/grns/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;

    // Find previous POs
    const [exRows]: any = await db.query('SELECT poId, poIds, items FROM grns WHERE id = ?', [req.params.id]);
    const targetPoIds = new Set<string>();
    if (exRows.length > 0) {
      const ex = exRows[0];
      if (ex.poId) targetPoIds.add(ex.poId);
      if (ex.poIds) {
        try { JSON.parse(ex.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(ex.poIds); }
      }
    }

    if (data.items !== undefined && typeof data.items === 'object') {
      if (Array.isArray(data.items)) {
        for (const it of data.items) { if (it.poId) targetPoIds.add(it.poId); }
      }
      data.items = JSON.stringify(data.items);
    }
    if (data.poId) targetPoIds.add(data.poId);
    if (Array.isArray(data.poIds)) data.poIds.forEach((p: string) => targetPoIds.add(p));
    else if (typeof data.poIds === 'string') {
      try { JSON.parse(data.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(data.poIds); }
    }
    if (data.poIds && Array.isArray(data.poIds)) {
      data.poIds = JSON.stringify(data.poIds);
    }

    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE grns SET ? WHERE id = ?', [data, req.params.id]);

    if (targetPoIds.size > 0) {
      await syncPOReceiptStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/grns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [grnRows]: any = await db.query('SELECT * FROM grns WHERE id = ?', [id]);
    if (!grnRows.length) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    const grn = grnRows[0];
    let itemsArray: any[] = [];
    if (typeof grn.items === 'string') {
      try { itemsArray = JSON.parse(grn.items); } catch(e) { itemsArray = []; }
    } else if (Array.isArray(grn.items)) {
      itemsArray = grn.items;
    }

    const targetPoIds = new Set<string>();
    if (grn.poId) targetPoIds.add(grn.poId);
    if (grn.poIds) {
      try { JSON.parse(grn.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(grn.poIds); }
    }
    for (const it of itemsArray) {
      if (it.poId) targetPoIds.add(it.poId);
    }

    // Revert inventory quantity
    for (const item of itemsArray) {
      const invId = item.inventoryId || item.id;
      const qtyRecv = Number(item.qtyReceived !== undefined ? item.qtyReceived : (item.qty || 0));
      if (invId && qtyRecv > 0) {
        try {
          await db.query('UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', [qtyRecv, invId]);
        } catch (e) {
          console.error('Error reverting inventory stock on GRN delete:', e);
        }
      }
    }

    // Delete stock ledger entries linked to this GRN
    await db.query('DELETE FROM stock_ledger WHERE reference = ?', [id]);

    // Delete GRN
    await db.query('DELETE FROM grns WHERE id = ?', [id]);

    // Recalculate all affected PO statuses
    if (targetPoIds.size > 0) {
      await syncPOReceiptStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, message: 'GRN deleted and inventory reverted successfully' });
  } catch (error: any) {
    console.error('Failed to delete GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/purchasing/bills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM supplier_bills ORDER BY date DESC, createdAt DESC');
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/pos/:id/bills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM supplier_bills WHERE poId = ? ORDER BY date DESC, createdAt DESC', [req.params.id]);
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/bills', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    await db.query('INSERT INTO supplier_bills SET ?', data);

    // Also automatically create corresponding ledger entry in supplier_ledger
    if (data.supplierId && data.amount) {
      const ledgerEntry = {
        id: `SL-BILL-${Date.now().toString().slice(-6)}`,
        supplierId: data.supplierId,
        date: data.date ? (data.date.length === 10 ? data.date + ' 00:00:00' : data.date.replace('T', ' ')) : new Date().toISOString().slice(0, 19).replace('T', ' '),
        type: 'purchase',
        referenceNo: data.invoiceNo || data.id,
        description: `Supplier Bill ${data.id}${data.poId ? ` (PO: ${data.poId})` : ''} - ${data.notes || 'Vendor Bill'}`,
        debit: Number(data.amount) || 0,
        credit: 0,
        amount: Number(data.amount) || 0,
        reference: data.invoiceNo || data.id,
        notes: data.notes || ''
      };
      await db.query('INSERT INTO supplier_ledger SET ?', ledgerEntry);

      // Sync supplier balance
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [data.supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, data.supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on bill:', errBal);
      }

      // Auto GL: Record Expense / Raw Materials (Debit) and Accounts Payable (Credit)
      try {
        const [expAcc]: any = await db.query(
          'SELECT id, name FROM chart_of_accounts WHERE (name LIKE "%Raw Material%" OR name LIKE "%Cost of Goods%" OR type = "Expense") LIMIT 1'
        );
        const [apAcc]: any = await db.query(
          'SELECT id, name FROM chart_of_accounts WHERE (name LIKE "%Accounts Payable%" OR name LIKE "%Payable%") AND type = "Liability" AND isTaxAccount = 0 LIMIT 1'
        );

        if (expAcc.length > 0 && apAcc.length > 0) {
          const billAmount = Number(data.amount) || 0;
          const jeId = `JE-BILL-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
          
          await db.query('INSERT INTO journal_entries SET ?', {
            id: jeId,
            date: ledgerEntry.date,
            reference: data.invoiceNo || data.id,
            description: `Auto GL: Supplier Bill (${data.id}) - ${data.supplierId}`,
            totalAmount: billAmount
          });

          const lines = [
            [`JL-${Date.now().toString().slice(-6)}1`, jeId, expAcc[0].id, billAmount, 0, data.supplierId, 'Supplier'],
            [`JL-${Date.now().toString().slice(-6)}2`, jeId, apAcc[0].id, 0, billAmount, data.supplierId, 'Supplier']
          ];
          await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);

          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [billAmount, expAcc[0].id]);
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [billAmount, apAcc[0].id]);
        }
      } catch (eGl) {
        console.error('Error posting GL for supplier bill:', eGl);
      }
    }

    // Sync PO billing status
    if (data.poId) {
      await syncPOBillingStatus(data.poId);
    }

    res.json({ success: true, id: data.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/purchasing/bills/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    
    // Find previous poId
    const [prevRows]: any = await db.query('SELECT poId FROM supplier_bills WHERE id = ?', [req.params.id]);
    const oldPoId = prevRows[0]?.poId;

    await db.query('UPDATE supplier_bills SET ? WHERE id = ?', [data, req.params.id]);

    const targetPoIds = new Set<string>();
    if (oldPoId) targetPoIds.add(oldPoId);
    if (data.poId) targetPoIds.add(data.poId);
    if (targetPoIds.size > 0) {
      await syncPOBillingStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM supplier_bills WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Bill not found' });
    const bill = rows[0];

    // Revert supplier ledger
    await db.query('DELETE FROM supplier_ledger WHERE referenceNo = ? OR reference = ?', [bill.invoiceNo || bill.id, bill.id]);

    // Revert GL entries linked to this bill
    try {
      const references = [bill.id, bill.invoiceNo].filter(Boolean);
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference IN (?)', [references]);
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        for (const line of lines) {
          const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
          if (!accounts.length) continue;
          const accType = accounts[0].type;
          const isDebitNormal = accType === 'Asset' || accType === 'Expense';
          const balanceChange = Number(line.debit) - Number(line.credit);
          if (isDebitNormal) {
            await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
          } else {
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [balanceChange, line.accountId]);
          }
        }
        await db.query('DELETE FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        await db.query('DELETE FROM journal_entries WHERE id IN (?)', [jeIds]);
      }
    } catch (eGl) {
      console.error('Error reversing GL on bill delete:', eGl);
    }

    // Delete bill
    await db.query('DELETE FROM supplier_bills WHERE id = ?', [id]);

    // Sync supplier balance
    if (bill.supplierId) {
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [bill.supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, bill.supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on delete bill:', errBal);
      }
    }

    // Sync PO billing status
    if (bill.poId) {
      await syncPOBillingStatus(bill.poId);
    }

    res.json({ success: true, message: 'Bill deleted and supplier ledger reverted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- SUPPLIERS --
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows]: any = await db.query(`
      SELECT s.*,
        COALESCE(SUM(l.debit), 0) as totalPurchases,
        COALESCE(SUM(l.credit), 0) as totalPaid,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) + COALESCE(s.openingBalance, 0)) as outstandingBalance
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplierId
      GROUP BY s.id
      ORDER BY s.createdAt DESC
    `);
    for (const r of rows) {
      if (typeof r.contacts === 'string') {
        try { r.contacts = JSON.parse(r.contacts); } catch(e) { r.contacts = []; }
      } else if (!r.contacts) {
        r.contacts = [];
      }
      r.contactName = r.contactName || r.contactPerson || '';
      r.contactPerson = r.contactPerson || r.contactName || '';
      r.totalPurchases = Number(r.totalPurchases) || 0;
      r.totalPaid = Number(r.totalPaid) || 0;
      r.openingBalance = Number(r.openingBalance !== undefined ? r.openingBalance : 0) || 0;
      r.outstandingBalance = Number(r.outstandingBalance) || 0;
      r.balance = r.outstandingBalance;
    }
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query(`
      SELECT s.*,
        COALESCE(SUM(l.debit), 0) as totalPurchases,
        COALESCE(SUM(l.credit), 0) as totalPaid,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) + COALESCE(s.openingBalance, 0)) as outstandingBalance
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplierId
      WHERE s.id = ?
      GROUP BY s.id
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Supplier not found' });
    const r = rows[0];
    if (typeof r.contacts === 'string') {
      try { r.contacts = JSON.parse(r.contacts); } catch(e) { r.contacts = []; }
    } else if (!r.contacts) {
      r.contacts = [];
    }
    r.contactName = r.contactName || r.contactPerson || '';
    r.contactPerson = r.contactPerson || r.contactName || '';
    r.totalPurchases = Number(r.totalPurchases) || 0;
    r.totalPaid = Number(r.totalPaid) || 0;
    r.openingBalance = Number(r.openingBalance !== undefined ? r.openingBalance : 0) || 0;
    r.outstandingBalance = Number(r.outstandingBalance) || 0;
    r.balance = r.outstandingBalance;
    res.json(r);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') {
      data.contacts = JSON.stringify(data.contacts);
    }
    if (!data.id) {
      const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM suppliers');
      const nextNum = (countResult[0]?.c || 0) + 1;
      data.id = 'SUP-' + nextNum.toString().padStart(4, '0');
    }
    if (data.contactName && !data.contactPerson) data.contactPerson = data.contactName;
    if (data.contactPerson && !data.contactName) data.contactName = data.contactPerson;

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
    const data = { ...req.body };
    delete data.id;
    if (data.contacts && typeof data.contacts === 'object') {
      data.contacts = JSON.stringify(data.contacts);
    }
    if (data.contactName && !data.contactPerson) data.contactPerson = data.contactName;
    if (data.contactPerson && !data.contactName) data.contactName = data.contactPerson;

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
      const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
app.get('/api/invoices/next-number', async (req, res) => {
  try {
    const rawDate = (req.query.date as string) || new Date().toISOString();
    const dateObj = new Date(rawDate);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    
    const yy = validDate.getFullYear().toString().slice(-2);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[validDate.getMonth()];
    
    // Entity / Branch code (1-15 alphanumeric characters, default REX)
    let entity = ((req.query.entity as string) || 'REX').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!entity) entity = 'REX';
    if (entity.length > 15) entity = entity.slice(0, 15);

    const [rows]: any = await db.query(
      `SELECT invoiceNo FROM invoices 
       WHERE invoiceNo LIKE ? OR invoiceNo LIKE ? 
       ORDER BY id DESC`,
      [`${yy}${mmm}_${entity}_%`, `%_${entity}_%`]
    );

    let maxNum = 0;
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (!row.invoiceNo) continue;
        const parts = row.invoiceNo.trim().split('_');
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
          const num = parseInt(lastPart, 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const nextSeq = (maxNum + 1).toString().padStart(5, '0');
    const invoiceNo = `${yy}${mmm}_${entity}_${nextSeq}`;

    res.json({ invoiceNo, yy, mmm, entity, seq: nextSeq });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             COALESCE(NULLIF(i.customerName, ''), c.name, l.name) AS customerName, 
             COALESCE(NULLIF(i.customerCompany, ''), c.company, l.company, i.customerName) AS customerCompany,
             COALESCE(NULLIF(i.customerAddress, ''), c.address, l.address) AS customerAddress,
             COALESCE(NULLIF(i.customerEmail, ''), c.email) AS customerEmail,
             COALESCE(NULLIF(i.customerPhone, ''), c.phone) AS customerPhone
      FROM invoices i
      LEFT JOIN customers c ON (i.customerId = c.id OR (i.customerId IS NULL AND i.leadId = c.id))
      LEFT JOIN leads l ON (i.leadId = l.id OR (i.leadId IS NULL AND i.customerId = l.id))
      ORDER BY i.date DESC
    `);
    res.json(rows);
  } catch (error) {
    try {
      const [rows] = await db.query('SELECT * FROM invoices ORDER BY date DESC');
      res.json(rows);
    } catch (err2) {
      console.error(err2);
      res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
    }
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.customerId && !data.leadId) {
      data.leadId = data.customerId;
    } else if (data.leadId && !data.customerId) {
      data.customerId = data.leadId;
    }
    if (data.invoiceNo) {
      data.invoiceNo = data.invoiceNo.trim().replace(/\s+/g, '');
    } else {
      const rawDate = data.date || new Date().toISOString();
      const dObj = new Date(rawDate);
      const validD = isNaN(dObj.getTime()) ? new Date() : dObj;
      const yy = validD.getFullYear().toString().slice(-2);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mmm = months[validD.getMonth()];
      const entity = 'REX';
      const [rows]: any = await db.query(
        `SELECT invoiceNo FROM invoices WHERE invoiceNo LIKE ? ORDER BY id DESC`,
        [`${yy}${mmm}_${entity}_%`]
      );
      let maxNum = 0;
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!row.invoiceNo) continue;
          const parts = row.invoiceNo.trim().split('_');
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            const num = parseInt(lastPart, 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      data.invoiceNo = `${yy}${mmm}_${entity}_${(maxNum + 1).toString().padStart(5, '0')}`;
    }
    if (!data.id) data.id = data.invoiceNo;
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);

    // Strip unknown columns dynamically to prevent ER_BAD_FIELD_ERROR 500s
    const [invCols]: any = await db.query('SHOW COLUMNS FROM invoices');
    const validCols = new Set(invCols.map((col: any) => col.Field));
    const safeData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (validCols.has(key)) {
        safeData[key] = value;
      }
    }
    await db.query('INSERT INTO invoices SET ?', safeData);
    
    // Auto GL: Accrual Basis - Record Receivable & Sales
    try {
      const [salesAcc] = await db.query(
        'SELECT id FROM chart_of_accounts WHERE (name LIKE "%Sales%" OR name LIKE "%Revenue%") AND type = "Revenue" LIMIT 1'
      ) as any;
      let [arAcc] = await db.query(
        'SELECT id FROM chart_of_accounts WHERE (name LIKE "%Accounts Receivable%" OR name LIKE "%Receivable%") AND type = "Asset" LIMIT 1'
      ) as any;

      if (arAcc.length === 0) {
        const arId = 'acc_1500';
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1500", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }

      const isProformaInvoice = Boolean(data.isProforma || data.invoiceType === 'proforma' || data.status === 'proforma');
      if (!isProformaInvoice && arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        const invTotal = Number(data.total) || 0;
        const invSub = Number(data.subtotal) || invTotal;

        // Parse tax breakdown from taxProfileId
        let taxBreakdown: any = null;
        try { taxBreakdown = data.taxBreakdown ? JSON.parse(data.taxBreakdown) : null; } catch(e) {}

        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.invoiceNo || data.id, description: 'Auto GL: Invoice Issued', totalAmount: invTotal });

        const lines: any[] = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, data.customerId, 'Customer']
        ];
        
        let getOrCreateTaxAcc = async () => {
          const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
          if (defTax[0]) return defTax[0].id;
          const newId = 'ACC-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*10);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "2200", "Tax Payable", "Liability", "Tax", 0, NOW())', [newId]);
          return newId;
        };

        // Use tax profile accounts if available
        if (taxBreakdown && data.taxProfileId) {
          const [profile] = await db.query('SELECT * FROM tax_profiles WHERE id = ?', [data.taxProfileId]) as any;
          const prof = profile[0];
          if (prof) {
            const tax1Amt = Number(taxBreakdown.tax1Amount) || 0;
            const tax2Amt = Number(taxBreakdown.tax2Amount) || 0;

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
          const taxAccId = await getOrCreateTaxAcc();
          if (taxAccId) {
            lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAccId, 0, Number(data.taxAmount), null, null]);
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [Number(data.taxAmount), taxAccId]);
          }
        }

        // Account for advance receipts previously issued
        const advDeducted = Number(data.advanceDeducted) || 0;
        let netReceivable = invTotal;
        if (advDeducted > 0) {
          let [advAcc]: any = await db.query(
            'SELECT id FROM chart_of_accounts WHERE (name LIKE "%Customer Advance%" OR code = "2150") AND type = "Liability" LIMIT 1'
          );
          if (advAcc && advAcc.length > 0) {
            lines.push(['JL-' + Date.now().toString().slice(-5) + '5', jeId, advAcc[0].id, advDeducted, 0, data.customerId, 'Customer']);
            await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [advDeducted, advAcc[0].id]);
            netReceivable = Math.max(0, invTotal - advDeducted);
            lines[0][3] = netReceivable;
          }
        }

        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [netReceivable, arAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invSub, salesAcc[0].id]);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('UPDATE invoices SET ? WHERE id = ? OR invoiceNo = ?', [data, id, id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

const handleInvoiceDelete = async (req: any, res: any) => {
  try {
    const rawId = req.query.id || req.body?.id || req.params.id || req.params[0];
    const id = decodeURIComponent(String(rawId || '')).trim();
    if (!id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    // Resilient lookup: match by id or invoiceNo with and without whitespace
    const cleanId = id.trim();
    const compactId = cleanId.replace(/\s+/g, '');
    const [rows]: any = await db.query(
      'SELECT * FROM invoices WHERE id = ? OR invoiceNo = ? OR REPLACE(id, " ", "") = ? OR REPLACE(invoiceNo, " ", "") = ? LIMIT 1', 
      [cleanId, cleanId, compactId, compactId]
    );

    if (!rows || !rows.length) {
      // Check partial match
      const [altRows]: any = await db.query(
        'SELECT * FROM invoices WHERE id LIKE ? OR invoiceNo LIKE ? LIMIT 1',
        [`%${cleanId}%`, `%${cleanId}%`]
      );
      if (altRows && altRows.length > 0) {
        rows.push(altRows[0]);
      } else {
        console.warn(`[Invoice Delete] Invoice "${cleanId}" not found or already deleted.`);
        return res.json({ success: true, message: 'Invoice already deleted or not found' });
      }
    }
    
    const invoice = rows[0];
    let existingPayments: any[] = [];
    if (invoice.payments) {
      if (Array.isArray(invoice.payments)) {
        existingPayments = invoice.payments;
      } else if (typeof invoice.payments === 'string' && invoice.payments.trim()) {
        try {
          const parsed = JSON.parse(invoice.payments);
          if (Array.isArray(parsed)) existingPayments = parsed;
        } catch (e) {}
      }
    }
    
    // References to reverse from GL
    const references = [invoice.id];
    if (invoice.invoiceNo && invoice.invoiceNo !== invoice.id) {
      references.push(invoice.invoiceNo);
    }
    existingPayments.forEach((p: any) => { if (p && p.id) references.push(p.id); });
    
    // Find Journal Entries to delete
    if (references.length > 0) {
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference IN (?)', [references]);
      
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        
        // Find Journal Lines to reverse balances
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        
        // Generic GL Reversal
        try {
          for (const line of lines) {
            const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
            if (!accounts.length) continue;
            
            const accType = accounts[0].type;
            const isDebitNormal = accType === 'Asset' || accType === 'Expense';
            const balanceChange = Number(line.debit) - Number(line.credit);
            
            if (isDebitNormal) {
              await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
            } else {
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
    const invNo = invoice.invoiceNo || invoice.id;
    await db.query('DELETE FROM invoices WHERE id = ? OR invoiceNo = ? OR id = ? OR invoiceNo = ?', [invoice.id, invoice.id, invNo, invNo]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Invoice deletion error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
};

app.delete('/api/invoices', handleInvoiceDelete);
app.delete('/api/invoices/:id', handleInvoiceDelete);
app.delete(/^\/api\/invoices\/(.+)$/, handleInvoiceDelete);

app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = req.body;
    
    // Ensure invoice payment columns exist safely
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN payments TEXT');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0.00');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN total DECIMAL(15,2) DEFAULT 0.00');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN customerId VARCHAR(50) DEFAULT NULL');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE finished_goods_orders ADD COLUMN paymentStatus VARCHAR(50) DEFAULT "Unpaid"');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE finished_goods_orders ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0.00');
    } catch (e) {}

    // Resilient lookup: match by id or invoiceNo
    const [rows]: any = await db.query('SELECT * FROM invoices WHERE id = ? OR invoiceNo = ? LIMIT 1', [id, id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = rows[0];
    
    // Safely parse existing payments
    let existingPayments: any[] = [];
    if (invoice.payments) {
      if (Array.isArray(invoice.payments)) {
        existingPayments = invoice.payments;
      } else if (typeof invoice.payments === 'string' && invoice.payments.trim()) {
        try {
          const parsed = JSON.parse(invoice.payments);
          if (Array.isArray(parsed)) existingPayments = parsed;
        } catch (e) {
          existingPayments = [];
        }
      }
    }
    
    const paymentAmount = Number(payment.amount) || 0;
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid payment amount greater than zero' });
    }

    // Format payment date for MySQL DATETIME
    const nowIso = new Date().toISOString();
    const defaultMysqlDate = nowIso.slice(0, 19).replace('T', ' ');
    let pDate = defaultMysqlDate;
    if (payment.date) {
      try {
        const d = new Date(payment.date);
        pDate = isNaN(d.getTime()) ? defaultMysqlDate : d.toISOString().slice(0, 19).replace('T', ' ');
      } catch (e) {
        pDate = defaultMysqlDate;
      }
    }
    
    // Resolve Deposit Account (Bank / Cash)
    let depositAccountId = payment.accountId || null;
    let depositAccountName = '';
    try {
      if (depositAccountId) {
        const [acc]: any = await db.query('SELECT id, name FROM chart_of_accounts WHERE id = ? LIMIT 1', [depositAccountId]);
        if (acc && acc.length > 0) {
          depositAccountId = acc[0].id;
          depositAccountName = acc[0].name;
        }
      }
      if (!depositAccountId) {
        const isBank = (payment.method || '').toLowerCase().includes('bank') || (payment.method || '').toLowerCase().includes('cheque') || (payment.method || '').toLowerCase().includes('card');
        const searchSubtype = isBank ? 'Bank' : 'Cash';
        const [found]: any = await db.query(
          'SELECT id, name FROM chart_of_accounts WHERE (subtype = ? OR name LIKE ? OR (subtype IN ("Bank", "Cash") AND type = "Asset")) AND type = "Asset" AND name NOT LIKE "%Receivable%" ORDER BY CASE WHEN subtype = ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END LIMIT 1',
          [searchSubtype, `%${searchSubtype}%`, searchSubtype, `%${searchSubtype}%`]
        );
        if (found && found.length > 0) {
          depositAccountId = found[0].id;
          depositAccountName = found[0].name;
        } else {
          const fallbackId = isBank ? 'acc_1050' : 'acc_1000';
          const fallbackName = isBank ? 'Bank Account' : 'Cash and Equivalents';
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, ?, ?, "Asset", ?, 0, NOW())', [
            fallbackId, isBank ? '1050' : '1000', fallbackName, searchSubtype
          ]);
          depositAccountId = fallbackId;
          depositAccountName = fallbackName;
        }
      }
    } catch (e) {
      console.error('Resolve deposit account error:', e);
    }

    // Add new payment record
    const newPayment = {
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: pDate,
      amount: paymentAmount,
      method: payment.method || 'Cash',
      accountId: depositAccountId || null,
      accountName: depositAccountName || null,
      reference: payment.reference || ''
    };
    
    existingPayments.push(newPayment);
    const prevPaidAmount = Number(invoice.paidAmount || 0);
    const newPaidAmount = prevPaidAmount + paymentAmount;
    
    const invoiceTotal = Number(invoice.total !== undefined && invoice.total !== null ? invoice.total : (invoice.amount || 0));
    const newStatus = (invoiceTotal > 0 && newPaidAmount >= invoiceTotal) ? 'paid' : (invoice.status === 'draft' ? 'sent' : (invoice.status || 'sent'));
    
    await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
      JSON.stringify(existingPayments),
      newPaidAmount,
      newStatus,
      invoice.id
    ]);

    // Sync payment status back to linked Finished Goods / Sales Order
    try {
      const orderSearch = invoice.orderNo || invoice.orderId;
      const orderPaymentStatus = newStatus === 'paid' ? 'Paid' : (newPaidAmount > 0 ? 'Partially Paid' : 'Unpaid');
      if (orderSearch) {
        await db.query(
          'UPDATE finished_goods_orders SET paymentStatus = ?, paidAmount = ? WHERE orderNo = ? OR id = ? OR invoiceNo = ? OR invoiceId = ?',
          [orderPaymentStatus, newPaidAmount, orderSearch, orderSearch, invoice.invoiceNo || invoice.id, invoice.id]
        );
      } else {
        await db.query(
          'UPDATE finished_goods_orders SET paymentStatus = ?, paidAmount = ? WHERE invoiceNo = ? OR invoiceId = ?',
          [orderPaymentStatus, newPaidAmount, invoice.invoiceNo || invoice.id, invoice.id]
        );
      }
    } catch (orderSyncErr) {
      console.warn('Could not sync payment status to finished_goods_orders:', orderSyncErr);
    }

    // Auto GL: Ensure Accounts Receivable, Sales Account, and Cash/Bank are properly balanced
    try {
      let [arAcc]: any = await db.query(
        'SELECT id FROM chart_of_accounts WHERE (name LIKE "%Accounts Receivable%" OR name LIKE "%Receivable%") AND type = "Asset" LIMIT 1'
      );
      if (!arAcc || arAcc.length === 0) {
        const arId = 'acc_1500';
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1500", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }

      // Check if invoice had an initial GL recognition (Sales / AR); if missing, create it so Sales Account reflects the revenue!
      const [existingJe]: any = await db.query('SELECT id FROM journal_entries WHERE reference = ? OR reference = ? LIMIT 1', [invoice.invoiceNo, invoice.id]);
      if (!existingJe || existingJe.length === 0) {
        const [salesAcc]: any = await db.query('SELECT id FROM chart_of_accounts WHERE (name LIKE "%Sales%" OR name LIKE "%Revenue%") AND type = "Revenue" LIMIT 1');
        if (salesAcc && salesAcc.length > 0 && arAcc && arAcc.length > 0) {
          const invJeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 100);
          const invTotal = invoiceTotal > 0 ? invoiceTotal : paymentAmount;
          await db.query('INSERT INTO journal_entries SET ?', {
            id: invJeId,
            date: invoice.date || pDate,
            reference: invoice.invoiceNo || invoice.id,
            description: `Auto GL: Invoice Sales Recognition (${invoice.invoiceNo || invoice.id})`,
            totalAmount: invTotal
          });
          const customerPartyId = invoice.customerId || invoice.leadId || null;
          const invLines = [
            ['JL-' + Date.now().toString().slice(-5) + 'A', invJeId, arAcc[0].id, invTotal, 0, customerPartyId, 'Customer'],
            ['JL-' + Date.now().toString().slice(-5) + 'B', invJeId, salesAcc[0].id, 0, invTotal, customerPartyId, 'Customer']
          ];
          await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [invLines]);
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTotal, arAcc[0].id]);
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTotal, salesAcc[0].id]);
        }
      }

      // Record Payment: Debit Bank/Cash Account, Credit Accounts Receivable
      if (depositAccountId && arAcc && arAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 100);
        
        await db.query('INSERT INTO journal_entries SET ?', {
          id: jeId,
          date: pDate,
          reference: newPayment.id,
          description: `Auto GL: Invoice Payment Received (${invoice.invoiceNo || invoice.id}) -> ${depositAccountName || 'Bank/Cash'}`,
          totalAmount: paymentAmount
        });
        
        const customerPartyId = invoice.customerId || invoice.leadId || null;
        const lines = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, depositAccountId, paymentAmount, 0, null, null],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, arAcc[0].id, 0, paymentAmount, customerPartyId, 'Customer']
        ];
        
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [paymentAmount, depositAccountId]);
        await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [paymentAmount, arAcc[0].id]);
      }
    } catch (e) {
      console.error('Auto GL Payment Error:', e);
    }
    
    // Generate and record official Payment Receipt in payment_receipts
    const receiptNum = payment.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
    const receiptPayload: any = {
      id: receiptNum,
      receiptNo: receiptNum,
      date: pDate,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo || invoice.id,
      quoteId: invoice.quotationId || null,
      quotationNo: invoice.quotationNo || null,
      orderId: invoice.orderId || null,
      orderNo: invoice.orderNo || null,
      customerId: invoice.customerId || invoice.leadId || null,
      customerName: invoice.customerName || invoice.customerCompany || 'Customer',
      customerCompany: invoice.customerCompany || null,
      totalQuotedAmount: invoiceTotal,
      amount: paymentAmount,
      balanceDue: Math.max(0, invoiceTotal - newPaidAmount),
      paymentMethod: payment.method || 'Cash',
      accountId: depositAccountId,
      accountName: depositAccountName,
      reference: payment.reference || `Payment for Invoice #${invoice.invoiceNo || invoice.id}`,
      receivedBy: payment.receivedBy || 'Accounts Officer',
      notes: payment.notes || `Payment received for Invoice #${invoice.invoiceNo || invoice.id}`,
      status: 'Received',
      journalEntryId: `JE-${newPayment.id}`,
      createdAt: defaultMysqlDate,
      updatedAt: defaultMysqlDate
    };

    try {
      await db.query('INSERT INTO payment_receipts SET ?', receiptPayload);
    } catch (recErr) {
      console.warn('Could not insert payment_receipts entry:', recErr);
    }

    res.json({
      success: true,
      payment: newPayment,
      receipt: receiptPayload,
      newStatus,
      newPaidAmount,
      payments: existingPayments
    });
  } catch (error: any) {
    console.error('Invoice Payment Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- SUPPLIER LEDGER --
app.get('/api/supplier-ledger/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const [rows]: any = await db.query(
      'SELECT * FROM supplier_ledger WHERE supplierId = ? ORDER BY date DESC, id DESC',
      [supplierId]
    );
    for (const r of rows) {
      r.referenceNo = r.referenceNo || r.reference || '';
      r.reference = r.reference || r.referenceNo || '';
      r.description = r.description || r.notes || '';
      r.notes = r.notes || r.description || '';
      if (r.debit === undefined || r.debit === null) {
        r.debit = (r.type === 'purchase' || r.type === 'bill') ? Number(r.amount) || 0 : 0;
      } else {
        r.debit = Number(r.debit) || 0;
      }
      if (r.credit === undefined || r.credit === null) {
        r.credit = (r.type === 'payment' || r.type === 'return' || r.type === 'advance') ? Number(r.amount) || 0 : 0;
      } else {
        r.credit = Number(r.credit) || 0;
      }
      r.amount = Number(r.amount) || (r.debit > 0 ? r.debit : r.credit);
    }
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/supplier-ledger', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    
    const debit = Number(data.debit) || (data.type === 'purchase' || data.type === 'bill' ? Number(data.amount) || 0 : 0);
    const credit = Number(data.credit) || (data.type === 'payment' || data.type === 'return' || data.type === 'advance' ? Number(data.amount) || 0 : 0);
    const amount = Number(data.amount) || (debit > 0 ? debit : credit);
    const ref = data.referenceNo || data.reference || '';
    const desc = data.description || data.notes || '';

    const item: any = {
      id: data.id || `SL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      supplierId: data.supplierId,
      date: data.date ? (data.date.length === 10 ? data.date + ' 00:00:00' : data.date.replace('T', ' ').slice(0, 19)) : new Date().toISOString().slice(0, 19).replace('T', ' '),
      type: data.type || (credit > 0 ? 'payment' : 'purchase'),
      referenceNo: ref,
      description: desc,
      debit,
      credit,
      amount,
      reference: ref,
      notes: desc,
      paymentMethod: data.paymentMethod || (credit > 0 ? 'Bank Transfer' : 'Invoice')
    };
    if (data.bankAccountId) {
      item.bankAccountId = data.bankAccountId;
    }
    if (data.debitAccountId) item.debitAccountId = data.debitAccountId;
    if (data.creditAccountId) item.creditAccountId = data.creditAccountId;
    if (data.debitAccountName) item.debitAccountName = data.debitAccountName;
    if (data.creditAccountName) item.creditAccountName = data.creditAccountName;

    // Smart fallbacks if not chosen
    if (!item.debitAccountId) {
      if (item.type === 'payment' || item.credit > 0) {
        try {
          const [ap]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "2000" OR name LIKE "%Payable%" LIMIT 1');
          if (ap.length) {
            item.debitAccountId = ap[0].id;
            if (!item.debitAccountName) item.debitAccountName = `${ap[0].code} - ${ap[0].name}`;
          }
        } catch (e) {}
      } else {
        try {
          const [exp]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "5000" OR type = "Expense" LIMIT 1');
          if (exp.length) {
            item.debitAccountId = exp[0].id;
            if (!item.debitAccountName) item.debitAccountName = `${exp[0].code} - ${exp[0].name}`;
          }
        } catch (e) {}
      }
    }

    if (!item.creditAccountId) {
      if (item.type === 'payment' || item.credit > 0) {
        try {
          const [cb]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "1000" OR subtype IN ("Bank", "Cash") OR type = "Asset" LIMIT 1');
          if (cb.length) {
            item.creditAccountId = cb[0].id;
            if (!item.creditAccountName) item.creditAccountName = `${cb[0].code} - ${cb[0].name}`;
          }
        } catch (e) {}
      } else {
        try {
          const [ap]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "2000" OR name LIKE "%Payable%" LIMIT 1');
          if (ap.length) {
            item.creditAccountId = ap[0].id;
            if (!item.creditAccountName) item.creditAccountName = `${ap[0].code} - ${ap[0].name}`;
          }
        } catch (e) {}
      }
    }

    // Auto-resolve account names if not provided
    if (item.debitAccountId && !item.debitAccountName) {
      try {
        const [acc]: any = await db.query('SELECT code, name FROM chart_of_accounts WHERE id = ?', [item.debitAccountId]);
        if (acc.length) item.debitAccountName = `${acc[0].code} - ${acc[0].name}`;
      } catch (eAcc) {}
    }
    if (item.creditAccountId && !item.creditAccountName) {
      try {
        const [acc]: any = await db.query('SELECT code, name FROM chart_of_accounts WHERE id = ?', [item.creditAccountId]);
        if (acc.length) item.creditAccountName = `${acc[0].code} - ${acc[0].name}`;
      } catch (eAcc) {}
    }

    await db.query('INSERT INTO supplier_ledger SET ?', item);

    // Auto GL Integration: Create Journal Entry & Lines
    try {
      let debitAccId = item.debitAccountId;
      let creditAccId = item.creditAccountId;

      if (debitAccId && creditAccId && amount > 0) {
        const jeId = `JE-SL-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        const jeDesc = (item.type === 'payment' || item.credit > 0)
          ? `Supplier Payment: ${item.description || item.referenceNo || item.id}`
          : `Supplier Transaction: ${item.description || item.referenceNo || item.id}`;

        await db.query('INSERT INTO journal_entries SET ?', {
          id: jeId,
          date: item.date,
          reference: item.id,
          description: jeDesc,
          totalAmount: amount
        });

        const lines = [
          [`JL-${Date.now().toString().slice(-6)}1`, jeId, debitAccId, amount, 0, item.supplierId || null, 'Supplier'],
          [`JL-${Date.now().toString().slice(-6)}2`, jeId, creditAccId, 0, amount, item.supplierId || null, 'Supplier']
        ];
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);

        // Update balances in chart_of_accounts
        const [accTypes]: any = await db.query('SELECT id, type FROM chart_of_accounts WHERE id IN (?, ?)', [debitAccId, creditAccId]);
        for (const acc of accTypes) {
          if (acc.id === debitAccId) {
            const delta = (acc.type === 'Asset' || acc.type === 'Expense') ? amount : -amount;
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [delta, acc.id]);
          } else if (acc.id === creditAccId) {
            const delta = (acc.type === 'Asset' || acc.type === 'Expense') ? -amount : amount;
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [delta, acc.id]);
          }
        }
      }
    } catch (eGl) {
      console.error('Error posting GL for supplier ledger:', eGl);
    }

    // If payment, settle open unpaid supplier bills
    if ((item.type === 'payment' || item.credit > 0) && item.supplierId) {
      try {
        const [openBills]: any = await db.query(
          'SELECT id, amount FROM supplier_bills WHERE supplierId = ? AND status = "unpaid" ORDER BY date ASC',
          [item.supplierId]
        );
        let remCredit = item.credit;
        for (const bill of openBills) {
          if (remCredit <= 0) break;
          await db.query('UPDATE supplier_bills SET status = "paid", updatedAt = NOW() WHERE id = ?', [bill.id]);
          remCredit -= Number(bill.amount);
        }
      } catch (e) {
        console.error('Error settling supplier bills on payment:', e);
      }
    }

    // Recalculate and sync suppliers balance
    if (item.supplierId) {
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [item.supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, item.supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on ledger insert:', errBal);
      }
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/supplier-ledger/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing]: any = await db.query('SELECT supplierId FROM supplier_ledger WHERE id = ?', [id]);
    const supplierId = existing[0]?.supplierId;

    // Reverse GL entries
    try {
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference = ?', [id]);
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        for (const line of lines) {
          const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
          if (!accounts.length) continue;
          const accType = accounts[0].type;
          const isDebitNormal = accType === 'Asset' || accType === 'Expense';
          const balanceChange = Number(line.debit) - Number(line.credit);
          if (isDebitNormal) {
            await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
          } else {
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [balanceChange, line.accountId]);
          }
        }
        await db.query('DELETE FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        await db.query('DELETE FROM journal_entries WHERE id IN (?)', [jeIds]);
      }
    } catch (eGl) {
      console.error('Error reversing GL on ledger delete:', eGl);
    }

    await db.query('DELETE FROM supplier_ledger WHERE id = ?', [id]);

    if (supplierId) {
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on ledger delete:', errBal);
      }
    }

    res.json({ success: true, id });
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO chart_of_accounts SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/finance/accounts/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('INSERT INTO tax_profiles SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
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
    const [entries]: any = await db.query('SELECT * FROM journal_entries ORDER BY date DESC, createdAt DESC');
    const [lines]: any = await db.query(`
      SELECT jl.*, ca.name as accountName, ca.code as accountCode 
      FROM journal_lines jl 
      LEFT JOIN chart_of_accounts ca ON jl.accountId = ca.id
    `);
    
    // Group lines by entry
    const result = entries.map((entry: any) => {
      entry.lines = lines.filter((l: any) => l.entryId === entry.id);
      return entry;
    });
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/journals', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id, date, reference, description, totalAmount, lines, createdBy } = req.body;
    
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: 'A journal entry must contain at least 2 lines.' });
    }

    const docId = id || `JE-${Date.now().toString().slice(-6)}`;
    const formattedDate = date 
      ? (String(date).includes(' ') || String(date).includes('T') 
          ? String(date).replace('T', ' ').slice(0, 19) 
          : `${String(date).trim()} 00:00:00`)
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    const entryData = {
      id: docId, 
      date: formattedDate, 
      reference: reference || null, 
      description: description || '', 
      totalAmount: Number(totalAmount || 0), 
      createdBy: createdBy || 'Admin', 
      status: 'posted',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    await conn.query('INSERT INTO journal_entries SET ?', entryData);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        throw new Error(`Line ${i + 1} does not have an account selected.`);
      }

      const debitVal = Number(line.debit || 0);
      const creditVal = Number(line.credit || 0);
      // Guarantee unique line ID to prevent primary key collision
      const lineId = `JL-${docId}-${i + 1}-${Math.random().toString(36).substring(2, 7)}`;

      await conn.query('INSERT INTO journal_lines SET ?', {
        id: lineId,
        entryId: docId,
        accountId: line.accountId, 
        partyType: line.partyType || null, 
        partyId: line.partyId || null, 
        costCenterId: line.costCenterId || null,
        description: line.description || '',
        debit: debitVal,
        credit: creditVal
      });
      
      // Update account balances
      const balanceChange = debitVal - creditVal;
      
      // Real accounting: Assets/Expenses increase with Debit. Liabilities/Equity/Revenue increase with Credit.
      const [accRows]: any = await conn.query('SELECT type, balance FROM chart_of_accounts WHERE id = ?', [line.accountId]);
      if (accRows.length > 0) {
        const type = (accRows[0].type || '').toLowerCase();
        const isDebitNormal = type.includes('asset') || type.includes('expense');
        let currentBalance = Number(accRows[0].balance || 0);
        if (isDebitNormal) {
          currentBalance += balanceChange;
        } else {
          currentBalance -= balanceChange;
        }
        await conn.query('UPDATE chart_of_accounts SET balance = ? WHERE id = ?', [currentBalance, line.accountId]);
      }
    }
    
    await conn.commit();
    res.json({ success: true, id: docId });
  } catch (error: any) { 
    await conn.rollback();
    console.error('Error posting journal:', error);
    res.status(500).json({ error: error.message || 'Failed to post journal entry' }); 
  } finally {
    conn.release();
  }
});



// ==========================================
// PAYMENT RECEIPTS (Customer Advance / Quotation Receipts)
// ==========================================
app.get('/api/finance/payment-receipts', async (req, res) => {
  try {
    const { quoteId, quotationNo, orderId, orderNo, customerId, invoiceId, invoiceNo, search } = req.query;
    let query = 'SELECT * FROM payment_receipts WHERE 1=1';
    const params: any[] = [];

    const idFilters: string[] = [];
    const idParams: any[] = [];

    if (quoteId) {
      idFilters.push('(quoteId = ? OR quotationNo = ?)');
      idParams.push(quoteId, quoteId);
    }
    if (quotationNo && quotationNo !== quoteId) {
      idFilters.push('(quotationNo = ? OR quoteId = ?)');
      idParams.push(quotationNo, quotationNo);
    }
    if (orderId) {
      idFilters.push('(orderId = ? OR orderNo = ?)');
      idParams.push(orderId, orderId);
    }
    if (orderNo && orderNo !== orderId) {
      idFilters.push('(orderNo = ? OR orderId = ?)');
      idParams.push(orderNo, orderNo);
    }
    if (invoiceId) {
      idFilters.push('(invoiceId = ? OR invoiceNo = ?)');
      idParams.push(invoiceId, invoiceId);
    }
    if (invoiceNo && invoiceNo !== invoiceId) {
      idFilters.push('(invoiceNo = ? OR invoiceId = ?)');
      idParams.push(invoiceNo, invoiceNo);
    }

    if (idFilters.length > 0) {
      query += ` AND (${idFilters.join(' OR ')})`;
      params.push(...idParams);
    }

    if (customerId) {
      query += ' AND customerId = ?';
      params.push(customerId);
    }

    if (search) {
      query += ' AND (receiptNo LIKE ? OR invoiceNo LIKE ? OR orderNo LIKE ? OR quotationNo LIKE ? OR customerName LIKE ? OR customerCompany LIKE ? OR reference LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s);
    }

    query += ' ORDER BY date DESC, createdAt DESC';
    const [rows]: any = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching payment receipts:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/finance/payment-receipts/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query(
      'SELECT * FROM payment_receipts WHERE id = ? OR receiptNo = ? LIMIT 1', 
      [req.params.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Payment receipt not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/finance/payment-receipts', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const data = { ...req.body };
    const amountVal = Number(data.amount) || 0;
    if (amountVal <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Please enter a valid receipt amount greater than zero' });
    }

    const docId = data.id || `REC-${Date.now().toString().slice(-6)}`;
    const receiptNum = data.receiptNo || docId;
    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const receiptDate = data.date 
      ? (String(data.date).includes(' ') || String(data.date).includes('T')
          ? String(data.date).replace('T', ' ').slice(0, 19)
          : `${String(data.date).trim()} 00:00:00`)
      : nowIso;

    // Resolve Deposit Account (Cash / Bank)
    let depositAccountId = data.accountId || data.depositAccountId || null;
    let depositAccountName = data.accountName || data.depositAccountName || '';
    if (depositAccountId) {
      try {
        const [acc]: any = await conn.query('SELECT id, name FROM chart_of_accounts WHERE id = ? LIMIT 1', [depositAccountId]);
        if (acc && acc.length > 0) {
          depositAccountId = acc[0].id;
          depositAccountName = acc[0].name;
        }
      } catch (e) {}
    }
    if (!depositAccountId) {
      const isBank = (data.paymentMethod || '').toLowerCase().includes('bank') || (data.paymentMethod || '').toLowerCase().includes('cheque') || (data.paymentMethod || '').toLowerCase().includes('card');
      const searchSubtype = isBank ? 'Bank' : 'Cash';
      try {
        const [found]: any = await conn.query(
          'SELECT id, name FROM chart_of_accounts WHERE (subtype = ? OR name LIKE ? OR (subtype IN ("Bank", "Cash") AND type = "Asset")) AND type = "Asset" AND name NOT LIKE "%Receivable%" ORDER BY CASE WHEN subtype = ? THEN 1 WHEN name LIKE ? THEN 2 ELSE 3 END LIMIT 1',
          [searchSubtype, `%${searchSubtype}%`, searchSubtype, `%${searchSubtype}%`]
        );
        if (found && found.length > 0) {
          depositAccountId = found[0].id;
          depositAccountName = found[0].name;
        } else {
          depositAccountId = isBank ? 'acc_1050' : 'acc_1000';
          depositAccountName = isBank ? 'Bank Account' : 'Cash and Equivalents';
          await conn.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, ?, ?, "Asset", ?, 0, NOW())', [
            depositAccountId, isBank ? '1050' : '1000', depositAccountName, searchSubtype
          ]);
        }
      } catch (e) {}
    }

    // Auto Journal Entry for General Ledger (wrapped safely)
    const jeId = `JE-${docId.replace(/[^A-Za-z0-9_-]/g, '')}`;
    try {
      // Resolve Customer Advance / Accounts Receivable Account
      let [arAcc]: any = await conn.query(
        'SELECT id, name FROM chart_of_accounts WHERE (name LIKE "%Advance%" OR name LIKE "%Deposit%" OR name LIKE "%Receivable%") AND (type = "Liability" OR type = "Asset") LIMIT 1'
      );
      let creditAccountId = 'acc_1500';
      if (arAcc && arAcc.length > 0) {
        creditAccountId = arAcc[0].id;
      } else {
        await conn.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1500", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', ['acc_1500']);
      }

      const jeData = {
        id: jeId,
        date: receiptDate,
        reference: receiptNum,
        description: `Customer Receipt: ${receiptNum} (${data.orderNo ? `Order: ${data.orderNo}` : (data.quotationNo ? `Quote: ${data.quotationNo}` : 'Direct')}) - ${data.customerName || 'Customer'}`,
        totalAmount: amountVal,
        createdBy: data.receivedBy || 'Accounts',
        status: 'posted',
        createdAt: nowIso
      };
      await conn.query('INSERT INTO journal_entries SET ?', jeData);

      // JL 1: Debit Bank/Cash
      const lineId1 = `JL-${jeId}-1`;
      await conn.query('INSERT INTO journal_lines SET ?', {
        id: lineId1,
        entryId: jeId,
        accountId: depositAccountId,
        partyType: 'Customer',
        partyId: data.customerId || null,
        description: `Payment Receipt ${receiptNum} received via ${data.paymentMethod || 'Cash'}`,
        debit: amountVal,
        credit: 0
      });
      // Update Bank/Cash balance (Debit increases Asset)
      if (depositAccountId) {
        await conn.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [amountVal, depositAccountId]);
      }

      // JL 2: Credit Customer Advance / AR
      const lineId2 = `JL-${jeId}-2`;
      await conn.query('INSERT INTO journal_lines SET ?', {
        id: lineId2,
        entryId: jeId,
        accountId: creditAccountId,
        partyType: 'Customer',
        partyId: data.customerId || null,
        description: `Advance receipt on ${data.orderNo ? `Sales Order ${data.orderNo}` : `Quotation ${data.quotationNo || data.quoteId || data.quotationId || ''}`}`,
        debit: 0,
        credit: amountVal
      });
      // Update AR/Advance balance
      await conn.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [amountVal, creditAccountId]);
    } catch (jeErr) {
      console.warn('Auto journal entry for payment receipt partially skipped:', jeErr);
    }

    const receiptPayload = {
      id: docId,
      receiptNo: receiptNum,
      date: receiptDate,
      quoteId: data.quoteId || data.quotationId || null,
      quotationNo: data.quotationNo || null,
      orderId: data.orderId || null,
      orderNo: data.orderNo || null,
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      customerCompany: data.customerCompany || null,
      totalQuotedAmount: Number(data.totalQuotedAmount || data.totalQuoted || 0),
      amount: amountVal,
      balanceDue: Number(data.balanceDue || 0),
      paymentMethod: data.paymentMethod || 'Cash',
      accountId: depositAccountId,
      accountName: depositAccountName,
      reference: data.reference || null,
      receivedBy: data.receivedBy || 'Accounts Officer',
      notes: data.notes || null,
      status: 'Received',
      journalEntryId: jeId,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Safe column check for payment_receipts table to avoid 'Unknown column' error
    let cleanPayload: any = receiptPayload;
    try {
      const [cols]: any = await conn.query('SHOW COLUMNS FROM payment_receipts');
      if (Array.isArray(cols) && cols.length > 0) {
        const validCols = new Set(cols.map((c: any) => c.Field));
        cleanPayload = {};
        for (const [k, v] of Object.entries(receiptPayload)) {
          if (validCols.has(k)) {
            cleanPayload[k] = v;
          }
        }
      }
    } catch (colErr) {
      console.warn('Could not check columns for payment_receipts, using full payload:', colErr);
    }

    await conn.query('INSERT INTO payment_receipts SET ?', cleanPayload);

    await conn.commit();
    res.json({
      success: true,
      id: docId,
      receipt: {
        ...receiptPayload,
        totalQuoted: Number(data.totalQuotedAmount || data.totalQuoted || 0)
      },
      ...receiptPayload,
      totalQuoted: Number(data.totalQuotedAmount || data.totalQuoted || 0)
    });
  } catch (err: any) {
    await conn.rollback();
    console.error('Failed to create payment receipt:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment receipt' });
  } finally {
    conn.release();
  }
});

app.delete('/api/finance/payment-receipts/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const [rows]: any = await conn.query('SELECT * FROM payment_receipts WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      conn.release();
      return res.status(404).json({ error: 'Payment receipt not found' });
    }
    const receipt = rows[0];

    // Reverse GL entries if journalEntryId exists
    if (receipt.journalEntryId) {
      const [lines]: any = await conn.query('SELECT * FROM journal_lines WHERE entryId = ?', [receipt.journalEntryId]);
      for (const line of lines) {
        if (Number(line.debit) > 0) {
          await conn.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [Number(line.debit), line.accountId]);
        }
        if (Number(line.credit) > 0) {
          await conn.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [Number(line.credit), line.accountId]);
        }
      }
      await conn.query('DELETE FROM journal_lines WHERE entryId = ?', [receipt.journalEntryId]);
      await conn.query('DELETE FROM journal_entries WHERE id = ?', [receipt.journalEntryId]);
    }

    await conn.query('DELETE FROM payment_receipts WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    console.error('Failed to delete payment receipt:', err);
    res.status(500).json({ error: err.message || 'Failed to delete payment receipt' });
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
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
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
    
    const [bills] = await db.query('SELECT SUM(amount) as pendingAP FROM supplier_bills WHERE status = "unpaid" OR status IS NULL');
    const [invoices] = await db.query('SELECT SUM(total - IFNULL(paidAmount, 0)) as pendingAR FROM invoices WHERE (status IS NULL OR (status != "paid" AND status != "draft"))');

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
        COALESCE(i.customerId, i.leadId, 'WALK-IN') as partyId,
        COALESCE(p.company, p.name, l.company, l.name, 'Direct Customer') as partyName,
        SUM(i.total - COALESCE(i.paidAmount, 0)) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) <= 30 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 31 AND 60 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 61 AND 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) > 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90plus'
      FROM invoices i
      LEFT JOIN customers p ON (i.customerId = p.id OR i.leadId = p.id)
      LEFT JOIN leads l ON (i.customerId = l.id OR i.leadId = l.id)
      WHERE (i.status IS NULL OR (i.status != 'paid' AND i.status != 'draft'))
      GROUP BY partyId, partyName 
      HAVING balance > 0
      `;
    } else {
      query = `
      SELECT 
        s.id as partyId,
        s.name as partyName,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) + COALESCE(s.openingBalance, s.balance, 0)) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) <= 30 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) BETWEEN 31 AND 60 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) BETWEEN 61 AND 90 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) as 'bucket90',
        (SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) > 90 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) + COALESCE(s.openingBalance, s.balance, 0)) as 'bucket90plus'
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplierId
      GROUP BY s.id, s.name, s.openingBalance, s.balance, s.createdAt
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
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// PRODUCTION / WORK ORDERS API (COMPREHENSIVE MANUFACTURING SUITE)
// ==========================
app.get('/api/production/work-orders', async (req, res) => {
  try {
    const [wos]: any = await db.query('SELECT * FROM work_orders ORDER BY createdAt DESC');
    const [ops]: any = await db.query('SELECT * FROM work_order_operations ORDER BY stepNumber ASC');
    const [qcs]: any = await db.query('SELECT * FROM qc_inspections ORDER BY id DESC');
    const [reworks]: any = await db.query('SELECT * FROM rework_logs ORDER BY id DESC');
    const [empRows]: any = await db.query('SELECT id, name, role, hourlyRate FROM employees');
    const [machRows]: any = await db.query('SELECT id, name, type, hourlyCost, status FROM machineries');

    // Fetch all stock ledger items issued to work orders
    let ledgerRows: any[] = [];
    try {
      const [ledgers]: any = await db.query(
        `SELECT sl.*, i.name as itemName, i.sku as itemSku, i.uom as itemUom, i.unitCost as itemUnitCost 
         FROM stock_ledger sl 
         LEFT JOIN inventory i ON sl.inventoryId = i.id 
         WHERE sl.type = 'OUT' AND (sl.reference LIKE 'WO-%' OR sl.reference IS NOT NULL)`
      );
      ledgerRows = ledgers || [];
    } catch (e) {
      console.error('Error fetching stock_ledger for work orders:', e);
    }

    // Resolve customer names from customers & leads tables
    let customerMap: Record<string, string> = {};
    try {
      const [custs]: any = await db.query('SELECT id, name, company FROM customers');
      custs.forEach((c: any) => { customerMap[c.id] = c.company ? `${c.name} (${c.company})` : c.name || c.id; });
    } catch(e) {}
    try {
      const [leads]: any = await db.query('SELECT id, name, company FROM leads');
      leads.forEach((l: any) => { 
        if (!customerMap[l.id]) customerMap[l.id] = l.company ? `${l.name} (${l.company})` : l.name || l.id; 
      });
    } catch(e) {}

    const enriched = wos.map((wo: any) => {
      // 1. Matched operations
      const woOps = ops.filter((o: any) => o.workOrderId === wo.id).map((o: any) => {
        const emp = empRows.find((e: any) => e.id === o.employeeId);
        const mac = machRows.find((m: any) => m.id === o.machineId);
        const opQc = qcs.filter((q: any) => q.operationId === o.id || q.workOrderId === wo.id && q.operationId == o.id);
        const opReworks = reworks.filter((r: any) => r.operationId === o.id);

        const laborRate = Number(o.hourlyLaborRate || emp?.hourlyRate || 750);
        const machineRate = Number(o.hourlyMachineRate || mac?.hourlyCost || 1200);
        const actHrs = Number(o.actualHours || 0);

        return {
          ...o,
          employeeName: emp?.name || null,
          employeeHourlyRate: laborRate,
          machineName: mac ? `${mac.name} (${mac.type || ''})` : null,
          machineStatus: mac?.status || 'Active',
          machineHourlyCost: machineRate,
          actualLaborCost: actHrs * laborRate,
          actualMachineCost: actHrs * machineRate,
          qc: opQc,
          reworks: opReworks
        };
      });

      // 2. Matched QC inspections & Reworks for this WO
      const woQcs = qcs.filter((q: any) => q.workOrderId === wo.id);
      const woReworks = reworks.filter((r: any) => r.workOrderId === wo.id).map((r: any) => {
        const emp = empRows.find((e: any) => e.id === r.assignedEmployeeId);
        const mac = machRows.find((m: any) => m.id === r.machineId);
        return {
          ...r,
          assignedEmployeeName: emp?.name || null,
          machineName: mac ? mac.name : null
        };
      });

      // 3. Matched issued materials from stock_ledger
      const woIdRef = String(wo.id || '').trim().toLowerCase();
      const woOrderNo = String(wo.orderNo || '').trim().toLowerCase();
      const woMaterials = ledgerRows.filter((l: any) => {
        const ref = String(l.reference || '').trim().toLowerCase();
        return ref === woIdRef || (woOrderNo && ref === woOrderNo) || ref.includes(woIdRef);
      });

      // 4. Financial Cost Rollup
      const materialCost = woMaterials.reduce((acc: number, m: any) => {
        const cost = Number(m.totalCost || (Number(m.qty || 0) * Number(m.unitCost || m.itemUnitCost || 0)));
        return acc + cost;
      }, 0);

      const laborCost = woOps.reduce((acc: number, o: any) => acc + (o.actualLaborCost || 0), 0);
      const machineCost = woOps.reduce((acc: number, o: any) => acc + (o.actualMachineCost || 0), 0);
      const reworkCost = woReworks.reduce((acc: number, r: any) => {
        const directCost = Number(r.cost || 0);
        const laborRwk = Number(r.hours || 0) * 800; // standard technician rate for rework
        return acc + directCost + laborRwk;
      }, 0);

      const overheadPct = Number(wo.overheadPct !== undefined && wo.overheadPct !== null ? wo.overheadPct : 15);
      const overheadCost = (laborCost + machineCost) * (overheadPct / 100);
      const actualTotalCost = materialCost + laborCost + machineCost + reworkCost + overheadCost;

      // Planned / Estimated totals
      let bomItems: any[] = [];
      try {
        bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
      } catch (e) {}

      const estBomCost = bomItems.reduce((acc: number, b: any) => acc + (Number(b.qty || 1) * Number(b.unitCost || 0)), 0);
      const estMachLabor = woOps.reduce((acc: number, o: any) => {
        const hrs = Number(o.plannedHours || 0);
        return acc + (hrs * o.employeeHourlyRate) + (hrs * o.machineHourlyCost);
      }, 0);
      const estimatedCost = Number(wo.estimatedCost || (estBomCost + estMachLabor));

      // Progress calculation
      const validOps = woOps.filter((o: any) => Number(o.plannedHours || 0) > 0 || o.status === 'Completed');
      const totalSteps = validOps.length || woOps.length;
      const completedSteps = woOps.filter((o: any) => o.status === 'Completed').length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : (wo.status === 'Completed' ? 100 : 0);

      return {
        ...wo,
        customerName: customerMap[wo.customerId] || wo.customer || wo.customerId || null,
        operations: woOps,
        qcInspections: woQcs,
        reworkLogs: woReworks,
        issuedMaterials: woMaterials,
        progress,
        costSummary: {
          materialCost,
          laborCost,
          machineCost,
          reworkCost,
          overheadPct,
          overheadCost,
          actualTotalCost,
          estimatedCost,
          variance: actualTotalCost - estimatedCost,
          completedSteps,
          totalSteps
        }
      };
    });

    res.json(enriched);
  } catch (error: any) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Single Work Order Fetch with full details
app.get('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    const [ops]: any = await db.query('SELECT * FROM work_order_operations WHERE workOrderId = ? ORDER BY stepNumber ASC', [id]);
    const [qcs]: any = await db.query('SELECT * FROM qc_inspections WHERE workOrderId = ? ORDER BY id DESC', [id]);
    const [reworks]: any = await db.query('SELECT * FROM rework_logs WHERE workOrderId = ? ORDER BY id DESC', [id]);
    const [empRows]: any = await db.query('SELECT id, name, role, hourlyRate FROM employees');
    const [machRows]: any = await db.query('SELECT id, name, type, hourlyCost, status FROM machineries');

    // Fetch stock ledger materials
    const [materials]: any = await db.query(
      `SELECT sl.*, i.name as itemName, i.sku as itemSku, i.uom as itemUom, i.unitCost as itemUnitCost 
       FROM stock_ledger sl 
       LEFT JOIN inventory i ON sl.inventoryId = i.id 
       WHERE sl.type = 'OUT' AND (sl.reference = ? OR sl.reference = ? OR sl.reference LIKE ?)`,
      [id, wo.orderNo || id, `%${id}%`]
    );

    let parsedQcCheckpoints: any[] = [];
    if (wo.qcCheckpoints) {
      try {
        parsedQcCheckpoints = typeof wo.qcCheckpoints === 'string' ? JSON.parse(wo.qcCheckpoints) : wo.qcCheckpoints;
      } catch (e) {
        parsedQcCheckpoints = [];
      }
    }

    let parsedDispatches: any[] = [];
    if (wo.dispatches) {
      try {
        parsedDispatches = typeof wo.dispatches === 'string' ? JSON.parse(wo.dispatches) : wo.dispatches;
      } catch (e) {
        parsedDispatches = [];
      }
    }

    const enrichedOps = ops.map((o: any) => {
      const emp = empRows.find((e: any) => e.id === o.employeeId);
      const mac = machRows.find((m: any) => m.id === o.machineId);
      return {
        ...o,
        employeeName: emp?.name || null,
        machineName: mac?.name || null,
        machineHourlyCost: mac?.hourlyCost || 1200,
        employeeHourlyRate: emp?.hourlyRate || 750
      };
    });

    // Compute Cost Rollup & Job Costing for Single Work Order
    const materialCost = materials.reduce((acc: number, m: any) => {
      const cost = Number(m.totalCost || (Number(m.qty || 0) * Number(m.unitCost || m.itemUnitCost || 0)));
      return acc + cost;
    }, 0);

    const laborCost = enrichedOps.reduce((acc: number, o: any) => acc + (o.actualLaborCost || 0), 0);
    const machineCost = enrichedOps.reduce((acc: number, o: any) => acc + (o.actualMachineCost || 0), 0);
    const reworkCost = reworks.reduce((acc: number, r: any) => {
      const directCost = Number(r.cost || 0);
      const laborRwk = Number(r.hours || 0) * 800;
      return acc + directCost + laborRwk;
    }, 0);

    const overheadPct = Number(wo.overheadPct !== undefined && wo.overheadPct !== null ? wo.overheadPct : 15);
    const overheadCost = (laborCost + machineCost) * (overheadPct / 100);
    const actualTotalCost = materialCost + laborCost + machineCost + reworkCost + overheadCost;

    let bomItems: any[] = [];
    try {
      bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
    } catch (e) {}

    let estBomCost = 0;
    if (Array.isArray(bomItems)) {
      bomItems.forEach((b: any) => {
        if (b.allMaterials || b.autoMats || b.manualMats) {
          const mats = b.allMaterials || [...(b.autoMats || []), ...(b.manualMats || [])];
          estBomCost += mats.reduce((s: number, m: any) => s + Number(m.totalPrice || (Number(m.qty || 1) * Number(m.unitPrice || m.unitCost || 0))), 0);
        } else {
          estBomCost += Number(b.qty || 1) * Number(b.unitCost || b.unitPrice || 0);
        }
      });
    }

    const estMachLabor = enrichedOps.reduce((acc: number, o: any) => {
      const hrs = Number(o.plannedHours || 0);
      const empRate = Number(o.employeeHourlyRate || 750);
      const macRate = Number(o.machineHourlyCost || 1200);
      return acc + (hrs * empRate) + (hrs * macRate);
    }, 0);
    const estimatedCost = Number(wo.estimatedCost || (estBomCost + estMachLabor));

    const validOps = enrichedOps.filter((o: any) => Number(o.plannedHours || 0) > 0 || o.status === 'Completed');
    const totalSteps = validOps.length || enrichedOps.length;
    const completedSteps = enrichedOps.filter((o: any) => o.status === 'Completed').length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : (wo.status === 'Completed' ? 100 : 0);

    res.json({
      ...wo,
      qcCheckpoints: parsedQcCheckpoints,
      dispatches: parsedDispatches,
      operations: enrichedOps,
      qcInspections: qcs,
      reworkLogs: reworks,
      issuedMaterials: materials || [],
      progress,
      costSummary: {
        materialCost,
        laborCost,
        machineCost,
        reworkCost,
        overheadPct,
        overheadCost,
        actualTotalCost,
        estimatedCost,
        variance: actualTotalCost - estimatedCost,
        completedSteps,
        totalSteps
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Work Order
app.post('/api/production/work-orders', async (req, res) => {
  try {
    const { 
      title, customerId, customer, priority, plannedStartDate, deadline, 
      operations, bom, sourceQuoteId, notes, attachments, jobQty, overheadPct, estimatedCost 
    } = req.body;

    // Duplicate check for quote
    if (sourceQuoteId) {
      const [existing]: any = await db.query('SELECT id FROM work_orders WHERE quoteId = ? LIMIT 1', [sourceQuoteId]);
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'DUPLICATE', existingId: existing[0].id, message: 'A Work Order already exists for this quotation.' });
      }
    }

    const woId = 'WO-' + Date.now().toString().slice(-5);
    const orderNo = req.body.orderNo || `WO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    await db.query(
      `INSERT INTO work_orders 
       (id, orderNo, title, customerId, customer, quoteId, priority, status, plannedStartDate, deadline, jobQty, bom, notes, attachments, overheadPct, estimatedCost, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        woId, orderNo, title, customerId || null, customer || null, sourceQuoteId || null, 
        priority || 'Normal', plannedStartDate || new Date(), deadline || null, 
        Math.max(1, Number(jobQty || 1)), bom ? JSON.stringify(bom) : null, 
        notes || null, attachments ? JSON.stringify(attachments) : null,
        Number(overheadPct || 15), Number(estimatedCost || 0)
      ]
    );

    if (operations && operations.length > 0) {
      const opValues = operations.map((op: any, i: number) => [
        'OP-' + Date.now().toString().slice(-4) + '-' + i,
        woId,
        i + 1,
        op.operationName,
        op.machineId || null,
        op.employeeId || null,
        Number(op.plannedHours || 1),
        0, // actualHours
        'Pending',
        Number(op.hourlyLaborRate || 750),
        Number(op.hourlyMachineRate || 1200),
        op.notes || null
      ]);

      await db.query(
        `INSERT INTO work_order_operations 
         (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours, actualHours, status, hourlyLaborRate, hourlyMachineRate, notes) 
         VALUES ?`,
        [opValues]
      );
    }

    res.json({ success: true, id: woId, orderNo });
  } catch (error: any) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Work Order Details
app.put('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, customerId, priority, status, jobQty, completedQty, scrapQty, 
      plannedStartDate, deadline, notes, overheadPct, estimatedCost 
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (customerId !== undefined) { fields.push('customerId = ?'); values.push(customerId || null); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (jobQty !== undefined) { fields.push('jobQty = ?'); values.push(Number(jobQty)); }
    if (completedQty !== undefined) { fields.push('completedQty = ?'); values.push(Number(completedQty)); }
    if (scrapQty !== undefined) { fields.push('scrapQty = ?'); values.push(Number(scrapQty)); }
    if (plannedStartDate !== undefined) { fields.push('plannedStartDate = ?'); values.push(plannedStartDate); }
    if (deadline !== undefined) { fields.push('deadline = ?'); values.push(deadline); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
    if (overheadPct !== undefined) { fields.push('overheadPct = ?'); values.push(Number(overheadPct)); }
    if (estimatedCost !== undefined) { fields.push('estimatedCost = ?'); values.push(Number(estimatedCost)); }

    fields.push('updatedAt = NOW()');
    values.push(id);

    await db.query(`UPDATE work_orders SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Work Order Status

// Substitute Requests Endpoints for Work Orders, Stores & Approvals
app.get('/api/production/substitute-requests', async (req, res) => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, orderNo, title, customer, quoteId, status, materialStatus, materialAlert, bom, createdAt FROM work_orders WHERE bom LIKE '%substituteRequest%' ORDER BY updatedAt DESC"
    );
    const requests: any[] = [];
    for (const wo of rows) {
      let bomItems: any[] = [];
      try {
        bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
      } catch (e) { bomItems = []; }

      bomItems.forEach((b: any, idx: number) => {
        if (b.substituteRequest) {
          requests.push({
            workOrderId: wo.id,
            workOrderNo: wo.orderNo || wo.id,
            workOrderTitle: wo.title,
            customer: wo.customer,
            quoteId: wo.quoteId,
            bomIndex: idx,
            material: b.material,
            bomQty: b.qty,
            bomUnit: b.unit,
            bomUnitCost: b.unitCost,
            substituteRequest: b.substituteRequest,
            createdAt: wo.createdAt
          });
        }
      });
    }
    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching substitute requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Report Shortage & Propose Substitute
app.post('/api/production/work-orders/:id/report-shortage', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      bomIndex, missingMaterial, requiredQty, currentStock, 
      substituteMaterial, substituteInvId, substituteQty, substituteUnitCost,
      reason, requestedBy, notifySales 
    } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    let bomItems: any[] = [];
    try {
      bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
    } catch (e) { bomItems = []; }

    const reqIdx = Number(bomIndex);
    const shortageQty = Math.max(0, Number(requiredQty || 1) - Number(currentStock || 0));
    const subReqId = 'SUB-' + Date.now().toString().slice(-6);
    const isAvailable = Number(currentStock || 0) >= Number(requiredQty || 1);

    const subReq = {
      id: subReqId,
      requestedAt: new Date().toISOString(),
      requestedBy: requestedBy || 'Production Team',
      missingMaterial: missingMaterial || (bomItems[reqIdx]?.material) || 'Material',
      requiredQty: Number(requiredQty || 1),
      currentStock: Number(currentStock || 0),
      shortageQty,
      isAvailable,
      substituteMaterial: substituteMaterial || null,
      substituteInvId: substituteInvId || null,
      substituteQty: Number(substituteQty || requiredQty || 1),
      substituteUnitCost: Number(substituteUnitCost || 0),
      reason: reason || (isAvailable ? 'Alternative material requested by workshop' : 'Material not in stock in stores'),
      status: 'pending_approval',
      notifySales: !!notifySales
    };

    if (bomItems[reqIdx]) {
      bomItems[reqIdx].substituteRequest = subReq;
    } else {
      bomItems.push({
        material: missingMaterial || 'Raw Material',
        qty: Number(requiredQty || 1),
        notes: 'Original BOM item',
        substituteRequest: subReq
      });
    }

    const materialStatus = isAvailable ? 'Substitute Proposed (Stock Available)' : 'Shortage / Substitute Pending';
    const alertText = isAvailable
      ? `Material Substitute Proposed: ${substituteMaterial || 'Alternative'} (replaces ${subReq.missingMaterial}). Reason: ${reason || 'Workshop adjustment'}.`
      : `Shortage: ${subReq.missingMaterial} (Qty: ${shortageQty}). Proposed Substitute: ${substituteMaterial || 'None'}.`;

    await db.query(
      'UPDATE work_orders SET bom = ?, materialStatus = ?, materialAlert = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(bomItems), materialStatus, alertText, id]
    );

    // Update Quotation if linked
    if (wo.quoteId) {
      await db.query(
        'UPDATE quotations SET materialStatus = ?, materialAlert = ? WHERE id = ? OR quotationNo = ?',
        [materialStatus, alertText, wo.quoteId, wo.quoteId]
      ).catch(() => {});
    }

    // Update Sales Order (finished_goods_orders) if linked
    if (wo.orderNo) {
      await db.query(
        'UPDATE finished_goods_orders SET materialStatus = ?, materialAlert = ? WHERE orderNo = ? OR id = ?',
        [materialStatus, alertText, wo.orderNo, wo.orderNo]
      ).catch(() => {});
    }

    // Log in approval_logs
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, metadata, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Pending', ?, NOW(), ?, ?, NOW())`,
        [
          'Material Substitute',
          id,
          wo.orderNo || id,
          wo.customer || 'Customer Job',
          0,
          requestedBy || 'Stores Personnel',
          `Shortage: ${subReq.missingMaterial}. Proposed: ${substituteMaterial || 'None'}. Reason: ${reason}`,
          JSON.stringify(subReq)
        ]
      );
    } catch (e) {}

    // If notifySales is true, automatically create a Followup record for Sales/Quotation team
    if (notifySales) {
      try {
        const folId = 'FOL-' + Date.now().toString().slice(-6);
        const folData = {
          id: folId,
          title: `Material Shortage Alert: ${wo.orderNo || id}`,
          type: 'Material Alert',
          priority: 'urgent',
          status: 'Pending',
          leadId: wo.quoteId || null,
          notes: `ATTN Sales Team: Work Order ${wo.orderNo || id} (Customer: ${wo.customer || 'N/A'}) has a material shortage for "${subReq.missingMaterial}" (Shortage Qty: ${shortageQty}). Proposed substitute: "${substituteMaterial || 'None'}". Reason: "${reason || 'Stores out of stock'}". Please inform the client if delivery schedule or specifications need adjustment.`,
          dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' '),
          assignedTo: 'Sales Team',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        await db.query('INSERT INTO followups SET ?', folData);
      } catch (e) {}
    }

    res.json({ success: true, substituteRequest: subReq, bom: bomItems });
  } catch (error: any) {
    console.error('Error reporting shortage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve Substitute Material
app.post('/api/production/work-orders/:id/approve-substitute', async (req, res) => {
  try {
    const { id } = req.params;
    const { bomIndex, approvedBy, actionNotes } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    let bomItems: any[] = [];
    try {
      bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
    } catch (e) { bomItems = []; }

    const reqIdx = Number(bomIndex);
    const item = bomItems[reqIdx];
    if (!item || !item.substituteRequest) {
      return res.status(400).json({ error: 'No substitute request found for this BOM item.' });
    }

    const sub = item.substituteRequest;
    const origMaterial = item.material;
    const newMaterial = sub.substituteMaterial || item.material;
    const newQty = Number(sub.substituteQty || item.qty);
    const newUnitCost = Number(sub.substituteUnitCost || item.unitCost || 0);

    // Update substitute request status
    sub.status = 'approved';
    sub.approvedBy = approvedBy || 'Department Head';
    sub.approvedAt = new Date().toISOString();
    sub.actionNotes = actionNotes || 'Substitute approved by Department Head';

    // Replace the BOM item material with approved substitute
    item.material = newMaterial;
    item.qty = newQty;
    if (newUnitCost > 0) item.unitCost = newUnitCost;
    item.notes = `${item.notes || ''} [Substituted for ${origMaterial} on ${new Date().toLocaleDateString()}]`.trim();

    // Check if any other items are still pending
    const hasRemainingPending = bomItems.some(b => b.substituteRequest && b.substituteRequest.status === 'pending_approval');
    const newMatStatus = hasRemainingPending ? 'Shortage / Substitute Pending' : 'Substitute Approved';
    const alertText = `Substitute approved: ${newMaterial} (replaces ${origMaterial})`;

    await db.query(
      'UPDATE work_orders SET bom = ?, materialStatus = ?, materialAlert = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(bomItems), newMatStatus, alertText, id]
    );

    // Update Quotation if linked
    if (wo.quoteId) {
      await db.query(
        'UPDATE quotations SET materialStatus = ?, materialAlert = ? WHERE id = ? OR quotationNo = ?',
        [newMatStatus, alertText, wo.quoteId, wo.quoteId]
      ).catch(() => {});
    }

    // Update Sales Order if linked
    if (wo.orderNo) {
      await db.query(
        'UPDATE finished_goods_orders SET materialStatus = ?, materialAlert = ? WHERE orderNo = ? OR id = ?',
        [newMatStatus, alertText, wo.orderNo, wo.orderNo]
      ).catch(() => {});
    }

    // Log to approval_logs
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, metadata, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Approved', ?, NOW(), ?, ?, NOW())`,
        [
          'Material Substitute',
          id,
          wo.orderNo || id,
          wo.customer || 'Customer Job',
          0,
          approvedBy || 'Department Head',
          `Approved substitute ${newMaterial} for ${origMaterial}. ${actionNotes || ''}`,
          JSON.stringify(sub)
        ]
      );
    } catch (e) {}

    // Alert Stores & Sales
    try {
      const folId = 'FOL-' + Date.now().toString().slice(-6);
      await db.query('INSERT INTO followups SET ?', {
        id: folId,
        title: `Substitute Approved: ${wo.orderNo || id} Ready for Material Issue`,
        type: 'Material Update',
        priority: 'high',
        status: 'Pending',
        leadId: wo.quoteId || null,
        notes: `Department Head approved substitute "${newMaterial}" for Work Order ${wo.orderNo || id}. Stores can now issue this material directly to production.`,
        dueDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
        assignedTo: 'Stores / Production',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    } catch (e) {}

    res.json({ success: true, bom: bomItems });
  } catch (error: any) {
    console.error('Error approving substitute:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject Substitute Request
app.post('/api/production/work-orders/:id/reject-substitute', async (req, res) => {
  try {
    const { id } = req.params;
    const { bomIndex, rejectedBy, reason } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    let bomItems: any[] = [];
    try {
      bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
    } catch (e) { bomItems = []; }

    const reqIdx = Number(bomIndex);
    const item = bomItems[reqIdx];
    if (!item || !item.substituteRequest) {
      return res.status(400).json({ error: 'No substitute request found for this BOM item.' });
    }

    item.substituteRequest.status = 'rejected';
    item.substituteRequest.rejectedBy = rejectedBy || 'Department Head';
    item.substituteRequest.rejectedAt = new Date().toISOString();
    item.substituteRequest.actionNotes = reason || 'Substitute rejected by Department Head';

    const materialStatus = 'Substitute Rejected (Purchase Required)';
    const alertText = `Substitute rejected: ${reason || 'Procurement required'}`;

    await db.query(
      'UPDATE work_orders SET bom = ?, materialStatus = ?, materialAlert = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(bomItems), materialStatus, alertText, id]
    );

    // Update Quotation if linked
    if (wo.quoteId) {
      await db.query(
        'UPDATE quotations SET materialStatus = ?, materialAlert = ? WHERE id = ? OR quotationNo = ?',
        [materialStatus, alertText, wo.quoteId, wo.quoteId]
      ).catch(() => {});
    }

    // Update Sales Order if linked
    if (wo.orderNo) {
      await db.query(
        'UPDATE finished_goods_orders SET materialStatus = ?, materialAlert = ? WHERE orderNo = ? OR id = ?',
        [materialStatus, alertText, wo.orderNo, wo.orderNo]
      ).catch(() => {});
    }

    // Log to approval_logs
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, metadata, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Rejected', ?, NOW(), ?, ?, NOW())`,
        [
          'Material Substitute',
          id,
          wo.orderNo || id,
          wo.customer || 'Customer Job',
          0,
          rejectedBy || 'Department Head',
          `Rejected substitute for ${item.material}. Reason: ${reason || 'N/A'}`,
          JSON.stringify(item.substituteRequest)
        ]
      );
    } catch (e) {}

    res.json({ success: true, bom: bomItems });
  } catch (error: any) {
    console.error('Error rejecting substitute:', error);
    res.status(500).json({ error: error.message });
  }
});

// Direct Change BOM Material & Store Requisition
app.post('/api/production/work-orders/:id/change-bom-material', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      bomIndex, originalMaterial, newMaterial, newInventoryId, 
      newQty, newUnit, newUnitCost, spec, reason, changedBy, requestFromStores,
      partTitle
    } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    let bomItems: any[] = [];
    try {
      bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
    } catch (e) { bomItems = []; }

    const reqIdx = Number(bomIndex ?? 0);
    const dateStr = new Date().toLocaleDateString();
    const origName = originalMaterial || (bomItems[reqIdx]?.material) || 'Original Material';
    const targetMaterial = newMaterial || origName;

    // Build or update target BOM item
    let targetItem = bomItems[reqIdx];
    if (!targetItem) {
      targetItem = {
        material: targetMaterial,
        originalMaterial: origName,
        inventoryId: newInventoryId || null,
        qty: Number(newQty || 1),
        unit: newUnit || 'pcs',
        unitCost: Number(newUnitCost || 0),
        notes: `[Substituted for ${origName} on ${dateStr}: ${reason || 'Workshop adjustment'}]`
      };
      bomItems.push(targetItem);
    } else {
      targetItem.originalMaterial = targetItem.originalMaterial || origName;
      targetItem.material = targetMaterial;
      if (newInventoryId) targetItem.inventoryId = newInventoryId;
      targetItem.qty = Number(newQty || targetItem.qty || 1);
      if (newUnit) targetItem.unit = newUnit;
      if (newUnitCost !== undefined) targetItem.unitCost = Number(newUnitCost);
      targetItem.notes = `${targetItem.notes || ''} [Substituted for ${origName} on ${dateStr}: ${reason || 'Workshop adjustment'}]`.trim();
    }

    targetItem.isSubstituted = true;
    targetItem.substitutionDetails = {
      originalMaterial: origName,
      newMaterial: targetMaterial,
      spec: spec || '',
      reason: reason || 'Alternative material selected by workshop',
      changedBy: changedBy || 'Production Team',
      changedAt: new Date().toISOString()
    };

    const materialStatus = 'Material Substituted';
    const alertText = `Material Changed: ${targetMaterial} (replaces ${origName}). Stores requisition logged.`;

    await db.query(
      'UPDATE work_orders SET bom = ?, materialStatus = ?, materialAlert = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(bomItems), materialStatus, alertText, id]
    );

    // Update Quotation if linked
    if (wo.quoteId) {
      await db.query(
        'UPDATE quotations SET materialStatus = ?, materialAlert = ? WHERE id = ? OR quotationNo = ?',
        [materialStatus, alertText, wo.quoteId, wo.quoteId]
      ).catch(() => {});
    }

    // Update Sales Order if linked
    if (wo.orderNo) {
      await db.query(
        'UPDATE finished_goods_orders SET materialStatus = ?, materialAlert = ? WHERE orderNo = ? OR id = ?',
        [materialStatus, alertText, wo.orderNo, wo.orderNo]
      ).catch(() => {});
    }

    // Log in approval_logs / audit
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, metadata, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Approved', ?, NOW(), ?, ?, NOW())`,
        [
          'Material Substitute',
          id,
          wo.orderNo || id,
          wo.customer || 'Customer Job',
          0,
          changedBy || 'Production Team',
          `Direct Material Substitution: ${targetMaterial} for ${origName}. Reason: ${reason || 'Technical preference'}. Part: ${partTitle || 'BOM'}`,
          JSON.stringify(targetItem.substitutionDetails)
        ]
      );
    } catch (e) {}

    // Alert Stores
    if (requestFromStores) {
      try {
        const folId = 'FOL-' + Date.now().toString().slice(-6);
        await db.query('INSERT INTO followups SET ?', {
          id: folId,
          title: `Stores Requisition: ${targetMaterial} for ${wo.orderNo || id}`,
          type: 'Stores Requisition',
          priority: 'high',
          status: 'Pending',
          leadId: wo.quoteId || null,
          notes: `Workshop changed BOM material to "${targetMaterial}" (replaces "${origName}") for Job #${wo.orderNo || id}. Reason: ${reason || 'Alternative grade/remnant requested'}. Stores to issue ${newQty || targetItem.qty} ${newUnit || targetItem.unit}.`,
          dueDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
          assignedTo: 'Stores / Storekeeper',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `Material changed to ${targetMaterial} and Store Requisition logged for Work Order #${wo.orderNo || id}.`,
      bom: bomItems
    });
  } catch (error: any) {
    console.error('Error changing BOM material:', error);
    res.status(500).json({ error: error.message });
  }
});

// Full BOM Adjustment & Dynamic Internal Job Costing Recalculation
app.post('/api/production/work-orders/:id/adjust-full-bom', async (req, res) => {
  try {
    const { id } = req.params;
    const { boms, overheadPct = 15, syncRouting = true } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    if (!Array.isArray(boms)) {
      return res.status(400).json({ error: 'BOMs array is required' });
    }

    let grandMaterialCost = 0;
    let grandMachiningLaborCost = 0;
    let grandQuotedHours = 0;

    // Process and enrich each BOM part
    const processedBoms = boms.map((b: any, bIdx: number) => {
      const autoMats = (b.autoMats || []).map((m: any, mIdx: number) => {
        const qty = Number(m.qty || 1);
        const unitPrice = Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0));
        const totalPrice = Number(m.totalPrice !== undefined ? m.totalPrice : (qty * unitPrice));
        return {
          ...m,
          id: m.id || `auto-${bIdx}-${mIdx}`,
          material: m.material || 'Raw Stock Material',
          spec: m.spec || '',
          profile: m.profile || (m.dia ? 'Round Bar' : 'Plate / Sheet'),
          qty,
          unit: m.unit || 'pcs',
          unitPrice,
          totalPrice
        };
      });

      const manualMats = (b.manualMats || []).map((m: any, mIdx: number) => {
        const qty = Number(m.qty || 1);
        const unitPrice = Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0));
        const totalPrice = Number(m.totalPrice !== undefined ? m.totalPrice : (qty * unitPrice));
        return {
          ...m,
          id: m.id || `manual-${bIdx}-${mIdx}`,
          material: m.material || 'Bought-out Component',
          spec: m.spec || 'Standard Hardware',
          profile: m.profile || 'Bought-out',
          qty,
          unit: m.unit || 'pcs',
          unitPrice,
          totalPrice
        };
      });

      const machiningOps = (b.machiningOps || []).map((op: any, oIdx: number) => {
        const quoHr = Number(op.quoHr || op.plannedHours || 0);
        const estHr = Number(op.estHr !== undefined ? op.estHr : quoHr);
        const setTime = Number(op.setTime || 0);
        const hrRate = Number(op.hrRate || op.hourlyLaborRate || 750);
        const machineRate = Number(op.machineRate || op.hourlyMachineRate || 1200);
        const setTimeRate = Number(op.setTimeRate || hrRate);
        const effectiveHours = estHr > 0 ? estHr : quoHr;
        const opCost = Number(op.cost !== undefined ? op.cost : ((effectiveHours * (hrRate + machineRate)) + (setTime * setTimeRate)));

        return {
          ...op,
          id: op.id || `proc-${bIdx}-${oIdx}`,
          procName: op.procName || op.operationName || `Operation ${oIdx + 1}`,
          quoHr,
          estHr,
          setTime,
          hrRate,
          machineRate,
          setTimeRate,
          cost: Math.round(opCost)
        };
      });

      const matTotal = autoMats.reduce((s: number, m: any) => s + m.totalPrice, 0) +
                       manualMats.reduce((s: number, m: any) => s + m.totalPrice, 0);
      const machTotal = machiningOps.reduce((s: number, op: any) => s + op.cost, 0);
      const totalQuotedHours = machiningOps.reduce((s: number, op: any) => s + op.quoHr, 0);

      grandMaterialCost += matTotal;
      grandMachiningLaborCost += machTotal;
      grandQuotedHours += totalQuotedHours;

      return {
        ...b,
        bIdx,
        partId: b.partId || b.id || (bIdx + 1),
        title: b.title || `Part ${bIdx + 1}`,
        description: b.description || '',
        drawingNo: b.drawingNo || '',
        partNo: b.partNo || '',
        autoMats,
        manualMats,
        allMaterials: [...autoMats, ...manualMats],
        machiningOps,
        matTotal,
        machTotal,
        bomTotal: matTotal + machTotal,
        totalQuotedHours
      };
    });

    const numOverheadPct = Number(overheadPct !== undefined ? overheadPct : (wo.overheadPct || 15));
    const overheadCost = Math.round((grandMaterialCost + grandMachiningLaborCost) * (numOverheadPct / 100));
    const totalEstimatedCost = Math.round(grandMaterialCost + grandMachiningLaborCost + overheadCost);

    // Save to database
    await db.query(
      'UPDATE work_orders SET bom = ?, estimatedCost = ?, overheadPct = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(processedBoms), totalEstimatedCost, numOverheadPct, id]
    );

    // Sync operations to floor table if requested
    if (syncRouting) {
      const allOps: any[] = [];
      processedBoms.forEach((b: any) => {
        (b.machiningOps || []).forEach((op: any) => {
          allOps.push({
            partTitle: b.title,
            ...op
          });
        });
      });

      if (allOps.length > 0) {
        const [existingOps]: any = await db.query(
          'SELECT * FROM work_order_operations WHERE workOrderId = ? ORDER BY stepNumber ASC',
          [id]
        );

        let stepNum = 1;
        for (const op of allOps) {
          const matched = existingOps.find((ex: any) => 
            (op.id && ex.id === op.id) ||
            ex.operationName.toLowerCase() === op.procName.toLowerCase() ||
            ex.operationName.toLowerCase().includes(op.procName.toLowerCase()) ||
            op.procName.toLowerCase().includes(ex.operationName.toLowerCase())
          );

          if (matched) {
            await db.query(
              `UPDATE work_order_operations 
               SET plannedHours = ?, hourlyLaborRate = ?, hourlyMachineRate = ?, notes = ? 
               WHERE id = ?`,
              [
                op.estHr || op.quoHr || 1,
                op.hrRate || 750,
                op.machineRate || 1200,
                `Adjusted from BOM: ${op.partTitle || ''}`,
                matched.id
              ]
            );
          } else {
            const newOpId = `op-${Date.now()}-${stepNum}`;
            const opName = processedBoms.length > 1 ? `${op.partTitle}: ${op.procName}` : op.procName;
            await db.query(
              `INSERT INTO work_order_operations 
               (id, workOrderId, stepNumber, operationName, plannedHours, actualHours, status, hourlyLaborRate, hourlyMachineRate, notes)
               VALUES (?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?)`,
              [
                newOpId,
                id,
                existingOps.length + stepNum,
                opName,
                op.estHr || op.quoHr || 1,
                op.hrRate || 750,
                op.machineRate || 1200,
                `Added from Adjusted BOM: ${op.partTitle || ''}`
              ]
            );
            stepNum++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Work Order Full BOM and Internal Job Costing updated successfully',
      boms: processedBoms,
      estimatedCost: totalEstimatedCost,
      costSummary: {
        materialCost: grandMaterialCost,
        machiningLaborCost: grandMachiningLaborCost,
        overheadPct: numOverheadPct,
        overheadCost,
        estimatedCost: totalEstimatedCost
      }
    });
  } catch (error: any) {
    console.error('Error adjusting full BOM:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create MR for Shortage Item
app.post('/api/production/work-orders/:id/create-mr-shortage', async (req, res) => {
  try {
    const { id } = req.params;
    const { bomIndex, requestedBy, department, priority, notes } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    let bomItems: any[] = [];
    try {
      bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || []);
    } catch (e) { bomItems = []; }

    const reqIdx = Number(bomIndex);
    const item = bomItems[reqIdx];
    if (!item) return res.status(400).json({ error: 'BOM item not found.' });

    const shortageQty = item.substituteRequest ? item.substituteRequest.shortageQty : Number(item.qty || 1);
    const mrId = 'MR-' + Date.now().toString().slice(-6);
    const mrNo = `MR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const mrItems = [
      {
        id: 'MRI-1',
        materialName: item.material,
        description: `Procurement for Work Order ${wo.orderNo || id} (${wo.title || ''})`,
        qty: shortageQty,
        uom: item.unit || 'pcs',
        estimatedUnitCost: Number(item.unitCost || 0),
        estimatedTotal: shortageQty * Number(item.unitCost || 0),
        requiredDate: wo.plannedStartDate || new Date().toISOString().slice(0, 10)
      }
    ];

    const mrData = {
      id: mrId,
      mrNo,
      department: department || 'Production',
      priority: priority || 'High',
      status: 'Pending',
      workOrderNo: wo.orderNo || id,
      workOrderNos: JSON.stringify([wo.orderNo || id]),
      items: JSON.stringify(mrItems),
      requestedBy: requestedBy || 'Department Head',
      notes: notes || `Auto-generated Purchase MR due to material shortage for Work Order ${wo.orderNo || id}`,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    await db.query('INSERT INTO material_requests SET ?', mrData);

    // Update substituteRequest if present
    if (!item.substituteRequest) {
      item.substituteRequest = {
        id: 'SUB-' + Date.now().toString().slice(-6),
        requestedAt: new Date().toISOString(),
        requestedBy: requestedBy || 'Department Head',
        missingMaterial: item.material,
        shortageQty,
        status: 'mr_created'
      };
    } else {
      item.substituteRequest.status = 'mr_created';
    }
    item.substituteRequest.mrId = mrId;
    item.substituteRequest.mrNo = mrNo;
    item.substituteRequest.actionNotes = `Material Request ${mrNo} raised for procurement.`;

    const materialStatus = 'Purchase MR Raised';
    const alertText = `Purchase MR ${mrNo} raised for ${item.material} (Qty: ${shortageQty})`;

    await db.query(
      'UPDATE work_orders SET bom = ?, materialStatus = ?, materialAlert = ?, updatedAt = NOW() WHERE id = ?',
      [JSON.stringify(bomItems), materialStatus, alertText, id]
    );

    // Update Quotation if linked
    if (wo.quoteId) {
      await db.query(
        'UPDATE quotations SET materialStatus = ?, materialAlert = ? WHERE id = ? OR quotationNo = ?',
        [materialStatus, alertText, wo.quoteId, wo.quoteId]
      ).catch(() => {});
    }

    // Update Sales Order if linked
    if (wo.orderNo) {
      await db.query(
        'UPDATE finished_goods_orders SET materialStatus = ?, materialAlert = ? WHERE orderNo = ? OR id = ?',
        [materialStatus, alertText, wo.orderNo, wo.orderNo]
      ).catch(() => {});
    }

    // Log to approval_logs
    try {
      await db.query(
        `INSERT INTO approval_logs (module, recordId, recordNo, entityName, amount, action, actionBy, actionDate, notes, metadata, createdAt)
         VALUES (?, ?, ?, ?, ?, 'Approved', ?, NOW(), ?, ?, NOW())`,
        [
          'Material Request (MR)',
          mrId,
          mrNo,
          wo.customer || 'Production',
          mrItems[0].estimatedTotal,
          requestedBy || 'Department Head',
          `Created Material Request ${mrNo} for ${item.material} against Work Order ${wo.orderNo || id}`,
          JSON.stringify({ workOrderId: id, mrId, mrNo })
        ]
      );
    } catch (e) {}

    // Alert Sales & Procurement team
    try {
      const folId = 'FOL-' + Date.now().toString().slice(-6);
      await db.query('INSERT INTO followups SET ?', {
        id: folId,
        title: `Procurement Alert: ${mrNo} raised for Work Order ${wo.orderNo || id}`,
        type: 'Procurement Alert',
        priority: 'high',
        status: 'Pending',
        leadId: wo.quoteId || null,
        notes: `Purchase Material Request ${mrNo} was generated for "${item.material}" (Qty: ${shortageQty}) for Work Order ${wo.orderNo || id}. Sales team please note delivery lead time may be affected.`,
        dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' '),
        assignedTo: 'Procurement / Sales',
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    } catch (e) {}

    res.json({ success: true, mrId, mrNo, bom: bomItems });
  } catch (error: any) {
    console.error('Error creating MR for shortage:', error);
    res.status(500).json({ error: error.message });
  }
});


app.put('/api/production/work-orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let extraSet = '';
    const params: any[] = [status];

    if (status === 'In Progress') {
      extraSet = ', actualStartDate = IFNULL(actualStartDate, NOW())';
    } else if (status === 'Completed') {
      extraSet = ', completedDate = NOW()';
    }
    params.push(id);

    await db.query(`UPDATE work_orders SET status = ?, updatedAt = NOW() ${extraSet} WHERE id = ?`, params);
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Work Order
app.delete('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM qc_inspections WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM rework_logs WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM work_order_operations WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM work_orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Work Order Attachments
app.patch('/api/production/work-orders/:id/attachments', async (req, res) => {
  try {
    const { attachments } = req.body;
    await db.query('UPDATE work_orders SET attachments = ?, updatedAt = NOW() WHERE id = ?', [JSON.stringify(attachments), req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DIRECT MATERIAL ISSUE TO WORK ORDER
app.post('/api/production/work-orders/:id/issue-material', async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryId, materialName, qty, unit, unitCost, notes, user } = req.body;

    const issueQty = Math.max(0.01, Number(qty || 1));
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    let invItem: any = null;
    let effectiveCost = Number(unitCost || 0);

    if (inventoryId) {
      const [invRows]: any = await db.query('SELECT * FROM inventory WHERE id = ?', [inventoryId]);
      if (invRows && invRows.length > 0) {
        invItem = invRows[0];
        if (!effectiveCost) effectiveCost = Number(invItem.unitCost || 0);
        // Decrement stock
        await db.query('UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', [issueQty, inventoryId]);
      }
    }

    const totalCost = Number((issueQty * effectiveCost).toFixed(2));
    const ledgerId = 'LGR-' + Date.now().toString().slice(-6);

    await db.query(
      `INSERT INTO stock_ledger (id, inventoryId, date, type, qty, unitCost, totalCost, balance, reference, notes, user) 
       VALUES (?, ?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?)`,
      [
        ledgerId,
        inventoryId || null,
        now,
        issueQty,
        effectiveCost,
        totalCost,
        invItem ? Math.max(0, invItem.quantity - issueQty) : 0,
        id,
        notes || `Direct Material Issue for Job #${id}: ${materialName || invItem?.name || 'Raw Material'} (${issueQty} ${unit || invItem?.uom || 'pcs'})`,
        user || 'Workshop Storekeeper'
      ]
    );

    res.json({
      success: true,
      ledgerId,
      materialName: materialName || invItem?.name,
      issuedQty: issueQty,
      unitCost: effectiveCost,
      totalCost,
      message: `Successfully issued ${issueQty} ${unit || 'units'} of ${materialName || invItem?.name} for Job #${id}.`
    });
  } catch (error: any) {
    console.error('Error issuing material to work order:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET ISSUED MATERIALS FOR WORK ORDER
app.get('/api/production/work-orders/:id/materials', async (req, res) => {
  try {
    const { id } = req.params;
    const [materials]: any = await db.query(
      `SELECT sl.*, i.name as itemName, i.sku as itemSku, i.uom as itemUom, i.unitCost as defaultUnitCost 
       FROM stock_ledger sl 
       LEFT JOIN inventory i ON sl.inventoryId = i.id 
       WHERE sl.type = 'OUT' AND (sl.reference = ? OR sl.reference LIKE ?) 
       ORDER BY sl.date DESC`,
      [id, `%${id}%`]
    );
    res.json(materials || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADD OPERATION STEP TO WORK ORDER
app.post('/api/production/work-orders/:id/operations', async (req, res) => {
  try {
    const { id } = req.params;
    const { operationName, machineId, employeeId, plannedHours, hourlyLaborRate, hourlyMachineRate, notes } = req.body;

    const [existingOps]: any = await db.query('SELECT MAX(stepNumber) as maxStep FROM work_order_operations WHERE workOrderId = ?', [id]);
    const nextStep = (existingOps[0]?.maxStep || 0) + 1;
    const opId = 'OP-' + Date.now().toString().slice(-4) + '-' + nextStep;

    await db.query(
      `INSERT INTO work_order_operations 
       (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours, actualHours, status, hourlyLaborRate, hourlyMachineRate, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?)`,
      [
        opId, id, nextStep, operationName, machineId || null, employeeId || null,
        Number(plannedHours || 1), Number(hourlyLaborRate || 750), Number(hourlyMachineRate || 1200), notes || null
      ]
    );

    res.json({ success: true, id: opId, stepNumber: nextStep });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE OPERATION DETAILS
app.put('/api/production/operations/:id', async (req, res) => {
  try {
    const { operationName, machineId, employeeId, plannedHours, actualHours, hourlyLaborRate, hourlyMachineRate, notes } = req.body;
    const fields: string[] = [];
    const params: any[] = [];

    if (operationName !== undefined) { fields.push('operationName=?'); params.push(operationName); }
    if (machineId !== undefined) { fields.push('machineId=?'); params.push(machineId || null); }
    if (employeeId !== undefined) { fields.push('employeeId=?'); params.push(employeeId || null); }
    if (plannedHours !== undefined) { fields.push('plannedHours=?'); params.push(Number(plannedHours)); }
    if (actualHours !== undefined) { fields.push('actualHours=?'); params.push(Number(actualHours)); }
    if (hourlyLaborRate !== undefined) { fields.push('hourlyLaborRate=?'); params.push(Number(hourlyLaborRate)); }
    if (hourlyMachineRate !== undefined) { fields.push('hourlyMachineRate=?'); params.push(Number(hourlyMachineRate)); }
    if (notes !== undefined) { fields.push('notes=?'); params.push(notes || null); }

    if (fields.length > 0) {
      params.push(req.params.id);
      await db.query(`UPDATE work_order_operations SET ${fields.join(', ')} WHERE id=?`, params);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE OPERATION
app.delete('/api/production/operations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM work_order_operations WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ASSIGN OPERATION
app.put('/api/production/operations/:id/assign', async (req, res) => {
  try {
    const { employeeId, machineId, scheduledStart, scheduledEnd, isLocked } = req.body;
    
    const toMysqlDt = (iso: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };

    let query = 'UPDATE work_order_operations SET employeeId=?, machineId=?';
    let params: any[] = [employeeId || null, machineId || null];
    
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// BATCH ASSIGN MULTIPLE OPERATIONS TO MACHINE / OPERATOR / DATE
app.post('/api/production/operations/batch-assign', async (req, res) => {
  try {
    const { operationIds, employeeId, machineId, scheduledDate, scheduledStart, scheduledEnd } = req.body;
    if (!Array.isArray(operationIds) || operationIds.length === 0) {
      return res.status(400).json({ error: 'operationIds array is required' });
    }

    const toMysqlDt = (iso: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };

    let startDt = scheduledStart ? toMysqlDt(scheduledStart) : (scheduledDate ? `${scheduledDate} 08:00:00` : null);
    let endDt = scheduledEnd ? toMysqlDt(scheduledEnd) : (scheduledDate ? `${scheduledDate} 17:00:00` : null);

    const [result]: any = await db.query(
      `UPDATE work_order_operations 
       SET employeeId = ?, machineId = ?, scheduledStart = IFNULL(?, scheduledStart), scheduledEnd = IFNULL(?, scheduledEnd)
       WHERE id IN (?)`,
      [employeeId || null, machineId || null, startDt, endDt, operationIds]
    );

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// OPERATION STATUS & LIVE TIMER (START / PAUSE / COMPLETE)
app.put('/api/production/operations/:id/status', async (req, res) => {
  try {
    const { status, actualHours } = req.body;
    const opId = req.params.id;

    // Fetch current operation
    const [ops]: any = await db.query('SELECT * FROM work_order_operations WHERE id=?', [opId]);
    if (!ops.length) return res.status(404).json({ error: 'Operation not found' });
    const currentOp = ops[0];

    if (status === 'In Progress') {
      // Start or Resume operation
      await db.query(
        'UPDATE work_order_operations SET status = ?, startTime = IFNULL(startTime, NOW()) WHERE id = ?',
        [status, opId]
      );
      // Auto-update work order status to In Progress
      if (currentOp.workOrderId) {
        await db.query(
          "UPDATE work_orders SET status = 'In Progress', actualStartDate = IFNULL(actualStartDate, NOW()), updatedAt = NOW() WHERE id = ? AND status IN ('Pending', 'Draft', 'Released')",
          [currentOp.workOrderId]
        );
      }
    } else if (status === 'Paused') {
      // Pause operation: accumulate elapsed time
      if (currentOp.startTime) {
        await db.query(
          `UPDATE work_order_operations 
           SET status = 'Paused', 
               actualHours = actualHours + TIMESTAMPDIFF(SECOND, startTime, NOW()) / 3600.0, 
               startTime = NULL 
           WHERE id = ?`,
          [opId]
        );
      } else {
        await db.query("UPDATE work_order_operations SET status = 'Paused' WHERE id = ?", [opId]);
      }
    } else if (status === 'Completed' || status === 'QC Pending') {
      // Finish operation: compute final elapsed time
      if (currentOp.startTime) {
        await db.query(
          `UPDATE work_order_operations 
           SET status = ?, 
               actualHours = actualHours + TIMESTAMPDIFF(SECOND, startTime, NOW()) / 3600.0, 
               endTime = NOW(), 
               startTime = NULL 
           WHERE id = ?`,
          [status, opId]
        );
      } else {
        await db.query('UPDATE work_order_operations SET status = ?, endTime = NOW() WHERE id = ?', [status, opId]);
      }
    } else {
      await db.query('UPDATE work_order_operations SET status = ? WHERE id = ?', [status, opId]);
    }

    // Direct actual hours override if supplied
    if (actualHours !== undefined && Number(actualHours) >= 0) {
      await db.query('UPDATE work_order_operations SET actualHours = ? WHERE id = ?', [Number(actualHours), opId]);
    }

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// QUALITY CONTROL INSPECTION & AUTO-REWORK LOGGING
app.post('/api/production/operations/:id/qc', async (req, res) => {
  try {
    const opId = req.params.id;
    const { inspectedBy, status, defectReason, notes, sampleQty, defectQty, severity } = req.body;
    const qcId = 'QC-' + Date.now().toString().slice(-4);

    const [ops]: any = await db.query('SELECT * FROM work_order_operations WHERE id=?', [opId]);
    if (!ops.length) return res.status(404).json({ error: 'Operation not found' });
    const op = ops[0];
    const woId = op.workOrderId;

    await db.query(
      `INSERT INTO qc_inspections 
       (id, workOrderId, operationId, inspectedBy, status, defectReason, notes, sampleQty, defectQty, severity, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        qcId, woId, opId, inspectedBy || 'QA Inspector', status, 
        defectReason || null, notes || null, 
        Number(sampleQty || 1), Number(defectQty || 0), severity || 'Normal'
      ]
    );

    let nextOpStatus = 'Completed';
    let rwkId = null;

    if (status === 'Pass') {
      nextOpStatus = 'Completed';
      await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [nextOpStatus, opId]);
    } else if (status === 'Fail' || status === 'Conditional' || status === 'Rework Required') {
      nextOpStatus = 'Rework Required';
      await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [nextOpStatus, opId]);
      
      // Update WO status to Rework
      if (woId) {
        await db.query("UPDATE work_orders SET status = 'Rework', updatedAt = NOW() WHERE id = ?", [woId]);
      }

      // Generate Rework Ticket
      rwkId = 'RWK-' + Date.now().toString().slice(-5);
      await db.query(
        `INSERT INTO rework_logs 
         (id, workOrderId, qcId, operationId, defectCategory, reason, status, assignedEmployeeId, machineId, hours, cost, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, 0.00, 0.00, NOW())`,
        [
          rwkId, woId, qcId, opId, 
          defectReason || 'Out of tolerance', 
          notes || `QC Inspection failed on ${op.operationName}: ${defectReason}`,
          op.employeeId || null, op.machineId || null
        ]
      );
    } else if (status === 'Scrap') {
      nextOpStatus = 'Scrapped';
      await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [nextOpStatus, opId]);
      // Increment scrap count on work order
      if (woId) {
        await db.query('UPDATE work_orders SET scrapQty = scrapQty + ?, updatedAt = NOW() WHERE id = ?', [Math.max(1, Number(defectQty || 1)), woId]);
      }
    }

    res.json({ success: true, qcId, reworkId: rwkId, nextOpStatus });
  } catch (error: any) {
    console.error('Error recording QC inspection:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET REWORK LOGS (ALL OR FILTERED BY WO)
app.get('/api/production/rework-logs', async (req, res) => {
  try {
    const { workOrderId } = req.query;
    let query = `
      SELECT rl.*, wo.title as workOrderTitle, wo.orderNo as workOrderNo, 
             op.operationName, e.name as assignedEmployeeName, m.name as machineName
      FROM rework_logs rl 
      LEFT JOIN work_orders wo ON rl.workOrderId = wo.id 
      LEFT JOIN work_order_operations op ON rl.operationId = op.id 
      LEFT JOIN employees e ON rl.assignedEmployeeId = e.id 
      LEFT JOIN machineries m ON rl.machineId = m.id
    `;
    const params: any[] = [];
    if (workOrderId) {
      query += ' WHERE rl.workOrderId = ?';
      params.push(workOrderId);
    }
    query += ' ORDER BY rl.createdAt DESC';

    const [rows]: any = await db.query(query, params);
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE REWORK LOG (ACTION TAKEN, HOURS, COST, RESOLUTION)
app.put('/api/production/rework-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actionTaken, assignedEmployeeId, machineId, hours, cost, notes, resolvedBy } = req.body;

    const fields: string[] = [];
    const params: any[] = [];

    if (status !== undefined) { 
      fields.push('status = ?'); 
      params.push(status);
      if (status === 'Resolved') {
        fields.push('resolvedAt = NOW()');
        fields.push('resolvedBy = ?');
        params.push(resolvedBy || 'QA Supervisor');
      }
    }
    if (actionTaken !== undefined) { fields.push('actionTaken = ?'); params.push(actionTaken); }
    if (assignedEmployeeId !== undefined) { fields.push('assignedEmployeeId = ?'); params.push(assignedEmployeeId || null); }
    if (machineId !== undefined) { fields.push('machineId = ?'); params.push(machineId || null); }
    if (hours !== undefined) { fields.push('hours = ?'); params.push(Number(hours)); }
    if (cost !== undefined) { fields.push('cost = ?'); params.push(Number(cost)); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes || null); }

    if (fields.length > 0) {
      params.push(id);
      await db.query(`UPDATE rework_logs SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    // If resolved, check if operation can be sent back to QC or Completed
    if (status === 'Resolved') {
      const [rwkRows]: any = await db.query('SELECT operationId, workOrderId FROM rework_logs WHERE id = ?', [id]);
      if (rwkRows && rwkRows[0]) {
        const { operationId, workOrderId } = rwkRows[0];
        if (operationId) {
          await db.query("UPDATE work_order_operations SET status = 'QC Pending' WHERE id = ?", [operationId]);
        }
        if (workOrderId) {
          // Check if any other pending reworks exist for this WO
          const [pending]: any = await db.query("SELECT id FROM rework_logs WHERE workOrderId = ? AND status != 'Resolved'", [workOrderId]);
          if (!pending.length) {
            await db.query("UPDATE work_orders SET status = 'In Progress', updatedAt = NOW() WHERE id = ?", [workOrderId]);
          }
        }
      }
    }

    res.json({ success: true, message: 'Rework log updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SAVE / UPDATE QC CHECKPOINTS ON WORK ORDER
app.put('/api/production/work-orders/:id/qc-checkpoints', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkpoints } = req.body;
    const jsonStr = JSON.stringify(checkpoints || []);
    await db.query('UPDATE work_orders SET qcCheckpoints = ?, updatedAt = NOW() WHERE id = ?', [jsonStr, id]);
    res.json({ success: true, checkpoints: checkpoints || [] });
  } catch (error: any) {
    console.error('Error saving QC checkpoints:', error);
    res.status(500).json({ error: error.message });
  }
});

// LOG QC MEASUREMENT WITH AUTO-EVALUATION
app.post('/api/production/work-orders/:id/qc-measurement', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkpointId, pieceNo, measuredValue, measuredBy, remarks, autoReworkOnFail } = req.body;
    
    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    let checkpoints: any[] = [];
    try {
      checkpoints = typeof wo.qcCheckpoints === 'string' ? JSON.parse(wo.qcCheckpoints || '[]') : (wo.qcCheckpoints || []);
    } catch (e) {
      checkpoints = [];
    }

    const cpIndex = checkpoints.findIndex((c: any) => c.id === checkpointId);
    if (cpIndex === -1) return res.status(404).json({ error: 'QC Checkpoint not found' });

    const cp = checkpoints[cpIndex];
    const val = Number(measuredValue);
    let status: 'Pass' | 'Marginal' | 'Fail' = 'Pass';

    if (!isNaN(val) && cp.targetValue !== undefined && cp.targetValue !== null && cp.targetValue !== '') {
      const target = Number(cp.targetValue);
      const lowerTol = Number(cp.lowerTolerance || 0);
      const upperTol = Number(cp.upperTolerance || 0);
      
      const minVal = target + lowerTol;
      const maxVal = target + upperTol;
      const totalTol = Math.max(0.0001, maxVal - minVal);
      const marginBuffer = totalTol * 0.15; // 15% warning zone near limits

      if (val < minVal || val > maxVal) {
        status = 'Fail';
      } else if (val <= (minVal + marginBuffer) || val >= (maxVal - marginBuffer)) {
        status = 'Marginal';
      } else {
        status = 'Pass';
      }
    } else {
      status = req.body.status || 'Pass';
    }

    const newMeasurement = {
      id: 'M-' + Date.now().toString().slice(-6),
      pieceNo: pieceNo || (cp.measurements ? cp.measurements.length + 1 : 1),
      measuredValue,
      status,
      measuredBy: measuredBy || 'QA Inspector',
      measuredAt: new Date().toISOString(),
      remarks: remarks || ''
    };

    if (!cp.measurements) cp.measurements = [];
    cp.measurements.push(newMeasurement);
    cp.latestValue = measuredValue;
    cp.lastInspectedAt = newMeasurement.measuredAt;
    cp.lastInspectedBy = newMeasurement.measuredBy;

    // Check overall checkpoint status
    const hasFail = cp.measurements.some((m: any) => m.status === 'Fail');
    const hasMarginal = cp.measurements.some((m: any) => m.status === 'Marginal');
    cp.status = hasFail ? 'Fail' : (hasMarginal ? 'Marginal' : 'Pass');

    checkpoints[cpIndex] = cp;
    await db.query('UPDATE work_orders SET qcCheckpoints = ?, updatedAt = NOW() WHERE id = ?', [JSON.stringify(checkpoints), id]);

    // If failed and autoReworkOnFail, create a rework ticket and qc_inspection record
    let reworkTicketId = null;
    let ncrRecord: any = null;
    if (status === 'Fail' && autoReworkOnFail) {
      const qcId = 'QC-' + Date.now().toString().slice(-4);
      await db.query(
        `INSERT INTO qc_inspections 
         (id, workOrderId, operationId, inspectedBy, status, defectReason, notes, sampleQty, defectQty, severity, createdAt) 
         VALUES (?, ?, ?, ?, 'Fail', ?, ?, 1, 1, 'Medium', NOW())`,
        [
          qcId, id, cp.opId || null, measuredBy || 'QA Inspector',
          `Out of tolerance: ${cp.parameter} (Nominal: ${cp.targetValue}, Actual: ${measuredValue})`,
          remarks || `Failed checkpoint ${cp.checkpointNo || cp.parameter}`
        ]
      );

      reworkTicketId = 'RWK-' + Date.now().toString().slice(-5);
      await db.query(
        `INSERT INTO rework_logs 
         (id, workOrderId, qcId, operationId, defectCategory, reason, status, assignedEmployeeId, machineId, hours, cost, createdAt) 
         VALUES (?, ?, ?, ?, 'Dimensional Defect', ?, 'Pending', ?, ?, 0.00, 0.00, NOW())`,
        [
          reworkTicketId, id, qcId, cp.opId || null,
          `QC Checkpoint Fail: ${cp.parameter} measured ${measuredValue} (Target: ${cp.targetValue})`,
          null, null
        ]
      );

      // ISO 9001: Auto-generate formal NCR record
      try {
        await db.query("UPDATE document_sequences SET next_number = next_number + 1, updated_at = NOW() WHERE id = 'ncr'");
        const [seqRow]: any = await db.query("SELECT next_number, padding, prefix FROM document_sequences WHERE id = 'ncr'");
        const nextNcrNum = Math.max(1, (seqRow[0]?.next_number || 1) - 1);
        const ncrNo = `${seqRow[0]?.prefix || 'NCR-2026-'}${String(nextNcrNum).padStart(seqRow[0]?.padding || 4, '0')}`;
        const ncrId = 'NCR-' + Date.now().toString().slice(-6);

        await db.query(`
          INSERT INTO ncr_records
          (id, ncrNo, workOrderId, workOrderNo, qcId, operationId, operationName, date, detectedBy, itemDescription, lotQty, defectQty, defectCategory, defectDescription, severity, disposition, quarantineLocation, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', NOW())
        `, [
          ncrId, ncrNo, id, wo.orderNo || id, qcId, cp.opId || null, cp.operationName || 'Machining Operation',
          measuredBy || 'QA Inspector', `${cp.partTitle || 'Job Component'} - ${cp.parameter}`,
          1, 1, cp.category ? `${cp.category} Defect` : 'Dimensional Out of Tolerance',
          `Out of tolerance: Measured ${measuredValue} ${cp.unit || 'mm'} (Target: ${cp.targetValue}, Tolerance: ${cp.lowerTolerance} to ${cp.upperTolerance}). Notes: ${remarks || 'None'}`,
          'Major', 'Rework', 'QA Quarantine Cage / Rework Staging'
        ]);

        ncrRecord = { id: ncrId, ncrNo };
      } catch (ncrErr) {
        console.error('Error auto-generating NCR record:', ncrErr);
      }

      if (cp.opId) {
        await db.query("UPDATE work_order_operations SET status = 'Rework Required' WHERE id = ?", [cp.opId]);
      }
      await db.query("UPDATE work_orders SET status = 'Rework', updatedAt = NOW() WHERE id = ?", [id]);
    }

    res.json({
      success: true,
      measurement: newMeasurement,
      checkpoint: cp,
      checkpoints,
      reworkTicketId,
      ncrRecord
    });
  } catch (error: any) {
    console.error('Error logging QC measurement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ISO 9001:2015 QUALITY MANAGEMENT ENDPOINTS
// ==========================================

// 1. Calibration Instruments (ISO 7.1.5)
app.get('/api/calibration-instruments', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM calibration_instruments ORDER BY nextDueDate ASC');
    const now = new Date();
    const enriched = rows.map((r: any) => {
      const dueDate = r.nextDueDate ? new Date(r.nextDueDate) : null;
      const isExpired = dueDate ? dueDate < now : false;
      const daysUntilDue = dueDate ? Math.round((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;
      return {
        ...r,
        isExpired,
        daysUntilDue,
        computedStatus: isExpired ? 'Expired' : r.status
      };
    });
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calibration-instruments', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.id) data.id = 'CAL-' + Date.now().toString().slice(-6);
    await db.query('INSERT INTO calibration_instruments SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/calibration-instruments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE calibration_instruments SET ?, updatedAt = NOW() WHERE id = ?', [req.body, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Non-Conformance Reports (NCR) & CAPA (ISO 8.7 & 10.2)
app.get('/api/ncr-records', async (req, res) => {
  try {
    const { workOrderId, status } = req.query;
    let sql = 'SELECT * FROM ncr_records WHERE 1=1';
    const params: any[] = [];
    if (workOrderId) {
      sql += ' AND workOrderId = ?';
      params.push(workOrderId);
    }
    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY createdAt DESC';
    const [rows]: any = await db.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ncr-records', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.id) data.id = 'NCR-' + Date.now().toString().slice(-6);
    if (!data.ncrNo) {
      await db.query("UPDATE document_sequences SET next_number = next_number + 1, updated_at = NOW() WHERE id = 'ncr'");
      const [seqRow]: any = await db.query("SELECT next_number, padding, prefix FROM document_sequences WHERE id = 'ncr'");
      const nextNum = Math.max(1, (seqRow[0]?.next_number || 1) - 1);
      data.ncrNo = `${seqRow[0]?.prefix || 'NCR-2026-'}${String(nextNum).padStart(seqRow[0]?.padding || 4, '0')}`;
    }
    if (!data.date) data.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO ncr_records SET ?', data);
    res.json({ success: true, id: data.id, ncrNo: data.ncrNo });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/ncr-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.status === 'Closed' && !data.closedAt) {
      data.closedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    await db.query('UPDATE ncr_records SET ?, updatedAt = NOW() WHERE id = ?', [data, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Machine Maintenance Logs (ISO 7.1.3 - TPM)
app.get('/api/machine-maintenance-logs', async (req, res) => {
  try {
    const { machineId } = req.query;
    let sql = 'SELECT * FROM machine_maintenance_logs';
    const params: any[] = [];
    if (machineId) {
      sql += ' WHERE machineId = ?';
      params.push(machineId);
    }
    sql += ' ORDER BY scheduledDate DESC, createdAt DESC';
    const [rows]: any = await db.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/machine-maintenance-logs', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.id) data.id = 'MNT-' + Date.now().toString().slice(-6);
    await db.query('INSERT INTO machine_maintenance_logs SET ?', data);
    if (data.performedDate && data.machineId) {
      await db.query('UPDATE machineries SET lastMaintenance = ? WHERE id = ?', [data.performedDate, data.machineId]);
    }
    res.json({ success: true, id: data.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/machine-maintenance-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE machine_maintenance_logs SET ?, updatedAt = NOW() WHERE id = ?', [req.body, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Engineering Change Orders (ECO) (ISO 7.5.3)
app.get('/api/engineering-change-orders', async (req, res) => {
  try {
    const { workOrderId } = req.query;
    let sql = 'SELECT * FROM engineering_change_orders';
    const params: any[] = [];
    if (workOrderId) {
      sql += ' WHERE workOrderId = ?';
      params.push(workOrderId);
    }
    sql += ' ORDER BY createdAt DESC';
    const [rows]: any = await db.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/engineering-change-orders', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.id) data.id = 'ECO-' + Date.now().toString().slice(-6);
    if (!data.ecoNo) data.ecoNo = 'ECO-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4);
    if (!data.effectiveDate) data.effectiveDate = new Date().toISOString().slice(0, 10);
    await db.query('INSERT INTO engineering_change_orders SET ?', data);
    res.json({ success: true, id: data.id, ecoNo: data.ecoNo });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PARTIAL DISPATCH / DELIVERY HANDOVER FOR WORK ORDER
app.post('/api/production/work-orders/:id/partial-dispatch', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      dispatchQty, 
      carrier, 
      vehicleNo, 
      driverName, 
      destination, 
      receivedBy, 
      notes, 
      items, 
      issuedBy 
    } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    const totalJobQty = Math.max(1, Number(wo.jobQty || 1));
    const prevDispatched = Number(wo.dispatchedQty || 0);
    const qtyToDispatch = Math.max(1, Number(dispatchQty || (totalJobQty - prevDispatched)));
    const newCumulative = prevDispatched + qtyToDispatch;
    const remaining = Math.max(0, totalJobQty - newCumulative);
    const isFinal = remaining === 0;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Generate Gate Pass ID (GP-XXXX) and Delivery Note ID (DN-XXXX)
    const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM gate_passes');
    const nextNum = (countResult[0]?.c || 0) + 1;
    const gpId = 'GP-' + nextNum.toString().padStart(4, '0');
    const dnId = 'DN-' + nextNum.toString().padStart(4, '0');

    // Items list for gate pass & delivery note
    const dispatchItemsList = (items && items.length > 0)
      ? items
      : [{
          description: wo.title || `Work Order ${wo.orderNo || wo.id} Finished Units`,
          qty: qtyToDispatch,
          unit: 'Nos',
          remarks: `Partial Dispatch (${newCumulative}/${totalJobQty} pcs)`
        }];

    // 2. Insert into gate_passes table
    const gatePassData: any = {
      id: gpId,
      type: 'goods_delivery',
      orderId: wo.id,
      orderNo: wo.orderNo || wo.id,
      quoteId: wo.quoteId || null,
      customerId: wo.customerId || null,
      customerName: wo.customer || 'Customer',
      customerCompany: wo.customer || 'Customer',
      attention: receivedBy || wo.customer,
      address: destination || null,
      carrier: carrier || 'REX Transport',
      vehicleNo: vehicleNo || null,
      driverName: driverName || null,
      reason: `Finished Goods Delivery for WO ${wo.orderNo || wo.id} (${qtyToDispatch} pcs)`,
      items: JSON.stringify(dispatchItemsList),
      issuedBy: issuedBy || 'Store Keeper',
      issuedDate: now,
      status: 'Dispatched',
      notes: notes || '',
      createdAt: now
    };

    let validGpCols = new Set<string>();
    try {
      const [gpCols]: any = await db.query('SHOW COLUMNS FROM gate_passes');
      validGpCols = new Set(gpCols.map((c: any) => c.Field));
    } catch (e) {}

    const safeGatePassData: any = {};
    for (const [k, v] of Object.entries(gatePassData)) {
      if (validGpCols.size === 0 || validGpCols.has(k)) {
        safeGatePassData[k] = v;
      }
    }
    await db.query('INSERT INTO gate_passes SET ?', safeGatePassData);

    // 3. Append to work order dispatches array
    let existingDispatches: any[] = [];
    try {
      existingDispatches = typeof wo.dispatches === 'string' ? JSON.parse(wo.dispatches || '[]') : (wo.dispatches || []);
    } catch (e) {
      existingDispatches = [];
    }

    const newDispatchRecord = {
      id: dnId,
      dispatchNo: dnId,
      gatePassId: gpId,
      date: now,
      dispatchedQty: qtyToDispatch,
      cumulativeQty: newCumulative,
      remainingQty: remaining,
      totalJobQty,
      isFinalDispatch: isFinal,
      carrier: carrier || 'REX Transport',
      vehicleNo: vehicleNo || '',
      driverName: driverName || '',
      receivedBy: receivedBy || '',
      destination: destination || '',
      notes: notes || '',
      items: dispatchItemsList,
      dispatchedBy: issuedBy || 'Store Keeper'
    };

    existingDispatches.push(newDispatchRecord);

    const nextWoStatus = isFinal ? 'Completed' : 'Partially Dispatched';
    await db.query(
      `UPDATE work_orders 
       SET dispatchedQty = ?, dispatches = ?, status = ?, completedQty = GREATEST(completedQty, ?), updatedAt = NOW() 
       WHERE id = ?`,
      [newCumulative, JSON.stringify(existingDispatches), nextWoStatus, newCumulative, id]
    );

    // 4. Sync with linked finished_goods_orders if exists
    if (wo.orderNo) {
      const [fgoRows]: any = await db.query('SELECT * FROM finished_goods_orders WHERE orderNo = ? OR id = ?', [wo.orderNo, wo.orderNo]);
      if (fgoRows.length > 0) {
        const fgo = fgoRows[0];
        let fgoDispatches: any[] = [];
        try {
          fgoDispatches = typeof fgo.dispatches === 'string' ? JSON.parse(fgo.dispatches || '[]') : (fgo.dispatches || []);
        } catch (e) {
          fgoDispatches = [];
        }
        fgoDispatches.push(newDispatchRecord);
        const fgoStatus = isFinal ? 'Dispatched' : 'Partially Dispatched';
        await db.query(
          `UPDATE finished_goods_orders 
           SET dispatchedQty = ?, dispatches = ?, status = ?, isDispatched = ?, gatePassId = ?, gatePassNo = ?, updatedAt = NOW() 
           WHERE id = ?`,
          [newCumulative, JSON.stringify(fgoDispatches), fgoStatus, isFinal ? 1 : 0, gpId, gpId, fgo.id]
        );
      }
    }

    res.json({
      success: true,
      dispatch: newDispatchRecord,
      gatePass: safeGatePassData,
      status: nextWoStatus,
      dispatchedQty: newCumulative,
      remainingQty: remaining
    });
  } catch (error: any) {
    console.error('Error recording partial dispatch:', error);
    res.status(500).json({ error: error.message });
  }
});

// COMPLETE WORK ORDER & FINANCIAL SIGN-OFF
app.post('/api/production/work-orders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedQty, scrapQty, notes, finalHandoverLocation } = req.body;

    const [wos]: any = await db.query('SELECT * FROM work_orders WHERE id = ?', [id]);
    if (!wos.length) return res.status(404).json({ error: 'Work order not found' });
    const wo = wos[0];

    // Mark all operations as Completed if not already
    await db.query("UPDATE work_order_operations SET status = 'Completed', endTime = IFNULL(endTime, NOW()) WHERE workOrderId = ? AND status != 'Completed'", [id]);

    // Final financial rollup calculation
    const [ledger]: any = await db.query("SELECT SUM(totalCost) as matCost FROM stock_ledger WHERE type='OUT' AND reference = ?", [id]);
    const matCost = Number(ledger[0]?.matCost || 0);

    const [ops]: any = await db.query(
      `SELECT SUM(actualHours * hourlyLaborRate) as labCost, 
              SUM(actualHours * hourlyMachineRate) as machCost 
       FROM work_order_operations WHERE workOrderId = ?`,
      [id]
    );
    const labCost = Number(ops[0]?.labCost || 0);
    const machCost = Number(ops[0]?.machCost || 0);

    const [rwk]: any = await db.query("SELECT SUM(cost + (hours * 800)) as rwkCost FROM rework_logs WHERE workOrderId = ?", [id]);
    const rwkCost = Number(rwk[0]?.rwkCost || 0);

    const overheadPct = Number(wo.overheadPct || 15);
    const overheadCost = (labCost + machCost) * (overheadPct / 100);
    const finalTotal = matCost + labCost + machCost + rwkCost + overheadCost;

    const goodQty = completedQty !== undefined ? Number(completedQty) : Number(wo.jobQty || 1);
    const badQty = scrapQty !== undefined ? Number(scrapQty) : Number(wo.scrapQty || 0);

    await db.query(
      `UPDATE work_orders 
       SET status = 'Completed', 
           completedDate = NOW(), 
           completedQty = ?, 
           scrapQty = ?, 
           actualMaterialCost = ?, 
           actualLaborCost = ?, 
           actualMachineCost = ?, 
           actualReworkCost = ?, 
           actualTotalCost = ?, 
           notes = CONCAT(IFNULL(notes, ''), ?), 
           updatedAt = NOW() 
       WHERE id = ?`,
      [
        goodQty, badQty, matCost, labCost, machCost, rwkCost, finalTotal,
        notes ? ` | Completion: ${notes}` : '', id
      ]
    );

    res.json({
      success: true,
      message: `Work Order #${id} completed and signed off. Final costing rollup calculated.`,
      summary: {
        completedQty: goodQty,
        scrapQty: badQty,
        actualMaterialCost: matCost,
        actualLaborCost: labCost,
        actualMachineCost: machCost,
        actualReworkCost: rwkCost,
        overheadCost,
        actualTotalCost: finalTotal
      }
    });
  } catch (error: any) {
    console.error('Error completing work order:', error);
    res.status(500).json({ error: error.message });
  }
});



// GLOBAL SEARCH API
// ==========================
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 1) {
      return res.json({ customers: [], contacts: [], invoices: [], quotations: [], workOrders: [], inventory: [], suppliers: [] });
    }
    const like = `%${q}%`;
    const queryLower = q.toLowerCase();

    let customers: any[] = [];
    let contacts: any[] = [];
    try {
      const [c] = await db.query(
        `SELECT id, name, company, email, phone, financeContactName, financeContactEmail, financeContactPhone, contacts 
         FROM customers 
         WHERE name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ? OR id LIKE ? OR financeContactName LIKE ? OR contacts LIKE ? LIMIT 10`,
        [like, like, like, like, like, like, like]
      ) as any[];
      
      const rawCustomers = c || [];
      // Populate customers (deduplicated)
      customers = rawCustomers.slice(0, 6).map((cust: any) => ({
        id: cust.id,
        name: cust.name,
        company: cust.company,
        email: cust.email,
        phone: cust.phone
      }));

      // Extract matching contacts (Primary, Finance, or Additional Contacts)
      for (const cust of rawCustomers) {
        // 1. Primary contact if matches
        if ((cust.name && cust.name.toLowerCase().includes(queryLower)) ||
            (cust.phone && cust.phone.toLowerCase().includes(queryLower)) ||
            (cust.email && cust.email.toLowerCase().includes(queryLower))) {
          contacts.push({
            id: `${cust.id}-primary`,
            customerId: cust.id,
            name: cust.name,
            role: 'Primary Contact',
            company: cust.company || 'Customer',
            email: cust.email,
            phone: cust.phone
          });
        }

        // 2. Finance contact if matches
        if (cust.financeContactName && (
          cust.financeContactName.toLowerCase().includes(queryLower) ||
          (cust.financeContactEmail && cust.financeContactEmail.toLowerCase().includes(queryLower)) ||
          (cust.financeContactPhone && cust.financeContactPhone.toLowerCase().includes(queryLower))
        )) {
          contacts.push({
            id: `${cust.id}-finance`,
            customerId: cust.id,
            name: cust.financeContactName,
            role: 'Finance Contact',
            company: cust.company || 'Customer',
            email: cust.financeContactEmail || cust.email,
            phone: cust.financeContactPhone || cust.phone
          });
        }

        // 3. Additional contacts JSON
        let extraList: any[] = [];
        if (Array.isArray(cust.contacts)) extraList = cust.contacts;
        else if (typeof cust.contacts === 'string') {
          try { extraList = JSON.parse(cust.contacts) } catch(e) {}
        }
        if (Array.isArray(extraList)) {
          for (const ac of extraList) {
            if (ac && typeof ac === 'object' && [ac.name, ac.designation, ac.phone, ac.email].some(v => v && typeof v === 'string' && v.toLowerCase().includes(queryLower))) {
              contacts.push({
                id: `${cust.id}-extra-${ac.id || Math.random().toString(36).slice(2, 6)}`,
                customerId: cust.id,
                name: ac.name || 'Additional Contact',
                role: ac.designation || 'Contact Person',
                company: cust.company || 'Customer',
                email: ac.email || cust.email,
                phone: ac.phone || cust.phone
              });
            }
          }
        }
      }
      contacts = contacts.slice(0, 6);
    } catch (e) {}

    let invoices: any[] = [];
    try {
      const [inv] = await db.query(
        `SELECT id, invoiceNo, quotationId, quotationNo, total, status, dueDate, customerId, leadId FROM invoices 
         WHERE id LIKE ? OR invoiceNo LIKE ? OR quotationId LIKE ? OR quotationNo LIKE ? OR poNo LIKE ? OR orderNo LIKE ? LIMIT 6`,
        [like, like, like, like, like, like]
      ) as any[];
      invoices = inv || [];
    } catch (e) {}

    let quotations: any[] = [];
    try {
      const [qRows] = await db.query(
        `SELECT id, status, type, quotationNo, totalAmount, data, leadId FROM quotations 
         WHERE id LIKE ? OR quotationNo LIKE ? OR data LIKE ? LIMIT 6`,
        [like, like, like]
      ) as any[];
      quotations = qRows || [];
    } catch (e) {}

    let workOrders: any[] = [];
    try {
      const [wos] = await db.query(
        `SELECT id, orderNo, title, status, customer FROM work_orders 
         WHERE id LIKE ? OR orderNo LIKE ? OR title LIKE ? OR customer LIKE ? LIMIT 6`,
        [like, like, like, like]
      ) as any[];
      workOrders = wos || [];
    } catch(e) {}

    let inventory: any[] = [];
    try {
      const [inv] = await db.query(
        `SELECT id, sku, name, category, type, quantity, unitCost, unitPrice FROM inventory 
         WHERE sku LIKE ? OR name LIKE ? OR category LIKE ? OR id LIKE ? LIMIT 6`,
        [like, like, like, like]
      ) as any[];
      inventory = inv || [];
    } catch(e) {}

    let suppliers: any[] = [];
    try {
      const [sups] = await db.query(
        `SELECT id, name, contactPerson, email, phone, category FROM suppliers 
         WHERE name LIKE ? OR contactPerson LIKE ? OR email LIKE ? OR phone LIKE ? OR id LIKE ? LIMIT 6`,
        [like, like, like, like, like]
      ) as any[];
      suppliers = sups || [];
    } catch(e) {}

    res.json({
      customers,
      contacts,
      invoices,
      quotations,
      workOrders,
      inventory,
      suppliers
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// SYSTEM NOTIFICATIONS API
// ==========================
app.get('/api/notifications', async (req, res) => {
  try {
    const list: any[] = [];

    // 1. Overdue Invoices
    try {
      const [overdueInvoices] = await db.query(
        `SELECT id, invoiceNo, total, paidAmount, dueDate, customerId, leadId 
         FROM invoices 
         WHERE status NOT IN ('paid', 'draft') AND dueDate IS NOT NULL AND dueDate < NOW()
         ORDER BY dueDate ASC LIMIT 6`
      ) as any[];
      
      for (const inv of (overdueInvoices || [])) {
        const due = Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0));
        const days = Math.max(1, Math.ceil((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
        list.push({
          id: `overdue-inv-${inv.id}`,
          type: 'invoice',
          severity: 'error',
          title: `Overdue Invoice: ${inv.invoiceNo || inv.id}`,
          message: `Overdue by ${days} days · Rs. ${due.toLocaleString()} pending settlement`,
          time: `${days}d ago`,
          link: '/finance/invoices',
          timestamp: new Date(inv.dueDate).getTime()
        });
      }
    } catch(e) {}

    // 2. Low Stock Alerts
    try {
      const [lowStock] = await db.query(
        `SELECT id, sku, name, quantity, minQty, reorderLevel 
         FROM inventory 
         WHERE quantity <= COALESCE(minQty, reorderLevel, 5)
         ORDER BY quantity ASC LIMIT 6`
      ) as any[];
      
      for (const item of (lowStock || [])) {
        list.push({
          id: `low-stock-${item.id}`,
          type: 'inventory',
          severity: 'warning',
          title: `Low Stock: ${item.name || item.sku}`,
          message: `Only ${item.quantity || 0} left in stock (Min required: ${item.minQty || item.reorderLevel || 5})`,
          time: 'Action required',
          link: '/inventory',
          timestamp: Date.now() - 3600000
        });
      }
    } catch(e) {}

    // 3. Pending Credit Approvals
    try {
      const [pendingCredit] = await db.query(
        `SELECT id, name, company, pendingCreditLimit 
         FROM customers 
         WHERE creditLimitStatus = 'pending' LIMIT 5`
      ) as any[];
      
      for (const c of (pendingCredit || [])) {
        list.push({
          id: `credit-${c.id}`,
          type: 'approval',
          severity: 'info',
          title: `Credit Approval: ${c.company || c.name}`,
          message: `Customer requested credit limit of Rs. ${Number(c.pendingCreditLimit || 0).toLocaleString()}`,
          time: 'Pending review',
          link: `/crm/customers/${c.id}`,
          timestamp: Date.now() - 7200000
        });
      }
    } catch(e) {}

    // Material Shortages & Substitute Requests Alerts
    try {
      const [shortageWos] = await db.query(
        `SELECT id, orderNo, title, customer, quoteId, materialStatus, materialAlert, updatedAt, createdAt 
         FROM work_orders 
         WHERE materialStatus IS NOT NULL 
           AND materialStatus != 'Normal' 
           AND materialStatus != ''
         ORDER BY updatedAt DESC LIMIT 10`
      ) as any[];

      for (const wo of (shortageWos || [])) {
        const isMr = wo.materialStatus === 'Purchase MR Raised';
        list.push({
          id: `mat-shortage-${wo.id}`,
          type: isMr ? 'material_mr' : 'material_shortage',
          severity: isMr ? 'info' : 'warning',
          title: `Material Shortage: ${wo.orderNo || wo.id}`,
          message: `${wo.materialAlert || wo.materialStatus} · WO: ${wo.orderNo || wo.id}${wo.customer ? ' (' + wo.customer + ')' : ''}`,
          time: wo.materialStatus,
          link: '/admin/approvals',
          timestamp: wo.updatedAt ? new Date(wo.updatedAt).getTime() : (wo.createdAt ? new Date(wo.createdAt).getTime() : Date.now())
        });
      }
    } catch(e) {}

    // 4. Pending Work Orders
    try {
      const [wos] = await db.query(
        `SELECT id, orderNo, title, status, customer, createdAt 
         FROM work_orders 
         WHERE status IN ('pending', 'in_progress', 'scheduled')
         ORDER BY createdAt DESC LIMIT 5`
      ) as any[];
      
      for (const wo of (wos || [])) {
        list.push({
          id: `wo-${wo.id}`,
          type: 'production',
          severity: wo.status === 'pending' ? 'warning' : 'info',
          title: `Work Order: ${wo.orderNo || wo.id}`,
          message: `${wo.title || 'Job in production'} · Customer: ${wo.customer || 'General'}`,
          time: 'Active',
          link: '/production',
          timestamp: wo.createdAt ? new Date(wo.createdAt).getTime() : Date.now()
        });
      }
    } catch(e) {}

    // 5. Customer PO Received Notifications
    try {
      const [pos] = await db.query(
        `SELECT id, quotationNo, docNo, customerPoNo, customerPoDate, createdBy, createdByName, poReceivedAt, totalAmount, data
         FROM quotations 
         WHERE customerPoNo IS NOT NULL AND customerPoNo != ''
         ORDER BY COALESCE(poReceivedAt, createdAt) DESC LIMIT 10`
      ) as any[];

      for (const po of (pos || [])) {
        let qData: any = {};
        try { if (po.data) qData = typeof po.data === 'string' ? JSON.parse(po.data) : po.data; } catch(e){}
        const custName = qData.customerCompany || qData.customerName || 'Customer';
        const qNum = po.quotationNo || po.docNo || po.id;
        list.push({
          id: `po-${po.id}`,
          type: 'po_received',
          severity: 'success',
          title: `Customer PO Received: ${po.customerPoNo}`,
          message: `PO #${po.customerPoNo} received for Quote ${qNum} (${custName}) · ${po.createdByName ? 'Creator: ' + po.createdByName : ''}`,
          time: po.customerPoDate || 'Recent',
          link: '/crm/quotations',
          createdBy: po.createdBy,
          createdByName: po.createdByName,
          timestamp: po.poReceivedAt ? new Date(po.poReceivedAt).getTime() : (po.createdAt ? new Date(po.createdAt).getTime() : Date.now())
        });
      }
    } catch(e) {}

    // Sort by timestamp desc
    list.sort((a, b) => b.timestamp - a.timestamp);

    res.json(list);
  } catch (error: any) {
    console.error('Notifications error:', error);
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

async function runStartupMigrations() {
  try {
    await runDatabaseSync();
  } catch (e) {
    console.error('Startup DB sync error:', e);
  }

  // Run full database health diagnostic check
  try {
    const [tables]: any = await db.query('SHOW TABLES');
    const [rolesCount]: any = await db.query('SELECT COUNT(*) as count FROM roles');
    const [usersCount]: any = await db.query('SELECT COUNT(*) as count FROM users');
    const [custCount]: any = await db.query('SELECT COUNT(*) as count FROM customers');
    const [invCount]: any = await db.query('SELECT COUNT(*) as count FROM invoices');
    console.log(`[DB HEALTH] Database connection verified successfully!`);
    console.log(`[DB HEALTH] Tables: ${tables.length} | Roles: ${rolesCount[0]?.count || 0} | Users: ${usersCount[0]?.count || 0} | Customers: ${custCount[0]?.count || 0} | Invoices: ${invCount[0]?.count || 0}`);
  } catch (e: any) {
    console.error('[DB HEALTH] Verification warning:', e.message);
  }
}

app.listen(PORT, async () => {
  console.log(`API Server running on http://localhost:${PORT}`);
  try {
    await runStartupMigrations();
  } catch (e) {
    console.error('Startup migration error:', e);
  }
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

// ==========================================
// REX AI ASSISTANT & REAL-TIME ERP TOOLS
// ==========================================

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_item_purchase_prices",
      description: "Searches inventory items to find Selling Price (unitPrice), Standard Purchase/Cost Price (unitCost), available warehouse stock, SKU, and linked suppliers. Always call this tool when asked about prices, costs, or suppliers of any product, material, or SKU.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Item name, product, material, or SKU to search for, e.g. 'Sample Item', 'Bearing 205', 'EN8 Shaft', 'SKU-001'"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_inventory_stock",
      description: "Checks current physical warehouse stock levels, UOM, storage locations (Bay/Rack), and low stock alert thresholds.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional item name or category filter"
          },
          lowStockOnly: {
            type: "boolean",
            description: "Set to true to find items that are at or below reorder level / running out of stock"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_finance_summary",
      description: "Looks up customer details, credit limits, unpaid or overdue invoices, and total outstanding balances.",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "Optional customer or company name"
          },
          overdueOnly: {
            type: "boolean",
            description: "Set to true to return only overdue unpaid invoices"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_supplier_history",
      description: "Retrieves all registered suppliers in Rex ERP, their contact persons, phone numbers, emails, addresses, payment terms, and past purchase order records. Can be called with or without a supplierName filter.",
      parameters: {
        type: "object",
        properties: {
          supplierName: {
            type: "string",
            description: "Optional supplier name or contact person. If omitted, returns all registered suppliers."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_quotations_overview",
      description: "Retrieves recent quotations, quotation numbers, customer names, total amounts, and approval statuses.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional search query by quotation number or customer name"
          },
          status: {
            type: "string",
            description: "Optional status filter, e.g. 'Draft', 'Pending Approval', 'Approved', 'Sent', 'In Production'"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_production_and_work_orders",
      description: "Retrieves manufacturing work orders, job cards, target delivery dates, machining operations, assigned machines, and employee operators.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional search term for work order number, customer name, or product name"
          },
          status: {
            type: "string",
            description: "Optional work order status filter, e.g. 'Pending', 'In Progress', 'Completed', 'On Hold'"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_financial_and_accounting_summary",
      description: "Retrieves live financial overview including bank balances, cash in hand, total sales revenue, total expenses, and recent journal entries.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            description: "Optional scope filter e.g. 'all', 'today', 'this_month'"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_qc_and_machinery_overview",
      description: "Retrieves machine status (operational, idle, maintenance), hourly rates, and recent quality control (QC) inspection logs, defects, and pass/fail statistics.",
      parameters: {
        type: "object",
        properties: {
          workOrderId: {
            type: "string",
            description: "Optional work order ID to filter QC inspections"
          }
        }
      }
    }
  },

  {
    type: "function",
    function: {
      name: "search_contacts_and_directory",
      description: "Searches across Customers, Suppliers, and Leads directory for company names, contact persons, phone numbers, emails, addresses, and key personnel.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The company name, customer name, supplier name, contact person, phone number, or email to search"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_custom_erp_query",
      description: "Executes a safe read-only SQL SELECT query on the MySQL ERP database for any complex calculation, cross-table join, or specific data detail across any module in Rex ERP. Only SELECT queries are permitted.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The SQL SELECT statement to execute, e.g. 'SELECT count(*) as total, status FROM work_orders GROUP BY status' or 'SELECT * FROM machineries WHERE status = \"Maintenance\"'"
          }
        },
        required: ["query"]
      }
    }
  }
];

function cleanItemSearchTerm(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[?.,!/\\;:'"()\[\]{}]/g, ' ')
    .replace(/\b(price|pricing|prices|cost|costs|rate|rates|mila|ganan|kiyada|eka|what|whats|is|the|of|for|please|tell|show|search|find|stock|qty|quantity|thiyenawada|thiyeda|in|item|items|give|me)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCustomerSearchTerm(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[?.,!/\\;:'"()\[\]{}]/g, ' ')
    .replace(/\b(outstanding|due|dues|balance|amount|amounts|invoices|invoice|bills|bill|overdue|payment|payments|credit|lkr|rs|kiyada|gana|total|summary|details|detail|pvt|ltd|what|whats|is|the|of|for|please|tell|show)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRawSql(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().replace(/^```(?:sql)?/i, '').replace(/```$/i, '').trim();
  if (/^SELECT\s+[\s\S]+\s+FROM\s+/i.test(trimmed)) return true;
  if (/^\s*WITH\s+[\s\S]+\s+SELECT\s+[\s\S]+\s+FROM\s+/i.test(trimmed)) return true;
  if (/^\s*SHOW\s+(TABLES|COLUMNS|DATABASES)/i.test(trimmed)) return true;
  if (/^\s*DESCRIBE\s+\w+/i.test(trimmed)) return true;
  const sqlMatch = trimmed.match(/\bSELECT\s+[\s\S]+?\bFROM\b[\s\S]+?(?:;|$)/i);
  if (sqlMatch && trimmed.length < 350) return true;
  return false;
}

function isEnglishPrompt(text: string): boolean {
  if (!text) return true;
  const hasSinhalaScript = /[\u0D80-\u0DFF]/.test(text);
  if (hasSinhalaScript) return false;
  const lower = text.toLowerCase();
  const singlishMarkers = ['kiyada', 'gana', 'ganan', 'thiyenawa', 'thiyeda', 'pennanna', 'karanna', 'meke', 'machan', 'kohomada', 'dapan', 'one', 'monawada', 'danata', 'mokakda'];
  const isSinglish = singlishMarkers.some(m => new RegExp(`\\b${m}\\b`, 'i').test(lower));
  return !isSinglish;
}

function hasTokenRepetitionLoop(text: string): boolean {
  if (!text || text.length < 25) return false;
  // 1. Single word or token repeated 4+ times consecutively
  if (/\b(\S+)(?:\s+\1){3,}\b/u.test(text)) return true;
  // 2. Multi-word or phrase repeated 3+ times consecutively
  if (/(\b.{3,25}\b)(?:\s*\1){2,}/u.test(text)) return true;
  // 3. Any 2-15 character sequence repeating 4+ times consecutively without spaces
  if (/(.{2,15}?)\1{3,}/u.test(text)) return true;
  // 4. Token frequency ratio check
  const words = text.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 15) {
    const counts: Record<string, number> = {};
    for (const w of words) {
      counts[w] = (counts[w] || 0) + 1;
      if (counts[w] > 6 && (counts[w] / words.length) > 0.3) {
        return true;
      }
    }
  }
  return false;
}

function isSchemaDump(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    (lower.includes('erp database schema') || lower.includes('database schema') || (lower.includes('table') && lower.includes('key columns'))) &&
    (lower.includes('inventory') || lower.includes('quotations') || lower.includes('invoices') || lower.includes('key takeaways') || lower.includes('specific data from any table'))
  );
}

function formatDbResultsAsMarkdown(results: any[], isEnglish: boolean, userMsg?: string): string {
  if (!Array.isArray(results) || results.length === 0) {
    return isEnglish 
      ? 'ℹ️ No matching records were found in Rex ERP. Please confirm the item name or SKU.'
      : 'ℹ️ ඔබගේ විමසුමට අදාළ දත්ත Rex ERP පද්ධතිය තුළ හමු නොවීය. කරුණාකර Item Name එක හෝ SKU අංකය තහවුරු කරගන්න.';
  }

  const first = results[0];
  const isInventory = first && (
    first.unitPrice !== undefined || 
    first.unitCost !== undefined || 
    first.sellingPrice !== undefined || 
    first.standardPurchasePrice !== undefined || 
    first.sku !== undefined
  );

  if (isInventory) {
    return results.slice(0, 5).map(item => {
      const name = item.name || item.itemName || item.productName || 'Item';
      const sku = item.sku ? `\`${item.sku}\`` : 'N/A';
      const selling = Number(item.unitPrice ?? item.sellingPrice ?? 0);
      const cost = Number(item.unitCost ?? item.standardPurchasePrice ?? 0);
      const qty = item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 0);
      const uom = item.uom || 'units';
      const loc = item.location || 'Store A';

      let supList: string[] = [];
      if (item.linkedSuppliers && Array.isArray(item.linkedSuppliers)) {
        supList = item.linkedSuppliers;
      } else if (item.suppliers) {
        try {
          const parsed = typeof item.suppliers === 'string' ? JSON.parse(item.suppliers) : item.suppliers;
          supList = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          supList = [String(item.suppliers)];
        }
      }
      const supStr = supList.filter(Boolean).join(', ');

      if (isEnglish) {
        let card = `📦 **${name}** (SKU: ${sku})\n\n` +
          `• **Selling Price:** Rs. ${selling.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• **Purchase / Cost Price:** Rs. ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• **Current Stock:** ${qty} ${uom}\n` +
          `• **Storage Location:** ${loc}`;
        if (supStr) {
          card += `\n• **Linked Suppliers:** ${supStr}`;
        }
        return card;
      } else {
        let card = `📦 **${name}** (SKU: ${sku})\n\n` +
          `• **විකුණුම් මිල (Selling Price):** Rs. ${selling.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• **ගැනුම් / පිරිවැය මිල (Unit Cost):** Rs. ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
          `• **දැනට පවතින තොගය (Current Stock):** ${qty} ${uom}\n` +
          `• **ගබඩා ස්ථානය (Location):** ${loc}`;
        if (supStr) {
          card += `\n• **සම්බන්ධිත සැපයුම්කරුවන් (Suppliers):** ${supStr}`;
        }
        return card;
      }
    }).join('\n\n---\n\n');
  }

  // Check if supplier records
  const isSupplier = first && (first.contactPerson !== undefined || first.paymentTerms !== undefined || (first.phone !== undefined && first.creditLimit !== undefined));
  if (isSupplier) {
    return results.slice(0, 5).map(sup => {
      const name = sup.name || 'Supplier';
      const contact = sup.contactPerson || sup.contactName || 'N/A';
      const phone = sup.phone || 'N/A';
      const terms = sup.paymentTerms || 'Standard';
      if (isEnglish) {
        return `🏢 **${name}**\n• **Contact:** ${contact}\n• **Phone:** ${phone}\n• **Payment Terms:** ${terms}`;
      } else {
        return `🏢 **${name}**\n• **සම්බන්ධීකරණය:** ${contact}\n• **දුරකථන:** ${phone}\n• **ගෙවීම් කොන්දේසි:** ${terms}`;
      }
    }).join('\n\n---\n\n');
  }

  // Generic Markdown table
  const keys = Object.keys(first).slice(0, 6);
  const header = '| ' + keys.join(' | ') + ' |';
  const sep = '| ' + keys.map(() => '---').join(' | ') + ' |';
  const rows = results.slice(0, 10).map(r => '| ' + keys.map(k => String(r[k] ?? '')).join(' | ') + ' |').join('\n');
  return header + '\n' + sep + '\n' + rows;
}

async function executeAITool(name: string, args: any) {
  try {
    if (name === "get_item_purchase_prices") {
      const rawQ = (args.query || '').trim();
      const cleanedQ = cleanItemSearchTerm(rawQ);
      const searchTarget = cleanedQ || rawQ;
      const q = `%${searchTarget}%`;

      // Multi-strategy search:
      // Strategy 1: Exact / phrase LIKE match
      let [inv]: any = await db.query(
        `SELECT id, name, sku, unitCost as standardPurchasePrice, unitPrice as sellingPrice, quantity, uom, location, category, suppliers
         FROM inventory 
         WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? 
         ORDER BY (name = ?) DESC, (sku = ?) DESC LIMIT 10`,
        [q, q, q, searchTarget, searchTarget]
      );

      // Strategy 2: Multi-token match (AND)
      if ((!inv || inv.length === 0) && searchTarget.length > 2) {
        const tokens = searchTarget.split(' ').filter((t: string) => t.length >= 2);
        if (tokens.length > 0) {
          const conditions = tokens.map(() => '(name LIKE ? OR sku LIKE ? OR category LIKE ?)').join(' AND ');
          const params: any[] = [];
          tokens.forEach((t: string) => params.push(`%${t}%`, `%${t}%`, `%${t}%`));
          const [tokenRows]: any = await db.query(
            `SELECT id, name, sku, unitCost as standardPurchasePrice, unitPrice as sellingPrice, quantity, uom, location, category, suppliers
             FROM inventory WHERE ${conditions} LIMIT 10`,
            params
          );
          inv = tokenRows;
        }
      }

      // Strategy 3: Fuzzy token match (OR)
      if ((!inv || inv.length === 0) && searchTarget.length > 2) {
        const tokens = searchTarget.split(' ').filter((t: string) => t.length >= 2);
        if (tokens.length > 0) {
          const conditions = tokens.map(() => '(name LIKE ? OR sku LIKE ? OR category LIKE ?)').join(' OR ');
          const params: any[] = [];
          tokens.forEach((t: string) => params.push(`%${t}%`, `%${t}%`, `%${t}%`));
          const [fuzzyRows]: any = await db.query(
            `SELECT id, name, sku, unitCost as standardPurchasePrice, unitPrice as sellingPrice, quantity, uom, location, category, suppliers
             FROM inventory WHERE ${conditions} LIMIT 10`,
            params
          );
          inv = fuzzyRows;
        }
      }

      const parsedInv = (inv || []).map((item: any) => {
        let linkedSuppliers: string[] = [];
        if (item.suppliers) {
          try {
            linkedSuppliers = typeof item.suppliers === 'string' ? JSON.parse(item.suppliers) : item.suppliers;
            if (!Array.isArray(linkedSuppliers)) linkedSuppliers = [String(linkedSuppliers)];
          } catch (e) {
            linkedSuppliers = [String(item.suppliers)];
          }
        }
        return {
          ...item,
          linkedSuppliers
        };
      });

      let [pos]: any = await db.query(
        `SELECT poi.material, poi.qty, poi.unitCost as actualPurchaseRate, poi.notes,
                po.id as poNumber, s.name as supplierName, s.phone as supplierPhone,
                po.date as orderDate, po.status as poStatus
         FROM po_items poi
         JOIN purchase_orders po ON poi.poId = po.id
         LEFT JOIN suppliers s ON po.supplierId = s.id
         WHERE poi.material LIKE ? OR poi.notes LIKE ?
         ORDER BY po.date DESC LIMIT 8`,
        [q, q]
      );

      if ((!pos || pos.length === 0) && searchTarget.length > 2) {
        const tokens = searchTarget.split(' ').filter((t: string) => t.length >= 2);
        if (tokens.length > 0) {
          const poConditions = tokens.map(() => '(poi.material LIKE ? OR poi.notes LIKE ?)').join(' OR ');
          const poParams: any[] = [];
          tokens.forEach((t: string) => poParams.push(`%${t}%`, `%${t}%`));
          const [fuzzyPOs]: any = await db.query(
            `SELECT poi.material, poi.qty, poi.unitCost as actualPurchaseRate, poi.notes,
                    po.id as poNumber, s.name as supplierName, s.phone as supplierPhone,
                    po.date as orderDate, po.status as poStatus
             FROM po_items poi
             JOIN purchase_orders po ON poi.poId = po.id
             LEFT JOIN suppliers s ON po.supplierId = s.id
             WHERE ${poConditions}
             ORDER BY po.date DESC LIMIT 8`,
            poParams
          );
          pos = fuzzyPOs;
        }
      }

      // Also retrieve all active registered suppliers in the ERP for complete context
      const [allSuppliers]: any = await db.query(
        `SELECT id, name, contactPerson, contactName, phone, email, paymentTerms FROM suppliers ORDER BY name ASC LIMIT 30`
      );

      return {
        searchedQuery: rawQ,
        matchedInventory: parsedInv,
        historicalPurchasesFromSuppliers: pos,
        allRegisteredSuppliersInERP: allSuppliers
      };
    } else if (name === "check_inventory_stock") {
      let sql = `SELECT id, name, sku, quantity, uom, location, category, unitCost, unitPrice as sellingPrice, 
                        COALESCE(reorderLevel, minQty, 5) as minReorderLevel
                 FROM inventory WHERE 1=1 `;
      const params: any[] = [];
      const rawQ = (args.query || '').trim();
      const cleanedQ = cleanItemSearchTerm(rawQ);
      const searchTarget = cleanedQ || rawQ;

      if (searchTarget) {
        const q = `%${searchTarget}%`;
        sql += `AND (name LIKE ? OR sku LIKE ? OR category LIKE ?) `;
        params.push(q, q, q);
      }
      if (args.lowStockOnly) {
        sql += `AND quantity <= COALESCE(reorderLevel, minQty, 5) `;
      }
      sql += `ORDER BY quantity ASC LIMIT 20`;
      let [rows]: any = await db.query(sql, params);

      if ((!rows || rows.length === 0) && searchTarget.length > 2) {
        const tokens = searchTarget.split(' ').filter((t: string) => t.length >= 2);
        if (tokens.length > 0) {
          const conditions = tokens.map(() => '(name LIKE ? OR sku LIKE ? OR category LIKE ?)').join(' OR ');
          const tParams: any[] = [];
          tokens.forEach((t: string) => tParams.push(`%${t}%`, `%${t}%`, `%${t}%`));
          let fSql = `SELECT id, name, sku, quantity, uom, location, category, unitCost, unitPrice as sellingPrice, 
                             COALESCE(reorderLevel, minQty, 5) as minReorderLevel
                      FROM inventory WHERE (${conditions}) `;
          if (args.lowStockOnly) {
            fSql += `AND quantity <= COALESCE(reorderLevel, minQty, 5) `;
          }
          fSql += `ORDER BY quantity ASC LIMIT 20`;
          const [fuzzyStock]: any = await db.query(fSql, tParams);
          rows = fuzzyStock;
        }
      }
      return { count: rows.length, stockItems: rows };
    } else if (name === "get_customer_finance_summary") {
      const rawC = (args.customerName || '').trim();
      const cleanedC = cleanCustomerSearchTerm(rawC);
      const searchTarget = cleanedC || rawC;
      const q = `%${searchTarget}%`;

      let custSql = `SELECT id, name, company, phone, email, creditLimit, creditDays, contacts FROM customers WHERE 1=1 `;
      const custParams: any[] = [];
      if (searchTarget) {
        custSql += `AND (name LIKE ? OR company LIKE ? OR contacts LIKE ?) `;
        custParams.push(q, q, q);
      }
      custSql += `LIMIT 8`;
      let [customers]: any = await db.query(custSql, custParams);

      if ((!customers || customers.length === 0) && searchTarget.length > 2) {
        const tokens = searchTarget.split(' ').filter((t: string) => t.length >= 2);
        if (tokens.length > 0) {
          const conditions = tokens.map(() => '(name LIKE ? OR company LIKE ? OR contacts LIKE ?)').join(' OR ');
          const tParams: any[] = [];
          tokens.forEach((t: string) => tParams.push(`%${t}%`, `%${t}%`, `%${t}%`));
          const [fuzzyCust]: any = await db.query(
            `SELECT id, name, company, phone, email, creditLimit, creditDays, contacts FROM customers WHERE ${conditions} LIMIT 8`,
            tParams
          );
          customers = fuzzyCust;
        }
      }

      let invSql = `SELECT i.id, i.quotationNo, c.name as customerName, c.company as customerCompany,
                           i.date, i.dueDate, i.subtotal, i.tax, i.total, i.status
                    FROM invoices i
                    LEFT JOIN customers c ON i.customerId = c.id
                    WHERE i.status != 'paid' `;
      const invParams: any[] = [];
      if (searchTarget) {
        invSql += `AND (c.name LIKE ? OR c.company LIKE ?) `;
        invParams.push(q, q);
      }
      if (args.overdueOnly) {
        invSql += `AND i.dueDate < NOW() `;
      }
      invSql += `ORDER BY i.dueDate ASC LIMIT 15`;
      let [invoices]: any = await db.query(invSql, invParams);

      if ((!invoices || invoices.length === 0) && searchTarget.length > 2) {
        const tokens = searchTarget.split(' ').filter((t: string) => t.length >= 2);
        if (tokens.length > 0) {
          const conditions = tokens.map(() => '(c.name LIKE ? OR c.company LIKE ?)').join(' OR ');
          const tParams: any[] = [];
          tokens.forEach((t: string) => tParams.push(`%${t}%`, `%${t}%`));
          let fInvSql = `SELECT i.id, i.quotationNo, c.name as customerName, c.company as customerCompany,
                                i.date, i.dueDate, i.subtotal, i.tax, i.total, i.status
                         FROM invoices i
                         LEFT JOIN customers c ON i.customerId = c.id
                         WHERE i.status != 'paid' AND (${conditions}) `;
          if (args.overdueOnly) {
            fInvSql += `AND i.dueDate < NOW() `;
          }
          fInvSql += `ORDER BY i.dueDate ASC LIMIT 15`;
          const [fuzzyInvoices]: any = await db.query(fInvSql, tParams);
          invoices = fuzzyInvoices;
        }
      }

      const totalDue = invoices.reduce((sum: number, r: any) => sum + Number(r.total || 0), 0);

      return {
        matchedCustomers: customers,
        totalOutstandingDue: totalDue,
        unpaidInvoices: invoices
      };
    } else if (name === "get_supplier_history") {
      let sql = `SELECT s.id, s.name, s.contactPerson, s.contactName, s.phone, s.email, s.paymentTerms,
                        po.id as poId, po.date as orderDate, po.totalAmount, po.status as poStatus
                 FROM suppliers s
                 LEFT JOIN purchase_orders po ON s.id = po.supplierId
                 WHERE 1=1 `;
      const params: any[] = [];
      if (args.supplierName && args.supplierName.trim()) {
        const q = `%${args.supplierName.trim()}%`;
        sql += `AND (s.name LIKE ? OR s.contactPerson LIKE ? OR s.contactName LIKE ?) `;
        params.push(q, q, q);
      }
      sql += `ORDER BY s.name ASC, po.date DESC LIMIT 25`;
      const [suppliersWithPOs]: any = await db.query(sql, params);

      const [allRegisteredSuppliers]: any = await db.query(
        `SELECT id, name, contactPerson, contactName, phone, email, address, paymentTerms FROM suppliers ORDER BY name ASC LIMIT 50`
      );

      return { 
        suppliersWithPurchaseOrders: suppliersWithPOs,
        allRegisteredSuppliers
      };
    } else if (name === "get_quotations_overview") {
      let sql = `SELECT q.id, q.leadId, q.totalAmount, q.status, q.approvedBy, q.approvedAt, q.date,
                        c.name as customerName, c.company as customerCompany
                 FROM quotations q
                 LEFT JOIN customers c ON q.leadId = c.id
                 WHERE 1=1 `;
      const params: any[] = [];
      if (args.query && args.query.trim()) {
        const q = `%${args.query.trim()}%`;
        sql += `AND (q.id LIKE ? OR c.name LIKE ? OR c.company LIKE ?) `;
        params.push(q, q, q);
      }
      if (args.status && args.status.trim()) {
        sql += `AND q.status = ? `;
        params.push(args.status.trim());
      }
      sql += `ORDER BY q.date DESC LIMIT 12`;
      const [quotes]: any = await db.query(sql, params);
      return { quotations: quotes };
    } else if (name === "get_production_and_work_orders") {
      let woSql = `SELECT wo.id, wo.orderNo, wo.customer, wo.productName, wo.qty, wo.status, wo.priority,
                          wo.plannedStartDate, wo.targetDeliveryDate
                   FROM work_orders wo WHERE 1=1 `;
      const params: any[] = [];
      if (args.status && args.status.trim()) {
        woSql += `AND wo.status = ? `;
        params.push(args.status.trim());
      }
      if (args.query && args.query.trim()) {
        const q = `%${args.query.trim()}%`;
        woSql += `AND (wo.orderNo LIKE ? OR wo.customer LIKE ? OR wo.productName LIKE ?) `;
        params.push(q, q, q);
      }
      woSql += `ORDER BY wo.targetDeliveryDate ASC LIMIT 10`;
      const [workOrders]: any = await db.query(woSql, params);

      const [activeOps]: any = await db.query(`
        SELECT woo.id, woo.workOrderId, woo.operationName, woo.stepNumber, woo.plannedHours, woo.status,
               m.name as machineName, m.code as machineCode,
               e.name as employeeName
        FROM work_order_operations woo
        LEFT JOIN machineries m ON woo.machineId = m.id
        LEFT JOIN employees e ON woo.employeeId = e.id
        WHERE woo.status != 'completed'
        ORDER BY woo.stepNumber ASC LIMIT 15
      `);
      return { workOrders, pendingOperations: activeOps };
    } else if (name === "get_financial_and_accounting_summary") {
      const [bankAccounts]: any = await db.query(
        "SELECT id, code, name, type, subtype, balance FROM chart_of_accounts WHERE subtype IN ('Bank', 'Cash') OR type = 'Asset' ORDER BY code ASC"
      );
      const [summary]: any = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'Revenue' THEN balance ELSE 0 END), 0) as totalRevenue,
          COALESCE(SUM(CASE WHEN type = 'Expense' THEN balance ELSE 0 END), 0) as totalExpenses,
          COALESCE(SUM(CASE WHEN subtype = 'Bank' THEN balance ELSE 0 END), 0) as totalBankBalance,
          COALESCE(SUM(CASE WHEN subtype = 'Cash' THEN balance ELSE 0 END), 0) as totalCashInHand
        FROM chart_of_accounts
      `);
      const [recentJournals]: any = await db.query(
        "SELECT id, date, reference, description, totalAmount, status FROM journal_entries ORDER BY date DESC LIMIT 5"
      );
      return {
        summary: summary[0],
        accounts: bankAccounts,
        recentJournals
      };
    } else if (name === "get_qc_and_machinery_overview") {
      const [machines]: any = await db.query(
        "SELECT id, code, name, category, status, hourlyRate FROM machineries ORDER BY name ASC"
      );
      let qcSql = `SELECT id, workOrderId, inspectedBy, status, defectReason, notes, createdAt FROM qc_inspections `;
      const qcParams: any[] = [];
      if (args.workOrderId) {
        qcSql += `WHERE workOrderId = ? `;
        qcParams.push(args.workOrderId);
      }
      qcSql += `ORDER BY createdAt DESC LIMIT 10`;
      const [inspections]: any = await db.query(qcSql, qcParams);
      return {
        machineries: machines,
        recentQCInspections: inspections
      };
    } else if (name === "search_contacts_and_directory") {
      const rawQ = (args.query || '').trim();
      const q = `%${rawQ}%`;
      const [customers]: any = await db.query(
        "SELECT id, name, company, phone, phone2, email, address, contacts FROM customers WHERE name LIKE ? OR company LIKE ? OR phone LIKE ? OR email LIKE ? OR contacts LIKE ? LIMIT 6",
        [q, q, q, q, q]
      );
      const [suppliers]: any = await db.query(
        "SELECT id, name, contactPerson, contactName, phone, phone2, email, address, contacts FROM suppliers WHERE name LIKE ? OR contactPerson LIKE ? OR contactName LIKE ? OR phone LIKE ? OR email LIKE ? OR contacts LIKE ? LIMIT 6",
        [q, q, q, q, q, q]
      );
      const [leads]: any = await db.query(
        "SELECT id, name, company, phone, email FROM leads WHERE name LIKE ? OR company LIKE ? OR phone LIKE ? OR email LIKE ? LIMIT 6",
        [q, q, q, q]
      );
      return {
        searchedQuery: rawQ,
        totalFound: customers.length + suppliers.length + leads.length,
        customers,
        suppliers,
        leads
      };
    } else if (name === "get_erp_database_schema") {
      return {
        databaseName: "rex_erp",
        tables: {
          inventory: ["id", "name", "sku", "category", "unitCost (purchase price)", "unitPrice (selling price)", "quantity (stock)", "uom", "location", "reorderLevel", "suppliers (JSON array of linked supplier names/IDs)", "minQty", "boms"],
          quotations: ["id", "quotationNo", "leadId", "date", "totalAmount", "status (Draft/Pending Approval/Approved/Sent/Rejected)", "approvedBy", "approvedAt", "rejectionReason"],
          customers: ["id", "name", "company", "phone", "email", "address", "creditLimit", "creditDays", "status"],
          invoices: ["id", "invoiceNo", "customerId", "date", "dueDate", "total", "subtotal", "taxAmount", "paidAmount", "status (unpaid/partially_paid/paid)"],
          purchase_orders: ["id", "supplierId", "date", "expectedDate", "subtotal", "tax", "totalAmount", "status", "billedAmount", "billingStatus"],
          suppliers: ["id", "name", "category", "phone", "email", "creditLimit", "creditDays", "paymentTerms", "status"],
          grns: ["id", "poId", "supplierId", "date", "receivedBy", "vehicleNo", "storageLocation", "status"],
          supplier_bills: ["id", "supplierId", "poId", "grnId", "invoiceNo", "date", "dueDate", "amount", "status"],
          material_requests: ["id", "workOrderNo", "date", "requestedBy", "department", "priority", "status", "items"],
          work_orders: ["id", "orderNo", "customerId", "customer", "productId", "productName", "qty", "targetDeliveryDate", "plannedStartDate", "status", "priority"],
          work_order_operations: ["id", "workOrderId", "operationName", "stepNumber", "machineId", "employeeId", "plannedHours", "status", "isLocked"],
          machineries: ["id", "name", "code", "category", "status", "hourlyRate"],
          employees: ["id", "name", "code", "designation", "department", "phone", "status"],
          qc_inspections: ["id", "workOrderId", "inspectedBy", "status (Pass/Fail/Rework)", "defectReason", "notes", "createdAt"],
          rework_logs: ["id", "qcId", "notes", "status"],
          chart_of_accounts: ["id", "code", "name", "type (Asset/Liability/Equity/Revenue/Expense)", "subtype (Bank/Cash/Inventory/...)", "balance"],
          journal_entries: ["id", "date", "reference", "description", "totalAmount", "status"],
          journal_lines: ["id", "entryId", "accountId", "debit", "credit", "description"],
          deals: ["id", "customerId", "title", "value", "stage", "probability"],
          leads: ["id", "customerId", "title", "contactPerson", "phone", "status"],
          finished_goods_orders: ["id", "orderNo", "productId", "productName", "customerName", "qty", "unitPrice", "totalPrice", "status", "stockStatus"],
          customer_grns: ["id", "quoteId", "customerName", "items", "receivedAt", "status"],
          gate_passes: ["id", "type", "customerName", "carrier", "vehicleNo", "items", "status"]
        }
      };
    } else if (name === "execute_custom_erp_query") {
      const sql = (args.query || '').trim();
      // Enforce read-only SELECT security
      if (!/^(SELECT|WITH|SHOW|DESCRIBE|EXPLAIN)\s+/i.test(sql)) {
        return { error: "Security Restriction: Only read-only SELECT queries are allowed." };
      }
      const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE|CREATE|GRANT|REVOKE|LOCK|UNLOCK|RENAME|CALL|EXEC|EXECUTE)\b/i;
      if (forbidden.test(sql)) {
        return { error: "Security Restriction: Data mutation statements are strictly blocked. Please provide a read-only SELECT query." };
      }

      let finalSql = sql;
      if (!/\bLIMIT\b/i.test(finalSql)) {
        finalSql += ' LIMIT 50';
      }

      const [rows]: any = await db.query(finalSql);
      return {
        executedQuery: finalSql,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        results: rows
      };
    }
    return { error: `Unknown tool name: ${name}` };
  } catch (error: any) {
    console.error(`Error executing AI tool ${name}:`, error);
    return { error: error.message };
  }
}

/**
 * Helper to reliably extract error messages across OpenAI, Groq, and Google Gemini (which returns error arrays)
 */
function extractApiErrorMessage(errData: any): string {
  if (!errData) return '';
  if (Array.isArray(errData) && errData.length > 0) {
    const first = errData[0];
    return first?.error?.message || first?.message || (typeof first === 'string' ? first : JSON.stringify(first));
  }
  if (typeof errData === 'object') {
    return errData.error?.message || errData.message || JSON.stringify(errData);
  }
  return String(errData);
}

/**
 * Helper to dynamically fetch live models from Google Gemini, Groq, or OpenAI
 */
async function fetchProviderModels(provider: string, apiKey: string): Promise<string[]> {
  try {
    const isGemini = provider === 'gemini' || apiKey.startsWith('AIzaSy');
    const isGroq = provider === 'groq' || apiKey.startsWith('gsk_');
    const isDeepSeek = provider === 'deepseek';

    let endpoint = 'https://api.groq.com/openai/v1/models';
    if (isGemini) {
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/models';
    } else if (isGroq) {
      endpoint = 'https://api.groq.com/openai/v1/models';
    } else if (isDeepSeek) {
      endpoint = 'https://api.deepseek.com/models';
    } else {
      endpoint = 'https://api.openai.com/v1/models';
    }

    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
    });
    if (!res.ok) {
      console.warn(`[Rex AI] Failed to fetch models list from ${provider}: HTTP ${res.status}`);
      if (isGemini) {
        return ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
      }
      if (isDeepSeek) {
        return ['deepseek-chat', 'deepseek-reasoner'];
      }
      return [];
    }
    const data: any = await res.json();
    if (Array.isArray(data.data)) {
      const nonChatKeywords = ['whisper', 'embedding', 'tts', 'dall-e', 'moderation', 'bdr', 'guard', 'text-embedding', 'imagen', 'aqa', '2.5', 'preview', 'lite'];
      const chatModels = data.data
        .map((m: any) => (m.id || '').replace(/^models\//, ''))
        .filter((id: string) => {
          const lower = id.toLowerCase();
          return !nonChatKeywords.some(kw => lower.includes(kw));
        });
      if (isGemini && chatModels.length === 0) {
        return ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
      }
      if (isDeepSeek && chatModels.length === 0) {
        return ['deepseek-chat', 'deepseek-reasoner'];
      }
      return chatModels;
    }
    if (isGemini) {
      return ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    }
    if (isDeepSeek) {
      return ['deepseek-chat', 'deepseek-reasoner'];
    }
    return [];
  } catch (err: any) {
    console.error(`[Rex AI] Error fetching models from ${provider}:`, err.message);
    if (provider === 'gemini' || apiKey.startsWith('AIzaSy')) {
      return ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    }
    if (provider === 'deepseek') {
      return ['deepseek-chat', 'deepseek-reasoner'];
    }
    return [];
  }
}

/**
 * Helper to normalize common shorthand model names entered by users (e.g. flash, 8b, 70b)
 */
function normalizeModelName(modelName: string, provider: string): string {
  if (!modelName) {
    if (provider === 'gemini') return 'gemini-1.5-flash';
    if (provider === 'groq') return 'llama-3.1-8b-instant';
    if (provider === 'deepseek') return 'deepseek-chat';
    return 'gpt-4o-mini';
  }
  let m = modelName.trim().toLowerCase().replace(/^models\//, '');
  if (provider === 'gemini') {
    if (m.includes('2.5') || m.includes('preview') || m.includes('lite')) {
      return 'gemini-1.5-flash';
    }
    if (m === 'flash' || m === '1.5-flash' || m === 'gemini-flash' || m === 'gemini-1.5-flash-latest' || m === 'gemini-1.5-flash') {
      return 'gemini-1.5-flash';
    }
    if (m === '2.0-flash' || m === '2-flash' || m === 'gemini-2.0' || m === 'gemini-2.0-flash-exp' || m === 'gemini-2.0-flash') {
      return 'gemini-2.0-flash';
    }
    if (m === 'pro' || m === '1.5-pro' || m === 'gemini-pro' || m === 'gemini-1.5-pro') {
      return 'gemini-1.5-pro';
    }
    return m;
  } else if (provider === 'groq') {
    if (m === '8b' || m === 'llama-8b' || m === 'llama-3-8b' || m === 'llama-3.1-8b' || m === 'llama3-8b' || m === 'llama3.1-8b' || m === 'llama-3.1-8b-instant') {
      return 'llama-3.3-70b-versatile';
    }
    if (m === '70b' || m === 'llama-70b' || m === 'llama-3-70b' || m === 'llama-3.3-70b' || m === 'llama3-70b' || m === 'llama3.3-70b' || m === 'llama-3.3-70b-versatile') {
      return 'llama-3.3-70b-versatile';
    }
    if (m === 'llama-3.1-70b' || m === 'llama-3.1-70b-versatile') {
      return 'llama-3.1-70b-versatile';
    }
    return m || 'llama-3.3-70b-versatile';
  } else if (provider === 'deepseek') {
    if (m === 'chat' || m === 'v3' || m === 'deepseek-v3' || m === 'deepseek-chat') return 'deepseek-chat';
    if (m === 'reasoner' || m === 'r1' || m === 'deepseek-r1' || m === 'deepseek-reasoner') return 'deepseek-reasoner';
    return m || 'deepseek-chat';
  } else {
    if (m === '4o-mini' || m === 'gpt4o-mini') return 'gpt-4o-mini';
    if (m === '4o' || m === 'gpt4o') return 'gpt-4o';
  }
  return m;
}

/**
 * Helper to select the best available model from a list of live models
 */
function selectBestModel(availableModels: string[], provider: string, failedModels: string[] = []): string {
  const isFailed = (name: string) => {
    const clean = name.toLowerCase().replace(/^models\//, '');
    return failedModels.some(f => {
      const cleanF = f.toLowerCase().replace(/^models\//, '');
      return cleanF === clean;
    });
  };
  const candidates = (availableModels || [])
    .map(m => m.replace(/^models\//, ''))
    .filter(m => !isFailed(m));

  if (provider === 'gemini') {
    const validCandidates = candidates.filter(m => {
      const l = m.toLowerCase();
      return !l.includes('2.5') && !l.includes('preview') && !l.includes('lite') && !l.includes('discontinued') && !l.includes('deprecated');
    });

    if (validCandidates.length === 0) {
      if (!isFailed('gemini-1.5-flash')) return 'gemini-1.5-flash';
      if (!isFailed('gemini-2.0-flash')) return 'gemini-2.0-flash';
      if (!isFailed('gemini-1.5-pro')) return 'gemini-1.5-pro';
      return 'gemini-1.5-flash';
    }
    // 1. Gemini 1.5 Flash (Super fast, 1M context, reliable free tier)
    const flash15 = validCandidates.find(m => m === 'gemini-1.5-flash' || m.includes('1.5-flash'));
    if (flash15) return flash15;

    // 2. Gemini 2.0 Flash
    const flash20 = validCandidates.find(m => m === 'gemini-2.0-flash' || m.includes('2.0-flash'));
    if (flash20) return flash20;

    // 3. Gemini 1.5 Pro
    const pro15 = validCandidates.find(m => m === 'gemini-1.5-pro' || m.includes('1.5-pro'));
    if (pro15) return pro15;

    return validCandidates[0] || 'gemini-1.5-flash';
  }

  if (provider === 'deepseek') {
    const chat = candidates.find(m => m === 'deepseek-chat' || m.includes('chat'));
    if (chat) return chat;
    const reasoner = candidates.find(m => m === 'deepseek-reasoner' || m.includes('reasoner'));
    if (reasoner) return reasoner;
    return candidates[0] || 'deepseek-chat';
  }

  if (candidates.length === 0) {
    if (provider === 'groq') {
      if (!isFailed('llama-3.3-70b-versatile')) return 'llama-3.3-70b-versatile';
      if (!isFailed('llama-3.1-70b-versatile')) return 'llama-3.1-70b-versatile';
      if (!isFailed('llama3-70b-8192')) return 'llama3-70b-8192';
      if (!isFailed('llama-3.1-8b-instant')) return 'llama-3.1-8b-instant';
      return 'llama-3.3-70b-versatile';
    } else {
      if (!isFailed('gpt-4o-mini')) return 'gpt-4o-mini';
      if (!isFailed('gpt-4o')) return 'gpt-4o';
      return 'gpt-4o-mini';
    }
  }

  if (provider === 'groq') {
    // 1. Meta Llama 3.3 70B (State of the art reasoning, 70B parameters, perfect multilingual & native function calling)
    const llama33_70b = candidates.find(m => m.includes('llama-3.3-70b'));
    if (llama33_70b) return llama33_70b;

    // 2. Meta Llama 3.1 70B (Native function calling & 128k context)
    const llama31_70b = candidates.find(m => m.includes('llama-3.1-70b') && !m.includes('instant'));
    if (llama31_70b) return llama31_70b;

    // 3. Meta Llama 3 70B
    const llama3_70b = candidates.find(m => m.includes('llama3-70b') || m.includes('llama-3-70b'));
    if (llama3_70b) return llama3_70b;

    // 4. Any dedicated tool-use model
    const toolUse = candidates.find(m => m.includes('tool-use'));
    if (toolUse) return toolUse;

    // 5. Meta Llama 3.1 8B instant (Fallback for lightweight queries)
    const llama8b = candidates.find(m => m.includes('llama-3.1-8b') || m.includes('llama-3-8b'));
    if (llama8b) return llama8b;

    // 6. Any Llama 3 instruct model (excluding guard/vision)
    const anyLlama = candidates.find(m => m.toLowerCase().includes('llama-3') && !m.includes('guard') && !m.includes('vision'));
    if (anyLlama) return anyLlama;

    return candidates[0] || 'llama-3.3-70b-versatile';
  } else {
    // Priority order for OpenAI models:
    const gpt4oMini = candidates.find(m => m === 'gpt-4o-mini' || m.includes('gpt-4o-mini'));
    if (gpt4oMini) return gpt4oMini;

    const gpt4o = candidates.find(m => m === 'gpt-4o' || m.startsWith('gpt-4o-'));
    if (gpt4o) return gpt4o;

    const gpt4Turbo = candidates.find(m => m.includes('gpt-4-turbo'));
    if (gpt4Turbo) return gpt4Turbo;

    const gpt35 = candidates.find(m => m.includes('gpt-3.5-turbo'));
    if (gpt35) return gpt35;

    return candidates[0] || 'gpt-4o-mini';
  }
}

// Endpoint to test AI API Key connection (Google Gemini, Groq Cloud, DeepSeek, or OpenAI)
app.post('/api/ai/test-key', async (req, res) => {
  try {
    const { apiKey, provider } = req.body;
    const testKey = (apiKey || '').trim();
    if (!testKey) {
      return res.status(400).json({ success: false, error: 'API key is required.' });
    }

    const isGemini = provider === 'gemini' || testKey.startsWith('AIzaSy');
    const isGroq = provider === 'groq' || testKey.startsWith('gsk_');
    const isDeepSeek = provider === 'deepseek';

    let endpoint = 'https://api.groq.com/openai/v1/models';
    let providerLabel = 'Groq Cloud (Meta Llama)';
    if (isGemini) {
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/models';
      providerLabel = 'Google Gemini (Google AI Studio)';
    } else if (isGroq) {
      endpoint = 'https://api.groq.com/openai/v1/models';
      providerLabel = 'Groq Cloud (Meta Llama)';
    } else if (isDeepSeek) {
      endpoint = 'https://api.deepseek.com/models';
      providerLabel = 'DeepSeek (DeepSeek-V3 / R1)';
    } else {
      endpoint = 'https://api.openai.com/v1/models';
      providerLabel = 'OpenAI';
    }

    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${testKey}` }
    });
    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({}));
      const rawErrMsg = extractApiErrorMessage(errData);
      return res.status(400).json({ 
        success: false, 
        error: rawErrMsg || `Invalid API key or unauthorized by ${providerLabel}.` 
      });
    }

    const data: any = await response.json();
    const allModels: string[] = Array.isArray(data.data) ? data.data.map((m: any) => (m.id || '').replace(/^models\//, '')) : [];
    const nonChatKeywords = ['whisper', 'embedding', 'tts', 'dall-e', 'moderation', 'bdr', 'guard', 'text-embedding', 'imagen', 'aqa', '2.5', 'preview', 'lite'];
    let chatModels = allModels.filter((id: string) => {
      const lower = id.toLowerCase();
      return !nonChatKeywords.some(kw => lower.includes(kw));
    });

    if (isGemini && chatModels.length === 0) {
      chatModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    }
    if (isDeepSeek && chatModels.length === 0) {
      chatModels = ['deepseek-chat', 'deepseek-reasoner'];
    }

    const resolvedProvider = isGemini ? 'gemini' : (isGroq ? 'groq' : (isDeepSeek ? 'deepseek' : 'openai'));
    const recommendedModel = selectBestModel(chatModels, resolvedProvider);

    res.json({ 
      success: true, 
      provider: resolvedProvider,
      message: `${providerLabel} API Key verified successfully! Connection established with ${chatModels.length} active models.`,
      models: chatModels,
      recommendedModel
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Connection test failed.' });
  }
});

// Endpoint to fetch currently accessible models based on saved settings
app.get('/api/ai/models', async (req, res) => {
  try {
    const [settingsRows]: any = await db.query(
      "SELECT id, val FROM settings WHERE id IN ('ai_provider', 'gemini_api_key', 'gemini_model', 'groq_api_key', 'groq_model', 'openai_api_key', 'openai_model', 'deepseek_api_key', 'deepseek_model')"
    );
    const settingsMap = settingsRows.reduce((acc: any, r: any) => ({ ...acc, [r.id]: r.val }), {});
    
    const geminiKey = (settingsMap.gemini_api_key || process.env.GEMINI_API_KEY || '').trim();
    const groqKey = (settingsMap.groq_api_key || process.env.GROQ_API_KEY || '').trim();
    const openAiKey = (settingsMap.openai_api_key || process.env.OPENAI_API_KEY || '').trim();
    const deepseekKey = (settingsMap.deepseek_api_key || process.env.DEEPSEEK_API_KEY || '').trim();

    let provider = (settingsMap.ai_provider || (geminiKey ? 'gemini' : (groqKey ? 'groq' : (deepseekKey ? 'deepseek' : 'gemini')))).trim();

    let apiKey = '';
    if (provider === 'gemini') {
      apiKey = geminiKey || groqKey || deepseekKey || openAiKey;
      if (!geminiKey && groqKey) provider = 'groq';
      else if (!geminiKey && deepseekKey) provider = 'deepseek';
      else if (!geminiKey && openAiKey) provider = 'openai';
    } else if (provider === 'groq') {
      apiKey = groqKey || geminiKey || deepseekKey || openAiKey;
      if (!groqKey && geminiKey) provider = 'gemini';
      else if (!groqKey && deepseekKey) provider = 'deepseek';
      else if (!groqKey && openAiKey) provider = 'openai';
    } else if (provider === 'deepseek') {
      apiKey = deepseekKey || geminiKey || groqKey || openAiKey;
      if (!deepseekKey && geminiKey) provider = 'gemini';
      else if (!deepseekKey && groqKey) provider = 'groq';
      else if (!deepseekKey && openAiKey) provider = 'openai';
    } else {
      apiKey = openAiKey || deepseekKey || geminiKey || groqKey;
      if (!openAiKey && deepseekKey) provider = 'deepseek';
      else if (!openAiKey && geminiKey) provider = 'gemini';
      else if (!openAiKey && groqKey) provider = 'groq';
    }

    if (!apiKey) {
      return res.json({ success: false, error: 'No API key configured in settings.' });
    }

    const models = await fetchProviderModels(provider, apiKey);
    const recommendedModel = selectBestModel(models, provider);
    const currentModel = provider === 'gemini' 
      ? normalizeModelName(settingsMap.gemini_model || recommendedModel, 'gemini')
      : (provider === 'groq' 
          ? normalizeModelName(settingsMap.groq_model || recommendedModel, 'groq') 
          : (provider === 'deepseek'
              ? normalizeModelName(settingsMap.deepseek_model || recommendedModel, 'deepseek')
              : normalizeModelName(settingsMap.openai_model || recommendedModel, 'openai')));

    res.json({
      success: true,
      provider,
      currentModel,
      recommendedModel,
      models
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Primary AI Chat Completion endpoint with Tools / Function Calling (Gemini, Groq & OpenAI)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;

    // 1. Retrieve AI Settings from Database
    const [settingsRows]: any = await db.query(
      "SELECT id, val FROM settings WHERE id IN ('ai_provider', 'gemini_api_key', 'gemini_model', 'groq_api_key', 'groq_model', 'openai_api_key', 'openai_model', 'deepseek_api_key', 'deepseek_model', 'openai_system_instructions', 'ai_enabled')"
    );
    const settingsMap = settingsRows.reduce((acc: any, r: any) => ({ ...acc, [r.id]: r.val }), {});

    const aiEnabled = settingsMap.ai_enabled !== 'false';
    if (!aiEnabled) {
      return res.status(403).json({ 
        success: false, 
        error: 'AI Assistant is currently disabled in Variable Settings.' 
      });
    }

    const geminiKey = (settingsMap.gemini_api_key || process.env.GEMINI_API_KEY || '').trim();
    const groqKey = (settingsMap.groq_api_key || process.env.GROQ_API_KEY || '').trim();
    const openAiKey = (settingsMap.openai_api_key || process.env.OPENAI_API_KEY || '').trim();
    const deepseekKey = (settingsMap.deepseek_api_key || process.env.DEEPSEEK_API_KEY || '').trim();
    let provider = (settingsMap.ai_provider || (geminiKey ? 'gemini' : (groqKey ? 'groq' : (deepseekKey ? 'deepseek' : 'gemini')))).trim();

    // Auto-detect provider if user entered a Gemini key (starts with AIzaSy), Groq key (starts with gsk_), DeepSeek, or OpenAI key
    let apiKey = '';
    if (provider === 'gemini') {
      apiKey = geminiKey;
      if (!apiKey && groqKey) {
        provider = 'groq';
        apiKey = groqKey;
      } else if (!apiKey && deepseekKey) {
        provider = 'deepseek';
        apiKey = deepseekKey;
      } else if (!apiKey && openAiKey) {
        provider = 'openai';
        apiKey = openAiKey;
      }
    } else if (provider === 'groq') {
      apiKey = groqKey;
      if (!apiKey && geminiKey) {
        provider = 'gemini';
        apiKey = geminiKey;
      } else if (!apiKey && deepseekKey) {
        provider = 'deepseek';
        apiKey = deepseekKey;
      } else if (!apiKey && openAiKey) {
        provider = 'openai';
        apiKey = openAiKey;
      }
    } else if (provider === 'deepseek') {
      apiKey = deepseekKey;
      if (!apiKey && geminiKey) {
        provider = 'gemini';
        apiKey = geminiKey;
      } else if (!apiKey && groqKey) {
        provider = 'groq';
        apiKey = groqKey;
      } else if (!apiKey && openAiKey) {
        provider = 'openai';
        apiKey = openAiKey;
      }
    } else {
      apiKey = openAiKey;
      if (!apiKey && deepseekKey) {
        provider = 'deepseek';
        apiKey = deepseekKey;
      } else if (!apiKey && geminiKey) {
        provider = 'gemini';
        apiKey = geminiKey;
      } else if (!apiKey && groqKey) {
        provider = 'groq';
        apiKey = groqKey;
      }
    }

    // Auto-detect if key prefix doesn't match selected provider
    if (apiKey.startsWith('AIzaSy')) provider = 'gemini';
    else if (apiKey.startsWith('gsk_')) provider = 'groq';
    else if (provider !== 'deepseek' && apiKey.startsWith('sk-') && !deepseekKey) provider = 'openai';

    if (!apiKey) {
      return res.json({
        success: false,
        missingKey: true,
        reply: 'AI API Key එක තවමත් සකසා නැත. කරුණාකර **Admin > Variable Settings** වෙත ගොස් නොමිලේ **Google Gemini**, **Groq Cloud**, නැතහොත් **DeepSeek** API Key එකක් ඇතුළත් කර Save කරන්න.'
      });
    }

    const isGemini = provider === 'gemini' || apiKey.startsWith('AIzaSy');
    const isGroq = provider === 'groq' || apiKey.startsWith('gsk_');
    const isDeepSeek = provider === 'deepseek';

    let endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    if (isGemini) {
      endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    } else if (isGroq) {
      endpointUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (isDeepSeek) {
      endpointUrl = 'https://api.deepseek.com/chat/completions';
    } else {
      endpointUrl = 'https://api.openai.com/v1/chat/completions';
    }

    let activeModelName = '';
    if (isGemini) {
      activeModelName = normalizeModelName((settingsMap.gemini_model || 'gemini-1.5-flash').trim(), 'gemini');
      if (activeModelName.includes('2.5') || activeModelName.includes('preview') || activeModelName.includes('lite') || !activeModelName) {
        activeModelName = 'gemini-1.5-flash';
        db.query("UPDATE settings SET val = 'gemini-1.5-flash' WHERE id = 'gemini_model'").catch(() => {});
      }
    } else if (isGroq) {
      activeModelName = normalizeModelName((settingsMap.groq_model || 'llama-3.3-70b-versatile').trim(), 'groq');
      // If setting is 8b or empty, upgrade immediately to 70b-versatile to eliminate token repetition loops on Sinhala/English
      if (activeModelName.includes('8b') || !activeModelName) {
        activeModelName = 'llama-3.3-70b-versatile';
        db.query("UPDATE settings SET val = 'llama-3.3-70b-versatile' WHERE id = 'groq_model'").catch(() => {});
      }
    } else if (isDeepSeek) {
      activeModelName = normalizeModelName((settingsMap.deepseek_model || 'deepseek-chat').trim(), 'deepseek');
    } else {
      activeModelName = normalizeModelName((settingsMap.openai_model || 'gpt-4o-mini').trim(), 'openai');
      if (activeModelName.includes('luna') || !activeModelName) {
        activeModelName = 'gpt-4o-mini';
        db.query("UPDATE settings SET val = 'gpt-4o-mini' WHERE id = 'openai_model'").catch(() => {});
      }
    }

    console.log(`[Rex AI Chat] Request initiated. Provider: ${provider}, Model: ${activeModelName}, Key: ${apiKey.slice(0, 6)}...`);

    const baseSystemPrompt = `You are Rex AI, the official, highly intelligent real-time ERP AI assistant for Rex Industries (Pvt) Ltd, Sri Lanka - an engineering, precision CNC machining, hydraulics, and metal fabrication company.
You assist managers, engineers, and factory staff by answering queries accurately in the exact language the user speaks.

CRITICAL OPERATIONAL RULES:
1. ALWAYS USE FUNCTION CALLING (NEVER WRITE RAW SQL):
   You have live real-time access to the entire Rex ERP database through your function calling tools.
   To retrieve data, you MUST call the appropriate tool ('get_item_purchase_prices', 'check_inventory_stock', 'get_customer_finance_summary', 'get_supplier_history', etc.).
   NEVER write raw SQL queries like "SELECT ... FROM ..." in your response text to the user.
   NEVER say "If I were connected to the database" or "As an AI I cannot check real-time data". Call the tools silently and summarize the findings in natural language.
2. ITEM PRICES & INVENTORY:
   In Rex ERP, items have TWO prices:
   • Selling Price (විකුණුම් මිල / unitPrice): The price charged to customers.
   • Purchase / Cost Price (ගැනුම් / පිරිවැය මිල / unitCost): The cost to purchase or manufacture.
   Whenever asked about the price, cost, stock, or suppliers of ANY item, product, or SKU, ALWAYS call 'get_item_purchase_prices' and clearly state BOTH prices in Sri Lankan Rupees (Rs. / LKR), current warehouse stock quantity, and storage location.
3. NEVER DUMP DATABASE SCHEMAS OR WRITE TEXT-TO-SQL:
   NEVER output raw table schemas, column listings, or database structure dumps. Users are business managers and factory operators who only want answers about their actual products, prices, and orders.
4. ACCURATE SUPPLIER INFORMATION:
   When asked about suppliers for an item, check linkedSuppliers in the inventory record, historical purchases from suppliers, and the registered suppliers master list. If an item has no supplier linked yet, state clearly that it is not yet linked and list the active suppliers in the ERP.
5. STRICT LANGUAGE CONSISTENCY & NATURAL TONE:
   • If the user asks in ENGLISH (e.g. "sample item price please?", "what are the suppliers for sample item"), reply ONLY in fluent, professional ENGLISH.
   • If the user asks in SINGLISH (e.g. "sample item eke mila kiyada", "stock eka pennanna", "machan"), reply in natural Singlish or English.
   • If the user asks in SINHALA SCRIPT (Unicode, e.g. "භාණ්ඩයේ මිල කීයද?"), reply in clear, grammatically sound Sinhala script.
   • NEVER output random repeated syllables or word loops. Always output clean, friendly markdown formatting.`;

    const systemPrompt = settingsMap.openai_system_instructions && settingsMap.openai_system_instructions.trim()
      ? `${baseSystemPrompt}\n\nADDITIONAL ADMIN INSTRUCTIONS:\n${settingsMap.openai_system_instructions.trim()}`
      : baseSystemPrompt;

    const systemMessage = {
      role: 'system',
      content: `${systemPrompt}\n\nToday's Date: ${new Date().toISOString().split('T')[0]}`
    };

    const conversation: any[] = [systemMessage, ...messages.slice(-10)];

    const cleanApiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    // Helper for chat completions with timeout safety and repetition penalty
    const callCompletion = async (model: string, msgs: any[], tools?: any[]) => {
      const bodyPayload: any = {
        model,
        messages: msgs,
        temperature: 0.3,
        max_tokens: 1500
      };
      if (!isGemini) {
        bodyPayload.frequency_penalty = 0.5;
        bodyPayload.presence_penalty = 0.2;
      }
      if (tools && tools.length > 0) {
        bodyPayload.tools = tools;
        bodyPayload.tool_choice = 'auto';
      }
      return fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(24000)
      });
    };

    const failedModelsList: string[] = [];
    let aiRes: any = null;
    try {
      aiRes = await callCompletion(activeModelName, conversation, AI_TOOLS);
    } catch (e: any) {
      console.warn(`[Rex AI Engine] Initial call timed out or failed on '${activeModelName}':`, e.message);
      // Fallback to gemini-1.5-flash without tools
      aiRes = await callCompletion('gemini-1.5-flash', conversation).catch(() => null);
    }

    if (!aiRes || !aiRes.ok) {
      let errJson: any = aiRes ? await aiRes.json().catch(() => ({})) : {};
      let errMsg = extractApiErrorMessage(errJson).toLowerCase();

      // If initial tool-enabled request failed with 400 (e.g. strict schema rejection by Gemini or tool format issue), retry immediately without tools
      if (aiRes.status === 400 || errMsg.includes('tool') || errMsg.includes('argument') || errMsg.includes('schema') || errMsg.includes('function')) {
        console.warn(`[Rex AI Engine] Tool or schema rejection on '${activeModelName}' (HTTP ${aiRes.status}: ${errMsg}). Retrying without tools...`);
        aiRes = await callCompletion(activeModelName, conversation);
        if (aiRes.ok) {
          errJson = {};
          errMsg = '';
        } else {
          errJson = await aiRes.json().catch(() => ({}));
          errMsg = extractApiErrorMessage(errJson).toLowerCase();
        }
      }

      // Check for Rate Limit or High Demand / Spikes (HTTP 429 / 503 / TPM limit)
      const isRateLimited = 
        aiRes?.status === 429 || 
        aiRes?.status === 503 || 
        errJson?.error?.code === 'rate_limit_exceeded' || 
        errMsg.includes('rate limit') || 
        errMsg.includes('high demand') || 
        errMsg.includes('spikes in demand') || 
        errMsg.includes('temporarily') || 
        errMsg.includes('overloaded') || 
        errMsg.includes('capacity') || 
        errMsg.includes('tokens per minute') ||
        errMsg.includes('tpm');

      if (isRateLimited) {
        console.warn(`[Rex AI Engine] Rate limit encountered on '${activeModelName}' (${errMsg}).`);
        failedModelsList.push(activeModelName);

        if (activeModelName.includes('gpt-oss')) {
          console.log(`[Rex AI Engine] Model '${activeModelName}' has strict 8k TPM limit. Auto-migrating to high-capacity model...`);
          const liveModels = await fetchProviderModels(provider, cleanApiKey);
          const resolvedModel = selectBestModel(liveModels, provider, failedModelsList);
          if (resolvedModel && resolvedModel !== activeModelName) {
            activeModelName = resolvedModel;
            const modelSettingKey = isGemini ? 'gemini_model' : (isGroq ? 'groq_model' : 'openai_model');
            db.query(`UPDATE settings SET val = ? WHERE id = ?`, [activeModelName, modelSettingKey]).catch(() => {});
            aiRes = await callCompletion(activeModelName, conversation, AI_TOOLS);
          }
        } else {
          const waitMatch = errMsg.match(/try again in ([0-9.]+)\s*s/i);
          const waitSecs = (waitMatch && waitMatch[1]) ? parseFloat(waitMatch[1]) : 2;
          if (waitSecs <= 4) {
            console.log(`[Rex AI Engine] Waiting ${waitSecs}s for rate limit reset...`);
            await new Promise(r => setTimeout(r, Math.ceil(waitSecs * 1000) + 300));
            aiRes = await callCompletion(activeModelName, conversation, AI_TOOLS);
          }

          if (!aiRes.ok) {
            console.log(`[Rex AI Engine] Looking for alternative model due to rate limit...`);
            const liveModels = await fetchProviderModels(provider, cleanApiKey);
            const resolvedModel = selectBestModel(liveModels, provider, failedModelsList);
            if (resolvedModel && resolvedModel !== activeModelName) {
              console.log(`[Rex AI Engine] Auto-switching from rate-limited model '${activeModelName}' to available alternative '${resolvedModel}'...`);
              activeModelName = resolvedModel;
              const modelSettingKey = isGemini ? 'gemini_model' : (isGroq ? 'groq_model' : 'openai_model');
              db.query(`UPDATE settings SET val = ? WHERE id = ?`, [activeModelName, modelSettingKey]).catch(() => {});
              aiRes = await callCompletion(activeModelName, conversation, AI_TOOLS);
            }
          }
        }
      }

      if (!aiRes.ok) {
        if (!errMsg) {
          errJson = await aiRes.json().catch(() => errJson);
          errMsg = extractApiErrorMessage(errJson).toLowerCase();
        }
        const isModelNotFound = 
          aiRes.status === 404 || 
          aiRes.status === 400 ||
          errJson.error?.code === 'model_not_found' || 
          errJson.error?.code === 'model_decommissioned' ||
          errMsg.includes('does not exist') || 
          errMsg.includes('not have access') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('not available') ||
          errMsg.includes('update your code') ||
          errMsg.includes('is no longer') ||
          errMsg.includes('deprecated') ||
          errMsg.includes('decommissioned');

        if (isModelNotFound) {
          failedModelsList.push(activeModelName);
          failedModelsList.push(activeModelName.replace(/^models\//, ''));
          failedModelsList.push('models/' + activeModelName.replace(/^models\//, ''));
          if (activeModelName.includes('2.5')) {
            failedModelsList.push('models/gemini-2.5-pro', 'gemini-2.5-pro');
          }
          console.warn(`[Rex AI Engine] Model '${activeModelName}' not accessible (${errMsg}). Querying ${provider} live model list...`);
          const liveModels = await fetchProviderModels(provider, cleanApiKey);
          console.log(`[Rex AI Engine] Live models available for this key:`, liveModels);
          const resolvedModel = selectBestModel(liveModels, provider, failedModelsList);
          console.log(`[Rex AI Engine] Dynamically routing to verified alternative model: '${resolvedModel}'`);
          activeModelName = resolvedModel;

          // Asynchronously update DB settings with the verified working model
          const modelSettingKey = isGemini ? 'gemini_model' : (isGroq ? 'groq_model' : 'openai_model');
          db.query(
            "INSERT INTO settings (id, val) VALUES (?, ?) ON DUPLICATE KEY UPDATE val=?",
            [modelSettingKey, activeModelName, activeModelName]
          ).catch((e: any) => console.error('[Rex AI] Failed to save updated model to DB:', e.message));

          aiRes = await callCompletion(activeModelName, conversation, AI_TOOLS);

          // If tool call fails with this resolved model, retry without tools
          if (!aiRes.ok) {
            aiRes = await callCompletion(activeModelName, conversation);
          }
        }
      }

      // Check for Tool Calling not supported error
      if (!aiRes.ok) {
        const isToolUnsupported = 
          errMsg.includes('tool calling is not supported') || 
          errMsg.includes('tool use is not supported') || 
          errMsg.includes('tools are not supported');

        if (isToolUnsupported) {
          console.warn(`[Rex AI Engine] Model '${activeModelName}' does not support tools (${errMsg}). Retrying without tools...`);
          aiRes = await callCompletion(activeModelName, conversation);
        }
      }

      // Safe conversational fallback without tools if tool calls failed
      if (!aiRes.ok) {
        console.warn(`[Rex AI Engine] Retrying with model '${activeModelName}' without tools as safe conversational fallback...`);
        aiRes = await callCompletion(activeModelName, conversation);
      }

      if (!aiRes.ok) {
        const fallbackErr: any = await aiRes.json().catch(() => errJson);
        console.error(`${provider} AI Error:`, fallbackErr);
        const rawErr = extractApiErrorMessage(fallbackErr) || `${provider} API request failed`;
        let userFriendlyMsg = rawErr;
        const provLabel = isGemini ? 'Google Gemini' : (isGroq ? 'Groq Cloud' : 'OpenAI');
        const lowerRaw = rawErr.toLowerCase();
        if (lowerRaw.includes('does not exist') || lowerRaw.includes('not have access') || lowerRaw.includes('not found') || lowerRaw.includes('model')) {
          userFriendlyMsg = `${provLabel} Model Access Error ('${activeModelName}'): ${rawErr}. කරුණාකර Admin > Variable Settings වෙත ගොස් ඔබගේ ${provLabel} API Key එක ඇතුළත් කර 'Test Connection' ඔබා Save කරන්න.`;
        } else if (lowerRaw.includes('invalid api key') || lowerRaw.includes('unauthorized') || lowerRaw.includes('valid api key') || lowerRaw.includes('unauthenticated') || aiRes.status === 401) {
          userFriendlyMsg = `${provLabel} API Key Error (${rawErr}). කරුණාකර Admin > Variable Settings වෙත ගොස් ඔබගේ නිවැරදි ${provLabel} API Key එක ඇතුළත් කර Save කරන්න.`;
        }
        return res.json({
          success: false,
          error: userFriendlyMsg,
          model: activeModelName
        });
      }
    }

    const aiData: any = await aiRes.json();
    const choice = aiData.choices?.[0];
    let responseMsg = choice?.message;

    if (!responseMsg) {
      return res.json({ success: false, error: `Empty response from ${provider}` });
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const lastUserLower = lastUserMsg.toLowerCase();
    const isAskingPriceOrStock = /\b(price|pricing|prices|cost|costs|rate|rates|mila|ganan|kiyada|stock|stocks|supplier|suppliers|sample|inventory)\b/i.test(lastUserLower);
    const userSpeaksEng = isEnglishPrompt(lastUserMsg);

    let lastExecutedToolResult: any = null;

    // Auto-intercept if model printed a raw SQL query, schema dump, or hallucinated database refusal instead of calling a tool
    if (!responseMsg.tool_calls || responseMsg.tool_calls.length === 0) {
      const contentText = (responseMsg.content || '').trim();

      if (isRawSql(contentText)) {
        const sqlMatch = contentText.match(/\b(SELECT\s+[\s\S]+?\bFROM\b[\s\S]+?)(?:;|\n\n|```|$)/i);
        const queryToExec = (sqlMatch ? sqlMatch[1] : contentText).replace(/```sql|```/gi, '').trim();
        console.log(`[Rex AI Engine] Intercepted raw SQL query in model text: "${queryToExec}". Auto-executing on database...`);
        const toolResult = await executeAITool('execute_custom_erp_query', { query: queryToExec });
        lastExecutedToolResult = toolResult;

        let synthesized = false;
        conversation.push({ role: 'assistant', content: responseMsg.content });
        conversation.push({
          role: 'user',
          content: `Live database query execution results: ${JSON.stringify(toolResult.results || toolResult)}. Summarize the Selling Price, Purchase Cost, current stock, and SKU directly to the user in fluent ${userSpeaksEng ? 'ENGLISH' : 'Sinhala/English'}. NEVER output raw SQL queries or table column definitions.`
        });
        const autoSynthRes = await callCompletion(activeModelName, conversation).catch(() => null);
        if (autoSynthRes && autoSynthRes.ok) {
          const autoData = await autoSynthRes.json().catch(() => ({}));
          const synthText = autoData.choices?.[0]?.message?.content || '';
          if (synthText && !isRawSql(synthText) && !isSchemaDump(synthText) && !hasTokenRepetitionLoop(synthText)) {
            responseMsg = autoData.choices[0].message;
            synthesized = true;
          }
        }

        if (!synthesized) {
          console.log(`[Rex AI Engine] Synthesis failed or generated SQL. Formatting database rows deterministically...`);
          const rows = Array.isArray(toolResult.results) ? toolResult.results : [];
          if (rows.length > 0) {
            responseMsg = {
              role: 'assistant',
              content: formatDbResultsAsMarkdown(rows, userSpeaksEng, lastUserMsg)
            };
          } else {
            const itemSearch = cleanItemSearchTerm(lastUserMsg);
            const priceRes = await executeAITool('get_item_purchase_prices', { query: itemSearch || 'sample' });
            lastExecutedToolResult = priceRes;
            const invRows = priceRes.matchedInventory || [];
            responseMsg = {
              role: 'assistant',
              content: formatDbResultsAsMarkdown(invRows, userSpeaksEng, lastUserMsg)
            };
          }
        }
      } else if (isSchemaDump(contentText) || hasTokenRepetitionLoop(contentText)) {
        console.log(`[Rex AI Engine] Intercepted schema dump or repetition loop in response. Auto-retrieving live ERP records for: "${lastUserMsg}"...`);
        const itemSearch = cleanItemSearchTerm(lastUserMsg);
        const toolResult = await executeAITool('get_item_purchase_prices', { query: itemSearch || 'sample item' });
        lastExecutedToolResult = toolResult;
        conversation.push({ role: 'assistant', content: responseMsg.content });
        conversation.push({
          role: 'user',
          content: `Real-time database records for "${lastUserMsg}": ${JSON.stringify(toolResult)}. DO NOT dump database schema and do NOT repeat syllables. Directly state the Selling Price (unitPrice), Purchase/Cost Price (unitCost), and warehouse stock to the user in fluent ${userSpeaksEng ? 'ENGLISH' : 'Sinhala/Singlish'}.`
        });
        const autoSynthRes = await callCompletion(activeModelName, conversation).catch(() => null);
        let synthesized = false;
        if (autoSynthRes && autoSynthRes.ok) {
          const autoData = await autoSynthRes.json().catch(() => ({}));
          const synthText = autoData.choices?.[0]?.message?.content || '';
          if (synthText && !isRawSql(synthText) && !isSchemaDump(synthText) && !hasTokenRepetitionLoop(synthText)) {
            responseMsg = autoData.choices[0].message;
            synthesized = true;
          }
        }
        if (!synthesized) {
          responseMsg = {
            role: 'assistant',
            content: formatDbResultsAsMarkdown(toolResult.matchedInventory || [], userSpeaksEng, lastUserMsg)
          };
        }
      } else if (isAskingPriceOrStock && (contentText.includes('If I were connected') || contentText.includes('cannot check real-time') || !/\b(Rs\.?|LKR|\d+[\d,]*\.\d{2})\b/i.test(contentText))) {
        console.log(`[Rex AI Engine] Detected unfulfilled price/stock query. Auto-executing get_item_purchase_prices for: "${lastUserMsg}"...`);
        const itemSearch = cleanItemSearchTerm(lastUserMsg);
        const toolResult = await executeAITool('get_item_purchase_prices', { query: itemSearch || 'sample item' });
        lastExecutedToolResult = toolResult;
        conversation.push({ role: 'assistant', content: responseMsg.content });
        conversation.push({
          role: 'user',
          content: `Live database results for item lookup: ${JSON.stringify(toolResult)}. Please state the exact Selling Price (unitPrice), Purchase/Cost Price (unitCost), and current warehouse stock directly to the user in fluent ${userSpeaksEng ? 'ENGLISH' : 'Sinhala/English'}.`
        });
        const autoSynthRes = await callCompletion(activeModelName, conversation).catch(() => null);
        let synthesized = false;
        if (autoSynthRes && autoSynthRes.ok) {
          const autoData = await autoSynthRes.json().catch(() => ({}));
          const synthText = autoData.choices?.[0]?.message?.content || '';
          if (synthText && !isRawSql(synthText) && !isSchemaDump(synthText) && !hasTokenRepetitionLoop(synthText)) {
            responseMsg = autoData.choices[0].message;
            synthesized = true;
          }
        }
        if (!synthesized) {
          responseMsg = {
            role: 'assistant',
            content: formatDbResultsAsMarkdown(toolResult.matchedInventory || [], userSpeaksEng, lastUserMsg)
          };
        }
      } else if (contentText.includes('If I were connected') || contentText.includes('As an AI assistant, I need to query') || contentText.includes('I cannot directly access')) {
        console.log(`[Rex AI Engine] Model hallucinated refusal to query live DB. Re-prompting for tool execution...`);
        conversation.push({ role: 'assistant', content: responseMsg.content });
        conversation.push({
          role: 'user',
          content: 'You DO have live database access. Please invoke execute_custom_erp_query or the appropriate specialized tool now to retrieve the exact data and answer my question.'
        });
        const retryRes = await callCompletion(activeModelName, conversation, AI_TOOLS).catch(() => null);
        if (retryRes && retryRes.ok) {
          const retryData = await retryRes.json().catch(() => ({}));
          if (retryData.choices?.[0]?.message) {
            responseMsg = retryData.choices[0].message;
          }
        }
      }
    }

    // Process Tool Calls if model requested ERP data
    let turns = 0;
    while (responseMsg.tool_calls && responseMsg.tool_calls.length > 0 && turns < 4) {
      turns++;
      conversation.push(responseMsg);

      for (const toolCall of responseMsg.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch(e) {}

        const toolResult = await executeAITool(functionName, functionArgs);
        lastExecutedToolResult = toolResult;
        conversation.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(toolResult)
        });
      }

      // Follow-up request: do not pass tools so model is forced to synthesize natural language answer
      let followUpRes: any = null;
      try {
        followUpRes = await callCompletion(activeModelName, conversation, undefined);
      } catch (err: any) {
        console.warn(`[Rex AI] Follow-up turn timed out or failed on '${activeModelName}':`, err.message);
        conversation.push({
          role: 'user',
          content: 'Please summarize and explain the retrieved data directly to the user in fluent Sinhala/English based on the tool results above.'
        });
        followUpRes = await callCompletion('gemini-1.5-flash', conversation).catch(() => null);
      }

      if (!followUpRes || !followUpRes.ok) {
        let errJson: any = followUpRes ? await followUpRes.json().catch(() => ({})) : {};
        let errMsg = extractApiErrorMessage(errJson).toLowerCase();

        if (followUpRes?.status === 429 || followUpRes?.status === 503 || errMsg.includes('rate limit') || errMsg.includes('high demand') || errMsg.includes('spikes in demand')) {
          console.warn(`[Rex AI] High demand or rate limit on follow-up turn (${errMsg}).`);
          const liveModels = await fetchProviderModels(provider, cleanApiKey);
          const resolvedModel = selectBestModel(liveModels, provider, [activeModelName]);
          if (resolvedModel && resolvedModel !== activeModelName) {
            console.log(`[Rex AI Engine] Auto-switching follow-up from '${activeModelName}' to '${resolvedModel}'...`);
            activeModelName = resolvedModel;
            const modelSettingKey = isGemini ? 'gemini_model' : (isGroq ? 'groq_model' : 'openai_model');
            db.query(`UPDATE settings SET val = ? WHERE id = ?`, [activeModelName, modelSettingKey]).catch(() => {});
            followUpRes = await callCompletion(activeModelName, conversation, undefined).catch(() => null);
          }
        }

        if (!followUpRes || !followUpRes.ok) {
          console.warn(`[Rex AI] Retrying synthesis without tool constraint...`);
          conversation.push({
            role: 'user',
            content: 'Please summarize and format the retrieved data directly to the user in fluent Sinhala/English based on the tool results above.'
          });
          followUpRes = await callCompletion(activeModelName, conversation).catch(() => null);
        }

        if (!followUpRes || !followUpRes.ok) {
          if (lastExecutedToolResult) {
            const rows = lastExecutedToolResult.matchedInventory || lastExecutedToolResult.results || [];
            responseMsg = {
              role: 'assistant',
              content: formatDbResultsAsMarkdown(rows, userSpeaksEng, lastUserMsg)
            };
            break;
          }
          const finalErr: any = followUpRes ? await followUpRes.json().catch(() => ({})) : {};
          return res.json({
            success: false,
            error: extractApiErrorMessage(finalErr) || 'Failed generating final answer'
          });
        }
      }

      const followUpData: any = await followUpRes.json();
      responseMsg = followUpData.choices?.[0]?.message;

      if (!responseMsg) {
        break;
      }
    }

    let finalReply = responseMsg?.content || 'No response generated.';
    // Clean accidental chain-of-thought scratchpad leaked by Gemini
    finalReply = finalReply.replace(/^The query returned[\s\S]*?as requested\.\s*/i, '').trim();
    finalReply = finalReply.replace(/^["'].*?->\s*["'].*?["']\.?\s*/i, '').trim();

    // Final safety net: If finalReply somehow contains raw SQL, a schema dump, a token repetition loop, or is empty:
    if (!finalReply || isRawSql(finalReply) || isSchemaDump(finalReply) || hasTokenRepetitionLoop(finalReply)) {
      console.warn(`[Rex AI Engine] Final reply triggered safety net (isRawSql=${isRawSql(finalReply)}, isSchemaDump=${isSchemaDump(finalReply)}, hasTokenRepetitionLoop=${hasTokenRepetitionLoop(finalReply)}). Overriding with deterministic database response...`);
      let formatted = '';
      if (lastExecutedToolResult) {
        const rows = lastExecutedToolResult.matchedInventory || lastExecutedToolResult.results || [];
        if (rows.length > 0) {
          formatted = formatDbResultsAsMarkdown(rows, userSpeaksEng, lastUserMsg);
        }
      }
      if (!formatted) {
        const itemSearch = cleanItemSearchTerm(lastUserMsg);
        const toolResult = await executeAITool('get_item_purchase_prices', { query: itemSearch || 'sample item' });
        const matched = toolResult.matchedInventory || [];
        formatted = formatDbResultsAsMarkdown(matched, userSpeaksEng, lastUserMsg);
      }
      finalReply = formatted;
    }

    return res.json({
      success: true,
      reply: finalReply,
      model: activeModelName,
      provider
    });
  } catch (error: any) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to generate professional Customer Quotation Description using Gemini / Groq / OpenAI
app.post('/api/ai/generate-quotation-description', async (req, res) => {
  try {
    const {
      partTitle,
      rawDescription,
      materials,
      operations,
      dimensions,
      customerName,
      quantity
    } = req.body;

    const [settingsRows]: any = await db.query(
      "SELECT id, val FROM settings WHERE id IN ('ai_provider', 'gemini_api_key', 'gemini_model', 'groq_api_key', 'groq_model', 'openai_api_key', 'openai_model', 'deepseek_api_key', 'deepseek_model', 'ai_enabled')"
    );
    const settingsMap = settingsRows.reduce((acc: any, r: any) => ({ ...acc, [r.id]: r.val }), {});

    if (settingsMap.ai_enabled === 'false') {
      return res.status(403).json({ success: false, error: 'AI Assistant is currently disabled in settings.' });
    }

    const geminiKey = (settingsMap.gemini_api_key || process.env.GEMINI_API_KEY || '').trim();
    const groqKey = (settingsMap.groq_api_key || process.env.GROQ_API_KEY || '').trim();
    const openAiKey = (settingsMap.openai_api_key || process.env.OPENAI_API_KEY || '').trim();
    const deepseekKey = (settingsMap.deepseek_api_key || process.env.DEEPSEEK_API_KEY || '').trim();
    let provider = (settingsMap.ai_provider || (geminiKey ? 'gemini' : (groqKey ? 'groq' : (deepseekKey ? 'deepseek' : 'gemini')))).trim();

    let apiKey = '';
    if (provider === 'gemini') {
      apiKey = geminiKey || groqKey || deepseekKey || openAiKey;
      if (!geminiKey && groqKey) provider = 'groq';
      else if (!geminiKey && deepseekKey) provider = 'deepseek';
      else if (!geminiKey && openAiKey) provider = 'openai';
    } else if (provider === 'groq') {
      apiKey = groqKey || geminiKey || deepseekKey || openAiKey;
      if (!groqKey && geminiKey) provider = 'gemini';
      else if (!groqKey && deepseekKey) provider = 'deepseek';
      else if (!groqKey && openAiKey) provider = 'openai';
    } else if (provider === 'deepseek') {
      apiKey = deepseekKey || geminiKey || groqKey || openAiKey;
      if (!deepseekKey && geminiKey) provider = 'gemini';
      else if (!deepseekKey && groqKey) provider = 'groq';
      else if (!deepseekKey && openAiKey) provider = 'openai';
    } else {
      apiKey = openAiKey || deepseekKey || geminiKey || groqKey;
      if (!openAiKey && deepseekKey) provider = 'deepseek';
      else if (!openAiKey && geminiKey) provider = 'gemini';
      else if (!openAiKey && groqKey) provider = 'groq';
    }

    if (apiKey.startsWith('AIzaSy')) provider = 'gemini';
    else if (apiKey.startsWith('gsk_')) provider = 'groq';
    else if (provider !== 'deepseek' && apiKey.startsWith('sk-') && !deepseekKey) provider = 'openai';

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'AI API Key is not configured. Please add an API Key in Variable Settings.'
      });
    }

    const isGemini = provider === 'gemini' || apiKey.startsWith('AIzaSy');
    const isGroq = provider === 'groq' || apiKey.startsWith('gsk_');
    const isDeepSeek = provider === 'deepseek';

    let endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    if (isGemini) {
      endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    } else if (isGroq) {
      endpointUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (isDeepSeek) {
      endpointUrl = 'https://api.deepseek.com/chat/completions';
    } else {
      endpointUrl = 'https://api.openai.com/v1/chat/completions';
    }

    let activeModelName = '';
    if (isGemini) {
      activeModelName = normalizeModelName((settingsMap.gemini_model || 'gemini-1.5-flash').trim(), 'gemini');
    } else if (isGroq) {
      activeModelName = normalizeModelName((settingsMap.groq_model || 'llama-3.1-8b-instant').trim(), 'groq');
    } else if (isDeepSeek) {
      activeModelName = normalizeModelName((settingsMap.deepseek_model || 'deepseek-chat').trim(), 'deepseek');
    } else {
      activeModelName = normalizeModelName((settingsMap.openai_model || 'gpt-4o-mini').trim(), 'openai');
    }

    const prompt = `You are a Senior Technical Proposal Specialist for Rex Industries (Pvt) Ltd, Sri Lanka - an engineering, precision manufacturing, hydraulics, and metal fabrication company.

Generate an executive, professional, and clear Customer Quotation Line Item Description for an official commercial proposal.

Context:
- Item / Part Name: ${partTitle || 'Custom Precision Engineering Component'}
- Job Scope / Notes: ${rawDescription || 'Precision manufacturing and supply'}
- Dimensions / Specifications: ${dimensions || 'As per approved engineering drawing / sample'}
- Customer / Company: ${customerName || 'Valued Customer'}
- Quantity: ${quantity || '1'}

STRICT CONFIDENTIALITY & FORMATTING RULES:
1. Provide ONLY a clean, high-level, executive commercial description of the product or service.
2. DO NOT mention internal machining processes or operations (DO NOT mention Turning, Milling, Boring, Grinding, CNC, Lathe, Welding, machine hours, or shop floor operations).
3. DO NOT list raw materials or metallurgy breakdown (DO NOT mention Mild Steel, EN8, SS304, aluminum plate, rod, bar, or specific raw material stock).
4. Focus on customer value: professional manufacturing, engineering standard compliance, precision tolerances, protective surface finish/treatment, and final QA inspection ready for delivery/installation.
5. Format as a clean, concise paragraph (2 to 3 neat lines max, e.g. "Fabrication and precision supply of [Part Title] engineered to approved technical specifications and ISO quality standards. Completed with protective surface treatment and full dimensional inspection ready for installation.").
6. Output ONLY the quotation description text. Do NOT use markdown code blocks (\`\`\`). Do NOT include conversational filler like "Here is your description".`;

    let aiRes = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: activeModelName,
        messages: [
          { role: 'system', content: 'You are an industrial engineering quotation writer. You output only direct quotation descriptions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!aiRes.ok) {
      let errJson: any = await aiRes.json().catch(() => ({}));
      let errMsg = (errJson.error?.message || '').toLowerCase();
      if (aiRes.status === 429 || errMsg.includes('rate limit') || errMsg.includes('tpm')) {
        const liveModels = await fetchProviderModels(provider, apiKey);
        activeModelName = selectBestModel(liveModels, provider, [activeModelName]);
        aiRes = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModelName,
            messages: [
              { role: 'system', content: 'You are an industrial engineering quotation writer. You output only direct quotation descriptions.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2
          })
        });
      }
      if (!aiRes.ok && (errJson.error?.code === 'model_not_found' || errMsg.includes('does not exist') || errMsg.includes('not have access') || errMsg.includes('not found'))) {
        const liveModels = await fetchProviderModels(provider, apiKey);
        activeModelName = selectBestModel(liveModels, provider, [activeModelName]);
        aiRes = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeModelName,
            messages: [
              { role: 'system', content: 'You are an industrial engineering quotation writer. You output only direct quotation descriptions.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2
          })
        });
      }

      if (!aiRes.ok) {
        const fallbackErr: any = await aiRes.json().catch(() => errJson);
        return res.json({
          success: false,
          error: extractApiErrorMessage(fallbackErr) || 'Failed generating description'
        });
      }
    }

    const aiData: any = await aiRes.json();
    let description = aiData.choices?.[0]?.message?.content || '';
    description = description.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

    return res.json({
      success: true,
      description,
      model: activeModelName
    });
  } catch (error: any) {
    console.error('AI quotation description error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run AI Diagnostics on Server Boot
(async () => {
  try {
    const [rows]: any = await db.query(
      "SELECT id, val FROM settings WHERE id IN ('ai_provider', 'gemini_api_key', 'gemini_model', 'groq_api_key', 'groq_model', 'openai_api_key', 'openai_model', 'deepseek_api_key', 'deepseek_model')"
    );
    const map = rows.reduce((acc: any, r: any) => ({ ...acc, [r.id]: r.val }), {});
    const prov = map.ai_provider || 'gemini';
    const key = (prov === 'gemini' 
      ? map.gemini_api_key 
      : (prov === 'groq' 
          ? map.groq_api_key 
          : (prov === 'deepseek' ? map.deepseek_api_key : map.openai_api_key))) 
      || map.gemini_api_key || map.groq_api_key || map.deepseek_api_key || map.openai_api_key || '';
    const activeModel = prov === 'gemini' 
      ? (map.gemini_model || 'gemini-1.5-flash')
      : (prov === 'groq' 
          ? (map.groq_model || 'llama-3.1-8b-instant') 
          : (prov === 'deepseek' ? (map.deepseek_model || 'deepseek-chat') : (map.openai_model || 'gpt-4o-mini')));
    console.log(`[Rex AI] Provider: ${prov} | Model: ${activeModel} | Key: ${key ? key.slice(0, 7) + '...' : 'Not configured'}`);
  } catch(e: any) {
    console.error('[Rex AI] Diagnostic error:', e.message);
  }
})();

