const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

content = content.replace("import { toast } from 'react-hot-toast'", "");
content = content.replace("toast.success('Status updated successfully')", "");
content = content.replace("toast.error('Failed to update status')", "alert('Failed to update status')");

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');