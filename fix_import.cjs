const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Customers.tsx', 'utf8');

code = code.replace(/import \{ createCustomer \} from '@\/lib\/api'/, "import { createCustomer, deleteCustomer } from '@/lib/api'");

fs.writeFileSync('src/pages/crm/Customers.tsx', code);
console.log('done');
