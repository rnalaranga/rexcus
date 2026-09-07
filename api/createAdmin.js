const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seedAdmin() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rex_erp'
  });

  try {
    const password_hash = await bcrypt.hash('admin123', 10);
    const id = \USR-\\;
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Check if admin exists
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      await db.query('INSERT INTO users SET ?', {
        id,
        name: 'Administrator',
        username: 'admin',
        password_hash,
        role: 'admin',
        created_at
      });
      console.log('Admin user created!');
    } else {
      console.log('Admin user already exists. Resetting password to admin123...');
      await db.query('UPDATE users SET password_hash = ? WHERE username = ?', [password_hash, 'admin']);
      console.log('Password reset successfully.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}

seedAdmin();
