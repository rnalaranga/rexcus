const fs = require('fs');
let code = fs.readFileSync('src/pages/inventory/Inventory.tsx', 'utf8');

code = code.replace(
  /        <\/div>\r?\n      \)\r?\n    \},\r?\n    \{\r?\n      header: 'Type',/g,
  \        </div>\n      )\n    }\n    },\n    {\n      header: 'Type',\
);

fs.writeFileSync('src/pages/inventory/Inventory.tsx', code, 'utf8');