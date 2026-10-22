const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf8');

const regex = /fetch\('\/api\/settings\/fresh-db'/g;
code = code.replace(regex, "fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings/fresh-db`");

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
console.log('done');
