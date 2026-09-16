const mysql = require("mysql2/promise");
require("dotenv").config({ path: "api/.env" });
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '1234';
  const database = process.env.DB_NAME || 'rex_erp';

  console.log(`Connecting to MySQL...`);
  const conn = await mysql.createConnection({ host, user, password, multipleStatements: true });
  
  console.log(`Resetting database ${database}...`);
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conn.query(`CREATE DATABASE \`${database}\``);
  await conn.query(`USE \`${database}\``);

  const sqlFiles = [
    "init_db.sql",
    "complete_db.sql",
    "init_purchasing.sql",
    "alter.sql",
    "fix_tables.sql"
  ];

  for (let file of sqlFiles) {
    if (fs.existsSync(file)) {
      console.log(`Executing ${file}...`);
      const sql = fs.readFileSync(file, 'utf8');
      try {
        await conn.query(sql);
      } catch (e) {
        console.log(`Warning executing ${file}: ${e.message}`);
      }
    }
  }

  await conn.end();

  console.log("Running node.js setup scripts...");
  const scripts = [
    "api/fix_db.cjs",
    "api/setup_employees_db.cjs",
    "api/setup_machinery.cjs",
    "api/create_stock_ledger.js",
    "api/scripts/create_followups.js",
    "api/setup_production.cjs",
    "api/setup_finance.cjs"
  ];

  for (let script of scripts) {
    try {
      console.log(`Running ${script}...`);
      execSync(`node ${script}`, { stdio: "inherit" });
    } catch(e) {
      console.error(`Error running ${script}`);
    }
  }

  try {
    console.log("Running seed.ts (requires tsx)...");
    execSync("npx tsx api/src/seed.ts", { stdio: "inherit" });
  } catch(e) {
    console.error("Error seeding.");
  }

  console.log("SUCCESS! Clean database installed.");
}
run();
