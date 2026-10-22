const fs = require("fs");

function removeBOM(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Removed BOM from ${file}`);
    }
  }
}

const sqlFiles = [
  "init_db.sql",
  "complete_db.sql",
  "init_purchasing.sql",
  "alter.sql",
  "fix_tables.sql"
];

sqlFiles.forEach(removeBOM);

const machFile = 'api/setup_machinery.cjs';
if (fs.existsSync(machFile)) {
  let code = fs.readFileSync(machFile, 'utf8');
  code = code.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME');
  code = code.replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/g, 'DATETIME');
  fs.writeFileSync(machFile, code, 'utf8');
  console.log('Fixed DATETIME in setup_machinery.cjs');
}

