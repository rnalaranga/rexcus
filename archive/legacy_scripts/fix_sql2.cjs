const fs = require("fs");

// Fix JSON in init_purchasing.sql
let p = fs.readFileSync("init_purchasing.sql", "utf8");
p = p.replace(/JSON/g, "TEXT");
fs.writeFileSync("init_purchasing.sql", p, "utf8");

// Fix IF NOT EXISTS in complete_db.sql
// We can just remove the IF NOT EXISTS part from ADD COLUMN. It might fail if column exists, but we are recreating DB from scratch anyway!
let c = fs.readFileSync("complete_db.sql", "utf8");
c = c.replace(/ADD COLUMN IF NOT EXISTS /g, "ADD COLUMN ");
fs.writeFileSync("complete_db.sql", c, "utf8");
console.log("Fixed SQL files.");
