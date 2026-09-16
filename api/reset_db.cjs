const mysql = require("mysql2/promise");
require("dotenv").config();
const { execSync } = require("child_process");

async function resetDb() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '1234';
  const database = process.env.DB_NAME || 'rex_erp';

  console.log(`Connecting to MySQL at ${host} as ${user}...`);
  const conn = await mysql.createConnection({ host, user, password });
  
  console.log(`Dropping database ${database}...`);
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  
  console.log(`Creating database ${database}...`);
  await conn.query(`CREATE DATABASE \`${database}\``);
  
  await conn.end();
  
  console.log("Database reset complete. Now running setup scripts...");

  const scripts = [
    "node fix_db.cjs",
    "node setup_employees_db.cjs",
    "node setup_machinery.cjs",
    "node create_stock_ledger.js",
    "node scripts/create_followups.js"
  ];

  for (const script of scripts) {
    try {
      console.log(`Running ${script}...`);
      execSync(script, { stdio: "inherit" });
    } catch (e) {
      console.error(`Error running ${script}:`, e.message);
    }
  }

  // Need to run seed.ts (requires tsx)
  try {
    console.log("Running seed.ts (requires tsx)...");
    execSync("npx tsx src/seed.ts", { stdio: "inherit" });
  } catch(e) {
    console.error("Error seeding:", e.message);
  }
  
  // Note: server.ts creates some tables (users, inventory, quotations, etc) IF NOT EXISTS on startup.
  // We should restart the backend server so it can recreate its tables!
  console.log("-----------------------------------------");
  console.log("SUCCESS! Database is fully reset and clean.");
  console.log("Please restart your backend server so it recreates missing standard tables.");
}

resetDb().catch(console.error);
