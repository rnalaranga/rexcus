const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Customers.tsx', 'utf8');

const importRegex = /import \{ UserPlus, Download, Filter, Users, Star, UserCheck, UserX, Building2, User \} from 'lucide-react'/;
code = code.replace(importRegex, "import { UserPlus, Download, Filter, Users, Star, UserCheck, UserX, Building2, User, Trash2 } from 'lucide-react'");

const actionCol = `
    { key: 'lastOrder', header: 'Last Order', sortable: true, render: v => <span className="text-xs text-muted">{relativeTime(String(v))}</span> },
    { key: 'actions', header: '', align: 'right', render: (_, row) => (
      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10 px-2 h-6" onClick={(e) => handleDelete(e, row.id)}>
        {deleting === row.id ? '...' : <Trash2 size={13} />}
      </Button>
    )},
`;
code = code.replace(/\{\s*key: 'lastOrder',[\s\S]*?\},/, actionCol);

fs.writeFileSync('src/pages/crm/Customers.tsx', code);
console.log('done');
